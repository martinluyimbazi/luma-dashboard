'use client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, ReferenceLine, Legend
} from 'recharts';

export function CumulativeRChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <XAxis dataKey="setupId" tick={{ fill: '#6e7681', fontSize: 10 }} label={{ value: 'Campaign', position: 'insideBottom', offset: -2, fill: '#6e7681', fontSize: 10 }} />
        <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={v => `${v}R`} width={45} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`${Number(v).toFixed(2)}R`, 'Cumulative R']}
        />
        <ReferenceLine y={0} stroke="#30363d" />
        <Line type="monotone" dataKey="cumulativeR" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="runningPeak" stroke="#d29922" strokeWidth={1} dot={false} strokeDasharray="4 3" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RDistributionChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis dataKey="label" tick={{ fill: '#6e7681', fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
        <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [v, 'Campaigns']}
        />
        <Bar dataKey="count" radius={4}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.isWin ? '#3fb950' : '#f85149'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AttemptsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data}>
        <XAxis dataKey="label" tick={{ fill: '#6e7681', fontSize: 10 }} />
        <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [v, 'Campaigns']}
        />
        <Bar dataKey="count" radius={4} fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExitReasonsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" tick={{ fill: '#6e7681', fontSize: 10 }} allowDecimals={false} />
        <YAxis type="category" dataKey="reason" tick={{ fill: '#8b949e', fontSize: 10 }} width={130} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [v, 'Campaigns']}
        />
        <Bar dataKey="count" radius={4} fill="#8b5cf6" />
      </BarChart>
    </ResponsiveContainer>
  );
}