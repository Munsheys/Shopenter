"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingBag, ChevronLeft, Plus, Minus, Trash2, User } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import liff from '@line/liff';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Shop() {
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState<any[]>([]);
  const [view, setView] = useState('home'); // home, detail, checkout
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [isOrdering, setIsOrdering] = useState(false);

  useEffect(() => {
    fetch('/api/shop-info')
      .then(r => r.json())
      .then(async data => {
        setShopInfo(data);
        if (data.liffId) {
          try {
            await liff.init({ liffId: data.liffId });
            if (liff.isLoggedIn()) {
              const profile = await liff.getProfile();
              setCustomer(profile);
            } else {
              liff.login();
            }
          } catch (err) {
            console.error("LIFF Init failed in Shop:", err);
          }
        }
      });
    fetch('/api/products').then(r => r.json()).then(data => setProducts(data));
  }, []);

  const addToCart = () => {
    if (!selectedVariant && selectedProduct.variants?.length > 0) return;
    
    const existing = cart.find(i => i.productId === selectedProduct._id && i.variantLabel === selectedVariant?.label);
    if (existing) {
      setCart(cart.map(i => i === existing ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { 
        productId: selectedProduct._id, 
        name: selectedProduct.name, 
        price: selectedVariant?.price || selectedProduct.price, 
        variantLabel: selectedVariant?.label, 
        qty: 1, 
        imageUrl: selectedProduct.imageUrl 
      }]);
    }
    setView('home');
  };

  const handleConfirmOrder = async () => {
    if (!customer) {
      alert("Please login with LINE to place an order.");
      liff.login();
      return;
    }

    setIsOrdering(true);
    try {
      const res = await fetch('/api/shop-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: customer.userId,
          displayName: customer.displayName,
          pictureUrl: customer.pictureUrl,
          items: cart,
          totalTHB: cart.reduce((s, i) => s + i.price * i.qty, 0)
        })
      });

      if (res.ok) {
        alert("Order placed successfully! We will contact you soon.");
        setCart([]);
        setView('home');
      } else {
        alert("Failed to place order. Please try again.");
      }
    } catch (error) {
      alert("Error connecting to server.");
    } finally {
      setIsOrdering(false);
    }
  };

  if (!shopInfo) return null;

  return (
    <div className="min-h-screen bg-[#0f0f13] text-[#f0f0ff] pb-20">
      {/* Topbar */}
      <div className="sticky top-0 bg-[#0f0f13]/80 backdrop-blur-xl border-b border-[#2a2a3a] px-6 py-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          {customer ? (
            <img src={customer.pictureUrl} alt="" className="w-8 h-8 rounded-full border border-[#00b900]" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#1a1a24] flex items-center justify-center text-[#888]">
              <User size={16} />
            </div>
          )}
          <h1 className="text-sm font-bold bg-gradient-to-r from-[#00b900] to-[#00ff00] bg-clip-text text-transparent truncate max-w-[120px]">
             {shopInfo.name}
          </h1>
        </div>
        <button onClick={() => setView('checkout')} className="bg-[#1a1a24] border border-[#2a2a3a] px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2">
          🛒 Cart <span className="bg-[#00b900] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{cart.reduce((s,i)=>s+i.qty, 0)}</span>
        </button>
      </div>

      {view === 'home' && (
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-1">Welcome, {customer?.displayName?.split(' ')[0] || 'Guest'} 👋</h2>
            <p className="text-xs text-[#888]">Check out our latest premium products.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {products.map((p: any) => (
              <div 
                key={p._id} 
                onClick={() => { setSelectedProduct(p); setView('detail'); }}
                className="bg-[#1a1a24] border border-[#2a2a3a] rounded-2xl overflow-hidden active:scale-95 transition-transform"
              >
                <img src={p.imageUrl} alt="" className="w-full aspect-square object-cover" />
                <div className="p-3">
                  <div className="font-bold text-sm truncate">{p.name}</div>
                  <div className="text-[#00b900] text-sm mt-1 font-bold">฿{p.price?.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
          {products.length === 0 && (
            <div className="text-center py-20 text-[#888]">
              No products available.
            </div>
          )}
        </div>
      )}

      {view === 'detail' && selectedProduct && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
           <button onClick={() => setView('home')} className="p-6 text-[#888] flex items-center gap-1 text-sm font-semibold">
             <ChevronLeft size={20}/> Back
           </button>
           <div className="px-6 pb-6">
              <div className="rounded-[32px] overflow-hidden border border-[#2a2a3a]">
                <img src={selectedProduct.imageUrl} alt="" className="w-full aspect-square object-cover" />
              </div>
           </div>
           <div className="px-8 pb-10">
             <h2 className="text-2xl font-bold mb-2">{selectedProduct.name}</h2>
             <p className="text-[#888] text-sm mb-6 leading-relaxed">{selectedProduct.description}</p>
             <div className="text-2xl font-bold text-[#00b900] mb-8">฿{selectedProduct.price?.toLocaleString()}</div>
             
             {selectedProduct.variants?.length > 0 && (
               <div className="mb-8">
                 <label className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-3 block">Select Option</label>
                 <div className="flex flex-wrap gap-2">
                    {selectedProduct.variants.map((v: any, i: number) => (
                      <button 
                        key={i} 
                        onClick={() => setSelectedVariant(v)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                          selectedVariant === v ? "bg-[#00b90022] border-[#00b900] text-[#00b900]" : "bg-[#1a1a24] border-[#2a2a3a] text-[#888]"
                        )}
                      >
                        {v.label} — ฿{v.price.toLocaleString()}
                      </button>
                    ))}
                 </div>
               </div>
             )}

             <button 
              onClick={addToCart}
              className="w-full bg-gradient-to-r from-[#00b900] to-[#00df00] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#00b90033]"
             >
               Add to Cart
             </button>
           </div>
        </div>
      )}

      {view === 'checkout' && (
        <div className="p-6">
           <button onClick={() => setView('home')} className="text-[#888] flex items-center gap-1 text-sm font-semibold mb-6">
             <ChevronLeft size={20}/> Back
           </button>
           <h2 className="text-2xl font-bold mb-8">Checkout</h2>
           
           <div className="space-y-4 mb-8">
             {cart.map((item, idx) => (
               <div key={idx} className="flex gap-4 items-center bg-[#1a1a24] p-4 rounded-2xl border border-[#2a2a3a]">
                  <img src={item.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-[10px] text-[#888]">{item.variantLabel}</div>
                    <div className="text-[#00b900] font-bold mt-1 text-sm">฿{(item.price * item.qty).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it))}
                      className="bg-[#22222f] p-1 rounded-full text-[#888] hover:text-white"
                    >
                      <Minus size={14}/>
                    </button>
                    <span className="font-bold text-sm">{item.qty}</span>
                    <button 
                      onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: it.qty + 1 } : it))}
                      className="bg-[#22222f] p-1 rounded-full text-[#888] hover:text-white"
                    >
                      <Plus size={14}/>
                    </button>
                    <button 
                      onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                      className="ml-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
               </div>
             ))}
             {cart.length === 0 && <div className="text-center py-20 text-[#888]">Your cart is empty 🛒</div>}
           </div>

           {cart.length > 0 && (
             <div className="space-y-4">
               <div className="flex justify-between text-lg font-bold border-t border-[#2a2a3a] pt-4">
                 <span>Total</span>
                 <span className="text-[#00b900]">฿{cart.reduce((s,i)=>s+i.price*i.qty, 0).toLocaleString()}</span>
               </div>
               <button 
                onClick={handleConfirmOrder}
                disabled={isOrdering}
                className="w-full bg-[#00b900] disabled:opacity-50 text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#00b90033] flex items-center justify-center gap-2"
               >
                 {isOrdering ? "Processing..." : "Confirm Order →"}
               </button>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
