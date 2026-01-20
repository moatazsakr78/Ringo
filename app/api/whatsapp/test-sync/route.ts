import { NextResponse } from 'next/server';
import { fetchMessageLogs } from '@/app/lib/whatsapp';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Test the sync endpoint and return detailed debug info
export async function GET() {
  try {
    console.log('🧪 Testing WhatsApp sync endpoint...');

    // Check environment variables
    const envCheck = {
      WASENDER_API_TOKEN: !!process.env.WASENDER_API_TOKEN,
      WASENDER_SESSION_ID: process.env.WASENDER_SESSION_ID || 'NOT SET',
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    };

    console.log('🔧 Environment check:', envCheck);

    // Try to fetch message logs with detailed debug
    const { logs, debug } = await fetchMessageLogs(10);

    // Sample of first 3 messages if available
    const sampleMessages = logs.slice(0, 3).map(log => ({
      id: log.id,
      from: log.from,
      to: log.to,
      fromMe: log.fromMe,
      messageBody: log.messageBody?.substring(0, 50) + (log.messageBody?.length > 50 ? '...' : ''),
      messageType: log.messageType,
      timestamp: new Date(log.timestamp > 9999999999 ? log.timestamp : log.timestamp * 1000).toISOString(),
    }));

    return NextResponse.json({
      success: true,
      environment: envCheck,
      debug: debug,
      messageCount: logs.length,
      sampleMessages,
      message: logs.length > 0
        ? `Found ${logs.length} messages from WasenderAPI`
        : debug.error || 'No messages found - check debug info for details'
    });

  } catch (error) {
    console.error('🧪 Test sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
