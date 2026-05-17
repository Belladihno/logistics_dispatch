import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

interface SendEmailVerificationInput {
  to: string;
  name: string;
  verificationUrl: string;
}

interface SendPasswordResetInput {
  to: string;
  name: string;
  resetUrl: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendEmailVerificationEmail(
    input: SendEmailVerificationInput,
  ): Promise<boolean> {
    const subject = 'Verify your email';

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <p>Hi ${this.escapeHtml(input.name)},</p>
        <p>Please verify your email by clicking the button below:</p>
        <p>
          <a
            href="${input.verificationUrl}"
            style="display: inline-block; background: #111827; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none;"
          >
            Verify Email
          </a>
        </p>
        <p>If the button does not work, use this link:</p>
        <p><a href="${input.verificationUrl}">${input.verificationUrl}</a></p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `;

    try {
      await this.mailService.sendMail({
        to: input.to,
        subject,
        html,
      });

      this.logger.log(`Verification email sent to ${input.to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${input.to}.`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  async sendPasswordResetEmail(
    input: SendPasswordResetInput,
  ): Promise<boolean> {
    const subject = 'Reset your password';

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <p>Hi ${this.escapeHtml(input.name)},</p>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <p>
          <a
            href="${input.resetUrl}"
            style="display: inline-block; background: #111827; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none;"
          >
            Reset Password
          </a>
        </p>
        <p>If the button does not work, use this link:</p>
        <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
        <p>This link will expire in 10 minutes.</p>
        <p>If you did not request a password reset, you can ignore this email.</p>
      </div>
    `;

    try {
      await this.mailService.sendMail({
        to: input.to,
        subject,
        html,
      });

      this.logger.log(`Password reset email sent to ${input.to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${input.to}.`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
