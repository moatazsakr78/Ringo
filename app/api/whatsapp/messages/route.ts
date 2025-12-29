import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch all messages (for chat UI)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phoneNumber = searchParams.get('phone');

    // Try to fetch from database first
    let query = supabase
      .schema('elfaroukgroup')
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (phoneNumber) {
      query = query.eq('from_number', phoneNumber);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist, return empty array
      console.log('Database query error:', error.message);
      return NextResponse.json({ messages: [], conversations: [] });
    }

    // Group messages by phone number for conversations view
    const conversations = new Map<string, {
      phoneNumber: string;
      customerName: string;
      lastMessage: string;
      lastMessageTime: string;
      lastSender: 'customer' | 'me';
      unreadCount: number;
    }>();

    for (const msg of data || []) {
      const existing = conversations.get(msg.from_number);
      const isOutgoing = msg.message_type === 'outgoing';

      if (!existing) {
        // First message for this conversation
        conversations.set(msg.from_number, {
          phoneNumber: msg.from_number,
          // Use customer name only from incoming messages, otherwise keep phone number
          customerName: isOutgoing ? msg.from_number : msg.customer_name,
          lastMessage: msg.message_text,
          lastMessageTime: msg.created_at,
          lastSender: isOutgoing ? 'me' : 'customer',
          unreadCount: !isOutgoing && !msg.is_read ? 1 : 0,
        });
      } else {
        // Update customer name if this is an incoming message (to get the real customer name)
        if (!isOutgoing && msg.customer_name && msg.customer_name !== 'الفاروق جروب') {
          existing.customerName = msg.customer_name;
        }

        // Update last message if this is newer
        if (new Date(msg.created_at) > new Date(existing.lastMessageTime)) {
          existing.lastMessage = msg.message_text;
          existing.lastMessageTime = msg.created_at;
          existing.lastSender = isOutgoing ? 'me' : 'customer';
        }

        // Count unread incoming messages
        if (!isOutgoing && !msg.is_read) {
          existing.unreadCount++;
        }
      }
    }

    // Sort conversations by lastMessageTime (newest first)
    const sortedConversations = Array.from(conversations.values()).sort((a, b) =>
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return NextResponse.json({
      messages: data || [],
      conversations: sortedConversations,
    });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return NextResponse.json({ messages: [], conversations: [] });
  }
}
