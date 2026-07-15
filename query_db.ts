import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nlyfngpitxuqtczeqjaw.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_q0e5J5_yWRYl_KHS7U6HhA_zbTpGZdC';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying all appointments...');
  const { data, error } = await supabase
    .from('appointments')
    .select('*');
  
  if (error) {
    console.error('Error fetching appointments:', error);
  } else {
    console.log('Total Appointments:', data?.length);
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
