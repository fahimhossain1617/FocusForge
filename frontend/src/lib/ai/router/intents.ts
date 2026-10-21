/**
 * Glory AI Local-First Router — Intent Classification Engine
 * Classifies user queries across 30+ local intent patterns (English, Bengali, Banglish)
 * with confidence scoring. Zero Gemini tokens.
 */

import type { NormalizedInput } from './normalize';

export type LocalIntentType =
  | 'GREETING'
  | 'HOW_ARE_YOU'
  | 'FAREWELL'
  | 'WHO_ARE_YOU'
  | 'WHAT_CAN_YOU_DO'
  | 'JOKES_AND_FUN'
  | 'COMPLIMENTS'
  | 'FEELINGS_AND_AGE'
  | 'BORED_OR_TIRED'
  | 'LOVE_YOU'
  | 'ACKNOWLEDGEMENT'
  | 'GOOD_NIGHT'
  | 'EXAM_FEAR'
  | 'LONELINESS_SADNESS'
  | 'PROCRASTINATION_LAZINESS'
  | 'CELEBRATING_PROGRESS'
  | 'NAVIGATION_FOCUS'
  | 'NAVIGATION_PLANNER'
  | 'NAVIGATION_DIARY'
  | 'NAVIGATION_NOTES'
  | 'NAVIGATION_MIND'
  | 'NAVIGATION_LEARNING'
  | 'NAVIGATION_DASHBOARD'
  | 'NAVIGATION_SETTINGS'
  | 'SETTINGS_LANGUAGE'
  | 'SETTINGS_THEME'
  | 'SETTINGS_PASSWORD'
  | 'SETTINGS_NOTIFICATIONS'
  | 'SETTINGS_DELETE_ACCOUNT'
  | 'SETTINGS_SUPPORT'
  | 'TIMER_ACTION'
  | 'FOCUS_SESSION_ACTION'
  | 'PLANNER_ACTION'
  | 'TASK_DELETE'
  | 'NOTES_ACTION'
  | 'DIARY_ACTION'
  | 'TIMELOG_ACTION'
  | 'TIMELOG_TOPIC_QUERY'
  | 'PLANNER_DATE_QUERY'
  | 'LEARNING_TEACH_REQUEST'
  | 'STATS_PROGRESS'
  | 'APP_HELP'
  | 'BIG_TASK_ROADMAP'
  | 'USER_CORRECTION'
  | 'UNKNOWN';

export interface ClassifiedIntent {
  intent: LocalIntentType;
  confidence: number;
  extractedParams?: Record<string, any>;
  isBigTask: boolean;
}

// 1. Social & Small Talk Patterns
const HOW_ARE_YOU_REGEX = /(?:\b(?:how\s*(?:are|r)\s*you|how\s*do\s*you\s*do|how\s*are\s*you\s*doing|how\s*is\s*it\s*going|whats\s*up|what's\s*up|sup|kemon\s*achho|kemon\s*acho|kemon\s*aso|kemon\s*achen|kemon\s*asen|valo\s*acho|bhalo\s*acho)\b|কেমন\s*আছো|কেমন\s*আছিস|কেমন\s*আছেন|কেমন\s*আসেন|ভালো\s*আছো|ভালো\s*আছেন)/i;
const GREETING_REGEX = /(?:\b(?:hi|hello|hey|heyy|heya|hiya|salam|assalamu\s*alaikum|halo|good\s*morning|good\s*afternoon|good\s*evening|shuvo\s*shokal|ki\s*khobor|ki\s*obostha)\b|সুপ্রভাত|শুভ\s*সকাল|শুভ\s*সন্ধ্যা|সালাম|আসসালামু\s*আলাইকুম|হ্যালো|হাই|হায়|কী\s*খবর|কি\s*খবর|কি\s*অবস্থা|কী\s*অবস্থা)/i;
const FAREWELL_REGEX = /(?:\b(?:bye|goodbye|see\s*you(?:\s*later)?|tata|ta\s*ta|allah\s*hafez|pore\s*kotha\s*hobe)\b|বিদায়|বাই|পরে\s*কথা\s*হবে|আল্লাহ\s*হাফেজ|টা\s*টা|টাটা)/i;
const WHO_ARE_YOU_REGEX = /(?:\b(?:who\s*(?:are|r)\s*u|who\s*are\s*you|what(?:'s|\s+is)\s+your\s+name|introduce\s*yourself|who\s+made\s+you|are\s+you\s+(?:a\s+)?robot|who\s+is\s+glory|tell\s+me\s+about\s+(?:yourself|glory|focusforge|focentia)|tumi\s*ke|tomar\s*na?am\s*ki|tumi\s*ki\s*robot)\b|তুমি\s*কে|তোমার\s*নাম\s*(?:কী|কি)|তোমার\s*পরিচয়|তোমার\s*পরিচয়|কে\s*তুমি|তুমি\s*(?:কি|কী)\s*রোবট|তোমাকে\s*কে\s*(?:বানিয়েছে|বানাইছে|তৈরি\s*করেছে)|গ্লোরি\s*কে)/i;
const WHAT_CAN_YOU_DO_REGEX = /(?:\b(?:what\s*can\s*you\s*do|what\s*do\s*you\s*do|what\s*(?:are\s*)?your\s*features|how\s*can\s*you\s*help|features\s*of\s*(?:focusforge|focentia|glory)|tumi\s*ki\s*(?:ki\s*)?korte\s*paro)\b|তুমি\s*(?:কী|কি)\s*(?:কী|কি\s*)?করতে\s*পারো|তোমার\s*কাজ\s*(?:কী|কি)|তুমি\s*(?:কী|কি)\s*কাজ\s*করো|কীভাবে\s*সাহায্য\s*(?:করবে|করতে\s*পারো)|কিভাবে\s*সাহায্য\s*(?:করবে|করতে\s*পারো)|(?:কী|কি)\s*(?:কী|কি\s*)?ফিচার\s*আছে|তোমার\s*ফিচার)/i;
const JOKES_REGEX = /(?:\b(?:tell\s*(?:me\s*)?(?:a\s*)?joke|joke\s*please|make\s*me\s*laugh|funny|joke\s*bolo|joke\s*sunao|koutuk\s*bolo)\b|(?:একটি|একটা)?\s*(?:জোকস?|কৌতুক)\s*(?:বলো|শোনাও)|মজার\s*কিছু\s*বলো|হাসাও|কৌতুক)/i;
const COMPLIMENT_REGEX = /(?:\b(?:you\s*are\s*(?:great|awesome|the\s*best|cool|smart)|good\s*job|well\s*done|thank\s*you|thanks|thx|valo\s*laglo|bhalo\s*laglo|dhonnobad)\b|ধন্যবাদ|অনেক\s*ধন্যবাদ|থ্যাংক\s*ইউ|থ্যাঙ্ক\s*ইউ|থ্যাংকস|দারুণ|দারুন|তুমি\s*সেরা|খুব\s*ভালো\s*লেগেছে|অনেক\s*ভালো)/i;
const FEELINGS_AGE_REGEX = /(?:\b(?:how\s*old\s*are\s*you|your\s*age|how\s*do\s*you\s*feel|tomar\s*boyos|tomar\s*age)\b|তোমার\s*বয়স(?:\s*কত)?|কেমন\s*অনুভব\s*করছো)/i;
const BORED_TIRED_REGEX = /(?:\b(?:i(?:'m|\s+am)\s+(?:bored|tired|exhausted|sleepy)|feeling\s+(?:bored|tired|sleepy)|boring\s*lagche|klanto\s*lagche)\b|বোরিং\s*লাগছে|ক্লান্ত\s*লাগছে|ঘুম\s*পাচ্ছে|আমি\s*ক্লান্ত|খুব\s*ক্লান্ত|একঘেয়ে\s*লাগছে)/i;
const GOOD_NIGHT_REGEX = /(?:\b(?:good\s*night|night\s*glory|sleep\s*well|shuvo\s*ratri|ghumaite\s*jai|ghumiye\s*pori)\b|শুভ\s*(?:রাত্রি|রাত)|ঘুমাতে\s*যাই|ঘুমাব|ঘুমিয়ে\s*পড়ি)/i;
const LOVE_YOU_REGEX = /(?:\b(?:i\s*love\s*you|love\s*you(?:\s*glory)?|bhalobashi\s*tomake|valobashi\s*tomake)\b|তোমাকে\s*ভালোবাসি|তোমায়\s*ভালোবাসি|ভালোবাসি\s*তোমাকে|লাভ\s*ইউ)/i;
const ACK_REGEX = /^(?:ok|okay|hmm|hm|hmmm|yes|no|yup|nope|thik\s*ache|acche|আচ্ছা|ঠিক\s*আছে|ঠিক\s*আসে|হ্যাঁ|হাঁ|না|bujhlam|বুঝলাম|got\s*it|sure|alright)(?:\s+(?:bhai|vai|glory|গ্লোরি|ভাই|ভাইয়া|বন্ধু|ঠিক\s*আছে|বুঝলাম))?[!?.]*$/i;
const USER_CORRECTION_REGEX = /(?:\b(?:you\s+are\s+wrong|you\s+made\s+a\s+mistake|that(?:'s|\s+is)\s+(?:wrong|incorrect|a\s+mistake)|wrong\s+answer|not\s+correct|(?:eta|oita)\s*(?:vul|bhul)|(?:vul|bhul)\s*(?:hoyeche|hoyese|hoise|bolso|bolcho|bolsen|korsen|koreso))\b|ভুল\s*(?:হয়েছে|বলছ|বলেছো|করলা|করেছ|উত্তর|হয়ে\s*গেছে)|এটা\s*ভুল|ভুল\s*তথ্য|ভুল\s*কথা|ভুল\s*হয়েছে|ভুল\s*বলেছ|ভুল\s*করেছ|ভুল\s*উত্তর|ঠিক\s*না)/i;

// 2. Emotional Support & Motivation Patterns
const EXAM_FEAR_REGEX = /(?:\b(?:scared\s*of\s*my\s*exam|exam\s*fear|fear\s*of\s*failure|scared\s*of\s*future|no\s*confidence|fail\s*করব|porikhar\s*bhoy|fail\s*korbo|fear\s*exam)\b|পরীক্ষার\s*ভয়|ভয়\s*করছে|আত্মবিশ্বাস\s*পাচ্ছি\s*না|ভবিষ্যৎ\s*নিয়ে\s*ভয়)/i;
const LONELINESS_REGEX = /(?:\b(?:feel\s*alone|lonely|feeling\s*sad|depressed|stress|stressed|burnout|overwhelmed|eka\s*lagche|mon\s*kharap|lonely\s*lagche)\b|কেউ\s*নেই|একা\s*লাগছে|মন\s*খারাপ|কষ্ট\s*হচ্ছে|চাপ\s*সহ্য\s*হচ্ছে\s*না)/i;
const PROCRASTINATION_REGEX = /(?:\b(?:can(?:'t|\s*not)\s*focus|procrastinat(?:ing|ion)|phone\s*addiction|distract(?:ed|ion)|don(?:'t|\s*not)\s*feel\s*like\s*studying|i(?:'m|\s+am)\s+lazy|porte\s*icche\s*korche\s*na|mon\s*boshe\s*na|alashemi)\b|মন\s*বসছে\s*না|পড়তে\s*ইচ্ছে\s*করছে\s*না|আলসেমি\s*লাগছে|ফোনে\s*সময়\s*নষ্ট|পড়ায়\s*মন\s*নেই)/i;
const CELEBRATING_REGEX = /(?:\b(?:i\s*finished\s*my\s*task|finished\s*studying|completed\s*task|studied\s*for\s*\d+\s*hours|shob\s*porlam|shesh\s*korchi|finished\s*today)\b|কাজ\s*শেষ\s*করেছি|পড়া\s*শেষ|টাস্ক\s*কমপ্লিট)/i;

// 3. Navigation Patterns
const NAV_FOCUS_REGEX = /(?:\b(?:take\s*me\s*to\s*focus|where\s*is\s*focus|open\s*focus|go\s*to\s*focus|open\s*pomodoro|(?:show|give)\s*me\s*(?:the\s*)?fou?cs(?:\s*(?:session|feature))?\s*(?:option|button)|fou?cs\s*(?:session\s*)?(?:option|button|feature)|want\s*to\s*focus|focus\s*korte\s*chai)\b|ফোকাসে\s*যাও|ফোকাস\s*(?:টাইমার|সেশন)?\s*খুলুন|ফোকাস\s*খোলো|ফোকাস\s*(?:অপশন|বাটন|ফিচার)|ফোকাস\s*করতে\s*চাই)/i;
const NAV_PLANNER_REGEX = /(?:\b(?:take\s*me\s*to\s*planner|where\s*is\s*planner|open\s*planner|go\s*to\s*planner|(?:show|give)\s*me\s*planner\s*(?:option|button)|planner\s*(?:option|button|feature))\b|প্ল্যানারে\s*যাও|প্ল্যানার\s*(?:খুলুন|খোলো|অপশন|বাটন|ফিচার))/i;
const NAV_DIARY_REGEX = /(?:\b(?:take\s*me\s*to\s*diary|where\s*is\s*diary|open\s*diary|my\s*diary|(?:show|give)\s*me\s*diary\s*(?:option|button)|diary\s*(?:option|button|feature))\b|ডায়েরিতে\s*যাও|ডায়েরি\s*(?:খুলুন|খোলো|অপশন|বাটন|ফিচার))/i;
const NAV_NOTES_REGEX = /(?:\b(?:take\s*me\s*to\s*notes|where\s*is\s*notes|notes\s*and\s*files|open\s*notes|(?:show|give)\s*me\s*notes\s*(?:option|button)|notes\s*(?:option|button|feature))\b|নোটস\s*(?:খুলুন|খোলো|অপশন|বাটন|ফিচার)|নোটসে\s*যাও|নোটস\s*ও\s*ফাইলস)/i;
const NAV_MIND_REGEX = /(?:\b(?:take\s*me\s*to\s*mind|open\s*mind(?:\s*space)?|mind\s*space(?:\s*(?:button|option))?|problem\s*solver(?:\s*(?:button|option))?|idea\s*vault|free\s*flow|i\s*have\s*a\s*problem|have\s*a\s*problem|problem\s*in\s*my\s*mind|need\s*a\s*mind\s*space\s*button|mind\s*space\s*button|solve\s*(?:my\s*)?problem)\b|মাইন্ড\s*স্পেস(?:\s*(?:খুলুন|খোলো|বাটন|অপশন))?|মাইন্ড\s*স্পেসে\s*যাও|প্রবলেম\s*সলভার|সমস্যায়\s*পড়েছি|আমার\s*(?:একটি|একটা)?\s*সমস্যা|সমস্যার\s*সমাধান|মাথায়\s*চাপ)/i;
const NAV_LEARNING_REGEX = /(?:\b(?:take\s*me\s*to\s*time\s*log|open\s*time\s*log|where\s*is\s*time\s*log|skill\s*builder|(?:show|give)\s*me\s*time\s*log\s*(?:option|button)|time\s*log\s*(?:option|button|feature))\b|টাইম\s*লগ\s*(?:খুলুন|খোলো|অপশন|বাটন|ফিচার)|টাইম\s*লগে\s*যাও)/i;
const NAV_DASHBOARD_REGEX = /(?:\b(?:take\s*me\s*to\s*dashboard|open\s*dashboard|open\s*home|(?:show|give)\s*me\s*dashboard\s*(?:option|button)|dashboard\s*(?:option|button|feature)|track\s*my\s*progress)\b|ড্যাশবোর্ড\s*(?:খুলুন|খোলো|অপশন|বাটন|ফিচার)|ড্যাশবোর্ডে\s*যাও|হোম\s*পেজে\s*যাও|প্রগ্রেস\s*ট্র্যাক)/i;
const NAV_SETTINGS_REGEX = /(?:\b(?:take\s*me\s*to\s*settings|open\s*settings)\b|সেটিংসে\s*যাও|সেটিংস\s*খুলুন)/i;

// Settings sub-pages
const SETTINGS_LANG_REGEX = /(?:\b(?:change\s*language|language\s*settings|how\s*do\s*i\s*change\s*language|bhasha\s*change)\b|বাংলা\s*করব\s*কীভাবে|ভাষা\s*পরিবর্তন)/i;
const SETTINGS_THEME_REGEX = /(?:\b(?:change\s*theme|dark\s*mode|light\s*mode|theme\s*settings|theme\s*change)\b|থিম\s*পরিবর্তন|ডার্ক\s*মোড)/i;
const SETTINGS_PASS_REGEX = /(?:\b(?:change\s*password|reset\s*password|password\s*change)\b|পাসওয়ার্ড\s*পরিবর্তন|পাসওয়ার্ড\s*রিসেট)/i;
const SETTINGS_NOTIF_REGEX = /(?:\b(?:notification\s*settings|quiet\s*hours|turn\s*off\s*notifications)\b|নোটিফিকেশন\s*বন্ধ|নোটিফিকেশন\s*সেটিংস)/i;
const SETTINGS_DELETE_REGEX = /(?:\b(?:delete\s*account|delete\s*my\s*account|remove\s*account|account\s*delete)\b|অ্যাকাউন্ট\s*ডিলিট)/i;
const SETTINGS_SUPPORT_REGEX = /(?:\b(?:contact\s*support|report\s*a\s*problem|report\s*bug|feedback)\b|সমস্যা\s*রিপোর্ট|সাপোর্টে\s*যোগাযোগ)/i;

// 4. Productivity Actions
const TIMER_ACTION_REGEX = /(?:\b(need\s*a\s*timer|give\s*me\s*a\s*timer|open\s*timer|start\s*timer|stopwatch\s*please)\b|^timer$|^stopwatch$|টাইমার\s*চাই|টাইমার\s*লাগবে|টাইমার\s*দরকার|টাইমার\s*দাও|টাইমার\s*চালু|স্টপওয়াচ\s*চাই|স্টপওয়াচ\s*লাগবে|স্টপওয়াচ\s*দরকার)/i;
const FOCUS_SESSION_ACTION_REGEX = /(?:\b(start\s*focus\s*session|deep\s*focus\s*session|let('s|\s+us)\s+focus|want\s+to\s+focus\s+now)\b|ফোকাস\s*সেশন\s*শুরু|ফোকাস\s*করব|ডিপ\s*ফোকাস\s*শুরু|পোমোডোরো\s*চালু)/i;
const PLANNER_ACTION_REGEX = /(?:\b(add\s+(.*)\s+(to\s+my\s+planner|in\s+planner|tomorrow|today|on\s+.*)|schedule\s+(.*)|add\s+these\s+tasks|schedule\s+task)\b|প্ল্যানারে\s+(.*)\s+যোগ|রুটিনে\s+(.*)\s+যোগ)/i;
const TASK_DELETE_REGEX = /(?:\b(?:delete\s*task|remove\s*task|cancel\s*task|delete\s*these\s*tasks)\b|টাস্ক\s*(?:মুছে\s*ফেলো|ডিলিট\s*করো|বাদ\s*দাও)|কাজটি\s*(?:মুছে\s*ফেলো|ডিলিট\s*করো)|টাস্ক\s*ডিলিট)/i;
const NOTES_ACTION_REGEX = /(?:\b(?:add\s*note|save\s*note|create\s*note|write\s*note|delete\s*note|remove\s*note)\b|নোট\s*(?:সেভ|সংরক্ষণ|যুক্ত|তৈরি|লিখব|মুছে\s*ফেলো|ডিলিট\s*করো))/i;
const DIARY_ACTION_REGEX = /(?:\b(want\s*to\s*write\s*a\s*diary|create\s*a\s*diary|make\s*a\s*diary\s*folder|my\s*mood\s*is\s*bad\s*today)\b|ডায়েরি\s*লিখতে\s*চাই|ডায়েরি\s*তৈরি\s*করো|ডায়েরি\s*ফোল্ডার|ডায়েরিতে\s*লিখব)/i;
const TIMELOG_ACTION_REGEX = /(?:\b(want\s*to\s*learn\s*(?:java|python|c\+\+|javascript|react|physics|math|biology|chemistry|english)|track\s*hours\s*for|add\s+to\s+time\s*log)\b|টাইম\s*লগে\s*যোগ|টাইম\s*লগে\s*রাখব|জাভা\s*শিখব|জাভা\s*শিখতে\s*চাই|পাইথন\s*শিখব|পাইথন\s*শিখতে\s*চাই)/i;
const TEACH_REQUEST_REGEX = /(?:\b(?:teach\s*me|explain\s*(?:this|that|quantum|calculus|oop|newton)|solve\s*this|solve\s*my\s*math|shikhao\s*amake|bujhiye\s*dao)\b|আমাকে\s*শেখাও|আমাকে\s*বুঝিয়ে\s*দাও|সমাধান\s*করে\s*দাও)/i;
const STATS_PROGRESS_REGEX = /(?:\b(?:how\s*much\s*did\s*i\s*focus\s*today|how\s*many\s*tasks\s*left|today(?:'s|\s+)\s*stats|my\s*streak|ajke\s*koto\s*shomoy|dashboard|performance|my\s*performance|study\s*stats)\b|আজকে\s*কতক্ষণ\s*পড়েছি|কয়টা\s*কাজ\s*বাকি|আজকের\s*পরিসংখ্যান|ড্যাশবোর্ড|পারফরম্যান্স|আমার\s*পারফরম্যান্স|আজকের\s*পারফরম্যান্স)/i;

// 5. App Help Questions
const APP_HELP_REGEX = /(?:\b(?:how\s*to\s*start\s*a\s*focus\s*session|how\s*routines\s*work|how\s*does\s*planner\s*work|is\s*diary\s*private|what\s*does\s*the\s*orb\s*do)\b|ফোকাস\s*সেশন\s*কীভাবে\s*চালায়|রুটিন\s*কীভাবে\s*কাজ\s*করে|ডায়েরি\s*কি\s*প্রাইভেট|অর্ব\s*কী\s*করে)/i;

// 6. Time Log Topics & Weak/Important Query Patterns (Strictly topics, never plain problem statements)
const TIMELOG_TOPIC_QUERY_REGEX = /(?:\b(?:(?:important|weak|learning|study)\s*(?:topics?|problems?|issues?|blockers?)|what\s*(?:are|were)\s*my\s*(?:important|weak)\s*topics|topics?\s*in\s*time\s*log|time\s*log\s*topics?)\b|ইম্পর্টেন্ট\s*টপিক|উইক\s*টপিক|দুর্বল\s*টপিক|গুরুত্বপূর্ণ\s*টপিক|টাইম\s*লগের\s*টপিক|পড়ার\s*টপিক)/i;

// 7. Planner Schedule & Routine Query Patterns for Dates
const PLANNER_DATE_QUERY_REGEX = /(?:\b(what\s*(is|was)\s*my\s*(routine|schedule|task|plan)|routine\s*on|schedule\s*on|tasks\s*on|what\s*did\s*i\s*have\s*on)\b|রুটিন\s*ছিল|কী\s*রুটিন|কি\s*রুটিন|টাস্ক\s*ছিল|কী\s*টাস্ক|কি\s*টাস্ক|কী\s*কী\s*কাজ|শিডিউল\s*ছিল|কী\s*শিডিউল|কি\s*শিডিউল|কী\s*প্ল্যান|কি\s*প্ল্যান|কাজের\s*তালিকা|(?:\d{1,2}|[০-৯]{1,2})\s*তারিখ[এের]*\s*(?:কী|কি|কেমন|রুটিন|কাজ|টাস্ক|ছিল|আছে)|রুটিন\s*(?:বলো|দেখাও|কী|কি|ছিল|আছে))/i;

// 8. Big Task / Roadmap Patterns (Gemini Allowed)
const ROADMAP_REGEX = /\b(roadmap|complete\s*(.*)\s*roadmap|30\s*day\s*plan|study\s*timetable\s*generation|goal\s*breakdown|রোডম্যাপ|৩০\s*দিনের\s*প্ল্যান|লার্নিং\s*রোডম্যাপ)\b/i;

export function classifyIntent(norm: NormalizedInput): ClassifiedIntent {
  const text = norm.clean;

  // 1. Check big tasks (Gemini allowed)
  if (ROADMAP_REGEX.test(text)) {
    return {
      intent: 'BIG_TASK_ROADMAP',
      confidence: 0.95,
      isBigTask: true,
    };
  }

  // 2. Direct Feature Navigation (Highest priority when user requests a feature/option/button)
  if (NAV_MIND_REGEX.test(text)) {
    return { intent: 'NAVIGATION_MIND', confidence: 0.98, isBigTask: false };
  }
  if (NAV_FOCUS_REGEX.test(text)) {
    return { intent: 'NAVIGATION_FOCUS', confidence: 0.98, isBigTask: false };
  }
  if (NAV_PLANNER_REGEX.test(text)) {
    return { intent: 'NAVIGATION_PLANNER', confidence: 0.98, isBigTask: false };
  }
  if (NAV_DIARY_REGEX.test(text)) {
    return { intent: 'NAVIGATION_DIARY', confidence: 0.98, isBigTask: false };
  }
  if (NAV_NOTES_REGEX.test(text)) {
    return { intent: 'NAVIGATION_NOTES', confidence: 0.98, isBigTask: false };
  }
  if (NAV_LEARNING_REGEX.test(text)) {
    return { intent: 'NAVIGATION_LEARNING', confidence: 0.98, isBigTask: false };
  }
  if (NAV_DASHBOARD_REGEX.test(text)) {
    return { intent: 'NAVIGATION_DASHBOARD', confidence: 0.98, isBigTask: false };
  }

  // 3. Productivity Queries & Actions
  if (TIMELOG_TOPIC_QUERY_REGEX.test(text)) {
    return { intent: 'TIMELOG_TOPIC_QUERY', confidence: 0.96, isBigTask: false };
  }
  if (PLANNER_DATE_QUERY_REGEX.test(text)) {
    return { intent: 'PLANNER_DATE_QUERY', confidence: 0.96, isBigTask: false };
  }
  if (TASK_DELETE_REGEX.test(text)) {
    return { intent: 'TASK_DELETE', confidence: 0.95, isBigTask: false };
  }
  if (NOTES_ACTION_REGEX.test(text)) {
    return { intent: 'NOTES_ACTION', confidence: 0.95, isBigTask: false };
  }
  if (PLANNER_ACTION_REGEX.test(text)) {
    return { intent: 'PLANNER_ACTION', confidence: 0.92, isBigTask: false };
  }
  if (DIARY_ACTION_REGEX.test(text)) {
    return { intent: 'DIARY_ACTION', confidence: 0.92, isBigTask: false };
  }
  if (FOCUS_SESSION_ACTION_REGEX.test(text)) {
    return { intent: 'FOCUS_SESSION_ACTION', confidence: 0.95, isBigTask: false };
  }
  if (TIMER_ACTION_REGEX.test(text)) {
    return { intent: 'TIMER_ACTION', confidence: 0.95, isBigTask: false };
  }
  if (TIMELOG_ACTION_REGEX.test(text)) {
    return { intent: 'TIMELOG_ACTION', confidence: 0.90, isBigTask: false };
  }
  if (TEACH_REQUEST_REGEX.test(text)) {
    return { intent: 'LEARNING_TEACH_REQUEST', confidence: 0.92, isBigTask: false };
  }
  if (STATS_PROGRESS_REGEX.test(text)) {
    return { intent: 'STATS_PROGRESS', confidence: 0.90, isBigTask: false };
  }

  // 3. Navigation & Settings
  if (NAV_FOCUS_REGEX.test(text)) {
    return { intent: 'NAVIGATION_FOCUS', confidence: 0.95, isBigTask: false };
  }
  if (NAV_PLANNER_REGEX.test(text)) {
    return { intent: 'NAVIGATION_PLANNER', confidence: 0.95, isBigTask: false };
  }
  if (NAV_DIARY_REGEX.test(text)) {
    return { intent: 'NAVIGATION_DIARY', confidence: 0.95, isBigTask: false };
  }
  if (NAV_NOTES_REGEX.test(text)) {
    return { intent: 'NAVIGATION_NOTES', confidence: 0.95, isBigTask: false };
  }
  if (NAV_MIND_REGEX.test(text)) {
    return { intent: 'NAVIGATION_MIND', confidence: 0.95, isBigTask: false };
  }
  if (NAV_LEARNING_REGEX.test(text)) {
    return { intent: 'NAVIGATION_LEARNING', confidence: 0.95, isBigTask: false };
  }
  if (NAV_DASHBOARD_REGEX.test(text)) {
    return { intent: 'NAVIGATION_DASHBOARD', confidence: 0.95, isBigTask: false };
  }
  if (NAV_SETTINGS_REGEX.test(text)) {
    return { intent: 'NAVIGATION_SETTINGS', confidence: 0.95, isBigTask: false };
  }
  if (APP_HELP_REGEX.test(text)) {
    return { intent: 'APP_HELP', confidence: 0.92, isBigTask: false };
  }
  if (SETTINGS_LANG_REGEX.test(text)) {
    return { intent: 'SETTINGS_LANGUAGE', confidence: 0.95, isBigTask: false };
  }
  if (SETTINGS_THEME_REGEX.test(text)) {
    return { intent: 'SETTINGS_THEME', confidence: 0.95, isBigTask: false };
  }
  if (SETTINGS_PASS_REGEX.test(text)) {
    return { intent: 'SETTINGS_PASSWORD', confidence: 0.95, isBigTask: false };
  }
  if (SETTINGS_NOTIF_REGEX.test(text)) {
    return { intent: 'SETTINGS_NOTIFICATIONS', confidence: 0.95, isBigTask: false };
  }
  if (SETTINGS_DELETE_REGEX.test(text)) {
    return { intent: 'SETTINGS_DELETE_ACCOUNT', confidence: 0.95, isBigTask: false };
  }
  if (SETTINGS_SUPPORT_REGEX.test(text)) {
    return { intent: 'SETTINGS_SUPPORT', confidence: 0.95, isBigTask: false };
  }

  // 4. Emotional Support & Motivation
  if (EXAM_FEAR_REGEX.test(text)) {
    return { intent: 'EXAM_FEAR', confidence: 0.92, isBigTask: false };
  }
  if (LONELINESS_REGEX.test(text)) {
    return { intent: 'LONELINESS_SADNESS', confidence: 0.92, isBigTask: false };
  }
  if (PROCRASTINATION_REGEX.test(text)) {
    return { intent: 'PROCRASTINATION_LAZINESS', confidence: 0.92, isBigTask: false };
  }
  if (CELEBRATING_REGEX.test(text)) {
    return { intent: 'CELEBRATING_PROGRESS', confidence: 0.90, isBigTask: false };
  }

  // 5. Social & Conversational Intents
  if (USER_CORRECTION_REGEX.test(text)) {
    return { intent: 'USER_CORRECTION', confidence: 0.96, isBigTask: false };
  }
  if (WHO_ARE_YOU_REGEX.test(text)) {
    return { intent: 'WHO_ARE_YOU', confidence: 0.95, isBigTask: false };
  }
  if (WHAT_CAN_YOU_DO_REGEX.test(text)) {
    return { intent: 'WHAT_CAN_YOU_DO', confidence: 0.95, isBigTask: false };
  }
  if (JOKES_REGEX.test(text)) {
    return { intent: 'JOKES_AND_FUN', confidence: 0.95, isBigTask: false };
  }
  if (COMPLIMENT_REGEX.test(text)) {
    return { intent: 'COMPLIMENTS', confidence: 0.92, isBigTask: false };
  }
  if (FEELINGS_AGE_REGEX.test(text)) {
    return { intent: 'FEELINGS_AND_AGE', confidence: 0.90, isBigTask: false };
  }
  if (BORED_TIRED_REGEX.test(text)) {
    return { intent: 'BORED_OR_TIRED', confidence: 0.92, isBigTask: false };
  }
  if (GOOD_NIGHT_REGEX.test(text)) {
    return { intent: 'GOOD_NIGHT', confidence: 0.95, isBigTask: false };
  }
  if (LOVE_YOU_REGEX.test(text)) {
    return { intent: 'LOVE_YOU', confidence: 0.95, isBigTask: false };
  }
  if (FAREWELL_REGEX.test(text)) {
    return { intent: 'FAREWELL', confidence: 0.95, isBigTask: false };
  }
  if (ACK_REGEX.test(text)) {
    return { intent: 'ACKNOWLEDGEMENT', confidence: 0.95, isBigTask: false };
  }
  if (HOW_ARE_YOU_REGEX.test(text)) {
    return { intent: 'HOW_ARE_YOU', confidence: 0.98, isBigTask: false };
  }
  if (GREETING_REGEX.test(text)) {
    return { intent: 'GREETING', confidence: 0.98, isBigTask: false };
  }

  // Fallback to Gemini
  return {
    intent: 'UNKNOWN',
    confidence: 0.2,
    isBigTask: false,
  };
}
