import fs from 'fs';
import path from 'path';

const STORAGE_PATH = path.join(process.cwd(), 'settings.json');

export function getLocalSettings() {
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      return JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Local storage read error:', e);
  }
  return {
    shopName: "Auto-Market",
    theme: "light",
    krwRate: 1,
    shippingCompanies: ['Flash Express', 'ThaiPost', 'Kerry Express', 'J&T Express'],
    senderAddress: "",
    trackingTemplate: "📦 Shipped!\n\nCourier: {courier}\nTracking: {tracking}\nItems: {product}\n\nThank you! 🙏"
  };
}

export function saveLocalSettings(settings: any) {
  try {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (e) {
    console.error('Local storage write error:', e);
    return false;
  }
}
