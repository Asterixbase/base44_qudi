import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function SoldToday() {
  const navigate = useNavigate();
  const [view, setView] = useState('revenue'); // revenue, units, margin
  const [products] = useState([
    { id: 1, name: 'Milo 400g Tin', qty: 5, units: 4, category: 'Beverages', price: 160, margin: 23 },
    { id: 2, name: 'Sachet Water Voltic×30', qty: 8, units: 5, category: 'Water', price: 80, margin: 40 },
    { id: 3, name: 'Frytol Oil 1L', qty: 3, units: 2, category: 'Cooking Oils', price: 75, margin: 28 },
    { id: 4, name: 'Indomie 70g Chicken', qty: 23, units: 16, category: 'Noodles', price: 57.50, margin: 28 },
    { id: 5, name: 'Maggi Cube 25pk', qty: 6, units: 5, category: 'Condiments', price: 39, margin: 26 },
    { id: 6, name: 'Malta Guinness 33cl', qty: 12, units: 8, category: 'Drinks', price: 36, margin: 37 },
    { id: 7, name: 'Lux Soap 250g', qty: 5, units: 3, category: 'Personal Care', price: 25, margin: 30 },
    { id: 8, name: 'Paracetamol Strip×10', qty: 4, units: 4, category: 'Health', price: 12, margin: 50 },
  ]);

  const totals = {
    revenue: 484.50,
    cogs: 330.70,
    profit: 153.80,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-xl">←</button>
        <div>
          <h1 className="font-bold">Sold today</h1>
          <p className="text-sm text-primary-light">47 items · GHS 484.50</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white border-b border-border p-4 flex gap-3">
        <button onClick={() => setView('revenue')} className={`px-4 py-2 rounded-full font-medium ${view === 'revenue' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
          By revenue
        </button>
        <button onClick={() => setView('units')} className={`px-4 py-2 rounded-full font-medium ${view === 'units' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
          By units sold
        </button>
        <button onClick={() => setView('margin')} className={`px-4 py-2 rounded-full font-medium ${view === 'margin' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
          By margin %
        </button>
      </div>

      {/* Product List */}
      <div className="p-4 space-y-3">
        {products.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">🛍️</div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{p.name}</p>
              <p className="text-xs text-foreground/60">{p.qty} units · {p.units} bins · {p.category}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">GHS {p.price.toFixed(2)}</p>
              <p className="text-xs text-orange-600">{p.margin}% margin</p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 bg-white border-t border-border">
        <div className="space-y-2">
          <div className="flex justify-between text-foreground/60">
            <span>Total revenue</span>
            <span>GHS {totals.revenue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-foreground/60">
            <span>Total COGS</span>
            <span>GHS {totals.cogs.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
            <span>Gross profit</span>
            <span className="text-primary">GHS {totals.profit.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}