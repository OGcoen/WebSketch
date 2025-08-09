import type { CandleData } from "@shared/schema";
import type { GridLevel } from "./grid-calculations";

export interface ChartDataPoint {
  x: string | number;
  y: number;
  o?: number; // open
  h?: number; // high
  l?: number; // low
  c?: number; // close
}

export function formatCandlestickData(candles: CandleData[]): ChartDataPoint[] {
  return candles.map(candle => ({
    x: candle.date,
    o: candle.open,
    h: candle.high,
    l: candle.low,
    c: candle.close,
    y: candle.close, // For line chart fallback
  }));
}

export function formatLineData(values: number[], labels: string[]): ChartDataPoint[] {
  return values.map((value, index) => ({
    x: labels[index] || index,
    y: value,
  }));
}

export function getChartOptions(type: 'candlestick' | 'line', theme: 'dark' = 'dark') {
  const isDark = theme === 'dark';
  
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDark ? '#e2e8f0' : '#1e293b',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
        },
        grid: {
          color: isDark ? '#334155' : '#e2e8f0',
          drawBorder: false,
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
        },
      },
      y: {
        grid: {
          color: isDark ? '#334155' : '#e2e8f0',
          drawBorder: false,
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
        },
      },
    },
  };

  return baseOptions;
}

export function formatNumber(value: number, decimals: number = 4): string {
  if (!isFinite(value)) return '-';
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals > 0 ? Math.min(2, decimals) : 0,
  });
}

export function formatPercentage(value: number, decimals: number = 2): string {
  if (!isFinite(value)) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(decimals)}%`;
}

export function formatCurrency(value: number, currency: string = 'USD'): string {
  if (!isFinite(value)) return '-';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function getPriceColorClass(current: number, previous: number): string {
  if (current > previous) return 'positive';
  if (current < previous) return 'negative';
  return '';
}

export function calculatePriceBounds(candles: CandleData[], gridLevels: GridLevel[], padding: number = 0.08) {
  const prices: number[] = [];
  
  // Add candle prices
  candles.forEach(candle => {
    prices.push(candle.high, candle.low);
  });
  
  // Add grid level prices
  gridLevels.forEach(level => {
    prices.push(level.price);
  });
  
  if (prices.length === 0) return { min: 0, max: 100 };
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  const paddingAmount = range * padding;
  
  return {
    min: min - paddingAmount,
    max: max + paddingAmount,
  };
}

export function filterDataByTimeframe(data: any[], timeframe: string): any[] {
  if (timeframe === 'MAX' || timeframe === '0') return data;
  
  const days = parseInt(timeframe.replace(/[^\d]/g, ''));
  if (isNaN(days)) return data;
  
  return data.slice(-days);
}

export function getTimeframeLabel(timeframe: string): string {
  switch (timeframe) {
    case '30': case '1M': return '1M';
    case '90': case '3M': return '3M';
    case '365': case '1Y': return '1Y';
    case '0': case 'MAX': return 'MAX';
    default: return timeframe;
  }
}
