'use client';
import { useState } from 'react';
import { Filter, X, Calendar } from 'lucide-react';

export default function FilterBar({ filters, onChange, summary }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(
    filters.reduce((acc, f) => { acc[f.key] = f.defaultValue; return acc; }, {})
  );

  function update(key, value) {
    const next = { ...values, [key]: value };
    setValues(next);
    onChange(next);
  }

  function reset() {
    const defaults = filters.reduce((acc, f) => { acc[f.key] = f.defaultValue; return acc; }, {});
    setValues(defaults);
    onChange(defaults);
    setOpen(false);
  }

  const hasActiveFilters = filters.some(f => {
    const v = values[f.key];
    if (f.type === 'daterange') return v?.from || v?.to;
    return v && v !== f.defaultValue;
  });

  return (
    <div className="relative">
      {/* Collapsed pill */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] transition-colors ${
          hasActiveFilters
            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
            : 'bg-[#161b22] border-[#30363d] text-[#6e7681] hover:text-white hover:border-[#6e7681]'
        }`}
      >
        <Filter size={11} />
        <span>{summary}</span>
        {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />}
      </button>

      {/* Expanded filter panel */}
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-[#161b22] border border-[#30363d] rounded-xl p-4 shadow-xl min-w-[340px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-white font-medium">Filter Data</span>
            <button onClick={() => setOpen(false)}>
              <X size={14} className="text-[#6e7681] hover:text-white" />
            </button>
          </div>
          <div className="space-y-3">
            {filters.map(f => (
              <div key={f.key}>
                <label className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-1.5 block">{f.label}</label>
                {f.type === 'daterange' && (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Calendar size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#6e7681]" />
                      <input
                        type="date"
                        value={values[f.key]?.from || ''}
                        onChange={e => update(f.key, { ...values[f.key], from: e.target.value })}
                        className="w-full bg-[#0d1117] border border-[#30363d] text-white text-[11px] rounded-lg pl-7 pr-2 py-1.5 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <span className="text-[#6e7681] text-[10px]">to</span>
                    <div className="relative flex-1">
                      <Calendar size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#6e7681]" />
                      <input
                        type="date"
                        value={values[f.key]?.to || ''}
                        onChange={e => update(f.key, { ...values[f.key], to: e.target.value })}
                        className="w-full bg-[#0d1117] border border-[#30363d] text-white text-[11px] rounded-lg pl-7 pr-2 py-1.5 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
                {f.type === 'select' && (
                  <select
                    value={values[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white text-[11px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    {f.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4 pt-3 border-t border-[#30363d]">
            <button
              onClick={reset}
              className="text-[11px] text-[#6e7681] hover:text-white border border-[#30363d] rounded-lg px-3 py-1.5 hover:border-[#6e7681] transition-colors"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}