# Accommodation content

Source: `content/accommodations.ts`. Type: `Accommodation` in `lib/types.ts`.

| Field | Meaning |
| --- | --- |
| `slug` | Unique id, `<destination>-<name>`. Saved in the visitor's browser (`np.stays.v1`). |
| `destinationSlug` | Must exist in `content/destinations.ts` (checked by `checkContentIntegrity`). |
| `tier` | `budget`, `mid-range` or `luxury`. Practical price bands, not SLTDA star ratings. |
| `kind`, `summary` | Display copy. `kind` is inferred from the name; `summary` is generic. |
| `coordinates` | **Approximate.** See below. |

## Status: unverified

Names, tiers and destinations come from a list compiled by the Noble Path team from public directories. Nothing has been checked against a live source. Before launch, confirm each property exists, is filed in the right tier and destination, and add real details.

## Coordinates are approximate

No surveyed positions are held. Each stay is pinned within roughly 0.3-1.5 km of its destination's centre by a stable hash of its slug, so pins do not stack and never move between builds. Entries with an explicit `[lat, lng]` (Galle Face Hotel, Shangri-La Colombo, Amangalla, Heritance Kandalama, Agbo Hotel Polonnaruwa) are hand-placed. Some pins may sit slightly off the building or over water. The UI says "Pins are approximate". Fix by geocoding each property (for example with the Google Geocoding API) and storing real coordinates.

## Coverage

About 165 properties across 18 destinations. Many budget entries in the source were generic ("local guesthouses") and are omitted, so several destinations have no budget stays listed. The UI says so.

Places in the source that are not destinations on the site yet, so not included: Weligama, Tangalle, Bentota, Kalutara, Hatton, Haputale, Bandarawela, Passikudah, Mannar, Vavuniya, Mullaitivu, Kitulgala, Ratnapura, Hambantota, Kalpitiya. Add each as a destination first.

The "All Sri Lanka" tab shows every stay in the chosen tier on one map.

Renaming a stay changes its slug and silently drops it from visitors' saved stays.
