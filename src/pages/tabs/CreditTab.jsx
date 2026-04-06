import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, TrendingUp } from 'lucide-react';

export default function CreditTab() {
  const navigate = useNavigate();
  const [credits, setCredits] = useState([]);
  const [stats, setStats] = useState({
    outstanding: 0,
    pending: 0,
    paid: 0,
  });

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      // Mock data - replace with actual entity once available
      const mockCredits = [
        {
          id: '1',
          customer: 'Kofi Mensah Ent.',
          amount: 8400.00,
          status: 'overdue',
          dueDate: '2026-03-24',
        },
        {
          id: '2',
          customer: 'Ama Serwaa Boutique',
          amount: 12250.00,
          status: 'due-tomorrow',
          dueDate: '2026-03-27',
        },
      ];
      setCredits(mockCredits);
      setStats({
        outstanding: 42850.00,
        pending: 12,
        paid: 85,
      });
    } catch (error) {
      console.error('Failed to load credits:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 sticky top-0 z-40">
        <h1 className="text-2xl font-bold">Credit Sales</h1>
        <p className="text-sm text-purple-200">GHS {stats.outstanding.toFixed(2)} outstanding</p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto">
        {[
          { label: 'All', value: 'all' },
          { label: 'Due', value: 'due' },
          { label: 'Pending', value: 'pending' },
          { label: 'Paid', value: 'paid' },
        ].map(s => (
          <button key={s.value} className="px-3 py-1 bg-muted text-foreground rounded-full text-xs font-medium">
            {s.label}
          </button>
        ))}
      </div>

      {/* Credits List */}
      <div className="px-4 py-3 space-y-2">
        {credits.map(credit => (
          <div
            key={credit.id}
            onClick={() => navigate(`/credit/${credit.id}`)}
            className="bg-card border border-border rounded-lg p-3 hover:border-purple-400 transition cursor-pointer"
          >
            <div className="flex justify-between items-start mb-1">
              <p className="font-semibold text-foreground">{credit.customer}</p>
              <p className="text-lg font-bold text-accent">GHS {credit.amount.toFixed(2)}</p>
            </div>
            <div className="flex justify-between text-xs">
              <CreditStatus status={credit.status} />
              <p className="text-foreground/60">Due: {new Date(credit.dueDate).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* New Credit Button */}
      <button
        onClick={() => navigate('/credit/new')}
        className="fixed bottom-24 right-4 w-14 h-14 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 shadow-lg"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

function CreditStatus({ status }) {
  const styles = {
    overdue: 'text-red-600 font-semibold',
    'due-tomorrow': 'text-orange-600 font-semibold',
    pending: 'text-yellow-600',
    paid: 'text-green-600',
  };

  return (
    <p className={styles[status]}>
      {status === 'overdue' ? 'OVERDUE 3 DAYS' : status === 'due-tomorrow' ? 'DUE TOMORROW' : status.toUpperCase()}
    </p>
  );
}