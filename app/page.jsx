import { getDashboardData } from './lib/sheets';
import MetricCard from './components/MetricCard';
import { EquityChart, RegimeChart, DayOfWeekChart } from './components/ExecutiveCharts';

export default async function ExecutiveDashboard() {
  const data = await getDashboardData();

  const equityData = data.equityCurve.map(r => ({
    name: r.tradeId,
    balance: r.closedBalance,
  }));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Executive Dashboard</h1>
        <span className="text-[11px] text-[#6e7681] bg-[#161b22] border border-[#30363d] px-3 py-1 rounded-full">
          30 Mar 2026 – 21 May 2026
        </span>
      </div>

      {/* Row 1 — Primary metrics: balance first */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Current Balance"
          value={`$${data.currentBalance.toFixed(2)}`}
          sub={`ROI: +${data.roi.toFixed(2)}% from $${data.startingBalance}`}
          color="green"
        />
        <MetricCard
          label="Campaign Win Rate"
          value={data.campaignWinRate.toFixed(1)}
          suffix="%"
          sub={`${data.wonCampaigns} won · ${data.lostCampaigns} lost · ${data.totalCampaigns} total`}
          color="blue"
        />
        <MetricCard
          label="True Expectancy"
          value="+1.06"
          suffix=" R"
          sub="per campaign executed"
          color="green"
        />
        <MetricCard
          label="Payoff Ratio"
          value={data.payoffRatio.toFixed(2)}
          suffix="×"
          sub={`Avg win ${data.avgWinR.toFixed(2)}R · Avg loss ${data.avgLossR.toFixed(2)}R`}
          color="amber"
        />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total R Gained"
          value={data.totalR.toFixed(2)}
          suffix=" R"
          sub="across all campaigns"
          color="blue"
        />
        <MetricCard
          label="Trade Win Rate"
          value={data.tradeWinRate.toFixed(1)}
          suffix="%"
          sub={`${data.totalTrades} total trades (misleading)`}
          color="white"
        />
        <MetricCard
          label="Max Drawdown"
          value={data.maxDrawdown.toFixed(2)}
          suffix="%"
          sub={`Peak equity: $${data.peakEquity.toFixed(2)}`}
          color="red"
        />
        <MetricCard
          label="Progress to Goal"
          value={data.progressToGoal.toFixed(1)}
          suffix="%"
          sub={`$${data.currentBalance.toFixed(2)} of $${data.quarterlyGoal.toLocaleString()}`}
          color="amber"
        />
      </div>

      {/* Equity curve + Regime */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">Capital Growth — Closed Balance (USD)</p>
          <EquityChart data={equityData} />
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">Regime Edge — Avg R</p>
          <RegimeChart data={data.regimeData} />
        </div>
      </div>

      {/* Day of week + Streak + Goal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">Day-of-Week Avg P/L ($)</p>
          <DayOfWeekChart data={data.dailyPerf} />
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">Consecutive Campaign Loss Tracker</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Current Streak', value: data.currentStreak, color: data.currentStreak >= data.alertThreshold ? 'text-red-400' : 'text-emerald-400' },
              { label: 'Alert At', value: data.alertThreshold, color: 'text-amber-400' },
              { label: 'Max Ever', value: data.maxCampaignStreak, color: 'text-[#6e7681]' },
            ].map((m, i) => (
              <div key={i} className="bg-[#0d1117] rounded-lg p-3 text-center">
                <div className="text-[10px] text-[#6e7681] mb-1">{m.label}</div>
                <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>
          <div className={`rounded-lg px-3 py-2 text-[11px] font-medium ${
            data.currentStreak >= data.alertThreshold
              ? 'bg-red-900/30 text-red-400 border border-red-800'
              : 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
          }`}>
            {data.currentStreak >= data.alertThreshold
              ? `⚠ Warning: ${data.currentStreak} consecutive losing campaigns — consider pausing`
              : `✓ Within normal range (${data.currentStreak} consecutive losses)`}
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
          <p className="text-[11px] text-[#6e7681] uppercase tracking-wider mb-3">Progress to Quarterly Goal</p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-blue-400">${data.currentBalance.toFixed(2)}</span>
            <span className="text-[11px] text-[#6e7681]">of ${data.quarterlyGoal.toLocaleString()}</span>
          </div>
          <div className="w-full bg-[#21262d] rounded-full h-2 mb-3">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${Math.min(data.progressToGoal, 100)}%` }}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#6e7681]">Progress</span>
              <span className="text-blue-400">{data.progressToGoal.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#6e7681]">Remaining</span>
              <span className="text-white">${(data.quarterlyGoal - data.currentBalance).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#6e7681]">Est. campaigns to goal</span>
              <span className="text-amber-400">~117</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}