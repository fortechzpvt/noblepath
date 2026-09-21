import { destinations } from "@/content/destinations";
import type { Accommodation, AccommodationTier, Coordinates } from "@/lib/types";

/**
 * Curated stays for the accommodation page.
 *
 * SOURCE AND STATUS: the property names, tiers and destinations come from a
 * compiled list supplied by the Noble Path team (itself drawn from public
 * directories such as the SLTDA accommodation directory). They have NOT been
 * checked against a live source. Tiers are practical price bands, not official
 * star ratings.
 *
 * COORDINATES ARE APPROXIMATE. We do not hold surveyed positions, so a stay is
 * pinned near its destination's centre with a small, deterministic offset so
 * pins do not stack. Only entries given an explicit position (`[lat, lng]`)
 * are placed by hand. Replace with real coordinates (for example by geocoding
 * each property) before the map is presented as exact. The UI says "pins are
 * approximate" for this reason.
 *
 * Not covered yet: places the list mentions that are not destinations on the
 * site (Weligama, Tangalle, Bentota, Kalutara, Hatton, Haputale, Bandarawela,
 * Passikudah, Mannar, Vavuniya, Mullaitivu, Kitulgala, Ratnapura, Hambantota,
 * Kalpitiya). They need a destination entry first. Generic list items such as
 * "local guesthouses" are not properties and are omitted.
 *
 * See docs/database/accommodation-content.md.
 */

const destinationCoordinates = new Map(destinations.map((d) => [d.slug, d.coordinates]));
const destinationNames = new Map(destinations.map((d) => [d.slug, d.name]));

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Small stable hash so a stay always lands in the same spot on every build. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Roughly 0.3 to 1.5 km from the destination centre, in a stable direction. */
function approximatePosition(destinationSlug: string, slug: string): Coordinates {
  const centre = destinationCoordinates.get(destinationSlug) ?? { lat: 7.8731, lng: 80.7718 };
  const h = hash(slug);
  const angle = ((h % 360) * Math.PI) / 180;
  const radius = 0.003 + ((h >>> 9) % 100) / 100 * 0.011;
  return { lat: centre.lat + Math.sin(angle) * radius, lng: centre.lng + Math.cos(angle) * radius };
}

function stay(
  destinationSlug: string,
  tier: AccommodationTier,
  name: string,
  kind: string,
  at?: readonly [number, number],
): Accommodation {
  const slug = `${destinationSlug}-${slugify(name)}`;
  return {
    slug,
    name,
    destinationSlug,
    tier,
    kind,
    summary: `${kind} in ${destinationNames.get(destinationSlug) ?? destinationSlug}.`,
    coordinates: at ? { lat: at[0], lng: at[1] } : approximatePosition(destinationSlug, slug),
  };
}

export const accommodations: readonly Accommodation[] = [
  // colombo
  stay("colombo", "budget", "CityRest Fort", "Hotel"),
  stay("colombo", "budget", "Clock Inn Colombo", "Hostel"),
  stay("colombo", "budget", "Backpack Hostel", "Hostel"),
  stay("colombo", "budget", "Miracle City Inn Hostel", "Hostel"),
  stay("colombo", "budget", "Thilhara Days Inn", "Hotel"),
  stay("colombo", "budget", "Saasha City Hotel", "Hotel"),
  stay("colombo", "budget", "My Little Island Hostel", "Hostel"),
  stay("colombo", "mid-range", "Fairway Colombo", "Hotel"),
  stay("colombo", "mid-range", "Hotel Nippon Colombo", "Hotel"),
  stay("colombo", "mid-range", "The Steuart by Citrus", "Hotel"),
  stay("colombo", "mid-range", "Ramada Colombo", "Hotel"),
  stay("colombo", "mid-range", "OZO Colombo", "Hotel"),
  stay("colombo", "mid-range", "Radisson Hotel Colombo", "Hotel"),
  stay("colombo", "mid-range", "Cinnamon Red Colombo", "Hotel"),
  stay("colombo", "mid-range", "Granbell Hotel Colombo", "Hotel"),
  stay("colombo", "luxury", "Shangri-La Colombo", "Hotel", [6.9314,79.8455]),
  stay("colombo", "luxury", "ITC Ratnadipa", "Hotel"),
  stay("colombo", "luxury", "Galle Face Hotel", "Hotel", [6.9247,79.8437]),
  stay("colombo", "luxury", "Cinnamon Grand Colombo", "Hotel"),
  stay("colombo", "luxury", "Cinnamon Lakeside Colombo", "Hotel"),
  stay("colombo", "luxury", "The Kingsbury Colombo", "Hotel"),
  stay("colombo", "luxury", "Mövenpick Hotel Colombo", "Hotel"),
  // negombo
  stay("negombo", "budget", "Serendib Village Guest House", "Guest house"),
  stay("negombo", "budget", "Green Palace", "Hotel"),
  stay("negombo", "budget", "Airport Green View Resort", "Resort"),
  stay("negombo", "budget", "House of Esanya", "Hotel"),
  stay("negombo", "budget", "Daffodils Beach Negombo", "Hotel"),
  stay("negombo", "mid-range", "Jetwing Sea", "Hotel"),
  stay("negombo", "mid-range", "Camelot Beach Hotel", "Hotel"),
  stay("negombo", "mid-range", "Goldi Sands Hotel", "Hotel"),
  stay("negombo", "mid-range", "Jetwing Blue", "Hotel"),
  stay("negombo", "mid-range", "Heritance Negombo", "Hotel"),
  stay("negombo", "mid-range", "Regal Réseau Hotel", "Hotel"),
  stay("negombo", "luxury", "Jetwing Beach", "Hotel"),
  stay("negombo", "luxury", "Jetwing Lagoon", "Hotel"),
  stay("negombo", "luxury", "Amagi Beach", "Hotel"),
  stay("negombo", "luxury", "Sentido Heritance Negombo", "Hotel"),
  // kandy
  stay("kandy", "budget", "Kandy City Hostel", "Hostel"),
  stay("kandy", "budget", "Kandy Backpackers Hostel", "Hostel"),
  stay("kandy", "budget", "My City Hotel", "Hotel"),
  stay("kandy", "budget", "Queens Mount", "Hotel"),
  stay("kandy", "mid-range", "Earl's Regent Hotel", "Hotel"),
  stay("kandy", "mid-range", "Hotel Topaz", "Hotel"),
  stay("kandy", "mid-range", "Thilanka Hotel", "Hotel"),
  stay("kandy", "mid-range", "Hotel Suisse", "Hotel"),
  stay("kandy", "mid-range", "Radisson Hotel Kandy", "Hotel"),
  stay("kandy", "mid-range", "Cinnamon Citadel Kandy", "Hotel"),
  stay("kandy", "mid-range", "Grand Kandyan Hotel", "Hotel"),
  stay("kandy", "luxury", "Theva Residency", "Hotel"),
  stay("kandy", "luxury", "Santani Wellness Kandy", "Hotel"),
  stay("kandy", "luxury", "Aarunya Nature Resort", "Resort"),
  stay("kandy", "luxury", "Kings Pavilion", "Hotel"),
  stay("kandy", "luxury", "Madulkelle Tea and Eco Lodge", "Lodge"),
  // nuwara-eliya
  stay("nuwara-eliya", "budget", "Lake View Holiday Bungalow", "Bungalow"),
  stay("nuwara-eliya", "budget", "City View Guesthouse", "Guesthouse"),
  stay("nuwara-eliya", "budget", "Pedro View Homestay", "Homestay"),
  stay("nuwara-eliya", "mid-range", "Araliya Green City", "Hotel"),
  stay("nuwara-eliya", "mid-range", "Jetwing St. Andrew's", "Hotel"),
  stay("nuwara-eliya", "mid-range", "Heaven Seven Nuwara Eliya", "Hotel"),
  stay("nuwara-eliya", "mid-range", "Galway Heights Hotel", "Hotel"),
  stay("nuwara-eliya", "mid-range", "The Grand Hotel", "Hotel"),
  stay("nuwara-eliya", "mid-range", "Blackpool Resort & Spa", "Resort"),
  stay("nuwara-eliya", "luxury", "Heritance Tea Factory", "Hotel"),
  stay("nuwara-eliya", "luxury", "Ceylon Tea Bungalows", "Bungalow"),
  stay("nuwara-eliya", "luxury", "Stafford Bungalow", "Bungalow"),
  stay("nuwara-eliya", "luxury", "Camellia Hills", "Hotel"),
  // ella
  stay("ella", "budget", "Hangover Hostels Ella", "Hostel"),
  stay("ella", "budget", "Ella Escapade Hostel", "Hostel"),
  stay("ella", "mid-range", "Mountain Heavens", "Hotel"),
  stay("ella", "mid-range", "Hotel Onrock", "Hotel"),
  stay("ella", "mid-range", "Morning Dew Boutique Hotel", "Hotel"),
  stay("ella", "mid-range", "Ella Flower Garden Resort", "Resort"),
  stay("ella", "mid-range", "EKHO Ella", "Hotel"),
  stay("ella", "mid-range", "88th - Ella", "Hotel"),
  stay("ella", "luxury", "98 Acres Resort & Spa", "Resort"),
  stay("ella", "luxury", "Ravana Heights", "Hotel"),
  // sigiriya
  stay("sigiriya", "budget", "Sigiriya Village Guesthouse", "Guesthouse"),
  stay("sigiriya", "budget", "Sigiriya Rock Gate Resort", "Resort"),
  stay("sigiriya", "mid-range", "Aliya Resort & Spa", "Resort"),
  stay("sigiriya", "mid-range", "Hotel Sigiriya", "Hotel"),
  stay("sigiriya", "mid-range", "Camellia Resort & Spa", "Resort"),
  stay("sigiriya", "mid-range", "Saunter Paradise", "Hotel"),
  stay("sigiriya", "mid-range", "Amaara Forest Hotel", "Hotel"),
  stay("sigiriya", "mid-range", "Sigiriya Jungle Resort", "Resort"),
  stay("sigiriya", "luxury", "Heritance Kandalama", "Hotel", [7.8984,80.7012]),
  stay("sigiriya", "luxury", "Water Garden Sigiriya", "Hotel"),
  stay("sigiriya", "luxury", "Jetwing Lake", "Hotel"),
  stay("sigiriya", "luxury", "Cinnamon Lodge Habarana", "Lodge"),
  stay("sigiriya", "luxury", "Wild Grass Nature Resort", "Resort"),
  // dambulla
  stay("dambulla", "mid-range", "Amaya Lake", "Hotel"),
  stay("dambulla", "mid-range", "Habarana Village by Cinnamon", "Villa"),
  // anuradhapura
  stay("anuradhapura", "mid-range", "Hotel 4 U", "Hotel"),
  stay("anuradhapura", "mid-range", "Rajarata Hotel", "Hotel"),
  stay("anuradhapura", "mid-range", "The Lakeside at Nuwarawewa", "Hotel"),
  stay("anuradhapura", "mid-range", "Heritage Hotel Anuradhapura", "Hotel"),
  stay("anuradhapura", "mid-range", "Sudunelum Holiday Resort", "Resort"),
  stay("anuradhapura", "luxury", "Ulagalla by Uga Escapes", "Hotel"),
  stay("anuradhapura", "luxury", "The Lake Forest Hotel", "Hotel"),
  stay("anuradhapura", "luxury", "Rajarata White Palace", "Hotel"),
  // polonnaruwa
  stay("polonnaruwa", "budget", "Kumari Guest House", "Guest house"),
  stay("polonnaruwa", "mid-range", "Agbo Hotel Polonnaruwa", "Hotel", [8.006153, 80.9240272]),
  stay("polonnaruwa", "mid-range", "Hotel Sudu Araliya", "Hotel"),
  stay("polonnaruwa", "mid-range", "Tishan Holiday Resort", "Resort"),
  stay("polonnaruwa", "mid-range", "Seyara Holiday Resort", "Resort"),
  stay("polonnaruwa", "mid-range", "My Home Guest", "Hotel"),
  stay("polonnaruwa", "mid-range", "Thisara Guest House", "Guest house"),
  stay("polonnaruwa", "luxury", "Ekho Lake House", "Hotel"),
  stay("polonnaruwa", "luxury", "Wildescape Polonnaruwa", "Hotel"),
  // trincomalee
  stay("trincomalee", "mid-range", "Trinco Blu by Cinnamon", "Hotel"),
  stay("trincomalee", "mid-range", "Anantamaa Hotel", "Hotel"),
  stay("trincomalee", "mid-range", "JKAB Beach Resort", "Resort"),
  stay("trincomalee", "mid-range", "Pigeon Island Beach Resort", "Resort"),
  stay("trincomalee", "mid-range", "Sea Lotus Park Hotel", "Hotel"),
  stay("trincomalee", "luxury", "Uga Jungle Beach", "Hotel"),
  // jaffna
  stay("jaffna", "budget", "Green Grass Hotel & Restaurant", "Hotel"),
  stay("jaffna", "budget", "Pillaiyar Inn Hotel", "Hotel"),
  stay("jaffna", "budget", "Subhas Hotel", "Hotel"),
  stay("jaffna", "mid-range", "Jetwing Jaffna", "Hotel"),
  stay("jaffna", "mid-range", "North Gate by Jetwing", "Hotel"),
  stay("jaffna", "mid-range", "Valampuri Hotel", "Hotel"),
  stay("jaffna", "mid-range", "Tilko Jaffna City Hotel", "Hotel"),
  stay("jaffna", "mid-range", "Jaffna Heritage Hotel", "Hotel"),
  stay("jaffna", "luxury", "The Thinnai", "Hotel"),
  // galle
  stay("galle", "mid-range", "The Bartizan", "Hotel"),
  stay("galle", "mid-range", "Fort Bazaar", "Hotel"),
  stay("galle", "mid-range", "Le Jardin du Fort", "Hotel"),
  stay("galle", "mid-range", "Secret Garden Galle", "Hotel"),
  stay("galle", "mid-range", "The Lady Hill", "Hotel"),
  stay("galle", "mid-range", "Radisson Blu Resort Galle", "Resort"),
  stay("galle", "luxury", "Amangalla", "Hotel", [6.0293,80.2170]),
  stay("galle", "luxury", "Galle Fort Hotel", "Hotel"),
  stay("galle", "luxury", "The Galle Fort House", "Hotel"),
  stay("galle", "luxury", "Le Grand Galle", "Hotel"),
  stay("galle", "luxury", "Jetwing Lighthouse", "Hotel"),
  stay("galle", "luxury", "The Fortress Resort & Spa", "Resort"),
  // unawatuna
  stay("unawatuna", "budget", "Hotel J", "Hotel"),
  stay("unawatuna", "mid-range", "Thaproban Pavilion Resort", "Resort"),
  stay("unawatuna", "mid-range", "Rockside Cabanas", "Cabanas"),
  stay("unawatuna", "mid-range", "Araliya Beach Resort", "Resort"),
  stay("unawatuna", "mid-range", "Dalawella Beach Resort", "Resort"),
  stay("unawatuna", "luxury", "Thaproban Pavilion Waves", "Hotel"),
  stay("unawatuna", "luxury", "Owl and the Pussycat", "Hotel"),
  stay("unawatuna", "luxury", "Kahanda Kanda", "Hotel"),
  // hikkaduwa
  stay("hikkaduwa", "mid-range", "Hikka Tranz by Cinnamon", "Hotel"),
  stay("hikkaduwa", "mid-range", "Coral Rock by Bansei", "Hotel"),
  stay("hikkaduwa", "mid-range", "Citrus Hikkaduwa", "Hotel"),
  stay("hikkaduwa", "mid-range", "Avenra Beach Hikkaduwa", "Hotel"),
  // mirissa
  stay("mirissa", "mid-range", "Paradise Beach Club", "Hotel"),
  stay("mirissa", "mid-range", "Mandara Resort", "Resort"),
  stay("mirissa", "mid-range", "Sri Sudasuneya", "Hotel"),
  stay("mirissa", "mid-range", "Glamour Mirissa", "Hotel"),
  stay("mirissa", "luxury", "Lantern Boutique Hotel", "Hotel"),
  stay("mirissa", "luxury", "Sri Sharavi Beach Villas", "Villa"),
  // yala
  stay("yala", "mid-range", "Cinnamon Wild Yala", "Hotel"),
  stay("yala", "mid-range", "Jetwing Yala", "Hotel"),
  stay("yala", "mid-range", "Kithala Resort", "Resort"),
  stay("yala", "mid-range", "Chaarya Resort & Spa", "Resort"),
  stay("yala", "luxury", "Wild Coast Tented Lodge", "Lodge"),
  stay("yala", "luxury", "Chena Huts", "Hotel"),
  stay("yala", "luxury", "Leopard Trails", "Hotel"),
  stay("yala", "luxury", "Uga Chena Huts", "Hotel"),
  // arugam-bay
  stay("arugam-bay", "mid-range", "Jetwing Surf", "Hotel"),
  stay("arugam-bay", "mid-range", "The Spice Trail", "Hotel"),
  stay("arugam-bay", "mid-range", "Whiskey Point Resort", "Resort"),
  stay("arugam-bay", "mid-range", "Arugam Bay Roccos", "Hotel"),
  // udawalawe
  stay("udawalawe", "mid-range", "Kottawatta River Bank Resort", "Resort"),
  stay("udawalawe", "mid-range", "Grand Udawalawe Safari Resort", "Resort"),
];
