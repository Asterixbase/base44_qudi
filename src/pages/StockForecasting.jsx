import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StockForecastDashboard from '@/components/StockForecastDashboard';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function StockForecasting() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <OfflineSyncBanner />

      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-xl">←</button>
          <h1 className="text-2xl font-bold">AI Stock Forecasting</h1>
        </div>
        <p className="text-sm text-primary-light ml-12">Predict low stock and automate reorders</p>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900">
            🤖 This dashboard uses AI to analyze your 30-day sales trends and predict when items will reach critical stock levels. Forecasts are updated daily.
          </p>
        </div>

        <StockForecastDashboard />
      </div>
    </div>
  );
}