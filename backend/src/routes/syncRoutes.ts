import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../services/db';

const router = Router();

// Ensure encrypted_sync_records table exists with minimal metadata
const initSyncTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS encrypted_sync_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        store_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        salt TEXT DEFAULT '',
        version INTEGER DEFAULT 1,
        is_deleted BOOLEAN DEFAULT false,
        device_id TEXT,
        client_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        server_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_user_store_record UNIQUE (user_id, store_name, record_id)
      );
      CREATE INDEX IF NOT EXISTS idx_enc_sync_user_time ON encrypted_sync_records(user_id, server_synced_at DESC);
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
          user_id, store_name, record_id, ciphertext, iv, salt, version, is_deleted, device_id, client_updated_at, server_synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (user_id, store_name, record_id) DO UPDATE SET
          ciphertext = EXCLUDED.ciphertext,
          iv = EXCLUDED.iv,
          salt = EXCLUDED.salt,
          version = EXCLUDED.version,
          is_deleted = EXCLUDED.is_deleted,
          device_id = EXCLUDED.device_id,
          client_updated_at = EXCLUDED.client_updated_at,
          server_synced_at = NOW()
        `,
        [
          userId,
          collection,
          String(id),
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
      SELECT record_id as id, store_name as collection, ciphertext, iv, salt, version, is_deleted as "isDeleted", client_updated_at as "updatedAt", device_id as "deviceId"
      FROM encrypted_sync_records
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (since && !isNaN(Date.parse(since))) {
      query += ` AND server_synced_at > $2`;
      params.push(new Date(since).toISOString());
    }

    query += ` ORDER BY server_synced_at ASC LIMIT 500`;

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
 * GET /api/crypto/keys
 * Fetches user encryption key envelope metadata.
 */
router.get('/keys', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId || userId === 'guest') {
    return res.status(401).json({ exists: false, error: 'Authentication required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT key_version, algorithm, kdf_algorithm, kdf_salt, kdf_params, wrapped_master_key, created_at, updated_at
       FROM user_encryption_keys
       WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.json({ exists: false });
    }

    const row = rows[0];
    let iv = '';
    let wrappedKeyCiphertext = row.wrapped_master_key;
    if (row.wrapped_master_key && row.wrapped_master_key.includes(':')) {
      const parts = row.wrapped_master_key.split(':');
      iv = parts[0];
      wrappedKeyCiphertext = parts[1];
    }

    res.json({
      exists: true,
      envelope: {
        version: row.key_version,
        algorithm: row.algorithm,
        kdf: {
          algorithm: row.kdf_algorithm,
          salt: row.kdf_salt,
          parameters: typeof row.kdf_params === 'string' ? JSON.parse(row.kdf_params) : (row.kdf_params || {}),
        },
        iv,
        wrappedKeyCiphertext,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err: any) {
    console.warn('[SyncRoutes] Fetch encryption keys error:', err?.message);
    res.status(500).json({ exists: false, error: err?.message });
  }
});

/**
 * POST /api/crypto/keys
 * Stores wrapped Master Encryption Key envelope.
 */
router.post('/keys', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId || userId === 'guest') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { envelope } = req.body;
  if (!envelope || !envelope.wrappedKeyCiphertext || !envelope.kdf) {
    return res.status(400).json({ error: 'Invalid envelope payload' });
  }

  try {
    const serializedWrappedKey = `${envelope.iv || ''}:${envelope.wrappedKeyCiphertext}`;
    await pool.query(
      `
      INSERT INTO user_encryption_keys (
        user_id, key_version, algorithm, kdf_algorithm, kdf_salt, kdf_params, wrapped_master_key, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        key_version = EXCLUDED.key_version,
        algorithm = EXCLUDED.algorithm,
        kdf_algorithm = EXCLUDED.kdf_algorithm,
        kdf_salt = EXCLUDED.kdf_salt,
        kdf_params = EXCLUDED.kdf_params,
        wrapped_master_key = EXCLUDED.wrapped_master_key,
        updated_at = NOW()
      `,
      [
        userId,
        envelope.version || 1,
        envelope.algorithm || 'AES-256-GCM',
        envelope.kdf.algorithm || 'PBKDF2-SHA256',
        envelope.kdf.salt,
        JSON.stringify(envelope.kdf.parameters || {}),
        serializedWrappedKey,
      ]
    );

    res.json({ success: true });
  } catch (err: any) {
    console.warn('[SyncRoutes] Save encryption keys error:', err?.message);
    res.status(500).json({ error: err?.message || 'Failed to save encryption keys' });
  }
});

/**
 * DELETE /api/crypto/keys
 * Resets user encryption keys and sync data.
 */
router.delete('/keys', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId || userId === 'guest') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    await pool.query(`DELETE FROM user_encryption_keys WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM encrypted_sync_records WHERE user_id = $1`, [userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to reset encryption keys' });
  }
});

export default router;

