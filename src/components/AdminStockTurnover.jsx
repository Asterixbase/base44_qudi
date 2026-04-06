import { TrendingUp, Package, RotateCw } from 'lucide-react';

export default function AdminStockTurnover({ metrics }) {
  const cards = [
    {
      label: 'Total Units Sold (30d)',
      value: metrics.totalUnitsSold,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Average Stock Level',
      value: Math.round(metrics.avgStockLevel),
      icon: Package,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Stock Turnover Ratio',
      value: metrics.turnoverRatio.toFixed(2),
      icon: RotateCw,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Stock Turnover Metrics</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`${card.bgColor} border border-border rounded-lg p-4`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-1">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                </div>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
        <p className="text-xs text-blue-900">
          <strong>Turnover Ratio:</strong> How many times inventory was sold and replenished. Higher is better (indicates fast-moving stock).
        </p>
      </div>
    </div>
  );
}