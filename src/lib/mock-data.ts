// Deterministic mock data generators for the three citizen-science sources.
// All points are geo-distributed around the chosen city.

export type City = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

export const CITIES: City[] = [
  { id: "stuttgart", name: "Stuttgart", lat: 48.7758, lon: 9.1829 },
  { id: "berlin", name: "Berlin", lat: 52.52, lon: 13.405 },
  { id: "muenchen", name: "München", lat: 48.1351, lon: 11.582 },
  { id: "hamburg", name: "Hamburg", lat: 53.5511, lon: 9.9937 },
  { id: "koeln", name: "Köln", lat: 50.9375, lon: 6.9603 },
  { id: "frankfurt", name: "Frankfurt", lat: 50.1109, lon: 8.6821 },
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

export type WasserPoint = {
  id: string;
  lat: number;
  lon: number;
  fu: number; // 1-21 Forel-Ule scale
  ph: number;
  transparenz: number; // m
  device: string;
  date: string;
};

export type StadtPoint = {
  id: string;
  lat: number;
  lon: number;
  nest: number; // 0-100
  shade: number;
  drinking: number;
  fountains: number;
  biodiversity: number;
  greenCare: number;
  type: StadtType;
  date: string;
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
  "Actinopterygii",
  "Insecta",
  "Arachnida",
  "Fungi",
  "Mammalia",
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
};

const SPECIES: Record<BioCategory, string[]> = {
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
export function fuColor(fu: number) {
  return FU_COLORS[Math.max(0, Math.min(20, Math.round(fu) - 1))];
}

// NEST score color ramp matching the official "Overall NEST score" legend
// (dark navy low → cyan → off-white near 50 → orange → dark red high).
const NEST_RAMP = [
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
export function nestColor(score: number) {
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
