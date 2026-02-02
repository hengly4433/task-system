import { IsString, MinLength, MaxLength, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Username or email' })
  @IsString()
  @MaxLength(255)
  usernameOrEmail: string;

  @ApiProperty({ description: 'Password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Remember me for extended session', required: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class RegisterDto {
  @ApiProperty() @IsString() @MaxLength(50) username: string;
  @ApiProperty() @IsString() @MaxLength(255) email: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
  @ApiProperty({ required: false }) @IsString() @MaxLength(150) fullName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(100) organizationName?: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'User roles', type: [String], required: false })
  roles?: string[];
}

// ============================================
// COMMENTED OUT - Email setup password flow disabled
// Password is now entered during registration
// ============================================
export class SetupPasswordDto {
  @ApiProperty({ description: 'Password setup token from email' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

export class ValidateTokenResponseDto {
  @ApiProperty({ description: 'Whether the token is valid' })
  valid: boolean;

  @ApiProperty({ description: 'User email', required: false })
  email?: string;

  @ApiProperty({ description: 'User full name', required: false })
  fullName?: string;

  @ApiProperty({ description: 'Error message if invalid', required: false })
  message?: string;
}

export class SetupPasswordResponseDto {
  @ApiProperty({ description: 'Whether password was set successfully' })
  success: boolean;

  @ApiProperty({ description: 'Success or error message' })
  message: string;
}

// ============================================
// Forgot Password DTOs
// ============================================
export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address to send reset link' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token from email' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty({ description: 'Whether password was reset successfully' })
  success: boolean;

  @ApiProperty({ description: 'Success or error message' })
  message: string;
}
