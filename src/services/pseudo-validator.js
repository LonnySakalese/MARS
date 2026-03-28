/**
 * pseudo-validator.js — Filtre anti-toxicité pour les pseudos
 * Deny-list FR/EN + analyse de format + sentiment
 */

// ============================================
// DENY LIST — Mots interdits (FR + EN)
// ============================================
const DENY_LIST = [
  // Insultes FR
  "pute",
  "putain",
  "salope",
  "connard",
  "connasse",
  "enculé",
  "enculer",
  "batard",
  "bâtard",
  "fdp",
  "ntm",
  "nique",
  "niquer",
  "merde",
  "bordel",
  "pd",
  "tapette",
  "gouine",
  "triso",
  "mongol",
  "débile",
  "attardé",
  "retardé",
  "abruti",
  "crétin",
  "idiot",
  "fils de",
  "ta mere",
  "ta mère",
  "tg",
  "ftg",
  "stfu",
  // Insultes EN
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "dick",
  "pussy",
  "cunt",
  "whore",
  "slut",
  "bastard",
  "retard",
  "faggot",
  "fag",
  "nigger",
  "nigga",
  "negro",
  // Violence
  "tueur",
  "killer",
  "murder",
  "tuer",
  "mourir",
  "suicide",
  "suicid",
  "vengeance",
  "revenge",
  "destroy",
  "détruire",
  "destruire",
  "lame",
  "blade",
  "gun",
  "fusil",
  "bombe",
  "bomb",
  "terroris",
  "viol",
  "rape",
  "blood",
  "sang",
  "death",
  "mort",
  "die",
  "crever",
  // Extrémisme
  "nazi",
  "hitler",
  "fascis",
  "racis",
  "jihad",
  "isis",
  "heil",
  "supremac",
  "kkk",
  "skinhead",
  // Sexuel
  "porn",
  "xxx",
  "sex",
  "bite",
  "couille",
  "penis",
  "vagin",
  "orgasm",
  "fetish",
  "hentai",
  "milf",
  // Négatif profond
  "echectotal",
  "failur",
  "worthless",
  "useless",
  "inutile",
  "jedéteste",
  "jehais",
  "ihate",
  "nolife",
  "loser",
  // Usurpation
  "admin",
  "moderateur",
  "moderator",
  "modo",
  "staff",
  "support",
  "system",
  "bot",
];

// Patterns regex pour détecter les contournements (l33t speak, espaces, etc.)
const DENY_PATTERNS = [
  /n[i1!|]+[g9]+[e3]*[r]+/i, // n-word variations
  /f+[u\*]+c+k+/i, // f-word variations
  /s+h+[i1!]+t+/i, // s-word variations
  /b+[i1!]+t+c+h+/i, // b-word variations
  /p+u+t+[e3]+/i, // pute variations
  /[s$]+[a@]+l+[o0]+p+[e3]*/i, // salope variations
];

/**
 * Valide un pseudo
 * @param {string} pseudo
 * @returns {{ is_valid: boolean, reason: string|null, suggested_alternatives: string[] }}
 */
export function validatePseudo(pseudo) {
  if (!pseudo || typeof pseudo !== "string") {
    return {
      is_valid: false,
      reason: "Le pseudo ne peut pas être vide",
      suggested_alternatives: [],
    };
  }

  const trimmed = pseudo.trim();

  // === FORMAT ===
  if (trimmed.length < 2) {
    return {
      is_valid: false,
      reason: "Le pseudo doit faire au moins 2 caractères",
      suggested_alternatives: [],
    };
  }

  if (trimmed.length > 20) {
    return {
      is_valid: false,
      reason: "Le pseudo ne peut pas dépasser 20 caractères",
      suggested_alternatives: [trimmed.substring(0, 20)],
    };
  }

  // Alphanumérique + underscores + tirets + espaces
  if (!/^[a-zA-Z0-9À-ÿ _\-\.]+$/.test(trimmed)) {
    return {
      is_valid: false,
      reason:
        "Caractères spéciaux non autorisés. Utilise des lettres, chiffres, espaces ou tirets",
      suggested_alternatives: [trimmed.replace(/[^a-zA-Z0-9À-ÿ _\-\.]/g, "")],
    };
  }

  // === DENY LIST ===
  const lower = trimmed.toLowerCase().replace(/[\s_\-\.]/g, "");

  for (const word of DENY_LIST) {
    if (lower.includes(word.replace(/\s/g, ""))) {
      return {
        is_valid: false,
        reason: "Ce pseudo n'est pas appropriée",
        suggested_alternatives: [],
      };
    }
  }

  // === DENY PATTERNS (l33t speak) ===
  for (const pattern of DENY_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        is_valid: false,
        reason: "Ce pseudo n'est pas appropriée",
        suggested_alternatives: [],
      };
    }
  }

  // === SENTIMENT (négatif profond) ===
  const negativePatterns = [
    /je\s*v[ae]i?s?\s*(te|vous|tout)\s*(détruire|tuer|buter|niquer)/i,
    /i\s*(will|wanna)\s*(kill|destroy|hurt)/i,
    /hate\s*(my|your|every)/i,
    /je\s*(me\s*)?déteste/i,
    /je\s*suis\s*(nul|inutile|un\s*échec)/i,
  ];

  for (const pattern of negativePatterns) {
    if (pattern.test(trimmed)) {
      return {
        is_valid: false,
        reason: "Ce pseudo n'est pas appropriée",
        suggested_alternatives: [],
      };
    }
  }

  // === TOUT EST BON ===
  return {
    is_valid: true,
    reason: null,
    suggested_alternatives: [],
  };
}
