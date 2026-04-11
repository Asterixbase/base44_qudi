/* eslint-disable */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const transactions = await base44.asServiceRole.entities.Transaction.list('-created_date', 1000);
    const products = await base44.asServiceRole.entities.Product.list();

    if (!transactions || transactions.length === 0) {
      return Response.json({ error: 'No transactions found' }, { status: 404 });
    }

    // Build CSV header
    const headers = ['Transaction ID', 'Date', 'Product ID', 'Product Name', 'Type', 'Quantity', 'Reference', 'Notes', 'Sync Status', 'Created By'];

    // Build CSV rows
    const rows = transactions.map(tx => {
      const product = products.find(p => p.id === tx.product_id);
      const date = new Date(tx.created_date).toLocaleDateString('en-GB');
      return [
        tx.id,
        date,
        tx.product_id,
        tx.product_name,
        tx.type,
        tx.quantity,
        tx.reference || '',
        tx.notes || '',
        tx.sync_status || 'unknown',
        tx.created_by || '',
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

    const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csvContent, {
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