import type { GridCalculationParams, CandleData } from "@shared/schema";

export interface GridLevel {
  level: number;
  price: number;
  contracts: number;
  weight: number;
  status: 'active' | 'partial' | 'filled';
  filled: boolean;
  side: 'buy' | 'sell';
}

export interface PerformanceMetrics {
  currentCapital: number;
  totalReturn: number;
  dailyROI: number;
  monthlyROI: number;
  sharpeRatio: number;
  maxDrawdown: number;
  activeGrids: number;
  filledOrders: number;
  gridEfficiency: number;
  avgSpread: number;
}

export function calculateGridLevels(params: GridCalculationParams): GridLevel[] {
  const { rangeLow, rangeHigh, gridSteps, totalContracts, allocMode, growthFactor, atrPercent, depthExponent, roundToIntegers } = params;
  
  if (rangeHigh <= rangeLow || gridSteps <= 0 || totalContracts <= 0) {
    return [];
  }

  const step = (rangeHigh - rangeLow) / (gridSteps - 1);
  const prices = Array.from({ length: gridSteps }, (_, i) => rangeHigh - i * step);
  
  let weights: number[] = [];
  
  if (allocMode === 'geometric') {
    weights = prices.map((_, i) => Math.pow(growthFactor, i));
  } else {
    // ATR-based allocation
    weights = prices.map((price) => {
      const depthPercent = Math.abs((rangeHigh - price) / Math.max(1e-9, rangeHigh)) * 100;
      const depthUnits = depthPercent / atrPercent;
      return Math.pow(Math.max(0, depthUnits), depthExponent);
    });
  }
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
  const exactContracts = weights.map(w => totalContracts * w / totalWeight);
  
  let contracts = exactContracts.slice();
  if (roundToIntegers) {
    contracts = exactContracts.map(v => Math.floor(v));
    let remaining = totalContracts - contracts.reduce((sum, c) => sum + c, 0);
    
    // Distribute remaining contracts based on fractional parts
    const fractional = exactContracts.map((v, i) => ({ index: i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac || b.index - a.index);
    
    for (let i = 0; i < remaining && i < fractional.length; i++) {
      contracts[fractional[i].index] += 1;
    }
  }
  
  return prices.map((price, i) => ({
    level: i + 1,
    price,
    contracts: Math.round(contracts[i]),
    weight: weights[i],
    status: 'active' as const,
    filled: false,
    side: 'buy' as const,
  }));
}

export function calculateFilledContracts(gridLevels: GridLevel[], currentPrice: number): number {
  return gridLevels
    .filter(level => currentPrice <= level.price)
    .reduce((sum, level) => sum + level.contracts, 0);
}

export function calculatePnLUSD(gridLevels: GridLevel[], currentPrice: number, contractValue: number): number {
  let pnlCoin = 0;
  
  for (const level of gridLevels) {
    if (currentPrice <= level.price) {
      // Filled long entries at level price
      pnlCoin += level.contracts * contractValue * (1/level.price - 1/currentPrice);
    }
  }
  
  return pnlCoin * currentPrice;
}

export function calculateCapitalSeries(candles: CandleData[], gridLevels: GridLevel[], contractValue: number): number[] {
  return candles.map(candle => calculateFilledContracts(gridLevels, candle.close));
}

export function calculateROISeries(candles: CandleData[], gridLevels: GridLevel[], contractValue: number, totalContracts: number): number[] {
  const denominator = totalContracts * contractValue;
  
  return candles.map(candle => {
    if (denominator === 0) return 0;
    const pnl = calculatePnLUSD(gridLevels, candle.close, contractValue);
    return (pnl / denominator) * 100;
  });
}

export function generateSeedCandles(avgPrice: number, days: number, volatility: number): CandleData[] {
  const candles: CandleData[] = [];
  let price = avgPrice;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime());
    date.setDate(startDate.getDate() + i);
    
    const drift = (Math.random() - 0.5) * 0.02; // Small drift
    const amplitude = (0.6 + Math.random() * 0.8) * volatility; // Volatility factor
    
    const open = price;
    const high = open * (1 + 0.01 * amplitude + Math.random() * 0.004);
    const low = open * (1 - 0.01 * amplitude - Math.random() * 0.004);
    const close = low + (high - low) * Math.random();
    
    candles.push({
      date: date.toISOString().slice(0, 10),
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
    });
    
    price = close * (1 + drift);
  }
  
  return candles;
}

export function updateGridLevelStatus(gridLevels: GridLevel[], currentPrice: number): GridLevel[] {
  return gridLevels.map(level => {
    const filled = currentPrice <= level.price;
    return {
      ...level,
      status: filled ? 'filled' : 'active',
      filled: filled
    };
  });
}

export function calculatePerformanceMetrics(
  candles: CandleData[], 
  gridLevels: GridLevel[], 
  contractValue: number, 
  totalContracts: number
): PerformanceMetrics {
  if (candles.length === 0) {
    return {
      currentCapital: 0,
      totalReturn: 0,
      dailyROI: 0,
      monthlyROI: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      activeGrids: gridLevels.length,
      filledOrders: 0,
      gridEfficiency: 0,
      avgSpread: 0,
    };
  }
  
  const roiSeries = calculateROISeries(candles, gridLevels, contractValue, totalContracts);
  const currentPrice = candles[candles.length - 1]?.close || 0;
  const filledContracts = calculateFilledContracts(gridLevels, currentPrice);
  const activeGrids = gridLevels.filter(l => l.status === 'active').length;
  
  // Calculate metrics
  const currentROI = roiSeries[roiSeries.length - 1] || 0;
  const dailyROI = candles.length > 1 ? currentROI / candles.length : 0;
  const monthlyROI = dailyROI * 30;
  
  // Simple Sharpe ratio approximation
  const returns = roiSeries.slice(1).map((roi, i) => roi - roiSeries[i]);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / Math.max(1, returns.length);
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / Math.max(1, returns.length));
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  
  // Max drawdown
  let maxDrawdown = 0;
  let peak = roiSeries[0] || 0;
  for (const roi of roiSeries) {
    if (roi > peak) peak = roi;
    const drawdown = (peak - roi) / Math.max(1, Math.abs(peak)) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  
  // Grid efficiency (percentage of grids that have been filled)
  const filledGrids = gridLevels.filter(l => l.status === 'filled').length;
  const gridEfficiency = gridLevels.length > 0 ? (filledGrids / gridLevels.length) * 100 : 0;
  
  // Average spread between grid levels
  const spreads = gridLevels.slice(1).map((level, i) => 
    Math.abs(level.price - gridLevels[i].price) / gridLevels[i].price * 100
  );
  const avgSpread = spreads.length > 0 ? spreads.reduce((sum, s) => sum + s, 0) / spreads.length : 0;
  
  return {
    currentCapital: totalContracts * contractValue + calculatePnLUSD(gridLevels, currentPrice, contractValue),
    totalReturn: currentROI,
    dailyROI,
    monthlyROI,
    sharpeRatio,
    maxDrawdown,
    activeGrids,
    filledOrders: filledContracts,
    gridEfficiency,
    avgSpread,
  };
}
