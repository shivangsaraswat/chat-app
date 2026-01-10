import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    return this.transporter;
  }

  static async sendEmail(options: EmailOptions): Promise<void> {
    const transporter = this.getTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }

  static async sendOtpEmail(email: string, otp: string): Promise<void> {
    const appName = 'ChatApp'; // TODO: Replace with actual app name

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Verification Code</title>
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <!-- Header with colored accent -->
        <div style="height: 6px; background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);"></div>
        
        <div style="padding: 40px 48px;">
            <!-- Logo/Icon -->
            <div style="margin-bottom: 32px;">
                <div style="width: 48px; height: 48px; background-color: #eff6ff; border-radius: 12px; display: flex; align-items: center; justify-content: center; display: inline-block;">
                    <img src="https://img.icons8.com/fluent/48/000000/shield.png" alt="Security" style="width: 24px; height: 24px; margin: 12px;" />
                </div>
            </div>

            <!-- Main Content -->
            <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #0f172a;">
                Verification Required
            </h1>
            
            <p style="margin: 0 0 32px; font-size: 16px; line-height: 24px; color: #64748b;">
                You requested to sign in to <strong>${appName}</strong>. Please use the following one-time password (OTP) to complete your request.
            </p>

            <!-- OTP Box -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
                <span style="display: block; font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">
                    ${otp}
                </span>
            </div>

            <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">
                This code will expire in 10 minutes.
            </p>
            <p style="margin: 0; font-size: 14px; color: #94a3b8;">
                If you didn't request this code, you can safely ignore this email.
            </p>
        </div>

        <!-- Footer -->
        <div style="padding: 24px 48px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
    `;

    await this.sendEmail({
      to: email,
      subject: `${otp} is your verification code`,
      html,
    });
  }
}
