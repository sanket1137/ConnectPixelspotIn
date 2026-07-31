import 'dotenv/config';
import { storage } from './server/storage';

async function test() {
  try {
    const result = await storage.getFilteredScreens({
      venueCategories: ['Restaurant']
    });
    console.log("Restaurant Screens:", Array.isArray(result) ? result.length : result.screens.length);

    process.exit(0);
  } catch (err) {
    console.error("SQL ERROR:", err);
    process.exit(1);
  }
}

test();
