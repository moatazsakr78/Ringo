import { NextRequest, NextResponse } from 'next/server';
import { parseIncomingMessage, markMessageAsRead } from '@/app/lib/whatsapp';
import { createClient } from '@supabase/supabase-js';

// Supabase client for storing messages
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // WasenderAPI verification
  const challenge = searchParams.get('challenge');
  if (challenge) {
    console.log('✅ WasenderAPI Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  // Also support Meta-style verification (for compatibility)
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const hubChallenge = searchParams.get('hub.challenge');
  const verifyToken = process.env.WASENDER_WEBHOOK_SECRET || process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook verified successfully');
    return new NextResponse(hubChallenge, { status: 200 });
  }

  // If no verification params, return simple OK for health check
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint active' }, { status: 200 });
}

// POST - Receive incoming messages from WasenderAPI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📩 Webhook received:', JSON.stringify(body, null, 2));

    // WasenderAPI webhook format
    // Events: messages.upsert, messages.received, messages.update, etc.
    const event = body.event || body.type;
    const data = body.data || body.message || body;

    // Handle different event types
    if (event === 'messages.upsert' || event === 'messages.received' || event === 'message') {
      // Process incoming message
      const messages = Array.isArray(data) ? data : [data];

      for (const msgData of messages) {
        // Skip outgoing messages
        if (msgData.key?.fromMe || msgData.fromMe) {
          continue;
        }

        const message = parseIncomingMessage(msgData);

        if (message) {
          console.log('📱 New message from:', message.customerName, '-', message.text);

          // Store message in database
          try {
            const { error: dbError } = await supabase
              .schema('elfaroukgroup')
              .from('whatsapp_messages')
              .insert({
                message_id: message.messageId,
                from_number: message.from,
                customer_name: message.customerName,
                message_text: message.text,
                message_type: 'incoming',
                media_type: message.mediaType || 'text',
                media_url: message.mediaUrl || null,
                is_read: false,
                created_at: message.timestamp.toISOString(),
              });

            if (dbError) {
              console.error('Database error:', dbError.message);
            }
          } catch (dbErr) {
            console.error('Failed to store message:', dbErr);
          }

          // Mark message as read
          if (message.messageId) {
            await markMessageAsRead(message.messageId);
          }
        }
      }
    } else if (event === 'messages.update' || event === 'message.update') {
      // Message status update (delivered, read, etc.)
      console.log('📊 Message status update:', data);
    } else if (event === 'connection.update' || event === 'session.update') {
      // Session status update
      console.log('🔗 Connection update:', data);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent retries
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
