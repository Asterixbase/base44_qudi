import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all products and their stock levels
    const [products, stockRecords] = await Promise.all([
      base44.asServiceRole.entities.Product.list(),
      base44.asServiceRole.entities.Stock.list(),
    ]);

    if (!products || products.length === 0) {
      return Response.json({ message: 'No products found', flagged: 0 });
    }

    let flaggedCount = 0;

    // Check each product's stock against reorder level
    for (const product of products) {
      const stock = stockRecords.find(s => s.product_id === product.id);
      
      if (stock && stock.quantity < product.reorder_level) {
        // Check if notification already exists and is unread
        const existingNotifications = await base44.asServiceRole.entities.StockNotification.filter({
          product_id: product.id,
          type: 'low_stock',
          read: false,
        });

        // Only create if no unread notification exists
        if (!existingNotifications || existingNotifications.length === 0) {
          await base44.asServiceRole.entities.StockNotification.create({
            type: 'low_stock',
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            current_quantity: stock.quantity,
            reorder_level: product.reorder_level,
            location: stock.location || 'Unknown',
            read: false,
            action_taken: false,
          });

          flaggedCount++;
        }

        // Update stock status if needed
        if (stock.status !== 'low_stock') {
          await base44.asServiceRole.entities.Stock.update(stock.id, {
            status: 'low_stock',
          });
        }
      }
    }

    // Also check for expired products
    const today = new Date().toISOString().split('T')[0];
    for (const stock of stockRecords) {
      if (stock.expiry_date && stock.expiry_date <= today) {
        // Check if expiry notification exists and is unread
        const existingNotifications = await base44.asServiceRole.entities.StockNotification.filter({
          product_id: stock.product_id,
          type: 'expired',
          read: false,
        });

        if (!existingNotifications || existingNotifications.length === 0) {
          const product = products.find(p => p.id === stock.product_id);
          await base44.asServiceRole.entities.StockNotification.create({
            type: 'expired',
            product_id: stock.product_id,
            product_name: product?.name || 'Unknown',
            product_sku: product?.sku || 'N/A',
            current_quantity: stock.quantity,
            location: stock.location || 'Unknown',
            expiry_date: stock.expiry_date,
            read: false,
            action_taken: false,
          });

          flaggedCount++;
        }

        // Update stock status
        if (stock.status !== 'expired') {
          await base44.asServiceRole.entities.Stock.update(stock.id, {
            status: 'expired',
          });
        }
      }
    }

    return Response.json({
      message: 'Low stock check completed',
      flagged: flaggedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in flagLowStockProducts:', error);
    return Response.json(
      { error: error.message || 'Failed to flag low stock products' },
      { status: 500 }
    );
  }
});