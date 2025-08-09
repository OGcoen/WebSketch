import { 
  type GridConfiguration, 
  type InsertGridConfiguration,
  type CandlestickData,
  type InsertCandlestickData,
  type GridLevel,
  type InsertGridLevel
} from "@shared/schema";
import { randomUUID } from "crypto";

// Storage interface for Grid Trading Lab
export interface IStorage {
  // Grid configurations
  getGridConfig(id: string): Promise<GridConfiguration | undefined>;
  createGridConfig(config: InsertGridConfiguration): Promise<GridConfiguration>;
  updateGridConfig(id: string, config: Partial<GridConfiguration>): Promise<GridConfiguration>;
  deleteGridConfig(id: string): Promise<boolean>;
  
  // Candlestick data
  getCandlesByConfigId(configId: string): Promise<CandlestickData[]>;
  createCandle(candle: InsertCandlestickData): Promise<CandlestickData>;
  deleteCandle(id: string): Promise<boolean>;
  
  // Grid levels
  getGridLevelsByConfigId(configId: string): Promise<GridLevel[]>;
  createGridLevel(level: InsertGridLevel): Promise<GridLevel>;
  updateGridLevel(id: string, level: Partial<GridLevel>): Promise<GridLevel>;
  deleteGridLevel(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private gridConfigs: Map<string, GridConfiguration>;
  private candles: Map<string, CandlestickData>;
  private gridLevels: Map<string, GridLevel>;

  constructor() {
    this.gridConfigs = new Map();
    this.candles = new Map();
    this.gridLevels = new Map();
  }

  // Grid configuration methods
  async getGridConfig(id: string): Promise<GridConfiguration | undefined> {
    return this.gridConfigs.get(id);
  }

  async createGridConfig(insertConfig: InsertGridConfiguration): Promise<GridConfiguration> {
    const id = randomUUID();
    const config: GridConfiguration = { 
      ...insertConfig, 
      id, 
      createdAt: new Date() 
    };
    this.gridConfigs.set(id, config);
    return config;
  }

  async updateGridConfig(id: string, updates: Partial<GridConfiguration>): Promise<GridConfiguration> {
    const existing = this.gridConfigs.get(id);
    if (!existing) throw new Error('Grid configuration not found');
    
    const updated = { ...existing, ...updates };
    this.gridConfigs.set(id, updated);
    return updated;
  }

  async deleteGridConfig(id: string): Promise<boolean> {
    return this.gridConfigs.delete(id);
  }

  // Candlestick data methods
  async getCandlesByConfigId(configId: string): Promise<CandlestickData[]> {
    return Array.from(this.candles.values())
      .filter(candle => candle.configId === configId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async createCandle(insertCandle: InsertCandlestickData): Promise<CandlestickData> {
    const id = randomUUID();
    const candle: CandlestickData = { 
      ...insertCandle, 
      id, 
      timestamp: new Date() 
    };
    this.candles.set(id, candle);
    return candle;
  }

  async deleteCandle(id: string): Promise<boolean> {
    return this.candles.delete(id);
  }

  // Grid level methods
  async getGridLevelsByConfigId(configId: string): Promise<GridLevel[]> {
    return Array.from(this.gridLevels.values())
      .filter(level => level.configId === configId)
      .sort((a, b) => a.level - b.level);
  }

  async createGridLevel(insertLevel: InsertGridLevel): Promise<GridLevel> {
    const id = randomUUID();
    const level: GridLevel = { ...insertLevel, id };
    this.gridLevels.set(id, level);
    return level;
  }

  async updateGridLevel(id: string, updates: Partial<GridLevel>): Promise<GridLevel> {
    const existing = this.gridLevels.get(id);
    if (!existing) throw new Error('Grid level not found');
    
    const updated = { ...existing, ...updates };
    this.gridLevels.set(id, updated);
    return updated;
  }

  async deleteGridLevel(id: string): Promise<boolean> {
    return this.gridLevels.delete(id);
  }
}

export const storage = new MemStorage();
