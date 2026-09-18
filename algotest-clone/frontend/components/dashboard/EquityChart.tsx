"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data=[{month:"Apr",value:100000},{month:"May",value:104500},{month:"Jun",value:102800},{month:"Jul",value:111500},{month:"Aug",value:118200},{month:"Sep",value:124850}];

export default function EquityChart(){
  return <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:10,right:5,left:0,bottom:0}}><defs><linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#111827" stopOpacity={0.16}/><stop offset="100%" stopColor="#111827" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#eef0f3" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:12,fill:"#6b7280"}}/><YAxis domain={["dataMin - 3000","dataMax + 3000"]} axisLine={false} tickLine={false} tick={{fontSize:12,fill:"#6b7280"}} tickFormatter={v=>`₹${Math.round(Number(v)/1000)}k`} width={48}/><Tooltip formatter={(value)=>[`₹${Number(value).toLocaleString("en-IN")}`,"Equity"]}/><Area type="monotone" dataKey="value" stroke="#111827" strokeWidth={2.5} fill="url(#equityFill)"/></AreaChart></ResponsiveContainer></div>;
}