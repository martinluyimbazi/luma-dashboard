export function parseDate(dateStr) {
  if (!dateStr) return null;
  const months = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
  };
  const parts = dateStr.trim().split(' ');
  if (parts.length >= 4) {
    const day = parseInt(parts[1]);
    const month = months[parts[2]];
    const year = parseInt(parts[3]);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function filterEquityCurve(equityCurve, filters) {
  return equityCurve.filter(r => {
    // Date range filter
    if (filters.dateRange) {
      const { from, to } = filters.dateRange;
      if (from || to) {
        const d = parseDate(r.date);
        if (d) {
          if (from && d < new Date(from)) return false;
          if (to && d > new Date(to)) return false;
        }
      }
    }
    return true;
  });
}

export function filterCampaigns(campaigns, filters) {
  return campaigns.filter(c => {
    // Date range filter — use first trade date approximation via setupId
    if (filters.dateRange) {
      const { from, to } = filters.dateRange;
      if ((from || to) && c.date) {
        const d = parseDate(c.date);
        if (d) {
          if (from && d < new Date(from)) return false;
          if (to && d > new Date(to)) return false;
        }
      }
    }
    // Outcome filter
    if (filters.outcome && filters.outcome !== 'all') {
      if (filters.outcome === 'won' && c.totalR <= 0) return false;
      if (filters.outcome === 'lost' && c.totalR > 0) return false;
    }
    return true;
  });
}

export function computeMetrics(campaigns, equityCurve) {
  const wonCampaigns  = campaigns.filter(c => c.totalR > 0);
  const lostCampaigns = campaigns.filter(c => c.totalR <= 0);
  const campaignWinRate = campaigns.length > 0
    ? (wonCampaigns.length / campaigns.length) * 100 : 0;
  const avgWinR = wonCampaigns.length > 0
    ? wonCampaigns.reduce((s, c) => s + c.totalR, 0) / wonCampaigns.length : 0;
  const avgLossR = lostCampaigns.length > 0
    ? lostCampaigns.reduce((s, c) => s + c.totalR, 0) / lostCampaigns.length : 0;

  // Total R from last campaign's cumulative
  const totalR = campaigns.length > 0
    ? campaigns[campaigns.length - 1]?.cumulativeR || 0 : 0;

  const payoffRatio = avgLossR !== 0 ? Math.abs(avgWinR / avgLossR) : 0;

  const allDrawdowns = equityCurve.map(r => r.drawdown).filter(d => d !== 0);
  const maxDrawdown = allDrawdowns.length > 0 ? Math.min(...allDrawdowns) : 0;

  const currentBalance = equityCurve.length > 0
    ? equityCurve[equityCurve.length - 1].closedBalance : 0;

  return {
    wonCampaigns:     wonCampaigns.length,
    lostCampaigns:    lostCampaigns.length,
    campaignWinRate,
    avgWinR,
    avgLossR,
    totalR,
    payoffRatio,
    maxDrawdown,
    currentBalance,
  };
}