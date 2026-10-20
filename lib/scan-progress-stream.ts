export type ScanProgressStage = "content_inspected" | "signals_evaluated";
export type ScanStreamEvent =
  | { type: "progress"; stage: ScanProgressStage }
  | { type: "result"; status: number; payload: unknown };

/** Read bounded NDJSON events from the backend without consuming an unbounded
 * response, and ignore corrupted/unrecognized progress identifiers. */
export async function consumeScanProgress(
  response: Response,
  onStage: (stage: ScanProgressStage) => void,
): Promise<{ status: number; payload: any }> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The analysis connection closed before a result was received.");
  const decoder = new TextDecoder();
  let buffer = "";
  let received: { status: number; payload: any } | null = null;
  let totalBytes = 0;
  const maxEventBytes = 2_500_000;
  const maxTotalBytes = 5_000_000;
  function process(line: string) {
    if (!line.trim()) return;
    let event: ScanStreamEvent;
    try { event = JSON.parse(line); } catch { throw new Error("Incomplete analysis response. Please retry."); }
    if (event.type === "progress") {
      if (event.stage === "content_inspected" || event.stage === "signals_evaluated") onStage(event.stage);
    } else if (event.type === "result") {
      if (!Number.isInteger(event.status) || !event.payload || typeof event.payload !== "object") {
        throw new Error("Incomplete analysis response. Please retry.");
      }
      received = { status: event.status, payload: event.payload };
    }
  }
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      totalBytes += chunk.value.byteLength;
      if (totalBytes > maxTotalBytes) throw new Error("Analysis response exceeded safety limits.");
      buffer += decoder.decode(chunk.value, { stream: true });
      if (buffer.length > maxEventBytes) throw new Error("Analysis response exceeded safety limits.");
      let cut: number;
      while ((cut = buffer.indexOf("\n")) !== -1) {
        process(buffer.slice(0, cut));
        buffer = buffer.slice(cut + 1);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) process(buffer);
    if (!received) throw new Error("The analysis connection ended before the report was ready.");
    return received;
  } finally {
    reader.releaseLock();
  }
}
