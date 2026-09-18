export interface Candle {
  timestamp:string;
  open:number;
  high:number;
  low:number;
  close:number;
  volume?:number;
}

export interface Instrument {
  security_id:string;
  exchange_segment:string;
  trading_symbol:string;
  instrument_type:string;
  lot_size:number;
  tick_size:number;
}