import { toSlug } from "./constants";

export interface LocalityDef {
  name: string;
  slug: string;
  aliases?: string[];
  keywords: string[];
  type?: 'commercial' | 'tech_park' | 'high_street' | 'residential' | 'transit' | 'industrial';
}

export const TOP_LOCALITIES_BY_CITY: Record<string, LocalityDef[]> = {
  bengaluru: [
    { name: "Indiranagar", slug: "indiranagar", aliases: ["indranagar"], keywords: ["indiranagar", "indranagar", "100 ft road", "100 feet road", "12th main", "cmh road"], type: "high_street" },
    { name: "Koramangala", slug: "koramangala", aliases: ["kormangala"], keywords: ["koramangala", "kormangala", "80 ft road", "forum mall", "st johns"], type: "commercial" },
    { name: "Whitefield", slug: "whitefield", aliases: ["whitfield"], keywords: ["whitefield", "itpl", "hope farm", "nallurahalli", "siddapura", "kadugodi", "channasandra"], type: "tech_park" },
    { name: "HSR Layout", slug: "hsr-layout", aliases: ["hsr"], keywords: ["hsr layout", "hsr", "sector 1", "sector 2", "sector 3", "sector 4"], type: "commercial" },
    { name: "Electronic City", slug: "electronic-city", aliases: ["ecity", "e-city"], keywords: ["electronic city", "electronic city phase", "e-city", "wipro gate", "infosys gate"], type: "tech_park" },
    { name: "Jayanagar", slug: "jayanagar", aliases: ["jaynagar"], keywords: ["jayanagar", "jaynagar", "4th block", "3rd block", "south end circle"], type: "high_street" },
    { name: "JP Nagar", slug: "jp-nagar", aliases: ["jpnagar", "j-p-nagar"], keywords: ["jp nagar", "j.p. nagar", "central mall jp", "sarakki"], type: "residential" },
    { name: "MG Road", slug: "mg-road", aliases: ["mgroad", "m-g-road"], keywords: ["mg road", "m.g. road", "brigade road", "church street", "cubbon road"], type: "commercial" },
    { name: "Bellandur", slug: "bellandur", keywords: ["bellandur", "outer ring road", "ecospace", "ecoworld"], type: "tech_park" },
    { name: "Marathahalli", slug: "marathahalli", aliases: ["marathalli"], keywords: ["marathahalli", "marathalli", "bridge", "multiplex", "innovative multiplex"], type: "transit" },
    { name: "Hebbal", slug: "hebbal", keywords: ["hebbal", "manyata", "hebbal flyover", "bellary road"], type: "transit" },
    { name: "Nagawara", slug: "nagawara", keywords: ["nagawara", "manyata tech park", "elements mall", "thanisandra"], type: "tech_park" },
    { name: "Malleshwaram", slug: "malleshwaram", aliases: ["malleswaram"], keywords: ["malleshwaram", "malleswaram", "sampige road", "orion mall"], type: "high_street" },
    { name: "Rajajinagar", slug: "rajajinagar", aliases: ["rajaji-nagar"], keywords: ["rajajinagar", "brigade gateway", "west of chord"], type: "commercial" },
    { name: "Banashankari", slug: "banashankari", aliases: ["banshankari", "banskankari", "bsk", "banashankari-stage-2", "banashankari-stage-3"], keywords: ["banashankari", "banshankari", "banskankari", "bsk", "kathriguppe", "padmanabhanagar", "kanakapura main rd", "kaveri nagar"], type: "residential" },
    { name: "Sarjapur Road", slug: "sarjapur-road", aliases: ["sarjapur"], keywords: ["sarjapur road", "sarjapur", "wipro campus", "carmelaram"], type: "residential" },
    { name: "Yelahanka", slug: "yelahanka", keywords: ["yelahanka", "new town", "kogilu", "jakku"], type: "residential" },
    { name: "Domlur", slug: "domlur", keywords: ["domlur", "embassy golf links", "egl", "intermediate ring road"], type: "commercial" },
    { name: "BTM Layout", slug: "btm-layout", aliases: ["btm"], keywords: ["btm layout", "btm", "madiwala", "bannerghatta"], type: "commercial" },
    { name: "Brookefield", slug: "brookefield", aliases: ["brookfield"], keywords: ["brookefield", "brookfield", "itpl main road", "kundalahalli", "aecs layout"], type: "commercial" },
  ],
  mumbai: [
    { name: "Bandra", slug: "bandra", aliases: ["bandra-west", "bandra-east"], keywords: ["bandra", "bandra west", "linking road", "hill road", "bandra east"], type: "high_street" },
    { name: "BKC (Bandra Kurla Complex)", slug: "bkc", aliases: ["bandra-kurla-complex"], keywords: ["bkc", "bandra kurla", "bandra-kurla complex", "maker maxity", "jio world"], type: "commercial" },
    { name: "Andheri West", slug: "andheri-west", aliases: ["andheri"], keywords: ["andheri west", "lokhandwala", "link road", "dn nagar"], type: "commercial" },
    { name: "Andheri East", slug: "andheri-east", keywords: ["andheri east", "saki naka", "marol", "seepz", "midc andheri", "jb nagar"], type: "tech_park" },
    { name: "Lower Parel", slug: "lower-parel", keywords: ["lower parel", "phoenix palladium", "high street phoenix", "peninsula", "kamala mills"], type: "commercial" },
    { name: "Worli", slug: "worli", keywords: ["worli", "sea face", "atria mall", "dr annie besant"], type: "high_street" },
    { name: "Powai", slug: "powai", keywords: ["powai", "hiranandani", "chandivali", "iit bombay"], type: "tech_park" },
    { name: "Juhu", slug: "juhu", keywords: ["juhu", "juhu tara road", "vile parle"], type: "high_street" },
    { name: "Dadar", slug: "dadar", keywords: ["dadar", "shivaji park", "dadar tt", "prabhadevi"], type: "transit" },
    { name: "Goregaon", slug: "goregaon", aliases: ["goregaon-east", "goregaon-west"], keywords: ["goregaon", "oberoi mall", "goregaon east", "inorbit mall", "film city"], type: "commercial" },
    { name: "Malad", slug: "malad", aliases: ["malad-west"], keywords: ["malad", "inorbit", "mindspace malad", "link road malad"], type: "tech_park" },
    { name: "Borivali", slug: "borivali", aliases: ["borivali-west"], keywords: ["borivali", "borivali west", "shimpoli", "link road borivali"], type: "residential" },
    { name: "Thane", slug: "thane", keywords: ["thane", "viviana mall", "ghodbunder road", "korum mall", "majiwada"], type: "commercial" },
    { name: "Navi Mumbai (Vashi)", slug: "vashi", aliases: ["navi-mumbai"], keywords: ["vashi", "navi mumbai", "inorbit vashi", "palm beach road"], type: "commercial" },
  ],
  delhi: [
    { name: "Connaught Place", slug: "connaught-place", aliases: ["cp"], keywords: ["connaught place", "cp", "inner circle", "outer circle", "barakhamba"], type: "commercial" },
    { name: "South Extension", slug: "south-extension", aliases: ["south-ext"], keywords: ["south extension", "south ext", "part 1", "part 2"], type: "high_street" },
    { name: "Saket", slug: "saket", keywords: ["saket", "select citywalk", "dlf avenue", "saket district centre"], type: "commercial" },
    { name: "Hauz Khas", slug: "hauz-khas", aliases: ["hkv"], keywords: ["hauz khas", "hkv", "aurobindo marg"], type: "high_street" },
    { name: "Nehru Place", slug: "nehru-place", keywords: ["nehru place", "paras cinema", "kalkaji"], type: "commercial" },
    { name: "Lajpat Nagar", slug: "lajpat-nagar", keywords: ["lajpat nagar", "central market", "ring road lajpat"], type: "high_street" },
    { name: "Karol Bagh", slug: "karol-bagh", keywords: ["karol bagh", "ajmal khan road", "pusa road"], type: "high_street" },
    { name: "Vasant Kunj", slug: "vasant-kunj", keywords: ["vasant kunj", "ambience mall vasant", "dlf promenade", "dlf emporio"], type: "commercial" },
    { name: "Punjabi Bagh", slug: "punjabi-bagh", keywords: ["punjabi bagh", "club road", "west punjabi bagh"], type: "high_street" },
    { name: "Pitampura", slug: "pitampura", aliases: ["nsp"], keywords: ["pitampura", "netaji subhash place", "nsp", "tv tower"], type: "commercial" },
    { name: "Rohini", slug: "rohini", keywords: ["rohini", "sector 10", "unity one mall", "rithala"], type: "residential" },
    { name: "Dwarka", slug: "dwarka", keywords: ["dwarka", "sector 12", "sector 21", "vegas mall"], type: "residential" },
  ],
  gurugram: [
    { name: "Cyber City", slug: "cyber-city", aliases: ["cyber-hub", "dlf-cyber-city"], keywords: ["cyber city", "cyber hub", "dlf cyber city", "dlf phase 2"], type: "tech_park" },
    { name: "Golf Course Road", slug: "golf-course-road", keywords: ["golf course road", "one horizon", "two horizon", "sector 54", "sector 56"], type: "commercial" },
    { name: "Golf Course Extension", slug: "golf-course-extension", keywords: ["golf course extension", "sector 65", "sector 66", "m3m"], type: "residential" },
    { name: "MG Road Gurugram", slug: "mg-road-gurugram", aliases: ["mg-road"], keywords: ["mg road", "m.g. road", "iffco chowk", "mall mile"], type: "commercial" },
    { name: "Sector 29", slug: "sector-29", keywords: ["sector 29", "huda city centre", "kingdom of dreams"], type: "high_street" },
    { name: "Sohna Road", slug: "sohna-road", keywords: ["sohna road", "subhash chowk", "vatika city", "spaze"], type: "commercial" },
  ],
  noida: [
    { name: "Sector 18", slug: "sector-18", keywords: ["sector 18", "mall of india", "dlf mall of india", "atta market"], type: "high_street" },
    { name: "Sector 62", slug: "sector-62", keywords: ["sector 62", "electronic city", "stellar it park"], type: "tech_park" },
    { name: "Noida Expressway", slug: "noida-expressway", keywords: ["noida expressway", "sector 128", "sector 132", "sector 142", "advant navis"], type: "tech_park" },
    { name: "Sector 16", slug: "sector-16", keywords: ["sector 16", "film city", "dnd flyway"], type: "commercial" },
  ],
  hyderabad: [
    { name: "Hitec City", slug: "hitec-city", aliases: ["hitex"], keywords: ["hitec city", "cyber towers", "mindspace", "inorbit mall hyd"], type: "tech_park" },
    { name: "Gachibowli", slug: "gachibowli", keywords: ["gachibowli", "financial district", "wipro circle", "q city"], type: "tech_park" },
    { name: "Madhapur", slug: "madhapur", keywords: ["madhapur", "kavuri hills", "durgam cheruvu"], type: "commercial" },
    { name: "Jubilee Hills", slug: "jubilee-hills", keywords: ["jubilee hills", "road no 36", "road no 45", "road no 10"], type: "high_street" },
    { name: "Banjara Hills", slug: "banjara-hills", keywords: ["banjara hills", "road no 1", "road no 12", "city centre mall"], type: "high_street" },
    { name: "Kondapur", slug: "kondapur", keywords: ["kondapur", "kothaguda", "sarath city capital mall"], type: "commercial" },
    { name: "Kukatpally", slug: "kukatpally", keywords: ["kukatpally", "kphb", "forum sujana mall", "jntu"], type: "high_street" },
    { name: "Secunderabad", slug: "secunderabad", keywords: ["secunderabad", "paradise circle", "clock tower", "pg road"], type: "commercial" },
    { name: "Begumpet", slug: "begumpet", keywords: ["begumpet", "lifestyle building", "prakash nagar"], type: "transit" },
  ],
  chennai: [
    { name: "T Nagar", slug: "t-nagar", keywords: ["t nagar", "t. nagar", "pondid bazaar", "usman road", "panagal park"], type: "high_street" },
    { name: "Anna Nagar", slug: "anna-nagar", keywords: ["anna nagar", "shanthi colony", "anna arch", "roundtana", "vr chennai"], type: "high_street" },
    { name: "OMR (Old Mahabalipuram Road)", slug: "omr", keywords: ["omr", "old mahabalipuram road", "it corridor", "perungudi", "sholinganallur", "thoraipakkam"], type: "tech_park" },
    { name: "Velachery", slug: "velachery", keywords: ["velachery", "grand square", "phoenix marketcity chennai", "grand mall"], type: "commercial" },
    { name: "Adyar", slug: "adyar", keywords: ["adyar", "lb road", "gandhi nagar", "besant nagar"], type: "residential" },
    { name: "Nungambakkam", slug: "nungambakkam", keywords: ["nungambakkam", "kh road", "high road", "sterling road"], type: "commercial" },
    { name: "Guindy", slug: "guindy", keywords: ["guindy", "olympia tech park", "kathipara", "race course"], type: "tech_park" },
    { name: "Alwarpet", slug: "alwarpet", keywords: ["alwarpet", "ttk road", "cp ramaswamy"], type: "residential" },
    { name: "Mylapore", slug: "mylapore", keywords: ["mylapore", "luz church road", "kutchery road"], type: "high_street" },
  ],
  pune: [
    { name: "Hinjewadi", slug: "hinjewadi", aliases: ["hinjawadi"], keywords: ["hinjewadi", "hinjawadi", "phase 1", "phase 2", "phase 3", "rajiv gandhi infotech"], type: "tech_park" },
    { name: "Koregaon Park", slug: "koregaon-park", aliases: ["kp"], keywords: ["koregaon park", "kp", "north main road", "south main road"], type: "high_street" },
    { name: "Viman Nagar", slug: "viman-nagar", keywords: ["viman nagar", "phoenix marketcity pune", "symbiosis"], type: "commercial" },
    { name: "Baner", slug: "baner", keywords: ["baner", "baner road", "pancard club", "balewadi high street"], type: "high_street" },
    { name: "Kothrud", slug: "kothrud", keywords: ["kothrud", "karve road", "paud road", "chandani chowk"], type: "residential" },
    { name: "Kalyani Nagar", slug: "kalyani-nagar", keywords: ["kalyani nagar", "cerebrum it park"], type: "commercial" },
    { name: "Wakad", slug: "wakad", keywords: ["wakad", "dange chowk", "bhujbal chowk"], type: "residential" },
    { name: "Magarpatta", slug: "magarpatta", keywords: ["magarpatta", "magarpatta city", "hadapsar", "seasons mall"], type: "tech_park" },
    { name: "Aundh", slug: "aundh", keywords: ["aundh", "iti road", "westend mall"], type: "high_street" },
  ],
  kolkata: [
    { name: "Salt Lake", slug: "salt-lake", keywords: ["salt lake", "bidhannagar", "city centre 1", "sector 1", "sector 2", "sector 3"], type: "commercial" },
    { name: "Sector V", slug: "sector-v", keywords: ["sector v", "sector 5", "salt lake sector v", "it hub kolkata"], type: "tech_park" },
    { name: "Park Street", slug: "park-street", keywords: ["park street", "camac street", "russell street"], type: "high_street" },
    { name: "New Town", slug: "new-town", keywords: ["new town", "rajarhat", "action area 1", "action area 2", "city centre 2"], type: "tech_park" },
    { name: "Ballygunge", slug: "ballygunge", keywords: ["ballygunge", "garihat", "southern avenue"], type: "residential" },
  ],
  ahmedabad: [
    { name: "SG Highway", slug: "sg-highway", keywords: ["sg highway", "s.g. highway", "sarkhej gandhinagar", "iskcon cross road"], type: "commercial" },
    { name: "Prahlad Nagar", slug: "prahlad-nagar", keywords: ["prahlad nagar", "prahladnagar", "corporate road"], type: "commercial" },
    { name: "Bodakdev", slug: "bodakdev", keywords: ["bodakdev", "judges bungalow road"], type: "high_street" },
    { name: "Sindhu Bhavan Road", slug: "sindhu-bhavan-road", keywords: ["sindhu bhavan", "sbr", "thaltej"], type: "high_street" },
    { name: "Navrangpura", slug: "navrangpura", keywords: ["navrangpura", "cg road", "c.g. road"], type: "commercial" },
    { name: "Vastrapur", slug: "vastrapur", keywords: ["vastrapur", "alpha one mall", "ahmedabad one mall", "iim road"], type: "commercial" },
  ],
};

/**
 * Find locality definition by city slug and locality slug (supports exact slugs, aliases, and fuzzy vowel-stripped matching)
 */
export function findLocality(citySlug: string, localitySlug: string): LocalityDef | null {
  const normCity = toSlug(citySlug);
  const normLoc = toSlug(localitySlug);
  const cityLocalities = TOP_LOCALITIES_BY_CITY[normCity];
  if (!cityLocalities) return null;

  // 1. Direct slug or alias match
  const match = cityLocalities.find(l => l.slug === normLoc || l.aliases?.some(a => toSlug(a) === normLoc));
  if (match) return match;

  // 2. Fuzzy skeleton match (e.g. "banshankari" vs "banashankari" both reduce to "bnshnkr")
  const skeleton = normLoc.replace(/[aeiou\-]/g, '');
  if (skeleton.length >= 4) {
    const fuzzy = cityLocalities.find(l => l.slug.replace(/[aeiou\-]/g, '') === skeleton);
    if (fuzzy) return fuzzy;
  }

  return null;
}

/**
 * Given a city slug, return all known localities
 */
export function getLocalitiesForCity(citySlug: string): LocalityDef[] {
  const normCity = toSlug(citySlug);
  return TOP_LOCALITIES_BY_CITY[normCity] || [];
}

/**
 * Match a screen against a locality
 */
export function matchesLocality(
  screen: { location?: string | null; venueName?: string | null; name?: string | null },
  locality: LocalityDef
): boolean {
  const corpus = `${screen.location || ''} ${screen.venueName || ''} ${screen.name || ''}`.toLowerCase();
  
  // 1. Direct keyword match
  for (const kw of locality.keywords) {
    if (corpus.includes(kw.toLowerCase())) {
      return true;
    }
  }

  // 2. Slug match
  if (corpus.includes(locality.slug.replace(/-/g, ' '))) return true;

  // 3. Aliases match
  if (locality.aliases) {
    for (const al of locality.aliases) {
      if (corpus.includes(al.replace(/-/g, ' '))) return true;
    }
  }

  // 4. Name match
  if (corpus.includes(locality.name.toLowerCase())) return true;

  return false;
}
