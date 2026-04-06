import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StockByCategoryChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="category" 
          angle={-45} 
          textAnchor="end" 
          height={80}
          tick={{ fontSize: 12 }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem'
          }}
          cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
        />
        <Legend />
        <Bar dataKey="inStock" fill="hsl(var(--primary))" name="In Stock" />
        <Bar dataKey="lowStock" fill="hsl(var(--accent))" name="Low Stock" />
        <Bar dataKey="outOfStock" fill="hsl(var(--destructive))" name="Out of Stock" />
      </BarChart>
    </ResponsiveContainer>
  );
}