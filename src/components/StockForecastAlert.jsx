import { AlertTriangle, TrendingDown, Calendar } from 'lucide-react';

export default function StockForecastAlert({ forecast }) {
  const urgencyColors = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-800' },
    high: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800' },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800' },
    low: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  };

  const colors = urgencyColors[forecast.urgency] || urgencyColors.low;
  const icon = forecast.urgency === 'critical' ? <AlertTriangle className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />;

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-4 space-y-3`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`mt-1 ${forecast.urgency === 'critical' ? 'text-red-600' : forecast.urgency === 'high' ? 'text-orange-600' : 'text-yellow-600'}`}>
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground">{forecast.product_name}</h4>
              <span className={`text-xs px-2 py-1 rounded font-medium ${colors.badge}`}>
                {forecast.urgency.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-foreground/60">SKU: {forecast.product_sku}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{forecast.current_quantity}</p>
          <p className="text-xs text-foreground/60">units in stock</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/50 rounded p-2">
          <p className="text-xs text-foreground/60">Daily Velocity</p>
          <p className="font-semibold text-foreground">{forecast.daily_velocity} units/day</p>
        </div>
        <div className="bg-white/50 rounded p-2">
          <p className="text-xs text-foreground/60">Days Until Low Stock</p>
          <p className="font-semibold text-foreground">{forecast.days_until_low_stock} days</p>
        </div>
      </div>

      <div className="pt-2 border-t border-current opacity-20">
        <p className="text-xs text-foreground/70 italic">{forecast.trend_analysis}</p>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 text-xs text-foreground/60">
          <Calendar className="w-4 h-4" />
          <span>Predicted: {new Date(forecast.predicted_low_stock_date).toLocaleDateString()}</span>
        </div>
        <span className="text-xs bg-white/50 px-2 py-1 rounded text-foreground/60">
          {forecast.confidence}% confidence
        </span>
      </div>

      <button className="w-full mt-2 bg-primary text-white py-2 rounded font-medium hover:bg-primary-light transition text-sm">
        Create Purchase Order
      </button>
    </div>
  );
}