'use client';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';

export function EquityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" hide />
        <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={v => `$${v}`} width={55} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`$${Number(v).toFixed(2)}`, 'Balance']}
        />
        <Area type="monotone" dataKey="balance" stroke="#3b82f6" fill="url(#balGrad)" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RegimeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={v => `${v}R`} />
        <YAxis type="category" dataKey="regime" tick={{ fill: '#8b949e', fontSize: 11 }} width={85} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`${Number(v).toFixed(3)}R`, 'Avg R']}
        />
        <ReferenceLine x={0} stroke="#30363d" />
        <Bar dataKey="avgR" radius={4}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.avgR > 0.5 ? '#3fb950' : entry.avgR > 0 ? '#d29922' : '#f85149'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DayOfWeekChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data}>
        <XAxis dataKey="day" tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={d => d.slice(0, 3)} />
        <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={v => `$${v}`} width={45} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`$${Number(v).toFixed(2)}`, 'Avg P/L']}
        />
        <ReferenceLine y={0} stroke="#30363d" />
        <Bar dataKey="avgPL" radius={4}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.avgPL >= 0 ? '#3fb950' : '#f85149'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}