import type { RegionInfo } from "@/lib/types";

/**
 * The seven planning regions used across the site (FR-1.2).
 *
 * Order is deliberate and is the order the UI should render filters in: it runs
 * roughly the way a visitor travels — arrival coast, cultural interior, hills,
 * then the coasts and the far north.
 */
export const regions: readonly RegionInfo[] = [
  {
    slug: "west-coast",
    name: "West Coast",
    character: "Where the island begins and ends",
    description:
      "Almost every trip starts here. Bandaranaike International Airport sits just outside Negombo, half an hour from the beach and about ninety minutes from Colombo. The west coast is the island's commercial spine: Colombo's colonial arcades and rooftop bars, Negombo's fishing lagoon and Dutch canal, and a string of resort beaches heading south. It is at its calmest between December and March; during the south-west monsoon the sea gets rough and swimming is often unwise.",
  },
  {
    slug: "cultural-triangle",
    name: "Cultural Triangle",
    character: "Two thousand years of capitals, rock and ritual",
    description:
      "The dry-zone plain between Anuradhapura, Polonnaruwa and Kandy holds the remains of the Sinhalese kingdoms — vast reservoir-fed cities, monastic complexes, painted caves and the rock citadel of Sigiriya. Five of Sri Lanka's eight UNESCO World Heritage Sites are here. It is hot, flat and easy to drive around, and it is the one region nearly every first-time itinerary includes. The driest, clearest months are roughly May to September.",
  },
  {
    slug: "hill-country",
    name: "Hill Country",
    character: "Tea, mist, and the world's most photographed train",
    description:
      "Climb out of the plains and the temperature drops ten degrees. The hill country is terraced tea estates, waterfalls, colonial hill stations and the blue train that grinds between Kandy, Nuwara Eliya and Ella. Kandy holds the Temple of the Sacred Tooth Relic and the country's most important Buddhist festival. Bring a jacket: Nuwara Eliya can fall below 10°C at night, and Horton Plains is colder still before dawn.",
  },
  {
    slug: "south-coast",
    name: "South Coast",
    character: "Fort walls, whale water and long warm beaches",
    description:
      "From Hikkaduwa round to Tangalle the coast is a run of bays, reefs, surf points and fishing towns, anchored by the Dutch-built ramparts of Galle Fort. Whale watching leaves from Mirissa, beginner surf from Weligama, and the Southern Expressway puts the whole stretch within two hours of Colombo. This coast follows the south-west pattern: superb from December to March, wet and rough from May to September.",
  },
  {
    slug: "east-coast",
    name: "East Coast",
    character: "The other season — flat sand, warm sea, long right-handers",
    description:
      "When the south-west is being hammered by rain, the east is at its best. Arugam Bay is one of Asia's great surf points from May to September; Trincomalee and Nilaveli offer some of the calmest, clearest water in the country and the coral of Pigeon Island. The east is quieter, more spread out and less developed than the south, which is exactly why people who have been to Sri Lanka before keep going back.",
  },
  {
    slug: "north",
    name: "North",
    character: "A different island entirely",
    description:
      "The Jaffna peninsula is flat, bright, palmyra-covered and culturally Tamil — its own cuisine, its own temples, its own music. Reopened to travel since the end of the civil war and reachable by a comfortable overnight-free train from Colombo, it rewards travellers who have time to spare and a genuine interest in the country beyond the beaches. Visit between February and September; the north-east monsoon soaks it from October to January.",
  },
  {
    slug: "wilderness",
    name: "Wilderness & National Parks",
    character: "Leopards, elephants and very early mornings",
    description:
      "Sri Lanka has the highest leopard density in the world in Yala's Block 1, near-guaranteed wild elephant sightings at Udawalawe, and the empty, water-laced scrub of Wilpattu. Parks are entered by jeep at dawn or mid-afternoon, and the best months differ from park to park. Yala's Block 1 usually closes for around six weeks from early September for maintenance, so always confirm before you build a trip around it.",
  },
] as const;

/** Convenience lookup used by `lib/content.ts` and by region pages. */
export const regionBySlug: Readonly<Record<RegionInfo["slug"], RegionInfo>> =
  Object.fromEntries(regions.map((r) => [r.slug, r])) as Record<
    RegionInfo["slug"],
    RegionInfo
  >;
