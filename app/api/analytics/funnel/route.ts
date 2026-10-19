import { NextRequest, NextResponse } from "next/server";
import { getClientIp, checkAndAcquireRateLimit, releaseConcurrencySlot } from "@/server/security/rateLimiter";
import { isDurableStorageConfigured, paymentStore } from "@/server/storage/paymentStore";

export const dynamic = "force-dynamic";

const EVENTS = [
  "landing_view","url_input_focused","scan_submitted","scan_completed",
  "scan_failed","post_scan_offer_shown","post_scan_offer_dismissed",
  "upgrade_clicked","checkout_opened","checkout_failed","payment_verified"
] as const;
type EventName = (typeof EVENTS)[number];
const VALID = new Set<string>(EVENTS);
const dateKey = (date:Date) => date.toISOString().slice(0,10);
const funnelKey = (date:string,event:EventName) => `sl:v4:funnel:${date}:${event}`;

function allowedOrigin(req:NextRequest):boolean {
  const sec=req.headers.get("sec-fetch-site");
  if(sec && sec !== "same-origin" && sec !== "none")return false;
  const origin=req.headers.get("origin");
  if(!origin)return true; // Non-browser integrations may not send an Origin header.
  try{return new URL(origin).host===req.nextUrl.host;}catch{return false;}
}

/** Aggregate event counters only: no visitor IDs, URLs, IP addresses, tokens,
 * scan contents, emails, report IDs or payment identifiers are persisted. */
export async function POST(req:NextRequest){
  if(!allowedOrigin(req))return new NextResponse(null,{status:403});
  if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return new NextResponse(null,{status:415});
  if(Number(req.headers.get("content-length")||0)>256)
    return new NextResponse(null,{status:413});
  const ip=getClientIp(req);
  const rate=checkAndAcquireRateLimit(ip,{scope:"anonymous-funnel",maxPerMinute:50,maxConcurrent:3});
  if(!rate.allowed)return new NextResponse(null,{status:429});
  try {
    const text=await req.text();
    if(text.length>256)return new NextResponse(null,{status:413});
    let parsed:any;
    try{parsed=JSON.parse(text);}catch{return new NextResponse(null,{status:400});}
    if(!parsed || typeof parsed.event!=="string" || !VALID.has(parsed.event))
      return new NextResponse(null,{status:400});
    if(Object.keys(parsed).length!==1)return new NextResponse(null,{status:400});
    if(!isDurableStorageConfigured())return new NextResponse(null,{status:204});
    const key=funnelKey(dateKey(new Date()),parsed.event as EventName);
    try {
      const store=paymentStore();
      await store.incr(key);
      await store.expire(key,40*86400);
    } catch {
      // Analytics outages cannot impact scans, UI, checkout, or verification.
    }
    return new NextResponse(null,{status:204,headers:{"Cache-Control":"no-store"}});
  } finally {releaseConcurrencySlot(ip,"anonymous-funnel");}
}

/** Founder-only aggregate retrieval. Opt-in secret required; fail closed. */
export async function GET(req:NextRequest){
  const secret=process.env.STRANGERLENS_ANALYTICS_SECRET;
  if(!secret || secret.length<24)return new NextResponse(null,{status:404});
  const supplied=req.headers.get("authorization");
  if(!supplied || supplied!==`Bearer ${secret}`)return new NextResponse(null,{status:403});
  if(!isDurableStorageConfigured())return NextResponse.json({available:false,days:[]},{status:503});
  const days=Math.min(30,Math.max(1,Number.parseInt(req.nextUrl.searchParams.get("days")||"7",10)||7));
  const rows=[];
  for(let i=days-1;i>=0;i--){
    const date=new Date(Date.now()-i*86400000);
    const day=dateKey(date);
    const keys=EVENTS.map(event=>funnelKey(day,event));
    const totals=await Promise.all(keys.map(async key=>{
      try{return Number(await paymentStore().get<number>(key))||0;}catch{return 0;}
    }));
    rows.push({date:day,counts:Object.fromEntries(EVENTS.map((name,index)=>[name,totals[index]]))});
  }
  return NextResponse.json({available:true,days:rows},{headers:{"Cache-Control":"no-store"}});
}
