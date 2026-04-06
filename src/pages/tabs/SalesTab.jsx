import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

export default function SalesTab() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary text-white p-4">
        <h1 className="text-2xl font-bold">💰 Sales</h1>
        <p className="text-sm text-primary-light">Record & track transactions</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/home/sale')} className="bg-accent text-white p-4 rounded-lg font-semibold hover:bg-accent-light transition">
            <Plus className="w-6 h-6 mx-auto mb-2" />
            Quick Sale
          </button>
          <button className="bg-card border-2 border-border p-4 rounded-lg font-semibold hover:border-primary transition">
            <div className="text-2xl mb-2">📊</div>
            Daily Report
          </button>
        </div>
      </div>
    </div>
  );
}