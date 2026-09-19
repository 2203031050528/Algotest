import api from "./api";
import {
  Backtest,
  BacktestTrade,
  CreateBacktestPayload,
  EquityPoint,
} from "@/types/backtest";

export const backtestApi = {
  /**
   * Get all backtests run by current authenticated user
   */
  async getBacktests(): Promise<Backtest[]> {
    const { data } = await api.get<Backtest[]>("/backtests/");
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get specific backtest details including metrics and trades
   */
  async getBacktest(id: number | string): Promise<Backtest> {
    const { data } = await api.get<Backtest>(`/backtests/${id}/`);
    return data;
  },

  /**
   * Create and execute a new backtest simulation
   */
  async createBacktest(payload: CreateBacktestPayload): Promise<Backtest> {
    const { data } = await api.post<Backtest>("/backtests/", payload);
    return data;
  },

  /**
   * Get detailed trades generated during a backtest
   */
  async getBacktestTrades(id: number | string): Promise<BacktestTrade[]> {
    const { data } = await api.get<BacktestTrade[]>(`/backtests/${id}/trades/`);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get equity curve series over time
   */
  async getBacktestEquity(id: number | string): Promise<EquityPoint[]> {
    const { data } = await api.get<EquityPoint[]>(`/backtests/${id}/equity/`);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Delete a backtest
   */
  async deleteBacktest(id: number | string): Promise<void> {
    await api.delete(`/backtests/${id}/`);
  },
};
