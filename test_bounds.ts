import { storage } from "./server/storage";
import { db } from "./server/db";

async function run() {
  const result = await storage.getFilteredScreens({
    boundsN: 18.4,
    boundsS: 11.5,
    boundsE: 78.5,
    boundsW: 74.0,
  });
  console.log("Screens found:", (result as any).screens ? (result as any).screens.length : (result as any).length);
  process.exit(0);
}
run();
