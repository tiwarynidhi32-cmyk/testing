import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://plbkxsutiixhhqnndrsy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_U-35oLEPCPMdwJLMfiB6og_6E4qDaf6';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, email');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
