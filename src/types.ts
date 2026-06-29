export interface DiscussionPoint {
  topic: string;
  summary: string;
}

export interface ActionItem {
  task: string;
  owner: string;
  priority: string; // "High" | "Medium" | "Low"
}

export interface MeetingSummary {
  id: string;
  title: string;
  date: string;
  languagesFound: string[];
  overallSummary: string;
  keyDecisions: string[];
  discussionPoints: DiscussionPoint[];
  actionItems: ActionItem[];
  fullTranscript: string;
  targetLanguage: string;
}

export type SupportedLanguage = "French" | "Arabic" | "Darija" | "English";

export interface SupportedLanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: "ltr" | "rtl";
}

export const SUPPORTED_LANGUAGES_META: Record<SupportedLanguage, SupportedLanguageMeta> = {
  French: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    dir: "ltr"
  },
  Arabic: {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    flag: "🇩🇿",
    dir: "rtl"
  },
  Darija: {
    code: "ry",
    name: "Darija",
    nativeName: "الدارجة الجزائرية",
    flag: "🇩🇿",
    dir: "rtl"
  },
  English: {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇺🇸",
    dir: "ltr"
  }
};
