'use client';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, PieChart, Pie, Legend
} from 'recharts';

export function DrawdownOverTimeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f85149" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f85149" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="tradeId" hide />
        <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={v => `${v}%`} width={52} domain={['auto', 0]} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`${Number(v).toFixed(2)}%`, 'Drawdown']}
          labelFormatter={l => `Trade: ${l}`}
        />
        <ReferenceLine y={0} stroke="#30363d" />
        <Area type="monotone" dataKey="drawdown" stroke="#f85149" fill="url(#ddGrad)" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DrawdownDistributionChart({ data }) {
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10}>{`${(percent * 100).toFixed(0)}%`}</text>;
  };
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
            dataKey="count" labelLine={false} label={renderLabel}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <text x={80} y={75} textAnchor="middle" fill="#e6edf3" fontSize={16} fontWeight="bold">{total}</text>
          <text x={80} y={92} textAnchor="middle" fill="#6e7681" fontSize={10}>Drawdowns</text>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }}></span>
              <span className="text-[#8b949e]">{d.label}</span>
            </div>
            <span className="text-white font-medium">{d.count} ({total > 0 ? ((d.count/total)*100).toFixed(1) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyPLVolatilityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data}>
        <XAxis dataKey="date" hide />
        <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={v => `$${v.toFixed(0)}`} width={48} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`$${Number(v).toFixed(2)}`, 'Daily P/L']}
          labelFormatter={l => l}
        />
        <ReferenceLine y={0} stroke="#30363d" />
        <Bar dataKey="pl" radius={2}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pl >= 0 ? '#3fb950' : '#f85149'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskPerCampaignChart({ data, total }) {
  const pct = data.map(d => ({ ...d, pct: total > 0 ? (d.count / total) * 100 : 0 }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={pct}>
        <XAxis dataKey="label" tick={{ fill: '#6e7681', fontSize: 10 }} />
        <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} width={38} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`${Number(v).toFixed(1)}%`, 'Frequency']}
        />
        <Bar dataKey="pct" fill="#8b5cf6" radius={3}>
          {pct.map((entry, i) => (
            <Cell key={i} fill={entry.label.includes('-') ? '#f85149' : '#8b5cf6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReturnRiskDonutChart({ data, avgR }) {
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9}>{`${(percent * 100).toFixed(0)}%`}</text>;
  };
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
            dataKey="count" labelLine={false} label={renderLabel}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <text x={80} y={72} textAnchor="middle" fill="#6e7681" fontSize={10}>Average</text>
          <text x={80} y={88} textAnchor="middle" fill="#e6edf3" fontSize={15} fontWeight="bold">{avgR.toFixed(2)}R</text>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }}></span>
              <span className="text-[#8b949e]">{d.label}</span>
            </div>
            <span className="text-white">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConsecutiveWLChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barGap={2}>
        <XAxis dataKey="month" tick={{ fill: '#6e7681', fontSize: 10 }} />
        <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={v => Math.abs(v)} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={(v, name) => [Math.abs(v), name === 'wins' ? 'Wins' : 'Losses']}
        />
        <ReferenceLine y={0} stroke="#30363d" />
        <Bar dataKey="wins" fill="#3fb950" radius={[3,3,0,0]} />
        <Bar dataKey="losses" fill="#f85149" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EdgeRetentionChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <XAxis dataKey="setupId" tick={{ fill: '#6e7681', fontSize: 10 }} />
        <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={v => `${v}R`} width={45} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`${Number(v).toFixed(2)}R`, '5-Campaign Avg R']}
          labelFormatter={l => `Campaign ${l}`}
        />
        <ReferenceLine y={0} stroke="#30363d" strokeDasharray="4 3" />
        <ReferenceLine y={1} stroke="#3fb950" strokeDasharray="4 3" strokeOpacity={0.4} />
        <Line type="monotone" dataKey="rollingAvgR" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}