"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { MessageCircle, Minus, RotateCcw, Send, Sparkles, X } from "lucide-react";

type ChatSource = { title: string; source: string; similarity: number };
type ChatMessage = { id: string; role: "user" | "assistant"; content: string; sources?: ChatSource[] };
const createMessageId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const welcome: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi, I’m Kuldeep’s portfolio assistant. Ask me about his projects, technical skills, education, or experience.",
};
const suggestions = [
  "Tell me about Kuldeep's technical background.",
  "What AI and Generative AI projects has he built?",
  "Explain his VoiceBot project.",
  "What is his experience with RAG?",
  "What technologies does he work with?",
  "Tell me about his internship at Technossus.",
  "What makes his projects technically interesting?",
];

export function PortfolioChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("portfolio-chat-open", openChat);
    return () => window.removeEventListener("portfolio-chat-open", openChat);
  }, []);

  useEffect(() => {
    if (!open) return;
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, pending, open]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const sendMessage = async (raw: string) => {
    const content = raw.trim();
    if (!content || pending) return;
    const userMessage: ChatMessage = { id: createMessageId(), role: "user", content };
    const history = messages.slice(1).slice(-8).map(({ role, content: text }) => ({ role, content: text }));
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setError("");
    setPending(true);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 35_000);
      let response: Response;
      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, history }),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeout);
      }
      const result = await response.json() as { answer?: string; sources?: ChatSource[]; error?: string };
      if (!response.ok) throw new Error(result.error || "The assistant could not respond. Please try again.");
      setMessages((current) => [...current, {
        id: createMessageId(),
        role: "assistant",
        content: result.answer || "I could not form an answer from the available portfolio information.",
        sources: result.sources ?? [],
      }]);
    } catch (caught) {
      const message = caught instanceof Error && caught.name === "AbortError"
        ? "That request took too long. Please try again."
        : caught instanceof Error ? caught.message : "The assistant could not respond. Please try again.";
      setError(message);
      setMessages((current) => [...current, { id: createMessageId(), role: "assistant", content: message }]);
    } finally {
      setPending(false);
      textareaRef.current?.focus();
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(draft);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(draft);
    }
  };

  const reset = () => {
    setMessages([welcome]);
    setDraft("");
    setError("");
  };

  return (
    <>
      {open && <section className="portfolio-chat-panel" aria-label="Kuldeep Thakur portfolio assistant">
        <header className="portfolio-chat-header">
          <span className="chat-avatar"><Sparkles size={16} /></span>
          <div className="chat-heading"><strong>Portfolio Assistant</strong><span><i /> Answers grounded in portfolio information</span></div>
          <button type="button" className="chat-icon-button" onClick={reset} aria-label="Clear conversation" title="Clear conversation"><RotateCcw size={15} /></button>
          <button type="button" className="chat-icon-button" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>
        </header>

        <div className="portfolio-chat-messages" ref={scrollRef} aria-live="polite" aria-relevant="additions text">
          {messages.map((message) => <article key={message.id} className={`chat-message chat-${message.role}`}>
            <p>{message.content}</p>
            {message.sources && message.sources.length > 0 && <div className="chat-sources"><span>PORTFOLIO SOURCES</span>{message.sources.map((source) => <span className="chat-source" key={`${source.title}:${source.source}`}>{source.title}</span>)}</div>}
          </article>)}
          {messages.length === 1 && <div className="chat-suggestions"><span>TRY ASKING</span>{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void sendMessage(suggestion)} disabled={pending}>{suggestion}</button>)}</div>}
          {pending && <div className="chat-message chat-assistant chat-loading" aria-label="Assistant is thinking"><span /><span /><span /></div>}
        </div>

        <form className="portfolio-chat-form" onSubmit={submit}>
          {error && <span className="chat-error" role="status">{error}</span>}
          <div className="chat-input-row">
            <textarea ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about Kuldeep’s work…" aria-label="Your message" maxLength={1500} rows={1} disabled={pending} />
            <button type="submit" aria-label="Send message" disabled={!draft.trim() || pending}><Send size={16} /></button>
          </div>
          <span className="chat-input-hint">ENTER TO SEND · SHIFT + ENTER FOR NEW LINE</span>
        </form>
      </section>}
      <button type="button" className={`portfolio-chat-launcher${open ? " is-open" : ""}`} onClick={() => setOpen((current) => !current)} aria-label={open ? "Minimize portfolio assistant" : "Ask the portfolio assistant"} aria-expanded={open}>
        {open ? <Minus size={20} /> : <><MessageCircle size={20} /><span>Ask me</span></>}
      </button>
    </>
  );
}
