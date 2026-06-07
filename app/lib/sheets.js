const SHEET_ID = '1uUnp--jG7aehOaGYHMumLSa0q71yiuJfSRLqM1z0UXs';

const SHEET_NAMES = {
  tradeExecution: 'Trade_Execution',
  accountA: 'Account_A',
  campaignLog: 'Campaign_Log',
};

async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&range=A1:Z1000`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  const text = await res.text();
  return parseCSV(text);
}

function parseCSV(text) {
  const lines = text.split('\n');
  return lines.map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += line[i];
      }
    }
    values.push(current.trim());
    return values;
  });
}

function toNum(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/[$%R\s]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export async function getDashboardData() {
  const [tradeRows, accountRows, campaignRows, dashboardRows] = await Promise.all([
    fetchSheet(SHEET_NAMES.tradeExecution),
    fetchSheet(SHEET_NAMES.accountA),
    fetchSheet(SHEET_NAMES.campaignLog),
    fetchSheet('Dashboard'),
  ]);

  // ── TRADES ────────────────────────────────────────────────────────────────
  const trades = tradeRows.slice(8).filter(r => r[1] && r[4]).map(r => ({
    date: r[1],
    setupId: toNum(r[2]),
    tradeNo: toNum(r[3]),
    tradeId: r[4],
    asset: r[6],
    regime: r[7],
    order: r[8],
    gainedR: toNum(r[15]),
    status: r[16],
    wonLost: r[17],
  }));

  // ── ACCOUNT_A ─────────────────────────────────────────────────────────────
  const accountDataRows = accountRows.slice(10).filter(r => r[1]);
  const equityCurve = accountDataRows.map(r => ({
    tradeId: r[1],
    date: r[2],
    closedPL: toNum(r[10]),
    closedBalance: toNum(r[12]) || toNum(r[13]),
    adjustedEquity: toNum(r[15]),
    runningPeak: toNum(r[16]),
    drawdown: toNum(r[17]),
    rMultiple: toNum(r[18]),
  }));

  const firstRow = accountDataRows[0];
  const startingBalance = firstRow ? toNum(firstRow[4]) : 50.07;
  const lastRow = accountDataRows[accountDataRows.length - 1];
  const currentBalance = lastRow ? toNum(lastRow[12]) : 50.07;
  const roi = currentBalance > 0 ? ((currentBalance - startingBalance) / startingBalance) * 100 : 0;

  // Pull key metrics directly from Dashboard sheet
  // D11 = current balance (row 4, col D = index 3)
  // D16 = current drawdown (row 6, col D = index 3)  
  // D23 = avg growth per campaign % (row 13, col D = index 3)
  // S13 = avg return per campaign R (row 4, col S = index 18)
  // S15 = est campaigns to goal (row 6, col S = index 18)
  const dashCurrentDrawdown = toNum(dashboardRows[5]?.[3]);
  const dashGrowthPerCampaign = toNum(dashboardRows[12]?.[3]) || 0.2919;
  const dashAvgReturnR = toNum(dashboardRows[3]?.[18]) || 3.28;
  const dashEstCampaigns = toNum(dashboardRows[5]?.[18]) || null;
  const allDrawdowns = equityCurve.map(r => r.drawdown).filter(d => d !== 0);
  const maxDrawdown = allDrawdowns.length > 0 ? Math.min(...allDrawdowns) : 0;
  const currentDrawdown = equityCurve[equityCurve.length - 1]?.drawdown || 0;
  const quarterlyGoal = 5000;
  const peakEquity = Math.max(...equityCurve.map(r => r.closedBalance));

  // Daily P/L — group trades by date
  const dailyPLMap = {};
  equityCurve.forEach(r => {
    if (!r.date || !r.closedPL) return;
    if (!dailyPLMap[r.date]) dailyPLMap[r.date] = 0;
    dailyPLMap[r.date] += r.closedPL;
  });
  const dailyPLArr = Object.entries(dailyPLMap).map(([date, pl]) => ({ date, pl }));
  const dailyPLValues = dailyPLArr.map(d => d.pl);
  const avgDailyPL = dailyPLValues.length > 0
    ? dailyPLValues.reduce((s, v) => s + v, 0) / dailyPLValues.length
    : 0;
  const dailyPLStdDev = dailyPLValues.length > 1
    ? Math.sqrt(dailyPLValues.reduce((s, v) => s + Math.pow(v - avgDailyPL, 2), 0) / dailyPLValues.length)
    : 0;

  // Drawdown distribution buckets (per trade %)
  const ddBuckets = [
    { label: '0% to -2%',   min: -2,   max: 0,    color: '#3fb950' },
    { label: '-2% to -5%',  min: -5,   max: -2,   color: '#d29922' },
    { label: '-5% to -10%', min: -10,  max: -5,   color: '#f0883e' },
    { label: 'Below -10%',  min: -100, max: -10,  color: '#f85149' },
  ];
  const drawdownDistribution = ddBuckets.map(b => ({
    label: b.label,
    color: b.color,
    count: equityCurve.filter(r => r.drawdown <= b.max && r.drawdown > b.min).length,
  }));

  // Avg drawdown
  const avgDrawdown = allDrawdowns.length > 0
    ? allDrawdowns.reduce((s, d) => s + d, 0) / allDrawdowns.length
    : 0;

  // Ulcer Index = sqrt(mean of squared drawdowns)
  const ulcerIndex = allDrawdowns.length > 0
    ? Math.sqrt(allDrawdowns.reduce((s, d) => s + d * d, 0) / allDrawdowns.length)
    : 0;

  // Daily performance (Mon-Fri)
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dailyPerf = days.map((day, i) => {
    const row = accountRows[2 + i] || [];
    return {
      day,
      trades:  toNum(row[11]),
      winrate: toNum(row[12]),
      avgWin:  toNum(row[13]),
      avgLoss: toNum(row[20]),
      avgPL:   toNum(row[21]),
    };
  });

  // ── CAMPAIGNS ─────────────────────────────────────────────────────────────
  const rawCampaigns = campaignRows.slice(1)
    .filter(r => r[1] && toNum(r[1]) > 0)
    .map(r => ({
      setupId:          toNum(r[1]),
      maxR:             toNum(r[2]),
      avgAttemptR:      toNum(r[3]),
      totalR:           toNum(r[4]),
      attempts:         toNum(r[5]),
      cumulativeR:      toNum(r[6]),
      runningPeak:      toNum(r[7]),
      drawdown:         Math.abs(toNum(r[8])),
      drawdownDuration: toNum(r[9]),
      exitReason:       r[11] || '',
    }));

  // Attach date and regime from first trade of each setup
  const campaigns = rawCampaigns.map(c => {
    const firstTrade = trades.find(t => t.setupId === c.setupId);
    return {
      ...c,
      date:   firstTrade?.date   || '',
      regime: firstTrade?.regime || '',
    };
  });

  const wonCampaigns  = campaigns.filter(c => c.totalR > 0);
  const lostCampaigns = campaigns.filter(c => c.totalR <= 0);
  const campaignWinRate = campaigns.length > 0
    ? (wonCampaigns.length / campaigns.length) * 100
    : 0;
  const avgWinR  = wonCampaigns.length > 0
    ? wonCampaigns.reduce((s, c) => s + c.totalR, 0) / wonCampaigns.length : 0;
  const avgLossR = lostCampaigns.length > 0
    ? lostCampaigns.reduce((s, c) => s + c.totalR, 0) / lostCampaigns.length : 0;
  const totalR = campaigns.length > 0
    ? campaigns[campaigns.length - 1].cumulativeR : 0;
  const payoffRatio = avgLossR !== 0 ? Math.abs(avgWinR / avgLossR) : 0;
  const maxCampaignDD = Math.max(...campaigns.map(c => Math.abs(c.drawdown)));
  const recoveryFactor = maxCampaignDD > 0 ? totalR / maxCampaignDD : 0;

  // Calmar Ratio = totalR / maxCampaignDD
  const calmarRatio = maxCampaignDD > 0 ? totalR / maxCampaignDD : 0;

  // Risk of Ruin (simplified Kelly-based formula)
  const winRate = wonCampaigns.length / campaigns.length;
  const lossRate = 1 - winRate;
  const riskOfRuin = winRate > 0 && lossRate > 0 && Math.abs(avgLossR) > 0
    ? Math.pow(Math.abs(avgLossR) / avgWinR, totalR / Math.abs(avgLossR)) * 100
    : 0;

  // Campaign consecutive W/L sequence
  const campaignWL = campaigns.map(c => c.totalR > 0 ? 'W' : 'L');
  let maxCampaignStreak = 0;
  let runningCampaignStreak = 0;
  campaignWL.forEach(s => {
    if (s === 'L') {
      runningCampaignStreak++;
      maxCampaignStreak = Math.max(maxCampaignStreak, runningCampaignStreak);
    } else runningCampaignStreak = 0;
  });
  let currentStreak = 0;
  for (let i = campaignWL.length - 1; i >= 0; i--) {
    if (campaignWL[i] === 'L') currentStreak++;
    else break;
  }

  // Consecutive wins/losses by month for chart
  const monthlyWL = {};
  campaigns.forEach(c => {
    // Use setupId to roughly group — we'll use trade dates instead
  });
  // Group trades by month for consecutive chart
  const tradesByMonth = {};
  equityCurve.forEach(r => {
    if (!r.date) return;
    const month = r.date.split(' ').slice(1, 3).join(' '); // "30 March" -> month name
    const monthKey = r.date.includes('March') ? 'Mar'
      : r.date.includes('April') ? 'Apr'
      : r.date.includes('May') ? 'May' : 'Other';
    if (!tradesByMonth[monthKey]) tradesByMonth[monthKey] = { wins: 0, losses: 0 };
    if (r.rMultiple > 0) tradesByMonth[monthKey].wins++;
    else if (r.rMultiple < 0) tradesByMonth[monthKey].losses++;
  });
  const consecutiveWLData = Object.entries(tradesByMonth).map(([month, v]) => ({
    month, wins: v.wins, losses: -v.losses,
  }));

  // R Multiple distribution
  const rMultiples = equityCurve.map(r => r.rMultiple).filter(r => r !== 0);
  const rBuckets = [
    { label: '0-0.5R',   min: 0,   max: 0.5  },
    { label: '0.5-1R',   min: 0.5, max: 1    },
    { label: '1-1.5R',   min: 1,   max: 1.5  },
    { label: '1.5-2R',   min: 1.5, max: 2    },
    { label: '2R+',      min: 2,   max: 999  },
    { label: '-1R to 0', min: -1,  max: 0    },
    { label: 'Below -1R',min: -999,max: -1   },
  ];

  // Return/Risk donut data
  const returnRiskDonut = [
    { label: '2R+',      color: '#3fb950', count: rMultiples.filter(r => r >= 2).length },
    { label: '1R to 2R', color: '#56d364', count: rMultiples.filter(r => r >= 1 && r < 2).length },
    { label: '0R to 1R', color: '#d29922', count: rMultiples.filter(r => r >= 0 && r < 1).length },
    { label: '-1R to 0R',color: '#f0883e', count: rMultiples.filter(r => r >= -1 && r < 0).length },
    { label: 'Below -1R',color: '#f85149', count: rMultiples.filter(r => r < -1).length },
  ];
  const avgRMultiple = rMultiples.length > 0
    ? rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length : 0;

  // Large trades breakdown table
  const largeTradeBuckets = [
    { range: '2R+',       min: 2,    max: 999  },
    { range: '1R to 2R',  min: 1,    max: 2    },
    { range: '0R to 1R',  min: 0,    max: 1    },
    { range: '-1R to 0R', min: -1,   max: 0    },
    { range: 'Below -1R', min: -999, max: -1   },
  ];
  const largeTrades = largeTradeBuckets.map(b => {
    const bucket = equityCurve.filter(r => r.rMultiple > b.min && r.rMultiple <= b.max);
    const wins = bucket.filter(r => r.rMultiple > 0);
    const totalPL = bucket.reduce((s, r) => s + r.closedPL, 0);
    const avgPL = bucket.length > 0 ? totalPL / bucket.length : 0;
    const totalBucketR = bucket.reduce((s, r) => s + r.rMultiple, 0);
    return {
      range: b.range,
      trades: bucket.length,
      winRate: bucket.length > 0 ? (wins.length / bucket.length) * 100 : 0,
      avgPL: parseFloat(avgPL.toFixed(2)),
      totalR: parseFloat(totalBucketR.toFixed(2)),
    };
  });

 // Risk per campaign distribution
  const campaignRBuckets = [
    { label: '< -3R',     min: -999, max: -3  },
    { label: '-3 to -2R', min: -3,   max: -2  },
    { label: '-2 to -1R', min: -2,   max: -1  },
    { label: '-1 to 0R',  min: -1,   max: 0   },
    { label: '0 to 5R',   min: 0,    max: 5   },
    { label: '5 to 15R',  min: 5,    max: 15  },
    { label: '15R+',      min: 15,   max: 999 },
  ];
  const riskPerCampaign = campaignRBuckets.map(b => ({
    label: b.label,
    count: campaigns.filter(c => c.totalR > b.min && c.totalR <= b.max).length,
  }));

  // R distribution
  const rBands = [
    { label: '< -3R',     min: -999, max: -3,  isWin: false },
    { label: '-3 to -2R', min: -3,   max: -2,  isWin: false },
    { label: '-2 to 0R',  min: -2,   max: 0,   isWin: false },
    { label: '0 to 2R',   min: 0,    max: 2,   isWin: true  },
    { label: '2 to 6R',   min: 2,    max: 6,   isWin: true  },
    { label: '6 to 12R',  min: 6,    max: 12,  isWin: true  },
    { label: '12 to 25R', min: 12,   max: 25,  isWin: true  },
    { label: '> 25R',     min: 25,   max: 999, isWin: true  },
  ];
  const rDistribution = rBands.map(band => ({
    label: band.label,
    count: campaigns.filter(c => c.totalR > band.min && c.totalR <= band.max).length,
    isWin: band.isWin,
  }));

  // Regime breakdown
  const regimes = ['Normal', 'Compression', 'Expansion'];
  const regimeData = regimes.map(regime => {
    const rt = trades.filter(t => t.regime === regime);
    const wins = rt.filter(t => t.wonLost === 'W');
    const totalRegimeR = rt.reduce((s, t) => s + t.gainedR, 0);
    return {
      regime,
      trades:  rt.length,
      totalR:  parseFloat(totalRegimeR.toFixed(2)),
      avgR:    rt.length > 0 ? parseFloat((totalRegimeR / rt.length).toFixed(3)) : 0,
      winRate: rt.length > 0 ? (wins.length / rt.length) * 100 : 0,
    };
  });

  // Exit reasons
  const exitReasons = {};
  campaigns.forEach(c => {
    if (c.exitReason) exitReasons[c.exitReason] = (exitReasons[c.exitReason] || 0) + 1;
  });
  const exitReasonsArr = Object.entries(exitReasons)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const topCampaigns = [...campaigns]
    .filter(c => c.totalR > 0)
    .sort((a, b) => b.totalR - a.totalR)
    .slice(0, 8);

  // Convexity metrics
  const sortedByR = [...campaigns].sort((a, b) => b.totalR - a.totalR);
  const top1Contribution = totalR > 0 && sortedByR[0]
    ? (sortedByR[0].totalR / totalR) * 100 : 0;
  const top3Contribution = totalR > 0
    ? (sortedByR.slice(0, 3).reduce((s, c) => s + c.totalR, 0) / totalR) * 100 : 0;
  const rightTailCampaigns = campaigns.filter(c => c.totalR > 30).length;
  const skewness = (() => {
    const mean = campaigns.reduce((s, c) => s + c.totalR, 0) / campaigns.length;
    const std = Math.sqrt(campaigns.reduce((s, c) => s + Math.pow(c.totalR - mean, 2), 0) / campaigns.length);
    const skew = std > 0
      ? campaigns.reduce((s, c) => s + Math.pow((c.totalR - mean) / std, 3), 0) / campaigns.length
      : 0;
    return parseFloat(skew.toFixed(2));
  })();
  const convexityLabel = top1Contribution > 50 ? 'Highly Convex'
    : top3Contribution > 70 ? 'Convex' : 'Moderate';

  // Distribution intelligence
  const sortedR = [...campaigns].map(c => c.totalR).sort((a, b) => a - b);
  const medianR = sortedR.length > 0
    ? sortedR.length % 2 === 0
      ? (sortedR[sortedR.length/2 - 1] + sortedR[sortedR.length/2]) / 2
      : sortedR[Math.floor(sortedR.length/2)]
    : 0;

  // Return attribution donut
  const returnAttribution = [
    { label: 'Right Tail (>30R)', color: '#8b5cf6', campaigns: campaigns.filter(c => c.totalR > 30), threshold: '>30R' },
    { label: 'Normal Winners', color: '#3b82f6', campaigns: campaigns.filter(c => c.totalR > 5 && c.totalR <= 30), threshold: '5-30R' },
    { label: 'Breakeven (0-5R)', color: '#3fb950', campaigns: campaigns.filter(c => c.totalR >= 0 && c.totalR <= 5), threshold: '0-5R' },
    { label: 'Losing', color: '#f85149', campaigns: campaigns.filter(c => c.totalR < 0), threshold: '<0R' },
  ].map(g => ({
    label: g.label,
    color: g.color,
    count: g.campaigns.length,
    totalR: parseFloat(g.campaigns.reduce((s, c) => s + c.totalR, 0).toFixed(2)),
    pct: totalR !== 0
      ? parseFloat((g.campaigns.reduce((s, c) => s + c.totalR, 0) / Math.abs(totalR) * 100).toFixed(1))
      : 0,
  }));

  // R distribution with corrected bands
  const rBandsNew = [
    { label: '< -2R',     min: -999, max: -2,  isWin: false },
    { label: '-2 to 0R',  min: -2,   max: 0,   isWin: false },
    { label: '0 to 1R',   min: 0,    max: 1,   isWin: true  },
    { label: '1 to 5R',   min: 1,    max: 5,   isWin: true  },
    { label: '5 to 10R',  min: 5,    max: 10,  isWin: true  },
    { label: '10 to 15R', min: 10,   max: 15,  isWin: true  },
    { label: '15 to 25R', min: 15,   max: 25,  isWin: true  },
    { label: '25 to 40R', min: 25,   max: 40,  isWin: true  },
    { label: '> 40R',     min: 40,   max: 999, isWin: true  },
  ];
  const rDistributionNew = rBandsNew.map(band => ({
    label: band.label,
    count: campaigns.filter(c => c.totalR > band.min && c.totalR <= band.max).length,
    isWin: band.isWin,
  }));

  // Attempt efficiency
  const attemptEfficiency = [1, 2, 3, 4, 5].map(n => {
    const subset = campaigns.filter(c => c.attempts === n);
    const wins = subset.filter(c => c.totalR > 0);
    const avgR = subset.length > 0
      ? parseFloat((subset.reduce((s, c) => s + c.totalR, 0) / subset.length).toFixed(2))
      : 0;
    return {
      attempts: n === 5 ? '5+' : String(n),
      campaigns: subset.length,
      winRate: subset.length > 0 ? parseFloat(((wins.length / subset.length) * 100).toFixed(1)) : 0,
      avgR,
    };
  });
  const avgAttemptsPerCampaign = campaigns.length > 0
    ? parseFloat((campaigns.reduce((s, c) => s + c.attempts, 0) / campaigns.length).toFixed(2))
    : 0;

  // Exit reasons with avg R
  const exitReasonStats = {};
  campaigns.forEach(c => {
    if (!c.exitReason) return;
    if (!exitReasonStats[c.exitReason]) exitReasonStats[c.exitReason] = { count: 0, totalR: 0 };
    exitReasonStats[c.exitReason].count++;
    exitReasonStats[c.exitReason].totalR += c.totalR;
  });
  const exitReasonsFull = Object.entries(exitReasonStats).map(([reason, stats]) => ({
    reason,
    frequency: stats.count,
    avgR: parseFloat((stats.totalR / stats.count).toFixed(2)),
    totalR: parseFloat(stats.totalR.toFixed(2)),
  })).sort((a, b) => b.frequency - a.frequency);

  // Best and worst campaigns
  const bestCampaigns = [...campaigns].filter(c => c.totalR > 0).sort((a, b) => b.totalR - a.totalR).slice(0, 5);
  const worstCampaigns = [...campaigns].filter(c => c.totalR < 0).sort((a, b) => a.totalR - b.totalR).slice(0, 5);
  const bestWorstRatio = worstCampaigns[0] && Math.abs(worstCampaigns[0].totalR) > 0
    ? parseFloat((bestCampaigns[0]?.totalR / Math.abs(worstCampaigns[0].totalR)).toFixed(1))
    : 0;

  // Profit factor
  const totalWinR = wonCampaigns.reduce((s, c) => s + c.totalR, 0);
  const totalLossR = Math.abs(lostCampaigns.reduce((s, c) => s + c.totalR, 0));
  const profitFactor = totalLossR > 0 ? parseFloat((totalWinR / totalLossR).toFixed(2)) : 0;

  // Max drawdown duration
  const maxDrawdownDuration = Math.max(...campaigns.map(c => c.drawdownDuration), 0);
  const maxDrawdownDurationStart = campaigns.find(c => c.drawdownDuration === maxDrawdownDuration)?.setupId || 0;  
  const rollingAvgR = campaigns.map((c, i) => {
    const window = campaigns.slice(Math.max(0, i - 4), i + 1);
    const avg = window.reduce((s, w) => s + w.totalR, 0) / window.length;
    return { setupId: c.setupId, rollingAvgR: parseFloat(avg.toFixed(3)) };
  });

  // ── RISK HEALTH SCORE ─────────────────────────────────────────────────
  const currentDrawdownPct = Math.abs(toNum(dashboardRows[5]?.[3]) || 0);
  const maxDrawdownPct = Math.abs(maxDrawdown);

  // 1. Drawdown severity (25pts)
  const ddScore = maxDrawdownPct > 0
    ? Math.max(0, 25 * (1 - currentDrawdownPct / maxDrawdownPct))
    : 25;

  // 2. Recovery factor (20pts)
  const rfScore = Math.min(20, (recoveryFactor / 2) * 20);

  // 3. Consecutive loss streak (20pts)
  const streakScore = currentStreak >= 5
    ? 0
    : Math.max(0, 20 * (1 - currentStreak / 5));

  // 4. Edge retention (20pts)
  const lastRolling = rollingAvgR[rollingAvgR.length - 1]?.rollingAvgR || 0;
  const edgeScore = lastRolling >= 1 ? 20
    : lastRolling > 0 ? 10
    : 0;

  // 5. Risk of ruin (15pts)
  const rorPct = Math.max(0, riskOfRuin);
  const rorScore = rorPct < 1 ? 15
    : rorPct < 5 ? 10
    : rorPct < 10 ? 5
    : 0;

  const riskHealthScore = Math.round(ddScore + rfScore + streakScore + edgeScore + rorScore);
  const riskLabel = riskHealthScore >= 70 ? 'Low Risk'
    : riskHealthScore >= 40 ? 'Moderate Risk'
    : 'High Risk';
  const riskLabelColor = riskHealthScore >= 70 ? 'green'
    : riskHealthScore >= 40 ? 'amber'
    : 'red';

  // ── DRAWDOWN METRICS ──────────────────────────────────────────────────
  const maxDrawdownDollar = peakEquity * Math.abs(maxDrawdown) / 100;
  const currentDrawdownDollar = currentBalance * Math.abs(toNum(dashboardRows[5]?.[3]) || 0) / 100;
  const avgDrawdownPct = allDrawdowns.length > 0
    ? allDrawdowns.reduce((s, d) => s + d, 0) / allDrawdowns.length
    : 0;

  // Drawdown periods — group consecutive drawdown trades
  const drawdownPeriods = [];
  let inDD = false;
  let ddStart = 0;
  let ddDepth = 0;
  equityCurve.forEach((r, i) => {
    if (r.drawdown < -1 && !inDD) { inDD = true; ddStart = i; ddDepth = r.drawdown; }
    else if (r.drawdown < ddDepth && inDD) { ddDepth = r.drawdown; }
    else if (r.drawdown >= -0.5 && inDD) {
      drawdownPeriods.push({ start: ddStart, end: i, depth: ddDepth, duration: i - ddStart });
      inDD = false; ddDepth = 0;
    }
  });
  const avgDDDuration = drawdownPeriods.length > 0
    ? parseFloat((drawdownPeriods.reduce((s, d) => s + d.duration, 0) / drawdownPeriods.length).toFixed(1))
    : 0;
  const currentDDRank = drawdownPeriods.length > 0
    ? drawdownPeriods.filter(d => Math.abs(d.depth) >= Math.abs(toNum(dashboardRows[5]?.[3]) || 0)).length
    : 0;

  // Recovery progress
  const recoveryProgress = peakEquity > 0 && currentBalance < peakEquity
    ? parseFloat(((currentBalance - (peakEquity * (1 + maxDrawdown/100))) /
        (peakEquity - (peakEquity * (1 + maxDrawdown/100))) * 100).toFixed(1))
    : 100;

  // ── RECOVERY ANALYSIS ─────────────────────────────────────────────────
  const winningCampaignRs = wonCampaigns.map(c => c.totalR);
  const largestRecovery = winningCampaignRs.length > 0 ? Math.max(...winningCampaignRs) : 0;
  const avgRecovery = winningCampaignRs.length > 0
    ? winningCampaignRs.reduce((s, r) => s + r, 0) / winningCampaignRs.length
    : 0;
  const recoverySuccessRate = campaigns.length > 0
    ? parseFloat(((wonCampaigns.length / campaigns.length) * 100).toFixed(1))
    : 0;
  const estCampaignsToRecover = recoveryFactor > 0 && avgRecovery > 0
    ? Math.ceil(maxCampaignDD / avgRecovery)
    : 0;

  // ── RISK CONCENTRATION ────────────────────────────────────────────────
  const totalLossRabs = Math.abs(lostCampaigns.reduce((s, c) => s + c.totalR, 0));
  const worstCampaignPct = totalLossRabs > 0 && worstCampaigns[0]
    ? parseFloat((Math.abs(worstCampaigns[0].totalR) / totalLossRabs * 100).toFixed(1))
    : 0;
  const top3LossPct = totalLossRabs > 0
    ? parseFloat((worstCampaigns.slice(0, 3).reduce((s, c) => s + Math.abs(c.totalR), 0) / totalLossRabs * 100).toFixed(1))
    : 0;
  const top5LossPct = totalLossRabs > 0
    ? parseFloat((worstCampaigns.slice(0, 5).reduce((s, c) => s + Math.abs(c.totalR), 0) / totalLossRabs * 100).toFixed(1))
    : 0;
  const topWinnerPct = totalR > 0 && wonCampaigns[0]
    ? parseFloat((Math.max(...wonCampaigns.map(c => c.totalR)) / totalR * 100).toFixed(1))
    : 0;
  const lossGainRatio = totalR > 0
    ? parseFloat((totalLossRabs / totalR).toFixed(1))
    : 0;

  // ── RISK ATTRIBUTION ──────────────────────────────────────────────────
  const totalLossAbsR = Math.abs(lostCampaigns.reduce((s,c) => s + c.totalR, 0));
  const riskAttribution = (() => {
    // By exit reason
    const byReason = {};
    lostCampaigns.forEach(c => {
      if (!c.exitReason) return;
      if (!byReason[c.exitReason]) byReason[c.exitReason] = 0;
      byReason[c.exitReason] += Math.abs(c.totalR);
    });
    return Object.entries(byReason)
      .map(([reason, lossR]) => ({
        reason,
        lossR: parseFloat(lossR.toFixed(2)),
        pct: totalLossAbsR > 0 ? parseFloat((lossR / totalLossAbsR * 100).toFixed(0)) : 0,
      }))
      .sort((a, b) => b.lossR - a.lossR);
  })();

  // ── FORWARD RISK OUTLOOK ──────────────────────────────────────────────
  const expectedDDLow = parseFloat((avgDrawdownPct * 0.8).toFixed(1));
  const expectedDDHigh = parseFloat((maxDrawdown * 1.1).toFixed(1));
  const projectedRecoveryLow = Math.max(1, Math.round(avgDDDuration * 0.8));
  const projectedRecoveryHigh = Math.round(avgDDDuration * 1.3);
  const rollingTrend = rollingAvgR.length >= 3
    ? rollingAvgR[rollingAvgR.length-1].rollingAvgR - rollingAvgR[rollingAvgR.length-3].rollingAvgR
    : 0;
  const edgeStability = rollingTrend > 0.5 ? 'Improving'
    : rollingTrend > -0.5 ? 'Stable'
    : 'Deteriorating';
  const edgeStabilityColor = rollingTrend > 0.5 ? 'green'
    : rollingTrend > -0.5 ? 'amber'
    : 'red';

  // ── SYSTEM RESILIENCE ─────────────────────────────────────────────────
  const survivalProbability = Math.max(0, 100 - Math.max(0, riskOfRuin)).toFixed(2);
  const capitalAtRisk = Math.abs(toNum(dashboardRows[5]?.[3]) || 0);
  const recoveryCapabilityLabel = recoveryFactor >= 1.5 ? 'Strong'
    : recoveryFactor >= 1 ? 'Moderate'
    : recoveryFactor > 0 ? 'Weak'
    : 'None';
  const recoveryCapabilityColor = recoveryFactor >= 1.5 ? 'green'
    : recoveryFactor >= 1 ? 'amber'
    : 'red';

  return {
    startingBalance,
    currentBalance,
    roi,
    maxDrawdown,
    currentDrawdown: dashCurrentDrawdown || currentDrawdown,
    avgDrawdown,
    avgReturnPerCampaign: dashAvgReturnR,
    avgGrowthPerCampaign: dashGrowthPerCampaign,
    estCampaignsToGoal: dashEstCampaigns,
    peakEquity,
    quarterlyGoal,
    progressToGoal: (currentBalance / quarterlyGoal) * 100,
    ulcerIndex,
    calmarRatio,
    riskOfRuin,
    dailyPLStdDev,
    dailyPLArr,
    drawdownDistribution,

    totalTrades: trades.length,
    tradeWinRate: trades.length > 0
      ? (trades.filter(t => t.wonLost === 'W').length / trades.length) * 100 : 0,

    totalCampaigns:  campaigns.length,
    wonCampaigns:    wonCampaigns.length,
    lostCampaigns:   lostCampaigns.length,
    campaignWinRate,
    avgWinR,
    avgLossR,
    totalR,
    payoffRatio,
    maxCampaignDD,
    recoveryFactor,
    calmarRatio,
    maxCampaignStreak,
    currentStreak,
    alertThreshold: 5,
    avgRMultiple,
    returnRiskDonut,
    riskPerCampaign,
    largeTrades,
    consecutiveWLData,

    equityCurve,
    rDistribution,
    regimeData,
    dailyPerf,
    campaigns,
    topCampaigns,
    exitReasonsArr,
    exitReasonsFull,
    rollingAvgR,
    riskHealthScore,
    riskLabel,
    riskLabelColor,
    maxDrawdownDollar,
    currentDrawdownDollar,
    avgDrawdownPct,
    avgDDDuration,
    currentDDRank,
    drawdownPeriodsCount: drawdownPeriods.length,
    recoveryProgress: Math.max(0, Math.min(100, recoveryProgress)),
    largestRecovery,
    avgRecovery,
    recoverySuccessRate,
    estCampaignsToRecover,
    worstCampaignPct,
    top3LossPct,
    top5LossPct,
    topWinnerPct,
    lossGainRatio,
    riskAttribution,
    expectedDDLow,
    expectedDDHigh,
    projectedRecoveryLow,
    projectedRecoveryHigh,
    edgeStability,
    edgeStabilityColor,
    survivalProbability,
    capitalAtRisk,
    recoveryCapabilityLabel,
    recoveryCapabilityColor,
    currentDrawdownPct: parseFloat(currentDrawdownPct.toFixed(2)),
    skewness,
    top1Contribution: parseFloat(top1Contribution.toFixed(1)),
    top3Contribution: parseFloat(top3Contribution.toFixed(1)),
    rightTailCampaigns,
    convexityLabel,
    medianR: parseFloat(medianR.toFixed(2)),
    returnAttribution,
    rDistributionNew,
    attemptEfficiency,
    avgAttemptsPerCampaign,
    bestCampaigns,
    worstCampaigns,
    bestWorstRatio,
    profitFactor,
    maxDrawdownDuration,
    maxDrawdownDurationStart,
  };
}