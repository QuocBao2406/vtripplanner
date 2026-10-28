import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function test() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets, error);
}

test().catch(console.error);
