const SHEET_ID = '1uUnp--jG7aehOaGYHMumLSa0q71yiuJfSRLqM1z0UXs';

const SHEET_NAMES = {
  tradeExecution: 'Trade_Execution',
  accountA: 'Account_A',
  campaignLog: 'Campaign_Log',
};

async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
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
  const [tradeRows, accountRows, campaignRows] = await Promise.all([
    fetchSheet(SHEET_NAMES.tradeExecution),
    fetchSheet(SHEET_NAMES.accountA),
    fetchSheet(SHEET_NAMES.campaignLog),
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
  const accountDataRows = accountRows.slice(16).filter(r => r[1]);
  const equityCurve = accountDataRows.map(r => ({
    tradeId: r[1],
    date: r[2],
    closedPL: toNum(r[10]),
    closedBalance: toNum(r[12]),
    adjustedEquity: toNum(r[15]),
    runningPeak: toNum(r[16]),
    drawdown: toNum(r[17]),
    rMultiple: toNum(r[18]),
  }));

  const startingBalance = 50.07;
  const currentBalance = 114.92;
  const roi = 124.20;
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
  const campaigns = campaignRows.slice(1)
    .filter(r => r[1] && toNum(r[1]) > 0)
    .map(r => ({
      setupId:          toNum(r[1]),
      maxR:             toNum(r[2]),
      avgAttemptR:      toNum(r[3]),
      totalR:           toNum(r[4]),
      attempts:         toNum(r[5]),
      cumulativeR:      toNum(r[6]),
      runningPeak:      toNum(r[7]),
      drawdown:         toNum(r[8]),
      drawdownDuration: toNum(r[9]),
      exitReason:       r[11] || '',
    }));

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
  const maxCampaignDD = Math.max(...campaigns.map(c => c.drawdown));
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

  const rollingAvgR = campaigns.map((c, i) => {
    const window = campaigns.slice(Math.max(0, i - 4), i + 1);
    const avg = window.reduce((s, w) => s + w.totalR, 0) / window.length;
    return { setupId: c.setupId, rollingAvgR: parseFloat(avg.toFixed(3)) };
  });

  return {
    startingBalance,
    currentBalance,
    roi,
    maxDrawdown,
    currentDrawdown,
    avgDrawdown,
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
    rollingAvgR,
  };
}