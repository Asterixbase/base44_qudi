import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only function
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all products, stock, and transactions
    const [products, stock, transactions] = await Promise.all([
      base44.asServiceRole.entities.Product.list(),
      base44.asServiceRole.entities.Stock.list(),
      base44.asServiceRole.entities.Transaction.list('-created_date', 1000),
    ]);

    // Get or create admin users for notifications
    const adminUsers = await base44.asServiceRole.entities.User.list();
    const admins = adminUsers.filter(u => u.role === 'admin');

    // Calculate stockout risks
    const risks = [];

    for (const product of products) {
      const stockItem = stock.find(s => s.product_id === product.id);
      if (!stockItem) continue;

      // Calculate daily velocity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentOutTransactions = transactions.filter(t =>
        t.product_id === product.id &&
        t.type === 'out' &&
        new Date(t.created_date) >= thirtyDaysAgo
      );

      const totalUnitsOut = recentOutTransactions.reduce((sum, t) => sum + t.quantity, 0);
      const daysInPeriod = 30;
      const dailyVelocity = totalUnitsOut / daysInPeriod;

      if (dailyVelocity <= 0) continue; // Skip if no outbound activity

      // Get lead time (assume it's in supplier data or default to 7 days)
      const leadTime = 7; // Default lead time in days

      // Calculate days until stockout
      const currentStock = stockItem.quantity;
      const daysUntilStockout = dailyVelocity > 0 ? currentStock / dailyVelocity : Infinity;

      // Check if stockout date is less than lead time
      if (daysUntilStockout < leadTime && daysUntilStockout > 0) {
        risks.push({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          current_stock: currentStock,
          daily_velocity: parseFloat(dailyVelocity.toFixed(2)),
          days_until_stockout: parseFloat(daysUntilStockout.toFixed(1)),
          lead_time: leadTime,
          days_before_stockout: parseFloat((daysUntilStockout - leadTime).toFixed(1)),
          reorder_level: product.reorder_level || 0,
          unit_price: product.unit_price || 0,
        });
      }
    }

    // Create in-app notifications for each risk
    if (risks.length > 0) {
      const notificationPromises = admins.map(admin =>
        base44.asServiceRole.entities.StockNotification.bulkCreate(
          risks.map(risk => ({
            type: 'low_stock',
            product_id: risk.product_id,
            product_name: risk.product_name,
            product_sku: risk.product_sku,
            current_quantity: risk.current_stock,
            reorder_level: risk.reorder_level,
            read: false,
            action_taken: false,
          }))
        )
      );

      await Promise.all(notificationPromises);

      // Send email alert to all admins
      const emailBody = `
        <h2>Stock Replenishment Alert</h2>
        <p>${risks.length} product(s) at risk of stockout:</p>
        <ul>
          ${risks.map(r => `
            <li>
              <strong>${r.product_name}</strong> (${r.product_sku})
              <br/>Current: ${r.current_stock} units | Daily velocity: ${r.daily_velocity}
              <br/>Stockout in: ${r.days_until_stockout} days (lead time: ${r.lead_time} days)
              <br/>⚠️ Action needed: ${Math.abs(r.days_before_stockout)} days before stockout
            </li>
          `).join('')}
        </ul>
        <p><strong>Recommended Action:</strong> Create purchase orders immediately to ensure delivery before stockout.</p>
      `;

      await Promise.all(
        admins.map(admin =>
          base44.integrations.Core.SendEmail({
            to: admin.email,
            subject: `🚨 Stock Replenishment Alert - ${risks.length} Products At Risk`,
            body: emailBody,
            from_name: 'Sikasem Inventory',
          })
        )
      );
    }

    return Response.json({
      success: true,
      risksIdentified: risks.length,
      risks: risks.slice(0, 10), // Return top 10
      adminsNotified: admins.length,
    });
  } catch (error) {
    console.error('Stockout risk notification failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});