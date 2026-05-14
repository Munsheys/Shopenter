import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Customer } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const filter = { merchantId: merchant.merchantId };

    const [orders, customerCount] = await Promise.all([
      Order.find(filter),
      Customer.countDocuments(filter)
    ]);

    const totalSales = orders.reduce((sum, o) => sum + (o.soldTHB || 0), 0);
    const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyStats: Record<string, { rev: number; profit: number }> = {};
    months.forEach(m => { monthlyStats[`${m} ${currentYear}`] = { rev: 0, profit: 0 }; });

    orders.forEach(o => {
      const d = new Date(o.createdAt || Date.now());
      if (d.getFullYear() === currentYear) {
        const key = `${months[d.getMonth()]} ${currentYear}`;
        if (monthlyStats[key]) {
          monthlyStats[key].rev += o.soldTHB || 0;
          monthlyStats[key].profit += o.profit || 0;
        }
      }
    });

    const recentOrders = await Order.find(filter).sort({ createdAt: -1 }).limit(10);

    return NextResponse.json({
      sales: totalSales,
      profit: totalProfit,
      customers: customerCount,
      orders: orders.length,
      totalRevTHB: totalSales,
      totalProfit,
      monthly: monthlyStats,
      recent: recentOrders
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
