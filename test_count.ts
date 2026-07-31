import 'dotenv/config';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function test() {
  try {
    const totalActive = await db.execute(sql`SELECT count(*) FROM screens WHERE status = 'active'`);
    console.log("Total active screens in DB:", totalActive.rows[0].count);

    const lat = 12.91554755705898;
    const lng = 77.61644166044154;
    const radius = 15;
    
    const haversine = sql`
      (6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${lat})) * cos(radians(latitude::float)) *
          cos(radians(longitude::float) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(latitude::float))
        ))
      )) <= ${radius}
    `;

    const radiusActive = await db.execute(sql`SELECT count(*) FROM screens WHERE status = 'active' AND ${haversine}`);
    console.log(`Active screens within 15km of Bangalore:`, radiusActive.rows[0].count);

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
test();
