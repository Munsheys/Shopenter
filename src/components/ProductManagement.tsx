"use client";

import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2 } from 'lucide-react';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/products', {
      headers: { 'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || '' }
    })
    .then(r => r.json())
    .then(data => setProducts(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Package className="text-[#8b92ad]" size={28} /> Product Management
        </h2>
        <button className="bg-[#00b900] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 shadow-lg shadow-[#00b90022]">
          <Plus size={20} /> Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {products.map((p: any) => (
          <div key={p._id} className="bg-white rounded-2xl border border-[#e2e5ef] overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
            <div className="aspect-[4/3] bg-[#f4f6f9] overflow-hidden relative">
              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-sm mb-1 truncate">{p.name}</h3>
              <p className="text-[10px] text-[#8b92ad] mb-4">{p.category}</p>
              
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-1 bg-[#f4f6f9] text-[#1a1d2e] py-2 rounded-lg text-xs font-bold hover:bg-[#e2e5ef] transition-colors">
                  Edit
                </button>
                <button className="flex items-center justify-center gap-1 bg-[#fff1f0] text-red-500 py-2 rounded-lg text-xs font-bold hover:bg-[#ffccc7] transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
