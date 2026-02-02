import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, Request, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, AuthResponseDto, ForgotPasswordDto, ResetPasswordDto, ForgotPasswordResponseDto, ResetPasswordResponseDto, SetupPasswordDto, SetupPasswordResponseDto, ValidateTokenResponseDto } from './dto';
import { Public } from './decorators';
import { SkipTenantGuard } from '../../common/tenant';

@ApiTags('Authentication')
@SkipTenantGuard()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with username/email and password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Registration successful', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  // ============================================
  // COMMENTED OUT - Email setup password flow disabled
  // Password is now entered during registration
  // ============================================
  @Public()
  @Get('validate-token/:token')
  @ApiOperation({ summary: 'Validate a password setup token' })
  @ApiResponse({ status: 200, description: 'Token validation result', type: ValidateTokenResponseDto })
  async validateToken(@Param('token') token: string): Promise<ValidateTokenResponseDto> {
    return this.authService.validateSetupToken(token);
  }

  @Public()
  @Post('setup-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set password using setup token from email' })
  @ApiResponse({ status: 200, description: 'Password set successfully', type: SetupPasswordResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async setupPassword(@Body() dto: SetupPasswordDto): Promise<SetupPasswordResponseDto> {
    return this.authService.setupPassword(dto.token, dto.password);
  }

  // ============================================
  // Forgot Password Endpoints
  // ============================================
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists', type: ForgotPasswordResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successfully', type: ResetPasswordResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth(): Promise<void> {
    // Guard redirects to Google - this method body never executes
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthRedirect(@Request() req: any, @Res() res: any): Promise<void> {
    const result = await this.authService.googleLogin(req);
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let redirectUrl = `${frontendUrl}/auth/callback?token=${result.accessToken}`;
    
    if (result.setupToken) {
      redirectUrl += `&setupToken=${result.setupToken}`;
    }
    
    if (result.isNewUser) {
      redirectUrl += `&isNewUser=true`;
    }
    
    res.redirect(redirectUrl);
  }
}
