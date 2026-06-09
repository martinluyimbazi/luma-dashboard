import { getDashboardData } from '../lib/sheets';
import {
  DrawdownOverTimeChart,
  DailyPLChart,
  OutcomeProfileChart,
  RiskConcentrationChart,
  EdgeRetentionChart,
} from '../components/RiskCharts';
import {
  ShieldAlert, TrendingDown, Activity, AlertTriangle,
  CheckCircle, BarChart2, Target, Zap, Info
} from 'lucide-react';

function RiskScoreGauge({ score, label, color }) {
  const radius = 54;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;
  const colorMap = { green: '#3fb950', amber: '#d29922', red: '#f85149' };
  const strokeColor = colorMap[color] || '#f85149';
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path d={`M 16 72 A ${radius} ${radius} 0 0 1 124 72`} fill="none" stroke="#1a1a1a" strokeWidth="10" strokeLinecap="round" />
        <path d={`M 16 72 A ${radius} ${radius} 0 0 1 124 72`} fill="none" stroke={strokeColor} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`} />
        <text x="70" y="62" textAnchor="middle" fill="#e6edf3" fontSize="26" fontWeight="bold">{score}</text>
        <text x="70" y="75" textAnchor="middle" fill="#6e7681" fontSize="10">/100</text>
      </svg>
      <div className={`text-[13px] font-bold mt-1 ${color === 'green' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>{label}</div>
    </div>
  );
}

function generateRiskInsight(data) {
  const ddPct = data.currentDrawdownPct.toFixed(1);
  const rf = data.recoveryFactor.toFixed(2);
  const ror = Math.max(0, data.riskOfRuin).toFixed(2);
  const streak = data.currentStreak;
  const edge = data.edgeStability;
  return `Current drawdown is at -${ddPct}% with a recovery factor of ${rf}×. Risk of ruin stands at ${ror}% indicating ${ror < 1 ? 'negligible' : ror < 5 ? 'low' : 'elevated'} survival risk. ${streak > 0 ? `Current losing streak of ${streak} campaigns requires monitoring.` : 'No active losing streak.'} Edge stability is ${edge.toLowerCase()} based on rolling 5-campaign performance. ${data.recoveryCapabilityLabel === 'Weak' || data.recoveryCapabilityLabel === 'None' ? 'Recovery capability is the primary area of concern.' : 'Recovery capability appears adequate.'}`;
}

function getRiskTakeaways(data) {
  return [
    { icon: TrendingDown, color: data.currentDrawdownPct > 50 ? 'text-red-400' : 'text-amber-400', title: 'Drawdown Status', detail: `Drawdown is at -${data.currentDrawdownPct.toFixed(1)}%, ${data.recoveryProgress < 50 ? 'still far from recovery.' : 'making progress toward recovery.'}` },
    { icon: Activity,     color: data.recoveryFactor >= 1 ? 'text-emerald-400' : 'text-red-400',   title: 'Recovery Ability', detail: `Recovery factor of ${data.recoveryFactor.toFixed(2)}× is ${data.recoveryFactor >= 1.5 ? 'strong.' : data.recoveryFactor >= 1 ? 'moderate.' : 'weak — primary area of risk.'}` },
    { icon: ShieldAlert,  color: 'text-emerald-400', title: 'Risk of Ruin', detail: `Risk of ruin is ${Math.max(0, data.riskOfRuin).toFixed(2)}%. Survival probability remains ${data.survivalProbability}%.` },
    { icon: BarChart2,    color: data.riskAttribution[0] ? 'text-amber-400' : 'text-[#6e7681]', title: 'Loss Concentration', detail: `${data.riskAttribution[0]?.reason || 'Structural Invalidation'} drives ${data.riskAttribution[0]?.pct || 0}% of total losses.` },
    { icon: Target,       color: data.edgeStabilityColor === 'green' ? 'text-emerald-400' : data.edgeStabilityColor === 'amber' ? 'text-amber-400' : 'text-red-400', title: 'Forward Outlook', detail: `Edge is ${data.edgeStability.toLowerCase()}. Expected recovery time: ${data.projectedRecoveryLow}–${data.projectedRecoveryHigh} campaigns.` },
  ];
}

export default async function RiskDashboard() {
  const data = await getDashboardData();
  const insight   = generateRiskInsight(data);
  const takeaways = getRiskTakeaways(data);

  const drawdownData = data.equityCurve.map(r => ({ date: r.date, drawdown: r.drawdown })).filter(r => r.date);

  const outcomeProfile = [
    { label: '2R+',       color: '#3fb950', count: data.returnRiskDonut.find(d => d.label === '2R+')?.count || 0,        pct: Math.round((data.returnRiskDonut.find(d => d.label === '2R+')?.count || 0) / data.totalTrades * 100) },
    { label: '1R to 2R',  color: '#50A2FF', count: data.returnRiskDonut.find(d => d.label === '1R to 2R')?.count || 0,   pct: Math.round((data.returnRiskDonut.find(d => d.label === '1R to 2R')?.count || 0) / data.totalTrades * 100) },
    { label: '0R to 1R',  color: '#d29922', count: data.returnRiskDonut.find(d => d.label === '0R to 1R')?.count || 0,   pct: Math.round((data.returnRiskDonut.find(d => d.label === '0R to 1R')?.count || 0) / data.totalTrades * 100) },
    { label: '-1R to 0R', color: '#f0883e', count: data.returnRiskDonut.find(d => d.label === '-1R to 0R')?.count || 0,  pct: Math.round((data.returnRiskDonut.find(d => d.label === '-1R to 0R')?.count || 0) / data.totalTrades * 100) },
    { label: 'Below -1R', color: '#f85149', count: data.returnRiskDonut.find(d => d.label === 'Below -1R')?.count || 0,  pct: Math.round((data.returnRiskDonut.find(d => d.label === 'Below -1R')?.count || 0) / data.totalTrades * 100) },
  ];

  const concentrationData = [
    { label: 'Worst Campaign', pct: data.worstCampaignPct, color: 'text-red-400',    barColor: '#f85149', note: 'of total loss' },
    { label: 'Top 3 Losers',   pct: data.top3LossPct,      color: 'text-red-400',    barColor: '#f0883e', note: 'of total loss' },
    { label: 'Top 5 Losers',   pct: data.top5LossPct,      color: 'text-amber-400',  barColor: '#d29922', note: 'of total loss' },
    { label: 'Top Winner',     pct: data.topWinnerPct,      color: 'text-emerald-400', barColor: '#3fb950', note: 'of total gain' },
  ];

  const riskRules = [
    { rule: 'Consecutive campaign loss limit', value: `${data.currentStreak} of 5 max`,          status: data.currentStreak < data.alertThreshold },
    { rule: 'Recovery factor > 1.0',           value: `${data.recoveryFactor.toFixed(2)}×`,       status: data.recoveryFactor >= 1 },
    { rule: 'Campaign win rate ≥ 25%',          value: `${data.campaignWinRate.toFixed(1)}%`,      status: data.campaignWinRate >= 25 },
    { rule: 'Profit factor > 1.0',              value: `${data.profitFactor.toFixed(2)}`,          status: data.profitFactor >= 1 },
    { rule: 'Positive expectancy',              value: `Win ${data.avgWinR.toFixed(2)}R / Loss ${data.avgLossR.toFixed(2)}R`, status: data.profitFactor > 1 },
    { rule: 'Edge retention (last 5)',          value: `${data.rollingAvgR[data.rollingAvgR.length-1]?.rollingAvgR.toFixed(2)}R rolling avg`, status: (data.rollingAvgR[data.rollingAvgR.length-1]?.rollingAvgR || 0) > 0 },
  ];

  const fmt = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Risk Dashboard</h1>
          <p className="text-[11px] text-[#6e7681] mt-0.5">Monitor drawdowns, recovery ability & system resilience</p>
        </div>
        <span className="text-[11px] text-[#6e7681] bg-[#0A0A0A] border border-[#292929] px-3 py-1.5 rounded-full">
          30 Mar – 21 May 2026
        </span>
      </div>

      {/* SECTION 1 — Risk Health Score + Scorecards */}
      <div className="grid grid-cols-12 gap-4 items-stretch">

        <div className="col-span-3 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col items-center justify-center">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-3">Risk Health Score</p>
          <RiskScoreGauge score={data.riskHealthScore} label={data.riskLabel} color={data.riskLabelColor} />
          <p className="text-[10px] text-[#6e7681] mt-3 text-center">
            Primary weakness: <span className={`font-medium ${data.recoveryFactor < 1 ? 'text-red-400' : 'text-amber-400'}`}>
              {data.recoveryFactor < 1 ? 'Recovery Ability' : data.currentStreak >= 3 ? 'Loss Streak' : 'Drawdown Control'}
            </span>
          </p>
        </div>

        <div className="col-span-3 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col justify-between">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider pb-3 mb-4 border-b border-[#292929]">Drawdown Health</p>
           <div className="grid grid-cols-2 flex-1">
            <div className="pr-4 flex flex-col justify-center">
              <p className="text-[10px] text-[#6e7681] mb-1">Max Drawdown</p>
              <div className="text-[28px] font-bold text-red-400">{data.maxDrawdown.toFixed(2)}%</div>
              <p className="text-[10px] text-[#6e7681] mt-1">${fmt(data.maxDrawdownDollar)}</p>
            </div>
            <div className="pl-4 flex flex-col justify-center">
              <p className="text-[10px] text-[#6e7681] mb-1">Current Drawdown</p>
              <div className={`text-[28px] font-bold ${data.currentDrawdownPct < 0.01 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.currentDrawdownPct < 0.01 ? '0.00%' : `-${data.currentDrawdownPct.toFixed(2)}%`}
              </div>
              <p className="text-[10px] text-[#6e7681] mt-1">{data.currentDrawdownPct < 0.01 ? 'At peak' : `$${fmt(data.currentDrawdownDollar)}`}</p>
            </div>
          </div>
        </div>

        <div className="col-span-3 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col justify-between">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider pb-3 mb-4 border-b border-[#292929]">Recovery Health</p>
           <div className="grid grid-cols-2 flex-1">
            <div className="pr-4 flex flex-col justify-center">
              <p className="text-[10px] text-[#6e7681] mb-1">Recovery Factor</p>
              <div className={`text-[28px] font-bold ${data.recoveryFactor >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>{data.recoveryFactor.toFixed(2)}×</div>
              <p className="text-[10px] text-[#6e7681] mt-1">{data.recoveryCapabilityLabel}</p>
            </div>
            <div className="pl-4 flex flex-col justify-center">
              <p className="text-[10px] text-[#6e7681] mb-1">Calmar Ratio</p>
              <div className={`text-[28px] font-bold ${data.calmarRatio >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>{data.calmarRatio.toFixed(2)}</div>
              <p className="text-[10px] text-[#6e7681] mt-1">{data.calmarRatio >= 1 ? 'Good' : 'Poor'}</p>
            </div>
          </div>
        </div>

        <div className="col-span-3 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col justify-between">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider pb-3 mb-4 border-b border-[#292929]">Survival Health</p>
           <div className="grid grid-cols-2 flex-1">
            <div className="pr-4 flex flex-col justify-center">
              <p className="text-[10px] text-[#6e7681] mb-1">Risk of Ruin</p>
              <div className={`text-[28px] font-bold ${Math.max(0, data.riskOfRuin) < 1 ? 'text-emerald-400' : 'text-red-400'}`}>{Math.max(0, data.riskOfRuin).toFixed(2)}%</div>
              <p className="text-[10px] text-[#6e7681] mt-1">{Math.max(0, data.riskOfRuin) < 1 ? 'Low' : 'Elevated'}</p>
            </div>
            <div className="pl-4 flex flex-col justify-center">
              <p className="text-[10px] text-[#6e7681] mb-1">Ulcer Index</p>
              <div className={`text-[28px] font-bold ${Math.abs(data.ulcerIndex) < 15 ? 'text-emerald-400' : Math.abs(data.ulcerIndex) < 40 ? 'text-amber-400' : 'text-red-400'}`}>{Math.abs(data.ulcerIndex).toFixed(2)}</div>
              <p className="text-[10px] text-[#6e7681] mt-1">{Math.abs(data.ulcerIndex) < 15 ? 'Low' : Math.abs(data.ulcerIndex) < 40 ? 'Moderate' : 'High'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 — Drawdown Over Time + Drawdown Intelligence */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#6e7681] uppercase tracking-wider">Drawdown Over Time</p>
            <div className="flex gap-4">
              {[
                { label: 'Current DD',        value: data.currentDrawdownPct < 0.01 ? '0.00%' : `-${data.currentDrawdownPct.toFixed(2)}%`, color: data.currentDrawdownPct < 0.01 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Peak DD',           value: `${data.maxDrawdown.toFixed(2)}%`,          color: 'text-red-400'    },
                { label: 'Recovery Progress', value: `${data.recoveryProgress}%`,               color: 'text-emerald-400' },
              ].map((s, i) => (
                <div key={i} className="text-right">
                  <div className="text-[9px] text-[#6e7681]">{s.label}</div>
                  <div className={`text-[13px] font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <DrawdownOverTimeChart data={drawdownData} maxDD={data.maxDrawdown} />
        </div>

        <div className="col-span-4 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Drawdown Intelligence</p>
          <div className="space-y-0">
            {[
              { label: 'Max Drawdown',         value: `${data.maxDrawdown.toFixed(2)}%`,                                         color: 'text-red-400'    },
              { label: 'Max Drawdown ($)',      value: `$${fmt(data.maxDrawdownDollar)}`,                                          color: 'text-red-400'    },
              { label: 'Average Drawdown',      value: `${data.avgDrawdownPct.toFixed(2)}%`,                                       color: 'text-amber-400'  },
              { label: 'Longest DD Duration',   value: `${data.maxDrawdownDuration} campaigns`,                                    color: 'text-amber-400'  },
              { label: 'Avg DD Duration',       value: data.avgDDDuration > 0 ? `${data.avgDDDuration} campaigns` : '—',           color: 'text-[#8b949e]'  },
              { label: 'Current DD Rank',       value: data.currentDDRank > 0 ? `${data.currentDDRank} worst of ${data.drawdownPeriodsCount}` : '— (recovered)', color: data.currentDDRank > 0 ? 'text-amber-400' : 'text-emerald-400' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-[#1a1a1a]">
                <span className="text-[11px] text-[#6e7681]">{item.label}</span>
                <span className={`text-[12px] font-medium ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3 — Recovery Analysis + Daily P/L Volatility + Outcome Profile */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Recovery Analysis</p>
          <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-[#292929]">
            <div>
              <p className="text-[10px] text-[#6e7681] mb-1">Largest Recovery</p>
              <div className="text-[28px] font-bold text-emerald-400">+{data.largestRecovery.toFixed(2)}R</div>
            </div>
            <div>
              <p className="text-[10px] text-[#6e7681] mb-1">Avg Recovery</p>
              <div className="text-[28px] font-bold text-emerald-400">+{data.avgRecovery.toFixed(2)}R</div>
            </div>
          </div>
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-[#6e7681]">Recovery Success Rate</span>
                <span className="text-emerald-400 font-medium">{data.recoverySuccessRate}%</span>
              </div>
              <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.recoverySuccessRate}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-[#6e7681]">Recovery Progress (current DD)</span>
                <span className="text-[#50A2FF] font-medium">{data.recoveryProgress}%</span>
              </div>
              <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-[#50A2FF] rounded-full" style={{ width: `${data.recoveryProgress}%` }} />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#292929]">
              <p className="text-[11px] text-[#6e7681]">Est. Campaigns to Recover</p>
              {data.currentDrawdownPct < 0.01
                ? <span className="text-[16px] font-bold text-emerald-400">Recovered ✓</span>
                : <span className="text-[28px] font-bold text-amber-400">{data.estCampaignsToRecover}</span>
              }
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#6e7681] uppercase tracking-wider">Daily P/L Volatility</p>
            <span className="text-[11px] text-[#50A2FF]">Std Dev: ${data.dailyPLStdDev.toFixed(2)}</span>
          </div>
          <DailyPLChart data={data.dailyPLArr} />
        </div>

        <div className="bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#6e7681] uppercase tracking-wider">Outcome Profile (R-Multiple)</p>
            <div className="text-right">
              <div className="text-[9px] text-[#6e7681]">Average</div>
              <div className="text-[13px] font-bold text-white">{data.avgRMultiple.toFixed(2)}R</div>
            </div>
          </div>
          <OutcomeProfileChart data={outcomeProfile} avgR={data.avgRMultiple} />
        </div>
      </div>

      {/* SECTION 4 — Risk Concentration + Risk Attribution + Risk Rules */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Risk Concentration</p>
          <div className="space-y-4 flex-1">
            {concentrationData.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span className="text-[#8b949e]">{item.label}</span>
                  <span className={`font-medium ${item.color}`}>{item.pct}% {item.note}</span>
                </div>
                <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.barColor }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-[#292929]">
            <div className="flex justify-between text-[10px] mb-2">
              <span className="text-[#6e7681]">Loss : Gain Ratio</span>
              <span className="text-[18px] font-bold text-amber-400">{data.lossGainRatio} : 1</span>
            </div>
            <p className="text-[10px] text-[#6e7681] leading-relaxed">
              {data.worstCampaignPct > 30
                ? 'High loss concentration — worst campaign dominates downside risk.'
                : 'Loss concentration is distributed across multiple campaigns.'}
            </p>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-1">Risk Attribution</p>
          <p className="text-[10px] text-[#6e7681] mb-4">What's causing losses?</p>
          <div className="space-y-4 flex-1">
            {data.riskAttribution.map((item, i) => {
              const colors = ['#f85149','#f0883e','#d29922','#50A2FF','#8b5cf6'];
              return (
                <div key={i}>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-[#8b949e]">{item.reason}</span>
                    <span className="text-white font-medium">{item.pct}%</span>
                  </div>
                  <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: colors[i] || '#6e7681' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-[#292929] flex justify-between text-[10px]">
            <span className="text-[#6e7681]">Total</span>
            <span className="text-white font-medium">100%</span>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Risk Rules & Governance</p>
          <div className="space-y-0 flex-1">
            {riskRules.map((rule, i) => (
              <div key={i} className="flex items-start justify-between gap-2 py-2.5 border-b border-[#1a1a1a]">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {rule.status
                    ? <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                    : <AlertTriangle size={12} className="text-red-400 shrink-0" />}
                  <span className="text-[11px] text-[#8b949e] truncate">{rule.rule}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-white font-medium">{rule.value}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${rule.status ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                    {rule.status ? 'Pass' : 'Fail'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 5 — System Resilience + Forward Risk Outlook + Executive Risk Insight */}
      <div className="grid grid-cols-12 gap-4">

        <div className="col-span-4 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">System Resilience</p>
          <div className="space-y-4 flex-1">
            {[
              { label: 'Risk of Ruin',           value: `${Math.max(0, data.riskOfRuin).toFixed(2)}%`, color: 'text-emerald-400', barPct: Math.min(100, Math.max(0, data.riskOfRuin) * 10), barColor: '#f85149' },
              { label: 'Max Consecutive Losses',  value: `${data.maxCampaignStreak} campaigns`,         color: 'text-amber-400',   barPct: (data.maxCampaignStreak / 15) * 100,               barColor: '#d29922' },
              { label: 'Current Consecutive',     value: `${data.currentStreak} campaigns`,             color: data.currentStreak >= 5 ? 'text-red-400' : 'text-emerald-400', barPct: (data.currentStreak / 5) * 100, barColor: '#f85149' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span className="text-[#6e7681]">{item.label}</span>
                  <span className={`font-medium ${item.color}`}>{item.value}</span>
                </div>
                <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, item.barPct)}%`, background: item.barColor }} />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#292929] pt-4 mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-[10px] mb-1.5">
                <span className="text-[#6e7681]">Survival Probability</span>
                <span className="text-emerald-400 font-bold text-[13px]">{data.survivalProbability}%</span>
              </div>
              <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, parseFloat(data.survivalProbability))}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-[#6e7681]">Capital at Risk</span>
              <span className="text-amber-400 font-medium">{data.capitalAtRisk.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-[#6e7681]">Recovery Capability</span>
              <span className={`font-medium ${data.recoveryCapabilityColor === 'green' ? 'text-emerald-400' : data.recoveryCapabilityColor === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>
                {data.recoveryCapabilityLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-4 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Forward Risk Outlook</p>
          <div className="space-y-0 flex-1">
            {[
              { label: 'Expected DD Range',         value: `${data.expectedDDLow.toFixed(1)}% to ${data.expectedDDHigh.toFixed(1)}%`, color: 'text-red-400'    },
              { label: 'Projected Recovery Time',   value: `${data.projectedRecoveryLow}–${data.projectedRecoveryHigh} campaigns`,     color: 'text-amber-400'  },
              { label: 'Risk of Ruin (Projected)',  value: `${Math.max(0, data.riskOfRuin).toFixed(2)}%`,                              color: 'text-emerald-400' },
              { label: 'Edge Stability',            value: data.edgeStability,                                                          color: data.edgeStabilityColor === 'green' ? 'text-emerald-400' : data.edgeStabilityColor === 'amber' ? 'text-amber-400' : 'text-red-400' },
              { label: 'Campaign Win Rate',         value: `${data.campaignWinRate.toFixed(1)}%`,                                      color: 'text-[#50A2FF]'  },
              { label: 'Profit Factor',             value: data.profitFactor.toFixed(2),                                               color: data.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Rolling 5-Campaign Avg R',  value: `${data.rollingAvgR[data.rollingAvgR.length-1]?.rollingAvgR.toFixed(2)}R`,  color: (data.rollingAvgR[data.rollingAvgR.length-1]?.rollingAvgR || 0) > 0 ? 'text-emerald-400' : 'text-red-400' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-[#1a1a1a]">
                <span className="text-[11px] text-[#6e7681]">{item.label}</span>
                <span className={`text-[12px] font-medium ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-4 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            {data.riskHealthScore >= 70
              ? <Info size={13} className="text-[#50A2FF]" />
              : <AlertTriangle size={13} className={data.riskHealthScore < 40 ? 'text-red-400' : 'text-amber-400'} />
            }
            <p className="text-[10px] text-[#6e7681] uppercase tracking-wider">Executive Risk Insight</p>
          </div>
          <p className="text-[12px] text-[#8b949e] leading-relaxed mb-4">{insight}</p>
          <div className="mt-auto border-t border-[#292929] pt-4 space-y-2">
            <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-2">Risk Score Breakdown</p>
            {[
              { label: 'Drawdown Control',  score: data.riskSubScores.drawdownControl, max: 25 },
              { label: 'Recovery Factor',   score: data.riskSubScores.recoveryFactor,  max: 20 },
              { label: 'Streak Control',    score: data.riskSubScores.streakControl,   max: 20 },
              { label: 'Edge Retention',    score: data.riskSubScores.edgeRetention,   max: 20 },
              { label: 'Risk of Ruin',      score: data.riskSubScores.riskOfRuin,      max: 15 },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-[#6e7681]">{item.label}</span>
                  <span className="text-white">{item.score}/{item.max}</span>
                </div>
                <div className="w-full bg-[#1a1a1a] rounded-full h-1 overflow-hidden">
                  <div className="h-full rounded-full bg-[#50A2FF]" style={{ width: `${(item.score / item.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 6 — Key Takeaways */}
      <div className="bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
        <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Key Takeaways & Actionable Insights</p>
        <div className="grid grid-cols-5 gap-4">
          {takeaways.map((t, i) => (
            <div key={i} className="bg-[#000000] rounded-xl p-4 border border-[#292929]">
              <div className="mb-3"><t.icon size={18} className={t.color} /></div>
              <p className={`text-[12px] font-semibold mb-1.5 ${t.color}`}>{t.title}</p>
              <p className="text-[11px] text-[#6e7681] leading-relaxed">{t.detail}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}