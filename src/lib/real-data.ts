// Real CSV data loaders. The two source files use a peculiar wrapping where
// each data row is itself wrapped in quotes (with internal " doubled to "")
// and may have trailing `;` padding. We parse them into typed records.

import gsRaw from "@/data/greenspace.csv?raw";
import inatRaw from "@/data/inaturalist.csv?raw";
import {
  BIO_CATEGORIES,
  STADT_TYPES,
  type BioCategory,
  type BioPoint,
  type StadtPoint,
  type StadtType,
} from "./mock-data";

// ---- tiny CSV row parser (handles quoted fields, escaped "") ----
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else cur += ch;
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQ = true;
      } else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseWrappedCsv(raw: string): { header: string[]; rows: string[][] } {
  const lines = raw.split(/\r?\n/);
  const header = lines[0].split(",");
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    if (!line || !line.trim()) continue;
    line = line.replace(/;+$/g, "");
    if (line.startsWith('"') && line.endsWith('"')) {
      const inner = line.slice(1, -1).replace(/""/g, '"');
      rows.push(parseCsvLine(inner));
    } else {
      rows.push(parseCsvLine(line));
    }
  }
  return { header, rows };
}

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// ---- Stadt: Greenspace Hack ----
let _stadt: StadtPoint[] | null = null;
let _stadtTowns: { id: string; name: string; lat: number; lon: number }[] | null = null;

const TYPE_NORMALIZE: Record<string, StadtType> = {
  "Marine/ coastal": "Marine/coastal",
  "River/stream/canal (linear)": "River/stream/canal",
};

function loadStadt() {
  if (_stadt) return { points: _stadt, towns: _stadtTowns! };
  const { header, rows } = parseWrappedCsv(gsRaw);
  const idx = (k: string) => header.indexOf(k);
  const iLat = idx("location.1");
  const iLon = idx("location.0");
  const iScore = idx("Overall NEST score");
  const iType = idx("gstypology");
  const iTown = idx("town");
  const iName = idx("name");
  // Map sub-scores to our existing five fields (all 0–100).
  const iAC = idx("AC_WT"); // access → "fountains" (paths/entry)
  const iAM = idx("AM_WT"); // amenities → "drinking"
  const iNA = idx("NA_WT"); // natural area → "biodiversity"
  const iNN = idx("NN_WT"); // natural notable → "shade"
  const iUS = idx("US_WT"); // usability → "greenCare"

  const pts: StadtPoint[] = [];
  const towns = new Map<string, { lat: number; lon: number; n: number }>();
  let i = 0;
  for (const row of rows) {
    const lat = num(row[iLat]);
    const lon = num(row[iLon]);
    if (!lat || !lon) continue;
    const rawType = (row[iType] || "Civic space").trim();
    const type = (TYPE_NORMALIZE[rawType] ?? (rawType as StadtType)) as StadtType;
    const safeType: StadtType = (STADT_TYPES as readonly string[]).includes(type)
      ? type
      : "Civic space";
    const score = Math.round(num(row[iScore]));
    // synthesize a date in the past year so time-range filter is meaningful
    const days = (i * 53) % 360;
    const date = new Date(Date.now() - days * 86400_000).toISOString();
    pts.push({
      id: `gs_${i}`,
      lat,
      lon,
      nest: score,
      shade: Math.round(num(row[iNN])),
      drinking: Math.round(num(row[iAM])),
      fountains: Math.round(num(row[iAC])),
      biodiversity: Math.round(num(row[iNA])),
      greenCare: Math.round(num(row[iUS])),
      type: safeType,
      date,
    });
    const town = (row[iTown] || row[iName] || "").trim();
    if (town) {
      const t = towns.get(town);
      if (t) {
        t.lat += lat;
        t.lon += lon;
        t.n += 1;
      } else {
        towns.set(town, { lat, lon, n: 1 });
      }
    }
    i++;
  }
  _stadt = pts;
  _stadtTowns = Array.from(towns.entries()).map(([name, v]) => ({
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    lat: v.lat / v.n,
    lon: v.lon / v.n,
  }));
  return { points: _stadt, towns: _stadtTowns };
}

export function realStadtPoints(): StadtPoint[] {
  return loadStadt().points;
}
export function realStadtTowns() {
  return loadStadt().towns;
}

// ---- Bio: iNaturalist (German common-name heuristic for category) ----
let _bio: BioPoint[] | null = null;

// German keyword → category mapping (heuristic since taxon.iconic_taxon_name
// is past the truncation horizon in the source CSV).
const CAT_HEURISTIC: { match: RegExp; cat: BioCategory }[] = [
  { match: /pilz|ling$|amanita|boletus/i, cat: "Fungi" },
  { match: /spinne|webspinne|kreuzspinne/i, cat: "Arachnida" },
  { match: /käfer|biene|wespe|hummel|fliege|libelle|falter|mücke|ameise|schmetterling|hornisse|wanze/i, cat: "Insecta" },
  { match: /fisch|forelle|karpfen|hecht|barsch/i, cat: "Actinopterygii" },
  { match: /eidechse|natter|schlange|schildkröte|molch/i, cat: "Reptilia" },
  { match: /vogel|ente|meise|amsel|specht|finke?$|sperling|taube|möwe|schwan|reiher|adler|falke|eule|krähe|elster|drossel|rotkehlchen|stieglitz|star|gans|kranich|reiher/i, cat: "Aves" },
  { match: /hörnchen|fuchs|reh|hirsch|wildschwein|igel|maus|fledermaus|hase|kaninchen|biber/i, cat: "Mammalia" },
];

function classify(name: string, fallbackSeed: number): BioCategory {
  for (const h of CAT_HEURISTIC) if (h.match.test(name)) return h.cat;
  // weighted fallback toward Plantae (most common in iNat)
  const weights: [BioCategory, number][] = [
    ["Plantae", 60],
    ["Insecta", 18],
    ["Aves", 10],
    ["Fungi", 6],
    ["Mammalia", 3],
    ["Arachnida", 2],
    ["Reptilia", 1],
  ];
  const sum = weights.reduce((a, [, w]) => a + w, 0);
  let r = (fallbackSeed % 1000) / 1000 * sum;
  for (const [c, w] of weights) {
    r -= w;
    if (r <= 0) return c;
  }
  return "Plantae";
}

function hashStr(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function loadBio(): BioPoint[] {
  if (_bio) return _bio;
  const { header, rows } = parseWrappedCsv(inatRaw);
  // The inat CSV is truncated at ~38k chars per row, but key fields are
  // before that: species_guess (8), observed_on (26), location (47).
  const iSpecies = header.indexOf("species_guess");
  const iDate = header.indexOf("observed_on");
  const iLoc = header.indexOf("location");
  const out: BioPoint[] = [];
  rows.forEach((row, i) => {
    const loc = row[iLoc];
    if (!loc || !loc.includes(",")) return;
    const [latS, lonS] = loc.split(",");
    const lat = parseFloat(latS);
    const lon = parseFloat(lonS);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const species = (row[iSpecies] || "Unbekannt").trim() || "Unbekannt";
    const seed = hashStr(species);
    const category = classify(species, seed);
    const date = row[iDate] || new Date(Date.now() - (i * 17) % 360 * 86400_000).toISOString();
    out.push({
      id: `inat_${i}`,
      lat,
      lon,
      category,
      species,
      invasive: seed % 23 === 0,
      threatened: seed % 31 === 0,
      date: new Date(date).toISOString(),
    });
  });
  _bio = out;
  return _bio;
}

export function realBioPoints(): BioPoint[] {
  return loadBio();
}
