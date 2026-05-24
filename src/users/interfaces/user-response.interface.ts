import { UserRole } from '../enums/user-role.enum';
import { AuthProvider } from 'src/auth/enums/auth-provider';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  provider: AuthProvider;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
