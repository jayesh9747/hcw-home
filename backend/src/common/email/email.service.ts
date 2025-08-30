import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import { ConfigService } from '../../config/config.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private senderEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.emailSendgridApiKey;
    this.senderEmail = this.configService.emailSenderAddress;
    if (!apiKey) {
      this.logger.error('SendGrid API key is missing in config');
      throw new Error('Missing SendGrid API key');
    }
    sgMail.setApiKey(apiKey);
  }

  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    const msg = {
      to,
      from: this.senderEmail,
      subject,
      html: htmlContent,
    };
    try {
      await sgMail.send(msg);
      this.logger.log(`Email sent to ${to} - ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  async sendConsultationInvitationEmail(
    toEmail: string,
    inviterName: string,
    consultationId: number,
    magicLinkUrl: string,
    role: UserRole,
    inviteeName?: string,
    notes?: string,
  ) {
    try {
      if (!toEmail?.trim() || !magicLinkUrl?.trim()) {
        throw new Error('Email address and magic link URL are required');
      }

      const roleDisplay = this.getRoleDisplayName(role);
      const subject = `🏥 You're invited to join a consultation as ${roleDisplay}`;

      const urlDomain = new URL(magicLinkUrl).hostname;

      const securityNotice =
        role === UserRole.PATIENT
          ? 'This secure link is personal to you and will expire in 24 hours for your privacy and security.'
          : 'This invitation link is secure and will expire in 24 hours. Please join promptly.';

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Consultation Invitation</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; font-size: 24px; font-weight: 600; margin-bottom: 8px; }
            .header p { color: #bfdbfe; font-size: 14px; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 18px; font-weight: 500; color: #1f2937; margin-bottom: 20px; }
            .invitation-details { background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .detail-label { font-weight: 500; color: #374151; }
            .detail-value { color: #1f2937; }
            .cta-section { text-align: center; margin: 30px 0; }
            .cta-button { 
              display: inline-block; 
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
              color: white; 
              padding: 16px 32px; 
              text-decoration: none; 
              font-weight: 600; 
              border-radius: 8px; 
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
              transition: transform 0.2s;
            }
            .cta-button:hover { transform: translateY(-1px); }
            .notes { background-color: #fffbeb; border: 1px solid #fed7aa; padding: 16px; border-radius: 6px; margin: 20px 0; }
            .notes-title { font-weight: 500; color: #92400e; margin-bottom: 8px; }
            .notes-content { color: #451a03; line-height: 1.5; }
            .security-notice { background-color: #ecfdf5; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; margin: 20px 0; }
            .security-icon { display: inline-block; margin-right: 8px; }
            .security-text { font-size: 14px; color: #065f46; line-height: 1.5; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer-text { font-size: 12px; color: #6b7280; line-height: 1.5; }
            .divider { height: 1px; background-color: #e5e7eb; margin: 20px 0; }
            @media (max-width: 600px) {
              .content { padding: 20px 15px; }
              .cta-button { padding: 14px 24px; font-size: 15px; }
              .detail-row { flex-direction: column; margin-bottom: 12px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>Consultation Invitation</h1>
              <p>Secure Healthcare Platform</p>
            </div>

            <!-- Main Content -->
            <div class="content">
              <div class="greeting">
                Hello${inviteeName ? ` ${inviteeName}` : ''},
              </div>

              <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
                <strong>${inviterName}</strong> has invited you to join a healthcare consultation as <strong>${roleDisplay}</strong>.
              </p>

              <!-- Consultation Details -->
              <div class="invitation-details">
                <div class="detail-row">
                  <span class="detail-label">Consultation ID:</span>
                  <span class="detail-value">#${consultationId}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Role:</span>
                  <span class="detail-value">${roleDisplay}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Invited by:</span>
                  <span class="detail-value">${inviterName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Platform:</span>
                  <span class="detail-value">${urlDomain}</span>
                </div>
              </div>

              ${
                notes
                  ? `
                <div class="notes">
                  <div class="notes-title">📝 Note from ${inviterName}:</div>
                  <div class="notes-content">${notes}</div>
                </div>
              `
                  : ''
              }

              <!-- Call to Action -->
              <div class="cta-section">
                <p style="color: #374151; margin-bottom: 16px;">Click the button below to join the consultation securely:</p>
                <a href="${magicLinkUrl}" class="cta-button">
                  Join Consultation Now
                </a>
              </div>

              <!-- Security Notice -->
              <div class="security-notice">
                <div class="security-text">
                  <span class="security-icon">🔒</span>
                  <strong>Security Notice:</strong> ${securityNotice}
                </div>
              </div>

              <div class="divider"></div>

              <!-- Additional Information -->
              <div style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                <p style="margin-bottom: 8px;"><strong>What to expect:</strong></p>
                <ul style="margin-left: 20px; margin-bottom: 16px;">
                  ${
                    role === UserRole.PATIENT
                      ? `
                    <li>You'll be placed in a secure waiting room initially</li>
                    <li>The practitioner will admit you when ready</li>
                    <li>You can chat, make voice calls, and video calls during the consultation</li>
                  `
                      : `
                    <li>You'll join the consultation room directly</li>
                    <li>Chat, voice, and video capabilities are available</li>
                    <li>You can contribute as an ${roleDisplay.toLowerCase()} participant</li>
                  `
                  }
                </ul>
                
                <p style="margin-bottom: 8px;"><strong>Technical requirements:</strong></p>
                <ul style="margin-left: 20px;">
                  <li>Modern web browser (Chrome, Firefox, Safari, Edge)</li>
                  <li>Stable internet connection</li>
                  <li>Camera and microphone for video/voice calls (optional)</li>
                </ul>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-text">
                <p>This is an automated message from our secure healthcare platform.</p>
                <p>If you received this invitation in error, please ignore this email.</p>
                <p style="margin-top: 8px;">© ${new Date().getFullYear()} Healthcare Platform. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.sendEmail(toEmail, subject, html);

      this.logger.log(
        `Consultation invitation email sent successfully - To: ${toEmail}, Role: ${role}, Consultation: ${consultationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send consultation invitation email to ${toEmail}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  private getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case UserRole.PATIENT:
        return 'Patient';
      case UserRole.EXPERT:
        return 'Expert';
      case UserRole.GUEST:
        return 'Guest';
      case UserRole.PRACTITIONER:
        return 'Practitioner';
      default:
        return role;
    }
  }
}
