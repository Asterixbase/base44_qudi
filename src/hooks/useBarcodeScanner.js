import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export const useBarcodeScanner = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchProduct = useCallback(async (barcode) => {
    setLoading(true);
    setError(null);
    try {
      // Try to find product by barcode
      const products = await base44.entities.Product.filter({ barcode });
      if (products.length === 0) {
        setError('Product not found');
        return null;
      }
      return products[0];
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStock = useCallback(async (productId) => {
    try {
      const stock = await base44.entities.Stock.filter({ product_id: productId });
      return stock.length > 0 ? stock[0] : null;
    } catch (err) {
      console.error('Stock fetch error:', err);
      return null;
    }
  }, []);

  return {
    searchProduct,
    getStock,
    loading,
    error,
  };
};