import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RevenueChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 h-80 flex items-center justify-center text-foreground/60">
        No revenue data available
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" stroke="var(--foreground)" fontSize={12} />
          <YAxis stroke="var(--foreground)" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}
            formatter={(value) => `₵${value.toFixed(2)}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}