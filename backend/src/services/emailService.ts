import nodemailer, { type Transporter } from 'nodemailer';

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@focusforge.app';
export const SUPPORT_INBOX_EMAIL = process.env.SUPPORT_INBOX_EMAIL || 'fahimhossain1617@gmail.com';
export const APP_URL = process.env.APP_URL || 'http://localhost:3000';

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
      if (!this.transporter) this.initTransporter();

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
      } else {
        console.log(`[EmailQueue - Local Mock] To: ${currentJob.to} | Subject: ${currentJob.subject}`);
      }
    } catch (err: any) {
      console.error(`[EmailQueue] Error sending email to ${currentJob.to}:`, err?.message);
      if (currentJob.retries < currentJob.maxRetries) {
        currentJob.retries += 1;
        currentJob.delayMs *= 2;
        setTimeout(() => {
          this.queue.push(currentJob);
          this.processNext();
        }, currentJob.delayMs);
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) setTimeout(() => this.processNext(), 500);
    }
  }
}

const emailQueue = new EmailQueue();

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
    <div style="font-family: sans-serif; line-height: 1.6; padding: 20px; color: #1e293b; background-color: #f8fafc;">
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-top: 0; color: #0f172a;">[${escapeHtml(ticket.ticketNumber)}] New ${escapeHtml(ticket.type.toUpperCase())}</h2>
        <p><strong>From:</strong> ${escapeHtml(ticket.senderName)} (${escapeHtml(ticket.senderEmail || 'No email provided')})</p>
        <p><strong>Category:</strong> ${escapeHtml(ticket.category || 'General')}</p>
        <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
        <p><strong>User Status:</strong> ${ticket.isGuest ? 'Guest' : 'Registered'}</p>
        <div style="background: #f1f5f9; padding: 16px; border-left: 4px solid #3b82f6; margin: 16px 0; border-radius: 4px; white-space: pre-wrap;">
          ${escapeHtml(ticket.message)}
        </div>
        ${attachmentsHtml}
        <p style="margin-top: 20px;"><a href="${supervisorTicketUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View in Supervisor Portal</a></p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Support Inbox: ${SUPPORT_INBOX_EMAIL}</p>
      </div>
    </div>
  `;
  const text = `Ticket: ${ticket.ticketNumber}\nType: ${ticket.type}\nCategory: ${ticket.category || 'General'}\nFrom: ${ticket.senderName} (${ticket.senderEmail || 'No email'})\nSubject: ${ticket.subject}\n\n${ticket.message}\n\nLink: ${supervisorTicketUrl}`;

  emailQueue.enqueue({
    to: SUPPORT_INBOX_EMAIL,
    replyTo: ticket.senderEmail || undefined,
    subject: `[${ticket.ticketNumber}] ${ticket.type.toUpperCase()}: ${ticket.subject}`,
    html,
    text,
  });
}

export function sendSupportConfirmationToUser(ticket: {
  ticketNumber: string;
  senderName: string;
  senderEmail: string;
  subject: string;
}) {
  if (!ticket.senderEmail) return;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; padding: 20px;">
      <h2>We have received your message</h2>
      <p>Hello ${escapeHtml(ticket.senderName || 'there')},</p>
      <p>Your support request <strong>${escapeHtml(ticket.ticketNumber)}</strong> has been received. Our team will review it shortly.</p>
    </div>
  `;
  const text = `Hello ${ticket.senderName || 'there'},\n\nYour support request ${ticket.ticketNumber} (${ticket.subject}) has been received.\n\nBest regards,\nFocusForge Team`;

  emailQueue.enqueue({
    to: ticket.senderEmail,
    subject: `[${ticket.ticketNumber}] Support Request Received - FocusForge`,
    html,
    text,
  });
}

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
    <div style="font-family: sans-serif; line-height: 1.6; padding: 20px;">
      <h2>Update on Support Ticket ${escapeHtml(ticket.ticketNumber)}</h2>
      <p>Hello ${escapeHtml(ticket.recipientName || 'there')},</p>
      <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0;">
        ${escapeHtml(ticket.replyMessage)}
      </div>
      <p>Best regards,<br />${escapeHtml(ticket.supervisorName)} - FocusForge Team</p>
    </div>
  `;
  const text = `Hello ${ticket.recipientName || 'there'},\n\nUpdate on ticket ${ticket.ticketNumber}:\n\n${ticket.replyMessage}\n\nBest regards,\n${ticket.supervisorName} - FocusForge Team`;

  emailQueue.enqueue({
    to: ticket.recipientEmail,
    replyTo: SUPPORT_INBOX_EMAIL,
    subject: `Re: [${ticket.ticketNumber}] ${ticket.subject}`,
    html,
    text,
  });
}

export function sendPasswordChangedEmail(userEmail: string, userName?: string) {
  if (!userEmail) return;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; padding: 20px;">
      <h2>Security Alert: Password Changed</h2>
      <p>Hello ${escapeHtml(userName || 'there')},</p>
      <p>Your FocusForge account password was recently changed. If you did not make this change, please contact support immediately.</p>
    </div>
  `;
  const text = `Security Alert: Your FocusForge password was recently changed. If you did not make this change, please contact support immediately.`;

  emailQueue.enqueue({
    to: userEmail,
    subject: `Security Alert: FocusForge Password Changed`,
    html,
    text,
  });
}

export function sendAccountDeletedEmail(userEmail: string, userName?: string) {
  if (!userEmail) return;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; padding: 20px;">
      <h2>FocusForge Account Deleted</h2>
      <p>Hello ${escapeHtml(userName || 'there')},</p>
      <p>Your FocusForge account and all associated personal data have been permanently deleted.</p>
    </div>
  `;
  const text = `Your FocusForge account and all associated data have been permanently deleted.`;

  emailQueue.enqueue({
    to: userEmail,
    subject: `FocusForge Account Deleted`,
    html,
    text,
  });
}
