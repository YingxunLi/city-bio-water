// Deterministic mock data generators for the three citizen-science sources.
// All points are geo-distributed around the chosen city.

export type City = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

// Standard list of major German cities ("Großstädte", pop. > 100k) —
// same administrative tier, sorted alphabetically like a normal city picker.
export const CITIES: City[] = [
  { id: "aachen", name: "Aachen", lat: 50.7753, lon: 6.0839 },
  { id: "augsburg", name: "Augsburg", lat: 48.3705, lon: 10.8978 },
  { id: "bergisch-gladbach", name: "Bergisch Gladbach", lat: 50.9925, lon: 7.1359 },
  { id: "berlin", name: "Berlin", lat: 52.52, lon: 13.405 },
  { id: "bielefeld", name: "Bielefeld", lat: 52.0302, lon: 8.5325 },
  { id: "bochum", name: "Bochum", lat: 51.4818, lon: 7.2162 },
  { id: "bonn", name: "Bonn", lat: 50.7374, lon: 7.0982 },
  { id: "bottrop", name: "Bottrop", lat: 51.5216, lon: 6.9289 },
  { id: "braunschweig", name: "Braunschweig", lat: 52.2689, lon: 10.5268 },
  { id: "bremen", name: "Bremen", lat: 53.0793, lon: 8.8017 },
  { id: "bremerhaven", name: "Bremerhaven", lat: 53.5396, lon: 8.5809 },
  { id: "chemnitz", name: "Chemnitz", lat: 50.8278, lon: 12.9214 },
  { id: "darmstadt", name: "Darmstadt", lat: 49.8728, lon: 8.6512 },
  { id: "dortmund", name: "Dortmund", lat: 51.5136, lon: 7.4653 },
  { id: "dresden", name: "Dresden", lat: 51.0504, lon: 13.7373 },
  { id: "duisburg", name: "Duisburg", lat: 51.4344, lon: 6.7623 },
  { id: "duesseldorf", name: "Düsseldorf", lat: 51.2277, lon: 6.7735 },
  { id: "erfurt", name: "Erfurt", lat: 50.9848, lon: 11.0299 },
  { id: "erlangen", name: "Erlangen", lat: 49.5897, lon: 11.0044 },
  { id: "essen", name: "Essen", lat: 51.4556, lon: 7.0116 },
  { id: "frankfurt", name: "Frankfurt am Main", lat: 50.1109, lon: 8.6821 },
  { id: "freiburg", name: "Freiburg im Breisgau", lat: 47.999, lon: 7.8421 },
  { id: "fuerth", name: "Fürth", lat: 49.4783, lon: 10.988 },
  { id: "gelsenkirchen", name: "Gelsenkirchen", lat: 51.5177, lon: 7.0857 },
  { id: "goettingen", name: "Göttingen", lat: 51.5413, lon: 9.9158 },
  { id: "hagen", name: "Hagen", lat: 51.367, lon: 7.4633 },
  { id: "halle", name: "Halle (Saale)", lat: 51.497, lon: 11.9683 },
  { id: "hamburg", name: "Hamburg", lat: 53.5511, lon: 9.9937 },
  { id: "hamm", name: "Hamm", lat: 51.6806, lon: 7.8214 },
  { id: "hannover", name: "Hannover", lat: 52.3759, lon: 9.732 },
  { id: "heidelberg", name: "Heidelberg", lat: 49.3988, lon: 8.6724 },
  { id: "heilbronn", name: "Heilbronn", lat: 49.1427, lon: 9.2109 },
  { id: "herne", name: "Herne", lat: 51.5386, lon: 7.2256 },
  { id: "hildesheim", name: "Hildesheim", lat: 52.1508, lon: 9.9511 },
  { id: "ingolstadt", name: "Ingolstadt", lat: 48.7665, lon: 11.4258 },
  { id: "jena", name: "Jena", lat: 50.9271, lon: 11.5892 },
  { id: "karlsruhe", name: "Karlsruhe", lat: 49.0069, lon: 8.4037 },
  { id: "kassel", name: "Kassel", lat: 51.3127, lon: 9.4797 },
  { id: "kiel", name: "Kiel", lat: 54.3233, lon: 10.1228 },
  { id: "koblenz", name: "Koblenz", lat: 50.3569, lon: 7.589 },
  { id: "koeln", name: "Köln", lat: 50.9375, lon: 6.9603 },
  { id: "krefeld", name: "Krefeld", lat: 51.3388, lon: 6.5853 },
  { id: "leipzig", name: "Leipzig", lat: 51.3397, lon: 12.3731 },
  { id: "leverkusen", name: "Leverkusen", lat: 51.0459, lon: 6.9852 },
  { id: "luebeck", name: "Lübeck", lat: 53.8655, lon: 10.6866 },
  { id: "ludwigshafen", name: "Ludwigshafen am Rhein", lat: 49.4811, lon: 8.4353 },
  { id: "magdeburg", name: "Magdeburg", lat: 52.1205, lon: 11.6276 },
  { id: "mainz", name: "Mainz", lat: 49.9929, lon: 8.2473 },
  { id: "mannheim", name: "Mannheim", lat: 49.4875, lon: 8.466 },
  { id: "moers", name: "Moers", lat: 51.4517, lon: 6.6259 },
  { id: "moenchengladbach", name: "Mönchengladbach", lat: 51.1805, lon: 6.4428 },
  { id: "muelheim", name: "Mülheim an der Ruhr", lat: 51.4266, lon: 6.8798 },
  { id: "muenchen", name: "München", lat: 48.1351, lon: 11.582 },
  { id: "muenster", name: "Münster", lat: 51.9607, lon: 7.6261 },
  { id: "neuss", name: "Neuss", lat: 51.2042, lon: 6.6879 },
  { id: "nuernberg", name: "Nürnberg", lat: 49.4521, lon: 11.0767 },
  { id: "oberhausen", name: "Oberhausen", lat: 51.4966, lon: 6.8514 },
  { id: "offenbach", name: "Offenbach am Main", lat: 50.0956, lon: 8.7761 },
  { id: "oldenburg", name: "Oldenburg", lat: 53.1435, lon: 8.2146 },
  { id: "osnabrueck", name: "Osnabrück", lat: 52.2799, lon: 8.0472 },
  { id: "paderborn", name: "Paderborn", lat: 51.7189, lon: 8.7575 },
  { id: "pforzheim", name: "Pforzheim", lat: 48.8922, lon: 8.6946 },
  { id: "potsdam", name: "Potsdam", lat: 52.3906, lon: 13.0645 },
  { id: "recklinghausen", name: "Recklinghausen", lat: 51.6142, lon: 7.1978 },
  { id: "regensburg", name: "Regensburg", lat: 49.0134, lon: 12.1016 },
  { id: "remscheid", name: "Remscheid", lat: 51.1789, lon: 7.1894 },
  { id: "reutlingen", name: "Reutlingen", lat: 48.4914, lon: 9.2043 },
  { id: "rostock", name: "Rostock", lat: 54.0887, lon: 12.14 },
  { id: "saarbruecken", name: "Saarbrücken", lat: 49.2402, lon: 6.9969 },
  { id: "salzgitter", name: "Salzgitter", lat: 52.1508, lon: 10.3322 },
  { id: "siegen", name: "Siegen", lat: 50.8748, lon: 8.0243 },
  { id: "solingen", name: "Solingen", lat: 51.1652, lon: 7.0671 },
  { id: "stuttgart", name: "Stuttgart", lat: 48.7758, lon: 9.1829 },
  { id: "trier", name: "Trier", lat: 49.7596, lon: 6.6441 },
  { id: "ulm", name: "Ulm", lat: 48.4011, lon: 9.9876 },
  { id: "wiesbaden", name: "Wiesbaden", lat: 50.0782, lon: 8.2398 },
  { id: "wolfsburg", name: "Wolfsburg", lat: 52.4227, lon: 10.7865 },
  { id: "wuppertal", name: "Wuppertal", lat: 51.2562, lon: 7.1508 },
  { id: "wuerzburg", name: "Würzburg", lat: 49.7913, lon: 9.9534 },
];

// ---- seedable PRNG ----
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// km offset to lat/lon
function jitter(rand: () => number, lat: number, lon: number, radiusKm: number) {
  const r = radiusKm * Math.sqrt(rand());
  const theta = rand() * Math.PI * 2;
  const dLat = (r / 111) * Math.sin(theta);
  const dLon = (r / (111 * Math.cos((lat * Math.PI) / 180))) * Math.cos(theta);
  return [lat + dLat, lon + dLon] as [number, number];
}

// JSON-safe shape for a raw source record (API response or CSV row) —
// deliberately narrower than `unknown` so TanStack Start can serialize it
// across the server-fn boundary.
export type RawRecord = Record<string, string | number | boolean | null>;

export type WasserPoint = {
  id: string;
  lat: number;
  lon: number;
  fu: number | null; // 1-21 Forel-Ule scale; null = not reported
  ph: number | null;
  transparenz: number | null; // Sichttiefe (sd_depth), cm
  device: string;
  date: string;
  /** Exact source record (API JSON or CSV row), unmodified — for data export. */
  raw: RawRecord;
};

export type StadtPoint = {
  id: string;
  lat: number;
  lon: number;
  nest: number | null; // 0-100; null = not reported
  shade: number | null;
  drinking: number | null;
  fountains: number | null;
  biodiversity: number | null;
  greenCare: number | null;
  type: StadtType;
  name?: string;
  gstypology?: string;
  date: string;
  /** Exact source CSV row, unmodified — for data export. */
  raw: RawRecord;
};

export const STADT_TYPES = [
  "Civic space",
  "Woodlands/forest",
  "Urban park",
  "Semi-natural/natural",
  "River/stream/canal",
  "Natural/green corridor",
  "Marine/coastal",
  "Lake/reservoir/pond",
  "Functional/amenity",
  "Formal recreation",
  "Country park",
] as const;
export type StadtType = (typeof STADT_TYPES)[number];

export const BIO_CATEGORIES = [
  "Plantae",
  "Aves",
  "Reptilia",
  "Amphibia",
  "Actinopterygii",
  "Insecta",
  "Arachnida",
  "Mollusca",
  "Fungi",
  "Mammalia",
  "Animalia",
] as const;
export type BioCategory = (typeof BIO_CATEGORIES)[number];

export type BioPoint = {
  id: string;
  lat: number;
  lon: number;
  category: BioCategory;
  species: string;
  invasive: boolean;
  threatened: boolean;
  date: string;
  // Optional enrichment from the iNaturalist API (absent for synthetic data).
  commonName?: string;
  place?: string;
  photo?: string;
  quality?: string;
  native?: boolean;
  observer?: string;
  /** Exact source API record, unmodified — for data export. */
  raw: RawRecord;
};

const SPECIES: Partial<Record<BioCategory, string[]>> = {
  Plantae: ["Bellis perennis", "Quercus robur", "Acer pseudoplatanus", "Taraxacum officinale"],
  Aves: ["Parus major", "Turdus merula", "Sitta europaea", "Erithacus rubecula"],
  Reptilia: ["Lacerta agilis", "Natrix natrix"],
  Actinopterygii: ["Cyprinus carpio", "Salmo trutta"],
  Insecta: ["Apis mellifera", "Vanessa atalanta", "Coccinella septempunctata"],
  Arachnida: ["Araneus diadematus", "Pisaura mirabilis"],
  Fungi: ["Amanita muscaria", "Boletus edulis"],
  Mammalia: ["Sciurus vulgaris", "Vulpes vulpes", "Erinaceus europaeus"],
};

function dateInRange(rand: () => number, days: number) {
  const now = Date.now();
  const t = now - rand() * days * 86400_000;
  return new Date(t).toISOString();
}

const N_DAYS_POOL = 365; // generate one year, filter later

const DEVICES = ["EML-L29", "iPhone 13", "Samsung SM-A536B", "Pixel 7", "iPhone 15 Pro", "Xiaomi 13"];

export function generateWasser(city: City, count = 220): WasserPoint[] {
  const rand = mulberry32(hash("wasser_" + city.id));
  return Array.from({ length: count }, (_, i) => {
    const [lat, lon] = jitter(rand, city.lat, city.lon, 25);
    const fu = Math.max(1, Math.min(21, Math.round(rand() * 18 + 2)));
    return {
      id: `w_${city.id}_${i}`,
      lat,
      lon,
      fu,
      ph: +(6.5 + rand() * 2.2).toFixed(2),
      transparenz: +(0.2 + rand() * 6).toFixed(2),
      device: DEVICES[Math.floor(rand() * DEVICES.length)],
      date: dateInRange(rand, N_DAYS_POOL),
      raw: {}, // synthetic mock data has no source record
    };
  });
}

// Stadt + Bio now come from real CSV sources (Greenspace Hack & iNaturalist).
// City parameter is unused — distance/time filtering happens in the context.
import { realStadtPoints, realBioPoints } from "./real-data";

export function generateStadt(_city: City): StadtPoint[] {
  return realStadtPoints();
}

export function generateBio(_city: City): BioPoint[] {
  return realBioPoints();
}

// keep SPECIES export reference quiet
void SPECIES;
void BIO_CATEGORIES;

// ---- Forel-Ule color scale (1..21) ----
// Approximation of the FU scale colors.
export const FU_COLORS = [
  "#2158bc", "#316dc5", "#327cbb", "#4b80a0", "#568f96",
  "#6d9298", "#698c86", "#759e72", "#7ba654", "#7dae38",
  "#94b660", "#a8b76d", "#b5b079", "#bba35d", "#c1a24b",
  "#b89744", "#a17a3a", "#946e34", "#84612d", "#6d4c25", "#4d361a",
];
const NO_DATA_COLOR = "#9ca3af";
export function fuColor(fu: number | null) {
  if (fu == null) return NO_DATA_COLOR;
  return FU_COLORS[Math.max(0, Math.min(20, Math.round(fu) - 1))];
}

// NEST score color ramp matching the official "Overall NEST score" legend
// (dark navy low → cyan → off-white near 50 → orange → dark red high).
export const NEST_RAMP = [
  { t: 0, c: "#0b1a3a" },
  { t: 0.2, c: "#1e62a8" },
  { t: 0.4, c: "#6dc7d6" },
  { t: 0.5, c: "#f1ece4" },
  { t: 0.6, c: "#f4b65a" },
  { t: 0.8, c: "#c44a2a" },
  { t: 1, c: "#5b0f0c" },
];
function mixHex(a: string, b: string, k: number) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}
export function nestColor(score: number | null) {
  if (score == null) return NO_DATA_COLOR;
  const t = Math.max(0, Math.min(1, score / 100));
  for (let i = 1; i < NEST_RAMP.length; i++) {
    if (t <= NEST_RAMP[i].t) {
      const a = NEST_RAMP[i - 1];
      const b = NEST_RAMP[i];
      const k = (t - a.t) / (b.t - a.t);
      return mixHex(a.c, b.c, k);
    }
  }
  return NEST_RAMP[NEST_RAMP.length - 1].c;
}

// Average over only the non-null samples — a missing measurement must not
// count as 0 and skew the mean. Returns null if nothing is valid.
export function avgValid(xs: (number | null | undefined)[]): number | null {
  const valid = xs.filter((v): v is number => v != null && Number.isFinite(v));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

// distance helper (km)
export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}
