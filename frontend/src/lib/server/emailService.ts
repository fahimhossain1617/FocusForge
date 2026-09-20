import nodemailer, { type Transporter } from 'nodemailer';

// Configuration
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@focusforge.app';
export const SUPPORT_INBOX_EMAIL = process.env.SUPPORT_INBOX_EMAIL || 'fahimhossain1617@gmail.com';
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
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER || '';
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
            <h2 class="title" style="margin-top: 8px;">New Support Ticket: ${escapeHtml(ticket.ticketNumber)}</h2>
          </div>
          <div class="meta">
            <div class="meta-item"><strong>From:</strong> ${escapeHtml(ticket.senderName)} (${escapeHtml(ticket.senderEmail)})</div>
            <div class="meta-item"><strong>User Status:</strong> ${ticket.isGuest ? 'Guest User' : 'Registered User'}</div>
            <div class="meta-item"><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</div>
            <div class="meta-item"><strong>App Version:</strong> ${escapeHtml(ticket.appVersion)}</div>
            ${ticket.browserInfo ? `<div class="meta-item"><strong>Environment:</strong> ${escapeHtml(ticket.browserInfo)}</div>` : ''}
          </div>
          <div class="message-box">${escapeHtml(ticket.message)}</div>
          <p>You can reply directly to this email to reach the user, or manage the ticket in the Supervisor portal:</p>
          <a href="${supervisorTicketUrl}" class="btn">Open in Supervisor Dashboard</a>
          <div class="footer">
            FocusForge Support System - Internal Notification
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
FocusForge Support Notification
Ticket: ${ticket.ticketNumber}
Type: ${ticket.type}
From: ${ticket.senderName} (${ticket.senderEmail})
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
