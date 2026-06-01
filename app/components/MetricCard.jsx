export default function MetricCard({ label, value, sub, color = 'white', prefix = '', suffix = '' }) {
  const colors = {
    white: 'text-white',
    green: 'text-emerald-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-1">
      <span className="text-[11px] text-[#6e7681] uppercase tracking-wider font-medium">{label}</span>
      <span className={`text-2xl font-bold ${colors[color]}`}>
        {prefix}{value}{suffix}
      </span>
      {sub && <span className="text-[11px] text-[#6e7681]">{sub}</span>}
    </div>
  );
}