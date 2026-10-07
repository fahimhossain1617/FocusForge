-- Migration: 026_user_encryption_keys_and_e2ee.sql
-- Description: Creates user_encryption_keys and user_encrypted_data tables for zero-knowledge envelope-key architecture.
-- Enforces strict Row Level Security (RLS) policies allowing only authenticated users to access their own keys/data.

-- ====================================================================
-- 1. USER ENCRYPTION KEYS TABLE
-- Stores the wrapped Master Encryption Key (MEK) and KDF metadata.
-- The server never possesses the plaintext MEK or user passphrase.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.user_encryption_keys (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    key_version INTEGER NOT NULL DEFAULT 1,
    algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
    kdf_algorithm TEXT NOT NULL DEFAULT 'PBKDF2-SHA256',
    kdf_salt TEXT NOT NULL,
    kdf_params JSONB NOT NULL DEFAULT '{"iterations": 250000, "hash": "SHA-256"}'::jsonb,
    wrapped_master_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_encryption_keys' AND policyname = 'Users can manage their own encryption keys'
  ) THEN
    CREATE POLICY "Users can manage their own encryption keys"
        ON public.user_encryption_keys
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_user_id ON public.user_encryption_keys(user_id);

-- ====================================================================
-- 2. USER ENCRYPTED DATA TABLE (AGGREGATE STATE BACKUP)
-- Stores whole-state encrypted snapshot backups alongside record-level sync.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.user_encrypted_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    data_version BIGINT NOT NULL DEFAULT 1,
    encrypted_data TEXT NOT NULL,
    client_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.user_encrypted_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_encrypted_data' AND policyname = 'Users can manage their own encrypted data'
  ) THEN
    CREATE POLICY "Users can manage their own encrypted data"
        ON public.user_encrypted_data
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ====================================================================
-- 3. ENSURE RECORD-LEVEL ENCRYPTED SYNC TABLE EXISTS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.encrypted_sync_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    salt TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    device_id TEXT NOT NULL DEFAULT 'unknown',
    client_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    server_synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_store_record UNIQUE (user_id, store_name, record_id)
);

ALTER TABLE public.encrypted_sync_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'encrypted_sync_records' AND policyname = 'Users can manage own encrypted sync records'
  ) THEN
    CREATE POLICY "Users can manage own encrypted sync records"
        ON public.encrypted_sync_records
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_encrypted_sync_user_server_synced 
    ON public.encrypted_sync_records (user_id, server_synced_at);

CREATE INDEX IF NOT EXISTS idx_encrypted_sync_user_store 
    ON public.encrypted_sync_records (user_id, store_name);
