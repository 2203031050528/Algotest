export type BacktestStatus="PENDING"|"RUNNING"|"COMPLETED"|"FAILED";

export interface Backtest {
  id:number;
  strategy:number;
  initial_capital:number;
  final_capital:number;
  total_pnl:number;
  return_percent:number;
  win_rate:number;
  max_drawdown:number;
  total_trades:number;
  status:BacktestStatus;
}