import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from '../dto/register.dto';
import { User } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hash, verifyHash } from 'src/common/utils/hash.utils';
import { UserRole } from 'src/users/enums/user-role.enum';
import { AuthProvider } from '../enums/auth-provider';
import { TokenService } from './token.service';
import { JwtUser } from '../strategy/jwt.strategy';
import { LoginDto } from '../dto/login.dto';
import { GoogleAuthUser } from '../strategy/google.strategy';
import { randomBytes } from 'crypto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { ResendVerificationEmailDto } from '../dto/resend-verification-email.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { UsersService } from 'src/users/users.service';

export interface AuthResponse {
  user: Partial<User>;
  accessToken: string | null;
  refreshToken: string | null;
  emailVerificationRequired?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 10;
  private readonly PASSWORD_RESET_TTL_MS = 1000 * 60 * 10;

  constructor(
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const user = this.userRepo.create({
      name: dto.name,
      email,
      passwordHash: await Hash(dto.password),
      role: UserRole.CUSTOMER,
      provider: AuthProvider.LOCAL,
      isEmailVerified: false,
    });

    await this.userRepo.save(user);

    const verificationToken = await this.createEmailVerificationToken(user);

    try {
      await this.sendVerificationEmail(
        user.email,
        user.name,
        verificationToken,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to send verification email to ${user.email}`,
        err,
      );
    }

    return {
      user: this.sanitizeUser(user),
      accessToken: null,
      refreshToken: null,
      emailVerificationRequired: true,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: normalizedEmail })
      .getOne();

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.provider !== AuthProvider.LOCAL) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordCorrect = await verifyHash(user.passwordHash, dto.password);

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const tokens = await this.tokenService.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async loginWithGoogle(googleUser: GoogleAuthUser): Promise<AuthResponse> {
    if (!googleUser.emailVerified) {
      throw new UnauthorizedException('Google email is not verified');
    }

    let user = await this.userRepo.findOneBy({
      googleId: googleUser.googleId,
    });

    if (!user) {
      const existingUserByEmail = await this.usersService.findByEmail(
        googleUser.email,
      );

      if (
        existingUserByEmail &&
        existingUserByEmail.provider === AuthProvider.LOCAL
      ) {
        throw new ConflictException(
          'Email is already registered with password login',
        );
      }

      if (existingUserByEmail) {
        existingUserByEmail.googleId = googleUser.googleId;
        existingUserByEmail.provider = AuthProvider.GOOGLE;
        existingUserByEmail.name = googleUser.name || existingUserByEmail.name;

        existingUserByEmail.isEmailVerified = true;

        if (!existingUserByEmail.emailVerifiedAt) {
          existingUserByEmail.emailVerifiedAt = new Date();
        }

        user = await this.userRepo.save(existingUserByEmail);
      } else {
        user = this.userRepo.create({
          name: googleUser.name,
          email: googleUser.email.toLowerCase().trim(),
          googleId: googleUser.googleId,
          provider: AuthProvider.GOOGLE,
          role: UserRole.CUSTOMER,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        });

        user = await this.userRepo.save(user);
      }
    }

    const tokens = await this.tokenService.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const rawToken = dto.token?.trim();

    if (!rawToken) {
      throw new UnauthorizedException('Invalid verification token');
    }

    const [tokenOwnerUserId] = rawToken.split('.', 1);

    if (!tokenOwnerUserId) {
      throw new UnauthorizedException('Invalid verification token');
    }

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.emailVerificationTokenHash')
      .where('user.id = :id', {
        id: tokenOwnerUserId,
      })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid verification token');
    }

    if (user.isEmailVerified) {
      return {
        message: 'Email is already verified',
      };
    }

    if (!user.emailVerificationTokenHash || !user.emailVerificationExpiresAt) {
      throw new UnauthorizedException('Invalid verification token');
    }

    const tokenIsExpired =
      user.emailVerificationExpiresAt.getTime() < Date.now();

    if (tokenIsExpired) {
      throw new UnauthorizedException('Verification token has expired');
    }

    const tokenIsValid = await verifyHash(
      user.emailVerificationTokenHash,
      rawToken,
    );

    if (!tokenIsValid) {
      throw new UnauthorizedException('Invalid verification token');
    }

    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;

    await this.userRepo.save(user);

    return {
      message: 'Email verified successfully',
    };
  }

  async resendVerificationEmail(
    dto: ResendVerificationEmailDto,
  ): Promise<{ message: string }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const genericResponseMessage =
      'If an account exists for this email, a verification email has been sent.';

    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user || user.isEmailVerified) {
      return { message: genericResponseMessage };
    }

    const verificationToken = await this.createEmailVerificationToken(user);

    try {
      await this.sendVerificationEmail(
        user.email,
        user.name,
        verificationToken,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to resend verification email to ${user.email}`,
        err,
      );
    }

    return { message: genericResponseMessage };
  }

  async refreshTokens(user: JwtUser): Promise<AuthResponse> {
    const dbUser = await this.usersService.findById(user.userId);

    if (!dbUser) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (!dbUser.isEmailVerified) {
      throw new UnauthorizedException('Email verification required');
    }

    const tokens = await this.tokenService.generateTokens(dbUser);

    return {
      user: this.sanitizeUser(dbUser),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(user: JwtUser): Promise<{ message: string }> {
    await this.tokenService.revokeRefreshToken(user.userId);
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<string> {
    const genericResponseMessage =
      'If an account exists for this email, a password reset email has been sent.';

    const user = await this.usersService.findByEmail(dto.email);

    if (!user || user.provider !== AuthProvider.LOCAL) {
      return genericResponseMessage;
    }

    const resetToken = await this.createPasswordResetToken(user);

    try {
      await this.sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (err) {
      this.logger.warn(
        `Failed to send password reset email to ${user.email}`,
        err,
      );
    }

    return genericResponseMessage;
  }

  private async createEmailVerificationToken(user: User): Promise<string> {
    const rawVerificationToken = `${user.id}.${randomBytes(32).toString('hex')}`;
    const hashedVerificationToken = await Hash(rawVerificationToken);

    user.emailVerificationTokenHash = hashedVerificationToken;
    user.emailVerificationExpiresAt = new Date(
      Date.now() + this.EMAIL_VERIFICATION_TTL_MS,
    );

    await this.userRepo.save(user);

    return rawVerificationToken;
  }

  private async createPasswordResetToken(user: User): Promise<string> {
    const rawResetToken = `${user.id}.${randomBytes(32).toString('hex')}`;
    const hashedResetToken = await Hash(rawResetToken);

    user.passwordResetTokenHash = hashedResetToken;
    user.passwordResetExpiresAt = new Date(
      Date.now() + this.PASSWORD_RESET_TTL_MS,
    );

    await this.userRepo.save(user);

    return rawResetToken;
  }

  private async sendVerificationEmail(
    email: string,
    name: string,
    verificationToken: string,
  ): Promise<boolean> {
    const appBaseUrl =
      this.configService.get<string>('APP_BASE_URL') || 'http://localhost:3000';

    const verificationUrl = `${appBaseUrl}/auth/verify-email?token=${verificationToken}`;

    const emailSent = await this.mailService.sendEmailVerificationEmail({
      to: email,
      name,
      verificationUrl,
    });

    if (!emailSent) {
      this.logger.warn(`Verification email could not be sent to ${email}`);
      return false;
    }

    const shouldLogVerificationLink =
      this.configService.get<string>('DEBUG_EMAIL_VERIFICATION_LINKS') ===
      'true';

    if (shouldLogVerificationLink) {
      this.logger.log(`Email verification link generated for ${email}`);
      this.logger.debug(`Verification URL: ${verificationUrl}`);
    }

    return true;
  }

  private async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string,
  ): Promise<boolean> {
    const appBaseUrl =
      this.configService.get<string>('APP_BASE_URL') || 'http://localhost:3000';

    const resetUrl = `${appBaseUrl}/auth/reset-password?token=${resetToken}`;

    const emailSent = await this.mailService.sendPasswordResetEmail({
      to: email,
      name,
      resetUrl,
    });

    if (!emailSent) {
      this.logger.warn(`Password reset email could not be sent to ${email}`);
      return false;
    }

    const shouldLogResetLink =
      this.configService.get<string>('DEBUG_EMAIL_VERIFICATION_LINKS') ===
      'true';

    if (shouldLogResetLink) {
      this.logger.log(`Password reset link generated for ${email}`);
      this.logger.debug(`Reset URL: ${resetUrl}`);
    }

    return true;
  }

  private sanitizeUser(user: User): Partial<User> {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
      isEmailVerified: user.isEmailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }
}
