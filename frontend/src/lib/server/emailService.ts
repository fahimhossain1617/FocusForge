import nodemailer, { type Transporter } from 'nodemailer';

// Configuration
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@focusforge.app';
export const SUPPORT_INBOX_EMAIL = process.env.SUPPORT_INBOX_EMAIL || 'focentia13@gmail.com';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

interface EmailJob {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  retries: number;
  maxRetries: number;
  delayMs: number;
}

// Memory queue with retry and exponential backoff
class EmailQueue {
  private queue: EmailJob[] = [];
  private isProcessing = false;
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    let port = Number(process.env.SMTP_PORT) || 465;
    if (port === 456) port = 465; // Auto-correct common port 456 typo to 465 (Google SSL)
    const user = process.env.SMTP_USER || 'focentia13@gmail.com';
    const pass = process.env.SMTP_PASS || '';
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
    } else {
      // Mock / logging transporter if SMTP credentials are not yet configured in environment
      this.transporter = null;
    }
  }

  public enqueue(job: Omit<EmailJob, 'retries' | 'maxRetries' | 'delayMs'>) {
    this.queue.push({
      ...job,
      retries: 0,
      maxRetries: 3,
      delayMs: 2000,
    });
    this.processNext();
  }

  public async sendDirect(job: Omit<EmailJob, 'retries' | 'maxRetries' | 'delayMs'>): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initTransporter();
      }

      if (this.transporter) {
        const fromAddress = process.env.SMTP_FROM || '"FocusForge" <focentia13@gmail.com>';
        await this.transporter.sendMail({
          from: fromAddress,
          to: job.to,
          replyTo: job.replyTo,
          subject: job.subject,
          text: job.text,
          html: job.html,
        });
        console.log(`[EmailService] Successfully sent OTP email to ${job.to} (Subject: ${job.subject})`);
        return true;
      } else {
        console.log(`[EmailQueue - Local Mock] To: ${job.to} | Subject: ${job.subject} | ReplyTo: ${job.replyTo}`);
        return true;
      }
    } catch (err: any) {
      console.error(`[EmailService] Failed direct send to ${job.to}:`, err?.message);
      return false;
    }
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const currentJob = this.queue.shift();
    if (!currentJob) {
      this.isProcessing = false;
      return;
    }

    try {
      if (!this.transporter) {
        this.initTransporter();
      }

      if (this.transporter) {
        const fromAddress = process.env.SMTP_FROM || `"FocusForge" <${SUPPORT_EMAIL}>`;
        await this.transporter.sendMail({
          from: fromAddress,
          to: currentJob.to,
          replyTo: currentJob.replyTo,
          subject: currentJob.subject,
          text: currentJob.text,
          html: currentJob.html,
        });
        console.log(`[EmailQueue] Successfully sent email to ${currentJob.to} (Subject: ${currentJob.subject})`);
      } else {
        console.log(`[EmailQueue - Local Mock] To: ${currentJob.to} | Subject: ${currentJob.subject} | ReplyTo: ${currentJob.replyTo}`);
      }
    } catch (err: any) {
      console.error(`[EmailQueue] Failed to send email to ${currentJob.to}:`, err?.message);
      if (currentJob.retries < currentJob.maxRetries) {
        currentJob.retries += 1;
        currentJob.delayMs *= 2; // Exponential backoff
        setTimeout(() => {
          this.queue.push(currentJob);
          this.processNext();
        }, currentJob.delayMs);
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processNext(), 500);
      }
    }
  }
}

const emailQueue = new EmailQueue();

// Escape text for HTML to prevent injection
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 1. Support Notification to Owner (with Reply-To set to sender email)
export function sendSupportNotificationToOwner(ticket: {
  ticketNumber: string;
  type: string;
  category?: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  appVersion: string;
  browserInfo?: string;
  isGuest: boolean;
  attachments?: string[];
}) {
  const supervisorTicketUrl = `${APP_URL}/supervisor?ticket=${ticket.ticketNumber}`;
  const attachmentsHtml = ticket.attachments && ticket.attachments.length > 0
    ? `
      <div style="margin-top: 16px; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px;">
        <strong style="font-size: 13px; color: #475569;">Attached Screenshot / Media:</strong>
        <div style="margin-top: 8px;">
          ${ticket.attachments.map(att => {
            if (att.startsWith('data:image') || att.startsWith('http')) {
              return `<div style="margin-top: 8px;"><img src="${att}" alt="Screenshot" style="max-width: 100%; border-radius: 8px; border: 1px solid #cbd5e1; display: block;" /></div>`;
            }
            return `<div style="margin-top: 4px; font-size: 13px;"><a href="${att}" target="_blank" style="color: #2563eb;">${escapeHtml(att)}</a></div>`;
          }).join('')}
        </div>
      </div>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 24px; }
          .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; padding: 24px; }
          .header { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
          .title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; }
          .badge { display: inline-block; padding: 4px 8px; font-size: 12px; font-weight: 600; border-radius: 4px; background: #e0f2fe; color: #0369a1; text-transform: uppercase; }
          .meta { margin-bottom: 16px; font-size: 14px; color: #64748b; }
          .meta-item { margin-bottom: 4px; }
          .message-box { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 16px 0; font-size: 15px; white-space: pre-wrap; word-break: break-word; }
          .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">${escapeHtml(ticket.type)}</span>
            <h2 class="title" style="margin-top: 8px;">New ${escapeHtml(ticket.type.toUpperCase())}: ${escapeHtml(ticket.ticketNumber)}</h2>
          </div>
          <div class="meta">
            <div class="meta-item"><strong>From:</strong> ${escapeHtml(ticket.senderName)} (${escapeHtml(ticket.senderEmail || 'No email provided')})</div>
            <div class="meta-item"><strong>Category:</strong> ${escapeHtml(ticket.category || 'General')}</div>
            <div class="meta-item"><strong>User Status:</strong> ${ticket.isGuest ? 'Guest User' : 'Registered User'}</div>
            <div class="meta-item"><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</div>
            <div class="meta-item"><strong>App Version:</strong> ${escapeHtml(ticket.appVersion)}</div>
            ${ticket.browserInfo ? `<div class="meta-item"><strong>Environment:</strong> ${escapeHtml(ticket.browserInfo)}</div>` : ''}
          </div>
          <div class="message-box">${escapeHtml(ticket.message)}</div>
          ${attachmentsHtml}
          <p style="margin-top: 16px;">You can reply directly to this email to reach the user, or manage the ticket in the Supervisor portal:</p>
          <a href="${supervisorTicketUrl}" class="btn">Open in Supervisor Dashboard</a>
          <div class="footer">
            FocusForge Support System &bull; Inbox: ${SUPPORT_INBOX_EMAIL}
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
FocusForge ${ticket.type.toUpperCase()} Notification
Ticket: ${ticket.ticketNumber}
Type: ${ticket.type}
Category: ${ticket.category || 'General'}
From: ${ticket.senderName} (${ticket.senderEmail || 'No email provided'})
User Status: ${ticket.isGuest ? 'Guest' : 'Registered'}
Subject: ${ticket.subject}
App Version: ${ticket.appVersion}

Message:
${ticket.message}

Supervisor Link: ${supervisorTicketUrl}
Reply directly to this email to respond to the sender.
  `.trim();

  emailQueue.enqueue({
    to: SUPPORT_INBOX_EMAIL,
    replyTo: ticket.senderEmail || undefined,
    subject: `[${ticket.ticketNumber}] ${ticket.type.toUpperCase()}: ${ticket.subject}`,
    html,
    text,
  });
}

// 2. Submission Confirmation to User
export function sendSupportConfirmationToUser(ticket: {
  ticketNumber: string;
  senderName: string;
  senderEmail: string;
  subject: string;
}) {
  if (!ticket.senderEmail) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 24px; }
          .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; padding: 24px; }
          .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; }
          .ticket-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 16px 0; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 class="title">We have received your message</h2>
          <p>Hello ${escapeHtml(ticket.senderName || 'there')},</p>
          <p>Thank you for reaching out to FocusForge support. Your submission has been registered with our team.</p>
          <div class="ticket-info">
            <div><strong>Ticket Number:</strong> ${escapeHtml(ticket.ticketNumber)}</div>
            <div><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</div>
            <div><strong>Status:</strong> Received</div>
          </div>
          <p>Our team reviews all inquiries promptly and we usually reply within two business days. Please keep your ticket number for reference.</p>
          <p>Best regards,<br />The FocusForge Team</p>
          <div class="footer">
            This is an automated confirmation from FocusForge Support (${SUPPORT_EMAIL}).
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hello ${ticket.senderName || 'there'},

We have received your support request.
Ticket Number: ${ticket.ticketNumber}
Subject: ${ticket.subject}

Our team reviews all inquiries promptly and we usually reply within two business days.

Best regards,
The FocusForge Team
  `.trim();

  emailQueue.enqueue({
    to: ticket.senderEmail,
    subject: `[${ticket.ticketNumber}] Support Request Received - FocusForge`,
    html,
    text,
  });
}

// 3. Supervisor Reply to User
export function sendSupervisorReplyToUser(ticket: {
  ticketNumber: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  supervisorName: string;
  replyMessage: string;
}) {
  if (!ticket.recipientEmail) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 24px; }
          .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; padding: 24px; }
          .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; }
          .message-box { background: #f8fafc; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin: 16px 0; font-size: 15px; white-space: pre-wrap; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 class="title">Update on Support Ticket ${escapeHtml(ticket.ticketNumber)}</h2>
          <p>Hello ${escapeHtml(ticket.recipientName || 'there')},</p>
          <p>Our team has sent a response regarding your ticket <strong>${escapeHtml(ticket.subject)}</strong>:</p>
          <div class="message-box">${escapeHtml(ticket.replyMessage)}</div>
          <p>If you have any further questions, you can reply directly to this email.</p>
          <p>Best regards,<br />${escapeHtml(ticket.supervisorName)} &bull; FocusForge Team</p>
          <div class="footer">
            FocusForge Support &bull; Ticket ${escapeHtml(ticket.ticketNumber)}
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hello ${ticket.recipientName || 'there'},

Update on your ticket ${ticket.ticketNumber} (${ticket.subject}):

${ticket.replyMessage}

You can reply directly to this email if you need more assistance.

Best regards,
${ticket.supervisorName} - FocusForge Team
  `.trim();

  emailQueue.enqueue({
    to: ticket.recipientEmail,
    replyTo: SUPPORT_INBOX_EMAIL,
    subject: `Re: [${ticket.ticketNumber}] ${ticket.subject}`,
    html,
    text,
  });
}

// 4. Password Changed Security Alert
export function sendPasswordChangedEmail(userEmail: string, userName?: string) {
  if (!userEmail) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 24px; }
          .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; padding: 24px; }
          .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; }
          .warning { background: #fff7ed; border-left: 4px solid #f97316; padding: 14px; border-radius: 4px; margin: 16px 0; font-size: 14px; color: #9a3412; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 class="title">Security Notice: Password Changed</h2>
          <p>Hello ${escapeHtml(userName || 'there')},</p>
          <p>Your FocusForge account password was recently changed.</p>
          <div class="warning">
            If you made this change, no further action is required. If you did not make this change, please reset your password immediately or contact our support team at ${SUPPORT_EMAIL}.
          </div>
          <p>Best regards,<br />FocusForge Security Team</p>
          <div class="footer">
            FocusForge Security Notification &bull; ${new Date().toUTCString()}
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Security Notice: Password Changed

Hello ${userName || 'there'},

Your FocusForge account password was recently changed.

If you made this change, no further action is required. If you did not make this change, please reset your password immediately or contact support at ${SUPPORT_EMAIL}.

Best regards,
FocusForge Security Team
  `.trim();

  emailQueue.enqueue({
    to: userEmail,
    subject: `Security Alert: FocusForge Password Changed`,
    html,
    text,
  });
}

// 5. Account Deletion Confirmation Notice
export function sendAccountDeletedEmail(userEmail: string, userName?: string) {
  if (!userEmail) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 24px; }
          .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; padding: 24px; }
          .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 class="title">FocusForge Account Deleted</h2>
          <p>Hello ${escapeHtml(userName || 'there')},</p>
          <p>Your FocusForge account and all associated personal data (tasks, notes, diary entries, focus sessions, and preferences) have been permanently deleted as requested.</p>
          <p>Thank you for having been a part of FocusForge. If you wish to use the app again in the future, you are welcome to create a new account anytime.</p>
          <p>Best regards,<br />FocusForge Team</p>
          <div class="footer">
            FocusForge &bull; Account Deletion Confirmation
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
FocusForge Account Deleted

Hello ${userName || 'there'},

Your FocusForge account and all associated personal data have been permanently deleted as requested.

Thank you for using FocusForge.

Best regards,
FocusForge Team
  `.trim();

  emailQueue.enqueue({
    to: userEmail,
    subject: `FocusForge Account Deleted`,
    html,
    text,
  });
}

// 6. 6-Digit Email Verification Code
export async function sendVerificationOtpEmail(to: string, otpCode: string, recipientName?: string): Promise<boolean> {
  if (!to) return false;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 24px; margin: 0; }
          .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 540px; margin: 0 auto; padding: 32px 24px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
          .brand { font-size: 22px; font-weight: 800; color: #0356C5; margin-bottom: 20px; display: inline-block; letter-spacing: -0.02em; }
          .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
          .sub { font-size: 15px; color: #475569; margin: 0 0 24px; line-height: 1.5; }
          .otp-box { background: #f0f6ff; border: 1.5px dashed #0356C5; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0356C5; font-family: monospace, sans-serif; }
          .expire-note { font-size: 13px; color: #64748b; margin-top: 10px; }
          .tip-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #334155; }
          .footer { font-size: 12px; color: #94a3b8; margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">FocusForge</div>
          <h2 class="title">Verify your email address</h2>
          <p class="sub">Hello ${escapeHtml(recipientName || 'there')},<br />Use the 6-digit verification code below to complete your FocusForge account registration.</p>
          
          <div class="otp-box">
            <div class="otp-code">${escapeHtml(otpCode)}</div>
            <div class="expire-note">This code expires in 15 minutes.</div>
          </div>

          <div class="tip-box">
            <strong>Tip:</strong> If you don't receive future updates in your primary inbox, please check your <strong>Gmail Spam or Promotions</strong> folder and mark us as "Not Spam".
          </div>

          <p style="font-size: 13px; color: #64748b; margin: 0;">If you did not request this verification code, please ignore this email.</p>
          
          <div class="footer">
            &copy; 2026 FocusForge &bull; Secure Authentication System
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
FocusForge Email Verification

Hello ${recipientName || 'there'},

Your 6-digit verification code is: ${otpCode}

This code expires in 15 minutes.

If you did not request this code, you can safely ignore this email.

Best regards,
FocusForge Team
  `.trim();

  return await emailQueue.sendDirect({
    to,
    subject: `${otpCode} is your FocusForge verification code`,
    html,
    text,
  });
}

