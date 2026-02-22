const path = require('path');
require(path.join('/var/www/pixelspot/node_modules/dotenv')).config({path:'/var/www/pixelspot/.env.production'});
const { Storage } = require(path.join('/var/www/pixelspot/node_modules/@google-cloud/storage'));

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
if (privateKey) privateKey = privateKey.replace(/\\n/g, "\n").replace(/^["'\s]+|["'\s]+$/g, "");
const storage = new Storage({ projectId, credentials: { client_email: clientEmail, private_key: privateKey } });

async function run() {
  const BUCKET = 'pixelspot-uploads';
  console.log('Listing ALL files in bucket:', BUCKET);
  
  // auto-paginates by default
  const [files] = await storage.bucket(BUCKET).getFiles();
  
  console.log(`Total files: ${files.length}`);
  const uuids = [];
  for (const f of files) {
    console.log(f.name);
    const match = f.name.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);
    if (match) uuids.push({ uuid: match[1], path: f.name });
  }
  
  console.log(`\nImage UUIDs found: ${uuids.length}`);
  uuids.forEach(u => console.log(`UUID:${u.uuid}|GCSPATH:${u.path}`));
}
run().catch(e => console.error('Error:', e.message));
