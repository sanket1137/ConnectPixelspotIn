/**
 * fix-acl-policy.cjs  —  run on NEW SERVER (5.223.70.55)
 * 
 * Patches the custom:aclPolicy metadata on existing GCS objects so the
 * server's /objects/ route serves them as public images (visibility:"public").
 *
 * Usage:
 *   node scripts/fix-acl-policy.cjs
 *
 * Optionally pass UUIDs as args:
 *   node scripts/fix-acl-policy.cjs uuid1 uuid2 ...
 */

require('dotenv').config({ path: '.env.production' });
const { Storage } = require('@google-cloud/storage');

const GCS_BUCKET = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'pixelspot-uploads';
const GCS_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'pixelspot-f4010';

// Known migrated UUIDs (from error logs + first migration run)
const DEFAULT_UUIDS = [
  '08f349ee-2d16-433e-8add-13415933504a',
  'b2c01b82-09a2-4e6e-96e6-9f22e2a0c21f',
  '702f8717-4399-4663-9935-e153ad92a414',
  'de28c4a1-da21-4915-976e-257431946b0d',
  '070d7d37-0ef5-450f-b638-04e1fa942c6c',
  'd6d8635f-02fd-488f-b6cc-05f351dfcc2b',
  '33a9f875-2d75-49e8-a8bd-65d56b3ae3a1',
];

async function main() {
  const uuids = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_UUIDS;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  const gcs = (clientEmail && rawKey)
    ? new Storage({ projectId: GCS_PROJECT_ID, credentials: { client_email: clientEmail, private_key: rawKey.replace(/\\n/g, '\n') } })
    : new Storage({ projectId: GCS_PROJECT_ID });

  const bucket = gcs.bucket(GCS_BUCKET);
  const ACL_VALUE = JSON.stringify({ owner: 'migrated', visibility: 'public' });

  console.log(`Fixing ACL policy on ${uuids.length} GCS objects...\n`);

  let ok = 0, fail = 0;
  for (const uuid of uuids) {
    const gcsPath = `private/uploads/${uuid}`;
    process.stdout.write(`  ${uuid} ... `);
    try {
      await bucket.file(gcsPath).setMetadata({ metadata: { 'custom:aclPolicy': ACL_VALUE } });
      console.log('✅ fixed');
      ok++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} fixed, ${fail} failed`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
