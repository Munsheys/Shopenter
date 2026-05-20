// Development fixtures — every possible state the system can represent.
// Nothing imports this at runtime; it exists for UI development reference and future tests.

const now = Date.now();
const ago = (ms: number) => new Date(now - ms).toISOString();

// ── Orders ──────────────────────────────────────────────────────────────────

export const MOCK_ORDERS = [
  // Single-item, awaiting payment
  {
    _id: 'order-pending-01',
    displayName: 'Alice Suparat',
    lineUserId: 'U001',
    address: '123 Sukhumvit Rd, Bangkok 10110',
    product: 'Product A',
    quantity: 1,
    items: [{ productId: 'prod-simple', name: 'Product A', price: 450, qty: 1, imageUrl: '', itemStatus: 'pending', itemTracking: '', itemCourier: '' }],
    soldTHB: 450, costTHB: 0, profit: 0, shipCostTHB: 0,
    status: 'pending', paymentQrSent: true, trackingSent: false,
    couponCode: '', discountAmount: 0, redeemedPoints: 0,
    createdAt: ago(2 * 60 * 60 * 1000), // 2 hours ago
  },

  // Multi-item order — 2 different products — both items still pending
  {
    _id: 'order-pending-multi-02',
    displayName: 'Bob Thanakorn',
    lineUserId: 'U002',
    address: '456 Silom, Bangkok 10500',
    product: 'Product B, 2x Product C',
    quantity: 3,
    items: [
      { productId: 'prod-variants', name: 'Product B', variantLabel: 'Blue / M', price: 690, qty: 1, imageUrl: '', itemStatus: 'pending', itemTracking: '', itemCourier: '' },
      { productId: 'prod-simple',   name: 'Product C', price: 320, qty: 2, imageUrl: '', itemStatus: 'pending', itemTracking: '', itemCourier: '' },
    ],
    soldTHB: 1330, costTHB: 0, profit: 0, shipCostTHB: 0,
    status: 'pending', paymentQrSent: false, trackingSent: false,
    couponCode: '', discountAmount: 0, redeemedPoints: 0,
    createdAt: ago(30 * 60 * 1000), // 30 min ago
  },

  // Paid — slip verified via SlipOK
  {
    _id: 'order-paid-03',
    displayName: 'Chanya Rattana',
    lineUserId: 'U003',
    address: '789 Chatuchak, Bangkok 10900',
    product: 'Product D',
    quantity: 1,
    items: [{ productId: 'prod-track-stock', name: 'Product D', variantLabel: 'S', price: 850, qty: 1, imageUrl: '', itemStatus: 'pending', itemTracking: '', itemCourier: '' }],
    soldTHB: 850, costTHB: 400, profit: 450, shipCostTHB: 50,
    status: 'paid', paymentQrSent: true, trackingSent: false,
    couponCode: '', discountAmount: 0, redeemedPoints: 0,
    createdAt: ago(5 * 60 * 60 * 1000),
  },

  // Paid with coupon discount
  {
    _id: 'order-paid-coupon-04',
    displayName: 'Danai Wongchai',
    lineUserId: 'U004',
    address: '12 Ratchada, Bangkok 10310',
    product: 'Product E',
    quantity: 2,
    items: [{ productId: 'prod-simple', name: 'Product E', price: 500, qty: 2, imageUrl: '', itemStatus: 'pending', itemTracking: '', itemCourier: '' }],
    soldTHB: 900, costTHB: 0, profit: 0, shipCostTHB: 0,
    status: 'paid', paymentQrSent: true, trackingSent: false,
    couponCode: 'SAVE10', discountAmount: 100, redeemedPoints: 0,
    createdAt: ago(8 * 60 * 60 * 1000),
  },

  // Paid with loyalty points redemption
  {
    _id: 'order-paid-points-05',
    displayName: 'Erin Malee',
    lineUserId: 'U005',
    address: '33 Ladprao, Bangkok 10230',
    product: 'Product F',
    quantity: 1,
    items: [{ productId: 'prod-variants', name: 'Product F', variantLabel: 'Red / L', price: 1200, qty: 1, imageUrl: '', itemStatus: 'pending', itemTracking: '', itemCourier: '' }],
    soldTHB: 1100, costTHB: 0, profit: 0, shipCostTHB: 0,
    status: 'paid', paymentQrSent: true, trackingSent: false,
    couponCode: '', discountAmount: 100, redeemedPoints: 500,
    createdAt: ago(10 * 60 * 60 * 1000),
  },

  // Preparing — multi-item, item A shipped independently, item B still pending
  {
    _id: 'order-preparing-06',
    displayName: 'Fon Apinya',
    lineUserId: 'U006',
    address: '99 Nawamin, Bangkok 10240',
    product: 'Product G, Product H',
    quantity: 2,
    items: [
      { productId: 'prod-simple',   name: 'Product G', price: 600, qty: 1, imageUrl: '', itemStatus: 'shipped',  itemTracking: 'TH123456789TH', itemCourier: 'Flash Express' },
      { productId: 'prod-variants', name: 'Product H', variantLabel: 'White', price: 750, qty: 1, imageUrl: '', itemStatus: 'pending',  itemTracking: '', itemCourier: '' },
    ],
    soldTHB: 1350, costTHB: 600, profit: 750, shipCostTHB: 80,
    status: 'preparing', paymentQrSent: true, trackingSent: false,
    couponCode: '', discountAmount: 0, redeemedPoints: 0,
    createdAt: ago(24 * 60 * 60 * 1000),
  },

  // Shipped — tracking sent to customer
  {
    _id: 'order-shipped-07',
    displayName: 'Gun Siripong',
    lineUserId: 'U007',
    address: '55 Bangna, Samut Prakan 10540',
    product: '2x Product I',
    quantity: 2,
    items: [{ productId: 'prod-simple', name: 'Product I', price: 400, qty: 2, imageUrl: '', itemStatus: 'shipped', itemTracking: 'TH987654321TH', itemCourier: 'Kerry Express' }],
    soldTHB: 800, costTHB: 360, profit: 440, shipCostTHB: 60,
    status: 'shipped', tracking: 'TH987654321TH', courier: 'Kerry Express',
    paymentQrSent: true, trackingSent: true,
    couponCode: '', discountAmount: 0, redeemedPoints: 0,
    createdAt: ago(2 * 24 * 60 * 60 * 1000),
  },

  // Delivered
  {
    _id: 'order-delivered-08',
    displayName: 'Hathai Somboon',
    lineUserId: 'U008',
    address: '8 Thonburi, Bangkok 10600',
    product: 'Product J',
    quantity: 1,
    items: [{ productId: 'prod-variants', name: 'Product J', variantLabel: 'M', price: 950, qty: 1, imageUrl: '', itemStatus: 'delivered', itemTracking: 'TH112233445TH', itemCourier: 'ThaiPost' }],
    soldTHB: 950, costTHB: 420, profit: 530, shipCostTHB: 45,
    status: 'delivered', tracking: 'TH112233445TH', courier: 'ThaiPost',
    paymentQrSent: true, trackingSent: true,
    couponCode: '', discountAmount: 0, redeemedPoints: 0,
    createdAt: ago(5 * 24 * 60 * 60 * 1000),
  },

  // Cancelled — auto-cancelled for non-payment
  {
    _id: 'order-cancelled-09',
    displayName: 'Ittipol Charoenwong',
    lineUserId: 'U009',
    address: '22 Pinklao, Bangkok 10700',
    product: 'Product K',
    quantity: 1,
    items: [{ productId: 'prod-simple', name: 'Product K', price: 550, qty: 1, imageUrl: '', itemStatus: 'pending', itemTracking: '', itemCourier: '' }],
    soldTHB: 550, costTHB: 0, profit: 0, shipCostTHB: 0,
    status: 'cancelled', paymentQrSent: true, trackingSent: false,
    couponCode: '', discountAmount: 0, redeemedPoints: 0,
    createdAt: ago(30 * 60 * 60 * 1000),
  },
];

// ── Products ─────────────────────────────────────────────────────────────────

export const MOCK_PRODUCTS = [
  // Simple product — no variants, no stock tracking
  {
    _id: 'prod-simple',
    name: 'Product A — Simple',
    brand: 'Brand X',
    description: 'A simple product with no variants.',
    price: 450,
    trackStock: false,
    variants: [],
    options: [],
    categories: ['Category 1'],
    isActive: true,
  },

  // Product with variants (size + color), stock tracked
  {
    _id: 'prod-variants',
    name: 'Product B — With Variants',
    brand: 'Brand Y',
    description: 'Has size and color options.',
    price: 690,
    maxPrice: 890,
    trackStock: true,
    options: [{ name: 'Size', values: ['S', 'M', 'L'] }, { name: 'Color', values: ['Blue', 'Red', 'White'] }],
    variants: [
      { variantName: 'S / Blue',  combination: { Size: 'S', Color: 'Blue'  }, stock: 12, price: 690 },
      { variantName: 'M / Blue',  combination: { Size: 'M', Color: 'Blue'  }, stock: 5,  price: 690 },
      { variantName: 'L / Blue',  combination: { Size: 'L', Color: 'Blue'  }, stock: 0,  price: 690 }, // out of stock
      { variantName: 'S / Red',   combination: { Size: 'S', Color: 'Red'   }, stock: 8,  price: 790 },
      { variantName: 'M / Red',   combination: { Size: 'M', Color: 'Red'   }, stock: 3,  price: 790 }, // at low-stock threshold
      { variantName: 'M / White', combination: { Size: 'M', Color: 'White' }, stock: 20, price: 890 },
    ],
    categories: ['Category 1', 'Category 2'],
    isActive: true,
  },

  // Import-on-demand (pre-order) — trackStock intentionally false, stock always 0
  {
    _id: 'prod-preorder',
    name: 'Product C — Pre-order / Import on Demand',
    brand: 'Brand Z',
    description: 'Imported after order is placed. Stock tracking disabled.',
    price: 1200,
    trackStock: false,
    variants: [
      { variantName: 'Standard', stock: 0, price: 1200 },
    ],
    categories: ['Category 3'],
    isActive: true,
  },

  // Inactive product
  {
    _id: 'prod-inactive',
    name: 'Product D — Inactive / Unlisted',
    brand: 'Brand X',
    description: 'Hidden from storefront.',
    price: 300,
    trackStock: false,
    variants: [],
    categories: [],
    isActive: false,
  },
];

// ── Notifications ─────────────────────────────────────────────────────────────

export const MOCK_NOTIFICATIONS = [
  { _id: 'notif-01', type: 'new_order',    message: '🛒 New order from Alice Suparat!\nProduct A\nTotal: ฿450',                                    read: false, createdAt: ago(5 * 60 * 1000) },
  { _id: 'notif-02', type: 'slip_verified',message: '💰 Slip verified!\n\nCustomer: Chanya Rattana\nAmount: ฿850\nItems: Product D',               read: false, createdAt: ago(20 * 60 * 1000) },
  { _id: 'notif-03', type: 'slip_failed',  message: '⚠️ Slip scan failed\n\nCustomer: Danai Wongchai\nPlease verify payment manually.',           read: true,  createdAt: ago(2 * 60 * 60 * 1000) },
  { _id: 'notif-04', type: 'out_of_stock', message: '📭 Out of stock: Product B — With Variants (L / Blue)',                                       read: true,  createdAt: ago(4 * 60 * 60 * 1000) },
  { _id: 'notif-05', type: 'out_of_stock', message: '📉 Low stock: Product B — With Variants (M / Red) — 3 remaining',                            read: true,  createdAt: ago(6 * 60 * 60 * 1000) },
  { _id: 'notif-06', type: 'new_order',    message: '🛒 New order from Bob Thanakorn!\nProduct B, 2x Product C\nTotal: ฿1330',                     read: true,  createdAt: ago(8 * 60 * 60 * 1000) },
];
