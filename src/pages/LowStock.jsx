import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LowStock() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());

  const items = [
    { id: 1, name: 'Indomie 70g Chicken', qty: 0, days: 9, need: 120, severity: 'critical', emoji: '🍜' },
    { id: 2, name: 'Sachet Water Voltic', qty: 2, days: 2, need: null, severity: 'critical', emoji: '💧' },
    { id: 3, name: 'Peak Milk Sachet 32g', qty: 8, days: 4, need: null, severity: 'critical', emoji: '🥛' },
    { id: 4, name: 'Maggi Chicken Cube', qty: 18, days: 1, need: null, severity: 'high', emoji: '🧂' },
    { id: 5, name: 'Frytol Oil 1L', qty: 4, days: 0.9, need: null, severity: 'high', emoji: '🍳' },
    { id: 6, name: 'Key Soap 250g', qty: 4, days: 0.3, need: null, severity: 'low', emoji: '🧼' },
  ];

  const filters = [
    { id: 'all', label: 'All (6)', count: 6 },
    { id: 'critical', label: 'Critical (3)', count: 3, color: 'destructive' },
    { id: 'high', label: 'High (2)', count: 2, color: 'amber' },
    { id: 'low', label: 'Low (1)', count: 1, color: 'yellow' },
  ];

  const toggle = (id) => {
    const newSelected = new Set(selected);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelected(newSelected);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-xl">←</button>
        <div>
          <h1 className="font-bold">Low stock alerts</h1>
          <p className="text-sm text-primary-light">6 items need attention</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-border p-4 flex gap-2 overflow-x-auto">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap ${
              filter === f.id ? 'bg-primary text-white' : 'bg-muted text-foreground'
            }`}
          >
            {f.id === 'critical' ? '🔴' : f.id === 'high' ? '🟠' : f.id === 'low' ? '🟡' : ''} {f.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        {items.map(item => (
          <div key={item.id} onClick={() => toggle(item.id)} className={`p-4 rounded-lg border-l-4 cursor-pointer transition ${
            item.severity === 'critical' ? 'bg-red-50 border-red-400' :
            item.severity === 'high' ? 'bg-amber-50 border-amber-400' :
            'bg-yellow-50 border-yellow-400'
          }`}>
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selected.has(item.id)} className="mt-1" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="text-xs text-foreground/60">
                  {item.severity === 'critical' && `${item.qty === 0 ? 'OUT' : item.qty} pcs · ${item.days}2day · ${item.need ? `need ${item.need} pcs` : 'need soon'}`}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                item.severity === 'critical' ? 'bg-red-200 text-red-700' :
                item.severity === 'high' ? 'bg-amber-200 text-amber-700' :
                'bg-yellow-200 text-yellow-700'
              }`}>
                {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      {selected.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4">
          <button onClick={() => navigate('/purchase-orders')} className="w-full bg-primary text-white py-4 rounded-lg font-semibold">
            Review & order selected →
          </button>
        </div>
      )}
    </div>
  );
}