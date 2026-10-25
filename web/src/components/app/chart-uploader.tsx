"use client";

import { ArrowRight, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { analyseChart, type AnalysisResult } from "@/server/actions/chart-analysis";
import { Alert, Spinner } from "@/components/auth/auth-ui";
import { GlassIcon } from "@/components/icons/glass-icon";
import { Glass } from "@/components/ui/glass";

export function ChartUploader() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => { if (!file) { setUrl(null); return; } const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  const pick = (f: File | undefined) => { if (f) { setFile(f); setResult(null); } };

  return (
    <Glass className="p-4 sm:p-6">
      {!url ? (
        <button
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={cn("inset grid min-h-72 w-full place-items-center gap-3 rounded-3xl border-dashed p-8 text-center transition-colors", drag && "border-accent bg-accent-soft")}
        >
          <GlassIcon name="ai" size={72} />
          <span className="text-lg font-semibold text-ink">Drop a chart screenshot</span>
          <span className="text-sm text-ink-2">or click to choose a file. PNG, JPG or WebP, up to 10 MB.</span>
        </button>
      ) : (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the user's file */}
          <img src={url} alt="Chart to analyse" className="max-h-[60vh] w-full rounded-3xl object-contain" />
          <button onClick={() => setFile(null)} aria-label="Remove screenshot" className="glass absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full"><X className="h-4 w-4" /></button>
        </div>
      )}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <button
        disabled={!file || pending}
        onClick={() => start(async () => { const fd = new FormData(); fd.set("chart", file!); setResult(await analyseChart(fd)); })}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#16203a,#0b1222)] text-[15px] font-medium text-white disabled:opacity-50 dark:bg-[linear-gradient(180deg,#2a63f0,#1a4fd0)]"
      >
        {pending ? <Spinner /> : <GlassIcon name="ai" size={26} active />} Analyse with AI <ArrowRight className="h-4 w-4" />
      </button>
      {result && <div className="mt-3"><Alert tone={result.ok ? "up" : "warn"}>{result.ok ? result.text : result.error}</Alert></div>}
    </Glass>
  );
}
