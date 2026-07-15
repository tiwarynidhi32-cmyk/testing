import React, { useState, ChangeEvent, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  Upload,
  ShieldCheck,
  Users,
  Stethoscope,
  Printer,
  UserPlus,
  Lock,
  Receipt,
  Scissors,
  Image as ImageIcon,
  Layout,
  History,
  Activity,
  Database,
  Pill,
  Percent,
  Copy,
  Check,
  Code,
  RefreshCw,
  Cloud
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MOCK_USERS, MOCK_PATIENTS, MOCK_BED_RATES, MOCK_OT_RATES, MOCK_LAB_TESTS, MOCK_MATERIAL_RATES } from '@/mockData';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getPrescriptionPrintHtml } from '@/lib/prescriptionPrint';
import { syncOfflineDataWithSupabase, getSupabaseUnreachable, setSupabaseUnreachable, supabaseService } from '@/services/supabaseService';
import { DEFAULT_PHARMACY_SETTINGS } from '@/lib/pharmacyInvoicePrint';
import { normalizeRole } from '@/utils/rbac';

// ==========================================
// SUPABASE DATABASE SQL CODE FOR TAX SLABS, BILLS, PHARMACY
// ==========================================
const SUPABASE_SQL_SCRIPTS = {
  all: `-- ====================================================================
--   HMS SUPABASE COMPLETE MIGRATE: TAX SLABS & SECURE GST BILLING
-- ====================================================================

-- 1. Create Tax Slabs Table
CREATE TABLE IF NOT EXISTS public.tax_slabs (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    type VARCHAR(50) NOT NULL DEFAULT 'GST',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed defaults standard GST Slabs
INSERT INTO public.tax_slabs (id, name, rate, type, description, is_active) VALUES
('tax-ex', 'GST Zero (Exempt)', 0.00, 'GST', 'Medical services and select life-saving medicines', true),
('tax-5', 'GST 5%', 5.00, 'GST', 'Standard pharmaceutical drugs, injectables, and diagnostic test kits', true),
('tax-12', 'GST 12%', 12.00, 'GST', 'Syringes, medical instruments, and specialised diabetic medicines', true),
('tax-18', 'GST 18%', 18.00, 'GST', 'Capital healthcare machinery, monitors, and dental care fixtures', true),
('tax-28', 'GST 28%', 28.00, 'GST', 'Aesthetic improvements and luxury cosmetic treatments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Hospital Invoices Table (Overall Bill)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,        -- Accumulated bill tax
    payable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,    -- (Total - Discount) + Tax
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',   -- Paid, Unpaid, Pending
    payment_method VARCHAR(50),                             -- Cash, Card, UPI, Insurance
    tpa_approval_status VARCHAR(50) DEFAULT 'Direct',
    issued_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Itemised Invoice Lines Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,                               -- Item name / service
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,        -- quantity * unit_price
    tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,      -- Active GST slab rate applied
    category VARCHAR(100) DEFAULT 'General',                  -- IPD, OPD, Lab, OT, Room, Pharmacy
    source_type VARCHAR(50),                                 -- 'pharmacy', 'lab', 'service'
    source_id TEXT
);

-- 4. Create Pharmacy Stock Table with automatic Tax Assignment
CREATE TABLE IF NOT EXISTS public.pharmacy_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100),
    expiry_date DATE,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,          -- Selling price to patient
    tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 12.00,      -- GST Slab rate tied to this medicine
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`,

  tax_slabs: `-- 1. CREATE TAX / GST SLABS MASTER CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.tax_slabs (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    type VARCHAR(50) NOT NULL DEFAULT 'GST',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed defaults standard GST Slabs
INSERT INTO public.tax_slabs (id, name, rate, type, description, is_active) VALUES
('tax-ex', 'GST Zero (Exempt)', 0.00, 'GST', 'Medical services and select life-saving medicines', true),
('tax-5', 'GST 5%', 5.00, 'GST', 'Standard pharmaceutical drugs, injectables, and diagnostic test kits', true),
('tax-12', 'GST 12%', 12.00, 'GST', 'Syringes, medical instruments, and specialised diabetic medicines', true),
('tax-18', 'GST 18%', 18.00, 'GST', 'Capital healthcare machinery, monitors, and dental care fixtures', true),
('tax-28', 'GST 28%', 28.00, 'GST', 'Aesthetic improvements and luxury cosmetic treatments', true)
ON CONFLICT (id) DO NOTHING;`,

  billing: `-- 2. OVERALL BILLS & ITEMISED CHARGES (IPD, OPD, LAB)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,        -- Accumulated bill tax
    payable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,    -- (Total - Discount) + Tax
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',   -- Paid, Unpaid, Pending
    payment_method VARCHAR(50),                             -- Cash, Card, UPI, Insurance
    tpa_approval_status VARCHAR(50) DEFAULT 'Direct',
    issued_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,                               -- Item name / service
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,        -- quantity * unit_price
    tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,      -- Active GST slab rate applied
    category VARCHAR(100) DEFAULT 'General',                  -- IPD, OPD, Lab, OT, Room, Pharmacy
    source_type VARCHAR(50),                                 -- 'pharmacy', 'lab', 'service'
    source_id TEXT
);`,

  pharmacy: `-- 3. PHARMACY STOCK & MEDICINE MANAGEMENT WITH DYNAMIC TAXES
CREATE TABLE IF NOT EXISTS public.pharmacy_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100),
    expiry_date DATE,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,          -- Selling price to patient
    tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 12.00,      -- GST Slab rate tied to this medicine
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`
};

const resizeImage = (file: File, maxW: number, maxH: number, callback: (resized: string) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
      } else {
        if (height > maxH) {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/png'));
      } else {
        callback(e.target?.result as string);
      }
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

export default function Settings({ currentUser, onUserUpdate, onHospitalUpdate }: { currentUser?: any, onUserUpdate?: (user: any) => void, onHospitalUpdate?: (info: any) => void }) {
  const resolvedUser = currentUser || storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isAccountant = normalizeRole(resolvedUser?.role) === 'ACCOUNTANT';
  const isAdmin = resolvedUser?.role === 'SUPER_ADMIN' || resolvedUser?.role === 'ADMIN' || resolvedUser?.role?.toUpperCase().includes('ADMIN') || (resolvedUser?.email && resolvedUser.email.toLowerCase().includes('admin'));
  const isFrontOffice = resolvedUser?.role === 'RECEPTION' || resolvedUser?.role === 'RECEPTIONIST' || resolvedUser?.role === 'FRONT_DESK' || (resolvedUser?.email && (resolvedUser.email.toLowerCase().includes('frontoffice') || resolvedUser.email.toLowerCase().includes('frontdesk')));
  currentUser = resolvedUser;

  const [templateImage, setTemplateImage] = useState<string | null>(() => storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null));

  // Supabase SQL Editor State
  const [sqlTab, setSqlTab] = useState<'all' | 'tax_slabs' | 'billing' | 'pharmacy'>('all');
  const [copiedSql, setCopiedSql] = useState(false);

  // Tax Slab Settings
  const [taxSlabs, setTaxSlabs] = useState<any[]>(() => 
    storage.get(STORAGE_KEYS.TAX_SLABS, [
      { id: 'tax-ex', name: 'GST Zero (Exempt)', rate: 0, type: 'GST', isActive: true, description: 'Medical services and select life-saving medicines' },
      { id: 'tax-5', name: 'GST 5%', rate: 5, type: 'GST', isActive: true, description: 'Standard pharmaceutical drugs, injectables, and diagnostic test kits' },
      { id: 'tax-12', name: 'GST 12%', rate: 12, type: 'GST', isActive: true, description: 'Syringes, medical instruments, and specialised diabetic medicines' },
      { id: 'tax-18', name: 'GST 18%', rate: 18, type: 'GST', isActive: true, description: 'Capital healthcare machinery, monitors, and dental care fixtures' },
      { id: 'tax-28', name: 'GST 28%', rate: 28, type: 'GST', isActive: true, description: 'Aesthetic improvements and luxury cosmetic treatments' }
    ])
  );

  const [editingSlab, setEditingSlab] = useState<any | null>(null);
  const [newSlab, setNewSlab] = useState({ name: '', rate: '', type: 'GST', description: '', isActive: true });

  const handleAddSlab = () => {
    if (!newSlab.name.trim() || newSlab.rate === '') {
      toast.error('Please enter a slab name and valid tax rate %');
      return;
    }
    const rateNum = parseFloat(newSlab.rate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      toast.error('Tax rate must be a valid percentage between 0 and 100');
      return;
    }

    const item = {
      id: 'tax-' + Math.random().toString(36).substring(2, 9),
      name: newSlab.name.trim(),
      rate: rateNum,
      type: newSlab.type,
      description: newSlab.description.trim(),
      isActive: newSlab.isActive
    };

    const updated = [...taxSlabs, item];
    setTaxSlabs(updated);
    storage.set(STORAGE_KEYS.TAX_SLABS, updated);
    setNewSlab({ name: '', rate: '', type: 'GST', description: '', isActive: true });
    toast.success('Tax slab added successfully!');
  };

  const handleUpdateSlab = () => {
    if (!editingSlab || !editingSlab.name.trim() || editingSlab.rate === '') {
      toast.error('Please fill in required fields');
      return;
    }
    const rateNum = parseFloat(editingSlab.rate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      toast.error('Tax rate must be a valid percentage between 0 and 100');
      return;
    }

    const updated = taxSlabs.map(s => s.id === editingSlab.id ? { 
      ...s, 
      name: editingSlab.name.trim(), 
      rate: rateNum, 
      type: editingSlab.type, 
      description: editingSlab.description.trim(),
      isActive: editingSlab.isActive
    } : s);

    setTaxSlabs(updated);
    storage.set(STORAGE_KEYS.TAX_SLABS, updated);
    setEditingSlab(null);
    toast.success('Tax slab updated successfully!');
  };

  const handleDeleteSlab = (id: string) => {
    const updated = taxSlabs.filter(s => s.id !== id);
    setTaxSlabs(updated);
    storage.set(STORAGE_KEYS.TAX_SLABS, updated);
    toast.success('Tax slab removed successfully.');
  };

  const handleToggleSlabStatus = (id: string) => {
    const updated = taxSlabs.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    setTaxSlabs(updated);
    storage.set(STORAGE_KEYS.TAX_SLABS, updated);
    toast.success('Tax slab status updated.');
  };

  const handleResetSlabsToDefault = () => {
    const defaults = [
      { id: 'tax-ex', name: 'GST Zero (Exempt)', rate: 0, type: 'GST', isActive: true, description: 'Medical services and select life-saving medicines' },
      { id: 'tax-5', name: 'GST 5%', rate: 5, type: 'GST', isActive: true, description: 'Standard pharmaceutical drugs, injectables, and diagnostic test kits' },
      { id: 'tax-12', name: 'GST 12%', rate: 12, type: 'GST', isActive: true, description: 'Syringes, medical instruments, and specialised diabetic medicines' },
      { id: 'tax-18', name: 'GST 18%', rate: 18, type: 'GST', isActive: true, description: 'Capital healthcare machinery, monitors, and dental care fixtures' },
      { id: 'tax-28', name: 'GST 28%', rate: 28, type: 'GST', isActive: true, description: 'Aesthetic improvements and luxury cosmetic treatments' }
    ];
    setTaxSlabs(defaults);
    storage.set(STORAGE_KEYS.TAX_SLABS, defaults);
    toast.success('Tax slabs restored to standard GST rates.');
  };

  // Supabase states
  const getCleanedStateItem = (key: string): string => {
    if (typeof window === 'undefined') return '';
    const val = localStorage.getItem(key);
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'placeholder-key') {
      return '';
    }
    return trimmed;
  };

  const getCleanedEnvVal = (val: any): string => {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'placeholder-key') {
      return '';
    }
    return trimmed;
  };

  const [dbUrl, setDbUrl] = useState(() => getCleanedStateItem('hms_supabase_url') || getCleanedEnvVal(import.meta.env.VITE_SUPABASE_URL) || 'https://nlyfngpitxuqtczeqjaw.supabase.co');
  const [dbKey, setDbKey] = useState(() => getCleanedStateItem('hms_supabase_anon_key') || getCleanedEnvVal(import.meta.env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_q0e5J5_yWRYl_KHS7U6HhA_zbTpGZdC');
  const [isDbSaving, setIsDbSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Database tables checking state
  const [tableChecks, setTableChecks] = useState<Record<string, { status: 'idle' | 'checking' | 'connected' | 'error'; count?: number; errorMsg?: string }>>({
    profiles: { status: 'idle' },
    patients: { status: 'idle' },
    appointments: { status: 'idle' },
    prescriptions: { status: 'idle' },
    patient_vitals: { status: 'idle' },
    billing: { status: 'idle' },
    departments: { status: 'idle' },
    specialties: { status: 'idle' },
    clinical_notes: { status: 'idle' },
    admissions: { status: 'idle' },
    ot_schedules: { status: 'idle' },
    lab_test_orders: { status: 'idle' }
  });

  const [isVerifyingAll, setIsVerifyingAll] = useState(false);

  const runSingleTableCheck = async (tableName: string) => {
    if (!isSupabaseConfigured) {
      return;
    }
    
    setTableChecks(prev => ({
      ...prev,
      [tableName]: { status: 'checking' }
    }));

    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        setTableChecks(prev => ({
          ...prev,
          [tableName]: { status: 'error', errorMsg: error.message }
        }));
        return;
      }

      setTableChecks(prev => ({
        ...prev,
        [tableName]: { status: 'connected', count: count || 0 }
      }));
    } catch (err: any) {
      setTableChecks(prev => ({
        ...prev,
        [tableName]: { status: 'error', errorMsg: err?.message || 'Network or Permission Error' }
      }));
    }
  };

  const runAllTableChecks = async () => {
    if (!isSupabaseConfigured) {
      toast.error("Please connect your Supabase database first.");
      return;
    }
    setIsVerifyingAll(true);
    toast.loading("Verifying database schema health...", { id: 'db-verify-toast' });
    
    const tables = Object.keys(tableChecks);
    for (const t of tables) {
      // Create a slight delay so it feels organic
      await new Promise(resolve => setTimeout(resolve, 50));
      await runSingleTableCheck(t);
    }
    
    toast.success("Database schema verification completed!", { id: 'db-verify-toast', duration: 4000 });
    setIsVerifyingAll(false);
  };

  // Offline Synchronization States & Logic
  const getOfflineCount = () => {
    let count = 0;
    try {
      const storageKeysToSync = [
        STORAGE_KEYS.PATIENTS,
        STORAGE_KEYS.APPOINTMENTS,
        'hms_admissions',
        STORAGE_KEYS.PRESCRIPTIONS,
        STORAGE_KEYS.PATIENT_VITALS,
        'hms_clinical_notes',
        'hms_ot_schedules',
        STORAGE_KEYS.BILLING,
        STORAGE_KEYS.EXPENSES,
        STORAGE_KEYS.INSURANCE,
        STORAGE_KEYS.LAB_TEST_ORDERS,
        'hms_deliveries'
      ];
      
      for (const sk of storageKeysToSync) {
        const data = storage.get(sk, []);
        if (Array.isArray(data)) {
          const offlineItems = data.filter((item: any) => item && item.id && String(item.id).startsWith('off-'));
          count += offlineItems.length;
        }
      }
    } catch (_) {}
    return count;
  };

  const [offlineCount, setOfflineCount] = useState(() => getOfflineCount());
  const [isSyncing, setIsSyncing] = useState(false);
  const isFallbackActive = getSupabaseUnreachable();

  const handleSyncData = async () => {
    if (!isSupabaseConfigured) {
      toast.error("Please connect your live Supabase database first before syncing.");
      return;
    }
    
    setIsSyncing(true);
    const syncToast = toast.loading("Syncing all offline data with your Supabase database...", {
      description: "Uploading patients, invoices, consult notes, and lab records..."
    });

    try {
      // Re-enable and force connection
      setSupabaseUnreachable(false);
      
      const res = await syncOfflineDataWithSupabase();
      if (res.success) {
        toast.dismiss(syncToast);
        toast.success(`Synchronization completed successfully!`, {
          description: `Uploaded ${res.syncCount} local offline entries directly to Supabase. All pages are updated!`,
          duration: 5000
        });
        setOfflineCount(getOfflineCount());
      } else {
        toast.dismiss(syncToast);
        toast.error(`Partially synced database, but some records failed!`, {
          description: `Successfully uploaded ${res.syncCount} records. Errors: ${res.errors.slice(0, 2).join('; ')}`,
          duration: 6000
        });
        setOfflineCount(getOfflineCount());
      }
    } catch (err: any) {
      toast.dismiss(syncToast);
      toast.error("Communication error during offline sync.", {
        description: err.message || "Please check your Supabase network permissions and security policies."
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveDatabaseCredentials = () => {
    setIsDbSaving(true);
    try {
      if (!dbUrl.trim() || !dbKey.trim()) {
        toast.error('Please enter both Supabase URL and Anon Key');
        setIsDbSaving(false);
        return;
      }

      if (!dbUrl.trim().startsWith('https://')) {
        toast.error('Invalid Supabase Project URL. Must start with https://');
        setIsDbSaving(false);
        return;
      }

      localStorage.setItem('hms_supabase_url', dbUrl.trim());
      localStorage.setItem('hms_supabase_anon_key', dbKey.trim());
      
      toast.success('Database credentials saved successfully!', {
        description: 'Re-syncing and reloading app to connect to your live database...',
        duration: 3000
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      toast.error('Failed to save credentials locally.');
    } finally {
      setIsDbSaving(false);
    }
  };

  const handleResetDatabaseCredentials = () => {
    localStorage.removeItem('hms_supabase_url');
    localStorage.removeItem('hms_supabase_anon_key');
    setDbUrl('');
    setDbKey('');
    toast.success('Database has been set back to local-only high-speed storage.', {
      description: 'Reloading database components to update...',
      duration: 3000
    });
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handlePurgeDemoData = async () => {
    if (!window.confirm("Are you sure you want to delete all seeded demo data (including patients Amit Patel, Priya Singh, Rahul Sharma and their related invoices, appointments, and medical entries)? This action is permanent and cannot be undone.")) {
      return;
    }

    setIsPurging(true);
    try {
      // 1. Identify target patients in local storage first
      const patients = storage.get(STORAGE_KEYS.PATIENTS, []);
      const demoPatients = patients.filter((p: any) => {
        const name = (p.name || '').toLowerCase();
        return name.includes('amit patel') || name.includes('priya singh') || name.includes('rahul sharma') || name.includes('sameer khan');
      });
      const demoIds = demoPatients.map((p: any) => p.id);

      // 2. Filter local storage records
      const cleanLocalData = (key: string, idField: string = 'patientId') => {
        const list = storage.get(key, []);
        if (!Array.isArray(list)) return;
        const filtered = list.filter((item: any) => {
          if (!item) return false;
          const itemId = item[idField] || item.patient_id || item.patientId || '';
          if (demoIds.includes(itemId)) return false;
          const pName = (item.patient_name || item.patientName || item.name || '').toLowerCase();
          if (pName.includes('amit patel') || pName.includes('priya singh') || pName.includes('rahul sharma') || pName.includes('sameer khan')) return false;
          return true;
        });
        storage.set(key, filtered);
      };

      // Clean local keys
      cleanLocalData(STORAGE_KEYS.PATIENTS, 'id');
      cleanLocalData(STORAGE_KEYS.APPOINTMENTS, 'patientId');
      cleanLocalData(STORAGE_KEYS.BILLING, 'patientId');
      cleanLocalData(STORAGE_KEYS.PHARMACY_BILLS, 'patientId');
      cleanLocalData(STORAGE_KEYS.PRESCRIPTIONS, 'patientId');
      cleanLocalData(STORAGE_KEYS.PATIENT_VITALS, 'patientId');
      cleanLocalData(STORAGE_KEYS.LAB_TEST_ORDERS, 'patient_id');

      // Also clean 'hms_admissions'
      cleanLocalData('hms_admissions', 'patientId');

      // 3. Clean live Supabase DB if connected
      if (isSupabaseConfigured) {
        toast.info("Connecting to Supabase to purge cloud records...", { duration: 2000 });
        
        // Fetch matching cloud patients
        const { data: dbPatients, error: fetchErr } = await supabase
          .from('patients')
          .select('id, name')
          .or('name.ilike.%Amit Patel%,name.ilike.%Priya Singh%,name.ilike.%Rahul Sharma%');

        if (fetchErr) {
          console.warn("Could not query patients on Supabase:", fetchErr.message);
        } else if (dbPatients && dbPatients.length > 0) {
          const cloudIds = dbPatients.map(p => p.id);
          console.log("Found cloud patient IDs to purge:", cloudIds);

          const dependentTables = [
            'appointments',
            'quick_registrations',
            'live_queue',
            'admissions',
            'patient_vitals',
            'clinical_notes',
            'prescriptions',
            'test_requests',
            'insurance_claims',
            'discharge_summaries',
            'ot_schedules',
            'nursing_notes'
          ];

          for (const table of dependentTables) {
            await supabase.from(table).delete().in('patient_id', cloudIds);
          }

          // Fetch invoices for items cleanup
          const { data: dbInvoices } = await supabase
            .from('invoices')
            .select('id')
            .in('patient_id', cloudIds);

          if (dbInvoices && dbInvoices.length > 0) {
            const invoiceIds = dbInvoices.map(i => i.id);
            await supabase.from('invoice_items').delete().in('invoice_id', invoiceIds);
            await supabase.from('invoices').delete().in('id', invoiceIds);
          }

          // Finally, delete the patients
          const { error: patDelErr } = await supabase.from('patients').delete().in('id', cloudIds);
          if (patDelErr) {
            console.error("Error deleting patients from Supabase:", patDelErr);
          }
        }
      }

      toast.success("Successfully purged seeded dummy data!", {
        description: "Seeded patients, billing records, and appointments have been cleared from system registers.",
        duration: 4000
      });

      // Dispatch event to force other active panels to refresh
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { action: 'sync' } }));
      
      // Delay to refresh view state
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      toast.error("An error occurred while purging dummy data", {
        description: err.message || "Failed to complete purge process."
      });
    } finally {
      setIsPurging(false);
    }
  };

  // Profile State
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '+91 98765 43210',
    password: currentUser?.password || ''
  });

  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '+91 98765 43210',
        password: currentUser.password || ''
      });
    }
  }, [currentUser]);

  const handleUpdateProfile = async () => {
    if (onUserUpdate && currentUser) {
      const updatedUser = { ...currentUser, ...profileData };
      
      try {
        await supabaseService.updateStaff(currentUser.id, updatedUser);
      } catch (err) {
        console.error('Error updating staff database profile:', err);
      }
      
      // Update in our users list too
      const updatedUsersList = users.map((u: any) => u.id === currentUser.id ? updatedUser : u);
      setUsers(updatedUsersList);
      
      onUserUpdate(updatedUser);
      storage.set(STORAGE_KEYS.SESSION_USER, updatedUser);
      toast.success('Profile updated successfully');
    }
  };

  useEffect(() => {
    storage.set(STORAGE_KEYS.TEMPLATE_IMAGE, templateImage);
    
    const syncTemplateToDB = async () => {
      try {
        const currentInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, {});
        await supabaseService.updateHospitalInfo({
          ...currentInfo,
          template_image: templateImage
        });
      } catch (err) {
        console.error("Failed to sync template background to DB:", err);
      }
    };
    syncTemplateToDB();
  }, [templateImage]);

  const handleTemplateUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTemplateImage(reader.result as string);
        toast.success('Document template updated successfully');
      };
      reader.readAsDataURL(file);
    }
  };
  // Hospital Info State
  const [hospitalInfo, setHospitalInfo] = useState(() => storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'Gastro Plus Hospital',
    address: 'Gastro Plus Hospital ,Infront of Aura Inn Bansi Road Basti',
    gst: '27AAAAA0000A1Z5',
    phone: '+91 6394517005',
    email: 'info@gastroplushospital.com',
    logo: null as string | null
  }));

  useEffect(() => {
    storage.set(STORAGE_KEYS.HOSPITAL_INFO, hospitalInfo);
  }, [hospitalInfo]);

  // Pharmacy Settings State
  const [pharmacySettings, setPharmacySettings] = useState(() => {
    return storage.get('hms_pharmacy_settings', DEFAULT_PHARMACY_SETTINGS);
  });

  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        if (supabaseService.getHospitalInfo) {
          const dbHospitalInfo = await supabaseService.getHospitalInfo();
          if (dbHospitalInfo) {
            setHospitalInfo(dbHospitalInfo);
            storage.set(STORAGE_KEYS.HOSPITAL_INFO, dbHospitalInfo);
            if (dbHospitalInfo.template_image) {
              setTemplateImage(dbHospitalInfo.template_image);
              storage.set(STORAGE_KEYS.TEMPLATE_IMAGE, dbHospitalInfo.template_image);
            }
          }
        }
        
        if (supabaseService.getPharmacySettings) {
          const dbSettings = await supabaseService.getPharmacySettings();
          if (dbSettings) {
            setPharmacySettings(dbSettings);
            storage.set('hms_pharmacy_settings', dbSettings);
          }
        }
        
        const dbDepts = await supabaseService.getDepartments();
        if (dbDepts && dbDepts.length > 0) {
          const deptNames = dbDepts.map((d: any) => d.name);
          setDepartments(deptNames);
          storage.set('hms_settings_departments', deptNames);
        }
        
        const dbSpecs = await supabaseService.getSpecialties();
        if (dbSpecs && dbSpecs.length > 0) {
          const specNames = dbSpecs.map((s: any) => s.name);
          setSpecialties(specNames);
          storage.set('hms_settings_specialties', specNames);
        }

        const dbUsers = await supabaseService.getStaff();
        if (dbUsers && dbUsers.length > 0) {
          setUsers(dbUsers);
          storage.set(STORAGE_KEYS.USERS, dbUsers);
        }
      } catch (err) {
        console.error('Error loading database settings:', err);
      }
    };
    loadAllSettings();
  }, []);

  const handleSavePharmacySettings = async () => {
    storage.set('hms_pharmacy_settings', pharmacySettings);
    if (supabaseService.updatePharmacySettings) {
      await supabaseService.updatePharmacySettings(pharmacySettings);
    }
    toast.success('Pharmacy billing & invoice settings saved successfully!');
  };

  // Departments & Specialties
  const [departments, setDepartments] = useState(() => storage.get('hms_settings_departments', ['General Medicine', 'Orthopedics', 'Pediatrics', 'Gynaecology', 'Cardiology', 'Pathology', 'Radiology', 'Accounts']));
  const [specialties, setSpecialties] = useState(() => storage.get('hms_settings_specialties', ['Surgery', 'Consultation', 'Emergency', 'Diagnostics']));
  const [newDept, setNewDept] = useState('');
  const [newSpec, setNewSpec] = useState('');

  // Active Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>(() => storage.get(STORAGE_KEYS.AUDIT_LOGS, []));

  useEffect(() => {
    storage.set('hms_settings_departments', departments);
  }, [departments]);

  useEffect(() => {
    storage.set('hms_settings_specialties', specialties);
  }, [specialties]);

  // User Management
  const [users, setUsers] = useState(() => storage.get(STORAGE_KEYS.USERS, MOCK_USERS));
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'DOCTOR', department: '', password: '' });

  useEffect(() => {
    storage.set(STORAGE_KEYS.USERS, users);
  }, [users]);

  // Rates State
  const [bedRates, setBedRates] = useState(() => storage.get(STORAGE_KEYS.BED_RATES, MOCK_BED_RATES));
  const [otRates, setOtRates] = useState(() => storage.get(STORAGE_KEYS.OT_RATES, MOCK_OT_RATES));
  const [labRates, setLabRates] = useState(() => storage.get(STORAGE_KEYS.LAB_RATES, MOCK_LAB_TESTS));
  const [materialRates, setMaterialRates] = useState(() => storage.get(STORAGE_KEYS.MATERIAL_RATES, MOCK_MATERIAL_RATES));
  const [opdCharges, setOpdCharges] = useState(() => storage.get(STORAGE_KEYS.OPD_CHARGES, {
    reg: 200,
    appt: 200,
    consult: 500
  }));
  
  const [newBedRate, setNewBedRate] = useState({ type: '', rate: '' });
  const [newOtRate, setNewOtRate] = useState({ type: '', rate: '' });
  const [newLabRate, setNewLabRate] = useState({ name: '', category: 'Pathology' as 'Pathology' | 'Radiology', price: '' });
  const [newMaterialRate, setNewMaterialRate] = useState({ name: '', category: 'Disposable' as 'Disposable' | 'Material', price: '' });

  useEffect(() => {
    storage.set(STORAGE_KEYS.BED_RATES, bedRates);
    storage.set(STORAGE_KEYS.OT_RATES, otRates);
    storage.set(STORAGE_KEYS.LAB_RATES, labRates);
    storage.set(STORAGE_KEYS.MATERIAL_RATES, materialRates);
    storage.set(STORAGE_KEYS.OPD_CHARGES, opdCharges);
  }, [bedRates, otRates, labRates, materialRates, opdCharges]);

  // Prescription State
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [newPrescription, setNewPrescription] = useState({
    patientId: '',
    doctorId: '',
    diagnosis: '',
    medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
    notes: ''
  });

  const handleSaveHospitalInfo = async () => {
    storage.set(STORAGE_KEYS.HOSPITAL_INFO, hospitalInfo);
    if (supabaseService.updateHospitalInfo) {
      await supabaseService.updateHospitalInfo(hospitalInfo);
    }
    if (onHospitalUpdate) {
      onHospitalUpdate(hospitalInfo);
    }
    toast.success('Hospital information updated and saved successfully');
  };

  const handleAddDept = async () => {
    if (newDept && !departments.includes(newDept)) {
      setDepartments([...departments, newDept]);
      const lastDeptName = newDept;
      setNewDept('');
      await supabaseService.createDepartment(lastDeptName);
      toast.success('Department added');
    }
  };

  const handleDeleteDept = async (deptName: string) => {
    try {
      const updated = departments.filter((d: string) => d !== deptName);
      setDepartments(updated);
      await supabaseService.deleteDepartment(deptName);
      toast.success('Department removed');
    } catch (err) {
      console.error('Error removing department:', err);
    }
  };

  const handleAddSpec = async () => {
    if (newSpec && !specialties.includes(newSpec)) {
      setSpecialties([...specialties, newSpec]);
      const lastSpecName = newSpec;
      setNewSpec('');
      await supabaseService.createSpecialty(lastSpecName);
      toast.success('Specialty added');
    }
  };

  const handleDeleteSpec = async (specName: string) => {
    try {
      const updated = specialties.filter((s: string) => s !== specName);
      setSpecialties(updated);
      await supabaseService.deleteSpecialty(specName);
      toast.success('Specialty removed');
    } catch (err) {
      console.error('Error removing specialty:', err);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || (!editingUserId && !newUser.password)) {
      toast.error('Please fill in all user details');
      return;
    }

    if (editingUserId) {
      // Update existing user
      const updates: any = {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        designation: newUser.role,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.name}`
      };
      if (newUser.password) {
        updates.password = newUser.password;
      }
      
      await supabaseService.updateStaff(editingUserId, updates);
      
      const updatedUsers = users.map((u: any) => {
        if (u.id === editingUserId) {
          return {
            ...u,
            ...updates
          };
        }
        return u;
      });
      setUsers(updatedUsers);
      setEditingUserId(null);
      
      // If we're updating the current user, sync the app state
      if (editingUserId === currentUser?.id) {
        const updatedUser = updatedUsers.find((u: any) => u.id === editingUserId);
        if (onUserUpdate && updatedUser) {
          onUserUpdate(updatedUser);
        }
      }
      
      toast.success('User account updated successfully');
    } else {
      // Add new user
      const staffToAdd = {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        designation: newUser.role,
        password: newUser.password,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.name}`
      };
      
      const result = await supabaseService.createStaff(staffToAdd);
      if (result) {
        setUsers([...users, result]);
        toast.success(`${newUser.role} account created successfully`);
      } else {
        toast.error('Failed to create account in database');
      }
    }
    
    setNewUser({ name: '', email: '', role: 'DOCTOR', department: '', password: '' });
  };

  const handleAddMedicine = () => {
    setNewPrescription({
      ...newPrescription,
      medicines: [...newPrescription.medicines, { name: '', dosage: '', frequency: '', duration: '' }]
    });
  };

  const handleSavePrescription = () => {
    if (!newPrescription.patientId || !newPrescription.doctorId) {
      toast.error('Please select patient and doctor');
      return;
    }
    setPrescriptions([...prescriptions, { ...newPrescription, id: `pr-${Date.now()}`, date: new Date().toLocaleDateString() }]);
    toast.success('Prescription saved successfully');
  };

  const handleAddBedRate = () => {
    if (!newBedRate.type || !newBedRate.rate) return;
    setBedRates([...bedRates, { type: newBedRate.type, rate: parseInt(newBedRate.rate) }]);
    setNewBedRate({ type: '', rate: '' });
    toast.success('Bed rate added');
  };

  const handleAddOtRate = () => {
    if (!newOtRate.type || !newOtRate.rate) return;
    setOtRates([...otRates, { type: newOtRate.type, rate: parseInt(newOtRate.rate) }]);
    setNewOtRate({ type: '', rate: '' });
    toast.success('OT rate added');
  };

  const handleAddLabRate = () => {
    if (!newLabRate.name || !newLabRate.price) return;
    setLabRates([...labRates, { id: `lt-${Date.now()}`, name: newLabRate.name, category: newLabRate.category, price: parseInt(newLabRate.price) }]);
    setNewLabRate({ ...newLabRate, name: '', price: '' });
    toast.success('Lab/Radiology rate added');
  };

  const handleAddMaterialRate = () => {
    if (!newMaterialRate.name || !newMaterialRate.price) return;
    setMaterialRates([...materialRates, { name: newMaterialRate.name, price: parseInt(newMaterialRate.price), category: newMaterialRate.category }]);
    setNewMaterialRate({ ...newMaterialRate, name: '', price: '' });
    toast.success('Material rate added');
  };

  const printPrescription = (pres: any) => {
    const templateImage = storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null);
    const hospitalInfo = storage.get<{
      name: string;
      address: string;
      phone: string;
      logo?: string | null;
    }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'GASTRO PLUS HOSPITAL',
      address: '123, Medical Square, City Center',
      phone: '+91 98765 43210'
    });
    
    const patient = MOCK_PATIENTS.find(p => p.id === pres.patientId);
    const doctor = users.find(u => u.id === pres.doctorId);
    
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      toast.error('Please allow popups to print prescription');
      return;
    }

    const html = getPrescriptionPrintHtml(
      {
        name: patient?.name || 'N/A',
        age: patient?.age,
        gender: patient?.gender,
        mrn: patient?.mrn,
        phone: patient?.phone || (patient as any)?.mobile || '',
        fatherName: (patient as any)?.fatherName || (patient as any)?.father_name || ''
      },
      {
        date: pres.date,
        medicines: pres.medicines,
        advice: pres.notes || pres.diagnosis
      },
      doctor,
      hospitalInfo
    );

    printWindow.document.write(html);
    printWindow.document.close();
    return;

    const prescriptionHtml = `
      <html>
        <head>
          <title>Prescription - ${patient?.name}</title>
          <style>
            @page { margin: 10mm; size: A4; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 0;
              color: #1e293b;
              line-height: 1.6;
              -webkit-print-color-adjust: exact;
            }
            .template-bg {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: -1;
            }
            .content { 
              position: relative;
              padding-top: ${templateImage ? '260px' : '20px'}; 
              padding-bottom: ${templateImage ? '100px' : '20px'};
              margin: 0 30px;
              z-index: 10;
            }
            .hospital-header {
              text-align: center;
              margin-bottom: 40px;
              display: ${templateImage ? 'none' : 'block'};
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
            }
            .hospital-name { font-size: 32px; font-weight: 800; color: #2563eb; letter-spacing: -0.025em; margin-bottom: 5px; }
            .hospital-info { font-size: 13px; color: #64748b; font-weight: 500; }
            .rx-symbol { font-size: 60px; font-weight: 800; margin: 20px 0 10px 0; color: #2563eb; font-family: serif; }
            
            .patient-card { 
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 24px;
              margin-bottom: 40px;
              display: grid;
              grid-template-columns: 1.5fr 1fr;
              gap: 20px;
              background-color: #f8fafc;
            }
            .info-item { font-size: 15px; }
            .info-label { color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; margin-right: 8px; letter-spacing: 0.05em; }
            .info-value { font-weight: 800; color: #0f172a; }
            
            .medicine-table { width: 100%; border-collapse: collapse; margin-bottom: 50px; }
            .medicine-table th { 
              text-align: left; 
              background-color: #f1f5f9;
              padding: 15px; 
              color: #475569; 
              font-size: 11px; 
              text-transform: uppercase; 
              font-weight: 800;
              border-bottom: 2px solid #cbd5e1;
            }
            .medicine-table td { padding: 18px 15px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .med-name { font-weight: 800; color: #1e293b; font-size: 16px; }
            
            .advice-section { 
              margin-top: 40px;
              padding: 25px;
              border-left: 5px solid #2563eb;
              background-color: #f0f7ff;
              border-radius: 0 12px 12px 0;
              page-break-inside: avoid;
            }
            .footer { 
              margin-top: 100px; 
              text-align: center;
              padding-bottom: 100px;
              page-break-inside: avoid;
            }
            .sig-section { display: flex; justify-content: space-between; margin-top: 80px; }
            .sig-box { width: 220px; text-align: center; }
            .sig-line { border-top: 2px solid #0f172a; margin-bottom: 10px; }
            .sig-label { font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; }
          </style>
        </head>
        <body>
          ${templateImage ? `<div class="template-bg"><img src="${templateImage}" style="width: 100%;" /></div>` : ''}
          <div class="content">
            <div class="hospital-header">
              ${(hospitalInfo.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '') ? `<img src="${hospitalInfo.logo}" style="height: 60px; margin-bottom: 10px;" />` : ''}
              <div class="hospital-name">${hospitalInfo.name}</div>
              <div class="hospital-info">${hospitalInfo.address} | Tel: ${hospitalInfo.phone}</div>
            </div>

            <div class="patient-card">
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div class="info-item"><span class="info-label">Patient:</span> <span class="info-value" style="font-size: 20px;">${patient?.name}</span></div>
                <div class="info-item"><span class="info-label">MRN / ID:</span> <span class="info-value">${patient?.mrn}</span></div>
                <div class="info-item"><span class="info-label">Age/Gender:</span> <span class="info-value">${patient?.age} Y / ${patient?.gender}</span></div>
              </div>
              <div style="text-align: right; display: flex; flex-direction: column; gap: 8px;">
                <div class="info-item"><span class="info-label">Prescription Date:</span> <span class="info-value">${pres.date || new Date().toLocaleDateString()}</span></div>
                <div class="info-item"><span class="info-label">Doctor:</span> <span class="info-value">${doctor?.name}</span></div>
                <div class="info-item"><span class="info-label">Pres ID:</span> <span class="info-value">#${pres.id.split('-').pop()?.toUpperCase()}</span></div>
              </div>
            </div>

            <div class="rx-symbol">Rx</div>

            <table class="medicine-table">
              <thead>
                <tr>
                  <th style="width: 40%">Medicine & Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th style="text-align: right">Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${pres.medicines.map((m: any) => `
                  <tr>
                    <td>
                      <div class="med-name">${m.name}</div>
                      <div style="font-size: 12px; color: #64748b; font-weight: 600;">${m.dosage}</div>
                    </td>
                    <td><span style="font-weight: 700; color: #2563eb;">${m.frequency}</span></td>
                    <td><span style="font-weight: 600;">${m.duration}</span></td>
                    <td style="text-align: right; font-weight: 800;"> - </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="advice-section">
              <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.1em;">Diagnosis & Notes</p>
              <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">${pres.diagnosis}</div>
              <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">${pres.notes}</p>
            </div>

            <div class="footer">
              <div class="sig-section">
                <div class="sig-box">
                  <div class="sig-line"></div>
                  <div class="sig-label">Patient Signature</div>
                </div>
                <div class="sig-box">
                  <div class="sig-line"></div>
                  <div class="sig-label">Physician Stamp & Signature</div>
                  <div style="font-size: 11px; font-weight: 700; margin-top: 5px;">${doctor?.name}</div>
                </div>
              </div>
              <div style="margin-top: 60px; color: #94a3b8; font-size: 11px;">This document is for medical use only. Keep safely.</div>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 700);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(prescriptionHtml);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-sm text-slate-900 mb-6" style={{ background: 'linear-gradient(135deg, #E5C39E, #F9EFE5, #E5C39E)', borderColor: '#ebd0a2' }}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-amber-950">Hospital Settings & Configuration</h1>
          <p className="text-amber-900/90 font-semibold text-sm">Manage hospital identity, departments, users, and prescriptions.</p>
        </div>
      </div>

      <Tabs defaultValue="hospital" className="space-y-6">
        <TabsList className="bg-white border shadow-sm p-1 h-auto flex-wrap justify-start">
          <TabsTrigger value="profile" className="gap-2"><UserPlus className="w-4 h-4" /> My Profile</TabsTrigger>
          {!isAccountant && <TabsTrigger value="hospital" className="gap-2"><Building2 className="w-4 h-4" /> Hospital Info</TabsTrigger>}
          {!isAccountant && <TabsTrigger value="departments" className="gap-2"><Stethoscope className="w-4 h-4" /> Departments</TabsTrigger>}
          <TabsTrigger value="rates" className="gap-2"><Receipt className="w-4 h-4" /> Rates & Billing</TabsTrigger>
          {!isAccountant && <TabsTrigger value="pharmacy_bill" className="gap-2"><Pill className="w-4 h-4" /> Pharmacy Bill</TabsTrigger>}
          {!isAccountant && <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> User Panel</TabsTrigger>}
          {!isAccountant && <TabsTrigger value="templates" className="gap-2"><Layout className="w-4 h-4" /> Templates</TabsTrigger>}
          <TabsTrigger value="prescriptions" className="gap-2"><FileText className="w-4 h-4" /> Prescriptions</TabsTrigger>
          <TabsTrigger value="tax_slabs" className="gap-2"><Percent className="w-4 h-4" /> Tax Settings</TabsTrigger>
          {!isAccountant && (
            <TabsTrigger value="database" className="gap-2 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold border border-indigo-100/50"><Database className="w-4 h-4" /> Database & Sync</TabsTrigger>
          )}
          {currentUser?.role === 'SUPER_ADMIN' && (
            <TabsTrigger value="audit" className="gap-2"><History className="w-4 h-4" /> Audit Logs</TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Update your personal information and login details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-24 h-24 border-2 border-white shadow-md">
                    <AvatarImage src={currentUser?.avatar} />
                    <AvatarFallback>{currentUser?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm" className="h-8 text-xs">Change Avatar</Button>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input 
                      value={profileData.name} 
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email / Username</Label>
                    <Input 
                      value={profileData.email} 
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input 
                      value={profileData.phone} 
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={currentUser?.role?.replace('_', ' ')} disabled className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>My Password</Label>
                    <Input 
                      type="password"
                      placeholder="Enter new password"
                      value={profileData.password || ''} 
                      onChange={(e) => setProfileData({...profileData, password: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button className="bg-medical-blue gap-2" onClick={handleUpdateProfile}>
                  <Save className="w-4 h-4" />
                  Update Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hospital Info Tab */}
        <TabsContent value="hospital">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Hospital Information</CardTitle>
              <CardDescription>Configure your hospital's public identity and contact details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-32 h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 overflow-hidden">
                    {hospitalInfo.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '' ? (
                      <img src={hospitalInfo.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-[10px] font-bold uppercase text-slate-500">Upload Logo</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs relative cursor-pointer overflow-hidden" asChild>
                      <label className="flex items-center justify-center cursor-pointer w-full h-full">
                        Change Logo
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                resizeImage(file, 256, 256, (resizedBase64) => {
                                  if (resizedBase64) {
                                    setHospitalInfo({ ...hospitalInfo, logo: resizedBase64 });
                                    toast.success('Hospital logo changed and scaled successfully!');
                                  } else {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setHospitalInfo({ ...hospitalInfo, logo: reader.result as string });
                                      toast.success('Hospital logo uploaded successfully!');
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                });
                              } catch (err) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setHospitalInfo({ ...hospitalInfo, logo: reader.result as string });
                                  toast.success('Hospital logo uploaded successfully!');
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }} 
                        />
                      </label>
                    </Button>
                    {hospitalInfo.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-rose-500 h-8 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold w-full"
                        onClick={() => {
                          setHospitalInfo({ ...hospitalInfo, logo: null });
                          toast.success('Logo removed. Save changes to apply.');
                        }}
                      >
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hospital Name</Label>
                    <Input value={hospitalInfo.name} onChange={(e) => setHospitalInfo({...hospitalInfo, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>GST Number</Label>
                    <Input value={hospitalInfo.gst} onChange={(e) => setHospitalInfo({...hospitalInfo, gst: e.target.value})} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <Input value={hospitalInfo.address} onChange={(e) => setHospitalInfo({...hospitalInfo, address: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={hospitalInfo.phone} onChange={(e) => setHospitalInfo({...hospitalInfo, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={hospitalInfo.email} onChange={(e) => setHospitalInfo({...hospitalInfo, email: e.target.value})} />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button className="bg-medical-blue gap-2" onClick={handleSaveHospitalInfo}>
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pharmacy Bill Tab */}
        <TabsContent value="pharmacy_bill">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="p-6 pb-4 border-b">
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-600" />
                Pharmacy Invoice & Billing Configuration
              </CardTitle>
              <CardDescription>
                Configure the professional header details, tax configuration, bank registers, and branding details printed on modern GST pharmacy receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Pharmacy Branding */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider border-b pb-1">Enterprise Identity</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pharm-name" className="text-xs font-bold text-slate-700">Pharmacy Name / Enterprise Name</Label>
                    <Input 
                      id="pharm-name" 
                      value={pharmacySettings.pharmacyName || ''} 
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, pharmacyName: e.target.value })} 
                      placeholder="Medicare Wholesale Pharmacy"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharm-tagline" className="text-xs font-bold text-slate-700">Branding Tagline Slogan</Label>
                    <Input 
                      id="pharm-tagline" 
                      value={pharmacySettings.tagline || ''} 
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, tagline: e.target.value })} 
                      placeholder="A single stop for all your Healthcare needs!"
                      className="h-9"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pharm-gstin" className="text-xs font-bold text-slate-700">Enterprise GSTIN / Tax Number</Label>
                      <Input 
                        id="pharm-gstin" 
                        value={pharmacySettings.gstin || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, gstin: e.target.value })} 
                        placeholder="26CORPP3939N1ZA"
                        className="font-mono uppercase h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharm-phone" className="text-xs font-bold text-slate-700">Support Contact Number</Label>
                      <Input 
                        id="pharm-phone" 
                        value={pharmacySettings.phone || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, phone: e.target.value })} 
                        placeholder="9345678991"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharm-address" className="text-xs font-bold text-slate-700">Retail Location Address</Label>
                    <Input 
                      id="pharm-address" 
                      value={pharmacySettings.address || ''} 
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, address: e.target.value })} 
                      placeholder="13 Health Street, Mumbai, Maharashtra"
                      className="h-9"
                    />
                  </div>

                  {/* Logo Config */}
                  <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Billing Invoice Brand Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-white rounded-xl border flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-sm">
                        {pharmacySettings.logoUrl ? (
                          <img src={pharmacySettings.logoUrl} alt="Pharmacy Billing Logo" className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-[9px] text-center px-1 font-semibold text-slate-400 uppercase">No Logo Uploaded</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          Upload your business logomark (PNG, JPG, or SVG). Will be scaled down properly and printed in gray or green on invoice sheets.
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-xs relative cursor-pointer overflow-hidden" asChild nativeButton={false}>
                            <label>
                              <Upload className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              Upload Image
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setPharmacySettings({ ...pharmacySettings, logoUrl: reader.result as string });
                                      toast.success('Pharmacy billing logo loaded successfully!');
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} 
                              />
                            </label>
                          </Button>
                          {pharmacySettings.logoUrl && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-rose-500 h-8 hover:text-rose-600 hover:bg-rose-50 text-xs"
                              onClick={() => setPharmacySettings({ ...pharmacySettings, logoUrl: '' })}
                            >
                              Remove Logo
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Bank Details & Footer Settings */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider border-b pb-1">Deposit Registry & Banking Coordinates</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pharm-bankName" className="text-xs font-bold text-slate-700">Financial Institution Bank Name</Label>
                      <Input 
                        id="pharm-bankName" 
                        value={pharmacySettings.bankName || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankName: e.target.value })} 
                        placeholder="ICICI"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharm-bankBranch" className="text-xs font-bold text-slate-700">Branch Location Name</Label>
                      <Input 
                        id="pharm-bankBranch" 
                        value={pharmacySettings.bankBranch || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankBranch: e.target.value })} 
                        placeholder="Surate"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pharm-bankNo" className="text-xs font-bold text-slate-700">Deposit Account Number</Label>
                      <Input 
                        id="pharm-bankNo" 
                        value={pharmacySettings.bankAccNo || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankAccNo: e.target.value })} 
                        placeholder="2715500356"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharm-ifsc" className="text-xs font-bold text-slate-700">Routing IFSC Code</Label>
                      <Input 
                        id="pharm-ifsc" 
                        value={pharmacySettings.bankIfsc || ''} 
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankIfsc: e.target.value })} 
                        placeholder="ICIC0000045"
                        className="font-mono uppercase h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharm-upi" className="text-xs font-bold text-slate-700">UPI Virtual ID Address for payments</Label>
                    <Input 
                      id="pharm-upi" 
                      value={pharmacySettings.upiId || ''} 
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, upiId: e.target.value })} 
                      placeholder="medicare@icici"
                      className="font-mono h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pharm-terms" className="text-xs font-bold text-slate-700">Legal Terms & Conditions</Label>
                      <span className="text-[10px] text-slate-400 font-mono">Use line breaks for bullets</span>
                    </div>
                    <textarea 
                      id="pharm-terms" 
                      className="w-full h-24 border rounded-xl p-3 text-xs font-sans focus:ring-1 focus:ring-teal-500 focus:outline-none bg-white shadow-inner"
                      value={pharmacySettings.termsAndConditions?.join('\n') || ''}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n');
                        setPharmacySettings({ ...pharmacySettings, termsAndConditions: lines });
                      }}
                      placeholder="Subject to Mumbai Jurisdiction&#10;Goods once sold cannot be returned"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pharm-footerSlogan" className="text-xs font-bold text-slate-700">Invoice Document Footer Slogan</Label>
                    <Input 
                      id="pharm-footerSlogan" 
                      value={pharmacySettings.additionalFooter || ''} 
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, additionalFooter: e.target.value })} 
                      placeholder="Thanks for your trust! We look forward to working with you again."
                      className="h-9"
                    />
                  </div>
                </div>

              </div>

              <Separator />
              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="h-10 text-xs text-slate-600"
                  onClick={() => {
                    setPharmacySettings(DEFAULT_PHARMACY_SETTINGS);
                    toast.info('Restored default pharmacy values. Click save to apply changes.');
                  }}
                >
                  Reset Defaults
                </Button>
                <Button 
                  className="bg-teal-600 hover:bg-teal-700 text-white gap-2 h-10 px-5 text-xs font-bold" 
                  onClick={handleSavePharmacySettings}
                >
                  <Save className="w-4 h-4" />
                  Save Pharmacy Billing Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Departments</CardTitle>
                <CardDescription>Manage hospital departments and wards.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Add new department..." value={newDept} onChange={(e) => setNewDept(e.target.value)} />
                  <Button className="bg-medical-blue" onClick={handleAddDept}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <div key={dept} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium">{dept}</span>
                      {!isAccountant && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteDept(dept)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Specialties</CardTitle>
                <CardDescription>Define medical specialties and services.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Add new specialty..." value={newSpec} onChange={(e) => setNewSpec(e.target.value)} />
                  <Button className="bg-medical-blue" onClick={handleAddSpec}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2">
                  {specialties.map((spec) => (
                    <div key={spec} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium">{spec}</span>
                      {!isAccountant && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteSpec(spec)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rates & Billing Tab */}
        <TabsContent value="rates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-medical-blue" />
                  <CardTitle>IPD Bed Rates</CardTitle>
                </div>
                <CardDescription>Set daily charges for different bed categories.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAccountant && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      placeholder="Bed Type (e.g. Deluxe)" 
                      value={newBedRate.type} 
                      onChange={(e) => setNewBedRate({...newBedRate, type: e.target.value})} 
                    />
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Rate / Day" 
                        value={newBedRate.rate} 
                        onChange={(e) => setNewBedRate({...newBedRate, rate: e.target.value})} 
                      />
                      <Button className="bg-medical-blue" onClick={handleAddBedRate}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {bedRates.map((rate) => (
                    <div key={rate.type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-sm font-bold">{rate.type}</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Bed Category</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-medical-blue">₹{rate.rate} / Day</span>
                        {!isAccountant && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => setBedRates(bedRates.filter(r => r.type !== rate.type))}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-medical-blue" />
                  <CardTitle>OT Charges</CardTitle>
                </div>
                <CardDescription>Fixed charges for different types of surgeries.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAccountant && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      placeholder="OT Type (e.g. Major)" 
                      value={newOtRate.type} 
                      onChange={(e) => setNewOtRate({...newOtRate, type: e.target.value})} 
                    />
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Fixed Charge" 
                        value={newOtRate.rate} 
                        onChange={(e) => setNewOtRate({...newOtRate, rate: e.target.value})} 
                      />
                      <Button className="bg-medical-blue" onClick={handleAddOtRate}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {otRates.map((rate) => (
                    <div key={rate.type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-sm font-bold">{rate.type}</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Surgery Type</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-medical-blue">₹{rate.rate}</span>
                        {!isAccountant && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => setOtRates(otRates.filter(r => r.type !== rate.type))}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-medical-blue" />
                  <CardTitle>OPD, Appointment & Consultation Charges</CardTitle>
                </div>
                <CardDescription>Configure standard fees for registration, appointments, and consultations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>OPD Registration Fee (₹)</Label>
                    <Input 
                      type="number" 
                      value={opdCharges.reg} 
                      onChange={(e) => setOpdCharges({ ...opdCharges, reg: Number(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Appointment Fee (₹)</Label>
                    <Input 
                      type="number" 
                      value={opdCharges.appt} 
                      onChange={(e) => setOpdCharges({ ...opdCharges, appt: Number(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Consultation Fee (₹)</Label>
                    <Input 
                      type="number" 
                      value={opdCharges.consult} 
                      onChange={(e) => setOpdCharges({ ...opdCharges, consult: Number(e.target.value) || 0 })} 
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button 
                    className="bg-medical-blue text-white" 
                    onClick={() => {
                      storage.set(STORAGE_KEYS.OPD_CHARGES, opdCharges);
                      window.dispatchEvent(new Event('storage'));
                      toast.success('OPD & Consultation charges saved successfully');
                    }}
                  >
                    Save Charges
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-medical-blue" />
                  <CardTitle>Service Master (Lab & Radiology)</CardTitle>
                </div>
                <CardDescription>Manage rates for all diagnostic tests.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAccountant && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Input 
                      placeholder="Test Name" 
                      value={newLabRate.name} 
                      onChange={(e) => setNewLabRate({...newLabRate, name: e.target.value})} 
                      className="md:col-span-2"
                    />
                    <Select value={newLabRate.category} onValueChange={(v: any) => setNewLabRate({...newLabRate, category: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pathology">Pathology</SelectItem>
                        <SelectItem value="Radiology">Radiology</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Price" 
                        value={newLabRate.price} 
                        onChange={(e) => setNewLabRate({...newLabRate, price: e.target.value})} 
                      />
                      <Button className="bg-medical-blue" onClick={handleAddLabRate}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {labRates.map((rate: any) => (
                      <div key={rate.id || rate.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-sm font-bold">{rate.name}</span>
                          <Badge variant="outline" className="ml-2 text-[9px] uppercase">{rate.category}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-medical-blue">₹{rate.price}</span>
                          {!isAccountant && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => setLabRates(labRates.filter((r: any) => (r.id || r.name) !== (rate.id || rate.name)))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layout className="w-5 h-5 text-medical-blue" />
                  <CardTitle>Materials & Supplies</CardTitle>
                </div>
                <CardDescription>Manage rates for disposables and materials.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAccountant && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Input 
                      placeholder="Material Name" 
                      value={newMaterialRate.name} 
                      onChange={(e) => setNewMaterialRate({...newMaterialRate, name: e.target.value})} 
                      className="md:col-span-2"
                    />
                    <Select value={newMaterialRate.category} onValueChange={(v: any) => setNewMaterialRate({...newMaterialRate, category: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Disposable">Disposable</SelectItem>
                        <SelectItem value="Material">Material</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Price" 
                        value={newMaterialRate.price} 
                        onChange={(e) => setNewMaterialRate({...newMaterialRate, price: e.target.value})} 
                      />
                      <Button className="bg-medical-blue" onClick={handleAddMaterialRate}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {materialRates.map((rate: any) => (
                      <div key={rate.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-sm font-bold">{rate.name}</span>
                          <Badge variant="outline" className="ml-2 text-[9px] uppercase">{rate.category}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-medical-blue">₹{rate.price}</span>
                          {!isAccountant && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => setMaterialRates(materialRates.filter((r: any) => r.name !== rate.name))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Panel Tab */}
        <TabsContent value="users">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management Panel</CardTitle>
                <CardDescription>Assign IDs, passwords, and roles to hospital staff.</CardDescription>
              </div>
              <Button className="bg-medical-blue gap-2" onClick={() => {
                const element = document.getElementById('user-creation-form');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
                toast.info('Fill the form below to register a new user');
              }}>
                <UserPlus className="w-4 h-4" />
                Add New User
              </Button>
            </CardHeader>
            <CardContent>
              <div id="user-creation-form" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="e.g. Dr. Rajesh Sharma" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email / Username</Label>
                  <Input placeholder="rajesh@hospital.com" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        type="text" 
                        placeholder={editingUserId ? "Leave empty to keep unchanged" : "Password"} 
                        value={newUser.password} 
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})} 
                        disabled={isFrontOffice}
                        className={isFrontOffice ? "bg-slate-100 cursor-not-allowed pr-8 font-semibold text-slate-700" : "pr-8 font-semibold text-slate-700"}
                      />
                      <Lock className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold"
                      onClick={() => {
                        const randomPass = Math.random().toString(36).substring(2, 6) + Math.floor(100 + Math.random() * 900);
                        setNewUser({ ...newUser, password: randomPass });
                        toast.success(`Password generated: ${randomPass}`);
                      }}
                    >
                      Generate
                    </Button>
                  </div>
                  {newUser.password && (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 font-bold mt-1 text-xs"
                      onClick={() => {
                        const hName = hospitalInfo?.name || 'Hospital';
                        const message = encodeURIComponent(`Hello ${newUser.name || 'Staff'},\n\nYour ${hName} login credentials are:\nUsername/Email: ${newUser.email || '(not set)'}\nPassword: ${newUser.password}\n\nPlease keep these credentials safe.\n\nLogin URL: ${window.location.origin}`);
                        window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
                        toast.success('Opening WhatsApp sharing link...');
                      }}
                    >
                      Share on WhatsApp
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({...newUser, role: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOCTOR">DOCTOR</SelectItem>
                      <SelectItem value="NURSE">NURSE</SelectItem>
                      <SelectItem value="RECEPTION">RECEPTION</SelectItem>
                      <SelectItem value="PATHOLOGY">PATHOLOGY</SelectItem>
                      <SelectItem value="RADIOLOGY">RADIOLOGY</SelectItem>
                      <SelectItem value="ACCOUNTS">ACCOUNTS</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={newUser.department} onValueChange={(v) => setNewUser({...newUser, department: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button className="bg-medical-blue flex-1 gap-2" onClick={handleAddUser}>
                    <ShieldCheck className="w-4 h-4" />
                    {editingUserId ? 'Update Account' : 'Create Account'}
                  </Button>
                  {editingUserId && (
                    <Button variant="outline" onClick={() => {
                      setEditingUserId(null);
                      setNewUser({ name: '', email: '', role: 'DOCTOR', department: '', password: '' });
                    }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Active User Accounts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map((user) => (
                    <div key={user.id} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        <img src={user.avatar} alt={user.name} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold truncate">{user.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase">{user.role}</Badge>
                          <span className="text-[10px] text-slate-400 font-medium truncate">{user.department}</span>
                        </div>
                        {isAdmin && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                            <span className="text-slate-400 font-bold uppercase">Password:</span>
                            <span className="font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                              {user.password || 'hospital123'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue" onClick={() => {
                          setEditingUserId(user.id);
                          setNewUser({
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            department: user.department || '',
                            password: isAdmin ? (user.password || '') : '' // Only pre-fill password for admin
                          });
                          const element = document.getElementById('user-creation-form');
                          if (element) element.scrollIntoView({ behavior: 'smooth' });
                          toast.info('Modifying existing user: ' + user.name);
                        }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={async () => {
                          if (user.id === currentUser?.id) {
                            toast.error('Cannot delete yourself!');
                            return;
                          }
                          if (confirm('Are you sure you want to delete this user?')) {
                            const success = await supabaseService.deleteStaff(user.id);
                            if (success) {
                              setUsers(users.filter((u: any) => u.id !== user.id));
                              toast.success('User account removed');
                            } else {
                              toast.error('Failed to remove user account');
                            }
                          }
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Document Letterhead Template</CardTitle>
              <CardDescription>Upload a background image for prescriptions, bills, and reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 gap-4">
                {templateImage ? (
                  <div className="relative group w-full max-w-md">
                    <img src={templateImage} alt="Template" className="w-full rounded-lg shadow-lg border border-slate-200" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg gap-2">
                      <Button variant="secondary" size="sm" onClick={() => document.getElementById('template-upload')?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Replace
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setTemplateImage(null)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-500">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-600">No template uploaded</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Upload a high-quality JPG or PNG of your hospital letterhead.</p>
                    </div>
                    <Button className="bg-medical-blue gap-2" onClick={() => document.getElementById('template-upload')?.click()}>
                      <Upload className="w-4 h-4" />
                      Upload Letterhead
                    </Button>
                  </div>
                )}
                <input 
                  type="file" 
                  id="template-upload" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleTemplateUpload} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Printer className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-bold text-blue-700">Usage Information</p>
                  </div>
                  <div className="text-xs text-blue-600/80 leading-relaxed">
                    This image will be used as the background/header for:
                    <ul className="list-disc list-inside mt-1 ml-1">
                      <li>OPD Prescriptions</li>
                      <li>Billing Invoices</li>
                      <li>Diagnostic Reports</li>
                      <li>Discharge Summaries</li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-amber-100 bg-amber-50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-bold text-amber-700">Blank Prescription</p>
                  </div>
                  <p className="text-xs text-amber-600/80 mb-3">Print a blank prescription using your letterhead template.</p>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-2 border-amber-200 hover:bg-amber-100" onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Blank Prescription</title>
                          <style>
                            @page { margin: 0; }
                            body { margin: 0; padding: 0; }
                          </style>
                        </head>
                        <body onload="window.print(); window.close();">
                          <img src="${templateImage}" style="width: 100%; height: auto;" />
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}>
                    <Printer className="w-3 h-3" />
                    Print Blank
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="prescriptions">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader>
                <CardTitle>New Prescription</CardTitle>
                <CardDescription>Create and print a medical prescription.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Patient</Label>
                    <Input value={MOCK_PATIENTS.find(p => p.id === newPrescription.patientId)?.name || ''} readOnly className="bg-slate-50" placeholder="Selected via list below/trigger" />
                  </div>
                  <div className="space-y-2">
                    <Label>Select Doctor</Label>
                    <Select value={newPrescription.doctorId} onValueChange={(v) => setNewPrescription({...newPrescription, doctorId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.role === 'DOCTOR' || u.role === 'SUPER_ADMIN').map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Diagnosis</Label>
                    <Input placeholder="e.g. Acute Viral Fever" value={newPrescription.diagnosis} onChange={(e) => setNewPrescription({...newPrescription, diagnosis: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold">Medicines</Label>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={handleAddMedicine}>
                      <Plus className="w-3 h-3" />
                      Add Medicine
                    </Button>
                  </div>
                  
                  {newPrescription.medicines.map((med, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <Input placeholder="Medicine Name" value={med.name} onChange={(e) => {
                        const meds = [...newPrescription.medicines];
                        meds[idx].name = e.target.value;
                        setNewPrescription({...newPrescription, medicines: meds});
                      }} />
                      <Input placeholder="Dosage" value={med.dosage} onChange={(e) => {
                        const meds = [...newPrescription.medicines];
                        meds[idx].dosage = e.target.value;
                        setNewPrescription({...newPrescription, medicines: meds});
                      }} />
                      <Input placeholder="Freq" value={med.frequency} onChange={(e) => {
                        const meds = [...newPrescription.medicines];
                        meds[idx].frequency = e.target.value;
                        setNewPrescription({...newPrescription, medicines: meds});
                      }} />
                      <div className="flex gap-2">
                        <Input placeholder="Duration" value={med.duration} onChange={(e) => {
                          const meds = [...newPrescription.medicines];
                          meds[idx].duration = e.target.value;
                          setNewPrescription({...newPrescription, medicines: meds});
                        }} />
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500" onClick={() => {
                          const meds = newPrescription.medicines.filter((_, i) => i !== idx);
                          setNewPrescription({...newPrescription, medicines: meds});
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Input value={newPrescription.notes} onChange={(e) => setNewPrescription({...newPrescription, notes: e.target.value})} />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNewPrescription({
                    patientId: '', doctorId: '', diagnosis: '', medicines: [{ name: '', dosage: '', frequency: '', duration: '' }], notes: ''
                  })}>Reset</Button>
                  <Button className="bg-medical-blue" onClick={handleSavePrescription}>Save Prescription</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Recent Prescriptions</CardTitle>
                <CardDescription>Print saved prescriptions.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-3">
                    {prescriptions.map((pres) => {
                      const p = MOCK_PATIENTS.find(pat => pat.id === pres.patientId);
                      return (
                        <div key={pres.id} className="p-3 bg-white border rounded-lg flex justify-between items-center shadow-sm">
                          <div>
                            <p className="text-sm font-bold">{p?.name}</p>
                            <p className="text-[10px] text-muted-foreground">{pres.date}</p>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => printPrescription(pres)}>
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {currentUser?.role === 'SUPER_ADMIN' && (
          <TabsContent value="audit">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Audit Logs</CardTitle>
                    <CardDescription>Review all major billing updates and deletions for accountability.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setAuditLogs([]);
                    storage.set(STORAGE_KEYS.AUDIT_LOGS, []);
                    toast.success('Audit logs cleared successfully');
                  }}>
                    Clear Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {(() => {
                      const logs = auditLogs;
                      if (logs.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400">
                            <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm font-medium">No activity logs found</p>
                          </div>
                        );
                      }
                      return logs.map((log: any) => (
                        <div key={log.id} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                log.action === 'DELETE' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                              }`}>
                                {log.action === 'DELETE' ? <Trash2 className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold flex items-center gap-2">
                                  {log.userName}
                                  <Badge variant="secondary" className="text-[8px] h-4 uppercase">{log.userRole}</Badge>
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  {new Date(log.timestamp).toLocaleString()} • {log.action} Action
                                </p>
                              </div>
                            </div>
                            <Badge className={log.action === 'DELETE' ? 'bg-rose-500' : 'bg-amber-500'}>
                              {log.action}
                            </Badge>
                          </div>
                          <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 overflow-hidden">
                            <p className="font-bold text-slate-700 mb-1">Target ID: {log.entityId}</p>
                            {log.action === 'DELETE' && (
                              <p className="text-slate-500">
                                Deleted bill details: ₹{log.details.bill?.totalAmount} for {MOCK_PATIENTS.find(p => p.id === log.details.bill?.patientId)?.name || 'Unknown Patient'}
                              </p>
                            )}
                            {log.action === 'UPDATE' && (
                              <div className="space-y-1">
                                <p className="text-slate-500 font-medium">Change Summary:</p>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                  <div className="p-2 bg-slate-100 rounded border border-slate-200">
                                    <p className="font-bold text-[10px] uppercase text-slate-400">Before</p>
                                    <p className="text-[11px] font-bold">₹{log.details.before?.totalAmount}</p>
                                    <p className="text-[10px] text-slate-500">{log.details.before?.items?.length} Items</p>
                                  </div>
                                  <div className="p-2 bg-blue-50 rounded border border-blue-100">
                                    <p className="font-bold text-[10px] uppercase text-blue-400">After</p>
                                    <p className="text-[11px] font-bold text-blue-700">₹{log.details.after?.totalAmount}</p>
                                    <p className="text-[10px] text-blue-500">{log.details.after?.items?.length} Items</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="tax_slabs">
          <Card className="border-none shadow-sm animate-fade-in">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl text-slate-800 font-bold">
                    <Percent className="w-5 h-5 text-emerald-500" />
                    Tax Slabs & GST Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure Goods & Services Tax (GST) slabs, active percentage brackets, and tax breakdowns applied to pharmacy billing and hospital service fees.
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleResetSlabsToDefault}
                  className="text-xs bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  Restore Standard GST Slabs
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add / Edit Form */}
              <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  {editingSlab ? (
                    <>
                      <Edit className="w-4 h-4 text-amber-500" />
                      Edit Tax Slab: <span className="text-amber-700">{editingSlab.name}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-emerald-500" />
                      Create New Tax / GST Slab
                    </>
                  )}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Slab Name *</Label>
                    <Input 
                      placeholder="e.g. GST 18% Standard" 
                      value={editingSlab ? editingSlab.name : newSlab.name}
                      onChange={(e) => {
                        if (editingSlab) {
                          setEditingSlab({ ...editingSlab, name: e.target.value });
                        } else {
                          setNewSlab({ ...newSlab, name: e.target.value });
                        }
                      }}
                      className="bg-white border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Tax Rate % *</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="e.g. 18" 
                      value={editingSlab ? editingSlab.rate : newSlab.rate}
                      onChange={(e) => {
                        if (editingSlab) {
                          setEditingSlab({ ...editingSlab, rate: e.target.value });
                        } else {
                          setNewSlab({ ...newSlab, rate: e.target.value });
                        }
                      }}
                      className="bg-white border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Tax Type</Label>
                    <Select
                      value={editingSlab ? editingSlab.type : newSlab.type}
                      onValueChange={(val) => {
                        if (editingSlab) {
                          setEditingSlab({ ...editingSlab, type: val });
                        } else {
                          setNewSlab({ ...newSlab, type: val });
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white border-slate-200">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GST">GST</SelectItem>
                        <SelectItem value="CGST_SGST">CGST + SGST</SelectItem>
                        <SelectItem value="VAT">VAT</SelectItem>
                        <SelectItem value="Exempt">Exempt</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Slab Details / Application</Label>
                    <Input 
                      placeholder="e.g. For medical hardware" 
                      value={editingSlab ? editingSlab.description : newSlab.description}
                      onChange={(e) => {
                        if (editingSlab) {
                          setEditingSlab({ ...editingSlab, description: e.target.value });
                        } else {
                          setNewSlab({ ...newSlab, description: e.target.value });
                        }
                      }}
                      className="bg-white border-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="slab-active-toggle" 
                      checked={editingSlab ? editingSlab.isActive : newSlab.isActive}
                      onChange={(e) => {
                        if (editingSlab) {
                          setEditingSlab({ ...editingSlab, isActive: e.target.checked });
                        } else {
                          setNewSlab({ ...newSlab, isActive: e.target.checked });
                        }
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <Label htmlFor="slab-active-toggle" className="text-xs font-semibold text-slate-600 cursor-pointer">
                      Mark as active slab (Enabled for live pharmacy and rate listings)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingSlab ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 font-medium text-xs border-slate-200"
                          onClick={() => setEditingSlab(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-9 font-medium text-xs bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={handleUpdateSlab}
                        >
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        className="h-9 font-medium text-xs bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-1.5"
                        onClick={handleAddSlab}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Slab
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Slabs List Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black tracking-wider text-slate-500 uppercase">
                        <th className="py-3.5 px-4 font-black">Slab Name</th>
                        <th className="py-3.5 px-4 font-black">Type</th>
                        <th className="py-3.5 px-4 font-black text-center">Tax Rate (%)</th>
                        <th className="py-3.5 px-4 font-black">Description</th>
                        <th className="py-3.5 px-4 font-black text-center">Status</th>
                        <th className="py-3.5 px-4 font-black text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {taxSlabs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                            No tax slabs configured. Click "Restore Standard GST Slabs" to reload defaults.
                          </td>
                        </tr>
                      ) : (
                        taxSlabs.map((slab) => (
                          <tr key={slab.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-800">{slab.name}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge className="bg-slate-100 hover:bg-slate-100 text-slate-700 border-none font-bold text-[10px] py-0.5 uppercase">
                                {slab.type || 'GST'}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                                {slab.rate}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 max-w-[240px] truncate">
                              <span className="text-slate-500 font-medium">{slab.description || 'No specialized application notes.'}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button 
                                onClick={() => handleToggleSlabStatus(slab.id)}
                                className={`inline-flex items-center justify-center font-bold text-[10px] tracking-wide uppercase px-2 py-0.5 rounded cursor-pointer transition-all ${
                                  slab.isActive 
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                              >
                                {slab.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setEditingSlab({ ...slab, rate: String(slab.rate) })}
                                  className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteSlab(slab.id)}
                                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Database Sharing Code Section */}
              <div className="mt-8 border-t border-slate-100 pt-8 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-800">Supabase SQL Editor - Database Setup</h3>
                </div>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                  Connect your live Supabase cloud workspace! Under your Supabase Project Dashboard, navigate to the 
                  <strong className="text-slate-700"> SQL Editor</strong>, open a new query sheet, copy the SQL scripts below, and run the execution command to bootstrap matching schemas for 
                  <strong className="text-slate-700"> tax slabs</strong>, <strong className="text-slate-700">billing/invoices</strong>, and <strong className="text-slate-700">pharmacy POS products</strong>.
                </p>

                <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                  {/* Selector Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 bg-slate-950 border-b border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        variant={sqlTab === 'all' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setSqlTab('all')}
                        className={`h-8 text-xs font-bold ${
                          sqlTab === 'all' 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Code className="w-3.5 h-3.5 mr-1" />
                        Complete Script
                      </Button>
                      <Button
                        variant={sqlTab === 'tax_slabs' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setSqlTab('tax_slabs')}
                        className={`h-8 text-xs font-bold ${
                          sqlTab === 'tax_slabs' 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Tax Slabs Table
                      </Button>
                      <Button
                        variant={sqlTab === 'billing' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setSqlTab('billing')}
                        className={`h-8 text-xs font-bold ${
                          sqlTab === 'billing' 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Billing / Invoices
                      </Button>
                      <Button
                        variant={sqlTab === 'pharmacy' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setSqlTab('pharmacy')}
                        className={`h-8 text-xs font-bold ${
                          sqlTab === 'pharmacy' 
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Pharmacy Items
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(SUPABASE_SQL_SCRIPTS[sqlTab]);
                        setCopiedSql(true);
                        toast.success('SQL code copied to clipboard!', {
                          description: 'You can now paste this code directly into your Supabase SQL Editor.'
                        });
                        setTimeout(() => setCopiedSql(false), 2000);
                      }}
                      className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy SQL Script
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Code Screen */}
                  <div className="relative">
                    <pre className="p-5 font-mono text-[11px] leading-relaxed text-emerald-400/90 bg-slate-900 overflow-x-auto max-h-[380px] text-left">
                      <code>{SUPABASE_SQL_SCRIPTS[sqlTab]}</code>
                    </pre>

                    {/* Quick Helper Badge */}
                    <div className="absolute bottom-3 right-3 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800 text-[10px] font-bold text-slate-400 select-none uppercase tracking-wide">
                      Postgres Dialect (Supabase)
                    </div>
                  </div>
                </div>

                {/* Important tips list */}
                <div className="mt-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100/40 text-slate-600 space-y-1.5">
                  <h4 className="text-xs font-black text-indigo-900 uppercase">Pro Tips for Live Connection:</h4>
                  <ul className="text-[11px] font-medium space-y-1 list-disc pl-4 text-slate-500">
                    <li>The <code className="bg-indigo-150 text-indigo-900 px-1 rounded font-bold">tax_slabs</code> table maps seamlessly with the rates configured on this screen.</li>
                    <li>Items generated inside OPD or Pharmacy bills leverage dynamic GST values, which are calculated client-side and synchronized to the <code className="bg-indigo-150 text-indigo-900 px-1 rounded font-bold">invoice_items</code> records linked to physical invoices.</li>
                    <li>Verify your Supabase API credentials are configured under <strong className="text-indigo-900">Database Credentials</strong> inside other tabs in Settings to establish instant cloud replication.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database & Sync Tab Content */}
        {!isAccountant && (
          <TabsContent value="database">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              {/* Credentials Form */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Database className="w-5 h-5 text-indigo-600" />
                      Database Credentials
                    </CardTitle>
                    <CardDescription>
                      Connect your live production Supabase instance for real-time cloud data storage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="db-url" className="text-xs font-bold text-slate-700 uppercase">
                        Supabase Project URL
                      </Label>
                      <Input
                        id="db-url"
                        placeholder="https://your-project.supabase.co"
                        value={dbUrl}
                        onChange={(e) => setDbUrl(e.target.value)}
                        className="bg-slate-50 border-slate-200"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">
                        Found in Supabase: Project Settings &gt; API &gt; Project URL
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="db-key" className="text-xs font-bold text-slate-700 uppercase">
                        Supabase Anon Key
                      </Label>
                      <Input
                        id="db-key"
                        type="password"
                        placeholder="eyJhbGciOi..."
                        value={dbKey}
                        onChange={(e) => setDbKey(e.target.value)}
                        className="bg-slate-50 border-slate-200 font-mono text-xs pr-10"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">
                        Public API anon token key. Safe to store in local client cache.
                      </p>
                    </div>

                    <div className="pt-4 flex flex-col gap-2">
                      <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
                        onClick={handleSaveDatabaseCredentials}
                        disabled={isDbSaving}
                      >
                        <Check className="w-4 h-4" />
                        {isDbSaving ? "Connecting..." : "Save & Connect Cloud"}
                      </Button>
                      
                      {isSupabaseConfigured && (
                        <Button
                          variant="outline"
                          type="button"
                          className="w-full text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 font-bold gap-2"
                          onClick={handleResetDatabaseCredentials}
                        >
                          <Database className="w-4 h-4 text-slate-400" />
                          Disconnect (Local Only)
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-l-4 border-indigo-500">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-indigo-400" />
                      Offline Replication
                    </CardTitle>
                    <CardDescription className="text-indigo-200/80">
                      The application synchronizes local offline queue transactions directly with your cloud repository.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-white/10 rounded-xl flex items-center justify-between border border-white/10">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-indigo-300">Offline Cache State</p>
                        <p className="text-xl font-bold mt-0.5">{offlineCount} records pending</p>
                      </div>
                      <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
                    </div>

                    <div className="p-3 bg-white/10 rounded-xl flex items-center justify-between border border-white/10">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-indigo-300">Supabase Channel</p>
                        <p className="text-xs font-bold mt-0.5">
                          {isSupabaseConfigured ? (isFallbackActive ? "🔴 Cloud Unreachable" : "🟢 Connected Live") : "⚪️ Passive Local"}
                        </p>
                      </div>
                    </div>

                    {isSupabaseConfigured && (
                      <Button
                        type="button"
                        className="w-full bg-white text-indigo-950 hover:bg-slate-100 font-black gap-2 mt-2"
                        onClick={handleSyncData}
                        disabled={isSyncing}
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? "Uploading Cache..." : "Force Sync With Cloud"}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm border-l-4 border-rose-500">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      <Trash2 className="w-5 h-5 text-rose-500" />
                      Database Maintenance
                    </CardTitle>
                    <CardDescription>
                      Purge seeded demo entries and reset transaction registers to prepare for live patient records.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-rose-700">Database Purge Action</p>
                      <p className="text-xs text-rose-600 leading-relaxed font-medium">
                        This will delete Amit Patel, Priya Singh, and other mock patients along with their associated billing records and histories.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 mt-2"
                      onClick={handlePurgeDemoData}
                      disabled={isPurging}
                    >
                      <Trash2 className={`w-4 h-4 ${isPurging ? 'animate-spin' : ''}`} />
                      {isPurging ? "Purging Records..." : "Purge All Seeded Demo Data"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Schema Health / Checker Tab */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-500" />
                        Database Integrity Check (Supabase Tables)
                      </CardTitle>
                      <CardDescription>
                        Run validation audits to verify if all required relational tables exist on your connected Supabase.
                      </CardDescription>
                    </div>
                    {isSupabaseConfigured && (
                      <Button
                        type="button"
                        onClick={runAllTableChecks}
                        disabled={isVerifyingAll}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shrink-0"
                      >
                        <Activity className={`w-4 h-4 ${isVerifyingAll ? 'animate-spin' : ''}`} />
                        {isVerifyingAll ? "Testing Tables..." : "Check Tables Connect"}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!isSupabaseConfigured ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                        <Database className="w-12 h-12 text-slate-300" />
                        <div className="max-w-md px-4">
                          <p className="text-sm font-bold text-slate-700">Database Connection Inactive</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Connect your live Supabase cloud workspace to see physical table integrity results. Local-only sandbox is fully operational.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(tableChecks).map(([tableName, val]) => {
                            const data = val as { status: 'idle' | 'checking' | 'connected' | 'error'; count?: number; errorMsg?: string };
                            return (
                              <div
                                key={tableName}
                                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/55 flex items-center justify-between gap-3 shadow-xs hover:border-slate-200 transition"
                              >
                                <div className="truncate">
                                  <p className="text-xs font-bold text-slate-700 font-mono truncate">{tableName}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                    {data.status === 'idle' && "Not tested yet."}
                                    {data.status === 'checking' && "Running ping query..."}
                                    {data.status === 'connected' && `Secured connection (${data.count} records)`}
                                    {data.status === 'error' && `Error: ${data.errorMsg}`}
                                  </p>
                                </div>
                                <div className="shrink-0">
                                  {data.status === 'idle' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      type="button"
                                      onClick={() => runSingleTableCheck(tableName)}
                                      className="h-7 text-[10px] font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-150 px-2 rounded-lg"
                                    >
                                      Test Table
                                    </Button>
                                  )}
                                  {data.status === 'checking' && (
                                    <RefreshCw className="w-4 h-4 text-amber-500 animate-spin mr-2" />
                                  )}
                                  {data.status === 'connected' && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      CONNECTED
                                    </span>
                                  )}
                                  {data.status === 'error' && (
                                    <span
                                      title={data.errorMsg}
                                      className="cursor-help inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                      FAILED
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-white space-y-2 mt-4">
                          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            How to handle "FAILED" results:
                          </h4>
                          <p className="text-[11px] leading-relaxed text-slate-300">
                            If any tables show a <strong>FAILED</strong> status or return <strong>relation public.xxx does not exist</strong>, this indicates that the table schema has not yet been copied to your live Supabase database.
                          </p>
                          <p className="text-[11px] leading-relaxed text-slate-300">
                            <strong>To fix this instantly:</strong> Scroll to the <strong>SQL Editor code box below</strong>, select all code in the script text sheet, open <strong>SQL Editor</strong> in your Supabase dashboard, paste, and hit <strong>RUN</strong>!
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
