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
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your verification code</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 400px; margin: 0 auto; background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #18181b;">
              Verification code
            </h1>
            <p style="margin: 0 0 32px; color: #71717a; font-size: 14px;">
              Enter this code to sign in to ${appName}
            </p>
            
            <div style="background-color: #fafafa; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #18181b;">
                ${otp}
              </span>
            </div>
            
            <p style="margin: 0 0 4px; color: #71717a; font-size: 12px;">
              This code expires in 10 minutes.
            </p>
            <p style="margin: 0; color: #71717a; font-size: 12px;">
              If you didn't request this code, you can safely ignore this email.
            </p>
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
