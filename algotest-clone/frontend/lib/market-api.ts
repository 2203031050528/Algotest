import api from "./api";
import {
  Candle,
  HistoricalDataRequest,
  HistoricalDataResponse,
  MarketDataProvider,
  SyncCandlesPayload,
  SyncCandlesResponse,
} from "@/types/market";

export const marketApi = {
  /**
   * Fetch historical candles via provider (DB cached first + Dhan API gap-fill)
   */
  async getHistorical(params: HistoricalDataRequest): Promise<HistoricalDataResponse> {
    const { data } = await api.get<HistoricalDataResponse>("/market-data/historical/", {
      params,
    });
    return data;
  },

  /**
   * Force-sync candles for a specific instrument from Dhan API into database
   */
  async syncCandles(payload: SyncCandlesPayload): Promise<SyncCandlesResponse> {
    const { data } = await api.post<SyncCandlesResponse>("/market-data/sync/", payload);
    return data;
  },

  /**
   * Query cached candles directly from PostgreSQL without external API calls
   */
  async getCandles(params: {
    security_id: string;
    timeframe: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<{ count: number; limit: number; results: Candle[] }> {
    const { data } = await api.get("/market-data/candles/", {
      params,
    });
    return data;
  },

  /**
   * Get health and status of all market data providers (Dhan, CSV)
   */
  async getProviders(): Promise<MarketDataProvider[]> {
    const { data } = await api.get<MarketDataProvider[]>("/market-data/providers/");
    return Array.isArray(data) ? data : [];
  },
};
