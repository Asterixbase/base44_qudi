import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Inline velocity calculation
function calculateVelocity(transactions, productId, daysBack = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const relevant = transactions.filter(
    (t) =>
      t.product_id === productId &&
      t.type === 'out' &&
      new Date(t.created_date) > cutoffDate
  );
  if (relevant.length === 0) return 0;
  const totalQuantity = relevant.reduce((sum, t) => sum + t.quantity, 0);
  return totalQuantity / daysBack;
}

function predictReorderDate(
  currentQuantity,
  velocity,
  reorderLevel,
  daysInAdvance = 7
) {
  if (velocity <= 0) return null;
  const daysUntilReorder = (currentQuantity - reorderLevel) / velocity;
  if (daysUntilReorder < 0) return null;
  const reorderDays = Math.max(0, daysUntilReorder - daysInAdvance);
  const date = new Date();
  date.setDate(date.getDate() + reorderDays);
  return date;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow both admins and authenticated users
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data
    const [products, stock, transactions, existingPOs] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.Stock.list(),
      base44.entities.Transaction.list(),
      base44.entities.PurchaseOrder.list(),
    ]);

    // Generate POs for products hitting reorder dates
    const newPOs = [];
    const today = new Date();

    for (const product of products) {
      if (product.status !== 'active') continue;

      const stockItem = stock.find((s) => s.product_id === product.id);
      if (!stockItem) continue;

      const velocity = calculateVelocity(transactions, product.id);
      const reorderDate = predictReorderDate(
        stockItem.quantity,
        velocity,
        product.reorder_level
      );

      if (!reorderDate) continue;

      // Check if reorder date is today or in past (and PO doesn't exist)
      if (reorderDate <= today) {
        const existingPO = existingPOs.find(
          (po) => 
            po.product_id === product.id && 
            (po.status === 'draft' || po.status === 'confirmed')
        );

        if (!existingPO) {
          // Calculate optimal quantity
          const optimalQty = Math.max(
            product.reorder_level * 2,
            Math.ceil(velocity * 14) // 2 weeks supply
          );

          const poNumber = `PO-${Date.now()}-${product.id.slice(0, 8)}`;

          newPOs.push({
            po_number: poNumber,
            product_id: product.id,
            product_sku: product.sku,
            product_name: product.name,
            vendor_name: product.supplier || 'TBD',
            quantity: optimalQty,
            unit_price: product.unit_price,
            total_amount: optimalQty * product.unit_price,
            status: 'draft',
            reorder_date_predicted: reorderDate.toISOString(),
            auto_generated: true,
          });
        }
      }
    }

    // Bulk create if any new POs
    if (newPOs.length > 0) {
      await base44.entities.PurchaseOrder.bulkCreate(newPOs);
    }

    return Response.json({
      success: true,
      generated: newPOs.length,
      pos: newPOs,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});