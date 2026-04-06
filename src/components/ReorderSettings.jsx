import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle } from 'lucide-react';

export default function ReorderSettings() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await base44.entities.Product.list();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReorderLevelChange = async (productId, newLevel) => {
    setSaving(productId);
    try {
      await base44.entities.Product.update(productId, {
        reorder_level: parseInt(newLevel),
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, reorder_level: parseInt(newLevel) } : p
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to update reorder level');
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-900">
        Set the minimum stock level for each product. Admins will be notified when stock falls below this threshold.
      </div>

      {products.length === 0 ? (
        <div className="text-center py-8 text-foreground/60">
          <p>No products found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {product.name}
                </p>
                <p className="text-xs text-foreground/60">{product.sku}</p>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs text-foreground/60 block mb-1">
                    Reorder at:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={product.reorder_level || 0}
                    onChange={(e) =>
                      handleReorderLevelChange(product.id, e.target.value)
                    }
                    disabled={saving === product.id}
                    className="w-20 px-3 py-2 border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                <span className="text-xs text-foreground/60 whitespace-nowrap">
                  units
                </span>
              </div>

              {saving === product.id && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}