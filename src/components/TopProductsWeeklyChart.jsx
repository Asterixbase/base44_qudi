import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TopProductsWeeklyChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 h-80 flex items-center justify-center text-foreground/60">
        No product sales data available
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Top Selling Products (This Week)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" stroke="var(--foreground)" fontSize={12} angle={-15} textAnchor="end" height={80} />
          <YAxis stroke="var(--foreground)" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}
            formatter={(value) => `${value} units`}
          />
          <Legend />
          <Bar 
            dataKey="quantity" 
            fill="hsl(var(--accent))" 
            radius={[8, 8, 0, 0]}
            name="Units Sold"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}