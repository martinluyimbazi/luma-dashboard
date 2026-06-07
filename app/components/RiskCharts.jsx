'use client';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, CartesianGrid, PieChart, Pie
} from 'recharts';

export function DrawdownOverTimeChart({ data, maxDD }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f85149" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f85149" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="0" stroke="#21262d" vertical={false} strokeWidth={0.5} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6e7681', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={d => {
            if (!d) return '';
            const parts = String(d).split(' ');
            if (parts.length >= 3) return `${parts[1]} ${parts[2].slice(0,3)}`;
            return d;
          }}
          interval={Math.floor(data.length / 8)}
        />
        <YAxis
          tick={{ fill: '#6e7681', fontSize: 10 }}
          tickFormatter={v => `${v}%`}
          width={52}
          axisLine={false}
          tickLine={false}
          domain={['auto', 0]}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`${Number(v).toFixed(2)}%`, 'Drawdown']}
          labelFormatter={l => l}
        />
        <ReferenceLine y={maxDD} stroke="#f85149" strokeDasharray="4 3" strokeOpacity={0.6}
          label={{ value: `${maxDD.toFixed(1)}%`, fill: '#f85149', fontSize: 9, position: 'insideBottomRight' }} />
        <ReferenceLine y={0} stroke="#30363d" />
        <Area type="monotone" dataKey="drawdown" stroke="#f85149" fill="url(#ddGrad)" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DailyPLChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke="#21262d" vertical={false} strokeWidth={0.5} />
        <XAxis dataKey="date" hide />
        <YAxis
          tick={{ fill: '#6e7681', fontSize: 10 }}
          tickFormatter={v => `$${v}`}
          width={50}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`$${Number(v).toFixed(2)}`, 'Daily P/L']}
          labelFormatter={l => l}
        />
        <ReferenceLine y={0} stroke="#30363d" />
        <Bar dataKey="pl" radius={0}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pl >= 0 ? '#50A2FF' : '#f85149'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OutcomeProfileChart({ data, avgR }) {
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
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
            dataKey="count" labelLine={false} label={renderLabel} strokeWidth={0}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
          </Pie>
          <text x={80} y={72} textAnchor="middle" fill="#6e7681" fontSize={9}>Average</text>
          <text x={80} y={86} textAnchor="middle" fill="#e6edf3" fontSize={14} fontWeight="bold">{avgR.toFixed(2)}R</text>
          <text x={80} y={99} textAnchor="middle" fill="#6e7681" fontSize={9}>Per Campaign</text>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-[#8b949e]">{d.label}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-white font-medium">{d.count}</span>
              <span className="text-[#6e7681]">({d.pct}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RiskConcentrationChart({ data }) {
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-[#8b949e]">{item.label}</span>
            <span className={`font-medium ${item.color}`}>{item.pct}% of total loss</span>
          </div>
          <div className="w-full bg-[#21262d] rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.barColor }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EdgeRetentionChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="rollingAvgR" stroke="#50A2FF" strokeWidth={1.5} dot={false} />
        <ReferenceLine y={0} stroke="#30363d" strokeDasharray="3 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}