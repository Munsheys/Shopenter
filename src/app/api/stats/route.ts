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

    // Calculate monthly stats
    const monthlyStats: Record<string, { rev: number, profit: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize current year months
    const currentYear = new Date().getFullYear();
    months.forEach(m => {
      monthlyStats[`${m} ${currentYear}`] = { rev: 0, profit: 0 };
    });

    orders.forEach(o => {
      const d = new Date(o.createdAt || Date.now());
      if (d.getFullYear() === currentYear) {
        const monthKey = `${months[d.getMonth()]} ${currentYear}`;
        if (monthlyStats[monthKey]) {
          monthlyStats[monthKey].rev += (o.soldTHB || 0);
          monthlyStats[monthKey].profit += (o.profit || 0);
        }
      }
    });

    return NextResponse.json({
      sales: totalSales,
      profit: totalProfit,
      customers: customers,
      orders: orders.length,
      totalRevTHB: totalSales,
      totalProfit: totalProfit,
      monthly: monthlyStats
    });
  } catch (error) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
