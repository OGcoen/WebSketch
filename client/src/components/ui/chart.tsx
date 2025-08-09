import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  type ChartConfiguration,
  type TooltipItem,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

interface ChartProps {
  data: any;
  options?: any;
  type?: 'line' | 'bar';
  width?: number;
  height?: number;
  className?: string;
}

export function Chart({ data, options, type = 'line', width, height, className }: ChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart
    chartInstance.current = new ChartJS(ctx, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...options,
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, options, type]);

  return (
    <canvas
      ref={chartRef}
      width={width}
      height={height}
      className={className}
      data-testid="chart-canvas"
    />
  );
}

interface CandlestickChartProps {
  candles: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  gridLevels?: Array<{
    price: number;
    contracts: number;
    status: string;
  }>;
  currentPrice?: number;
  onChartClick?: (price: number) => void;
  className?: string;
}

export function CandlestickChart({ 
  candles, 
  gridLevels = [], 
  currentPrice, 
  onChartClick, 
  className 
}: CandlestickChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Prepare candlestick data as line chart with custom drawing
    const candleData = candles.map(candle => ({
      x: candle.date,
      y: candle.close,
      open: candle.open,
      high: candle.high,
      low: candle.low,
    }));

    const data = {
      datasets: [
        {
          label: 'Price',
          data: candleData,
          borderColor: 'hsl(240, 80%, 75%)',
          backgroundColor: 'hsla(240, 80%, 75%, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#cbd5e1',
          borderColor: '#334155',
          borderWidth: 1,
          callbacks: {
            title: (context: TooltipItem<'line'>[]) => {
              const candle = candles[context[0]?.dataIndex];
              return candle ? `Date: ${candle.date}` : '';
            },
            label: (context: TooltipItem<'line'>) => {
              const candle = candles[context.dataIndex];
              if (!candle) return '';
              return [
                `Open: $${candle.open.toFixed(4)}`,
                `High: $${candle.high.toFixed(4)}`,
                `Low: $${candle.low.toFixed(4)}`,
                `Close: $${candle.close.toFixed(4)}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit: 'day' as const,
          },
          grid: {
            color: '#334155',
            drawBorder: false,
          },
          ticks: {
            color: '#94a3b8',
          },
        },
        y: {
          grid: {
            color: '#334155',
            drawBorder: false,
          },
          ticks: {
            color: '#94a3b8',
            callback: function(value: string | number) {
              return '$' + Number(value).toFixed(4);
            },
          },
        },
      },
      onHover: (event, elements) => {
        if (chartRef.current) {
          chartRef.current.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        }
      },
      onClick: (event, activeElements, chart) => {
        if (!onChartClick) return;
        
        // Get the canvas element and event position
        const canvas = chart.canvas;
        const rect = canvas.getBoundingClientRect();
        const nativeEvent = event.native as MouseEvent;
        
        if (!nativeEvent) return;
        
        const x = nativeEvent.clientX - rect.left;
        const y = nativeEvent.clientY - rect.top;
        
        // Convert pixel position to data value
        const dataY = chart.scales.y.getValueForPixel(y);
        
        if (typeof dataY === 'number') {
          onChartClick(dataY);
        }
      },
    };

    chartInstance.current = new ChartJS(ctx, {
      type: 'line',
      data,
      options,
    });

    // Custom drawing for candlesticks and grid levels
    const originalDraw = chartInstance.current.draw;
    chartInstance.current.draw = function() {
      originalDraw.call(this);
      
      const chart = this;
      const ctx = chart.ctx;
      const yScale = chart.scales.y;
      const xScale = chart.scales.x;
      
      // Draw candlesticks if we have candle data
      if (candles && candles.length > 0) {
        candles.forEach((candle, index) => {
          const timestamp = new Date(candle.date).getTime();
          const x = xScale.getPixelForValue(timestamp);
          const openY = yScale.getPixelForValue(candle.open);
          const highY = yScale.getPixelForValue(candle.high);
          const lowY = yScale.getPixelForValue(candle.low);
          const closeY = yScale.getPixelForValue(candle.close);
          
          const isGreen = candle.close >= candle.open;
          const bodyTop = Math.min(openY, closeY);
          const bodyBottom = Math.max(openY, closeY);
          const bodyHeight = Math.abs(closeY - openY);
          
          ctx.save();
          
          // Draw wick (high-low line)
          ctx.strokeStyle = isGreen ? '#22c55e' : '#ef4444';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, highY);
          ctx.lineTo(x, lowY);
          ctx.stroke();
          
          // Draw candlestick body
          const candleWidth = Math.max(3, Math.min(12, (xScale.right - xScale.left) / Math.max(candles.length, 20) * 0.8));
          const halfWidth = candleWidth / 2;
          
          if (bodyHeight > 1) {
            if (isGreen) {
              // Green candle - hollow body
              ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
              ctx.strokeStyle = '#22c55e';
              ctx.lineWidth = 1;
            } else {
              // Red candle - filled body
              ctx.fillStyle = '#ef4444';
              ctx.strokeStyle = '#ef4444';
            }
            
            ctx.fillRect(x - halfWidth, bodyTop, candleWidth, bodyHeight);
            ctx.strokeRect(x - halfWidth, bodyTop, candleWidth, bodyHeight);
          } else {
            // Doji - draw horizontal line for same open/close
            ctx.strokeStyle = isGreen ? '#22c55e' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - halfWidth, openY);
            ctx.lineTo(x + halfWidth, openY);
            ctx.stroke();
          }
          
          ctx.restore();
        });
      }
      
      // Draw grid levels
      if (gridLevels && gridLevels.length > 0) {
        gridLevels.forEach(level => {
          const y = yScale.getPixelForValue(level.price);
          
          ctx.save();
          
          // Line style based on filled status
          if (level.filled) {
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'; // Transparent green for filled
            ctx.lineWidth = 2;
          } else {
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)'; // Gray for unfilled
            ctx.lineWidth = 1;
          }
          
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(xScale.left, y);
          ctx.lineTo(xScale.right, y);
          ctx.stroke();
          
          // Price label with background
          const labelText = `$${level.price.toFixed(4)}`;
          const textWidth = ctx.measureText(labelText).width;
          
          ctx.fillStyle = level.filled 
            ? 'rgba(34, 197, 94, 0.9)' 
            : 'rgba(51, 65, 85, 0.9)';
          ctx.fillRect(xScale.right - textWidth - 12, y - 8, textWidth + 8, 14);
          
          ctx.fillStyle = level.filled ? '#ffffff' : '#e2e8f0';
          ctx.font = '10px monospace';
          ctx.fillText(labelText, xScale.right - textWidth - 8, y + 1);
          
          ctx.restore();
        });
      }
      
      // Draw current price line
      if (currentPrice) {
        const currentY = yScale.getPixelForValue(currentPrice);
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(xScale.left, currentY);
        ctx.lineTo(xScale.right, currentY);
        ctx.stroke();
        
        // Current price label with background
        const priceText = `$${currentPrice.toFixed(4)}`;
        const priceTextWidth = ctx.measureText(priceText).width;
        
        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.fillRect(xScale.right - priceTextWidth - 12, currentY - 8, priceTextWidth + 8, 14);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(priceText, xScale.right - priceTextWidth - 8, currentY + 1);
        ctx.restore();
      }
    };

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [candles, gridLevels, currentPrice, onChartClick]);

  return (
    <canvas
      ref={chartRef}
      className={className}
      data-testid="candlestick-chart"
    />
  );
}
