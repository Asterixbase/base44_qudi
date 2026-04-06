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

    // Filter admin users for notifications
    const adminEmails = adminUsers
      .filter((u) => u.role === 'admin')
      .map((u) => u.email);

    if (adminEmails.length === 0) {
      return Response.json({ message: 'No admin users to notify' });
    }

    // Check stock levels against reorder points
    const lowStockItems = [];
    stock.forEach((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (product && item.quantity < product.reorder_level) {
        lowStockItems.push({
          productName: item.product_name,
          sku: item.product_sku,
          currentQuantity: item.quantity,
          reorderLevel: product.reorder_level,
          location: item.location,
          shortage: product.reorder_level - item.quantity,
        });
      }
    });

    // Send notification emails if low stock items found
    if (lowStockItems.length > 0) {
      const itemList = lowStockItems
        .map(
          (item) =>
            `• ${item.productName} (${item.sku}): ${item.currentQuantity} units (need ${item.shortage} more) at ${item.location}`
        )
        .join('\n');

      const emailBody = `
Stock Alert: ${lowStockItems.length} product(s) below reorder level

${itemList}

Please review and place orders as needed.

---
Sikasem Inventory Management
      `.trim();

      // Send email to each admin
      for (const adminEmail of adminEmails) {
        await base44.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `Stock Alert: ${lowStockItems.length} product(s) below reorder level`,
          body: emailBody,
        });
      }
    }

    return Response.json({
      success: true,
      lowStockItemsCount: lowStockItems.length,
      adminNotified: adminEmails.length,
      items: lowStockItems,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});