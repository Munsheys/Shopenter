import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Shopenter — All-in-One LINE OA Store Management Platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f1117',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '60px 80px',
          position: 'relative',
        }}
      >
        {/* Subtle grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0,185,0,0.06) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(0,185,0,0.04) 0%, transparent 50%)',
          }}
        />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginBottom: '28px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: '#00b900',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(0,185,0,0.4)',
              fontSize: '42px',
            }}
          >
            💬
          </div>
          <span
            style={{
              color: '#ffffff',
              fontSize: '72px',
              fontWeight: '800',
              letterSpacing: '-2px',
              lineHeight: 1,
            }}
          >
            Shopenter
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            color: '#9ca3af',
            fontSize: '28px',
            textAlign: 'center',
            margin: '0 0 52px 0',
            maxWidth: '820px',
            lineHeight: 1.45,
            fontWeight: '400',
          }}
        >
          All-in-one store management for LINE Official Account merchants
        </p>

        {/* Feature chips */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Orders', 'Products', 'Customers', 'Broadcasts', 'Loyalty Points', 'Coupons'].map(label => (
            <div
              key={label}
              style={{
                background: 'rgba(0,185,0,0.08)',
                border: '1px solid rgba(0,185,0,0.25)',
                borderRadius: '100px',
                padding: '10px 26px',
                color: '#00b900',
                fontSize: '19px',
                fontWeight: '700',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Domain */}
        <p
          style={{
            color: '#374151',
            fontSize: '17px',
            marginTop: '52px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          shopenter.app
        </p>
      </div>
    ),
    { ...size }
  );
}
