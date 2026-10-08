// Supabase Edge Function: send-push
// Handles background Web Push delivery triggered by database webhooks, cron jobs, or API calls.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VAPID_PUBLIC_KEY =
  Deno.env.get('VAPID_PUBLIC_KEY') ||
  'BKiTIGiwQ4QM67m8BPFRtckuTY3jxOwNRM6m5sltJurz-ygl6jMf0mKLoQOIqPArqMEo2sVaU5TaQxvqyNy8irU';

const VAPID_PRIVATE_KEY =
  Deno.env.get('VAPID_PRIVATE_KEY') ||
  'DuHT8XxURd3NTsnVZC5UvEXgZfdt25Wh11aTxO5CBaM';

const VAPID_SUBJECT =
  Deno.env.get('VAPID_SUBJECT') ||
  'mailto:focentia13@gmail.com';

try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
} catch (err) {
  console.warn('[Edge Function WebPush] VAPID initialization warning:', err);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json();
    const { userId, payload } = body;

    if (!userId || !payload) {
      return new Response(JSON.stringify({ error: 'Missing userId or payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Retrieve active push subscriptions for user
    const { data: subscriptions, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active push subscriptions for user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payloadString = JSON.stringify({
      title: payload.title || 'Focentia',
      body: payload.body || payload.message || 'Notification update',
      id: payload.id || `push_${Date.now()}`,
      category: payload.category || 'system',
      actionRoute: payload.actionRoute || '',
      targetUrl: payload.targetUrl || (payload.actionRoute ? `/?page=${encodeURIComponent(payload.actionRoute)}` : '/'),
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-large.png?v=max_zoom_1',
      tag: payload.tag || `focentia-${payload.category || 'system'}`,
      requireInteraction: Boolean(payload.requireInteraction),
      isUrgent: Boolean(payload.isUrgent),
      actions: payload.actions,
      data: payload.data || {},
      timestamp: payload.timestamp || Date.now(),
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payloadString, {
          TTL: 86400,
          urgency: payload.isUrgent ? 'high' : 'normal',
        });
        sent++;
      } catch (err: any) {
        failed++;
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          // Remove dead subscription
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent, failed, total: subscriptions.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
