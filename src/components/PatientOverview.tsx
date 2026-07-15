import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  Bed, 
  History, 
  FileText, 
  CreditCard, 
  Pill, 
  Shield, 
  Stethoscope,
  Search,
  Share2,
  Printer,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Upload,
  Activity,
  ShoppingCart,
  Trash2,
  Loader2,
  Download,
  Eye,
  Baby
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { toast } from 'sonner';
import { supabaseService, toDeterministicUuid } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { getPrescriptionPrintHtml } from '@/lib/prescriptionPrint';

const isPatientIdMatch = (id1: any, id2: any): boolean => {
  if (!id1 || !id2) return false;
  const s1 = String(id1).trim();
  const s2 = String(id2).trim();
  if (s1 === s2) return true;
  try {
    const isUuidFormat = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
    const u1 = isUuidFormat(s1) ? s1 : toDeterministicUuid(s1);
    const u2 = isUuidFormat(s2) ? s2 : toDeterministicUuid(s2);
    return u1 === u2;
  } catch {
    return false;
  }
};
import { getPathologyReportHtml, getRadiologyReportHtml, getMaternityReportHtml } from '@/lib/reportPrint';
import { getPatientReportHtml } from '@/lib/patientReportPrint';
import { normalizeRole } from '@/utils/rbac';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PatientOverview({ userRole }: { userRole?: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientIdFromUrl = searchParams.get('id');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'All' | 'OPD/IPD' | 'Quick' | 'Quick-Lab' | 'Quick-Pharmacy'>('All');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{url: string, name: string} | null>(null);

  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isAccountant = normalizeRole(currentUser?.role || userRole) === 'ACCOUNTANT';
  const isReceptionist = normalizeRole(currentUser?.role || userRole) === 'RECEPTIONIST';
  const isClinicalRole = ['ADMIN', 'DOCTOR', 'NURSE', 'SURGEON'].includes(normalizeRole(currentUser?.role || userRole));
  const isDoctor = currentUser && (
    currentUser.role?.toUpperCase() === 'DOCTOR' || 
    currentUser.role?.toUpperCase() === 'SURGEON'
  );

  const assignedPatientIds = useMemo(() => {
    if (!isDoctor || !currentUser) return null;
    const ids = new Set<string>();
    const currentUserIdStr = String(currentUser.id).toLowerCase();
    const currentUserNameStr = String(currentUser.name || '').toLowerCase();
    
    // 1. Check attending_doctor_id or attendingDoctorId
    patients.forEach(p => {
      const attId = p.attending_doctor_id || p.attendingDoctorId;
      if (attId && String(attId).toLowerCase() === currentUserIdStr) {
        ids.add(p.id);
      }
    });
    
    // 2. Check appointments
    const allAppts = storage.get(STORAGE_KEYS.APPOINTMENTS, []);
    allAppts.forEach((apt: any) => {
      const aptDocId = apt.doctor_id || apt.doctorId;
      const aptDocName = apt.doctor || apt.doctorName || '';
      const aptDocNameLower = String(aptDocName).toLowerCase();
      
      const isDocMatch = 
        (aptDocId && String(aptDocId).toLowerCase() === currentUserIdStr) ||
        (aptDocName && aptDocNameLower === currentUserNameStr) ||
        (aptDocName && currentUserNameStr.includes(aptDocNameLower)) ||
        (currentUser.name && aptDocNameLower.includes(currentUserNameStr));
        
      if (isDocMatch) {
        const pId = apt.patient_id || apt.patientId;
        if (pId) {
          ids.add(pId);
        }
      }
    });
    
    return ids;
  }, [patients, isDoctor, currentUser]);

  // Detail states
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', note_type: 'DOCTOR' as 'DOCTOR' | 'NURSE' });
  const [historyFilter, setHistoryFilter] = useState<'all' | 'doctor' | 'nurse'>('all');
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [billing, setBilling] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [radiologyRecords, setRadiologyRecords] = useState<any[]>([]);
  const [maternityDeliveries, setMaternityDeliveries] = useState<any[]>([]);
  const [maternityNewborns, setMaternityNewborns] = useState<any[]>([]);
  const [labSubTab, setLabSubTab] = useState<'pathology' | 'radiology'>('pathology');

  const [vitals, setVitals] = useState<any[]>([]);
  const [insuranceClaims, setInsuranceClaims] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [pharmacyBills, setPharmacyBills] = useState<any[]>([]);
  const [newPrescription, setNewPrescription] = useState({
    medicines: [{ name: '', dosage: '', frequency: '' }],
    diagnosis: '',
    advice: '',
    vitals: {
      bp: '',
      pulse: '',
      temp: '',
      spo2: '',
      weight: '',
      rr: ''
    }
  });
  const [uploadedFile, setUploadedFile] = useState<{name: string, url: string} | null>(null);

  const isFinancialVisible = true;
  const setLoading = setIsLoading;

  const doctorsList = useMemo(() => {
    const list = staff.filter((u: any) => {
      const norm = normalizeRole(u.role);
      return (
        norm === 'DOCTOR' || 
        norm === 'SURGEON' || 
        norm === 'ADMIN' || 
        (u.name && u.name.toLowerCase().includes('dr.'))
      );
    });

    if (selectedPatient) {
      const currentDocId = selectedPatient.attending_doctor_id || selectedPatient.attendingDoctorId;
      if (currentDocId && currentDocId !== 'unassigned') {
        const docInStaff = staff.find((u: any) => String(u.id).toLowerCase() === String(currentDocId).toLowerCase());
        if (docInStaff && !list.some((u: any) => String(u.id).toLowerCase() === String(currentDocId).toLowerCase())) {
          list.push(docInStaff);
        }
      }
    }

    if (list.length === 0) {
      return [
        { id: 'd1', name: 'Dr. Abdul Qayoom', department: 'General Consultation' },
        { id: 'd2', name: 'Dr. Rajesh Sharma', department: 'Internal Medicine' },
        { id: 'd3', name: 'Dr. Anjali Gupta', department: 'Gynaecology & Maternity' }
      ];
    }
    return list;
  }, [staff, selectedPatient]);

  const handleUpdateAttendingDoctor = async (doctorId: string) => {
    if (!selectedPatient) return;
    try {
      const updatedPatient = {
        ...selectedPatient,
        attending_doctor_id: doctorId || null,
        attendingDoctorId: doctorId || null
      };
      
      const result = await supabaseService.updatePatient(selectedPatient.id, updatedPatient);
      if (result) {
        setSelectedPatient(result);
        setPatients(prevPatients => prevPatients.map(p => isPatientIdMatch(p.id, selectedPatient.id) ? result : p));
        toast.success('Attending doctor updated successfully');
      }
    } catch (error: any) {
      toast.error('Failed to update attending doctor: ' + error.message);
    }
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    const [pts, bds, stf] = await Promise.all([
      supabaseService.getPatients(),
      supabaseService.getBeds(),
      supabaseService.getStaff()
    ]);
    if (pts) setPatients(pts);
    if (bds) setBeds(bds);
    if (stf) setStaff(stf);
    setIsLoading(false);
  };

  // Safe compound fetcher for reactive sync events
  const handleSyncFetch = async () => {
    await fetchInitialData();
    if (patientIdFromUrl) {
      await fetchPatientDetails(patientIdFromUrl);
    }
  };

  useDataSync(handleSyncFetch);

  useEffect(() => {
    if (patientIdFromUrl) {
      const patient = patients.find(p => p.id === patientIdFromUrl || isPatientIdMatch(p.id, patientIdFromUrl));
      if (patient) {
        if (isDoctor && assignedPatientIds && !assignedPatientIds.has(patient.id)) {
          setSelectedPatient(null);
          toast.error("Access Denied: You do not have permission to view this patient.");
          return;
        }
        setSelectedPatient(patient);
        fetchPatientDetails(patient.id);
      }
    } else {
      setSelectedPatient(null);
    }
  }, [patientIdFromUrl, patients, isDoctor, assignedPatientIds]);

  const fetchPatientDetails = async (id: string) => {
    const [appts, bills, rx, vts, labs, claims, rads, dels, babies, notes] = await Promise.all([
      supabaseService.getAppointments(), // Ideally should be getAppointments(id)
      supabaseService.getInvoices(),      // Ideally should be getInvoices(id)
      supabaseService.getPrescriptions(id),
      supabaseService.getPatientVitals(id),
      supabaseService.getLabTestRequests(), // Ideally should be getLabTestRequests(id)
      supabaseService.getInsuranceClaims(),   // Ideally should be getInsuranceClaims(id)
      supabaseService.getRadiologyRecords ? supabaseService.getRadiologyRecords() : Promise.resolve([]),
      supabaseService.getDeliveries ? supabaseService.getDeliveries() : Promise.resolve([]),
      supabaseService.getNewborns ? supabaseService.getNewborns() : Promise.resolve([]),
      supabaseService.getClinicalNotes ? supabaseService.getClinicalNotes(id) : Promise.resolve([])
    ]);

    if (appts) setAppointments(appts.filter((a: any) => a.patient_id === id || a.patientId === id));
    if (bills) setBilling(bills.filter((b: any) => b.patient_id === id || b.patientId === id));
    if (rx) {
      const normalizedRx = rx.map((r: any) => ({
        ...r,
        patientId: r.patient_id || r.patientId,
        doctorId: r.doctor_id || r.doctorId,
        date: r.prescription_date || r.date || r.created_at
      }));
      setPrescriptions(normalizedRx);
    }
    if (vts) setVitals(vts);
    if (labs) {
      const normalizedLabs = labs.filter((l: any) => l.patient_id === id).map((l: any) => ({
        ...l,
        patientId: l.patient_id,
        test: l.test_name,
        date: l.requested_at,
        result: l.result_value,
        range: l.reference_range,
        unit: l.unit
      }));
      setLabOrders(normalizedLabs);
    }
    if (claims) setInsuranceClaims(claims.filter((c: any) => c.patient_id === id));
    if (rads) {
      setRadiologyRecords(rads.filter((r: any) => r.patient_id === id));
    }
    if (dels) {
      setMaternityDeliveries(dels.filter((d: any) => d.patient_id === id));
    }
    if (babies) {
      setMaternityNewborns(babies.filter((b: any) => b.mother_id === id));
    }
    if (notes) {
      setClinicalNotes(notes);
    }
  };

  const handlePrintPathologyReport = (order: any) => {
    if (!selectedPatient) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      toast.error('Please allow popups to print report');
      return;
    }

    const hospitalInfo = storage.get<{ name: string; address: string; phone: string }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'GASTRO PLUS HOSPITAL',
      address: '123 Healthcare Way, Medical City',
      phone: '+91 98765 43210'
    });

    const html = getPathologyReportHtml(
      {
        name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        mrn: selectedPatient.mrn,
        phone: selectedPatient.phone
      },
      order,
      undefined,
      hospitalInfo
    );

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintRadiologyReport = (record: any) => {
    if (!selectedPatient) return;

    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      toast.error('Please allow popups to print report');
      return;
    }

    const hospitalInfo = storage.get<{ name: string; address: string; phone: string }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'GASTRO PLUS HOSPITAL',
      address: '123 Healthcare Way, Medical City',
      phone: '+91 98765 43210'
    });

    const html = getRadiologyReportHtml(
      {
        name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        mrn: selectedPatient.mrn,
        phone: selectedPatient.phone
      },
      record,
      undefined,
      hospitalInfo
    );

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintMaternityReport = (delivery: any) => {
    if (!selectedPatient) return;

    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      toast.error('Please allow popups to print report');
      return;
    }

    const hospitalInfo = storage.get<{ name: string; address: string; phone: string }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'GASTRO PLUS HOSPITAL',
      address: '123 Healthcare Way, Medical City',
      phone: '+91 98765 43210'
    });

    const motherNewborns = maternityNewborns.filter(b => isPatientIdMatch(b.mother_id, selectedPatient.id));

    const html = getMaternityReportHtml(
      {
        name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        mrn: selectedPatient.mrn,
        phone: selectedPatient.phone
      },
      delivery,
      motherNewborns,
      undefined,
      hospitalInfo
    );

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintPatient360Report = () => {
    if (!selectedPatient) return;

    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      toast.error('Please allow popups to print report');
      return;
    }

    const hospitalInfo = storage.get<{ name: string; address: string; phone: string }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'GASTRO PLUS HOSPITAL',
      address: '123 Healthcare Way, Medical City',
      phone: '+91 98765 43210'
    });

    const html = getPatientReportHtml({
      patient: selectedPatient,
      vitals,
      clinicalNotes,
      prescriptions,
      labOrders,
      radiologyRecords,
      billing,
      staff,
      currentBed,
      hospitalInfo,
      dues
    });

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredPatients = useMemo(() => {
    let result = patients.filter(p => p.status !== 'Discharged' && p.status !== 'discharged');
    
    if (isDoctor && assignedPatientIds) {
      result = result.filter(p => assignedPatientIds.has(p.id));
    }

    if (activeCategory !== 'All') {
      result = result.filter(p => {
        const type = (p.registration_type || p.registrationType || '').trim().toLowerCase();
        
        if (activeCategory === 'OPD/IPD') {
          // OPD/IPD matches 'opd', 'ipd', 'opd/ipd', 'emergency', 'maternity', or empty, or anything NOT starting with 'quick'
          return type === 'opd' || type === 'ipd' || type === 'opd/ipd' || type === 'emergency' || type === 'maternity' || type === '' || !type.startsWith('quick');
        }
        
        if (activeCategory === 'Quick') {
          // General quick category matches anything starting with 'quick'
          return type.startsWith('quick');
        }
        
        if (activeCategory === 'Quick-Lab') {
          // Matches 'quick-lab', 'quick lab', or contains 'lab'
          return type === 'quick-lab' || type === 'quick lab' || type.includes('lab');
        }
        
        if (activeCategory === 'Quick-Pharmacy') {
          // Matches 'quick-pharmacy', 'quick pharmacy', 'quick-pharma', 'quick pharma', or contains 'pharma'
          return type === 'quick-pharmacy' || type === 'quick pharmacy' || type.includes('pharmacy') || type.includes('pharma');
        }
        
        return type === activeCategory.toLowerCase();
      });
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.mrn && p.mrn.toLowerCase().includes(query)) ||
        (p.phone && p.phone.includes(query))
      );
    }
    
    return result;
  }, [searchQuery, patients, activeCategory, isDoctor, assignedPatientIds]);

  const handleShareWhatsApp = () => {
    if (!selectedPatient) return;
    
    const shareUrl = `${window.location.origin}/patient-overview?id=${selectedPatient.id}`;
    const doctor = staff.find(u => isPatientIdMatch(u.id, selectedPatient.attending_doctor_id));
    const claim = insuranceClaims.find(c => isPatientIdMatch(c.patient_id, selectedPatient.id));
    
    const patientData = `
*Patient Overview: ${selectedPatient.name}*
*MRN:* ${selectedPatient.mrn || 'N/A'}
*Age/Gender:* ${selectedPatient.age}Y / ${selectedPatient.gender}
*Attending Doctor:* ${doctor?.name || 'Duty Doctor'}
*Status:* ${selectedPatient.status}
*Current Dues:* ${formatCurrency(calculateDues(selectedPatient.id))}
*Insurance Status:* ${claim?.status || 'N/A'}

View full details at: ${shareUrl}
    `.trim();

    const encodedText = encodeURIComponent(patientData);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    toast.success('Sharing to WhatsApp...');
  };

  const handlePrintPrescription = (prescriptionData?: any) => {
    if (!selectedPatient) return;

    let doctor = staff.find(u => u.id === (prescriptionData?.doctorId || prescriptionData?.doctor_id || selectedPatient.attending_doctor_id)) ||
                 staff.find(u => u.name === (prescriptionData?.doctor || prescriptionData?.doctor_name));

    if (!doctor && (prescriptionData?.doctor || prescriptionData?.doctor_name)) {
      doctor = {
        name: prescriptionData.doctor || prescriptionData.doctor_name,
        degree: prescriptionData.doctorDegree || prescriptionData.doctor_degree || '',
        specialization: prescriptionData.doctorSpecialization || prescriptionData.doctor_specialization || prescriptionData.department || '',
        department: prescriptionData.department || prescriptionData.doctorDepartment || prescriptionData.doctor_department || '',
        id: prescriptionData.doctorId || prescriptionData.doctor_id || ''
      };
    }

    if (!doctor && selectedPatient.attending_doctor_id) {
      doctor = staff.find(u => u.id === selectedPatient.attending_doctor_id);
    }
    
    const hospitalInfo = storage.get<{ name: string; address: string; phone: string }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'GASTRO PLUS HOSPITAL',
      address: '123 Healthcare Way, Medical City',
      phone: '+91 98765 43210'
    });

    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      toast.error('Please allow popups to print prescription');
      return;
    }

    const latestVitals = vitals && vitals.length > 0 ? vitals[0] : undefined;

    // Use vitals stored on the prescription first, otherwise fall back to latestVitals
    const prescriptionVitals = prescriptionData?.vitals || (latestVitals ? {
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
      prescriptionData ? {
        ...prescriptionData,
        vitals: prescriptionVitals
      } : { 
        medicines: [],
        vitals: prescriptionVitals
      },
      doctor,
      hospitalInfo
    );

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const openPrescriptionModal = () => {
    if (!selectedPatient) return;

    const existingRx = prescriptions
      .filter(rx => isPatientIdMatch(rx.patientId, selectedPatient.id) || isPatientIdMatch(rx.patient_id, selectedPatient.id))
      .sort((a, b) => new Date(b.date || b.prescription_date || 0).getTime() - new Date(a.date || a.prescription_date || 0).getTime())[0];

    const latestVitals = vitals && vitals.length > 0 ? vitals[0] : undefined;

    if (existingRx) {
      setNewPrescription({
        diagnosis: existingRx.diagnosis || '',
        advice: existingRx.advice || existingRx.notes || '',
        medicines: existingRx.medicines && existingRx.medicines.length > 0 ? existingRx.medicines : [{ name: '', dosage: '', frequency: '' }],
        vitals: existingRx.vitals || {
          bp: latestVitals?.bp || '',
          pulse: latestVitals?.pulse || '',
          temp: latestVitals?.temp || '',
          spo2: latestVitals?.spo2 || '',
          weight: latestVitals?.weight || '',
          rr: latestVitals?.rr || latestVitals?.respiration || ''
        }
      });
    } else {
      setNewPrescription({
        medicines: [{ name: '', dosage: '', frequency: '' }],
        diagnosis: '',
        advice: '',
        vitals: {
          bp: latestVitals?.bp || '',
          pulse: latestVitals?.pulse || '',
          temp: latestVitals?.temp || '',
          spo2: latestVitals?.spo2 || '',
          weight: latestVitals?.weight || '',
          rr: latestVitals?.rr || latestVitals?.respiration || ''
        }
      });
    }

    setIsPrescriptionOpen(true);
  };

  const handlePrintBlankPrescription = () => {
    handlePrintPrescription();
  };

  const handleSavePrescription = async () => {
    if (!selectedPatient) return;
    
    setLoading(true);

    if (isReceptionist) {
      if (newPrescription.vitals && (
        newPrescription.vitals.bp ||
        newPrescription.vitals.pulse ||
        newPrescription.vitals.temp ||
        newPrescription.vitals.spo2 ||
        newPrescription.vitals.weight ||
        newPrescription.vitals.rr
      )) {
        try {
          const vData = {
            patient_id: selectedPatient.id,
            bp: newPrescription.vitals.bp || null,
            pulse: newPrescription.vitals.pulse ? Number(newPrescription.vitals.pulse) : null,
            temp: newPrescription.vitals.temp ? String(newPrescription.vitals.temp) : null,
            spo2: newPrescription.vitals.spo2 ? Number(newPrescription.vitals.spo2) : null,
            weight: newPrescription.vitals.weight ? Number(newPrescription.vitals.weight) : null,
            rr: newPrescription.vitals.rr ? Number(newPrescription.vitals.rr) : null,
            recorded_by: currentUser?.id || null,
            recorded_at: new Date().toISOString()
          };
          const savedV = await supabaseService.updateVitals(vData);
          if (savedV) {
            setVitals(prev => [savedV, ...prev]);
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patient_vitals', action: 'insert' } }));
            toast.success(`Patient vitals updated successfully for ${selectedPatient.name}`);
            setIsPrescriptionOpen(false);
            setNewPrescription({
              medicines: [{ name: '', dosage: '', frequency: '' }],
              diagnosis: '',
              advice: '',
              vitals: { bp: '', pulse: '', temp: '', spo2: '', weight: '', rr: '' }
            });
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
      setLoading(false);
      return;
    }

    const newRx = {
      patient_id: selectedPatient.id,
      patientId: selectedPatient.id,
      doctor_id: selectedPatient.attending_doctor_id,
      doctorId: selectedPatient.attending_doctor_id,
      prescription_date: new Date().toISOString(),
      date: new Date().toISOString(),
      diagnosis: newPrescription.diagnosis,
      advice: newPrescription.advice,
      medicines: newPrescription.medicines.filter(m => m.name.trim() !== '')
    };

    const result = await supabaseService.createPrescription(newRx);
    if (result) {
      const normalizedResult = {
        ...result,
        patientId: result.patient_id || result.patientId || newRx.patient_id,
        doctorId: result.doctor_id || result.doctorId || newRx.doctor_id,
        date: result.prescription_date || result.date || result.created_at || newRx.prescription_date
      };

      if (newPrescription.vitals && (
        newPrescription.vitals.bp ||
        newPrescription.vitals.pulse ||
        newPrescription.vitals.temp ||
        newPrescription.vitals.spo2 ||
        newPrescription.vitals.weight ||
        newPrescription.vitals.rr
      )) {
        try {
          const vData = {
            patient_id: selectedPatient.id,
            bp: newPrescription.vitals.bp || null,
            pulse: newPrescription.vitals.pulse ? Number(newPrescription.vitals.pulse) : null,
            temp: newPrescription.vitals.temp ? String(newPrescription.vitals.temp) : null,
            spo2: newPrescription.vitals.spo2 ? Number(newPrescription.vitals.spo2) : null,
            weight: newPrescription.vitals.weight ? Number(newPrescription.vitals.weight) : null,
            rr: newPrescription.vitals.rr ? Number(newPrescription.vitals.rr) : null,
            recorded_by: currentUser?.id || null,
            recorded_at: new Date().toISOString()
          };
          const savedV = await supabaseService.updateVitals(vData);
          if (savedV) {
            setVitals(prev => [savedV, ...prev]);
            window.dispatchEvent(new CustomEvent('supabase-data-sync', { detail: { table: 'patient_vitals', action: 'insert' } }));
          }
        } catch (err) {
          console.error('Failed to auto-save vitals:', err);
        }
      }

      setPrescriptions([normalizedResult, ...prescriptions]);
      setIsPrescriptionOpen(false);
      setNewPrescription({
        medicines: [{ name: '', dosage: '', frequency: '' }],
        diagnosis: '',
        advice: '',
        vitals: {
          bp: '',
          pulse: '',
          temp: '',
          spo2: '',
          weight: '',
          rr: ''
        }
      });
      toast.success('Prescription saved successfully');
    } else {
      toast.error('Failed to save prescription');
    }
    setLoading(false);
  };

  const handleSaveClinicalNote = async () => {
    if (!selectedPatient) return;
    if (!newNote.content.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    setLoading(true);
    const noteData = {
      patient_id: selectedPatient.id,
      patientId: selectedPatient.id,
      author_id: selectedPatient.attending_doctor_id,
      note_type: newNote.note_type,
      content: newNote.content.trim()
    };

    const savedNote = await supabaseService.createClinicalNote(noteData);
    if (savedNote) {
      setClinicalNotes([savedNote, ...clinicalNotes]);
      setIsAddNoteOpen(false);
      setNewNote({ content: '', note_type: 'DOCTOR' });
      toast.success('Medical history note saved successfully');
    } else {
      toast.error('Failed to save medical history note');
    }
    setLoading(false);
  };

  const medicalHistoryEvents = useMemo(() => {
    if (!selectedPatient) return [];

    const list: any[] = [];

    // Add default history for mock patients to look perfect out of the box
    if (selectedPatient.id === 'p1' || selectedPatient.mrn === 'MRN-001') {
      list.push({
        id: 'default-1',
        date: '2024-04-12T00:00:00.000Z',
        title: 'Acute Bronchitis',
        content: 'Patient admitted with difficulty breathing. Started on nebulization.',
        type: 'default',
        badge: 'Past Diagnosis',
        color: 'bg-medical-blue'
      });
      list.push({
        id: 'default-2',
        date: '2024-03-20T00:00:00.000Z',
        title: 'Routine Checkup',
        content: 'General consultation. BP stable. Advised lifestyle changes.',
        type: 'default',
        badge: 'Consultation',
        color: 'bg-slate-300'
      });
    } else if (selectedPatient.id === 'p2' || selectedPatient.mrn === 'MRN-002') {
      list.push({
        id: 'default-1',
        date: '2024-03-25T00:00:00.000Z',
        title: 'Post-Delivery Checkup',
        content: 'Post-pregnancy recovery monitoring. Normal vitals, minor soreness.',
        type: 'default',
        badge: 'Maternity Note',
        color: 'bg-pink-500'
      });
    }

    // Add clinical notes
    clinicalNotes.forEach(note => {
      const authorName = staff.find(u => u.id === note.author_id || u.id === note.authorId)?.name || (note.profiles?.name) || 'Staff';
      list.push({
        id: note.id,
        date: note.created_at || note.date || new Date().toISOString(),
        title: note.note_type === 'NURSE' ? `Nurse Note - ${authorName}` : `Clinical Note - ${authorName}`,
        content: note.content,
        type: 'note',
        badge: note.note_type === 'NURSE' ? 'Nurse Note' : 'Doctor Note',
        color: note.note_type === 'NURSE' ? 'bg-amber-500' : 'bg-teal-500',
        raw: note
      });
    });

    // Add prescriptions
    prescriptions
      .filter(rx => isPatientIdMatch(rx.patientId, selectedPatient.id) || isPatientIdMatch(rx.patient_id, selectedPatient.id))
      .forEach(rx => {
        const docName = staff.find(u => u.id === rx.doctor_id || u.id === rx.doctorId)?.name || 'Doctor';
        if (rx.diagnosis || rx.advice || (rx.medicines && rx.medicines.length > 0)) {
          const medicinesStr = rx.medicines ? rx.medicines.map((m: any) => `${m.name} (${m.dosage || ''})`).join(', ') : '';
          const contentStr = [
            rx.diagnosis ? `Diagnosis: ${rx.diagnosis}` : '',
            rx.advice ? `Advice: ${rx.advice}` : '',
            medicinesStr ? `Prescribed: ${medicinesStr}` : ''
          ].filter(Boolean).join('\n');

          list.push({
            id: rx.id,
            date: rx.prescription_date || rx.date || rx.created_at,
            title: `Prescription Written - By ${docName}`,
            content: contentStr,
            type: 'prescription',
            badge: 'Prescription',
            color: 'bg-purple-500',
            raw: rx
          });
        }
      });

    // Filter based on selected historyFilter tab
    const filteredList = list.filter(item => {
      if (historyFilter === 'all') return true;
      if (historyFilter === 'doctor') {
        return item.badge === 'Doctor Note' || item.badge === 'Prescription' || item.badge === 'Past Diagnosis' || item.badge === 'Consultation';
      }
      if (historyFilter === 'nurse') {
        return item.badge === 'Nurse Note' || item.badge === 'Maternity Note';
      }
      return true;
    });

    // Sort chronological descending
    return filteredList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPatient, clinicalNotes, prescriptions, staff, historyFilter]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedFile({
          name: file.name,
          url: event.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUpload = async () => {
    if (!selectedPatient || !uploadedFile) return;

    setLoading(true);
    const newRx = {
      patient_id: selectedPatient.id,
      patientId: selectedPatient.id,
      doctor_id: selectedPatient.attending_doctor_id || 'd1',
      doctorId: selectedPatient.attending_doctor_id || 'd1',
      prescription_date: new Date().toISOString(),
      date: new Date().toISOString(),
      diagnosis: 'Uploaded Document / Record',
      advice: '',
      medicines: [],
      attachment_url: uploadedFile.url,
      attachmentUrl: uploadedFile.url,
      attachment_name: uploadedFile.name,
      attachmentName: uploadedFile.name,
    };

    const result = await supabaseService.createPrescription(newRx);
    if (result) {
      const normalizedResult = {
        ...result,
        patientId: result.patient_id || result.patientId || newRx.patient_id,
        doctorId: result.doctor_id || result.doctorId || newRx.doctor_id,
        date: result.prescription_date || result.date || result.created_at || newRx.prescription_date,
        medicines: result.medicines || newRx.medicines,
        attachmentUrl: result.attachment_url || result.attachmentUrl || newRx.attachmentUrl,
        attachmentName: result.attachment_name || result.attachmentName || newRx.attachmentName
      };
      setPrescriptions([normalizedResult, ...prescriptions]);
      setIsUploadOpen(false);
      setUploadedFile(null);
      toast.success('Prescription record uploaded and saved successfully');
    } else {
      toast.error('Failed to save uploaded record');
    }
    setLoading(false);
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    
    const roleUpper = (userRole || '').toUpperCase();
    if (roleUpper === 'RECEPTIONIST' || roleUpper === 'RECEPTION' || roleUpper === 'FRONT_DESK' || roleUpper === 'DOCTOR' || roleUpper === 'SURGEON' || roleUpper === 'ACCOUNTANT' || roleUpper === 'ACCOUNTS') {
      toast.error('Deletion of patient profiles is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${selectedPatient.name} and all associated records? This action cannot be undone.`)) {
      return;
    }

    try {
      // Sync with Supabase if connected
      if (selectedPatient.supabase_id && import.meta.env.VITE_SUPABASE_URL) {
        const { supabaseService } = await import('../services/supabaseService');
        await supabaseService.deletePatient(selectedPatient.supabase_id);
      }

      const updatedPatients = patients.filter((p: any) => p.id !== selectedPatient.id);
      setPatients(updatedPatients);
      storage.set(STORAGE_KEYS.PATIENTS, updatedPatients);
      
      // Clear URL params and selection
      setSearchParams({});
      setSelectedPatient(null);
      
      toast.success('Patient record deleted successfully');
      
      // Dispatch storage event to update other components
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete patient record');
    }
  };

  const calculateDues = (patientId: string) => {
    const patientBills = billing.filter(b => isPatientIdMatch(b.patient_id, patientId) || isPatientIdMatch(b.patientId, patientId));
    const total = patientBills.reduce((acc, b) => acc + (Number(b.payable_amount ?? b.payableAmount ?? b.total_amount ?? b.totalAmount) || 0), 0);
    const paid = patientBills.reduce((acc, b) => acc + (Number(b.paid_amount ?? b.paidAmount) || 0), 0);
    return total - paid;
  };

  const patientAppointments = useMemo(() => appointments.filter(a => isPatientIdMatch(a.patient_id, selectedPatient?.id) || isPatientIdMatch(a.patientId, selectedPatient?.id)), [appointments, selectedPatient]);
  const patientBills = useMemo(() => billing.filter(b => isPatientIdMatch(b.patient_id, selectedPatient?.id) || isPatientIdMatch(b.patientId, selectedPatient?.id)), [billing, selectedPatient]);
  const patientClaims = useMemo(() => {
    const filtered = insuranceClaims.filter(c => isPatientIdMatch(c.patient_id, selectedPatient?.id) || isPatientIdMatch(c.patientId, selectedPatient?.id));
    const unique: any[] = [];
    const seen = new Set();
    for (const c of filtered) {
      if (c && c.id && !seen.has(c.id)) {
        seen.add(c.id);
        unique.push(c);
      }
    }
    return unique;
  }, [insuranceClaims, selectedPatient]);
  const currentBed = useMemo(() => beds.find(b => isPatientIdMatch(b.patient_id, selectedPatient?.id) || isPatientIdMatch(b.patientId, selectedPatient?.id)), [beds, selectedPatient]);
  const dues = useMemo(() => selectedPatient ? calculateDues(selectedPatient.id) : 0, [selectedPatient, billing]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-medical-blue" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading Patient 360 Ecosystem...</p>
        </div>
      </div>
    );
  }

  if (!selectedPatient) {
    return (
      <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 p-6 rounded-2xl border shadow-sm" style={{ background: 'linear-gradient(135deg, #FFD1A9, #FFE5C9, #FFF3E5)', borderColor: '#F5CBB0' }}>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#5A2D1B]">Patient 360 Overview</h1>
        <p className="text-[#8A563F] text-sm font-semibold">Search and select a patient to view their complete medical and financial history.</p>
      </div>

        <div className="flex flex-col gap-4">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="Search by Patient Name, MRN, or Phone Number..." 
              className="pl-10 h-12 text-lg shadow-sm border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['All', 'OPD/IPD', 'Quick', 'Quick-Lab', 'Quick-Pharmacy'] as const).map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                size="sm"
                className={`rounded-full px-4 h-8 ${activeCategory === cat ? 'bg-medical-blue' : 'text-slate-500'}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <Card 
              key={patient.id} 
              className="hover:ring-2 hover:ring-medical-blue/20 transition-all cursor-pointer border-none shadow-sm"
              onClick={() => setSearchParams({ id: patient.id })}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-medical-blue font-bold text-lg">
                  {patient.name.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-slate-800 truncate">{patient.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold bg-slate-100 text-slate-500 border-none">
                      {patient.mrn || 'N/A'}
                    </Badge>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {patient.phone || 'No phone'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSearchParams({})}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">{selectedPatient.name}</h1>
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">{selectedPatient.mrn || 'N/A'} • {selectedPatient.age}Y / {selectedPatient.gender}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(isClinicalRole || isReceptionist) && (
            <Button variant="outline" className="gap-2 border-medical-blue text-medical-blue hover:bg-blue-50" onClick={openPrescriptionModal}>
              {isReceptionist ? (
                <>
                  <FileText className="w-4 h-4" />
                  Record Vitals
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Write Prescription
                </>
              )}
            </Button>
          )}
          <Button variant="outline" className="gap-2 border-slate-300" onClick={() => setIsUploadOpen(true)}>
            <Upload className="w-4 h-4" />
            Upload Old Record
          </Button>
          {(isClinicalRole || normalizeRole(currentUser?.role || userRole) === 'RECEPTIONIST') && (
            <Button variant="outline" className="gap-2" onClick={handlePrintBlankPrescription}>
              <FileText className="w-4 h-4" />
              Blank Prescription
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={handlePrintPatient360Report}>
            <Printer className="w-4 h-4" />
            Print Report
          </Button>
          <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2" onClick={handleShareWhatsApp}>
            <Share2 className="w-4 h-4" />
            Share on WhatsApp
          </Button>
          {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'HOSPITAL_ADMIN' || userRole?.toUpperCase().includes('ADMIN')) && (
            <Button variant="destructive" className="gap-2" onClick={handleDeletePatient}>
              <Trash2 className="w-4 h-4" />
              Delete Patient
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Quick Stats */}
        <div className="space-y-6">
          {/* Quick Vitals Display */}
          <Card className="border-none shadow-sm bg-medical-blue/5 border-l-4 border-medical-blue">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-medical-blue" />
                  <p className="text-sm font-black text-medical-blue uppercase tracking-wider">Live Vitals</p>
                </div>
                <Badge variant="outline" className="text-[10px] bg-white border-medical-blue/20">
                  {vitals.length > 0 ? 'Updated' : 'Default'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">BP</p>
                  <p className="text-base font-black text-slate-800">{vitals[0]?.bp || '120/80'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pulse</p>
                  <p className="text-base font-black text-slate-800">{vitals[0]?.pulse || '78'} bpm</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Temp</p>
                  <p className="text-base font-black text-slate-800">{vitals[0]?.temp || '98.6'} °F</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">SpO2</p>
                  <p className="text-base font-black text-slate-800">{vitals[0]?.spo2 || '98'} %</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-medical-blue text-white pb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl border border-white/30">
                  {selectedPatient.name.charAt(0)}
                </div>
                <div>
                  <CardTitle className="text-white">Patient Profile</CardTitle>
                  <Badge className="bg-white/20 text-white border-none mt-1">{selectedPatient.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 -mt-4 bg-white rounded-t-3xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
                  <p className="text-sm font-medium">{selectedPatient.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Group</p>
                  <p className="text-sm font-medium">{selectedPatient.bloodGroup || 'N/A'}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                  <p className="text-sm font-medium">{selectedPatient.address}</p>
                </div>
                {selectedPatient.fatherName && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Father's Info</p>
                    <p className="text-sm font-medium">{selectedPatient.fatherName}</p>
                    {selectedPatient.fatherPhone && <p className="text-[10px] text-slate-500">{selectedPatient.fatherPhone}</p>}
                  </div>
                )}
                {selectedPatient.husbandName && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Husband's Info</p>
                    <p className="text-sm font-medium">{selectedPatient.husbandName}</p>
                    {selectedPatient.husbandPhone && <p className="text-[10px] text-slate-500">{selectedPatient.husbandPhone}</p>}
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Attending Doctor</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    {(() => {
                      const selectedDocId = selectedPatient.attending_doctor_id || selectedPatient.attendingDoctorId;
                      const selectedDocObj = staff.find((u: any) => String(u.id).toLowerCase() === String(selectedDocId).toLowerCase());
                      const displayDocName = selectedDocObj 
                        ? `${selectedDocObj.name}${selectedDocObj.department ? ` (${selectedDocObj.department})` : ''}`
                        : undefined;
                      return (
                        <Select
                          value={selectedPatient.attending_doctor_id || selectedPatient.attendingDoctorId || 'unassigned'}
                          onValueChange={(val) => handleUpdateAttendingDoctor(val === 'unassigned' ? '' : val)}
                        >
                          <SelectTrigger className="h-9 w-full bg-white border-slate-200 text-xs font-bold rounded-xl shadow-none">
                            <SelectValue placeholder="Choose Attending Doctor...">
                              {displayDocName}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="unassigned" className="text-xs font-bold text-slate-400">
                              -- Choose Doctor --
                            </SelectItem>
                            {doctorsList.map((doc) => (
                              <SelectItem key={doc.id} value={doc.id} className="text-xs font-semibold">
                                {doc.name} {doc.department ? `(${doc.department})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isFinancialVisible && (
            <Card className="border-none shadow-sm bg-rose-50 border-l-4 border-rose-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Outstanding Dues</p>
                  <h3 className="text-2xl font-bold text-rose-700">{formatCurrency(dues)}</h3>
                </div>
                <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
                  <CreditCard className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          )}

          {currentBed && (
            <Card className="border-none shadow-sm bg-blue-50 border-l-4 border-blue-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Current Admission</p>
                  <h3 className="text-xl font-bold text-blue-700">Bed {currentBed.number}</h3>
                  <p className="text-[10px] text-blue-500 font-medium">{currentBed.ward}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <Bed className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle & Right Column: Detailed History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Appointments */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-medical-blue" />
                  <CardTitle className="text-lg">Appointments</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[250px] overflow-y-auto custom-scrollbar">
                  <div className="p-4 space-y-3">
                    {patientAppointments.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8 italic">No appointment history</p>
                    ) : (
                      patientAppointments.map(app => {
                        const appDate = app.date || app.appointment_date || app.appointmentDate;
                        const appTime = app.time || app.appointment_time || app.appointmentTime;
                        const appType = app.type || app.appointment_type || 'OPD';
                        const appDoctor = app.doctor || 'General OPD';
                        return (
                          <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div>
                              <p className="text-sm font-bold">{formatDate(appDate)}</p>
                              <p className="text-[10px] text-slate-500">{appTime} • {appType} ({appDoctor})</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] font-bold uppercase">{app.status}</Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical History / Notes */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2 text-slate-800">
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-medical-blue" />
                      <CardTitle className="text-lg">Medical History</CardTitle>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs font-bold text-medical-blue border-medical-blue/20 hover:bg-blue-50"
                      onClick={() => setIsAddNoteOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Note
                    </Button>
                  </div>
                  
                  {/* Notes & Prescriptions Selector Tabs */}
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 self-start mt-1">
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('all')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                        historyFilter === 'all' 
                          ? 'bg-white text-medical-blue shadow-xs font-black' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      All Records
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('doctor')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                        historyFilter === 'doctor' 
                          ? 'bg-teal-600 text-white shadow-xs font-black' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Doctor
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('nurse')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                        historyFilter === 'nurse' 
                          ? 'bg-amber-600 text-white shadow-xs font-black' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Nurse Notes
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[250px] overflow-y-auto custom-scrollbar">
                  <div className="p-4">
                    {medicalHistoryEvents.length === 0 ? (
                      <div className="text-center py-10 opacity-30 flex flex-col items-center">
                        <History className="w-8 h-8 mb-2 text-slate-400" />
                        <p className="text-xs font-bold uppercase">No history available</p>
                      </div>
                    ) : (
                      <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
                        {medicalHistoryEvents.map(event => (
                          <div key={event.id} className="relative">
                            <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full ${event.color} border-4 border-white shadow-xs`}></div>
                            <div className="flex items-center justify-between gap-2 overflow-hidden mb-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">
                                {formatDate(event.date)}
                              </p>
                              <Badge className="text-[9.5px] tracking-wide scale-90 uppercase border-none bg-slate-100 text-slate-600 font-extrabold px-1.5 py-0 shrink-0">
                                {event.badge}
                              </Badge>
                            </div>
                            <p className="text-xs font-black text-slate-800 leading-tight">{event.title}</p>
                            <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
                              {event.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lab & Radiology Reports */}
            <Card className="border-none shadow-sm h-full flex flex-col">
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <CardTitle className="text-lg">Diagnostics & Reports</CardTitle>
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLabSubTab('pathology')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md h-6 ${labSubTab === 'pathology' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Pathology
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLabSubTab('radiology')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md h-6 ${labSubTab === 'radiology' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Radiology
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                <div className="h-[250px] overflow-y-auto custom-scrollbar flex-1">
                  <div className="p-4 space-y-3">
                    {labSubTab === 'pathology' ? (
                      labOrders.filter(o => isPatientIdMatch(o.patientId, selectedPatient.id)).length === 0 ? (
                        <div className="text-center py-10 opacity-30 flex flex-col items-center">
                          <Activity className="w-8 h-8 mb-2 text-purple-500" />
                          <p className="text-xs font-bold uppercase">No pathology reports</p>
                        </div>
                      ) : (
                        labOrders.filter(o => isPatientIdMatch(o.patientId, selectedPatient.id)).map(order => (
                          <div key={order.id} className={`p-3 rounded-xl border border-slate-100 ${order.status === 'Completed' || order.status === 'Released' ? 'bg-emerald-50/30' : 'bg-slate-50'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-xs font-black text-slate-800 leading-tight">{order.test}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{formatDate(order.date)}</p>
                              </div>
                              <Badge className={`text-[9px] border-none uppercase ${
                                order.status === 'Completed' || order.status === 'Released' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {order.status}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-semibold text-slate-500">
                                {order.result ? `${order.result} ${order.unit || ''}` : 'Pending validation'}
                              </span>
                              {(order.status === 'Completed' || order.status === 'Released' || order.result) && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-purple-600 hover:bg-purple-50 px-2 text-[10px] font-bold"
                                  onClick={() => handlePrintPathologyReport(order)}
                                >
                                  <Printer className="w-3 h-3 mr-1" />
                                  View / Print Report
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )
                    ) : (
                      radiologyRecords.length === 0 ? (
                        <div className="text-center py-10 opacity-30 flex flex-col items-center">
                          <Activity className="w-8 h-8 mb-2 text-blue-500" />
                          <p className="text-xs font-bold uppercase">No radiology reports</p>
                        </div>
                      ) : (
                        radiologyRecords.map(record => (
                          <div key={record.id} className={`p-3 rounded-xl border border-slate-100 ${record.status === 'Completed' ? 'bg-emerald-50/30' : 'bg-slate-50'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-xs font-black text-slate-800 leading-tight">{record.test_name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{formatDate(record.requested_at)}</p>
                              </div>
                              <Badge className={`text-[9px] border-none uppercase ${
                                record.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {record.status}
                              </Badge>
                            </div>
                            {record.result_notes && (
                              <p className="text-[10px] text-slate-600 line-clamp-2 mt-1 italic">
                                {record.result_notes}
                              </p>
                            )}
                            {record.findings && (
                              <div className="mt-1.5 p-2 bg-white rounded border border-slate-100 text-[10px] text-slate-700">
                                <span className="font-bold text-indigo-600 block mb-0.5">Report Findings:</span>
                                <p className="whitespace-pre-line leading-relaxed">{record.findings}</p>
                              </div>
                            )}
                            {record.clinical_notes && (
                              <p className="text-[9px] text-slate-500 mt-1">
                                <span className="font-semibold text-slate-600">Clinical Notes:</span> {record.clinical_notes}
                              </p>
                            )}
                            {(() => {
                              const linkedScans = storage.get<{id: string, orderId: string, url: string, type: string}[]>(STORAGE_KEYS.RADIOLOGY_FILES, [])
                                .filter(f => f.orderId === record.id);
                              if (linkedScans.length > 0) {
                                return (
                                  <div className="mt-2.5 p-2 bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                                    <p className="text-[9px] font-black uppercase text-indigo-400 mb-1.5 flex items-center gap-1 font-mono">
                                      <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
                                      PACS DICOM Scan Imaging
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {linkedScans.map(scan => (
                                        <div key={scan.id} className="relative group/scan rounded overflow-hidden bg-black/50 border border-white/5 flex flex-col items-center">
                                          <img 
                                            src={scan.url} 
                                            alt={record.test_name || "Diagnostic Scan"} 
                                            className="h-16 w-20 object-cover cursor-pointer hover:scale-110 transition-transform duration-300"
                                            referrerPolicy="no-referrer"
                                            onClick={() => {
                                              setPreviewData({ url: scan.url, name: `${record.test_name || 'Study Scan'} (${scan.type || 'DICOM/X-Ray'})` });
                                              setIsPreviewOpen(true);
                                            }}
                                          />
                                          <div className="p-0.5 text-[8px] font-mono text-slate-400 bg-slate-950 text-center truncate w-20 font-black">
                                            {scan.type?.includes('/') ? scan.type.split('/')[1].toUpperCase() : (scan.type || 'SCAN')}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                              <span className="text-[9px] uppercase font-bold text-slate-400">
                                {record.urgency || 'Normal'}
                              </span>
                              {record.status === 'Completed' && (
                                <div className="flex gap-1">
                                  {record.report_url && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 text-blue-600 hover:bg-blue-50 px-2 text-[10px] font-bold"
                                      onClick={() => {
                                        setPreviewData({ url: record.report_url, name: record.test_name });
                                        setIsPreviewOpen(true);
                                      }}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      View File
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-blue-600 hover:bg-blue-50 px-2 text-[10px] font-bold"
                                    onClick={() => handlePrintRadiologyReport(record)}
                                  >
                                    <Printer className="w-3 h-3 mr-1" />
                                    View Report
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pharmacy History */}
            <Card className="border-none shadow-sm h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  <CardTitle className="text-lg">Pharmacy History</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="h-[250px] overflow-y-auto custom-scrollbar">
                  <div className="p-4 space-y-3">
                    {pharmacyBills.filter(b => isPatientIdMatch(b.patientId, selectedPatient.id)).length === 0 ? (
                      <div className="text-center py-10 opacity-30 flex flex-col items-center">
                        <ShoppingCart className="w-8 h-8 mb-2" />
                        <p className="text-xs font-bold uppercase">No purchase history</p>
                      </div>
                    ) : (
                      pharmacyBills.filter(b => isPatientIdMatch(b.patientId, selectedPatient.id)).map(bill => (
                        <div key={bill.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex justify-between mb-2">
                            <p className="text-xs font-black text-slate-800">#{bill.id.toUpperCase()}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(bill.date)}</p>
                          </div>
                          <div className="space-y-1">
                            {bill.items.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between text-[10px]">
                                <span className="text-slate-600 font-bold">{item.name} x{item.quantity}</span>
                                <span className="text-slate-400 font-medium">{formatCurrency(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Amount</span>
                            <span className="text-xs font-black text-emerald-600">{formatCurrency(bill.totalAmount)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prescriptions */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-medical-blue" />
                  <CardTitle className="text-lg">Recent Prescriptions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[250px] overflow-y-auto custom-scrollbar">
                  <div className="p-4 space-y-3">
                    {prescriptions.filter(rx => isPatientIdMatch(rx.patientId, selectedPatient.id) || isPatientIdMatch(rx.patient_id, selectedPatient.id)).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8 italic">No prescription history</p>
                    ) : (
                      prescriptions.filter(rx => isPatientIdMatch(rx.patientId, selectedPatient.id) || isPatientIdMatch(rx.patient_id, selectedPatient.id)).map(rx => (
                        <div key={rx.id} className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-bold text-blue-600 uppercase">
                              {staff.find(u => u.id === rx.doctor_id || u.id === rx.doctorId)?.name || 'Doctor'}
                            </p>
                            <p className="text-[10px] text-slate-400">{formatDate(rx.date)}</p>
                          </div>
                          <div className="space-y-1">
                            {rx.medicines.map((m, i) => (
                              <p key={i} className="text-xs font-bold">{m.name} ({m.dosage}) - {m.frequency}</p>
                            ))}
                          </div>
                          <div className="mt-3 pt-2 border-t border-blue-100 flex items-center justify-between">
                            <span className="text-[10px] text-blue-600 font-medium truncate max-w-[120px]">
                              {rx.medicines?.length || 0} Medicines Listed
                            </span>
                            <div className="flex gap-1">
                              {rx.medicines && rx.medicines.length > 0 && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-emerald-600 hover:bg-emerald-50 px-2"
                                  onClick={() => handlePrintPrescription(rx)}
                                >
                                  <Printer className="w-3 h-3 mr-1" />
                                  Print
                                </Button>
                              )}
                              {rx.attachmentUrl && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-medical-blue hover:bg-blue-100 px-2"
                                    onClick={() => {
                                      setPreviewData({ url: rx.attachmentUrl!, name: rx.attachmentName || 'Prescription' });
                                      setIsPreviewOpen(true);
                                    }}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-slate-500 hover:bg-slate-100 px-2"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = rx.attachmentUrl!;
                                      link.download = rx.attachmentName || 'prescription.pdf';
                                      link.click();
                                    }}
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Download
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insurance Claims */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-medical-blue" />
                  <CardTitle className="text-lg">Insurance Claims</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[250px] overflow-y-auto custom-scrollbar">
                  <div className="p-4 space-y-3">
                    {patientClaims.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8 italic">No insurance claims found</p>
                    ) : (
                      patientClaims.map(claim => (
                        <div key={claim.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold">{claim.company}</p>
                              <p className="text-[10px] text-slate-500">{claim.id}</p>
                            </div>
                            <Badge className={`${claim.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} border-none text-[9px] uppercase`}>
                              {claim.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-bold text-medical-blue mt-2">{formatCurrency(claim.amount)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Maternity & Birth Summary */}
            {selectedPatient.gender === 'Female' && (selectedPatient.registration_type === 'Maternity' || maternityDeliveries.length > 0) && (
              <Card className="border-none shadow-sm md:col-span-2 bg-pink-50/20 border-l-4 border-pink-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Baby className="w-5 h-5 text-pink-600" />
                    <CardTitle className="text-lg text-pink-800">Maternity & Birth Record</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  {maternityDeliveries.length === 0 ? (
                    <div className="text-center py-6 bg-white/70 rounded-xl border border-pink-100">
                      <Baby className="w-8 h-8 mx-auto mb-2 text-pink-300" />
                      <p className="text-xs text-slate-500 font-bold uppercase">No active delivery summary generated yet</p>
                      <p className="text-[10px] text-slate-400 mt-1">Delivery records can be registered at the Maternity department.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {maternityDeliveries.map(delivery => {
                        const newborns = maternityNewborns.filter(b => isPatientIdMatch(b.mother_id, selectedPatient.id));
                        return (
                          <div key={delivery.id} className="p-4 rounded-xl border border-pink-100 bg-white shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                              <div>
                                <h4 className="text-sm font-black text-pink-700 capitalize">
                                  {delivery.delivery_type || 'Normal'} Delivery Summary
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  DATE: {formatDate(delivery.delivery_date)} at {delivery.delivery_time || 'N/A'}
                                </p>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 border-pink-200 text-pink-700 hover:bg-pink-50/50 hover:text-pink-800 text-xs font-bold"
                                onClick={() => handlePrintMaternityReport(delivery)}
                              >
                                <Printer className="w-3.5 h-3.5 mr-1" />
                                Print Birth Summary
                              </Button>
                            </div>
                            
                            {delivery.notes && (
                              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg leading-relaxed mb-3">
                                <strong>Clinical Delivery Notes:</strong> {delivery.notes}
                              </div>
                            )}

                            {newborns.length > 0 && (
                              <div className="mt-2 space-y-2">
                                <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Newborn Infant Information</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {newborns.map((baby, idx) => (
                                    <div key={baby.id} className="p-2.5 rounded-lg border border-slate-100 bg-pink-50/10 flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
                                          #{idx + 1}
                                        </div>
                                        <div>
                                          <p className="font-bold text-slate-800">
                                            Gender: <span className="text-pink-600">{baby.gender || 'Unknown'}</span>
                                          </p>
                                          <p className="text-[10px] text-slate-400">
                                            Birth Weight: <span className="font-bold text-teal-600">{baby.birth_weight || '3.2'} kg</span>
                                          </p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="border-emerald-100 text-emerald-700 bg-emerald-50/50 text-[9px] font-bold">
                                        HEALTHY
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Billing & Payments */}
            {isFinancialVisible && (
              <Card className="border-none shadow-sm md:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-medical-blue" />
                    <CardTitle className="text-lg">Billing & Payment Status</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-4">
                    {(() => {
                      const totalDiscount = patientBills.reduce((acc, b) => acc + Number(b.discount_amount ?? b.discountAmount ?? b.discount ?? 0), 0);
                      return (
                        <div className={`grid grid-cols-1 ${totalDiscount > 0 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-4 mb-4`}>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Billed</p>
                            <p className="text-lg font-bold">{formatCurrency(patientBills.reduce((acc, b) => acc + Number(b.payable_amount ?? b.payableAmount ?? b.total_amount ?? b.totalAmount ?? 0), 0))}</p>
                          </div>
                          {totalDiscount > 0 && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                              <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Total Discount</p>
                              <p className="text-lg font-bold text-amber-700">{formatCurrency(totalDiscount)}</p>
                            </div>
                          )}
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Total Paid</p>
                            <p className="text-lg font-bold text-emerald-700">{formatCurrency(patientBills.reduce((acc, b) => acc + Number(b.paid_amount ?? b.paidAmount ?? 0), 0))}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                            <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Total Dues</p>
                            <p className="text-lg font-bold text-rose-700">{formatCurrency(dues)}</p>
                          </div>
                        </div>
                      );
                    })()}
                    
                    <div className="space-y-2">
                      {patientBills.map(bill => {
                        const discVal = Number(bill.discount_amount ?? bill.discountAmount ?? bill.discount ?? 0);
                        const grossAmount = Number(bill.total_amount ?? bill.totalAmount ?? 0);
                        const netAmount = Number(bill.payable_amount ?? bill.payableAmount ?? (grossAmount - discVal));
                        return (
                          <div key={bill.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {bill.status === 'Paid' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              </div>
                              <div>
                                 <p className="text-sm font-bold">Invoice #{bill.invoice_number || bill.id.toUpperCase()}</p>
                                 <p className="text-[10px] text-slate-500">{formatDate(bill.created_at)} • {bill.payment_method || 'N/A'}</p>
                               </div>
                             </div>
                             <div className="text-right flex flex-col items-end">
                               {discVal > 0 ? (
                                 <div className="flex flex-col items-end">
                                   <span className="text-[10px] text-slate-400 line-through leading-tight">
                                     {formatCurrency(grossAmount)}
                                   </span>
                                   <span className="text-[10px] text-emerald-600 font-semibold leading-tight">
                                     -{formatCurrency(discVal)} Disc
                                   </span>
                                   <p className="text-sm font-bold text-slate-900 leading-tight">{formatCurrency(netAmount)}</p>
                                 </div>
                               ) : (
                                 <p className="text-sm font-bold text-slate-900">{formatCurrency(grossAmount)}</p>
                               )}
                               <Badge variant="outline" className="text-[9px] uppercase mt-1">{bill.payment_status || bill.status}</Badge>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Prescription Dialog */}
      <Dialog open={isPrescriptionOpen} onOpenChange={setIsPrescriptionOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>{isReceptionist ? 'Enter Vitals / View Prescription' : 'Write New Prescription'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Input 
                disabled={isReceptionist}
                placeholder="Initial diagnosis..."
                value={newPrescription.diagnosis}
                onChange={e => setNewPrescription({...newPrescription, diagnosis: e.target.value})}
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Medicines</Label>
                {!isReceptionist && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-medical-blue h-8"
                    onClick={() => setNewPrescription({
                      ...newPrescription, 
                      medicines: [...newPrescription.medicines, { name: '', dosage: '', frequency: '' }]
                    })}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Medicine
                  </Button>
                )}
              </div>
              {newPrescription.medicines.map((med, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6 space-y-1">
                    <Input 
                      disabled={isReceptionist}
                      placeholder="Medicine name" 
                      value={med.name}
                      onChange={e => {
                        const meds = [...newPrescription.medicines];
                        meds[idx].name = e.target.value;
                        setNewPrescription({...newPrescription, medicines: meds});
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Input 
                      disabled={isReceptionist}
                      placeholder="Dosage" 
                      value={med.dosage}
                      onChange={e => {
                        const meds = [...newPrescription.medicines];
                        meds[idx].dosage = e.target.value;
                        setNewPrescription({...newPrescription, medicines: meds});
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Input 
                      disabled={isReceptionist}
                      placeholder="Freq" 
                      value={med.frequency}
                      onChange={e => {
                        const meds = [...newPrescription.medicines];
                        meds[idx].frequency = e.target.value;
                        setNewPrescription({...newPrescription, medicines: meds});
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>General Advice</Label>
              <textarea 
                disabled={isReceptionist}
                className="w-full min-h-[100px] p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                placeholder="Special instructions or advice..."
                value={newPrescription.advice}
                onChange={e => setNewPrescription({...newPrescription, advice: e.target.value})}
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
                    value={newPrescription.vitals?.bp || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), bp: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">Pulse (/min)</Label>
                  <Input 
                    placeholder="e.g. 72" 
                    value={newPrescription.vitals?.pulse || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), pulse: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">Temp (°F)</Label>
                  <Input 
                    placeholder="e.g. 98.6" 
                    value={newPrescription.vitals?.temp || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), temp: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">SpO2 (%)</Label>
                  <Input 
                    placeholder="e.g. 98" 
                    value={newPrescription.vitals?.spo2 || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), spo2: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">Weight (kg)</Label>
                  <Input 
                    placeholder="e.g. 65" 
                    value={newPrescription.vitals?.weight || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), weight: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase font-semibold">Resp Rate (/min)</Label>
                  <Input 
                    placeholder="e.g. 18" 
                    value={newPrescription.vitals?.rr || ''} 
                    onChange={(e) => setNewPrescription({
                      ...newPrescription,
                      vitals: { ...(newPrescription.vitals || {}), rr: e.target.value }
                    })}
                    className="h-9 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsPrescriptionOpen(false)}>Cancel</Button>
            <Button 
              type="button"
              variant="outline" 
              className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50" 
              onClick={() => handlePrintPrescription(newPrescription)}
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button className="bg-medical-blue" onClick={handleSavePrescription}>
              {isReceptionist ? 'Save Vitals Only' : 'Save Prescription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Clinical Note Dialog */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Medical / Clinical Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Note Type</Label>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant={newNote.note_type === 'DOCTOR' ? 'default' : 'outline'}
                  className={newNote.note_type === 'DOCTOR' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  onClick={() => setNewNote({ ...newNote, note_type: 'DOCTOR' })}
                >
                  Doctor Note
                </Button>
                <Button 
                  type="button"
                  variant={newNote.note_type === 'NURSE' ? 'default' : 'outline'}
                  className={newNote.note_type === 'NURSE' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                  onClick={() => setNewNote({ ...newNote, note_type: 'NURSE' })}
                >
                  Nurse Note
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Findings & Notes</Label>
              <textarea 
                className="w-full min-h-[150px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                placeholder="Enter detailed clinical findings, notes, diagnosis or patient observations..."
                value={newNote.content}
                onChange={e => setNewNote({...newNote, content: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>Cancel</Button>
            <Button className="bg-medical-blue" onClick={handleSaveClinicalNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Old Record Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Upload Old Prescription / Record</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center space-y-6">
            {!uploadedFile ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 hover:bg-slate-50 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                />
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-600">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
              </div>
            ) : (
              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-medical-blue">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-800 truncate">{uploadedFile.name}</p>
                  <p className="text-[10px] text-blue-600 font-bold uppercase">Ready to save</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setUploadedFile(null)}>
                  <Plus className="w-4 h-4 rotate-45" />
                </Button>
              </div>
            )}
            
            <p className="text-xs text-slate-500 italic">
              Note: This record will be attached to the patient's medical history for future reference.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
            <Button className="bg-medical-blue" disabled={!uploadedFile} onClick={handleSaveUpload}>Save Record</Button>
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
