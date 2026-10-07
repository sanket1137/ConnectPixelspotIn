-- Value cleanup: maps free-typed screen values onto the screen form's fixed option lists.
-- Rule-based (by value, not by id) so it also covers screens added after the 26 Sep review.
-- Run ONLY through scripts/venue/prod-value-cleanup.mjs (it wraps this in a transaction: --preview rolls back, --apply commits).
-- Touches only original columns: category, display_format, environment_type, traffic_type, visibility, gender_orientation,
-- income_level, time_of_day_activity, content_types_supported, user_intent, user_mood, occupation_mix, detailed_age_groups,
-- custom_operating_days, city, state.
-- Left untouched on purpose: blank required values, display format "Mixed", list items with no mapping, and any list that would
-- become empty (e.g. occupation only "Tourists, Commuters") — the runner lists these afterwards.

-- 0. Backup of every cleaned column for every screen (fails if it already exists, so a re-run can't overwrite it)
create table screens_value_cleanup_backup_20261002 as
select id, category, display_format, environment_type, traffic_type, visibility, gender_orientation, income_level,
       time_of_day_activity, content_types_supported, user_intent, user_mood, occupation_mix, detailed_age_groups,
       custom_operating_days, city, state, now() as backed_up_at
from screens;

-- 1. Allowed values (= the screen form's options)
create temp table v_allowed (col text, v text, ord int) on commit drop;
insert into v_allowed (col, v, ord)
select col, v, ord from (values
  ('category', array['Digital Display','LED Video Wall','Kiosk','Mall LED','Lift Display','Transit Display']),
  ('display_format', array['Portrait','Landscape','Square']),
  ('environment_type', array['Indoor','Semi-Outdoor','Outdoor Digital']),
  ('traffic_type', array['Pedestrian','Seated Audience','Transit','Mixed']),
  ('visibility', array['High','Medium','Low']),
  ('gender_orientation', array['Male Dominant','Female Dominant','Mixed Gender','Family Oriented']),
  ('income_level', array['Budget Conscious','Middle Income','Premium Audience','Luxury Buyers']),
  ('time_of_day_activity', array['Morning Rush','Lunch Hours','Evening Leisure','Late Night']),
  ('content_types_supported', array['Static Image','Video','Interactive','HTML5']),
  ('user_intent', array['Shopping','Commuting','Dining','Fitness','Entertainment','Work','Education']),
  ('user_mood', array['Relaxed','Rushed','Social','Focused','Leisure']),
  ('occupation_mix', array['Students','Working Professionals','Business Owners','Homemakers']),
  ('detailed_age_groups', array['Children (5-12)','Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)','Seniors (55+)','All Ages']),
  ('custom_operating_days', array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']),
  ('state', array['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
                  'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
                  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands',
                  'Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'])
) as t(col, vals), unnest(vals) with ordinality as u(v, ord);

-- 2. Value mapping (to_v null = drop the item from a list)
create temp table v_map (col text, from_v text, to_v text) on commit drop;
insert into v_map (col, from_v, to_v) values
  ('category','Digital Screen','Digital Display'), ('category','LED Display','LED Video Wall'), ('category','Outdoor LED','LED Video Wall'),
  ('category','Digital Billboard','LED Video Wall'), ('category','Digital Standee','Kiosk'),
  ('environment_type','Outdoor','Outdoor Digital'),
  ('traffic_type','Foot Traffic','Pedestrian'), ('traffic_type','Captive Residents','Pedestrian'),
  ('traffic_type','Vehicular','Transit'), ('traffic_type','Vehicular Traffic','Transit'),
  ('income_level','Middle Class','Middle Income'), ('income_level','Premium','Premium Audience'),
  ('income_level','Middle-High Income','Premium Audience'), ('income_level','Middle to Premium','Premium Audience'),
  ('income_level','Upper Middle Income','Premium Audience'), ('income_level','Upper Middle Class','Premium Audience'),
  ('income_level','Upper Middle','Premium Audience'), ('income_level','High Income','Premium Audience'),
  ('time_of_day_activity','Evening','Evening Leisure'), ('time_of_day_activity','Morning','Morning Rush'),
  ('time_of_day_activity','Afternoon','Lunch Hours'), ('time_of_day_activity','Afternoon Leisure','Lunch Hours'),
  ('time_of_day_activity','Overnight','Late Night'),
  ('content_types_supported','MP4','Video'), ('content_types_supported','MPEG','Video'), ('content_types_supported','GIF','Video'),
  ('content_types_supported','JPEG','Static Image'), ('content_types_supported','JPEG/PNG','Static Image'), ('content_types_supported','Image','Static Image'),
  ('user_intent','Commute','Commuting'), ('user_intent','Grocery','Shopping'), ('user_intent','Daily Essentials','Shopping'),
  ('user_intent','Household','Shopping'), ('user_intent','Payment','Shopping'), ('user_intent','Lifestyle','Shopping'),
  ('user_intent','Movies','Entertainment'), ('user_intent','Leisure','Entertainment'), ('user_intent','Play','Entertainment'),
  ('user_intent','Travel','Commuting'), ('user_intent','Business','Work'), ('user_intent','Networking','Work'),
  ('user_intent','Professional Services','Work'), ('user_intent','Health','Fitness'), ('user_intent','Wellness','Fitness'),
  ('user_intent','Home Life',null), ('user_intent','Family',null), ('user_intent','Daily Living',null),
  ('user_mood','Routine','Focused'), ('user_mood','Engaged','Focused'), ('user_mood','Professional','Focused'),
  ('user_mood','Purposeful','Focused'), ('user_mood','Task-Oriented','Focused'), ('user_mood','Motivated','Focused'),
  ('user_mood','Excited','Social'), ('user_mood','Energetic','Social'), ('user_mood','Happy','Social'),
  ('user_mood','Entertained','Leisure'), ('user_mood','Curious','Leisure'), ('user_mood','Casual','Relaxed'),
  ('user_mood','Patient','Relaxed'), ('user_mood','Hungry',null),
  ('occupation_mix','Executives','Working Professionals'), ('occupation_mix','Corporate Professionals','Working Professionals'),
  ('occupation_mix','IT Professionals','Working Professionals'), ('occupation_mix','Decision Makers','Working Professionals'),
  ('occupation_mix','Young Adults','Students'), ('occupation_mix','Youth','Students'), ('occupation_mix','Parents','Homemakers'),
  ('occupation_mix','Families',null), ('occupation_mix','Senior Citizens',null), ('occupation_mix','Couples',null),
  ('occupation_mix','Movie Goers',null), ('occupation_mix','Commuters',null), ('occupation_mix','Tourists',null),
  ('occupation_mix','Shoppers',null), ('occupation_mix','Local Residents',null), ('occupation_mix','Children',null),
  ('detailed_age_groups','Seniors (56+)','Seniors (55+)'), ('detailed_age_groups','18-25','Young Adults (18-25)'),
  ('detailed_age_groups','26-40','Adults (26-40)'), ('detailed_age_groups','41-55','Middle Age (41-55)'),
  ('custom_operating_days','Mon','Monday'), ('custom_operating_days','Tue','Tuesday'), ('custom_operating_days','Wed','Wednesday'),
  ('custom_operating_days','Thu','Thursday'), ('custom_operating_days','Fri','Friday'), ('custom_operating_days','Sat','Saturday'),
  ('custom_operating_days','Sun','Sunday'),
  ('city','Bangalore','Bengaluru'), ('city','Bengaluru Urban','Bengaluru'), ('city','Bengaluru Rural','Bengaluru'),
  ('city','Gurgaon','Gurugram'), ('city','Pondicherry','Puducherry'), ('city','Allahabad','Prayagraj'),
  ('city','Gulbarga','Kalaburagi'), ('city','Kalburgi','Kalaburagi'), ('city','Bellari','Ballari'), ('city','HISSAR','Hisar'),
  ('city','Navasari','Navsari'), ('city','Delhi','New Delhi'), ('city','Delhi - South','New Delhi'), ('city','Delhi - West','New Delhi'),
  ('city','Delhi - Central','New Delhi'), ('city','Udaipur - RAJ','Udaipur'), ('city','Bilaspur - CG','Bilaspur'),
  ('city','Aurangabad','Chhatrapati Sambhajinagar'), ('city','Khdidarpur','Khidirpur'),
  ('state','TamilNadu','Tamil Nadu'), ('state','J&K','Jammu and Kashmir'), ('state','Jammu & Kashmir','Jammu and Kashmir');

-- cities whose state is certain (fixes "Delhi-NCR", "South", and the swapped Chandigarh/Mohali rows)
create temp table v_city_state (city text, state text) on commit drop;
insert into v_city_state values
  ('Gurugram','Haryana'), ('Faridabad','Haryana'), ('Panchkula','Haryana'),
  ('Noida','Uttar Pradesh'), ('Greater Noida','Uttar Pradesh'), ('Ghaziabad','Uttar Pradesh'),
  ('New Delhi','Delhi'), ('Chandigarh','Chandigarh'), ('Mohali','Punjab'), ('Zirakpur','Punjab'), ('Bengaluru','Karnataka');

-- 3. List cleaner: mapped / case-fixed items, unmapped unknown items kept as they are, duplicates removed (first wins),
--    days in week order
create function pg_temp.clean_list(p_col text, p_arr text[]) returns text[] language sql stable as $fn$
  with items as (
    select u.item, u.ord from unnest(p_arr) with ordinality as u(item, ord)
  ), mapped as (
    select i.ord,
      case
        when exists (select 1 from pg_temp.v_allowed a where a.col = p_col and a.v = i.item) then i.item
        when exists (select 1 from pg_temp.v_map m where m.col = p_col and m.from_v = i.item)
          then (select m.to_v from pg_temp.v_map m where m.col = p_col and m.from_v = i.item limit 1)
        else coalesce((select a.v from pg_temp.v_allowed a where a.col = p_col and lower(a.v) = lower(trim(i.item)) limit 1), i.item)
      end as v
    from items i
  ), firsts as (
    select v, min(ord) as ord from mapped where v is not null group by v
  )
  select coalesce(array_agg(f.v order by
           case when p_col = 'custom_operating_days'
                then (select a.ord from pg_temp.v_allowed a where a.col = p_col and a.v = f.v) else f.ord end), '{}')
  from firsts f
$fn$;

-- 4. Apply
do $do$
declare
  c text;
  n int;
begin
  -- single-value columns: mapping, then case/spacing
  foreach c in array array['category','display_format','environment_type','traffic_type','visibility','gender_orientation','income_level'] loop
    execute format('update screens s set %1$I = m.to_v from pg_temp.v_map m where m.col = %2$L and s.%1$I = m.from_v and m.to_v is not null', c, c);
    get diagnostics n = row_count; raise notice '% mapped: %', c, n;
    execute format('update screens s set %1$I = a.v from pg_temp.v_allowed a where a.col = %2$L and s.%1$I <> a.v and lower(trim(s.%1$I)) = lower(a.v)', c, c);
    get diagnostics n = row_count; raise notice '% case/spacing: %', c, n;
  end loop;
  -- blank text → empty (optional columns only)
  foreach c in array array['visibility','gender_orientation','income_level'] loop
    execute format('update screens set %1$I = null where trim(%1$I) = ''''', c);
    get diagnostics n = row_count; raise notice '% blank to empty: %', c, n;
  end loop;

  -- list columns (required lists are never emptied)
  foreach c in array array['time_of_day_activity','content_types_supported','user_intent','user_mood','occupation_mix','detailed_age_groups','custom_operating_days'] loop
    execute format(
      'update screens set %1$I = pg_temp.clean_list(%2$L, %1$I)
        where %1$I is not null and cardinality(%1$I) > 0
          and %1$I is distinct from pg_temp.clean_list(%2$L, %1$I)
          and (cardinality(pg_temp.clean_list(%2$L, %1$I)) > 0 or %2$L in (''detailed_age_groups'', ''custom_operating_days''))',
      c, c);
    get diagnostics n = row_count; raise notice '% lists cleaned: %', c, n;
  end loop;

  -- city: mapping, spacing, ALL CAPS
  update screens s set city = m.to_v from pg_temp.v_map m where m.col = 'city' and s.city = m.from_v;
  get diagnostics n = row_count; raise notice 'city mapped: %', n;
  update screens set city = regexp_replace(trim(city), '\s+', ' ', 'g') where city <> regexp_replace(trim(city), '\s+', ' ', 'g');
  get diagnostics n = row_count; raise notice 'city spacing: %', n;
  update screens set city = initcap(city) where length(city) > 3 and city = upper(city) and city ~ '[A-Z]';
  get diagnostics n = row_count; raise notice 'city all caps: %', n;

  -- state: spelling, then the state a city certainly belongs to
  update screens s set state = m.to_v from pg_temp.v_map m where m.col = 'state' and s.state = m.from_v;
  get diagnostics n = row_count; raise notice 'state spelling: %', n;
  update screens s set state = cs.state from pg_temp.v_city_state cs where s.city = cs.city and s.state is distinct from cs.state;
  get diagnostics n = row_count; raise notice 'state from city: %', n;
end
$do$;
