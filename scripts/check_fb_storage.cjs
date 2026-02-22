const path = require('path');
require(path.join('/var/www/pixelspot/node_modules/dotenv')).config({path:'/var/www/pixelspot/.env.production'});
const { Storage } = require(path.join('/var/www/pixelspot/node_modules/@google-cloud/storage'));
const https = require('https');
const { createSign } = require('crypto');

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
if (privateKey) privateKey = privateKey.replace(/\\n/g, "\n").replace(/^["'\s]+|["'\s]+$/g, "");
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

// Firebase storage bucket names to try
const FB_BUCKETS = [
  'pixelspot-f4010.appspot.com',
  'pixelspot-f4010.firebasestorage.app',
  `${projectId}.appspot.com`,
];

const storage = new Storage({ projectId, credentials: { client_email: clientEmail, private_key: privateKey } });

// Get GCP access token
function makeJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  })).toString('base64url');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  return `${header}.${payload}.${sign.sign(privateKey, 'base64url')}`;
}

function getToken() {
  return new Promise((resolve, reject) => {
    const jwt = makeJWT();
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d).access_token));
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function listFilesREST(token, bucket, prefix = '') {
  return new Promise((resolve) => {
    const qs = `?maxResults=1000${prefix ? '&prefix=' + encodeURIComponent(prefix) : ''}`;
    const req = https.request({
      hostname: 'storage.googleapis.com',
      path: `/storage/v1/b/${encodeURIComponent(bucket)}/o${qs}`,
      headers: { Authorization: `Bearer ${token}` }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({raw:d.substring(0,200)}); } });
    });
    req.on('error', e => resolve({error: e.message}));
    req.end();
  });
}

async function run() {
  const token = await getToken();
  console.log('Token OK');

  for (const bucket of FB_BUCKETS) {
    console.log(`\n=== Checking bucket: ${bucket} ===`);
    const result = await listFilesREST(token, bucket);
    if (result.items) {
      console.log(`✅ FOUND ${result.items.length} files!`);
      result.items.forEach(f => {
        const match = f.name.match(/([0-9a-f-]{36})$/);
        console.log(f.name, match ? `(UUID: ${match[1]})` : '');
      });
      if (result.nextPageToken) console.log('  ... more files (paginated)');
    } else if (result.error) {
      const err = result.error;
      if (err.code) console.log(`  HTTP ${err.code}: ${err.message}`);
      else console.log('  Error:', JSON.stringify(err).substring(0,100));
    } else {
      console.log('  Empty response:', JSON.stringify(result).substring(0,200));
    }
  }

  // Also check Replit object storage if env var available
  const replitBucketId = process.env.REPLIT_BUCKET_ID || process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (replitBucketId) {
    console.log(`\n=== Replit Bucket ID found: ${replitBucketId} ===`);
  } else {
    console.log('\nNo REPLIT_BUCKET_ID / DEFAULT_OBJECT_STORAGE_BUCKET_ID in env');
  }
  
  // Print all env vars related to storage
  console.log('\n=== Storage-related env vars ===');
  Object.keys(process.env).filter(k => /storage|bucket|object|replit|upload/i.test(k)).forEach(k => {
    const v = process.env[k];
    console.log(`${k}=${v && v.length > 50 ? v.substring(0,50)+'...' : v}`);
  });
}
run().catch(console.error);
