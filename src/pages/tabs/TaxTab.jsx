import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Download, FileText } from 'lucide-react';

export default function TaxTab() {
  const navigate = useNavigate();
  const [taxData, setTaxData] = useState({
    netVat: 342.00,
    outputVat: 2343,
    inputVat: 1276,
    dueDate: '2026-04-30',
  });
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    loadTaxData();
  }, []);

  const loadTaxData = async () => {
    try {
      // Mock data - replace with actual entity
      setInvoices([
        { id: '1', vendor: 'Accra Central', amount: 450, date: '2026-03-22', vat: 67.50 },
        { id: '2', vendor: 'Milo Refill', amount: 85, date: '2026-03-22', vat: 12.75 },
        { id: '3', vendor: 'Indomie 70g', amount: 120, date: '2026-03-20', vat: 18.00 },
      ]);
    } catch (error) {
      console.error('Failed to load tax data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sticky top-0 z-40">
        <h1 className="text-2xl font-bold">Tax Compliance</h1>
        <p className="text-sm text-blue-200">March 2026</p>
      </div>

      {/* VAT Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 m-4 rounded-lg">
        <p className="text-sm text-blue-100 mb-1">NET VAT PAYABLE</p>
        <div className="text-4xl font-bold mb-3">GHS {taxData.netVat.toFixed(2)}</div>
        <p className="text-sm text-blue-100">Due in 35 days • {new Date(taxData.dueDate).toLocaleDateString()}</p>
      </div>

      {/* Tax Summary */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-4">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-foreground/60 mb-1">OUTPUT VAT</p>
          <p className="text-2xl font-bold text-foreground">GHS {taxData.outputVat}</p>
          <p className="text-xs text-foreground/60 mt-1">From sales revenue</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-foreground/60 mb-1">INPUT VAT</p>
          <p className="text-2xl font-bold text-foreground">GHS {taxData.inputVat}</p>
          <p className="text-xs text-foreground/60 mt-1">Reclaimable expenses</p>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="px-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-foreground">Recent invoices</h2>
          <button
            onClick={() => navigate('/tax/invoices')}
            className="text-xs text-primary hover:underline"
          >
            View all
          </button>
        </div>
        <div className="space-y-2">
          {invoices.map(inv => (
            <div key={inv.id} className="bg-card border border-border rounded-lg p-3">
              <div className="flex justify-between items-start mb-1">
                <p className="font-medium text-foreground">{inv.vendor}</p>
                <p className="font-semibold text-foreground">GHS {inv.amount}</p>
              </div>
              <p className="text-xs text-foreground/60">VAT GHS {inv.vat.toFixed(2)} • {new Date(inv.date).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 space-y-2">
        <button
          onClick={() => navigate('/tax/gra-export')}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          GRA VAT Export
        </button>
        <button
          onClick={() => navigate('/tax/invoice-scanner')}
          className="w-full bg-muted text-foreground py-3 rounded-lg font-medium hover:bg-border transition flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Scan Invoice
        </button>
      </div>
    </div>
  );
}