
export function isLiveEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return false;
  if (hostname.includes('ais-dev') || hostname.includes('ais-pre')) return false;
  return true;
}

function isSupabaseConfig(): boolean {
  try {
    const getCleanItem = (key: string): string | null => {
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
        val = import.meta.env.VITE_SUPABASE_URL;
      } else if (key === 'VITE_SUPABASE_ANON_KEY') {
        val = import.meta.env.VITE_SUPABASE_ANON_KEY;
      } else if (key === 'SUPABASE_URL') {
        val = import.meta.env.SUPABASE_URL;
      } else if (key === 'SUPABASE_ANON_KEY') {
        val = import.meta.env.SUPABASE_ANON_KEY;
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

    const url = getCleanItem('hms_supabase_url') || 
                getEnvVal('VITE_SUPABASE_URL') || 
                getEnvVal('SUPABASE_URL') || 
                'https://nlyfngpitxuqtczeqjaw.supabase.co';

    const key = getCleanItem('hms_supabase_anon_key') || 
                getEnvVal('VITE_SUPABASE_ANON_KEY') || 
                getEnvVal('SUPABASE_ANON_KEY') || 
                'sb_publishable_q0e5J5_yWRYl_KHS7U6HhA_zbTpGZdC';

    if (url && key && 
        (url.startsWith('http://') || url.startsWith('https://')) && 
        !url.includes('placeholder')) {
      return true;
    }
  } catch (e) {}
  return false;
}

function isMockId(id: any): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^(p|a|bill|i|rx|ot|op|ns|nt)\d+$/.test(id);
}

function sanitizeStorageValue(key: string, val: any): any {
  if (!val) return val;
  
  if (!(isLiveEnvironment() || isSupabaseConfig())) {
    return val;
  }
  
  // Clean beds association
  if (key === 'hms_beds' && Array.isArray(val)) {
    return val.map((bed: any) => ({
      ...bed,
      status: 'Available',
      patientId: undefined,
      patient_id: undefined
    }));
  }

  // Clean OT Room associations
  if (key === 'hms_ot_rooms' && Array.isArray(val)) {
    return val.map((room: any) => ({
      ...room,
      status: 'Available'
    }));
  }
  
  // Under live or configured Supabase, strip mock transaction/patient items
  if (Array.isArray(val)) {
    return val.filter((item: any) => {
      if (!item) return false;
      if (item.id && isMockId(item.id)) return false;
      if (item.cat_id && isMockId(item.cat_id)) return false;
      if (item.subcat_id && isMockId(item.subcat_id)) return false;
      if (item.unit_id && isMockId(item.unit_id)) return false;
      if (item.patientId && isMockId(item.patientId)) return false;
      if (item.patient_id && isMockId(item.patient_id)) return false;
      if (item.pat_id && isMockId(item.pat_id)) return false;
      return true;
    });
  }
  
  if (typeof val === 'object') {
    if (val.id && isMockId(val.id)) return null;
    if (val.patientId && isMockId(val.patientId)) return null;
    if (val.patient_id && isMockId(val.patient_id)) return null;
  }
  
  return val;
}

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      const parsed = item ? JSON.parse(item) : defaultValue;
      return sanitizeStorageValue(key, parsed) as T;
    } catch (error) {
      console.error(`Error reading storage key "${key}":`, error);
      return sanitizeStorageValue(key, defaultValue) as T;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      const stringifiedValue = JSON.stringify(value);
      const existing = localStorage.getItem(key);
      if (existing === stringifiedValue) {
        return; // Avoid redundant writes and infinite render/sync loops!
      }
      localStorage.setItem(key, stringifiedValue);
      
      if (typeof window !== 'undefined') {
        // Dispatch custom event for same-tab reactive update
        window.dispatchEvent(new CustomEvent('supabase-data-sync', {
          detail: { table: key, action: 'update', local: true }
        }));
        
        // Dispatch synthetic StorageEvent so same-tab listeners to 'storage' update instantly
        window.dispatchEvent(new StorageEvent('storage', {
          key: key,
          newValue: stringifiedValue,
          storageArea: localStorage
        }));

        // Broadcast to other tabs/panels on the same device using BroadcastChannel
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const channel = new BroadcastChannel('hms-local-sync');
            channel.postMessage({ key, value });
            channel.close();
          } catch (e) {
            console.warn('BroadcastChannel sync error:', e);
          }
        }
      }
    } catch (error) {
      console.error(`Error writing storage key "${key}":`, error);
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-data-sync', {
          detail: { table: key, action: 'delete', local: true }
        }));
        
        window.dispatchEvent(new StorageEvent('storage', {
          key: key,
          newValue: null,
          storageArea: localStorage
        }));

        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const channel = new BroadcastChannel('hms-local-sync');
            channel.postMessage({ key, value: null });
            channel.close();
          } catch (e) {}
        }
      }
    } catch (error) {
      console.error(`Error removing storage key "${key}":`, error);
    }
  },
  clear: (): void => {
    try {
      localStorage.clear();
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-data-sync', {
          detail: { table: 'all', action: 'delete', local: true }
        }));
        
        window.dispatchEvent(new StorageEvent('storage', {
          key: null,
          newValue: null,
          storageArea: localStorage
        }));

        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const channel = new BroadcastChannel('hms-local-sync');
            channel.postMessage({ key: 'all', value: null });
            channel.close();
          } catch (e) {}
        }
      }
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  }
};

export const STORAGE_KEYS = {
  PATIENTS: 'hms_patients',
  APPOINTMENTS: 'hms_appointments',
  BILLING: 'hms_billing',
  LAB_BILLS: 'hms_lab_bills',
  INVENTORY: 'hms_inventory',
  EXPENSES: 'hms_expenses',
  INSURANCE: 'hms_insurance',
  NURSING_TASKS: 'hms_nursing_tasks',
  BEDS: 'hms_beds',
  PHARMACY_BILLS: 'hms_pharmacy_billing',
  PRESCRIPTIONS: 'hms_prescriptions',
  TEMPLATE_IMAGE: 'hms_template_image',
  BED_RATES: 'hms_bed_rates',
  OT_RATES: 'hms_ot_rates',
  LAB_RATES: 'hms_lab_rates',
  MATERIAL_RATES: 'hms_material_rates',
  HOSPITAL_INFO: 'hms_hospital_info',
  USERS: 'hms_users',
  AUDIT_LOGS: 'hms_audit_logs',
  SESSION_USER: 'hms_session_user',
  AUTH_STATUS: 'hms_auth_status',
  LAB_TEST_ORDERS: 'hms_lab_test_orders',
  EXTERNAL_REPORTS: 'hms_external_reports',
  RADIOLOGY_FILES: 'hms_radiology_files',
  PATIENT_VITALS: 'hms_patient_vitals',
  TAX_SLABS: 'hms_tax_slabs',
  OPD_CHARGES: 'hms_opd_charges',
  EQUIPMENT: 'hms_equipment',
  BREAKDOWNS: 'hms_breakdowns',
};
