import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all products, stock, and admin users
    const [products, stock, users] = await Promise.all([
      base44.asServiceRole.entities.Product.list(),
      base44.asServiceRole.entities.Stock.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    // Get admin users
    const admins = users.filter(u => u.role === 'admin');
    if (admins.length === 0) {
      return Response.json({ message: 'No admin users found' });
    }

    // Find products below reorder level
    const lowStockAlerts = [];
    stock.forEach(stockItem => {
      const product = products.find(p => p.id === stockItem.product_id);
      if (product && stockItem.quantity < product.reorder_level) {
        lowStockAlerts.push({
          product_id: stockItem.product_id,
          product_name: stockItem.product_name,
          product_sku: stockItem.product_sku,
          current_quantity: stockItem.quantity,
          reorder_level: product.reorder_level,
          location: stockItem.location,
          expiry_date: stockItem.expiry_date,
        });
      }
    });

    // If there are low stock items, create notifications and send emails
    if (lowStockAlerts.length > 0) {
      // Create in-app notifications
      await Promise.all(
        lowStockAlerts.map(alert =>
          base44.asServiceRole.entities.StockNotification.create({
            type: 'low_stock',
            product_id: alert.product_id,
            product_name: alert.product_name,
            product_sku: alert.product_sku,
            current_quantity: alert.current_quantity,
            reorder_level: alert.reorder_level,
            location: alert.location,
            expiry_date: alert.expiry_date,
            read: false,
            action_taken: false,
          })
        )
      );

      // Send email to admins
      const alertSummary = lowStockAlerts
        .map(
          a =>
            `• ${a.product_name} (${a.product_sku}): ${a.current_quantity}/${a.reorder_level} units at ${a.location}`
        )
        .join('\n');

      await Promise.all(
        admins.map(admin =>
          base44.integrations.Core.SendEmail({
            to: admin.email,
            subject: `⚠️ Low Stock Alert - ${lowStockAlerts.length} product(s) below reorder level`,
            body: `Hello ${admin.full_name},\n\nThe following products have fallen below their reorder levels:\n\n${alertSummary}\n\nPlease review and take action accordingly.\n\nBest regards,\nSikasem Inventory System`,
            from_name: 'Sikasem Alerts',
          })
        )
      );

      return Response.json({
        success: true,
        alertsCreated: lowStockAlerts.length,
        emailsSent: admins.length,
        details: lowStockAlerts,
      });
    }

    return Response.json({
      success: true,
      alertsCreated: 0,
      message: 'All stock levels are healthy',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});