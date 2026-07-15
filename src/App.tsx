import { useState, useEffect, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  User,
  Calendar, 
  FileText, 
  CreditCard, 
  FlaskConical, 
  Stethoscope, 
  Pill, 
  Baby, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Plus,
  Scissors,
  ClipboardList,
  Shield,
  BookOpen,
  ShieldAlert,
  Wrench,
  Trash2,
  Boxes,
  Droplet,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { GastroPlusLogoIcon } from './components/GastroPlusLogo';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import Dashboard from './components/Dashboard';
import OPD from './components/OPD';
import IPD from './components/IPD';
import Maternity from './components/Maternity';
import Expenses from './components/Expenses';
import OTManagement from './components/OTManagement';
import PatientOverview from './components/PatientOverview';
import Lab from './components/Lab';
import Login from './components/Login';
import UserManual from './components/UserManual';
import Billing from './components/Billing';
import AdminSettings from './components/Settings';
import Staff from './components/Staff';
import Pharmacy from './components/Pharmacy';
import PharmacyPOS from './components/PharmacyPOS';
import NursingStation from './components/NursingStation';
import EquipmentManagement from './components/EquipmentManagement';
import WasteManagement from './components/WasteManagement';
import InventoryPurchase from './components/InventoryPurchase';
import BloodBank from './components/BloodBank';
import IcuManagement from './components/IcuManagement';
import Insurance from './components/Insurance';
import EmergencyTriage from './components/EmergencyTriage';

import { storage, STORAGE_KEYS } from '@/lib/storage';
import { MOCK_PATIENTS, MOCK_USERS } from './mockData';
import { User as UserType } from './types';
import { supabaseService, syncOfflineDataWithSupabase } from '@/services/supabaseService';
import { hasMenuAccess, normalizeRole } from '@/utils/rbac';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'RADIOLOGIST'] },
  { name: 'Emergency & Triage', icon: ShieldAlert, path: '/emergency', roles: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS'] },
  { name: 'OPD Management', icon: Stethoscope, path: '/opd', roles: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS'] },
  { name: 'IPD Management', icon: Calendar, path: '/ipd', roles: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS'] },
  { name: 'OT Management', icon: Scissors, path: '/ot', roles: ['SUPER_ADMIN', 'DOCTOR', 'SURGEON', 'NURSE'] },
  { name: 'Lab & Radiology', icon: FlaskConical, path: '/lab', roles: ['SUPER_ADMIN', 'LAB_STAFF', 'ACCOUNTANT', 'ACCOUNTS', 'NURSE', 'RADIOLOGIST', 'PATHOLOGIST', 'DOCTOR'] },
  { name: 'Patient 360', icon: User, path: '/patient-overview', roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'ACCOUNTANT', 'ACCOUNTS'] },
  { name: 'Maternity', icon: Baby, path: '/maternity', roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK'] },
  { name: 'Nursing Station', icon: ClipboardList, path: '/nursing', roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE'] },
  { name: 'Pharmacy Store', icon: Pill, path: '/pharmacy', roles: ['SUPER_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS'] },
  { name: 'Billing & Accounts', icon: CreditCard, path: '/billing', roles: ['SUPER_ADMIN', 'ACCOUNTANT', 'ACCOUNTS'] },
  { name: 'Corporate & TPA', icon: Shield, path: '/insurance', roles: ['SUPER_ADMIN', 'ACCOUNTANT', 'ACCOUNTS', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK'] },
  { name: 'Expenses', icon: FileText, path: '/expenses', roles: ['SUPER_ADMIN', 'ACCOUNTANT', 'ACCOUNTS'] },
  { name: 'Admin Settings', icon: Settings, path: '/settings', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN'] },
  { name: 'Staff Management', icon: Users, path: '/staff', roles: ['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN'] },
  { name: 'Equipment Management', icon: Wrench, path: '/equipment', roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT', 'ACCOUNTS', 'LAB_STAFF'] },
  { name: 'Biomedical Waste', icon: Trash2, path: '/waste', roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'ADMIN', 'HOSPITAL_ADMIN', 'LAB_STAFF'] },
  { name: 'Inventory & Purchase', icon: Boxes, path: '/inventory', roles: ['SUPER_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'] },
  { name: 'Blood Bank', icon: Droplet, path: '/bloodbank', roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF', 'PATHOLOGIST', 'ADMIN', 'HOSPITAL_ADMIN'] },
  { name: 'ICU Management', icon: Activity, path: '/icu', roles: ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'ADMIN', 'HOSPITAL_ADMIN'] },
  { name: 'User Manual & Guide', icon: BookOpen, path: '/manual', roles: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'SURGEON', 'RADIOLOGIST'] },
];

function ProtectedRoute({ children, allowedRoles, user }: { children: ReactNode, allowedRoles: string[], user: any }) {
  if (!user) return <>{children}</>;
  
  const userRole = user.role;
  const normalizedUserRole = normalizeRole(userRole);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(normalizedUserRole);
  
  const hasAccess = isAdmin || allowedRoles.some(role => {
    const r = normalizeRole(role);
    return r === normalizedUserRole;
  });

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function SidebarContent({ onLogout, user, hospitalInfo }: { onLogout: () => void, user: UserType | null, hospitalInfo: any }) {
  const location = useLocation();
  
  const filteredNavItems = navItems.filter(item => {
    if (!user) return true;
    return hasMenuAccess(item.path, user.role);
  });
  
  return (
    <div className="flex flex-col h-full border-r overflow-hidden" style={{ backgroundColor: '#FCE3B4', borderColor: '#ebd0a2' }}>
      <div className="p-5 flex items-center gap-3 flex-shrink-0">
        {hospitalInfo?.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '' ? (
          <div className="w-10 h-10 bg-white/80 rounded-lg flex items-center justify-center text-[#1A5E63] font-bold text-xl overflow-hidden shadow-sm border border-white/30">
            <img src={hospitalInfo.logo} alt="Logo" className="w-full h-full object-cover" />
          </div>
        ) : (
          <GastroPlusLogoIcon className="w-10 h-10 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex items-baseline font-serif tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
            <span className="text-sm font-bold text-[#1A5E63]">Gastro</span>
            <span className="text-sm font-bold text-[#C59B6D]">Plus</span>
          </div>
          <p className="text-[9px] text-[#C59B6D] uppercase tracking-[0.2em] font-semibold leading-none mt-1">Hospital</p>
        </div>
      </div>
      
      <Separator className="flex-shrink-0 opacity-50 bg-[#ebd0a2]" />
      
      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive 
                    ? 'text-white shadow-sm' 
                    : 'text-slate-800 hover:bg-white/30'
                }`}
                style={isActive ? { backgroundColor: '#1A5E63' } : undefined}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#1A5E63]'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 mt-auto flex-shrink-0 border-t" style={{ backgroundColor: '#FCE3B4', borderColor: '#ebd0a2' }}>
        <div className="bg-white/50 backdrop-blur-md rounded-xl p-4 border border-white/40">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
              <AvatarImage src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali"} />
              <AvatarFallback>{user?.name.substring(0, 2).toUpperCase() || "AG"}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-slate-900">{user?.name || "Dr. Anjali Gupta"}</p>
              <p className="text-[10px] text-slate-700 uppercase font-black tracking-tight">{user?.role.replace('_', ' ') || "Super Admin"}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2 text-xs h-8 mt-1 text-red-600 hover:text-red-700 hover:bg-red-500/10 font-bold"
            onClick={onLogout}
          >
            <LogOut className="w-3 h-3" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

function GlobalHeaderSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await supabaseService.getPatients();
        if (data) setPatients(data);
      } catch (err) {
        console.warn('Failed to fetch patients for headers:', err);
      }
    };
    loadPatients();
  }, []);

  const handleSearchChange = (val: string) => {
    setQuery(val);
    if (val.trim() === '') {
      setResults([]);
      return;
    }
    const filtered = patients.filter((p: any) => 
      (p.name || '').toLowerCase().includes(val.toLowerCase()) ||
      (p.mrn || '').toLowerCase().includes(val.toLowerCase()) ||
      (p.phone || '').includes(val)
    );
    setResults(filtered.slice(0, 5));
  };

  const handleResultClick = (patientId: string) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    navigate(`/patient-overview?id=${patientId}`);
  };

  return (
    <div className="relative w-64 lg:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      <input 
        type="text" 
        placeholder="Search patients, MRN, or phone..." 
        className="w-full pl-10 pr-4 py-2 bg-white/90 border border-transparent rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5E63]/30 transition-all font-semibold text-slate-800 placeholder-slate-400"
        value={query}
        onChange={(e) => handleSearchChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      />
      
      {isOpen && results.length > 0 && (
        <div className="absolute top-12 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
          {results.map((p) => (
            <div 
              key={p.id}
              onClick={() => handleResultClick(p.id)}
              className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-800">{p.name}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Phone: {p.phone || 'N/A'} • MRN: {p.mrn}</p>
              </div>
              <span className="text-[9px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full uppercase scale-90 shrink-0">
                {p.registration_type || 'Patient'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickRegisterForm({ currentUser }: { currentUser: UserType | null }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'male',
    facility: 'OPD'
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    if (isRegistering) return;

    // Duplicate check
    const existingPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
    const trimmedNewName = (formData.name || '').trim().toLowerCase();
    const trimmedNewPhone = (formData.phone || '').trim().replace(/\D/g, '');

    const isDuplicate = existingPatients.some((p: any) => {
      const pName = (p.name || '').trim().toLowerCase();
      const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');

      const nameMatches = pName === trimmedNewName;
      const phoneMatches = trimmedNewPhone && pPhone && (trimmedNewPhone === pPhone);

      if (nameMatches && phoneMatches) return true;
      if (trimmedNewPhone && trimmedNewPhone.length >= 10 && pPhone === trimmedNewPhone) return true;
      if (nameMatches && !trimmedNewPhone && !pPhone) return true;
      return false;
    });

    if (isDuplicate) {
      toast.warning('A patient with this Name and/or Phone Number is already registered!');
      return;
    }

    setIsRegistering(true);
    const mrn = `MRN${Math.floor(Math.random() * 90000) + 10000}`;
    
    let registration_type = 'OPD';
    if (formData.facility === 'Lab') registration_type = 'Quick-Lab';
    else if (formData.facility === 'Pharmacy') registration_type = 'Quick-Pharmacy';
    else if (formData.facility === 'Radiology') registration_type = 'Quick-Radiology';
    else if (formData.facility === 'OPD') registration_type = 'OPD';
    else if (formData.facility === 'Emergency') registration_type = 'Emergency';

    const patientToAdd = {
      name: formData.name,
      phone: formData.phone,
      age: Number(formData.age) || 0,
      gender: formData.gender,
      mrn,
      status: 'Active',
      registration_type
    };

    try {
      // 1. Save patient inside Supabase DB
      const result = await supabaseService.createPatient(patientToAdd);
      
      if (result) {
        // Save patient into the separate Quick Registration database table
        await supabaseService.createQuickRegistration({
          mrn,
          name: formData.name,
          phone: formData.phone,
          age: Number(formData.age) || 0,
          gender: formData.gender,
          facility: formData.facility,
          status: 'Active'
        });

        // 2. If OPD Consultation chosen, book consultation and registration fee invoice
        if (formData.facility === 'OPD') {
          const appointmentDate = new Date().toISOString().split('T')[0];
          const appointmentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '10:00 AM';
          
          // Load custom OPD Charges settings from local storage
          const opdCharges = storage.get(STORAGE_KEYS.OPD_CHARGES, {
            reg: 200,
            appt: 200,
            consult: 500
          });

          const appointmentSynced = await supabaseService.createAppointment({
            patient_id: result.id,
            patientName: result.name,
            doctor_id: null,
            type: 'OPD',
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            status: 'Scheduled',
            urgency: 'Routine',
            fee: opdCharges.consult // Dynamic fee directly saved on appointment
          });

          if (appointmentSynced) {
            // Save inside the separate Live Queue database table
            await supabaseService.createLiveQueueItem({
              patient_id: result.id,
              doctor_id: null,
              appointment_id: appointmentSynced.id,
              token_number: Math.floor(Math.random() * 100) + 1,
              status: 'Waiting',
              urgency: 'Routine'
            });

            const regFee = opdCharges.reg; // Dynamic registration fee
            const invoiceData = {
              patient_id: result.id,
              invoice_number: `INV-REG-${Date.now()}`,
              status: 'Unpaid',
              total_amount: regFee,
              paid_amount: 0,
              payment_method: 'Cash',
              type: 'OPD',
              created_by: currentUser?.id
            };

            const invoiceItems = [{
              item_name: 'OPD Registration Fee',
              item_type: 'Consultation',
              quantity: 1,
              unit_price: regFee,
              total_price: regFee
            }];

            await supabaseService.createInvoice(invoiceData, invoiceItems);
          }
        }

        // Trigger real-time sync custom event so any active OPD or components refetch immediately
        window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
          detail: { table: 'patients', action: 'insert' } 
        }));

        toast.success(`Patient registered successfully for ${formData.facility}! MRN: ${mrn}`);
        setFormData({ name: '', phone: '', age: '', gender: 'male', facility: 'OPD' });
      } else {
        toast.error('Failed to register patient in database');
      }
    } catch (err: any) {
      console.error('Error in handleRegister:', err);
      toast.error('Failed to register brand new patient due to database error.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="header-name">Full Name *</Label>
          <Input 
            id="header-name" 
            placeholder="Enter patient name" 
            value={formData.name}
            disabled={isRegistering}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="header-phone">Phone Number *</Label>
          <Input 
            id="header-phone" 
            placeholder="Enter phone number" 
            disabled={isRegistering}
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="header-age">Age</Label>
          <Input 
            id="header-age" 
            type="number" 
            placeholder="Age" 
            disabled={isRegistering}
            value={formData.age}
            onChange={(e) => setFormData({...formData, age: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="header-gender">Gender</Label>
          <Select 
            value={formData.gender}
            disabled={isRegistering}
            onValueChange={(v) => setFormData({...formData, gender: v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="header-facility">Facility / Purpose</Label>
          <Select 
            value={formData.facility}
            disabled={isRegistering}
            onValueChange={(v) => setFormData({...formData, facility: v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select facility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPD">OPD Consultation</SelectItem>
              <SelectItem value="Emergency">Emergency</SelectItem>
              <SelectItem value="Pharmacy">Pharmacy / Medicine</SelectItem>
              <SelectItem value="Lab">Laboratory / Blood Test</SelectItem>
              <SelectItem value="Radiology">Radiology / X-Ray</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={isRegistering} onClick={() => setFormData({ name: '', phone: '', age: '', gender: 'male', facility: 'OPD' })}>Reset</Button>
        <Button className="bg-medical-blue" disabled={isRegistering} onClick={handleRegister}>
          {isRegistering ? 'Registering...' : 'Confirm Registration'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function App() {
  const [hospitalInfo, setHospitalInfo] = useState(() => storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'Gastro Plus Hospital',
    address: 'Gastro Plus Hospital ,Infront of Aura Inn Bansi Road Basti',
    gst: '27AAAAA0000A1Z5',
    phone: '+91 6394517005',
    email: 'info@gastroplushospital.com',
    logo: null as string | null
  }) || {
    name: 'Gastro Plus Hospital',
    address: 'Gastro Plus Hospital ,Infront of Aura Inn Bansi Road Basti',
    gst: '27AAAAA0000A1Z5',
    phone: '+91 6394517005',
    email: 'info@gastroplushospital.com',
    logo: null
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(() => {
    return storage.get(STORAGE_KEYS.SESSION_USER, null);
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return storage.get(STORAGE_KEYS.AUTH_STATUS, false);
  });

  const handleLogin = (userData: UserType) => {
    storage.set(STORAGE_KEYS.AUTH_STATUS, true);
    storage.set(STORAGE_KEYS.SESSION_USER, userData);
    setUser(userData);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    const handleStorage = () => {
      const savedUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
      if (savedUser) {
        setUser(savedUser);
      }
      const auth = storage.get(STORAGE_KEYS.AUTH_STATUS, false);
      setIsAuthenticated(auth);
      
      const savedHospital = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
      if (savedHospital) {
        setHospitalInfo(savedHospital);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);


  // Load hospital info and perform automatic offline sync on startup
  useEffect(() => {
    // One-time complete purge of all preloaded mock/demo data to start fresh with empty entries
    try {
      const clearedKey = 'hms_database_cleared_v2';
      if (!localStorage.getItem(clearedKey)) {
        const keysToClear = [
          STORAGE_KEYS.PATIENTS,
          STORAGE_KEYS.APPOINTMENTS,
          STORAGE_KEYS.BILLING,
          STORAGE_KEYS.LAB_BILLS,
          STORAGE_KEYS.NURSING_TASKS,
          STORAGE_KEYS.PHARMACY_BILLS,
          STORAGE_KEYS.PRESCRIPTIONS,
          STORAGE_KEYS.LAB_TEST_ORDERS,
          STORAGE_KEYS.EXTERNAL_REPORTS,
          STORAGE_KEYS.RADIOLOGY_FILES,
          STORAGE_KEYS.PATIENT_VITALS,
          'hms_admissions',
          'hms_discharge_summaries',
          'hms_clinical_notes',
          'hms_live_queue',
          'hms_quick_registrations',
          'hms_lis_bookings',
          'hms_lis_doctors',
          'hms_lis_franchises',
          'hms_ot_schedules'
        ];
        keysToClear.forEach(key => {
          localStorage.removeItem(key);
        });
        localStorage.setItem(clearedKey, 'true');
        console.log('Successfully completed one-time clean database purge.');
      }
    } catch (err) {
      console.warn('Error during one-time database purge:', err);
    }

    const initializeDatabase = async () => {
      try {
        // Fetch hospital info
        const dbHospitalInfo = await supabaseService.getHospitalInfo();
        if (dbHospitalInfo) {
          storage.set(STORAGE_KEYS.HOSPITAL_INFO, dbHospitalInfo);
          setHospitalInfo(dbHospitalInfo);
        }
      } catch (err) {
        console.warn('Could not fetch hospital info from database:', err);
      }

      // Check offline records and sync them automatically!
      try {
        const patients = storage.get(STORAGE_KEYS.PATIENTS, []);
        const offlinePatients = patients.filter((p: any) => p.id && String(p.id).startsWith('off-'));
        const appointments = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
        const offlineAppointments = appointments.filter((a: any) => a.id && String(a.id).startsWith('off-'));
        const admissions = storage.get('hms_admissions', []);
        const offlineAdmissions = admissions.filter((ad: any) => ad.id && String(ad.id).startsWith('off-'));
        const prescriptions = storage.get(STORAGE_KEYS.PRESCRIPTIONS, []);
        const offlinePrescriptions = prescriptions.filter((rx: any) => rx.id && String(rx.id).startsWith('off-'));
        const bills = storage.get(STORAGE_KEYS.BILLING, []);
        const offlineInvoices = bills.filter((b: any) => b.id && String(b.id).startsWith('off-'));
        const expenses = storage.get(STORAGE_KEYS.EXPENSES, []);
        const offlineExpenses = expenses.filter((e: any) => e.id && String(e.id).startsWith('off-'));
        
        const hasOfflineData = (
          offlinePatients.length > 0 || 
          offlineAppointments.length > 0 || 
          offlineAdmissions.length > 0 || 
          offlinePrescriptions.length > 0 ||
          offlineInvoices.length > 0 ||
          offlineExpenses.length > 0
        );

        if (hasOfflineData) {
          console.log('Detected offline unsynced data. Initializing auto-sync...');
          const syncResult = await syncOfflineDataWithSupabase();
          if (syncResult && syncResult.success && syncResult.syncCount > 0) {
            console.log(`Auto-synchronized ${syncResult.syncCount} offline records to the cloud!`);
            toast.success('Offline records synchronized with live server!');
            // Dispatch sync event to refresh lists in active components
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { action: 'sync' } }));
          }
        }
      } catch (err) {
        console.warn('Silent auto-sync failure on load:', err);
      }
    };

    if (isAuthenticated) {
      initializeDatabase();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    storage.remove(STORAGE_KEYS.AUTH_STATUS);
    storage.remove(STORAGE_KEYS.SESSION_USER);
    setUser(null);
    setIsAuthenticated(false);
    toast.info('Logged out successfully');
  };

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <Router>
      <AppLayout 
        user={user}
        hospitalInfo={hospitalInfo}
        handleLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setUser={setUser}
        setHospitalInfo={setHospitalInfo}
      />
    </Router>
  );
}

function AppLayout({ user, hospitalInfo, handleLogout, isMobileMenuOpen, setIsMobileMenuOpen, setUser, setHospitalInfo }: any) {
  return (
    <div className="flex h-[100dvh] bg-soft-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 h-full">
        <SidebarContent onLogout={handleLogout} user={user} hospitalInfo={hospitalInfo} />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-10 shadow-sm" style={{ backgroundColor: '#8BB1DE', borderColor: '#7ca2cf' }}>
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-900 hover:bg-white/20">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 h-full border-none">
                <SidebarContent onLogout={handleLogout} user={user} hospitalInfo={hospitalInfo} />
              </SheetContent>
            </Sheet>
            
            <div className="relative hidden md:block w-64 lg:w-96">
              <GlobalHeaderSearch />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'DOCTOR' || user?.role === 'RECEPTION' || user?.role === 'RECEPTIONIST' || user?.role === 'FRONT_DESK' || user?.role === 'NURSE') && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 rounded-full px-4 bg-white/95 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all font-semibold shadow-sm">
                    <Plus className="w-4 h-4" />
                    Emergency
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Quick Patient Registration</DialogTitle>
                  </DialogHeader>
                  <QuickRegisterForm currentUser={user} />
                </DialogContent>
              </Dialog>
            )}
            
            <Separator orientation="vertical" className="h-6 mx-2 hidden sm:block bg-slate-400/30" />
            
            <Button variant="ghost" size="icon" className="relative text-slate-900 hover:bg-white/20">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#8BB1DE]"></span>
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-none text-slate-950">{user?.name}</p>
                <p className="text-[9px] text-slate-800 uppercase mt-1 font-black tracking-wider">{user?.role.replace('_', ' ')}</p>
              </div>
              <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-white/50 transition-all">
                <AvatarImage src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali"} />
                <AvatarFallback>{user?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Routes>
            <Route path="/" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'RADIOLOGIST']}><Dashboard /></ProtectedRoute>} />
            <Route path="/emergency" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS']}><EmergencyTriage /></ProtectedRoute>} />
            <Route path="/opd" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS']}><OPD /></ProtectedRoute>} />
            <Route path="/ipd" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ACCOUNTANT', 'ACCOUNTS']}><IPD /></ProtectedRoute>} />
            <Route path="/maternity" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><Maternity /></ProtectedRoute>} />
            <Route path="/nursing" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE']}><NursingStation /></ProtectedRoute>} />
            <Route path="/ot" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><OTManagement /></ProtectedRoute>} />
            <Route path="/lab" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'LAB_STAFF', 'ACCOUNTANT', 'ACCOUNTS', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'RADIOLOGIST', 'PATHOLOGIST', 'DOCTOR']}><Lab /></ProtectedRoute>} />
            <Route path="/patient-overview" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'ACCOUNTANT', 'ACCOUNTS']}><PatientOverview userRole={user?.role} /></ProtectedRoute>} />
            <Route path="/pharmacy" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS']}><Pharmacy /></ProtectedRoute>} />
            <Route path="/pharmacy/pos" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS']}><PharmacyPOS /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ACCOUNTANT', 'ACCOUNTS']}><Expenses /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ACCOUNTANT', 'ACCOUNTS', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><Billing /></ProtectedRoute>} />
            <Route path="/insurance" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ACCOUNTANT', 'ACCOUNTS', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK']}><Insurance /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN']}><AdminSettings currentUser={user} onUserUpdate={(updatedUser) => setUser(updatedUser)} onHospitalUpdate={(info) => setHospitalInfo(info)} /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HOSPITAL_ADMIN']}><Staff /></ProtectedRoute>} />
            <Route path="/equipment" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'ADMIN', 'HOSPITAL_ADMIN', 'ACCOUNTANT', 'ACCOUNTS', 'LAB_STAFF']}><EquipmentManagement /></ProtectedRoute>} />
            <Route path="/waste" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'ADMIN', 'HOSPITAL_ADMIN', 'LAB_STAFF']}><WasteManagement /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}><InventoryPurchase /></ProtectedRoute>} />
            <Route path="/bloodbank" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF', 'PATHOLOGIST', 'ADMIN', 'HOSPITAL_ADMIN']}><BloodBank /></ProtectedRoute>} />
            <Route path="/icu" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'ADMIN', 'HOSPITAL_ADMIN']}><IcuManagement /></ProtectedRoute>} />
            <Route path="/manual" element={<ProtectedRoute user={user} allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'LAB_STAFF', 'PHARMACIST', 'ACCOUNTANT', 'ACCOUNTS', 'SURGEON', 'RADIOLOGIST']}><UserManual /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
