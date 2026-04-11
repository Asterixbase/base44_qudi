/* eslint-disable */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const stock = await base44.asServiceRole.entities.Stock.list();
    const products = await base44.asServiceRole.entities.Product.list();

    if (!stock || stock.length === 0) {
      return Response.json({ error: 'No inventory data found' }, { status: 404 });
    }

    // Build CSV header
    const headers = ['Product ID', 'Product SKU', 'Product Name', 'Category', 'Unit Price (GHS)', 'Current Quantity', 'Reorder Level', 'Status', 'Location', 'Last Counted', 'Expiry Date', 'Stock Value (GHS)'];

    // Build CSV rows
    const rows = stock.map(s => {
      const product = products.find(p => p.id === s.product_id);
      const stockValue = (product?.unit_price || 0) * s.quantity;
      const lastCounted = s.last_counted ? new Date(s.last_counted).toLocaleDateString('en-GB') : '';
      const expiryDate = s.expiry_date ? new Date(s.expiry_date).toLocaleDateString('en-GB') : '';

      return [
        s.product_id,
        s.product_sku,
        s.product_name,
        product?.category || '',
        product?.unit_price || 0,
        s.quantity,
        s.reorder_level || product?.reorder_level || 0,
        s.status,
        s.location,
        lastCounted,
        expiryDate,
        stockValue.toFixed(2),
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          const str = String(cell);
          // Escape quotes and wrap in quotes if contains comma or quote
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ),
    ].join('\n');

    // Add summary section
    const totalValue = rows.reduce((sum, row) => sum + parseFloat(row[11]), 0);
    const summarySection = `\n\nSummary\nTotal Stock Value (GHS),${totalValue.toFixed(2)}\nTotal Items in Stock,${rows.reduce((sum, row) => sum + parseFloat(row[5]), 0)}\nLow Stock Items,${rows.filter(row => row[7] === 'low_stock').length}\nOut of Stock Items,${rows.filter(row => row[7] === 'out_of_stock').length}`;

    const finalCSV = csvContent + summarySection;
    const filename = `inventory_${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(finalCSV, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});