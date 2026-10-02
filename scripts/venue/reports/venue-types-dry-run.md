# Venue type backfill — dry run

Generated 2026-09-27T23:11:09.016Z from the local copy (`connectpixelspot_prodcopy`). Nothing was written.

- Screens: **5194** · matched **5192** (100.0%) · unmatched **2**
- Distinct raw values: **134** · exact alias **128** · matched by a word inside longer text **4** (please check these) · unmatched **2**

## Needs your review

### Unmatched raw values (will stay without a type — screens still show, but not under any family filter)

| Raw venue_category | Screens |
|---|---:|
| `Theater Company` | 1 |
| *(empty)* | 1 |

### Not an exact alias — matched by a word inside longer text, or (empty category) from the venue/screen name

| Raw venue_category | → Type | Family | Screens |
|---|---|---|---:|
| `(empty) — venue "Sony World Junction" / screen "Koramangala Sony World Signal"` | junction | Billboards & roads | 1 |
| `(empty) — venue "Brigade Road Junction" / screen "Brigade Road Corner Screen"` | junction | Billboards & roads | 1 |
| `(empty) — venue "100ft Road" / screen "Indiranagar 100ft Road Billboard"` | roadside_billboard | Billboards & roads | 1 |
| `(empty) — venue "MG Road Metro" / screen "MG Road LED Display"` | metro | Transit | 1 |

## Screens per canonical type

| Family | Type | Screens | Raw spellings |
|---|---|---:|---:|
| Billboards & roads | roadside_billboard | 395 | 4 |
| Billboards & roads | junction | 7 | 3 |
| Billboards & roads | fuel_station | 3 | 1 |
| Billboards & roads | highway | 1 | 1 |
| Cinema | cinema_audi | 1731 | 1 |
| Cinema | cinema_lobby | 271 | 2 |
| Education | academy | 20 | 8 |
| Education | school_college | 5 | 3 |
| Food & Drink | restaurant | 309 | 3 |
| Food & Drink | cafe | 75 | 4 |
| Food & Drink | bakery_dessert | 23 | 12 |
| Food & Drink | bar_lounge | 23 | 4 |
| Food & Drink | hotel | 8 | 2 |
| Food & Drink | event_venue | 1 | 1 |
| Lifestyle & Health | salon_spa | 237 | 17 |
| Lifestyle & Health | gym | 150 | 4 |
| Lifestyle & Health | clinic | 127 | 10 |
| Lifestyle & Health | play_area | 9 | 5 |
| Lifestyle & Health | sports_venue | 6 | 5 |
| Lifestyle & Health | hospital | 1 | 1 |
| Residential | apartment | 834 | 3 |
| Retail & Malls | retail_store | 419 | 18 |
| Retail & Malls | mall | 67 | 1 |
| Retail & Malls | supermarket | 10 | 3 |
| Retail & Malls | auto_care | 8 | 4 |
| Transit | bus_station | 226 | 1 |
| Transit | railway_station | 22 | 1 |
| Transit | transit_hub | 5 | 1 |
| Transit | metro | 3 | 2 |
| Transit | bus_stop | 2 | 1 |
| Workplace | commercial_building | 76 | 1 |
| Workplace | coworking | 56 | 1 |
| Workplace | corporate_office | 51 | 2 |
| Workplace | tech_park | 11 | 2 |

## Every raw value → canonical type

| Raw venue_category | → Type | Family | How | Screens (active) |
|---|---|---|---|---:|
| `Theater Company` | **— unmatched —** |  |  | 1 (1) |
| *(empty)* | **— unmatched —** |  |  | 1 (1) |
| `Petrol Bunk` | fuel_station | Billboards & roads | exact | 3 (3) |
| `Highway` | highway | Billboards & roads | exact | 1 (1) |
| `Road Junction` | junction | Billboards & roads | exact | 5 (5) |
| `(empty) — venue "Sony World Junction" / screen "Koramangala Sony World Signal"` | junction | Billboards & roads | name | 1 (1) |
| `(empty) — venue "Brigade Road Junction" / screen "Brigade Road Corner Screen"` | junction | Billboards & roads | name | 1 (1) |
| `Roadside` | roadside_billboard | Billboards & roads | exact | 385 (379) |
| `Road Side` | roadside_billboard | Billboards & roads | exact | 6 (5) |
| `Outdoor` | roadside_billboard | Billboards & roads | exact | 3 (3) |
| `(empty) — venue "100ft Road" / screen "Indiranagar 100ft Road Billboard"` | roadside_billboard | Billboards & roads | name | 1 (1) |
| `Theater` | cinema_audi | Cinema | exact | 1731 (1731) |
| `Cinema` | cinema_lobby | Cinema | exact | 192 (190) |
| `Multiplex` | cinema_lobby | Cinema | exact | 79 (79) |
| `Academy` | academy | Education | exact | 12 (12) |
| `Dance studio` | academy | Education | exact | 2 (2) |
| `Music Academy` | academy | Education | exact | 1 (1) |
| `Martial Arts School` | academy | Education | exact | 1 (1) |
| `Art school` | academy | Education | exact | 1 (1) |
| `Dance Studio` | academy | Education | exact | 1 (1) |
| `Music School` | academy | Education | exact | 1 (1) |
| `Sports Academy` | academy | Education | exact | 1 (1) |
| `Play School` | school_college | Education | exact | 2 (2) |
| `College` | school_college | Education | exact | 2 (0) |
| `Play school` | school_college | Education | exact | 1 (1) |
| `Sweet Store` | bakery_dessert | Food & Drink | exact | 8 (8) |
| `Sweet Shop` | bakery_dessert | Food & Drink | exact | 4 (4) |
| `Bakery` | bakery_dessert | Food & Drink | exact | 2 (2) |
| `Icecream` | bakery_dessert | Food & Drink | exact | 1 (1) |
| `Cake Shop` | bakery_dessert | Food & Drink | exact | 1 (1) |
| `Ice Cream Parlor` | bakery_dessert | Food & Drink | exact | 1 (1) |
| `BAKERY` | bakery_dessert | Food & Drink | exact | 1 (1) |
| `ICECREAM PARLOR` | bakery_dessert | Food & Drink | exact | 1 (1) |
| `Icecream Parlor` | bakery_dessert | Food & Drink | exact | 1 (1) |
| `Sweet shop` | bakery_dessert | Food & Drink | exact | 1 (1) |
| `Ice Cream Parlour` | bakery_dessert | Food & Drink | exact | 1 (1) |
| `Icecream Parlour` | bakery_dessert | Food & Drink | exact | 1 (1) |
| `Restobar` | bar_lounge | Food & Drink | exact | 20 (20) |
| `Bar & kitchen` | bar_lounge | Food & Drink | exact | 1 (1) |
| `Resto bar` | bar_lounge | Food & Drink | exact | 1 (1) |
| `Lounge` | bar_lounge | Food & Drink | exact | 1 (1) |
| `Cafe` | cafe | Food & Drink | exact | 41 (41) |
| `Café` | cafe | Food & Drink | exact | 31 (30) |
| `CAFÉ` | cafe | Food & Drink | exact | 2 (2) |
| `café` | cafe | Food & Drink | exact | 1 (1) |
| `Party Hall` | event_venue | Food & Drink | exact | 1 (1) |
| `Hotel` | hotel | Food & Drink | exact | 7 (7) |
| `Resort` | hotel | Food & Drink | exact | 1 (1) |
| `Restaurant` | restaurant | Food & Drink | exact | 307 (307) |
| ` Restaurant` | restaurant | Food & Drink | exact | 1 (1) |
| `Kitchen` | restaurant | Food & Drink | exact | 1 (1) |
| `Clinic` | clinic | Lifestyle & Health | exact | 93 (93) |
| `Dental Clinic` | clinic | Lifestyle & Health | exact | 10 (10) |
| `Skin & Hair Clinic` | clinic | Lifestyle & Health | exact | 8 (8) |
| `Pet Clinic` | clinic | Lifestyle & Health | exact | 5 (5) |
| `Dental` | clinic | Lifestyle & Health | exact | 4 (4) |
| `Physiotherapy` | clinic | Lifestyle & Health | exact | 3 (3) |
| `Skin & Hair` | clinic | Lifestyle & Health | exact | 1 (1) |
| ` Clinic` | clinic | Lifestyle & Health | exact | 1 (1) |
| `Skin Clinic` | clinic | Lifestyle & Health | exact | 1 (1) |
| `clinic` | clinic | Lifestyle & Health | exact | 1 (1) |
| `Gym` | gym | Lifestyle & Health | exact | 142 (142) |
| `Fitness` | gym | Lifestyle & Health | exact | 6 (6) |
| `Fitness Consultant` | gym | Lifestyle & Health | exact | 1 (1) |
| `Yoga` | gym | Lifestyle & Health | exact | 1 (1) |
| `Hospital` | hospital | Lifestyle & Health | exact | 1 (1) |
| `Game Centre` | play_area | Lifestyle & Health | exact | 4 (4) |
| `Game centre` | play_area | Lifestyle & Health | exact | 2 (2) |
| `Kids game centre` | play_area | Lifestyle & Health | exact | 1 (1) |
| `Play Centre` | play_area | Lifestyle & Health | exact | 1 (1) |
| `Kids Play centre` | play_area | Lifestyle & Health | exact | 1 (1) |
| `Salon` | salon_spa | Lifestyle & Health | exact | 172 (172) |
| `Spa` | salon_spa | Lifestyle & Health | exact | 30 (30) |
| `Tattoo Studio` | salon_spa | Lifestyle & Health | exact | 7 (7) |
| `Tattoo centre` | salon_spa | Lifestyle & Health | exact | 5 (5) |
| `Nail Studio` | salon_spa | Lifestyle & Health | exact | 4 (4) |
| `Saloon` | salon_spa | Lifestyle & Health | exact | 3 (3) |
| `Tattoo` | salon_spa | Lifestyle & Health | exact | 2 (2) |
| `Nail Studio ` | salon_spa | Lifestyle & Health | exact | 2 (2) |
| `Foot spa` | salon_spa | Lifestyle & Health | exact | 2 (2) |
| `salon` | salon_spa | Lifestyle & Health | exact | 2 (2) |
| `Tattoo Centre` | salon_spa | Lifestyle & Health | exact | 2 (2) |
| `Tatoo Studio` | salon_spa | Lifestyle & Health | exact | 1 (1) |
| `Tattoo studio` | salon_spa | Lifestyle & Health | exact | 1 (1) |
| `Salon & Spa` | salon_spa | Lifestyle & Health | exact | 1 (1) |
| `Nail studio` | salon_spa | Lifestyle & Health | exact | 1 (1) |
| `Salon ` | salon_spa | Lifestyle & Health | exact | 1 (1) |
| `Tattoo Shop` | salon_spa | Lifestyle & Health | exact | 1 (1) |
| `Sports Centre` | sports_venue | Lifestyle & Health | exact | 2 (2) |
| `Sports centre` | sports_venue | Lifestyle & Health | exact | 1 (1) |
| `Sports` | sports_venue | Lifestyle & Health | exact | 1 (1) |
| `Sports Complex` | sports_venue | Lifestyle & Health | exact | 1 (1) |
| `Stadium` | sports_venue | Lifestyle & Health | exact | 1 (1) |
| `Residential Building` | apartment | Residential | exact | 678 (678) |
| `Apartment` | apartment | Residential | exact | 87 (86) |
| `Residential Society` | apartment | Residential | exact | 69 (69) |
| `Car Detailing` | auto_care | Retail & Malls | exact | 4 (4) |
| `Car Care` | auto_care | Retail & Malls | exact | 2 (2) |
| `Car care` | auto_care | Retail & Malls | exact | 1 (1) |
| `Detailing Company` | auto_care | Retail & Malls | exact | 1 (1) |
| `Mall` | mall | Retail & Malls | exact | 67 (67) |
| `Retail Store` | retail_store | Retail & Malls | exact | 388 (388) |
| `Pet Store` | retail_store | Retail & Malls | exact | 8 (8) |
| `Sports Store` | retail_store | Retail & Malls | exact | 5 (5) |
| `Aquarium Shop` | retail_store | Retail & Malls | exact | 2 (2) |
| `Sports shop` | retail_store | Retail & Malls | exact | 2 (2) |
| `Pet store` | retail_store | Retail & Malls | exact | 2 (2) |
| `Sports store` | retail_store | Retail & Malls | exact | 1 (1) |
| `Pet  Store` | retail_store | Retail & Malls | exact | 1 (1) |
| `Organic Store` | retail_store | Retail & Malls | exact | 1 (1) |
| `Textile Showroom` | retail_store | Retail & Malls | exact | 1 (1) |
| `Artificial Plant Shop` | retail_store | Retail & Malls | exact | 1 (1) |
| `Pet shop` | retail_store | Retail & Malls | exact | 1 (1) |
| `Store` | retail_store | Retail & Malls | exact | 1 (1) |
| `Sporting goods store` | retail_store | Retail & Malls | exact | 1 (1) |
| `Furniture Showroom` | retail_store | Retail & Malls | exact | 1 (1) |
| `Organic Makeup Store` | retail_store | Retail & Malls | exact | 1 (1) |
| `Nuts and Fruits` | retail_store | Retail & Malls | exact | 1 (1) |
| `Organic shop` | retail_store | Retail & Malls | exact | 1 (1) |
| `Hypermarket` | supermarket | Retail & Malls | exact | 6 (6) |
| `Super market` | supermarket | Retail & Malls | exact | 2 (2) |
| `Super Market` | supermarket | Retail & Malls | exact | 2 (2) |
| `Bus Station` | bus_station | Transit | exact | 226 (223) |
| `Bus Stop` | bus_stop | Transit | exact | 2 (1) |
| `Metro` | metro | Transit | exact | 2 (2) |
| `(empty) — venue "MG Road Metro" / screen "MG Road LED Display"` | metro | Transit | name | 1 (1) |
| `Railway Station` | railway_station | Transit | exact | 22 (22) |
| `Transit Hub` | transit_hub | Transit | exact | 5 (5) |
| `Commercial Building` | commercial_building | Workplace | exact | 76 (76) |
| `Corporate Office` | corporate_office | Workplace | exact | 45 (45) |
| `Office Building` | corporate_office | Workplace | exact | 6 (6) |
| `Coworking Space` | coworking | Workplace | exact | 56 (56) |
| `Corporate Tech Park` | tech_park | Workplace | exact | 10 (10) |
| `Corporate Park` | tech_park | Workplace | exact | 1 (1) |

## Environment → class

| Raw environment_type | → Class | Screens |
|---|---|---:|
| `Indoor` | indoor | 3704 |
| `indoor` | indoor | 810 |
| `Outdoor Digital` | outdoor | 425 |
| `Semi-Outdoor` | outdoor | 249 |
| ` (Junction & flyover)` | outdoor | 2 |
| ` (Metro)` | — (no match) | 1 |
| `Outdoor` | outdoor | 1 |
| ` (Roadside billboard)` | outdoor | 1 |
| ` (no type)` | — (no match) | 1 |
