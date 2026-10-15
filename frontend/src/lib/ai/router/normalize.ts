/**
 * Glory AI Local-First Router — Normalization & Language Utilities
 * Strips punctuation/emojis, collapses whitespace, normalizes Banglish, and detects language.
 */

export interface NormalizedInput {
  raw: string;
  clean: string;
  tokens: string[];
  isBengaliScript: boolean;
  isBanglish: boolean;
  detectedLang: 'bn' | 'en';
}

// Common Banglish phonetic transliteration dictionary
const BANGLISH_MAP: Record<string, string> = {
  'kemon': 'কেমন',
  'kemn': 'কেমন',
  'achho': 'আছো',
  'acho': 'আছো',
  'aso': 'আছো',
  'asen': 'আছেন',
  'achen': 'আছেন',
  'bhalo': 'ভালো',
  'valo': 'ভালো',
  'tumi': 'তুমি',
  'tomar': 'তোমার',
  'apni': 'আপনি',
  'apnar': 'আপনার',
  'ami': 'আমি',
  'amar': 'আমার',
  'ki': 'কী',
  'kee': 'কী',
  'khobor': 'খবর',
  'kibhabe': 'কীভাবে',
  'kivabe': 'কীভাবে',
  'kothay': 'কোথায়',
  'kotay': 'কোথায়',
  'kokhon': 'কখন',
  'kon': 'কোন',
  'porbo': 'পড়ব',
  'porte': 'পড়তে',
  'porashona': 'পড়াশোনা',
  'study': 'স্টাডি',
  'routine': 'রুটিন',
  'ajke': 'আজকে',
  'aajke': 'আজকে',
  'aj': 'আজ',
  'aaj': 'আজ',
  'kal': 'কাল',
  'kaal': 'কাল',
  'agamikal': 'আগামীকাল',
  'shuru': 'শুরু',
  'korbo': 'করব',
  'korchi': 'করছি',
  'korte': 'করতে',
  'chai': 'চাই',
  'dorkar': 'দরকার',
  'shikhbo': 'শিখব',
  'shikte': 'শিখতে',
  'shikhte': 'শিখতে',
  'hobe': 'হবে',
  'parbo': 'পারব',
  'parchi': 'পারছি',
  'klanto': 'ক্লান্ত',
  'bhor': 'ভোর',
  'shokal': 'সকাল',
  'dupur': 'দুপুর',
  'bikel': 'বিকাল',
  'shondha': 'সন্ধ্যা',
  'raat': 'রাত',
  'ghumiye': 'ঘুমিয়ে',
  'ghoom': 'ঘুম',
  'ekhon': 'এখন',
  'dhonnobad': 'ধন্যবাদ',
  'thx': 'ধন্যবাদ',
  'shala': 'সালাম',
  'salam': 'সালাম',
  'assalamu': 'আসসালামু',
  'alaikum': 'আলাইকুম',
  'alhamdulillah': 'আলহামদুলিল্লাহ',
  'inshallah': 'ইনশাআল্লাহ',
};

const BANGLISH_INDICATORS = /\b(ami|amar|amake|amader|tumi|tomar|tomake|apni|apnar|apnake|korbo|korchi|korte|koro|korun|chai|dorkar|shikhbo|sikhbo|hobe|kemon|achho|acho|aso|achen|asen|bhalo|valo|parbo|parchi|kibhabe|kivabe|kothay|kokhon|porbo|porte|porashona|ajke|aajke|agamikal|ekhon|shuru|shesh|shikhte|khobor|dhonnobad|thik\s*ache|acche|bujhlam|bujhi|valobashi|bhalobashi|ghumaite|ghumiye|eta|oita|vul|bhul|hoyeche|hoyese|hoise|bolso|bolcho|bolsen|bolchen)\b/i;

export function normalizeInput(input: string): NormalizedInput {
  const raw = input || '';
  
  // 1. Lowercase and collapse unicode whitespace
  let clean = raw.toLowerCase().trim();

  // Normalize Bengali composite characters (য + nukta -> য়, ড + nukta -> ড়, ঢ + nukta -> ঢ়)
  clean = clean
    .replace(/\u09af\u09bc/g, '\u09df')
    .replace(/\u09a1\u09bc/g, '\u09dd')
    .replace(/\u09a2\u09bc/g, '\u09de');

  // 2. Strip keyboard emojis and miscellaneous symbols
  clean = clean.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

  // 3. Remove punctuation except characters useful for time/date parsing (: / - .)
  clean = clean.replace(/[!?,;~`@#$%^&*()_+=\[\]{}|\\<>"'।]/g, ' ');

  // 4. Collapse multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim();

  const isBengaliScript = /[\u0980-\u09FF]/.test(raw);
  const isBanglish = BANGLISH_INDICATORS.test(raw);

  const detectedLang: 'bn' | 'en' = (isBengaliScript || isBanglish) ? 'bn' : 'en';

  const tokens = clean.split(' ').filter(Boolean);

  return {
    raw,
    clean,
    tokens,
    isBengaliScript,
    isBanglish,
    detectedLang,
  };
}

/**
 * Transliterates Banglish words into standardized Bengali tokens if matching
 */
export function transliterateBanglishWords(cleanText: string): string {
  const words = cleanText.split(' ');
  const transliterated = words.map(w => BANGLISH_MAP[w] || w);
  return transliterated.join(' ');
}
