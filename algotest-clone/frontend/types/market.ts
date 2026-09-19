export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  security_id?: string;
  symbol?: string;
  exchange_segment?: string;
  timeframe?: string;
  open_interest?: number | null;
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
  provider?: string;
  description?: string;
  available?: boolean;
  status: "active" | "inactive" | "rate_limited" | "error" | "standby" | string;
  priority?: number;
  source?: string;
  cache?: string;
  data_dir?: string;
  csv_files?: string[];
  file_count?: number;
  supported_segments?: string[];
  timeframes?: string[];
  rate_limit?: string;
}