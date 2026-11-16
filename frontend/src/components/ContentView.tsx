"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Sparkles, UploadCloud, Video } from "lucide-react";
import { api } from "@/lib/api";
import { ContentItem } from "@/types";

interface ContentViewProps {
  onCardsUpdated: () => void;
}

export function ContentView({ onCardsUpdated }: ContentViewProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [duration, setDuration] = useState(45);
  const [niche, setNiche] = useState("Direito");

  const loadItems = useCallback(async () => {
    const data = await api.listContent();
    setItems(data);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) return;
    await api.captureContent({
      source_url: sourceUrl,
      original_caption: caption,
      duration_seconds: Number(duration),
      niche,
      create_kanban_card: true,
    });
    setSourceUrl("");
    setCaption("");
    await loadItems();
    onCardsUpdated();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Video className="h-4 w-4 text-amber-400" />
            Projeto Satélite: Esteira Instagram → YouTube (Shorts &amp; Longo)
          </h2>
          <p className="text-xs text-slate-400">
            Capture vídeos do Instagram, deixe a IA gerar título SEO, descrição e
            tags, classifique Shorts (&lt;60s) e aprove a publicação.
          </p>
        </div>

        <form onSubmit={handleCapture} className="grid gap-3 md:grid-cols-4">
          <input
            placeholder="URL do Reel / caminho MP4"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="Nicho (ex: Direito)"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <input
            type="number"
            min={5}
            max={3600}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            placeholder="Duração (s)"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            <Sparkles className="h-4 w-4" />
            Capturar &amp; Gerar SEO
          </button>
          <textarea
            rows={2}
            placeholder="Legenda original do Instagram ou transcrição do vídeo..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            required
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white md:col-span-4"
          />
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-semibold uppercase text-amber-300">
                  {item.format_type === "shorts"
                    ? `YouTube Shorts (${item.duration_seconds}s)`
                    : `Vídeo Longo (${item.duration_seconds}s)`}
                </span>
                <span className="text-slate-400">
                  Agendado: {item.scheduled_for || "Imediato"}
                </span>
              </div>

              <h3 className="mb-1 text-sm font-semibold text-white">
                {item.ai_title}
              </h3>
              <p className="mb-2 whitespace-pre-wrap text-xs text-slate-300">
                {item.ai_description}
              </p>
              <div className="mb-3 text-[11px] text-indigo-300">
                Tags: {item.ai_tags}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              {item.status === "published" ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Publicado ({item.youtube_video_id})
                </span>
              ) : (
                <button
                  onClick={async () => {
                    await api.approvePublishContent(item.id);
                    await loadItems();
                    onCardsUpdated();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Aprovar &amp; Publicar no YouTube
                </button>
              )}

              {item.card_id && (
                <span className="text-xs text-slate-400">
                  Card #{item.card_id}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

