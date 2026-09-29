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

## Owned / site-wide photographs

The `ownedPhotos` entries in `content/destinations.ts`: the Noble Path photo library, plus
the Sigiriya hero above. These are credited as "Noble Path photo library".

## Unreferenced files

`public/images/experiences/*` (except the three owned files `surfing-south-coast.jpg`,
`jungle-villa-yala.jpg` and `tuktuk-road-trip.jpg`) were committed with no recorded
provenance and are **not used**. They must not be referenced until they are re-sourced
with a row in this register.
