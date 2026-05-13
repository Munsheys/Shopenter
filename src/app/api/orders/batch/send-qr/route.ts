import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Settings, Message } from '@/models';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-admin-secret');
    if (!(await verifyAuth(secret))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderIds } = await req.json();
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
    }

    await dbConnect();
    const orders = await Order.find({ _id: { $in: orderIds } });
    if (orders.length === 0) return NextResponse.json({ error: 'Orders not found' }, { status: 404 });

    const settings = await Settings.findOne();
    if (!settings || !settings.lineChannelAccessToken) {
      return NextResponse.json({ error: 'LINE access token not configured' }, { status: 400 });
    }

    // Assume all orders belong to the same user (enforced by UI)
    const lineUserId = orders[0].lineUserId;
    const totalTHB = orders.reduce((sum, o) => sum + (o.soldTHB || 0), 0);
    const combinedProducts = orders.map(o => {
      const cleanName = o.product?.replace(/^\d+x\s/, '');
      return `${(o.quantity || 1) > 1 ? `${o.quantity}x ` : ''}${cleanName}`;
    }).join(' + ');

    const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;
    const qrUrl = `${origin}/api/qr?amount=${totalTHB}&ref=batch`;

    const flexMessage = {
      type: "flex",
      altText: "Bank Transfer QR Code",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "🏦 QR ชำระเงิน (รวมรายการ)",
              weight: "bold",
              color: "#1DB446",
              size: "sm"
            }
          ]
        },
        hero: {
          type: "image",
          url: qrUrl,
          size: "full",
          aspectRatio: "1:1",
          aspectMode: "cover"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: combinedProducts,
              weight: "bold",
              size: "md",
              wrap: true
            },
            {
              type: "text",
              text: `฿${totalTHB.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              weight: "bold",
              size: "xl",
              color: "#FF334B",
              margin: "md"
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "สแกน QR ด้วย K PLUS หรือแอปธนาคารอื่น",
              size: "xs",
              color: "#aaaaaa",
              wrap: true,
              align: "center"
            }
          ]
        }
      }
    };

    const instructionMessage = {
      type: "text",
      text: "📸 หลังจากชำระเงินแล้ว กรุณาส่งรูปสลิปโอนเงินเข้ามาในแชทนี้ เพื่อให้ระบบยืนยันการชำระเงินอัตโนมัติค่ะ/ครับ 🙏"
    };

    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.lineChannelAccessToken}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [flexMessage, instructionMessage]
      })
    });

    if (!lineResponse.ok) {
      const errData = await lineResponse.text();
      console.error("LINE Push Error:", errData);
      return NextResponse.json({ error: 'Failed to push LINE message' }, { status: 500 });
    }

    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { paymentQrSent: true } }
    );

    await Message.create({
      lineUserId: lineUserId,
      type: 'system',
      text: '🏦 QR Code Generated (Batch)',
      metadata: { amount: totalTHB, product: combinedProducts },
      sender: 'system'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Batch Send QR Error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
