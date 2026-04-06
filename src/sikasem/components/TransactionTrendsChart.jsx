import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TransactionTrendsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
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
          cursor={{ strokeDasharray: '3 3' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="inbound" 
          stroke="hsl(var(--primary))" 
          name="Stock In"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="outbound" 
          stroke="hsl(var(--accent))" 
          name="Stock Out"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--accent))', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}