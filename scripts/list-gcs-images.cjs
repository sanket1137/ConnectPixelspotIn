require('dotenv').config({ path: '.env.production' });
const { Storage } = require('@google-cloud/storage');
const gcs = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  }
});
gcs.bucket('pixelspot-uploads').getFiles({ prefix: 'private/uploads/' }).then(([files]) => {
  console.log(`\n${files.length} image files in GCS bucket (pixelspot-uploads/private/uploads/):\n`);
  files.forEach(f => {
    const uuid = f.name.split('/').pop();
    console.log(`  /objects/uploads/${uuid}`);
  });
}).catch(e => console.error(e.message));
