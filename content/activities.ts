import type { Intensity, PriceBand } from "@/lib/types";

/**
 * Activity catalogue for the /activities page.
 *
 * DRAFT CONTENT. Locations, durations, difficulty and price bands are general,
 * indicative values drafted from public knowledge, NOT confirmed by Noble Path
 * or by any operator. They must be reviewed and corrected before the page is
 * presented as fact (see D-20 in docs/decisions/architecture-decisions.md).
 *
 * Prices are bands, never figures: the site only carries indicative bands
 * (requirements §7.4), so a number here would be inventing data.
 *
 * Deliberately separate from `content/experiences.ts`: those are the fully
 * written, seasonal, photographed experiences used by the planner. These are a
 * broad catalogue of things to do.
 */

export interface ActivityCategory {
  readonly id: string;
  readonly label: string;
}

export const activityCategories: readonly ActivityCategory[] = [
  { id: "beaches", label: "Beaches and beach activities" },
  { id: "water-sports", label: "Water sports" },
  { id: "wildlife", label: "Wildlife safaris" },
  { id: "hiking", label: "Hiking and trekking" },
  { id: "adventure", label: "Adventure activities" },
  { id: "trains-tours", label: "Scenic trains, tuk-tuk and cycling tours" },
  { id: "tea", label: "Tea and plantation experiences" },
  { id: "food", label: "Food and culinary experiences" },
  { id: "culture", label: "Cultural and heritage tours" },
  { id: "village-life", label: "Village and local life" },
  { id: "arts-crafts", label: "Traditional arts and crafts" },
  { id: "eco", label: "Nature and eco tourism" },
  { id: "birds", label: "Bird watching tours" },
  { id: "wellness", label: "Ayurveda and wellness" },
  { id: "photography", label: "Photography experiences" },
  { id: "camping", label: "Camping and outdoor experiences" },
  { id: "colombo", label: "Colombo and city tours" },
  { id: "kandy", label: "Kandy experiences" },
  { id: "hill-country", label: "Ella and Hill Country" },
  { id: "south", label: "Galle and the Southern Coast" },
  { id: "north", label: "Jaffna and the North" },
  { id: "east", label: "Trincomalee and the East" },
  { id: "family", label: "Family activities" },
  { id: "couples", label: "Couples and honeymoon" },
  { id: "shopping", label: "Shopping and local markets" },
  { id: "fishing", label: "Fishing experiences" },
  { id: "dining", label: "Romantic dining" },
];

export interface Activity {
  readonly slug: string;
  readonly name: string;
  readonly categoryId: string;
  /** Where it is usually done. Plain text, not a destination slug. */
  readonly location: string;
  /** Typical length, as text, because it is often a range or "Overnight". */
  readonly duration: string;
  readonly difficulty: Intensity;
  readonly priceBand: PriceBand;
}

const E: Intensity = "easy";
const M: Intensity = "moderate";
const C: Intensity = "challenging";

type Row = readonly [
  name: string,
  location: string,
  duration: string,
  difficulty: Intensity,
  priceBand: PriceBand,
];

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const group = (categoryId: string, rows: readonly Row[]): readonly Activity[] =>
  rows.map(([name, location, duration, difficulty, priceBand]) => ({
    slug: slugify(name),
    name,
    categoryId,
    location,
    duration,
    difficulty,
    priceBand,
  }));

export const activities: readonly Activity[] = [
  ...group("beaches", [
    ["Beach relaxation", "Unawatuna", "Half day", E, "$"],
    ["Swimming and snorkelling", "Hikkaduwa", "2 to 3 hours", E, "$"],
    ["Beach picnic", "Tangalle", "Half day", E, "$"],
    ["Beach camping", "Kalpitiya", "Overnight", M, "$$"],
    ["Beach volleyball", "Arugam Bay", "1 to 2 hours", E, "$"],
    ["Beach football", "Negombo", "1 to 2 hours", E, "$"],
    ["Beach walk", "Bentota", "1 to 2 hours", E, "$"],
    ["Sunrise and sunset on the beach", "Mirissa", "1 to 2 hours", E, "$"],
    ["Beach photography", "Tangalle", "2 to 3 hours", E, "$"],
    ["Beach hopping", "Unawatuna to Mirissa", "Full day", E, "$$"],
    ["Coastal cycling", "Galle to Weligama", "Half day", M, "$"],
  ]),
  ...group("water-sports", [
    ["Surfing lesson", "Weligama and Arugam Bay", "2 hours", M, "$$"],
    ["Scuba diving", "Hikkaduwa", "Half day", M, "$$"],
    ["Jet skiing", "Bentota", "30 to 60 minutes", E, "$$"],
    ["Catamaran sailing", "Negombo", "2 to 3 hours", E, "$$"],
    ["Lagoon kayaking", "Koggala", "2 to 3 hours", E, "$"],
  ]),
  ...group("wildlife", [
    ["Yala National Park safari", "Yala", "Half day", E, "$$"],
    ["Udawalawe elephant safari", "Udawalawe", "Half day", E, "$$"],
    ["Minneriya elephant gathering safari", "Minneriya", "Half day", E, "$$"],
    ["Bundala wetland safari", "Bundala", "Half day", E, "$$"],
  ]),
  ...group("hiking", [
    ["Adam's Peak climb", "Nallathanniya", "Overnight", C, "$"],
    ["Ella Rock hike", "Ella", "3 to 4 hours", M, "$"],
    ["Knuckles Range trek", "Knuckles Mountain Range", "Full day", C, "$$"],
    ["Waterfall trekking", "Diyaluma Falls, near Koslanda", "Half day", M, "$"],
    ["Tea estate trekking", "Nuwara Eliya", "2 to 3 hours", E, "$"],
  ]),
  ...group("adventure", [
    ["White-water rafting", "Kitulgala", "2 to 3 hours", M, "$$"],
    ["Canyoning", "Kitulgala", "Half day", C, "$$"],
    ["Ziplining", "Ella", "1 to 2 hours", M, "$$"],
    ["Mountain biking", "Kandy and the Knuckles", "Half day", M, "$$"],
    ["Cave exploration", "Ravana Cave, Ella", "1 to 2 hours", E, "$"],
  ]),
  ...group("trains-tours", [
    ["Kandy to Ella scenic train", "Kandy to Ella", "6 to 7 hours", E, "$"],
    ["Tuk-tuk city tour", "Colombo", "Half day", E, "$"],
    ["Cycling tour of the ancient city", "Polonnaruwa", "Half day", E, "$"],
  ]),
  ...group("tea", [
    ["Tea factory tour", "Nuwara Eliya", "1 to 2 hours", E, "$"],
    ["Tea plucking", "Nuwara Eliya", "1 to 2 hours", E, "$"],
    ["Tea tasting", "Ella and Nuwara Eliya", "1 hour", E, "$"],
  ]),
  ...group("food", [
    ["Cooking class", "Galle", "3 to 4 hours", E, "$$"],
    ["Street food tour", "Colombo", "3 hours", E, "$"],
    ["Seafood experience", "Negombo", "2 hours", E, "$$"],
    ["Private chef dinner", "At your stay", "2 to 3 hours", E, "$$$"],
  ]),
  ...group("culture", [
    ["Cultural Triangle heritage tour", "Sigiriya, Dambulla and Polonnaruwa", "Full day", M, "$$"],
    ["Sacred city tour", "Anuradhapura", "Half day", E, "$"],
    ["Sigiriya Rock climb", "Sigiriya", "2 to 3 hours", M, "$"],
  ]),
  ...group("village-life", [
    ["Village life experience", "Sigiriya", "Half day", E, "$"],
    ["Home-cooked lunch with a village family", "Sigiriya", "3 hours", E, "$"],
  ]),
  ...group("arts-crafts", [
    ["Batik workshop", "Kandy", "2 hours", E, "$"],
    ["Traditional mask carving", "Ambalangoda", "1 to 2 hours", E, "$"],
  ]),
  ...group("eco", [
    ["Sinharaja rainforest walk", "Sinharaja", "Half day", M, "$$"],
    ["Mangrove boat ride", "Madu River, Balapitiya", "2 hours", E, "$"],
  ]),
  ...group("birds", [
    ["Bird watching in Sinharaja", "Sinharaja", "Half day", M, "$$"],
    ["Lagoon bird watching", "Kalametiya", "Half day", E, "$$"],
  ]),
  ...group("wellness", [
    ["Ayurveda treatment day", "Bentota", "Full day", E, "$$$"],
    ["Yoga and meditation session", "Ella", "1 to 2 hours", E, "$"],
    ["Spa and massage", "Unawatuna", "1 to 2 hours", E, "$$"],
  ]),
  ...group("photography", [
    ["Sunrise photography walk", "Little Adam's Peak, Ella", "2 to 3 hours", E, "$"],
    ["Wildlife photography safari", "Yala", "Half day", E, "$$$"],
    ["Street photography tour", "Pettah, Colombo", "3 hours", E, "$"],
  ]),
  ...group("camping", [
    ["Hill country camping", "Nuwara Eliya", "Overnight", M, "$$"],
    ["Forest camping and campfire", "Knuckles Mountain Range", "Overnight", M, "$$"],
  ]),
  ...group("colombo", [
    ["Colombo city tour", "Colombo", "Half day", E, "$"],
    ["Colonial Colombo walking tour", "Colombo Fort", "2 to 3 hours", E, "$"],
  ]),
  ...group("kandy", [
    ["Temple of the Tooth visit", "Kandy", "1 to 2 hours", E, "$"],
    ["Kandyan cultural dance show", "Kandy", "1 hour", E, "$"],
    ["Royal Botanic Gardens visit", "Peradeniya, near Kandy", "2 to 3 hours", E, "$"],
  ]),
  ...group("hill-country", [
    ["Nine Arch Bridge visit", "Ella", "1 to 2 hours", E, "$"],
    ["Little Adam's Peak walk", "Ella", "1 to 2 hours", E, "$"],
    ["Horton Plains and World's End walk", "Horton Plains", "Half day", M, "$$"],
    ["Nuwara Eliya sightseeing", "Nuwara Eliya", "Half day", E, "$"],
  ]),
  ...group("south", [
    ["Galle Fort walking tour", "Galle", "2 hours", E, "$"],
    ["Whale watching", "Mirissa", "Half day", E, "$$"],
    ["Turtle hatchery visit", "Kosgoda", "1 hour", E, "$"],
  ]),
  ...group("north", [
    ["Jaffna Fort and temple tour", "Jaffna", "Half day", E, "$"],
    ["Delft Island day trip", "Delft Island", "Full day", M, "$$"],
    ["Jaffna town by bicycle", "Jaffna", "Half day", E, "$"],
  ]),
  ...group("east", [
    ["Pigeon Island snorkelling", "Nilaveli", "Half day", E, "$$"],
    ["Koneswaram Temple visit", "Trincomalee", "1 hour", E, "$"],
    ["Pasikuda beach day", "Pasikuda", "Half day", E, "$"],
  ]),
  ...group("family", [
    ["Elephant Transit Home visit", "Udawalawe", "1 hour", E, "$"],
    ["Glass-bottom boat ride", "Hikkaduwa", "1 hour", E, "$"],
    ["Family beach day", "Bentota", "Full day", E, "$"],
  ]),
  ...group("couples", [
    ["Sunset catamaran cruise", "Negombo", "2 hours", E, "$$"],
    ["Couples' spa retreat", "Bentota", "2 to 3 hours", E, "$$$"],
    ["Hot-air balloon flight", "Sigiriya and Dambulla", "1 hour", E, "$$$"],
  ]),
  ...group("shopping", [
    ["Pettah market walk", "Colombo", "2 to 3 hours", E, "$"],
    ["Gem market visit", "Ratnapura", "Half day", E, "$"],
    ["Kandy market visit", "Kandy", "1 to 2 hours", E, "$"],
  ]),
  ...group("fishing", [
    ["Stilt fishing experience", "Koggala", "1 to 2 hours", E, "$"],
    ["Fishing boat trip", "Mirissa", "Half day", E, "$"],
    ["Deep-sea fishing", "Negombo", "Half day", M, "$$$"],
  ]),
  ...group("dining", [
    ["Candlelit beach dinner", "Tangalle", "2 to 3 hours", E, "$$$"],
    ["Rooftop dinner in the fort", "Galle", "2 hours", E, "$$$"],
    ["Private jungle dinner", "Sigiriya", "2 to 3 hours", E, "$$$"],
  ]),
];

export function getActivitiesByCategory(categoryId: string): readonly Activity[] {
  return activities.filter((activity) => activity.categoryId === categoryId);
}
