import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Chart, CandlestickChart } from '@/components/ui/chart';
import { 
  LineChart, 
  Calculator, 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  Settings, 
  Layers, 
  Scale, 
  Sprout, 
  TrendingUp, 
  Percent, 
  Gauge, 
  Table, 
  BarChart3,
  Edit,
  Circle
} from 'lucide-react';
import {
  calculateGridLevels,
  calculateCapitalSeries,
  calculateROISeries,
  generateSeedCandles,
  updateGridLevelStatus,
  calculatePerformanceMetrics,
  type GridLevel,
} from '@/lib/grid-calculations';
import { formatNumber, formatPercentage, formatCurrency, filterDataByTimeframe, getTimeframeLabel } from '@/lib/chart-utils';
import type { CandleData, GridCalculationParams } from '@shared/schema';

export default function GridLab() {
  // Trading settings state
  const [symbol, setSymbol] = useState('LINKUSD (Coin-M)');
  const [contractValue, setContractValue] = useState(10);
  
  // Grid configuration state
  const [rangeLow, setRangeLow] = useState(10);
  const [rangeHigh, setRangeHigh] = useState(15);
  const [gridSteps, setGridSteps] = useState(12);
  const [totalContracts, setTotalContracts] = useState(200);
  
  // Allocation strategy state
  const [allocMode, setAllocMode] = useState<'geometric' | 'atr'>('geometric');
  const [growthFactor, setGrowthFactor] = useState(1.22);
  const [atrPercent, setAtrPercent] = useState(2.5);
  const [depthExponent, setDepthExponent] = useState(1.8);
  const [roundToIntegers, setRoundToIntegers] = useState(true);
  const [drawMode, setDrawMode] = useState(false);
  
  // Seed data state
  const [seedAvgPrice, setSeedAvgPrice] = useState(13);
  const [seedDays, setSeedDays] = useState(90);
  const [seedVolatility, setSeedVolatility] = useState(0.35);
  
  // Chart interaction state
  const [scrubDay, setScrubDay] = useState(45);
  const [currentPrice, setCurrentPrice] = useState(13.25);
  const [closePrice, setClosePrice] = useState(13.25);
  
  // Timeframe state
  const [capitalTimeframe, setCapitalTimeframe] = useState('1M');
  const [roiTimeframe, setROITimeframe] = useState('1M');
  
  // Data state
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [pendingOpen, setPendingOpen] = useState<number | null>(null);

  // Calculate grid levels
  const gridParams: GridCalculationParams = {
    rangeLow,
    rangeHigh,
    gridSteps,
    totalContracts,
    allocMode,
    growthFactor,
    atrPercent,
    depthExponent,
    roundToIntegers,
  };

  const gridLevels = useMemo(() => {
    const levels = calculateGridLevels(gridParams);
    return updateGridLevelStatus(levels, currentPrice);
  }, [gridParams, currentPrice]);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    return calculatePerformanceMetrics(candles, gridLevels, contractValue, totalContracts);
  }, [candles, gridLevels, contractValue, totalContracts]);

  // Calculate chart data
  const capitalSeries = useMemo(() => {
    return calculateCapitalSeries(candles, gridLevels, contractValue);
  }, [candles, gridLevels, contractValue]);

  const roiSeries = useMemo(() => {
    return calculateROISeries(candles, gridLevels, contractValue, totalContracts);
  }, [candles, gridLevels, contractValue, totalContracts]);

  // Event handlers
  const handleRecalculateAllocation = useCallback(() => {
    // Grid levels are automatically recalculated via useMemo
    console.log('Grid allocation recalculated');
  }, []);

  const handleAddCandle = useCallback(() => {
    const lastCandle = candles[candles.length - 1];
    const date = lastCandle 
      ? new Date(new Date(lastCandle.date).getTime() + 24 * 60 * 60 * 1000)
      : new Date();
    
    const newCandle: CandleData = {
      date: date.toISOString().slice(0, 10),
      open: currentPrice,
      high: currentPrice,
      low: currentPrice,
      close: currentPrice,
    };
    
    setCandles(prev => [...prev, newCandle]);
  }, [candles, currentPrice]);

  const handleClearCandles = useCallback(() => {
    setCandles([]);
    setPendingOpen(null);
    setScrubDay(0);
  }, []);

  const handleGenerateSeedData = useCallback(() => {
    const seedCandles = generateSeedCandles(seedAvgPrice, seedDays, seedVolatility);
    setCandles(seedCandles);
    setScrubDay(Math.max(0, seedCandles.length - 1));
    if (seedCandles.length > 0) {
      setCurrentPrice(seedCandles[seedCandles.length - 1].close);
      setClosePrice(seedCandles[seedCandles.length - 1].close);
    }
  }, [seedAvgPrice, seedDays, seedVolatility]);

  const handleChartClick = useCallback((price: number) => {
    if (!drawMode) return;
    
    if (pendingOpen === null) {
      // Start new candle
      const lastCandle = candles[candles.length - 1];
      const date = lastCandle 
        ? new Date(new Date(lastCandle.date).getTime() + 24 * 60 * 60 * 1000)
        : new Date();
      
      const newCandle: CandleData = {
        date: date.toISOString().slice(0, 10),
        open: price,
        high: price,
        low: price,
        close: price,
      };
      
      setCandles(prev => [...prev, newCandle]);
      setPendingOpen(price);
    } else {
      // Complete candle
      const open = pendingOpen;
      const close = price;
      const high = Math.max(open, close);
      const low = Math.min(open, close);
      
      setCandles(prev => prev.map((candle, i) => 
        i === prev.length - 1 
          ? { ...candle, high, low, close }
          : candle
      ));
      
      setPendingOpen(null);
      setCurrentPrice(close);
      setClosePrice(close);
      setScrubDay(candles.length);
    }
  }, [drawMode, pendingOpen, candles]);

  const handleScrubChange = useCallback((value: number[]) => {
    const day = value[0];
    setScrubDay(day);
    if (candles[day]) {
      setCurrentPrice(candles[day].close);
      setClosePrice(candles[day].close);
    }
  }, [candles]);

  const handleEditCandle = useCallback((index: number) => {
    // TODO: Implement candle editing modal
    console.log('Edit candle at index:', index);
  }, []);

  const handleDeleteCandle = useCallback((index: number) => {
    setCandles(prev => prev.filter((_, i) => i !== index));
    if (scrubDay >= index && scrubDay > 0) {
      setScrubDay(scrubDay - 1);
    }
  }, [scrubDay]);

  const handleExportData = useCallback(() => {
    const data = {
      symbol,
      contractValue,
      gridParams,
      gridLevels,
      candles,
      performanceMetrics,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grid-lab-${symbol.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [symbol, contractValue, gridParams, gridLevels, candles, performanceMetrics]);

  // Prepare chart data
  const capitalChartData = {
    labels: filterDataByTimeframe(candles, capitalTimeframe).map(c => c.date),
    datasets: [{
      label: 'Capital',
      data: filterDataByTimeframe(capitalSeries, capitalTimeframe),
      borderColor: 'hsl(170, 70%, 60%)',
      backgroundColor: 'hsla(170, 70%, 60%, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
    }],
  };

  const roiChartData = {
    labels: filterDataByTimeframe(candles, roiTimeframe).map(c => c.date),
    datasets: [{
      label: 'ROI %',
      data: filterDataByTimeframe(roiSeries, roiTimeframe),
      borderColor: 'hsl(280, 70%, 65%)',
      backgroundColor: 'hsla(280, 70%, 65%, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
    }],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-trading-bg-primary via-trading-bg-secondary to-trading-bg-primary text-trading-text-primary">
      <div className="max-w-7xl mx-auto p-5">
        {/* Hero Header */}
        <header className="hero-gradient glass-card rounded-2xl p-6 mb-4" data-testid="hero-header">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white mb-2 tracking-wide flex items-center">
                <LineChart className="text-trading-accent-primary mr-2" size={24} />
                Coin-M Grid Lab
              </h1>
              <p className="text-trading-text-secondary max-w-3xl">
                Professional grid trading interface with manual candlestick charting, range optimization, and allocation strategies. 
                Real-time capital tracking and ROI visualization for Coin-Margined futures.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={handleExportData} data-testid="button-export-data">
                <Download className="mr-2" size={16} />
                Export Data
              </Button>
              <Button size="sm" className="btn-gradient" data-testid="button-save-config">
                <Save className="mr-2" size={16} />
                Save Config
              </Button>
            </div>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left Panel - Controls */}
          <section className="xl:col-span-3 glass-card rounded-2xl p-5 space-y-6" data-testid="control-panel">
            {/* Trading Settings */}
            <div>
              <h3 className="text-sm font-medium text-trading-text-secondary mb-4 flex items-center">
                <Settings className="text-trading-accent-primary mr-2" size={16} />
                Trading Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="symbol" className="text-xs text-trading-text-muted">Symbol</Label>
                  <Input
                    id="symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary input-focus"
                    data-testid="input-symbol"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contractValue" className="text-xs text-trading-text-muted">Contract Value (USD/contract)</Label>
                  <Input
                    id="contractValue"
                    type="number"
                    step="0.0001"
                    value={contractValue}
                    onChange={(e) => setContractValue(Number(e.target.value))}
                    className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary input-focus"
                    data-testid="input-contract-value"
                  />
                  <p className="text-xs text-trading-text-muted mt-1">Inverse futures multiplier (e.g. 10, 50, 100)</p>
                </div>
              </div>
            </div>

            <Separator className="border-trading-border-primary" />

            {/* Grid Configuration */}
            <div>
              <h3 className="text-sm font-medium text-trading-text-secondary mb-4 flex items-center">
                <Layers className="text-trading-accent-secondary mr-2" size={16} />
                Grid Configuration
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rangeLow" className="text-xs text-trading-text-muted">Range Low</Label>
                    <Input
                      id="rangeLow"
                      type="number"
                      step="0.0001"
                      value={rangeLow}
                      onChange={(e) => setRangeLow(Number(e.target.value))}
                      className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary input-focus"
                      data-testid="input-range-low"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rangeHigh" className="text-xs text-trading-text-muted">Range High</Label>
                    <Input
                      id="rangeHigh"
                      type="number"
                      step="0.0001"
                      value={rangeHigh}
                      onChange={(e) => setRangeHigh(Number(e.target.value))}
                      className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary input-focus"
                      data-testid="input-range-high"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="gridSteps" className="text-xs text-trading-text-muted">Grid Steps (N)</Label>
                    <Input
                      id="gridSteps"
                      type="number"
                      step="1"
                      value={gridSteps}
                      onChange={(e) => setGridSteps(Number(e.target.value))}
                      className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary input-focus"
                      data-testid="input-grid-steps"
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalContracts" className="text-xs text-trading-text-muted">Total Contracts</Label>
                    <Input
                      id="totalContracts"
                      type="number"
                      step="1"
                      value={totalContracts}
                      onChange={(e) => setTotalContracts(Number(e.target.value))}
                      className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary input-focus"
                      data-testid="input-total-contracts"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="border-trading-border-primary" />

            {/* Allocation Strategy */}
            <div>
              <h3 className="text-sm font-medium text-trading-text-secondary mb-4 flex items-center">
                <Scale className="text-chart-roi mr-2" size={16} />
                Allocation Strategy
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="allocMode" className="text-xs text-trading-text-muted">Allocation Mode</Label>
                  <Select value={allocMode} onValueChange={(value: 'geometric' | 'atr') => setAllocMode(value)}>
                    <SelectTrigger className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary" data-testid="select-alloc-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-trading-bg-panel border-trading-border-primary">
                      <SelectItem value="geometric">Geometric (q)</SelectItem>
                      <SelectItem value="atr">ATR Depth (p)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="growthFactor" className="text-xs text-trading-text-muted">Growth Factor (q)</Label>
                    <Input
                      id="growthFactor"
                      type="number"
                      step="0.01"
                      value={growthFactor}
                      onChange={(e) => setGrowthFactor(Number(e.target.value))}
                      className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary input-focus"
                      data-testid="input-growth-factor"
                    />
                    <p className="text-xs text-trading-text-muted mt-1">&gt;1 = heavier bottom allocation</p>
                  </div>
                  <div>
                    <Label htmlFor="atrPercent" className="text-xs text-trading-text-muted">ATR% (Manual)</Label>
                    <Input
                      id="atrPercent"
                      type="number"
                      step="0.01"
                      value={atrPercent}
                      onChange={(e) => setAtrPercent(Number(e.target.value))}
                      className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary input-focus"
                      data-testid="input-atr-percent"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="roundToIntegers"
                      checked={roundToIntegers}
                      onCheckedChange={(checked) => setRoundToIntegers(checked === true)}
                      className="border-trading-border-primary"
                      data-testid="checkbox-round-integers"
                    />
                    <Label htmlFor="roundToIntegers" className="text-sm text-trading-text-primary">
                      Round to whole contracts
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="drawMode"
                      checked={drawMode}
                      onCheckedChange={(checked) => setDrawMode(checked === true)}
                      className="border-trading-border-primary"
                      data-testid="checkbox-draw-mode"
                    />
                    <Label htmlFor="drawMode" className="text-sm text-trading-text-primary">
                      Manual chart drawing mode
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="border-trading-border-primary" />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRecalculateAllocation} className="flex-1 btn-gradient" data-testid="button-recalculate">
                <Calculator className="mr-2" size={16} />
                Recalculate
              </Button>
              <Button onClick={handleAddCandle} variant="outline" className="flex-1" data-testid="button-add-candle">
                <Plus className="mr-2" size={16} />
                Add Candle
              </Button>
              <Button onClick={handleClearCandles} variant="ghost" className="text-trading-text-muted" data-testid="button-clear-candles">
                <Trash2 className="mr-2" size={16} />
                Clear
              </Button>
            </div>

            <Separator className="border-trading-border-primary" />
            
            {/* Seed Data Generation */}
            <div>
              <h3 className="text-sm font-medium text-trading-text-secondary mb-4 flex items-center">
                <Sprout className="text-trading-accent-success mr-2" size={16} />
                Seed Data Generation
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="seedAvgPrice" className="text-xs text-trading-text-muted">Average Price</Label>
                  <Input
                    id="seedAvgPrice"
                    type="number"
                    step="0.0001"
                    value={seedAvgPrice}
                    onChange={(e) => setSeedAvgPrice(Number(e.target.value))}
                    className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary input-focus"
                    data-testid="input-seed-avg-price"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="seedDays" className="text-xs text-trading-text-muted">Days</Label>
                    <Input
                      id="seedDays"
                      type="number"
                      value={seedDays}
                      onChange={(e) => setSeedDays(Number(e.target.value))}
                      className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary input-focus"
                      data-testid="input-seed-days"
                    />
                  </div>
                  <div>
                    <Label htmlFor="seedVolatility" className="text-xs text-trading-text-muted">Volatility</Label>
                    <Input
                      id="seedVolatility"
                      type="number"
                      step="0.05"
                      value={seedVolatility}
                      onChange={(e) => setSeedVolatility(Number(e.target.value))}
                      className="mt-2 bg-trading-bg-panel border-trading-border-primary text-trading-text-primary input-focus"
                      data-testid="input-seed-volatility"
                    />
                  </div>
                </div>
                
                <Button onClick={handleGenerateSeedData} variant="outline" className="w-full" data-testid="button-generate-seed">
                  <Sprout className="mr-2" size={16} />
                  Generate Seed Candles
                </Button>
              </div>
            </div>
          </section>

          {/* Center Panel - Price Chart */}
          <section className="xl:col-span-6 glass-card rounded-2xl p-5" data-testid="price-chart-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-trading-text-secondary flex items-center">
                <BarChart3 className="text-chart-price mr-2" size={16} />
                Price Action & Grid Levels
              </h3>
              <div className="flex items-center space-x-4 text-xs text-trading-text-muted">
                <div className="flex items-center space-x-2">
                  <div className="legend-dot bg-chart-price"></div>
                  <span>1D Candles</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="legend-dot bg-chart-grid"></div>
                  <span>Grid Levels</span>
                </div>
              </div>
            </div>
            
            <div className="chart-container mb-4 relative" style={{ height: '400px' }}>
              <div className="absolute top-2 right-2 text-xs text-trading-text-muted z-10">
                Right axis: contracts per level (green: available, faded: filled)
              </div>
              <CandlestickChart
                candles={candles}
                gridLevels={gridLevels}
                currentPrice={currentPrice}
                onChartClick={handleChartClick}
                className="w-full h-full"
              />
            </div>
            
            {/* Chart Controls */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Label className="text-xs text-trading-text-muted">Scrub Day:</Label>
                <Slider
                  value={[scrubDay]}
                  onValueChange={handleScrubChange}
                  max={Math.max(0, candles.length - 1)}
                  step={1}
                  className="w-32"
                  data-testid="slider-scrub-day"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label className="text-xs text-trading-text-muted">Current Price:</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(Number(e.target.value))}
                  className="bg-trading-bg-panel border-trading-border-primary text-trading-text-primary w-24 h-8 text-xs input-focus"
                  data-testid="input-current-price"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label className="text-xs text-trading-text-muted">Close Price:</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={closePrice}
                  onChange={(e) => setClosePrice(Number(e.target.value))}
                  className="bg-trading-bg-panel border-trading-border-primary text-trading-text-primary w-24 h-8 text-xs input-focus"
                  data-testid="input-close-price"
                />
              </div>
            </div>
          </section>

          {/* Right Panel - Performance */}
          <section className="xl:col-span-3 space-y-4" data-testid="performance-panel">
            {/* Capital Progression */}
            <Card className="glass-card border-trading-border-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-trading-text-secondary flex items-center">
                    <TrendingUp className="text-chart-capital mr-2" size={16} />
                    Capital Progression
                  </CardTitle>
                  <div className="flex bg-trading-bg-panel rounded-lg p-1">
                    {['1M', '3M', '1Y', 'MAX'].map((tf) => (
                      <Button
                        key={tf}
                        variant={capitalTimeframe === tf ? 'default' : 'ghost'}
                        size="sm"
                        className={`px-3 py-1 text-xs rounded ${
                          capitalTimeframe === tf 
                            ? 'bg-trading-accent-primary text-white' 
                            : 'text-trading-text-muted hover:text-trading-text-primary'
                        }`}
                        onClick={() => setCapitalTimeframe(tf)}
                        data-testid={`button-capital-timeframe-${tf}`}
                      >
                        {tf}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="chart-container mb-4" style={{ height: '200px' }}>
                  <Chart data={capitalChartData} type="line" className="w-full h-full" />
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-trading-bg-panel rounded-lg p-3">
                    <div className="text-xs text-trading-text-muted mb-1">Current Capital</div>
                    <div className="kpi-value text-white" data-testid="text-current-capital">
                      {formatCurrency(performanceMetrics.currentCapital)}
                    </div>
                  </div>
                  <div className="bg-trading-bg-panel rounded-lg p-3">
                    <div className="text-xs text-trading-text-muted mb-1">Total Return</div>
                    <div className={`kpi-value ${performanceMetrics.totalReturn >= 0 ? 'positive' : 'negative'}`} data-testid="text-total-return">
                      {formatPercentage(performanceMetrics.totalReturn)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ROI Analysis */}
            <Card className="glass-card border-trading-border-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-trading-text-secondary flex items-center">
                    <Percent className="text-chart-roi mr-2" size={16} />
                    ROI Analysis
                  </CardTitle>
                  <div className="flex bg-trading-bg-panel rounded-lg p-1">
                    {['1M', '3M', '1Y', 'MAX'].map((tf) => (
                      <Button
                        key={tf}
                        variant={roiTimeframe === tf ? 'default' : 'ghost'}
                        size="sm"
                        className={`px-3 py-1 text-xs rounded ${
                          roiTimeframe === tf 
                            ? 'bg-trading-accent-primary text-white' 
                            : 'text-trading-text-muted hover:text-trading-text-primary'
                        }`}
                        onClick={() => setROITimeframe(tf)}
                        data-testid={`button-roi-timeframe-${tf}`}
                      >
                        {tf}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="chart-container mb-4" style={{ height: '200px' }}>
                  <Chart data={roiChartData} type="line" className="w-full h-full" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-trading-text-muted">Daily ROI</span>
                    <span className={`font-mono ${performanceMetrics.dailyROI >= 0 ? 'positive' : 'negative'}`} data-testid="text-daily-roi">
                      {formatPercentage(performanceMetrics.dailyROI)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-trading-text-muted">Monthly ROI</span>
                    <span className={`font-mono ${performanceMetrics.monthlyROI >= 0 ? 'positive' : 'negative'}`} data-testid="text-monthly-roi">
                      {formatPercentage(performanceMetrics.monthlyROI)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-trading-text-muted">Sharpe Ratio</span>
                    <span className="text-white font-mono" data-testid="text-sharpe-ratio">
                      {formatNumber(performanceMetrics.sharpeRatio, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-trading-text-muted">Max Drawdown</span>
                    <span className="negative font-mono" data-testid="text-max-drawdown">
                      -{formatPercentage(performanceMetrics.maxDrawdown)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="glass-card border-trading-border-primary">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium text-trading-text-secondary flex items-center">
                  <Gauge className="text-trading-accent-secondary mr-2" size={16} />
                  Trading Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-trading-text-muted">Active Grids</span>
                    <span className="text-white font-mono" data-testid="text-active-grids">
                      {performanceMetrics.activeGrids}/{gridLevels.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-trading-text-muted">Filled Orders</span>
                    <span className="text-white font-mono" data-testid="text-filled-orders">
                      {performanceMetrics.filledOrders}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-trading-text-muted">Grid Efficiency</span>
                    <span className="positive font-mono" data-testid="text-grid-efficiency">
                      {formatPercentage(performanceMetrics.gridEfficiency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-trading-text-muted">Avg. Spread</span>
                    <span className="text-white font-mono" data-testid="text-avg-spread">
                      {formatPercentage(performanceMetrics.avgSpread)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Bottom Section - Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Grid Allocation Table */}
          <Card className="glass-card border-trading-border-primary" data-testid="grid-allocation-table">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-trading-text-secondary flex items-center">
                <Table className="text-chart-grid mr-2" size={16} />
                Grid Allocation Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm data-table">
                  <thead className="table-header">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium">#</th>
                      <th className="text-left p-3 text-xs font-medium">Price Level</th>
                      <th className="text-right p-3 text-xs font-medium">Contracts</th>
                      <th className="text-right p-3 text-xs font-medium">Weight %</th>
                      <th className="text-center p-3 text-xs font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-trading-text-primary">
                    {gridLevels.map((level) => (
                      <tr key={level.level} data-testid={`row-grid-level-${level.level}`}>
                        <td className="p-3 font-mono text-trading-text-muted">{level.level}</td>
                        <td className="p-3 font-mono">${formatNumber(level.price)}</td>
                        <td className="p-3 font-mono text-right">{level.contracts}</td>
                        <td className="p-3 font-mono text-right text-trading-text-muted">
                          {formatPercentage((level.weight / gridLevels.reduce((sum, l) => sum + l.weight, 0)) * 100)}
                        </td>
                        <td className="p-3 text-center">
                          <Badge 
                            variant={level.status === 'active' ? 'default' : level.status === 'filled' ? 'secondary' : 'outline'}
                            className={`
                              ${level.status === 'active' ? 'bg-trading-accent-success/20 text-trading-accent-success border-trading-accent-success/30' : ''}
                              ${level.status === 'filled' ? 'bg-trading-text-muted/20 text-trading-text-muted border-trading-text-muted/30' : ''}
                              ${level.status === 'partial' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : ''}
                            `}
                            data-testid={`badge-grid-status-${level.level}`}
                          >
                            <Circle className="text-xs mr-1" size={8} />
                            {level.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Candles Data Table */}
          <Card className="glass-card border-trading-border-primary" data-testid="candles-table">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-trading-text-secondary flex items-center">
                  <BarChart3 className="text-chart-price mr-2" size={16} />
                  Candlestick Data (Manual)
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-trading-text-muted hover:text-trading-text-primary text-xs">
                  <Download className="mr-1" size={14} />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm data-table">
                  <thead className="table-header">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium">#</th>
                      <th className="text-left p-3 text-xs font-medium">Date</th>
                      <th className="text-right p-3 text-xs font-medium">Open</th>
                      <th className="text-right p-3 text-xs font-medium">High</th>
                      <th className="text-right p-3 text-xs font-medium">Low</th>
                      <th className="text-right p-3 text-xs font-medium">Close</th>
                      <th className="text-center p-3 text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-trading-text-primary">
                    {candles.slice(-10).map((candle, index) => {
                      const actualIndex = candles.length - 10 + index;
                      return (
                        <tr key={actualIndex} data-testid={`row-candle-${actualIndex}`}>
                          <td className="p-3 font-mono text-trading-text-muted">{actualIndex + 1}</td>
                          <td className="p-3 font-mono">{candle.date}</td>
                          <td className="p-3 font-mono text-right">{formatNumber(candle.open)}</td>
                          <td className="p-3 font-mono text-right positive">{formatNumber(candle.high)}</td>
                          <td className="p-3 font-mono text-right negative">{formatNumber(candle.low)}</td>
                          <td className="p-3 font-mono text-right">{formatNumber(candle.close)}</td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-trading-text-muted hover:text-trading-accent-primary mr-2"
                              onClick={() => handleEditCandle(actualIndex)}
                              data-testid={`button-edit-candle-${actualIndex}`}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-trading-text-muted hover:text-trading-accent-danger"
                              onClick={() => handleDeleteCandle(actualIndex)}
                              data-testid={`button-delete-candle-${actualIndex}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-xs text-trading-text-muted bg-trading-bg-panel rounded-lg p-3">
                <p className="flex items-center">
                  <Circle className="mr-2" size={12} />
                  Enable drawing mode to manually create candlesticks by clicking price levels on the chart.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
