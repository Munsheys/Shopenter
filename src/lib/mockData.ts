export let globalMockOrders = [
  {
    _id: 'mock-order-1',
    product: 'Premium Korean Serum',
    soldTHB: 1250,
    costKRW: 18000,
    profit: 0,
    tracking: 'pending',
    courier: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    rateUsed: 0.026
  },
  {
    _id: 'mock-order-3',
    product: 'Skin Glow Essence',
    soldTHB: 950,
    costKRW: 12000,
    profit: 0,
    tracking: 'pending',
    courier: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    rateUsed: 0.026
  },
  {
    _id: 'mock-order-4',
    product: 'Night Repair Cream',
    soldTHB: 2100,
    costKRW: 35000,
    profit: 0,
    tracking: 'pending',
    courier: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    rateUsed: 0.026
  },
  {
    _id: 'mock-order-2',
    product: 'bs 4040',
    soldTHB: 1000,
    costKRW: 20000,
    profit: 562,
    tracking: 'th1233159519es',
    courier: 'Flash Express',
    status: 'shipped',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    rateUsed: 0.026
  }
];

export function updateMockOrder(id: string, updates: any) {
  const index = globalMockOrders.findIndex(o => o._id === id);
  if (index !== -1) {
    globalMockOrders[index] = { ...globalMockOrders[index], ...updates };
  }
  return globalMockOrders[index];
}
