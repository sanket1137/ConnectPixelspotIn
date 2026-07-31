import { Storage } from "@google-cloud/storage";

const storage = new Storage({ projectId: 'pixelspot-f4010' });

async function listFiles() {
  try {
    const bucket = storage.bucket('pixelspot-f4010.appspot.com');
    const [files] = await bucket.getFiles({ prefix: 'uploads/' });
    console.log('Files:');
    files.forEach(file => {
      console.log(file.name);
    });
  } catch (err) {
    console.error('Error listing files:', err);
  }
}

listFiles();
