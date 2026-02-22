// Use Firebase SA credentials to discover GCP hosting setup and find image files
const path = require('path');
require(path.join('/var/www/pixelspot/node_modules/dotenv')).config({path:'/var/www/pixelspot/.env.production'});
const https = require('https');

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
if (privateKey) privateKey = privateKey.replace(/\\n/g, "\n").replace(/^["'\s]+|["'\s]+$/g, "");
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

// Get GCP access token using JWT
const { createSign } = require('crypto');
function makeJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail, scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  })).toString('base64url');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(privateKey, 'base64url');
  return `${header}.${payload}.${sig}`;
}

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const jwt = makeJWT();
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: {'Content-Type':'application/x-www-form-urlencoded','Content-Length':body.length}
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { const j = JSON.parse(data); resolve(j.access_token || j.error); });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function gcpGet(token, hostname, path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path, method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve({raw: data.substring(0,500)}); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Getting GCP access token...');
  const token = await getAccessToken();
  if (!token || token.includes('error')) { console.error('Token error:', token); return; }
  console.log('✅ Got access token\n');

  // 1. Check what App Engine apps exist
  console.log('=== App Engine services ===');
  const ae = await gcpGet(token, 'appengine.googleapis.com', `/v1/apps/${projectId}/services`);
  console.log(JSON.stringify(ae, null, 2).substring(0, 500));

  // 2. Check Cloud Run services
  console.log('\n=== Cloud Run services ===');
  const cr = await gcpGet(token, 'run.googleapis.com', `/v2/projects/${projectId}/locations/-/services`);
  console.log(JSON.stringify(cr, null, 2).substring(0, 500));

  // 3. List ALL GCS buckets via storage API
  console.log('\n=== All GCS Buckets ===');
  const buckets = await gcpGet(token, 'storage.googleapis.com', `/storage/v1/b?project=${projectId}`);
  if (buckets.items) {
    buckets.items.forEach(b => console.log('Bucket:', b.name, '| Location:', b.location));
  } else {
    console.log(JSON.stringify(buckets).substring(0, 500));
  }

  // 4. Try to list files in known buckets
  const knownBuckets = [
    'pixelspot-uploads',
    `${projectId}.appspot.com`,
    'pixelspot-media',
    'pixelspot-files',
  ];
  for (const bucket of knownBuckets) {
    console.log(`\n=== Files in ${bucket} ===`);
    const files = await gcpGet(token, 'storage.googleapis.com', `/storage/v1/b/${bucket}/o?maxResults=5`);
    if (files.items) {
      console.log(`Found ${files.items.length} files`);
      files.items.forEach(f => console.log(' ', f.name));
      if (files.nextPageToken) console.log('  ... more files exist');
    } else {
      console.log(JSON.stringify(files).substring(0, 200));
    }
  }
}
run();
