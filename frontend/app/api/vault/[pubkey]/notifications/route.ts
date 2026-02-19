import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification';

export async function GET(
  request: NextRequest,
  { params }: { params: { pubkey: string } }
) {
  try {
    const { pubkey } = params;
    const { searchParams } = new URL(request.url);
    const unread = searchParams.get('unread') === 'true';

    const notifications = notificationService.getNotifications(pubkey, unread);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount: notificationService.getUnreadCount(pubkey),
    });
  } catch (error) {
    console.error('[vault/[pubkey]/notifications]', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
