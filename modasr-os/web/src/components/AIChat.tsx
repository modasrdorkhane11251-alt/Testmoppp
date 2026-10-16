"use client";
import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string };

export default function AIChat({ context, compact }: { context?: string; compact?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [conv, setConv] = useState<string>();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (q = text) => {
    if (!q.trim() || busy) return;
    setText(""); setMsgs((m) => [...m, { role: "user", content: q }]); setBusy(true);
    try {
      const r = await api<{ reply: string; conversation_id: string }>("/api/ai/chat", { method: "POST",
        body: JSON.stringify({ message: context ? `${context}\n${q}` : q, conversation_id: conv }) });
      setConv(r.conversation_id); setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", content: e.message.includes("401") ? "برای گفتگو اول با تلگرام وارد شو 🙏" : "ارتباط برقرار نشد، دوباره امتحان کن." }]);
    } finally { setBusy(false); }
  };
  return (
    <div className={`glass flex flex-col ${compact ? "h-96" : "h-[70dvh]"}`}>
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 font-bold">
        <Sparkles size={18} className="text-cyan" /> دستیار هوشمند MODASR
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!msgs.length && ["کدوم اشتراک هوش مصنوعی برای من بهتره؟", "سفارشم کجاست؟", "شرایط بازگشت وجه چیه؟"].map((q) => (
          <button key={q} onClick={() => send(q)} className="block w-full rounded-xl border border-violet/40 px-4 py-3 text-start hover:bg-violet/10">{q}</button>
        ))}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 leading-8 ${m.role === "user" ? "bg-cyan/15" : "ms-auto border border-white/10 bg-white/5"}`}>{m.content}</div>
        ))}
        {busy && <div className="ms-auto flex w-16 gap-1 rounded-2xl bg-white/5 p-3">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-cyan" style={{ animationDelay: `${d * 120}ms` }} />)}</div>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-white/10 p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} className="input" placeholder="سؤالت رو بنویس…" />
        <button className="btn-primary !px-4" disabled={busy} aria-label="ارسال"><Send size={18} /></button>
      </form>
    </div>
  );
}
