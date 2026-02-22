#!/usr/bin/env node
/**
 * Apply screen→image mappings to the database
 * Data sourced from user-provided mapping table
 */

require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Parse PostgreSQL array string like "{/objects/uploads/a,/objects/uploads/b}" into JS array
function parsePgArray(str) {
  if (!str || str === '{}') return [];
  // Remove outer braces
  const inner = str.slice(1, -1);
  if (!inner) return [];
  return inner.split(',').map(s => s.trim());
}

const MAPPINGS = [
  { id: '09c99b8d-ce8b-41df-a27c-e33375392a7a', screen_images: '{/objects/uploads/a8cffb73-48c4-40f8-a052-7da77ad81e16}', surrounding_images: '{}' },
  { id: '09db7086-8b9d-4371-bf0d-d5ad727e6f04', screen_images: '{/objects/uploads/08f349ee-2d16-433e-8add-13415933504a}', surrounding_images: '{}' },
  { id: '0a09d635-f4f8-40cc-8f4a-60baed4553f9', screen_images: '{/objects/uploads/4432f23a-0456-443a-97d6-cb5f1a699d5f}', surrounding_images: '{}' },
  { id: '136c7c40-363c-471c-9baa-24c10415c499', screen_images: '{/objects/uploads/40fa583e-077e-4e6e-874c-e083f9234004}', surrounding_images: '{}' },
  { id: '1477b1ea-fe3f-4535-bece-8084d9f22b80', screen_images: '{/objects/uploads/08d6a3d1-1433-4ec9-ad72-ea0e542a2aa6}', surrounding_images: '{}' },
  { id: '14b9fc26-83ea-49e1-966d-e41620b4eb94', screen_images: '{/objects/uploads/f45ee016-92c0-4695-a7d5-2e0baf789a62}', surrounding_images: '{}' },
  { id: '16b772eb-580d-48a1-a919-9e58d9f6af71', screen_images: '{/objects/uploads/a4a4b75a-8db8-4b33-83c6-5c955f5582d8}', surrounding_images: '{}' },
  { id: '1ed9cba3-88ac-47a9-95a1-ef69e76a114c', screen_images: '{/objects/uploads/33a9f875-2d75-49e8-a8bd-65d56b3ae3a1}', surrounding_images: '{}' },
  { id: '215e8905-17be-484c-8b88-1d979e9038eb', screen_images: '{/objects/uploads/de28c4a1-da21-4915-976e-257431946b0d}', surrounding_images: '{}' },
  { id: '299561e7-ef43-4027-8088-e9937848bf3a', screen_images: '{/objects/uploads/a9e3d22b-9cf7-442d-8e7c-b9eb51097ce7}', surrounding_images: '{}' },
  { id: '2db7cd33-bf89-4fe0-bd18-221107d35fe4', screen_images: '{/objects/uploads/8f7d4a8a-d8da-497f-a5f0-2a3e7251270b}', surrounding_images: '{}' },
  { id: '307bd5b5-d1a1-47bd-9d47-a21df34e5139', screen_images: '{/objects/uploads/80781b2d-0e94-48e8-8624-bccbb801f1b5}', surrounding_images: '{}' },
  { id: '37c431b8-36ca-4e71-8628-248484c956ed', screen_images: '{/objects/uploads/3026e0ad-4eea-4e1a-a615-7896ae92cc6e}', surrounding_images: '{}' },
  { id: '47f7029c-ffa3-4056-b6cb-a19f116bd8aa', screen_images: '{/objects/uploads/af75bf54-1246-497f-9d84-151c1968aaf1,/objects/uploads/ea09e6ff-f09b-4601-beca-4caa4a46326d}', surrounding_images: '{}' },
  { id: '5531eb96-55de-45a9-992d-ff0a0588dd61', screen_images: '{/objects/uploads/d6d8635f-02fd-488f-b6cc-05f351dfcc2b,/objects/uploads/88c2f7ce-082a-4aba-8423-5c70c1aa4ecc,/objects/uploads/cba07ae5-25c2-4b7b-bfda-7a1e55f508ea}', surrounding_images: '{/objects/uploads/edf69b8a-6e11-4cbf-9ca0-ecc7c94a6f53,/objects/uploads/5614b7bb-694a-49e6-8fde-32acf40f52a0}' },
  { id: '59dc2b4b-70b5-416c-b541-78417930392b', screen_images: '{/objects/uploads/ad44d291-9694-4d60-95de-1829284ed3ae}', surrounding_images: '{}' },
  { id: '5a7a7104-5510-44d6-a37d-249c8569a892', screen_images: '{/objects/uploads/11666c3e-1e23-428e-8685-6a94843fc4ea}', surrounding_images: '{}' },
  { id: '5b2cd378-8b0e-4b9c-8c64-72fb84c5e67e', screen_images: '{/objects/uploads/7d6a49e1-6ede-4f57-a556-8a6807137fd1,/objects/uploads/47ba9e09-6d8b-4a61-b840-59d42f281d64}', surrounding_images: '{}' },
  { id: '5b8402e2-99d0-457a-8065-c82a81ca20a8', screen_images: '{/objects/uploads/d54fcce0-ea74-4c89-ae7a-c6c63fa89764}', surrounding_images: '{}' },
  { id: '62fd900d-d2d0-4b7b-859c-77454140d5fa', screen_images: '{/objects/uploads/c698b311-68fc-4f94-b926-b2ce358e29fe}', surrounding_images: '{}' },
  { id: '67ba9834-8f14-468d-a694-6fc344d60cd7', screen_images: '{/objects/uploads/92dc9248-92c5-4a36-90fc-f93bcb3a00bd}', surrounding_images: '{}' },
  { id: '6a3638f4-8f96-4027-8fee-7c9999482c48', screen_images: '{/objects/uploads/5a69c441-5cb6-4a07-870a-304c262860c2}', surrounding_images: '{}' },
  { id: '6e9d3a14-c18d-4693-9f8d-e9a82aa6d559', screen_images: '{/objects/uploads/ac8acd6d-141f-4363-8ac4-dcd915475729}', surrounding_images: '{}' },
  { id: '710a4024-f5ec-4dea-9408-287049466272', screen_images: '{/objects/uploads/7e256aa9-aaa6-46a0-bbd4-2fffb0bd9d8b}', surrounding_images: '{}' },
  { id: '732b0d94-751d-443a-92b6-c3239714f854', screen_images: '{/objects/uploads/f98ac3e6-09ce-47c8-ada0-35e2af1b39f4}', surrounding_images: '{}' },
  { id: '758bcbfa-48d4-4112-86ea-3e1556ca7882', screen_images: '{/objects/uploads/b2c01b82-09a2-4e6e-96e6-9f22e2a0c21f}', surrounding_images: '{}' },
  { id: '762b2f5f-0213-4484-a62c-4cacaa224343', screen_images: '{/objects/uploads/702f8717-4399-4663-9935-e153ad92a414}', surrounding_images: '{}' },
  { id: '79a9b8f2-21cf-4c2e-8029-d2febaf25628', screen_images: '{/objects/uploads/d37eabe4-8f8f-4217-9725-2cfc72edc947,/objects/uploads/56d80deb-09d4-431c-b6cf-899e804f3295,/objects/uploads/1e10ae35-a7ff-403e-8c9f-ffb4b6f1a287}', surrounding_images: '{}' },
  { id: '84791612-2c6b-4b11-8b98-b8fc2c72da01', screen_images: '{/objects/uploads/6a802dfc-90d7-4527-b942-7eaa72e53aff}', surrounding_images: '{}' },
  { id: '90fb5d4b-53ab-4e05-a320-31b3e3d293f8', screen_images: '{/objects/uploads/8a33805b-02f8-482b-ab56-f85babdf5a30}', surrounding_images: '{/objects/uploads/17bb281a-cffc-402a-8745-b5d266b8254e}' },
  { id: '966ab7c1-3d37-492d-9400-2bf204389ddb', screen_images: '{/objects/uploads/b9340d6a-b6f3-46a4-856b-21b90d517368}', surrounding_images: '{}' },
  { id: '9af561be-23a8-4e2d-962d-53f4a42e096f', screen_images: '{/objects/uploads/872a7b58-4294-4c6a-b1e2-084c9883ef50}', surrounding_images: '{}' },
  { id: 'a20bf2ad-4bf1-471e-8708-a6490b6e78e1', screen_images: '{/objects/uploads/e0592653-ffb7-448f-9006-9c97e179dd0c}', surrounding_images: '{}' },
  { id: 'a38afc75-c338-4498-8f19-9c91b79f8e90', screen_images: '{/objects/uploads/f35a813a-cf5a-408e-b8a3-3ee5259fbf75}', surrounding_images: '{}' },
  { id: 'a43f83f6-9dfa-4297-9434-a5430831dc2c', screen_images: '{/objects/uploads/12ac5ba0-b404-40c0-800f-0c2ea830ff32}', surrounding_images: '{}' },
  { id: 'aad38f3f-b043-4bd5-b93b-d7ceb047bd45', screen_images: '{/objects/uploads/ab063124-8551-40f3-9085-6c032cba44bc}', surrounding_images: '{}' },
  { id: 'b275c9e4-c938-49c9-84b9-a47c8ede4e01', screen_images: '{/objects/uploads/2e3a0b4a-f074-4d27-a386-4b9b87168f38,/objects/uploads/d76bc036-71e5-477c-8c7a-c872be206bc7,/objects/uploads/ae8e3f11-c20b-497d-ab92-45ccbba99621}', surrounding_images: '{}' },
  { id: 'b82790c6-59dc-45d8-ac14-483d43636194', screen_images: '{/objects/uploads/8a619dbf-4813-4197-9335-97ef7c7932c0,/objects/uploads/a57631dd-d514-4e0a-a0bb-92ae46284d21}', surrounding_images: '{}' },
  { id: 'c27d9402-98e3-4c08-a061-978006a45059', screen_images: '{/objects/uploads/fb944d8a-1371-48c3-96b1-7993837f5bef}', surrounding_images: '{}' },
  { id: 'cc44bf16-8349-4fbb-894b-a9b671374177', screen_images: '{/objects/uploads/1368acc5-b2fd-4c40-bb6b-610a95b84ef6,/objects/uploads/1d513d85-9b47-4a9a-8927-c60cbea9b262}', surrounding_images: '{}' },
  { id: 'cecb0a52-997a-417e-a764-5006bdb2cdfa', screen_images: '{/objects/uploads/83e18cc1-c33d-403c-902c-cc979d288c4f}', surrounding_images: '{}' },
  { id: 'cf02bf83-d20f-419d-9ea1-a83a7163b5e3', screen_images: '{/objects/uploads/d3da5253-69d1-4412-92a7-e41e15d4a9c6}', surrounding_images: '{}' },
  { id: 'd412c53c-7619-4313-bdde-ae342f0f5ae5', screen_images: '{/objects/uploads/b6f686d9-a7a8-4f1b-9483-be76d937f3ea,/objects/uploads/7de7848d-c43c-405b-bb4b-400e6092ec32}', surrounding_images: '{}' },
  { id: 'e0a2bc2e-9225-49c9-9056-6f2d9e200312', screen_images: '{/objects/uploads/5da51bf3-ef8d-49a1-9867-b73a81aca5de,/objects/uploads/7f719ace-6846-49b4-9050-2bb13d5e2af4,/objects/uploads/e64d8f49-0ef3-4e3f-9819-29683d318923}', surrounding_images: '{}' },
  { id: 'e590a10c-f0b5-49a2-801a-354b244d3925', screen_images: '{/objects/uploads/070d7d37-0ef5-450f-b638-04e1fa942c6c}', surrounding_images: '{}' },
  { id: 'e815104e-4ac9-4714-b131-12fa3fd8a90e', screen_images: '{/objects/uploads/efc6aac5-da08-4d09-a83e-ca8cf7905934}', surrounding_images: '{}' },
  { id: 'e85d90d0-435e-419d-9d46-ed3a1b4be771', screen_images: '{/objects/uploads/bd0f7bd4-3dfc-4261-b72b-74a350eaa5ff,/objects/uploads/9e47b89b-d4dc-4d16-9d74-da313027c25d}', surrounding_images: '{}' },
  { id: 'eecdeea1-40dd-4b27-869a-fa42a31e2976', screen_images: '{/objects/uploads/2348a314-f8ec-4aa5-9c4a-61f13c03297f}', surrounding_images: '{}' },
  { id: 'f0504368-baa3-4aea-bc14-0ec27b122811', screen_images: '{/objects/uploads/29f30864-7376-410b-b3dd-68445b24cf3f}', surrounding_images: '{}' },
  { id: 'f0ab89da-79cb-4c86-bb3a-68d3ec5c7df3', screen_images: '{/objects/uploads/aca24886-bd8b-494d-b3d9-e3390717e301}', surrounding_images: '{}' },
  { id: 'f32e1e37-2107-4b41-aaa0-ee8a9546fb59', screen_images: '{/objects/uploads/40457899-c606-4579-a1af-df286164399b}', surrounding_images: '{}' },
  { id: 'f597559d-3934-40aa-a8f8-b2df16acc3a1', screen_images: '{/objects/uploads/fa0c419d-010e-49b6-b8c5-c443fa31b576,/objects/uploads/cb92b707-153e-4400-8ee9-d528d2e98ac2}', surrounding_images: '{}' },
  { id: 'fae5b29b-bcbc-4ef5-982f-89467853079e', screen_images: '{/objects/uploads/4cac0d15-3157-4036-a6d0-ec119a947fa7}', surrounding_images: '{}' },
];

async function applyMappings() {
  const client = await pool.connect();
  let updated = 0;
  let failed = 0;
  const failures = [];

  console.log(`Applying ${MAPPINGS.length} screen→image mappings...\n`);

  try {
    await client.query('BEGIN');

    for (const row of MAPPINGS) {
      const screenImages = parsePgArray(row.screen_images);
      const surroundingImages = parsePgArray(row.surrounding_images);

      try {
        const result = await client.query(
          `UPDATE screens
           SET screen_images = $1::text[], surrounding_images = $2::text[]
           WHERE id = $3`,
          [screenImages, surroundingImages, row.id]
        );

        if (result.rowCount === 0) {
          console.warn(`  WARN: No screen found with id=${row.id}`);
          failures.push({ id: row.id, reason: 'not found' });
          failed++;
        } else {
          console.log(`  ✓ ${row.id} → ${screenImages.length} screen image(s), ${surroundingImages.length} surrounding`);
          updated++;
        }
      } catch (err) {
        console.error(`  ✗ ${row.id}: ${err.message}`);
        failures.push({ id: row.id, reason: err.message });
        failed++;
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ Done. Updated: ${updated}, Failed: ${failed}`);

    if (failures.length > 0) {
      console.log('\nFailed rows:');
      failures.forEach(f => console.log(`  ${f.id}: ${f.reason}`));
    }

    // Quick verification
    const check = await client.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE array_length(screen_images, 1) > 0) as with_images
       FROM screens`
    );
    const { total, with_images } = check.rows[0];
    console.log(`\nDB verification: ${with_images}/${total} screens now have screen_images`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMappings().catch(console.error);
