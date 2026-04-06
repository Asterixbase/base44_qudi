import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminTopProducts({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 h-80 flex items-center justify-center">
        <p className="text-foreground/60">No product data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-semibold text-foreground mb-4">Top 10 Products (By Sales Volume)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'var(--foreground)', fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis tick={{ fill: 'var(--foreground)', fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--card)',
              border: `1px solid var(--border)`,
              borderRadius: '6px'
            }}
            formatter={(value) => `${value} units`}
          />
          <Legend />
          <Bar 
            dataKey="quantity" 
            fill="hsl(var(--accent))" 
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}