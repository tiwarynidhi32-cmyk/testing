import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bed as BedIcon, 
  UserPlus, 
  Plus,
  Search, 
  Filter, 
  MoreVertical, 
  Activity,
  History,
  FileText,
  LogOut,
  Download,
  Edit,
  Trash2,
  Stethoscope,
  ClipboardList,
  Pill,
  FlaskConical,
  CheckCircle2,
  Printer,
  ArrowLeftRight,
  Receipt,
  User,
  AlertCircle,
  Loader2,
  Building,
  Layers,
  Home,
  HeartPulse,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MOCK_BED_RATES, MOCK_USERS, MOCK_PATIENTS } from '@/mockData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { canUserModifyRecord, normalizeRole } from '@/utils/rbac';

interface AdmissionFormDataPayload {
  patient_id: string;
  bed_id: string;
  doctor_id?: string | null;
  ward?: string;
  urgency?: string;
  status?: string;
}

function validateAdmissionFields(
  payload: AdmissionFormDataPayload,
  bedsList: any[],
  patientsList: any[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check patient_id
  if (!payload.patient_id || payload.patient_id === '') {
    errors.push("Patient selection is required. Please select a valid patient.");
  } else {
    const patientExists = patientsList.some(p => p.id === payload.patient_id);
    if (!patientExists) {
      errors.push("Selected patient is invalid or does not exist in our database records.");
    }
  }

  // Check bed_id
  if (!payload.bed_id || payload.bed_id === '') {
    errors.push("Bed selection is required. Please allocate a bed.");
  } else {
    const bed = bedsList.find(b => b.id === payload.bed_id);
    if (!bed) {
      errors.push("Selected bed is invalid or does not exist in our database records.");
    } else {
      const bNum = bed.bed_number || bed.number || bed.id;
      if (!bNum) {
        errors.push("The selected bed record is missing a valid bed number.");
      }
    }
  }

  // Check ward
  if (!payload.ward || payload.ward.trim() === '') {
    errors.push("Ward / Department selection is required.");
  }

  // Check urgency
  const validUrgencies = ['Routine', 'Urgent', 'Emergency'];
  if (!payload.urgency || !validUrgencies.includes(payload.urgency)) {
    errors.push(`Urgency level must be one of: ${validUrgencies.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

const formatPrescriptionToText = (pres: any) => {
  if (!pres) return '';
  const medsArray = pres.medicines || pres.medications || [];
  if (Array.isArray(medsArray)) {
    return medsArray.map((m: any, idx: number) => {
      const name = m.name || m.drug_name || m.drugName || '';
      const dosage = m.dosage || m.strength || '';
      const freq = m.frequency || m.interval || '';
      const dur = m.duration || '';
      let line = `${idx + 1}. ${name}`;
      if (dosage) line += ` ${dosage}`;
      if (freq) line += ` (${freq})`;
      if (dur) line += ` - ${dur}`;
      return line;
    }).join('\n');
  } else if (typeof medsArray === 'string') {
    return medsArray;
  }
  return '';
};

const formatVitalsToText = (vitalsList: any[]) => {
  if (!vitalsList || vitalsList.length === 0) return '';
  const latestV = vitalsList[0];
  const bp = latestV.bp || latestV.blood_pressure || '';
  const pulse = latestV.pulse || latestV.heart_rate || '';
  const temp = latestV.temp || latestV.temperature || '';
  const spo2 = latestV.spo2 || '';
  const date = latestV.created_at || latestV.date || '';

  let str = '';
  if (bp) str += `BP: ${bp} mmHg, `;
  if (pulse) str += `PR: ${pulse} bpm, `;
  if (temp) str += `Temp: ${temp}, `;
  if (spo2) str += `SpO2: ${spo2}%`;
  return str ? `Latest Vitals (${date ? new Date(date).toLocaleDateString('en-IN') : 'recent'}): ${str}` : '';
};

const formatNotesToText = (notesList: any[]) => {
  if (!notesList || notesList.length === 0) return '';
  return notesList.slice(0, 2).map((n: any) => {
    const type = n.note_type || n.noteType || 'Doctor Note';
    const content = n.content || n.note || '';
    const date = n.created_at || n.date || '';
    return `[${type} - ${date ? new Date(date).toLocaleDateString('en-IN') : ''}]: ${content}`;
  }).join('\n');
};

const generateAutoSummary = (pat: any, admissionReason: string, vitalsText: string, notesText: string) => {
  let draft = `PATIENT DISCHARGE SUMMARY\n`;
  draft += `=========================\n`;
  draft += `Reason for Admission: ${admissionReason || 'Clinical treatment'}\n`;
  if (vitalsText) {
    draft += `\nClinical Parameters at Discharge:\n- ${vitalsText}\n`;
  }
  if (notesText) {
    draft += `\nPatient Clinical Course & Professional Care Notes:\n${notesText}\n`;
  } else {
    draft += `\nClinical Course: Patient was observed daily, treated according to clinical protocol, and showed significant symptomatic improvement.\n`;
  }
  draft += `\nCondition at Discharge: Hemodynamically stable, active, oriented to time & person, fit to discharge home.\n`;
  draft += `\nFollow-up Advice: Report to OPD/Emergency immediately in case of high-grade fever, severe chest tightness, persistent abdominal discomfort, or breathlessness.`;
  return draft;
};

const MOCK_DISCHARGE_SUMMARIES: any[] = [];

export default function IPD() {
  const navigate = useNavigate();
  const [view, setView] = useState<'beds' | 'admissions'>('beds');
  const [beds, setBeds] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>(MOCK_USERS);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [newDoctorNote, setNewDoctorNote] = useState('');
  const [newNurseNote, setNewNurseNote] = useState('');
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
  const [patientTests, setPatientTests] = useState<any[]>([]);
  const [recommendedTestName, setRecommendedTestName] = useState('');
  const [newPrescription, setNewPrescription] = useState({
    medicineName: '',
    dosage: '',
    duration: '',
    instructions: ''
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const isInitial = beds.length === 0 && patients.length === 0;
    if (isInitial) {
      setLoading(true);
    }
    try {
      const [bedsData, patientsData, admissionsData, dischargeSummariesData, staffData, otSchedulesData, invoicesData, otRoomsData] = await Promise.all([
        supabaseService.getBeds(),
        supabaseService.getPatients(),
        supabaseService.getAdmissions(),
        supabaseService.getDischargeSummaries(),
        supabaseService.getStaff(),
        supabaseService.getOTSchedules(),
        supabaseService.getInvoices(),
        supabaseService.getOTRooms()
      ]);
      if (bedsData) setBeds(bedsData);
      if (patientsData) setPatients(patientsData);
      if (admissionsData) setAdmissions(admissionsData);
      if (dischargeSummariesData) setDischargeSummaries(dischargeSummariesData.length > 0 ? dischargeSummariesData : MOCK_DISCHARGE_SUMMARIES);
      if (staffData && staffData.length > 0) setUsers(staffData);
      if (otSchedulesData) setOTSchedules(otSchedulesData);
      if (invoicesData) setInvoices(invoicesData);
      if (otRoomsData) setTheatres(otRoomsData);
    } catch (error) {
      console.error('Error fetching IPD data:', error);
      toast.error('Failed to load IPD data');
    } finally {
      setLoading(false);
    }
  };

  useDataSync(fetchData);

  useEffect(() => {
    if (isChartOpen && selectedPatient?.id) {
      const loadChartData = async () => {
        try {
          const [notes, rxList, orders] = await Promise.all([
            supabaseService.getClinicalNotes(selectedPatient.id),
            supabaseService.getPrescriptions(selectedPatient.id),
            supabaseService.getLabTestRequests()
          ]);
          if (notes) setClinicalNotes(notes);
          if (rxList) setPatientPrescriptions(rxList);
          if (orders) {
            const filtered = orders.filter((o: any) => o.patient_id === selectedPatient.id || o.patientId === selectedPatient.id);
            setPatientTests(filtered);
          }
        } catch (error) {
          console.error("Error loading patient chart data:", error);
        }
      };
      loadChartData();
    } else {
      setClinicalNotes([]);
      setPatientPrescriptions([]);
      setPatientTests([]);
      setNewDoctorNote('');
      setNewNurseNote('');
      setRecommendedTestName('');
      setNewPrescription({
        medicineName: '',
        dosage: '',
        duration: '',
        instructions: ''
      });
    }
  }, [isChartOpen, selectedPatient]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddBedOpen, setIsAddBedOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    patientId: '',
    bp: '',
    pulse: '',
    temp: '',
    spo2: ''
  });
  const [transferData, setTransferData] = useState({ patientId: '', fromBedId: '', toBedId: '' });
  const [newBed, setNewBed] = useState({ number: '', ward: '', type: 'General' });
  
  const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({ 
    patientId: '', 
    doctorId: '', 
    ward: '', 
    bedId: '',
    urgency: 'Routine'
  });

  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isCurrentUserAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HOSPITAL_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role?.toUpperCase().includes('ADMIN');
  const isAccountant = normalizeRole(currentUser?.role) === 'ACCOUNTANT';
  const isReceptionist = normalizeRole(currentUser?.role) === 'RECEPTIONIST';
  const isDoctor = currentUser?.role?.toUpperCase() === 'DOCTOR' || currentUser?.role?.toUpperCase() === 'SURGEON';
  const isDeleteForbidden = false;

  // --- NEW WORKFLOWS STATE ---
  const [activeTab, setActiveTab] = useState<'registration' | 'beds' | 'surgery' | 'discharge'>('beds');

  useEffect(() => {
    if (isDoctor && activeTab === 'registration') {
      setActiveTab('beds');
    }
  }, [isDoctor, activeTab]);
  const [bedSubTab, setBedSubTab] = useState<'grid' | 'list' | 'infrastructure'>('grid');
  
  // Infrastructure States (Local Persistence for custom relationships)
  const [buildings, setBuildings] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hms_buildings');
      return saved ? JSON.parse(saved) : [
        { id: 'bldg-1', name: 'Main Block', code: 'MAIN', description: 'Primary treatment and clinics' },
        { id: 'bldg-2', name: 'Anand Block', code: 'ANND', description: 'Bedward and trauma care' }
      ];
    } catch {
      return [
        { id: 'bldg-1', name: 'Main Block', code: 'MAIN', description: 'Primary treatment and clinics' },
        { id: 'bldg-2', name: 'Anand Block', code: 'ANND', description: 'Bedward and trauma care' }
      ];
    }
  });

  const [floors, setFloors] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hms_floors');
      return saved ? JSON.parse(saved) : [
        { id: 'flr-1-1', name: 'Ground Floor', buildingId: 'bldg-1' },
        { id: 'flr-1-2', name: 'First Floor', buildingId: 'bldg-1' },
        { id: 'flr-2-1', name: 'Ground Floor', buildingId: 'bldg-2' },
        { id: 'flr-2-2', name: 'First Floor', buildingId: 'bldg-2' }
      ];
    } catch {
      return [
        { id: 'flr-1-1', name: 'Ground Floor', buildingId: 'bldg-1' },
        { id: 'flr-1-2', name: 'First Floor', buildingId: 'bldg-1' },
        { id: 'flr-2-1', name: 'Ground Floor', buildingId: 'bldg-2' },
        { id: 'flr-2-2', name: 'First Floor', buildingId: 'bldg-2' }
      ];
    }
  });

  const [rooms, setRooms] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hms_rooms');
      return saved ? JSON.parse(saved) : [
        { id: 'rm-101', name: 'General Ward Room A', room_number: '101', type: 'General', floorId: 'flr-1-1', buildingId: 'bldg-1', capacity: 20 },
        { id: 'rm-102', name: 'Private Room 102', room_number: '102', type: 'Private', floorId: 'flr-1-2', buildingId: 'bldg-1', capacity: 8 },
        { id: 'rm-103', name: 'Semi-Private Room 103', room_number: '103', type: 'Semi-Private', floorId: 'flr-2-1', buildingId: 'bldg-2', capacity: 12 },
        { id: 'rm-icu', name: 'ICU Unit 1', room_number: 'ICU-1', type: 'ICU', floorId: 'flr-2-2', buildingId: 'bldg-2', capacity: 4 }
      ];
    } catch {
      return [
        { id: 'rm-101', name: 'General Ward Room A', room_number: '101', type: 'General', floorId: 'flr-1-1', buildingId: 'bldg-1', capacity: 20 },
        { id: 'rm-102', name: 'Private Room 102', room_number: '102', type: 'Private', floorId: 'flr-1-2', buildingId: 'bldg-1', capacity: 8 },
        { id: 'rm-103', name: 'Semi-Private Room 103', room_number: '103', type: 'Semi-Private', floorId: 'flr-2-1', buildingId: 'bldg-2', capacity: 12 },
        { id: 'rm-icu', name: 'ICU Unit 1', room_number: 'ICU-1', type: 'ICU', floorId: 'flr-2-2', buildingId: 'bldg-2', capacity: 4 }
      ];
    }
  });

  const [otSchedules, setOTSchedules] = useState<any[]>([]);
  const [theatres, setTheatres] = useState<any[]>([]);

  // dialog & form variables
  const [isBuildingOpen, setIsBuildingOpen] = useState(false);
  const [isFloorOpen, setIsFloorOpen] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [isOTOpen, setIsOTOpen] = useState(false);

  const [buildingForm, setBuildingForm] = useState({ name: '', code: '', description: '' });
  const [floorForm, setFloorForm] = useState({ name: '', buildingId: '' });
  const [roomForm, setRoomForm] = useState({ name: '', room_number: '', type: 'General', floorId: '', buildingId: '', capacity: '4' });

  // Inpatient Surgery Form
  const [surgeryForm, setSurgeryForm] = useState({
    patientId: '',
    operationName: '',
    surgeonId: '',
    theatreId: '',
    date: '',
    startTime: '',
    notes: ''
  });

  // Discharge Summary states
  const [dischargeForm, setDischargeForm] = useState({
    patientId: '',
    dischargeType: 'Routine / Improved',
    followUpDate: '',
    medications: '',
    clinicalSummary: '',
    dischargeDate: new Date().toISOString().substring(0, 10),
    dischargeBy: ''
  });
  const [dischargeAuxDetails, setDischargeAuxDetails] = useState<{
    vitals: any[];
    notes: any[];
    prescriptions: any[];
  }>({ vitals: [], notes: [], prescriptions: [] });
  const [loadingDischargeAux, setLoadingDischargeAux] = useState(false);

  useEffect(() => {
    const fetchAuxDetailsForDischarge = async () => {
      const pId = dischargeForm.patientId;
      if (!pId) {
        setDischargeAuxDetails({ vitals: [], notes: [], prescriptions: [] });
        return;
      }
      setLoadingDischargeAux(true);
      try {
        const [vts, nts, rxs] = await Promise.all([
          supabaseService.getPatientVitals ? supabaseService.getPatientVitals(pId) : Promise.resolve([]),
          supabaseService.getClinicalNotes ? supabaseService.getClinicalNotes(pId) : Promise.resolve([]),
          supabaseService.getPrescriptions ? supabaseService.getPrescriptions(pId) : Promise.resolve([]),
        ]);
        setDischargeAuxDetails({
          vitals: vts || [],
          notes: nts || [],
          prescriptions: rxs || [],
        });
      } catch (err) {
        console.warn('Error fetching auxiliary details for discharge:', err);
      } finally {
        setLoadingDischargeAux(false);
      }
    };

    fetchAuxDetailsForDischarge();
  }, [dischargeForm.patientId]);

  const [dischargedSummaryToShow, setDischargedSummaryToShow] = useState<any>(null);
  const [isSummaryDetailsOpen, setIsSummaryDetailsOpen] = useState(false);

  const [dischargeSummaries, setDischargeSummaries] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hms_discharge_summaries');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed : MOCK_DISCHARGE_SUMMARIES;
    } catch {
      return MOCK_DISCHARGE_SUMMARIES;
    }
  });

  const [dischargeSearchTerm, setDischargeSearchTerm] = useState('');
  const [showDischargeSearchDropdown, setShowDischargeSearchDropdown] = useState(false);
  const [bypassDues, setBypassDues] = useState(false);
  const [dischargeRightPaneView, setDischargeRightPaneView] = useState<'timeline' | 'report'>('timeline');
  const [patientChecklists, setPatientChecklists] = useState<Record<string, {
    doctorCleared: boolean;
    nurseCleared: boolean;
    accountsCleared: boolean;
    frontOfficeHandedOver: boolean;
    doctorName?: string;
    nurseName?: string;
    accountsName?: string;
    frontOfficeName?: string;
  }>>(() => {
    try {
      const stored = localStorage.getItem('hms_discharge_checklists');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const saveChecklist = (patId: string, updatedFields: any) => {
    const updatedChecklists = {
      ...patientChecklists,
      [patId]: {
        ...(patientChecklists[patId] || {
          doctorCleared: false,
          nurseCleared: false,
          accountsCleared: false,
          frontOfficeHandedOver: false
        }),
        ...updatedFields
      }
    };
    setPatientChecklists(updatedChecklists);
    localStorage.setItem('hms_discharge_checklists', JSON.stringify(updatedChecklists));
  };

  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('All');
  const [selectedReportSummaryId, setSelectedReportSummaryId] = useState<string | null>(null);

  const [isQuickRegistering, setIsQuickRegistering] = useState(false);
  const [mergePatientData, setMergePatientData] = useState<{ existing: any, newDetails: any } | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    newPatientData: any;
    duplicatePatient: any;
  } | null>(null);
  const isQuickRegisteringRef = useRef(false);

  const confirmIPDMergeAndContinue = async () => {
    if (!mergePatientData) return;
    const { existing, newDetails } = mergePatientData;
    setMergePatientData(null);
    setIsQuickRegistering(true);
    try {
      const mergedData = {
        name: existing.name,
        phone: existing.phone,
        age: newDetails.age ? parseInt(newDetails.age) : existing.age,
        gender: newDetails.gender || existing.gender,
        address: newDetails.address || existing.address || 'N/A',
        is_insurance: newDetails.isInsurance || existing.is_insurance,
        insurance_provider: newDetails.insuranceProvider || existing.insurance_provider,
        insurance_policy_number: newDetails.insurancePolicyNumber || existing.insurance_policy_number
      };

      const result = await supabaseService.updatePatient(existing.id, mergedData);
      if (result) {
        setPatients(patients.map(p => p.id === existing.id ? { ...p, ...result } : p));
        toast.success(`Patient record found and merged successfully! MRN: ${existing.mrn}`);
        setAdmissionForm({
          ...admissionForm,
          patientId: existing.id
        });
        setPatientSearchTerm(existing.name);
        setQuickPatient({
          name: '',
          age: '',
          gender: 'Male',
          phone: '',
          address: '',
          isInsurance: false,
          insuranceProvider: '',
          insurancePolicyNumber: ''
        });
      } else {
        toast.error('Failed to merge patient details');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error merging records');
    } finally {
      setIsQuickRegistering(false);
    }
  };

  const [quickPatient, setQuickPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    address: '',
    isInsurance: false,
    insuranceProvider: '',
    insurancePolicyNumber: ''
  });

  const handleQuickRegister = async (bypassDuplicateCheck: boolean = false) => {
    if (!quickPatient.name || !quickPatient.age || !quickPatient.phone) {
      toast.error('Please fill in Patient Name, Age, and Contact Phone.');
      return;
    }

    if (!bypassDuplicateCheck) {
      if (!window.confirm(`Are you sure you want to register / add patient "${quickPatient.name}"?`)) {
        return;
      }
    }

    if (isQuickRegistering || isQuickRegisteringRef.current) {
      toast.warning('Registration is already in progress! Please do not click multiple times.');
      return;
    }
    isQuickRegisteringRef.current = true;

    if (!bypassDuplicateCheck) {
      // Duplicate check
      const trimmedNewName = (quickPatient.name || '').trim().toLowerCase();
      const trimmedNewPhone = (quickPatient.phone || '').trim().replace(/\D/g, '');

      // Look for EXACT name and phone match for merge
      const exactMatch = patients.find((p: any) => {
        const pName = (p.name || '').trim().toLowerCase();
        const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');
        return pName === trimmedNewName && pPhone === trimmedNewPhone && trimmedNewPhone !== '';
      });

      if (exactMatch) {
        setMergePatientData({
          existing: exactMatch,
          newDetails: { ...quickPatient }
        });
        isQuickRegisteringRef.current = false;
        return;
      }

      const duplicatePatient = patients.find((p: any) => {
        const pName = (p.name || '').trim().toLowerCase();
        const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');

        const nameMatches = pName === trimmedNewName;
        const phoneMatches = trimmedNewPhone && pPhone && (trimmedNewPhone === pPhone);

        if (nameMatches && phoneMatches) return true;
        if (trimmedNewPhone && trimmedNewPhone.length >= 10 && pPhone === trimmedNewPhone) return true;
        if (nameMatches && !trimmedNewPhone && !pPhone) return true;
        return false;
      });

      if (duplicatePatient) {
        setDuplicateConfirm({
          newPatientData: { ...quickPatient },
          duplicatePatient
        });
        isQuickRegisteringRef.current = false;
        return;
      }
    }

    setIsQuickRegistering(true);
    try {
      const patientToAdd = {
        name: quickPatient.name,
        age: parseInt(quickPatient.age) || 30,
        gender: quickPatient.gender,
        phone: quickPatient.phone,
        address: quickPatient.address || 'N/A',
        mrn: 'MRN-' + Math.floor(100000 + Math.random() * 900000),
        status: 'Outpatient',
        needsAdmission: true,
        created_at: new Date().toISOString()
      };
      const result = await supabaseService.createPatient(patientToAdd);
      if (result) {
        setPatients([result, ...patients]);
        toast.success(`Patient ${result.name} registered with MRN: ${result.mrn}!`);
        setAdmissionForm({
          ...admissionForm,
          patientId: result.id
        });
        setPatientSearchTerm(result.name);
        setQuickPatient({
          name: '',
          age: '',
          gender: 'Male',
          phone: '',
          address: '',
          isInsurance: false,
          insuranceProvider: '',
          insurancePolicyNumber: ''
        });
      } else {
        toast.error('Failed to register patient');
      }
    } catch (error) {
      console.error('Error in quick registration:', error);
      toast.error('An error occurred during registration');
    } finally {
      setIsQuickRegistering(false);
      isQuickRegisteringRef.current = false;
    }
  };

  const displayPatients = useMemo(() => {
    if (!currentUser || !isDoctor) return patients;
    const docIdStr = String(currentUser.id).toLowerCase();
    const docNameStr = String(currentUser.name || '').toLowerCase();
    
    return patients.filter((p: any) => {
      const isAssigned = 
        (p.attending_doctor_id && String(p.attending_doctor_id).toLowerCase() === docIdStr) ||
        (p.attendingDoctorId && String(p.attendingDoctorId).toLowerCase() === docIdStr);
        
      const hasAdmission = admissions.some((a: any) => 
        (a.patient_id === p.id || a.patientId === p.id) &&
        (a.doctor_id && String(a.doctor_id).toLowerCase() === docIdStr)
      );
      
      const appts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
      const hasAppointment = appts.some((apt: any) => {
        const pId = apt.patient_id || apt.patientId;
        if (pId !== p.id) return false;
        
        const aptDocId = apt.doctor_id || apt.doctorId;
        const aptDocName = apt.doctor || apt.doctorName || '';
        const aptDocNameLower = String(aptDocName).toLowerCase();
        
        return (aptDocId && String(aptDocId).toLowerCase() === docIdStr) ||
               (aptDocName && aptDocNameLower === docNameStr) ||
               (aptDocName && docNameStr.includes(aptDocNameLower)) ||
               (currentUser.name && aptDocNameLower.includes(docNameStr));
      });
      
      return isAssigned || hasAdmission || hasAppointment;
    });
  }, [patients, admissions, currentUser, isDoctor]);

  const displayBeds = useMemo(() => {
    if (!currentUser || !isDoctor) return beds;
    const assignedPatientIds = displayPatients.map(p => p.id);
    
    return beds.filter((bed) => {
      if (bed.status !== 'Occupied') return true; // Show available beds
      return assignedPatientIds.includes(bed.patient_id || bed.patientId);
    });
  }, [beds, displayPatients, currentUser, isDoctor]);

  const displayAdmissions = useMemo(() => {
    if (!currentUser || !isDoctor) return admissions;
    const docIdStr = String(currentUser.id).toLowerCase();
    const assignedPatientIds = displayPatients.map(p => p.id);
    
    return admissions.filter((a: any) => {
      const isMyAdmission = a.doctor_id && String(a.doctor_id).toLowerCase() === docIdStr;
      const isMyPatient = assignedPatientIds.includes(a.patient_id || a.patientId);
      return isMyAdmission || isMyPatient;
    });
  }, [admissions, displayPatients, currentUser, isDoctor]);

  const displayOtSchedules = useMemo(() => {
    if (!currentUser || !isDoctor) return otSchedules;
    const docIdStr = String(currentUser.id).toLowerCase();
    const assignedPatientIds = displayPatients.map(p => p.id);
    
    return otSchedules.filter((sched: any) => {
      const isMySurgery = (sched.surgeon_id && String(sched.surgeon_id).toLowerCase() === docIdStr) ||
                          (sched.surgeonId && String(sched.surgeonId).toLowerCase() === docIdStr);
      const isMyPatient = assignedPatientIds.includes(sched.patient_id || sched.patientId);
      return isMySurgery || isMyPatient;
    });
  }, [otSchedules, displayPatients, currentUser, isDoctor]);

  // Auto load/save lists on update
  useEffect(() => {
    localStorage.setItem('hms_buildings', JSON.stringify(buildings));
  }, [buildings]);

  useEffect(() => {
    localStorage.setItem('hms_floors', JSON.stringify(floors));
  }, [floors]);

  useEffect(() => {
    localStorage.setItem('hms_rooms', JSON.stringify(rooms));
  }, [rooms]);

  // Fetch OT Schedules inside component or fallback
  const fetchOTSchedules = async () => {
    try {
      const data = await supabaseService.getOTSchedules();
      if (data) setOTSchedules(data);
    } catch (e) {
      console.error('Error fetching OT schedules:', e);
    }
  };

  useEffect(() => {
    fetchOTSchedules();
  }, []);

  // --- FORM HANDLERS FOR INFRASTRUCTURE ---
  const handleAddBuilding = () => {
    if (!buildingForm.name || !buildingForm.code) {
      toast.error('Please input building name and code');
      return;
    }
    const newBldg = {
      id: 'bldg-' + Date.now(),
      name: buildingForm.name,
      code: buildingForm.code,
      description: buildingForm.description
    };
    setBuildings([...buildings, newBldg]);
    setBuildingForm({ name: '', code: '', description: '' });
    setIsBuildingOpen(false);
    toast.success('Building added successfully!');
    logAudit('Add Building', newBldg.id, newBldg);
  };

  const handleAddFloor = () => {
    if (!floorForm.name || !floorForm.buildingId) {
      toast.error('Please input floor name and select building');
      return;
    }
    const newFlr = {
      id: 'flr-' + Date.now(),
      name: floorForm.name,
      buildingId: floorForm.buildingId
    };
    setFloors([...floors, newFlr]);
    setFloorForm({ name: '', buildingId: '' });
    setIsFloorOpen(false);
    toast.success('Floor added successfully!');
    logAudit('Add Floor', newFlr.id, newFlr);
  };

  const handleAddRoom = () => {
    if (!roomForm.name || !roomForm.room_number || !roomForm.buildingId || !roomForm.floorId) {
      toast.error('Please fill in all room fields');
      return;
    }
    const newRm = {
      id: 'rm-' + Date.now(),
      name: roomForm.name,
      room_number: roomForm.room_number,
      type: roomForm.type,
      buildingId: roomForm.buildingId,
      floorId: roomForm.floorId,
      capacity: parseInt(roomForm.capacity) || 4
    };
    setRooms([...rooms, newRm]);
    setRoomForm({ name: '', room_number: '', type: 'General', floorId: '', buildingId: '', capacity: '4' });
    setIsRoomOpen(false);
    toast.success('Room added successfully!');
    logAudit('Add Room', newRm.id, newRm);
  };

  const handleScheduleSurgery = async () => {
    if (!surgeryForm.patientId || !surgeryForm.operationName || !surgeryForm.surgeonId || !surgeryForm.date) {
      toast.error('Please fill in required fields to schedule surgery');
      return;
    }

    const payload = {
      patientId: surgeryForm.patientId,
      operationName: surgeryForm.operationName,
      surgeonId: surgeryForm.surgeonId,
      theatreId: surgeryForm.theatreId || 'Major OT-1',
      date: surgeryForm.date,
      startTime: surgeryForm.startTime || '10:00 AM',
      notes: surgeryForm.notes,
      status: 'Scheduled'
    };

    const result = await supabaseService.createOTSchedule(payload);
    if (result) {
      setOTSchedules([result, ...otSchedules]);
      setIsOTOpen(false);
      setSurgeryForm({
        patientId: '',
        operationName: '',
        surgeonId: '',
        theatreId: '',
        date: '',
        startTime: '',
        notes: ''
      });
      toast.success('Inpatient surgery scheduled successfully');
      logAudit('Schedule IPD Surgery', result.patientId || result.patient_id, result);
    } else {
      toast.error('Failed to schedule surgery');
    }
  };

  const getAttendingDoctorName = (patientId: string) => {
    const pat = patients.find(p => p.id === patientId) || MOCK_PATIENTS.find(p => p.id === patientId);
    if (!pat) return '';
    const docId = pat.attending_doctor_id || pat.attendingDoctorId;
    const doc = docId ? (
      users.find(u => String(u.id) === String(docId) || String(u.name).trim().toLowerCase() === String(docId).trim().toLowerCase()) || 
      MOCK_USERS.find(u => String(u.id) === String(docId) || String(u.name).trim().toLowerCase() === String(docId).trim().toLowerCase())
    ) : null;
    return doc ? doc.name : '';
  };

  const checkPatientDues = (patientId: string) => {
    const patientBills = invoices.filter(b => b.patient_id === patientId || b.patientId === patientId);
    const total = patientBills.reduce((acc, b) => acc + (Number(b.total_amount) || Number(b.total) || 0), 0);
    const paid = patientBills.reduce((acc, b) => acc + (Number(b.paid_amount) || Number(b.paid) || 0), 0);
    return total - paid;
  };

  const handleDischargeWithSummary = async () => {
    const { patientId, dischargeType, followUpDate, medications, clinicalSummary, dischargeDate } = dischargeForm;
    if (!patientId) {
      toast.error('Please select an active inpatient to discharge');
      return;
    }

    const outstandingDues = checkPatientDues(patientId);
    if (outstandingDues > 0 && !bypassDues) {
      toast.error(`Cannot discharge patient. There are outstanding dues of ${formatCurrency(outstandingDues)}. Please clear all bills first or check the Bypass box.`);
      return;
    }

    const bed = beds.find(b => b.patient_id === patientId || b.patientId === patientId);

    const activeAdmission = admissions.find(
      a => (a.patient_id === patientId || a.patientId === patientId) && a.status === 'Admitted'
    );
    const admissionId = activeAdmission ? activeAdmission.id : 'adm-' + Date.now();

    // Use selected discharge date or fallback to current date
    const finalDischargeDate = dischargeDate ? new Date(dischargeDate).toISOString() : new Date().toISOString();

    if (activeAdmission) {
      await supabaseService.dischargePatient(activeAdmission.id, finalDischargeDate);
    }

    // Update patient status to Discharged in Supabase and local cache
    await supabaseService.updatePatient(patientId, { status: 'Discharged' });

    // Update local patient state
    setPatients(patients.map(p => p.id === patientId ? { ...p, status: 'Discharged' } : p));

    let updatedBed = null;
    if (bed) {
      updatedBed = await supabaseService.updateBedStatus(bed.id, 'Available', null);
    }

    const patientAdmission = admissions.find(a => (a.patient_id === patientId || a.patientId === patientId));
    const admissionDateVal = activeAdmission?.admission_date || activeAdmission?.admissionDate || activeAdmission?.created_at || patientAdmission?.admission_date || patientAdmission?.admissionDate || patientAdmission?.created_at || new Date().toISOString();

    const summaryData = {
      id: 'sum-' + Date.now(),
      admissionId: admissionId,
      patientId: patientId,
      dischargeType,
      followUpDate,
      medications,
      clinicalSummary,
      dischargeDate: finalDischargeDate,
      dischargeBy: dischargeForm.dischargeBy || currentUser?.name || 'Dr. Rajesh Sharma',
      admissionDate: admissionDateVal
    };

    const savedSummary = await supabaseService.createDischargeSummary(summaryData);
    if (savedSummary) {
      setDischargeSummaries([savedSummary, ...dischargeSummaries]);
    } else {
      const savedSummaries = localStorage.getItem('hms_discharge_summaries');
      const summariesList = savedSummaries ? JSON.parse(savedSummaries) : [];
      const updatedList = [summaryData, ...summariesList];
      localStorage.setItem('hms_discharge_summaries', JSON.stringify(updatedList));
      setDischargeSummaries(updatedList);
    }

    if (bed) {
      if (updatedBed) {
        setBeds(beds.map(b => b.id === bed.id ? updatedBed : b));
      } else {
        setBeds(beds.map(b => b.id === bed.id ? { ...b, status: 'Available', patient_id: null, patientId: null } : b));
      }
    }

    const updatedAdmissions = await supabaseService.getAdmissions();
    if (updatedAdmissions) {
      setAdmissions(updatedAdmissions);
    } else {
      const list = storage.get('hms_admissions', []);
      const updated = list.map((item: any) => {
        if (item.id === admissionId) {
          return { ...item, status: 'Discharged', discharge_date: finalDischargeDate };
        }
        return item;
      });
      storage.set('hms_admissions', updated);
      setAdmissions(updated);
    }

    toast.success('Patient discharged and summary saved!');
    logAudit('Discharge Patient', patientId, summaryData);

    setDischargedSummaryToShow(summaryData);
    setIsSummaryDetailsOpen(true);

    setDischargeForm({
      patientId: '',
      dischargeType: 'Routine / Improved',
      followUpDate: '',
      medications: '',
      clinicalSummary: '',
      dischargeDate: new Date().toISOString().substring(0, 10),
      dischargeBy: ''
    });
    setDischargeSearchTerm('');
    setBypassDues(false);
  };

  const printDischargeSummary = (summary: any) => {
    if (!summary) return;
    const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
    const rawHospitalInfo = storage.get(STORAGE_KEYS.HOSPITAL_INFO, null);
    const hospitalName = rawHospitalInfo?.name || 'GASTRO PLUS HOSPITAL';
    const hospitalSubHeader = rawHospitalInfo?.address || 'Healthcare Center';
    const hospitalPhone = rawHospitalInfo?.phone || '+91 98765 43210';
    const hospitalEmail = rawHospitalInfo?.email || 'contact@gastroplushospital.com';

    // In secure iframe contexts, window.open is blocked or fails. 
    // We create a hidden iframe in the same document context to perform printing reliably.
    const iframeId = 'discharge-print-iframe-temp';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) {
      document.body.removeChild(iframe);
    }
    
    iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.margin = '0';
    iframe.style.padding = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      toast.error('Unable to initialize printing container');
      return;
    }

    const medsList = summary.medications
      ? summary.medications.split('\n').map((m: string) => `<li>${m}</li>`).join('')
      : '<li>No home medications prescribed</li>';

    const safeDischargeDate = summary.dischargeDate 
      ? new Date(summary.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const safeFollowUpDate = summary.followUpDate
      ? new Date(summary.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'As advised / SOS';

    const patientAdmission = admissions.find((a: any) => a.patient_id === pat?.id || a.patientId === pat?.id);
    const safeAdmissionDate = summary.admissionDate || summary.admission_date || patientAdmission?.admission_date || patientAdmission?.admissionDate || patientAdmission?.created_at || summary.created_at || new Date().toISOString();
    const formattedAdmissionDate = new Date(safeAdmissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const chkList = patientChecklists[pat?.id || ''] || {};
    const accountsClearedLocal = chkList.accountsCleared || false;
    const accountsAuditorLocal = chkList.accountsName || 'Finance Auditor';
    const doctorClearedLocal = chkList.doctorCleared || false;
    const doctorSignLocal = chkList.doctorName || summary.dischargeBy || 'Primary MD';

    const summaryHtml = `
      <html>
        <head>
          <title>Discharge Summary - ${pat?.name || 'Patient'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 40px; 
              padding: 0;
              color: #1e293b;
            }
            .hospital-banner { 
              border-bottom: 3px double #0d9488; 
              padding-bottom: 12px; 
              margin-bottom: 24px; 
              text-align: center;
            }
            .hospital-name {
              font-size: 24px;
              font-weight: 700;
              color: #0d9488;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .hospital-sub {
              font-size: 11px;
              color: #64748b;
              margin-top: 4px;
            }
            .doc-title { 
              text-align: center; 
              font-size: 16px; 
              font-weight: 700; 
              margin-bottom: 24px; 
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #0f172a;
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              padding: 6px;
            }
            .grid-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
            }
            .grid-table td {
              padding: 8px 12px;
              border: 1px solid #e2e8f0;
              font-size: 12px;
              width: 25%;
            }
            .grid-table td.label {
              font-weight: 600;
              background-color: #f8fafc;
              color: #475569;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 12px;
              font-weight: 700;
              color: #0d9488;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 4px;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .section-content {
              font-size: 12px;
              line-height: 1.6;
              color: #334155;
              white-space: pre-line;
            }
            .meds-list {
              margin: 0;
              padding-left: 20px;
              font-size: 12px;
              line-height: 1.6;
              color: #334155;
            }
            .meds-list li {
              margin-bottom: 6px;
            }
            .footer-sign {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
              font-size: 12px;
            }
            .sig-box {
              text-align: center;
              width: 200px;
            }
            .sig-line {
              border-top: 1px solid #94a3b8;
              margin-top: 40px;
              padding-top: 6px;
              font-weight: 500;
              color: #475569;
            }
            @media print {
              body { margin: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="hospital-banner">
            <div class="hospital-name">${hospitalName}</div>
            <div class="hospital-sub">
              ${hospitalSubHeader} | Tel: ${hospitalPhone} | Email: ${hospitalEmail}
            </div>
          </div>
          
          <div class="doc-title">Inpatient Discharge Summary</div>
          
          <table class="grid-table">
            <tr>
              <td class="label">Patient Name</td>
              <td>${pat?.name || 'Walk-in'}</td>
              <td class="label">MRN</td>
              <td>${pat?.mrn || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Age / Gender</td>
              <td>${pat?.age ? `${pat.age} Yrs` : 'N/A'} / ${pat?.gender || 'N/A'}</td>
              <td class="label">Contact No.</td>
              <td>${pat?.phone || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Admission Date</td>
              <td>${formattedAdmissionDate}</td>
              <td class="label">Discharge Date</td>
              <td>${safeDischargeDate}</td>
            </tr>
            <tr>
              <td class="label">Discharge Type</td>
              <td style="font-weight: 600; color: #b91c1c;">${summary.dischargeType || 'Routine / Improved'}</td>
              <td class="label">Follow-up Clinic Date</td>
              <td>${safeFollowUpDate}</td>
            </tr>
            <tr>
              <td class="label">Attending Clinician</td>
              <td colspan="3">${summary.dischargeBy || 'Duty Doctor'}</td>
            </tr>
            <tr>
              <td class="label">Accounts Clearance</td>
              <td style="font-weight: 700; color: ${accountsClearedLocal ? '#059669' : '#dc2626'};">
                ${accountsClearedLocal ? `✓ CLEAR FOR DISCHARGE (${accountsAuditorLocal})` : '✗ PENDING DUES SETTLEMENT'}
              </td>
              <td class="label">Clinical Sign-Off</td>
              <td style="font-weight: 700; color: ${doctorClearedLocal ? '#059669' : '#dc2626'};">
                ${doctorClearedLocal ? `✓ APPROVED (${doctorSignLocal})` : '✗ AWAITING CLINICAL SIGN-OFF'}
              </td>
            </tr>
          </table>

          <div class="section">
            <div class="section-title">Clinical History & Treatment Remarks</div>
            <div class="section-content">${summary.clinicalSummary || 'Discharged in stable clinical conditions. Continue prescribed medications. Contact emergency in case of acute discomfort.'}</div>
          </div>

          <div class="section">
            <div class="section-title">Discharge Prescription & Medications</div>
            <ul class="meds-list">
              ${medsList}
            </ul>
          </div>

          <div class="section" style="margin-top: 30px;">
            <div class="section-title">Standard Advice & When to Seek Urgent Medical Care</div>
            <div class="section-content" style="color: #64748b; font-size: 11px;">
              - Take medications exactly as prescribed. Do not miss doses.<br/>
              - Standard physical rest is advised for the next 3 to 5 days.<br/>
              - Seek IMMEDIATE medical/emergency consultation if you experience: High-grade fever, severe chest tightness or difficulty breathing, acute onset abdominal pain, persistent nausea/vomiting, or severe surgical wound redness/discharge.
            </div>
          </div>

          <div class="footer-sign">
            <div class="sig-box">
              <div class="sig-line">Prepared By</div>
            </div>
            <div class="sig-box">
              <div class="sig-line">Authorized Sign / Attending Clinician</div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    iframeDoc.write(summaryHtml);
    iframeDoc.close();

    // Trigger printing
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Remove the temporary iframe after print dialogue runs
        setTimeout(() => {
          if (document.getElementById(iframeId)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 500);
  };

  const logAudit = (action: string, entityId: string, details: any) => {
    const logs = storage.get(STORAGE_KEYS.AUDIT_LOGS, []);
    const newLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'System',
      role: currentUser?.role || 'User',
      action,
      entityId,
      details
    };
    storage.set(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs].slice(0, 500));
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Emergency': return 'bg-rose-500 text-white animate-pulse';
      case 'Urgent': return 'bg-amber-500 text-white';
      case 'Routine': return 'bg-emerald-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const handleAddBed = async () => {
    if (!newBed.number || !newBed.ward) {
      toast.error('Please fill in all fields');
      return;
    }
    const synced = await supabaseService.createBed({
      bed_number: newBed.number,
      ward: newBed.ward,
      bed_type: newBed.type,
      status: 'Available',
      daily_rate: MOCK_BED_RATES.find(r => r.type === newBed.type)?.rate || 0
    });

    if (synced) {
      setBeds([...beds, synced]);
      setNewBed({ number: '', ward: '', type: 'General' });
      setIsAddBedOpen(false);
      toast.success('New bed added successfully');
    } else {
      toast.error('Failed to add bed');
    }
  };

  const handleSaveClinicalNote = async (noteType: 'DOCTOR' | 'NURSE') => {
    const content = noteType === 'DOCTOR' ? newDoctorNote : newNurseNote;
    if (!content.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }
    
    const authorId = currentUser?.id || null;
    const noteData = {
      patient_id: selectedPatient.id,
      author_id: authorId,
      note_type: noteType,
      content: content.trim()
    };
    
    try {
      const savedNote = await supabaseService.createClinicalNote(noteData);
      if (savedNote) {
        toast.success(`${noteType === 'DOCTOR' ? 'Doctor' : 'Nurse'} note saved successfully`);
        const updatedNotes = await supabaseService.getClinicalNotes(selectedPatient.id);
        if (updatedNotes) setClinicalNotes(updatedNotes);
        
        if (noteType === 'DOCTOR') setNewDoctorNote('');
        else setNewNurseNote('');
      } else {
        toast.error('Failed to save note');
      }
    } catch (err: any) {
      console.error('Error saving clinical note:', err);
      toast.error('Failed to save clinical note');
    }
  };

  const handleSavePrescription = async () => {
    if (!newPrescription.medicineName.trim()) {
      toast.error('Medicine name cannot be empty');
      return;
    }

    const docName = currentUser?.name || 'Dr. Rajesh Sharma';
    const rxData = {
      patient_id: selectedPatient.id,
      patientId: selectedPatient.id,
      doctor_id: currentUser?.id || null,
      doctorId: currentUser?.id || null,
      doctor_name: docName,
      doctorName: docName,
      prescription_date: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      medicines: [
        {
          name: newPrescription.medicineName.trim(),
          dosage: newPrescription.dosage.trim() || 'Once a day',
          frequency: newPrescription.dosage.trim() || 'Once a day',
          duration: newPrescription.duration.trim() || '3 days',
          name_with_dose: newPrescription.medicineName.trim()
        }
      ],
      medications: [
        {
          name: newPrescription.medicineName.trim(),
          dosage: newPrescription.dosage.trim() || 'Once a day',
          frequency: newPrescription.dosage.trim() || 'Once a day',
          duration: newPrescription.duration.trim() || '3 days'
        }
      ],
      advice: newPrescription.instructions.trim() || 'Complete bed rest',
      notes: newPrescription.instructions.trim() || 'Complete bed rest'
    };

    try {
      const saved = await supabaseService.createPrescription(rxData);
      if (saved) {
        toast.success(`Prescription for ${newPrescription.medicineName.trim()} created successfully`);
        const rxList = await supabaseService.getPrescriptions(selectedPatient.id);
        if (rxList) setPatientPrescriptions(rxList);
        setNewPrescription({ medicineName: '', dosage: '', duration: '', instructions: '' });
      } else {
        toast.error('Failed to save prescription');
      }
    } catch (err) {
      console.error('Error saving prescription:', err);
      toast.error('Failed to save prescription');
    }
  };

  const handleRecommendTest = async () => {
    if (!recommendedTestName) {
      toast.error('Please select a test type');
      return;
    }

    const testRequest = {
      patient_id: selectedPatient.id,
      patientId: selectedPatient.id,
      test_name: recommendedTestName,
      requested_by: currentUser?.id || null,
      requestedBy: currentUser?.id || null,
      status: 'Pending',
      urgency: 'Routine',
      requested_at: new Date().toISOString()
    };

    try {
      const saved = await supabaseService.createLabTestRequest(testRequest);
      if (saved) {
        toast.success(`Recommended ${recommendedTestName} successfully`);
        const orders = await supabaseService.getLabTestRequests();
        if (orders) {
          const filtered = orders.filter((o: any) => o.patient_id === selectedPatient.id || o.patientId === selectedPatient.id);
          setPatientTests(filtered);
        }
        setRecommendedTestName('');
      } else {
        toast.error('Failed to save test recommendation');
      }
    } catch (err) {
      console.error('Error recommending test:', err);
      toast.error('Failed to save test recommendation');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (isDeleteForbidden) {
      toast.error('Deletion of clinical notes is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    const note = clinicalNotes.find(n => n.id === id);
    if (note && !canUserModifyRecord(note, currentUser, users)) {
      toast.error("Access Denied: This clinical note was added by an Admin and cannot be deleted by non-admin users.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete this clinical note?")) {
      return;
    }
    try {
      const res = await supabaseService.deleteClinicalNote(id);
      if (res) {
        toast.success("Clinical note removed successfully from history");
        if (selectedPatient?.id) {
          const notes = await supabaseService.getClinicalNotes(selectedPatient.id);
          if (notes) setClinicalNotes(notes);
        }
      } else {
        toast.error("Failed to delete clinical note");
      }
    } catch (err: any) {
      toast.error("Error deleting note: " + err.message);
    }
  };

  const handleDeleteBed = async (id: string) => {
    if (isDeleteForbidden) {
      toast.error('Deletion of bed configurations is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    const bed = beds.find(b => b.id === id);
    if (bed && !canUserModifyRecord(bed, currentUser, users)) {
      toast.error("Access Denied: This bed config was created by an Admin and cannot be deleted by non-admin users.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete bed "${bed?.number || id}"?`)) {
      return;
    }
    const success = await supabaseService.deleteBed(id);
    if (success) {
      setBeds(beds.filter(b => b.id !== id));
      toast.success('Bed removed');
    } else {
      toast.error('Failed to remove bed');
    }
  };

  const handleExportIPD = () => {
    const headers = ['Bed Number', 'Ward', 'Status', 'Patient MRN'];
    const rows = beds.map(b => [
      b.number,
      b.ward,
      b.status,
      b.patientId ? patients.find(p => p.id === b.patientId)?.mrn : 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'ipd_bed_status.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('IPD data exported');
  };

  const handleDischarge = async (bedId: string) => {
    const bed = beds.find(b => b.id === bedId);
    if (!bed) return;
    const patientId = bed.patient_id || bed.patientId;
    if (!patientId) {
      toast.error('Could not identify patient for discharge');
      return;
    }

    const outstandingDues = checkPatientDues(patientId);
    if (outstandingDues > 0) {
      toast.error(`Cannot discharge patient. There are outstanding dues of ${formatCurrency(outstandingDues)}. Please clear all bills first.`);
      return;
    }

    const patient = patients.find(p => String(p.id) === String(patientId));
    
    // Find and discharge the active admission record as well
    const activeAdmission = admissions.find(a => String(a.bed_id) === String(bedId) && String(a.patient_id || a.patientId) === String(patientId) && a.status === 'Admitted');
    if (activeAdmission) {
      await supabaseService.dischargePatient(activeAdmission.id, new Date().toISOString());
    }

    // Update patient status to Discharged in Supabase and local cache
    await supabaseService.updatePatient(patientId, { status: 'Discharged' });

    // Update local patient state
    setPatients(patients.map(p => p.id === patientId ? { ...p, status: 'Discharged' } : p));

    const updatedBed = await supabaseService.updateBedStatus(bedId, 'Available', null);
    if (updatedBed) {
      setBeds(beds.map(b => b.id === bedId ? updatedBed : b));
      // Refresh admissions state
      const updatedAdmissions = await supabaseService.getAdmissions();
      if (updatedAdmissions) setAdmissions(updatedAdmissions);
      toast.success('Patient discharged and bed freed');
    } else {
      toast.error('Failed to discharge patient');
    }
  };

  const pendingAdmissions = patients.filter(p => p.needsAdmission && p.status !== 'Discharged' && p.status !== 'discharged');

  const handleTransfer = async () => {
    if (!transferData.toBedId) {
      toast.error('Please select a target bed');
      return;
    }

    const successFrom = await supabaseService.updateBedStatus(transferData.fromBedId, 'Available', null);
    const successTo = await supabaseService.updateBedStatus(transferData.toBedId, 'Occupied', transferData.patientId);

    if (successFrom && successTo) {
      setBeds(beds.map(b => {
        if (b.id === transferData.fromBedId) return successFrom;
        if (b.id === transferData.toBedId) return successTo;
        return b;
      }));
      setIsTransferOpen(false);
      toast.success('Patient transferred successfully');
    } else {
      toast.error('Failed to complete transfer');
    }
  };

  const calculateBedCharges = (patientId: string) => {
    const bed = beds.find(b => b.patientId === patientId || b.patient_id === patientId);
    if (!bed) return 0;
    const rate = MOCK_BED_RATES.find(r => r.type === bed.type)?.rate || 0;
    // Mocking 3 days of stay for demonstration
    return rate * 3;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <p className="text-muted-foreground animate-pulse">Loading IPD records...</p>
      </div>
    );
  }

  const occupiedBeds = displayBeds.filter(b => b.status === 'Occupied').length;
  const totalBeds = displayBeds.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAdmissions = displayAdmissions.filter(a => {
    if (!a.admission_date) return false;
    return a.admission_date.startsWith(todayStr);
  }).length;

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '09:30 AM';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Dynamic, Vibrant, Richly Colored Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 text-white p-6 sm:p-8 shadow-xl shadow-blue-100 animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest bg-white/20 text-white px-3 py-1 rounded-full uppercase my-1 select-none w-fit">
              ★ INPATIENT PORTAL ACTIVE
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              IPD Management
            </h1>
            <p className="text-blue-50 text-sm font-medium max-w-xl">
              Monitor active clinical wards, assign specific patient beds, review nursing files, and manage comprehensive discharges.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
            <div className="relative">
              <Input 
                placeholder="Filter by name or phone..." 
                className="pl-9 w-[220px] bg-white text-slate-800 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
            <Button variant="outline" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-indigo-900 rounded-xl font-bold h-10" onClick={handleExportIPD}>
              <Download className="w-4 h-4" />
              Export Status
            </Button>
            {!isAccountant && !isReceptionist && !isDoctor && (
              <Button 
                className="bg-white text-indigo-900 hover:bg-indigo-50 gap-2 rounded-xl font-black h-10 shadow-md"
                onClick={() => setIsAddBedOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add Bed
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAddBedOpen} onOpenChange={setIsAddBedOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Bed</DialogTitle>
            <DialogDescription>Add a new bed to a ward or department.</DialogDescription>
          </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Bed Number</Label>
                    <Input placeholder="e.g. 105" value={newBed.number} onChange={(e) => setNewBed({...newBed, number: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ward / Department</Label>
                    <Select value={newBed.ward} onValueChange={(v) => setNewBed({...newBed, ward: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ward" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General Ward A">General Ward A</SelectItem>
                        <SelectItem value="ICU">ICU</SelectItem>
                        <SelectItem value="Maternity">Maternity Ward</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bed Type</Label>
                    <Select value={newBed.type} onValueChange={(v) => setNewBed({...newBed, type: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="ICU">ICU</SelectItem>
                        <SelectItem value="Maternity">Maternity</SelectItem>
                        <SelectItem value="Semi-Private">Semi-Private</SelectItem>
                        <SelectItem value="Private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <DialogTrigger asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogTrigger>
                  <Button className="bg-medical-blue flex-1" onClick={handleAddBed}>Add Bed</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          {!isAccountant && !isDoctor && (
            <Dialog open={isAdmissionOpen} onOpenChange={setIsAdmissionOpen}>
              <DialogTrigger asChild>
                <Button className="bg-medical-blue gap-2" onClick={() => setIsAdmissionOpen(true)}>
                  <UserPlus className="w-4 h-4" />
                  New Admission
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>New IPD Admission</DialogTitle>
                  <DialogDescription>Allocate a bed and register a new inpatient.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2 relative">
                    <Label>Patient (Search by Name or Phone)</Label>
                    <div className="relative">
                      <Input 
                        placeholder="Start typing name or phone..." 
                        value={patientSearchTerm}
                        onChange={(e) => {
                          setPatientSearchTerm(e.target.value);
                          setShowPatientResults(true);
                          if (e.target.value === '') {
                            setAdmissionForm({...admissionForm, patientId: ''});
                          }
                        }}
                        onFocus={() => setShowPatientResults(true)}
                      />
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {showPatientResults && patientSearchTerm.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto custom-scrollbar">
                        {patients.filter(p => 
                          (p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                          (p.phone || '').includes(patientSearchTerm) ||
                          (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())) &&
                          p.status !== 'Discharged' && p.status !== 'discharged' &&
                          p.status !== 'Admitted' && p.status !== 'admitted'
                        ).length > 0 ? (
                          patients.filter(p => 
                            (p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                            (p.phone || '').includes(patientSearchTerm) ||
                            (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())) &&
                            p.status !== 'Discharged' && p.status !== 'discharged' &&
                            p.status !== 'Admitted' && p.status !== 'admitted'
                          ).map(p => (
                            <div 
                              key={p.id} 
                              className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                              onClick={() => {
                                setAdmissionForm({...admissionForm, patientId: p.id});
                                setPatientSearchTerm(p.name);
                                setShowPatientResults(false);
                              }}
                            >
                              <div>
                                <p className="text-sm font-medium">{p.name}</p>
                                <p className="text-[10px] text-muted-foreground">{p.phone} • MRN: {p.mrn}</p>
                              </div>
                              {admissionForm.patientId === p.id && <CheckCircle2 className="w-4 h-4 text-medical-blue" />}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                            No patients found.
                          </div>
                        )}
                      </div>
                    )}

                    {admissionForm.patientId && patients.find(p => p.id === admissionForm.patientId) && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-blue-700 truncate">
                            {patients.find(p => p.id === admissionForm.patientId)?.name}
                          </p>
                          <p className="text-[10px] text-blue-600 truncate">
                            {patients.find(p => p.id === admissionForm.patientId)?.age} yrs • {patients.find(p => p.id === admissionForm.patientId)?.gender} • MRN: {patients.find(p => p.id === admissionForm.patientId)?.mrn}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-blue-400 hover:text-blue-600 hover:bg-blue-100"
                          onClick={() => {
                            setAdmissionForm({...admissionForm, patientId: ''});
                            setPatientSearchTerm('');
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Attending Doctor</Label>
                    <Select 
                      value={admissionForm.doctorId}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, doctorId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor">
                          {(() => {
                            const doc = users.find(u => u.id === admissionForm.doctorId);
                            return doc ? `${doc.name}${doc.degree ? ` - ${doc.degree}` : ''}` : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON').map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{doc.name} {doc.degree ? ` - ${doc.degree}` : ''}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {doc.department} {doc.specialization ? `• ${doc.specialization}` : ''}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Ward / Department</Label>
                    <Select 
                      value={admissionForm.ward}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, ward: v, bedId: ''})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ward" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General Ward A">General Ward A</SelectItem>
                        <SelectItem value="ICU">ICU</SelectItem>
                        <SelectItem value="Maternity">Maternity Ward</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bed Number</Label>
                    <Select 
                      value={admissionForm.bedId}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, bedId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bed">
                          {(() => {
                            const b = beds.find(x => x.id === admissionForm.bedId);
                            return b ? `Bed ${b.bed_number || b.number} (${b.bed_type || b.type})` : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const availableBeds = beds.filter(b => {
                            const isSelected = b.id === admissionForm.bedId;
                            const isAvailable = b.status?.toLowerCase() === 'available';
                            const matchesWard = !admissionForm.ward || 
                              b.ward?.toLowerCase().includes(admissionForm.ward.toLowerCase()) || 
                              admissionForm.ward.toLowerCase().includes(b.ward?.toLowerCase() || '');
                            return isSelected || (isAvailable && matchesWard);
                          });
                          return availableBeds.length > 0 ? (
                            availableBeds.map(b => (
                              <SelectItem key={b.id} value={b.id}>Bed {b.bed_number || b.number} ({b.bed_type || b.type})</SelectItem>
                            ))
                          ) : (
                            <SelectItem disabled value="none">No beds available in this ward</SelectItem>
                          );
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Admission Urgency</Label>
                    <Select 
                      value={admissionForm.urgency}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, urgency: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine">🟢 Routine</SelectItem>
                        <SelectItem value="Urgent">🟡 Urgent</SelectItem>
                        <SelectItem value="Emergency">🔴 Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogTrigger asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogTrigger>
                  <Button 
                    className="bg-medical-blue" 
                    onClick={async () => {
                      const payload = {
                        patient_id: admissionForm.patientId,
                        bed_id: admissionForm.bedId,
                        doctor_id: admissionForm.doctorId || null,
                        ward: admissionForm.ward,
                        urgency: admissionForm.urgency,
                        status: 'Admitted'
                      };

                      const validation = validateAdmissionFields(payload, beds, patients);
                      if (!validation.isValid) {
                        validation.errors.forEach(err => toast.error(err));
                        return;
                      }

                      try {
                        const syncedAdmission = await supabaseService.createAdmission(payload);

                        if (syncedAdmission) {
                          // Update bed status in Supabase
                          const updatedBed = await supabaseService.updateBedStatus(admissionForm.bedId, 'Occupied', admissionForm.patientId);
                          
                          // Update patient status in Supabase
                          await supabaseService.updatePatient(admissionForm.patientId, { 
                            needs_admission: false, 
                            status: 'Admitted',
                            attending_doctor_id: admissionForm.doctorId || null,
                            attendingDoctorId: admissionForm.doctorId || null
                          });

                          // Update local state
                          setPatients(patients.map(p => 
                            p.id === admissionForm.patientId ? { 
                              ...p, 
                              needs_admission: false, 
                              needsAdmission: false, 
                              status: 'Admitted',
                              attending_doctor_id: admissionForm.doctorId || null,
                              attendingDoctorId: admissionForm.doctorId || null
                            } : p
                          ));

                          setAdmissions([syncedAdmission, ...admissions]);

                          if (updatedBed) {
                            setBeds(beds.map(b => b.id === admissionForm.bedId ? updatedBed : b));
                          }

                          toast.success('Patient admitted successfully');
                          setIsAdmissionOpen(false);
                          setAdmissionForm({ patientId: '', doctorId: '', ward: '', bedId: '', urgency: 'Routine' });
                          setPatientSearchTerm('');
                        } else {
                          toast.error('Failed to record admission. The database rejected the insertion request.');
                        }
                      } catch (dbError: any) {
                        toast.error(`Database Rejection: ${dbError.message || dbError}`);
                      }
                    }}
                  >
                    Confirm Admission
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

      {pendingAdmissions.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between mb-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900">{pendingAdmissions.length} Pending IPD Transfer Requests</h4>
              <p className="text-xs text-amber-700 font-medium">Patients marked for admission from OPD require bed allocation.</p>
            </div>
          </div>
          <div className="flex gap-2">
            {pendingAdmissions.map(p => (
              <Button 
                key={p.id}
                variant="outline" 
                size="sm" 
                className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100 font-bold px-4 h-9"
                onClick={() => {
                  setAdmissionForm({ ...admissionForm, patientId: p.id });
                  setPatientSearchTerm(p.name);
                  setIsAdmissionOpen(true);
                }}
              >
                Admit {p.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Horizontal Navigation Tabs - High contrast active styling */}
      <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200/50 shadow-inner w-full sm:w-fit mb-2 animate-in fade-in duration-200">
        {!isDoctor && (
          <Button 
            variant="ghost"
            size="sm" 
            onClick={() => setActiveTab('registration')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'registration' 
                ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' 
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Registration
          </Button>
        )}
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => {
            setActiveTab('beds');
            setBedSubTab('grid');
            setView('beds');
          }}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            activeTab === 'beds' 
              ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' 
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          Bed Allotment
        </Button>
        {!isReceptionist && (
          <Button 
            variant="ghost"
            size="sm" 
            onClick={() => setActiveTab('surgery')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'surgery' 
                ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' 
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Surgery Details
          </Button>
        )}
        <Button 
          variant="ghost"
          size="sm" 
          onClick={() => setActiveTab('discharge')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            activeTab === 'discharge' 
              ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' 
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          Discharge Summary
        </Button>
      </div>

      {activeTab === 'beds' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card id="ipd-stats-card-occupied" className="border-none shadow-sm bg-blue-50/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <BedIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{occupiedBeds} / {totalBeds}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Beds Occupied</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-teal-50/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-teal-100 text-teal-600">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayAdmissions}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Today's Admissions</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            <Button 
              variant={view === 'beds' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('beds')}
              className={view === 'beds' ? 'bg-white shadow-sm font-bold' : 'font-medium'}
            >
              Bed Status
            </Button>
            <Button 
              variant={view === 'admissions' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('admissions')}
              className={view === 'admissions' ? 'bg-white shadow-sm font-bold' : 'font-medium'}
            >
              Active Admissions
            </Button>
          </div>

          {view === 'beds' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayBeds.filter(bed => {
                if (!searchQuery) return true;
                const bedPatId = bed.patient_id || bed.patientId;
                const patient = bedPatId ? patients.find(p => String(p.id) === String(bedPatId)) : null;
                const query = searchQuery.toLowerCase();
                const numMatch = String(bed.bed_number || '').toLowerCase().includes(query);
                const wardMatch = String(bed.ward || '').toLowerCase().includes(query);
                const typeMatch = String(bed.bed_type || '').toLowerCase().includes(query);
                if (!patient) return numMatch || wardMatch || typeMatch;
                return patient.name.toLowerCase().includes(query) || 
                       (patient.phone || '').includes(searchQuery) ||
                       (patient.mrn || '').toLowerCase().includes(query) ||
                       numMatch || wardMatch || typeMatch;
              }).map((bed) => {
                const bedPatId = bed.patient_id || bed.patientId;
                const patient = bedPatId ? patients.find(p => String(p.id) === String(bedPatId)) : null;
                const admission = bedPatId ? admissions.find(a => String(a.bed_id) === String(bed.id) && String(a.patient_id || a.patientId) === String(bedPatId) && a.status === 'Admitted') : null;
                const docId = admission?.doctor_id || admission?.doctorId || patient?.attending_doctor_id || patient?.attendingDoctorId;
                const doctor = docId ? users.find(u => 
                  String(u.id) === String(docId) || 
                  String(u.name).trim().toLowerCase() === String(docId).trim().toLowerCase()
                ) : null;
                const urgency = admission?.urgency || bed.urgency;
                return (
                  <Card key={bed.id} className={`border-none shadow-sm transition-all hover:ring-2 hover:ring-medical-blue/10 ${bed.status === 'Occupied' ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <CardHeader className="p-4 pb-2">
                       <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-tight ${
                          bed.status === 'Available' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                          bed.status === 'Occupied' ? 'text-blue-600 bg-blue-50 border-blue-100' :
                          'text-amber-600 bg-amber-50 border-amber-100'
                        }`}>
                          {bed.status}
                        </Badge>
                          <div className="flex gap-1">
                            {urgency && (
                              <Badge className={`${getUrgencyColor(urgency as string)} text-[9px] border-none`}>
                                {urgency}
                              </Badge>
                            )}
                            {bed.status === 'Occupied' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-medical-blue" 
                                  title="Patient 360 Overview"
                                  onClick={() => navigate(`/patient-overview?id=${patient?.id}`)}
                                >
                                  <Activity className="w-3 h-3" />
                                </Button>
                                {!isAccountant && !isDoctor && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-amber-500" 
                                    title="Transfer Bed"
                                    onClick={() => {
                                      setTransferData({ patientId: bed.patient_id!, fromBedId: bed.id, toBedId: '' });
                                      setIsTransferOpen(true);
                                    }}
                                  >
                                    <ArrowLeftRight className="w-3 h-3" />
                                  </Button>
                                )}
                                {!isAccountant && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500" onClick={() => handleDischarge(bed.id)}>
                                    <LogOut className="w-3 h-3" />
                                  </Button>
                                )}
                              </>
                            )}
                            {!isAccountant && (
                              <>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400">
                                  <Edit className="w-3 h-3" />
                                </Button>
                                {!isDeleteForbidden && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500" onClick={() => handleDeleteBed(bed.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                      </div>
                      <CardTitle className="text-lg mt-2 font-bold">Bed {bed.bed_number}</CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold tracking-wider">{bed.ward}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {patient ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                              {patient.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-semibold truncate">{patient.name}</p>
                              <p className="text-[10px] text-muted-foreground">{patient.phone} • {patient.mrn}</p>
                            </div>
                          </div>

                          {doctor && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Attending Doctor</p>
                              <p className="text-[11px] font-medium text-slate-700">{doctor.name}</p>
                              <p className="text-[9px] text-slate-500">{doctor.department} • {doctor.specialization}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            {!isReceptionist && !isAccountant && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[10px] gap-1"
                                onClick={() => {
                                  const currentVitals = storage.get(STORAGE_KEYS.PATIENT_VITALS, []);
                                  const patientVitals = currentVitals.find((v: any) => v.patientId === patient.id);
                                  setVitalsForm({
                                    patientId: patient.id,
                                    bp: patientVitals?.bp || '120/80',
                                    pulse: patientVitals?.pulse || '78',
                                    temp: patientVitals?.temp || '98.6',
                                    spo2: patientVitals?.spo2 || '98'
                                  });
                                  setIsVitalsOpen(true);
                                }}
                              >
                                <Activity className="w-3 h-3" />
                                Vitals
                              </Button>
                            )}

                            <Dialog open={isVitalsOpen} onOpenChange={setIsVitalsOpen}>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Update Patient Vitals - {patients.find(p => p.id === vitalsForm.patientId)?.name}</DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4 py-4">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Blood Pressure</Label>
                                    <Input 
                                      value={vitalsForm.bp} 
                                      onChange={(e) => setVitalsForm({...vitalsForm, bp: e.target.value})}
                                      placeholder="e.g. 120/80"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Pulse Rate (bpm)</Label>
                                    <Input 
                                      value={vitalsForm.pulse} 
                                      onChange={(e) => setVitalsForm({...vitalsForm, pulse: e.target.value})}
                                      placeholder="e.g. 78"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Temperature (°F)</Label>
                                    <Input 
                                      value={vitalsForm.temp} 
                                      onChange={(e) => setVitalsForm({...vitalsForm, temp: e.target.value})}
                                      placeholder="e.g. 98.6"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">SpO2 (%)</Label>
                                    <Input 
                                      value={vitalsForm.spo2} 
                                      onChange={(e) => setVitalsForm({...vitalsForm, spo2: e.target.value})}
                                      placeholder="e.g. 98"
                                    />
                                  </div>
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                  <Button variant="outline" onClick={() => setIsVitalsOpen(false)} className="flex-1">Cancel</Button>
                                  <Button className="bg-medical-blue flex-1" onClick={() => {
                                    const currentVitals = storage.get(STORAGE_KEYS.PATIENT_VITALS, []);
                                    const otherVitals = currentVitals.filter((v: any) => v.patientId !== vitalsForm.patientId);
                                    const newVitals = [
                                      {
                                        ...vitalsForm,
                                        id: `v-${Date.now()}`,
                                        timestamp: new Date().toISOString()
                                      },
                                      ...otherVitals
                                    ];
                                    storage.set(STORAGE_KEYS.PATIENT_VITALS, newVitals);
                                    window.dispatchEvent(new Event('storage'));
                                    logAudit('VITALS_UPDATE', vitalsForm.patientId, vitalsForm);
                                    toast.success('Vitals updated successfully');
                                    setIsVitalsOpen(false);
                                  }}>Update Vitals</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[10px] gap-1"
                              onClick={() => {
                                setSelectedPatient(patient);
                                setIsChartOpen(true);
                              }}
                            >
                              <FileText className="w-3 h-3" />
                              Patient Chart
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 flex flex-col items-center justify-center text-slate-300">
                          <BedIcon className="w-8 h-8 mb-2 opacity-20" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ready for Admission</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Patient</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Bed Details</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Urgency</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Doctor</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Admission Date</TableHead>
                      <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayBeds.filter(b => b.status === 'Occupied').map(bed => {
                      const bedPatId = bed.patient_id || bed.patientId;
                      const patient = bedPatId ? patients.find(p => String(p.id) === String(bedPatId)) : null;
                      const admission = bedPatId ? admissions.find(a => String(a.bed_id) === String(bed.id) && String(a.patient_id || a.patientId) === String(bedPatId) && a.status === 'Admitted') : null;
                      const docId = admission?.doctor_id || admission?.doctorId || patient?.attending_doctor_id || patient?.attendingDoctorId;
                      const doctor = docId ? users.find(u => 
                        String(u.id) === String(docId) || 
                        String(u.name).trim().toLowerCase() === String(docId).trim().toLowerCase()
                      ) : null;
                      return (
                        <TableRow key={bed.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                {patient?.name?.charAt(0) || 'P'}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{patient?.name || 'Registered Patient'}</p>
                                <p className="text-[10px] text-slate-500">{patient?.mrn || 'N/A'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-medical-blue">Bed {bed.bed_number}</p>
                              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{bed.ward} ({bed.bed_type})</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getUrgencyColor((admission?.urgency || bed.urgency || "Routine") as string)} text-[9px] border-none`}>
                              {admission?.urgency || bed.urgency || "Routine"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{doctor?.name || 'Assigned Soon'}</p>
                            <p className="text-[10px] text-slate-400">{doctor?.department || 'General'}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs font-medium text-slate-600">
                              {admission?.admission_date ? formatDate(admission.admission_date) : 'Recently'}
                            </p>
                            <p className="text-[9px] text-slate-400">
                              {admission?.admission_date ? formatTime(admission.admission_date) : ''}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue" onClick={() => { setSelectedPatient(patient!); setIsChartOpen(true); }}>
                                <FileText className="w-4 h-4" />
                              </Button>
                              {!isAccountant && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDischarge(bed.id)}>
                                  <LogOut className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'registration' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          {/* Left panel: Registered & Pending Patients (Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-teal-600" />
                  Pre-Admission & Search
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Find patient to admit or register a new one.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Select Existing Patient</Label>
                  <div className="relative">
                    <Input
                      placeholder="Type patient name or phone..."
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientResults(true);
                        if (e.target.value === '') {
                          setAdmissionForm({ ...admissionForm, patientId: '' });
                        }
                      }}
                      onFocus={() => setShowPatientResults(true)}
                    />
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {showPatientResults && patientSearchTerm.length > 0 && (
                    <div className="relative z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[180px] overflow-y-auto custom-scrollbar">
                      {patients.filter(p => 
                        (p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                        (p.phone || '').includes(patientSearchTerm) ||
                        (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())) &&
                        p.status !== 'Discharged' && p.status !== 'discharged' &&
                        p.status !== 'Admitted' && p.status !== 'admitted'
                      ).length > 0 ? (
                        patients.filter(p => 
                          (p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                          (p.phone || '').includes(patientSearchTerm) ||
                          (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())) &&
                          p.status !== 'Discharged' && p.status !== 'discharged' &&
                          p.status !== 'Admitted' && p.status !== 'admitted'
                        ).map(p => (
                          <div 
                            key={p.id} 
                            className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                            onClick={() => {
                              const defaultDoc = users.find(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON');
                              const defaultBed = beds.find(b => b.status?.toLowerCase() === 'available');
                              setAdmissionForm({
                                ...admissionForm,
                                patientId: p.id,
                                doctorId: admissionForm.doctorId || defaultDoc?.id || '',
                                ward: admissionForm.ward || defaultBed?.ward || '',
                                bedId: admissionForm.bedId || defaultBed?.id || '',
                                urgency: p.urgency || admissionForm.urgency || 'Routine'
                              });
                              setPatientSearchTerm(p.name);
                              setShowPatientResults(false);
                            }}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground">{p.phone} • MRN: {p.mrn}</p>
                            </div>
                            {admissionForm.patientId === p.id && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                          No patients found.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pending Requests */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-black uppercase text-amber-600 tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Pending OPD Admit Requests ({pendingAdmissions.length})
                  </h4>
                  {pendingAdmissions.length > 0 ? (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                      {pendingAdmissions.map(p => (
                        <div key={p.id} className="p-2 border border-amber-100 bg-amber-50/50 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-amber-900">{p.name}</p>
                            <p className="text-[10px] text-amber-700">MRN: {p.mrn || 'N/A'}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-7 text-[10px] font-bold border-amber-200 text-amber-700 bg-white hover:bg-amber-100"
                            onClick={() => {
                              const defaultDoc = users.find(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON');
                              const defaultBed = beds.find(b => b.status?.toLowerCase() === 'available');
                              setAdmissionForm({
                                ...admissionForm,
                                patientId: p.id,
                                doctorId: admissionForm.doctorId || defaultDoc?.id || '',
                                ward: admissionForm.ward || defaultBed?.ward || '',
                                bedId: admissionForm.bedId || defaultBed?.id || '',
                                urgency: p.urgency || admissionForm.urgency || 'Routine'
                              });
                              setPatientSearchTerm(p.name);
                              setShowPatientResults(false);
                            }}
                          >
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No pending admission requests from OPD.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-teal-600" />
                  Quick-Register New Patient
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Create a new patient file instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">Full Name</Label>
                    <Input
                      placeholder="Full Name"
                      value={quickPatient.name}
                      onChange={(e) => setQuickPatient({...quickPatient, name: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">Age</Label>
                    <Input
                      type="number"
                      placeholder="Age"
                      value={quickPatient.age}
                      onChange={(e) => setQuickPatient({...quickPatient, age: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">Gender</Label>
                    <Select
                      value={quickPatient.gender}
                      onValueChange={(v) => setQuickPatient({...quickPatient, gender: v})}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-600">Contact Phone</Label>
                    <Input
                      placeholder="e.g. 9876543210"
                      value={quickPatient.phone}
                      onChange={(e) => setQuickPatient({...quickPatient, phone: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-600">Residential Address</Label>
                  <Input
                    placeholder="Enter short address"
                    value={quickPatient.address}
                    onChange={(e) => setQuickPatient({...quickPatient, address: e.target.value})}
                    className="h-8 text-xs"
                  />
                </div>
                <Button 
                  className="w-full h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700"
                  onClick={handleQuickRegister}
                  disabled={isQuickRegistering}
                >
                  {isQuickRegistering ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Registering...
                    </>
                  ) : 'Create & Select Patient'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: Admission check-in form (Span 7) */}
          <div className="lg:col-span-7">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
              <CardHeader className="bg-teal-600 text-white p-5">
                <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-2">
                  <Building className="w-5 h-5 text-white" />
                  IPD Bed Allocation & Inpatient Check-In
                </CardTitle>
                <CardDescription className="text-teal-100 text-xs mt-1">
                  Finalize ward selection, allocate an active bed, and establish attending clinical oversight.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {admissionForm.patientId ? (
                  <div className="p-3.5 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-between animate-in fade-in duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                        {patients.find(p => p.id === admissionForm.patientId)?.name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-teal-900">
                          {patients.find(p => p.id === admissionForm.patientId)?.name}
                        </p>
                        <p className="text-[10px] text-teal-700 uppercase font-black tracking-wider">
                          MRN: {patients.find(p => p.id === admissionForm.patientId)?.mrn} • {patients.find(p => p.id === admissionForm.patientId)?.age} yrs • {patients.find(p => p.id === admissionForm.patientId)?.gender}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-teal-600 hover:bg-teal-100 rounded-full"
                      onClick={() => {
                        setAdmissionForm({...admissionForm, patientId: ''});
                        setPatientSearchTerm('');
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl text-center text-xs text-slate-400">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No patient selected yet. Choose a pending request or register a custom file.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Attending Doctor</Label>
                    <Select 
                      value={admissionForm.doctorId}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, doctorId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Specify Doctor">
                          {(() => {
                            const doc = users.find(u => u.id === admissionForm.doctorId);
                            return doc ? `${doc.name} (${doc.department || 'Staff'})` : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON').map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.name} ({doc.department})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Ward / Service Group</Label>
                    <Select 
                      value={admissionForm.ward}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, ward: v, bedId: ''})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General Ward A">General Ward A</SelectItem>
                        <SelectItem value="ICU">ICU Unit</SelectItem>
                        <SelectItem value="Maternity">Maternity Ward</SelectItem>
                        <SelectItem value="Emergency">Emergency Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Allocate Bed Number</Label>
                    <Select 
                      value={admissionForm.bedId}
                      disabled={!admissionForm.ward}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, bedId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={admissionForm.ward ? "Choose Room Bed" : "Select ward first"}>
                          {(() => {
                            const b = beds.find(x => x.id === admissionForm.bedId);
                            return b ? `Bed ${b.bed_number || b.number} (${b.bed_type || b.type})` : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const availableBeds = beds.filter(b => {
                            const isSelected = b.id === admissionForm.bedId;
                            const isAvailable = b.status?.toLowerCase() === 'available';
                            const matchesWard = !admissionForm.ward || 
                              b.ward?.toLowerCase().includes(admissionForm.ward.toLowerCase()) || 
                              admissionForm.ward.toLowerCase().includes(b.ward?.toLowerCase() || '');
                            return isSelected || (isAvailable && matchesWard);
                          });
                          return availableBeds.length > 0 ? (
                            availableBeds.map(b => (
                              <SelectItem key={b.id} value={b.id}>Bed {b.bed_number || b.number} ({b.bed_type || b.type})</SelectItem>
                            ))
                          ) : (
                            <SelectItem disabled value="none">No beds available in this ward</SelectItem>
                          );
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Admission Urgency</Label>
                    <Select 
                      value={admissionForm.urgency}
                      onValueChange={(v) => setAdmissionForm({...admissionForm, urgency: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Urgency Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine">Routine / Non-Acute</SelectItem>
                        <SelectItem value="Urgent">Urgent Careful Monitor</SelectItem>
                        <SelectItem value="Emergency">Acute Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 mt-4 flex justify-end">
                  <Button 
                    className="w-full sm:w-auto px-8 bg-teal-600 hover:bg-teal-700 text-white font-bold h-11"
                    onClick={async () => {
                      const payload = {
                        patient_id: admissionForm.patientId,
                        bed_id: admissionForm.bedId,
                        doctor_id: admissionForm.doctorId || null,
                        ward: admissionForm.ward,
                        urgency: admissionForm.urgency,
                        status: 'Admitted'
                      };

                      const validation = validateAdmissionFields(payload, beds, patients);
                      if (!validation.isValid) {
                        validation.errors.forEach(err => toast.error(err));
                        return;
                      }

                      try {
                        const syncedAdmission = await supabaseService.createAdmission(payload);

                        if (syncedAdmission) {
                          // Update bed status in Supabase
                          const updatedBed = await supabaseService.updateBedStatus(admissionForm.bedId, 'Occupied', admissionForm.patientId);
                          
                          // Update patient status in Supabase
                          await supabaseService.updatePatient(admissionForm.patientId, { 
                            needs_admission: false, 
                            status: 'Admitted',
                            attending_doctor_id: admissionForm.doctorId || null,
                            attendingDoctorId: admissionForm.doctorId || null
                          });

                          // Update local state
                          setPatients(patients.map(p => 
                            p.id === admissionForm.patientId ? { 
                              ...p, 
                              needs_admission: false, 
                              needsAdmission: false, 
                              status: 'Admitted',
                              attending_doctor_id: admissionForm.doctorId || null,
                              attendingDoctorId: admissionForm.doctorId || null
                            } : p
                          ));

                          setAdmissions([syncedAdmission, ...admissions]);

                          if (updatedBed) {
                            setBeds(beds.map(b => b.id === admissionForm.bedId ? updatedBed : b));
                          }

                          toast.success('Patient admitted and bed allocated successfully!');
                          setAdmissionForm({ patientId: '', doctorId: '', ward: '', bedId: '', urgency: 'Routine' });
                          setPatientSearchTerm('');
                        } else {
                          toast.error('Failed to record admission. The database rejected the insertion request.');
                        }
                      } catch (dbError: any) {
                        toast.error(`Database Rejection: ${dbError.message || dbError}`);
                      }
                    }}
                  >
                    Confirm Inpatient Check-In & Allocate Bed
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'surgery' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          {/* Left panel: OT Scheduling Form (Span 5) */}
          <div className="lg:col-span-5">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  Schedule Inpatient Surgery
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Plan an operative procedure for a currently checked-in patient.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Select Admitted Inpatient</Label>
                  <Select
                    value={surgeryForm.patientId}
                    onValueChange={(v) => setSurgeryForm({...surgeryForm, patientId: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Inpatient">
                        {(() => {
                          const pat = patients.find(p => p.id === surgeryForm.patientId);
                          return pat ? pat.name : undefined;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {displayBeds.filter(b => b.status === 'Occupied').map(bed => {
                        const bedPatId = bed.patient_id || bed.patientId;
                        const pat = bedPatId ? patients.find(p => String(p.id) === String(bedPatId)) : null;
                        return pat ? (
                          <SelectItem key={pat.id} value={pat.id}>
                            {pat.name} ({pat.mrn}) • Bed {bed.bed_number}
                          </SelectItem>
                        ) : null;
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Procedure / Surgery Name</Label>
                  <Input
                    placeholder="e.g. Laparoscopic Appendectomy"
                    value={surgeryForm.operationName}
                    onChange={(e) => setSurgeryForm({...surgeryForm, operationName: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Performing Surgeon</Label>
                    <Select
                      value={surgeryForm.surgeonId}
                      onValueChange={(v) => setSurgeryForm({...surgeryForm, surgeonId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose Surgeon">
                          {(() => {
                            const doc = users.find(u => u.id === surgeryForm.surgeonId);
                            return doc ? doc.name : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON').map(doc => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Operation Theatre (OT)</Label>
                    <Select
                      value={surgeryForm.theatreId}
                      onValueChange={(v) => setSurgeryForm({...surgeryForm, theatreId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign OT Room" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Major OT-1">Major OT-1 (Ground Floor)</SelectItem>
                        <SelectItem value="Major OT-2">Major OT-2 (Ground Floor)</SelectItem>
                        <SelectItem value="ICU OT">ICU Specialty OT (Floor 2)</SelectItem>
                        <SelectItem value="Emergency OT">Emergency Trauma OT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Surgery Date</Label>
                    <Input
                      type="date"
                      value={surgeryForm.date}
                      onChange={(e) => setSurgeryForm({...surgeryForm, date: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Scheduled Time</Label>
                    <Input
                      placeholder="e.g. 10:30 AM"
                      value={surgeryForm.startTime}
                      onChange={(e) => setSurgeryForm({...surgeryForm, startTime: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Pre-Operative Instructions & Clinical Notes</Label>
                  <textarea
                    placeholder="Enter pre-op orders, fasting schedules (NBM), anesthesia consultations, or medication protocols..."
                    value={surgeryForm.notes}
                    onChange={(e) => setSurgeryForm({...surgeryForm, notes: e.target.value})}
                    className="w-full min-h-[90px] p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-medical-blue transition-all"
                  />
                </div>

                <Button 
                  className="w-full bg-rose-600 hover:bg-rose-700 font-bold"
                  onClick={handleScheduleSurgery}
                >
                  Schedule Inpatient Surgery
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: Scheduled Surgeries list (Span 7) */}
          <div className="lg:col-span-7">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between font-mono">
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4 text-teal-600" />
                    Scheduled Operations & Procedures
                  </span>
                  <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 font-black text-[9px]">
                    OT TIMELINE
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Active schedules inside hospital Operation Theatres.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {displayOtSchedules.length > 0 ? (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                    {displayOtSchedules.map((sched: any) => {
                      const pat = patients.find(p => p.id === (sched.patient_id || sched.patientId));
                      const surgeon = users.find(u => u.id === (sched.surgeon_id || sched.surgeonId));
                      const room = theatres.find(t => t.id === (sched.theatreId || sched.theatre_id || sched.room_id || sched.ot_rooms_id));
                      const locationName = room ? room.name : (sched.theatre_id || sched.theatreId || 'OT Unit');
                      return (
                        <div key={sched.id} className="p-3 border border-slate-100 rounded-xl relative overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-rose-700 uppercase tracking-wider">{sched.operation_name || sched.operationName}</span>
                              <Badge className="bg-amber-100 hover:bg-amber-100/90 text-amber-800 text-[9px] uppercase border-none ml-1 font-bold">
                                {sched.status || 'Scheduled'}
                              </Badge>
                            </div>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">Patient: {pat ? pat.name : 'Unknown'} ({pat ? pat.mrn : 'N/A'})</p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Surgeon: <span className="font-semibold text-slate-700">{surgeon ? surgeon.name : 'Unassigned'}</span> • Location: <span className="font-semibold text-slate-700">{locationName}</span>
                            </p>
                            {sched.notes && (
                              <p className="text-[10px] italic text-slate-500 bg-white/75 p-1.5 rounded border border-slate-100 mt-2 line-clamp-1">
                                Notes: {sched.notes}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-left sm:text-right shrink-0 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 gap-1.5">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{formatDate(sched.date)}</p>
                              <p className="text-[10px] font-medium text-slate-500">{sched.start_time || sched.startTime || '10:00 AM'}</p>
                            </div>
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] text-slate-600 border-slate-200"
                                onClick={() => {
                                  toast.info(`OT protocol completed for ${sched.operation_name || sched.operationName}`);
                                  setOTSchedules(otSchedules.map(o => o.id === sched.id ? { ...o, status: 'Completed' } : o));
                                }}
                              >
                                Trigger Done
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-300">
                    <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-20 animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No Scheduled Surgeries Found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'discharge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          {/* Left panel: Discharge Summary Form (Span 5) */}
          <div className="lg:col-span-5">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Request Check-out & Discharge Summary
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Review vitals, write instructions, select discharge disposition, and discharge.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-indigo-600" />
                      Search & Fetch Any Patient
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Type Patient Name, MRN, or Phone..."
                        value={dischargeSearchTerm}
                        onChange={(e) => {
                          setDischargeSearchTerm(e.target.value);
                          setShowDischargeSearchDropdown(true);
                          if (!e.target.value) {
                            setDischargeForm({ ...dischargeForm, patientId: '' });
                          }
                        }}
                        onFocus={() => setShowDischargeSearchDropdown(true)}
                        className="h-9 bg-white text-xs"
                      />
                      {dischargeSearchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setDischargeSearchTerm('');
                            setShowDischargeSearchDropdown(false);
                            setDischargeForm({ ...dischargeForm, patientId: '' });
                          }}
                          className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-600"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {showDischargeSearchDropdown && dischargeSearchTerm.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[190px] overflow-y-auto divide-y divide-slate-100">
                        {displayPatients.filter(p =>
                          (p.name.toLowerCase().includes(dischargeSearchTerm.toLowerCase()) ||
                          (p.phone || '').includes(dischargeSearchTerm) ||
                          (p.mrn || '').toLowerCase().includes(dischargeSearchTerm.toLowerCase())) &&
                          p.status !== 'Discharged' && p.status !== 'discharged'
                        ).length > 0 ? (
                          displayPatients.filter(p =>
                            (p.name.toLowerCase().includes(dischargeSearchTerm.toLowerCase()) ||
                            (p.phone || '').includes(dischargeSearchTerm) ||
                            (p.mrn || '').toLowerCase().includes(dischargeSearchTerm.toLowerCase())) &&
                            p.status !== 'Discharged' && p.status !== 'discharged'
                          ).map(p => {
                            const bed = beds.find(b => b.patient_id === p.id || b.patientId === p.id);
                            const isAdmitted = p.status === 'Admitted' || !!bed;
                            return (
                              <div
                                key={p.id}
                                className="px-3 py-2 hover:bg-indigo-50/50 cursor-pointer flex justify-between items-center transition-colors text-left"
                                onClick={() => {
                                  const autoDoc = getAttendingDoctorName(p.id);
                                  setDischargeForm({ 
                                    ...dischargeForm, 
                                    patientId: p.id, 
                                    dischargeBy: autoDoc || currentUser?.name || 'Dr. Rajesh Sharma' 
                                  });
                                  setDischargeSearchTerm(p.name);
                                  setShowDischargeSearchDropdown(false);
                                  if (p.status !== 'Admitted') {
                                    toast.info(`Note: ${p.name} is registered as outpatient. Preparing clinical discharge sheet.`);
                                  }
                                }}
                              >
                                <div>
                                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    {p.name}
                                    <span className={`text-[9px] px-1 py-0.5 rounded font-black uppercase tracking-wider ${
                                      isAdmitted 
                                        ? "bg-teal-50 text-teal-700 border border-teal-100" 
                                        : "bg-amber-50 text-amber-700 border border-amber-100"
                                    }`}>
                                      {isAdmitted ? "Inpatient" : "Outpatient"}
                                    </span>
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-medium">
                                    MRN: <span className="font-mono">{p.mrn || 'N/A'}</span> • Contact: {p.phone || 'N/A'}
                                  </p>
                                  {bed && (
                                    <p className="text-[9px] text-indigo-600 font-bold mt-0.5">
                                      Allocated: Bed {bed.bed_number || bed.number} ({bed.ward})
                                    </p>
                                  )}
                                </div>
                                <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100">
                                  Fetch File
                                </Button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No matching patient file found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest my-1">- OR SELECT QUICK BED OCCUPIED -</div>

                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-bold text-slate-600 uppercase">Active Bed Occupants</Label>
                    <Select
                      value={dischargeForm.patientId}
                      onValueChange={(v) => {
                        const autoDoc = getAttendingDoctorName(v);
                        setDischargeForm({
                          ...dischargeForm,
                          patientId: v,
                          dischargeBy: autoDoc || currentUser?.name || 'Dr. Rajesh Sharma'
                        });
                        const pat = patients.find(p => p.id === v) || MOCK_PATIENTS.find(p => p.id === v);
                        if (pat) setDischargeSearchTerm(pat.name);
                      }}
                    >
                      <SelectTrigger className="h-9 bg-white text-xs">
                        <SelectValue placeholder="Quick Select Assigned Patient">
                          {(() => {
                            const pat = patients.find(p => p.id === dischargeForm.patientId);
                            return pat ? pat.name : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {displayBeds.filter(b => b.status === 'Occupied').map(bed => {
                          const patId = bed.patient_id || bed.patientId;
                          const pat = patId ? patients.find(p => String(p.id) === String(patId)) : null;
                          const bedNum = bed.bed_number || bed.number || bed.id;
                          return pat ? (
                            <SelectItem key={pat.id} value={pat.id}>
                              {pat.name} ({pat.mrn}) • Bed {bedNum}
                            </SelectItem>
                          ) : null;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {dischargeForm.patientId && (() => {
                  const pat = patients.find(p => p.id === dischargeForm.patientId);
                  if (!pat) return null;
                  const bed = beds.find(b => b.patient_id === pat.id || b.patientId === pat.id);
                  const dues = checkPatientDues(pat.id);

                  return (
                    <div className="p-3.5 bg-emerald-50/40 border border-emerald-100/50 rounded-xl space-y-2.5 animate-in fade-in duration-200 text-left">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-slate-800">{pat.name}</h4>
                          <p className="text-[10px] text-slate-500 font-bold">MRN: {pat.mrn} • Age: {pat.age} • Gender: {pat.gender}</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase bg-emerald-100 text-emerald-800">
                          Active Selection
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-emerald-100/40 pt-2 bg-white/50 p-2 rounded-lg">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Room Allocation:</span>
                          <span className="font-bold text-slate-700">
                            {bed ? `Bed ${bed.bed_number || bed.number} (${bed.ward})` : "No Bed Allocated"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Dues Summary:</span>
                          <span className={`font-bold ${dues > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {dues > 0 ? `₹${dues.toLocaleString()} Outstanding` : "₹0 (Cleared)"}
                          </span>
                        </div>
                      </div>

                      {dues > 0 && (
                        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                          <input
                            type="checkbox"
                            id="bypassDuesInput"
                            checked={bypassDues}
                            onChange={(e) => setBypassDues(e.target.checked)}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                          />
                          <label htmlFor="bypassDuesInput" className="text-[10px] font-bold text-rose-900 cursor-pointer select-none leading-tight">
                            Bypass dues restriction & force discharge execution
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {dischargeForm.patientId && (() => {
                  const patId = dischargeForm.patientId;
                  const checklist = patientChecklists[patId] || {
                    doctorCleared: false,
                    nurseCleared: false,
                    accountsCleared: false,
                    frontOfficeHandedOver: false
                  };
                  const patDues = checkPatientDues(patId);

                  // Active progress status text
                  let progressMessage = "Stage 1: Awaiting Doctor's clinical initiation.";
                  let progressBg = "bg-amber-50 text-amber-805 border-amber-200";
                  if (checklist.doctorCleared && !checklist.nurseCleared) {
                    progressMessage = "Stage 2: Doctor initiated. Awaiting Nurse file audit.";
                    progressBg = "bg-blue-50 text-blue-805 border-blue-200";
                  } else if (checklist.doctorCleared && checklist.nurseCleared && !checklist.accountsCleared) {
                    progressMessage = "Stage 3: Nurse papers verified. Awaiting Accounts clearance.";
                    progressBg = "bg-purple-50 text-purple-805 border-purple-200";
                  } else if (checklist.doctorCleared && checklist.nurseCleared && checklist.accountsCleared && !checklist.frontOfficeHandedOver) {
                    progressMessage = "Stage 4: Accounts cleared. Awaiting final Front Office signed handover.";
                    progressBg = "bg-indigo-50 text-indigo-805 border-indigo-200";
                  } else if (checklist.doctorCleared && checklist.nurseCleared && checklist.accountsCleared && checklist.frontOfficeHandedOver) {
                    progressMessage = "All stages completed! Discharge note handed over safely.";
                    progressBg = "bg-emerald-50 text-emerald-805 border-emerald-200";
                  }

                  return (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3.5 text-left animate-in fade-in duration-200">
                      <div>
                        <span className="p-1 px-2 rounded bg-indigo-900 text-white font-mono text-[8px] font-black uppercase tracking-widest my-0.5">
                          DISCHARGE PROTOCOL
                        </span>
                        <h4 className="text-xs font-black text-slate-800 mt-1 uppercase tracking-wide">
                          Administrative Discharge Clearance Workflow
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Strict multi-role verification sequence required prior to physical gate checkout.
                        </p>
                      </div>

                      <div className={`p-2 px-3 rounded-lg border text-[10px] font-bold ${progressBg}`}>
                        ● Current Status: {progressMessage}
                      </div>

                      {/* Checklist Iteration */}
                      <div className="space-y-3 pt-1">
                        {/* Step 1: Doctor Initiation */}
                        <div className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <input
                            type="checkbox"
                            id="chk-doc"
                            checked={checklist.doctorCleared}
                            onChange={(e) => {
                              const isAuthorized = isCurrentUserAdmin || currentUser?.role === 'DOCTOR' || currentUser?.role === 'SURGEON';
                              if (!isAuthorized) {
                                toast.error("Unauthorized: Only a Medical Doctor, Surgeon, or Master Admin can clinically initiate discharges.");
                                return;
                              }
                              saveChecklist(patId, { doctorCleared: e.target.checked, doctorName: currentUser?.name || 'Attending Doctor' });
                            }}
                            className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <label htmlFor="chk-doc" className="font-extrabold text-slate-800 cursor-pointer select-none">
                                Stage 1: Clinical Discharge Initiation
                              </label>
                              <span className="text-[8px] bg-amber-50 rounded border border-amber-200 px-1.5 py-0.5 text-amber-800 font-black tracking-wider uppercase">
                                DOCTOR
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                              Doctor (or active MD) authorizes clinical file, enters home medications, and signs off.
                            </p>
                            {checklist.doctorCleared && (
                              <p className="text-[9px] text-emerald-600 font-black flex items-center gap-1 mt-1 font-mono">
                                ✓ Authenticated: {checklist.doctorName || 'Attending MD'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Step 2: Nursing Paper Audit */}
                        <div className={`flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm ${(!isCurrentUserAdmin && !checklist.doctorCleared) ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input
                            type="checkbox"
                            id="chk-nurse"
                            checked={checklist.nurseCleared}
                            onChange={(e) => {
                              const isAuthorized = isCurrentUserAdmin || currentUser?.role === 'NURSE';
                              if (!isAuthorized) {
                                toast.error("Unauthorized: Only Nursing staff or Master Admin can audit clinical worksheets.");
                                return;
                              }
                              if (!checklist.doctorCleared && !isCurrentUserAdmin) {
                                toast.error("Process Lock: Stage 1 must be cleared by a Doctor first.");
                                return;
                              }
                              saveChecklist(patId, { nurseCleared: e.target.checked, nurseName: currentUser?.name || 'Ward Nurse' });
                            }}
                            className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            disabled={!isCurrentUserAdmin && !checklist.doctorCleared}
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <label htmlFor="chk-nurse" className="font-extrabold text-slate-800 cursor-pointer select-none">
                                Stage 2: Nursing Station Verification
                              </label>
                              <span className="text-[8px] bg-blue-50 rounded border border-blue-200 px-1.5 py-0.5 text-blue-800 font-black tracking-wider uppercase">
                                NURSE
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                              Nurse station audits physical medical files, reports, vitals history, and attaches diagnostic print sheets.
                            </p>
                            {checklist.nurseCleared && (
                              <p className="text-[9px] text-emerald-600 font-black flex items-center gap-1 mt-1 font-mono">
                                ✓ Verified: {checklist.nurseName || 'Ward Nurse'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Step 3: Accounts section zero dues check */}
                        <div className={`flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm ${(!isCurrentUserAdmin && !checklist.nurseCleared) ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input
                            type="checkbox"
                            id="chk-accounts"
                            checked={checklist.accountsCleared}
                            onChange={(e) => {
                              const isAuthorized = isCurrentUserAdmin || currentUser?.role === 'ACCOUNTANT' || currentUser?.role === 'ACCOUNTS';
                              if (!isAuthorized) {
                                toast.error("Unauthorized: Only an Accountant, Finance Auditor, or Master Admin can clear hospital billing dues.");
                                return;
                              }
                              if (!checklist.nurseCleared && !isCurrentUserAdmin) {
                                toast.error("Process Lock: Stage 2 must be completed by Nursing first.");
                                return;
                              }
                              saveChecklist(patId, { accountsCleared: e.target.checked, accountsName: currentUser?.name || 'Accounts Auditor' });
                            }}
                            className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            disabled={!isCurrentUserAdmin && !checklist.nurseCleared}
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <label htmlFor="chk-accounts" className="font-extrabold text-slate-800 cursor-pointer select-none">
                                Stage 3: Accounts section dues audit
                              </label>
                              <span className="text-[8px] bg-purple-50 rounded border border-purple-200 px-1.5 py-0.5 text-purple-800 font-black tracking-wider uppercase">
                                ACCOUNTS
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                              Accounts officer audits final bills, medicines billing, and resolves outstanding dues.
                            </p>
                            {patDues > 0 ? (
                              <p className="text-[9px] text-rose-500 font-black flex items-center gap-1 mt-1 font-mono">
                                ⚠️ Outstanding: ₹{patDues.toLocaleString()} found. Clear dues or click bypass.
                              </p>
                            ) : (
                              <p className="text-[9px] text-emerald-600 font-black flex items-center gap-1 mt-1 font-mono">
                                ✓ Zero Dues Autodetected. Clear to pass.
                              </p>
                            )}
                            {checklist.accountsCleared && (
                              <p className="text-[9px] text-emerald-600 font-black flex items-center gap-1 mt-1 font-mono">
                                ✓ Auditor Cleared: {checklist.accountsName || 'Finance Auditor'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Step 4: Front Office Handover */}
                        <div className={`flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm ${(!isCurrentUserAdmin && !checklist.accountsCleared) ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input
                            type="checkbox"
                            id="chk-fo"
                            checked={checklist.frontOfficeHandedOver}
                            onChange={(e) => {
                              const isAuthorized = isCurrentUserAdmin || ['RECEPTION', 'RECEPTIONIST', 'FRONT_DESK'].includes(currentUser?.role || '');
                              if (!isAuthorized) {
                                toast.error("Unauthorized: Only Front Office receptionists or Master Admin can authorize physical gate checkout & release.");
                                return;
                              }
                              if (!checklist.accountsCleared && !isCurrentUserAdmin) {
                                toast.error("Process Lock: Stage 3 must be cleared by Accounts audit first.");
                                return;
                              }
                              saveChecklist(patId, { frontOfficeHandedOver: e.target.checked, frontOfficeName: currentUser?.name || 'FO Receptionist' });
                            }}
                            className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            disabled={!isCurrentUserAdmin && !checklist.accountsCleared}
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <label htmlFor="chk-fo" className="font-extrabold text-slate-800 cursor-pointer select-none">
                                Stage 4: Final Front Office Handover
                              </label>
                              <span className="text-[8px] bg-indigo-50 rounded border border-indigo-200 px-1.5 py-0.5 text-indigo-800 font-black tracking-wider uppercase">
                                FRONT OFFICE
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                              Front Office verifies preceding cleared stages, hands printed Signed Discharge summary slip & gate pass.
                            </p>
                            {checklist.frontOfficeHandedOver && (
                              <p className="text-[9px] text-emerald-600 font-black flex items-center gap-1 mt-1 font-mono">
                                ✓ Handed Over by: {checklist.frontOfficeName || 'FO Officer'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Official Administrative Bulletin Note */}
                      <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[10px] text-slate-600 space-y-1">
                        <p className="font-extrabold text-indigo-950 uppercase tracking-widest text-[9px] flex items-center gap-1 font-mono">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Official Policy Protocol Reminder
                        </p>
                        <p className="leading-relaxed font-sans text-slate-600">
                          As per executive hospital clinical guidelines: <br/>
                          1. <strong>Doctor</strong> MUST initiate and declare discharge treatment summary. <br/>
                          2. <strong>Nurse</strong> station reviews files, clinical reports, and counts papers. <br/>
                          3. <strong>Accounts section</strong> audits transactions to confirm there are absolute zero dues. <br/>
                          4. <strong>Front Office desk</strong> acts as final station to check clearances and hand over signed notes.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Discharge Date</Label>
                    <Input
                      type="date"
                      value={dischargeForm.dischargeDate}
                      onChange={(e) => setDischargeForm({...dischargeForm, dischargeDate: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Discharge Disposition</Label>
                    <Select
                      value={dischargeForm.dischargeType}
                      onValueChange={(v) => setDischargeForm({...dischargeForm, dischargeType: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine / Improved">Routine / Improved</SelectItem>
                        <SelectItem value="LAMA (Left Against Medical Advice)">LAMA (Against Advice)</SelectItem>
                        <SelectItem value="Referral to Higher Specialty">Referred to Specialty</SelectItem>
                        <SelectItem value="Absconded">Absconded / Missing</SelectItem>
                        <SelectItem value="Deceased">Deceased</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Follow-Up Clinic Date</Label>
                    <Input
                      type="date"
                      value={dischargeForm.followUpDate}
                      onChange={(e) => setDischargeForm({...dischargeForm, followUpDate: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <Label className="text-xs font-bold text-slate-700">Discharging Doctor</Label>
                    <Input
                      type="text"
                      placeholder="Doctor name"
                      value={dischargeForm.dischargeBy}
                      onChange={(e) => setDischargeForm({...dischargeForm, dischargeBy: e.target.value})}
                    />
                  </div>
                </div>

                {dischargeForm.patientId && (
                  <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                        Clinical Auto-Import Assistant
                      </span>
                      {loadingDischargeAux && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Instantly pull live prescriptions, recent vitals, and physician/nursing observations directly into the fields below to prevent clinical data loss.
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {/* Prescriptions Import Button */}
                      <div className="p-2 border border-indigo-100 bg-white rounded-lg flex flex-col justify-between">
                        <div>
                          <span className="font-extrabold text-slate-700 block">Medication Record</span>
                          <span className="text-slate-500 block text-[9px] mt-0.5">
                            {dischargeAuxDetails.prescriptions?.length > 0 
                              ? `${dischargeAuxDetails.prescriptions.length} Active prescription(s) found.` 
                              : "No recent prescriptions found."}
                          </span>
                        </div>
                        {dischargeAuxDetails.prescriptions?.length > 0 && (
                          <Button 
                            size="sm" 
                            className="mt-2 h-6 text-[9.5px] font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-0"
                            onClick={() => {
                              const latestRx = dischargeAuxDetails.prescriptions[0];
                              const medsText = formatPrescriptionToText(latestRx);
                              setDischargeForm(prev => ({ ...prev, medications: medsText }));
                              toast.success("Imported active prescriptions into Take-Home Medications!");
                            }}
                          >
                            Import Prescriptions
                          </Button>
                        )}
                      </div>

                      {/* Clinical Obs & Vitals Summary Auto-Draft Button */}
                      <div className="p-2 border border-indigo-100 bg-white rounded-lg flex flex-col justify-between">
                        <div>
                          <span className="font-extrabold text-slate-700 block">Clinical Summary Draft</span>
                          <span className="text-slate-500 block text-[9px] mt-0.5">
                            {dischargeAuxDetails.vitals?.length > 0 || dischargeAuxDetails.notes?.length > 0
                              ? "Vitals & notes detected to compile." 
                              : "No active vitals/notes recorded yet."}
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          className="mt-2 h-6 text-[9.5px] font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-0"
                          onClick={() => {
                            const pat = patients.find(p => p.id === dischargeForm.patientId);
                            const activeAdmission = admissions.find(
                              a => (a.patient_id === dischargeForm.patientId || a.patientId === dischargeForm.patientId) && a.status === 'Admitted'
                            );
                            const reason = activeAdmission?.reason || activeAdmission?.diagnosis || '';
                            const vitalsText = formatVitalsToText(dischargeAuxDetails.vitals);
                            const notesText = formatNotesToText(dischargeAuxDetails.notes);
                            const draft = generateAutoSummary(pat, reason, vitalsText, notesText);
                            setDischargeForm(prev => ({ ...prev, clinicalSummary: draft }));
                            toast.success("Draft compiled from live vitals, clinical progress notes, and patient files!");
                          }}
                        >
                          Auto-draft Clinical Summary
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Discharge Prescribed Medications</Label>
                  <textarea
                    placeholder="e.g. 1. Tab. Augmentin 625mg (1-0-1) - 5 days&#10;2. Tab. Pan 40mg (1-0-0) on empty stomach - 5 days"
                    value={dischargeForm.medications}
                    onChange={(e) => setDischargeForm({...dischargeForm, medications: e.target.value})}
                    className="w-full min-h-[90px] p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-medical-blue transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Treatment Summary & Clinical Remarks</Label>
                  <textarea
                    placeholder="Enter short clinical summary, instructions to follow, or any critical symptoms requesting immediate emergency consultation..."
                    value={dischargeForm.clinicalSummary}
                    onChange={(e) => setDischargeForm({...dischargeForm, clinicalSummary: e.target.value})}
                    className="w-full min-h-[110px] p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-medical-blue transition-all"
                  />
                </div>

                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold"
                  onClick={handleDischargeWithSummary}
                >
                  Save Inpatient Discharge & Generate Summary
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: Historic Discharge Summaries list / Master Report (Span 7) */}
          <div className="lg:col-span-12 xl:col-span-7">
            <Card className="border-none shadow-sm bg-white overflow-hidden h-full flex flex-col">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Discharge Registry & Master Report
                    </CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">
                      {dischargeRightPaneView === 'timeline' 
                        ? "Visual timeline feed of recently discharged clinical summaries." 
                        : "Master Discharged Patient Register audit sheet with diagnostic & billing details."}
                    </CardDescription>
                  </div>
                  
                  <div className="inline-flex bg-slate-200/60 p-1 rounded-lg border border-slate-200/25 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setDischargeRightPaneView('timeline')}
                      className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-wider transition-all rounded-md ${
                        dischargeRightPaneView === 'timeline'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Audit Feed
                    </button>
                    <button
                      type="button"
                      onClick={() => setDischargeRightPaneView('report')}
                      className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-wider transition-all rounded-md ${
                        dischargeRightPaneView === 'report'
                          ? 'bg-white text-slate-800 shadow-sm animate-pulse'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Full Clinical Report
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1">
                {dischargeRightPaneView === 'timeline' ? (
                  dischargeSummaries.length > 0 ? (
                    <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                      {dischargeSummaries.map((summary: any) => {
                        const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
                        const isLama = summary.dischargeType?.includes('LAMA');
                        const isDeath = summary.dischargeType?.includes('Deceased');
                        return (
                          <div key={summary.id || summary.admissionId} className="p-3 border border-slate-100 rounded-xl relative overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div className={`absolute top-0 left-0 w-1 h-full ${isLama || isDeath ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{pat ? pat.name : 'Unknown Patient'}</span>
                                <Badge className={`${isLama || isDeath ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'} text-[9px] uppercase border-none font-bold`}>
                                  {summary.dischargeType || 'Routine / Improved'}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                MRN: <span className="font-semibold text-slate-700">{pat ? pat.mrn : 'N/A'}</span> • Discharged By: <span className="font-semibold text-slate-700">{summary.dischargeBy || 'Duty Doctor'}</span>
                              </p>
                              {summary.clinicalSummary && (
                                <p className="text-[10px] italic text-slate-500 bg-white/75 p-1.5 rounded border border-slate-100 mt-2 line-clamp-1">
                                  Summary: {summary.clinicalSummary}
                                </p>
                              )}
                            </div>
                            
                            <div className="text-left sm:text-right shrink-0 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 gap-1.5 font-mono">
                              <div>
                                <p className="text-xs font-bold text-slate-800">{formatDate(summary.dischargeDate)}</p>
                                <p className="text-[10px] font-medium text-slate-500">Follow-up: {summary.followUpDate ? formatDate(summary.followUpDate) : 'None'}</p>
                              </div>
                              <Button
                                size="sm"
                                className="h-7 text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1"
                                onClick={() => {
                                  setDischargedSummaryToShow(summary);
                                  setIsSummaryDetailsOpen(true);
                                }}
                              >
                                <Printer className="w-3 h-3" />
                                View Summary
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-300">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No Discharge Records Found</p>
                    </div>
                  )
                ) : (
                  /* EXQUISITE DISCHARGE REPORT MODE WITH FULL DETAILS */
                  <div className="space-y-4 text-left">
                    {/* STAT CARDS FOR BRIEF METRIC AUDIT */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-sm">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Audited</span>
                        <span className="text-base font-black text-slate-800 font-mono">
                          {dischargeSummaries.length}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-sm">
                        <span className="text-[9px] font-bold text-teal-500 uppercase tracking-widest block">Routine / Impv</span>
                        <span className="text-base font-black text-teal-600 font-mono">
                          {dischargeSummaries.filter(s => (s.dischargeType || '').includes('Routine') || (s.dischargeType || '').includes('Improved')).length}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-sm">
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block">Non-Routine / LAMA</span>
                        <span className="text-base font-black text-rose-600 font-mono">
                          {dischargeSummaries.filter(s => !(s.dischargeType || '').includes('Routine') && !(s.dischargeType || '').includes('Improved')).length}
                        </span>
                      </div>
                    </div>

                    {/* REPORT INTERACTIVE FILTERING CONTROLS */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Search report by name, MRN, phone..."
                          value={reportSearchQuery}
                          onChange={(e) => setReportSearchQuery(e.target.value)}
                          className="h-8.5 text-xs pl-8.5 bg-slate-50/30 font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <Select
                          value={reportTypeFilter}
                          onValueChange={(v) => setReportTypeFilter(v)}
                        >
                          <SelectTrigger className="h-8.5 text-xs font-semibold bg-white w-full sm:w-[170px]">
                            <SelectValue placeholder="Disposition Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All Dispositions</SelectItem>
                            <SelectItem value="Routine / Improved">Routine / Improved</SelectItem>
                            <SelectItem value="LAMA (Left Against Medical Advice)">LAMA (Against Advice)</SelectItem>
                            <SelectItem value="Referral to Higher Specialty">Referred Specialty</SelectItem>
                            <SelectItem value="Absconded">Absconded</SelectItem>
                            <SelectItem value="Deceased">Deceased</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* CLEAR OR EXPORT ACTIONS */}
                        {(reportSearchQuery || reportTypeFilter !== 'All') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReportSearchQuery('');
                              setReportTypeFilter('All');
                            }}
                            className="h-8.5 text-[10px] text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-2"
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* DISCHARGED PATIENTS DETAIL LIST TABLE / SHEET */}
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        <Table className="text-left">
                          <TableHeader className="bg-slate-50 font-semibold sticky top-0 z-10 shadow-sm">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-[10px] uppercase font-black text-slate-500 py-3 font-mono">Patient Details</TableHead>
                              <TableHead className="text-[10px] uppercase font-black text-slate-500 py-3 font-mono">Stay Period</TableHead>
                              <TableHead className="text-[10px] uppercase font-black text-slate-500 py-3 font-mono">Clinical summary</TableHead>
                              <TableHead className="text-[10px] uppercase font-black text-slate-500 py-3 font-mono text-right">Dues / Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dischargeSummaries.filter(summary => {
                              const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
                              if (!pat) return false;
                              const matchSearch = pat.name.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                                                  (pat.mrn || '').toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                                                  (pat.phone || '').includes(reportSearchQuery);
                              const matchFilter = reportTypeFilter === 'All' || summary.dischargeType === reportTypeFilter;
                              return matchSearch && matchFilter;
                            }).length > 0 ? (
                              dischargeSummaries.filter(summary => {
                                const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId));
                                if (!pat) return false;
                                const matchSearch = pat.name.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                                                    (pat.mrn || '').toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                                                    (pat.phone || '').includes(reportSearchQuery);
                                const matchFilter = reportTypeFilter === 'All' || summary.dischargeType === reportTypeFilter;
                                return matchSearch && matchFilter;
                              }).map((summary: any) => {
                                const pat = patients.find(p => p.id === (summary.patient_id || summary.patientId)) || MOCK_PATIENTS.find(p => p.id === (summary.patient_id || summary.patientId)) || { name: 'Unknown', mrn: 'N/A', age: 'N/A', gender: 'N/A', phone: 'N/A' };
                                const admissionRecord = admissions.find(a => a.patient_id === pat.id || a.patientId === pat.id);
                                const isLama = (summary.dischargeType || '').includes('LAMA');
                                const isDeath = (summary.dischargeType || '').includes('Deceased');
                                
                                // Calculate Stay length
                                let stayLengthStr = 'N/A';
                                if (admissionRecord) {
                                  const discT = new Date(summary.dischargeDate).getTime();
                                  const admT = new Date(admissionRecord.admission_date || admissionRecord.created_at).getTime();
                                  const diffDays = Math.max(1, Math.ceil((discT - admT) / (1000 * 60 * 60 * 24)));
                                  stayLengthStr = `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
                                }
                                
                                const duesAtDischarge = checkPatientDues(pat.id);
                                const isExpanded = selectedReportSummaryId === summary.id;

                                return (
                                  <>
                                    <TableRow 
                                      key={summary.id} 
                                      className="hover:bg-slate-50/50 cursor-pointer text-xs"
                                      onClick={() => setSelectedReportSummaryId(isExpanded ? null : summary.id)}
                                    >
                                      <TableCell className="align-top py-3">
                                        <div className="font-black text-slate-800 uppercase flex items-center gap-1.5">
                                          {pat.name}
                                          <span className="text-[9px] text-slate-400 font-medium font-mono">({pat.gender?.charAt(0)})</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium font-mono mt-0.5">
                                          MRN: {pat.mrn} • Age: {pat.age}
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                                          Contact: {pat.phone}
                                        </div>
                                      </TableCell>
                                      
                                      <TableCell className="align-top py-3 font-mono">
                                        <div className="text-slate-700 font-bold">
                                          {admissionRecord ? formatDate(admissionRecord.admission_date || admissionRecord.created_at) : 'N/A'}
                                        </div>
                                        <div className="text-slate-400 text-[10px] mt-0.5 arrow-after">
                                          to {formatDate(summary.dischargeDate)}
                                        </div>
                                        <div className="inline-flex items-center gap-1 mt-1 text-[9px] font-black uppercase text-indigo-600 bg-indigo-50/60 px-1 py-0.5 rounded leading-none">
                                          Stay: {stayLengthStr}
                                        </div>
                                      </TableCell>
                                      
                                      <TableCell className="align-top py-3 max-w-[200px]">
                                        <span className={`inline-block text-[9px] uppercase font-black tracking-wide px-1.5 py-0.5 rounded-full mb-1 border ${
                                          isLama || isDeath 
                                            ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        }`}>
                                          {summary.dischargeType || 'Routine / Improved'}
                                        </span>
                                        <p className="text-[10px] font-bold text-slate-600 line-clamp-1">
                                          Course: {summary.clinicalSummary || 'No summary notes entered.'}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                                          Doctor: {summary.dischargeBy || 'Duty Doctor'}
                                        </p>
                                      </TableCell>
                                      
                                      <TableCell className="align-top py-3 text-right">
                                        <div className="font-mono font-bold text-[11px]">
                                          {duesAtDischarge > 0 ? (
                                            <span className="text-rose-600">₹{duesAtDischarge.toLocaleString()} Dues</span>
                                          ) : (
                                            <span className="text-emerald-600">₹0 Completed</span>
                                          )}
                                        </div>
                                        <Badge variant="outline" className={`mt-1 text-[9px] font-extrabold uppercase border-none ${
                                          duesAtDischarge > 0 ? "bg-rose-100/60 text-rose-800" : "bg-emerald-100/60 text-emerald-800"
                                        }`}>
                                          {duesAtDischarge > 0 ? "Forced Out" : "Cleared Account"}
                                        </Badge>
                                        <div className="mt-2.5">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDischargedSummaryToShow(summary);
                                              setIsSummaryDetailsOpen(true);
                                            }}
                                            className="h-6 w-16 text-[9px] font-black bg-slate-100 hover:bg-teal-600 hover:text-white transition-colors"
                                          >
                                            PRINT FILE
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>

                                    {/* EXPANDED COMPLETE DETAILS ACCORDION ROW */}
                                    {isExpanded && (
                                      <TableRow className="bg-slate-50/75 border-none p-0 overflow-hidden hover:bg-slate-50/75">
                                        <TableCell colSpan={4} className="p-4 border-t border-b border-slate-100">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-200">
                                            {/* Left Info: Diagnostic summary */}
                                            <div className="space-y-2">
                                              <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Admission diagnosis / reason</span>
                                                <p className="text-[11px] font-extrabold text-slate-700 bg-white border border-slate-200/50 p-2 rounded-lg">
                                                  {admissionRecord?.reason || admissionRecord?.diagnosis || 'No pre-check reasons recorded.'}
                                                </p>
                                              </div>
                                              <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Clinical treatment course summary</span>
                                                <p className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200/50 p-2.5 rounded-lg leading-relaxed whitespace-pre-wrap">
                                                  {summary.clinicalSummary || "No treatment outline recorded."}
                                                </p>
                                              </div>
                                            </div>

                                            {/* Right Info: Prescriptions & Follow up */}
                                            <div className="space-y-2">
                                              <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Prescribed take-home medications</span>
                                                <div className="text-[11px] font-mono text-indigo-900 bg-indigo-50/30 border border-indigo-100/50 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed">
                                                  {summary.medications ? summary.medications : "No discharge medications prescribed."}
                                                </div>
                                              </div>
                                              
                                              <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
                                                <div className="bg-white border border-slate-200/50 p-2 rounded-lg text-center">
                                                  <span className="text-[8px] font-black text-slate-400 uppercase block">Discharge Date</span>
                                                  <span className="text-[11px] font-bold text-slate-800 block mt-0.5 leading-tight animate-fade-in">
                                                    {summary.dischargeDate ? formatDate(summary.dischargeDate) : "N/A"}
                                                  </span>
                                                </div>
                                                <div className="bg-white border border-slate-200/50 p-2 rounded-lg text-center">
                                                  <span className="text-[8px] font-black text-slate-400 uppercase block">Follow-Up Clinic</span>
                                                  <span className="text-[11px] font-bold text-slate-800 block mt-0.5">
                                                    {summary.followUpDate ? formatDate(summary.followUpDate) : "No Recall Needed"}
                                                  </span>
                                                </div>
                                                <div className="bg-white border border-slate-200/50 p-2 rounded-lg text-center">
                                                  <span className="text-[8px] font-black text-slate-400 uppercase block">Discharged By</span>
                                                  <span className="text-[11px] font-bold text-slate-800 block mt-0.5 leading-tight">
                                                    {summary.dischargeBy || "Primary Unit"}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="py-12 text-center text-slate-300">
                                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No discharge matches found in report.</p>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    <div className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-wider bg-slate-50 p-2 rounded-lg border border-slate-200/40 font-mono">
                      🖨️ Audit Note: Clicking on any patient row expands the complete clinical treatment outline above.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {/* Patient Chart Dialog */}
      <Dialog open={isChartOpen} onOpenChange={setIsChartOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">Patient Clinical Chart</DialogTitle>
                <DialogDescription>
                  {selectedPatient?.name} ({selectedPatient?.mrn}) • Bed {beds.find(b => b.patient_id === selectedPatient?.id || b.patientId === selectedPatient?.id)?.bed_number}
                </DialogDescription>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100">
                IPD Admission
              </Badge>
            </div>
          </DialogHeader>
          
          <Tabs defaultValue="doctor" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-5 bg-slate-100/50 p-1">
                <TabsTrigger value="doctor" className="text-xs gap-2">
                  <Stethoscope className="w-3.5 h-3.5" />
                  Doctor
                </TabsTrigger>
                <TabsTrigger value="nurse" className="text-xs gap-2">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Nurse
                </TabsTrigger>
                <TabsTrigger value="prescription" className="text-xs gap-2">
                  <Pill className="w-3.5 h-3.5" />
                  Prescription
                </TabsTrigger>
                <TabsTrigger value="tests" className="text-xs gap-2">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Tests
                </TabsTrigger>
                <TabsTrigger value="billing" className="text-xs gap-2">
                  <Receipt className="w-3.5 h-3.5" />
                  Charges
                </TabsTrigger>
              </TabsList>
            </div>

          <div className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar">
            <TabsContent value="doctor" className="mt-0 space-y-4">
                <div className="space-y-4">
                  {selectedPatient?.attending_doctor_id && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="h-12 w-12 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                        <Stethoscope className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Attending Clinician</p>
                        <p className="text-base font-bold text-blue-900 truncate">
                          {users.find(u => u.id === selectedPatient.attending_doctor_id)?.name}
                        </p>
                        <p className="text-xs text-blue-700 font-medium truncate">
                          {users.find(u => u.id === selectedPatient.attending_doctor_id)?.department} 
                          {users.find(u => u.id === selectedPatient.attending_doctor_id)?.specialization ? ` • ${users.find(u => u.id === selectedPatient.attending_doctor_id)?.specialization}` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Render database clinical notes */}
                  {clinicalNotes.filter(n => n.note_type === 'DOCTOR').map(note => {
                    const authorName = note.profiles?.name || note.authorName || 'Attending Doctor';
                    const dateFormatted = new Date(note.created_at || note.date || Date.now()).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return (
                      <div key={note.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-medical-blue"></div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs font-bold text-medical-blue uppercase">{authorName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{dateFormatted}</p>
                          </div>
                          {!isDeleteForbidden && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      </div>
                    );
                  })}
                  
                  {/* Fallback only if list is empty */}
                  {clinicalNotes.filter(n => n.note_type === 'DOCTOR').length === 0 && (
                    <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-500">No doctor notes registered yet</p>
                      <p className="text-xs text-slate-400">Doctor should enter a clinical note below to save. New notes will be visible immediately.</p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Add Doctor's Note</Label>
                    <textarea 
                      className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/20 transition-all"
                      placeholder="Enter clinical observations, diagnosis updates, or instructions..."
                      value={newDoctorNote}
                      onChange={(e) => setNewDoctorNote(e.target.value)}
                    />
                    {!isAccountant && (
                      <div className="flex justify-end mt-2">
                        <Button size="sm" className="bg-medical-blue" onClick={() => handleSaveClinicalNote('DOCTOR')}>
                          Save Doctor Note
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

               <TabsContent value="nurse" className="mt-0 space-y-4">
                 <div className="space-y-4">
                  {/* Render database clinical nursing notes */}
                  {clinicalNotes.filter(n => n.note_type === 'NURSE').map(note => {
                    const authorName = note.profiles?.name || note.authorName || 'Staff Nurse';
                    const dateFormatted = new Date(note.created_at || note.date || Date.now()).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return (
                      <div key={note.id} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase">{authorName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{dateFormatted}</p>
                          </div>
                          {!isDeleteForbidden && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      </div>
                    );
                  })}
                  
                  {/* Fallback only if list is empty */}
                  {clinicalNotes.filter(n => n.note_type === 'NURSE').length === 0 && (
                    <div className="p-6 text-center border border-dashed border-emerald-100 rounded-xl bg-emerald-50/20">
                      <FileText className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-emerald-600">No nursing notes registered yet</p>
                      <p className="text-xs text-emerald-500/80">Nurse should enter a clinical note below to save. New notes will be visible immediately.</p>
                    </div>
                  )}

                   <div className="pt-4 border-t">
                     <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Add Nurse's Note</Label>
                     <textarea 
                       className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/20 transition-all"
                       placeholder="Enter nursing observations, care provided, or patient complaints..."
                       value={newNurseNote}
                       onChange={(e) => setNewNurseNote(e.target.value)}
                     />
                     {!isAccountant && (
                       <div className="flex justify-end mt-2">
                         <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSaveClinicalNote('NURSE')}>
                           Save Nurse Note
                         </Button>
                       </div>
                     )}
                   </div>
                 </div>
               </TabsContent>

              <TabsContent value="prescription" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-3 max-h-[255px] overflow-y-auto custom-scrollbar">
                    {patientPrescriptions.map((rx: any) => {
                      const docName = rx.doctor_name || rx.doctorName || rx.profiles?.name || 'Attending Physician';
                      const rxDate = new Date(rx.prescription_date || rx.date || rx.created_at || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });
                      
                      let medicinesList: any[] = [];
                      if (Array.isArray(rx.medicines)) {
                        medicinesList = rx.medicines;
                      } else if (typeof rx.medicines === 'string') {
                        try { medicinesList = JSON.parse(rx.medicines); } catch(ex) {}
                      } else if (Array.isArray(rx.medications)) {
                        medicinesList = rx.medications;
                      }
                      
                      return (
                        <Card key={rx.id} className="border-slate-100 shadow-none bg-slate-50/50">
                          <CardHeader className="p-3 bg-slate-100/50 flex flex-row items-center justify-between space-y-0">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prescription Card</p>
                              <p className="text-xs font-black text-slate-700">{docName}</p>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-100">{rxDate}</p>
                          </CardHeader>
                          <CardContent className="p-3 space-y-2">
                            {medicinesList.length > 0 ? (
                              medicinesList.map((med: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white border border-slate-100">
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">{med.name || med.medicineName}</p>
                                    <p className="text-[9px] text-slate-500">{med.dosage || med.frequency || 'Dosage not specified'}</p>
                                  </div>
                                  <Badge className="bg-blue-50 text-blue-600 border-none text-[9px]">{med.duration || 'As directed'}</Badge>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500 italic">No medicines listed in this prescription.</p>
                            )}
                            
                            {(rx.advice || rx.notes) && (
                              <div className="mt-2 pt-2 border-t border-slate-100">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Advice & Instructions</p>
                                  <p className="text-xs text-slate-600 italic leading-snug">{rx.advice || rx.notes}</p>
                                </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}

                    {patientPrescriptions.length === 0 && (
                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Pill className="w-8 h-8 text-slate-350 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium text-slate-500">No prescriptions registered yet</p>
                        <p className="text-xs text-slate-400/80">Doctor must write a prescription in the builder form below.</p>
                      </div>
                    )}
                  </div>

                  {!isAccountant && (
                    <div className="pt-4 border-t space-y-3">
                      <Label className="text-xs font-black uppercase text-slate-500 block">Write New Prescription</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500">Medicine Name</Label>
                          <Input 
                            placeholder="e.g. Tab. Augmentin 625mg" 
                            value={newPrescription.medicineName}
                            onChange={(e) => setNewPrescription({...newPrescription, medicineName: e.target.value})}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500">Dosage / Frequency</Label>
                          <Input 
                            placeholder="e.g. Twice a day (1-0-1)" 
                            value={newPrescription.dosage}
                            onChange={(e) => setNewPrescription({...newPrescription, dosage: e.target.value})}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500">Duration</Label>
                          <Input 
                            placeholder="e.g. 5 Days" 
                            value={newPrescription.duration}
                            onChange={(e) => setNewPrescription({...newPrescription, duration: e.target.value})}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500">Advice / Instructions</Label>
                           <Input 
                             placeholder="e.g. Steam inhalation twice daily" 
                             value={newPrescription.instructions}
                             onChange={(e) => setNewPrescription({...newPrescription, instructions: e.target.value})}
                             className="h-8 text-xs"
                           />
                        </div>
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button size="sm" className="bg-medical-blue h-8 text-xs font-bold px-4" onClick={handleSavePrescription}>
                          Save Prescription
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="tests" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold uppercase text-slate-500 mb-3 block">Recommended Tests</Label>
                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {patientTests.map((t: any) => {
                        const requestDate = new Date(t.requested_at || t.requestedAt || Date.now()).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        });
                        const isCompleted = t.status?.toUpperCase() === 'COMPLETED' || t.status?.toUpperCase() === 'READY';
                        return (
                          <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl border ${isCompleted ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{t.test_name || t.testName || 'Laboratory Investigation'}</p>
                                <p className="text-[10px] text-slate-500">Requested on {requestDate}</p>
                              </div>
                            </div>
                            <Badge className={`${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600'} border-none text-[9px]`}>
                              {t.status || 'Pending'}
                            </Badge>
                          </div>
                        );
                      })}

                      {patientTests.length === 0 && (
                        <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <FlaskConical className="w-8 h-8 text-slate-350 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium text-slate-500">No recommended tests yet</p>
                          <p className="text-xs text-slate-400">Doctor can recommend a laboratory test below.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isAccountant && (
                    <div className="pt-4 border-t">
                      <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block animate-in fade-in">Recommend New Test</Label>
                      <div className="flex gap-2">
                        <Select value={recommendedTestName} onValueChange={setRecommendedTestName}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select test type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Complete Blood Count (CBC)">CBC (Blood Test)</SelectItem>
                            <SelectItem value="Liver Function Test (LFT)">Liver Function Test</SelectItem>
                            <SelectItem value="Kidney Function Test (KFT)">Kidney Function Test</SelectItem>
                            <SelectItem value="Chest X-Ray (PA View)">X-Ray Chest</SelectItem>
                            <SelectItem value="MRI Brain Scan">MRI Brain</SelectItem>
                            <SelectItem value="CT Scan Abdomen">CT Scan Abdomen</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button className="bg-medical-blue h-10 px-4 text-xs font-bold" onClick={handleRecommendTest}>
                          Recommend
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="billing" className="mt-0 space-y-4">
                <Card className="border-slate-100 shadow-none">
                  <CardHeader className="p-4 bg-slate-50">
                    <CardTitle className="text-sm">Estimated Bed Charges</CardTitle>
                    <CardDescription className="text-xs">Based on current ward occupancy</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <div>
                        <p className="text-sm font-medium">Bed Type</p>
                        <p className="text-xs text-muted-foreground">{beds.find(b => b.patient_id === selectedPatient?.id || b.patientId === selectedPatient?.id)?.bed_type} Bed</p>
                      </div>
                      <p className="text-sm font-bold">
                        {formatCurrency(MOCK_BED_RATES.find(r => r.type === beds.find(b => b.patient_id === selectedPatient?.id || b.patientId === selectedPatient?.id)?.bed_type)?.rate || 0)} / Day
                      </p>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <div>
                        <p className="text-sm font-medium">Occupancy</p>
                        <p className="text-xs text-muted-foreground">
                          Admitted on {(() => {
                            const activeAdm = admissions.find(a => a.patient_id === selectedPatient?.id || a.patientId === selectedPatient?.id);
                            const admDate = activeAdm?.admission_date || activeAdm?.admissionDate || activeAdm?.created_at || selectedPatient?.created_at;
                            return formatDate(admDate);
                          })()}
                        </p>
                      </div>
                      <p className="text-sm font-bold">3 Days</p>
                    </div>
                    <div className="flex justify-between items-center py-4 bg-medical-blue/5 px-3 rounded-lg">
                      <p className="font-bold text-medical-blue">Total Bed Charges</p>
                      <p className="text-lg font-bold text-medical-blue">{formatCurrency(calculateBedCharges(selectedPatient?.id))}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                      * Final charges will be calculated at the time of discharge based on actual hours.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="p-4 border-t bg-slate-50 flex justify-end">
            <DialogTrigger asChild>
              <Button variant="outline">Close Chart</Button>
            </DialogTrigger>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bed Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Transfer Patient</DialogTitle>
            <DialogDescription>
              Transfer {MOCK_PATIENTS.find(p => p.id === transferData.patientId)?.name} to another bed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Bed</Label>
              <Input disabled value={`Bed ${beds.find(b => b.id === transferData.fromBedId)?.bed_number} (${beds.find(b => b.id === transferData.fromBedId)?.ward})`} />
            </div>
            <div className="space-y-2">
              <Label>Target Bed</Label>
              <Select value={transferData.toBedId} onValueChange={(v) => setTransferData({...transferData, toBedId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target bed">
                    {(() => {
                      const b = beds.find(x => x.id === transferData.toBedId);
                      return b ? `Bed ${b.bed_number} - ${b.ward} (${b.bed_type})` : undefined;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {beds.filter(b => b.status === 'Available' || b.id === transferData.toBedId).map(b => (
                    <SelectItem key={b.id} value={b.id}>Bed {b.bed_number} - {b.ward} ({b.bed_type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogTrigger>
            <Button className="bg-medical-blue" onClick={handleTransfer}>Confirm Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Patient Confirmation Dialog */}
      <Dialog open={!!mergePatientData} onOpenChange={(open) => { if (!open) setMergePatientData(null); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Duplicate Patient Found
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed">
              A patient named <strong className="text-slate-900">{mergePatientData?.existing?.name}</strong> with phone number <strong className="text-slate-900">{mergePatientData?.existing?.phone}</strong> is already registered (MRN: {mergePatientData?.existing?.mrn}).
            </p>
            <p className="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-100">
              Would you like to merge the new registration details into the existing patient record? Any empty or outdated fields in the existing record will be updated.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMergePatientData(null)}>
              Cancel
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={confirmIPDMergeAndContinue}>
              Yes, Merge Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Patient Agreement Dialog */}
      <Dialog open={!!duplicateConfirm} onOpenChange={(open) => { if (!open) setDuplicateConfirm(null); }}>
        <DialogContent id="ipd-duplicate-confirm-dialog" className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Duplicate Entry Warning
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed">
              A potential duplicate entry has been detected under inpatient registration.
            </p>
            <p className="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-100">
              An existing patient named <strong className="text-slate-900">{duplicateConfirm?.duplicatePatient?.name}</strong> 
              {duplicateConfirm?.duplicatePatient?.phone && <> with phone number <strong className="text-slate-900">{duplicateConfirm?.duplicatePatient?.phone}</strong></>} 
              is already registered (MRN: {duplicateConfirm?.duplicatePatient?.mrn}).
            </p>
            <p className="text-sm text-slate-600 font-medium">
              Do you explicitly agree and wish to proceed with registering this patient anyway?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button id="ipd-duplicate-cancel-btn" variant="outline" onClick={() => setDuplicateConfirm(null)}>
              No, Cancel
            </Button>
            <Button id="ipd-duplicate-confirm-btn" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
              setDuplicateConfirm(null);
              handleQuickRegister(true);
            }}>
              Yes, I Agree & Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discharge Summary Detail Modal */}
      <Dialog open={isSummaryDetailsOpen} onOpenChange={setIsSummaryDetailsOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <FileText className="w-5 h-5 text-teal-600" />
              Patient Discharge Summary
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review and print the medical discharge register sheet.
            </DialogDescription>
          </DialogHeader>

          {dischargedSummaryToShow && (() => {
            const pat = patients.find(p => p.id === (dischargedSummaryToShow.patient_id || dischargedSummaryToShow.patientId)) || MOCK_PATIENTS.find(p => p.id === (dischargedSummaryToShow.patient_id || dischargedSummaryToShow.patientId));
            return (
              <>
                <div className="flex-1 p-6 space-y-5 overflow-y-auto custom-scrollbar">
                  {/* Demographics Area */}
                  <div className="p-4 bg-slate-50 border rounded-xl grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Patient Name</p>
                      <p className="font-bold text-slate-800">{pat?.name || 'Walk-in'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">MRN / ID</p>
                      <p className="font-mono font-medium text-slate-800">{pat?.mrn || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Age & Gender</p>
                      <p className="font-medium text-slate-800">
                        {pat?.age ? `${pat.age} Years` : 'N/A'} / {pat?.gender || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Support Contact</p>
                      <p className="font-medium text-slate-800">{pat?.phone || 'N/A'}</p>
                    </div>
                    <div className="pt-2 border-t col-span-2 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Admission Date</p>
                        <p className="font-medium text-slate-800">
                          {(() => {
                            const admVal = dischargedSummaryToShow.admissionDate || dischargedSummaryToShow.admission_date || (admissions.find(a => a.patient_id === pat?.id || a.patientId === pat?.id)?.admission_date) || (admissions.find(a => a.patient_id === pat?.id || a.patientId === pat?.id)?.admissionDate) || dischargedSummaryToShow.created_at;
                            return admVal ? new Date(admVal).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Discharge Date</p>
                        <p className="font-medium text-slate-800">
                          {new Date(dischargedSummaryToShow.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Follow-Up Clinic</p>
                        <p className="font-bold text-emerald-600 border border-emerald-100 bg-emerald-50 px-2 py-0.5 rounded inline-block text-[10px]">
                          {dischargedSummaryToShow.followUpDate ? new Date(dischargedSummaryToShow.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'SOS / As advised'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Discharge Type Alert */}
                  <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-100 rounded-xl text-teal-800 text-xs">
                    <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
                    <div>
                      <p className="font-bold">Discharged Successfully</p>
                      <p className="text-[11px] opacity-90">Disposition Mode: <span className="font-bold capitalize">{dischargedSummaryToShow.dischargeType || 'Routine / Improved'}</span></p>
                    </div>
                  </div>

                  {/* Discharge Clearance Status Section */}
                  {(() => {
                    const chk = patientChecklists[pat?.id || ''] || { doctorCleared: false, nurseCleared: false, accountsCleared: false, frontOfficeHandedOver: false };
                    return (
                      <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Hospital Administrative Clearance Stamps</p>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className={`p-2 rounded-lg border flex items-center justify-between ${chk.doctorCleared ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-rose-50/50 border-rose-100 text-rose-800'}`}>
                            <div>
                              <p className="font-extrabold text-[10px]">Clinician Sign-off</p>
                              {chk.doctorCleared && <p className="text-[9px] font-semibold opacity-80 leading-none mt-0.5">By: {chk.doctorName || 'Attending Doctor'}</p>}
                            </div>
                            <span className="font-black text-[9px] bg-white px-1 py-0.5 rounded shadow-xs">{chk.doctorCleared ? '✓ SIGNED' : '✗ PENDING'}</span>
                          </div>

                          <div className={`p-2 rounded-lg border flex items-center justify-between ${chk.accountsCleared ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-rose-50/50 border-rose-100 text-rose-800'}`}>
                            <div>
                              <p className="font-extrabold text-[10px]">Accounts & Billing</p>
                              {chk.accountsCleared && <p className="text-[9px] font-semibold opacity-80 leading-none mt-0.5">By: {chk.accountsName || 'Finance Auditor'}</p>}
                            </div>
                            <span className="font-black text-[9px] bg-white px-1 py-0.5 rounded shadow-xs">{chk.accountsCleared ? '✓ ZEROED/CLEAR' : '✗ DUES PENDING'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Clinical Remarks */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Stethoscope className="w-4 h-4 text-slate-400" />
                      Treatment Remarks & Summary
                    </p>
                    <div className="p-3 bg-white border rounded-xl text-xs text-slate-600 leading-relaxed whitespace-pre-wrap min-h-[60px]">
                      {dischargedSummaryToShow.clinicalSummary || 'Discharged in stable clinical state.'}
                    </div>
                  </div>

                  {/* Medications */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Pill className="w-4 h-4 text-slate-400" />
                      Prescribed Take-Home Medications
                    </p>
                    <div className="p-3 bg-white border rounded-xl text-xs font-mono text-slate-700 whitespace-pre-wrap bg-slate-50/25">
                      {dischargedSummaryToShow.medications || 'No home medications prescribed.'}
                    </div>
                  </div>
                </div>

                <DialogFooter className="p-4 border-t bg-slate-50 flex flex-col sm:flex-row gap-2 justify-end">
                  <Button
                    variant="outline"
                    className="h-9 text-xs"
                    onClick={() => setIsSummaryDetailsOpen(false)}
                  >
                    Close Preview
                  </Button>
                  <Button
                    className="h-9 text-xs bg-teal-600 hover:bg-teal-700 text-white gap-2"
                    onClick={() => printDischargeSummary(dischargedSummaryToShow)}
                  >
                    <Printer className="w-4 h-4" />
                    Print Discharge Sheet
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
