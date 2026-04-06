import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminRevenueChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 h-80 flex items-center justify-center">
        <p className="text-foreground/60">No revenue data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-semibold text-foreground mb-4">Daily Revenue (Last 30 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'var(--foreground)', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fill: 'var(--foreground)', fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--card)',
              border: `1px solid var(--border)`,
              borderRadius: '6px'
            }}
            formatter={(value) => `GHS ${value.toFixed(2)}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}