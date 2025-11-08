-- ========================================
-- Production Database Migration - November 4, 2025
-- ========================================
-- 
-- Summary of Changes:
-- 1. Add new image management fields to screens table
--    - screenImages: Up to 4 images of the actual screen/billboard
--    - surroundingImages: Up to 5 images of the surrounding area
--    - images field is now DEPRECATED (kept for backward compatibility)
-- 2. Add rejection reason field to screens table
-- 3. Add rejection reason field to campaigns table
--
-- These changes support:
-- - Better image organization for screen listings
-- - Admin rejection workflow with reasons
-- - Campaign rejection workflow with reasons
-- ========================================

-- Connect to the database
\c connectpixelspot

-- Begin transaction
BEGIN;

-- ========================================
-- SCREENS TABLE UPDATES
-- ========================================

-- Add screen_images column (up to 4 images of actual screen)
ALTER TABLE screens 
ADD COLUMN IF NOT EXISTS screen_images TEXT[];

-- Add surrounding_images column (up to 5 images of surrounding area)
ALTER TABLE screens 
ADD COLUMN IF NOT EXISTS surrounding_images TEXT[];

-- Add rejection_reason column for admin rejections
ALTER TABLE screens 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add comment to clarify images field is deprecated
COMMENT ON COLUMN screens.images IS 'DEPRECATED - Kept for backward compatibility. Use screen_images instead.';
COMMENT ON COLUMN screens.screen_images IS 'Up to 4 images of the actual screen/billboard';
COMMENT ON COLUMN screens.surrounding_images IS 'Up to 5 images of the surrounding area';
COMMENT ON COLUMN screens.rejection_reason IS 'Admin reason for rejecting the screen if status is inactive';

-- ========================================
-- CAMPAIGNS TABLE UPDATES
-- ========================================

-- Add rejection_reason column for admin rejections
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN campaigns.rejection_reason IS 'Admin reason for rejecting the campaign if status is rejected';

-- ========================================
-- DATA MIGRATION (Optional)
-- ========================================

-- Migrate existing images to screen_images if they exist
-- This preserves existing data while transitioning to new structure
UPDATE screens 
SET screen_images = images 
WHERE images IS NOT NULL 
  AND array_length(images, 1) > 0 
  AND screen_images IS NULL;

-- ========================================
-- VALIDATION QUERIES
-- ========================================

-- Check screens table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'screens' 
  AND column_name IN ('images', 'screen_images', 'surrounding_images', 'rejection_reason')
ORDER BY ordinal_position;

-- Check campaigns table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'campaigns' 
  AND column_name = 'rejection_reason'
ORDER BY ordinal_position;

-- Count screens with images in different columns
SELECT 
    COUNT(*) as total_screens,
    COUNT(images) as has_legacy_images,
    COUNT(screen_images) as has_screen_images,
    COUNT(surrounding_images) as has_surrounding_images,
    COUNT(rejection_reason) as has_rejection_reason
FROM screens;

-- Count campaigns with rejection reasons
SELECT 
    COUNT(*) as total_campaigns,
    COUNT(rejection_reason) as has_rejection_reason,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_campaigns
FROM campaigns;

-- Commit transaction
COMMIT;

-- ========================================
-- ROLLBACK SCRIPT (in case of issues)
-- ========================================
/*
BEGIN;

-- Remove new columns from screens table
ALTER TABLE screens DROP COLUMN IF EXISTS screen_images;
ALTER TABLE screens DROP COLUMN IF EXISTS surrounding_images;
ALTER TABLE screens DROP COLUMN IF EXISTS rejection_reason;

-- Remove rejection_reason from campaigns table
ALTER TABLE campaigns DROP COLUMN IF EXISTS rejection_reason;

COMMIT;
*/

-- ========================================
-- END OF MIGRATION
-- ========================================

VACUUM ANALYZE screens;
VACUUM ANALYZE campaigns;

SELECT 'Migration completed successfully!' as status;
