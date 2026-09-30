# Photography credits register

Source of truth for where every self-hosted photograph came from, and under what licence
(ADR-006). The site renders the same information at **`/credits`** (`app/credits/page.tsx`),
derived from the `credit` / `sourceUrl` / `licenceUrl` fields in `content/`. That page is
how the CC BY / CC BY-SA attribution obligation is met; this register is the audit trail.

**Rule:** a photograph may not be referenced from content until it has a row here and its
`ImageAsset` carries `credit`, `sourceUrl` and (for CC licences) `licenceUrl`.

## Destination photographs (D-26, sourced 2026-09-29)

Sourced from Wikimedia Commons, filtered to landscape JPEGs of 2000 px or wider under
CC0 / public domain / CC BY / CC BY-SA. Each one was picked by eye for cinematic light and
composition, then resized to 2400 px wide (JPEG q82) with EXIF stripped. The original
dimensions are shown below.

| Slug | File | Commons source | Author | Licence | Original size |
|---|---|---|---|---|---|
| adams-peak | `public/images/destinations/adams-peak.jpg` | [File:Sunrise from the top of Sri Pada (Adam's Peak) Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Sunrise_from_the_top_of_Sri_Pada_(Adam%27s_Peak)_Sri_Lanka.jpg) | Eli Solidum | CC BY-SA 4.0 | 4032×3024 |
| anuradhapura | `public/images/destinations/anuradhapura.jpg` | [File:Ruwanweli Saya 1.jpg](https://commons.wikimedia.org/wiki/File:Ruwanweli_Saya_1.jpg) | KennyOMG | CC BY-SA 4.0 | 5000×3000 |
| arugam-bay | `public/images/destinations/arugam-bay.jpg` | [File:DSC 5813-2.jpg](https://commons.wikimedia.org/wiki/File:DSC_5813-2.jpg) | Lakshitha Vithanage | CC BY-SA 4.0 | 5960×3701 |
| colombo | `public/images/destinations/colombo.jpg` | [File:Stunning Night View of Colombo City Skyline.jpg](https://commons.wikimedia.org/wiki/File:Stunning_Night_View_of_Colombo_City_Skyline.jpg) | Thilina Alagiyawanna | CC0 | 5929×3953 |
| dambulla | `public/images/destinations/dambulla.jpg` | [File:Buddha Dambulla 6.jpg](https://commons.wikimedia.org/wiki/File:Buddha_Dambulla_6.jpg) | Philip Nalangan | CC BY 4.0 | 3626×2592 |
| ella | `public/images/destinations/ella-nine-arch.jpg` | [File:Nine Arches Bridge, Demodara 2023-04-29-2.jpg](https://commons.wikimedia.org/wiki/File:Nine_Arches_Bridge,_Demodara_2023-04-29-2.jpg) | Alexey Komarov | CC BY-SA 4.0 | 4043×2695 |
| galle | `public/images/destinations/galle.jpg` | [File:Galle Lighthouse 1.jpg](https://commons.wikimedia.org/wiki/File:Galle_Lighthouse_1.jpg) | Philip Nalangan | CC BY 4.0 | 3872×2433 |
| hikkaduwa | `public/images/destinations/hikkaduwa.jpg` | [File:Photo 8-23-17, 5 50 14 PM.jpg](https://commons.wikimedia.org/wiki/File:Photo_8-23-17,_5_50_14_PM.jpg) | Thatslguy | CC BY-SA 4.0 | 3264×2448 |
| horton-plains | `public/images/destinations/horton-plains.jpg` | [File:Horton Plains River.jpg](https://commons.wikimedia.org/wiki/File:Horton_Plains_River.jpg) | A-wiki-guest-user | CC BY-SA 4.0 | 3930×2550 |
| jaffna | `public/images/destinations/jaffna.jpg` | [File:Nallur Kandasamy front entrance.jpg](https://commons.wikimedia.org/wiki/File:Nallur_Kandasamy_front_entrance.jpg) | Gane Kumaraswamy | CC BY-SA 2.0 | 2100×1500 |
| kandy | `public/images/destinations/kandy.jpg` | [File:Sacred Tooth Relic Temple 1.jpg](https://commons.wikimedia.org/wiki/File:Sacred_Tooth_Relic_Temple_1.jpg) | Philip Nalangan | CC BY 4.0 | 3872×2592 |
| mirissa | `public/images/destinations/mirissa.jpg` | [File:Amazing Coconut Tree Hill.jpg](https://commons.wikimedia.org/wiki/File:Amazing_Coconut_Tree_Hill.jpg) | Sachin Kaveesha Fernando | CC BY-SA 4.0 | 3992×2992 |
| negombo | `public/images/destinations/negombo.jpg` | [File:Negombo, Sri Lanka - panoramio (11).jpg](https://commons.wikimedia.org/wiki/File:Negombo,_Sri_Lanka_-_panoramio_(11).jpg) | Luboš Holič | CC BY-SA 3.0 | 3264×2448 |
| nuwara-eliya | `public/images/destinations/nuwara-eliya.jpg` | [File:Morning dew mist.jpg](https://commons.wikimedia.org/wiki/File:Morning_dew_mist.jpg) | Kapila Perera | CC BY-SA 4.0 | 5184×3456 |
| polonnaruwa | `public/images/destinations/polonnaruwa.jpg` | [File:Gal Vihara Polonnaruwa 1.jpg](https://commons.wikimedia.org/wiki/File:Gal_Vihara_Polonnaruwa_1.jpg) | Philip Nalangan | CC BY 4.0 | 3728×2448 |
| trincomalee | `public/images/destinations/trincomalee.jpg` | [File:Sun Set of Koneshwaram Kowil - Trincomalee Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Sun_Set_of_Koneshwaram_Kowil_-_Trincomalee_Sri_Lanka.jpg) | Nishan Silva | CC BY-SA 4.0 | 10154×6770 |
| udawalawe | `public/images/destinations/udawalawe.jpg` | [File:Parc national de Uda Walawa Sri-Lanka (4).jpg](https://commons.wikimedia.org/wiki/File:Parc_national_de_Uda_Walawa_Sri-Lanka_(4).jpg) | PIERRE ANDRE LECLERCQ | CC BY-SA 4.0 | 4912×3264 |
| unawatuna | `public/images/destinations/unawatuna.jpg` | [File:Unawatuna.jpg](https://commons.wikimedia.org/wiki/File:Unawatuna.jpg) | Bernard Gagnon | CC BY-SA 3.0 | 2189×1495 |
| wilpattu | `public/images/destinations/wilpattu.jpg` | [File:A mother and cub sloth bear crossing the road in Wilpattu National Park.jpg](https://commons.wikimedia.org/wiki/File:A_mother_and_cub_sloth_bear_crossing_the_road_in_Wilpattu_National_Park.jpg) | Wenuri | CC BY-SA 4.0 | 3040×1932 |
| yala | `public/images/destinations/yala.jpg` | [File:Srilankan leopard in Yala National Park.jpg](https://commons.wikimedia.org/wiki/File:Srilankan_leopard_in_Yala_National_Park.jpg) | AdrianRanasinghe | CC BY-SA 4.0 | 5184×3456 |
| sigiriya | `public/images/hero/sigiriya-sunrise-2.jpg` | Pexels | Marina Zvada | Pexels licence | — |

**Share-alike note.** The CC BY-SA images are used unmodified apart from resizing and
re-encoding. The resize does not create an adaptation under the licence, so it adds no
share-alike obligation for the site's own code or copy. Any image that is edited (a crop
with changed meaning, a composite or a grade) must be shared back under the same licence.

**Judgement calls (reviewable).** Several picks are the best clean option on Commons rather
than a perfect one, and are the first candidates to replace with commissioned photography:
- **arugam-bay:** a sunrise over surf that the Commons description places at Arugam Bay.
  The backup is `File:Beach of Arugam Bay.jpg` (CC0).
- **nuwara-eliya:** Hatton tea country, which is in Nuwara Eliya District but is not the
  town itself.
- **jaffna:** overcast light, and a source only 2100 px wide.
- **unawatuna:** midday light, and a source only 2189 px wide.
- **wilpattu:** flat light.
- **horton-plains:** the grasslands rather than World's End.

## Experience photographs (D-27, sourced 2026-09-29)

Same sourcing and processing as the destination set, and none repeats a destination
photograph. Where Commons allows, each photograph shows the activity rather than the town.
`sri-lankan-cooking-class.jpg` is trimmed 5% at the bottom and 4% at the right to remove a
stray foot at the edge. That is still a resize and trim, not an adaptation.

| Slug | File | Commons source | Author | Licence | Original size |
|---|---|---|---|---|---|
| adams-peak-night-climb | `public/images/experiences/adams-peak-night-climb.jpg` | [File:Shadow of the peak when sun rising.jpg](https://commons.wikimedia.org/wiki/File:Shadow_of_the_peak_when_sun_rising.jpg) | Sameera Madusanka | CC BY-SA 4.0 | 5438×3625 |
| anuradhapura-sacred-city-tour | `public/images/experiences/anuradhapura-sacred-city-tour.jpg` | [File:The Jetavanarama stupa.jpg](https://commons.wikimedia.org/wiki/File:The_Jetavanarama_stupa.jpg) | MinugaV | CC BY-SA 4.0 | 3456×2304 |
| arugam-bay-surf-session | `public/images/experiences/arugam-bay-surf-session.jpg` | [File:Panama, Beach, 2025-07 CN-02.jpg](https://commons.wikimedia.org/wiki/File:Panama,_Beach,_2025-07_CN-02.jpg) | Steffen Schmitz | CC BY-SA 4.0 | 4915×3295 |
| ayurveda-wellness-retreat | `public/images/experiences/ayurveda-wellness-retreat.jpg` | [File:Spices for Sale - Negombo - Sri Lanka (14050176727).jpg](https://commons.wikimedia.org/wiki/File:Spices_for_Sale_-_Negombo_-_Sri_Lanka_(14050176727).jpg) | Adam Jones from Kelowna, BC, Canada | CC BY-SA 2.0 | 3648×2736 |
| colombo-street-food-walk | `public/images/experiences/colombo-street-food-walk.jpg` | [File:Floating Market Lk.jpg](https://commons.wikimedia.org/wiki/File:Floating_Market_Lk.jpg) | Heshan93 | CC BY-SA 4.0 | 4128×3096 |
| dambulla-cave-temple | `public/images/experiences/dambulla-cave-temple.jpg` | [File:Statue of the Buddha reclining in the Dambulla cave temple, Dambulla, Sri Lanka, 20260201 1419 8127.jpg](https://commons.wikimedia.org/wiki/File:Statue_of_the_Buddha_reclining_in_the_Dambulla_cave_temple,_Dambulla,_Sri_Lanka,_20260201_1419_8127.jpg) | Jakub Hałun | CC BY 4.0 | 5736×3829 |
| ella-rock-sunrise-hike | `public/images/experiences/ella-rock-sunrise-hike.jpg` | [File:The beautiful sun rise in ELLA Srilanka.jpg](https://commons.wikimedia.org/wiki/File:The_beautiful_sun_rise_in_ELLA_Srilanka.jpg) | Thavi21 | CC BY-SA 4.0 | 6000×4000 |
| ella-yoga-morning | `public/images/experiences/ella-yoga-morning.jpg` | [File:Ella Gap (Valley), mountains of Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Ella_Gap_(Valley),_mountains_of_Sri_Lanka.jpg) | Vyacheslav Argenberg | CC BY 4.0 | 3072×2048 |
| galle-fort-walking-tour | `public/images/experiences/galle-fort-walking-tour.jpg` | [File:GALLE FORT AND LIGHTHOUSE GALLE SRI LANKA JAN2013 (8510167078).jpg](https://commons.wikimedia.org/wiki/File:GALLE_FORT_AND_LIGHTHOUSE_GALLE_SRI_LANKA_JAN2013_(8510167078).jpg) | calflier001 | CC BY-SA 2.0 | 4106×2967 |
| hikkaduwa-reef-snorkelling | `public/images/experiences/hikkaduwa-reef-snorkelling.jpg` | [File:Follow the sea turtle.jpg](https://commons.wikimedia.org/wiki/File:Follow_the_sea_turtle.jpg) | Jithma Kalingu | CC BY-SA 4.0 | 4608×3456 |
| horton-plains-worlds-end | `public/images/experiences/horton-plains-worlds-end.jpg` | [File:World's End 2.jpg](https://commons.wikimedia.org/wiki/File:World%27s_End_2.jpg) | Schnobby | CC BY-SA 3.0 | 4000×2672 |
| jaffna-peninsula-tour | `public/images/experiences/jaffna-peninsula-tour.jpg` | [File:Sunset Over Lagoon2.jpg](https://commons.wikimedia.org/wiki/File:Sunset_Over_Lagoon2.jpg) | Indi Samarajiva | CC BY 2.0 | 3648×2736 |
| kandy-to-ella-train | `public/images/experiences/kandy-to-ella-train.jpg` | [File:Railway track from Kandy to Ella, Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Railway_track_from_Kandy_to_Ella,_Sri_Lanka.jpg) | Deshanktd | CC BY-SA 4.0 | 4928×3264 |
| koneswaram-temple-visit | `public/images/experiences/koneswaram-temple-visit.jpg` | [File:Koneswaram Temple - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Koneswaram_Temple_-_panoramio.jpg) | Alexey Komarov | CC BY 3.0 | 4601×3067 |
| little-adams-peak-and-nine-arch | `public/images/experiences/little-adams-peak-and-nine-arch.jpg` | [File:Little adams park sri lanka.jpg](https://commons.wikimedia.org/wiki/File:Little_adams_park_sri_lanka.jpg) | Hs Lamahewage | CC BY-SA 4.0 | 4288×2848 |
| minneriya-elephant-gathering | `public/images/experiences/minneriya-elephant-gathering.jpg` | [File:Elephants gather for water in the plains at Minneriya National Park in Sri Lanka. It is one of the largest gathering of - Flickr - Al Jazeera English.jpg](https://commons.wikimedia.org/wiki/File:Elephants_gather_for_water_in_the_plains_at_Minneriya_National_Park_in_Sri_Lanka._It_is_one_of_the_largest_gathering_of_-_Flickr_-_Al_Jazeera_English.jpg) | Al Jazeera English | CC BY-SA 2.0 | 5616×3744 |
| mirissa-whale-watching | `public/images/experiences/mirissa-whale-watching.jpg` | [File:Big blue fish 2.jpg](https://commons.wikimedia.org/wiki/File:Big_blue_fish_2.jpg) | TatianaPashko | CC BY 4.0 | 3456×2304 |
| negombo-lagoon-and-canal-boat | `public/images/experiences/negombo-lagoon-and-canal-boat.jpg` | [File:Boats Anchored in Negambo Lagoon.jpg](https://commons.wikimedia.org/wiki/File:Boats_Anchored_in_Negambo_Lagoon.jpg) | Deshan Ruhunage | CC BY-SA 4.0 | 4000×3000 |
| pidurangala-sunrise | `public/images/experiences/pidurangala-sunrise.jpg` | [File:Sunrise at Sigiriya.jpg](https://commons.wikimedia.org/wiki/File:Sunrise_at_Sigiriya.jpg) | Abishek Palraj | CC BY-SA 4.0 | 5472×3648 |
| pigeon-island-snorkelling | `public/images/experiences/pigeon-island-snorkelling.jpg` | [File:Dive in pigeon island.jpg](https://commons.wikimedia.org/wiki/File:Dive_in_pigeon_island.jpg) | Kalana Weeramuni | CC BY-SA 4.0 | 4000×3000 |
| polonnaruwa-cycle-tour | `public/images/experiences/polonnaruwa-cycle-tour.jpg` | [File:Polonnaruwa quadrangle Sri Lanka 2.jpg](https://commons.wikimedia.org/wiki/File:Polonnaruwa_quadrangle_Sri_Lanka_2.jpg) | Stuart Pinkney | CC BY 2.0 | 3008×2000 |
| royal-botanic-gardens-peradeniya | `public/images/experiences/royal-botanic-gardens-peradeniya.jpg` | [File:Conservatory near the Palmyra palm avenue.jpg](https://commons.wikimedia.org/wiki/File:Conservatory_near_the_Palmyra_palm_avenue.jpg) | Royal Botanic Gardens, Peradeniya | CC BY-SA 4.0 | 5760×3840 |
| sigiriya-sunrise-climb | `public/images/experiences/sigiriya-sunrise-climb.jpg` | [File:Sigiriya 0168.jpg](https://commons.wikimedia.org/wiki/File:Sigiriya_0168.jpg) | Michael Gunther | CC BY-SA 4.0 | 2592×1944 |
| sri-lankan-cooking-class | `public/images/experiences/sri-lankan-cooking-class.jpg` | [File:Sri Lanka Trip -104 (32115057607).jpg](https://commons.wikimedia.org/wiki/File:Sri_Lanka_Trip_-104_(32115057607).jpg) | Weldon Kennedy from London, UK | CC BY 2.0 | 5472×3648 |
| stilt-fishing-koggala | `public/images/experiences/stilt-fishing-koggala.jpg` | [File:Riti Panna.jpg](https://commons.wikimedia.org/wiki/File:Riti_Panna.jpg) | Ellis jarton | CC BY-SA 4.0 | 4404×2909 |
| tea-estate-and-factory-tour | `public/images/experiences/tea-estate-and-factory-tour.jpg` | [File:20160127 Sri Lanka 4060 crop sRGB (25674524341).jpg](https://commons.wikimedia.org/wiki/File:20160127_Sri_Lanka_4060_crop_sRGB_(25674524341).jpg) | Dan Lundberg | CC BY-SA 2.0 | 3104×2328 |
| temple-of-the-tooth | `public/images/experiences/temple-of-the-tooth.jpg` | [File:Temple of the tooth 2023.jpg](https://commons.wikimedia.org/wiki/File:Temple_of_the_tooth_2023.jpg) | Zarniwoop und Zarquon | CC BY 4.0 | 6014×4003 |
| udawalawe-elephant-safari | `public/images/experiences/udawalawe-elephant-safari.jpg` | [File:Udawalawe national park.jpg](https://commons.wikimedia.org/wiki/File:Udawalawe_national_park.jpg) | Ganiarachchi | CC BY-SA 4.0 | 2048×1366 |
| wilpattu-wilderness-safari | `public/images/experiences/wilpattu-wilderness-safari.jpg` | [File:Sri Lankan leopard-Panthera pardus kotiya.jpg](https://commons.wikimedia.org/wiki/File:Sri_Lankan_leopard-Panthera_pardus_kotiya.jpg) | Senthiaathavan | CC BY 4.0 | 3227×2151 |
| yala-leopard-safari | `public/images/experiences/yala-leopard-safari.jpg` | [File:Leopard on stone in Yala National Park.jpg](https://commons.wikimedia.org/wiki/File:Leopard_on_stone_in_Yala_National_Park.jpg) | Byrdyak | CC BY-SA 4.0 | 3700×2462 |

The owned photographs are kept for the three experiences they already show: `tuktuk-road-trip`,
`yala-jungle-villa-stay` and `weligama-surf-lesson`.

**Judgement calls (reviewable):**
- **ayurveda-wellness-retreat:** market spice bowls. Commons has no usable photo of a
  treatment, so this is the first candidate for commissioned photography.
- **colombo-street-food-walk:** Pettah floating market at dusk. No food is visible.
- **arugam-bay-surf-session:** Panama Beach, about 12 km south, not Main Point.
- **pigeon-island-snorkelling:** shows a scuba diver, not a snorkeller.
- **hikkaduwa-reef-snorkelling:** a turtle in Sri Lanka, but the exact site is unconfirmed.
- **mirissa-whale-watching:** a whale off Sri Lanka; the series is tagged Mirissa, but this
  file is not.
- **stilt-fishing-koggala:** the south coast; the exact beach is unnamed.
- **udawalawe-elephant-safari:** the source is 2048 px wide, so it may be soft at hero size.
- **royal-botanic-gardens-peradeniya:** Commons names the institution as the author, and the
  credit reproduces that.

## Trip photographs (D-35, sourced 2026-09-30)

These use the same sourcing and processing as the destination and experience sets. Each
photograph shows its route's signature sight, and none repeats a photograph used by a
destination or an experience. The files replace the unsourced ones that came with the
initial commit.

| Slug | File | Commons source | Author | Licence | Original size |
|---|---|---|---|---|---|
| cultural-triangle-express | `public/images/trips/cultural-triangle-express.jpg` | [File:Sigiriya Rock Fortress View from Pidurangala Rock.jpg](https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_Fortress_View_from_Pidurangala_Rock.jpg) | Gayomiw | CC BY-SA 4.0 | 6000×4000 |
| southern-shortcut | `public/images/trips/southern-shortcut.jpg` | [File:GALLE FORT AT SUNSET SRI LANKA JAN 2013 (8509060483).jpg](https://commons.wikimedia.org/wiki/File:GALLE_FORT_AT_SUNSET_SRI_LANKA_JAN_2013_(8509060483).jpg) | calflier001 | CC BY-SA 2.0 | 5184×3456 |
| classic-sri-lanka | `public/images/trips/classic-sri-lanka.jpg` | [File:Demodara Nine Arch Bridge (35564604554).jpg](https://commons.wikimedia.org/wiki/File:Demodara_Nine_Arch_Bridge_(35564604554).jpg) | V. Epiney | CC BY-SA 2.0 | 5184×3456 |
| tea-trains-and-a-beach-finish | `public/images/trips/tea-trains-and-a-beach-finish.jpg` | [File:Beauty of tea plantations in Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Beauty_of_tea_plantations_in_Sri_Lanka.jpg) | Lavanya Suriyakumar | CC BY-SA 4.0 | 4032×3024 |
| wildlife-and-beaches | `public/images/trips/wildlife-and-beaches.jpg` | [File:Sri Lankan Elephants in Yala National Park.jpg](https://commons.wikimedia.org/wiki/File:Sri_Lankan_Elephants_in_Yala_National_Park.jpg) | C.J. Hatton | CC BY-SA 4.0 | 6976×4652 |
| grand-island-loop | `public/images/trips/grand-island-loop.jpg` | [File:Daybreak in Ohiya, Sri Lanka.jpg](https://commons.wikimedia.org/wiki/File:Daybreak_in_Ohiya,_Sri_Lanka.jpg) | CJay1995 | CC BY-SA 4.0 | 4772×2688 |
| east-coast-and-the-north | `public/images/trips/east-coast-and-the-north.jpg` | [File:Beach in trincomalee at sun rising.jpg](https://commons.wikimedia.org/wiki/File:Beach_in_trincomalee_at_sun_rising.jpg) | THDBS | CC BY-SA 4.0 | 4000×3000 |

**Judgement calls:**
- **cultural-triangle-express:** Sigiriya from Pidurangala. The home hero and the Pidurangala
  experience also show Sigiriya, from different photographs. It is the route's signature, so
  a second angle was preferred over a less recognisable site.
- **tea-trains-and-a-beach-finish:** the estate road is near Watawala, on the hill-country
  line. The route itself centres on Nuwara Eliya.
- **grand-island-loop:** Ohiya is the gateway to Horton Plains, which is on the route. The
  Commons description is only "Sunrise, morning, mountain top", so the location comes from the
  file title.
- **east-coast-and-the-north:** Commons describes this as a small fishing harbour near
  Trincomalee at dawn. It is not a named tourist beach.
- **wildlife-and-beaches:** a more dramatic tusker photo was passed over because it was taken at
  Kalawewa, which is not on this route.

## Owned / site-wide photographs

The `ownedPhotos` entries in `content/destinations.ts`: the Noble Path photo library, plus
the Sigiriya hero above. These are credited as "Noble Path photo library".

## Unreferenced files

None. The old unsourced files in `public/images/experiences/` were overwritten by the D-27
set, and those in `public/images/trips/` by the D-35 set. Every photograph in
`public/images/` is now either owned or listed above.
