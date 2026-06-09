import { getDashboardData } from '../lib/sheets';
import { CumulativeRChart, RDistributionChart, ReturnAttributionChart } from '../components/CampaignCharts';
import {
  TrendingUp, Target, ShieldAlert, Zap, BarChart2,
  AlertTriangle, TrendingDown, Star, Activity, Eye
} from 'lucide-react';

function StatusBadge({ status }) {
  const styles = {
    'Excellent':       'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    'Good':            'bg-blue-400/10 text-blue-400 border-blue-400/20',
    'Needs Attention': 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    'Poor':            'bg-red-400/10 text-red-400 border-red-400/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status] || styles['Good']}`}>
      {status === 'Excellent' || status === 'Good' ? '✓' : '⚠'} {status}
    </span>
  );
}

function generateInsight(data) {
  const winRate      = data.campaignWinRate.toFixed(1);
  const payoff       = data.payoffRatio.toFixed(2);
  const expectancy   = data.avgReturnPerCampaign.toFixed(2);
  const topContrib   = data.top1Contribution.toFixed(1);
  const convexity    = data.convexityLabel.toLowerCase();
  const failMode     = data.exitReasonsFull[0]?.reason || 'Structural Invalidation';
  const expansionR   = data.regimeData.find(r => r.regime === 'Expansion')?.avgR.toFixed(2) || '0';
  const threshold    = Math.ceil(data.campaignWinRate / 10) * 10;

  return `Campaign performance remains strongly positive despite a sub-${threshold}% win rate due to a ${payoff}× payoff ratio and ${expectancy}R realized expectancy per campaign. Returns are ${convexity} — the top campaign alone generated ${topContrib}% of total R, confirming significant right-tail dependence. Expansion regime setups deliver ${expansionR}R avg per campaign and represent the primary edge. ${failMode} remains the dominant failure mode and should be monitored closely to protect expectancy.`;
}

function getKeyTakeaways(data) {
  const takeaways = [];

  takeaways.push({
    icon: TrendingUp,
    color: 'text-emerald-400',
    title: 'Strong Edge',
    detail: `Positive expectancy (+${data.avgReturnPerCampaign.toFixed(2)}R) driven by high payoff ratio and ${data.convexityLabel.toLowerCase()} returns.`,
  });

  const oneAttemptWinRate = data.attemptEfficiency.find(a => a.attempts === '1')?.winRate || 0;
  takeaways.push({
    icon: Target,
    color: oneAttemptWinRate > 50 ? 'text-[#50A2FF]' : 'text-amber-400',
    title: oneAttemptWinRate > 50 ? 'Focus on Quality Setups' : 'Improve Entry Timing',
    detail: oneAttemptWinRate > 50
      ? `1-attempt win rate is ${oneAttemptWinRate}%. Prioritize high-conviction setups to reduce attempt cost.`
      : `1-attempt win rate is ${oneAttemptWinRate}%. Earlier entries could reduce total attempt cost per campaign.`,
  });

  const topFailure = data.exitReasonsFull[0];
  if (topFailure) {
    takeaways.push({
      icon: AlertTriangle,
      color: 'text-amber-400',
      title: 'Manage Failure Mode',
      detail: `${topFailure.reason} is the #1 cost driver (${topFailure.frequency} campaigns, ${topFailure.totalR.toFixed(1)}R total). Tighten invalidation criteria.`,
    });
  }

  takeaways.push({
    icon: Star,
    color: 'text-amber-400',
    title: 'Leverage Convexity',
    detail: `Top ${data.rightTailCampaigns} campaign${data.rightTailCampaigns !== 1 ? 's' : ''} generated ${data.top3Contribution.toFixed(1)}% of returns. Keep seeking right-tail opportunities.`,
  });

  takeaways.push({
    icon: ShieldAlert,
    color: 'text-red-400',
    title: 'Monitor Drawdowns',
    detail: `Max drawdown of ${data.maxCampaignDD.toFixed(2)}R over ${data.maxDrawdownDuration} campaigns. Maintain risk discipline.`,
  });

  return takeaways.slice(0, 5);
}

export default async function CampaignAnalytics() {
  const data = await getDashboardData();
  const insight   = generateInsight(data);
  const takeaways = getKeyTakeaways(data);

  const healthScorecard = [
    { label: 'Expectancy',        value: `+${data.avgReturnPerCampaign.toFixed(2)}R`, color: 'text-emerald-400', status: data.avgReturnPerCampaign > 2 ? 'Excellent' : data.avgReturnPerCampaign > 0 ? 'Good' : 'Poor' },
    { label: 'Win Rate',          value: `${data.campaignWinRate.toFixed(1)}%`,       color: 'text-[#50A2FF]',   status: data.campaignWinRate > 40 ? 'Excellent' : data.campaignWinRate > 25 ? 'Good' : 'Needs Attention' },
    { label: 'Payoff Ratio',      value: `${data.payoffRatio.toFixed(2)}×`,           color: 'text-emerald-400', status: data.payoffRatio > 3 ? 'Excellent' : data.payoffRatio > 1.5 ? 'Good' : 'Needs Attention' },
    { label: 'Profit Factor',     value: data.profitFactor.toFixed(2),                color: 'text-emerald-400', status: data.profitFactor > 2 ? 'Excellent' : data.profitFactor > 1 ? 'Good' : 'Poor' },
    { label: 'Right Tail Presence', value: String(data.rightTailCampaigns),           color: 'text-amber-400',   status: data.rightTailCampaigns >= 2 ? 'Good' : 'Needs Attention' },
  ];

  const fmt = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Campaign Analytics</h1>
          <p className="text-[11px] text-[#6e7681] mt-0.5">Deep dive into campaign performance and edge drivers</p>
        </div>
        <span className="text-[11px] text-[#6e7681] bg-[#0A0A0A] border border-[#292929] px-3 py-1.5 rounded-full">
          {data.totalCampaigns} Campaigns · 30 Mar – 21 May 2026
        </span>
      </div>

      {/* SECTION 1 — Health Scorecard + Executive Insight */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Campaign Health Scorecard</p>
          <div className="grid grid-cols-5 divide-x divide-[#292929]">
            {healthScorecard.map((item, i) => (
              <div key={i} className={`flex flex-col gap-2 ${i === 0 ? 'pr-4' : 'px-4'}`}>
                <p className="text-[10px] text-[#6e7681]">{item.label}</p>
                <div className={`text-[22px] font-bold ${item.color}`}>{item.value}</div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-4 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#50A2FF] text-[12px]">✦</span>
            <p className="text-[10px] text-[#6e7681] uppercase tracking-wider">Executive Insight</p>
          </div>
          <p className="text-[12px] text-[#8b949e] leading-relaxed">{insight}</p>
        </div>
      </div>

      {/* SECTION 2 — KPI Groups */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Campaign Efficiency</p>
          <div className="grid grid-cols-3 divide-x divide-[#292929]">
            <div className="pr-4">
              <div className="text-[22px] font-bold text-[#50A2FF]">{data.campaignWinRate.toFixed(1)}%</div>
              <p className="text-[10px] text-[#6e7681] mt-1">Win Rate</p>
              <p className="text-[10px] text-[#6e7681]">{data.wonCampaigns} won · {data.lostCampaigns} lost</p>
            </div>
            <div className="px-4">
              <div className="text-[22px] font-bold text-amber-400">{data.payoffRatio.toFixed(2)}×</div>
              <p className="text-[10px] text-[#6e7681] mt-1">Payoff Ratio</p>
              <p className="text-[10px] text-[#6e7681]">avg win R : avg loss R</p>
            </div>
            <div className="pl-4">
              <div className="text-[22px] font-bold text-emerald-400">{data.profitFactor.toFixed(2)}</div>
              <p className="text-[10px] text-[#6e7681] mt-1">Profit Factor</p>
              <p className="text-[10px] text-[#6e7681]">total win R : total loss R</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Campaign Output</p>
          <div className="grid grid-cols-3 divide-x divide-[#292929]">
            <div className="pr-4">
              <div className="text-[22px] font-bold text-[#50A2FF]">+{data.totalR.toFixed(2)}R</div>
              <p className="text-[10px] text-[#6e7681] mt-1">Total R Gained</p>
              <p className="text-[10px] text-[#6e7681]">cumulative across all</p>
            </div>
            <div className="px-4">
              <div className="text-[22px] font-bold text-emerald-400">+{data.avgWinR.toFixed(2)}R</div>
              <p className="text-[10px] text-[#6e7681] mt-1">Avg Winning</p>
              <p className="text-[10px] text-[#6e7681]">avg R per winning</p>
            </div>
            <div className="pl-4">
              <div className="text-[22px] font-bold text-red-400">{data.avgLossR.toFixed(2)}R</div>
              <p className="text-[10px] text-[#6e7681] mt-1">Avg Losing</p>
              <p className="text-[10px] text-[#6e7681]">avg R per losing</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Execution Quality</p>
          <div className="grid grid-cols-2 divide-x divide-[#292929]">
            <div className="pr-4">
              <div className="text-[22px] font-bold text-white">{data.avgAttemptsPerCampaign}</div>
              <p className="text-[10px] text-[#6e7681] mt-1">Avg Attempts / Campaign</p>
              <p className="text-[10px] text-[#6e7681]">trades taken per setup</p>
            </div>
            <div className="pl-4">
              <div className="text-[22px] font-bold text-amber-400">{data.rightTailCampaigns}</div>
              <p className="text-[10px] text-[#6e7681] mt-1">Right Tail Presence</p>
              <p className="text-[10px] text-[#6e7681]">campaigns {`>`}30R</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3 — Cumulative R + Convexity */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#6e7681] uppercase tracking-wider">Cumulative R by Campaign</p>
            <div className="flex gap-4 text-[10px] text-[#6e7681]">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#50A2FF] inline-block" />Running R
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-amber-400 inline-block opacity-60" style={{ borderTop: '2px dashed #d29922', background: 'none' }} />Peak R
              </span>
            </div>
          </div>
          <CumulativeRChart data={data.campaigns} />
        </div>
        <div className="col-span-4 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Convexity Overview</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 divide-x divide-[#292929] pb-4 border-b border-[#292929]">
              <div className="pr-4">
                <p className="text-[10px] text-[#6e7681] mb-1">Skewness</p>
                <div className={`text-[22px] font-bold ${data.skewness > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.skewness > 0 ? '+' : ''}{data.skewness}
                </div>
              </div>
              <div className="pl-4">
                <p className="text-[10px] text-[#6e7681] mb-1">Right Tail Campaigns</p>
                <div className="text-[22px] font-bold text-amber-400">{data.rightTailCampaigns}</div>
              </div>
            </div>
            <div className="pb-3 border-b border-[#292929]">
              <p className="text-[10px] text-[#6e7681] mb-1">Top 1 Campaign Contribution</p>
              <div className="text-[22px] font-bold text-[#50A2FF]">{data.top1Contribution.toFixed(1)}%</div>
            </div>
            <div className="pb-3 border-b border-[#292929]">
              <p className="text-[10px] text-[#6e7681] mb-1">Top 3 Campaign Contribution</p>
              <div className="text-[22px] font-bold text-[#50A2FF]">{data.top3Contribution.toFixed(1)}%</div>
            </div>
            <div>
              <p className="text-[10px] text-[#6e7681] mb-1">Convexity Assessment</p>
              <div className={`text-[18px] font-bold ${data.convexityLabel === 'Highly Convex' ? 'text-emerald-400' : data.convexityLabel === 'Convex' ? 'text-[#50A2FF]' : 'text-amber-400'}`}>
                {data.convexityLabel}
              </div>
              <p className="text-[11px] text-[#6e7681] mt-1">Returns are driven by a small number of large winners.</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4 — Campaign Extremes + R Distribution + Distribution Intelligence */}
      <div className="grid grid-cols-12 gap-4">

        <div className="col-span-4 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Campaign Extremes</p>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div>
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-3">Best Campaigns</p>
              <div className="space-y-3">
                {data.bestCampaigns.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#6e7681] shrink-0 w-14">Setup {c.setupId}</span>
                    <div className="flex-1 bg-[#1a1a1a] rounded-full h-1 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(c.totalR / data.bestCampaigns[0].totalR) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 shrink-0">+{c.totalR.toFixed(2)}R</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-red-400 uppercase tracking-wider mb-3">Worst Campaigns</p>
              <div className="space-y-3">
                {data.worstCampaigns.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#6e7681] shrink-0 w-14">Setup {c.setupId}</span>
                    <div className="flex-1 bg-[#1a1a1a] rounded-full h-1 overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full"
                        style={{ width: `${(Math.abs(c.totalR) / Math.abs(data.worstCampaigns[0].totalR)) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-red-400 shrink-0">{c.totalR.toFixed(2)}R</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-[#292929] mt-5 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#6e7681]">Best : Worst Magnitude Ratio</p>
              <span className="text-[20px] font-bold text-amber-400">{data.bestWorstRatio}×</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1a1a1a]">
              <div>
                <p className="text-[10px] text-[#6e7681] mb-1">Total winning R</p>
                <p className="text-[13px] font-bold text-emerald-400">+{data.bestCampaigns.reduce((s,c) => s + c.totalR, 0).toFixed(2)}R</p>
              </div>
              <div>
                <p className="text-[10px] text-[#6e7681] mb-1">Total losing R</p>
                <p className="text-[13px] font-bold text-red-400">{data.worstCampaigns.reduce((s,c) => s + c.totalR, 0).toFixed(2)}R</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-5 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-3">R Distribution by Frequency</p>
          <RDistributionChart data={data.rDistributionNew} />
        </div>

        <div className="col-span-3 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Distribution Intelligence</p>
          <div className="space-y-0">
            <div className="py-4 border-b border-[#292929]">
              <p className="text-[10px] text-[#6e7681] mb-1">Median Campaign</p>
              <div className={`text-[22px] font-bold ${data.medianR >= 0 ? 'text-[#50A2FF]' : 'text-red-400'}`}>
                {data.medianR >= 0 ? '+' : ''}{data.medianR}R
              </div>
            </div>
            <div className="py-4 border-b border-[#292929]">
              <p className="text-[10px] text-[#6e7681] mb-1">Average Campaign</p>
              <div className={`text-[22px] font-bold ${data.avgReturnPerCampaign >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                +{data.avgReturnPerCampaign.toFixed(2)}R
              </div>
            </div>
            <div className="py-4 border-b border-[#292929]">
              <p className="text-[10px] text-[#6e7681] mb-1">Skewness</p>
              <div className={`text-[22px] font-bold ${data.skewness > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.skewness > 0 ? '+' : ''}{data.skewness}
              </div>
            </div>
            <div className="pt-4">
              <p className="text-[10px] text-[#6e7681] mb-1">Interpretation</p>
              <p className="text-[11px] text-[#8b949e] leading-relaxed">
                {data.skewness > 1
                  ? 'A minority of campaigns generate the majority of returns.'
                  : data.skewness > 0
                  ? 'Returns are slightly right-skewed with occasional large wins.'
                  : 'Returns are left-skewed. Review strategy for consistency.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5 — Exit Reasons + Attempt Efficiency + Return Attribution */}
      <div className="grid grid-cols-12 gap-4">

        <div className="col-span-4 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Exit Reasons Analysis</p>
          <table className="w-full flex-1">
            <thead>
              <tr className="border-b border-[#292929]">
                {['Exit Reason', 'Freq', 'Avg R', 'Total R'].map((h, i) => (
                  <th key={h} className={`text-[10px] text-[#6e7681] uppercase tracking-wider pb-2 font-normal ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.exitReasonsFull.map((row, i) => (
                <tr key={i} className="border-b border-[#1a1a1a]">
                  <td className="py-2.5 text-[11px] text-white pr-2">{row.reason}</td>
                  <td className="py-2.5 text-[11px] text-[#6e7681]">{row.frequency}</td>
                  <td className={`py-2.5 text-[11px] font-medium ${row.avgR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {row.avgR >= 0 ? '+' : ''}{row.avgR}R
                  </td>
                  <td className={`py-2.5 text-[11px] font-medium text-right ${row.totalR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
  {row.totalR >= 0 ? '+' : ''}{row.totalR}R
                  </td>
                </tr>
              ))}
              <tr className="border-t border-[#292929]">
                <td className="py-2.5 text-[11px] font-medium text-white">Total</td>
                <td className="py-2.5 text-[11px] text-white">{data.totalCampaigns}</td>
                <td className="py-2.5 text-[11px] font-medium text-emerald-400">+{data.avgReturnPerCampaign.toFixed(2)}R</td>
                <td className="py-2.5 text-[11px] font-medium text-right text-emerald-400">+{data.totalR.toFixed(2)}R</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="col-span-4 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5 flex flex-col justify-between">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Attempt Efficiency (Win Rate by Attempts)</p>
          <table className="w-full flex-1">
            <thead>
              <tr className="border-b border-[#292929]">
                {['Attempts', 'Campaigns', 'Win Rate', 'Avg R / Campaign'].map((h, i) => (
                  <th key={h} className={`text-[10px] text-[#6e7681] uppercase tracking-wider pb-2 font-normal ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.attemptEfficiency.filter(a => a.campaigns > 0).map((row, i) => (
                <tr key={i} className="border-b border-[#1a1a1a]">
                  <td className="py-2.5 text-[11px] text-white">{row.attempts} attempt{row.attempts !== '1' ? 's' : ''}</td>
                  <td className="py-2.5 text-[11px] text-[#6e7681]">{row.campaigns}</td>
                  <td className={`py-2.5 text-[11px] font-medium ${row.winRate >= 50 ? 'text-emerald-400' : row.winRate >= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                    {row.winRate}%
                  </td>
                  <td className={`py-2.5 text-[11px] font-medium text-right ${row.avgR >= 0 ? 'text-[#50A2FF]' : 'text-red-400'}`}>
  {row.avgR >= 0 ? '+' : ''}{row.avgR}R
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pt-3 mt-2 flex justify-between">
            <p className="text-[11px] text-[#6e7681]">Average Attempts / Campaign</p> 
            <span className="text-[13px] font-bold text-[#50A2FF]">{data.avgAttemptsPerCampaign}</span>
          </div>
        </div>

        <div className="col-span-4 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Return Attribution</p>
          <ReturnAttributionChart data={data.returnAttribution} totalR={data.totalR} />
          <div className="mt-4 pt-3 border-t border-[#292929] space-y-2">
            {data.returnAttribution.map((d, i) => (
              <div key={i} className="flex justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-[#6e7681]">{d.label}</span>
                </div>
                <span className={`font-medium ${d.totalR >= 0 ? 'text-[#50A2FF]' : 'text-red-400'}`}>
                  {d.totalR >= 0 ? '+' : ''}{d.totalR.toFixed(1)}R ({d.count} campaigns)
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#292929] pt-3 mt-3 flex justify-between">
            <p className="text-[11px] text-[#6e7681]">Total R Gained</p>
            <span className="text-[15px] font-bold text-emerald-400">+{data.totalR.toFixed(2)}R</span>
          </div>
        </div>
      </div>

      {/* SECTION 6 — Campaign Risk Health + Failure Mode */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Campaign Risk Health</p>
          <div className="grid grid-cols-5 divide-x divide-[#292929]">
            {[
              { label: 'Worst Campaign',         value: (data.worstCampaigns[0]?.totalR.toFixed(2) || '0') + 'R', sub: 'Setup ' + (data.worstCampaigns[0]?.setupId || ''), color: 'text-red-400'   },
              { label: 'Avg Losing Campaign',    value: data.avgLossR.toFixed(2) + 'R',                            sub: 'average of ' + data.lostCampaigns + ' losses',     color: 'text-red-400'   },
              { label: 'Max Drawdown (R)',        value: '-' + data.maxCampaignDD.toFixed(2) + 'R',                sub: 'peak to trough',                                   color: 'text-red-400'   },
              { label: 'Max Drawdown Duration',  value: String(data.maxDrawdownDuration),                          sub: 'campaigns',                                        color: 'text-amber-400' },
              { label: 'Max Consecutive Losing', value: String(data.maxCampaignStreak),                            sub: 'campaigns',                                        color: 'text-amber-400' },
            ].map((item, i) => (
              <div key={i} className={i === 0 ? 'pr-4 flex flex-col gap-4' : 'px-4 flex flex-col gap-4'}>
                <p className="text-[10px] text-[#6e7681] uppercase tracking-wider">{item.label}</p>
                <div className={'text-[22px] font-bold ' + item.color}>{item.value}</div>
                <p className="text-[10px] text-[#6e7681]">{item.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-[#292929] space-y-3">
            <div className="flex justify-between text-[10px] text-[#6e7681] mb-2">
              <span>Drawdown recovered vs total R gained</span>
              <span className="text-white">{data.maxCampaignDD.toFixed(2)}R lost · +{data.totalR.toFixed(2)}R gained</span>
            </div>
            <div className="w-full bg-[#1a1a1a] rounded-full h-2.5 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((data.totalR / (data.totalR + data.maxCampaignDD)) * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] mt-1.5">
              <span className="text-red-400">Max DD: -{data.maxCampaignDD.toFixed(2)}R</span>
              <span className="text-emerald-400">Recovery Factor: {data.recoveryFactor.toFixed(2)}×</span>
            </div>
          </div>
        </div>

        <div className="col-span-4 bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
          <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Failure Mode Summary</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#292929]">
                {['Exit Reason', 'Count', '%'].map(h => (
                  <th key={h} className="text-left text-[10px] text-[#6e7681] pb-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.exitReasonsFull.map((row, i) => (
                <tr key={i} className="border-b border-[#1a1a1a]">
                  <td className="py-2.5 text-[11px] text-white">{row.reason}</td>
                  <td className="py-2.5 text-[11px] text-[#6e7681]">{row.frequency}</td>
                  <td className="py-2.5 text-[11px] text-[#6e7681]">
                    {((row.frequency / data.totalCampaigns) * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
              <tr className="border-t border-[#292929]">
                <td className="py-2.5 text-[11px] font-medium text-white">Total</td>
                <td className="py-2.5 text-[11px] text-white">{data.totalCampaigns}</td>
                <td className="py-2.5 text-[11px] text-white">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 7 — Key Takeaways */}
      <div className="bg-[#0A0A0A] border border-[#292929] rounded-xl p-5">
        <p className="text-[10px] text-[#6e7681] uppercase tracking-wider mb-4">Key Takeaways & Actionable Insights</p>
        <div className="grid grid-cols-5 gap-4">
          {takeaways.map((t, i) => (
            <div key={i} className="bg-[#000000] rounded-xl p-4 border border-[#292929]">
              <div className="mb-3">
                <t.icon size={18} className={t.color} />
              </div>
              <p className={`text-[12px] font-semibold mb-1.5 ${t.color}`}>{t.title}</p>
              <p className="text-[11px] text-[#6e7681] leading-relaxed">{t.detail}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}