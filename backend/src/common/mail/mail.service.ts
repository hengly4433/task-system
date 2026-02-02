import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendPasswordSetupEmail(
    email: string,
    fullName: string | null,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const setupUrl = `${frontendUrl}/auth/setup-password?token=${token}`;
    const displayName = fullName || email;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Set Up Your Password - BiTi Task Management',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set Up Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 48px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(241, 24, 76, 0.12), 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header with Icon -->
          <tr>
            <td style="padding: 48px 40px 32px; text-align: center; background: linear-gradient(135deg, #f1184c 0%, #d90b3f 100%); border-radius: 16px 16px 0 0;">
              <!-- Welcome Icon -->
              <div style="width: 72px; height: 72px; margin: 0 auto 20px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-block; line-height: 72px;">
                <span style="font-size: 36px; color: #ffffff;">🎉</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Welcome!</h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">You're almost ready to get started</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 48px;">
              <p style="margin: 0 0 24px; color: #1a1a2e; font-size: 17px; line-height: 1.7;">
                Hello <strong style="color: #f1184c;">${displayName}</strong>,
              </p>
              <p style="margin: 0 0 24px; color: #4a4a68; font-size: 16px; line-height: 1.7;">
                You have been invited to join <strong>BiTi Task Management</strong>. Please click the button below to set up your password and activate your account.
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 28px 0;">
                    <a href="${setupUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f1184c 0%, #d90b3f 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 50px; box-shadow: 0 4px 16px rgba(241, 24, 76, 0.35); transition: all 0.3s ease;">
                      ✨ Set Up Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr>
                  <td style="border-top: 1px dashed #e0e0e0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 8px; color: #6b6b80; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; padding: 12px 16px; background: #f8f9fa; border-radius: 8px; word-break: break-all;">
                <a href="${setupUrl}" style="color: #f1184c; font-size: 13px; text-decoration: none;">${setupUrl}</a>
              </p>
              
              <!-- Info Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 28px;">
                <tr>
                  <td style="padding: 16px 20px; background: linear-gradient(135deg, #fff5f7 0%, #fff0f3 100%); border-radius: 12px; border-left: 4px solid #f1184c;">
                    <p style="margin: 0; color: #6b6b80; font-size: 13px; line-height: 1.6;">
                      <span style="color: #f1184c; font-weight: 600;">⏱ Note:</span> This link will expire in 24 hours. If you did not expect this email, please ignore it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 48px 32px; text-align: center; background: #fafafa; border-radius: 0 0 16px 16px; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px; color: #999999; font-size: 13px; font-weight: 500;">
                BiTi Task Management
              </p>
              <p style="margin: 0; color: #b0b0b0; font-size: 12px;">
                &copy; ${new Date().getFullYear()} BiTi Technologies. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      });

      this.logger.log(`Password setup email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password setup email to ${email}`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    fullName: string | null,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const displayName = fullName || email;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset Your Password - BiTi Task Management',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f1184c 0%, #d90b3f 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Password Reset</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello <strong>${displayName}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f1184c 0%, #d90b3f 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 0; word-break: break-all;">
                <a href="${resetUrl}" style="color: #f1184c; font-size: 14px;">${resetUrl}</a>
              </p>
              
              <p style="margin: 30px 0 0; color: #999999; font-size: 13px; line-height: 1.6;">
                This link will expire in 24 hours. If you did not request a password reset, please ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                &copy; ${new Date().getFullYear()} BiTi Task Management. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
      throw error;
    }
  }
}

