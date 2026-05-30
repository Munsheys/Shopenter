import { Product } from '@/models';

const STOP_WORDS = new Set([
  // English
  'i', 'want', 'to', 'do', 'you', 'have', 'a', 'the', 'is', 'are', 'can',
  'please', 'hi', 'hello', 'hey', 'me', 'my', 'get', 'need', 'buy', 'some',
  'show', 'looking', 'for', 'what', 'where', 'any', 'of', 'in', 'at', 'on',
  'and', 'or', 'it', 'this', 'that', 'an', 'be', 'with', 'from', 'sell',
  'selling', 'order', 'like', 'how', 'price', 'much',
  // Thai
  'มี', 'ไหม', 'ได้', 'ไหน', 'ต้องการ', 'สั่ง', 'ขอ', 'ดู', 'หา', 'ซื้อ',
  'อยาก', 'ผม', 'ฉัน', 'ราคา', 'เท่าไหร่', 'เท่าไร', 'ขาย', 'มั้ย',
]);

export async function searchProducts(merchantId: string, query: string): Promise<any[]> {
  const tokens = query
    .toLowerCase()
    .replace(/[^\w\s฀-鿿]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

  if (!tokens.length) return [];

  const orClauses = tokens.flatMap(token => [
    { name:        { $regex: token, $options: 'i' } },
    { brand:       { $regex: token, $options: 'i' } },
    { description: { $regex: token, $options: 'i' } },
    { categories:  { $elemMatch: { $regex: token, $options: 'i' } } },
  ]);

  const products = await (Product as any).find({ merchantId, isActive: true, $or: orClauses })
    .select('_id name brand description categories price imageUrl')
    .limit(20)
    .lean() as any[];

  const haystack = (p: any) =>
    [p.name, p.brand, p.description, ...(p.categories || [])].join(' ').toLowerCase();

  return products
    .map((p: any) => ({ p, score: tokens.filter((t: string) => haystack(p).includes(t)).length }))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5)
    .map((s: any) => s.p);
}
