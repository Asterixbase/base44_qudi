/**
 * Calculate daily transaction velocity for a product
 */
export function calculateVelocity(transactions, productId, daysBack = 30) {
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

/**
 * Predict reorder date based on current stock and velocity
 * Returns null if no data or zero velocity
 */
export function predictReorderDate(
  currentQuantity,
  velocity,
  reorderLevel,
  daysInAdvance = 7
) {
  if (velocity <= 0) return null;

  // Days until stock hits reorder level
  const daysUntilReorder = (currentQuantity - reorderLevel) / velocity;
  if (daysUntilReorder < 0) return null; // Already below reorder level

  // Subtract buffer days for lead time
  const reorderDays = Math.max(0, daysUntilReorder - daysInAdvance);
  const date = new Date();
  date.setDate(date.getDate() + reorderDays);

  return date;
}

/**
 * Calculate optimal stock level based on velocity and variance
 * Uses: average daily usage + safety stock (2 std devs)
 */
export function calculateOptimalStock(transactions, productId, daysBack = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const relevant = transactions.filter(
    (t) =>
      t.product_id === productId &&
      t.type === 'out' &&
      new Date(t.created_date) > cutoffDate
  );

  if (relevant.length === 0) return null;

  // Group by day and sum quantities
  const dailyUsage = {};
  relevant.forEach((t) => {
    const day = new Date(t.created_date).toISOString().split('T')[0];
    dailyUsage[day] = (dailyUsage[day] || 0) + t.quantity;
  });

  const usage = Object.values(dailyUsage);
  if (usage.length === 0) return null;

  // Calculate mean and standard deviation
  const mean = usage.reduce((a, b) => a + b, 0) / usage.length;
  const variance =
    usage.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    usage.length;
  const stdDev = Math.sqrt(variance);

  // Optimal = average daily usage + 2 sigma (95% service level)
  const optimal = Math.ceil(mean + 2 * stdDev);

  return {
    avgDaily: Math.round(mean * 100) / 100,
    safetyStock: Math.round((2 * stdDev) * 100) / 100,
    optimalLevel: optimal,
  };
}

/**
 * Get stock health analysis
 */
export function analyzeStockHealth(stock, product, transactions) {
  const velocity = calculateVelocity(transactions, product.id);
  const optimal = calculateOptimalStock(transactions, product.id);
  const reorderDate = predictReorderDate(
    stock.quantity,
    velocity,
    product.reorder_level
  );

  let status = 'healthy';
  if (stock.quantity < product.reorder_level) {
    status = 'critical';
  } else if (stock.quantity < optimal?.optimalLevel * 0.5) {
    status = 'warning';
  }

  return {
    productId: product.id,
    productName: product.name,
    currentStock: stock.quantity,
    reorderLevel: product.reorder_level,
    dailyVelocity: Math.round(velocity * 100) / 100,
    optimalLevel: optimal?.optimalLevel,
    avgDaily: optimal?.avgDaily,
    safetyStock: optimal?.safetyStock,
    predictedReorderDate: reorderDate,
    daysUntilReorder: reorderDate
      ? Math.ceil((reorderDate - new Date()) / (1000 * 60 * 60 * 24))
      : null,
    status,
  };
}