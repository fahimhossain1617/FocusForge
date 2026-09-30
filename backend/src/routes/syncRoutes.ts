import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../services/db';

const router = Router();

// Ensure encrypted_sync_records table exists with minimal metadata
const initSyncTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS encrypted_sync_records (
        user_id UUID NOT NULL,
        item_id TEXT NOT NULL,
        collection TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        salt TEXT DEFAULT '',
        version INTEGER DEFAULT 1,
        is_deleted BOOLEAN DEFAULT false,
        device_id TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (user_id, collection, item_id)
      );
      CREATE INDEX IF NOT EXISTS idx_enc_sync_user_time ON encrypted_sync_records(user_id, updated_at DESC);
    `);
  } catch (err: any) {
    console.warn('[SyncRoutes] Auto-init sync table notice:', err?.message);
  }
};

initSyncTable().catch(() => {});

// In-memory fallback if db connection is temporarily unreachable
const inMemorySyncStore = new Map<string, any[]>();

/**
 * POST /api/sync/push
 * Stores opaque encrypted ciphertext blobs from authorized client device.
 * Server CANNOT decrypt or read the contents.
 */
router.post('/push', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId || userId === 'guest') {
    return res.status(401).json({ error: 'Authentication required for synchronization' });
  }

  const { items, deviceId } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({ success: true, count: 0 });
  }

  try {
    for (const item of items) {
      const { id, collection, ciphertext, iv, salt, version, isDeleted, updatedAt } = item;
      if (!id || !collection || !ciphertext || !iv) continue;

      await pool.query(
        `
        INSERT INTO encrypted_sync_records (
          user_id, item_id, collection, ciphertext, iv, salt, version, is_deleted, device_id, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, collection, item_id) DO UPDATE SET
          ciphertext = EXCLUDED.ciphertext,
          iv = EXCLUDED.iv,
          salt = EXCLUDED.salt,
          version = EXCLUDED.version,
          is_deleted = EXCLUDED.is_deleted,
          device_id = EXCLUDED.device_id,
          updated_at = EXCLUDED.updated_at
        `,
        [
          userId,
          String(id),
          collection,
          ciphertext,
          iv,
          salt || '',
          version || 1,
          Boolean(isDeleted),
          deviceId || item.deviceId || 'unknown',
          updatedAt || new Date().toISOString(),
        ]
      );
    }

    res.json({ success: true, count: items.length });
  } catch (err: any) {
    console.warn('[SyncRoutes] DB push warning, using fallback buffer:', err?.message);
    const existing = inMemorySyncStore.get(userId) || [];
    inMemorySyncStore.set(userId, [...existing, ...items]);
    res.json({ success: true, count: items.length, fallback: true });
  }
});

/**
 * POST /api/sync/pull
 * Delivers opaque encrypted ciphertext blobs to authorized client device.
 */
router.post('/pull', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId || userId === 'guest') {
    return res.status(401).json({ error: 'Authentication required for synchronization' });
  }

  const { since, deviceId } = req.body;

  try {
    let query = `
      SELECT item_id as id, collection, ciphertext, iv, salt, version, is_deleted as "isDeleted", updated_at as "updatedAt", device_id as "deviceId"
      FROM encrypted_sync_records
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (since && !isNaN(Date.parse(since))) {
      query += ` AND updated_at > $2`;
      params.push(new Date(since).toISOString());
    }

    query += ` ORDER BY updated_at ASC LIMIT 500`;

    const { rows } = await pool.query(query, params);
    res.json({
      success: true,
      items: rows,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[SyncRoutes] DB pull warning, checking fallback buffer:', err?.message);
    const items = inMemorySyncStore.get(userId) || [];
    res.json({
      success: true,
      items,
      serverTime: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/sync/purge
 * Completely wipes all encrypted sync records for this user (Account Deletion Option B).
 */
router.delete('/purge', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId || userId === 'guest') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    await pool.query(`DELETE FROM encrypted_sync_records WHERE user_id = $1`, [userId]);
    inMemorySyncStore.delete(userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to purge sync records' });
  }
});

export default router;
