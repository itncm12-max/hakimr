import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Ensure PORT is always 3000 as mandated by environment
const PORT = 3000;

async function startServer() {
  const app = express();

  // Increase payload limit for base64 encoded audio uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Lazy-initialize Gemini SDK with telemetry header
  let aiClient: GoogleGenAI | null = null;
  function getGemini(customKey?: string): GoogleGenAI {
    if (customKey) {
      return new GoogleGenAI({
        apiKey: customKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing. Please add it in the Secrets panel or enter your own in the settings.");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // Robust utility to invoke generateContent with multiple retry attempts and models fallback
  async function generateWithFallbackAndRetry(params: {
    model: string;
    contents: any;
    config?: any;
    customKey?: string;
  }): Promise<any> {
    const ai = getGemini(params.customKey);
    // Use strictly valid, supported models from the @google/genai guidelines
    // Basic tasks: gemini-3.5-flash, Lite task: gemini-3.1-flash-lite, Latest: gemini-flash-latest
    const fallbackList = [
      params.model, 
      "gemini-3.1-flash-lite", 
      "gemini-flash-latest"
    ];
    const uniqueModels = [...new Set(fallbackList.filter(Boolean))];
    
    let lastError: any = null;

    for (const currentModel of uniqueModels) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[Gemini API] Requesting model: ${currentModel} (attempt ${attempt}/3)...`);
          const response = await ai.models.generateContent({
            ...params,
            model: currentModel,
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code || "";
          const msg = err?.message || "";
          const isRateLimitOr555 = 
            status === 503 || 
            status === 429 || 
            status === "UNAVAILABLE" || 
            status === "RESOURCE_EXHAUSTED" ||
            msg.includes("503") || 
            msg.includes("429") || 
            msg.includes("demand") || 
            msg.includes("limit") ||
            msg.includes("overloaded");

          console.warn(`[Gemini API] Model ${currentModel} failed (attempt ${attempt}/3): Status=${status}, Msg=${msg}`);

          if (isRateLimitOr555) {
            const is429 = status === 429 || status === "RESOURCE_EXHAUSTED" || msg.includes("429") || msg.includes("limit");
            
            // If it is a quota/rate limit error (429), do not wait or retry the same model as it will be blocked.
            // Move on to the next model in the fallback list immediately.
            if (is429) {
              console.log(`[Gemini API] Quota limit hit for ${currentModel}. Switching to next model immediately...`);
              break;
            }

            if (attempt < 3) {
              const delay = attempt * 1200;
              console.log(`[Gemini API] High load or 503. Retrying in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
          }
          
          // If other error, immediately switch to the next candidate model
          break;
        }
      }
    }

    throw lastError || new Error("Failed to generate content from any candidate model due to high demand or rate limits.");
  }

  // API Endpoint to check health and API key configuration
  app.get("/api/health", async (req, res) => {
    try {
      const customKey = (req.headers["x-gemini-api-key"] || req.headers["x-api-key"] || req.query.customKey) as string;
      const ai = getGemini(customKey);
      // Validate key by listing models
      await ai.models.list({ pageSize: 1 });
      res.json({ status: "ok", apiKeyConfigured: true });
    } catch (err: any) {
      res.json({ status: "warn", apiKeyConfigured: false, message: err.message });
    }
  });

  // Main Endpoint to transcribe and/or summarize meetings
  app.post("/api/summarize", async (req, res) => {
    try {
      const { audioData, mimeType, manualTranscript, contextNotes, outputLanguage, isSimulated, darijaVariant } = req.body;
      const targetLang = outputLanguage || "French"; // Default to requested summary language

      const customKey = (req.headers["x-gemini-api-key"] || req.headers["x-api-key"]) as string;
      const ai = getGemini(customKey);

      let contents: any[] = [];
      let promptText = "";

      // Construct a specific, comprehensive prompt for a high-quality summary and transcription.
      if (isSimulated) {
        // High fidelity sandbox simulation representing typical modern Algerian French-Darija code-switching.
        const simulatedTranscript = `Yassine: Salam l'équipe, wach rakoum ready pour notre daily standup? Lyoum lezemna darori nshofo la migration de la base de données l'cloud Run, et fin wsalna m3a l'API dial stripe.
Meriem: Salam Yassine, oui ready. Pour Stripe, dert l'intégration de la v3, l-front-end kheddam mzyan. Mazal ghir ndir la validation f backend context bach ndezzo les webhooks l-secure endpoints. On aura besoin de tester ça sur sandbox lyoum l'3shiya.
Amine: Salam, ana nqder n-handle-ha (n-géri-ha). Ghadi ncreyi les secrets f Google Secret Manager tma fin ghadi nkhabiw la clé privée Stripe et la config du serveur. Bach hka kolchi hani f secruity aspect. Concernant la migration de Postgres pour le Cloud SQL, rani bdit la réplication des tables hier soir, tout s'est bien passé. Mazal ghir chi index khasshom chwiya dial optimisation l'parce que l'query latency hbat chwiya m3a les jointures s3ab.
Yassine: Ya3tik esaha Amine. Hada point crucial pour la performance de la prod. Chhal l'waqt lazemna pour finir l'indexation?
Amine: Nqder nkemmelha d'ici ghodwa sba7 m3a 10h. Safi, ghir tkon ready, n-partagi l-rapport de test f slack.
Yassine: Super! Khlas, Meriem tkemmel sandbox tests f 16h. Amine y-optimize les index de Postgres d'ici ghodwa m3a 10h. Netlaqaw sba7 pour valider l-build complet.`;

        promptText = `
          Analyze this simulated audio recording of an Algerian startup technical sync.
          The speakers are code-switching between Algerian Darija (الدارجة الجزائرية) and French.
          
          Transcript:
          """
          ${simulatedTranscript}
          """

          Perform the following:
          1. Keep or lightly polish the full transcribed conversation in "fullTranscript".
          2. Create a professional, highly structured summary and analysis of this meeting.

          Generate the output strictly following the JSON format schema below:
          - "title": A suitable summary name for the meeting in ${targetLang}.
          - "languagesFound": ["Darija", "French"] because this is conversational Algerian Darija and French.
          - "overallSummary": Written in ${targetLang}.
          - "keyDecisions": List of key decisions made, written in ${targetLang}.
          - "discussionPoints": Array of objects with "topic" and "summary" fields in ${targetLang}.
          - "actionItems": Array of objects with "task", "owner", and "priority" ("High" | "Medium" | "Low") in ${targetLang}.
          - "fullTranscript": The original transcribed dialog text above.

          Context notes provided by user (if any): "${contextNotes || 'None'}"
        `;
      } else if (audioData && mimeType) {
        // Clean and sanitize mimeType for Gemini compatibility (strips parameters like ;codecs=opus)
        let cleanMimeType = mimeType.split(";")[0].trim().toLowerCase();
        if (cleanMimeType.includes("webm")) {
          cleanMimeType = "audio/webm";
        } else if (cleanMimeType.includes("ogg")) {
          cleanMimeType = "audio/ogg";
        } else if (cleanMimeType.includes("wav") || cleanMimeType.includes("x-wav")) {
          cleanMimeType = "audio/wav";
        } else if (cleanMimeType.includes("mp3") || cleanMimeType.includes("mpeg")) {
          cleanMimeType = "audio/mp3";
        } else if (cleanMimeType.includes("m4a") || cleanMimeType.includes("mp4") || cleanMimeType.includes("aac")) {
          cleanMimeType = "audio/mp4";
        }

        // Multimodal Audio request
        contents.push({
          inlineData: {
            mimeType: cleanMimeType || "audio/webm",
            data: audioData,
          },
        });

        promptText = `
          Analyze the attached audio meeting recording. 
          The languages spoken in this meeting could include French, Arabic, Algerian Darija (الدارجة الجزائرية), English, or a mix of these (code-switching).
          
          Perform two primary tasks:
          1. Transcribe the spoken text in the audio with high fidelity, translating any Darija/Arabic slang or phrases accurately but keeping the transcription mostly as spoken.
          2. Create a professional, highly structured summary and analysis of this meeting.

          Generate the output strictly following the JSON format schema below:
          - The "title" should be a suitable summary name for the meeting in ${targetLang}.
          - "languagesFound" must be list of languages detected in the audio (e.g. ["Darija", "French", "English", "Arabic"]).
          - "overallSummary" of the meeting, written in ${targetLang}.
          - "keyDecisions" list of key decisions made, written in ${targetLang}.
          - "discussionPoints" array of objects with "topic" and "summary" fields in ${targetLang}.
          - "actionItems" array of objects with "task", "owner", and "priority" ("High" | "Medium" | "Low") in ${targetLang}.
          - "fullTranscript" representing the computed transcription or a clean reconstruct of what was said.

          Context notes provided by user (if any): "${contextNotes || 'None'}"
        `;
      } else if (manualTranscript) {
        // Text-based summarize request
        promptText = `
          Analyze the following meeting transcript text. 
          The transcript might be in French, Arabic, Algerian Darija, English, or mixed.
          
          Transcript:
          """
          ${manualTranscript}
          """

          Context notes provided by user (if any): "${contextNotes || 'None'}"

          Analyze this text and generate a professional, highly structured summary and analysis.
          Generate the output strictly following the JSON format schema below:
          - The "title" should be a suitable summary name for the meeting in ${targetLang}.
          - "languagesFound" must be list of languages detected (e.g. ["Darija", "French", "English", "Arabic"]).
          - "overallSummary" of the meeting, written in ${targetLang}.
          - "keyDecisions" list of key decisions made, written in ${targetLang}.
          - "discussionPoints" array of objects with "topic" and "summary" in ${targetLang}.
          - "actionItems" array of objects with "task", "owner", and "priority" ("High" | "Medium" | "Low") in ${targetLang}.
          - "fullTranscript" can be the cleaned/paragraph-formatted transcript of the original text.
        `;
      } else {
        return res.status(400).json({ error: "Missing both audioData and manualTranscript parameters." });
      }

      contents.push({ text: promptText });

      const response = await generateWithFallbackAndRetry({
        model: "gemini-3.5-flash",
        contents: contents,
        customKey: customKey,
        config: {
          responseMimeType: "application/json",
          systemInstruction: `You are an expert multilingual executive secretary and professional meeting stenographer. 
          You understand French, Algerian Darija (الدارجة الجزائرية), Standard Arabic (الفصحى), and English perfectly. 
          
          Dialectal Regional Focus: The current meeting has a specific regional variant bias set to: "${darijaVariant || "Général"}".
          ${darijaVariant === "Oranais" ? "Pay special attention to Western Algerian (Oran) phonetic patterns and terms, such as 'Ki rak', 'Ki rakoum', 'Gua3', 'Wila', 'D-drahem' (money)." : ""}
          ${darijaVariant === "Constantinois" ? "Pay special attention to Eastern Algerian (Constantine/Annaba) terms and speech, such as 'Wach nta', 'T3ich' (thanks), 'Yasser' (a lot), 'Ghedda' (tomorrow), 'Mechi' (not)." : ""}
          ${darijaVariant === "Algérois" ? "Pay special attention to Central Algerian (Algiers) phonetic patterns and terms, such as 'Wach rak', 'Wach de3wa', 'Zoudj' (two), 'Safi' (done)." : ""}
          
          Guidelines for Algerian Darija (الدارجة الجزائرية) & code-switching (mix of French, Arabic, Darija):
          1. Dialectal Vocabulary Recognition:
             - "Wach rak", "Kiraki", "Labes", "Hamdoullah" -> How are you, doing well.
             - "Ya3tik saha", "Saha", "Barak allah fik", "Ta3ich" -> Expressing gratitude/thank you/well done.
             - "Ghodwa/Ghedda" -> Tomorrow.
             - "Lyoum" -> Today.
             - "L'3shiya/Achia" -> Afternoon/evening.
             - "Sba7/Sbah" -> Morning.
             - "Douk / Delwaqt" -> Now.
             - "Chwiya" -> A bit / slightly.
             - "Bezzaf" -> A lot / very.
             - "Mlih / Emlih" -> Good / fine.
             - "Safi / Khlas / Baraka" -> Done / okay / finished / enough.
             - Verbs like "Dar", "Derna", "Ydir" (do/make), "Ahdar" (talk), "Khass / Khassna" (need/we need), "Ykoun" (to be), "Ykamel" (complete).
          2. Code-Switching Handling:
             - Algerian technical discussions heavily mix Algerian Darija with French terms ("gérer-ha", "ndir validation", "réplication", "la migration de Postgres", "webhooks").
             - Transcribe bilingual sentences exactly as spoken, respecting code-switching phonetics (e.g. "Yassine: Salam l'équipe, wach rakoum ready pour notre daily standup?").
             - Do NOT filter out or mistranslate slang terms into Standard Arabic; instead, keep the raw conversational feel in the "fullTranscript", but translate the core meanings accurately in the overall summary and action items.
          3. Summary Deliverable Rules:
             - Your summaries must be crisp, structured, professional, and contain clear owners, decisions, priority action points, and deadlocks.
             - Output the summary in the requested output language.`,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              languagesFound: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              overallSummary: { type: Type.STRING },
              keyDecisions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              discussionPoints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    summary: { type: Type.STRING }
                  },
                  required: ["topic", "summary"]
                }
              },
              actionItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    task: { type: Type.STRING },
                    owner: { type: Type.STRING },
                    priority: { type: Type.STRING } // High, Medium, Low
                  },
                  required: ["task", "owner", "priority"]
                }
              },
              fullTranscript: { type: Type.STRING }
            },
            required: [
              "title", 
              "languagesFound", 
              "overallSummary", 
              "keyDecisions", 
              "discussionPoints", 
              "actionItems",
              "fullTranscript"
            ]
          }
        }
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText.trim());
      res.json(parsedData);

    } catch (err: any) {
      console.error("Error during summarization:", err);
      res.status(500).json({ error: err.message || "An error occurred with Gemini processing." });
    }
  });

  // Instant Translate Endpoint for existing summaries
  app.post("/api/translate", async (req, res) => {
    try {
      const { summaryData, targetLanguage } = req.body;
      if (!summaryData || !targetLanguage) {
        return res.status(400).json({ error: "Missing summaryData or targetLanguage" });
      }

      const customKey = (req.headers["x-gemini-api-key"] || req.headers["x-api-key"]) as string;
      const ai = getGemini(customKey);

      const promptText = `
        You are a translation assistant. Translate the following meeting analysis JSON structure fully into ${targetLanguage}.
        Keep the keys and JSON format EXACTLY matching. Only translate the string values (except keys, the owner names if they represent people, or dates/priorities, unless the priority name themselves like 'High' should be translated to Spanish/Arabic/French appropriate words).
        
        Languages to support beautifully:
        - Arabic: العربية
        - Algerian Darija: الدارجة الجزائرية
        - French: Français
        - English: English

        Input JSON:
        ${JSON.stringify(summaryData)}
      `;

      const response = await generateWithFallbackAndRetry({
        model: "gemini-3.5-flash",
        contents: promptText,
        customKey: customKey,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You strictly output JSON translating content into the requested language.",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              languagesFound: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              overallSummary: { type: Type.STRING },
              keyDecisions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              discussionPoints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    summary: { type: Type.STRING }
                  },
                  required: ["topic", "summary"]
                }
              },
              actionItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    task: { type: Type.STRING },
                    owner: { type: Type.STRING },
                    priority: { type: Type.STRING }
                  },
                  required: ["task", "owner", "priority"]
                }
              },
              fullTranscript: { type: Type.STRING }
            },
            required: [
              "title", 
              "languagesFound", 
              "overallSummary", 
              "keyDecisions", 
              "discussionPoints", 
              "actionItems",
              "fullTranscript"
            ]
          }
        }
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText.trim());
      res.json(parsedData);

    } catch (err: any) {
      console.error("Translation error:", err);
      res.status(500).json({ error: err.message || "Translation failed." });
    }
  });

  // Vite development integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
