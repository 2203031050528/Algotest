export type Timeframe="1m"|"5m"|"15m"|"1h";

export interface Strategy {
  id:number;
  name:string;
  symbol:string;
  timeframe:Timeframe;
  capital:number;
  configuration:Record<string,unknown>;
}