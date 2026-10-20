"use client";
import React, { useEffect, useState } from "react";
import { History, RotateCcw, Trash2 } from "lucide-react";
import type { CanonicalReport } from "@/lib/report-adapter";

type Scores = { [key: string]: number | null };
export interface SnapshotSummary {
  reportId: string;
  domain: string;
  at: number;
  overall: number | null;
  scores: Scores;
}
const STORAGE_KEY = "sl:v4:comparison:scores";
const KEYS = ["firstImpression","audience","value","trust","action"] as const;
const LABELS:Record<string,string> = {
  firstImpression:"First Impression",audience:"Audience",value:"Value",trust:"Trust",action:"Action",
};
function normalizedHost(value: string): string {
  const trimmed=value.toLowerCase().trim().replace(/^www\./,"");
  if(!trimmed || trimmed.length>255 || !/^[a-z0-9.-]+$/.test(trimmed))return "";
  return trimmed;
}
function validScore(value:unknown):number|null {
  return typeof value==="number" && Number.isFinite(value) && value>=0 && value<=100?Math.round(value):null;
}
export function summarizeScores(report:CanonicalReport, reportId:string): SnapshotSummary|null {
  const domain=normalizedHost(report.domain);
  if(!domain || !/^[a-f0-9-]{8,80}$/i.test(reportId))return null;
  return {
    reportId,domain,at:Date.now(),overall:validScore(report.overallScore),
    scores:Object.fromEntries(KEYS.map(k=>[k,validScore(report.signals[k].score)])),
  };
}
export function compareScores(previous:SnapshotSummary,current:SnapshotSummary){
  if(previous.domain!==current.domain || previous.reportId===current.reportId)return null;
  return {
    total:previous.overall===null||current.overall===null?null:current.overall-previous.overall,
    signals:KEYS.map(key=>({
      key,label:LABELS[key],before:validScore(previous.scores[key]),after:validScore(current.scores[key]),
      delta:validScore(previous.scores[key])===null||validScore(current.scores[key])===null?null:
        Number(current.scores[key])-Number(previous.scores[key]),
    })),
  };
}
function readSnapshots():Record<string,SnapshotSummary>{
  try {
    const raw=window.localStorage.getItem(STORAGE_KEY);
    const parsed=raw?JSON.parse(raw):{};
    return parsed && typeof parsed==="object" && !Array.isArray(parsed)?parsed:{};
  }catch{return {};}
}
export default function RecheckComparison({
  report,reportId,onRecheck,
}:{report:CanonicalReport;reportId:string|null;onRecheck?:()=>void}){
  const [prior,setPrior]=useState<SnapshotSummary|null>(null);
  const [ready,setReady]=useState(false);
  const current=reportId?summarizeScores(report,reportId):null;
  useEffect(()=>{
    if(!current){setReady(true);return;}
    try{
      const all=readSnapshots();
      const existing=all[current.domain];
      const previousKey=`previous:${current.domain}`;
      // Keep the preceding distinct report across remounts; opening the same
      // report twice must not overwrite the comparison baseline.
      const previous=existing && existing.reportId!==current.reportId
        ? existing : all[previousKey];
      setPrior(previous && previous.reportId!==current.reportId &&
        validScore(previous.overall)!==null ? previous : null);
      const updated={...all,[current.domain]:current};
      if (existing && existing.reportId!==current.reportId) updated[previousKey]=existing;
      // Store no report tokens, full URLs, page content, emails, or premium findings.
      const entries=Object.entries(updated).sort((a,b)=>(b[1]?.at||0)-(a[1]?.at||0)).slice(0,20);
      window.localStorage.setItem(STORAGE_KEY,JSON.stringify(Object.fromEntries(entries)));
    }catch{/* Disabled storage never blocks viewing the report. */}
    setReady(true);
  },[reportId,report.domain,report.overallScore]);
  if(!current)return null;
  const diff=prior?compareScores(prior,current):null;
  return <section className="rounded-2xl border border-[#2D415B] bg-[#121D2E] p-4 sm:p-6 sl-recheck-section"
    aria-labelledby="recheck-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
          <History className="h-5 w-5" aria-hidden="true"/>
        </span>
        <div>
          <h2 id="recheck-title" className="text-lg font-bold text-white">Recheck &amp; Compare</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#AABED7]">Update your website, then scan it again to compare clarity scores.</p>
        </div>
      </div>
      {onRecheck && <button type="button" onClick={onRecheck}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#46618B] bg-[#1D3451] px-4 text-xs font-semibold text-[#D6E6FD] hover:bg-[#294866]">
        <RotateCcw size={14} aria-hidden="true"/> Recheck website
      </button>}
    </div>
    {diff ? <>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-[#344B65] bg-[#1B2A3F] p-3">
          <p className="text-xs text-[#9BB2CE]">Previous</p>
          <p className="mt-1 text-2xl font-bold text-white">{prior?.overall ?? "—"}<span className="text-sm text-[#90A8C5]">/100</span></p>
        </div>
        <div className="rounded-xl border border-[#344B65] bg-[#1B2A3F] p-3">
          <p className="text-xs text-[#9BB2CE]">Current</p>
          <p className="mt-1 text-2xl font-bold text-white">{current.overall ?? "—"}<span className="text-sm text-[#90A8C5]">/100</span></p>
        </div>
        <div className="col-span-2 rounded-xl border border-[#344B65] bg-[#1B2A3F] p-3 sm:col-span-1">
          <p className="text-xs text-[#9BB2CE]">Change</p>
          <p className={`mt-1 text-2xl font-bold ${diff.total===null?"text-white":diff.total>0?"text-emerald-300":diff.total<0?"text-amber-300":"text-white"}`}>
            {diff.total===null?"—":`${diff.total>0?"+":""}${diff.total}`} <span className="text-xs font-medium">points</span>
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {diff.signals.map(s=><div key={s.key} className="flex items-center justify-between rounded-lg border border-[#31445C] p-2.5">
          <span className="text-xs font-semibold text-[#C8D8EB]">{s.label}</span>
          <span className="text-xs tabular-nums text-[#C8D8EB]">{s.before??"—"} → {s.after??"—"}
            <span className={`ml-2 font-bold ${s.delta!==null&&s.delta>0?"text-emerald-300":"text-[#AFC2D9]"}`}>
              {s.delta===null?"":`(${s.delta>0?"+":""}${s.delta})`}
            </span>
          </span>
        </div>)}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[#A5BAD2]">
        Score changes reflect two separate automated assessments. They are not measured conversions or proof of business impact.
        Differences in accessible page content or analysis versions can also affect scores.
      </p>
      <button type="button" onClick={()=>{
        try{const all=readSnapshots();delete all[current.domain];delete all[`previous:${current.domain}`];window.localStorage.setItem(STORAGE_KEY,JSON.stringify(all));}catch{}
        setPrior(null);
      }} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-[#A8BAD0] hover:text-white">
        <Trash2 size={13} aria-hidden="true"/> Clear comparison on this device
      </button>
    </> : ready ? (
      <p className="mt-4 text-xs leading-relaxed text-[#AFC0D6]">
        Your current scores are saved privately on this device for the next scan of this domain. No report text or payment details are stored for comparison.
      </p>
    ):null}
  </section>;
}
