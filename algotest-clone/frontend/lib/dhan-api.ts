import api from "./api";
import {
  DhanFunds,
  DhanMarginRequest,
  DhanMarginResponse,
  DhanOrder,
  DhanPosition,
  DhanProfile,
  DhanStatusResponse,
  InstrumentItem,
} from "@/types/dhan";

export const dhanApi = {
  /**
   * Get broker connection status and account overview
   */
  async getStatus(): Promise<DhanStatusResponse> {
    const { data } = await api.get<DhanStatusResponse>("/dhan/status/");
    return data;
  },

  /**
   * Fetch live profile from Dhan
   */
  async getProfile(): Promise<DhanProfile> {
    const { data } = await api.get<DhanProfile>("/dhan/profile/");
    return data;
  },

  /**
   * Fetch available funds and margin limits
   */
  async getFunds(): Promise<DhanFunds> {
    const { data } = await api.get<DhanFunds>("/dhan/funds/");
    return data;
  },

  /**
   * Fetch active positions from Dhan
   */
  async getPositions(): Promise<DhanPosition[]> {
    const { data } = await api.get<DhanPosition[]>("/dhan/positions/");
    return Array.isArray(data) ? data : [];
  },

  /**
   * Fetch orders placed today
   */
  async getOrders(): Promise<DhanOrder[]> {
    const { data } = await api.get<DhanOrder[]>("/dhan/orders/");
    return Array.isArray(data) ? data : [];
  },

  /**
   * Calculate required margin for an order via Dhan margincalculator
   */
  async calculateMargin(payload: DhanMarginRequest): Promise<DhanMarginResponse> {
    const { data } = await api.post<DhanMarginResponse>("/dhan/margin/", payload);
    return data;
  },

  /**
   * Fetch market instruments with Dhan security mapping
   */
  async getInstruments(query: string = ""): Promise<InstrumentItem[]> {
    const url = query ? `/instruments/?q=${encodeURIComponent(query)}` : "/instruments/";
    const { data } = await api.get<InstrumentItem[]>(url);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Fast prefix search on instruments
   */
  async searchInstruments(query: string = ""): Promise<InstrumentItem[]> {
    const url = query ? `/instruments/search/?q=${encodeURIComponent(query)}` : "/instruments/search/";
    const { data } = await api.get<InstrumentItem[]>(url);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Fetch historical candles directly from Dhan proxy
   */
  async getHistoricalDirect(params: {
    security_id: string;
    exchange_segment: string;
    instrument_type: string;
    timeframe: string;
    from_date: string;
    to_date: string;
  }): Promise<{ timestamp: string; open: number; high: number; low: number; close: number; volume: number }[]> {
    const { data } = await api.get("/dhan/historical/", { params });
    return Array.isArray(data) ? data : [];
  },
};

