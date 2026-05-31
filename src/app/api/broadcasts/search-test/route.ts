import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Product } from '@/models';

export const runtime = 'nodejs';

const STOP_WORDS = new Set([
  'i','want','to','buy','do','you','have','any','the','a','an','is','are','was','were',
  'can','could','would','should','may','might','will','shall','get','find','show','me',
  'looking','for','need','please','hi','hello','hey','what','which','where','how','tell',
  'มี','ไหม','อยาก','ได้','ขอ','ช่วย','หา','อะไร','แบบ','ใด','ไหน','ราคา','เท่าไร',
]);

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = new URL(req.url).searchParams.get('q') || '';
  const tokens = q.toLowerCase()
    .replace(/[^\w\s฀-๿]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

  if (!tokens.length) return NextResponse.json({ tokens: [], products: [] });

  await dbConnect();

  const orClauses = tokens.flatMap(token => [
    { name: { $regex: token, $options: 'i' } },
    { brand: { $regex: token, $options: 'i' } },
    { description: { $regex: token, $options: 'i' } },
    { categories: { $elemMatch: { $regex: token, $options: 'i' } } },
  ]);

  const products = await Product.find({
    merchantId: merchant.merchantId,
    isActive: true,
    $or: orClauses,
  }).select('_id name brand price imageUrl description categories').limit(20).lean();

  const haystack = (p: any) =>
    [p.name, p.brand, p.description, ...(p.categories || [])].join(' ').toLowerCase();

  const scored = (products as any[])
    .map(p => ({
      _id: p._id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      imageUrl: p.imageUrl,
      matchedTokens: tokens.filter(t => haystack(p).includes(t)),
      score: tokens.filter(t => haystack(p).includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return NextResponse.json({ tokens, products: scored });
}
