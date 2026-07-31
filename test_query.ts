import 'dotenv/config';
import { storage } from './server/storage';

async function test() {
  try {
    const result = await storage.getFilteredScreens({
      environmentTypes: ['Indoor'],
      lat: 12.9121,  // Roughly Bengaluru
      lng: 77.6446,
      radiusKm: 15
    });
    console.log("Indoor screens near HSR:", Array.isArray(result) ? result.length : result.screens.length);

    process.exit(0);
  } catch (err) {
    console.error("SQL ERROR:", err);
    process.exit(1);
  }
}

test();
