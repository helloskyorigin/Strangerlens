"use client";
import React,{useEffect,useState} from "react";
import {CheckCircle2,ClipboardCheck,RotateCcw} from "lucide-react";
import type {PremiumWorkbench} from "@/types/premiumWorkbench";

export default function ImprovementChecklist({workbench,reportId}:{workbench:PremiumWorkbench;reportId?:string|null}){
  const tasks=workbench.evidenceFixes.filter(f=>f.title&&f.suggestedAction).slice(0,12);
  const [completed,setCompleted]=useState<Record<string,boolean>>({});
  useEffect(()=>{
    try {
      const raw=reportId?localStorage.getItem(`sl:v4:fixes:${reportId}`):null;
      const parsed=raw?JSON.parse(raw):{};
      setCompleted(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:{});
    }catch{setCompleted({});}
  },[reportId]);
  const toggle=(id:string)=>{
    const next={...completed,[id]:!completed[id]};
    setCompleted(next);
    // Store only task IDs and booleans; never website copy, reports or tokens.
    try{if(reportId)localStorage.setItem(`sl:v4:fixes:${reportId}`,JSON.stringify(next));}catch{}
  };
  if(!tasks.length)return null;
  const done=tasks.filter(t=>completed[t.id]).length;
  return <section id="implementation-checklist" aria-labelledby="fix-checklist-title"
    className="scroll-mt-24 rounded-2xl border border-[#31465F] bg-[#141F31] p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300">04 · Take Action</p>
        <h3 id="fix-checklist-title" className="mt-1 flex items-center gap-2 text-xl font-bold text-white"><ClipboardCheck size={21}/> Your Fix Checklist</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#B0C2D8]">Make the change on your own website, then mark it reviewed. Checking a box doesn't edit your site.</p>
      </div>
      <span className="rounded-full border border-[#416286] bg-[#1B304A] px-3 py-1.5 text-xs font-bold text-[#C4DDFB]">{done}/{tasks.length} reviewed</span>
    </div>
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#283A52]"><div className="h-full rounded-full bg-blue-500 transition-[width]" style={{width:`${Math.round(100*done/tasks.length)}%`}}/></div>
    <div className="mt-4 space-y-2">
      {tasks.map((fix,index)=><label key={fix.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2E425B] bg-[#1A2A3E] p-3.5 hover:border-[#658ECA]">
        <input type="checkbox" checked={!!completed[fix.id]} onChange={()=>toggle(fix.id)}
          aria-label={`Mark ${fix.title} reviewed`} className="mt-0.5 h-4 w-4 shrink-0 accent-blue-500"/>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">{index+1}. {fix.title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-[#BDD0E6]">{fix.suggestedAction}</span>
          <span className="mt-2 block text-[11px] text-[#93AAC6]">{fix.evidence.length?
            `${fix.evidence.length} verified source quote(s)`:"No verified source quote — double-check before publishing"}</span>
        </span>
        {completed[fix.id]&&<CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-300"/>}
      </label>)}
    </div>
    {done>0&&<button type="button" onClick={()=>{setCompleted({});try{if(reportId)localStorage.removeItem(`sl:v4:fixes:${reportId}`)}catch{}}}
      className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-[#AFC3DA] hover:text-white"><RotateCcw size={13}/> Reset checklist</button>}
    <p className="mt-3 text-[11px] text-[#95ABC4]">Progress is stored only on this device; it doesn't change scores or promise conversion lift.</p>
  </section>;
}