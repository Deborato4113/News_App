// Languages the reader can translate a story into. Keep in step with
// nexusai-news-backend/config/languages.js (the backend rejects names it does not know).
//   name    sent to the API            native  shown in the picker
//   tag     language tag for the browser's own voices
//   cloud   language code for the server voice (Google Cloud Text-to-Speech), or null when Google has no voice for it
//   rtl     right-to-left script
export const LANGUAGES = [
  { name: 'Hindi', native: 'हिन्दी', tag: 'hi-IN', cloud: 'hi-IN' },
  { name: 'Bengali', native: 'বাংলা', tag: 'bn-IN', cloud: 'bn-IN' },
  { name: 'Tamil', native: 'தமிழ்', tag: 'ta-IN', cloud: 'ta-IN' },
  { name: 'Telugu', native: 'తెలుగు', tag: 'te-IN', cloud: 'te-IN' },
  { name: 'Marathi', native: 'मराठी', tag: 'mr-IN', cloud: 'mr-IN' },
  { name: 'Gujarati', native: 'ગુજરાતી', tag: 'gu-IN', cloud: 'gu-IN' },
  { name: 'Kannada', native: 'ಕನ್ನಡ', tag: 'kn-IN', cloud: 'kn-IN' },
  { name: 'Malayalam', native: 'മലയാളം', tag: 'ml-IN', cloud: 'ml-IN' },
  { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', tag: 'pa-IN', cloud: 'pa-IN' },
  { name: 'Urdu', native: 'اردو', tag: 'ur-IN', cloud: 'ur-IN', rtl: true },
  { name: 'Odia', native: 'ଓଡ଼ିଆ', tag: 'or', cloud: null },
  { name: 'Assamese', native: 'অসমীয়া', tag: 'as', cloud: null },
  { name: 'Nepali', native: 'नेपाली', tag: 'ne', cloud: null },
  { name: 'Sinhala', native: 'සිංහල', tag: 'si', cloud: null },
  { name: 'Spanish', native: 'Español', tag: 'es-ES', cloud: 'es-ES' },
  { name: 'French', native: 'Français', tag: 'fr-FR', cloud: 'fr-FR' },
  { name: 'German', native: 'Deutsch', tag: 'de-DE', cloud: 'de-DE' },
  { name: 'Italian', native: 'Italiano', tag: 'it-IT', cloud: 'it-IT' },
  { name: 'Portuguese', native: 'Português', tag: 'pt-BR', cloud: 'pt-BR' },
  { name: 'Dutch', native: 'Nederlands', tag: 'nl-NL', cloud: 'nl-NL' },
  { name: 'Russian', native: 'Русский', tag: 'ru-RU', cloud: 'ru-RU' },
  { name: 'Ukrainian', native: 'Українська', tag: 'uk-UA', cloud: 'uk-UA' },
  { name: 'Polish', native: 'Polski', tag: 'pl-PL', cloud: 'pl-PL' },
  { name: 'Czech', native: 'Čeština', tag: 'cs-CZ', cloud: 'cs-CZ' },
  { name: 'Slovak', native: 'Slovenčina', tag: 'sk-SK', cloud: 'sk-SK' },
  { name: 'Romanian', native: 'Română', tag: 'ro-RO', cloud: 'ro-RO' },
  { name: 'Hungarian', native: 'Magyar', tag: 'hu-HU', cloud: 'hu-HU' },
  { name: 'Greek', native: 'Ελληνικά', tag: 'el-GR', cloud: 'el-GR' },
  { name: 'Swedish', native: 'Svenska', tag: 'sv-SE', cloud: 'sv-SE' },
  { name: 'Norwegian', native: 'Norsk', tag: 'nb-NO', cloud: 'nb-NO' },
  { name: 'Danish', native: 'Dansk', tag: 'da-DK', cloud: 'da-DK' },
  { name: 'Finnish', native: 'Suomi', tag: 'fi-FI', cloud: 'fi-FI' },
  { name: 'Bulgarian', native: 'Български', tag: 'bg-BG', cloud: 'bg-BG' },
  { name: 'Serbian', native: 'Српски', tag: 'sr-RS', cloud: 'sr-RS' },
  { name: 'Croatian', native: 'Hrvatski', tag: 'hr', cloud: null },
  { name: 'Slovenian', native: 'Slovenščina', tag: 'sl-SI', cloud: 'sl-SI' },
  { name: 'Catalan', native: 'Català', tag: 'ca-ES', cloud: 'ca-ES' },
  { name: 'Icelandic', native: 'Íslenska', tag: 'is-IS', cloud: 'is-IS' },
  { name: 'Latvian', native: 'Latviešu', tag: 'lv-LV', cloud: 'lv-LV' },
  { name: 'Lithuanian', native: 'Lietuvių', tag: 'lt-LT', cloud: 'lt-LT' },
  { name: 'Estonian', native: 'Eesti', tag: 'et', cloud: null },
  { name: 'Welsh', native: 'Cymraeg', tag: 'cy', cloud: null },
  { name: 'Chinese', native: '简体中文', tag: 'cmn-CN', cloud: 'cmn-CN' },
  { name: 'Chinese (Traditional)', native: '繁體中文', tag: 'cmn-TW', cloud: 'cmn-TW' },
  { name: 'Japanese', native: '日本語', tag: 'ja-JP', cloud: 'ja-JP' },
  { name: 'Korean', native: '한국어', tag: 'ko-KR', cloud: 'ko-KR' },
  { name: 'Thai', native: 'ไทย', tag: 'th-TH', cloud: 'th-TH' },
  { name: 'Vietnamese', native: 'Tiếng Việt', tag: 'vi-VN', cloud: 'vi-VN' },
  { name: 'Indonesian', native: 'Bahasa Indonesia', tag: 'id-ID', cloud: 'id-ID' },
  { name: 'Malay', native: 'Bahasa Melayu', tag: 'ms-MY', cloud: 'ms-MY' },
  { name: 'Filipino', native: 'Filipino', tag: 'fil-PH', cloud: 'fil-PH' },
  { name: 'Burmese', native: 'မြန်မာ', tag: 'my', cloud: null },
  { name: 'Khmer', native: 'ខ្មែរ', tag: 'km', cloud: null },
  { name: 'Mongolian', native: 'Монгол', tag: 'mn', cloud: null },
  { name: 'Arabic', native: 'العربية', tag: 'ar-XA', cloud: 'ar-XA', rtl: true },
  { name: 'Hebrew', native: 'עברית', tag: 'he-IL', cloud: 'he-IL', rtl: true },
  { name: 'Persian', native: 'فارسی', tag: 'fa', cloud: null, rtl: true },
  { name: 'Turkish', native: 'Türkçe', tag: 'tr-TR', cloud: 'tr-TR' },
  { name: 'Swahili', native: 'Kiswahili', tag: 'sw', cloud: null },
  { name: 'Afrikaans', native: 'Afrikaans', tag: 'af-ZA', cloud: 'af-ZA' },
  { name: 'Amharic', native: 'አማርኛ', tag: 'am', cloud: null },
  { name: 'Hausa', native: 'Hausa', tag: 'ha', cloud: null },
  { name: 'Yoruba', native: 'Yorùbá', tag: 'yo', cloud: null },
  { name: 'Zulu', native: 'isiZulu', tag: 'zu', cloud: null },
  { name: 'Somali', native: 'Soomaali', tag: 'so', cloud: null },
];

// The language that matches the reader's browser settings (e.g. "hi-IN" -> Hindi), or null.
export function browserLanguage(navLang = typeof navigator !== 'undefined' ? navigator.language : '') {
  const base = String(navLang || '').toLowerCase();
  if (!base || base.startsWith('en')) return null;
  const exact = LANGUAGES.find((l) => l.tag.toLowerCase() === base);
  if (exact) return exact;
  const short = base.split('-')[0];
  return LANGUAGES.find((l) => l.tag.toLowerCase().split('-')[0] === short) || null;
}

// Case- and accent-insensitive match on either the English or the native name.
export function filterLanguages(query) {
  const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = fold(query.trim());
  if (!q) return LANGUAGES;
  const hits = LANGUAGES.filter((l) => fold(l.name).includes(q) || fold(l.native).includes(q));
  // Names that start with what was typed come first ("ara" -> Arabic before Marathi).
  const starts = (l) => fold(l.name).startsWith(q) || fold(l.native).startsWith(q);
  return [...hits.filter(starts), ...hits.filter((l) => !starts(l))];
}
