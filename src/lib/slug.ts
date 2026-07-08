import { Merchant } from '@/models';

export function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'shop';
}

export async function generateUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 2;
  while (await Merchant.findOne({ slug })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
