import { getDashboardData } from '../lib/sheets';
import MetricCard from '../components/MetricCard';
import {
  CumulativeRChart,
  RDistributionChart,
  AttemptsChart,
  ExitReasonsChart,
} from '../components/CampaignCharts';

export default async function CampaignAnalytics() {
  const data = await getDashboardData();

  // Attempts distribution
  const attemptsBuckets = [1, 2, 3, 4, 5, 6].map(n => ({
    label: `${n} attempt${n > 1 ? 's' : ''}`,
    count: data.campaigns.filter(c => c.attempts === n).length,
  }));

  // Top campaigns
  const topCampaigns = [...data.campaigns]
    .filter(c => c.totalR > 0)
    .sort((a, b) => b.totalR - a.totalR)
    .slice(0, 8);

  // Worst campaigns
  const worstCampaigns = [...data.campaigns]
    .filter(c => c.totalR < 0)
    .sort((a, b) => a.totalR - b.totalR)
    .slice(0, 5);

  // Profit factor
  const totalWinR = data.campaigns
    .filter(c => c.totalR > 0)
    .reduce((s, c) => s + c.totalR, 0);
  const totalLossR = Math.abs(data.campaigns
    .filter(c => c.totalR < 0)
    .reduce((s, c) => s + c.totalR, 0));
  const profitFactor = totalLossR > 0 ? totalWinR / totalLossR : 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Campaign Analytics</h1>
        <span className="text-[11px] text-[#6e7681] bg-[#161b22] border border-[#30363d] px-3 py-1 rounded-full">
          {data.totalCampaigns} campaigns · 30 Mar – 21 May 2026
        </span>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Campaign Win Rate"
          value={data.campaignWinRate.toFixed(1)}
          suffix="%"
          sub={`${data.wonCampaigns} won · ${data.lostCampaigns} lost`}
          color="blue"
        />
        <MetricCard
          label="Avg Winning Campaign"
          value={`+${data.avgWinR.toFixed(2)}`}
          suffix=" R"
          sub="average R per winning campaign"
          color="green"
        />
        <MetricCard
          label="Avg Losing Campaign"
          value={data.avgLossR.toFixed(2)}
          suffix=" R"
          sub="average R per losing campaign"
          color="red"
        />
        <MetricCard
          label="Profit Factor"
          value={profitFactor.toFixed(2)}
          sub="total win R ÷ total loss R"
          color={profitFactor >= 1.5 ? 'green' : profitFactor >= 1 ? 'amber' : 'red'}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total R Gained"
          value={`+${data.totalR.toFixed(2)}`}
          suffix=" R"
          sub="cumulative across all campaigns"
          color="blue"
        />
        <MetricCard
          label="Payoff Ratio"
          value={data.payoffRatio.toFixed(2)}
          suffix="×"
          sub="avg win R ÷ avg loss R"
          color="amber"
        />
        <MetricCard
          label="Avg Attempts / Campaign"
          value={(data.campaigns.reduce((s, c) => s + c.attempts, 0) / data.campaigns.length).toFixed(2)}
          sub="trades taken per setup"
          color="white"
        />
        <MetricCard
          label="Right Tail Presence"
          value={data.campaigns.filter(c => c.totalR > 25).length}
          sub="campaigns above 25R"
          color="green"
        />
      </div>

      {/* Cumulative R + R Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-[#6e7681] uppercase tracking-wider">Cumulative R by Campaign</p>
            <div className="flex gap-3 text-[10px] text-[#6e7681]">
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-blue-400 inline-block"></span>Running R
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-amber-400 inline-block"></span>Peak
              </span>
            </div>
          </div>
          <CumulativeRChart data={data.campaigns} />
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">R Distribution by Frequency</p>
          <RDistributionChart data={data.rDistribution} />
        </div>
      </div>

      {/* Top campaigns + Worst campaigns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-4">Top Campaigns — Right Tail</p>
          <div className="space-y-2">
            {topCampaigns.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] text-[#6e7681] w-16 shrink-0">Setup {c.setupId}</span>
                <div className="flex-1 bg-[#21262d] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(c.totalR / topCampaigns[0].totalR) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 w-16 text-right">
                  +{c.totalR.toFixed(2)}R
                </span>
                <span className="text-[10px] text-[#6e7681] w-20 text-right">{c.exitReason}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#30363d]">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#6e7681]">Top 1 campaign share of total R</span>
              <span className="text-emerald-400">
                {((topCampaigns[0]?.totalR / data.totalR) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-4">Worst Campaigns</p>
          <div className="space-y-2">
            {worstCampaigns.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] text-[#6e7681] w-16 shrink-0">Setup {c.setupId}</span>
                <div className="flex-1 bg-[#21262d] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${(Math.abs(c.totalR) / Math.abs(worstCampaigns[0].totalR)) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-red-400 w-16 text-right">
                  {c.totalR.toFixed(2)}R
                </span>
                <span className="text-[10px] text-[#6e7681] w-20 text-right">{c.exitReason}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#30363d]">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#6e7681]">Max drawdown duration</span>
              <span className="text-red-400">12 campaigns</span>
            </div>
          </div>
        </div>

      </div>

      {/* Attempts + Exit reasons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">Attempts per Campaign</p>
          <AttemptsChart data={attemptsBuckets} />
          <div className="mt-3 pt-3 border-t border-[#30363d] grid grid-cols-3 gap-2">
            {[
              { label: '1 attempt wins', value: data.campaigns.filter(c => c.attempts === 1 && c.totalR > 0).length, color: 'text-emerald-400' },
              { label: 'Max attempts', value: Math.max(...data.campaigns.map(c => c.attempts)), color: 'text-amber-400' },
              { label: 'Avg attempts', value: (data.campaigns.reduce((s, c) => s + c.attempts, 0) / data.campaigns.length).toFixed(1), color: 'text-blue-400' },
            ].map((m, i) => (
              <div key={i} className="bg-[#0d1117] rounded-lg p-2 text-center">
                <div className="text-[10px] text-[#6e7681] mb-1">{m.label}</div>
                <div className={`text-lg font-bold ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">Exit Reasons</p>
          <ExitReasonsChart data={data.exitReasonsArr} />
          <div className="mt-3 pt-3 border-t border-[#30363d]">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#6e7681]">Most common exit</span>
              <span className="text-white">
                {data.exitReasonsArr.sort((a, b) => b.count - a.count)[0]?.reason}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}