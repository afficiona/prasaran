import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
      },
    });
  }

  async sendNewUserNotification(userEmail: string, signupMethod: 'email' | 'google') {
    const to = 'afficiona4web@gmail.com';
    const subject = `New User Signup on Prasaran: ${userEmail}`;
    const html = `
      <h2>New User Registration</h2>
      <p>A new user has signed up on Prasaran.</p>
      <table style="border-collapse: collapse; margin-top: 10px;">
        <tr>
          <td style="padding: 8px; font-weight: bold;">Email:</td>
          <td style="padding: 8px;">${userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Signup Method:</td>
          <td style="padding: 8px;">${signupMethod === 'google' ? 'Google OAuth' : 'Email/Password'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Time:</td>
          <td style="padding: 8px;">${new Date().toISOString()}</td>
        </tr>
      </table>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('GMAIL_USER'),
        to,
        subject,
        html,
      });
      this.logger.log(`Signup notification sent for ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send signup notification for ${userEmail}`, (error as Error).stack);
    }
  }
}
