/* eslint-disable */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch products, stock, and transactions
    const [products, stock, transactions] = await Promise.all([
      base44.asServiceRole.entities.Product.list(),
      base44.asServiceRole.entities.Stock.list(),
      base44.asServiceRole.entities.Transaction.list(),
    ]);

    // Get existing forecasts to avoid duplicates
    const existingForecasts = await base44.asServiceRole.entities.StockForecast.list();

    const forecasts = [];

    // Analyze each product
    for (const product of products) {
      const productStock = stock.find(s => s.product_id === product.id);
      if (!productStock) continue;

      // Calculate 30-day velocity
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const relevantTx = transactions.filter(tx => {
        const txDate = new Date(tx.created_date);
        return (
          tx.product_id === product.id &&
          tx.type === 'out' &&
          txDate >= thirtyDaysAgo
        );
      });

      const totalQuantity = relevantTx.reduce((sum, tx) => sum + tx.quantity, 0);
      const dailyVelocity = Math.round((totalQuantity / 30) * 10) / 10;

      if (dailyVelocity === 0) continue; // Skip stagnant products

      // Use LLM to analyze trend and provide insights
      const transactionSummary = {
        total_quantity_sold: totalQuantity,
        daily_average: dailyVelocity,
        transactions_count: relevantTx.length,
        current_stock: productStock.quantity,
        reorder_level: product.reorder_level || Math.ceil(dailyVelocity * 7),
      };

      const trendAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this product's sales trend and predict stock status:
        Product: ${product.name} (SKU: ${product.sku})
        Current Stock: ${productStock.quantity} units
        Daily Sales Average: ${dailyVelocity} units
        Transactions (30d): ${transactionSummary.transactions_count}
        Reorder Level: ${transactionSummary.reorder_level} units
        
        Provide a brief trend analysis (1-2 sentences) and confidence level (0-100) on the forecast.
        Format: ANALYSIS:[analysis] CONFIDENCE:[number]`,
      });

      // Parse LLM response
      const analysisMatch = trendAnalysis.match(/ANALYSIS:\s*(.+?)\s*CONFIDENCE:/);
      const confidenceMatch = trendAnalysis.match(/CONFIDENCE:\s*(\d+)/);
      const trendText = analysisMatch ? analysisMatch[1].trim() : 'Unable to analyze trend';
      const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 75;

      // Calculate forecast
      const daysUntilLowStock = Math.max(
        0,
        (productStock.quantity - transactionSummary.reorder_level) / dailyVelocity
      );

      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + daysUntilLowStock);

      // Determine urgency
      let urgency = 'low';
      if (daysUntilLowStock <= 0) urgency = 'critical';
      else if (daysUntilLowStock <= 3) urgency = 'high';
      else if (daysUntilLowStock <= 7) urgency = 'medium';

      // Recommended order quantity (2x the reorder level)
      const recommendedQuantity = Math.ceil(transactionSummary.reorder_level * 2);

      forecasts.push({
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        current_quantity: productStock.quantity,
        daily_velocity: dailyVelocity,
        predicted_low_stock_date: forecastDate.toISOString().split('T')[0],
        days_until_low_stock: Math.round(daysUntilLowStock * 10) / 10,
        reorder_level: transactionSummary.reorder_level,
        recommended_order_quantity: recommendedQuantity,
        urgency,
        confidence,
        trend_analysis: trendText,
        notification_sent: false,
        forecast_date: new Date().toISOString(),
      });
    }

    // Delete old forecasts and create new ones
    const allForecasts = await base44.asServiceRole.entities.StockForecast.list();
    for (const forecast of allForecasts) {
      await base44.asServiceRole.entities.StockForecast.delete(forecast.id);
    }

    // Bulk create new forecasts
    if (forecasts.length > 0) {
      await base44.asServiceRole.entities.StockForecast.bulkCreate(forecasts);
    }

    // Send notifications for critical items
    const criticalForecasts = forecasts.filter(f => f.urgency === 'critical' || f.urgency === 'high');
    if (criticalForecasts.length > 0) {
      const adminUsers = await base44.asServiceRole.entities.User.list();
      const adminEmails = adminUsers.filter(u => u.role === 'admin').map(u => u.email);

      for (const email of adminEmails) {
        const itemsList = criticalForecasts
          .map(f => `• ${f.product_name} (SKU: ${f.product_sku}) - ${f.urgency.toUpperCase()} in ${f.days_until_low_stock} days`)
          .join('\n');

        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `🚨 Stock Alert: ${criticalForecasts.length} items at critical levels`,
          body: `AI Forecast Alert\n\nThe following items are predicted to reach low stock levels:\n\n${itemsList}\n\nPlease review and place orders accordingly.`,
        });
      }
    }

    return Response.json({
      success: true,
      forecasts_created: forecasts.length,
      critical_alerts: criticalForecasts.length,
      forecasts,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});