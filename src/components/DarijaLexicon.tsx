import { useState } from "react";
import { 
  Search, 
  Copy, 
  Check, 
  MapPin, 
  BookOpen, 
  Languages, 
  Info,
  HelpCircle
} from "lucide-react";

export interface LexiconItem {
  darija: string;
  arabicScript?: string;
  translation: string;
  category: "greetings" | "business" | "time" | "emphasis";
  region?: "Algérois" | "Oranais" | "Constantinois" | "Général";
  example?: string;
  explanation?: string;
}

const DARIJA_LEXICON: LexiconItem[] = [
  // Greetings
  {
    darija: "Wach rak / Wach rakoum",
    arabicScript: "واش راك / واش راكم",
    translation: "Comment vas-tu / Comment allez-vous",
    category: "greetings",
    region: "Général",
    example: "Wach rakoum ready pour le standup?",
    explanation: "La salutation la plus courante en Algérie pour demander des nouvelles."
  },
  {
    darija: "Ki rak / Ki rakoum",
    arabicScript: "كي راك / كي راكم",
    translation: "Comment vas-tu / Comment allez-vous",
    category: "greetings",
    region: "Oranais",
    example: "Salam, ki rakoum l'équipe? Labes?",
    explanation: "Typique de l'Ouest algérien (Oran et alentours)."
  },
  {
    darija: "Wach nta / Wach nti",
    arabicScript: "واش نتا / واش نتي",
    translation: "Comment vas-tu (masc / fém)",
    category: "greetings",
    region: "Constantinois",
    example: "Wach nta, labes? Khassna n-démarriw.",
    explanation: "Formule de salutation fréquente dans l'Est algérien."
  },
  {
    darija: "Wach de3wa",
    arabicScript: "واش دعوة",
    translation: "Quoi de neuf / Comment ça se passe",
    category: "greetings",
    region: "Algérois",
    example: "Wach de3wa m3a l'API stripe?",
    explanation: "Expression très populaire au centre d'Alger."
  },
  {
    darija: "Ya3tik es-saha / Ya3tikoum es-saha",
    arabicScript: "يعطيك الصحة / يعطيكم الصحة",
    translation: "Merci beaucoup / Bravo / Félicitations",
    category: "greetings",
    region: "Général",
    example: "Ya3tik esaha Amine pour l'optimisation.",
    explanation: "Littéralement 'Que Dieu te donne la santé'. Sert à exprimer la gratitude ou à féliciter."
  },
  {
    darija: "Baraka Allah Fik",
    arabicScript: "بارك الله فيك",
    translation: "Que Dieu te bénisse (Merci)",
    category: "greetings",
    region: "Général",
    example: "Baraka Allah fik, n-partagi l-rapport de suite.",
    explanation: "Expression de remerciement respectueuse et universelle."
  },
  {
    darija: "Ta3ich / Ta3icho",
    arabicScript: "تعيش / تعيشو",
    translation: "S'il te plaît / Merci / Que tu vives",
    category: "greetings",
    region: "Général",
    example: "Meriem, ta3ich, ndiro l-test lyoum f 16h.",
    explanation: "Littéralement 'Que tu vives'. Utilisé affectueusement pour s'il te plaît ou merci."
  },
  {
    darija: "Bla jmil",
    arabicScript: "بلا جميل",
    translation: "De rien / Je t'en prie / Sans merci requis",
    category: "greetings",
    region: "Général",
    example: "Bla jmil, hada l-wajeb diali.",
    explanation: "Littéralement 'Sans faire de faveur', signifiant qu'on le fait de bon cœur."
  },
  {
    darija: "Saha",
    arabicScript: "صحة",
    translation: "Merci / D'accord / Salut",
    category: "greetings",
    region: "Général",
    example: "Saha khoya, ghedda netlaqaw.",
    explanation: "Multi-usage: peut vouloir dire merci, d'accord, ou salut selon l'intonation."
  },

  // Business / Tech
  {
    darija: "N-géri-ha / N-handle-ha",
    arabicScript: "نجيريها / نهاندليها",
    translation: "Je vais m'en occuper / Gérer ça",
    category: "business",
    region: "Général",
    example: "Ana nqder n-géri-ha d'ici ghodwa sba7.",
    explanation: "Code-switching parfait mixant le verbe français 'gérer' ou anglais 'handle' avec les suffixes de la conjugaison Darija."
  },
  {
    darija: "Khassna / Khassni",
    arabicScript: "خاصنا / خاصني",
    translation: "Il nous faut / Nous avons besoin de / J'ai besoin",
    category: "business",
    region: "Général",
    example: "Khassna ndiro attention ls7ab diet feedback.",
    explanation: "Indique le besoin pressant d'une ressource ou d'une action."
  },
  {
    darija: "Ndir / Ndirou / Derna",
    arabicScript: "ندير / نديرو / درنا",
    translation: "Faire / Nous faisons / Nous avons fait",
    category: "business",
    region: "Général",
    example: "Derna sondage la semaine lli fatet.",
    explanation: "Verbe pilier 'Dar' (faire) employé pour toutes les actions professionnelles."
  },
  {
    darija: "Nahder / Hdart",
    arabicScript: "نهدر / هدرت",
    translation: "Parler / J'ai parlé",
    category: "business",
    region: "Général",
    example: "Rani hdart m3a le transitaire ce matin.",
    explanation: "Verbe 'Hdar' qui remplace le verbe parler en Darija algérienne."
  },
  {
    darija: "Nkemmel / Nkemmlo",
    arabicScript: "نكمل / نكملو",
    translation: "Finir / Compléter",
    category: "business",
    region: "Général",
    example: "Nqder nkemmelha d'ici ghodwa sba7.",
    explanation: "Signifie mener à bien ou achever une tâche informatique ou logistique."
  },
  {
    darija: "Dezzo / Seffto",
    arabicScript: "دزو / صفتو",
    translation: "Envoyer / Transmettre",
    category: "business",
    region: "Général",
    example: "Dezzo les webhooks l-secure endpoints.",
    explanation: "Utilisé pour l'envoi de requêtes Web, de rapports ou de colis."
  },
  {
    darija: "Drahem",
    arabicScript: "دراهم",
    translation: "Argent / Fonds / Budget",
    category: "business",
    region: "Général",
    example: "Bach ma n-perdu-ch ktem d-drahem.",
    explanation: "Le mot le plus célèbre pour l'argent en Algérie."
  },
  {
    darija: "Sel3a",
    arabicScript: "سلعة",
    translation: "Marchandise / Produit",
    category: "business",
    region: "Général",
    example: "Sel3a rahi f l-babor raba3 iyam.",
    explanation: "Utilisé couramment pour le stock, le fret, ou le livrable d'un projet."
  },

  // Time & Planning
  {
    darija: "Lyoum",
    arabicScript: "اليوم",
    translation: "Aujourd'hui",
    category: "time",
    region: "Général",
    example: "Lyoum lezemna darori nshofo la migration.",
    explanation: "Temps présent."
  },
  {
    darija: "Ghodwa / Ghedda",
    arabicScript: "غدوة / غدا",
    translation: "Demain",
    category: "time",
    region: "Général",
    example: "Nqder nkemmelha d'ici ghodwa sba7 m3a 10h.",
    explanation: "'Ghodwa' est central/est, 'Ghedda' est plus fréquent à l'ouest et à l'est."
  },
  {
    darija: "Sba7",
    arabicScript: "صباح",
    translation: "Le matin",
    category: "time",
    region: "Général",
    example: "Ghedda sba7 8h n-koun fel port.",
    explanation: "Heure matinale ou début de journée de travail."
  },
  {
    darija: "L'3shiya / Achia",
    arabicScript: "العشية",
    translation: "L'après-midi / Le soir",
    category: "time",
    region: "Général",
    example: "On aura besoin de tester ça lyoum l'3shiya.",
    explanation: "Désigne l'après-midi de 14h à 19h environ."
  },
  {
    darija: "Douk / Delwaqt",
    arabicScript: "دوك / دلوقت",
    translation: "Maintenant / Immédiatement",
    category: "time",
    region: "Général",
    example: "Lezem n-géri-w la coupure douk.",
    explanation: "Exprime la haute priorité ou l'action instantanée."
  },
  {
    darija: "El barah",
    arabicScript: "البارح",
    translation: "Hier",
    category: "time",
    region: "Général",
    example: "Rani bdit la réplication hier (el barah) soir.",
    explanation: "Temps passé."
  },
  {
    darija: "Simana",
    arabicScript: "سيمانة",
    translation: "La semaine",
    category: "time",
    region: "Général",
    example: "Derna sondage la semaine (simana) lli fatet.",
    explanation: "Dérivé de la langue espagnole/romane, très ancré en Darija."
  },

  // Emphasis & Quantities
  {
    darija: "Bezzaf",
    arabicScript: "بزاف",
    translation: "Beaucoup / Trop / Très",
    category: "emphasis",
    region: "Général",
    example: "Saha, mlih bezzaf.",
    explanation: "Mot d'intensification par excellence de la Darija algérienne."
  },
  {
    darija: "Yasser",
    arabicScript: "ياسر",
    translation: "Beaucoup / Très",
    category: "emphasis",
    region: "Constantinois",
    example: "Hada l-moushkil s3ib yasser.",
    explanation: "Remplaçant de 'Bezzaf' dans l'Est algérien (Constantine, Annaba)."
  },
  {
    darija: "Chwiya",
    arabicScript: "شوية",
    translation: "Un peu / Légèrement",
    category: "emphasis",
    region: "Général",
    example: "Mazal ghir chi index khasshom chwiya dial optimisation.",
    explanation: "Désigne une petite quantité ou un court laps de temps."
  },
  {
    darija: "Safi / Khlas",
    arabicScript: "صافي / خلاص",
    translation: "C'est bon / Fini / D'accord",
    category: "emphasis",
    region: "Général",
    example: "Khlas, Meriem tkemmel sandbox tests.",
    explanation: "'Safi' (provenance arabe signifiant clair) et 'Khlas' (provenance arabe signifiant terminé) scellent un accord ou la fin d'une tâche."
  },
  {
    darija: "Barkano / Barka",
    arabicScript: "بركانو / بركة",
    translation: "Arrêtez / C'est assez",
    category: "emphasis",
    region: "Général",
    example: "Barka men l-retard, lezem n-démarriw.",
    explanation: "Sert à interrompre ou à fixer une limite."
  },
  {
    darija: "Mlih / Emlih",
    arabicScript: "مليح / أمليح",
    translation: "Bien / Bon / Validé",
    category: "emphasis",
    region: "Général",
    example: "Haka mlih pour le budget.",
    explanation: "Adjectif qualificatif général de réussite."
  },
  {
    darija: "Zoudj",
    arabicScript: "زوج",
    translation: "Deux (2)",
    category: "emphasis",
    region: "Général",
    example: "Khassna zoudj techniciens qualifiés.",
    explanation: "Désigne le chiffre deux en Darija centrale et occidentale."
  },
  {
    darija: "Ga3",
    arabicScript: "ڤاع / كاع",
    translation: "Tout / Tout le monde / Totalement",
    category: "emphasis",
    region: "Général",
    example: "Lyoum lezem ngueddo ga3 l-wraq.",
    explanation: "Sert à englober la totalité d'une équipe ou d'un lot de tâches."
  }
];

interface DarijaLexiconProps {
  onSelectWord?: (word: string) => void;
  onInsertAsContext?: (word: string, translation: string) => void;
}

export function DarijaLexicon({ onSelectWord, onInsertAsContext }: DarijaLexiconProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "greetings" | "business" | "time" | "emphasis">("all");
  const [copiedWord, setCopiedWord] = useState<string | null>(null);

  const handleCopy = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(word);
    setCopiedWord(word);
    setTimeout(() => setCopiedWord(null), 1500);
    if (onSelectWord) {
      onSelectWord(word);
    }
  };

  const filteredItems = DARIJA_LEXICON.filter(item => {
    const matchesSearch = 
      item.darija.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.explanation && item.explanation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.region && item.region.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.arabicScript && item.arabicScript.includes(searchTerm));
    
    const matchesTab = activeTab === "all" || item.category === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" id="darija-lexicon-hub">
      {/* Header section with DZ styling */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-950 p-4 text-white">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/20 text-emerald-300 p-1.5 rounded-lg border border-emerald-400/20">
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
              Lexique de la Darija Algérienne
              <span className="bg-emerald-600/60 text-emerald-200 text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold uppercase tracking-wider">
                الدرجة
              </span>
            </h3>
            <p className="text-[10px] text-emerald-200/80 mt-0.5">
              Expressions, verbes clés & variations régionales (Algérois, Oranais, Constantinois)
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search controls */}
      <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher 'demain', 'bezzaf', 'Oran'..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400 font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "Tous" },
            { id: "greetings", label: "Salutations" },
            { id: "business", label: "Travail & Tech" },
            { id: "time", label: "Temps" },
            { id: "emphasis", label: "Accentuation" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition duration-150 cursor-pointer ${
                activeTab === tab.id 
                  ? "bg-emerald-600 text-white shadow-2xs" 
                  : "bg-white text-slate-600 hover:text-slate-800 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lexicon Items list */}
      <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto bg-white pr-0.5">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center space-y-1">
            <HelpCircle className="w-5 h-5 text-slate-350 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Aucune expression trouvée</p>
            <p className="text-[10px] text-slate-400">Essayez de taper des mots clés plus généraux.</p>
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <div 
              key={idx} 
              className="p-3 hover:bg-slate-50/60 transition group flex flex-col justify-between gap-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className="font-bold text-xs text-slate-900 font-mono tracking-tight select-all">
                      {item.darija}
                    </span>
                    {item.arabicScript && (
                      <span className="text-[11px] text-emerald-700 font-semibold font-sans dir-rtl" title="Écriture arabe">
                        ({item.arabicScript})
                      </span>
                    )}
                    
                    {/* Region badge */}
                    {item.region && item.region !== "Général" && (
                      <span className="bg-teal-50 border border-teal-150 text-teal-750 text-[8.5px] px-1 py-0.1 rounded font-bold flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {item.region}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-600 font-semibold mt-1">
                    {item.translation}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {onInsertAsContext && (
                    <button
                      onClick={() => onInsertAsContext(item.darija, item.translation)}
                      title="Insérer cette expression dans le contexte"
                      className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                    >
                      + Contexte
                    </button>
                  )}
                  <button
                    onClick={(e) => handleCopy(item.darija, e)}
                    className="p-1 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-150 border border-slate-200/65 rounded transition cursor-pointer"
                    title="Copier l'expression"
                  >
                    {copiedWord === item.darija ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {item.example && (
                <div className="text-[10px] bg-slate-50 p-1.5 rounded border border-slate-100 font-mono text-slate-650 leading-relaxed">
                  <span className="font-bold text-indigo-600">Ex:</span> "{item.example}"
                </div>
              )}

              {item.explanation && (
                <p className="text-[9.5px] text-slate-400 leading-snug">
                  💡 {item.explanation}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info footer */}
      <div className="bg-slate-50 p-2.5 border-t border-slate-150 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-slate-500 leading-relaxed">
          <strong>Astuce linguistique :</strong> La Darija algérienne est caractérisée par son alternance fluide (code-switching) avec le français technique. En cliquant sur le bouton <strong>"+ Contexte"</strong>, vous indiquez à Gemini d'accorder une attention particulière à cette expression lors de la transcription.
        </p>
      </div>
    </div>
  );
}
