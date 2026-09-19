export type BacktestStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface BacktestTrade {
  id: number;
  backtest: number;
  symbol: string;
  side: "BUY" | "SELL";
  entry_time: string;
  entry_price: string | number;
  exit_time?: string | null;
  exit_price?: string | number | null;
  quantity: number;
  pnl: string | number;
  exit_reason?: string;
  created_at?: string;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
}

export interface Backtest {
  id: number;
  user?: number;
  strategy: number;
  strategy_name?: string;
  strategy_symbol?: string;
  start_date: string;
  end_date: string;
  initial_capital: number | string;
  final_capital?: number | string | null;
  total_pnl?: number | string | null;
  return_percent?: number | string | null;
  win_rate?: number | string | null;
  max_drawdown?: number | string | null;
  total_trades: number;
  status: BacktestStatus;
  status_display?: string;
  error_message?: string;
  trades?: BacktestTrade[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateBacktestPayload {
  strategy: number;
  start_date: string;
  end_date: string;
  initial_capital: number;
}