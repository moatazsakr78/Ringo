import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  decryptAndStoreMedia,
  hasMediaContent,
  getMediaType,
  syncContactWithProfilePicture,
  cleanPhoneNumber
} from '@/app/lib/whatsapp';

// Supabase client for storing messages (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Supabase client for broadcasting (Anon Key - required for Realtime)
const supabaseForBroadcast = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
    const event = body.event || body.type;

    // Handle both messages.received and messages.upsert events
    // messages.upsert is used for outgoing messages sent from mobile WhatsApp Business app
    if (event === 'messages.received' || event === 'messages.upsert') {
      // WasenderAPI format: data.messages is a single object (not array)
      const messagesData = body.data?.messages;

      if (!messagesData) {
        console.log('⚠️ No messages data in webhook payload');
        return NextResponse.json({ status: 'received' }, { status: 200 });
      }

      // Handle both single object and array formats
      const messages = Array.isArray(messagesData) ? messagesData : [messagesData];

      for (const msgData of messages) {
        const key = msgData.key || {};
        const isOutgoing = key.fromMe === true;

        // Process both incoming and outgoing messages
        // Outgoing messages from mobile WhatsApp app need to be stored too

        // Parse WasenderAPI message format with isOutgoing flag
        const message = await parseWasenderMessage(msgData, isOutgoing);

        if (message) {
          // Extra validation before storing
          if (!message.from || message.from.trim() === '') {
            console.warn('⚠️ Skipping message: invalid phone number');
            continue;
          }
          if (!message.messageId) {
            console.warn('⚠️ Skipping message: missing message ID');
            continue;
          }

          const msgDirection = isOutgoing ? '📤 Outgoing' : '📥 Incoming';
          console.log(`${msgDirection} message (${event}):`, message.customerName, '-', message.text);

          // Check if message contains media that needs decryption
          let mediaUrl = message.mediaUrl;
          if (hasMediaContent(msgData)) {
            const mediaType = getMediaType(msgData);
            if (mediaType !== 'text') {
              console.log('🖼️ Processing media message:', mediaType);
              const storedUrl = await decryptAndStoreMedia(msgData, message.messageId, mediaType as 'image' | 'video' | 'audio' | 'document');
              if (storedUrl) {
                mediaUrl = storedUrl;
                console.log('✅ Media URL obtained:', storedUrl);
              } else {
                console.log('⚠️ Could not decrypt/store media, using placeholder');
              }
            }
          }

          // Use upsert to prevent duplicates (atomic operation)
          // Store both incoming and outgoing messages
          // For outgoing messages from real WhatsApp app, customer_name should be the recipient name
          // but we use 'الفاروق جروب' as sender name for display consistency
          const { error: dbError } = await supabase
            .schema('elfaroukgroup')
            .from('whatsapp_messages')
            .upsert({
              message_id: message.messageId,
              msg_id: message.msgId || null, // WasenderAPI integer ID for replyTo
              from_number: message.from,
              customer_name: isOutgoing ? 'الفاروق جروب' : message.customerName,
              message_text: message.text,
              message_type: isOutgoing ? 'outgoing' : 'incoming',
              media_type: message.mediaType || 'text',
              media_url: mediaUrl || null,
              is_read: isOutgoing ? true : false, // Outgoing messages are always "read"
              created_at: message.timestamp.toISOString(),
              // Quoted/Reply message fields
              quoted_message_id: message.quotedMessageId || null,
              quoted_message_text: message.quotedMessageText || null,
              quoted_message_sender: message.quotedMessageSender || null,
            }, {
              onConflict: 'message_id',
              ignoreDuplicates: true
            });

          if (dbError) {
            console.error('❌ Database error:', dbError.message);
          } else {
            console.log('✅ Message stored successfully');

            // ============================================
            // BROADCAST: إرسال إشعار للـ clients المتصلين
            // ============================================
            const messageData = {
              id: message.messageId,
              message_id: message.messageId,
              msg_id: message.msgId || null,
              from_number: message.from,
              customer_name: isOutgoing ? 'الفاروق جروب' : message.customerName,
              message_text: message.text,
              message_type: isOutgoing ? 'outgoing' : 'incoming',
              media_type: message.mediaType || 'text',
              media_url: mediaUrl || null,
              is_read: isOutgoing ? true : false,
              created_at: message.timestamp.toISOString(),
              quoted_message_id: message.quotedMessageId || null,
              quoted_message_text: message.quotedMessageText || null,
              quoted_message_sender: message.quotedMessageSender || null,
            };

            // إرسال broadcast لجميع الـ clients المتصلين
            // Use 'new_message' for outgoing, 'incoming_message' for incoming
            const broadcastEvent = isOutgoing ? 'new_message' : 'incoming_message';
            supabaseForBroadcast
              .channel('whatsapp_global')
              .send({
                type: 'broadcast',
                event: broadcastEvent,
                payload: messageData
              })
              .then(() => {
                console.log(`📡 Broadcast sent for ${isOutgoing ? 'outgoing' : 'incoming'} message`);
              })
              .catch((err) => {
                console.error('❌ Broadcast failed:', err);
              });

            // Sync contact and fetch profile picture for incoming messages
            syncContactWithProfilePicture(message.from, message.customerName)
              .then(contact => {
                if (contact?.profile_picture_url) {
                  console.log('📷 Contact profile picture synced:', contact.profile_picture_url);

                  // Broadcast profile picture update to all clients
                  supabaseForBroadcast
                    .channel('whatsapp_global')
                    .send({
                      type: 'broadcast',
                      event: 'profile_picture_updated',
                      payload: {
                        phone_number: message.from,
                        profile_picture_url: contact.profile_picture_url
                      }
                    })
                    .then(() => {
                      console.log('📡 Profile picture broadcast sent');
                    })
                    .catch((err) => {
                      console.error('❌ Profile picture broadcast failed:', err);
                    });
                }
              })
              .catch(err => console.error('❌ Error syncing contact:', err));
          }
        }
      }
    } else if (event === 'messages.update' || event === 'message.update') {
      // Message status update (delivered, read, etc.)
      console.log('📊 Message status update:', body.data);
    } else if (event === 'connection.update' || event === 'session.update') {
      // Session status update
      console.log('🔗 Connection update:', body.data);
    } else if (event === 'webhook.test') {
      // Test webhook event
      console.log('🧪 Webhook test received');
    } else if (event === 'messages.reaction') {
      // Handle reaction events
      console.log('👍 Reaction event received:', JSON.stringify(body.data, null, 2));

      const reactionsData = body.data;
      const reactions = Array.isArray(reactionsData) ? reactionsData : [reactionsData];

      for (const reactionData of reactions) {
        const key = reactionData.key || {};
        const reaction = reactionData.reaction || {};

        // Get the message ID that was reacted to
        const messageId = reaction.key?.id || key.id;
        const emoji = reaction.text;
        const fromNumber = key.cleanedSenderPn || key.remoteJid?.replace('@s.whatsapp.net', '').replace('@c.us', '') || '';
        const isFromMe = key.fromMe === true;

        if (messageId) {
          // If emoji is empty or null, it means removing the reaction
          if (!emoji || emoji === '') {
            const { error: deleteError } = await supabase
              .schema('elfaroukgroup')
              .from('whatsapp_reactions')
              .delete()
              .eq('message_id', messageId)
              .eq('from_number', fromNumber);

            if (deleteError) {
              console.error('❌ Error removing reaction:', deleteError.message);
            } else {
              console.log('🗑️ Reaction removed from message:', messageId);
            }
          } else {
            // Add or update the reaction
            const { error: upsertError } = await supabase
              .schema('elfaroukgroup')
              .from('whatsapp_reactions')
              .upsert({
                message_id: messageId,
                from_number: fromNumber,
                emoji: emoji,
                is_from_me: isFromMe
              }, {
                onConflict: 'message_id,from_number'
              });

            if (upsertError) {
              console.error('❌ Error storing reaction:', upsertError.message);
            } else {
              console.log('👍 Reaction stored:', emoji, 'on message:', messageId, 'from:', fromNumber);
            }
          }
        }
      }
    } else {
      console.log('📝 Unknown event type:', event);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Still return 200 to prevent retries
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

// Parse WasenderAPI message format
interface ParsedMessage {
  messageId: string;
  msgId?: number; // WasenderAPI integer ID for replyTo (only available for sent messages)
  from: string;
  customerName: string;
  text: string;
  timestamp: Date;
  mediaType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  mediaUrl?: string;
  // Quoted/Reply message fields
  quotedMessageId?: string;
  quotedMessageText?: string;
  quotedMessageSender?: string;
  // LID mapping fields (for saving mapping from incoming messages)
  lidToSave?: string; // LID extracted from remoteJid
}

/**
 * التحقق من صحة رقم الهاتف
 * أرقام مصر: 12 رقم (20 + 10 أرقام)
 * أرقام دولية: 10-13 رقم عادةً
 * أي رقم أطول من 13 رقم هو على الأرجح LID identifier وليس رقم هاتف حقيقي
 */
function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[^\d]/g, '');
  // Valid phone numbers are between 10-13 digits
  // Egyptian numbers: 20xxxxxxxxxx (12 digits)
  // International: typically 10-13 digits
  // LID identifiers are 14-15+ digits and should be rejected
  return cleaned.length >= 10 && cleaned.length <= 13;
}

async function parseWasenderMessage(msgData: any, isOutgoing: boolean = false): Promise<ParsedMessage | null> {
  try {
    const key = msgData.key || {};
    const message = msgData.message || {};

    // === DEBUG LOGGING للرسائل الصادرة ===
    if (isOutgoing) {
      console.log('📤 === OUTGOING MESSAGE DEBUG ===');
      console.log('📤 Full key object:', JSON.stringify(key, null, 2));
      console.log('📤 Full msgData (without message):', JSON.stringify({ ...msgData, message: '[omitted]' }, null, 2));
      console.log('📤 Key fields:', {
        remoteJid: key.remoteJid,
        cleanedRecipientPn: key.cleanedRecipientPn,
        cleanedSenderPn: key.cleanedSenderPn,
        cleanedParticipantPn: key.cleanedParticipantPn,
        participant: key.participant,
        fromMe: key.fromMe
      });
    }

    // Get message ID
    const messageId = key.id || msgData.id || `msg_${Date.now()}`;

    // Get msgId from WasenderAPI - needed for replyTo
    // WasenderAPI returns msgId only for sent messages
    // Note: msg_id column is bigint, so we only store integer values
    // For incoming messages without msgId, the frontend uses message_id (string) as fallback
    const msgId = msgData.msgId || msgData.msg_id || key.msgId || null;

    if (msgId) {
      console.log('📌 Found msgId:', msgId);
    } else {
      console.log('📌 No msgId found, will use message_id as fallback for replies');
    }

    // Get phone number - handle differently for outgoing vs incoming
    let from = '';
    if (isOutgoing) {
      // === أولوية استخراج الرقم للرسائل الصادرة ===
      // الترتيب مهم جداً! cleanedRecipientPn هو الأكثر موثوقية لأن WasenderAPI بتنظفه مسبقاً
      // remoteJid ممكن يحتوي على LID identifier (14-15 رقم) بدل رقم الهاتف الحقيقي

      // 1. أولاً: cleanedRecipientPn (الأكثر موثوقية - رقم نظيف من WasenderAPI)
      if (key.cleanedRecipientPn) {
        from = cleanPhoneNumber(key.cleanedRecipientPn);
        console.log('📤 Step 1 - cleanedRecipientPn (primary):', from);
      }

      // 2. ثانياً: cleanedParticipantPn
      if (!from && key.cleanedParticipantPn) {
        from = cleanPhoneNumber(key.cleanedParticipantPn);
        console.log('📤 Step 2 - cleanedParticipantPn:', from);
      }

      // 3. ثالثاً: remoteJid (بس لو مش LID ورقم صالح)
      // نتجنب LID identifiers اللي بتبدأ بـ @lid أو أطول من 13 رقم
      if (!from && key.remoteJid && !key.remoteJid.includes('@lid')) {
        const extracted = key.remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const cleaned = cleanPhoneNumber(extracted);
        // نتأكد إن الرقم صالح قبل ما نستخدمه
        if (isValidPhoneNumber(cleaned)) {
          from = cleaned;
          console.log('📤 Step 3 - remoteJid (valid):', from);
        } else {
          console.log('📤 Step 3 - remoteJid skipped (invalid/LID):', extracted, '→', cleaned, '(length:', cleaned.length, ')');
        }
      }

      // 4. رابعاً: participant field
      if (!from && key.participant) {
        const extracted = key.participant.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
        const cleaned = cleanPhoneNumber(extracted);
        if (isValidPhoneNumber(cleaned)) {
          from = cleaned;
          console.log('📤 Step 4 - participant:', from);
        } else {
          console.log('📤 Step 4 - participant skipped (invalid):', extracted);
        }
      }

      // 5. خامساً: contextInfo.participant (للرسائل اللي فيها رد)
      if (!from) {
        const contextInfo = message.extendedTextMessage?.contextInfo ||
                            message.imageMessage?.contextInfo ||
                            message.videoMessage?.contextInfo ||
                            message.audioMessage?.contextInfo;
        if (contextInfo?.participant) {
          const extracted = contextInfo.participant.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
          const cleaned = cleanPhoneNumber(extracted);
          if (isValidPhoneNumber(cleaned)) {
            from = cleaned;
            console.log('📤 Step 5 - contextInfo.participant:', from);
          } else {
            console.log('📤 Step 5 - contextInfo.participant skipped (invalid):', extracted);
          }
        }
      }

      // 6. سادساً: LID Mapping Lookup (للرسائل اللي بترجع بـ LID بدل رقم الهاتف)
      // لو لسه معندناش رقم صالح، نشوف لو الـ remoteJid فيه LID ونبحث في الـ mapping table
      if (!from && key.remoteJid) {
        // Extract LID from remoteJid (can be @lid or @s.whatsapp.net with 14+ digit number)
        const lidMatch = key.remoteJid.match(/(\d{14,})@/);
        if (lidMatch) {
          const lid = lidMatch[1];
          console.log('📤 Step 6 - Looking up LID mapping for:', lid);

          // Look up in whatsapp_lid_mappings table
          const { data: mapping, error: mappingError } = await supabase
            .schema('elfaroukgroup')
            .from('whatsapp_lid_mappings')
            .select('phone_number, customer_name')
            .eq('lid', lid)
            .single();

          if (mapping && !mappingError) {
            from = mapping.phone_number;
            console.log('📤 Step 6 - LID resolved to phone:', lid, '→', from);
          } else {
            console.log('📤 Step 6 - No LID mapping found for:', lid, '- Error:', mappingError?.message || 'none');
          }
        }
      }

      // Final validation
      if (!from) {
        console.warn('⚠️ Skipping outgoing message: could not extract valid phone number');
        console.warn('⚠️ Available fields:', {
          cleanedRecipientPn: key.cleanedRecipientPn,
          cleanedParticipantPn: key.cleanedParticipantPn,
          remoteJid: key.remoteJid,
          participant: key.participant
        });
        return null;
      }

      console.log('📤 Final phone number:', from, '(length:', from.length, ')');
    } else {
      // For incoming messages: cleanedSenderPn is the customer (sender)
      from = key.cleanedSenderPn || key.cleanedParticipantPn || '';
      // Fallback to remoteJid if no clean phone number
      if (!from && key.remoteJid) {
        from = key.remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
      }
      // تنظيف الرقم لضمان التنسيق الصحيح
      from = cleanPhoneNumber(from);

      // Validate incoming message phone number too
      if (!isValidPhoneNumber(from)) {
        console.warn('⚠️ Skipping incoming message: invalid phone number');
        console.warn('⚠️ Phone number:', from, 'Length:', from.length);
        return null;
      }

      // === SAVE LID MAPPING ===
      // لما تيجي رسالة واردة، لو الـ remoteJid فيه LID نحفظ الـ mapping
      // ده هيساعدنا نربط الرسائل الصادرة اللي بترجع بـ LID بدل رقم الهاتف
      if (key.remoteJid) {
        const lidMatch = key.remoteJid.match(/(\d{14,})@/);
        if (lidMatch) {
          const lid = lidMatch[1];
          // Only save if we found a valid phone number
          if (from && isValidPhoneNumber(from)) {
            console.log('📥 Found LID in incoming message:', lid, '→', from);

            // Save the LID mapping (upsert to handle updates)
            const customerName = msgData.pushName || key.pushName || msgData.notifyName || from;
            supabase
              .schema('elfaroukgroup')
              .from('whatsapp_lid_mappings')
              .upsert({
                lid: lid,
                phone_number: from,
                customer_name: customerName,
                updated_at: new Date().toISOString()
              }, { onConflict: 'lid' })
              .then(({ error }) => {
                if (error) {
                  console.error('❌ Error saving LID mapping:', error.message);
                } else {
                  console.log('✅ LID mapping saved:', lid, '→', from);
                }
              });
          }
        }
      }
    }

    if (!from) {
      console.log('⚠️ Could not extract phone number from message');
      return null;
    }

    // IMPORTANT: Detect media type FIRST before extracting text
    // This fixes the bug where images with captions were being treated as text
    let text = '';
    let mediaType: ParsedMessage['mediaType'] = 'text';
    let mediaUrl: string | undefined;

    // Check for media content in the message object FIRST
    if (message.imageMessage) {
      mediaType = 'image';
      mediaUrl = message.imageMessage.url;
      text = msgData.messageBody || message.imageMessage.caption || '[صورة]';
    } else if (message.videoMessage) {
      mediaType = 'video';
      mediaUrl = message.videoMessage.url;
      text = msgData.messageBody || message.videoMessage.caption || '[فيديو]';
    } else if (message.audioMessage) {
      mediaType = 'audio';
      mediaUrl = message.audioMessage.url;
      text = '[رسالة صوتية]';
    } else if (message.documentMessage) {
      mediaType = 'document';
      mediaUrl = message.documentMessage.url;
      text = msgData.messageBody || message.documentMessage.fileName || '[مستند]';
    } else if (message.locationMessage) {
      mediaType = 'location';
      const loc = message.locationMessage;
      text = msgData.messageBody || loc.name || loc.address || `[موقع: ${loc.degreesLatitude}, ${loc.degreesLongitude}]`;
    } else if (message.contactMessage || message.contactsArrayMessage) {
      mediaType = 'contact';
      text = '[جهة اتصال]';
    } else if (message.stickerMessage) {
      mediaType = 'image';
      mediaUrl = message.stickerMessage.url;
      text = '[ملصق]';
    } else {
      // Text messages - check various text sources
      text = msgData.messageBody ||
             message.conversation ||
             message.extendedTextMessage?.text ||
             '[رسالة فارغة]';
    }

    // Get customer name
    const customerName = msgData.pushName || key.pushName || msgData.notifyName || from;

    // Extract quoted/reply message info from contextInfo
    let quotedMessageId: string | undefined;
    let quotedMessageText: string | undefined;
    let quotedMessageSender: string | undefined;

    // contextInfo can be in various message types
    const contextInfo = message.extendedTextMessage?.contextInfo ||
                        message.imageMessage?.contextInfo ||
                        message.videoMessage?.contextInfo ||
                        message.audioMessage?.contextInfo ||
                        message.documentMessage?.contextInfo ||
                        message.stickerMessage?.contextInfo;

    if (contextInfo?.stanzaId) {
      quotedMessageId = contextInfo.stanzaId;
      // Get quoted message sender
      const participant = contextInfo.participant || contextInfo.remoteJid || '';
      quotedMessageSender = participant
        .replace('@s.whatsapp.net', '')
        .replace('@c.us', '')
        .replace('@lid', '');

      // Get quoted message text
      const quotedMsg = contextInfo.quotedMessage;
      if (quotedMsg) {
        quotedMessageText = quotedMsg.conversation ||
                           quotedMsg.extendedTextMessage?.text ||
                           quotedMsg.imageMessage?.caption ||
                           quotedMsg.videoMessage?.caption ||
                           quotedMsg.documentMessage?.caption ||
                           (quotedMsg.imageMessage ? '[صورة]' : null) ||
                           (quotedMsg.videoMessage ? '[فيديو]' : null) ||
                           (quotedMsg.audioMessage ? '[رسالة صوتية]' : null) ||
                           (quotedMsg.documentMessage ? '[مستند]' : null) ||
                           (quotedMsg.stickerMessage ? '[ملصق]' : null) ||
                           '[رسالة]';
      }
      console.log('📎 Quoted message detected:', { quotedMessageId, quotedMessageSender, quotedMessageText });
    }

    // Get timestamp with validation
    let timestamp = new Date();
    if (msgData.messageTimestamp) {
      try {
        const rawTs = msgData.messageTimestamp;
        let ts: number;

        if (typeof rawTs === 'number') {
          // Check if it's already in milliseconds (13 digits) or seconds (10 digits)
          ts = rawTs > 9999999999 ? rawTs : rawTs * 1000;
        } else if (typeof rawTs === 'string') {
          const parsed = parseInt(rawTs, 10);
          if (!isNaN(parsed)) {
            ts = parsed > 9999999999 ? parsed : parsed * 1000;
          } else {
            ts = Date.now();
          }
        } else {
          ts = Date.now();
        }

        const newDate = new Date(ts);
        // Validate the date is valid
        if (!isNaN(newDate.getTime())) {
          timestamp = newDate;
        }
      } catch (e) {
        console.log('⚠️ Could not parse timestamp, using current time');
      }
    }

    return {
      messageId,
      msgId: msgId ? Number(msgId) : undefined, // Convert to number for bigint column
      from,
      customerName,
      text,
      timestamp,
      mediaType,
      mediaUrl,
      quotedMessageId,
      quotedMessageText,
      quotedMessageSender,
    };
  } catch (error) {
    console.error('❌ Error parsing message:', error);
    return null;
  }
}
