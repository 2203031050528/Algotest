export type Timeframe = "1m" | "5m" | "15m" | "25m" | "1h" | "1d";

export interface StrategyRule {
  indicator: string;
  period: number;
  operator: string;
  value: number;
}

export interface StrategyConfiguration {
  entry_rules?: StrategyRule[];
  exit_rules?: StrategyRule[];
  stop_loss_pct?: number;
  target_pct?: number;
  [key: string]: unknown;
}

export interface Strategy {
  id: number;
  name: string;
  symbol: string;
  timeframe: Timeframe;
  capital: number | string;
  configuration: StrategyConfiguration;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}