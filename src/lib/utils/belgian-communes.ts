// Base de données des communes belges + fuzzy matching
// Utilisé pour corriger les adresses mal transcrites par l'agent vocal ElevenLabs

export interface BelgianCommune {
  name: string;        // Nom officiel (forme la plus courante)
  postalCode: string;  // Code postal principal
  aliases: string[];   // Variantes courantes, erreurs de transcription vocale
}

// =============================================================================
// COMMUNES BELGES — Bruxelles (19 communes) + villes majeures + périphérie
// =============================================================================

export const BELGIAN_COMMUNES: BelgianCommune[] = [
  // ── Bruxelles-Capitale (19 communes) ──────────────────────────────────────

  {
    name: "Bruxelles",
    postalCode: "1000",
    aliases: [
      "Brussel", "Brussels", "Bruxelle", "Brüssel", "Bruselas",
      "Bruxeles", "Brucelles", "Bruksels", "Centre Bruxelles",
    ],
  },
  {
    name: "Laeken",
    postalCode: "1020",
    aliases: [
      "Laken", "Lakin", "Lakken", "Laequen", "Laekin",
    ],
  },
  {
    name: "Schaerbeek",
    postalCode: "1030",
    aliases: [
      "Schaarbeek", "Cherchebek", "Scharbek", "Schaerbeck",
      "Schaerbeeck", "Scharbeek", "Scharbeck", "Scherbeek",
      "Charbek", "Schaarbek", "Scarbek", "Scharbik",
    ],
  },
  {
    name: "Etterbeek",
    postalCode: "1040",
    aliases: [
      "Etterbek", "Eterbeek", "Eterbek", "Etterbeck",
      "Eterbeeck", "Etterbik",
    ],
  },
  {
    name: "Ixelles",
    postalCode: "1050",
    aliases: [
      "Elsene", "Ixelle", "Ixel", "Ixells", "Ixele",
      "Ixèles", "Ixels", "Ixell",
    ],
  },
  {
    name: "Saint-Gilles",
    postalCode: "1060",
    aliases: [
      "Sint-Gillis", "Saint Gilles", "St-Gilles", "St Gilles",
      "Sint Gillis", "San Gilles", "Saint Gille", "Saintgilles",
      "St-Gill", "Saint-Gill",
    ],
  },
  {
    name: "Anderlecht",
    postalCode: "1070",
    aliases: [
      "Anderlech", "Anderleght", "Anderlegt", "Anderlek",
      "Anderlet", "Anderlect",
    ],
  },
  {
    name: "Molenbeek-Saint-Jean",
    postalCode: "1080",
    aliases: [
      "Sint-Jans-Molenbeek", "Molenbeek", "Molenbeeck",
      "Molembeek", "Molenbeek Saint Jean", "Molenbeek-St-Jean",
      "Molenbeek St Jean", "Molenbek", "Molembeeck",
      "Sint Jans Molenbeek", "Molenbeik",
    ],
  },
  {
    name: "Koekelberg",
    postalCode: "1081",
    aliases: [
      "Cookelberg", "Kookelberg", "Kokelberg", "Coukelberg",
      "Kukelberg", "Koekelberk", "Cookelburgh", "Koekelbergh",
      "Kukkelberg", "Cokelberg",
    ],
  },
  {
    name: "Berchem-Sainte-Agathe",
    postalCode: "1082",
    aliases: [
      "Sint-Agatha-Berchem", "Berchem Sainte Agathe",
      "Berchem-Ste-Agathe", "Berchem Ste Agathe",
      "Sint Agatha Berchem", "Berchem", "Berkem",
      "Berchem Saint Agathe",
    ],
  },
  {
    name: "Ganshoren",
    postalCode: "1083",
    aliases: [
      "Ganshooren", "Ganshoran", "Gansoren", "Ganshorne",
      "Ganshorn", "Ganshorrn",
    ],
  },
  {
    name: "Jette",
    postalCode: "1090",
    aliases: [
      "Jet", "Jete", "Jett", "Jètte", "Gette",
    ],
  },
  {
    name: "Evere",
    postalCode: "1140",
    aliases: [
      "Éveré", "Evère", "Eveer", "Everre", "Everé", "Evéré",
    ],
  },
  {
    name: "Woluwe-Saint-Pierre",
    postalCode: "1150",
    aliases: [
      "Sint-Pieters-Woluwe", "Woluwe Saint Pierre",
      "Woluwe-St-Pierre", "Woluwe St Pierre",
      "Woluwé Saint Pierre", "Sint Pieters Woluwe",
      "Woluwe", "Woluwé",
    ],
  },
  {
    name: "Auderghem",
    postalCode: "1160",
    aliases: [
      "Oudergem", "Auderguem", "Audergem", "Audergème",
      "Audergham", "Ouderguem", "Auderghen",
    ],
  },
  {
    name: "Watermael-Boitsfort",
    postalCode: "1170",
    aliases: [
      "Watermaal-Bosvoorde", "Watermael Boitsfort",
      "Watermael", "Boitsfort", "Watermaal Bosvoorde",
      "Watermal Boitsfort", "Watermaal", "Bosvoorde",
      "Watermal", "Watermaël-Boitsfort",
    ],
  },
  {
    name: "Uccle",
    postalCode: "1180",
    aliases: [
      "Ukkel", "Ukel", "Uccles", "Ucle", "Ukle",
      "Ücle", "Ukkel",
    ],
  },
  {
    name: "Forest",
    postalCode: "1190",
    aliases: [
      "Vorst", "Foret", "Forêt", "Forrest", "Forèst",
    ],
  },
  {
    name: "Woluwe-Saint-Lambert",
    postalCode: "1200",
    aliases: [
      "Sint-Lambrechts-Woluwe", "Woluwe Saint Lambert",
      "Woluwe-St-Lambert", "Woluwe St Lambert",
      "Sint Lambrechts Woluwe", "Woluwé Saint Lambert",
      "Woluwé-Saint-Lambert",
    ],
  },
  {
    name: "Saint-Josse-ten-Noode",
    postalCode: "1210",
    aliases: [
      "Sint-Joost-ten-Node", "Saint Josse ten Noode",
      "Saint-Josse", "St-Josse", "St Josse",
      "Sint Joost ten Node", "Saint Josse",
      "Saintjosse", "St-Josse-ten-Noode",
    ],
  },

  // ── Périphérie bruxelloise ────────────────────────────────────────────────

  {
    name: "Waterloo",
    postalCode: "1410",
    aliases: ["Waterlot", "Waterlo", "Waterleau", "Waterloow"],
  },
  {
    name: "Wavre",
    postalCode: "1300",
    aliases: ["Waver", "Wavres", "Wavr", "Wavré"],
  },
  {
    name: "Nivelles",
    postalCode: "1400",
    aliases: ["Nijvel", "Nivelle", "Niveau", "Nivell"],
  },
  {
    name: "Ottignies-Louvain-la-Neuve",
    postalCode: "1340",
    aliases: [
      "Ottignies", "Louvain-la-Neuve", "Louvain la Neuve",
      "Ottigny", "LLN", "Ottignie",
    ],
  },
  {
    name: "Braine-l'Alleud",
    postalCode: "1420",
    aliases: [
      "Eigenbrakel", "Braine l'Alleud", "Braine lAlleud",
      "Braine Alleud", "Brainlalleud",
    ],
  },
  {
    name: "Tubize",
    postalCode: "1480",
    aliases: ["Tubeke", "Tubise", "Tubiz"],
  },
  {
    name: "Vilvoorde",
    postalCode: "1800",
    aliases: ["Vilvorde", "Vilvoord", "Vilvord"],
  },
  {
    name: "Grimbergen",
    postalCode: "1850",
    aliases: ["Grimberguen", "Grimbèrgen", "Grimbergen"],
  },
  {
    name: "Zaventem",
    postalCode: "1930",
    aliases: ["Saventhem", "Zaventhem", "Zaventhème", "Zaventen"],
  },
  {
    name: "Tervuren",
    postalCode: "3080",
    aliases: ["Tervueren", "Tervure", "Terveuren"],
  },
  {
    name: "Overijse",
    postalCode: "3090",
    aliases: ["Overise", "Over-Ijse", "Overijze"],
  },
  {
    name: "Halle",
    postalCode: "1500",
    aliases: ["Hal", "Hall"],
  },
  {
    name: "Kraainem",
    postalCode: "1950",
    aliases: ["Crainem", "Crainhem", "Krainem", "Kraainhem"],
  },
  {
    name: "Wezembeek-Oppem",
    postalCode: "1970",
    aliases: ["Wezembeek Oppem", "Wesembeek", "Wezembeeck"],
  },
  {
    name: "Rhode-Saint-Genèse",
    postalCode: "1640",
    aliases: [
      "Sint-Genesius-Rode", "Rhode Saint Genèse",
      "Rhode-St-Genèse", "Rode", "Rhode Saint Genese",
    ],
  },
  {
    name: "Linkebeek",
    postalCode: "1630",
    aliases: ["Linkebeeck", "Linkebek"],
  },
  {
    name: "Drogenbos",
    postalCode: "1620",
    aliases: ["Drogen-Bos", "Drogenboss"],
  },
  {
    name: "Wemmel",
    postalCode: "1780",
    aliases: ["Wemel", "Wemèl"],
  },

  // ── Grandes villes flamandes ──────────────────────────────────────────────

  {
    name: "Antwerpen",
    postalCode: "2000",
    aliases: [
      "Anvers", "Antwèrpen", "Antwerp", "Antwerpe",
      "Anverse", "Anvèrs",
    ],
  },
  {
    name: "Gent",
    postalCode: "9000",
    aliases: [
      "Gand", "Gante", "Ghent", "Guènt", "Gaan",
    ],
  },
  {
    name: "Brugge",
    postalCode: "8000",
    aliases: [
      "Bruges", "Bruge", "Brugg", "Brüge",
    ],
  },
  {
    name: "Leuven",
    postalCode: "3000",
    aliases: [
      "Louvain", "Loewen", "Leuvèn", "Löwen",
    ],
  },
  {
    name: "Mechelen",
    postalCode: "2800",
    aliases: [
      "Malines", "Mechlen", "Méchelen", "Maline",
    ],
  },
  {
    name: "Hasselt",
    postalCode: "3500",
    aliases: ["Hassèlt", "Haselt", "Hasslet"],
  },
  {
    name: "Kortrijk",
    postalCode: "8500",
    aliases: ["Courtrai", "Courtray", "Kortrik"],
  },
  {
    name: "Aalst",
    postalCode: "9300",
    aliases: ["Alost", "Aalste", "Alost"],
  },
  {
    name: "Ostende",
    postalCode: "8400",
    aliases: ["Oostende", "Ostend", "Osstende"],
  },

  // ── Grandes villes wallonnes ──────────────────────────────────────────────

  {
    name: "Liège",
    postalCode: "4000",
    aliases: [
      "Luik", "Liege", "Lièje", "Lüttich", "Liéje",
      "Liegi", "Lieg", "Lyège",
    ],
  },
  {
    name: "Namur",
    postalCode: "5000",
    aliases: [
      "Namen", "Namure", "Namûr", "Namurr",
    ],
  },
  {
    name: "Charleroi",
    postalCode: "6000",
    aliases: [
      "Charlroi", "Charlerois", "Charleroit", "Chaleroi",
      "Charlerwa", "Charleroie",
    ],
  },
  {
    name: "Mons",
    postalCode: "7000",
    aliases: [
      "Bergen", "Monse", "Monss", "Mons-en-Hainaut",
    ],
  },
  {
    name: "Tournai",
    postalCode: "7500",
    aliases: [
      "Doornik", "Tournais", "Tournaie", "Tourné",
    ],
  },
  {
    name: "Arlon",
    postalCode: "6700",
    aliases: [
      "Aarlen", "Arlone", "Arlon-Ville",
    ],
  },
  {
    name: "Verviers",
    postalCode: "4800",
    aliases: [
      "Vervier", "Vervié", "Vervières",
    ],
  },
  {
    name: "La Louvière",
    postalCode: "7100",
    aliases: [
      "La Louviere", "Lalouivère", "Lallouvière",
      "La Louvierre", "Louvière",
    ],
  },
  {
    name: "Mouscron",
    postalCode: "7700",
    aliases: [
      "Moeskroen", "Mouscrone", "Mouschron",
    ],
  },
  {
    name: "Spa",
    postalCode: "4900",
    aliases: ["Spaa", "Spaah"],
  },
];

// =============================================================================
// ALGORITHME DE FUZZY MATCHING
// =============================================================================

/**
 * Normalise une chaîne : minuscules, sans accents, sans tirets/espaces superflus
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[-'']/g, "")            // Supprime tirets et apostrophes
    .replace(/\s+/g, "")             // Supprime les espaces
    .trim();
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 * Implémentation inline (pas de dépendance externe).
 */
function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;

  // Cas triviaux
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Matrice de distances (optimisée en 2 lignes)
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // suppression
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

/**
 * Calcule un score de similarité entre 0 et 1 (1 = identique)
 */
function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  // Match exact après normalisation → score parfait
  if (na === nb) return 1;

  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;

  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

// Seuil minimum de confiance (70%)
const MIN_CONFIDENCE = 0.7;

/**
 * Trouve la commune belge la plus proche d'un texte donné.
 * Utilise un fuzzy match (Levenshtein distance) sur le nom + aliases.
 * Retourne null si aucun match > 70% de similarité.
 */
export function matchCommune(
  input: string
): { name: string; postalCode: string; confidence: number } | null {
  if (!input || input.trim() === "") return null;

  let bestMatch: { name: string; postalCode: string; confidence: number } | null = null;
  let bestScore = 0;

  for (const commune of BELGIAN_COMMUNES) {
    // Comparer avec le nom officiel
    const nameScore = similarity(input, commune.name);
    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestMatch = {
        name: commune.name,
        postalCode: commune.postalCode,
        confidence: nameScore,
      };
    }

    // Comparer avec chaque alias
    for (const alias of commune.aliases) {
      const aliasScore = similarity(input, alias);
      if (aliasScore > bestScore) {
        bestScore = aliasScore;
        bestMatch = {
          name: commune.name,
          postalCode: commune.postalCode,
          confidence: aliasScore,
        };
      }
    }
  }

  // Ne retourner que si la confiance dépasse le seuil
  if (bestMatch && bestMatch.confidence >= MIN_CONFIDENCE) {
    return bestMatch;
  }

  return null;
}

/**
 * Cherche une commune par code postal exact.
 * Retourne le nom officiel ou null.
 */
export function findByPostalCode(
  postalCode: string
): BelgianCommune | null {
  return BELGIAN_COMMUNES.find((c) => c.postalCode === postalCode) || null;
}

// =============================================================================
// CORRECTION D'ADRESSE
// =============================================================================

/**
 * Corrige et complète une adresse belge.
 * - Fuzzy match sur la commune
 * - Ajoute/corrige le code postal si trouvé
 * Retourne l'adresse corrigée ou l'originale si pas de match.
 */
export function correctAddress(address: string): {
  corrected: string;
  commune: string | null;
  postalCode: string | null;
  wasFixed: boolean;
} {
  if (!address || address.trim() === "") {
    return { corrected: address, commune: null, postalCode: null, wasFixed: false };
  }

  const original = address.trim();

  // Extraire un éventuel code postal (4 chiffres commençant par 1-9)
  const postalMatch = original.match(/\b([1-9]\d{3})\b/);
  const extractedPostal = postalMatch ? postalMatch[1] : null;

  // Extraire le nom de commune :
  // - Si code postal trouvé, prendre tout ce qui suit le code postal
  // - Sinon, prendre le(s) dernier(s) mot(s) de l'adresse
  let communeCandidate: string;
  let addressPrefix: string; // Partie avant la commune (rue, numéro, etc.)

  if (postalMatch && postalMatch.index !== undefined) {
    const afterPostal = original
      .slice(postalMatch.index + postalMatch[0].length)
      .trim();

    if (afterPostal.length > 0) {
      communeCandidate = afterPostal;
      addressPrefix = original.slice(0, postalMatch.index).trim();
    } else {
      // Le code postal est à la fin → commune avant le code postal
      const beforePostal = original.slice(0, postalMatch.index).trim();
      // Prendre les derniers mots (2-3 mots pour les noms composés)
      const words = beforePostal.split(/\s+/);
      if (words.length <= 3) {
        communeCandidate = beforePostal;
        addressPrefix = "";
      } else {
        // Essayer les 3 derniers mots, puis 2, puis 1
        communeCandidate = words.slice(-3).join(" ");
        addressPrefix = words.slice(0, -3).join(" ");
      }
    }
  } else {
    // Pas de code postal → essayer les derniers mots comme commune
    const words = original.split(/\s+/);
    if (words.length <= 2) {
      communeCandidate = original;
      addressPrefix = "";
    } else {
      // Essayer les 3 derniers mots d'abord
      communeCandidate = words.slice(-3).join(" ");
      addressPrefix = words.slice(0, -3).join(" ");
    }
  }

  // Tentative de match avec différentes longueurs de candidats
  let match = matchCommune(communeCandidate);

  // Si pas de match avec 3 mots, essayer 2 puis 1
  if (!match && communeCandidate.split(/\s+/).length > 2) {
    const words = original.split(/\s+/);
    const twoWords = words.slice(-2).join(" ");
    match = matchCommune(twoWords);
    if (match) {
      communeCandidate = twoWords;
      addressPrefix = words.slice(0, -2).join(" ");
    }
  }

  if (!match && communeCandidate.split(/\s+/).length > 1) {
    const words = original.split(/\s+/);
    const oneWord = words[words.length - 1];
    match = matchCommune(oneWord);
    if (match) {
      communeCandidate = oneWord;
      addressPrefix = words.slice(0, -1).join(" ");
    }
  }

  // Aussi essayer match par code postal si on n'a pas trouvé par nom
  if (!match && extractedPostal) {
    const byPostal = findByPostalCode(extractedPostal);
    if (byPostal) {
      match = {
        name: byPostal.name,
        postalCode: byPostal.postalCode,
        confidence: 1,
      };
    }
  }

  // Aucun match → retourner l'original
  if (!match) {
    return {
      corrected: original,
      commune: null,
      postalCode: extractedPostal,
      wasFixed: false,
    };
  }

  // Reconstruire l'adresse corrigée
  let wasFixed = false;

  // Vérifier si la commune a été corrigée
  const normalizedCandidate = normalize(communeCandidate);
  const normalizedMatch = normalize(match.name);
  const communeWasCorrected = normalizedCandidate !== normalizedMatch;

  // Vérifier si le code postal a été corrigé/ajouté
  const postalWasCorrected =
    extractedPostal !== match.postalCode || !extractedPostal;

  wasFixed = communeWasCorrected || postalWasCorrected;

  if (!wasFixed) {
    return {
      corrected: original,
      commune: match.name,
      postalCode: match.postalCode,
      wasFixed: false,
    };
  }

  // Reconstruire l'adresse
  // Retirer l'ancien code postal et l'ancienne commune du prefix
  let cleanPrefix = addressPrefix;
  if (extractedPostal) {
    // Retirer le code postal du prefix s'il y est
    cleanPrefix = cleanPrefix.replace(new RegExp(`\\b${extractedPostal}\\b`), "").trim();
  }

  // Construire la nouvelle adresse
  const parts = [cleanPrefix, match.postalCode, match.name].filter(
    (p) => p && p.trim() !== ""
  );
  const corrected = parts.join(" ").replace(/\s+/g, " ").trim();

  return {
    corrected,
    commune: match.name,
    postalCode: match.postalCode,
    wasFixed,
  };
}
