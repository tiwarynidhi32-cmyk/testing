import { createClient } from '@supabase/supabase-js';

// Temporary debugging logs requested by senior engineer
if (typeof import.meta !== 'undefined' && import.meta.env) {
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);
}

// Clean values and filter out empty / strictly bad placeholders.
const getCleanStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(key);
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'placeholder-key' || trimmed.includes('placeholder')) {
    return null;
  }
  return trimmed;
};

const getEnvVal = (key: string): string | null => {
  // Try static lookup first for Vite replacement compatibility
  let val: string | undefined | null = null;
  if (key === 'VITE_SUPABASE_URL') {
    val = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined;
  } else if (key === 'VITE_SUPABASE_ANON_KEY') {
    val = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : undefined;
  } else if (key === 'SUPABASE_URL') {
    val = typeof import.meta !== 'undefined' ? import.meta.env?.SUPABASE_URL : undefined;
  } else if (key === 'SUPABASE_ANON_KEY') {
    val = typeof import.meta !== 'undefined' ? import.meta.env?.SUPABASE_ANON_KEY : undefined;
  }

  // Fallback to dynamic lookup if not matched
  if (!val) {
    if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env[key] === 'string') {
      val = import.meta.env[key];
    }
  }
  if (!val) {
    if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
      val = process.env[key];
    }
  }

  if (val) {
    const trimmed = val.trim();
    if (trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined' && trimmed !== 'placeholder-key' && !trimmed.includes('placeholder')) {
      return trimmed;
    }
  }
  return null;
};

const rawSupabaseUrl = getCleanStorageItem('hms_supabase_url') || 
                       getEnvVal('VITE_SUPABASE_URL') || 
                       getEnvVal('SUPABASE_URL') || 
                       'https://plbkxsutiixhhqnndrsy.supabase.co';

const supabaseAnonKey = getCleanStorageItem('hms_supabase_anon_key') || 
                        getEnvVal('VITE_SUPABASE_ANON_KEY') || 
                        getEnvVal('SUPABASE_ANON_KEY') || 
                        'sb_publishable_U-35oLEPCPMdwJLMfiB6og_6E4qDaf6';

const isValidUrl = (url: any): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
};

// Any string that looks like a valid URL and carries a non-empty key is valid.
// Standard publishable keys (starts with sb_publishable_) are fully supported and valid.
export const isSupabaseConfigured = !!(
  rawSupabaseUrl && 
  supabaseAnonKey && 
  isValidUrl(rawSupabaseUrl) &&
  !rawSupabaseUrl.includes('placeholder')
);

// Diagnostic console print for senior inspection of credentials and Vercel loading verification
const maskedKey = supabaseAnonKey 
  ? `${supabaseAnonKey.startsWith('sb_') ? 'sb_publishable' : 'jwt'}:${supabaseAnonKey.slice(0, 10)}...${supabaseAnonKey.slice(-6)}`
  : 'none';

console.log('[Supabase Diagnostics] Load Source Integrity:', {
  url: rawSupabaseUrl,
  urlSource: getCleanStorageItem('hms_supabase_url') ? 'localStorage' : (getEnvVal('VITE_SUPABASE_URL') || getEnvVal('SUPABASE_URL') ? 'environment' : 'compile-fallback'),
  keySource: getCleanStorageItem('hms_supabase_anon_key') ? 'localStorage' : (getEnvVal('VITE_SUPABASE_ANON_KEY') || getEnvVal('SUPABASE_ANON_KEY') ? 'environment' : 'compile-fallback'),
  keyFormat: maskedKey,
  isSetupValid: isSupabaseConfigured
});

if (!isSupabaseConfigured) {
  console.warn('[Supabase Setup] Warning: Supabase credentials missing or invalid. Persistent database features will be disabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your env or via Settings > Database Setup.');
} else {
  console.log('[Supabase Setup] Success: Supabase initialized with valid connection settings.');
}

const supabaseUrl = isValidUrl(rawSupabaseUrl) ? rawSupabaseUrl.trim() : 'https://placeholder.supabase.co';
const supabaseKey = supabaseAnonKey && typeof supabaseAnonKey === 'string' && supabaseAnonKey.trim() !== '' ? supabaseAnonKey.trim() : 'placeholder-key';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
);

// Helper function to sanitize dates before inserting or updating in Postgres
export function sanitizeDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeDates);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      const isDateKey = keyLower === 'dob' || 
                        keyLower === 'tpa_validity' || 
                        keyLower === 'expiry_date' || 
                        keyLower === 'claim_date' || 
                        keyLower === 'expense_date' || 
                        keyLower === 'surgery_date' || 
                        keyLower === 'scheduled_date' || 
                        keyLower === 'delivery_date' || 
                        keyLower === 'birth_date_time' ||
                        keyLower.includes('date') || 
                        keyLower.includes('time') || 
                        keyLower.endsWith('_at') ||
                        keyLower.endsWith('at') ||
                        keyLower === 'birth_date_time';
                        
      if (isDateKey) {
        if (value === null || value === undefined || 
            (typeof value === 'string' && (
              value.trim() === '' || 
              value.trim() === '""' || 
              value.trim() === "''" || 
              value.trim() === 'null' || 
              value.trim() === 'undefined' || 
              value.trim() === '"' || 
              value.trim() === "'" ||
              value.trim().replace(/^"|"$/g, '').trim() === '' ||
              value.trim().replace(/^'|'$/g, '').trim() === ''
            ))
        ) {
          cleaned[key] = null;
        } else if (typeof value === 'string') {
          // Strip any outer quotes that might be enclosing the date value
          const stripped = value.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
          cleaned[key] = stripped === '' ? null : stripped;
        } else {
          cleaned[key] = value;
        }
      } else if (keyLower === 'age' && (value === '' || value === null || value === undefined)) {
        // Handle age as null when empty
        cleaned[key] = null;
      } else if (typeof value === 'object') {
        cleaned[key] = sanitizeDates(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
  return obj;
}

// Decorator pattern on SupabaseClient.from to intercept and sanitize dates globally
const originalFrom = (supabase as any).from.bind(supabase);
(supabase as any).from = function (table: string) {
  const queryBuilder = originalFrom(table);
  const originalInsert = queryBuilder.insert.bind(queryBuilder);
  const originalUpdate = queryBuilder.update.bind(queryBuilder);

  queryBuilder.insert = function (values: any, options?: any) {
    return originalInsert(sanitizeDates(values), options);
  };

  queryBuilder.update = function (values: any, options?: any) {
    return originalUpdate(sanitizeDates(values), options);
  };

  return queryBuilder;
};

// Setup dynamic real-time synchronization between devices (mobile, desktop, multiple tabs)
const SYNC_CHANNEL_NAME = 'hospital-db-sync';

// Initialize a shared broadcast channel
export const syncChannel = supabase.channel(SYNC_CHANNEL_NAME);

// Function to notify other devices/tabs of a data mutation
export function broadcastDataMutation(table: string, action: 'insert' | 'update' | 'delete' | 'sync') {
  try {
    syncChannel.send({
      type: 'broadcast',
      event: 'data-changed',
      payload: { table, action, senderId: window.name || 'device-' + Math.random().toString(36).substring(2, 11), timestamp: Date.now() }
    });
    // Trigger a local storage/custom event so the originating device updates immediately too
    window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table, action, local: true } }));
  } catch (err) {
    console.warn('Failed to broadcast sync mutation:', err);
  }
}

// Subscribe to real-time client-to-client sync signals
syncChannel
  .on('broadcast', { event: 'data-changed' }, (payload) => {
    console.log('Realtime broadcast synchronization signal received:', payload);
    // Notify React components locally
    window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: payload }));
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Successfully subscribed to client-to-client real-time synchronization channel.');
    }
  });

// Also attempt to listen to real-time Postgres DB Changes directly from Supabase (server-authoritative backup)
supabase
  .channel('postgres-db-changes')
  .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
    console.log('Realtime DB event received from Postgres:', payload);
    window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: payload }));
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Successfully subscribed to Postgres database real-time replication changes.');
    }
  });
