import { useEffect, useRef, useState } from "react";
import { 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  ExternalLink, 
  CheckCircle2
} from "lucide-react";

interface AudioVisualizerProps {
  isRecording: boolean;
  mediaStream: MediaStream | null;
  audioContext?: AudioContext | null;
}

export function AudioVisualizer({ isRecording, mediaStream, audioContext }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [volume, setVolume] = useState(0); // 0 to 100
  const [silenceDuration, setSilenceDuration] = useState(0);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);

  useEffect(() => {
    setVolume(0);
    setSilenceDuration(0);
    setShowTroubleshooter(false);

    if (!isRecording || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!mediaStream) {
      // Simulation mode visualizer: Draw shifting animated audio frequency wave bars
      let phase = 0;
      const numBars = 32;
      
      const drawSimulated = () => {
        if (!canvas) return;
        const width = canvas.width;
        const height = canvas.height;
        
        animationRef.current = requestAnimationFrame(drawSimulated);
        phase += 0.12;
        
        ctx.fillStyle = "rgba(15, 23, 42, 0.15)";
        ctx.fillRect(0, 0, width, height);
        
        const barWidth = (width / numBars) * 1.5;
        let x = 0;
        
        for (let i = 0; i < numBars; i++) {
          const wave1 = Math.sin(i * 0.25 + phase);
          const wave2 = Math.cos(i * 0.15 - phase * 0.7);
          const val = (wave1 + wave2 + 2) / 4; // Normalize to 0..1
          const barHeight = val * height * 0.75 + (Math.sin(phase * 2) * 4) + 4;
          
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, "rgba(99, 102, 241, 0.4)");  // Indigo
          gradient.addColorStop(0.5, "rgba(20, 184, 166, 0.7)"); // Teal
          gradient.addColorStop(1, "rgba(16, 185, 129, 0.9)");   // Emerald
          
          ctx.fillStyle = gradient;
          const yPos = (height - barHeight) / 2;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, yPos, barWidth - 2, barHeight, 4);
          } else {
            ctx.rect(x, yPos, barWidth - 2, barHeight);
          }
          ctx.fill();
          
          x += barWidth;
        }
      };
      
      drawSimulated();
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }

    // Initialize Web Audio API Analyser
    let audioCtx: AudioContext;
    let source: MediaStreamAudioSourceNode;
    let analyser: AnalyserNode;

    try {
      if (audioContext) {
        audioCtx = audioContext;
      } else {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(err => console.warn("Could not automatically resume AudioContext", err));
      }
      
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
    } catch (err) {
      console.error("Failed to initialize Web Audio Analyser, falling back to mock", err);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvas) return;
      const width = canvas.width;
      const height = canvas.height;

      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Clear with dark-slate transparent background for subtle trailing
      ctx.fillStyle = "rgba(15, 23, 42, 0.15)";
      ctx.fillRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.8;

        // Gradient color palette for active recording: slate to emerald-teal
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.4)"); // emerald
        gradient.addColorStop(0.5, "rgba(20, 184, 166, 0.7)"); // teal
        gradient.addColorStop(1, "rgba(59, 130, 246, 0.9)"); // blue

        ctx.fillStyle = gradient;
        
        // Draw centered symmetric rounded bars
        const yPos = (height - barHeight) / 2;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, yPos, barWidth - 2, barHeight, 4);
        } else {
          ctx.rect(x, yPos, barWidth - 2, barHeight);
        }
        ctx.fill();

        x += barWidth;
      }
    };

    draw();

    // Set up throttled interval to measure volume and handle silence diagnostics
    const interval = setInterval(() => {
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        let maxVal = 0;
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > maxVal) {
            maxVal = dataArray[i];
          }
        }
        
        const pct = Math.round((maxVal / 255) * 100);
        setVolume(pct);
        
        if (pct <= 2) {
          setSilenceDuration(prev => {
            const next = prev + 0.2;
            if (next >= 2.5) {
              setShowTroubleshooter(true);
            }
            return next;
          });
        } else {
          setSilenceDuration(0);
          setShowTroubleshooter(false);
        }
      }
    }, 200);

    return () => {
      clearInterval(interval);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        if (!audioContext) {
          audioCtxRef.current.close().catch(console.error);
        }
      }
    };
  }, [isRecording, mediaStream, audioContext]);

  if (!isRecording) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center h-24 bg-slate-900/60 rounded-xl border border-slate-700/55 p-4 text-slate-400 gap-1 overflow-hidden relative">
          <span className="text-sm font-mono text-slate-500">Prêt pour l'enregistrement / Microphone Idle</span>
          {/* Subtle decorative static wave */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-teal-500/10 via-blue-500/20 to-teal-500/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Audio Waveform Stage */}
      <div className="relative min-h-24 bg-slate-950 rounded-xl border border-slate-800 p-1 overflow-hidden flex flex-col justify-between">
        <canvas
          ref={canvasRef}
          width={400}
          height={96}
          className="w-full h-24 block rounded-lg"
        />
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-950/80 border border-red-500/40 text-red-400 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          REC
        </div>
      </div>

      {/* Real-time VU-Meter / Volume Level Indicator */}
      {mediaStream && (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-slate-350">
              {volume > 2 ? (
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <VolumeX className="w-4 h-4 text-red-400" />
              )}
              Intensité d'entrée : <strong className="text-slate-200">{volume}%</strong>
            </span>
            
            <div>
              {volume > 2 ? (
                <span className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Capté en direct
                </span>
              ) : (
                <span className="bg-red-950/80 border border-red-500/30 text-red-400 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                  Signal vide (Mute)
                </span>
              )}
            </div>
          </div>

          {/* Graphical Level Bar */}
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/80 p-[2px]">
            <div 
              className={`h-full transition-all duration-150 ease-out rounded-full ${
                volume > 75 
                  ? "bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500" 
                  : volume > 35
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(1, volume))}%` }}
            />
          </div>

          {/* Troubleshooter Warning inside visualizer */}
          {showTroubleshooter && (
            <div className="bg-amber-950/40 border border-amber-500/20 p-3 rounded-lg text-amber-200 text-xs mt-2 space-y-2 animate-fade-in">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Microphone muet ou bloqué par l'iFrame</span>
              </div>
              <p className="text-[10.5px] text-amber-300 leading-relaxed">
                Le navigateur a accordé l'accès au micro, mais <strong>aucun son n'est capté</strong> (signal plat à 0%). C'est un comportement classique lié aux restrictions de sécurité de la prévisualisation iFrame.
              </p>

              <button
                type="button"
                onClick={async () => {
                  try {
                    if (audioCtxRef.current) {
                      if (audioCtxRef.current.state === "suspended") {
                        await audioCtxRef.current.resume();
                      }
                      console.log("AudioContext state after resume:", audioCtxRef.current.state);
                    }
                    
                    // Trigger a simple oscillator sound or try to re-init to force-bind the gesture
                    const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    await tempCtx.resume();
                    await tempCtx.close();
                    
                    alert("Microphone débloqué ! S'il n'y a toujours pas d'intensité, veuillez utiliser l'onglet 'Ouvrir en plein écran' ou la 'Simulation'.");
                  } catch (e) {
                    console.error("Manual resume failed", e);
                  }
                }}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-550 text-white rounded-lg font-bold text-xs shadow-xs hover:shadow-emerald-900 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                FORCER L'ACTIVATION / DÉBLOQUER 🔊
              </button>
              
              <div className="text-[10.5px] bg-amber-950/70 p-2.5 rounded border border-amber-500/15 space-y-1.5 text-amber-250 font-medium leading-relaxed">
                <div className="flex items-start gap-1">
                  <span className="font-bold text-amber-400 font-mono">⚡ Solution :</span>
                  <span>
                    Cliquez sur le bouton <strong>"Ouvrir dans un nouvel onglet"</strong> (icône <ExternalLink className="w-3.5 h-3.5 inline-block mx-0.5" />) tout en haut à droite pour contourner le blocage et utiliser votre micro librement.
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="font-bold text-amber-400 font-mono">💡 Note :</span>
                  <span>
                    Vous pouvez aussi utiliser l'onglet <strong>"Simulation"</strong> pour tester avec une voix algérienne virtuelle générée par l'IA.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
