'use client';
import { useState } from 'react';
import {
  Target, ShieldAlert, Trophy, Zap, Activity,
  AlertTriangle, CheckCircle, BarChart2, TrendingUp
} from 'lucide-react';
import FilterBar from './FilterBar';
import { EquityChart, RegimeChart } from './ExecutiveCharts';
import { filterEquityCurve, filterCampaigns, computeMetrics } from '../lib/filters';

const FILTERS = [
  {
    key: 'dateRange',
    label: 'Date range',
    type: 'daterange',
    defaultValue: { from: '', to: '' },
  },
];

function ScoreCard({ icon: Icon, label, status }) {
  const ok = status === 'good';
  const warn = status === 'attention';
  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-[#0d1117] rounded-xl border border-[#30363d]">
      <div className={`rounded-full p-2 ${ok ? 'bg-emerald-400/10' : warn ? 'bg-amber-400/10' : 'bg-red-400/10'}`}>
        <Icon size={18} className={ok ? 'text-emerald-400' : warn ? 'text-amber-400' : 'text-red-400'} />
      </div>
      <div className="text-[11px] text-[#8b949e] text-center">{label}</div>
      <div className={`text-[11px] font-semibold ${ok ? 'text-emerald-400' : warn ? 'text-amber-400' : 'text-red-400'}`}>
        {ok ? 'Good' : warn ? 'Needs Attention' : 'Poor'}
      </div>
    </div>
  );
}

export default function ExecutiveDashboardClient({ data }) {
  const [filters, setFilters] = useState({ dateRange: { from: '', to: '' } });

  const filteredEquity    = filterEquityCurve(data.equityCurve, filters);
  const filteredCampaigns = filterCampaigns(data.campaigns, filters);
  const metrics           = computeMetrics(filteredCampaigns, filteredEquity);

  const equityData = filteredEquity
    .filter(r => r.closedBalance > 0)
    .map(r => ({ date: r.date || r.tradeId, balance: r.closedBalance }));

  const filteredRegimeData = data.regimeData;

  const campaignWL = filteredCampaigns.map(c => c.totalR > 0 ? 'W' : 'L');
  let currentStreak = 0;
  for (let i = campaignWL.length - 1; i >= 0; i--) {
    if (campaignWL[i] === 'L') currentStreak++;
    else break;
  }
  let maxStreak = 0, running = 0;
  campaignWL.forEach(s => {
    if (s === 'L') { running++; maxStreak = Math.max(maxStreak, running); }
    else running = 0;
  });

  const startingBalance = data.startingBalance;
  const roi = metrics.currentBalance > 0
    ? ((metrics.currentBalance - startingBalance) / startingBalance) * 100 : 0;
  const netGain = metrics.currentBalance - startingBalance;
  const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const profitFactor = (() => {
    const tw = filteredCampaigns.filter(c => c.totalR > 0).reduce((s, c) => s + c.totalR, 0);
    const tl = Math.abs(filteredCampaigns.filter(c => c.totalR < 0).reduce((s, c) => s + c.totalR, 0));
    return tl > 0 ? tw / tl : 0;
  })();

  const estCampaigns = data.estCampaignsToGoal ||
    (data.avgGrowthPerCampaign > 0 && metrics.currentBalance > 0
      ? Math.ceil(Math.log(data.quarterlyGoal / metrics.currentBalance) / Math.log(1 + data.avgGrowthPerCampaign))
      : null);

  const scorecards = [
    { icon: TrendingUp,  label: 'Profitability', status: roi > 0 ? 'good' : 'poor' },
    { icon: Zap,         label: 'Expectancy',    status: metrics.avgWinR + metrics.avgLossR > 0 ? 'good' : 'poor' },
    { icon: ShieldAlert, label: 'Risk Control',  status: currentStreak < data.alertThreshold && metrics.maxDrawdown > -50 ? 'good' : 'attention' },
    { icon: BarChart2,   label: 'Consistency',   status: profitFactor >= 1.5 ? 'good' : profitFactor >= 1 ? 'attention' : 'poor' },
    { icon: Target,      label: 'Goal Progress', status: data.progressToGoal >= 50 ? 'good' : 'attention' },
  ];

  const { from, to } = filters.dateRange || {};
  const filterSummary = from || to
    ? `${from || '...'} → ${to || '...'}`
    : `${filteredCampaigns.length} campaigns · All time`;

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Executive Dashboard</h1>
          <p className="text-[11px] text-[#6e7681] mt-0.5">
            {filteredCampaigns.length} campaigns · {filteredEquity.length} trades
          </p>
        </div>
        <FilterBar filters={FILTERS} onChange={setFilters} summary={filterSummary} />
      </div>

      {/* TIER 1 — Hero Row */}
      <div className="grid grid-cols-12 gap-4">

        {/* Left — single card: Balance + Return + Expectancy + Drawdown */}
        <div className="col-span-4 bg-[#161b22] border border-[#30363d] rounded-xl p-6 flex flex-col justify-between" style={{ minHeight: '280px' }}>

          {/* Balance — hero metric */}
          <div>
            <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-2">Balance</p>
            <div className="text-[50px] font-bold text-white tracking-tight leading-none">
              ${fmt(metrics.currentBalance)}
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-[25px] font-bold text-emerald-400">+{roi.toFixed(2)}%</span>
              <span className="text-[12px] text-[#6e7681]">from ${fmt(startingBalance)}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#30363d] my-4" />

          {/* Expectancy + Current Drawdown */}
          <div className="grid grid-cols-2 divide-x divide-[#30363d]">
            <div className="pr-4">
              <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-1">Realized Expectancy</p>
              <div className="text-[25px] font-bold text-blue-400">
                +{data.avgReturnPerCampaign.toFixed(2)}R
              </div>
              <p className="text-[10px] text-[#6e7681] mt-0.5">per campaign</p>
            </div>
            <div className="pl-4">
              <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-1">Current Drawdown</p>
              <div className="text-[25px] font-bold text-red-400">
                {data.currentDrawdown.toFixed(2)}%
              </div>
              <p className="text-[10px] text-[#6e7681] mt-0.5">from peak</p>
            </div>
          </div>
        </div>

        {/* Right — Equity curve */}
        <div className="col-span-8 bg-[#161b22] border border-[#30363d] rounded-xl p-4" style={{ minHeight: '280px' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-[#6e7681] uppercase tracking-wider">Capital Growth (Equity Curve)</p>
            <div className="flex gap-4">
              {[
                { label: 'Start',   value: `$${fmt(startingBalance)}`,         color: 'text-[#6e7681]' },
                { label: 'Current', value: `$${fmt(metrics.currentBalance)}`,  color: 'text-blue-400'  },
                { label: 'Net',     value: `+${roi.toFixed(2)}%`,              color: 'text-emerald-400' },
              ].map((s, i) => (
                <div key={i} className="text-right">
                  <div className="text-[9px] text-[#6e7681]">{s.label}</div>
                  <div className={`text-[12px] font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: '230px' }}>
            <EquityChart data={equityData} />
          </div>
        </div>
      </div>

      {/* TIER 2 — Edge Analysis + Risk Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="md:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-5">Edge Analysis (Performance Drivers)</p>
          <div className="grid grid-cols-2 gap-5 mb-5 pb-5 border-b border-[#30363d]">
            <div>
              <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-1">Campaign Win Rate</p>
              <div className="text-[25px] font-bold text-blue-400 mb-1">{metrics.campaignWinRate.toFixed(1)}%</div>
              <p className="text-[11px] text-[#6e7681]">{metrics.wonCampaigns} won · {metrics.lostCampaigns} lost · {filteredCampaigns.length} total</p>
            </div>
            <div className="border-l border-[#30363d] pl-5">
              <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-1">Payoff Ratio</p>
              <div className="text-[25px] font-bold text-amber-400 mb-1">{metrics.payoffRatio.toFixed(2)}×</div>
              <p className="text-[11px] text-[#6e7681]">Avg win {metrics.avgWinR.toFixed(2)}R · Avg loss {metrics.avgLossR.toFixed(2)}R</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-3">Regime Edge (Avg R)</p>
            <RegimeChart data={filteredRegimeData} />
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-5">Risk Health</p>
          <div className="space-y-5">
            <div>
              <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-1">Max All-Time Drawdown</p>
              <div className="text-[25px] font-bold text-red-400">{metrics.maxDrawdown.toFixed(2)}%</div>
              <p className="text-[11px] text-[#6e7681]">Peak equity: ${fmt(data.peakEquity)}</p>
            </div>
            <div className="border-t border-[#30363d] pt-4">
              <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-1">Current Consecutive Losing Campaigns</p>
              <div className={`text-[25px] font-bold ${currentStreak >= data.alertThreshold ? 'text-red-400' : 'text-emerald-400'}`}>
                {currentStreak}
              </div>
              <p className="text-[11px] text-[#6e7681]">consecutive losing campaigns</p>
            </div>
            <div className="border-t border-[#30363d] pt-4 grid grid-cols-2 gap-3">
              <div className="bg-[#0d1117] rounded-lg p-3">
                <p className="text-[10px] text-[#6e7681] mb-1">Worst Streak</p>
                <div className="text-[25px] font-bold text-red-400">{maxStreak}</div>
                <p className="text-[10px] text-[#6e7681]">campaigns</p>
              </div>
              <div className="bg-[#0d1117] rounded-lg p-3">
                <p className="text-[10px] text-[#6e7681] mb-1">Alert Threshold</p>
                <div className="text-[25px] font-bold text-amber-400">{data.alertThreshold}</div>
                <p className="text-[10px] text-[#6e7681]">campaigns</p>
              </div>
            </div>
            <div className={`rounded-lg px-3 py-2 text-[11px] font-medium flex items-center gap-2 ${
              currentStreak >= data.alertThreshold
                ? 'bg-red-900/30 text-red-400 border border-red-800'
                : 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
            }`}>
              {currentStreak >= data.alertThreshold ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
              {currentStreak >= data.alertThreshold
                ? `Warning: ${currentStreak} consecutive losses`
                : `Within normal range`}
            </div>
          </div>
        </div>

      </div>

      {/* TIER 3 — Business Scorecard + Goal Center */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-1">Business Scorecard</p>
          <p className="text-[10px] text-[#6e7681] mb-4">Executive interpretation of key dimensions</p>
          <div className="grid grid-cols-5 gap-3">
            {scorecards.map((s, i) => <ScoreCard key={i} {...s} />)}
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Goal Center (Quarterly)</p>
          <div className="text-[25px] font-bold text-blue-400 mb-0.5">
            ${fmt(metrics.currentBalance)}
          </div>
          <p className="text-[11px] text-[#6e7681] mb-3">of ${data.quarterlyGoal.toLocaleString()}</p>
          <div className="w-full bg-[#21262d] rounded-full h-2 mb-1 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full"
              style={{ width: `${Math.min(data.progressToGoal, 100)}%` }}
            />
          </div>
          <div className="text-right text-[11px] text-blue-400 mb-4">
            {data.progressToGoal.toFixed(1)}%
          </div>
          <div className="border-t border-[#30363d] pt-4 flex justify-between items-start">
            <div>
              <p className="text-[10px] text-[#6e7681]">Remaining</p>
              <div className="text-[18px] font-bold text-white">
                ${fmt(Math.max(0, data.quarterlyGoal - metrics.currentBalance))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#6e7681]">Est. campaigns to goal</p>
              <div className="text-[18px] font-bold text-amber-400">
                {metrics.currentBalance >= data.quarterlyGoal
                  ? '🎯 Goal Reached!'
                  : estCampaigns ? `~${estCampaigns}` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}