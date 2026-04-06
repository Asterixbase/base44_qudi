import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function SaleConfirmed() {
  const navigate = useNavigate();
  const location = useLocation();
  const items = location.state?.items || [];
  const total = location.state?.total || 0;
  const paymentMethod = location.state?.paymentMethod || 'cash';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center pb-24">
      <div className="text-center">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-foreground mb-1">Sale confirmed!</h1>
        <p className="text-foreground/60 mb-6">Stock updated automatically</p>

        <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full mb-6 text-left">
          <div className="space-y-2 mb-4">
            {items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between">
                <p className="text-foreground">{item.name} × {item.quantity}</p>
                <p className="font-semibold">GHS {(item.amount || 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-border">
            <div className="flex justify-between mb-3">
              <p className="font-semibold text-foreground">Total</p>
              <p className="text-2xl font-bold text-primary">GHS {total.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-800">
              Payment: {paymentMethod.toUpperCase()} ✓
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/home')}
            className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-light transition"
          >
            Done
          </button>
          <button
            onClick={() => navigate('/home/sale')}
            className="flex-1 bg-muted text-foreground py-3 rounded-lg font-semibold hover:bg-border transition"
          >
            New sale
          </button>
        </div>
      </div>
    </div>
  );
}