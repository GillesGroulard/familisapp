-- Add slideshow settings to families table
ALTER TABLE families 
ADD COLUMN slideshow_photo_limit INTEGER DEFAULT 30 CHECK (slideshow_photo_limit IN (10, 20, 30)),
ADD COLUMN slideshow_speed INTEGER DEFAULT 15 CHECK (slideshow_speed IN (10, 15, 30));