'use client';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
  CartesianGrid
} from 'recharts';

export function EquityChart({ data }) {
  const months = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
  };

  function parseTradeDate(dateStr) {
    if (!dateStr) return null;
    const parts = String(dateStr).trim().split(' ');
    if (parts.length < 4) return null;
    const day = parseInt(parts[1]);
    const month = months[parts[2]];
    const year = parseInt(parts[3]);
    if (isNaN(day) || month === undefined || isNaN(year)) return null;
    return new Date(year, month, day);
  }

  function formatTickDate(date) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  }

  // Generate evenly spaced weekly ticks from first to last date
  const weeklyTicks = [];
  const weeklyTickLabels = {};

  if (data.length > 0) {
    const firstDate = parseTradeDate(data[0].date);
    const lastDate  = parseTradeDate(data[data.length - 1].date);

    if (firstDate && lastDate) {
      let current = new Date(firstDate);
      while (current <= lastDate) {
        const label = formatTickDate(current);
        // Find the closest data point to this date
        let closest = data[0];
        let closestDiff = Infinity;
        data.forEach(d => {
          const dd = parseTradeDate(d.date);
          if (dd) {
            const diff = Math.abs(dd - current);
            if (diff < closestDiff) { closestDiff = diff; closest = d; }
          }
        });
        if (!weeklyTicks.includes(closest.date)) {
          weeklyTicks.push(closest.date);
          weeklyTickLabels[closest.date] = label;
        }
        current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }
  }


  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="0"
          stroke="#1a1a1a"
          vertical={false}
          strokeWidth={0.5}
        />
        <XAxis
         dataKey="date"
         tick={false}
         axisLine={false}
         tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6e7681', fontSize: 10 }}
          tickFormatter={v => `$${v}`}
          width={58}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#0A0A0A', border: '1px solid #292929', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Balance']}
          labelFormatter={l => l}
        />
        
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#3b82f6"
          fill="url(#balGrad)"
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RegimeChart({ data }) {
  const hasNegative = data.some(d => d.avgR < 0);
  const maxVal = Math.max(...data.map(d => d.avgR), 0.1);
  const minVal = hasNegative ? Math.min(...data.map(d => d.avgR)) * 1.2 : 0;
  const totalR = data.reduce((s, d) => s + d.totalR, 0);
  const totalTrades = data.reduce((s, d) => s + d.trades, 0);
  const expansion = data.find(d => d.regime === 'Expansion');

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }} style={{ cursor: 'default' }}>
            <XAxis
              type="number"
              tick={{ fill: '#6e7681', fontSize: 10 }}
              tickFormatter={v => `${v.toFixed(1)}R`}
              domain={[minVal, maxVal * 1.2]}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="regime"
              tick={{ fill: '#8b949e', fontSize: 11 }}
              width={85}
              tickLine={false}
              axisLine={false}
            />
            <CartesianGrid strokeDasharray="0" stroke="#1a1a1a" horizontal={false} strokeWidth={0.5} />
            <Tooltip
              cursor={{ fill: '#141414' }}
              contentStyle={{ background: '#000000', border: '1px solid #292929', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#ffffff' }}
              itemStyle={{ color: '#2F6BFF' }}
              formatter={v => [`${Number(v).toFixed(2)}R`, 'Avg R']}
            />
            <ReferenceLine x={0} stroke="#292929" strokeWidth={1} />
            <Bar dataKey="avgR" radius={0} barSize={18} background={{ fill: 'transparent' }}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.avgR > 0.5 ? '#2F6BFF' : entry.avgR > 0 ? '#d29922' : '#f85149'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1 pt-2 border-t border-[#1a1a1a] mt-2">
        <div className="flex justify-between text-[10px]">
          <span className="text-[#6e7681]">Expansion share of total R</span>
          <span className="text-emerald-400 font-medium">
            {expansion && totalR > 0
              ? `${((expansion.totalR / totalR) * 100).toFixed(1)}%`
              : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-[#6e7681]">Only {expansion?.trades || 0} of {totalTrades} trades</span>
          <span className="text-amber-400 font-medium">
            {totalTrades > 0 && expansion
              ? `${((expansion.trades / totalTrades) * 100).toFixed(1)}% of activity`
              : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DayOfWeekChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ left: 0, right: 10 }}>
        <XAxis
          dataKey="day"
          tick={{ fill: '#6e7681', fontSize: 10 }}
          tickFormatter={d => d.slice(0, 3)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6e7681', fontSize: 10 }}
          tickFormatter={v => `$${v}`}
          width={40}
          axisLine={false}
          tickLine={false}
        />
        <CartesianGrid strokeDasharray="0" stroke="#1a1a1a" vertical={false} strokeWidth={0.5} />
        <Tooltip
          contentStyle={{ background: '#0A0A0A', border: '1px solid #292929', borderRadius: 8, fontSize: 11 }}
          formatter={v => [`$${Number(v).toFixed(2)}`, 'Avg P/L']}
        />
        <ReferenceLine y={0} stroke="#292929" />
        <Bar dataKey="avgPL" radius={4}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.avgPL >= 0 ? '#3fb950' : '#f85149'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}