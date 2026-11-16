"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Inbox,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, ChannelMessage, SourceChannel } from "@/types";

interface IntakeViewProps {
  cards: Card[];
  onSelectCard: (card: Card) => void;
  onCardsUpdated: () => void;
}

export function IntakeView({
  cards,
  onSelectCard,
  onCardsUpdated,
}: IntakeViewProps) {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [channel, setChannel] = useState<SourceChannel>("whatsapp");
  const [senderName, setSenderName] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const loadMessages = useCallback(async () => {
    const data = await api.listMessages();
    setMessages(data);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawContent.trim()) return;
    const res = await api.simulateInbound({
      channel,
      sender_name: senderName || "Cliente",
      raw_content: rawContent,
    });
    setRawContent("");
    setSenderName("");
    setStatusMsg(
      `Triagem IA concluída: Card #${res.card.id} ("${res.card.title}") criado na coluna Triagem.`
    );
    await loadMessages();
    onCardsUpdated();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      {/* Left: Simulate / Ingest Unstructured Message */}
      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            Entrada Multicanal &amp; Triagem Automática
          </h2>
          <p className="text-xs text-slate-400">
            Cole uma mensagem solta de WhatsApp, E-mail ou Zendesk. A IA
            identifica o projeto, define prioridade e cria o card no Kanban.
          </p>
        </div>

        <form onSubmit={handleSimulate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as SourceChannel)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="zendesk">Zendesk</option>
              <option value="email">E-mail</option>
              <option value="basecamp">Basecamp</option>
            </select>

            <input
              placeholder="Nome do cliente"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <textarea
            rows={4}
            placeholder="Ex: Oi Cláudio, na AILA o botão de exportar capítulo travou de novo quando tem mais de 50 páginas, urgente!"
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Send className="h-4 w-4" />
            Receber &amp; Triangular com IA
          </button>
        </form>

        {statusMsg && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300">
            {statusMsg}
          </div>
        )}
      </div>

      {/* Right: Unified Feed */}
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <Inbox className="h-4 w-4 text-sky-400" />
          Fluxo de Mensagens (Entrada &amp; Saída Bidirecional)
        </h2>

        <div className="space-y-2.5">
          {messages.map((m) => {
            const linked = m.card_id
              ? cards.find((c) => c.id === m.card_id)
              : null;
            return (
              <div
                key={m.id}
                className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5"
              >
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {m.direction === "inbound" ? (
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 text-sky-400" />
                    )}
                    <span className="font-semibold uppercase text-slate-300">
                      {m.channel}
                    </span>
                    <span className="text-slate-400">· {m.sender_name || "Sistema"}</span>
                  </div>
                  {linked && (
                    <button
                      onClick={() => onSelectCard(linked)}
                      className="text-indigo-400 underline hover:text-indigo-300"
                    >
                      Card #{linked.id}
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-200">{m.raw_content}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

