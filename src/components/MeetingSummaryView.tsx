import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { 
  MeetingSummary, 
  SupportedLanguage, 
  SUPPORTED_LANGUAGES_META 
} from "../types";
import { 
  Calendar, 
  Languages, 
  FileText, 
  CheckSquare, 
  User, 
  Clipboard, 
  Download, 
  Cpu, 
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
  Edit3,
  Check
} from "lucide-react";

interface MeetingSummaryViewProps {
  summary: MeetingSummary;
  onTranslate: (lang: SupportedLanguage) => void;
  isTranslating: boolean;
  onReAnalyze?: (correctedTranscript: string) => void;
  isReAnalyzing?: boolean;
}

export function MeetingSummaryView({ 
  summary, 
  onTranslate, 
  isTranslating,
  onReAnalyze,
  isReAnalyzing = false
}: MeetingSummaryViewProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "decisions" | "actions" | "transcript">("summary");
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(summary.fullTranscript || "");

  // Update editedText when the summary switches or gets updated
  useEffect(() => {
    setEditedText(summary.fullTranscript || "");
    setIsEditing(false);
  }, [summary, summary.id, summary.fullTranscript]);

  // Check direction of rendering based on language metadata
  const currentLangMeta = Object.values(SUPPORTED_LANGUAGES_META).find(
    (meta) => meta.name.toLowerCase() === summary.targetLanguage.toLowerCase()
  ) || SUPPORTED_LANGUAGES_META.French;

  const isRtl = currentLangMeta.dir === "rtl";

  const handleCopy = () => {
    const formattedText = `
=== ${summary.title} ===
Date: ${summary.date}
Langues détectées: ${summary.languagesFound.join(", ")}
Langue du résumé: ${summary.targetLanguage}

--- RÉSUMÉ GÉNÉRAL ---
${summary.overallSummary}

--- DÉCISIONS CLÉS ---
${summary.keyDecisions.map((d, i) => `${i + 1}. ${d}`).join("\n")}

--- ACTIONS ET RESPONSABLES ---
${summary.actionItems.map((a) => `- [${a.priority}] ${a.task} (Responsable: ${a.owner})`).join("\n")}
    `;
    navigator.clipboard.writeText(formattedText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = `
# ${summary.title}
**Date:** ${summary.date}  
**Detected Languages:** ${summary.languagesFound.join(", ")}  
**Summary Language:** ${summary.targetLanguage}  

## 📌 Résumé Général / Executive Summary
${summary.overallSummary}

## 🎯 Décisions Clés / Key Decisions
${summary.keyDecisions.map((d) => `- [x] ${d}`).join("\n")}

## 📋 Discussion Points / Points de Discussion
${summary.discussionPoints.map((p) => `### 🔸 ${p.topic}\n${p.summary}`).join("\n\n")}

## ⚡ Action Items / Plan d'Action
${summary.actionItems.map((a) => `| ${a.task} | ${a.owner} | ${a.priority} |`).join("\n")}

---
*Généré par Liqa' Summarizer*
    `;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${summary.title.toLowerCase().replace(/\s+/g, "-")}-reunion.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full" id="summary-view-card">
      {/* Top Banner Context */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-500/30 text-indigo-300 font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-400/20 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-indigo-400" />
              Gemini 3.5 Summarizer
            </span>
            <div className="flex gap-1">
              {summary.languagesFound.map((lang, idx) => (
                <span key={idx} className="bg-slate-700/60 text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
                  {lang}
                </span>
              ))}
            </div>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight leading-snug">
            {summary.title || "Résumé de Réunion"}
          </h2>
          <div className="flex items-center gap-4 text-slate-400 text-xs mt-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {summary.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {summary.discussionPoints.length} sections clé{summary.discussionPoints.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Copy / Export Button Suite */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium transition"
            title="Copier le résumé complet"
            id="copy-to-clipboard-btn"
          >
            <Clipboard className="w-3.5 h-3.5" />
            {copied ? "Copié!" : "Copier"}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-xs font-semibold shadow-sm transition"
            title="Exporter en Markdown"
            id="download-markdown-btn"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter
          </button>
        </div>
      </div>

      {/* Translation Toolbar */}
      <div className="bg-slate-50 border-b border-slate-150 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1 font-medium text-slate-700">
          <Languages className="w-4 h-4 text-slate-500" />
          Traduire le rapport à la volée :
        </span>
        <div className="flex items-center gap-1.5">
          {(["French", "Arabic", "Darija", "English"] as SupportedLanguage[]).map((lang) => {
            const meta = SUPPORTED_LANGUAGES_META[lang];
            const isSelected = summary.targetLanguage.toLowerCase() === lang.toLowerCase();
            return (
              <button
                key={lang}
                onClick={() => onTranslate(lang)}
                disabled={isTranslating}
                className={`px-3 py-1 rounded-full font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSelected 
                    ? "bg-slate-900 border border-slate-900 text-white" 
                    : "bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-sm"
                }`}
                id={`translate-to-${lang.toLowerCase()}-btn`}
              >
                <span>{meta.flag}</span>
                <span>{meta.nativeName}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
              </button>
            );
          })}
          {isTranslating && (
            <RefreshCw className="w-3.5 h-3.5 text-slate-600 animate-spin ml-1" />
          )}
        </div>
      </div>

      {/* Interactive Tabs Menu */}
      <div className="border-b border-slate-200 flex overflow-x-auto text-sm font-medium bg-white">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-5 py-3 border-b-2 text-center whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === "summary"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          id="tab-summary-reunion"
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          Synthèse
        </button>

        <button
          onClick={() => setActiveTab("decisions")}
          className={`px-5 py-3 border-b-2 text-center whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === "decisions"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          id="tab-decisions-reunion"
        >
          <CheckSquare className="w-4 h-4 text-emerald-500" />
          Décisions Clés ({summary.keyDecisions.length})
        </button>

        <button
          onClick={() => setActiveTab("actions")}
          className={`px-5 py-3 border-b-2 text-center whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === "actions"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          id="tab-action-items"
        >
          <TrendingUp className="w-4 h-4 text-blue-500" />
          Plan d'Action ({summary.actionItems.length})
        </button>

        <button
          onClick={() => setActiveTab("transcript")}
          className={`px-5 py-3 border-b-2 text-center whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === "transcript"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          id="tab-meeting-transcript"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          Transcription & Texte Clean
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
        {activeTab === "summary" && (
          <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
            {/* Card Executive Summary */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative">
              <div className="absolute top-4 right-4 bg-slate-100 text-slate-500 rounded px-2 py-0.5 text-[10px] font-mono leading-none">
                Summary AI
              </div>
              <h3 className={`text-base font-semibold mb-3 ${isRtl ? "text-right" : "text-left"} text-slate-900`}>
                Executive Summary / Synthèse Générale
              </h3>
              <p className={`text-sm text-slate-700 leading-relaxed ${isRtl ? "text-right" : "text-left"} whitespace-pre-wrap`}>
                {summary.overallSummary}
              </p>
            </div>

            {/* Discussion Points List */}
            <div className="space-y-4">
              <h3 className={`text-sm font-semibold text-slate-500 uppercase tracking-wider ${isRtl ? "text-right" : "text-left"}`}>
                Points de discussions clés / Topics Breakdown
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {summary.discussionPoints.map((point, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition duration-150">
                    <h4 className={`text-sm font-bold text-slate-800 mb-1 flex items-center gap-2 ${isRtl ? "flex-row-reverse text-right" : "text-left"}`}>
                      <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 text-xs font-mono">
                        {index + 1}
                      </span>
                      <span>{point.topic}</span>
                    </h4>
                    <p className={`text-xs text-slate-600 leading-relaxed mt-1 ${isRtl ? "text-right" : "text-left"}`}>
                      {point.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "decisions" && (
          <div dir={isRtl ? "rtl" : "ltr"} className="space-y-3">
            <h3 className={`text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 ${isRtl ? "text-right" : "text-left"}`}>
              Décisions actées durant le meeting / Key Decisions Made
            </h3>
            
            {summary.keyDecisions.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
                Aucune décision majeure n'a été spécifiée de façon explicite.
              </div>
            ) : (
              summary.keyDecisions.map((decision, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-emerald-100 hover:border-emerald-200 shadow-2xs flex items-start gap-3.5 transition">
                  <div className="flex-shrink-0 w-5 h-5 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mt-0.5">
                    ✓
                  </div>
                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                    {decision}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "actions" && (
          <div dir={isRtl ? "rtl" : "ltr"} className="space-y-4">
            <h3 className={`text-xs font-semibold text-slate-500 uppercase tracking-wider ${isRtl ? "text-right" : "text-left"}`}>
              Responsabilités attribuées / Action Plan
            </h3>

            {summary.actionItems.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
                Aucune action décelée dans ce compte-rendu.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono">
                    <tr className={isRtl ? "text-right" : ""}>
                      <th className="px-4 py-3 font-semibold">Tâche</th>
                      <th className="px-4 py-3 font-semibold w-32">Responsable</th>
                      <th className="px-4 py-3 font-semibold w-24">Priorité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {summary.actionItems.map((item, idx) => {
                      const priorityColor = 
                        item.priority.toLowerCase().includes("high") || item.priority.toLowerCase().includes("elev") || item.priority.includes("عالي")
                          ? "bg-rose-50 text-rose-700 border-rose-200" 
                          : item.priority.toLowerCase().includes("med") || item.priority.toLowerCase().includes("moy") || item.priority.includes("متوسط")
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200";

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 text-slate-800 font-medium leading-relaxed">
                            {item.task}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold">
                              <User className="w-3 h-3 text-slate-400" />
                              {item.owner || "Tout le groupe"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${priorityColor}`}>
                              {item.priority}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "transcript" && (
          <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 block">
                    Mode d'édition de l'enregistrement de réunion :
                  </span>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded font-mono">
                    Corrigez l'IA avant analyse
                  </span>
                </div>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full h-80 bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed shadow-inner"
                  placeholder="Corrigez la transcription ici..."
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedText(summary.fullTranscript || "");
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition"
                    disabled={isReAnalyzing}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (onReAnalyze) {
                        onReAnalyze(editedText);
                      }
                    }}
                    disabled={isReAnalyzing || !editedText.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    {isReAnalyzing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Calcul en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                        Appliquer et Ré-Analyser
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-800 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-700 shadow-sm leading-relaxed max-h-[460px] whitespace-pre-wrap">
                  {summary.fullTranscript || "Transcription indisponible ou texte d'origine vide."}
                </div>
                
                {/* Visual feedback notice block to elevate accuracy */}
                {onReAnalyze && (
                  <div className="bg-white p-4 rounded-xl border border-dashed border-slate-250 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                        Précision de l'IA & Personnalisation
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal max-w-md">
                        L'IA n'a pas parfaitement compris un terme technique de l'anglais ou un mot en Darija algérienne ? Améliorez la transcription brute manuellement pour régénérer un rapport 100% exact.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow"
                      id="edit-transcript-inline-btn"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                      Modifier le texte
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 italic">
                  * La transcription de la réunion est filtrée et ordonnancée de façon chronologique par l'IA.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
