import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Stock Prediction Engine
 * Analyzes historical transactions to generate reorder predictions
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data in parallel
    const [products, stocks, transactions] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.Stock.list(),
      base44.entities.Transaction.list(),
    ]);

    // Helper function to calculate daily velocity
    const calculateDailyVelocity = (productId, days = 30) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const relevantTx = transactions.filter(tx => {
        const txDate = new Date(tx.created_date);
        return (
          tx.product_id === productId &&
          tx.type === 'out' &&
          txDate >= cutoffDate
        );
      });

      const totalQuantity = relevantTx.reduce((sum, tx) => sum + tx.quantity, 0);
      return Math.round((totalQuantity / days) * 10) / 10;
    };

    // Helper function to calculate daily variability
    const calculateDailyVariability = (productId, days = 30) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const dailyMap = {};
      transactions.forEach(tx => {
        const txDate = new Date(tx.created_date);
        if (
          tx.product_id === productId &&
          tx.type === 'out' &&
          txDate >= cutoffDate
        ) {
          const dateKey = txDate.toLocaleDateString();
          dailyMap[dateKey] = (dailyMap[dateKey] || 0) + tx.quantity;
        }
      });

      const dailyQuantities = Object.values(dailyMap);
      if (dailyQuantities.length === 0) return 0;

      const mean = dailyQuantities.reduce((a, b) => a + b, 0) / dailyQuantities.length;
      const variance =
        dailyQuantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) /
        dailyQuantities.length;
      return Math.sqrt(variance);
    };

    // Helper function to calculate reorder point
    const calculateReorderPoint = (dailyDemand, safetyStock, leadTime = 7) => {
      return Math.ceil(dailyDemand * leadTime + safetyStock);
    };

    // Helper function to calculate safety stock
    const calculateSafetyStock = (zScore = 1.65, dailyVariability = 0, leadTime = 7) => {
      return Math.ceil(zScore * dailyVariability * Math.sqrt(leadTime));
    };

    // Helper function to calculate EOQ
    const calculateEOQ = (annualDemand, orderCost = 50, holdingCost = 10) => {
      if (annualDemand === 0 || holdingCost === 0) return 0;
      return Math.ceil(Math.sqrt((2 * annualDemand * orderCost) / holdingCost));
    };

    // Helper function to predict reorder date
    const predictReorderDate = (currentQuantity, reorderPoint, dailyVelocity) => {
      if (dailyVelocity === 0) {
        return {
          shouldReorder: currentQuantity <= reorderPoint,
          daysUntilReorder: Infinity,
          estimatedDate: null,
          status: 'insufficient_data',
        };
      }

      const daysUntilReorder = Math.max(
        0,
        (currentQuantity - reorderPoint) / dailyVelocity
      );
      const estimatedDate = new Date();
      estimatedDate.setDate(estimatedDate.getDate() + daysUntilReorder);

      return {
        shouldReorder: daysUntilReorder <= 0,
        daysUntilReorder: Math.round(daysUntilReorder * 10) / 10,
        estimatedDate: estimatedDate.toISOString().split('T')[0],
        status: daysUntilReorder <= 0 ? 'urgent' : daysUntilReorder <= 7 ? 'warning' : 'healthy',
      };
    };

    // Generate predictions for all active products
    const predictions = products
      .filter(p => p.status === 'active')
      .map(product => {
        const stock = stocks.find(s => s.product_id === product.id);
        if (!stock) return null;

        const dailyVelocity = calculateDailyVelocity(product.id, 30);
        const dailyVariability = calculateDailyVariability(product.id, 30);
        const safetyStock = calculateSafetyStock(1.65, dailyVariability, 7);
        const reorderPoint = calculateReorderPoint(dailyVelocity, safetyStock, 7);
        const annualDemand = dailyVelocity * 365;
        const eoq = calculateEOQ(
          annualDemand,
          50,
          product.unit_price * 0.1
        );
        const reorderPrediction = predictReorderDate(
          stock.quantity,
          reorderPoint,
          dailyVelocity
        );

        return {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          current_quantity: stock.quantity,
          daily_velocity: dailyVelocity,
          daily_variability: Math.round(dailyVariability * 100) / 100,
          safety_stock: safetyStock,
          reorder_point: reorderPoint,
          optimal_order_quantity: Math.max(eoq, reorderPoint * 2),
          annual_demand: Math.round(annualDemand),
          predicted_reorder_date: reorderPrediction.estimatedDate,
          days_until_reorder: reorderPrediction.daysUntilReorder,
          should_reorder: reorderPrediction.shouldReorder,
          stock_status: reorderPrediction.status,
          confidence: dailyVelocity > 0 ? 'high' : 'low',
          analysis_timestamp: new Date().toISOString(),
        };
      })
      .filter(p => p !== null);

    // Sort by urgency
    predictions.sort((a, b) => {
      const statusPriority = { urgent: 0, warning: 1, healthy: 2, insufficient_data: 3 };
      return (
        statusPriority[a.stock_status] - statusPriority[b.stock_status] ||
        a.days_until_reorder - b.days_until_reorder
      );
    });

    return Response.json({
      success: true,
      total_products_analyzed: predictions.length,
      urgent_reorders: predictions.filter(p => p.stock_status === 'urgent').length,
      warning_reorders: predictions.filter(p => p.stock_status === 'warning').length,
      predictions: predictions.slice(0, 100), // Return top 100 to avoid payload limits
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Stock prediction error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});