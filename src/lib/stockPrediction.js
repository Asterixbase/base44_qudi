/**
 * Stock Prediction Model
 * Analyzes historical transaction data to predict reorder dates and optimal quantities
 */

/**
 * Analyze product stock health (legacy function for StockPredictionDashboard)
 */
export const analyzeStockHealth = (stock, product, transactions) => {
  const dailyVelocity = stockPrediction.calculateDailyVelocity(
    transactions,
    product.id,
    30
  );
  const dailyVariability = stockPrediction.calculateDailyVariability(
    transactions,
    product.id,
    30
  );
  const safetyStock = stockPrediction.calculateSafetyStock(2, dailyVariability, 7);
  const reorderPoint = stockPrediction.calculateReorderPoint(dailyVelocity, 7, safetyStock);
  const reorderPrediction = stockPrediction.predictReorderDate(
    stock.quantity,
    reorderPoint,
    dailyVelocity
  );

  return {
    productId: product.id,
    productName: product.name,
    currentStock: stock.quantity,
    dailyVelocity: dailyVelocity.toFixed(1),
    optimalLevel: Math.ceil(dailyVelocity * 14),
    reorderLevel: reorderPoint,
    safetyStock: safetyStock,
    avgDaily: dailyVelocity.toFixed(1),
    predictedReorderDate: new Date(reorderPrediction.estimatedDate),
    daysUntilReorder: reorderPrediction.daysUntilReorder,
    status:
      reorderPrediction.status === 'urgent'
        ? 'critical'
        : reorderPrediction.status === 'warning'
          ? 'warning'
          : 'healthy',
  };
};

export const stockPrediction = {
  /**
   * Calculate daily sales velocity from transaction history
   * @param {Array} transactions - Transaction records
   * @param {string} productId - Product ID to analyze
   * @param {number} days - Number of days to look back (default: 30)
   * @returns {number} Average daily sales quantity
   */
  calculateDailyVelocity(transactions, productId, days = 30) {
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
    return Math.round((totalQuantity / days) * 10) / 10; // Round to 1 decimal
  },

  /**
   * Calculate variability (standard deviation) of daily sales
   * @param {Array} transactions - Transaction records
   * @param {string} productId - Product ID
   * @param {number} days - Look-back period
   * @returns {number} Standard deviation of daily sales
   */
  calculateDailyVariability(transactions, productId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Group transactions by day
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
  },

  /**
   * Calculate reorder point
   * Reorder Point = (Daily Demand × Lead Time) + Safety Stock
   * @param {number} dailyDemand - Average daily sales velocity
   * @param {number} leadTime - Lead time in days (default: 7)
   * @param {number} safetyStock - Extra buffer for variability
   * @returns {number} Recommended reorder point
   */
  calculateReorderPoint(dailyDemand, leadTime = 7, safetyStock = 0) {
    return Math.ceil(dailyDemand * leadTime + safetyStock);
  },

  /**
   * Calculate safety stock using service level approach
   * @param {number} zScore - Service level z-score (e.g., 1.65 for 95%)
   * @param {number} dailyVariability - Standard deviation of daily demand
   * @param {number} leadTime - Lead time in days
   * @returns {number} Recommended safety stock
   */
  calculateSafetyStock(zScore = 1.65, dailyVariability = 0, leadTime = 7) {
    return Math.ceil(zScore * dailyVariability * Math.sqrt(leadTime));
  },

  /**
   * Calculate Economic Order Quantity (Wilson EOQ Formula)
   * EOQ = sqrt((2 × D × S) / H)
   * D = annual demand, S = order cost, H = holding cost per unit
   * @param {number} annualDemand - Projected annual demand
   * @param {number} orderCost - Cost per order (default: 50)
   * @param {number} holdingCost - Annual holding cost per unit (default: 10% of price)
   * @returns {number} Optimal order quantity
   */
  calculateEOQ(annualDemand, orderCost = 50, holdingCost = 10) {
    if (annualDemand === 0 || holdingCost === 0) return 0;
    return Math.ceil(Math.sqrt((2 * annualDemand * orderCost) / holdingCost));
  },

  /**
   * Predict next reorder date based on current stock and velocity
   * @param {number} currentQuantity - Current stock level
   * @param {number} reorderPoint - Reorder threshold
   * @param {number} dailyVelocity - Average daily sales
   * @returns {object} { shouldReorder: boolean, daysUntilReorder: number, estimatedDate: string }
   */
  predictReorderDate(currentQuantity, reorderPoint, dailyVelocity) {
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
  },

  /**
   * Generate comprehensive stock analysis for a product
   * @param {object} product - Product entity
   * @param {object} stock - Stock entity for this product
   * @param {Array} transactions - All transaction records
   * @returns {object} Prediction object with recommendations
   */
  analyzProductStock(product, stock, transactions) {
    const dailyVelocity = this.calculateDailyVelocity(
      transactions,
      product.id,
      30
    );
    const dailyVariability = this.calculateDailyVariability(
      transactions,
      product.id,
      30
    );
    const safetyStock = this.calculateSafetyStock(1.65, dailyVariability, 7);
    const reorderPoint = this.calculateReorderPoint(dailyVelocity, 7, safetyStock);
    const annualDemand = dailyVelocity * 365;
    const eoq = this.calculateEOQ(
      annualDemand,
      50,
      product.unit_price * 0.1 // 10% holding cost
    );
    const reorderPrediction = this.predictReorderDate(
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
      daily_variability: dailyVariability,
      safety_stock: safetyStock,
      reorder_point: reorderPoint,
      optimal_order_quantity: Math.max(eoq, reorderPoint * 2), // At least 2x reorder point
      annual_demand: Math.round(annualDemand),
      predicted_stockout_date: null,
      predicted_reorder_date: reorderPrediction.estimatedDate,
      days_until_reorder: reorderPrediction.daysUntilReorder,
      should_reorder: reorderPrediction.shouldReorder,
      stock_status: reorderPrediction.status,
      confidence: dailyVelocity > 0 ? 'high' : 'low',
      last_analyzed: new Date().toISOString(),
    };
  },
};