import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Settings } from '@/models';

export async function GET(req: Request) {
  try {
    const secret = req.headers.get('x-admin-secret');
    await dbConnect();

    // Verification Logic: Check DB first, then ENV
    const settings = await Settings.findOne();
    const dbSecret = settings?.adminSecret;
    const envSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET;

    const isValid = (dbSecret && secret === dbSecret) || (envSecret && secret === envSecret);

    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customers = await Customer.find().sort({ lastSeen: -1 });
    return NextResponse.json(customers);
  } catch (error) {
    // Fallback mock data when DB is down
    const mockCustomers = [
      {
        userId: 'mock-user-123',
        displayName: 'Test Customer (Mock)',
        pictureUrl: 'https://ui-avatars.com/api/?name=Test+Customer&background=00b900&color=fff',
        addresses: [
          '123 Mock Street, Bangkok, 10110',
          'Office 456, Sukhumvit, Bangkok',
          'คุณอลิส 20/411 ประชาชื่น บางตลาด ปากเกร็ด นนทบุรี 11120 0826307887'
        ],
        lastSeen: new Date()
      },
      {
        userId: 'mock-user-456',
        displayName: 'น้องฟ้า (New Customer)',
        pictureUrl: 'https://ui-avatars.com/api/?name=NF&background=a78bfa&color=fff',
        addresses: [],
        lastSeen: new Date(Date.now() - 3600000) // 1 hour ago
      }
    ];
    return NextResponse.json(mockCustomers);
  }
}
