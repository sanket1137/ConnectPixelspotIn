import { config } from "dotenv";
config();
import { db } from "../server/db";
import { screens, zones } from "../shared/schema";
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const ownerId = "dc87d974-7a93-4878-b277-c706b785c56a";
  
  console.log("Creating 'Zone Demo' in zones table...");
  const zoneId = uuidv4();
  const zoneName = "Zone Demo";
  const pricePerDay = 15000; // Bundle price for all 5

  await db.insert(zones).values({
    id: zoneId,
    name: zoneName,
    pricePerDay,
    minBookingDays: 1,
    status: "active"
  });

  const dummyScreens = [
    {
      id: uuidv4(),
      ownerId,
      zoneId, // Map directly!
      name: "MG Road LED Display",
      category: "Digital Display",
      displayFormat: "Landscape",
      resolution: "1920x1080",
      durationPerSlot: 10,
      venueName: "MG Road Metro",
      location: "MG Road, Bangalore",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      latitude: "12.971598",
      longitude: "77.594562",
      pricePerDay: 5000,
      minBookingDays: 1,
      operationalHours: "06:00 AM - 11:00 PM",
      status: "active",
      type: "Digital Display",
      size: "10x20 ft"
    },
    {
      id: uuidv4(),
      ownerId,
      zoneId, // Map directly!
      name: "Brigade Road Corner Screen",
      category: "Digital Display",
      displayFormat: "Portrait",
      resolution: "1080x1920",
      durationPerSlot: 10,
      venueName: "Brigade Road Junction",
      location: "Brigade Road, Bangalore",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      latitude: "12.975000",
      longitude: "77.590000",
      pricePerDay: 4000,
      minBookingDays: 1,
      operationalHours: "06:00 AM - 11:00 PM",
      status: "active",
      type: "Digital Display",
      size: "8x12 ft"
    },
    {
      id: uuidv4(),
      ownerId,
      zoneId, // Map directly!
      name: "Indiranagar 100ft Road Billboard",
      category: "Digital Billboard",
      displayFormat: "Landscape",
      resolution: "1920x1080",
      durationPerSlot: 15,
      venueName: "100ft Road",
      location: "Indiranagar, Bangalore",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560038",
      latitude: "12.965000",
      longitude: "77.600000",
      pricePerDay: 6000,
      minBookingDays: 1,
      operationalHours: "06:00 AM - 11:00 PM",
      status: "active",
      type: "Digital Billboard",
      size: "15x30 ft"
    },
    {
      id: uuidv4(),
      ownerId,
      zoneId, // Map directly!
      name: "Koramangala Sony World Signal",
      category: "Digital Display",
      displayFormat: "Landscape",
      resolution: "1920x1080",
      durationPerSlot: 10,
      venueName: "Sony World Junction",
      location: "Koramangala, Bangalore",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560034",
      latitude: "12.970000",
      longitude: "77.585000",
      pricePerDay: 4500,
      minBookingDays: 1,
      operationalHours: "06:00 AM - 11:00 PM",
      status: "active",
      type: "Digital Display",
      size: "10x20 ft"
    },
    {
      id: uuidv4(),
      ownerId,
      zoneId, // Map directly!
      name: "Ulsoor Lake Promenade",
      category: "Digital Display",
      displayFormat: "Portrait",
      resolution: "1080x1920",
      durationPerSlot: 10,
      venueName: "Ulsoor Lake",
      location: "Ulsoor, Bangalore",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560042",
      latitude: "12.980000",
      longitude: "77.605000",
      pricePerDay: 3500,
      minBookingDays: 1,
      operationalHours: "06:00 AM - 11:00 PM",
      status: "active",
      type: "Digital Display",
      size: "6x10 ft"
    }
  ];

  console.log("Inserting 5 dummy screens (with zoneId built-in)...");
  for (const s of dummyScreens) {
    await db.insert(screens).values(s);
  }

  console.log("Successfully created Zone Demo with 5 screens in Bangalore!");
  process.exit(0);
}

main().catch(console.error);
