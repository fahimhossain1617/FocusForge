import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  dbCheckUserRole,
  dbGetSupportTickets,
  dbGetSupportTicketById,
  dbUpdateSupportTicket,
  dbAddTicketReply,
  dbGetTicketReplies,
  dbLogSupervisorAction,
  dbGetSupervisorAuditLogs,
} from '../services/db';
import { ERROR_CODES } from '../services/validation';
import { sendSupervisorReplyToUser } from '../services/emailService';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/supervisor/role
 * Check if the authenticated user has supervisor or admin privileges
 */
router.get('/role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ isSupervisor: false, roles: [] });
    }

    const roles = await dbCheckUserRole(userId);
    const isSupervisor = roles.includes('supervisor') || roles.includes('admin');
    res.json({ isSupervisor, roles });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check supervisor role' });
  }
});

/**
 * GET /api/supervisor/tickets
 * List support tickets with optional filters
 */
router.get('/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED });
    }

    const roles = await dbCheckUserRole(userId);
    if (!roles.includes('supervisor') && !roles.includes('admin')) {
      return res.status(403).json({ error: 'Supervisor access required', code: ERROR_CODES.FORBIDDEN });
    }

    const { type, status, priority, unread, search, limit, offset } = req.query;

    const tickets = await dbGetSupportTickets({
      type: typeof type === 'string' ? type : undefined,
      status: typeof status === 'string' ? status : undefined,
      priority: typeof priority === 'string' ? priority : undefined,
      unreadOnly: unread === 'true',
      search: typeof search === 'string' ? search : undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch tickets' });
  }
});

/**
 * GET /api/supervisor/tickets/:id
 * Get single ticket details and conversation thread
 */
router.get('/tickets/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED });
    }

    const roles = await dbCheckUserRole(userId);
    if (!roles.includes('supervisor') && !roles.includes('admin')) {
      return res.status(403).json({ error: 'Supervisor access required', code: ERROR_CODES.FORBIDDEN });
    }

    const ticketId = req.params.id as string;
    const ticket = await dbGetSupportTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found', code: ERROR_CODES.NOT_FOUND });
    }

    const replies = await dbGetTicketReplies(ticket.id);
    res.json({ ticket, replies });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load ticket' });
  }
});

/**
 * PATCH /api/supervisor/tickets/:id
 * Update ticket status, priority, internal notes, or assign supervisor
 */
router.patch('/tickets/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED });
    }

    const roles = await dbCheckUserRole(userId);
    if (!roles.includes('supervisor') && !roles.includes('admin')) {
      return res.status(403).json({ error: 'Supervisor access required', code: ERROR_CODES.FORBIDDEN });
    }

    const ticketId = req.params.id as string;
    const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';

    const updated = await dbUpdateSupportTicket(ticketId, req.body);
    await dbLogSupervisorAction(userId, 'UPDATE_TICKET', 'support_tickets', ticketId, req.body, clientIp);

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update ticket' });
  }
});

/**
 * POST /api/supervisor/tickets/:id/reply
 * Post a reply from a supervisor to a support ticket
 */
router.post('/tickets/:id/reply', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED });
    }

    const roles = await dbCheckUserRole(userId);
    if (!roles.includes('supervisor') && !roles.includes('admin')) {
      return res.status(403).json({ error: 'Supervisor access required', code: ERROR_CODES.FORBIDDEN });
    }

    const ticketId = req.params.id as string;
    const { message: replyMessage, supervisorName = 'Supervisor' } = req.body;

    if (!replyMessage || !replyMessage.trim()) {
      return res.status(400).json({ error: 'Reply message cannot be empty', code: ERROR_CODES.INVALID_INPUT });
    }

    const ticket = await dbGetSupportTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found', code: ERROR_CODES.NOT_FOUND });
    }

    const reply = await dbAddTicketReply({
      ticketId: ticket.id,
      senderRole: 'supervisor',
      senderId: userId,
      senderName: supervisorName,
      message: replyMessage,
    });

    const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
    await dbLogSupervisorAction(userId, 'REPLY_TICKET', 'support_tickets', ticket.id, { ticketNumber: ticket.ticketNumber }, clientIp);

    if (ticket.email) {
      sendSupervisorReplyToUser({
        ticketNumber: ticket.ticketNumber,
        recipientName: ticket.name || 'there',
        recipientEmail: ticket.email,
        subject: ticket.subject,
        supervisorName,
        replyMessage,
      });
    }

    res.json({ success: true, reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to post reply' });
  }
});

/**
 * GET /api/supervisor/audit-logs
 * List supervisor audit trail (admin-only)
 */
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED });
    }

    const roles = await dbCheckUserRole(userId);
    if (!roles.includes('admin')) {
      return res.status(403).json({ error: 'Admin access required', code: ERROR_CODES.FORBIDDEN });
    }

    const logs = await dbGetSupervisorAuditLogs(100);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
});

export default router;
