-- Migration: 011_ai_agent_history.sql
-- Description: Create tables for per-user AI Agent chat history

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    intent TEXT,
    payload_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON public.ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON public.ai_chat_messages(session_id);

-- Enable RLS
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for ai_chat_sessions
CREATE POLICY "Users can view their own ai chat sessions" 
    ON public.ai_chat_sessions 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ai chat sessions" 
    ON public.ai_chat_sessions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai chat sessions" 
    ON public.ai_chat_sessions 
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai chat sessions" 
    ON public.ai_chat_sessions 
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for ai_chat_messages
CREATE POLICY "Users can view their own ai chat messages" 
    ON public.ai_chat_messages 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ai_chat_sessions 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own ai chat messages" 
    ON public.ai_chat_messages 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_chat_sessions 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own ai chat messages" 
    ON public.ai_chat_messages 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.ai_chat_sessions 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

-- Trigger to update updated_at on ai_chat_sessions
CREATE OR REPLACE FUNCTION public.set_updated_at_ai_chat_sessions()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_chat_sessions_updated_at ON public.ai_chat_sessions;
CREATE TRIGGER trg_ai_chat_sessions_updated_at
BEFORE UPDATE ON public.ai_chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_ai_chat_sessions();
