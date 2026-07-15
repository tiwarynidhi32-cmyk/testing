import React, { useState, ChangeEvent, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import OPDPatientHistory from './OPDPatientHistory';
import OPDSummaryView from './OPDSummaryView';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Calendar as CalendarIcon,
  Clock,
  Printer,
  Share2,
  CheckCircle2,
  Download,
  AlertCircle,
  ArrowUpRight,
  Edit,
  Trash2,
  FileText,
  History,
  Eye,
  User,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { MOCK_USERS } from '@/mockData';
import { formatDate, getAppointmentTimestamp, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { playNotificationSound } from '@/lib/notifications';
import { supabaseService, toDeterministicUuid, isUuid } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { canUserEditRecord, canUserEditClinicalData, canUserManageBilling, normalizeRole, canUserModifyRecord } from '@/utils/rbac';
import { getPrescriptionPrintHtml } from '@/lib/prescriptionPrint';

const isPatientIdMatch = (id1: any, id2: any): boolean => {
  if (!id1 || !id2) return false;
  const s1 = String(id1).trim().toLowerCase();
  const s2 = String(id2).trim().toLowerCase();
  if (s1 === s2) return true;
  try {
    const u1 = toDeterministicUuid(s1).toLowerCase();
    const u2 = toDeterministicUuid(s2).toLowerCase();
    return u1 === u2;
  } catch {
    return false;
  }
};

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const safePrint = (htmlContent: string, width = 800, height = 1000) => {
  // Try hidden iframe printing first as it is the most reliable in modern browsers and sandboxed iframes (no popup blockers)
  try {
    let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      // Remove window.close() so the iframe doesn't throw errors trying to self-close
      const cleanHtml = htmlContent.replace(/window\.close\(\)/g, '');
      doc.write(cleanHtml);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.error('Iframe print failed, falling back to popup window:', printErr);
          fallbackToPopup(htmlContent, width, height);
        }
      }, 500);
      return true;
    }
  } catch (iframeErr) {
    console.error('Hidden iframe printing setup failed, falling back to popup window:', iframeErr);
  }

  return fallbackToPopup(htmlContent, width, height);
};

const fallbackToPopup = (htmlContent: string, width = 800, height = 1000) => {
  let printWindow: Window | null = null;
  try {
    printWindow = window.open('', '_blank', `width=${width},height=${height}`);
  } catch (e) {
    console.error('Failed to open popup window for printing:', e);
  }

  if (printWindow) {
    try {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Explicitly trigger focus and print on the new window to be safe
      setTimeout(() => {
        try {
          printWindow?.focus();
          printWindow?.print();
        } catch (printErr) {
          console.error('Failed to trigger print on popup window:', printErr);
        }
      }, 500);
      return true;
    } catch (err) {
      console.error('Failed to write to print window:', err);
    }
  }

  toast.error('Printing failed. Please allow popups or open this page in a new tab.');
  return false;
};

export default function OPD() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'queue' | 'appointments' | 'patients' | 'summary'>('queue');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);

  const handleOpenRegisterChange = (open: boolean) => {
    setIsRegisterOpen(open);
    if (!open) {
      setEditingPatient(null);
      setNewPatient({ 
        name: '', 
        phone: '', 
        email: '',
        age: '', 
        gender: 'male',
        address: '',
        husbandName: '',
        husbandPhone: '',
        motherName: '',
        motherPhone: '',
        fatherName: '',
        fatherPhone: '',
        bloodGroup: '',
        dob: '',
        tpaId: '',
        tpaValidity: '',
        guardianName: '',
        urgency: 'Routine',
        isReferral: false,
        referredBy: '',
        bookImmediateAppointment: false,
        appointmentDoctor: '',
        appointmentDate: getLocalDateString(),
        appointmentTime: '10:00',
        appointmentUrgency: 'Routine',
        appointmentFee: ''
      });
    }
  };

  const handleOpenAppointmentChange = (open: boolean) => {
    setIsAppointmentOpen(open);
    if (!open) {
      setEditingAppointment(null);
      setPatientSearchTerm('');
      setNewAppointment({ 
        patientId: '', 
        doctor: '', 
        date: '', 
        time: '', 
        urgency: 'Routine',
        discountAmount: '0',
        discountGivenBy: ''
      });
    }
  };
  const [isTokenSuccessOpen, setIsTokenSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>(() => {
    const sessionUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
    if (sessionUser && (sessionUser.role?.toUpperCase() === 'DOCTOR' || sessionUser.role?.toUpperCase() === 'SURGEON')) {
      return sessionUser.name || 'all';
    }
    return 'all';
  });
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [fromDateFilter, setFromDateFilter] = useState<string>('');
  const [toDateFilter, setToDateFilter] = useState<string>('');
  const [appointmentFee, setAppointmentFee] = useState<number>(() => {
    const charges = storage.get(STORAGE_KEYS.OPD_CHARGES, { reg: 200, appt: 200, consult: 500 });
    return charges.consult || 500;
  }); 
  
  // Custom Fee / Charge applies checkboxes states
  const [selectedRegFees, setSelectedRegFees] = useState(() => {
    const charges = storage.get(STORAGE_KEYS.OPD_CHARGES, { reg: 200, appt: 200, consult: 500 });
    return {
      reg: { name: 'OPD Registration Fee', checked: false, amount: 0 },
      appt: { name: 'Appointment Fee', checked: false, amount: charges.appt },
      consult: { name: 'Consultation Fee', checked: false, amount: charges.consult }
    };
  });

  const [selectedApptFees, setSelectedApptFees] = useState(() => {
    const charges = storage.get(STORAGE_KEYS.OPD_CHARGES, { reg: 200, appt: 200, consult: 500 });
    return {
      reg: { name: 'OPD Registration Fee', checked: false, amount: 0 },
      appt: { name: 'Appointment Fee', checked: true, amount: 0 },
      consult: { name: 'Consultation Fee', checked: true, amount: charges.consult }
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>(() => storage.get(STORAGE_KEYS.USERS, MOCK_USERS));
  const [newPatient, setNewPatient] = useState({ 
    name: '', 
    phone: '', 
    email: '',
    age: '', 
    gender: 'male',
    address: '',
    husbandName: '',
    husbandPhone: '',
    motherName: '',
    motherPhone: '',
    fatherName: '',
    fatherPhone: '',
    bloodGroup: '',
    dob: '',
    tpaId: '',
    tpaValidity: '',
    guardianName: '',
    urgency: 'Routine',
    isReferral: false,
    referredBy: '',
    bookImmediateAppointment: false,
    appointmentDoctor: '',
    appointmentDate: getLocalDateString(),
    appointmentTime: '10:00',
    appointmentUrgency: 'Routine',
    appointmentFee: ''
  });
  const [newAppointment, setNewAppointment] = useState({ 
    patientId: '', 
    doctor: '', 
    date: '', 
    time: '', 
    urgency: 'Routine',
    discountAmount: '0',
    discountGivenBy: ''
  });
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientRecordsSearchQuery, setPatientRecordsSearchQuery] = useState('');
  const [patientsPage, setPatientsPage] = useState(1);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setPatientsPage(1);
    setAppointmentsPage(1);
  }, [patientRecordsSearchQuery, activeTab]);
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [lastToken, setLastToken] = useState<{
    tokenNumber: string;
    patientName: string;
    mrn: string;
    doctor: string;
    date: string;
    fee?: number;
  } | null>(null);

  const { opdTokenMap, appointmentSeqMap } = useMemo(() => {
    const tokenMap: Record<string, number> = {};
    const seqMap: Record<string, number> = {};

    // Sort ALL appointments chronologically to determine their stable global and daily sequence.
    // We should sort them ascendingly by appointment date, then appointment time, then created_at/id.
    const sortedApts = [...appointments].sort((a, b) => {
      const dateA = a.appointment_date || a.date || '';
      const dateB = b.appointment_date || b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const timeA = a.appointment_time || a.time || '';
      const timeB = b.appointment_time || b.time || '';
      
      const tA = getAppointmentTimestamp(dateA, timeA);
      const tB = getAppointmentTimestamp(dateB, timeB);
      if (tA !== tB) return tA - tB;

      const createdA = new Date(a.created_at || 0).getTime();
      const createdB = new Date(b.created_at || 0).getTime();
      if (createdA !== createdB) return createdA - createdB;

      return String(a.id || '').localeCompare(String(b.id || ''));
    });

    // 1. Calculate global sequential appointment numbers
    sortedApts.forEach((apt, idx) => {
      if (apt && apt.id) {
        seqMap[apt.id] = idx + 1;
      }
    });

    // 2. Calculate daily sequential token numbers (grouped by date)
    const dateGroups: Record<string, any[]> = {};
    sortedApts.forEach(apt => {
      if (apt) {
        const d = apt.appointment_date || apt.date || '';
        if (!dateGroups[d]) {
          dateGroups[d] = [];
        }
        dateGroups[d].push(apt);
      }
    });

    Object.keys(dateGroups).forEach(d => {
      dateGroups[d].forEach((apt, idx) => {
        if (apt && apt.id) {
          tokenMap[apt.id] = idx + 1;
        }
      });
    });

    return { opdTokenMap: tokenMap, appointmentSeqMap: seqMap };
  }, [appointments]);

  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{url: string, name: string} | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [mergePatientData, setMergePatientData] = useState<{ existing: any, newDetails: any, shouldRedirect?: boolean } | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    newPatientData: any;
    duplicatePatient: any;
    shouldRedirect?: boolean;
  } | null>(null);
  const isRegisteringRef = useRef(false);
  const isBookingRef = useRef(false);
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const userRole = currentUser?.role;
  const isAccountant = normalizeRole(currentUser?.role) === 'ACCOUNTANT';
  const isReceptionist = normalizeRole(currentUser?.role) === 'RECEPTIONIST';
  const isDoctor = currentUser?.role?.toUpperCase() === 'DOCTOR' || currentUser?.role?.toUpperCase() === 'SURGEON';
  const isDeleteForbidden = !['ADMIN', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(normalizeRole(userRole));

  // Patient Clinical History states
  const [selectedPatientVitals, setSelectedPatientVitals] = useState<any[]>([]);
  const [selectedPatientNotes, setSelectedPatientNotes] = useState<any[]>([]);
  const [selectedPatientLabs, setSelectedPatientLabs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [prescription, setPrescription] = useState<any>({
    doctor: 'Dr. Rajesh Sharma',
    date: new Date().toISOString().split('T')[0],
    medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
    advice: '',
    attachmentUrl: '',
    attachmentName: '',
    vitals: {
      bp: '',
      pulse: '',
      temp: '',
      spo2: '',
      weight: '',
      rr: ''
    }
  });

  const [savedPrescriptions, setSavedPrescriptions] = useState<any[]>([]);
  const [templateImage, setTemplateImage] = useState<string | null>(storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null));
  const [hospitalInfo, setHospitalInfo] = useState(storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'Gastro Plus Hospital',
    address: 'Gastro Plus Hospital ,Infront of Aura Inn Bansi Road Basti',
    phone: '+91 6394517005',
    email: 'info@gastroplushospital.com',
    logo: null as string | null
  }));

  const fetchData = async () => {
    const isInitial = patients.length === 0 && appointments.length === 0;
    if (isInitial) {
      setLoading(true);
    }
    try {
      const [patientsData, appointmentsData, prescriptionsData, staffData] = await Promise.all([
        supabaseService.getPatients(),
        supabaseService.getAppointments(),
        supabaseService.getPrescriptions(),
        supabaseService.getStaff()
      ]);
      
      if (patientsData) setPatients(patientsData);
      if (staffData && staffData.length > 0) setUsers(staffData);
      if (appointmentsData) {
        const staffList = staffData || users || [];
        const doctorsList = staffList.filter((u: any) => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON');
        const defaultDoc = doctorsList.find((u: any) => u.role?.toUpperCase() === 'DOCTOR') || doctorsList.find((u: any) => u.name && u.name.toLowerCase().includes('dr.')) || doctorsList[0];
        const defaultDocName = defaultDoc ? defaultDoc.name : 'Dr. Rajesh Sharma';

        // Map patients data into appointments if needed, or use the joined data
        const mappedApts = appointmentsData
          .filter((apt: any) => !apt.type || apt.type === 'OPD')
          .map((apt: any) => {
            const docId = apt.doctor_id || apt.doctorId;
            const doc = docId ? staffList.find((u: any) => u.id === docId) : null;
            const pId = apt.patient_id || apt.patientId;
            const matchedPatient = patientsData ? patientsData.find((p: any) => isPatientIdMatch(p.id, pId)) : null;
            const rawPatName = apt.patientName || apt.patient_name || apt.patients?.name || matchedPatient?.name || 'Unknown';
            const lowerRaw = rawPatName.toLowerCase().trim();
            const isPlaceholder = lowerRaw === 'walk-in patient' || lowerRaw === 'walk-in' || lowerRaw === 'unknown' || lowerRaw === '';
            const cleanPatName = isPlaceholder && matchedPatient?.name ? matchedPatient.name : rawPatName;
            const rawPatMrn = apt.patientMrn || apt.patient_mrn || apt.patients?.mrn || matchedPatient?.mrn || 'N/A';
            const cleanPatMrn = isPlaceholder && matchedPatient?.mrn ? matchedPatient.mrn : rawPatMrn;

            return {
              ...apt,
              patientId: pId,
              patientName: cleanPatName,
              patientMrn: cleanPatMrn,
              appointment_date: apt.appointment_date || apt.date,
              appointment_time: apt.appointment_time || apt.time,
              doctor: doc ? doc.name : (apt.doctor || apt.doctorName || defaultDocName),
              doctorName: doc ? doc.name : (apt.doctorName || apt.doctor || defaultDocName)
            };
          });
        setAppointments(mappedApts);
      }
      if (prescriptionsData) {
        const mappedPrescriptions = prescriptionsData.map((rx: any) => ({
          ...rx,
          patientId: rx.patient_id || rx.patientId,
          doctor: rx.doctor_name || rx.doctor,
          date: rx.prescription_date ? rx.prescription_date.split('T')[0] : (rx.date || new Date().toISOString().split('T')[0]),
          medicines: rx.medicines || rx.medications || []
        }));
        setSavedPrescriptions(mappedPrescriptions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useDataSync(fetchData);

  useEffect(() => {
    if (!isAppointmentOpen) {
      setPatientSearchTerm('');
      setShowPatientResults(false);
    }
  }, [isAppointmentOpen]);

  useEffect(() => {
    const current = storage.get('hms_prescriptions', null);
    if (JSON.stringify(current) !== JSON.stringify(savedPrescriptions)) {
      storage.set('hms_prescriptions', savedPrescriptions);
    }
  }, [savedPrescriptions]);

  useEffect(() => {
    const handleSync = () => {
      const charges = storage.get(STORAGE_KEYS.OPD_CHARGES, { reg: 200, appt: 200, consult: 500 });
      setAppointmentFee(charges.consult || 500);
      setSelectedRegFees({
        reg: { name: 'OPD Registration Fee', checked: false, amount: 0 },
        appt: { name: 'Appointment Fee', checked: false, amount: charges.appt },
        consult: { name: 'Consultation Fee', checked: false, amount: charges.consult }
      });
      setSelectedApptFees({
        reg: { name: 'OPD Registration Fee', checked: false, amount: 0 },
        appt: { name: 'Appointment Fee', checked: true, amount: 0 },
        consult: { name: 'Consultation Fee', checked: true, amount: charges.consult }
      });
    };
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrescription({
          ...prescription,
          attachmentUrl: reader.result as string,
          attachmentName: file.name
        });
        toast.success('Prescription PDF uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  const addMedicine = () => {
    setPrescription({
      ...prescription,
      medicines: [...prescription.medicines, { name: '', dosage: '', frequency: '', duration: '' }]
    });
  };

  const removeMedicine = (index: number) => {
    const newMedicines = prescription.medicines.filter((_, i) => i !== index);
    setPrescription({ ...prescription, medicines: newMedicines });
  };

  const updateMedicine = (index: number, field: string, value: string) => {
    const newMedicines = prescription.medicines.map((m, i) => 
      i === index ? { ...m, [field]: value } : m
    );
    setPrescription({ ...prescription, medicines: newMedicines });
  };

  const handleSavePrescription = async () => {
    if (!selectedPatient) {
      toast.error('No patient selected. Cannot save prescription.');
      return;
    }
    
    if (isReceptionist) {
      if (prescription.vitals && (
        prescription.vitals.bp ||
        prescription.vitals.pulse ||
        prescription.vitals.temp ||
        prescription.vitals.spo2 ||
        prescription.vitals.weight ||
        prescription.vitals.rr
      )) {
        try {
          const vData = {
            patient_id: selectedPatient.id,
            bp: prescription.vitals.bp || null,
            pulse: prescription.vitals.pulse ? Number(prescription.vitals.pulse) : null,
            temp: prescription.vitals.temp ? String(prescription.vitals.temp) : null,
            spo2: prescription.vitals.spo2 ? Number(prescription.vitals.spo2) : null,
            weight: prescription.vitals.weight ? Number(prescription.vitals.weight) : null,
            rr: prescription.vitals.rr ? Number(prescription.vitals.rr) : null,
            recorded_by: currentUser?.id || null,
            recorded_at: new Date().toISOString()
          };
          const savedV = await supabaseService.updateVitals(vData);
          if (savedV) {
            setSelectedPatientVitals(prev => [savedV, ...prev]);
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patient_vitals', action: 'insert' } }));
            toast.success(`Patient vitals updated successfully for ${selectedPatient.name}`);
            setIsPrescriptionOpen(false);
          } else {
            toast.error('Failed to save vitals');
          }
        } catch (err) {
          console.error('Failed to save vitals:', err);
          toast.error('Failed to save vitals due to an error');
        }
      } else {
        toast.error('Please enter at least one vital detail to save.');
      }
      return;
    }
    
    const newPrescriptionData = {
      patient_id: selectedPatient.id,
      doctor_name: prescription.doctor,
      prescription_date: prescription.date,
      medicines: prescription.medicines,
      advice: prescription.advice,
      attachment_url: prescription.attachmentUrl,
      attachment_name: prescription.attachmentName
    };

    const saved = await supabaseService.createPrescription(newPrescriptionData);
    if (saved) {
      const mappedSaved = {
        ...saved,
        patientId: saved.patient_id || saved.patientId,
        doctor: saved.doctor_name || saved.doctor,
        date: saved.prescription_date ? saved.prescription_date.split('T')[0] : (saved.date || new Date().toISOString().split('T')[0]),
        medicines: saved.medicines || saved.medications || []
      };
      
      // Auto-save entered/edited vitals if any vital value is provided
      if (prescription.vitals && (
        prescription.vitals.bp ||
        prescription.vitals.pulse ||
        prescription.vitals.temp ||
        prescription.vitals.spo2 ||
        prescription.vitals.weight ||
        prescription.vitals.rr
      )) {
        try {
          const vData = {
            patient_id: selectedPatient.id,
            bp: prescription.vitals.bp || null,
            pulse: prescription.vitals.pulse ? Number(prescription.vitals.pulse) : null,
            temp: prescription.vitals.temp ? String(prescription.vitals.temp) : null,
            spo2: prescription.vitals.spo2 ? Number(prescription.vitals.spo2) : null,
            weight: prescription.vitals.weight ? Number(prescription.vitals.weight) : null,
            rr: prescription.vitals.rr ? Number(prescription.vitals.rr) : null,
            recorded_by: currentUser?.id || null,
            recorded_at: new Date().toISOString()
          };
          const savedV = await supabaseService.updateVitals(vData);
          if (savedV) {
            setSelectedPatientVitals(prev => [savedV, ...prev]);
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patient_vitals', action: 'insert' } }));
          }
        } catch (err) {
          console.error('Failed to auto-save vitals from prescription:', err);
        }
      }

      setSavedPrescriptions([mappedSaved, ...savedPrescriptions]);
      toast.success(`Prescription saved for ${selectedPatient.name}`);
      setIsPrescriptionOpen(false);
      // Reset form dynamically using the prefetched doctor
      const initialDoc = getPrefetchedDoctorName(selectedPatient);

      setPrescription({
        doctor: initialDoc,
        date: new Date().toISOString().split('T')[0],
        medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
        advice: '',
        attachmentUrl: '',
        attachmentName: '',
        vitals: {
          bp: '',
          pulse: '',
          temp: '',
          spo2: '',
          weight: '',
          rr: ''
        }
      });
    } else {
      toast.error('Failed to save prescription to database');
    }
  };

  const getPrefetchedDoctorName = (patient: any) => {
    if (!patient) return 'Dr. Rajesh Sharma';
    
    // 1. Look for active appointment for this patient (not cancelled status)
    const patientApts = appointments.filter((apt: any) => 
      apt.patientId === patient.id && 
      apt.status !== 'Cancelled'
    );
    
    if (patientApts.length > 0) {
      // Sort by date, prioritize today's appointments, otherwise newest first
      const todayStr = new Date().toISOString().split('T')[0];
      const sortedApts = [...patientApts].sort((a: any, b: any) => {
        const dateA = a.appointment_date || '';
        const dateB = b.appointment_date || '';
        if (dateA === todayStr && dateB !== todayStr) return -1;
        if (dateB === todayStr && dateA !== todayStr) return 1;
        return dateB.localeCompare(dateA);
      });
      const latestApt = sortedApts[0];
      const docName = latestApt.doctorName || latestApt.doctor;
      if (docName) {
        return docName;
      }
    }

    // 2. Fallback to currently logged-in Doctor/Admin
    const activeDocs = users.filter((u: any) => 
      u.role?.toUpperCase() === 'DOCTOR' || 
      u.role?.toUpperCase() === 'SUPER_ADMIN' || 
      u.role?.toUpperCase() === 'SURGEON'
    );
    
    if (currentUser?.role === 'DOCTOR' || currentUser?.role === 'SUPER_ADMIN') {
      const foundSelf = activeDocs.find(d => d.name === currentUser.name);
      if (foundSelf) return foundSelf.name;
    }

    // 3. Fallback to default/first doctor in directory
    if (activeDocs.length > 0) {
      const defaultDoc = activeDocs.find((u: any) => u.role?.toUpperCase() === 'DOCTOR') || 
                          activeDocs.find((u: any) => u.name && u.name.toLowerCase().includes('dr.')) || 
                          activeDocs[0];
      return defaultDoc.name;
    }

    return 'Dr. Rajesh Sharma';
  };

  const openPrescriptionModal = (patient: any) => {
    setSelectedPatient(patient);
    loadPatientHistory(patient.id);
    
    const initialDoc = getPrefetchedDoctorName(patient);

    const existingRx = savedPrescriptions
      .filter(rx => {
        const rxPatId = rx.patientId || rx.patient_id;
        const rxPatName = rx.patient_name || rx.patientName || rx.patients?.name;
        const rxPatMrn = rx.patient_mrn || rx.patientMrn || rx.patients?.mrn;
        
        return isPatientIdMatch(rxPatId, patient.id) || 
          (rxPatName && patient.name && rxPatName.toLowerCase().trim() === patient.name.toLowerCase().trim()) ||
          (rxPatMrn && patient.mrn && rxPatMrn.toLowerCase().trim() === patient.mrn.toLowerCase().trim());
      })
      .sort((a, b) => new Date(b.date || b.prescription_date || 0).getTime() - new Date(a.date || a.prescription_date || 0).getTime())[0];

    if (existingRx) {
      setPrescription({
        id: existingRx.id,
        doctor: existingRx.doctor || existingRx.doctor_name || initialDoc,
        date: existingRx.date || existingRx.prescription_date || new Date().toISOString().split('T')[0],
        medicines: existingRx.medicines && existingRx.medicines.length > 0 ? existingRx.medicines : [{ name: '', dosage: '', frequency: '', duration: '' }],
        advice: existingRx.advice || existingRx.notes || '',
        attachmentUrl: existingRx.attachmentUrl || '',
        attachmentName: existingRx.attachmentName || '',
        vitals: existingRx.vitals || {
          bp: '',
          pulse: '',
          temp: '',
          spo2: '',
          weight: '',
          rr: ''
        }
      });
    } else {
      setPrescription({
        doctor: initialDoc,
        date: new Date().toISOString().split('T')[0],
        medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
        advice: '',
        attachmentUrl: '',
        attachmentName: '',
        vitals: {
          bp: '',
          pulse: '',
          temp: '',
          spo2: '',
          weight: '',
          rr: ''
        }
      });
    }
    
    setIsPrescriptionOpen(true);
  };

  const printPrescription = () => {
    if (!selectedPatient) return;

    const doctor = users.find(u => u.name === prescription.doctor);
    const latestVitals = selectedPatientVitals && selectedPatientVitals.length > 0 ? selectedPatientVitals[0] : undefined;

    // Use edited vitals if present, otherwise fall back to latestVitals from history
    const activeVitals = (prescription.vitals && (
      prescription.vitals.bp ||
      prescription.vitals.pulse ||
      prescription.vitals.temp ||
      prescription.vitals.spo2 ||
      prescription.vitals.weight ||
      prescription.vitals.rr
    )) ? {
      bp: prescription.vitals.bp,
      pulse: prescription.vitals.pulse,
      temp: prescription.vitals.temp,
      spo2: prescription.vitals.spo2,
      weight: prescription.vitals.weight,
      rr: prescription.vitals.rr
    } : (latestVitals ? {
      bp: latestVitals.bp,
      pulse: latestVitals.pulse,
      temp: latestVitals.temp,
      spo2: latestVitals.spo2,
      weight: latestVitals.weight,
      rr: latestVitals.rr || latestVitals.respiration
    } : undefined);

    const html = getPrescriptionPrintHtml(
      {
        name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        mrn: selectedPatient.mrn,
        phone: selectedPatient.phone || selectedPatient.mobile || '',
        fatherName: selectedPatient.fatherName || selectedPatient.father_name || ''
      },
      {
        date: prescription.date,
        medicines: prescription.medicines,
        advice: prescription.advice,
        vitals: activeVitals
      },
      doctor,
      hospitalInfo
    );

    safePrint(html, 800, 1000);
  };

  const loadPatientHistory = async (patientId: string) => {
    if (!patientId) return;
    setLoadingHistory(true);
    try {
      const [vts, nts, labs] = await Promise.all([
        supabaseService.getPatientVitals(patientId),
        supabaseService.getClinicalNotes(patientId),
        supabaseService.getLabTestRequests()
      ]);
      
      if (vts) {
        setSelectedPatientVitals(vts);
        if (vts.length > 0) {
          const latest = vts[0];
          setPrescription((prev: any) => ({
            ...prev,
            vitals: {
              bp: latest.bp || '',
              pulse: latest.pulse || '',
              temp: latest.temp || '',
              spo2: latest.spo2 || '',
              weight: latest.weight || '',
              rr: latest.rr || latest.respiration || ''
            }
          }));
        }
      } else {
        setSelectedPatientVitals([]);
      }
      
      if (nts) {
        setSelectedPatientNotes(nts);
      } else {
        setSelectedPatientNotes([]);
      }
      
      if (labs) {
        const filteredLabs = labs.filter((l: any) => l.patient_id === patientId || l.patientId === patientId);
        setSelectedPatientLabs(filteredLabs);
      } else {
        setSelectedPatientLabs([]);
      }
    } catch (err) {
      console.warn('Error loading patient legacy history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Emergency': return 'bg-rose-500 text-white';
      case 'Urgent': return 'bg-amber-500 text-white';
      case 'Routine': return 'bg-emerald-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const startEditPatient = (patient: any) => {
    if (!canUserModifyRecord(patient, currentUser, users)) {
      toast.error("Access Denied: This patient record was created by an Admin and cannot be modified by non-admin users.");
      return;
    }
    setEditingPatient(patient);
    setNewPatient({
      name: patient.name || '',
      phone: patient.phone || '',
      email: patient.email || '',
      age: patient.age ? String(patient.age) : '',
      gender: patient.gender || 'male',
      address: patient.address || '',
      husbandName: patient.husband_name || patient.husbandName || '',
      husbandPhone: patient.husband_phone || patient.husbandPhone || '',
      motherName: patient.mother_name || patient.motherName || '',
      motherPhone: patient.mother_phone || patient.motherPhone || '',
      fatherName: patient.father_name || patient.fatherName || '',
      fatherPhone: patient.father_phone || patient.fatherPhone || '',
      bloodGroup: patient.blood_group || patient.bloodGroup || '',
      dob: patient.dob || '',
      tpaId: patient.tpa_id || patient.tpaId || '',
      tpaValidity: patient.tpa_validity || patient.tpaValidity || '',
      guardianName: patient.guardian_name || patient.guardianName || '',
      urgency: patient.urgency || 'Routine',
      isReferral: patient.is_referral || patient.isReferral || false,
      referredBy: patient.referred_by || patient.referredBy || ''
    });
    setIsRegisterOpen(true);
  };

  const startEditAppointment = (apt: any) => {
    if (!canUserModifyRecord(apt, currentUser, users)) {
      toast.error("Access Denied: This appointment record was created by an Admin and cannot be modified by non-admin users.");
      return;
    }
    setEditingAppointment(apt);
    const patObj = patients.find(p => isPatientIdMatch(p.id, apt.patient_id) || isPatientIdMatch(p.id, apt.patientId));
    setPatientSearchTerm(patObj?.name || apt.patientName || '');
    setNewAppointment({
      patientId: apt.patient_id || apt.patientId || '',
      doctor: apt.doctor || 'Dr. Rajesh Sharma',
      date: apt.appointment_date ? apt.appointment_date.split('T')[0] : (apt.date || ''),
      time: apt.appointment_time || apt.time || '',
      urgency: apt.urgency || 'Routine',
      discountAmount: String(apt.discount_amount || apt.discountAmount || 0),
      discountGivenBy: apt.discount_given_by || apt.discountGivenBy || ''
    });
    setIsAppointmentOpen(true);
  };

  const startBookAppointmentForPatient = (patient: any) => {
    setEditingAppointment(null);
    setNewAppointment({
      patientId: patient.id,
      doctor: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      urgency: 'Routine',
      discountAmount: '0',
      discountGivenBy: ''
    });
    setPatientSearchTerm(patient.name);
    setShowPatientResults(false);
    setIsAppointmentOpen(true);
    setActiveTab('appointments');
  };

  const confirmMergeAndContinue = async () => {
    if (!mergePatientData) return;
    const { existing, newDetails, shouldRedirect } = mergePatientData;
    setMergePatientData(null);
    setIsSubmitting(true);
    try {
      const mergedData = {
        name: existing.name,
        phone: existing.phone,
        email: newDetails.email || existing.email,
        dob: newDetails.dob || existing.dob,
        age: newDetails.age ? Number(newDetails.age) : existing.age,
        gender: newDetails.gender || existing.gender,
        blood_group: newDetails.bloodGroup || newDetails.blood_group || existing.blood_group || existing.bloodGroup,
        address: newDetails.address || existing.address,
        guardian_name: newDetails.guardianName || newDetails.guardian_name || existing.guardian_name || existing.guardianName,
        father_name: newDetails.fatherName || newDetails.father_name || existing.father_name || existing.fatherName,
        father_phone: newDetails.fatherPhone || newDetails.father_phone || existing.father_phone || existing.fatherPhone,
        mother_name: newDetails.motherName || newDetails.mother_name || existing.mother_name || existing.motherName,
        mother_phone: newDetails.motherPhone || newDetails.mother_phone || existing.mother_phone || existing.motherPhone,
        husband_name: newDetails.husbandName || newDetails.husband_name || existing.husband_name || existing.husbandName,
        husband_phone: newDetails.husbandPhone || newDetails.husband_phone || existing.husband_phone || existing.husbandPhone,
        tpa_id: newDetails.tpaId || newDetails.tpa_id || existing.tpa_id || existing.tpaId,
        tpa_validity: newDetails.tpaValidity || newDetails.tpa_validity || existing.tpa_validity || existing.tpaValidity,
        urgency: newDetails.urgency || existing.urgency
      };

      const result = await supabaseService.updatePatient(existing.id, mergedData);
      if (result) {
        const updatedPatientsList = patients.map(p => p.id === existing.id ? { ...p, ...result } : p);
        setPatients(updatedPatientsList);
        storage.set(STORAGE_KEYS.PATIENTS, updatedPatientsList);
        toast.success(`Patient record found and merged successfully! MRN: ${existing.mrn}`);
        
        const tokenNumber = `#${Math.floor(Math.random() * 900) + 100}`;
        setLastToken({
          tokenNumber,
          patientName: existing.name,
          mrn: existing.mrn,
          doctor: "Reception Counter", 
          date: new Date().toLocaleString(),
          fee: 0
        });

        setIsRegisterOpen(false);
        if (!shouldRedirect) {
          setIsTokenSuccessOpen(true);
          setActiveTab('patients');
          setPatientRecordsSearchQuery(existing.name);
        }
        playNotificationSound();

        // Reset form
        setNewPatient({ 
          name: '', 
          phone: '', 
          email: '',
          age: '', 
          gender: 'male',
          address: '',
          husbandName: '',
          husbandPhone: '',
          motherName: '',
          motherPhone: '',
          fatherName: '',
          fatherPhone: '',
          bloodGroup: '',
          dob: '',
          tpaId: '',
          tpaValidity: '',
          guardianName: '',
          urgency: 'Routine',
          isReferral: false,
          referredBy: ''
        });

        if (shouldRedirect) {
          setNewAppointment({
            patientId: existing.id,
            doctor: '',
            date: new Date().toISOString().split('T')[0],
            time: '',
            urgency: 'Routine',
            discountAmount: '0',
            discountGivenBy: ''
          });
          setPatientSearchTerm(existing.name);
          setShowPatientResults(false);

          setTimeout(() => {
            setIsAppointmentOpen(true);
            setActiveTab('appointments');
          }, 300);
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
          detail: { table: 'patients', action: 'update' } 
        }));
      } else {
        toast.error('Failed to merge patient details');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error merging records');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegistration = async (shouldRedirect: boolean = false, bypassDuplicateCheck: boolean = false) => {
    if (!newPatient.name) {
      toast.error('Please enter the patient\'s Full Name');
      return;
    }

    if (newPatient.bookImmediateAppointment && !newPatient.appointmentDoctor) {
      toast.error('Please select a doctor for the immediate appointment');
      return;
    }

    if (isSubmitting || isRegisteringRef.current) {
      toast.warning('Registration is already in progress! Please do not click multiple times.');
      return;
    }
    isRegisteringRef.current = true;

    if (!editingPatient && !bypassDuplicateCheck) {
      const trimmedNewName = (newPatient.name || '').trim().toLowerCase();
      const trimmedNewPhone = (newPatient.phone || '').trim().replace(/\D/g, '');
      const trimmedNewEmail = (newPatient.email || '').trim().toLowerCase();

      // Look for EXACT name and phone match for merge
      const exactMatch = patients.find((p: any) => {
        const pName = (p.name || '').trim().toLowerCase();
        const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');
        return pName === trimmedNewName && pPhone === trimmedNewPhone && trimmedNewPhone !== '';
      });

      if (exactMatch) {
        setMergePatientData({
          existing: exactMatch,
          newDetails: { ...newPatient },
          shouldRedirect
        });
        isRegisteringRef.current = false;
        return;
      }

      const duplicatePatient = patients.find((p: any) => {
        const pName = (p.name || '').trim().toLowerCase();
        const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');
        const pEmail = (p.email || '').trim().toLowerCase();

        const nameMatches = pName === trimmedNewName;
        const phoneMatches = trimmedNewPhone && pPhone && (trimmedNewPhone === pPhone);
        const emailMatches = trimmedNewEmail && pEmail && (trimmedNewEmail === pEmail);

        if (nameMatches && phoneMatches) return true;
        if (trimmedNewPhone && trimmedNewPhone.length >= 10 && pPhone === trimmedNewPhone) return true;
        if (nameMatches && !trimmedNewPhone && !pPhone) return true;
        return false;
      });

      if (duplicatePatient) {
        setDuplicateConfirm({
          newPatientData: { ...newPatient },
          duplicatePatient,
          shouldRedirect
        });
        isRegisteringRef.current = false;
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingPatient) {
        const updatedData = {
          name: newPatient.name,
          phone: newPatient.phone,
          email: newPatient.email,
          dob: newPatient.dob ? newPatient.dob : null,
          age: newPatient.age ? Number(newPatient.age) : null,
          gender: newPatient.gender,
          blood_group: newPatient.bloodGroup,
          address: newPatient.address,
          guardian_name: newPatient.guardianName,
          father_name: newPatient.fatherName,
          father_phone: newPatient.fatherPhone,
          mother_name: newPatient.motherName,
          mother_phone: newPatient.motherPhone,
          husband_name: newPatient.husbandName,
          husband_phone: newPatient.husbandPhone,
          tpa_id: newPatient.tpaId,
          tpa_validity: newPatient.tpaValidity ? newPatient.tpaValidity : null,
          urgency: newPatient.urgency,
          is_referral: newPatient.isReferral,
          referred_by: newPatient.referredBy
        };

        const result = await supabaseService.updatePatient(editingPatient.id, updatedData);
        if (result) {
          const updatedPatientsList = patients.map(p => p.id === editingPatient.id ? { ...p, ...result } : p);
          setPatients(updatedPatientsList);
          storage.set(STORAGE_KEYS.PATIENTS, updatedPatientsList);

          // If "Book Appointment Immediately" is checked, book the appointment right now!
          if (newPatient.bookImmediateAppointment && newPatient.appointmentDoctor) {
            const selectedDocObj = users.find(u => u.name === newPatient.appointmentDoctor);
            const doctorId = selectedDocObj ? selectedDocObj.id : null;
            const apptDate = newPatient.appointmentDate || getLocalDateString();
            
            // Token sequential calculation
            const dateApts = appointments.filter(a => {
              const aDate = a.appointment_date || a.date || '';
              return aDate === apptDate;
            });
            const dailySeq = dateApts.length + 1;
            const tokenNum = `TK-${dailySeq}`;
            
            const docFee = newPatient.appointmentFee !== undefined && newPatient.appointmentFee !== ''
              ? Number(newPatient.appointmentFee)
              : (selectedDocObj && selectedDocObj.consultationFee !== undefined && selectedDocObj.consultationFee !== null
                  ? Number(selectedDocObj.consultationFee)
                  : 500);
            
            const apptSynced = await supabaseService.createAppointment({
              patient_id: result.id,
              patientName: result.name,
              doctor_id: doctorId,
              type: 'OPD',
              appointment_date: apptDate,
              appointment_time: newPatient.appointmentTime || '10:00 AM',
              status: 'Scheduled',
              urgency: newPatient.appointmentUrgency || 'Routine',
              doctor: newPatient.appointmentDoctor,
              fee: docFee,
              discount_amount: 0,
              discount_given_by: currentUser?.name || null
            });

            const resolvedAppt = apptSynced || {
              id: 'apt-' + Date.now(),
              patient_id: result.id,
              patientId: result.id,
              doctor_id: doctorId,
              type: 'OPD',
              appointment_date: apptDate,
              appointment_time: newPatient.appointmentTime || '10:00 AM',
              status: 'Scheduled',
              urgency: newPatient.appointmentUrgency || 'Routine',
              doctor: newPatient.appointmentDoctor,
              fee: docFee,
              discount_amount: 0,
              discount_given_by: currentUser?.name || null
            };

            const isToday = apptDate === getLocalDateString();
            if (isToday) {
              try {
                await supabaseService.createLiveQueueItem({
                  patient_id: result.id,
                  doctor_id: doctorId,
                  appointment_id: resolvedAppt.id,
                  token_number: dailySeq,
                  status: 'Waiting',
                  urgency: newPatient.appointmentUrgency || 'Routine'
                });
              } catch (queueErr) {
                console.warn('Silent error saving to live_queue:', queueErr);
              }
            }

            const selectedInvoiceItems = [{
              item_name: `Consultation Fee - ${newPatient.appointmentDoctor}`,
              item_type: 'Consultation',
              quantity: 1,
              unit_price: docFee,
              total_price: docFee
            }];
            
            const invoiceData = {
              patient_id: result.id,
              patient_name: result.name,
              invoice_number: `INV-OPD-${Date.now()}`,
              status: 'Unpaid',
              total_amount: docFee,
              discount_amount: 0,
              payable_amount: docFee,
              paid_amount: 0,
              payment_method: 'Cash',
              type: 'OPD',
              created_by: currentUser?.id
            };
            
            try {
              await supabaseService.createInvoice(invoiceData, selectedInvoiceItems);
            } catch (invErr) {
              console.warn('Silent error creating invoice:', invErr);
            }

            const apptWithPatient = {
              ...resolvedAppt,
              patientName: result.name,
              patientMrn: result.mrn,
              doctor: newPatient.appointmentDoctor,
              doctorName: newPatient.appointmentDoctor
            };

            setAppointments(prev => [apptWithPatient, ...prev]);
            const allApts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
            storage.set(STORAGE_KEYS.APPOINTMENTS, [apptWithPatient, ...allApts]);

            setLastToken({
              tokenNumber: tokenNum,
              patientName: result.name,
              mrn: result.mrn,
              doctor: newPatient.appointmentDoctor,
              date: new Date().toLocaleString(),
              fee: docFee
            });

            toast.success(`Saved patient details & booked appointment with ${newPatient.appointmentDoctor} (Token: ${tokenNum})`);
            
            setIsRegisterOpen(false);
            setEditingPatient(null);
            setIsTokenSuccessOpen(true);
            setActiveTab('queue');
            
            setNewPatient({ 
              name: '', 
              phone: '', 
              email: '',
              age: '', 
              gender: 'male',
              address: '',
              husbandName: '',
              husbandPhone: '',
              motherName: '',
              motherPhone: '',
              fatherName: '',
              fatherPhone: '',
              bloodGroup: '',
              dob: '',
              tpaId: '',
              tpaValidity: '',
              guardianName: '',
              urgency: 'Routine',
              isReferral: false,
              referredBy: '',
              bookImmediateAppointment: false,
              appointmentDoctor: '',
              appointmentDate: getLocalDateString(),
              appointmentTime: '10:00',
              appointmentUrgency: 'Routine',
              appointmentFee: ''
            });

            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'patients', action: 'update' } 
            }));
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'appointments', action: 'insert' } 
            }));
            setIsSubmitting(false);
            isRegisteringRef.current = false;
            return;
          }

          setIsRegisterOpen(false);
          setEditingPatient(null);
          // Reset form
          setNewPatient({ 
            name: '', 
            phone: '', 
            email: '',
            age: '', 
            gender: 'male',
            address: '',
            husbandName: '',
            husbandPhone: '',
            motherName: '',
            motherPhone: '',
            fatherName: '',
            fatherPhone: '',
            bloodGroup: '',
            dob: '',
            tpaId: '',
            tpaValidity: '',
            guardianName: '',
            urgency: 'Routine',
            isReferral: false,
            referredBy: '',
            bookImmediateAppointment: false,
            appointmentDoctor: '',
            appointmentDate: getLocalDateString(),
            appointmentTime: '10:00',
            appointmentUrgency: 'Routine',
            appointmentFee: ''
          });
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
            detail: { table: 'patients', action: 'update' } 
          }));

          if (shouldRedirect) {
            setNewAppointment({
              patientId: editingPatient.id,
              doctor: '',
              date: new Date().toISOString().split('T')[0],
              time: '',
              urgency: 'Routine',
              discountAmount: '0',
              discountGivenBy: ''
            });
            setPatientSearchTerm(result.name || editingPatient.name);
            setShowPatientResults(false);

            setTimeout(() => {
              setIsAppointmentOpen(true);
              setActiveTab('appointments');
            }, 300);

            toast.success('Patient details saved and redirected to Appointment Booking');
          } else {
            toast.success('Patient details saved successfully');
          }
        } else {
          toast.error('Failed to update patient details');
        }
        return;
      }

      const tokenNumber = `#${Math.floor(Math.random() * 900) + 100}`;
      const mrn = `MRN${Math.floor(Math.random() * 90000) + 10000}`;
      const regFee = 200;
      
      const synced = await supabaseService.createPatient({
        mrn,
        name: newPatient.name,
        phone: newPatient.phone || null,
        email: newPatient.email || null,
        dob: newPatient.dob ? newPatient.dob : null,
        age: newPatient.age ? Number(newPatient.age) : null,
        gender: newPatient.gender || 'male',
        blood_group: newPatient.bloodGroup || null,
        address: newPatient.address || null,
        guardian_name: newPatient.guardianName || null,
        father_name: newPatient.fatherName || null,
        father_phone: newPatient.fatherPhone || null,
        mother_name: newPatient.motherName || null,
        mother_phone: newPatient.motherPhone || null,
        husband_name: newPatient.husbandName || null,
        husband_phone: newPatient.husbandPhone || null,
        tpa_id: newPatient.tpaId || null,
        tpa_validity: newPatient.tpaValidity ? newPatient.tpaValidity : null,
        registration_type: 'OPD',
        is_referral: newPatient.isReferral || false,
        referred_by: newPatient.referredBy || null,
        urgency: newPatient.urgency || 'Routine'
      });

      if (synced) {
        const updatedList = [synced, ...patients];
        setPatients(updatedList);
        storage.set(STORAGE_KEYS.PATIENTS, updatedList);

        // If "Book Appointment Immediately" is checked, book the appointment right now!
        if (newPatient.bookImmediateAppointment && newPatient.appointmentDoctor) {
          const selectedDocObj = users.find(u => u.name === newPatient.appointmentDoctor);
          const doctorId = selectedDocObj ? selectedDocObj.id : null;
          const apptDate = newPatient.appointmentDate || getLocalDateString();
          
          // Token sequential calculation
          const dateApts = appointments.filter(a => {
            const aDate = a.appointment_date || a.date || '';
            return aDate === apptDate;
          });
          const dailySeq = dateApts.length + 1;
          const tokenNum = `TK-${dailySeq}`;
          
          const docFee = newPatient.appointmentFee !== undefined && newPatient.appointmentFee !== ''
            ? Number(newPatient.appointmentFee)
            : (selectedDocObj && selectedDocObj.consultationFee !== undefined && selectedDocObj.consultationFee !== null
                ? Number(selectedDocObj.consultationFee)
                : 500);
          
          const apptSynced = await supabaseService.createAppointment({
            patient_id: synced.id,
            patientName: synced.name,
            doctor_id: doctorId,
            type: 'OPD',
            appointment_date: apptDate,
            appointment_time: newPatient.appointmentTime || '10:00 AM',
            status: 'Scheduled',
            urgency: newPatient.appointmentUrgency || 'Routine',
            doctor: newPatient.appointmentDoctor,
            fee: docFee,
            discount_amount: 0,
            discount_given_by: currentUser?.name || null
          });
          
          const resolvedAppt = apptSynced || {
            id: 'apt-' + Date.now(),
            patient_id: synced.id,
            patientId: synced.id,
            doctor_id: doctorId,
            type: 'OPD',
            appointment_date: apptDate,
            appointment_time: newPatient.appointmentTime || '10:00 AM',
            status: 'Scheduled',
            urgency: newPatient.appointmentUrgency || 'Routine',
            doctor: newPatient.appointmentDoctor,
            fee: docFee,
            discount_amount: 0,
            discount_given_by: currentUser?.name || null
          };
          
          // Save inside separate Live Queue database table if appointment is for today
          const isToday = apptDate === getLocalDateString();
          if (isToday) {
            try {
              await supabaseService.createLiveQueueItem({
                patient_id: synced.id,
                doctor_id: doctorId,
                appointment_id: resolvedAppt.id,
                token_number: dailySeq,
                status: 'Waiting',
                urgency: newPatient.appointmentUrgency || 'Routine'
              });
            } catch (queueErr) {
              console.warn('Silent error saving to live_queue:', queueErr);
            }
          }
          
          // Also generate an OPD invoice for consultation fee!
          const selectedInvoiceItems = [{
            item_name: `Consultation Fee - ${newPatient.appointmentDoctor}`,
            item_type: 'Consultation',
            quantity: 1,
            unit_price: docFee,
            total_price: docFee
          }];
          
          const invoiceData = {
            patient_id: synced.id,
            patient_name: synced.name,
            invoice_number: `INV-OPD-${Date.now()}`,
            status: 'Unpaid',
            total_amount: docFee,
            discount_amount: 0,
            payable_amount: docFee,
            paid_amount: 0,
            payment_method: 'Cash',
            type: 'OPD',
            created_by: currentUser?.id
          };
          
          try {
            await supabaseService.createInvoice(invoiceData, selectedInvoiceItems);
          } catch (invErr) {
            console.warn('Silent error creating invoice:', invErr);
          }
          
          const apptWithPatient = {
            ...resolvedAppt,
            patientName: synced.name,
            patientMrn: synced.mrn,
            doctor: newPatient.appointmentDoctor,
            doctorName: newPatient.appointmentDoctor
          };
          
          // Update appointments local state
          setAppointments(prev => [apptWithPatient, ...prev]);
          const currentApts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
          storage.set(STORAGE_KEYS.APPOINTMENTS, [apptWithPatient, ...currentApts]);
          
          // Show Success Token
          setLastToken({
            tokenNumber: tokenNum,
            patientName: synced.name,
            mrn: synced.mrn,
            doctor: newPatient.appointmentDoctor,
            date: new Date().toLocaleString(),
            fee: docFee
          });
          
          toast.success(`Registered patient & booked appointment with ${newPatient.appointmentDoctor} (Token: ${tokenNum})`);
          
          setIsRegisterOpen(false);
          setIsTokenSuccessOpen(true);
          setActiveTab('queue');
          
          // Reset form
          setNewPatient({ 
            name: '', 
            phone: '', 
            email: '',
            age: '', 
            gender: 'male',
            address: '',
            husbandName: '',
            husbandPhone: '',
            motherName: '',
            motherPhone: '',
            fatherName: '',
            fatherPhone: '',
            bloodGroup: '',
            dob: '',
            tpaId: '',
            tpaValidity: '',
            guardianName: '',
            urgency: 'Routine',
            isReferral: false,
            referredBy: '',
            bookImmediateAppointment: false,
            appointmentDoctor: '',
            appointmentDate: getLocalDateString(),
            appointmentTime: '10:00',
            appointmentUrgency: 'Routine',
            appointmentFee: ''
          });

          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
            detail: { table: 'patients', action: 'insert' } 
          }));
          window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
            detail: { table: 'appointments', action: 'insert' } 
          }));
          
          setIsSubmitting(false);
          isRegisteringRef.current = false;
          return;
        }

        // No standard OPD Registration Fee collected per user instructions
        const selectedInvoiceItems: any[] = [];
        let calculatedTotal = 0;

        const regFeeAmount = 0;

        setLastToken({
          tokenNumber,
          patientName: newPatient.name,
          mrn,
          doctor: "Reception Counter", 
          date: new Date().toLocaleString(),
          fee: calculatedTotal
        });

        setIsRegisterOpen(false);
        if (!shouldRedirect) {
          setIsTokenSuccessOpen(true);
          setActiveTab('patients');
          setPatientRecordsSearchQuery(synced.name);
        }
        playNotificationSound();

        // Reset form
        setNewPatient({ 
          name: '', 
          phone: '', 
          email: '',
          age: '', 
          gender: 'male',
          address: '',
          husbandName: '',
          husbandPhone: '',
          motherName: '',
          motherPhone: '',
          fatherName: '',
          fatherPhone: '',
          bloodGroup: '',
          dob: '',
          tpaId: '',
          tpaValidity: '',
          guardianName: '',
          urgency: 'Routine',
          isReferral: false,
          referredBy: '',
          bookImmediateAppointment: false,
          appointmentDoctor: '',
          appointmentDate: getLocalDateString(),
          appointmentTime: '10:00',
          appointmentUrgency: 'Routine',
          appointmentFee: ''
        });

        if (shouldRedirect) {
          // Redirect to Appointment Booking
          setNewAppointment({
            patientId: synced.id,
            doctor: '',
            date: new Date().toISOString().split('T')[0],
            time: '',
            urgency: 'Routine',
            discountAmount: '0',
            discountGivenBy: ''
          });
          setPatientSearchTerm(synced.name);
          setShowPatientResults(false);
          
          // Wrap in setTimeout to ensure the first dialog fully finishes its close animation and focus release 
          // before opening the Book New Appointment dialog
          setTimeout(() => {
            setIsAppointmentOpen(true);
            setActiveTab('appointments');
          }, 300);

          toast.success('Patient registered and redirected to Appointment Booking');
        } else {
          toast.success('Patient registered successfully');
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
          detail: { table: 'patients', action: 'insert' } 
        }));
      } else {
        toast.error('Failed to register patient');
      }
    } catch (error) {
      console.error('Error registering patient:', error);
      toast.error('An error occurred during registration');
    } finally {
      setIsSubmitting(false);
      isRegisteringRef.current = false;
    }
  };

  const handleBookAppointment = async () => {
    if (isBookingRef.current) {
      toast.warning('Appointment booking is already in progress! Please do not click multiple times.');
      return;
    }
    isBookingRef.current = true;

    try {
      if (!newAppointment.patientId || !newAppointment.doctor) {
        toast.error('Please select patient and doctor');
        return;
      }

      const selectedDocObj = users.find(u => u.name === newAppointment.doctor);
    const doctorId = selectedDocObj ? selectedDocObj.id : null;

    if (editingAppointment) {
      const updatedData = {
        patient_id: newAppointment.patientId,
        doctor_id: doctorId,
        appointment_date: newAppointment.date || new Date().toISOString().split('T')[0],
        appointment_time: newAppointment.time || '10:00 AM',
        urgency: newAppointment.urgency,
        doctor: newAppointment.doctor,
        fee: selectedDocObj && selectedDocObj.consultationFee ? Number(selectedDocObj.consultationFee) : appointmentFee,
        discount_amount: Number(newAppointment.discountAmount || 0),
        discount_given_by: newAppointment.discountGivenBy || currentUser?.name || null
      };

      const result = await supabaseService.updateAppointment(editingAppointment.id, updatedData);
      if (result) {
        const patient = patients.find(p => isPatientIdMatch(p.id, newAppointment.patientId));
        const updatedApt = {
          ...result,
          patientId: result.patient_id || result.patientId,
          patientName: patient?.name || 'Unknown',
          patientMrn: patient?.mrn || 'N/A',
          doctor: newAppointment.doctor,
          doctorName: newAppointment.doctor,
          appointment_date: result.appointment_date || result.date,
          appointment_time: result.appointment_time || result.time,
        };
        const updatedList = appointments.map(a => a.id === editingAppointment.id ? updatedApt : a);
        setAppointments(updatedList);
        storage.set(STORAGE_KEYS.APPOINTMENTS, updatedList);
        toast.success('Appointment updated successfully');
        setIsAppointmentOpen(false);
        setEditingAppointment(null);
        setPatientSearchTerm('');
        setNewAppointment({ patientId: '', doctor: '', date: '', time: '', urgency: 'Routine', discountAmount: '0', discountGivenBy: '' });
        window.dispatchEvent(new Event('storage'));
      } else {
        toast.error('Failed to update appointment');
      }
      return;
    }

    const patient = patients.find(p => isPatientIdMatch(p.id, newAppointment.patientId));
    const appointmentDate = newAppointment.date || getLocalDateString();

    // Token no. for OPD must start with no.1 on each date and proceed in sequential order
    const dateApts = appointments.filter(a => {
      const aDate = a.appointment_date || a.date || '';
      return aDate === appointmentDate;
    });
    const dailySeq = dateApts.length + 1;
    const tokenNumber = `TK-${dailySeq}`;
    
    const synced = await supabaseService.createAppointment({
      patient_id: newAppointment.patientId,
      patientName: patient?.name || undefined,
      doctor_id: doctorId,
      type: 'OPD',
      appointment_date: appointmentDate,
      appointment_time: newAppointment.time || '10:00 AM',
      status: 'Scheduled',
      urgency: newAppointment.urgency,
      doctor: newAppointment.doctor,
      fee: selectedDocObj && selectedDocObj.consultationFee ? Number(selectedDocObj.consultationFee) : appointmentFee,
      discount_amount: Number(newAppointment.discountAmount || 0),
      discount_given_by: newAppointment.discountGivenBy || currentUser?.name || null
    });

    if (synced) {
      // Save inside separate Live Queue database table if appointment is for today
      const isToday = appointmentDate === getLocalDateString();
      if (isToday) {
        try {
          await supabaseService.createLiveQueueItem({
            patient_id: newAppointment.patientId,
            doctor_id: doctorId,
            appointment_id: synced.id,
            token_number: dailySeq,
            status: 'Waiting',
            urgency: newAppointment.urgency
          });
        } catch (queueErr) {
          console.warn('Silent error saving to live_queue:', queueErr);
        }
      }

      // Collect the checked fees dynamically
      const selectedInvoiceItems: any[] = [];
      let calculatedTotal = 0;

      if (selectedApptFees.reg.checked) {
        selectedInvoiceItems.push({
          item_name: 'OPD Registration Fee',
          item_type: 'Consultation',
          quantity: 1,
          unit_price: selectedApptFees.reg.amount,
          total_price: selectedApptFees.reg.amount
        });
        calculatedTotal += selectedApptFees.reg.amount;
      }

      if (selectedApptFees.appt.checked) {
        selectedInvoiceItems.push({
          item_name: `Appointment Fee - ${newAppointment.doctor || 'GP'}`,
          item_type: 'Consultation',
          quantity: 1,
          unit_price: selectedApptFees.appt.amount,
          total_price: selectedApptFees.appt.amount
        });
        calculatedTotal += selectedApptFees.appt.amount;
      }

      if (selectedApptFees.consult.checked) {
        const docFee = selectedDocObj && selectedDocObj.consultationFee ? Number(selectedDocObj.consultationFee) : selectedApptFees.consult.amount;
        selectedInvoiceItems.push({
          item_name: `Consultation Fee - ${newAppointment.doctor || 'GP'}`,
          item_type: 'Consultation',
          quantity: 1,
          unit_price: docFee,
          total_price: docFee
        });
        calculatedTotal += docFee;
      }

      if (selectedInvoiceItems.length > 0) {
        // Create Invoice for selected Consultation/Appointment Fees
        const discountVal = Number(newAppointment.discountAmount || 0);
        const invoiceData = {
          patient_id: newAppointment.patientId,
          patient_name: patient?.name || undefined,
          invoice_number: `INV-OPD-${Date.now()}`,
          status: 'Unpaid',
          total_amount: calculatedTotal,
          discount_amount: discountVal,
          payable_amount: Math.max(0, calculatedTotal - discountVal),
          paid_amount: 0,
          payment_method: 'Cash',
          type: 'OPD',
          created_by: currentUser?.id
        };

        await supabaseService.createInvoice(invoiceData, selectedInvoiceItems);
      }

      const aptWithPatient = {
        ...synced,
        patientName: patient?.name || 'Unknown',
        patientMrn: patient?.mrn || 'N/A',
        doctor: newAppointment.doctor,
        doctorName: newAppointment.doctor
      };
      const updatedAptsList = [aptWithPatient, ...appointments];
      setAppointments(updatedAptsList);
      storage.set(STORAGE_KEYS.APPOINTMENTS, updatedAptsList);

      setLastToken({
        tokenNumber,
        patientName: patient?.name || "Unknown",
        mrn: patient?.mrn || "N/A",
        doctor: newAppointment.doctor,
        date: new Date().toLocaleString(),
        fee: calculatedTotal
      });
      setIsAppointmentOpen(false);
      setIsTokenSuccessOpen(true);
      playNotificationSound();
      setPatientSearchTerm('');
      setNewAppointment({ patientId: '', doctor: '', date: '', time: '', urgency: 'Routine', discountAmount: '0', discountGivenBy: '' });
      
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
        detail: { table: 'appointments', action: 'insert' } 
      }));
      window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
        detail: { table: 'invoices', action: 'insert' } 
      }));
      
      toast.success('Appointment booked and token generated');
    } else {
      toast.error('Failed to book appointment');
    }
    } finally {
      isBookingRef.current = false;
    }
  };

  const printToken = () => {
    if (!lastToken) return;

    const tokenHtml = `
      <html>
        <head>
          <title>Token - ${lastToken.tokenNumber}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 58mm; 
              padding: 5mm; 
              margin: 0;
              font-size: 12px;
              line-height: 1.2;
              text-align: center;
            }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .token-num { font-size: 32px; font-weight: bold; margin: 10px 0; }
            .header { margin-bottom: 10px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div class="bold" style="font-size: 16px;">GASTRO PLUS HOSPITAL</div>
            <div>OPD TOKEN</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="token-num">${lastToken.tokenNumber}</div>
          
          <div class="divider"></div>
          
          <div style="text-align: left;">
            <div>Patient: ${lastToken.patientName}</div>
            <div>MRN: ${lastToken.mrn}</div>
            <div>Doctor: ${lastToken.doctor}</div>
            <div>Date: ${lastToken.date}</div>
            ${lastToken.fee ? `<div>Fee Paid: ₹${lastToken.fee}</div>` : ''}
          </div>
          
          <div class="divider"></div>
          
          <div style="font-size: 10px; margin-top: 10px;">
            Please wait for your turn.<br>
            Thank you for your patience.
          </div>
        </body>
      </html>
    `;

    safePrint(tokenHtml, 300, 400);
  };

  const handleDeletePatient = async (id: string) => {
    const patientToDelete = patients.find(p => p.id === id);
    if (!window.confirm(`Are you sure you want to delete ${patientToDelete?.name}?`)) return;

    const success = await supabaseService.deletePatient(id);
    if (success) {
      const updatedList = patients.filter(p => p.id !== id);
      setPatients(updatedList);
      storage.set(STORAGE_KEYS.PATIENTS, updatedList);
      window.dispatchEvent(new Event('storage'));
      toast.success('Patient record removed');
    } else {
      toast.error('Failed to delete patient');
    }
  };

  const handlePayAppointment = async (id: string) => {
    const success = await supabaseService.updateAppointment(id, { payment_status: 'Paid' });
    if (success) {
      const nextApts = appointments.map(a => a.id === id ? { ...a, payment_status: 'Paid' } : a);
      setAppointments(nextApts);
      
      try {
        // Find the patient associated with this appointment to sync invoice status
        const apt = appointments.find(a => a.id === id);
        if (apt) {
          const patientId = apt.patientId || apt.patient_id;
          if (patientId) {
            const invoices = await supabaseService.getInvoices();
            const pendingOPDInvoices = invoices && invoices.length > 0 ? invoices.filter((inv: any) => {
              const cleanInvPid = toDeterministicUuid(inv.patient_id || inv.patientId);
              const cleanAptPid = toDeterministicUuid(patientId);
              const isMatchPatient = cleanInvPid === cleanAptPid;
              const isUnpaid = (inv.status || inv.payment_status || '').toLowerCase() === 'unpaid';
              const isOPD = inv.type === 'OPD' || 
                            inv.invoice_number?.startsWith('INV-REG') || 
                            inv.invoice_number?.startsWith('INV-OPD') ||
                            inv.invoice_number?.includes('REG') ||
                            inv.invoice_number?.includes('OPD');
              return isMatchPatient && isUnpaid && isOPD;
            }) : [];

            const currentBills = storage.get(STORAGE_KEYS.BILLING, []);
            let updatedBills = [...currentBills];

            if (pendingOPDInvoices.length > 0) {
              for (const inv of pendingOPDInvoices) {
                const discountVal = Number(inv.discount_amount || inv.discountAmount || apt.discount_amount || apt.discountAmount || 0);
                const totalAmt = Number(inv.total_amount || inv.totalAmount || apt.fee || 0);
                const payableAmt = Math.max(0, totalAmt - discountVal);
                
                const updatedInv = { 
                  ...inv, 
                  status: 'Paid', 
                  payment_status: 'Paid', 
                  discount_amount: discountVal,
                  payable_amount: payableAmt,
                  paid_amount: payableAmt 
                };

                await supabaseService.updateInvoice(inv.id, updatedInv);

                updatedBills = updatedBills.map((b: any) => b.id === inv.id ? updatedInv : b);
              }
            } else {
              // Creating a Paid OPD Consultation Invoice as backup fallback so it immediately appears in Billing logs
              const baseFee = Number(apt.fee || appointmentFee || 500);
              const discount = Number(apt.discount_amount || apt.discountAmount || 0);
              const feeToCollect = Math.max(0, baseFee - discount);
              const invoiceData = {
                patient_id: patientId,
                invoice_number: `INV-OPD-${Date.now()}`,
                status: 'Paid',
                payment_status: 'Paid',
                total_amount: baseFee,
                discount_amount: discount,
                payable_amount: feeToCollect,
                paid_amount: feeToCollect,
                payment_method: 'Cash',
                type: 'OPD',
                created_by: currentUser?.id
              };
              const invoiceItems = [{
                item_name: `Consultation Fee - ${apt.doctor || apt.doctorName || 'Doctor'}`,
                category: 'Consultation',
                quantity: 1,
                unit_price: baseFee,
                total_price: baseFee
              }];
              const created = await supabaseService.createInvoice(invoiceData, invoiceItems);
              if (created) {
                updatedBills = [created, ...updatedBills];
              }
            }

            // Update local storage caches to keep everything in sync
            storage.set(STORAGE_KEYS.APPOINTMENTS, nextApts);
            storage.set(STORAGE_KEYS.BILLING, updatedBills);

            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'invoices', action: 'update' } 
            }));
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'appointments', action: 'update' } 
            }));
          }
        }
      } catch (err) {
        console.error('Error syncing invoice payment:', err);
      }

      toast.success('Consultation fee collected successfully');
    } else {
      toast.error('Failed to update payment status');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const aptToDelete = appointments.find(a => a.id === id);
    if (!window.confirm(`Are you sure you want to permanently delete appointment for ${aptToDelete?.patientName || 'this patient'}?`)) return;

    const updated = appointments.filter(a => a.id !== id);
    setAppointments(updated);
    storage.set(STORAGE_KEYS.APPOINTMENTS, updated);
    
    try {
      if (id && !id.startsWith('apt-') && !id.startsWith('off-')) {
        await supabaseService.deleteAppointment(id);
      }
    } catch (e) {
      console.warn('Supabase delete appointment error:', e);
    }
    
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
      detail: { table: 'appointments', action: 'delete' } 
    }));
    toast.success('Appointment deleted successfully');
  };

  const handleRefundAppointment = async (id: string) => {
    if (!window.confirm("Are you sure you want to refund this consultation fee? This will mark the transaction as Refunded.")) return;
    const refundBy = currentUser?.name || 'Staff';
    const success = await supabaseService.updateAppointment(id, { 
      payment_status: 'Refunded',
      refund_given_by: refundBy
    });
    if (success) {
      const nextApts = appointments.map(a => a.id === id ? { ...a, payment_status: 'Refunded', refund_given_by: refundBy, refundGivenBy: refundBy } : a);
      setAppointments(nextApts);
      
      try {
        const apt = appointments.find(a => a.id === id);
        if (apt) {
          const patientId = apt.patientId || apt.patient_id;
          if (patientId) {
            const invoices = await supabaseService.getInvoices();
            const opdInvoices = invoices && invoices.length > 0 ? invoices.filter((inv: any) => {
              const isMatchPatient = (inv.patient_id === patientId || inv.patientId === patientId);
              const isOPD = inv.type === 'OPD' || 
                            inv.invoice_number?.startsWith('INV-REG') || 
                            inv.invoice_number?.startsWith('INV-OPD') ||
                            inv.invoice_number?.includes('REG') ||
                            inv.invoice_number?.includes('OPD');
              return isMatchPatient && isOPD;
            }) : [];

            const currentBills = storage.get(STORAGE_KEYS.BILLING, []);
            let updatedBills = [...currentBills];

            if (opdInvoices.length > 0) {
              for (const inv of opdInvoices) {
                const updatedInv = { ...inv, status: 'Refunded', payment_status: 'Refunded' };
                await supabaseService.updateInvoice(inv.id, updatedInv);
                updatedBills = updatedBills.map((b: any) => b.id === inv.id ? updatedInv : b);
              }
            }
            
            // Update local storage cache to keep everything in sync
            storage.set(STORAGE_KEYS.APPOINTMENTS, nextApts);
            storage.set(STORAGE_KEYS.BILLING, updatedBills);

            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'invoices', action: 'update' } 
            }));
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { 
              detail: { table: 'appointments', action: 'update' } 
            }));
          }
        }
      } catch (err) {
        console.error('Error syncing invoice refund:', err);
      }

      toast.success('Consultation fee refunded successfully');
    } else {
      toast.error('Failed to update refund status');
    }
  };

  const printAppointmentToken = (apt: any) => {
    const patName = patients.find(p => isPatientIdMatch(p.id, apt.patientId) || isPatientIdMatch(p.id, apt.patient_id))?.name || apt.patientName || 'WALK-IN PATIENT';
    const patMRN = patients.find(p => isPatientIdMatch(p.id, apt.patientId) || isPatientIdMatch(p.id, apt.patient_id))?.mrn || apt.patientMrn || 'N/A';
    
    const tokenHtml = `
      <html>
        <head>
          <title>OPD Consultation Token</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 25px; color: #000; text-align: center; }
            .header { border-bottom: 2px dashed #333; padding-bottom: 12px; margin-bottom: 15px; }
            .hospital-name { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
            .token-num { font-size: 42px; font-weight: 900; margin: 18px 0; border: 2px solid #000; padding: 8px 16px; display: inline-block; border-radius: 4px; }
            .info-row { text-align: left; font-size: 13px; margin: 6px 0; line-height: 1.4; }
            .info-label { font-weight: Bold; text-transform: uppercase; color: #333; }
            .footer { border-top: 2px dashed #333; margin-top: 22px; padding-top: 12px; font-size: 11px; line-height: 1.4; color: #555; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div class="hospital-name">GASTRO PLUS HOSPITAL</div>
            <div style="font-size: 10px; font-weight: Bold; margin-top: 3px; color: #444;">OPD CLINIC APPOINTMENT SLIP</div>
          </div>
          <div>
            <div style="font-size: 12px; font-weight: Bold;">SESSION DATE: ${apt.appointment_date || apt.date || new Date().toISOString().split('T')[0]}</div>
            <div style="font-size: 11px; margin-top: 4px; color: #333; font-weight: bold;">APPOINTMENT NO: #${appointmentSeqMap[apt.id] ? (1000 + appointmentSeqMap[apt.id]) : 'N/A'}</div>
            <div class="token-num">TK-${opdTokenMap[apt.id] || 1}</div>
          </div>
          <div style="margin: 20px 0; border: 1px solid #eee; padding: 10px; border-radius: 4px;">
            <div class="info-row"><span class="info-label">PATIENT NAME :</span> ${patName}</div>
            <div class="info-row"><span class="info-label">PATIENT MRN  :</span> ${patMRN}</div>
            <div class="info-row"><span class="info-label">OPD DOCTOR   :</span> ${apt.doctor || 'Dr. Rajesh Sharma'}</div>
            <div class="info-row"><span class="info-label">TIME BLOCK   :</span> ${apt.appointment_time || apt.time || '10:00 AM'}</div>
            <div class="info-row"><span class="info-label">URGENCY LEVEL:</span> ${apt.urgency || 'Routine'}</div>
          </div>
          <div class="footer">
            <p>Please present this slip at OPD Consultation chamber outer disk. Wait for your turn token call.</p>
            <p style="font-weight: 900; color: #000; margin-top: 5px;">HAVE A HEALTHY DAY!</p>
          </div>
        </body>
      </html>
    `;
    safePrint(tokenHtml, 400, 550);
  };

  const printLatestPrescriptionForPatient = (patient: any, doctorNameFallback?: string) => {
    if (!patient) {
      toast.error('Patient record not found');
      return;
    }

    const patientPrescriptions = savedPrescriptions
      .filter(rx => {
        const rxPatId = rx.patientId || rx.patient_id;
        const rxPatName = rx.patient_name || rx.patientName || rx.patients?.name;
        const rxPatMrn = rx.patient_mrn || rx.patientMrn || rx.patients?.mrn;
        
        return isPatientIdMatch(rxPatId, patient.id) || 
          (rxPatName && patient.name && rxPatName.toLowerCase().trim() === patient.name.toLowerCase().trim()) ||
          (rxPatMrn && patient.mrn && rxPatMrn.toLowerCase().trim() === patient.mrn.toLowerCase().trim());
      })
      .sort((a, b) => new Date(b.date || b.prescription_date || 0).getTime() - new Date(a.date || a.prescription_date || 0).getTime());

    if (patientPrescriptions.length === 0) {
      toast.error('No prescription record found for this patient');
      return;
    }

    const latestRx = patientPrescriptions[0];
    const docObj = users.find(u => u.name === (latestRx.doctor || latestRx.doctor_name || doctorNameFallback));
    const latestVitals = selectedPatientVitals && selectedPatientVitals.length > 0 ? selectedPatientVitals[0] : undefined;

    const html = getPrescriptionPrintHtml(
      {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        mrn: patient.mrn,
        phone: patient.phone || patient.mobile || '',
        fatherName: patient.fatherName || patient.father_name || ''
      },
      {
        date: latestRx.date || latestRx.prescription_date,
        medicines: latestRx.medicines || latestRx.medications || [],
        advice: latestRx.advice || latestRx.notes || '',
        vitals: latestRx.vitals || (latestVitals ? {
          bp: latestVitals.bp,
          pulse: latestVitals.pulse,
          temp: latestVitals.temp,
          spo2: latestVitals.spo2,
          weight: latestVitals.weight,
          rr: latestVitals.rr || latestVitals.respiration
        } : undefined)
      },
      docObj,
      hospitalInfo
    );

    safePrint(html, 800, 1000);
  };

  const handleExportData = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (activeTab === 'patients') {
      const filteredPatients = patients.filter(p => {
        if (!patientRecordsSearchQuery.trim()) return true;
        const query = patientRecordsSearchQuery.toLowerCase();
        return (p.name || '').toLowerCase().includes(query) ||
               (p.mrn || '').toLowerCase().includes(query) ||
               (p.phone || '').includes(query);
      });

      headers = ['MRN', 'Name', 'Age', 'Gender', 'Phone', 'Last Visit'];
      rows = filteredPatients.map(p => [
        p.mrn || '', 
        p.name || '', 
        p.age || '', 
        p.gender || '', 
        p.phone || '', 
        p.created_at || p.registration_date ? new Date(p.created_at || p.registration_date).toLocaleDateString() : 'N/A'
      ]);
      filename = 'patient_records.csv';
    } else {
      const filteredAppointments = appointments
        .filter(apt => {
          const aptDate = typeof apt.appointment_date === 'string' ? apt.appointment_date : new Date(apt.appointment_date).toLocaleDateString('sv').split(' ')[0];
          
          if (fromDateFilter || toDateFilter) {
            if (fromDateFilter && aptDate < fromDateFilter) {
              return false;
            }
            if (toDateFilter && aptDate > toDateFilter) {
              return false;
            }
            return true;
          }

          if (activeTab === 'queue') {
            const targetDate = selectedDateFilter || getLocalDateString();
            return aptDate === targetDate;
          }
          if (selectedDateFilter) {
            return aptDate === selectedDateFilter;
          }
          return true;
        })
        .filter(apt => {
          if (selectedDoctorFilter !== 'all') {
            const docObj = users.find(u => u.name === selectedDoctorFilter);
            const docId = docObj?.id;
            const isMe = (apt.doctor || apt.doctorName) === selectedDoctorFilter || (docId && (apt.doctor_id === docId || apt.doctorId === docId));
            
            // Check if the patient of this appointment is assigned to this doctor
            const pId = apt.patient_id || apt.patientId;
            const patient = patients.find(p => isPatientIdMatch(p.id, pId));
            const isAssignedToMe = patient && (
              (patient.attending_doctor_id && docId && String(patient.attending_doctor_id).toLowerCase() === String(docId).toLowerCase()) ||
              (patient.attendingDoctorId && docId && String(patient.attendingDoctorId).toLowerCase() === String(docId).toLowerCase()) ||
              (patient.attending_doctor_id && String(patient.attending_doctor_id).toLowerCase() === String(selectedDoctorFilter).toLowerCase()) ||
              (patient.attendingDoctorId && String(patient.attendingDoctorId).toLowerCase() === String(selectedDoctorFilter).toLowerCase())
            );
            
            return isMe || isAssignedToMe;
          }
          return true;
        })
        .filter(apt => {
          if (!patientRecordsSearchQuery.trim()) return true;
          const query = patientRecordsSearchQuery.toLowerCase();
          return (apt.patientName || '').toLowerCase().includes(query) ||
                 (apt.patientMrn || '').toLowerCase().includes(query) ||
                 (apt.doctor || apt.doctorName || '').toLowerCase().includes(query);
        });

      headers = ['Appt No', 'Token', 'Patient Name', 'MRN', 'Doctor', 'Department', 'Date', 'Time', 'Status', 'Payment Status', 'Urgency'];
      rows = filteredAppointments.map((apt, i) => {
        const apptNo = `#${appointmentSeqMap[apt.id] ? (1000 + appointmentSeqMap[apt.id]) : (100 + i + 1)}`;
        const tokenNum = `TK-${opdTokenMap[apt.id] || 1}`;
        const patientName = apt.patientName || '';
        const patientMrn = apt.patientMrn || '';
        const doctorName = apt.doctor || apt.doctorName || 'Duty Doctor';
        const department = users.find(u => u.name === doctorName || u.id === apt.doctor_id)?.department || apt.doctorDepartment || 'General Medicine';
        const apptDate = apt.appointment_date || '';
        const apptTime = apt.appointment_time || apt.appointmentTime || apt.time || 'N/A';
        const status = apt.status || '';
        const paymentStatus = apt.payment_status || '';
        const urgency = apt.urgency || '';

        return [
          apptNo,
          tokenNum,
          patientName,
          patientMrn,
          doctorName,
          department,
          apptDate,
          apptTime,
          status,
          paymentStatus,
          urgency
        ];
      });
      filename = activeTab === 'queue' ? 'live_queue.csv' : 'appointments.csv';
    }
    
    const csvContent = [headers, ...rows].map(e => e.map(val => {
      const strVal = val === null || val === undefined ? '' : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    }).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} exported successfully`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <p className="text-muted-foreground animate-pulse">Loading OPD records...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Dynamic, Vibrant, Richly Colored Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-500 text-white p-6 sm:p-8 shadow-xl shadow-teal-100 animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest bg-white/20 text-white px-3 py-1 rounded-full uppercase my-1 select-none w-fit">
              ★ CLINICAL PORTAL ACTIVE
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              OPD Management
            </h1>
            <p className="text-teal-50 text-sm font-medium max-w-xl">
              Manage outpatient registrations, patient tokens, scheduled consults, and instant clinical check-ins effortlessly.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
            {!isAccountant && (
              <Button variant="outline" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-teal-900 rounded-xl font-bold h-10" onClick={handleExportData}>
                <Download className="w-4 h-4" />
                Export {activeTab === 'patients' ? 'Records' : 'Queue'}
              </Button>
            )}
            {!isAccountant && currentUser?.role !== 'DOCTOR' && (
              <Button 
                className="bg-white text-teal-900 hover:bg-teal-50 gap-2 rounded-xl font-black h-10 shadow-md"
                onClick={() => handleOpenAppointmentChange(true)}
              >
                <CalendarIcon className="w-4 h-4" />
                Book Appointment
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAppointmentOpen} onOpenChange={handleOpenAppointmentChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[96vh] flex flex-col">
          <DialogHeader className="shrink-0 mb-1">
            <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Book New Appointment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[calc(96vh-170px)]">
                  <div className="space-y-2 relative">
                    <Label>Patient (Search by Name or Phone)</Label>
                    <div className="relative">
                      <Input 
                        placeholder="Start typing name or phone..." 
                        value={patientSearchTerm}
                        onChange={(e) => {
                          setPatientSearchTerm(e.target.value);
                          setShowPatientResults(true);
                          // Clear selected patient if input is cleared
                          if (e.target.value === '') {
                            setNewAppointment({...newAppointment, patientId: ''});
                          }
                        }}
                        onFocus={() => setShowPatientResults(true)}
                      />
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {showPatientResults && patientSearchTerm.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto custom-scrollbar">
                        {patients.filter(p => 
                          p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                          (p.phone || '').includes(patientSearchTerm) ||
                          (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())
                        ).length > 0 ? (
                          patients.filter(p => 
                            p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                            (p.phone || '').includes(patientSearchTerm) ||
                            (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())
                          ).map(p => (
                            <div 
                              key={p.id} 
                              className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                              onClick={() => {
                                setNewAppointment({...newAppointment, patientId: p.id});
                                setPatientSearchTerm(p.name);
                                setShowPatientResults(false);
                              }}
                            >
                              <div>
                                <p className="text-sm font-medium">{p.name}</p>
                                <p className="text-[10px] text-muted-foreground">{p.phone} • MRN: {p.mrn}</p>
                              </div>
                              {newAppointment.patientId === p.id && <CheckCircle2 className="w-4 h-4 text-medical-blue" />}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No patients found.
                            {!isDoctor && (
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="text-medical-blue block mx-auto"
                                onClick={() => {
                                  setIsAppointmentOpen(false);
                                  setIsRegisterOpen(true);
                                  setNewPatient({...newPatient, name: patientSearchTerm});
                                }}
                              >
                                Register New Patient
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {newAppointment.patientId && patients.find(p => isPatientIdMatch(p.id, newAppointment.patientId)) && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-blue-700 truncate">
                            {patients.find(p => isPatientIdMatch(p.id, newAppointment.patientId))?.name}
                          </p>
                          <p className="text-[10px] text-blue-600 truncate">
                            {patients.find(p => isPatientIdMatch(p.id, newAppointment.patientId))?.age} yrs • {patients.find(p => isPatientIdMatch(p.id, newAppointment.patientId))?.gender} • MRN: {patients.find(p => isPatientIdMatch(p.id, newAppointment.patientId))?.mrn}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-blue-400 hover:text-blue-600 hover:bg-blue-100"
                          onClick={() => {
                            setNewAppointment({...newAppointment, patientId: ''});
                            setPatientSearchTerm('');
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Doctor</Label>
                    <Select 
                      value={newAppointment.doctor}
                      onValueChange={(v) => {
                        setNewAppointment({...newAppointment, doctor: v});
                        const matchedDoc = users.find(u => u.name === v || u.id === v);
                        if (matchedDoc) {
                          const fee = matchedDoc.consultationFee !== undefined && matchedDoc.consultationFee !== null
                            ? Number(matchedDoc.consultationFee)
                            : 500;
                          setSelectedApptFees(prev => ({
                            ...prev,
                            consult: {
                              ...prev.consult,
                              amount: fee
                            }
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON').map(doc => (
                          <SelectItem key={doc.id} value={doc.name}>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input 
                        type="date" 
                        value={newAppointment.date}
                        onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time Slot</Label>
                      <Input 
                        type="time" 
                        value={newAppointment.time}
                        onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="border bg-slate-50/50 p-4 rounded-xl space-y-3">
                    <Label className="text-xs font-black uppercase text-slate-500 tracking-wider">Applicable Fees / Charges Config</Label>
                    <p className="text-[10px] text-muted-foreground mb-2">Check to enable one or more than one applicable fees for this appointment, and edit amounts if needed.</p>
                    
                    {/* Row 2: Appt Fee */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <input 
                          id="appt-appt-fee-chk"
                          type="checkbox" 
                          checked={selectedApptFees.appt.checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedApptFees({
                              ...selectedApptFees, 
                              appt: { ...selectedApptFees.appt, checked: isChecked }
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-medical-blue focus:ring-medical-blue cursor-pointer"
                        />
                        <Label htmlFor="appt-appt-fee-chk" className="text-xs font-black text-slate-700 cursor-pointer">Appointment Fee</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">₹</span>
                        <Input 
                          type="number"
                          value={selectedApptFees.appt.amount}
                          onChange={(e) => setSelectedApptFees({
                            ...selectedApptFees, 
                            appt: { ...selectedApptFees.appt, amount: Number(e.target.value) }
                          })}
                          className="w-24 h-8 text-xs text-right font-bold bg-white"
                        />
                      </div>
                    </div>

                    {/* Row 3: Consult Fee */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <input 
                          id="appt-consult-fee-chk"
                          type="checkbox" 
                          checked={selectedApptFees.consult.checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedApptFees({
                              ...selectedApptFees, 
                              consult: { ...selectedApptFees.consult, checked: isChecked }
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-medical-blue focus:ring-medical-blue cursor-pointer"
                        />
                        <Label htmlFor="appt-consult-fee-chk" className="text-xs font-black text-slate-700 cursor-pointer">OPD Consultation Fee</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">₹</span>
                        <Input 
                          type="number"
                          value={selectedApptFees.consult.amount}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSelectedApptFees({
                              ...selectedApptFees, 
                              consult: { ...selectedApptFees.consult, amount: val }
                            });
                            setAppointmentFee(val);
                          }}
                          className="w-24 h-8 text-xs text-right font-bold bg-white"
                        />
                      </div>
                    </div>

                    {/* Summary Total */}
                    <div className="flex justify-between items-center border-t border-slate-200 mt-2 pt-2 text-xs font-black text-slate-700 uppercase tracking-widest">
                      <span>Total Assigned Charges</span>
                      <span className="text-medical-blue text-sm font-black">
                        ₹{(
                          (selectedApptFees.reg.checked ? selectedApptFees.reg.amount : 0) +
                          (selectedApptFees.appt.checked ? selectedApptFees.appt.amount : 0) +
                          (selectedApptFees.consult.checked ? selectedApptFees.consult.amount : 0)
                        )}
                      </span>
                    </div>

                    {Number(newAppointment.discountAmount || 0) > 0 && (
                      <div className="flex justify-between items-center text-xs font-black text-amber-600 uppercase tracking-widest mt-1">
                        <span>Discount Applied</span>
                        <span>-₹{Number(newAppointment.discountAmount || 0)}</span>
                      </div>
                    )}

                    {Number(newAppointment.discountAmount || 0) > 0 && (
                      <div className="flex justify-between items-center border-t border-dashed border-slate-300 text-xs font-black text-slate-800 uppercase tracking-widest mt-1 pt-1">
                        <span>Net Total</span>
                        <span className="text-emerald-600 font-extrabold text-sm">
                          ₹{Math.max(0, (
                            (selectedApptFees.reg.checked ? selectedApptFees.reg.amount : 0) +
                            (selectedApptFees.appt.checked ? selectedApptFees.appt.amount : 0) +
                            (selectedApptFees.consult.checked ? selectedApptFees.consult.amount : 0)
                          ) - Number(newAppointment.discountAmount || 0))}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 border bg-amber-50/40 p-4 rounded-xl">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-amber-700 tracking-wider">Discount (₹)</Label>
                      <Input 
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newAppointment.discountAmount || '0'}
                        onChange={(e) => setNewAppointment({...newAppointment, discountAmount: e.target.value})}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-amber-700 tracking-wider">Authorized / Given By</Label>
                      <Input 
                        placeholder={currentUser?.name || "Select staff"}
                        value={newAppointment.discountGivenBy || ''}
                        onChange={(e) => setNewAppointment({...newAppointment, discountGivenBy: e.target.value})}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority / Urgency</Label>
                    <Select 
                      value={newAppointment.urgency}
                      onValueChange={(v) => setNewAppointment({...newAppointment, urgency: v})}
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
                <DialogFooter className="shrink-0 mt-auto pt-2 border-t">
                  <Button variant="outline" onClick={() => setIsAppointmentOpen(false)}>Cancel</Button>
                  <Button className="bg-medical-blue" onClick={handleBookAppointment}>Confirm Booking & Token</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          {!isAccountant && !isDoctor && (
            <Dialog open={isRegisterOpen} onOpenChange={handleOpenRegisterChange}>
              <DialogTrigger asChild>
                <Button className="bg-medical-blue gap-2">
                  <UserPlus className="w-4 h-4" />
                  New Registration
                </Button>
              </DialogTrigger>
              <DialogContent 
                className="sm:max-w-[700px] max-h-[96vh] flex flex-col"
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                }}
              >
                <DialogHeader className="shrink-0 mb-1">
                  <DialogTitle>{editingPatient ? 'Edit Patient Information' : 'Patient Registration'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[calc(96vh-170px)]">
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input 
                        id="name" 
                        placeholder="Enter patient name" 
                        value={newPatient.name}
                        onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        placeholder="Enter phone number" 
                        value={newPatient.phone}
                        onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email"
                        placeholder="patient@example.com" 
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input 
                        id="dob" 
                        type="date" 
                        value={newPatient.dob}
                        onChange={(e) => {
                          const dob = e.target.value;
                          const age = calculateAge(dob);
                          setNewPatient({...newPatient, dob, age});
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age (Auto-calculated)</Label>
                      <Input 
                        id="age" 
                        type="number" 
                        placeholder="Age" 
                        value={newPatient.age}
                        onChange={(e) => setNewPatient({...newPatient, age: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select 
                        value={newPatient.gender}
                        onValueChange={(v) => setNewPatient({...newPatient, gender: v})}
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
                    <div className="space-y-2">
                      <Label htmlFor="bloodGroup">Blood Group</Label>
                      <Select 
                        value={newPatient.bloodGroup}
                        onValueChange={(v) => setNewPatient({...newPatient, bloodGroup: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                        <SelectContent>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardianName">Guardian Name</Label>
                      <Input 
                        id="guardianName" 
                        placeholder="Guardian Name" 
                        value={newPatient.guardianName}
                        onChange={(e) => setNewPatient({...newPatient, guardianName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fatherName">Father's Name</Label>
                      <Input 
                        id="fatherName" 
                        placeholder="Father's Name" 
                        value={newPatient.fatherName}
                        onChange={(e) => setNewPatient({...newPatient, fatherName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fatherPhone">Father's Phone Number</Label>
                      <Input 
                        id="fatherPhone" 
                        placeholder="Father's Phone" 
                        value={newPatient.fatherPhone}
                        onChange={(e) => setNewPatient({...newPatient, fatherPhone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motherName">Mother's Name</Label>
                      <Input 
                        id="motherName" 
                        placeholder="Mother's Name" 
                        value={newPatient.motherName}
                        onChange={(e) => setNewPatient({...newPatient, motherName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motherPhone">Mother's Phone Number</Label>
                      <Input 
                        id="motherPhone" 
                        placeholder="Mother's Phone" 
                        value={newPatient.motherPhone}
                        onChange={(e) => setNewPatient({...newPatient, motherPhone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="husbandName">Husband's Name</Label>
                      <Input 
                        id="husbandName" 
                        placeholder="Husband's Name" 
                        value={newPatient.husbandName}
                        onChange={(e) => setNewPatient({...newPatient, husbandName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="husbandPhone">Husband's Phone Number</Label>
                      <Input 
                        id="husbandPhone" 
                        placeholder="Husband's Phone" 
                        value={newPatient.husbandPhone}
                        onChange={(e) => setNewPatient({...newPatient, husbandPhone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="urgency">Urgency</Label>
                      <Select 
                        value={newPatient.urgency}
                        onValueChange={(v) => setNewPatient({...newPatient, urgency: v})}
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
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input 
                        id="address" 
                        placeholder="Full residential address" 
                        value={newPatient.address}
                        onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tpaId">TPA (Number) ID</Label>
                      <Input 
                        id="tpaId" 
                        placeholder="TPA ID" 
                        value={newPatient.tpaId}
                        onChange={(e) => setNewPatient({...newPatient, tpaId: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tpaValidity">TPA Validity</Label>
                      <Input 
                        id="tpaValidity" 
                        type="date"
                        value={newPatient.tpaValidity}
                        onChange={(e) => setNewPatient({...newPatient, tpaValidity: e.target.value})}
                      />
                    </div>

                    <div className="col-span-2 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <input 
                          type="checkbox" 
                          id="isReferral" 
                          className="h-4 w-4 rounded border-slate-300 text-medical-blue focus:ring-medical-blue cursor-pointer"
                          checked={newPatient.isReferral}
                          onChange={(e) => setNewPatient({...newPatient, isReferral: e.target.checked})}
                        />
                        <div className="grid gap-1.5 leading-none cursor-pointer select-none" onClick={() => setNewPatient({...newPatient, isReferral: !newPatient.isReferral})}>
                          <Label htmlFor="isReferral" className="font-semibold text-slate-800 cursor-pointer">Referral Case</Label>
                          <p className="text-xs text-slate-500">Mark if this patient was referred by another doctor/clinic.</p>
                        </div>
                      </div>

                      {newPatient.isReferral && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <Label htmlFor="referredBy" className="font-medium text-slate-700">Referred By (Doctor / Hospital)</Label>
                          <Input 
                            id="referredBy" 
                            placeholder="e.g., Dr. John Smith / Apex Clinic" 
                            value={newPatient.referredBy}
                            onChange={(e) => setNewPatient({...newPatient, referredBy: e.target.value})}
                            className="border-slate-300 focus:border-medical-blue focus:ring-medical-blue"
                          />
                        </div>
                      )}
                    </div>

                    <div className="col-span-2 border-t pt-4 mt-2 grid grid-cols-1 gap-4">
                      <div className="flex items-center space-x-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                        <input 
                          type="checkbox" 
                          id="bookImmediateAppointment" 
                          className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={newPatient.bookImmediateAppointment}
                          onChange={(e) => setNewPatient({...newPatient, bookImmediateAppointment: e.target.checked})}
                        />
                        <div className="grid gap-1.5 leading-none cursor-pointer select-none" onClick={() => setNewPatient({...newPatient, bookImmediateAppointment: !newPatient.bookImmediateAppointment})}>
                          <Label htmlFor="bookImmediateAppointment" className="font-bold text-indigo-900 cursor-pointer flex items-center gap-1.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                            Book Appointment Immediately
                          </Label>
                          <p className="text-xs text-indigo-700">Check this to book an OPD appointment for this patient in one go.</p>
                        </div>
                      </div>

                      {newPatient.bookImmediateAppointment && (
                        <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <h4 className="text-xs font-black uppercase text-indigo-800 tracking-wider">OPD Appointment Details</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="font-bold text-indigo-900">Doctor *</Label>
                              <Select 
                                value={newPatient.appointmentDoctor}
                                onValueChange={(v) => setNewPatient({...newPatient, appointmentDoctor: v})}
                              >
                                <SelectTrigger className="bg-white border-indigo-200">
                                  <SelectValue placeholder="Select doctor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {users.filter(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON').map(doc => (
                                    <SelectItem key={doc.id} value={doc.name}>
                                      <div className="flex flex-col">
                                        <span className="font-medium text-slate-900">{doc.name} {doc.degree ? ` - ${doc.degree}` : ''}</span>
                                        <span className="text-[10px] text-indigo-600">
                                          {doc.department} {doc.specialization ? `• ${doc.specialization}` : ''} {doc.consultationFee ? `• ₹${doc.consultationFee}` : ''}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="font-bold text-indigo-900">Urgency</Label>
                              <Select 
                                value={newPatient.appointmentUrgency}
                                onValueChange={(v) => setNewPatient({...newPatient, appointmentUrgency: v})}
                              >
                                <SelectTrigger className="bg-white border-indigo-200">
                                  <SelectValue placeholder="Select urgency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Routine">🟢 Routine</SelectItem>
                                  <SelectItem value="Urgent">🟡 Urgent</SelectItem>
                                  <SelectItem value="Emergency">🔴 Emergency</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="font-bold text-indigo-900">Date</Label>
                              <Input 
                                type="date" 
                                value={newPatient.appointmentDate}
                                onChange={(e) => setNewPatient({...newPatient, appointmentDate: e.target.value})}
                                className="bg-white border-indigo-200"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="font-bold text-indigo-900">Time Slot</Label>
                              <Input 
                                type="time" 
                                value={newPatient.appointmentTime}
                                onChange={(e) => setNewPatient({...newPatient, appointmentTime: e.target.value})}
                                className="bg-white border-indigo-200"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>


                  </div>
                </div>
                <DialogFooter className="shrink-0 mt-auto pt-2 border-t gap-2 flex-wrap sm:justify-end">
                  <Button variant="outline" onClick={() => setIsRegisterOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  {editingPatient ? (
                    <Button className="bg-medical-blue font-semibold" onClick={() => handleRegistration(true)} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </Button>
                  ) : (
                    <>
                      <Button className="bg-medical-blue font-semibold text-white hover:bg-blue-700" onClick={() => handleRegistration(true)} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Registering...
                          </>
                        ) : 'Register Patient'}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <Button 
          variant={activeTab === 'queue' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('queue')}
          className={activeTab === 'queue' ? 'bg-white shadow-sm' : ''}
        >
          Live Queue
        </Button>
        <Button 
          variant={activeTab === 'appointments' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('appointments')}
          className={activeTab === 'appointments' ? 'bg-white shadow-sm' : ''}
        >
          Appointments
        </Button>
        <Button 
          variant={activeTab === 'patients' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('patients')}
          className={activeTab === 'patients' ? 'bg-white shadow-sm' : ''}
        >
          Patient Records
        </Button>
        <Button 
          variant={activeTab === 'summary' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setActiveTab('summary')}
          className={activeTab === 'summary' ? 'bg-white shadow-sm' : ''}
        >
          OPD Summary
        </Button>
      </div>

      {activeTab === 'summary' ? (
        <OPDSummaryView appointments={appointments} users={users} />
      ) : (
        <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, MRN, or phone..." 
                className="pl-10 bg-slate-50 border-none" 
                value={patientRecordsSearchQuery}
                onChange={(e) => setPatientRecordsSearchQuery(e.target.value)}
              />
            </div>
            {(activeTab === 'queue' || activeTab === 'appointments') && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">Doctor:</Label>
                  <Select value={selectedDoctorFilter} onValueChange={setSelectedDoctorFilter}>
                    <SelectTrigger className="w-[160px] h-9 bg-slate-50 border-none">
                      <SelectValue placeholder="All Doctors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Doctors</SelectItem>
                      {users.filter(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON').map(doc => (
                        <SelectItem key={doc.id} value={doc.name}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">Date:</Label>
                  <Input 
                    type="date" 
                    className="w-[140px] h-9 bg-slate-50 border-none text-xs" 
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                  />
                  {selectedDateFilter && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-xs"
                      onClick={() => setSelectedDateFilter('')}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">From:</Label>
                  <Input 
                    type="date" 
                    className="w-[140px] h-9 bg-slate-50 border-none text-xs" 
                    value={fromDateFilter}
                    onChange={(e) => setFromDateFilter(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">To:</Label>
                  <Input 
                    type="date" 
                    className="w-[140px] h-9 bg-slate-50 border-none text-xs" 
                    value={toDateFilter}
                    onChange={(e) => setToDateFilter(e.target.value)}
                  />
                  {(fromDateFilter || toDateFilter) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-xs"
                      onClick={() => {
                        setFromDateFilter('');
                        setToDateFilter('');
                      }}
                    >
                      Clear Range
                    </Button>
                  )}
                </div>
              </>
            )}
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div 
            className="overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar relative" 
          >
            {activeTab === 'patients' ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[10%] whitespace-nowrap">MRN</TableHead>
                    <TableHead className="w-[20%] whitespace-nowrap">Patient Name</TableHead>
                    <TableHead className="w-[15%] whitespace-nowrap">Age/Gender</TableHead>
                    <TableHead className="w-[15%] whitespace-nowrap">Contact</TableHead>
                    <TableHead className="w-[15%] whitespace-nowrap">Last Visit</TableHead>
                    <TableHead className="w-[25%] text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.filter(p => {
                    // If the logged-in user is a doctor, filter the patients to only those assigned to them
                    if (currentUser && (currentUser.role?.toUpperCase() === 'DOCTOR' || currentUser.role?.toUpperCase() === 'SURGEON')) {
                      const docIdStr = String(currentUser.id).toLowerCase();
                      const docNameStr = String(currentUser.name || '').toLowerCase();
                      
                      const isAssigned = 
                        (p.attending_doctor_id && String(p.attending_doctor_id).toLowerCase() === docIdStr) ||
                        (p.attendingDoctorId && String(p.attendingDoctorId).toLowerCase() === docIdStr);
                        
                      const hasAppointment = appointments.some((apt: any) => {
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
                      
                      if (!isAssigned && !hasAppointment) return false;
                    }

                    if (!patientRecordsSearchQuery.trim()) return true;
                    const query = patientRecordsSearchQuery.toLowerCase();
                    return (p.name || '').toLowerCase().includes(query) ||
                           (p.mrn || '').toLowerCase().includes(query) ||
                           (p.phone || '').includes(query);
                  })
                  .sort((a, b) => {
                    const dateA = new Date(a.created_at || a.registration_date || 0).getTime();
                    const dateB = new Date(b.created_at || b.registration_date || 0).getTime();
                    return dateB - dateA;
                  })
                  .slice((patientsPage - 1) * itemsPerPage, patientsPage * itemsPerPage)
                  .map((patient) => (
                    <TableRow key={patient.id} className="border-slate-50">
                      <TableCell className="font-bold text-medical-blue whitespace-nowrap">{patient.mrn}</TableCell>
                      <TableCell className={cn(
                        "font-medium whitespace-nowrap transition-colors duration-150",
                        (patient.needsAdmission || patient.needs_admission || patient.status === 'Admitting' || patient.status === 'Admitted') 
                          ? "bg-amber-50/80 border-l-2 border-l-amber-500" 
                          : ""
                      )}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-800">{patient.name}</span>
                          {(patient.needsAdmission || patient.needs_admission || patient.status === 'Admitting' || patient.status === 'Admitted') ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 max-w-max">
                              Transferred to IPD ({patient.status || 'Pending'})
                            </span>
                          ) : (patient.isReferral || patient.is_referral) ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 max-w-max">
                              <ArrowUpRight className="w-2.5 h-2.5 text-teal-500" />
                              Ref: {patient.referredBy || patient.referred_by || 'Yes'}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{patient.age}Y / {patient.gender}</TableCell>
                      <TableCell className="whitespace-nowrap">{patient.phone}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(patient.created_at || patient.registration_date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-medical-blue" 
                            title="Patient 360 Overview"
                            onClick={() => navigate(`/patient-overview?id=${patient.id}`)}
                          >
                            <User className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-medical-blue" 
                            title="View Details"
                            onClick={() => {
                              setSelectedPatient(patient);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!isAccountant && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-medical-blue h-8 gap-1.5 whitespace-nowrap font-medium hover:bg-blue-50/50" 
                              onClick={() => {
                                startBookAppointmentForPatient(patient);
                              }}
                            >
                              <CalendarIcon className="w-4 h-4 text-medical-blue" />
                              Book Appointment
                            </Button>
                          )}
                          {(canUserEditClinicalData(currentUser?.role) || normalizeRole(currentUser?.role) === 'RECEPTIONIST') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-emerald-600 h-8 gap-1.5 whitespace-nowrap" 
                              onClick={() => {
                                openPrescriptionModal(patient);
                              }}
                            >
                              <FileText className="w-4 h-4" />
                              {isReceptionist ? "Record Vitals" : "Prescription"}
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-amber-600 h-8 gap-1.5 whitespace-nowrap" 
                            onClick={() => {
                              setSelectedPatient(patient);
                              loadPatientHistory(patient.id);
                              setIsHistoryOpen(true);
                            }}
                          >
                            <History className="w-4 h-4" />
                            History
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-emerald-600 h-8 gap-1.5 whitespace-nowrap" 
                            onClick={() => {
                              printLatestPrescriptionForPatient(patient);
                            }}
                          >
                            <Printer className="w-4 h-4" />
                            Print Rx
                          </Button>
                          {!isAccountant && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-medical-blue h-8 whitespace-nowrap font-bold hover:bg-blue-50" 
                              onClick={async () => {
                                try {
                                  const result = await supabaseService.updatePatient(patient.id, { 
                                    status: 'Admitting', 
                                    registrationType: 'OPD/IPD', 
                                    needsAdmission: true 
                                  });
                                  const updatedPatients = patients.map(p => 
                                    p.id === patient.id ? { ...p, ...result, status: 'Admitting', registrationType: 'OPD/IPD', needsAdmission: true } : p
                                  );
                                  setPatients(updatedPatients);
                                  storage.set(STORAGE_KEYS.PATIENTS, updatedPatients);
                                  window.dispatchEvent(new Event('storage'));
                                  window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patients', action: 'update' } }));
                                  toast.success(`${patient.name} marked for IPD Admission. You can now assign a bed in IPD Management.`);
                                } catch (err: any) {
                                  console.error('Error transferring to IPD:', err);
                                  toast.error('Failed to transfer patient to IPD');
                                }
                              }}
                            >
                              <ArrowUpRight className="w-4 h-4 mr-1.5" />
                              Transfer to IPD
                            </Button>
                          )}
                          {!isAccountant && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue" onClick={() => startEditPatient(patient)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {!isAccountant && !isDeleteForbidden && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDeletePatient(patient.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="whitespace-nowrap">Appt No.</TableHead>
                    <TableHead className="whitespace-nowrap">Token</TableHead>
                    <TableHead className="whitespace-nowrap">Patient</TableHead>
                    <TableHead className="whitespace-nowrap">Doctor</TableHead>
                    <TableHead className="whitespace-nowrap">Department</TableHead>
                    <TableHead className="whitespace-nowrap">Date & Time</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Payment</TableHead>
                    <TableHead className="whitespace-nowrap">Urgency</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments
                    .filter(apt => {
                      const aptDate = typeof apt.appointment_date === 'string' ? apt.appointment_date : new Date(apt.appointment_date).toLocaleDateString('sv').split(' ')[0];
                      
                      // Filter by Date Range if specified
                      if (fromDateFilter || toDateFilter) {
                        if (fromDateFilter && aptDate < fromDateFilter) {
                          return false;
                        }
                        if (toDateFilter && aptDate > toDateFilter) {
                          return false;
                        }
                        return true;
                      }

                      if (activeTab === 'queue') {
                        const targetDate = selectedDateFilter || getLocalDateString();
                        return aptDate === targetDate;
                      }
                      // For appointments tab:
                      if (selectedDateFilter) {
                        return aptDate === selectedDateFilter;
                      }
                      return true; // Show all for 'appointments' tab
                    })
                    .filter(apt => {
                      if (selectedDoctorFilter !== 'all') {
                        const docObj = users.find(u => u.name === selectedDoctorFilter);
                        const docId = docObj?.id;
                        const isMe = (apt.doctor || apt.doctorName) === selectedDoctorFilter || (docId && (apt.doctor_id === docId || apt.doctorId === docId));
                        
                        // Check if the patient of this appointment is assigned to this doctor
                        const pId = apt.patient_id || apt.patientId;
                        const patient = patients.find(p => isPatientIdMatch(p.id, pId));
                        const isAssignedToMe = patient && (
                          (patient.attending_doctor_id && docId && String(patient.attending_doctor_id).toLowerCase() === String(docId).toLowerCase()) ||
                          (patient.attendingDoctorId && docId && String(patient.attendingDoctorId).toLowerCase() === String(docId).toLowerCase()) ||
                          (patient.attending_doctor_id && String(patient.attending_doctor_id).toLowerCase() === String(selectedDoctorFilter).toLowerCase()) ||
                          (patient.attendingDoctorId && String(patient.attendingDoctorId).toLowerCase() === String(selectedDoctorFilter).toLowerCase())
                        );
                        
                        return isMe || isAssignedToMe;
                      }
                      return true;
                    })
                    .filter(apt => {
                      if (!patientRecordsSearchQuery.trim()) return true;
                      const query = patientRecordsSearchQuery.toLowerCase();
                      return (apt.patientName || '').toLowerCase().includes(query) ||
                             (apt.patientMrn || '').toLowerCase().includes(query) ||
                             (apt.doctor || apt.doctorName || '').toLowerCase().includes(query);
                    })
                    .sort((a, b) => {
                      const timeA = getAppointmentTimestamp(a.appointment_date || a.date, a.appointment_time || a.time);
                      const timeB = getAppointmentTimestamp(b.appointment_date || b.date, b.appointment_time || b.time);
                      return timeA - timeB;
                    })
                    .slice((appointmentsPage - 1) * itemsPerPage, appointmentsPage * itemsPerPage)
                    .map((apt, i) => (
                      <TableRow key={apt.id} className="border-slate-50">
                        <TableCell className="font-bold text-slate-500 whitespace-nowrap">
                          #{appointmentSeqMap[apt.id] ? (1000 + appointmentSeqMap[apt.id]) : (100 + ((appointmentsPage - 1) * itemsPerPage) + i + 1)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center justify-center font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-xs">
                            TK-{opdTokenMap[apt.id] || 1}
                          </span>
                        </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div>
                          <p className="font-medium">{apt.patientName}</p>
                          <p className="text-xs text-muted-foreground">MRN: {apt.patientMrn}</p>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{apt.doctor || apt.doctorName || 'Duty Doctor'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          {users.find(u => u.name === (apt.doctor || apt.doctorName) || u.id === apt.doctor_id)?.department || apt.doctorDepartment || 'General Medicine'}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(apt.appointment_date || apt.date)}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {apt.appointment_time || '10:00 AM'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none">
                          {apt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant="outline" 
                            className={`${
                              apt.payment_status === 'Refunded' 
                                ? 'bg-slate-100 text-slate-600 border-slate-200' 
                                : apt.payment_status === 'Paid' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : 'bg-rose-50 text-rose-600 border-rose-100'
                            } border-none w-fit py-0.5 px-2 text-[10px] font-bold`}
                          >
                            {apt.payment_status === 'Refunded' 
                              ? 'Refunded' 
                              : (apt.payment_status || 'Pending') === 'Paid' 
                                ? 'Paid' 
                                : 'Pending'
                            }
                          </Badge>
                          <div className="text-[11px] space-y-0.5 text-slate-600 font-medium">
                            <div>Base Fee: <span className="font-semibold text-slate-800">₹{apt.fee || appointmentFee}</span></div>
                            {(apt.discount_amount || apt.discountAmount || 0) > 0 && (
                              <>
                                <div className="text-amber-600 font-semibold font-bold">Discount: <span>-₹{apt.discount_amount || apt.discountAmount}</span></div>
                                <div className="border-t border-slate-100 pt-0.5 text-emerald-600 font-bold">
                                  Net Paid: <span>₹{Math.max(0, (apt.fee || appointmentFee) - (apt.discount_amount || apt.discountAmount || 0))}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge className={`${getUrgencyColor(apt.urgency as string)} border-none py-0 h-5 text-[10px]`}>
                          {apt.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {apt.payment_status === 'Paid' ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-[10px] font-black uppercase tracking-wider text-amber-600 border-amber-100 hover:bg-amber-50 px-2"
                              onClick={() => handleRefundAppointment(apt.id)}
                            >
                              Refund ₹{Math.max(0, (apt.fee || appointmentFee) - (apt.discount_amount || apt.discountAmount || 0))}
                            </Button>
                          ) : apt.payment_status !== 'Refunded' ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-[10px] font-black uppercase tracking-wider text-emerald-600 border-emerald-100 hover:bg-emerald-50 bg-emerald-50/50 px-2"
                              onClick={() => handlePayAppointment(apt.id)}
                            >
                              Collect ₹{Math.max(0, (apt.fee || appointmentFee) - (apt.discount_amount || apt.discountAmount || 0))}
                            </Button>
                          ) : null}
                          {(canUserEditClinicalData(currentUser?.role) || isReceptionist) && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-emerald-600" 
                              title={isReceptionist ? "Record Vitals" : "Write Prescription"}
                              onClick={() => {
                                const patient = patients.find(p => isPatientIdMatch(p.id, apt.patientId)) || 
                                                patients.find(p => p.name === apt.patientName) ||
                                                patients.find(p => p.mrn === apt.patientMrn);
                                if (patient) {
                                  openPrescriptionModal(patient);
                                } else {
                                  // Dynamic transient fallback patient so that the button is always active and functional
                                  const fallbackPatient = {
                                    id: apt.patientId || `temp-${Math.random().toString(36).substring(2, 11)}`,
                                    name: apt.patientName || 'Unknown Patient',
                                    mrn: apt.patientMrn || 'N/A',
                                    age: apt.age || apt.patientAge || '30',
                                    gender: apt.gender || apt.patientGender || 'Male',
                                    phone: apt.phone || apt.patientPhone || 'N/A'
                                  };
                                  openPrescriptionModal(fallbackPatient);
                                }
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                          {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DOCTOR' || currentUser?.role === 'NURSE' || currentUser?.role === 'RECEPTIONIST' || currentUser?.role === 'RECEPTION' || currentUser?.role === 'FRONT_DESK' || currentUser?.role === 'ACCOUNTANT' || currentUser?.role === 'ACCOUNTS') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-amber-600 hover:bg-amber-50" 
                              title="Patient Clinical History"
                              onClick={() => {
                                const patient = patients.find(p => isPatientIdMatch(p.id, apt.patientId));
                                if (patient) {
                                  setSelectedPatient(patient);
                                  loadPatientHistory(patient.id);
                                  setIsHistoryOpen(true);
                                } else {
                                  toast.error('Patient record not found');
                                }
                              }}
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          )}
                          {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DOCTOR' || currentUser?.role === 'NURSE' || currentUser?.role === 'RECEPTIONIST' || currentUser?.role === 'RECEPTION' || currentUser?.role === 'FRONT_DESK' || currentUser?.role === 'ACCOUNTANT' || currentUser?.role === 'ACCOUNTS') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" 
                              title="Print Latest Prescription"
                              onClick={() => {
                                const patient = patients.find(p => isPatientIdMatch(p.id, apt.patientId)) || 
                                                patients.find(p => p.name === apt.patientName) ||
                                                patients.find(p => p.mrn === apt.patientMrn) || {
                                                  id: apt.patientId || `temp-${Math.random().toString(36).substring(2, 11)}`,
                                                  name: apt.patientName || 'Unknown Patient',
                                                  mrn: apt.patientMrn || 'N/A',
                                                  age: apt.age || apt.patientAge || '30',
                                                  gender: apt.gender || apt.patientGender || 'Male',
                                                  phone: apt.phone || apt.patientPhone || 'N/A'
                                                };
                                printLatestPrescriptionForPatient(patient, apt.doctor);
                              }}
                            >
                              <FileText className="w-4 h-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => printAppointmentToken(apt)}>
                            <Printer className="w-4 h-4" />
                          </Button>
                          {!isAccountant && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue" onClick={() => startEditAppointment(apt)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {!isAccountant && !isDeleteForbidden && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteAppointment(apt.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {activeTab === 'patients' && (() => {
            const totalCount = patients.filter(p => {
              if (currentUser && (currentUser.role?.toUpperCase() === 'DOCTOR' || currentUser.role?.toUpperCase() === 'SURGEON')) {
                const docIdStr = String(currentUser.id).toLowerCase();
                const docNameStr = String(currentUser.name || '').toLowerCase();
                const isAssigned = (p.attending_doctor_id && String(p.attending_doctor_id).toLowerCase() === docIdStr) || (p.attendingDoctorId && String(p.attendingDoctorId).toLowerCase() === docIdStr);
                const hasAppointment = appointments.some((apt: any) => {
                  const pId = apt.patient_id || apt.patientId;
                  if (pId !== p.id) return false;
                  const aptDocId = apt.doctor_id || apt.doctorId;
                  const aptDocName = apt.doctor || apt.doctorName || '';
                  return (aptDocId && String(aptDocId).toLowerCase() === docIdStr) || (aptDocName && String(aptDocName).toLowerCase() === docNameStr);
                });
                if (!isAssigned && !hasAppointment) return false;
              }
              if (!patientRecordsSearchQuery.trim()) return true;
              const query = patientRecordsSearchQuery.toLowerCase();
              return (p.name || '').toLowerCase().includes(query) || (p.mrn || '').toLowerCase().includes(query) || (p.phone || '').includes(query);
            }).length;
            
            if (totalCount > 0) {
              return (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="text-xs text-slate-500">
                    Showing <strong>{Math.min(totalCount, (patientsPage - 1) * itemsPerPage + 1)}</strong> to{' '}
                    <strong>{Math.min(totalCount, patientsPage * itemsPerPage)}</strong> of{' '}
                    <strong>{totalCount}</strong> entries
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => setPatientsPage(prev => Math.max(prev - 1, 1))}
                      disabled={patientsPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, idx) => idx + 1)
                      .filter(p => p === 1 || p === Math.ceil(totalCount / itemsPerPage) || Math.abs(p - patientsPage) <= 1)
                      .map((p, i, arr) => {
                        return (
                          <React.Fragment key={p}>
                            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-400 px-1 text-xs">...</span>}
                            <Button
                              variant={p === patientsPage ? 'default' : 'outline'}
                              size="sm"
                              className={`h-8 w-8 text-xs p-0 ${p === patientsPage ? 'bg-medical-blue hover:bg-medical-blue/90 text-white border-none' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                              onClick={() => setPatientsPage(p)}
                            >
                              {p}
                            </Button>
                          </React.Fragment>
                        );
                      })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => setPatientsPage(prev => Math.min(prev + 1, Math.ceil(totalCount / itemsPerPage)))}
                      disabled={patientsPage === Math.ceil(totalCount / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {activeTab !== 'patients' && activeTab !== 'summary' && (() => {
            const filteredApts = appointments
              .filter(apt => {
                const aptDate = typeof apt.appointment_date === 'string' ? apt.appointment_date : new Date(apt.appointment_date).toLocaleDateString('sv').split(' ')[0];
                if (fromDateFilter || toDateFilter) {
                  if (fromDateFilter && aptDate < fromDateFilter) return false;
                  if (toDateFilter && aptDate > toDateFilter) return false;
                }
                if (selectedDateFilter) {
                  return aptDate === selectedDateFilter;
                }
                return true;
              })
              .filter(apt => {
                if (selectedDoctorFilter !== 'all') {
                  const docObj = users.find(u => u.name === selectedDoctorFilter);
                  const docId = docObj?.id;
                  const isMe = (apt.doctor || apt.doctorName) === selectedDoctorFilter || (docId && (apt.doctor_id === docId || apt.doctorId === docId));
                  const pId = apt.patient_id || apt.patientId;
                  const patient = patients.find(p => isPatientIdMatch(p.id, pId));
                  const isAssignedToMe = patient && (
                    (patient.attending_doctor_id && docId && String(patient.attending_doctor_id).toLowerCase() === String(docId).toLowerCase()) ||
                    (patient.attendingDoctorId && docId && String(patient.attendingDoctorId).toLowerCase() === String(docId).toLowerCase()) ||
                    (patient.attending_doctor_id && String(patient.attending_doctor_id).toLowerCase() === String(selectedDoctorFilter).toLowerCase()) ||
                    (patient.attendingDoctorId && String(patient.attendingDoctorId).toLowerCase() === String(selectedDoctorFilter).toLowerCase())
                  );
                  return isMe || isAssignedToMe;
                }
                return true;
              })
              .filter(apt => {
                if (!patientRecordsSearchQuery.trim()) return true;
                const query = patientRecordsSearchQuery.toLowerCase();
                return (apt.patientName || '').toLowerCase().includes(query) || (apt.patientMrn || '').toLowerCase().includes(query) || (apt.doctor || apt.doctorName || '').toLowerCase().includes(query);
              });
            const totalCount = filteredApts.length;
            
            if (totalCount > 0) {
              return (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="text-xs text-slate-500">
                    Showing <strong>{Math.min(totalCount, (appointmentsPage - 1) * itemsPerPage + 1)}</strong> to{' '}
                    <strong>{Math.min(totalCount, appointmentsPage * itemsPerPage)}</strong> of{' '}
                    <strong>{totalCount}</strong> entries
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => setAppointmentsPage(prev => Math.max(prev - 1, 1))}
                      disabled={appointmentsPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, idx) => idx + 1)
                      .filter(p => p === 1 || p === Math.ceil(totalCount / itemsPerPage) || Math.abs(p - appointmentsPage) <= 1)
                      .map((p, i, arr) => {
                        return (
                          <React.Fragment key={p}>
                            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-400 px-1 text-xs">...</span>}
                            <Button
                              variant={p === appointmentsPage ? 'default' : 'outline'}
                              size="sm"
                              className={`h-8 w-8 text-xs p-0 ${p === appointmentsPage ? 'bg-medical-blue hover:bg-medical-blue/90 text-white border-none' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                              onClick={() => setAppointmentsPage(p)}
                            >
                              {p}
                            </Button>
                          </React.Fragment>
                        );
                      })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => setAppointmentsPage(prev => Math.min(prev + 1, Math.ceil(totalCount / itemsPerPage)))}
                      disabled={appointmentsPage === Math.ceil(totalCount / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </CardContent>
      </Card>
      )}
      {/* Merge Patient Confirmation Dialog */}
      <Dialog open={!!mergePatientData} onOpenChange={(open) => { if (!open) setMergePatientData(null); }}>
        <DialogContent 
          className="sm:max-w-[450px]"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
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
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={confirmMergeAndContinue}>
              Yes, Merge Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Patient Agreement Dialog */}
      <Dialog open={!!duplicateConfirm} onOpenChange={(open) => { if (!open) setDuplicateConfirm(null); }}>
        <DialogContent 
          id="opd-duplicate-confirm-dialog" 
          className="sm:max-w-[450px]"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Duplicate Entry Warning
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed">
              A potential duplicate entry has been detected under patient registration.
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
            <Button id="opd-duplicate-cancel-btn" variant="outline" onClick={() => setDuplicateConfirm(null)}>
              No, Cancel
            </Button>
            <Button id="opd-duplicate-confirm-btn" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
              const redirect = !!duplicateConfirm?.shouldRedirect;
              setDuplicateConfirm(null);
              handleRegistration(redirect, true);
            }}>
              Yes, I Agree & Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Success Dialog */}
      <Dialog open={isTokenSuccessOpen} onOpenChange={setIsTokenSuccessOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="text-center w-full px-2">
              <h3 className="text-xl font-bold text-slate-900 mb-1">Registration Success!</h3>
              <p className="text-sm text-emerald-600 font-semibold mb-3">Patient Registered Successfully</p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-left space-y-2 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="font-semibold text-slate-700">Patient Name:</span> 
                  <span className="font-bold text-slate-900">{lastToken?.patientName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="font-semibold text-slate-700">MRN:</span> 
                  <span className="font-mono text-medical-blue font-bold">{lastToken?.mrn}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="font-semibold text-slate-700">Token Number:</span> 
                  <span className="font-mono font-bold text-emerald-600">{lastToken?.tokenNumber}</span>
                </div>
                {lastToken?.fee ? (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">Registration Fee:</span> 
                    <span className="font-bold text-slate-900">₹{lastToken.fee}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="w-full flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 gap-2 border-slate-200" onClick={printToken}>
                <Printer className="w-4 h-4" />
                Print Token
              </Button>
              <Button className="flex-1 bg-medical-blue" onClick={() => setIsTokenSuccessOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Dialog */}
      <Dialog open={isPrescriptionOpen} onOpenChange={setIsPrescriptionOpen}>
        <DialogContent className="sm:max-w-[1100px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              {isReceptionist ? 'Enter Vitals / View Prescription' : 'Write Prescription'} - {selectedPatient?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-2">
            {/* Left side: prescription form input fields */}
            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Doctor</Label>
                  <Select disabled={isReceptionist} value={prescription.doctor} onValueChange={(v) => setPrescription({...prescription, doctor: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON').map(doc => (
                        <SelectItem key={doc.id} value={doc.name}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input disabled={isReceptionist} type="date" value={prescription.date} onChange={(e) => setPrescription({...prescription, date: e.target.value})} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">Medicines</Label>
                  {!isReceptionist && (
                    <Button variant="outline" size="sm" onClick={addMedicine} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                      <Plus className="w-4 h-4" />
                      Add Medicine
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {prescription.medicines.map((med, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="col-span-4 space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500">Medicine Name</Label>
                        <Input 
                          disabled={isReceptionist}
                          placeholder="e.g. Paracetamol" 
                          value={med.name} 
                          onChange={(e) => updateMedicine(idx, 'name', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500">Dosage</Label>
                        <Input 
                          disabled={isReceptionist}
                          placeholder="500mg" 
                          value={med.dosage} 
                          onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-3 space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500">Frequency</Label>
                        <Input 
                          disabled={isReceptionist}
                          placeholder="1-0-1" 
                          value={med.frequency} 
                          onChange={(e) => updateMedicine(idx, 'frequency', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500">Duration</Label>
                        <Input 
                          disabled={isReceptionist}
                          placeholder="5 days" 
                          value={med.duration} 
                          onChange={(e) => updateMedicine(idx, 'duration', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button disabled={isReceptionist} variant="ghost" size="icon" className="h-9 w-9 text-rose-500" onClick={() => removeMedicine(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Advice / Notes</Label>
                <Input 
                  disabled={isReceptionist}
                  placeholder="Any specific instructions..." 
                  value={prescription.advice}
                  onChange={(e) => setPrescription({...prescription, advice: e.target.value})}
                />
              </div>

              {/* Patient Vitals Entry Option */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-2">
                  <span className="font-bold text-xs uppercase text-slate-700 tracking-wider">Patient Vitals / Measurements</span>
                  <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-50 border-emerald-100 font-bold uppercase py-0 px-1.5 h-4">
                    Vitals Option
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-semibold">BP (mmHg)</Label>
                    <Input 
                      placeholder="e.g. 120/80" 
                      value={prescription.vitals?.bp || ''} 
                      onChange={(e) => setPrescription({
                        ...prescription,
                        vitals: { ...(prescription.vitals || {}), bp: e.target.value }
                      })}
                      className="h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-semibold">Pulse (/min)</Label>
                    <Input 
                      placeholder="e.g. 72" 
                      value={prescription.vitals?.pulse || ''} 
                      onChange={(e) => setPrescription({
                        ...prescription,
                        vitals: { ...(prescription.vitals || {}), pulse: e.target.value }
                      })}
                      className="h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-semibold">Temp (°F)</Label>
                    <Input 
                      placeholder="e.g. 98.6" 
                      value={prescription.vitals?.temp || ''} 
                      onChange={(e) => setPrescription({
                        ...prescription,
                        vitals: { ...(prescription.vitals || {}), temp: e.target.value }
                      })}
                      className="h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-semibold">SpO2 (%)</Label>
                    <Input 
                      placeholder="e.g. 98" 
                      value={prescription.vitals?.spo2 || ''} 
                      onChange={(e) => setPrescription({
                        ...prescription,
                        vitals: { ...(prescription.vitals || {}), spo2: e.target.value }
                      })}
                      className="h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-semibold">Weight (kg)</Label>
                    <Input 
                      placeholder="e.g. 65" 
                      value={prescription.vitals?.weight || ''} 
                      onChange={(e) => setPrescription({
                        ...prescription,
                        vitals: { ...(prescription.vitals || {}), weight: e.target.value }
                      })}
                      className="h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase font-semibold">Resp Rate (/min)</Label>
                    <Input 
                      placeholder="e.g. 18" 
                      value={prescription.vitals?.rr || ''} 
                      onChange={(e) => setPrescription({
                        ...prescription,
                        vitals: { ...(prescription.vitals || {}), rr: e.target.value }
                      })}
                      className="h-9 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Upload Written Prescription (PDF)</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    disabled={isReceptionist}
                    type="file" 
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                  {prescription.attachmentName && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                      {prescription.attachmentName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Interactive Patient Clinical History panel */}
            <div className="lg:col-span-5 bg-slate-50/20 p-1 rounded-xl border border-slate-100/80 flex flex-col justify-start min-h-[400px]">
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <History className="w-4 h-4 text-amber-500" />
                  Clinical History
                </span>
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 uppercase font-bold">
                  Past History Log
                </Badge>
              </div>

              <OPDPatientHistory 
                patient={selectedPatient}
                vitals={selectedPatientVitals}
                notes={selectedPatientNotes}
                prescriptions={savedPrescriptions}
                labRequests={selectedPatientLabs}
                loading={loadingHistory}
                onPrintPrescription={(rx) => {
                  const docObj = users.find(u => u.name === (rx.doctor || rx.doctor_name));
                  const latestVitals = selectedPatientVitals && selectedPatientVitals.length > 0 ? selectedPatientVitals[0] : undefined;

                  const html = getPrescriptionPrintHtml(
                    {
                      name: selectedPatient.name,
                      age: selectedPatient.age,
                      gender: selectedPatient.gender,
                      mrn: selectedPatient.mrn,
                      phone: selectedPatient.phone || selectedPatient.mobile || '',
                      fatherName: selectedPatient.fatherName || selectedPatient.father_name || ''
                    },
                    {
                      date: rx.date || rx.prescription_date,
                      medicines: rx.medicines || rx.medications || [],
                      advice: rx.advice || rx.notes || '',
                      vitals: latestVitals ? {
                        bp: latestVitals.bp,
                        pulse: latestVitals.pulse,
                        temp: latestVitals.temp,
                        spo2: latestVitals.spo2,
                        weight: latestVitals.weight,
                        rr: latestVitals.rr || latestVitals.respiration
                      } : undefined
                    },
                    docObj,
                    hospitalInfo
                  );
                  
                  safePrint(html, 800, 1000);
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4 border-t pt-4">
            <Button variant="outline" onClick={() => setIsPrescriptionOpen(false)}>Cancel</Button>
            <Button variant="outline" className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={printPrescription}>
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={handleSavePrescription}>
              <CheckCircle2 className="w-4 h-4" />
              {isReceptionist ? 'Save Vitals Only' : 'Save Prescription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prescription History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader className="border-b pb-3 mb-2">
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <History className="w-5 h-5 text-amber-500" />
              Patient Clinical History Dashboard - {selectedPatient?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <OPDPatientHistory 
              patient={selectedPatient}
              vitals={selectedPatientVitals}
              notes={selectedPatientNotes}
              prescriptions={savedPrescriptions}
              labRequests={selectedPatientLabs}
              loading={loadingHistory}
              onPrintPrescription={(rx) => {
                const docObj = users.find(u => u.name === (rx.doctor || rx.doctor_name));
                const latestVitals = selectedPatientVitals && selectedPatientVitals.length > 0 ? selectedPatientVitals[0] : undefined;

                const html = getPrescriptionPrintHtml(
                  {
                    name: selectedPatient.name,
                    age: selectedPatient.age,
                    gender: selectedPatient.gender,
                    mrn: selectedPatient.mrn,
                    phone: selectedPatient.phone || selectedPatient.mobile || '',
                    fatherName: selectedPatient.fatherName || selectedPatient.father_name || ''
                  },
                  {
                    date: rx.date || rx.prescription_date,
                    medicines: rx.medicines || rx.medications || [],
                    advice: rx.advice || rx.notes || '',
                    vitals: latestVitals ? {
                      bp: latestVitals.bp,
                      pulse: latestVitals.pulse,
                      temp: latestVitals.temp,
                      spo2: latestVitals.spo2,
                      weight: latestVitals.weight,
                      rr: latestVitals.rr || latestVitals.respiration
                    } : undefined
                  },
                  docObj,
                  hospitalInfo
                );
                safePrint(html, 800, 1000);
              }}
            />
          </div>

          <DialogFooter className="border-t pt-4 mt-2">
            <Button className="bg-slate-800 hover:bg-slate-900" onClick={() => setIsHistoryOpen(false)}>Close Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-medical-blue" />
              Patient Details - {selectedPatient?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar pr-4">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRN / Patient ID</p>
                  <p className="text-sm font-bold text-medical-blue">{selectedPatient?.mrn}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</p>
                  <p className="text-sm font-medium">{selectedPatient?.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                  <p className="text-sm font-medium">{selectedPatient?.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium">{selectedPatient?.email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age / Gender</p>
                  <p className="text-sm font-medium">{selectedPatient?.age}Y / {selectedPatient?.gender}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</p>
                  <p className="text-sm font-medium">{selectedPatient?.dob || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blood Group</p>
                  <p className="text-sm font-medium">{selectedPatient?.bloodGroup || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guardian Name</p>
                  <p className="text-sm font-medium">{selectedPatient?.guardianName || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Father's Name</p>
                  <p className="text-sm font-medium">{selectedPatient?.fatherName || selectedPatient?.father_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mother's Name</p>
                  <p className="text-sm font-medium">{selectedPatient?.motherName || selectedPatient?.mother_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Husband's Name</p>
                  <p className="text-sm font-medium">{selectedPatient?.husbandName || selectedPatient?.husband_name || 'N/A'}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</p>
                  <p className="text-sm font-medium">{selectedPatient?.address}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TPA ID</p>
                  <p className="text-sm font-medium">{selectedPatient?.tpaId || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TPA Validity</p>
                  <p className="text-sm font-medium">{selectedPatient?.tpaValidity || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referral Case</p>
                  <p className="text-sm font-semibold text-teal-700">
                    {selectedPatient?.isReferral || selectedPatient?.is_referral ? '🟢 Yes' : 'No'}
                  </p>
                </div>
                {(selectedPatient?.isReferral || selectedPatient?.is_referral) && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referred By</p>
                    <p className="text-sm font-semibold text-teal-700">{selectedPatient?.referredBy || selectedPatient?.referred_by || 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-medical-blue" onClick={() => setIsDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* File Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-medical-blue" />
              {previewData?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 relative overflow-hidden">
            {(previewData?.url.startsWith('data:application/pdf') || previewData?.name?.toLowerCase().endsWith('.pdf')) ? (
              <object
                data={previewData.url}
                type="application/pdf"
                className="w-full h-full border-none"
              >
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">PDF Preview Not Available</p>
                    <p className="text-sm text-slate-500 max-w-xs">Your browser might be blocking the inline preview. You can still download the file to view it.</p>
                  </div>
                  <Button className="bg-medical-blue" onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewData.url;
                    link.download = previewData.name;
                    link.click();
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              </object>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img 
                  src={previewData?.url} 
                  alt="Prescription Preview" 
                  className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-white">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close Preview</Button>
            <Button className="bg-medical-blue" onClick={() => {
              if (previewData) {
                const link = document.createElement('a');
                link.href = previewData.url;
                link.download = previewData.name;
                link.click();
              }
            }}>
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
