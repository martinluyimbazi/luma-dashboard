import { getDashboardData } from '../lib/sheets';
import {
  DrawdownOverTimeChart,
  DrawdownDistributionChart,
  DailyPLVolatilityChart,
  RiskPerCampaignChart,
  ReturnRiskDonutChart,
  ConsecutiveWLChart,
  EdgeRetentionChart,
} from '../components/RiskCharts';

export default async function RiskDashboard() {
  const data = await getDashboardData();

  const drawdownData = data.equityCurve.map(r => ({
    tradeId: r.tradeId,
    drawdown: r.drawdown,
  }));

  const totalRMultiples = data.returnRiskDonut.reduce((s, d) => s + d.count, 0);

  const profitFactor = (() => {
    const totalWinR = data.campaigns.filter(c => c.totalR > 0).reduce((s, c) => s + c.totalR, 0);
    const totalLossR = Math.abs(data.campaigns.filter(c => c.totalR < 0).reduce((s, c) => s + c.totalR, 0));
    return totalLossR > 0 ? totalWinR / totalLossR : 0;
  })();

  const riskRules = [
    { rule: 'Consecutive campaign loss limit', status: data.currentStreak < data.alertThreshold, detail: `${data.currentStreak} of ${data.alertThreshold} max` },
    { rule: 'Recovery factor ≥ 1.0', status: data.recoveryFactor >= 1, detail: `${data.recoveryFactor.toFixed(2)}×` },
    { rule: 'Campaign win rate ≥ 25%', status: data.campaignWinRate >= 25, detail: `${data.campaignWinRate.toFixed(1)}%` },
    { rule: 'Profit factor ≥ 1.0', status: profitFactor >= 1, detail: `${profitFactor.toFixed(2)}` },
    { rule: 'Positive expectancy', status: data.avgWinR + data.avgLossR > 0, detail: `Win ${data.avgWinR.toFixed(2)}R / Loss ${data.avgLossR.toFixed(2)}R` },
    { rule: 'Edge retention (last 5)', status: data.rollingAvgR[data.rollingAvgR.length - 1]?.rollingAvgR > 0, detail: `${data.rollingAvgR[data.rollingAvgR.length - 1]?.rollingAvgR.toFixed(2)}R rolling avg` },
  ];

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Risk Dashboard</h1>
        <span className="text-[11px] text-[#6e7681] bg-[#161b22] border border-[#30363d] px-3 py-1 rounded-full">
          30 Mar – 21 May 2026
        </span>
      </div>

      {/* Top 6 metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'MAX DRAWDOWN', value: `${data.maxDrawdown.toFixed(2)}%`, sub: `$${(data.currentBalance * data.maxDrawdown / 100).toFixed(2)}`, color: 'text-red-400', trend: '↘' },
          { label: 'CURRENT DRAWDOWN', value: `${data.currentDrawdown.toFixed(2)}%`, sub: `$${(data.currentBalance * data.currentDrawdown / 100).toFixed(2)}`, color: 'text-red-400', trend: '→' },
          { label: 'RISK OF RUIN', value: `${Math.max(0, data.riskOfRuin).toFixed(2)}%`, sub: data.riskOfRuin < 5 ? 'Low' : data.riskOfRuin < 15 ? 'Moderate' : 'High', color: data.riskOfRuin < 5 ? 'text-emerald-400' : 'text-amber-400', trend: '⛉' },
          { label: 'RECOVERY FACTOR', value: data.recoveryFactor.toFixed(2), sub: data.recoveryFactor >= 1.5 ? 'Strong' : data.recoveryFactor >= 1 ? 'Moderate' : 'Weak', color: data.recoveryFactor >= 1.5 ? 'text-emerald-400' : data.recoveryFactor >= 1 ? 'text-amber-400' : 'text-red-400', trend: '↗' },
          { label: 'ULCER INDEX', value: Math.abs(data.ulcerIndex).toFixed(2), sub: Math.abs(data.ulcerIndex) < 5 ? 'Low' : Math.abs(data.ulcerIndex) < 15 ? 'Moderate' : 'High', color: Math.abs(data.ulcerIndex) < 5 ? 'text-emerald-400' : 'text-amber-400', trend: '⚡' },
          { label: 'CALMAR RATIO', value: data.calmarRatio.toFixed(2), sub: data.calmarRatio >= 1.5 ? 'Good' : data.calmarRatio >= 1 ? 'Acceptable' : 'Poor', color: data.calmarRatio >= 1.5 ? 'text-emerald-400' : data.calmarRatio >= 1 ? 'text-amber-400' : 'text-red-400', trend: '📊' },
        ].map((m, i) => (
          <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-[#6e7681] uppercase tracking-wider font-medium">{m.label}</span>
              <span className="text-[#6e7681] text-[11px]">{m.trend}</span>
            </div>
            <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
            <div className={`text-[11px] mt-0.5 ${m.color}`}>{m.sub}</div>
          </div>
        ))}
      </div>

{/* Drawdown over time + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">Drawdown Over Time</p>
          <DrawdownOverTimeChart data={drawdownData} />
        </div>
        <div className="md:col-span-4 bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">Drawdown Summary</p>
          <div className="space-y-2">
            {[
              { label: 'Max Drawdown', value: `${data.maxDrawdown.toFixed(2)}%`, color: 'text-red-400' },
              { label: 'Max Drawdown ($)', value: `$${(data.peakEquity * Math.abs(data.maxDrawdown) / 100).toFixed(2)}`, color: 'text-red-400' },
              { label: 'Avg Drawdown', value: `${data.avgDrawdown.toFixed(2)}%`, color: 'text-amber-400' },
              { label: 'Max DD Duration', value: `${data.maxCampaignStreak} campaigns`, color: 'text-amber-400' },
              { label: 'Avg DD Duration', value: `${(data.campaigns.reduce((s,c)=>s+c.drawdownDuration,0)/data.campaigns.length).toFixed(1)} campaigns`, color: 'text-[#8b949e]' },
              { label: 'Current Drawdown', value: `${data.currentDrawdown.toFixed(2)}%`, color: data.currentDrawdown < -10 ? 'text-red-400' : 'text-amber-400' },
              { label: 'Current DD ($)', value: `$${(data.currentBalance * Math.abs(data.currentDrawdown) / 100).toFixed(2)}`, color: 'text-[#8b949e]' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between text-[11px] border-b border-[#21262d] pb-1.5">
                <span className="text-[#6e7681]">{item.label}</span>
                <span className={`font-medium ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily P/L Volatility + Risk Per Campaign + Return/Risk */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5 bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-[#6e7681] uppercase tracking-wider">Daily P/L Volatility</p>
            <span className="text-[11px] text-blue-400">Std Dev: ${data.dailyPLStdDev.toFixed(2)}</span>
          </div>
          <DailyPLVolatilityChart data={data.dailyPLArr} />
        </div>
        <div className="md:col-span-4 bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">Risk Per Campaign (R)</p>
          <RiskPerCampaignChart data={data.riskPerCampaign} total={data.totalCampaigns} />
        </div>
        <div className="md:col-span-3 bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">Return / Risk (R-Multiple)</p>
          <ReturnRiskDonutChart data={data.returnRiskDonut} avgR={data.avgRMultiple} />
        </div>
      </div>

      {/* Risk Rules */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
        <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-4">Risk Rules Status</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {riskRules.map((item, i) => (
            <div key={i} className={`rounded-lg p-3 border ${item.status ? 'bg-emerald-900/20 border-emerald-800' : 'bg-red-900/20 border-red-800'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm ${item.status ? 'text-emerald-400' : 'text-red-400'}`}>{item.status ? '✓' : '✗'}</span>
                <span className="text-[12px] font-medium text-white">{item.rule}</span>
              </div>
              <p className="text-[11px] text-[#6e7681]">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}