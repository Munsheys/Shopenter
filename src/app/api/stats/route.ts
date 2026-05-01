import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Customer, Settings } from '@/models';

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

    const orders = await Order.find();
    const customers = await Customer.countDocuments();
    
    const totalSales = orders.reduce((sum, o) => sum + (o.soldTHB || 0), 0);
    const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);

    return NextResponse.json({
      sales: totalSales,
      profit: totalProfit,
      customers: customers,
      orders: orders.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
