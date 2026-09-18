export const auth={
  getAccessToken:()=>typeof window==="undefined"?null:localStorage.getItem("access_token"),
  setTokens:(access:string,refresh?:string)=>{
    localStorage.setItem("access_token",access);
    if(refresh) localStorage.setItem("refresh_token",refresh);
  },
  logout:()=>{
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};