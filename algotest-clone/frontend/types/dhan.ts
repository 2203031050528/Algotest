export interface DhanProfile {
  dhanClientId: string;
  tokenValidity?: string;
  activeSegment?: string;
  ddpi?: string;
  mtf?: string;
  dataPlan?: string;
  dataValidity?: string;
}

export interface DhanFunds {
  dhanClientId: string;
  availabelBalance: number;
  sodLimit: number;
  collateralAmount: number;
  receiveableAmount: number;
  utilizedAmount: number;
  blockedPayoutAmount: number;
  withdrawableBalance: number;
}

export interface DhanPosition {
  dhanClientId?: string;
  tradingSymbol: string;
  securityId: string;
  positionType: string;
  exchangeSegment: string;
  productType: string;
  buyAvg: number;
  costPrice: number;
  buyQty: number;
  sellQty: number;
  netQty: number;
  realizedProfit: number;
  unrealizedProfit: number;
  rbiReferenceRate?: number;
}

export interface DhanOrder {
  orderId: string;
  orderStatus: string;
  transactionType: "BUY" | "SELL";
  exchangeSegment: string;
  productType: string;
  orderType: string;
  tradingSymbol: string;
  securityId: string;
  quantity: number;
  price: number;
  triggerPrice?: number;
  createTime?: string;
  updateTime?: string;
}

export interface DhanMarginRequest {
  exchangeSegment: string;
  transactionType: "BUY" | "SELL";
  quantity: number;
  productType: string;
  securityId: string;
  price: number;
}

export interface DhanMarginResponse {
  totalMargin: number;
  spanMargin: number;
  exposureMargin: number;
  availableBalance: number;
  variableMargin: number;
  insufficientBalance: number;
  brokerage: number;
  leverage: string;
}

export interface DhanStatusResponse {
  connected: boolean;
  client_id: string;
  profile?: DhanProfile;
  funds?: DhanFunds;
  has_api_key?: boolean;
  has_secret?: boolean;
  error?: string;
}

export interface InstrumentItem {
  symbol: string;
  trading_symbol: string;
  security_id: string;
  segment: string;
  dhan_segment: string;
  type: string;
  lot: number;
  tick: number;
  exchange: string;
  dhan_supported: boolean;
  name?: string;
}

