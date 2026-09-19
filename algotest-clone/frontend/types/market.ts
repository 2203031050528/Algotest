export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Instrument {
  id?: number;
  security_id: string;
  exchange_segment: string;
  trading_symbol: string;
  symbol: string;
  name?: string;
  instrument_type: string;
  lot_size: number;
  tick_size: number | string;
  expiry?: string | null;
  strike?: number | string | null;
  option_type?: string | null;
  source?: string;
  is_active?: boolean;
}

export interface HistoricalDataRequest {
  security_id: string;
  exchange_segment?: string;
  symbol: string;
  timeframe: "1m" | "5m" | "15m" | "25m" | "1h" | "1d";
  start_date: string;
  end_date: string;
  instrument_type?: string;
  provider?: "dhan" | "csv";
  page?: number;
  page_size?: number;
}

export interface HistoricalDataResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  provider: string;
  results: Candle[];
}

export interface SyncCandlesPayload {
  security_id: string;
  exchange_segment: string;
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  instrument_type?: string;
}

export interface SyncCandlesResponse {
  synced: number;
  security_id: string;
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
}

export interface MarketDataProvider {
  name: string;
  description?: string;
  status: "active" | "inactive" | "rate_limited" | "error";
  priority?: number;
  supported_timeframes?: string[];
  rate_limit?: string;
}