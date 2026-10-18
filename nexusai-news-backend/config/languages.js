// Every language the reader can translate a story into.
//   name    what the API and the Groq fallback are given
//   native  the language's own name, shown in the picker
//   code    Google Cloud Translation language code
//   tts     Google Cloud Text-to-Speech language code, or null where Google has no
//           voice for it (the app then uses a voice installed on the reader's device)
//   rtl     true for right-to-left scripts
// The frontend keeps the same list in src/lib/languages.js; tests/languages.test.js
// checks this one is well formed.
const LANGUAGES = [
  // India and South Asia
  { name: 'Hindi', native: 'हिन्दी', code: 'hi', tts: 'hi-IN' },
  { name: 'Bengali', native: 'বাংলা', code: 'bn', tts: 'bn-IN' },
  { name: 'Tamil', native: 'தமிழ்', code: 'ta', tts: 'ta-IN' },
  { name: 'Telugu', native: 'తెలుగు', code: 'te', tts: 'te-IN' },
  { name: 'Marathi', native: 'मराठी', code: 'mr', tts: 'mr-IN' },
  { name: 'Gujarati', native: 'ગુજરાતી', code: 'gu', tts: 'gu-IN' },
  { name: 'Kannada', native: 'ಕನ್ನಡ', code: 'kn', tts: 'kn-IN' },
  { name: 'Malayalam', native: 'മലയാളം', code: 'ml', tts: 'ml-IN' },
  { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', code: 'pa', tts: 'pa-IN' },
  { name: 'Urdu', native: 'اردو', code: 'ur', tts: 'ur-IN', rtl: true },
  { name: 'Odia', native: 'ଓଡ଼ିଆ', code: 'or', tts: null },
  { name: 'Assamese', native: 'অসমীয়া', code: 'as', tts: null },
  { name: 'Nepali', native: 'नेपाली', code: 'ne', tts: null },
  { name: 'Sinhala', native: 'සිංහල', code: 'si', tts: null },

  // Europe
  { name: 'Spanish', native: 'Español', code: 'es', tts: 'es-ES' },
  { name: 'French', native: 'Français', code: 'fr', tts: 'fr-FR' },
  { name: 'German', native: 'Deutsch', code: 'de', tts: 'de-DE' },
  { name: 'Italian', native: 'Italiano', code: 'it', tts: 'it-IT' },
  { name: 'Portuguese', native: 'Português', code: 'pt', tts: 'pt-BR' },
  { name: 'Dutch', native: 'Nederlands', code: 'nl', tts: 'nl-NL' },
  { name: 'Russian', native: 'Русский', code: 'ru', tts: 'ru-RU' },
  { name: 'Ukrainian', native: 'Українська', code: 'uk', tts: 'uk-UA' },
  { name: 'Polish', native: 'Polski', code: 'pl', tts: 'pl-PL' },
  { name: 'Czech', native: 'Čeština', code: 'cs', tts: 'cs-CZ' },
  { name: 'Slovak', native: 'Slovenčina', code: 'sk', tts: 'sk-SK' },
  { name: 'Romanian', native: 'Română', code: 'ro', tts: 'ro-RO' },
  { name: 'Hungarian', native: 'Magyar', code: 'hu', tts: 'hu-HU' },
  { name: 'Greek', native: 'Ελληνικά', code: 'el', tts: 'el-GR' },
  { name: 'Swedish', native: 'Svenska', code: 'sv', tts: 'sv-SE' },
  { name: 'Norwegian', native: 'Norsk', code: 'no', tts: 'nb-NO' },
  { name: 'Danish', native: 'Dansk', code: 'da', tts: 'da-DK' },
  { name: 'Finnish', native: 'Suomi', code: 'fi', tts: 'fi-FI' },
  { name: 'Bulgarian', native: 'Български', code: 'bg', tts: 'bg-BG' },
  { name: 'Serbian', native: 'Српски', code: 'sr', tts: 'sr-RS' },
  { name: 'Croatian', native: 'Hrvatski', code: 'hr', tts: null },
  { name: 'Slovenian', native: 'Slovenščina', code: 'sl', tts: 'sl-SI' },
  { name: 'Catalan', native: 'Català', code: 'ca', tts: 'ca-ES' },
  { name: 'Icelandic', native: 'Íslenska', code: 'is', tts: 'is-IS' },
  { name: 'Latvian', native: 'Latviešu', code: 'lv', tts: 'lv-LV' },
  { name: 'Lithuanian', native: 'Lietuvių', code: 'lt', tts: 'lt-LT' },
  { name: 'Estonian', native: 'Eesti', code: 'et', tts: null },
  { name: 'Welsh', native: 'Cymraeg', code: 'cy', tts: null },

  // East and South-East Asia
  { name: 'Chinese', native: '简体中文', code: 'zh-CN', tts: 'cmn-CN' },
  { name: 'Chinese (Traditional)', native: '繁體中文', code: 'zh-TW', tts: 'cmn-TW' },
  { name: 'Japanese', native: '日本語', code: 'ja', tts: 'ja-JP' },
  { name: 'Korean', native: '한국어', code: 'ko', tts: 'ko-KR' },
  { name: 'Thai', native: 'ไทย', code: 'th', tts: 'th-TH' },
  { name: 'Vietnamese', native: 'Tiếng Việt', code: 'vi', tts: 'vi-VN' },
  { name: 'Indonesian', native: 'Bahasa Indonesia', code: 'id', tts: 'id-ID' },
  { name: 'Malay', native: 'Bahasa Melayu', code: 'ms', tts: 'ms-MY' },
  { name: 'Filipino', native: 'Filipino', code: 'tl', tts: 'fil-PH' },
  { name: 'Burmese', native: 'မြန်မာ', code: 'my', tts: null },
  { name: 'Khmer', native: 'ខ្មែរ', code: 'km', tts: null },
  { name: 'Mongolian', native: 'Монгол', code: 'mn', tts: null },

  // Middle East, Central Asia and Africa
  { name: 'Arabic', native: 'العربية', code: 'ar', tts: 'ar-XA', rtl: true },
  { name: 'Hebrew', native: 'עברית', code: 'he', tts: 'he-IL', rtl: true },
  { name: 'Persian', native: 'فارسی', code: 'fa', tts: null, rtl: true },
  { name: 'Turkish', native: 'Türkçe', code: 'tr', tts: 'tr-TR' },
  { name: 'Swahili', native: 'Kiswahili', code: 'sw', tts: null },
  { name: 'Afrikaans', native: 'Afrikaans', code: 'af', tts: 'af-ZA' },
  { name: 'Amharic', native: 'አማርኛ', code: 'am', tts: null },
  { name: 'Hausa', native: 'Hausa', code: 'ha', tts: null },
  { name: 'Yoruba', native: 'Yorùbá', code: 'yo', tts: null },
  { name: 'Zulu', native: 'isiZulu', code: 'zu', tts: null },
  { name: 'Somali', native: 'Soomaali', code: 'so', tts: null },
];

const NAMES = LANGUAGES.map((l) => l.name);
// Name -> Google Translate code, e.g. { Hindi: 'hi' }.
const CODES = Object.fromEntries(LANGUAGES.map((l) => [l.name, l.code]));
// Every voice code the speak route accepts (English is read by the browser or this voice).
const SPEECH_LANGS = ['en-IN', ...new Set(LANGUAGES.map((l) => l.tts).filter(Boolean))];

module.exports = { LANGUAGES, NAMES, CODES, SPEECH_LANGS };
