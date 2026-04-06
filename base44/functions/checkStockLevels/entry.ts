import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all products and stock
    const [products, stock, adminUsers] = await Promise.all([
      base44.asServiceRole.entities.Product.list(),
      base44.asServiceRole.entities.Stock.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    // Fetch existing notifications from last 24 hours to avoid duplicates
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Filter admin users for notifications
    const adminEmails = adminUsers
      .filter((u) => u.role === 'admin')
      .map((u) => u.email);

    if (adminEmails.length === 0) {
      return Response.json({ message: 'No admin users to notify' });
    }

    // Check stock levels and expired items
    const lowStockItems = [];
    const expiredItems = [];
    const notificationsToCreate = [];

    stock.forEach((item) => {
      const product = products.find((p) => p.id === item.product_id);
      
      // Check for low stock
      if (product && item.quantity < product.reorder_level) {
        lowStockItems.push({
          productName: item.product_name,
          sku: item.product_sku,
          currentQuantity: item.quantity,
          reorderLevel: product.reorder_level,
          location: item.location,
          shortage: product.reorder_level - item.quantity,
        });
        notificationsToCreate.push({
          type: 'low_stock',
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          current_quantity: item.quantity,
          reorder_level: product.reorder_level,
          location: item.location,
          read: false,
          action_taken: false,
        });
      }

      // Check for expired items
      if (item.expiry_date && new Date(item.expiry_date) < new Date()) {
        expiredItems.push({
          productName: item.product_name,
          sku: item.product_sku,
          quantity: item.quantity,
          expiryDate: item.expiry_date,
          location: item.location,
        });
        notificationsToCreate.push({
          type: 'expired',
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          expiry_date: item.expiry_date,
          location: item.location,
          read: false,
          action_taken: false,
        });
      }
    });

    // Create in-app notifications
    if (notificationsToCreate.length > 0) {
      await base44.asServiceRole.entities.StockNotification.bulkCreate(
        notificationsToCreate
      );
    }

    // Send summary emails
    const totalAlerts = lowStockItems.length + expiredItems.length;
    if (totalAlerts > 0) {
      let emailBody = 'Stock Alert Summary\n\n';

      if (lowStockItems.length > 0) {
        const lowStockList = lowStockItems
          .map(
            (item) =>
              `• ${item.productName} (${item.sku}): ${item.currentQuantity} units (need ${item.shortage} more) at ${item.location}`
          )
          .join('\n');
        emailBody += `LOW STOCK ITEMS (${lowStockItems.length}):\n${lowStockList}\n\n`;
      }

      if (expiredItems.length > 0) {
        const expiredList = expiredItems
          .map(
            (item) =>
              `• ${item.productName} (${item.sku}): ${item.quantity} units expired on ${new Date(item.expiryDate).toLocaleDateString()} at ${item.location}`
          )
          .join('\n');
        emailBody += `EXPIRED ITEMS (${expiredItems.length}):\n${expiredList}\n\n`;
      }

      emailBody += 'Please review and take action.\n\n---\nSikasem Inventory Management';

      // Send email to each admin
      for (const adminEmail of adminEmails) {
        await base44.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `Stock Alert: ${totalAlerts} alert(s) require attention`,
          body: emailBody,
        });
      }
    }

    return Response.json({
      success: true,
      lowStockItemsCount: lowStockItems.length,
      expiredItemsCount: expiredItems.length,
      notificationsCreated: notificationsToCreate.length,
      adminNotified: adminEmails.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});