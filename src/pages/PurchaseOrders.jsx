import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, FileText, Truck } from 'lucide-react';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, draft, confirmed, shipped

  useEffect(() => {
    loadPOs();
  }, []);

  const loadPOs = async () => {
    try {
      const query = 
        filter === 'all' ? {} : { status: filter };
      const data = await base44.entities.PurchaseOrder.filter(query, '-created_date', 100);
      setPos(data);
    } catch (err) {
      console.error('Failed to load POs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (poId) => {
    try {
      await base44.entities.PurchaseOrder.update(poId, {
        status: 'confirmed',
      });
      loadPOs();
      alert('PO confirmed!');
    } catch (err) {
      alert('Failed to confirm PO');
    }
  };

  const handleMarkShipped = async (poId) => {
    try {
      const trackingNumber = prompt('Enter tracking number:');
      if (trackingNumber) {
        await base44.entities.PurchaseOrder.update(poId, {
          status: 'shipped',
          tracking_number: trackingNumber,
          expected_delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
        loadPOs();
        alert('Shipment recorded!');
      }
    } catch (err) {
      alert('Failed to update shipment');
    }
  };

  const handleReceive = async (poId) => {
    try {
      await base44.entities.PurchaseOrder.update(poId, {
        status: 'received',
        actual_delivery_date: new Date().toISOString(),
      });
      loadPOs();
      alert('Receipt confirmed!');
    } catch (err) {
      alert('Failed to confirm receipt');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-50 border-gray-200',
      confirmed: 'bg-blue-50 border-blue-200',
      shipped: 'bg-yellow-50 border-yellow-200',
      received: 'bg-green-50 border-green-200',
      cancelled: 'bg-red-50 border-red-200',
    };
    return colors[status] || 'bg-gray-50';
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded-full font-medium">Draft</span>,
      confirmed: <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-medium">Confirmed</span>,
      shipped: <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full font-medium">Shipped</span>,
      received: <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full font-medium">Received</span>,
      cancelled: <span className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full font-medium">Cancelled</span>,
    };
    return badges[status];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-xl">←</button>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
        </div>
        <p className="text-sm text-primary-light ml-12">Manage vendor shipments & confirmations</p>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'draft', 'confirmed', 'shipped', 'received'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilter(status);
                setLoading(true);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                filter === status
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-border'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* PO List */}
      <div className="p-4 space-y-3">
        {pos.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-foreground/30 mx-auto mb-2" />
            <p className="text-foreground/60">No purchase orders</p>
            <p className="text-sm text-foreground/40 mt-1">Orders will appear here when products hit reorder dates</p>
          </div>
        ) : (
          pos.map((po) => (
            <div
              key={po.id}
              className={`border rounded-lg p-4 space-y-3 ${getStatusColor(po.status)}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{po.product_name}</p>
                  <p className="text-xs text-foreground/60">{po.po_number}</p>
                  {po.auto_generated && (
                    <p className="text-xs text-foreground/50 mt-1">Auto-generated</p>
                  )}
                </div>
                {getStatusBadge(po.status)}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm bg-white/50 rounded p-3">
                <div>
                  <p className="text-xs text-foreground/60">Quantity</p>
                  <p className="font-semibold">{po.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/60">Total Amount</p>
                  <p className="font-semibold">₵{po.total_amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/60">Vendor</p>
                  <p className="font-semibold truncate">{po.vendor_name}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/60">SKU</p>
                  <p className="font-semibold">{po.product_sku}</p>
                </div>
              </div>

              {/* Tracking Info */}
              {po.tracking_number && (
                <div className="bg-white/50 rounded p-3">
                  <p className="text-xs text-foreground/60 mb-1">Tracking</p>
                  <p className="font-mono text-sm">{po.tracking_number}</p>
                </div>
              )}

              {/* Predicted Reorder Date */}
              {po.reorder_date_predicted && (
                <div className="text-xs text-foreground/60">
                  Predicted: {new Date(po.reorder_date_predicted).toLocaleDateString()}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {po.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleConfirm(po.id)}
                      className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition"
                    >
                      <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      Confirm
                    </button>
                    <button
                      onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      className="flex-1 bg-muted text-foreground py-2 rounded-lg text-sm font-medium hover:bg-border transition"
                    >
                      Edit
                    </button>
                  </>
                )}
                {po.status === 'confirmed' && (
                  <button
                    onClick={() => handleMarkShipped(po.id)}
                    className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition"
                  >
                    <Truck className="w-4 h-4 inline mr-1" />
                    Mark Shipped
                  </button>
                )}
                {po.status === 'shipped' && (
                  <button
                    onClick={() => handleReceive(po.id)}
                    className="flex-1 bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent-light transition"
                  >
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    Receive Stock
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Generate Button */}
      <div className="p-4 fixed bottom-20 left-0 right-0">
        <button
          onClick={async () => {
            setLoading(true);
            try {
              await base44.functions.invoke('generatePurchaseOrders', {});
              loadPOs();
              alert('PO generation completed!');
            } catch (err) {
              alert('Failed to generate POs');
            }
          }}
          className="w-full bg-accent text-white py-3 rounded-lg font-medium hover:bg-accent-light transition"
        >
          Generate POs Now
        </button>
      </div>
    </div>
  );
}