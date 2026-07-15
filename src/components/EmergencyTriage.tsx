import { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Plus, 
  Activity, 
  Clock, 
  Users, 
  Heart, 
  Printer, 
  Trash2, 
  Check, 
  X, 
  Eye, 
  ArrowRight, 
  Thermometer, 
  AlertOctagon, 
  CheckCircle, 
  ClipboardList,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Building,
  Calendar,
  AlertTriangle,
  Flame,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';
import { storage } from '@/lib/storage';
import { formatDate } from '@/lib/utils';

const STORAGE_KEYS_EMERGENCY = 'hms_emergency_cases';
const STORAGE_KEYS_ER_BEDS = 'hms_er_beds';

export interface EmergencyCase {
  id: string;
  patientId?: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  mrn: string;
  triageLevel: 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Blue';
  triageColor: string;
  presentingComplaints: string;
  mechanismOfInjury?: string;
  arrivalMode: string; // 'Ambulance' | 'Self' | 'Police' | 'Relative'
  arrivalTime: string;
  arrivalDate: string;
  bedId?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedNurseId?: string;
  assignedNurseName?: string;
  status: 'Triaged' | 'Under Observation' | 'IPD Transferred' | 'OT Scheduled' | 'Discharged' | 'Referred Out' | 'Expired';
  isReferral?: boolean;
  referredBy?: string;
  vitals?: {
    bpSystolic?: string;
    bpDiastolic?: string;
    pulseRate?: string;
    spo2?: string;
    respiratoryRate?: string;
    temperature?: string;
    gcsEye?: string; // 1-4
    gcsVerbal?: string; // 1-5
    gcsMotor?: string; // 1-6
    gcsTotal?: number; // 3-15
    painScale?: string; // 1-10
  };
  assessments?: Array<{
    timestamp: string;
    notedBy: string;
    abcdeAssessment: string; // Airway, Breathing, Circulation, Disability, Exposure
    clinicalNotes: string;
  }>;
  interventions?: Array<{
    id: string;
    timestamp: string;
    type: string; // 'IV Access' | 'Intubation' | 'Oxygen' | 'Defibrillation' | 'Medication' | 'Suturing' | 'Other'
    description: string;
    performedBy: string;
  }>;
  dispositionReason?: string;
  dispositionDestination?: string; // IPD ward or refer hospital
  dispositionTime?: string;
}

export default function EmergencyTriage() {
  const [activeTab, setActiveTab] = useState<'live-queue' | 'er-beds' | 'all-cases'>('live-queue');
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTriage, setFilterTriage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Dialog states
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [isInterventionOpen, setIsInterventionOpen] = useState(false);
  const [isDispositionOpen, setIsDispositionOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);

  // Selection states
  const [selectedCase, setSelectedCase] = useState<EmergencyCase | null>(null);

  // Patient link autocomplete states
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);

  // Form states
  const [newCase, setNewCase] = useState({
    patientId: '',
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    triageLevel: 'Yellow' as 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Blue',
    presentingComplaints: '',
    mechanismOfInjury: '',
    arrivalMode: 'Ambulance',
    bedId: '',
    assignedDoctorId: '',
    assignedNurseId: '',
    isReferral: false,
    referredBy: ''
  });

  const [vitalsForm, setVitalsForm] = useState({
    bpSystolic: '',
    bpDiastolic: '',
    pulseRate: '',
    spo2: '',
    respiratoryRate: '',
    temperature: '',
    gcsEye: '4',
    gcsVerbal: '5',
    gcsMotor: '6',
    painScale: '0'
  });

  const [assessmentForm, setAssessmentForm] = useState({
    abcdeAssessment: '',
    clinicalNotes: ''
  });

  const [interventionForm, setInterventionForm] = useState({
    type: 'IV Access',
    description: '',
    performedBy: ''
  });

  const [dispositionForm, setDispositionForm] = useState({
    status: 'IPD Transferred' as 'IPD Transferred' | 'OT Scheduled' | 'Discharged' | 'Referred Out' | 'Expired',
    destination: '',
    reason: '',
    notes: ''
  });

  // Load and seed fallback static beds if missing
  const erBeds = useMemo(() => {
    const beds = storage.get(STORAGE_KEYS_ER_BEDS, []);
    if (beds.length === 0) {
      const defaultBeds = [
        { id: 'ER-BED-01', name: 'ER Bed 01 (Resus Bay 1)', type: 'Resuscitation', isOccupied: false },
        { id: 'ER-BED-02', name: 'ER Bed 02 (Resus Bay 2)', type: 'Resuscitation', isOccupied: false },
        { id: 'ER-BED-03', name: 'ER Bed 03 (Trauma)', type: 'Trauma Care', isOccupied: false },
        { id: 'ER-BED-04', name: 'ER Bed 04 (Acute)', type: 'Acute Care', isOccupied: false },
        { id: 'ER-BED-05', name: 'ER Bed 05 (Acute)', type: 'Acute Care', isOccupied: false },
        { id: 'ER-BED-06', name: 'ER Bed 06 (Observation)', type: 'Observation', isOccupied: false },
        { id: 'ER-BED-07', name: 'ER Bed 07 (Observation)', type: 'Observation', isOccupied: false },
        { id: 'ER-BED-08', name: 'ER Bed 08 (Triage Holding)', type: 'Holding', isOccupied: false },
      ];
      storage.set(STORAGE_KEYS_ER_BEDS, defaultBeds);
      return defaultBeds;
    }
    return beds;
  }, [cases]);

  // Sync / Fetch initial records
  const fetchData = async () => {
    setLoading(true);
    try {
      const [patientsData, staffData] = await Promise.all([
        supabaseService.getPatients(),
        supabaseService.getStaff ? supabaseService.getStaff() : Promise.resolve([])
      ]);

      if (patientsData) setPatientsList(patientsData);
      if (staffData) setStaffList(staffData);

      const dbCases = await supabaseService.getEmergencyCases();
      const localCases = dbCases && dbCases.length > 0 ? dbCases : storage.get(STORAGE_KEYS_EMERGENCY, []);
      if (localCases.length === 0) {
        // Seed standard initial Emergency/Triage records for elegant visual presentation
        const p1 = patientsData?.[0];
        const p2 = patientsData?.[1];

        const seedCases: EmergencyCase[] = [
          {
            id: 'er-case-1',
            patientId: p1?.id || 'p-seed-1',
            name: p1?.name || 'Ramesh Chandra',
            age: p1?.age || 54,
            gender: p1?.gender || 'Male',
            phone: p1?.phone || '9876543210',
            mrn: p1?.mrn || 'MRN-77382',
            triageLevel: 'Red',
            triageColor: 'bg-rose-500 hover:bg-rose-600',
            presentingComplaints: 'Crushing central chest pain radiating to left arm, heavy perspiration, shortness of breath.',
            arrivalMode: 'Ambulance',
            arrivalTime: '11:45 PM',
            arrivalDate: new Date().toISOString().split('T')[0],
            bedId: 'ER-BED-01',
            status: 'Under Observation',
            assignedDoctorId: staffData?.[0]?.id || 'dr-1',
            assignedDoctorName: staffData?.[0]?.name || 'Dr. Rajesh Sharma',
            vitals: {
              bpSystolic: '150',
              bpDiastolic: '95',
              pulseRate: '112',
              spo2: '91',
              respiratoryRate: '24',
              temperature: '98.6',
              gcsEye: '4',
              gcsVerbal: '4',
              gcsMotor: '6',
              gcsTotal: 14,
              painScale: '9'
            },
            assessments: [
              {
                timestamp: '2026-07-09T23:50:00.000Z',
                notedBy: 'Dr. Rajesh Sharma',
                abcdeAssessment: 'Airway clear. Breathing tachypneic. Circulation: strong tachycardic peripheral pulses, peripheral cold sweat. GCS 14/15.',
                clinicalNotes: 'ST-Elevation MI suspected. Administered Aspirin 325mg and Clopidogrel 300mg stat. Arranging urgent ECG and cardiology consult.'
              }
            ],
            interventions: [
              {
                id: 'int-1',
                timestamp: '11:48 PM',
                type: 'Oxygen',
                description: 'Supplemental oxygen via nasal cannula 4L/min',
                performedBy: 'Nurse Anjali Gupta'
              },
              {
                id: 'int-2',
                timestamp: '11:50 PM',
                type: 'IV Access',
                description: 'Left forearm 18G cannula secured, saline lock initiated',
                performedBy: 'Nurse Anjali Gupta'
              }
            ]
          },
          {
            id: 'er-case-2',
            patientId: p2?.id || 'p-seed-2',
            name: p2?.name || 'Vandana Shukla',
            age: p2?.age || 32,
            gender: p2?.gender || 'Female',
            phone: p2?.phone || '9911223344',
            mrn: p2?.mrn || 'MRN-11029',
            triageLevel: 'Orange',
            triageColor: 'bg-orange-500 hover:bg-orange-600',
            presentingComplaints: 'Acute severe right lower quadrant abdominal pain, vomiting x3, high fever.',
            arrivalMode: 'Self',
            arrivalTime: '12:10 AM',
            arrivalDate: new Date().toISOString().split('T')[0],
            bedId: 'ER-BED-03',
            status: 'Triaged',
            assignedDoctorName: 'Dr. Sarah Sharma',
            vitals: {
              bpSystolic: '110',
              bpDiastolic: '70',
              pulseRate: '98',
              spo2: '99',
              respiratoryRate: '18',
              temperature: '101.4',
              gcsEye: '4',
              gcsVerbal: '5',
              gcsMotor: '6',
              gcsTotal: 15,
              painScale: '8'
            }
          }
        ];
        storage.set(STORAGE_KEYS_EMERGENCY, seedCases);
        setCases(seedCases);

        // Update bed occupancy based on seeded cases
        const freshBeds = storage.get(STORAGE_KEYS_ER_BEDS, []);
        const updatedBeds = freshBeds.map((bed: any) => {
          if (bed.id === 'ER-BED-01') return { ...bed, isOccupied: true, occupantId: 'er-case-1', occupantName: 'Ramesh Chandra', triage: 'Red' };
          if (bed.id === 'ER-BED-03') return { ...bed, isOccupied: true, occupantId: 'er-case-2', occupantName: 'Vandana Shukla', triage: 'Orange' };
          return bed;
        });
        storage.set(STORAGE_KEYS_ER_BEDS, updatedBeds);
      } else {
        setCases(localCases);
      }
    } catch (err: any) {
      toast.error('Failed to load emergency database: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync state helpers
  const saveCasesToLocalStorage = async (updatedCases: EmergencyCase[], actionInfo?: { type: 'create' | 'update' | 'delete'; id?: string; data?: any }) => {
    storage.set(STORAGE_KEYS_EMERGENCY, updatedCases);
    setCases(updatedCases);

    // Sync ER Bed occupancy state
    const currentBeds = storage.get(STORAGE_KEYS_ER_BEDS, []);
    const updatedBeds = currentBeds.map((bed: any) => {
      // Find case currently on this bed that is NOT disposed
      const activeCaseOnBed = updatedCases.find(
        c => c.bedId === bed.id && !['IPD Transferred', 'OT Scheduled', 'Discharged', 'Referred Out', 'Expired'].includes(c.status)
      );

      if (activeCaseOnBed) {
        return {
          ...bed,
          isOccupied: true,
          occupantId: activeCaseOnBed.id,
          occupantName: activeCaseOnBed.name,
          triage: activeCaseOnBed.triageLevel
        };
      } else {
        return {
          ...bed,
          isOccupied: false,
          occupantId: null,
          occupantName: null,
          triage: null
        };
      }
    });
    storage.set(STORAGE_KEYS_ER_BEDS, updatedBeds);

    // Dynamic Supabase synchronization in the background!
    if (actionInfo) {
      try {
        if (actionInfo.type === 'create') {
          await supabaseService.createEmergencyCase(actionInfo.data);
        } else if (actionInfo.type === 'update' && actionInfo.id) {
          await supabaseService.updateEmergencyCase(actionInfo.id, actionInfo.data);
        } else if (actionInfo.type === 'delete' && actionInfo.id) {
          await supabaseService.deleteEmergencyCase(actionInfo.id);
        }
      } catch (err: any) {
        console.warn('Background Supabase Sync failed:', err.message);
      }
    }
  };

  // Vitals Score Calculator
  const gcsTotalScore = useMemo(() => {
    const eye = parseInt(vitalsForm.gcsEye) || 4;
    const verbal = parseInt(vitalsForm.gcsVerbal) || 5;
    const motor = parseInt(vitalsForm.gcsMotor) || 6;
    return eye + verbal + motor;
  }, [vitalsForm.gcsEye, vitalsForm.gcsVerbal, vitalsForm.gcsMotor]);

  // Color mapper for Triage levels
  const getTriageColor = (level: 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Blue') => {
    switch (level) {
      case 'Red': return 'bg-rose-500 hover:bg-rose-600';
      case 'Orange': return 'bg-orange-500 hover:bg-orange-600';
      case 'Yellow': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'Green': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'Blue': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-slate-500 hover:bg-slate-600';
    }
  };

  // Submit New Emergency Case
  const handleRegisterEmergencySubmit = () => {
    if (!newCase.name) {
      toast.error('Please specify patient name or link an existing record');
      return;
    }

    if (newCase.isReferral && !newCase.referredBy.trim()) {
      toast.error('Please specify the referring doctor or hospital');
      return;
    }

    const mrn = newCase.patientId 
      ? (patientsList.find(p => p.id === newCase.patientId)?.mrn || `MRN-${Math.floor(10000 + Math.random() * 90000)}`)
      : `MRN-ER-${Math.floor(10000 + Math.random() * 90000)}`;

    const docObj = staffList.find(s => s.id === newCase.assignedDoctorId);
    const nurseObj = staffList.find(s => s.id === newCase.assignedNurseId);

    const createdCase: EmergencyCase = {
      id: `er-case-${Date.now()}`,
      patientId: newCase.patientId || undefined,
      name: newCase.name,
      age: parseInt(newCase.age) || 0,
      gender: newCase.gender,
      phone: newCase.phone,
      mrn,
      triageLevel: newCase.triageLevel,
      triageColor: getTriageColor(newCase.triageLevel),
      presentingComplaints: newCase.presentingComplaints,
      mechanismOfInjury: newCase.mechanismOfInjury || undefined,
      arrivalMode: newCase.arrivalMode,
      arrivalTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      arrivalDate: new Date().toISOString().split('T')[0],
      bedId: newCase.bedId || undefined,
      assignedDoctorId: newCase.assignedDoctorId || undefined,
      assignedDoctorName: docObj ? (docObj.name || docObj.fullName) : undefined,
      assignedNurseId: newCase.assignedNurseId || undefined,
      assignedNurseName: nurseObj ? (nurseObj.name || nurseObj.fullName) : undefined,
      status: 'Triaged',
      isReferral: newCase.isReferral,
      referredBy: newCase.isReferral ? newCase.referredBy : undefined
    };

    const updatedCases = [createdCase, ...cases];
    saveCasesToLocalStorage(updatedCases, { type: 'create', data: createdCase });

    toast.success(`Emergency triage case initiated for ${newCase.name} (${newCase.triageLevel} Priority)`);
    setIsNewCaseOpen(false);

    // Reset Form
    setNewCase({
      patientId: '',
      name: '',
      age: '',
      gender: 'Male',
      phone: '',
      triageLevel: 'Yellow',
      presentingComplaints: '',
      mechanismOfInjury: '',
      arrivalMode: 'Ambulance',
      bedId: '',
      assignedDoctorId: '',
      assignedNurseId: '',
      isReferral: false,
      referredBy: ''
    });
    setPatientSearchTerm('');
  };

  // Submit Vitals Recording
  const handleRecordVitalsSubmit = () => {
    if (!selectedCase) return;

    const updatedCases = cases.map(c => {
      if (c.id === selectedCase.id) {
        return {
          ...c,
          status: c.status === 'Triaged' ? 'Under Observation' : c.status,
          vitals: {
            bpSystolic: vitalsForm.bpSystolic,
            bpDiastolic: vitalsForm.bpDiastolic,
            pulseRate: vitalsForm.pulseRate,
            spo2: vitalsForm.spo2,
            respiratoryRate: vitalsForm.respiratoryRate,
            temperature: vitalsForm.temperature,
            gcsEye: vitalsForm.gcsEye,
            gcsVerbal: vitalsForm.gcsVerbal,
            gcsMotor: vitalsForm.gcsMotor,
            gcsTotal: gcsTotalScore,
            painScale: vitalsForm.painScale
          }
        };
      }
      return c;
    });

    saveCasesToLocalStorage(updatedCases, { type: 'update', id: selectedCase.id, data: updatedCases.find(c => c.id === selectedCase.id) });
    toast.success(`Physiological vitals recorded for ${selectedCase.name}`);
    setIsVitalsOpen(false);
  };

  // Submit ABCDE Clinical Assessment Notes
  const handleClinicalAssessmentSubmit = () => {
    if (!selectedCase) return;

    const currentAssessments = selectedCase.assessments || [];
    const newAssessment = {
      timestamp: new Date().toISOString(),
      notedBy: staffList.find(s => s.role === 'DOCTOR')?.name || 'Emergency Consultant',
      abcdeAssessment: assessmentForm.abcdeAssessment,
      clinicalNotes: assessmentForm.clinicalNotes
    };

    const updatedCases = cases.map(c => {
      if (c.id === selectedCase.id) {
        return {
          ...c,
          assessments: [newAssessment, ...currentAssessments]
        };
      }
      return c;
    });

    saveCasesToLocalStorage(updatedCases, { type: 'update', id: selectedCase.id, data: updatedCases.find(c => c.id === selectedCase.id) });
    toast.success('ABCDE Primary Assessment logged successfully');
    setIsAssessmentOpen(false);
    setAssessmentForm({ abcdeAssessment: '', clinicalNotes: '' });
  };

  // Submit Emergency Intervention Log
  const handleInterventionSubmit = () => {
    if (!selectedCase) return;

    const currentInterventions = selectedCase.interventions || [];
    const newIntervention = {
      id: `int-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: interventionForm.type,
      description: interventionForm.description,
      performedBy: interventionForm.performedBy || 'Nurse On Duty'
    };

    const updatedCases = cases.map(c => {
      if (c.id === selectedCase.id) {
        return {
          ...c,
          interventions: [newIntervention, ...currentInterventions]
        };
      }
      return c;
    });

    saveCasesToLocalStorage(updatedCases, { type: 'update', id: selectedCase.id, data: updatedCases.find(c => c.id === selectedCase.id) });
    toast.success(`Intervention "${interventionForm.type}" logged for emergency patient`);
    setIsInterventionOpen(false);
    setInterventionForm({ type: 'IV Access', description: '', performedBy: '' });
  };

  // Process Disposition (Discharge, Admit, OT Transfer)
  const handleDispositionSubmit = async () => {
    if (!selectedCase) return;

    const updatedCases = cases.map(c => {
      if (c.id === selectedCase.id) {
        return {
          ...c,
          status: dispositionForm.status,
          dispositionReason: dispositionForm.reason || dispositionForm.notes,
          dispositionDestination: dispositionForm.destination,
          dispositionTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          bedId: undefined // Release bed immediately upon disposition
        };
      }
      return c;
    });

    // If Admitted to IPD, trigger admission log
    if (dispositionForm.status === 'IPD Transferred') {
      try {
        const admissions = storage.get('hms_admissions', []);
        const alreadyAdmitted = admissions.some((ad: any) => ad.mrn === selectedCase.mrn);
        
        if (!alreadyAdmitted) {
          const newAdmission = {
            id: `adm-${Date.now()}`,
            mrn: selectedCase.mrn,
            name: selectedCase.name,
            age: selectedCase.age,
            gender: selectedCase.gender,
            phone: selectedCase.phone,
            bed_id: null,
            ward: dispositionForm.destination || 'General Ward',
            admission_date: new Date().toISOString().split('T')[0],
            admission_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            referred_by: 'Emergency Triage',
            status: 'Admitted',
            clinical_diagnosis: `Admitted via Triage: ${selectedCase.presentingComplaints}`
          };
          
          storage.set('hms_admissions', [newAdmission, ...admissions]);
          toast.success('Admission profile dispatched to IPD ward');
        }
      } catch (e) {
        console.warn('Admission link failed:', e);
      }
    }

    // If Emergency surgery scheduled, register scheduled OT
    if (dispositionForm.status === 'OT Scheduled') {
      try {
        const otSchedules = storage.get('hms_ot_schedules', []);
        const newOt = {
          id: `ot-${Date.now()}`,
          patientId: selectedCase.patientId || `p-${Date.now()}`,
          patientName: selectedCase.name,
          mrn: selectedCase.mrn,
          procedureName: 'Emergency Trauma / Exploratory Laparotomy',
          surgeonId: null,
          surgeonName: selectedCase.assignedDoctorName || 'Duty Surgeon',
          anesthetistName: 'On Duty Anesthetist',
          otRoom: dispositionForm.destination || 'Trauma OT 1',
          scheduledDate: new Date().toISOString().split('T')[0],
          scheduledTime: 'IMMEDIATE',
          urgency: 'Emergency',
          status: 'Scheduled'
        };
        storage.set('hms_ot_schedules', [newOt, ...otSchedules]);
        toast.warning('Emergency Trauma OT Scheduler Alert Dispatched!');
      } catch (e) {
        console.warn('OT Link failed:', e);
      }
    }

    saveCasesToLocalStorage(updatedCases, { type: 'update', id: selectedCase.id, data: updatedCases.find(c => c.id === selectedCase.id) });
    toast.success(`Disposition processed: Patient status set to ${dispositionForm.status}`);
    setIsDispositionOpen(false);
  };

  // Delete Case from Logs
  const handleDeleteCase = (id: string) => {
    if (confirm('Are you sure you want to permanently remove this emergency case file?')) {
      const filtered = cases.filter(c => c.id !== id);
      saveCasesToLocalStorage(filtered, { type: 'delete', id });
      toast.success('Case file removed');
    }
  };

  // Printing Intake Form
  const printTriageIntakeForm = (c: EmergencyCase) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Emergency Triage Intake - ${c.name}</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 30px; color: #1e293b; }
            .header-bar { border-bottom: 3px solid #e11d48; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .hospital-name { font-size: 20px; font-weight: 800; color: #0f172a; }
            .badge-triage { font-size: 14px; font-weight: 800; padding: 6px 12px; border-radius: 6px; color: white; display: inline-block; text-transform: uppercase; }
            .badge-Red { background-color: #e11d48; }
            .badge-Orange { background-color: #f97316; }
            .badge-Yellow { background-color: #eab308; color: #1e293b; }
            .badge-Green { background-color: #10b981; }
            .badge-Blue { background-color: #3b82f6; }
            .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; font-size: 13px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .section-title { font-size: 13px; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; }
            .vitals-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 25px; text-align: center; }
            .vitals-box { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; background-color: #ffffff; }
            .vitals-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .vitals-val { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <div class="hospital-name">GASTRO PLUS HOSPITAL</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">24/7 EMERGENCY & TRAUMA CRITICAL CARE UNIT</div>
            </div>
            <div class="badge-triage badge-${c.triageLevel}">Triage level: ${c.triageLevel}</div>
          </div>

          <h3 style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 20px; color: #e11d48; letter-spacing: 1px;">ACUTE INTAKE & TRIAGE PROTOCOL</h3>

          <div class="grid-info">
            <div><strong>Patient Name:</strong> ${c.name}</div>
            <div><strong>MRN No:</strong> ${c.mrn}</div>
            <div><strong>Age / Gender:</strong> ${c.age} Yrs / ${c.gender}</div>
            <div><strong>Contact No:</strong> ${c.phone || 'N/A'}</div>
            <div><strong>Arrival Mode:</strong> ${c.arrivalMode}</div>
            <div><strong>Timestamp:</strong> ${c.arrivalDate} @ ${c.arrivalTime}</div>
            <div><strong>On-duty Clinician:</strong> ${c.assignedDoctorName || 'Duty Emergency Officer'}</div>
            <div><strong>ER Bed Bay:</strong> ${c.bedId || 'Triage Waiting area'}</div>
          </div>

          <div class="section-title">Vitals & Physiological Metrics at Presentation</div>
          <div class="vitals-grid">
            <div class="vitals-box">
              <div class="vitals-label">Blood Pressure</div>
              <div class="vitals-val">${c.vitals?.bpSystolic || '--'}/${c.vitals?.bpDiastolic || '--'} mmHg</div>
            </div>
            <div class="vitals-box">
              <div class="vitals-label">Heart Rate</div>
              <div class="vitals-val">${c.vitals?.pulseRate || '--'} bpm</div>
            </div>
            <div class="vitals-box">
              <div class="vitals-label">Oxygen Sat. (SpO2)</div>
              <div class="vitals-val">${c.vitals?.spo2 || '--'} %</div>
            </div>
            <div class="vitals-box">
              <div class="vitals-label">Core Temp</div>
              <div class="vitals-val">${c.vitals?.temperature || '--'} °F</div>
            </div>
          </div>

          <div class="section-title">Neurological Status & Comfort</div>
          <div class="grid-info" style="grid-template-columns: 1fr 1fr; margin-bottom: 25px;">
            <div><strong>Glasgow Coma Scale (GCS):</strong> ${c.vitals?.gcsTotal ? `${c.vitals.gcsTotal}/15` : 'Not recorded'}</div>
            <div><strong>Pain Intensity Scale (0-10):</strong> ${c.vitals?.painScale ? `${c.vitals.painScale}/10` : 'Not recorded'}</div>
          </div>

          <div class="section-title">Chief Presenting Complaints & History</div>
          <div style="font-size: 13px; line-height: 1.6; margin-bottom: 25px; padding: 12px; border-left: 4px solid #e11d48; background-color: #fff1f2; border-radius: 0 6px 6px 0;">
            ${c.presentingComplaints}
            ${c.mechanismOfInjury ? `<br/><br/><strong>Mechanism / Trauma Specs:</strong> ${c.mechanismOfInjury}` : ''}
          </div>

          <div class="section-title">Interventions Administered</div>
          ${c.interventions && c.interventions.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px;">
              <thead>
                <tr style="background:#f1f5f9; text-align: left;">
                  <th style="padding: 6px;">Time</th>
                  <th style="padding: 6px;">Therapy / Intervention</th>
                  <th style="padding: 6px;">Description</th>
                  <th style="padding: 6px;">Administered By</th>
                </tr>
              </thead>
              <tbody>
                ${c.interventions.map(i => `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 6px;">${i.timestamp}</td>
                    <td style="padding: 6px;"><strong>${i.type}</strong></td>
                    <td style="padding: 6px;">${i.description}</td>
                    <td style="padding: 6px;">${i.performedBy}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p style="font-size: 12px; color: #64748b; font-style: italic; margin-bottom: 25px;">No immediate ER procedures / IV therapeutics logged yet.</p>'}

          <div style="margin-top: 60px; display: flex; justify-content: space-between; font-size: 11px;">
            <div>
              <p>Logged By (Triage Specialist Nurse):</p>
              <br/><br/>
              <strong>___________________________</strong>
            </div>
            <div>
              <p>Admitting Trauma Doctor (Sign):</p>
              <br/><br/>
              <strong>___________________________</strong>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Search, filter logic
  const filteredCases = cases.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.presentingComplaints.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTriage = filterTriage === 'all' || c.triageLevel === filterTriage;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;

    return matchesSearch && matchesTriage && matchesStatus;
  });

  // Calculate live statistics
  const liveStats = useMemo(() => {
    let redCount = 0;
    let orangeCount = 0;
    let urgentCount = 0;
    let bedOccupancyCount = 0;

    cases.forEach(c => {
      if (!['IPD Transferred', 'OT Scheduled', 'Discharged', 'Referred Out', 'Expired'].includes(c.status)) {
        if (c.triageLevel === 'Red') redCount++;
        if (c.triageLevel === 'Orange') orangeCount++;
        if (['Triaged', 'Under Observation'].includes(c.status)) urgentCount++;
        if (c.bedId) bedOccupancyCount++;
      }
    });

    return {
      red: redCount,
      orange: orangeCount,
      activeQueue: urgentCount,
      beds: bedOccupancyCount
    };
  }, [cases]);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600 animate-pulse" />
            Emergency & Triage Unit
          </h1>
          <p className="text-muted-foreground text-sm">
            24/7 Trauma response, rapid physiological triaging, real-time resus tracking, and ER bed occupancy mapping.
          </p>
        </div>
        
        <div>
          <Button 
            className="bg-rose-600 hover:bg-rose-700 text-white gap-2 font-bold shadow-md shadow-rose-600/10"
            onClick={() => setIsNewCaseOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Admit Trauma / Triage patient
          </Button>
        </div>
      </div>

      {/* KPI Stats Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-rose-500 bg-rose-50/20 shadow-sm border-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-rose-700 tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-500" /> Critical Resus (Red)
              </p>
              <h3 className="text-2xl font-extrabold text-rose-950 mt-1">{liveStats.red}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-orange-50/20 shadow-sm border-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-orange-700 tracking-wider">Emergent Cases (Orange)</p>
              <h3 className="text-2xl font-extrabold text-orange-950 mt-1">{liveStats.orange}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/20 shadow-sm border-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-emerald-700 tracking-wider">Active ER Bed Load</p>
              <h3 className="text-2xl font-extrabold text-emerald-950 mt-1">{liveStats.beds} / 8 Beds</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/20 shadow-sm border-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-indigo-700 tracking-wider">Active Observational Queue</p>
              <h3 className="text-2xl font-extrabold text-indigo-950 mt-1">{liveStats.activeQueue}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('live-queue')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'live-queue' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Activity className="w-4 h-4" />
          Active Triage Queue
        </button>
        <button 
          onClick={() => setActiveTab('er-beds')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'er-beds' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Building className="w-4 h-4" />
          ER Beds Monitor
        </button>
        <button 
          onClick={() => setActiveTab('all-cases')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'all-cases' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <ClipboardList className="w-4 h-4" />
          Full Emergency Log
        </button>
      </div>

      {/* View Content Logic */}
      {activeTab === 'live-queue' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search triage cases by name, MRN, complaints..."
                className="pl-9 h-10 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select 
                className="text-xs h-10 border rounded-md px-3 bg-white focus:border-rose-500 w-36"
                value={filterTriage}
                onChange={(e) => setFilterTriage(e.target.value)}
              >
                <option value="all">All Triage Levels</option>
                <option value="Red">🔴 Red (Resus)</option>
                <option value="Orange">🟠 Orange (Emergent)</option>
                <option value="Yellow">🟡 Yellow (Urgent)</option>
                <option value="Green">🟢 Green (Less Urgent)</option>
                <option value="Blue">🔵 Blue (Non-Urgent)</option>
              </select>

              <select 
                className="text-xs h-10 border rounded-md px-3 bg-white focus:border-rose-500 w-36"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Live States</option>
                <option value="Triaged">Triaged</option>
                <option value="Under Observation">Observation</option>
              </select>
            </div>
          </div>

          {/* Core Triage Queue List */}
          {filteredCases.filter(c => ['Triaged', 'Under Observation'].includes(c.status)).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto opacity-40 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">All Clear in Emergency</h3>
              <p className="text-slate-400 text-xs mt-1">No active triage patient currently awaiting attention or observation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCases
                .filter(c => ['Triaged', 'Under Observation'].includes(c.status))
                .sort((a, b) => {
                  // Red priority, then orange, yellow, green, blue
                  const priority: Record<string, number> = { Red: 1, Orange: 2, Yellow: 3, Green: 4, Blue: 5 };
                  return (priority[a.triageLevel] || 99) - (priority[b.triageLevel] || 99);
                })
                .map((c) => (
                  <Card key={c.id} className="overflow-hidden border border-slate-200 shadow-sm transition-all hover:shadow-md bg-white">
                    <div className="flex flex-col lg:flex-row lg:items-center">
                      
                      {/* Priority left bar */}
                      <div className={`w-full lg:w-48 p-4 text-white flex flex-col justify-between items-center text-center ${getTriageColor(c.triageLevel)}`}>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-black tracking-widest text-white/80">Triage Rank</span>
                          <h4 className="text-xl font-black uppercase tracking-wider">{c.triageLevel}</h4>
                        </div>
                        <div className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full mt-3 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Logged {c.arrivalTime}
                        </div>
                      </div>

                      {/* Details Area */}
                      <div className="flex-1 p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                          <div className="space-y-0.5">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                              {c.name}
                              <Badge variant="outline" className="text-[10px] font-mono font-bold bg-slate-50">
                                {c.mrn}
                              </Badge>
                            </h3>
                            <p className="text-xs text-slate-500">
                              {c.age} Yrs • {c.gender} • {c.phone}
                            </p>
                          </div>
                          
                          <div className="flex gap-1.5">
                            <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 uppercase text-[9px] font-bold">
                              {c.arrivalMode} arrival
                            </Badge>
                            {c.bedId ? (
                              <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 text-[9px] font-bold">
                                {c.bedId} Assigned
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[9px] font-bold">
                                Holding Area
                              </Badge>
                            )}
                            <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 text-[9px] font-bold">
                              Status: {c.status}
                            </Badge>
                            {c.isReferral && (
                              <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100 text-[9px] font-bold flex items-center gap-0.5">
                                ➡️ Referred by: {c.referredBy || 'Yes'}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Presenting Complaints */}
                        <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border">
                          <strong>Chief Complaint:</strong> {c.presentingComplaints}
                          {c.mechanismOfInjury && (
                            <div className="mt-1 text-[11px] text-slate-500 italic">
                              <strong>Trauma Mechanism:</strong> {c.mechanismOfInjury}
                            </div>
                          )}
                        </div>

                        {/* Vitals Summary Strip */}
                        {c.vitals ? (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-rose-50/10 border border-slate-100 p-2 rounded-lg text-center text-xs">
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">BP</span>
                              <span className="font-extrabold text-slate-800">{c.vitals.bpSystolic}/{c.vitals.bpDiastolic || '--'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">Pulse</span>
                              <span className="font-extrabold text-rose-600 flex items-center justify-center gap-0.5">
                                <Heart className="w-3 h-3 animate-pulse text-rose-500" />
                                {c.vitals.pulseRate} bpm
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">SpO2</span>
                              <span className={`font-extrabold ${parseInt(c.vitals.spo2 || '100') < 92 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {c.vitals.spo2}%
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">Temp</span>
                              <span className="font-extrabold text-slate-800 flex items-center justify-center gap-0.5">
                                <Thermometer className="w-3 h-3 text-orange-500" />
                                {c.vitals.temperature}°F
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">GCS Total</span>
                              <span className="font-extrabold text-slate-800">
                                {c.vitals.gcsTotal}/15
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Physiological vitals not logged. Immediate physiological triaging required.
                          </div>
                        )}

                        {/* On Duty Assignment */}
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1.5">
                          <div>
                            Assigned Doctor: <strong>{c.assignedDoctorName || 'Not Assigned'}</strong> • Nurse: <strong>{c.assignedNurseName || 'Not Assigned'}</strong>
                          </div>
                          <div className="flex gap-2 mt-2 sm:mt-0">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[10px] gap-1"
                              onClick={() => {
                                setSelectedCase(c);
                                setVitalsForm({
                                  bpSystolic: c.vitals?.bpSystolic || '',
                                  bpDiastolic: c.vitals?.bpDiastolic || '',
                                  pulseRate: c.vitals?.pulseRate || '',
                                  spo2: c.vitals?.spo2 || '',
                                  respiratoryRate: c.vitals?.respiratoryRate || '',
                                  temperature: c.vitals?.temperature || '',
                                  gcsEye: c.vitals?.gcsEye || '4',
                                  gcsVerbal: c.vitals?.gcsVerbal || '5',
                                  gcsMotor: c.vitals?.gcsMotor || '6',
                                  painScale: c.vitals?.painScale || '0'
                                });
                                setIsVitalsOpen(true);
                              }}
                            >
                              <Heart className="w-3.5 h-3.5 text-rose-500" /> Log Vitals
                            </Button>

                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[10px] gap-1"
                              onClick={() => {
                                setSelectedCase(c);
                                setIsAssessmentOpen(true);
                              }}
                            >
                              <Stethoscope className="w-3.5 h-3.5 text-blue-500" /> Primary Assessment (ABCDE)
                            </Button>

                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[10px] gap-1"
                              onClick={() => {
                                setSelectedCase(c);
                                setIsInterventionOpen(true);
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-500" /> Log Intervention
                            </Button>

                            <Button 
                              size="sm" 
                              className="h-7 text-[10px] gap-1 bg-slate-800 text-white hover:bg-slate-900"
                              onClick={() => {
                                setSelectedCase(c);
                                setDispositionForm({
                                  status: 'IPD Transferred',
                                  destination: '',
                                  reason: '',
                                  notes: ''
                                });
                                setIsDispositionOpen(true);
                              }}
                            >
                              <ArrowRight className="w-3.5 h-3.5" /> Dispose Case
                            </Button>

                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-[10px] px-2 text-indigo-600"
                              onClick={() => {
                                setSelectedCase(c);
                                setIsViewDetailsOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-[10px] px-2 text-slate-500 hover:text-rose-500"
                              onClick={() => handleDeleteCase(c.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                      </div>

                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'er-beds' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-1">ER Ward Layout (8 Beds Monitor)</h3>
            <p className="text-xs text-slate-400">View real-time emergency bed assignments. Clicking occupied beds opens active clinical file details.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {erBeds.map((bed: any) => {
              const activeCase = cases.find(c => c.bedId === bed.id && ['Triaged', 'Under Observation'].includes(c.status));
              
              return (
                <Card 
                  key={bed.id} 
                  className={`overflow-hidden border transition-all ${
                    activeCase 
                      ? 'bg-rose-50/10 border-rose-200 hover:shadow-md' 
                      : 'bg-white border-slate-200 opacity-80'
                  }`}
                >
                  <CardHeader className="p-4 pb-2 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-500">{bed.id}</span>
                      <Badge className={activeCase ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'} variant="outline">
                        {activeCase ? 'Occupied' : 'Vacant'}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-800 mt-1">{bed.name}</CardTitle>
                    <span className="text-[10px] text-slate-400">{bed.type}</span>
                  </CardHeader>
                  <CardContent className="p-4">
                    {activeCase ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Active Occupant</span>
                          <span className="font-extrabold text-xs text-slate-800 block truncate">{activeCase.name}</span>
                          <span className="text-[10px] text-slate-500">{activeCase.mrn}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className={`${getTriageColor(activeCase.triageLevel)} text-white font-bold text-[9px] uppercase px-2 py-0.5`}>
                            Triage {activeCase.triageLevel}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px]"
                            onClick={() => {
                              setSelectedCase(activeCase);
                              setIsViewDetailsOpen(true);
                            }}
                          >
                            View File
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-300 text-xs italic">
                        Ready for Trauma admissions
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'all-cases' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Complete Historical Log</h3>
              <p className="text-xs text-slate-400">Database of all patients registered under the emergency clinical workspace.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search database..."
                className="w-48 h-8 text-xs bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="text-xs h-8 border rounded px-2 bg-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Dispositions</option>
                <option value="IPD Transferred">IPD Admits</option>
                <option value="OT Scheduled">OT Transfer</option>
                <option value="Discharged">Discharged</option>
                <option value="Referred Out">Referrals</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-100 border-b font-bold text-slate-700">
                  <th className="p-3">Patient / MRN</th>
                  <th className="p-3">Arrival Detail</th>
                  <th className="p-3">Triage</th>
                  <th className="p-3">Complaints</th>
                  <th className="p-3">On-Duty Medical Staff</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      No matching historical logs found.
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">{c.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{c.mrn} ({c.age}Y/{c.gender})</span>
                      </td>
                      <td className="p-3">
                        <span className="block font-medium">{c.arrivalMode}</span>
                        <span className="text-[10px] text-slate-500">{c.arrivalDate} @ {c.arrivalTime}</span>
                      </td>
                      <td className="p-3">
                        <Badge className={`${getTriageColor(c.triageLevel)} text-white font-bold text-[9px] uppercase`}>
                          {c.triageLevel}
                        </Badge>
                      </td>
                      <td className="p-3 max-w-xs">
                        <span className="block truncate">{c.presentingComplaints}</span>
                        {c.isReferral && (
                          <span className="inline-block bg-violet-50 text-violet-700 text-[10px] px-1.5 py-0.5 rounded font-bold mt-1">
                            Ref: {c.referredBy || 'Yes'}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="block font-medium">{c.assignedDoctorName || '--'}</span>
                        <span className="text-[10px] text-slate-500">Nurse: {c.assignedNurseName || '--'}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-bold text-[10px]">
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-indigo-600"
                          onClick={() => {
                            setSelectedCase(c);
                            setIsViewDetailsOpen(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-slate-500"
                          onClick={() => printTriageIntakeForm(c)}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-rose-500"
                          onClick={() => handleDeleteCase(c.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DIALOG 1: NEW TRIAGE INTAKE CASE */}
      <Dialog open={isNewCaseOpen} onOpenChange={setIsNewCaseOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">Emergency Intake & Triaging Form</DialogTitle>
            <DialogDescription>Quick-log presenting trauma cases, categorize acute severity and assign beds immediately.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3 text-xs">
            {/* Quick patient query link */}
            <div className="space-y-1 relative border p-3 rounded-lg bg-slate-50">
              <Label className="font-bold text-slate-700">Link Registered Hospital Patient (Optional)</Label>
              <div className="relative mt-1">
                <Input
                  placeholder="Type name / MRN to search existing patients..."
                  className="pl-8 h-9 text-xs bg-white"
                  value={patientSearchTerm}
                  onChange={(e) => {
                    setPatientSearchTerm(e.target.value);
                    setShowPatientResults(true);
                  }}
                  onFocus={() => setShowPatientResults(true)}
                />
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>

              {showPatientResults && patientSearchTerm.length > 0 && (
                <div className="absolute z-50 left-3 right-3 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[140px] overflow-y-auto">
                  {patientsList.filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase())).map(p => (
                    <div 
                      key={p.id}
                      className="px-3 py-1.5 hover:bg-rose-50 cursor-pointer border-b last:border-0"
                      onClick={() => {
                        setNewCase({
                          ...newCase,
                          patientId: p.id,
                          name: p.name,
                          age: String(p.age),
                          gender: p.gender || 'Male',
                          phone: p.phone || '',
                          isReferral: p.isReferral || p.is_referral || false,
                          referredBy: p.referredBy || p.referred_by || ''
                        });
                        setPatientSearchTerm(p.name);
                        setShowPatientResults(false);
                      }}
                    >
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-[10px] text-slate-500">MRN: {p.mrn} • Phone: {p.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Basic Demographics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Patient Name *</Label>
                <Input
                  placeholder="Trauma / Walk-In Patient"
                  className="h-9 text-xs"
                  value={newCase.name}
                  onChange={(e) => setNewCase({...newCase, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Age (Yrs)</Label>
                <Input
                  type="number"
                  placeholder="Age"
                  className="h-9 text-xs"
                  value={newCase.age}
                  onChange={(e) => setNewCase({...newCase, age: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Gender</Label>
                <select
                  className="w-full text-xs h-9 border rounded-md px-3 bg-white"
                  value={newCase.gender}
                  onChange={(e) => setNewCase({...newCase, gender: e.target.value})}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Arrival & Urgency Details */}
            <div className="grid grid-cols-2 gap-3 bg-rose-50/20 p-3 rounded-lg border border-rose-100">
              <div className="space-y-1">
                <Label className="font-bold text-rose-950">Triage Severity Class *</Label>
                <select
                  className="w-full font-bold text-xs h-9 border rounded-md px-3 bg-white text-rose-800 focus:border-rose-500"
                  value={newCase.triageLevel}
                  onChange={(e) => setNewCase({...newCase, triageLevel: e.target.value as any})}
                >
                  <option value="Red">🔴 Resuscitation (Red - Immediate)</option>
                  <option value="Orange">🟠 Emergent (Orange - Highly Urgent)</option>
                  <option value="Yellow">🟡 Urgent (Yellow - Stable but Prompt)</option>
                  <option value="Green">🟢 Less Urgent (Green - Non-acute)</option>
                  <option value="Blue">🔵 Non-Urgent (Blue - Routine)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Arrival Mode</Label>
                <select
                  className="w-full text-xs h-9 border rounded-md px-3 bg-white"
                  value={newCase.arrivalMode}
                  onChange={(e) => setNewCase({...newCase, arrivalMode: e.target.value})}
                >
                  <option value="Ambulance">Ambulance dispatch</option>
                  <option value="Self">Self / Walk-in</option>
                  <option value="Relative">Relative brought</option>
                  <option value="Police">Police brought (MLC case)</option>
                </select>
              </div>
            </div>

            {/* Referral Case block */}
            <div className="p-3 bg-indigo-50/25 rounded-lg border border-indigo-100/50 space-y-2.5">
              <div className="flex items-center space-x-2.5">
                <input 
                  type="checkbox" 
                  id="isReferral" 
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  checked={newCase.isReferral}
                  onChange={(e) => setNewCase({...newCase, isReferral: e.target.checked})}
                />
                <div className="grid gap-1 leading-none cursor-pointer select-none" onClick={() => setNewCase({...newCase, isReferral: !newCase.isReferral})}>
                  <Label htmlFor="isReferral" className="font-bold text-slate-800 cursor-pointer">Referral Case</Label>
                  <p className="text-[10px] text-slate-500">Check if this patient is referred from another clinic or hospital.</p>
                </div>
              </div>

              {newCase.isReferral && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label className="font-bold text-indigo-900">Referred By (Doctor / Hospital) *</Label>
                  <Input 
                    placeholder="Enter referring doctor or facility name"
                    className="h-9 text-xs bg-white border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                    value={newCase.referredBy}
                    onChange={(e) => setNewCase({...newCase, referredBy: e.target.value})}
                  />
                </div>
              )}
            </div>

            {/* Complaint */}
            <div className="space-y-1">
              <Label className="font-bold text-slate-700">Presenting Complaints & History *</Label>
              <textarea
                placeholder="Log exact symptoms, complaints, onset details or trauma mechanisms..."
                className="w-full min-h-[60px] text-xs border rounded-md p-2 bg-white"
                value={newCase.presentingComplaints}
                onChange={(e) => setNewCase({...newCase, presentingComplaints: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-slate-700">Trauma Mechanism / Additional Notes</Label>
              <Input
                placeholder="e.g. MVA (Motor Vehicle Accident), Fall from height, Penetrating injury..."
                className="h-9 text-xs"
                value={newCase.mechanismOfInjury}
                onChange={(e) => setNewCase({...newCase, mechanismOfInjury: e.target.value})}
              />
            </div>

            {/* Bed, Staff assignment */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">ER Bed Assignment</Label>
                <select
                  className="w-full text-xs h-9 border rounded-md px-3 bg-white"
                  value={newCase.bedId}
                  onChange={(e) => setNewCase({...newCase, bedId: e.target.value})}
                >
                  <option value="">-- No Bed (Triage Area) --</option>
                  {erBeds.map(b => (
                    <option key={b.id} value={b.id} disabled={b.isOccupied}>
                      {b.name} {b.isOccupied ? '(Occupied)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold">Doctor On Call</Label>
                <select
                  className="w-full text-xs h-9 border rounded-md px-3 bg-white"
                  value={newCase.assignedDoctorId}
                  onChange={(e) => setNewCase({...newCase, assignedDoctorId: e.target.value})}
                >
                  <option value="">-- Choose Doctor --</option>
                  {staffList.filter(s => s.role === 'DOCTOR').map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold">Trauma Nurse Assigned</Label>
                <select
                  className="w-full text-xs h-9 border rounded-md px-3 bg-white"
                  value={newCase.assignedNurseId}
                  onChange={(e) => setNewCase({...newCase, assignedNurseId: e.target.value})}
                >
                  <option value="">-- Choose Nurse --</option>
                  {staffList.filter(s => s.role === 'NURSE').map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsNewCaseOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700 font-bold" onClick={handleRegisterEmergencySubmit}>
              Initiate Triage Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: RECORD PHYSIOLOGICAL VITALS */}
      <Dialog open={isVitalsOpen} onOpenChange={setIsVitalsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">Record Physiological Vitals</DialogTitle>
            <DialogDescription>
              Record primary physiological metrics for {selectedCase?.name} to evaluate physiological instability.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Systolic BP (mmHg)</Label>
                <Input 
                  placeholder="e.g. 120"
                  className="h-9 text-xs"
                  value={vitalsForm.bpSystolic}
                  onChange={(e) => setVitalsForm({...vitalsForm, bpSystolic: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Diastolic BP (mmHg)</Label>
                <Input 
                  placeholder="e.g. 80"
                  className="h-9 text-xs"
                  value={vitalsForm.bpDiastolic}
                  onChange={(e) => setVitalsForm({...vitalsForm, bpDiastolic: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Heart Rate (BPM)</Label>
                <Input 
                  placeholder="e.g. 72"
                  className="h-9 text-xs font-bold text-rose-600"
                  value={vitalsForm.pulseRate}
                  onChange={(e) => setVitalsForm({...vitalsForm, pulseRate: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Oxygen Saturation (SpO2 %)</Label>
                <Input 
                  placeholder="e.g. 98"
                  className="h-9 text-xs font-bold text-emerald-600"
                  value={vitalsForm.spo2}
                  onChange={(e) => setVitalsForm({...vitalsForm, spo2: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Core Temp (°F)</Label>
                <Input 
                  placeholder="e.g. 98.6"
                  className="h-9 text-xs"
                  value={vitalsForm.temperature}
                  onChange={(e) => setVitalsForm({...vitalsForm, temperature: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2 border-t pt-2">
              <Label className="font-bold text-indigo-900 block">Glasgow Coma Scale (GCS Calculator)</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">Eye Response</span>
                  <select
                    className="text-xs h-8 border rounded px-2 w-full bg-white"
                    value={vitalsForm.gcsEye}
                    onChange={(e) => setVitalsForm({...vitalsForm, gcsEye: e.target.value})}
                  >
                    <option value="4">4 - Spontaneous</option>
                    <option value="3">3 - To Speech</option>
                    <option value="2">2 - To Pain</option>
                    <option value="1">1 - None</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">Verbal Response</span>
                  <select
                    className="text-xs h-8 border rounded px-2 w-full bg-white"
                    value={vitalsForm.gcsVerbal}
                    onChange={(e) => setVitalsForm({...vitalsForm, gcsVerbal: e.target.value})}
                  >
                    <option value="5">5 - Oriented</option>
                    <option value="4">4 - Confused</option>
                    <option value="3">3 - Inappropriate</option>
                    <option value="2">2 - Incomprehensible</option>
                    <option value="1">1 - None</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">Motor Response</span>
                  <select
                    className="text-xs h-8 border rounded px-2 w-full bg-white"
                    value={vitalsForm.gcsMotor}
                    onChange={(e) => setVitalsForm({...vitalsForm, gcsMotor: e.target.value})}
                  >
                    <option value="6">6 - Obeys commands</option>
                    <option value="5">5 - Localizes pain</option>
                    <option value="4">4 - Withdraws (pain)</option>
                    <option value="3">3 - Flexion (pain)</option>
                    <option value="2">2 - Extension (pain)</option>
                    <option value="1">1 - None</option>
                  </select>
                </div>
              </div>
              <div className="p-2 bg-indigo-50/50 border rounded text-xs font-bold text-center mt-1">
                Calculated GCS Score: {gcsTotalScore}/15
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Pain Intensity Scale (0-10)</Label>
              <select
                className="w-full text-xs h-9 border rounded px-3 bg-white"
                value={vitalsForm.painScale}
                onChange={(e) => setVitalsForm({...vitalsForm, painScale: e.target.value})}
              >
                {Array.from({ length: 11 }).map((_, i) => (
                  <option key={i} value={i}>{i} - {i === 0 ? 'No Pain' : i === 10 ? 'Worst Possible Pain' : `Level ${i}`}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsVitalsOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700 font-bold" onClick={handleRecordVitalsSubmit}>
              Log Vitals Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: ABCDE PRIMARY ASSESSMENT NOTES */}
      <Dialog open={isAssessmentOpen} onOpenChange={setIsAssessmentOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">Primary ABCDE Assessment</DialogTitle>
            <DialogDescription>
              Log clinician-specific airway, ventilation, hemodynamic stability, and physical exposure assessments.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">ABCDE Assessment Protocol Notes</Label>
              <textarea
                placeholder="Airway: patent? Breathing: rate, depth, chest expansions? Circulation: pulse quality, skin perfusion? Disability: pupillary reflexes, GCS? Exposure: trauma checks?"
                className="w-full min-h-[100px] text-xs border rounded p-2.5 bg-white"
                value={assessmentForm.abcdeAssessment}
                onChange={(e) => setAssessmentForm({...assessmentForm, abcdeAssessment: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Intervisional Clinical / Diagnostic Workup Plan</Label>
              <textarea
                placeholder="Immediate orders, medications advised, imaging details..."
                className="w-full min-h-[80px] text-xs border rounded p-2.5 bg-white"
                value={assessmentForm.clinicalNotes}
                onChange={(e) => setAssessmentForm({...assessmentForm, clinicalNotes: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAssessmentOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700 font-bold" onClick={handleClinicalAssessmentSubmit}>
              Log Assessment Advice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: LOG ER INTERVENTIONS */}
      <Dialog open={isInterventionOpen} onOpenChange={setIsInterventionOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">Log Medical Intervention</DialogTitle>
            <DialogDescription>
              Record immediate therapeutic maneuvers, IV access, or procedures performed in the ER.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-3 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">Therapy / Intervention Type</Label>
              <select
                className="w-full text-xs h-9 border rounded px-3 bg-white"
                value={interventionForm.type}
                onChange={(e) => setInterventionForm({...interventionForm, type: e.target.value})}
              >
                <option value="IV Access">IV Access / Cannulation</option>
                <option value="Intubation">Rapid Sequence Intubation / Airway Management</option>
                <option value="Oxygen">Supplemental Oxygen / Nebulization</option>
                <option value="Defibrillation">Defibrillation / Cardioversion</option>
                <option value="Medication">Critical IV Meds (Stat doses)</option>
                <option value="Suturing">Suturing / Hemostasis dressing</option>
                <option value="Other">Other Trauma Maneuver</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Therapy Description</Label>
              <textarea
                placeholder="Log medication dosage, site of IV access, catheter size, or resuscitation specifics..."
                className="w-full min-h-[80px] text-xs border rounded p-2.5 bg-white"
                value={interventionForm.description}
                onChange={(e) => setInterventionForm({...interventionForm, description: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold">Administered By</Label>
              <Input
                placeholder="e.g. Nurse Anjali Gupta"
                className="h-9 text-xs"
                value={interventionForm.performedBy}
                onChange={(e) => setInterventionForm({...interventionForm, performedBy: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsInterventionOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700 font-bold" onClick={handleInterventionSubmit}>
              Log Emergency Therapy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: DISPOSE ACTIVE EMERGENCY CASE */}
      <Dialog open={isDispositionOpen} onOpenChange={setIsDispositionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-lg">Emergency Patient Disposition</DialogTitle>
            <DialogDescription>
              Select disposition pathway post-assessment to transfer or discharge the clinical case safely.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3 text-xs">
            <div className="space-y-1">
              <Label className="font-bold">Pathway Status *</Label>
              <select
                className="w-full text-xs h-9 border rounded px-3 bg-white font-bold text-indigo-900 focus:border-indigo-500"
                value={dispositionForm.status}
                onChange={(e) => setDispositionForm({...dispositionForm, status: e.target.value as any})}
              >
                <option value="IPD Transferred">➡️ Admit to IPD (Ward / ICU)</option>
                <option value="OT Scheduled">➡️ Immediate Emergency Surgery (OT)</option>
                <option value="Discharged">➡️ Discharged Home (Clinically Stable)</option>
                <option value="Referred Out">➡️ Transfer/Refer to Higher Facility</option>
                <option value="Expired">❌ Declared Expired</option>
              </select>
            </div>

            {dispositionForm.status === 'IPD Transferred' && (
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Target IPD Ward / Unit</Label>
                <select
                  className="w-full text-xs h-9 border rounded px-3 bg-white"
                  value={dispositionForm.destination}
                  onChange={(e) => setDispositionForm({...dispositionForm, destination: e.target.value})}
                >
                  <option value="ICU Bed">Intensive Care Unit (ICU)</option>
                  <option value="Semi-Private">Semi-Private Ward</option>
                  <option value="Male General Ward">Male General Ward</option>
                  <option value="Female General Ward">Female General Ward</option>
                </select>
              </div>
            )}

            {dispositionForm.status === 'OT Scheduled' && (
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Target Operating Theatre</Label>
                <select
                  className="w-full text-xs h-9 border rounded px-3 bg-white"
                  value={dispositionForm.destination}
                  onChange={(e) => setDispositionForm({...dispositionForm, destination: e.target.value})}
                >
                  <option value="Emergency trauma OT 1">Emergency Trauma OT 1</option>
                  <option value="OT Room 2">OT Room 2 (General)</option>
                </select>
              </div>
            )}

            {dispositionForm.status === 'Referred Out' && (
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Target Hospital / Clinic Name</Label>
                <Input
                  placeholder="e.g. Apex Multi-speciality Hospital"
                  className="h-9 text-xs"
                  value={dispositionForm.destination}
                  onChange={(e) => setDispositionForm({...dispositionForm, destination: e.target.value})}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="font-bold text-slate-700">Disposition Reasons / Clinical Summary Notes</Label>
              <textarea
                placeholder="Outline reasons, stability criteria, transfer specifics, or critical advice..."
                className="w-full min-h-[80px] text-xs border rounded p-2.5 bg-white"
                value={dispositionForm.reason}
                onChange={(e) => setDispositionForm({...dispositionForm, reason: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDispositionOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold" onClick={handleDispositionSubmit}>
              Confirm & Dispatch Disposition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 6: DETAILED WORKSPACE CASE VIEWER */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <Badge className={`${getTriageColor(selectedCase?.triageLevel || 'Yellow')} text-white font-bold text-[10px] uppercase`}>
                Triage Rank: {selectedCase?.triageLevel}
              </Badge>
              <span className="text-xs font-mono text-slate-500">Case Ref: {selectedCase?.id}</span>
            </div>
            <DialogTitle className="text-slate-900 font-bold text-lg mt-1">{selectedCase?.name}</DialogTitle>
            <DialogDescription className="text-xs space-y-1.5 mt-1">
              <div>MRN: {selectedCase?.mrn} • Age: {selectedCase?.age} Yrs • Gender: {selectedCase?.gender} • Phone: {selectedCase?.phone || 'N/A'}</div>
              {selectedCase?.isReferral && (
                <div className="inline-block bg-violet-50 text-violet-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-violet-100/50 mt-1">
                  ➡️ Referral Case (Referred By: {selectedCase?.referredBy || 'N/A'})
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedCase && (
            <div className="py-3 space-y-4 text-xs">
              
              {/* Vitals Grid block */}
              <div className="space-y-1">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">LATEST MEASURED PHYSIOLOGICAL VITALS</span>
                {selectedCase.vitals ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-3 rounded-lg border text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">BP</span>
                      <span className="font-extrabold text-sm text-slate-800">{selectedCase.vitals.bpSystolic}/{selectedCase.vitals.bpDiastolic || '--'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">HEART RATE</span>
                      <span className="font-extrabold text-sm text-rose-600">{selectedCase.vitals.pulseRate} bpm</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">SpO2 SAT</span>
                      <span className="font-extrabold text-sm text-emerald-600">{selectedCase.vitals.spo2}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">TEMP</span>
                      <span className="font-extrabold text-sm text-slate-800">{selectedCase.vitals.temperature}°F</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">GCS SCORE</span>
                      <span className="font-extrabold text-sm text-indigo-700">{selectedCase.vitals.gcsTotal}/15</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center bg-amber-50 text-amber-700 rounded border border-amber-100">
                    No physiological vitals recorded for this emergency patient file.
                  </div>
                )}
              </div>

              {/* Presenting History */}
              <div className="bg-slate-50 p-3 rounded-lg border space-y-1.5">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">PRESENTING COMPLAINTS</span>
                <p className="text-slate-700 font-medium leading-relaxed">{selectedCase.presentingComplaints}</p>
                {selectedCase.mechanismOfInjury && (
                  <p className="text-slate-500 italic mt-1"><strong>Trauma Mechanism:</strong> {selectedCase.mechanismOfInjury}</p>
                )}
              </div>

              {/* Assessment timeline */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">ABCDE CLINICAL ASSESSMENTS LOG</span>
                {selectedCase.assessments && selectedCase.assessments.length > 0 ? (
                  <div className="space-y-3 pl-3 border-l-2 border-indigo-100">
                    {selectedCase.assessments.map((ass, idx) => (
                      <div key={idx} className="space-y-1 relative">
                        <div className="absolute -left-[18px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Noted by: <strong>{ass.notedBy}</strong></span>
                          <span>{new Date(ass.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="font-bold text-slate-800">{ass.abcdeAssessment}</p>
                        {ass.clinicalNotes && <p className="text-slate-500 bg-white border p-2 rounded mt-1">{ass.clinicalNotes}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No formal trauma primary assessments recorded yet.</p>
                )}
              </div>

              {/* Interventions checklist */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">ADMINISTERED ER INTERVENTIONS</span>
                {selectedCase.interventions && selectedCase.interventions.length > 0 ? (
                  <div className="bg-white border rounded divide-y overflow-hidden">
                    {selectedCase.interventions.map((int) => (
                      <div key={int.id} className="p-2.5 flex items-start justify-between hover:bg-slate-50">
                        <div className="space-y-1">
                          <span className="font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 text-[9px] uppercase">{int.type}</span>
                          <p className="font-medium text-slate-800 mt-1">{int.description}</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-400">
                          <span>{int.timestamp}</span>
                          <span className="block mt-0.5">{int.performedBy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No surgical or critical therapeutic interventions recorded yet.</p>
                )}
              </div>

              {/* Disposition Details */}
              {selectedCase.dispositionReason && (
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1">
                  <span className="font-bold text-indigo-950 uppercase tracking-wider text-[10px] block">DISPOSITION & DISCHARGE CLINICAL VERIFICATION</span>
                  <p>Status: <strong>{selectedCase.status}</strong></p>
                  {selectedCase.dispositionDestination && <p>Destination Facility / Ward: <strong>{selectedCase.dispositionDestination}</strong></p>}
                  <p className="text-slate-700 bg-white border p-2 rounded mt-1 italic">"{selectedCase.dispositionReason}"</p>
                </div>
              )}

            </div>
          )}

          <DialogFooter className="border-t pt-3 mt-2 flex justify-between">
            {selectedCase && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 text-indigo-700 border-indigo-200"
                onClick={() => printTriageIntakeForm(selectedCase)}
              >
                <Printer className="w-4 h-4" />
                Print Clinical Triage Sheet
              </Button>
            )}
            <Button size="sm" onClick={() => setIsViewDetailsOpen(false)}>Close Clinical File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
