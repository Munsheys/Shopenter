export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered';

export interface Customer {
  userId: string;
  displayName: string;
  pictureUrl: string;
  lastSeen: string;
  addresses?: string[];
}

export interface Order {
  _id: string;
  userId: string;
  platform?: 'line' | 'instagram';
  displayName: string;
  product: string;
  soldTHB: number;
  costKRW: number;
  profit: number;
  rateUsed: number;
  status: OrderStatus;
  tracking?: string;
  courier?: string;
  createdAt: string;
  address?: string;
}

export interface ParcelItem {
  id: number;
  name: string;
  sold: number;
  cost: number;
  orderId?: string;
}

export interface Parcel {
  id: number;
  items: ParcelItem[];
  courier: string;
  tracking: string;
}

export interface ShopSettings {
  shippingCompanies: string[];
  trackingTemplate: string;
}
