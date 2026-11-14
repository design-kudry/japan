# Backlog

## Photos

**Status:** Wikipedia / Commons is the photo source (temporary, intentional)  
**Context:** Google Places API was not set up. Local Japan uploaded JPGs were removed from the repo — do not restore them.

### Active sources

1. **Wikipedia pageimages** (EN + RU) — primary thumbnails for Places + route enrich  
2. **Wikimedia Commons** — file / P18 resolution  
3. **Wikidata** — labels, descriptions, P18  
4. **OSM / Overpass** — hours / fee only (not photos)

### Not used

- Local `image/*.jpg` place/shop catalog (deleted)  
- Google Places  

### Later

Optional paid APIs (Foursquare etc.) if keys appear; until then keep Wikipedia.

---

## LLM place blurbs (on open + shared cache)

**Status:** Idea saved — not started  
**Context:** Server is fine. Want visit-useful copy (“зачем идти”), approximate price/hours from sources, generate when a user opens a card, store once, reuse for everyone.

### Desired behavior

1. User opens place card (map / Places / constructor).
2. If cache miss for `placeId` / Wikidata id → BFF calls model with **grounded** inputs only (wiki extract, OSM tags, category, city) + fixed prompt (“2–3 sentences: what it is, why go, practical note; no invented prices”).
3. Show skeleton / existing wiki teaser while waiting; swap to generated text.
4. Persist `{placeId, text, priceHint?, hoursHint?, sources[], model, createdAt}` in shared store (KV/DB).
5. Next user with same id gets cache hit — no regenerate.

### Constraints

- No hallucinated ¥ / hours — model may only restate or leave `—` if source missing.
- Mark UI as generated; keep Wikipedia/OSM links.
- Timeout + fallback to polished wiki / category teaser (`js/russian.js`).
- Rate limit + cost control (generate on detail open, not for every map pin).

### Depends on

Backend/BFF + secret for model API + shared cache. Client stays static host for UI.

### Not doing now

Keep current polish/filter path (`polishDescription` / category teasers) until BFF exists.

---

## Places loading pipeline rework

**Status:** In discussion  
**Doc:** [PLACES_PIPELINE.md](./PLACES_PIPELINE.md) — how it works **today**; rewrite this together before changing code.
