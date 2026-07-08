import { NextResponse } from 'next/server';

export async function GET() {
  const securityTxt = `Contact: security@shopenter.app
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}
Preferred-Languages: en, th
Canonical: https://shopenter.app/.well-known/security.txt
Policy: https://shopenter.app/security-policy
Acknowledgments: https://shopenter.app/security-acknowledgments
`;

  return new NextResponse(securityTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
