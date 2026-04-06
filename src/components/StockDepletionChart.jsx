import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StockDepletionChart({ data }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Stock Depletion Rate</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorDepletion" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--foreground))" style={{ fontSize: '12px' }} />
          <YAxis stroke="hsl(var(--foreground))" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            formatter={(value) => [value.toFixed(1) + '%', 'Depletion Rate']}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="depletionRate" 
            stroke="hsl(var(--destructive))" 
            fillOpacity={1} 
            fill="url(#colorDepletion)"
            name="Depletion Rate %"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}