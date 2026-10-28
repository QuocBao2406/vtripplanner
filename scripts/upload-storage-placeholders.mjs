import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Minimal valid 1x1 transparent PNG in base64
const MINIMAL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const pngBuffer = Buffer.from(MINIMAL_PNG_BASE64, 'base64');

const filesToUpload = [
  "categories/history-museum.png",
  "categories/architecture-culture.png",
  "categories/nature-park.png",
  "categories/entertainment-experience.png",
  "categories/market-food.png",
  "categories/spiritual.png",
  "cities/ho-chi-minh-city.png",
  "cities/da-lat.png",
];

async function uploadCategoryPlaceholders() {
  for (const path of filesToUpload) {
    console.log(`Uploading ${path}...`);
    const { data, error } = await supabase.storage
      .from('place-images')
      .upload(path, pngBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    if (error) {
      console.error(`Error uploading ${path}:`, error);
    } else {
      console.log(`Successfully uploaded ${path}`);
    }
  }
}

uploadCategoryPlaceholders().catch(console.error);
