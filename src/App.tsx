import { useState, useEffect, useRef } from "react";
import { 
  MeetingSummary, 
  SupportedLanguage, 
  SUPPORTED_LANGUAGES_META 
} from "./types";
import { MEETING_SAMPLES, MeetingSample } from "./data/samples";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { MeetingSummaryView } from "./components/MeetingSummaryView";
import { DarijaLexicon } from "./components/DarijaLexicon";
import { 
  Mic, 
  Square, 
  Upload, 
  FileText, 
  History, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  Play, 
  Info,
  Clock,
  AudioLines,
  CornerDownRight,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  ExternalLink,
  Settings,
  RefreshCw
} from "lucide-react";

export default function App() {
  // UI Tabs & Navigation states
  const [activeInputTab, setActiveInputTab] = useState<"record" | "file" | "text">("record");
  const [meetingsHistory, setMeetingsHistory] = useState<MeetingSummary[]>([]);
  const [currentSummary, setCurrentSummary] = useState<MeetingSummary | null>(null);
  
  // Form input states
  const [manualTranscript, setManualTranscript] = useState("");
  const [contextNotes, setContextNotes] = useState("");
  const [outputLanguage, setOutputLanguage] = useState<SupportedLanguage>("French");
  const [darijaVariant, setDarijaVariant] = useState<string>("Général");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  
  // Real-time audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [recorderDuration, setRecorderDuration] = useState(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioContextState, setAudioContextState] = useState<AudioContext | null>(null);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isInsideIframe, setIsInsideIframe] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  // Enumerate dynamic microphone sources for users to pick their input device
  const refreshAudioDevices = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === "audioinput");
      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        // Default to system default input if present, or the first active one
        const fallbackDev = audioInputs.find(d => d.deviceId === "default") || audioInputs[0];
        setSelectedDeviceId(fallbackDev.deviceId);
      }
    } catch (err) {
      console.warn("Impossible d'énumérer les périphériques audio:", err);
    }
  };

  useEffect(() => {
    refreshAudioDevices();
  }, [activeInputTab]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Status & loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isServerHealthy, setIsServerHealthy] = useState<boolean | null>(null);

  // Gemini API Custom Key State Variables
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem("custom_gemini_api_key") || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [keyTestError, setKeyTestError] = useState("");

  // Helper to dynamically inject custom API key into headers
  const getHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const savedKey = localStorage.getItem("custom_gemini_api_key");
    if (savedKey) {
      headers["x-gemini-api-key"] = savedKey;
    }
    return headers;
  };

  const handleTestApiKey = async (keyToTest: string) => {
    if (!keyToTest) {
      setKeyTestStatus("error");
      setKeyTestError("Veuillez saisir une clé d'API valide.");
      return;
    }
    setKeyTestStatus("testing");
    setKeyTestError("");
    try {
      const headers: Record<string, string> = {};
      if (keyToTest) {
        headers["x-gemini-api-key"] = keyToTest;
      }
      const response = await fetch("/api/health", { headers });
      const data = await response.json();
      if (data.apiKeyConfigured) {
        setKeyTestStatus("success");
        setIsServerHealthy(true);
        // Save to local storage
        localStorage.setItem("custom_gemini_api_key", keyToTest);
        setCustomApiKey(keyToTest);
      } else {
        setKeyTestStatus("error");
        setKeyTestError(data.message || "La clé d'API a été rejetée par Google Gemini.");
      }
    } catch (err: any) {
      setKeyTestStatus("error");
      setKeyTestError("Impossible de se connecter au serveur de test.");
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem("custom_gemini_api_key");
    setCustomApiKey("");
    setKeyTestStatus("idle");
    setKeyTestError("");
    // Re-check general server health without a key override
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setIsServerHealthy(data.apiKeyConfigured);
      })
      .catch(() => {
        setIsServerHealthy(false);
      });
  };

  // Initialize and load meeting summaries from localStorage
  useEffect(() => {
    setIsInsideIframe(window.self !== window.top);
    setCurrentUrl(window.location.href);

    const saved = localStorage.getItem("liqa_meetings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMeetingsHistory(parsed);
        if (parsed.length > 0) {
          setCurrentSummary(parsed[0]);
        }
      } catch (err) {
        console.error("Failed to parse local summaries", err);
      }
    } else {
      // Bootstrap with a welcome placeholder history item so the app is immediately alive
      const welcomeSummary: MeetingSummary = {
        id: "welcome-tour",
        title: "Réunion d'Orientation - Bienvenue sur Liqa' Summarizer",
        date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
        languagesFound: ["French", "English", "Darija"],
        overallSummary: "Bienvenue sur Liqa' ! Cette application utilise l'IA de Google Gemini pour transcrire, reformuler et analyser vos réunions d'affaires ou techniques. Elle supporte le mixage linguistique (Darija algérienne, Arabe standard, Français, Anglais), courant dans les discussions professionnelles. \n\nVous pouvez enregistrer votre réunion en direct via votre micro, importer un fichier audio ou coller une transcription existante pour la transformer en rapport exécutif exhaustif avec plans d'actions clairs.",
        keyDecisions: [
          "Adopter Liqa' pour résumer instantanément les réunions techniques et marketing de l'entreprise.",
          "Utiliser le traducteur à la volée pour partager les comptes-rendus avec nos partenaires étrangers en Français, Arabe ou Anglais."
        ],
        discussionPoints: [
          {
            topic: "Introduction aux fonctionnalités principales",
            summary: "L'utilisateur peut enregistrer de l'audio directement dans le navigateur ou uploader des fichiers .mp3 ou .wav. L'IA extrait à la fois la transcription originale et produit une analyse structurée."
          },
          {
            topic: "Le multilinguisme et la Darija",
            summary: "Le système est entraîné à repérer les alternances codiques (code-switching Algérien-Français) et restitue des résumés soignés dans la langue cible de votre choix."
          }
        ],
        actionItems: [
          {
            task: "Enregistrer votre premier compte-rendu ou tester et charger un exemple pré-rempli ci-dessous",
            owner: "Vous (Utilisateur)",
            priority: "High"
          },
          {
            task: "Configurer la clé d'API Google Gemini si les appels renvoient des alertes",
            owner: "Administrateur",
            priority: "Medium"
          }
        ],
        fullTranscript: "Exemple de transcription de bienvenue : salut tout le monde ! Nous allons enregistrer nos réunions algériennes et internationales très simplement maintenant grâce aux prompts de transcription.",
        targetLanguage: "French"
      };
      setMeetingsHistory([welcomeSummary]);
      setCurrentSummary(welcomeSummary);
    }

    // Ping health server with custom API key if saved
    const headers: Record<string, string> = {};
    const savedKey = localStorage.getItem("custom_gemini_api_key");
    if (savedKey) {
      headers["x-gemini-api-key"] = savedKey;
    }
    fetch("/api/health", { headers })
      .then((res) => res.json())
      .then((data) => {
        setIsServerHealthy(data.apiKeyConfigured);
        if (savedKey && data.apiKeyConfigured) {
          setKeyTestStatus("success");
        }
      })
      .catch((err) => {
        console.error("Health check lookup failed", err);
        setIsServerHealthy(false);
      });
  }, []);

  // Timer side-effect for voice recorder
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecorderDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecorderDuration(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // Format seconds to elegant mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to create a synthetic speech-realistic WAV file
  const createSyntheticWav = (durationSeconds = 8) => {
    const sampleRate = 8000;
    const numChannels = 1;
    const numSamples = sampleRate * durationSeconds;
    const byteLength = 44 + numSamples * 2;
    const buffer = new ArrayBuffer(byteLength);
    const view = new DataView(buffer);

    const writeString = (v: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        v.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let offsetHeader = 44;
    for (let i = 0; i < numSamples; i++, offsetHeader += 2) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 220 * t) * 0.3 + 
                     Math.sin(2 * Math.PI * 440 * t) * 0.15 + 
                     Math.sin(2 * Math.PI * 110 * t) * 0.1;
      const intSample = Math.max(-32768, Math.min(32767, sample * 32768));
      view.setInt16(offsetHeader, intSample, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  // Simulated Voice Recording handlers for sandbox environments
  const handleStartSimulatedRecording = () => {
    setErrorBanner(null);
    chunksRef.current = [];
    setRecordedBlobUrl(null);
    setAudioBase64(null);
    setAudioMimeType(null);
    setIsSimulated(true);

    // Mock mediaStream for visualizer
    setMediaStream(null); 
    setIsRecording(true);
  };

  const handleStopSimulatedRecording = () => {
    if (isRecording && isSimulated) {
      setIsRecording(false);
      
      const syntheticBlob = createSyntheticWav(recorderDuration || 6);
      setRecordedBlobUrl(URL.createObjectURL(syntheticBlob));
      setAudioMimeType("audio/wav");

      const reader = new FileReader();
      reader.readAsDataURL(syntheticBlob);
      reader.onloadend = () => {
        const rawBase64 = (reader.result as string).split(",")[1];
        setAudioBase64(rawBase64);
      };
    }
  };

  // Real-time Voice Recording start/stop handlers
  const handleStartRecording = async () => {
    setErrorBanner(null);
    chunksRef.current = [];
    setRecordedBlobUrl(null);
    setAudioBase64(null);
    setAudioMimeType(null);
    setIsSimulated(false);

    try {
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedDeviceId ? { deviceId: { ideal: selectedDeviceId } } : true
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (deviceError) {
        console.warn("Could not capture with exact deviceId, trying defaults:", deviceError);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      setMediaStream(stream);

      // Initialize and resume AudioContext directly within user-click callback stack to satisfy modern browser gesture requirements.
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const actx = new AudioContextClass();
          if (actx.state === "suspended") {
            await actx.resume();
          }
          setAudioContextState(actx);
        }
      } catch (e) {
        console.warn("Failed to warm up AudioContext on user gesture", e);
      }

      // Refresh devices now that permission is granted (to load readable names/labels)
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(d => d.kind === "audioinput");
          setAudioDevices(audioInputs);
        } catch (e) {
          console.warn("Could not re-enumerate audio devices", e);
        }
      }

      // Try multiple MimiTypes for complete browser compatibility
      let recorder: MediaRecorder;
      let chosenMime = "audio/webm";
      
      const mimeTypesToTry = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/aac",
        "audio/wav",
        "" // system default
      ];

      let success = false;
      for (const mime of mimeTypesToTry) {
        try {
          if (!mime || MediaRecorder.isTypeSupported(mime)) {
            const opts = mime ? { mimeType: mime } : undefined;
            recorder = new MediaRecorder(stream, opts);
            chosenMime = mime || recorder.mimeType;
            success = true;
            break;
          }
        } catch (e) {
          console.warn(`MimeType ${mime} not supported by this browser. Trying next...`);
        }
      }

      if (!success) {
        recorder = new MediaRecorder(stream);
        chosenMime = recorder.mimeType;
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, { type: chosenMime || "audio/webm" });
        setRecordedBlobUrl(URL.createObjectURL(recordedBlob));
        setAudioMimeType(recordedBlob.type || "audio/webm");

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(recordedBlob);
        reader.onloadend = () => {
          const rawBase64 = (reader.result as string).split(",")[1];
          setAudioBase64(rawBase64);
        };
      };

      mediaRecorderRef.current = recorder;
      recorder.start(500); // chunk size 500ms
      setIsRecording(true);
    } catch (err: any) {
      console.error("Failed to access microphone", err);
      setErrorBanner(
        "Accès au microphone bloqué (courant dans la prévisualisation iFrame). Pas de panique ! Cliquez sur 'Simulation' pour tester un enregistrement virtuel, ou utilisez l'onglet 'Coller un Texte'."
      );
    }
  };

  const handleStopRecording = () => {
    if (isSimulated) {
      handleStopSimulatedRecording();
      return;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop and release audio tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }

      // Close AudioContext if open
      if (audioContextState) {
        audioContextState.close().catch(e => console.warn("Error closing AudioContext", e));
        setAudioContextState(null);
      }
    }
  };

  // Audio File Upload change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorBanner(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (recommend under 20MB for direct base64 json transfers)
    if (file.size > 25 * 1024 * 1024) {
      setErrorBanner("Le fichier audio est trop volumineux (durée maximum conseillée : 1 heure, taille max : 25 Mo).");
      return;
    }

    setSelectedFile(file);
    setAudioMimeType(file.type || "audio/mpeg");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const rawBase64 = (reader.result as string).split(",")[1];
      setAudioBase64(rawBase64);
    };
  };

  // Help template quick selector
  const handleLoadSample = (sample: MeetingSample) => {
    setErrorBanner(null);
    setManualTranscript(sample.transcript);
    setContextNotes(sample.notes);
    setActiveInputTab("text");
    
    // Automatically trigger analysis with overrides in a single click
    handleGenerateSummary(sample.transcript, sample.notes, "text");
  };

  // Instant 1-Click Simulated Voice Recording & Analysis (perfect for iframes/sandboxes)
  const handleInstantSimulatedAnalysis = async () => {
    setErrorBanner(null);
    setIsSimulated(true);
    setActiveInputTab("record");
    setIsLoading(true);
    setLoadingStep("Génération d'un flux audio test réaliste et transmission à Gemini...");

    try {
      // Create a small, valid synthetic WAV audio blob so the client has visual player state
      const syntheticBlob = createSyntheticWav(10);
      const audioUrl = URL.createObjectURL(syntheticBlob);
      setRecordedBlobUrl(audioUrl);
      setAudioMimeType("audio/wav");

      const reader = new FileReader();
      reader.readAsDataURL(syntheticBlob);
      reader.onloadend = async () => {
        const rawBase64 = (reader.result as string).split(",")[1];
        setAudioBase64(rawBase64);

        // Instantly generate summary from simulation
        await handleGenerateSummary(
          undefined,
          undefined,
          "record",
          rawBase64,
          "audio/wav",
          true
        );
      };
    } catch (e: any) {
      console.error(e);
      setErrorBanner("La simulation instantanée a échoué. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  // Submit Handler for Summarization with absolute parameters
  const handleGenerateSummary = async (
    overrideTranscript?: string,
    overrideNotes?: string,
    overrideTab?: string,
    overrideAudioBase64?: string | null,
    overrideAudioMimeType?: string | null,
    overrideIsSimulated?: boolean
  ) => {
    setErrorBanner(null);

    const activeTab = overrideTab || activeInputTab;
    const transcriptToUse = overrideTranscript !== undefined ? overrideTranscript : manualTranscript;
    const notesToUse = overrideNotes !== undefined ? overrideNotes : contextNotes;
    const base64ToUse = overrideAudioBase64 !== undefined ? overrideAudioBase64 : audioBase64;
    const mimeToUse = overrideAudioMimeType !== undefined ? overrideAudioMimeType : audioMimeType;
    const isSimulatedFlag = overrideIsSimulated !== undefined ? overrideIsSimulated : isSimulated;

    // Guard parameters
    if (activeTab === "record" && !base64ToUse) {
      setErrorBanner("Veuillez d'abord enregistrer un message audio ou utiliser le simulateur intelligent de réunion (1-Clic).");
      return;
    }
    if (activeTab === "file" && !base64ToUse) {
      setErrorBanner("Veuillez sélectionner et uploader un fichier audio valide.");
      return;
    }
    if (activeTab === "text" && !transcriptToUse.trim()) {
      setErrorBanner("Veuillez saisir ou coller la transcription d'une réunion à analyser.");
      return;
    }

    setIsLoading(true);
    setLoadingStep("Initialisation de l'analyse Google Gemini...");

    try {
      // Step-by-step loading animation timers for reassurance
      const loadingSequence = [
        "Recherche de mixage de langues (Darija algérienne, Français, Arabe standard)...",
        "Modélisation acoustique & filtrage des décisions majeures...",
        "Calcul des propriétaires d'actions et des priorités stratégiques...",
        "Formatage du rapport exécutif final..."
      ];
      
      let stepIdx = 0;
      const stepTimer = setInterval(() => {
        if (stepIdx < loadingSequence.length) {
          setLoadingStep(loadingSequence[stepIdx]);
          stepIdx++;
        }
      }, 3500);

      const requestBody: any = {
        outputLanguage: outputLanguage,
        contextNotes: notesToUse,
        darijaVariant: darijaVariant,
      };

      if (activeTab === "record" || activeTab === "file") {
        requestBody.audioData = base64ToUse;
        requestBody.mimeType = mimeToUse;
        if (activeTab === "record" && isSimulatedFlag) {
          requestBody.isSimulated = true;
        }
      } else {
        requestBody.manualTranscript = transcriptToUse;
      }

      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(requestBody),
      });

      clearInterval(stepTimer);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Le serveur a renvoyé un code de statut invalide.");
      }

      const summaryResult: MeetingSummary = await response.json();
      
      // Inject details generated locally
      summaryResult.id = "summary-" + Date.now();
      summaryResult.date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
      summaryResult.targetLanguage = outputLanguage;

      // Clean default title if empty
      if (!summaryResult.title) {
        summaryResult.title = "Compte-rendu de Réunion Multilingue";
      }

      // Add to history and make active
      const updatedHistory = [summaryResult, ...meetingsHistory];
      setMeetingsHistory(updatedHistory);
      setCurrentSummary(summaryResult);
      localStorage.setItem("liqa_meetings", JSON.stringify(updatedHistory));

      // Scroll to summary viewport smoothly
      setTimeout(() => {
        document.getElementById("summary-view-card")?.scrollIntoView({ behavior: "smooth" });
      }, 300);

    } catch (err: any) {
      console.error("Failed to generate summary", err);
      setErrorBanner(
        err.message || 
        "Une erreur s'est produite lors de l'appel système Réseau vers Gemini. Veuillez vérifier votre clé d'API ou votre fichier audio."
      );
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  // Translate existing summary on the fly
  const handleTranslateSummary = async (targetLang: SupportedLanguage) => {
    if (!currentSummary) return;
    
    // Skip if already in this language
    if (currentSummary.targetLanguage.toLowerCase() === targetLang.toLowerCase()) {
      return;
    }

    setIsTranslating(true);
    setErrorBanner(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          summaryData: currentSummary,
          targetLanguage: targetLang,
        }),
      });

      if (!response.ok) {
        throw new Error("La traduction à la volée a échoué.");
      }

      const translatedSummary: MeetingSummary = await response.json();

      // Keep original metadata
      translatedSummary.id = currentSummary.id;
      translatedSummary.date = currentSummary.date;
      translatedSummary.targetLanguage = targetLang;

      // Update current summary
      setCurrentSummary(translatedSummary);

      // Update in history list to match
      const updatedHistory = meetingsHistory.map((m) => 
        m.id === currentSummary.id ? translatedSummary : m
      );
      setMeetingsHistory(updatedHistory);
      localStorage.setItem("liqa_meetings", JSON.stringify(updatedHistory));

    } catch (err: any) {
      console.error("Translation fail", err);
      setErrorBanner("La traduction instantanée a échoué. Veuillez vérifier la connexion au serveur.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Re-analyze a meeting using updated transcript corrections to raise accuracy
  const handleReAnalyzeFromTranscript = async (correctedTranscript: string) => {
    if (!currentSummary) return;

    setIsReAnalyzing(true);
    setErrorBanner(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          manualTranscript: correctedTranscript,
          outputLanguage: currentSummary.targetLanguage,
          contextNotes: contextNotes || "Correction manuelle de la transcription par l'utilisateur",
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "La régénération a échoué.");
      }

      const summaryResult: MeetingSummary = await response.json();
      
      // Preserve tracking info and dates
      summaryResult.id = currentSummary.id;
      summaryResult.date = currentSummary.date;
      summaryResult.targetLanguage = currentSummary.targetLanguage;

      if (!summaryResult.title) {
        summaryResult.title = "Compte-rendu Corrigé";
      }

      // Update in history list
      const updatedHistory = meetingsHistory.map((m) => 
        m.id === currentSummary.id ? summaryResult : m
      );
      setMeetingsHistory(updatedHistory);
      setCurrentSummary(summaryResult);
      localStorage.setItem("liqa_meetings", JSON.stringify(updatedHistory));

    } catch (err: any) {
      console.error("Failed to re-analyze from corrected transcript", err);
      setErrorBanner(
        err.message || 
        "Impossible de régénérer le compte-rendu. Veuillez vérifier la connexion au serveur Gemini."
      );
    } finally {
      setIsReAnalyzing(false);
    }
  };

  // Delete summary history item
  const handleDeleteHistory = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting deleted item
    const updated = meetingsHistory.filter((m) => m.id !== idToDelete);
    setMeetingsHistory(updated);
    localStorage.setItem("liqa_meetings", JSON.stringify(updated));

    if (currentSummary?.id === idToDelete) {
      if (updated.length > 0) {
        setCurrentSummary(updated[0]);
      } else {
        setCurrentSummary(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Professional Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 via-violet-600 to-indigo-700 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <AudioLines className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-950 font-sans tracking-tight">Liqa' Summarizer</span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase border border-slate-200 font-mono">
                  v1.2 - Multi-lang
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Transcription & Synthèse Automatique : Darija / Arabe / Français / Anglais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Server API Secrets Badge */}
            {isServerHealthy === false && (
              <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-lg text-xs leading-none">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Clé API manquante ou invalide</span>
              </div>
            )}
            {isServerHealthy === true && (
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-xs leading-none">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-medium">Serveur Gemini Actif</span>
              </div>
            )}
            
            {isInsideIframe && currentUrl && (
              <a 
                href={currentUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition shadow-sm animate-pulse"
                id="open-new-tab-header-btn"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir en plein écran (Microphone OK) ↗</span>
              </a>
            )}
            
            <a 
              href="#demo-samples" 
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-lg transition"
            >
              Exemples d'essais 💡
            </a>
          </div>
        </div>
      </header>

      {/* Main Structural Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* API Warning banner */}
        {isServerHealthy === false && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex gap-3 text-amber-900 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900">Variables d'environnement non configurées</h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Le serveur s'est lancé correctement mais n'a pas détecté la clé secrète <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">GEMINI_API_KEY</code>.
                Pour activer le service, configurez votre clé d'API Google dans le panneau <strong>Settings &gt; Secrets</strong> de Google AI Studio, puis rechargez l'application.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Error alert banner */}
        {errorBanner && (
          <div className="bg-rose-50 rounded-xl border border-rose-200 p-4 flex gap-3 text-rose-900 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold">Une erreur est survenue</h4>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">{errorBanner}</p>
            </div>
          </div>
        )}

        {/* Upper Grid: Inputs + History Sidebar vs. Live Results */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel & control column (span 5) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Clé d'API Gemini Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-950 flex items-center gap-1.5">
                  <span className="bg-indigo-50 text-indigo-600 p-1 rounded-lg">
                    <Settings className="w-4 h-4" />
                  </span>
                  Clé d'API Google Gemini
                </span>
                {customApiKey ? (
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
                    Configuration active
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                    Par défaut (Serveur)
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  L'application utilise l'IA de Google pour transcrire et synthétiser vos réunions. Vous pouvez saisir votre propre clé d'API personnelle ci-dessous. Elle sera sauvegardée localement dans votre navigateur.
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Saisir votre clé d'API Gemini :
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
                      />
                      {customApiKey && (
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-semibold"
                        >
                          {showApiKey ? "Masquer" : "Afficher"}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleTestApiKey(customApiKey)}
                      disabled={keyTestStatus === "testing"}
                      className={`px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex-shrink-0 flex items-center gap-1 ${
                        keyTestStatus === "testing"
                          ? "bg-slate-100 text-slate-400"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                      }`}
                    >
                      {keyTestStatus === "testing" ? "Validation..." : "Tester & Sauver"}
                    </button>
                  </div>
                </div>

                {/* Validation feedbacks */}
                {keyTestStatus === "success" && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-[11px] text-emerald-800 flex items-start gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Clé validée avec succès !</p>
                      <p className="text-emerald-700 text-[10px] mt-0.5">La clé d'API est active et sera utilisée pour toutes vos requêtes.</p>
                    </div>
                  </div>
                )}

                {keyTestStatus === "error" && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-[11px] text-rose-800 flex items-start gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Échec de la validation</p>
                      <p className="text-rose-700 text-[10px] mt-0.5 leading-normal">{keyTestError}</p>
                    </div>
                  </div>
                )}

                {customApiKey && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleClearApiKey}
                      className="text-slate-400 hover:text-rose-600 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Réinitialiser la clé d'API
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Control Deck Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-spin-slow" />
                  Alimenter votre Réunion
                </span>
                <span className="text-xs text-slate-400">Choisir une méthode</span>
              </div>

              {/* Tab options selectors */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveInputTab("record")}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeInputTab === "record" 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                  }`}
                  id="tab-select-record"
                >
                  <Mic className="w-3.5 h-3.5" />
                  Direct
                </button>
                <button
                  onClick={() => setActiveInputTab("file")}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeInputTab === "file" 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                  }`}
                  id="tab-select-file"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Audio
                </button>
                <button
                  onClick={() => setActiveInputTab("text")}
                  className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeInputTab === "text" 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                  }`}
                  id="tab-select-text"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Texte
                </button>
              </div>

              {/* Active Tab View details */}
              <div className="min-h-36 flex flex-col justify-center">
                {activeInputTab === "record" && (
                  <div className="space-y-4">
                    {isInsideIframe && currentUrl && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 animate-fade-in text-xs text-slate-700">
                        <div className="flex items-center gap-2 text-amber-800 font-bold">
                          <AlertCircle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0" />
                          <span>Le Microphone est bloqué par l'iFrame de prévisualisation ?</span>
                        </div>
                        <p className="text-[11.5px] text-slate-600 leading-relaxed">
                          Les navigateurs restreignent la capture du micro au sein des cadres d'intégration (iFrames). Pour utiliser pleinement votre microphone sans restriction de sécurité :
                        </p>
                        <a 
                          href={currentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-[11px] rounded-lg shadow-xs hover:shadow-sm transition cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          OUVRIR DANS UN NOUVEL ONGLET ↗
                        </a>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg flex items-start gap-2">
                      <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>
                        Enregistrez votre voix ou réunion en direct. Gemini transcrira la Darija algérienne, l'Arabe standard, le Français et l'Anglais à la volée.
                      </span>
                    </p>

                    {/* Source d'entrée / Microphone Selector */}
                    {!isRecording && (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 space-y-2">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Settings className="w-3.5 h-3.5 text-indigo-500" />
                            Périphérique d'entrée micro :
                          </span>
                          <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Détecté
                          </span>
                        </label>
                        <div className="flex gap-1.5">
                          {audioDevices.length > 0 ? (
                            <select
                              value={selectedDeviceId}
                              onChange={(e) => setSelectedDeviceId(e.target.value)}
                              className="bg-white border border-slate-200 text-xs rounded-lg block w-full py-1.5 px-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium shadow-2xs cursor-pointer"
                            >
                              {audioDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Microphone par défaut (${device.deviceId.slice(0, 5)}...)`}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={refreshAudioDevices}
                              className="flex-1 text-left text-xs bg-white border border-slate-200 py-1.5 px-3 rounded-lg text-slate-500 hover:text-slate-800 transition shadow-2xs cursor-pointer"
                            >
                              Cliquez pour lister les microphones...
                            </button>
                          )}
                          <button
                            onClick={refreshAudioDevices}
                            title="Actualiser la liste des micros"
                            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition shadow-2xs cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Interactive Recording Area */}
                    <div className="space-y-3">
                      <AudioVisualizer isRecording={isRecording} mediaStream={mediaStream} audioContext={audioContextState} />

                      <div className="flex items-center justify-between gap-3 bg-slate-55 p-1 rounded-xl">
                        {!isRecording ? (
                          <button
                            onClick={handleStartRecording}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-550 active:scale-98 transition rounded-xl text-white font-semibold text-sm cursor-pointer shadow-sm shadow-red-100"
                            id="start-mic-recording-btn"
                          >
                            <Mic className="w-4.5 h-4.5 animate-pulse" />
                            Lancer l'Enregistrement
                          </button>
                        ) : (
                          <div className="flex w-full items-center gap-2">
                            <div className={`flex items-center gap-2 font-mono text-sm px-4 py-3 rounded-xl ${
                              isSimulated ? "bg-indigo-950 border border-indigo-800 text-indigo-200" : "bg-slate-900 text-white"
                            }`}>
                              <span className={`w-2 h-2 rounded-full inline-block ${
                                isSimulated ? "bg-indigo-400 animate-pulse" : "bg-red-500 animate-ping"
                              }`} />
                              <span>{formatDuration(recorderDuration)}</span>
                            </div>
                            <button
                              onClick={handleStopRecording}
                              className={`flex-1 flex items-center justify-center gap-2 py-3 transition rounded-xl text-white font-semibold text-sm cursor-pointer ${
                                isSimulated ? "bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-100" : "bg-slate-900 hover:bg-slate-800"
                              }`}
                              id="stop-mic-recording-btn"
                            >
                              <Square className={`w-4.5 h-4.5 ${isSimulated ? "text-indigo-200" : "text-red-500"}`} />
                              Arrêter & Sauvegarder {isSimulated ? "(Simulé)" : ""}
                            </button>
                          </div>
                        )}
                      </div>

                      {!isRecording && (
                        <div className="flex flex-col p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/60 text-left space-y-2.5 shadow-xs mt-1">
                          <div className="flex items-center gap-1.5 text-amber-950 text-xs font-bold">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-100 animate-bounce" />
                            <span>Le micro ne capte pas le son ? (Bloqué par la prévisualisation)</span>
                          </div>
                          <p className="text-[11px] text-amber-900 leading-relaxed font-normal">
                            Les navigateurs bloquent souvent la capture audio de votre micro à l'intérieur d'une iFrame de test. 
                            Pour libérer l'accès micro réel et capturer votre voix instantanément :
                          </p>
                          
                          <div className="pt-0.5">
                            <a
                              href={window.location.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-550 text-white rounded-xl text-xs font-bold transition shadow-sm hover:shadow-emerald-100 cursor-pointer text-center"
                              id="open-standalone-new-tab-link"
                            >
                              <ExternalLink className="w-3.5 h-3.5 animate-pulse" />
                              Ouvrir en Plein Écran (Microphone Direct débloqué) ↗
                            </a>
                          </div>

                          <div className="border-t border-amber-200/50 my-1" />

                          <p className="text-[10px] text-amber-850 font-semibold">
                            Ou bien, restez dans l'éditeur et utilisez les simulateurs intelligents :
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                            <button
                              onClick={handleInstantSimulatedAnalysis}
                              className="text-[11px] font-bold px-3 py-2 bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-200 text-white rounded-lg flex items-center justify-center gap-1 bg-gradient-to-r from-indigo-600 to-indigo-700 transition shadow cursor-pointer active:scale-98"
                              id="instant-simulation-1calc-btn"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                              Simulation Express (1-Clic)
                            </button>
                            <button
                              onClick={handleStartSimulatedRecording}
                              className="text-[11px] font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center gap-1 transition border border-slate-200 cursor-pointer active:scale-98"
                              id="start-simulated-recording-btn"
                            >
                              <Mic className="w-3 h-3 text-indigo-500" />
                              Simulation Chrono (Écoute)
                            </button>
                          </div>
                          
                          <p className="text-[9.5px] text-amber-800/80 italic leading-snug">
                            💡 <strong>Simulation Express :</strong> Injecte une réunion virtuelle de 10 secondes mixant l'Algerian Darija et le Français pour lancer l'analyse Gemini en un clin d'œil.
                          </p>
                        </div>
                      )}

                      {recordedBlobUrl && (
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 space-y-2">
                          <span className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {isSimulated ? "Enregistrement simulé généré !" : "Audio enregistré avec succès !"}
                          </span>
                          <audio src={recordedBlobUrl} controls className="w-full h-8 block" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeInputTab === "file" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg flex items-start gap-2">
                      <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>
                        Déposez des enregistrements techniques ou d'affaires (.mp3, .wav, .m4a, .webm) pour que Gemini les résume d'une traite.
                      </span>
                    </p>

                    <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 transition duration-150 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center bg-slate-50/50 hover:bg-slate-50 cursor-pointer relative group">
                      <input 
                        type="file" 
                        accept="audio/*" 
                        onChange={handleFileChange} 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        id="audio-file-uploader-field"
                      />
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:scale-105 transition">
                        <Upload className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-700 block">
                          {selectedFile ? selectedFile.name : "Cliquez pour uploader un fichier audio"}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo` : "Formats supportés : mp3, wav, webm, max 25 Mo"}
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                {activeInputTab === "text" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">Transcription brute de la Réunion</label>
                      <button 
                        onClick={() => setManualTranscript("")} 
                        className="text-[10px] text-slate-400 hover:text-slate-600"
                      >
                        Effacer
                      </button>
                    </div>
                    <textarea
                      value={manualTranscript}
                      onChange={(e) => setManualTranscript(e.target.value)}
                      placeholder="Collez ici les notes brutes, le transcript d'une visio-conférence Teams/Zoom ou une conversation multilingue..."
                      className="w-full h-36 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-slate-400 focus:outline-none focus:bg-white transition"
                      id="manual-transcript-textarea"
                    />
                  </div>
                )}
              </div>

              {/* Advanced Parameters Collapsible */}
              <div className="space-y-3.5 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Language Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Langue de Restitution :
                    </label>
                    <select
                      value={outputLanguage}
                      onChange={(e) => setOutputLanguage(e.target.value as SupportedLanguage)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium"
                      id="output-language-dropdown"
                    >
                      {(["French", "Arabic", "Darija", "English"] as SupportedLanguage[]).map((lang) => (
                        <option key={lang} value={lang}>
                          {SUPPORTED_LANGUAGES_META[lang].flag} {SUPPORTED_LANGUAGES_META[lang].nativeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dialect Variant Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Variante Darija :
                    </label>
                    <select
                      value={darijaVariant}
                      onChange={(e) => setDarijaVariant(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium text-emerald-800"
                      id="darija-variant-dropdown"
                    >
                      <option value="Général">🇩🇿 Commune / Globale</option>
                      <option value="Algérois">🇩🇿 Algérois (Centre)</option>
                      <option value="Oranais">🇩🇿 Oranais (Ouest)</option>
                      <option value="Constantinois">🇩🇿 Constantinois (Est)</option>
                    </select>
                  </div>

                  {/* Context notes */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Contexte Exécutif (Optionnel) :
                    </label>
                    <input 
                      type="text"
                      value={contextNotes}
                      onChange={(e) => setContextNotes(e.target.value)}
                      placeholder="Ex: Focus sur les prix, note technique..."
                      className="w-full bg-slate-50 border border-slate-250 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      id="context-notes-field"
                    />
                  </div>
                </div>

                {/* Big Summarize Trigger Button */}
                <button
                  onClick={() => handleGenerateSummary()}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-slate-950 to-indigo-950 hover:from-slate-900 hover:to-indigo-900 text-white font-bold text-sm tracking-tight rounded-xl flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  id="trigger-analyze-reunion-btn"
                >
                  <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
                  {isLoading ? "Traitement IA en cours..." : "Lancer l'Analyse Smart de l'IA"}
                </button>

                {isLoading && (
                  <div className="space-y-2 py-1 animate-pulse">
                    <div className="flex justify-between items-center text-[11px] text-indigo-600 font-semibold">
                      <span>{loadingStep}</span>
                      <span className="font-mono">75%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full animate-infinite-loading w-3/4" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Past History Summaries Widget */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-950 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-400">
                  <History className="w-4 h-4 text-slate-400" />
                  Historique des Comptes-Rendus ({meetingsHistory.length})
                </span>
              </div>

              {meetingsHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Aucun historique enregistré pour l'instant.</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[290px] overflow-y-auto pr-1">
                  {meetingsHistory.map((meeting) => {
                    const isActive = currentSummary?.id === meeting.id;
                    const meta = Object.values(SUPPORTED_LANGUAGES_META).find(
                      (l) => l.name.toLowerCase() === meeting.targetLanguage.toLowerCase()
                    ) || SUPPORTED_LANGUAGES_META.French;

                    return (
                      <div
                        key={meeting.id}
                        onClick={() => setCurrentSummary(meeting)}
                        className={`py-3 px-2 flex items-center justify-between gap-3 rounded-lg transition duration-150 cursor-pointer text-left group ${
                          isActive 
                            ? "bg-slate-100 border-l-4 border-indigo-600" 
                            : "hover:bg-slate-50/70"
                        }`}
                        id={`history-item-${meeting.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-slate-900 truncate pr-2">
                            {meeting.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                            <span>{meeting.date}</span>
                            <span>•</span>
                            <span className="bg-slate-200/60 text-slate-600 px-1 py-0.2 rounded font-mono">
                              {meta.flag} {meta.nativeName}
                            </span>
                          </div>
                        </div>

                        {/* Trash handle */}
                        <button
                          onClick={(e) => handleDeleteHistory(meeting.id, e)}
                          className="p-1 px-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-rose-600 transition opacity-0 group-hover:opacity-100"
                          title="Supprimer la réunion"
                          id={`delete-history-${meeting.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Algerian Darija Lexicon Widget */}
            <DarijaLexicon 
              onInsertAsContext={(word, translation) => {
                const addendum = `Attention au mot "${word}" (${translation})`;
                if (!contextNotes) {
                  setContextNotes(addendum);
                } else if (!contextNotes.includes(word)) {
                  setContextNotes(prev => prev.endsWith(", ") || prev.endsWith(",") ? `${prev}${addendum}` : `${prev}, ${addendum}`);
                }
              }}
            />
          </div>

          {/* Right Preview Pane: Summary Outputs (span 7) */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-[580px]">
            {currentSummary ? (
              <MeetingSummaryView 
                summary={currentSummary} 
                onTranslate={handleTranslateSummary}
                isTranslating={isTranslating}
                onReAnalyze={handleReAnalyzeFromTranscript}
                isReAnalyzing={isReAnalyzing}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center flex-1">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mb-4">
                  <AudioLines className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Aucun compte-rendu chargé</h3>
                <p className="text-slate-505 text-xs max-w-sm mt-1.5 leading-relaxed">
                  Enregistrez votre première réunion multilingue ou chargez un gabarit de démonstration prêt à l'emploi ci-dessous.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Demo trials sample panel at root bottom */}
        <section className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4" id="demo-samples">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white flex items-center gap-1.5 font-sans tracking-tight">
                <Lightbulb className="w-5 h-5 text-amber-400 animate-pulse" />
                Démonstrations et Exemples d'essais immédiats
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Testez la prise en charge de l'Arabe algérien (Darija), de l'Anglais et du Français sans micro en 1-clic.
              </p>
            </div>
            <span className="text-[10px] uppercase font-mono text-slate-500">3 scenarios</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MEETING_SAMPLES.map((sample) => (
              <div 
                key={sample.id} 
                className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 hover:border-slate-700/80 transition flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {sample.languages.map((l) => (
                      <span key={l} className="bg-slate-800/80 text-slate-350 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-750">
                        {l}
                      </span>
                    ))}
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 leading-snug line-clamp-2">
                    {sample.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {sample.description}
                  </p>
                </div>
                
                <button
                  onClick={() => handleLoadSample(sample)}
                  className="w-full py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-850 hover:border-indigo-800 text-indigo-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  id={`load-sample-${sample.id}-btn`}
                >
                  <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                  Charger ce Gabarit
                </button>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-slate-500 bg-slate-950 p-3 rounded-lg leading-relaxed flex gap-2">
            <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Comment ça marche ?</strong> Cliquer sur un gabarit va coller la discussion brute dans l'onglet <strong>Coller un Texte</strong>. Il vous restera simplement à cliquer sur <strong>"Lancer l'Analyse Smart de l'IA"</strong> en haut pour voir Gemini générer le rapport dans la langue de votre choix !
            </span>
          </div>
        </section>

      </main>

      {/* Standard professional footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
          <p className="text-slate-500 text-xs font-medium">
            Liqa' Summarizer - Solution de synthèse multilingue native et d'alternance linguistique.
          </p>
          <p className="text-slate-400 text-[10px]">
            Traitement de la Darija algérienne par la puissance multimodale de l'IA Google Gemini.
          </p>
        </div>
      </footer>
    </div>
  );
}
