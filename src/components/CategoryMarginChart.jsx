import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CategoryMarginChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 h-80 flex items-center justify-center text-foreground/60">
        No category margin data available
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Average Margin by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" stroke="var(--foreground)" fontSize={12} />
          <YAxis dataKey="category" type="category" stroke="var(--foreground)" fontSize={12} width={80} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}
            formatter={(value) => `${value.toFixed(1)}%`}
          />
          <Legend />
          <Bar 
            dataKey="margin" 
            fill="hsl(var(--primary))" 
            radius={[0, 8, 8, 0]}
            name="Margin %"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}