import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

export default function ProductDetail() {
  const navigate = useNavigate();
  const [product] = useState({
    sku: 'IND-CH-001',
    name: 'Indomie 70g Chicken',
    category: 'FOOD STAPLES › NOODLES',
    stock: 60,
    emoji: '🍜',
    dailyVelocity: 9.2,
    margin: 28,
    netProfit: 0.70,
    buyPrice: 1.80,
    sellPrice: 2.50,
    supplier: {
      name: 'Accra Central Wholesalers',
      date: '25 JAN 2026',
      price: 1.76,
      note: 'CHEAPEST IN MARKET',
    },
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-white p-4 flex items-center justify-between border-b border-border">
        <button onClick={() => navigate(-1)} className="text-xl">←</button>
        <h1 className="text-lg font-bold">Product Details</h1>
        <button className="text-xl">📋</button>
      </div>

      {/* Product Card */}
      <div className="p-4 space-y-6">
        <div className="bg-muted rounded-xl p-8 flex justify-center items-center">
          <span className="text-6xl">{product.emoji}</span>
        </div>

        {/* Category & Title */}
        <div className="text-center">
          <p className="text-xs text-primary font-semibold uppercase">{product.category}</p>
          <h2 className="text-2xl font-bold text-foreground mt-1">{product.name}</h2>
          <p className="text-sm text-foreground/60 mt-2">SKU: {product.sku}</p>
        </div>

        {/* Stock Status */}
        <div className="bg-primary text-white rounded-lg p-4">
          <p className="text-sm text-primary-light">60 pcs in stock</p>
          <p className="text-xs text-primary-light mt-2">Urgency: Normal</p>
        </div>

        {/* Inventory Analysis */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase text-foreground/60">Inventory Analysis</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-foreground">60</p>
            <p className="text-sm text-foreground/60">units</p>
          </div>
          <p className="text-sm text-foreground/60">Daily velocity: {product.dailyVelocity} units</p>
        </div>

        {/* Margin Card */}
        <div className="bg-primary text-white rounded-lg p-4">
          <p className="text-xs text-primary-light uppercase font-semibold">Margin</p>
          <p className="text-3xl font-bold mt-2">{product.margin}%</p>
          <p className="text-sm text-primary-light mt-1">Net Profit/Unit</p>
          <div className="mt-3 flex items-center gap-2 text-primary-light">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Trending up</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-foreground/60 uppercase font-semibold">Buy Price</p>
            <p className="text-lg font-bold text-foreground mt-1">GHS {product.buyPrice}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-foreground/60 uppercase font-semibold">Sell Price</p>
            <p className="text-lg font-bold text-foreground mt-1">GHS {product.sellPrice}</p>
          </div>
        </div>

        {/* Supplier */}
        <div>
          <h3 className="text-xs font-semibold uppercase text-foreground/60 mb-3">Supplier History</h3>
          <div className="bg-white rounded-lg p-4 border border-border">
            <p className="text-xs text-foreground/60">Last Purchase</p>
            <p className="font-semibold text-foreground mt-1">{product.supplier.name}</p>
            <p className="text-xs text-foreground/60 mt-2">{product.supplier.date}</p>
            <p className="text-lg font-bold text-foreground mt-2">GHS {product.supplier.price}</p>
            <p className="text-xs text-green-600 font-semibold mt-2">{product.supplier.note}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button className="w-full bg-primary text-white py-3 rounded-lg font-semibold">
            ⬆️ Update Stock
          </button>
          <button className="w-full bg-muted text-foreground py-3 rounded-lg font-semibold">
            📝 Edit Price
          </button>
        </div>
      </div>
    </div>
  );
}