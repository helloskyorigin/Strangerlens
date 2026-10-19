import assert from "node:assert/strict";
import { createScanFlowController } from "../lib/scan-flow-controller";
import { consumeScanProgress } from "../lib/scan-progress-stream";

const encoder = new TextEncoder();
const deferred = <T>() => {
  let resolve!: (value:T)=>void;
  const promise=new Promise<T>(res=>{resolve=res;});
  return {promise,resolve};
};
const response=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{
  status,headers:{"Content-Type":"application/json"}
});
const sleep=()=>new Promise(resolve=>setTimeout(resolve,0));

async function streamingLifecycle(){
  let sender!: ReadableStreamDefaultController<Uint8Array>;
  const stream=new ReadableStream<Uint8Array>({start(controller){sender=controller;}});
  const verified=deferred<Response>();
  const transitions:string[]=[];
  let analysisRequested=false;
  const controller=createScanFlowController({
    deferResultsNavigation:true,
    fetchImpl:(async (url:string)=>{
      if(url.includes("/verify"))return verified.promise;
      analysisRequested=true;
      return new Response(stream,{headers:{"Content-Type":"application/x-ndjson"}});
    }) as any,
    onStateChange(state){transitions.push(state.scanMilestone);}
  });
  const pending=controller.startScan("example.com");
  assert.equal(controller.getState().scanMilestone,"connecting");
  verified.resolve(response({success:true,domain:"example.com",status:200,finalUrl:"https://example.com"}));
  await sleep();
  assert.ok(analysisRequested);
  assert.equal(controller.getState().scanMilestone,"connected");
  const send=(value:unknown)=>sender.enqueue(encoder.encode(JSON.stringify(value)+"\n"));
  // Progress can arrive in network chunks, not always complete lines.
  const broken=JSON.stringify({type:"progress",stage:"content_inspected"})+"\n";
  sender.enqueue(encoder.encode(broken.slice(0,12)));
  sender.enqueue(encoder.encode(broken.slice(12)));
  await sleep();
  assert.equal(controller.getState().scanMilestone,"content_inspected");
  assert.equal(controller.getState().analysisData,null);
  send({type:"progress",stage:"signals_evaluated"});
  await sleep();
  assert.equal(controller.getState().scanMilestone,"signals_evaluated");
  assert.equal(controller.getState().analysisData,null,"Scores cannot render before authoritative report response.");
  send({type:"result",status:200,payload:{score:70,domain:"example.com",reportId:"streamed-test",checkoutEnabled:true}});
  sender.close();
  await pending;
  assert.equal(controller.getState().scanMilestone,"report_ready");
  assert.equal(controller.getState().isPreparingResults,true);
  assert.equal(controller.getState().currentView,"scan");
  assert.deepEqual(["connecting","connected","content_inspected","signals_evaluated","report_ready"],
    [...new Set(transitions)],"Every progress milestone originates from real completion events.");
  controller.completeScanToResults();
  assert.equal(controller.getState().currentView,"results");
}

async function rejectsIncompleteResult(){
  const stream=new ReadableStream<Uint8Array>({
    start(controller){
      controller.enqueue(encoder.encode(JSON.stringify({type:"progress",stage:"content_inspected"})+"\n"));
      controller.close();
    }
  });
  await assert.rejects(()=>consumeScanProgress(new Response(stream),()=>{}),/before the report was ready/);
}
async function errorEnvelope(){
  const stream=new ReadableStream<Uint8Array>({
    start(controller){
      controller.enqueue(encoder.encode(JSON.stringify({
        type:"result",status:422,payload:{error:"INSUFFICIENT_PAGE_CONTENT",message:"No readable page content."}
      })+"\n"));
      controller.close();
    }
  });
  const result=await consumeScanProgress(new Response(stream),()=>{});
  assert.equal(result.status,422);
  assert.equal(result.payload.error,"INSUFFICIENT_PAGE_CONTENT");
}
async function main(){
  await streamingLifecycle();
  await rejectsIncompleteResult();
  await errorEnvelope();
  console.log("PASS: live four-stage backend events, chunked NDJSON, no premature result, and meaningful errors.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
