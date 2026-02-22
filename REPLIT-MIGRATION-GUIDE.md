# Replit → GCS Image Migration Guide

Images are currently stored in Replit Object Storage on `pixel-spot-connect.replit.app`.
They need to be migrated to Google Cloud Storage (`pixelspot-uploads` bucket) so the new
server at `5.223.70.55` can serve them.

---

## STEP 1 — Get file list from Replit (run this in Replit Shell)

1. Open https://replit.com and go to your **pixel-spot-connect** project
2. Click the **Shell** tab
3. Run this one-liner to get all object names:

```sh
node -e "
const {Client} = require('@replit/object-storage');
const c = new Client();
c.list().then(r => {
  if (!r.ok) { console.error('list failed:', r.error); return; }
  console.log('===UUIDS===');
  r.value.forEach(o => console.log(o.name));
  console.log('===END===');
}).catch(console.error);
"
```

4. **Copy all the lines between `===UUIDS===` and `===END===`** — these are the Replit object Names.

---

## STEP 2 — Run migration on new server

SSH into the new server `5.223.70.55` and run:

```sh
ssh root@5.223.70.55
cd /var/www/pixelspot

# Create a file with the UUID list (one per line, paste from Step 1):
cat > /tmp/uuid-list.txt << 'EOF'
uploads/08f349ee-2d16-433e-8add-13415933504a
uploads/b2c01b82-09a2-4e6e-96e6-9f22e2a0c21f
# ... paste all lines from Step 1 here
EOF

# Run the migration
node scripts/migrate-from-uuid-list.cjs /tmp/uuid-list.txt
```

---

## STEP 3 — Re-assign images to screens

After migration, use the **Admin panel → Screens** to re-assign the uploaded images:

1. Go to `https://connect.pixelspot.in/admin/screens` (old server, view the current images)
2. Go to `http://5.223.70.55/admin/screens` (new server, paste the `/objects/uploads/<uuid>` paths)

The script in Step 2 outputs image URLs like:
```
/objects/uploads/08f349ee-2d16-433e-8add-13415933504a
```

---

## STEP 4 — Switch DNS

Once images are migrated and re-assigned:

1. Login to your DNS provider
2. Update `connect.pixelspot.in` A record from `34.111.179.208` → `5.223.70.55`
3. Wait for DNS propagation (usually 5–30 minutes)

---

## Scripts Reference

| Script | Where to run | Purpose |
|--------|-------------|---------|
| `scripts/migrate-replit-to-gcs.cjs` | Replit Shell | List + export all Replit Storage objects |
| `scripts/upload-replit-exports-to-gcs.cjs` | New server | Download from old server URL + upload to GCS |
| `scripts/migrate-from-uuid-list.cjs` | New server | Download specific UUIDs + upload to GCS |

---

## If Replit project goes offline

Use the UUID list below (from original error logs) as a starting point.
Run `scripts/upload-replit-exports-to-gcs.cjs` on the new server with `UUIDS_ONLY=true`:

```
08f349ee-2d16-433e-8add-13415933504a
b2c01b82-09a2-4e6e-96e6-9f22e2a0c21f
702f8717-4399-4663-9935-e153ad92a414
de28c4a1-da21-4915-976e-257431946b0d
070d7d37-0ef5-450f-b638-04e1fa942c6c
d6d8635f-02fd-488f-b6cc-05f351dfcc2b
33a9f875-2d75-49e8-a8bd-65d56b3ae3a1
```
