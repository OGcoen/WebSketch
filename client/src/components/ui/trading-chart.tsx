import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartConfiguration,
  ChartOptions,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface GridLevel {
  price: number;
  contracts: number;
  filled: boolean;
  side: 'buy' | 'sell';
}

interface TradingViewChartProps {
  candles: CandleData[];
  gridLevels: GridLevel[];
  currentPrice: number;
  onChartClick?: (price: number) => void;
  className?: string;
}

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W';

interface TimeframeConfig {
  label: string;
  unit: 'minute' | 'hour' | 'day' | 'week';
  stepSize: number;
}

const TIMEFRAMES: Record<Timeframe, TimeframeConfig> = {
  '1m': { label: '1m', unit: 'minute', stepSize: 1 },
  '5m': { label: '5m', unit: 'minute', stepSize: 5 },
  '15m': { label: '15m', unit: 'minute', stepSize: 15 },
  '1h': { label: '1H', unit: 'hour', stepSize: 1 },
  '4h': { label: '4H', unit: 'hour', stepSize: 4 },
  '1D': { label: '1D', unit: 'day', stepSize: 1 },
  '1W': { label: '1W', unit: 'week', stepSize: 1 },
};

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  candles,
  gridLevels,
  currentPrice,
  onChartClick,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);

  // Calculate price range from candles
  const calculatePriceRange = useCallback(() => {
    if (candles.length === 0) return { min: 0, max: 100 };
    
    const prices = candles.flatMap(candle => [candle.open, candle.high, candle.low, candle.close]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1; // 10% padding
    
    return {
      min: Math.max(0, min - padding),
      max: max + padding,
    };
  }, [candles]);

  // Convert candlestick data to Chart.js format
  const chartData = React.useMemo(() => {
    const processedCandles = candles.map((candle) => ({
      x: new Date(candle.date).getTime(),
      y: candle.close,
    }));

    return {
      datasets: [
        {
          label: 'Price',
          data: processedCandles,
          borderColor: 'rgba(148, 163, 184, 0.8)',
          backgroundColor: 'rgba(148, 163, 184, 0.1)',
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
        },
      ],
    };
  }, [candles]);

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'nearest',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
          },
          label: (context) => {
            const candleIndex = context.dataIndex;
            const candle = candles[candleIndex];
            if (!candle) return `Price: $${context.parsed.y.toFixed(4)}`;
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
        type: 'time',
        time: {
          unit: TIMEFRAMES[selectedTimeframe].unit,
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
          },
        },
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
        },
        ticks: {
          color: '#94a3b8',
          maxTicksLimit: 10,
        },
      },
      y: {
        position: 'right',
        min: priceRange?.min,
        max: priceRange?.max,
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
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
      if (canvasRef.current) {
        canvasRef.current.style.cursor = elements.length > 0 ? 'crosshair' : 'default';
      }
    },
    onClick: (event, activeElements, chart) => {
      if (!onChartClick) return;
      
      const canvas = chart.canvas;
      const rect = canvas.getBoundingClientRect();
      const nativeEvent = event.native as MouseEvent;
      
      if (!nativeEvent) return;
      
      const y = nativeEvent.clientY - rect.top;
      const dataY = chart.scales.y.getValueForPixel(y);
      
      if (typeof dataY === 'number') {
        onChartClick(dataY);
      }
    },
  };

  // Initialize chart
  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: chartData,
      options: chartOptions,
    };

    chartInstance.current = new ChartJS(ctx, config);

    // Custom drawing for grid levels
    const originalDraw = chartInstance.current.draw;
    chartInstance.current.draw = function() {
      originalDraw.call(this);
      
      if (gridLevels.length > 0) {
        const chart = this;
        const ctx = chart.ctx;
        const yScale = chart.scales.y;
        const xScale = chart.scales.x;
        
        // Draw grid levels
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
          
          // Price label
          ctx.fillStyle = level.filled ? 'rgba(34, 197, 94, 0.8)' : 'rgba(148, 163, 184, 0.8)';
          ctx.font = '11px monospace';
          ctx.fillText(`$${level.price.toFixed(4)}`, xScale.right - 80, y - 5);
          
          ctx.restore();
        });
        
        // Draw current price line
        const currentY = yScale.getPixelForValue(currentPrice);
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(xScale.left, currentY);
        ctx.lineTo(xScale.right, currentY);
        ctx.stroke();
        
        // Current price label
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`$${currentPrice.toFixed(4)}`, xScale.right - 80, currentY + 15);
        ctx.restore();
      }
    };

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [chartData, chartOptions, gridLevels, currentPrice, selectedTimeframe, priceRange]);

  // Update price range when candles change
  useEffect(() => {
    const range = calculatePriceRange();
    setPriceRange(range);
  }, [calculatePriceRange]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 10));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.1));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPriceRange(calculatePriceRange());
  };

  return (
    <div className={cn('relative bg-trading-bg-secondary rounded-lg', className)}>
      {/* TradingView-style toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-trading-border-primary bg-trading-bg-panel">
        {/* Timeframe controls */}
        <div className="flex items-center space-x-1">
          <Calendar className="w-4 h-4 text-trading-text-muted mr-2" />
          {Object.entries(TIMEFRAMES).map(([key, config]) => (
            <Button
              key={key}
              variant={selectedTimeframe === key ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'px-3 py-1 text-xs font-medium',
                selectedTimeframe === key
                  ? 'bg-trading-accent-primary text-white'
                  : 'text-trading-text-muted hover:text-trading-text-primary hover:bg-trading-bg-hover'
              )}
              onClick={() => setSelectedTimeframe(key as Timeframe)}
              data-testid={`button-timeframe-${key}`}
            >
              {config.label}
            </Button>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-trading-text-muted hover:text-trading-text-primary"
            onClick={handleZoomIn}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-trading-text-muted hover:text-trading-text-primary"
            onClick={handleZoomOut}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-trading-text-muted hover:text-trading-text-primary"
            onClick={handleResetZoom}
            data-testid="button-reset-zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chart container */}
      <div className="relative" style={{ height: '400px' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          data-testid="trading-chart-canvas"
        />
        
        {/* Price scale indicator */}
        <div className="absolute top-2 right-2 text-xs text-trading-text-muted bg-trading-bg-panel/80 px-2 py-1 rounded">
          {zoomLevel !== 1 && `Zoom: ${(zoomLevel * 100).toFixed(0)}%`}
        </div>
      </div>
    </div>
  );
};