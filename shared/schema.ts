import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const gridConfigurations = pgTable("grid_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  contractValue: real("contract_value").notNull(),
  rangeLow: real("range_low").notNull(),
  rangeHigh: real("range_high").notNull(),
  gridSteps: integer("grid_steps").notNull(),
  totalContracts: integer("total_contracts").notNull(),
  allocMode: text("alloc_mode").notNull(), // 'geometric' | 'atr'
  growthFactor: real("growth_factor").notNull(),
  atrPercent: real("atr_percent").notNull(),
  depthExponent: real("depth_exponent").notNull(),
  roundToIntegers: boolean("round_to_integers").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const candlestickData = pgTable("candlestick_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configId: varchar("config_id").references(() => gridConfigurations.id),
  date: text("date").notNull(),
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  timestamp: timestamp("timestamp").default(sql`now()`),
});

export const gridLevels = pgTable("grid_levels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configId: varchar("config_id").references(() => gridConfigurations.id),
  level: integer("level").notNull(),
  price: real("price").notNull(),
  contracts: integer("contracts").notNull(),
  weight: real("weight").notNull(),
  status: text("status").notNull().default('active'), // 'active' | 'partial' | 'filled'
});

// Zod schemas
export const insertGridConfigSchema = createInsertSchema(gridConfigurations).omit({
  id: true,
  createdAt: true,
});

export const insertCandlestickSchema = createInsertSchema(candlestickData).omit({
  id: true,
  timestamp: true,
});

export const insertGridLevelSchema = createInsertSchema(gridLevels).omit({
  id: true,
});

// Types
export type GridConfiguration = typeof gridConfigurations.$inferSelect;
export type InsertGridConfiguration = z.infer<typeof insertGridConfigSchema>;
export type CandlestickData = typeof candlestickData.$inferSelect;
export type InsertCandlestickData = z.infer<typeof insertCandlestickSchema>;
export type GridLevel = typeof gridLevels.$inferSelect;
export type InsertGridLevel = z.infer<typeof insertGridLevelSchema>;

// Additional types for application state
export const CandleDataSchema = z.object({
  date: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
});

export const GridCalculationParamsSchema = z.object({
  rangeLow: z.number(),
  rangeHigh: z.number(),
  gridSteps: z.number(),
  totalContracts: z.number(),
  allocMode: z.enum(['geometric', 'atr']),
  growthFactor: z.number(),
  atrPercent: z.number(),
  depthExponent: z.number(),
  roundToIntegers: z.boolean(),
});

export type CandleData = z.infer<typeof CandleDataSchema>;
export type GridCalculationParams = z.infer<typeof GridCalculationParamsSchema>;
