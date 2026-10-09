# Final proposal: admin screen import with venue metrics

Status: **final proposal, awaiting go-ahead.** Built and tested on the `localhost` branch against the local prod copy first. Production only after you approve.

## Decisions taken
| # | Decision |
|---|---|
| 1 | **Admin only.** Screen owners don't get template or import. |
| 2 | **Fixed lists = exactly the current form options.** No new values added. |
| 3 | **Multi-choice fields = one Yes/No dropdown column per option.** This is the only way Excel can guarantee clean multi-values. |
| 4 | **Import is blocked until every row is valid.** Unfinished work is saved as a **draft**. |
| 5 | **No duplicates ever.** Not inside a file, not against screens already in the DB (including yesterday's import), and not against other open drafts. |
| 6 | Calculated fields **are shown in the sheet** as locked formula columns. The server recalculates them on import, so a tampered cell can't change anything. |
| 7 | Metrics are entered **per day** (e.g. daily footfall, daily admits), matching per-day pricing. |
| 8 | All metrics for a screen are stored in **one JSON column, `screens.venue_metrics`**. Advertisers see only filled values. |

---

## 1. Why this is needed (current data in the local copy)
Free typing has broken the filters. Examples:

| Column | Values found |
|---|---|
| category | Digital Display / **digital display** / **Digital Screen** |
| traffic_type | 9 variants, e.g. "Foot Traffic", "Vehicular Traffic" |
| income_level | 10 variants |
| content types | Video, Static Image, plus **MP4, JPEG, GIF, Image** |
| operating days | **Mon** and **Monday** mixed |
| city | 234 different spellings |

The template and import make this impossible for new screens. Old rows can be cleaned separately (section 9).

## 2. Where it lives (admin portal)

**Admin → Manage Screens.** Next to "Add Screen for Owner", add:
- **Get template**, which has a **Settings** tab;
- **Import screens**, which has a **Drafts** list.

## 3. Database
| Change | Purpose |
|---|---|
| `screens.venue_metrics` jsonb, default `{}` | Venue metrics as `{ "flats": 420, "avg_flat_value": 15000000, "placement": "Lift lobby" }`. Only filled keys are stored. Locally it replaces the phase-5 `venue_attributes` / `custom_attributes` columns (migration with down script). Production gets it directly. |
| `screens.dedupe_key` text + index | Normalised fingerprint, see section 7. Backfilled for existing screens. |
| `screens.import_id` | Which import created the screen (audit). |
| table `venue_metric_definitions` | Metrics per venue category, managed in Settings (section 4). Seeded from today's metric list, converted to per-day. |
| table `screen_imports` | One row per upload: file name, **file hash**, venue category, owner, host, status, the rows (jsonb), state `draft` / `imported` / `discarded`, created_by, timestamps. |
| table `city_master` | State → city list for the City dropdown and validation. Seeded from the Census towns list plus cleaned DB cities. Admin can add cities. |

## 4. Settings: metrics per venue category

Location: Get template → **Settings** tab.
1. Choose a venue category (36, grouped by family). It lists that category's metrics in column order.
2. **Add metric:**
   - label
   - input type: number / ₹ amount / % / year / dropdown / multi-choice / yes-no / text
   - unit
   - options (for dropdown or multi-choice)
   - min / max
   - required
   - show on advertiser card (max 2)
3. **Edit:** label, unit, help, order, required, show on card. Options can be added, but a value already in use can't be removed.
4. **Hide** instead of delete. The data stays, but there is no column in new templates and nothing is shown to advertisers.
5. The key and the input type are locked once any screen has a value.
6. **Cities** sub-tab: add a missing city to a state.

## 5. Get template
1. Choose a **venue category**.
2. Download `PixelSpot_<Category>_template.xlsx`.

It is generated live from the DB, so lists and metrics are always current.

**Sheets:**
- **Screens:** one row per screen. Row 1 holds the group headers, row 2 the column names; both are frozen. Every header has a note with meaning, unit and an example. Colours:
  - required = orange
  - optional = white
  - metric = blue
  - calculated = grey and locked
- **Lists:** hidden and protected. It is the dropdown source.
- **How to fill:** short rules and one example row.

The template carries a hidden marker with the venue category and template version, so an import knows which metrics to expect.

### 5.1 Columns
| Group | Column | DB column | How it's entered in Excel |
|---|---|---|---|
| Location | Screen name * | name | text |
| | Venue name * | venue_name | text |
| | Address * | location | text |
| | State * | state | **dropdown**: 36 states/UTs |
| | City * | city | **dropdown that changes with the State** (city master) |
| | Pincode * | pincode | 6-digit number |
| | Latitude * / Longitude * | latitude, longitude | decimal number |
| Screen | Screen category * | category | **dropdown**: Digital Display, LED Video Wall, Kiosk, Mall LED, Lift Display, Transit Display |
| | Display format * | display_format | **dropdown**: Portrait, Landscape, Square |
| | Resolution * | resolution | text `1920x1080` |
| | Ad slot duration (sec) * | duration_per_slot | whole number |
| | Loop duration (sec) | loop_duration | whole number |
| | Environment type * | environment_type | **dropdown**: Indoor, Semi-Outdoor, Outdoor Digital |
| | Visibility | visibility | **dropdown**: High, Medium, Low |
| | Content types supported * | content_types_supported[] | **Yes/No each**: Static Image · Video · Interactive · HTML5 |
| Timing | Opening time / Closing time | custom_operating_hours_start/end | **dropdown**: times in 15-min steps, 00:00 … 23:45 |
| | Operating days * | custom_operating_days[] | **Yes/No each**: Monday … Sunday |
| | Time-of-day activity * | time_of_day_activity[] | **Yes/No each**: Morning Rush · Lunch Hours · Evening Leisure · Late Night |
| Audience | Traffic type * | traffic_type | **dropdown**: Pedestrian, Seated Audience, Transit, Mixed |
| | Avg daily footfall * | avg_daily_footfall | whole number |
| | Avg dwell time (min) * | avg_dwell_time | whole number |
| | Age groups | detailed_age_groups[] | **Yes/No each**: Children (5-12) · Teenagers (13-17) · Young Adults (18-25) · Adults (26-40) · Middle Age (41-55) · Seniors (55+) · All Ages |
| | Gender orientation | gender_orientation | **dropdown**: Male Dominant, Female Dominant, Mixed Gender, Family Oriented |
| | Income level | income_level | **dropdown**: Budget Conscious, Middle Income, Premium Audience, Luxury Buyers |
| | Occupation mix * | occupation_mix[] | **Yes/No each**: Students · Working Professionals · Business Owners · Homemakers |
| | User intent * | user_intent[] | **Yes/No each**: Shopping · Commuting · Dining · Fitness · Entertainment · Work · Education |
| | User mood * | user_mood[] | **Yes/No each**: Relaxed · Rushed · Social · Focused · Leisure |
| Pricing | Number of screens * | number_of_screens | whole number ≥ 1 |
| | Price per screen per day (₹) * | price_per_day | whole number |
| | Book all screens together | bulk_booking_mandatory | **dropdown**: Yes / No |
| | Min booking days * | min_booking_days | whole number ≥ 1 |
| | Description | description | text |
| **Calculated (grey, locked)** | Bundle price per day (₹) | bundle_price_per_day | `= price × number of screens` |
| | Multi-screen | is_multi_screen | `= Yes if screens > 1` |
| | Type | type | `= Screen category` |
| | Size | size | `= Resolution` |
| | Operational hours | operational_hours | `= Opening – Closing` |
| | Plays per hour | playback_slots_per_hour | `= FLOOR(3600 ÷ loop duration)` |
| | Brands per loop | max_brands_per_loop | `= FLOOR(loop ÷ slot)` |
| **Venue metrics** | one column per active metric of the category | → `venue_metrics` JSON | number / ₹ / % / year as number cells; dropdown metric = **dropdown**; multi-choice metric = **Yes/No each**; yes/no = **dropdown** |

Yes/No groups sit under one merged header (e.g. **User intent** › Shopping | Commuting | …) and can be collapsed with Excel's +/- grouping. On import they become arrays, e.g. `["Shopping","Dining"]`. A required group needs at least one "Yes".

### 5.2 Not in the sheet
| Field | Set by |
|---|---|
| id, created_at | database |
| owner_id | Import page: screen owner picker (once per import) |
| host | Import page, e.g. IND-02-AEK |
| status | Import page: pending / inactive / active |
| owned_by_admin | automatic |
| venue_type, venue_category | the template's venue category |
| environment_class, search_text, footfall_note, dedupe_key, import_id | system |
| location_tags, custom_location_tags, lifestyle_tags, interest_segments, custom_audience_tags | auto-tagging from lat/lng after import |
| operating_hours_preset | "Custom" when hours are given |
| last_tagged_*, composite_score, zone_id, rejection_reason | system |
| images, screen_images, surrounding_images | after import, in the Bulk Image Manager |

## 6. Import screens
1. Choose **screen owner**, **host**, **status**.
2. Upload the `.xlsx`.
   - If the **same file** (same hash) was already imported, you're told: "This file was imported on 1 Oct by X". You can't import it again.
   - If it is already an open draft, you're sent to that draft.
3. The rows open in the **validation grid**. The draft is saved automatically on every edit.

**Validation grid:**
- Summary: **"62 rows · 55 OK · 7 to fix"**, with a filter **Show only rows to fix**.
- Bad cells are red, with the reason on hover, e.g. "City not in Maharashtra — did you mean Thane?".
- **Edit in place.** Dropdown columns open the same fixed list. Suggestions are one click. Calculated columns update live.
- **Bulk correction:**
  - tick rows (checkbox, shift-click for a range, or **Select all with this error**);
  - **Bulk edit**: column → value → applied to all selected rows;
  - on a suggestion, **Apply to all rows with "Banglore"**.
- **Delete row**: e.g. remove a duplicate.
- **Re-upload corrected file into this draft.** The grid is replaced, and the draft and its settings are kept.
- **Import** stays disabled until **0 rows to fix**. Then:
  1. the server re-validates everything and re-checks duplicates;
  2. it inserts all rows in **one transaction**, so either all screens are created or none;
  3. the draft is marked `imported`.
- **Save & exit**: the draft stays in the **Drafts** list (owner, category, rows, errors left, last edited by/when). Drafts can be continued or discarded.

**After import:**
- "62 screens imported", with a link to the list filtered to this import.
- Auto-tagging runs in the background, one by one.
- Images are added in the Bulk Image Manager.

## 7. Duplicate protection
**Fingerprint (`dedupe_key`):** lower-cased, trimmed, punctuation-free **venue name + screen name**, plus lat/lng rounded to 4 decimals (about 11 m).

| Check | When | Result |
|---|---|---|
| Same file uploaded again | upload | blocked, with the date and who imported it |
| Same fingerprint twice in the file | grid | both rows flagged; must be fixed (delete or rename one) |
| Fingerprint matches an existing screen in the DB (any owner, any status) | grid + final import | row flagged: "Already exists: <screen name>, imported 1 Oct". Must be removed. |
| Fingerprint matches a row in another open draft | grid | flagged with the draft name |
| **Near duplicate**: same venue within 30 m, different screen name | grid | flagged; admin must either remove it or tick **"This is a different screen"**. The tick counts as fixed. |
| Two admins importing at the same moment | final import | the server locks and re-checks inside the transaction, so only one can win |

Existing screens get their `dedupe_key` backfilled. Duplicates already in the DB are listed in a report; nothing is deleted without your approval.

## 8. Validation rules
| Column(s) | Rule |
|---|---|
| Required columns | must be filled |
| Every dropdown column | value must be in the fixed list; case and spacing auto-fixed ("indoor" → Indoor) |
| Yes/No groups | only Yes / No / blank; required groups need at least one Yes |
| State | one of 36 |
| City | must exist in the city master for that State; closest-match suggestion ("Banglore" → Bengaluru); flags a city that belongs to another state |
| Pincode | 6 digits; first 2 digits must match the State |
| Latitude / Longitude | numbers; inside India; not 0,0; swapped lat/lng detected with a one-click **Swap**; point must fall in the chosen State's area; fewer than 4 decimals = warning |
| Opening / closing time | from the list; closing earlier than opening only as overnight (confirm) |
| Screen name, venue name, address | 3–120 characters; no leading/trailing spaces (auto-trimmed) |
| Resolution | `WxH` format, e.g. 1920x1080 ("1920 X 1080" auto-fixed) |
| Slot / loop | whole numbers > 0; loop ≥ slot |
| Footfall, dwell, screens, min days, price | whole numbers within sensible limits; price > 0, screens ≥ 1, min days ≥ 1 |
| Calculated columns | ignored on import and recalculated by the server |
| Venue metrics | per the Settings definition: type, min/max, list values, required |
| Template version / category | must match a current template; old templates get a "download a fresh template" message |
| Duplicates | section 7 |

Warnings (e.g. low-precision coordinates, footfall above 5 lakh/day) must be **acknowledged** per row or in bulk before the Import button unlocks.

## 9. Optional cleanup of existing data (separate approval)
- A dry-run report maps old variants **onto the form's options only**, e.g. digital display → Digital Display, Foot Traffic → Pedestrian, MP4 → Video, Mon → Monday (form uses full day names), Bangalore → Bengaluru.
- Values with no clear match are listed for your decision. Nothing is applied without your OK, and it runs locally first.

## 10. Advertiser side
- Card and detail panel show `venue_metrics` values that are **filled** only, formatted with label and unit ("420 flats", "₹1.5 Cr avg flat value").
- Hidden metrics and blanks never show. Host is never shown.
- Fixed lists mean Discover filters return correct results.

## 11. Build steps (each tested on localhost before the next)
1. **DB:**
   - migrations: `venue_metrics`, `dedupe_key`, `import_id`, `venue_metric_definitions`, `screen_imports`, `city_master`;
   - seeds;
   - `dedupe_key` backfill and a duplicate report;
   - one shared list of fixed dropdown values, used by the form, template and validator.
2. **Settings:** metrics per venue category, and cities.
3. **Get template:** Excel generation (`exceljs`, server-only) with dropdowns, dependent city list, Yes/No groups, locked calculated columns and metric columns.
4. **Import:**
   - upload;
   - validation grid with inline edit, bulk edit and suggestions;
   - drafts;
   - duplicate checks;
   - transactional import;
   - background tagging.
5. **Advertiser display:** reads `venue_metrics` (filled values only).
6. **Test end-to-end** on the local copy:
   - import the 62-row AEK file;
   - re-upload it, which must be blocked;
   - an edited copy must have its duplicates flagged;
   - a draft must survive save and resume.
7. **Optional:** cleanup of old data (section 9).

Production rollout: migrations + seeds + backfill, then deploy. You run it, as before.
