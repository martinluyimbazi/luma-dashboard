'use client';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
  CartesianGrid, PieChart, Pie
} from 'recharts';

export function CumulativeRChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="0" stroke="#1a1a1a" vertical={false} strokeWidth={0.5} />
        <XAxis dataKey="setupId" hide />
        <YAxis
          tick={{ fill: '#6e7681', fontSize: 10 }}
          tickFormatter={v => `${v}R`}
          width={45}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#0A0A0A', border: '1px solid #292929', borderRadius: 8, fontSize: 11 }}
          formatter={(v, name) => [`${Number(v).toFixed(2)}R`, name === 'Running R' ? 'Running R' : 'Peak R']}
          labelFormatter={l => `Campaign ${l}`}
        />
        <ReferenceLine y={0} stroke="#292929" />
        <Line type="monotone" dataKey="cumulativeR" stroke="#50A2FF" strokeWidth={2} dot={false} name="Running R" />
        <Line type="monotone" dataKey="runningPeak" stroke="#d29922" strokeWidth={1} dot={false} strokeDasharray="4 3" name="Peak R" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RDistributionChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
        <CartesianGrid strokeDasharray="0" stroke="#1a1a1a" vertical={false} strokeWidth={0.5} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#6e7681', fontSize: 9 }}
          angle={-35}
          textAnchor="end"
          interval={0}
          axisLine={false}
          tickLine={false}
          label={{ value: 'R Band', position: 'insideBottom', offset: -40, fill: '#6e7681', fontSize: 10 }}
        />
        <YAxis
          tick={{ fill: '#6e7681', fontSize: 10 }}
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 10, fill: '#6e7681', fontSize: 10 }}
        />
        <Tooltip
          cursor={{ fill: '#141414' }}
          contentStyle={{ background: '#0A0A0A', border: '1px solid #292929', borderRadius: 8, fontSize: 11 }}
          itemStyle={{ color: '#2F6BFF' }}
          formatter={v => [v, 'Campaigns']}
        />
        <Bar dataKey="count" radius={0}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.isWin ? '#2F6BFF' : '#F92B2B'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReturnAttributionChart({ data, totalR }) {
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={38}
            outerRadius={65}
            dataKey="count"
            labelLine={false}
            label={renderLabel}
            strokeWidth={0}
          >
            {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
          </Pie>
          <text x={70} y={65} textAnchor="middle" fill="#6e7681" fontSize={9}>Total R</text>
          <text x={70} y={80} textAnchor="middle" fill="#e6edf3" fontSize={13} fontWeight="bold">
            +{totalR.toFixed(2)}R
          </text>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-[#8b949e]">{d.label}</span>
            </div>
            <div className="text-right">
              <span className={`font-medium ${d.totalR >= 0 ? 'text-[#50A2FF]' : 'text-red-400'}`}>
                {d.totalR >= 0 ? '+' : ''}{d.totalR.toFixed(1)}R
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}