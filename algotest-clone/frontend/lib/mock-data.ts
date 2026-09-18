export const recentBacktests=[
  {id:1,strategy:"RSI Reversal",symbol:"NIFTY 50",timeframe:"5m",date:"18 Sep 2026",pnl:4250},
  {id:2,strategy:"EMA Trend",symbol:"BANKNIFTY",timeframe:"15m",date:"17 Sep 2026",pnl:-850},
  {id:3,strategy:"Breakout Pro",symbol:"NIFTY 50",timeframe:"5m",date:"16 Sep 2026",pnl:7180},
  {id:4,strategy:"Opening Range",symbol:"FINNIFTY",timeframe:"15m",date:"15 Sep 2026",pnl:1870},
];

export const mockStrategies=[
  {id:1,name:"RSI Reversal",symbol:"NIFTY 50",timeframe:"5m",capital:100000,entry:"RSI < 30",exit:"RSI > 60"},
  {id:2,name:"EMA Trend",symbol:"BANKNIFTY",timeframe:"15m",capital:150000,entry:"EMA20 > EMA50",exit:"EMA20 < EMA50"},
  {id:3,name:"Breakout Pro",symbol:"NIFTY 50",timeframe:"5m",capital:100000,entry:"Close > High",exit:"Close < EMA20"},
];

export const instruments=[
  {symbol:"NIFTY 50",segment:"NSE_EQ",type:"INDEX",lot:1,tick:"0.05"},
  {symbol:"BANKNIFTY",segment:"NSE_EQ",type:"INDEX",lot:1,tick:"0.05"},
  {symbol:"FINNIFTY",segment:"NSE_EQ",type:"INDEX",lot:1,tick:"0.05"},
  {symbol:"RELIANCE",segment:"NSE_EQ",type:"EQUITY",lot:1,tick:"0.05"},
  {symbol:"TCS",segment:"NSE_EQ",type:"EQUITY",lot:1,tick:"0.05"},
  {symbol:"HDFCBANK",segment:"NSE_EQ",type:"EQUITY",lot:1,tick:"0.05"},
];

export const tradeResults=[
  {symbol:"NIFTY 50",side:"BUY",entry:"09:45",exit:"10:20",qty:50,pnl:1850,reason:"Target"},
  {symbol:"NIFTY 50",side:"BUY",entry:"11:10",exit:"11:55",qty:50,pnl:-720,reason:"Stop Loss"},
  {symbol:"NIFTY 50",side:"BUY",entry:"12:30",exit:"13:25",qty:50,pnl:2420,reason:"Target"},
  {symbol:"NIFTY 50",side:"BUY",entry:"14:05",exit:"15:00",qty:50,pnl:1260,reason:"Exit Signal"},
];