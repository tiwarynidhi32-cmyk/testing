import { useState, useEffect, FormEvent } from 'react';
import { 
  Activity, 
  Plus, 
  Heart, 
  Wind, 
  Layers, 
  Volume2, 
  Clock, 
  Calendar, 
  AlertOctagon, 
  CheckCircle, 
  User, 
  Search, 
  ArrowUpRight, 
  Thermometer, 
  Syringe, 
  Sparkles,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';
import { supabaseService, toDeterministicUuid } from '@/services/supabaseService';

// DB Mapper helper functions
const mapDbToBed = (db: any) => {
  if (!db) return null;
  return {
    id: db.id,
    patientName: db.patientName !== undefined ? db.patientName : (db.patient_name || 'Vacant'),
    mrn: db.mrn !== undefined ? db.mrn : (db.mrn || ''),
    status: db.status !== undefined ? db.status : (db.status || 'Available'),
    primaryDoc: db.primaryDoc !== undefined ? db.primaryDoc : (db.primary_doc || ''),
    admittedDate: db.admittedDate !== undefined ? db.admittedDate : (db.admitted_date || ''),
    gender: db.gender !== undefined ? db.gender : (db.gender || ''),
    age: db.age !== undefined ? db.age : (db.age || 0)
  };
};

const mapBedToDb = (bed: any) => {
  if (!bed) return null;
  return {
    id: bed.id,
    patient_name: bed.patientName,
    mrn: bed.mrn,
    status: bed.status,
    primary_doc: bed.primaryDoc,
    admitted_date: bed.admittedDate || null,
    gender: bed.gender,
    age: Number(bed.age) || 0
  };
};

const mapDbToVitals = (db: any) => {
  if (!db) return null;
  return {
    id: db.id,
    bedId: db.bedId !== undefined ? db.bedId : db.bed_id,
    heartRate: db.heartRate !== undefined ? db.heartRate : (db.heart_rate !== undefined ? db.heart_rate : (db.hr || 80)),
    bp: db.bp || `${db.bp_sys || 120}/${db.bp_dia || 80}`,
    spo2: db.spo2 || 98,
    respRate: db.respRate !== undefined ? db.respRate : (db.resp_rate !== undefined ? db.resp_rate : (db.rr || 16)),
    temp: db.temp !== undefined ? Number(db.temp) : 37.0,
    recordedAt: db.recordedAt !== undefined ? db.recordedAt : (db.recorded_at || '')
  };
};

const mapVitalsToDb = (v: any) => {
  if (!v) return null;
  return {
    id: toDeterministicUuid(v.id),
    bed_id: v.bedId,
    heart_rate: Number(v.heartRate) || 80,
    bp: v.bp || '120/80',
    spo2: Number(v.spo2) || 98,
    resp_rate: Number(v.respRate) || 16,
    temp: Number(v.temp) || 37.0,
    recorded_at: v.recordedAt || new Date().toISOString()
  };
};

const mapDbToVentilator = (db: any) => {
  if (!db) return null;
  return {
    id: db.id,
    bedId: db.bedId !== undefined ? db.bedId : db.bed_id,
    mode: db.mode || 'SIMV + PS',
    fio2: db.fio2 || 40,
    peep: db.peep || 5,
    tidalVolume: db.tidalVolume !== undefined ? db.tidalVolume : (db.tidal_volume || 400),
    respiratoryRate: db.respiratoryRate !== undefined ? db.respiratoryRate : (db.respiratory_rate || 12)
  };
};

const mapVentilatorToDb = (v: any) => {
  if (!v) return null;
  return {
    id: toDeterministicUuid(v.id),
    bed_id: v.bedId,
    mode: v.mode,
    fio2: Number(v.fio2) || 40,
    peep: Number(v.peep) || 5,
    tidal_volume: Number(v.tidalVolume) || 400,
    respiratory_rate: Number(v.respiratoryRate) || 12
  };
};

const mapDbToInfusion = (db: any) => {
  if (!db) return null;
  return {
    id: db.id,
    bedId: db.bedId !== undefined ? db.bedId : db.bed_id,
    drugName: db.drugName !== undefined ? db.drugName : (db.drug_name || ''),
    rate: db.rate || '',
    concentration: db.concentration || '',
    remarks: db.remarks || ''
  };
};

const mapInfusionToDb = (i: any) => {
  if (!i) return null;
  return {
    id: toDeterministicUuid(i.id),
    bed_id: i.bedId,
    drug_name: i.drugName,
    rate: i.rate,
    concentration: i.concentration,
    remarks: i.remarks
  };
};

const mapDbToAlert = (db: any) => {
  if (!db) return null;
  return {
    id: db.id,
    bedId: db.bedId !== undefined ? db.bedId : db.bed_id,
    eventName: db.eventName !== undefined ? db.eventName : (db.event_name || ''),
    severity: db.severity || 'Critical',
    actionTaken: db.actionTaken !== undefined ? db.actionTaken : (db.action_taken || ''),
    time: db.time !== undefined ? db.time : (db.logged_at || '')
  };
};

const mapAlertToDb = (a: any) => {
  if (!a) return null;
  return {
    id: toDeterministicUuid(a.id),
    bed_id: a.bedId,
    event_name: a.eventName,
    severity: a.severity,
    action_taken: a.actionTaken,
    logged_at: a.time || new Date().toISOString()
  };
};

const SAMPLE_BEDS = [
  { id: 'ICU-BED-01', patientName: 'Arjun Mehta', mrn: 'MRN-1029', status: 'On Ventilator', primaryDoc: 'Dr. Aditya Patel', admittedDate: '2026-07-01', gender: 'Male', age: 62 },
  { id: 'ICU-BED-02', patientName: 'Nirmala Sen', mrn: 'MRN-5541', status: 'Inotropic Support', primaryDoc: 'Dr. Suresh Nair', admittedDate: '2026-07-04', gender: 'Female', age: 58 },
  { id: 'ICU-BED-03', patientName: 'Vacant', mrn: '', status: 'Available', primaryDoc: '', admittedDate: '', gender: '', age: 0 },
  { id: 'ICU-BED-04', patientName: 'Mahesh Patil', mrn: 'MRN-9021', status: 'Stable / Monitoring', primaryDoc: 'Dr. Preeti Verma', admittedDate: '2026-07-07', gender: 'Male', age: 71 },
  { id: 'ICU-BED-05', patientName: 'Vacant', mrn: '', status: 'Available', primaryDoc: '', admittedDate: '', gender: '', age: 0 },
  { id: 'ICU-BED-06', patientName: 'Kalyani Deshmukh', mrn: 'MRN-1102', status: 'On Ventilator', primaryDoc: 'Dr. Aditya Patel', admittedDate: '2026-07-08', gender: 'Female', age: 31 }
];

const SAMPLE_VITALS = [
  { id: 'VIT001', bedId: 'ICU-BED-01', heartRate: 98, bp: '110/68', spo2: 94, respRate: 18, temp: 37.8, recordedAt: '2026-07-09 08:00 AM' },
  { id: 'VIT002', bedId: 'ICU-BED-02', heartRate: 112, bp: '95/55', spo2: 97, respRate: 22, temp: 36.9, recordedAt: '2026-07-09 08:30 AM' },
  { id: 'VIT003', bedId: 'ICU-BED-04', heartRate: 72, bp: '124/80', spo2: 99, respRate: 14, temp: 36.6, recordedAt: '2026-07-09 09:00 AM' }
];

const SAMPLE_VENTILATORS = [
  { id: 'VNT001', bedId: 'ICU-BED-01', mode: 'SIMV + PS', fio2: 45, peep: 8, tidalVolume: 420, respiratoryRate: 14 },
  { id: 'VNT002', bedId: 'ICU-BED-06', mode: 'PCV / Assist', fio2: 50, peep: 10, tidalVolume: 380, respiratoryRate: 16 }
];

const SAMPLE_INFUSIONS = [
  { id: 'INF001', bedId: 'ICU-BED-01', drugName: 'Propofol', rate: '15 ml/hr', concentration: '10 mg/ml', remarks: 'Sedation compliance' },
  { id: 'INF002', bedId: 'ICU-BED-02', drugName: 'Noradrenaline', rate: '0.15 mcg/kg/min', concentration: '4 mg in 50ml NS', remarks: 'Maintain MAP > 65' }
];

const SAMPLE_ALERTS = [
  { id: 'ALT001', bedId: 'ICU-BED-01', eventName: 'SpO2 Drop Below 90%', severity: 'Critical', actionTaken: 'Suctioning performed, FiO2 bumped to 60%', time: '2026-07-09 04:30 AM' },
  { id: 'ALT002', bedId: 'ICU-BED-02', eventName: 'Code Blue Call / Cardiac Arrest', severity: 'Emergency', actionTaken: 'Defibrillation 200J x1, CPR x2 cycles, ROSC achieved.', time: '2026-07-08 10:15 PM' }
];

export default function IcuManagement() {
  const [activeTab, setActiveTab] = useState<'beds' | 'vitals' | 'ventilation' | 'infusions' | 'alerts'>('beds');
  
  // State
  const [beds, setBeds] = useState<any[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);
  const [vents, setVents] = useState<any[]>([]);
  const [infusions, setInfusions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Modals
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isVentModalOpen, setIsVentModalOpen] = useState(false);
  const [isInfusionModalOpen, setIsInfusionModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Form states
  const [selectedBedId, setSelectedBedId] = useState('ICU-BED-01');
  const [admitForm, setAdmitForm] = useState({ patientName: '', mrn: '', status: 'Stable / Monitoring', primaryDoc: 'Dr. Suresh Nair', admittedDate: '', gender: 'Male', age: 40 });
  const [vitalsForm, setVitalsForm] = useState({ heartRate: 80, bp: '120/80', spo2: 98, respRate: 16, temp: 37.0 });
  const [ventForm, setVentForm] = useState({ mode: 'SIMV + PS', fio2: 40, peep: 5, tidalVolume: 400, respiratoryRate: 12 });
  const [infForm, setInfForm] = useState({ drugName: 'Noradrenaline', rate: '0.1 mcg/kg/min', concentration: '4 mg in 50ml NS', remarks: '' });
  const [altForm, setAltForm] = useState({ eventName: '', severity: 'Critical', actionTaken: '' });

  // Load state from Supabase with offline LocalStorage fallback
  useEffect(() => {
    const fetchIcuData = async () => {
      try {
        const [bedsData, vitalsData, ventsData, infusionsData, alertsData] = await Promise.all([
          supabaseService.getIcuBeds(),
          supabaseService.getIcuVitals(),
          supabaseService.getIcuVentilators(),
          supabaseService.getIcuInfusions(),
          supabaseService.getIcuAlerts(),
        ]);
        
        // Beds
        if (bedsData && bedsData.length > 0) {
          const mapped = bedsData.map(mapDbToBed);
          setBeds(mapped);
          storage.set('hms_icu_beds', mapped);
        } else {
          const local = storage.get('hms_icu_beds', SAMPLE_BEDS);
          setBeds(local);
          // Seed Supabase
          await Promise.all(local.map(bed => supabaseService.createIcuBed(mapBedToDb(bed))));
        }
        
        // Vitals
        if (vitalsData && vitalsData.length > 0) {
          const mapped = vitalsData.map(mapDbToVitals);
          setVitals(mapped);
          storage.set('hms_icu_vitals', mapped);
        } else {
          const local = storage.get('hms_icu_vitals', SAMPLE_VITALS);
          setVitals(local);
          // Seed Supabase
          await Promise.all(local.map(vit => supabaseService.createIcuVitals(mapVitalsToDb(vit))));
        }
        
        // Ventilators
        if (ventsData && ventsData.length > 0) {
          const mapped = ventsData.map(mapDbToVentilator);
          setVents(mapped);
          storage.set('hms_icu_ventilation', mapped);
        } else {
          const local = storage.get('hms_icu_ventilation', SAMPLE_VENTILATORS);
          setVents(local);
          // Seed Supabase
          await Promise.all(local.map(vnt => supabaseService.createOrUpdateIcuVentilator(mapVentilatorToDb(vnt))));
        }
        
        // Infusions
        if (infusionsData && infusionsData.length > 0) {
          const mapped = infusionsData.map(mapDbToInfusion);
          setInfusions(mapped);
          storage.set('hms_icu_infusions', mapped);
        } else {
          const local = storage.get('hms_icu_infusions', SAMPLE_INFUSIONS);
          setInfusions(local);
          // Seed Supabase
          await Promise.all(local.map(inf => supabaseService.createIcuInfusion(mapInfusionToDb(inf))));
        }
        
        // Alerts
        if (alertsData && alertsData.length > 0) {
          const mapped = alertsData.map(mapDbToAlert);
          setAlerts(mapped);
          storage.set('hms_icu_alerts', mapped);
        } else {
          const local = storage.get('hms_icu_alerts', SAMPLE_ALERTS);
          setAlerts(local);
          // Seed Supabase
          await Promise.all(local.map(alt => supabaseService.createIcuAlert(mapAlertToDb(alt))));
        }
      } catch (err) {
        console.warn('Error fetching ICU data, using cached local states:', err);
        const localBeds = storage.get('hms_icu_beds', SAMPLE_BEDS);
        const localVitals = storage.get('hms_icu_vitals', SAMPLE_VITALS);
        const localVents = storage.get('hms_icu_ventilation', SAMPLE_VENTILATORS);
        const localInfusions = storage.get('hms_icu_infusions', SAMPLE_INFUSIONS);
        const localAlerts = storage.get('hms_icu_alerts', SAMPLE_ALERTS);

        setBeds(localBeds.map((b: any) => b.patientName !== undefined ? b : mapDbToBed(b)));
        setVitals(localVitals.map((v: any) => v.heartRate !== undefined ? v : mapDbToVitals(v)));
        setVents(localVents.map((v: any) => v.tidalVolume !== undefined ? v : mapDbToVentilator(v)));
        setInfusions(localInfusions.map((i: any) => i.drugName !== undefined ? i : mapDbToInfusion(i)));
        setAlerts(localAlerts.map((a: any) => a.eventName !== undefined ? a : mapDbToAlert(a)));
      }
    };
    fetchIcuData();
  }, []);

  const saveBeds = async (nb: any[], updatedBedId?: string) => {
    setBeds(nb);
    storage.set('hms_icu_beds', nb);
    if (updatedBedId) {
      const targetBed = nb.find(b => b.id === updatedBedId);
      if (targetBed) {
        try {
          await supabaseService.updateIcuBed(updatedBedId, mapBedToDb(targetBed));
        } catch (e: any) {
          console.warn('Silent ICU Bed Sync failed:', e.message);
        }
      }
    }
  };

  const saveVitals = async (nv: any[], newVitalItem?: any) => {
    setVitals(nv);
    storage.set('hms_icu_vitals', nv);
    if (newVitalItem) {
      try {
        await supabaseService.createIcuVitals(mapVitalsToDb(newVitalItem));
      } catch (e: any) {
        console.warn('Silent ICU Vitals Sync failed:', e.message);
      }
    }
  };

  const saveVents = async (nvt: any[], changedVentItem?: any) => {
    setVents(nvt);
    storage.set('hms_icu_ventilation', nvt);
    if (changedVentItem) {
      try {
        await supabaseService.createOrUpdateIcuVentilator(mapVentilatorToDb(changedVentItem));
      } catch (e: any) {
        console.warn('Silent ICU Vent Sync failed:', e.message);
      }
    }
  };

  const saveInfusions = async (ni: any[], isDelete?: boolean, item?: any) => {
    setInfusions(ni);
    storage.set('hms_icu_infusions', ni);
    if (item) {
      try {
        if (isDelete) {
          await supabaseService.deleteIcuInfusion(toDeterministicUuid(item.id));
        } else {
          await supabaseService.createIcuInfusion(mapInfusionToDb(item));
        }
      } catch (e: any) {
        console.warn('Silent ICU Infusion Sync failed:', e.message);
      }
    }
  };

  const saveAlerts = async (na: any[], newAlertItem?: any) => {
    setAlerts(na);
    storage.set('hms_icu_alerts', na);
    if (newAlertItem) {
      try {
        await supabaseService.createIcuAlert(mapAlertToDb(newAlertItem));
      } catch (e: any) {
        console.warn('Silent ICU Alert Sync failed:', e.message);
      }
    }
  };

  // Handlers
  const handleAdmit = (e: FormEvent) => {
    e.preventDefault();
    if (!admitForm.patientName || !admitForm.mrn) {
      toast.error('Patient Name and MRN is required');
      return;
    }
    const targetBed = beds.find(b => b.id === selectedBedId);
    if (!targetBed || targetBed.patientName !== 'Vacant') {
      toast.error('Selected bed is occupied. Choose another bed.');
      return;
    }

    const updatedBeds = beds.map(bed => {
      if (bed.id === selectedBedId) {
        return { ...bed, ...admitForm };
      }
      return bed;
    });
    saveBeds(updatedBeds, selectedBedId);
    setIsAdmitModalOpen(false);
    toast.success(`Patient admitted to ${selectedBedId} successfully`);
    setAdmitForm({ patientName: '', mrn: '', status: 'Stable / Monitoring', primaryDoc: 'Dr. Suresh Nair', admittedDate: '', gender: 'Male', age: 40 });
  };

  const handleDischargeBed = (bedId: string) => {
    if (confirm(`Are you sure you want to log discharge/transfer for bed ${bedId}?`)) {
      const updatedBeds = beds.map(bed => {
        if (bed.id === bedId) {
          return { id: bedId, patientName: 'Vacant', mrn: '', status: 'Available', primaryDoc: '', admittedDate: '', gender: '', age: 0 };
        }
        return bed;
      });
      saveBeds(updatedBeds, bedId);
      toast.success(`Bed ${bedId} is now marked vacant.`);
    }
  };

  const handleAddVitals = (e: FormEvent) => {
    e.preventDefault();
    const newId = `VIT${String(vitals.length + 1).padStart(3, '0')}`;
    const now = new Date();
    const payload = {
      id: newId,
      bedId: selectedBedId,
      ...vitalsForm,
      recordedAt: now.toLocaleString([], { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit', year: '2-digit' })
    };
    saveVitals([payload, ...vitals], payload);
    setIsVitalsModalOpen(false);
    toast.success(`Vitals recorded for bed ${selectedBedId}`);
  };

  const handleAddVentilation = (e: FormEvent) => {
    e.preventDefault();
    const isEditing = vents.some(v => v.bedId === selectedBedId);
    let updated;
    if (isEditing) {
      updated = vents.map(v => v.bedId === selectedBedId ? { ...v, ...ventForm } : v);
      toast.success(`Ventilator parameters adjusted for ${selectedBedId}`);
    } else {
      const newId = `VNT${String(vents.length + 1).padStart(3, '0')}`;
      updated = [{ id: newId, bedId: selectedBedId, ...ventForm }, ...vents];
      toast.success(`Ventilator settings registered for ${selectedBedId}`);
    }
    const targetVent = updated.find(v => v.bedId === selectedBedId);
    saveVents(updated, targetVent);
    setIsVentModalOpen(false);
  };

  const handleAddInfusion = (e: FormEvent) => {
    e.preventDefault();
    const newId = `INF${String(infusions.length + 1).padStart(3, '0')}`;
    const payload = { id: newId, bedId: selectedBedId, ...infForm };
    saveInfusions([payload, ...infusions], false, payload);
    setIsInfusionModalOpen(false);
    toast.success(`Infusion pump initialized on bed ${selectedBedId}`);
  };

  const handleAddAlert = (e: FormEvent) => {
    e.preventDefault();
    if (!altForm.eventName) {
      toast.error('Please specify the event alert name');
      return;
    }
    const newId = `ALT${String(alerts.length + 1).padStart(3, '0')}`;
    const now = new Date();
    const payload = {
      id: newId,
      bedId: selectedBedId,
      ...altForm,
      time: now.toLocaleString()
    };
    saveAlerts([payload, ...alerts], payload);
    setIsAlertModalOpen(false);
    toast.success('Clinical critical event logged successfully.');
  };

  const getBedStatusColor = (status: string) => {
    if (status === 'On Ventilator') return 'border-red-400 bg-red-50/50 text-red-800';
    if (status === 'Inotropic Support') return 'border-amber-400 bg-amber-50/50 text-amber-800';
    if (status === 'Stable / Monitoring') return 'border-teal-400 bg-teal-50/50 text-teal-800';
    return 'border-dashed border-slate-300 text-slate-400 hover:border-slate-500 hover:text-slate-700 bg-white';
  };

  return (
    <div id="icu-management-core" className="p-4 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-[#1A5E63] rounded-3xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-white/15 rounded-2xl">
              <Activity className="w-7 h-7 text-rose-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif" style={{ fontFamily: "Georgia, serif" }}>ICU Control Center & Critical Care</h1>
              <p className="text-xs text-teal-100 font-medium">Continuous telemetry, mechanical ventilation charting, syringe infusers, bed occupancy, and emergency code tracking.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsAdmitModalOpen(true)} className="bg-rose-500 hover:bg-rose-600 text-white font-bold gap-2 rounded-full px-5 py-5 h-auto text-xs shadow-sm">
            <Plus className="w-4 h-4 stroke-[3]" /> Critical Care Admission
          </Button>
          <Button onClick={() => setIsAlertModalOpen(true)} className="bg-red-700 hover:bg-red-800 text-white font-bold gap-2 rounded-full px-5 py-5 h-auto text-xs shadow-sm">
            <Zap className="w-4 h-4" /> Trigger Critical Alert / Event
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-[9px] text-slate-400 font-bold uppercase">Total ICU Beds</span>
          <p className="text-lg font-black text-slate-800 mt-1">{beds.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-[9px] text-red-500 font-bold uppercase">On Ventilator</span>
          <p className="text-lg font-black text-red-600 mt-1">{beds.filter(b => b.status === 'On Ventilator').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-[9px] text-amber-500 font-bold uppercase">Inotropic Support</span>
          <p className="text-lg font-black text-amber-600 mt-1">{beds.filter(b => b.status === 'Inotropic Support').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-[9px] text-teal-500 font-bold uppercase">Stable Beds</span>
          <p className="text-lg font-black text-teal-600 mt-1">{beds.filter(b => b.status === 'Stable / Monitoring').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-[9px] text-slate-400 font-bold uppercase">Available Beds</span>
          <p className="text-lg font-black text-[#1A5E63] mt-1">{beds.filter(b => b.status === 'Available').length}</p>
        </div>
      </div>

      {/* Bed Occupancy Grid Map */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">ICU Bed Layout Map & Continuous Monitoring</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {beds.map(bed => {
            const isVacant = bed.patientName === 'Vacant';
            const bStyle = getBedStatusColor(bed.status);
            return (
              <div key={bed.id} className={`p-5 rounded-2xl border transition-all relative ${bStyle}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider">{bed.id}</span>
                    <h4 className="font-extrabold text-sm mt-1">{bed.patientName}</h4>
                  </div>
                  <Badge variant={isVacant ? 'outline' : 'default'} className={
                    bed.status.includes('Ventilator') ? 'bg-red-100 text-red-800 border-red-200' :
                    bed.status.includes('Inotropic') ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    bed.status.includes('Stable') ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-slate-100 text-slate-600'
                  }>
                    {bed.status}
                  </Badge>
                </div>

                {!isVacant && (
                  <div className="mt-4 space-y-2 text-xs border-t pt-3">
                    <div className="grid grid-cols-2 text-slate-500">
                      <p>MRN: <span className="font-bold text-slate-800">{bed.mrn}</span></p>
                      <p>Age/Sex: <span className="font-bold text-slate-800">{bed.age} / {bed.gender}</span></p>
                    </div>
                    <p className="text-slate-500">Primary: <span className="font-bold text-slate-800">{bed.primaryDoc}</span></p>
                    <p className="text-[10px] text-slate-400 font-semibold">Admitted: {bed.admittedDate}</p>

                    <div className="flex gap-1.5 pt-2 border-t mt-2">
                      <Button onClick={() => { setSelectedBedId(bed.id); setIsVitalsModalOpen(true); }} size="sm" className="h-7 text-[10px] bg-slate-800 hover:bg-slate-900 text-white flex-1">
                        Log Vitals
                      </Button>
                      <Button onClick={() => handleDischargeBed(bed.id)} variant="outline" size="sm" className="h-7 text-[10px] text-rose-600 hover:bg-rose-50 border-rose-200 flex-1">
                        Discharge / Transfer
                      </Button>
                    </div>
                  </div>
                )}

                {isVacant && (
                  <div className="mt-8 flex justify-center py-5">
                    <Button onClick={() => { setSelectedBedId(bed.id); setIsAdmitModalOpen(true); }} variant="link" className="text-xs font-black text-slate-500 flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Admit Patient here
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto whitespace-nowrap scrollbar-none gap-2 pt-4">
        <button 
          onClick={() => setActiveTab('beds')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'beds' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Continuous Vitals registry
        </button>
        <button 
          onClick={() => setActiveTab('ventilation')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'ventilation' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Mechanical Ventilation Settings
        </button>
        <button 
          onClick={() => setActiveTab('infusions')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'infusions' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Inotropes & Syringe Infusers
        </button>
        <button 
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'alerts' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Critical Incident logs (Code events)
        </button>
      </div>

      {/* Main Tab Panel */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 lg:p-6 min-h-[350px]">
        {/* Vitals */}
        {activeTab === 'beds' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Bed ID</th>
                    <th className="p-3">HR (BPM)</th>
                    <th className="p-3">BP (Systolic/Diast)</th>
                    <th className="p-3">SpO2 %</th>
                    <th className="p-3">Resp Rate (BPM)</th>
                    <th className="p-3">Temp (°C)</th>
                    <th className="p-3">Recorded Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {vitals.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-700">{v.bedId}</td>
                      <td className="p-3 font-extrabold text-rose-600 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                        {v.heartRate} bpm
                      </td>
                      <td className="p-3 font-bold text-slate-800">{v.bp}</td>
                      <td className="p-3 font-black text-[#1A5E63]">{v.spo2}%</td>
                      <td className="p-3 font-medium text-slate-600">{v.respRate} bpm</td>
                      <td className="p-3 font-mono font-bold text-slate-700">{v.temp}°C</td>
                      <td className="p-3 text-slate-400 font-mono">{v.recordedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ventilation */}
        {activeTab === 'ventilation' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-50/40 p-4 rounded-xl border border-blue-100">
              <p className="text-[11px] text-slate-600 font-medium">Ventilation Parameters for intubated ICU patients. Checked by respiratory therapists every shifts.</p>
              <Button onClick={() => setIsVentModalOpen(true)} className="bg-[#1A5E63] text-xs h-8 rounded-full">
                Adjust Ventilation Setting
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Bed ID</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">FiO2 (Oxygen %)</th>
                    <th className="p-3">PEEP (cmH2O)</th>
                    <th className="p-3">Tidal Volume (mL)</th>
                    <th className="p-3">Respiratory Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {vents.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-[#1A5E63]">{v.bedId}</td>
                      <td className="p-3"><Badge className="bg-blue-50 text-blue-700">{v.mode}</Badge></td>
                      <td className="p-3 font-black text-rose-600">{v.fio2}%</td>
                      <td className="p-3 font-mono font-bold text-slate-700">{v.peep} cmH2O</td>
                      <td className="p-3 font-extrabold text-slate-800">{v.tidalVolume} mL</td>
                      <td className="p-3 font-semibold text-slate-600">{v.respiratoryRate} bpm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Infusion Pumps */}
        {activeTab === 'infusions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
              <p className="text-xs font-semibold text-slate-700">Active syringe and volumetric infusion pumps</p>
              <Button onClick={() => setIsInfusionModalOpen(true)} className="bg-[#1A5E63] text-xs h-8 rounded-full">
                Initialize Infuser
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {infusions.map(inf => (
                <div key={inf.id} className="p-4 rounded-xl border bg-white shadow-sm flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400">{inf.bedId}</span>
                      <Badge className="bg-amber-50 text-amber-800 border-amber-200">Active</Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Syringe className="w-4 h-4 text-[#1A5E63]" />
                      <h4 className="font-extrabold text-slate-800 text-sm">{inf.drugName}</h4>
                    </div>
                    <p className="text-lg font-black text-amber-600">{inf.rate}</p>
                    <p className="text-[11px] text-slate-500">Conc: <span className="text-slate-800 font-semibold">{inf.concentration}</span></p>
                    <p className="text-[11px] text-slate-400 leading-normal italic">Notes: {inf.remarks || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical Alerts */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Alert ID</th>
                    <th className="p-3">Bed ID</th>
                    <th className="p-3">Incident / Event</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Clinical Action Taken</th>
                    <th className="p-3">Time logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {alerts.map(alt => (
                    <tr key={alt.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-red-600">{alt.id}</td>
                      <td className="p-3 font-bold text-slate-700">{alt.bedId}</td>
                      <td className="p-3 font-extrabold text-slate-800 flex items-center gap-1.5">
                        <AlertOctagon className="w-3.5 h-3.5 text-red-600 fill-red-50" />
                        {alt.eventName}
                      </td>
                      <td className="p-3">
                        <Badge className="bg-red-100 text-red-800 border-red-200 uppercase font-black tracking-wider text-[9px]">
                          {alt.severity}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-600 font-semibold max-w-sm">{alt.actionTaken}</td>
                      <td className="p-3 text-slate-400 font-mono">{alt.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Admit Modal */}
      {isAdmitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Critical Care Admission Profile</h3>
              <button onClick={() => setIsAdmitModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAdmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Assign Bed Number *</Label>
                  <Select value={selectedBedId} onValueChange={(val) => setSelectedBedId(val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {beds.filter(b => b.patientName === 'Vacant').map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Acuity Status *</Label>
                  <Select 
                    value={admitForm.status} 
                    onValueChange={(val) => setAdmitForm({ ...admitForm, status: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="On Ventilator">On Ventilator</SelectItem>
                      <SelectItem value="Inotropic Support">Inotropic Support</SelectItem>
                      <SelectItem value="Stable / Monitoring">Stable / Monitoring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Patient Full Name *</Label>
                <Input 
                  value={admitForm.patientName} 
                  onChange={(e) => setAdmitForm({ ...admitForm, patientName: e.target.value })}
                  placeholder="e.g. Arjun Mehta" 
                  required 
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>MRN Reference *</Label>
                  <Input 
                    value={admitForm.mrn} 
                    onChange={(e) => setAdmitForm({ ...admitForm, mrn: e.target.value })}
                    placeholder="MRN-1000" 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Age *</Label>
                  <Input 
                    type="number" 
                    value={admitForm.age} 
                    onChange={(e) => setAdmitForm({ ...admitForm, age: Number(e.target.value) })} 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select 
                    value={admitForm.gender} 
                    onValueChange={(val) => setAdmitForm({ ...admitForm, gender: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Primary Critical Care Physician *</Label>
                  <Input 
                    value={admitForm.primaryDoc} 
                    onChange={(e) => setAdmitForm({ ...admitForm, primaryDoc: e.target.value })}
                    placeholder="Dr. Preeti Verma" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Admission Date *</Label>
                  <Input 
                    type="date" 
                    value={admitForm.admittedDate} 
                    onChange={(e) => setAdmitForm({ ...admitForm, admittedDate: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAdmitModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] text-white font-bold">Confirm Admission</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vitals Log Modal */}
      {isVitalsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Log Bed Telemetry Vitals ({selectedBedId})</h3>
              <button onClick={() => setIsVitalsModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAddVitals} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Heart Rate (BPM) *</Label>
                  <Input 
                    type="number" 
                    value={vitalsForm.heartRate} 
                    onChange={(e) => setVitalsForm({ ...vitalsForm, heartRate: Number(e.target.value) })} 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Blood Pressure (Systolic/Diastolic) *</Label>
                  <Input 
                    value={vitalsForm.bp} 
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bp: e.target.value })}
                    placeholder="120/80" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>SpO2 (%) *</Label>
                  <Input 
                    type="number" 
                    value={vitalsForm.spo2} 
                    onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: Number(e.target.value) })} 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Resp Rate (BPM) *</Label>
                  <Input 
                    type="number" 
                    value={vitalsForm.respRate} 
                    onChange={(e) => setVitalsForm({ ...vitalsForm, respRate: Number(e.target.value) })} 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Temp (°C) *</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={vitalsForm.temp} 
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temp: Number(e.target.value) })} 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsVitalsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] text-white font-bold">Lock Telemetry Vitals</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ventilation Settings modal */}
      {isVentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Adjust Ventilation Chart ({selectedBedId})</h3>
              <button onClick={() => setIsVentModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAddVentilation} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ventilator Bed ID</Label>
                  <Select value={selectedBedId} onValueChange={(val) => setSelectedBedId(val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {beds.filter(b => b.status === 'On Ventilator').map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.id} ({b.patientName})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Ventilator Mode *</Label>
                  <Select 
                    value={ventForm.mode} 
                    onValueChange={(val) => setVentForm({ ...ventForm, mode: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIMV + PS">SIMV + Pressure Support</SelectItem>
                      <SelectItem value="PCV / Assist">PCV / Assist Control</SelectItem>
                      <SelectItem value="VCV / Assist">VCV / Assist Control</SelectItem>
                      <SelectItem value="CPAP">CPAP / Spontaneous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>FiO2 (%) *</Label>
                  <Input 
                    type="number" 
                    value={ventForm.fio2} 
                    onChange={(e) => setVentForm({ ...ventForm, fio2: Number(e.target.value) })} 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>PEEP (cmH2O) *</Label>
                  <Input 
                    type="number" 
                    value={ventForm.peep} 
                    onChange={(e) => setVentForm({ ...ventForm, peep: Number(e.target.value) })} 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tidal Volume (mL) *</Label>
                  <Input 
                    type="number" 
                    value={ventForm.tidalVolume} 
                    onChange={(e) => setVentForm({ ...ventForm, tidalVolume: Number(e.target.value) })} 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Respiratory Rate (BPM) *</Label>
                  <Input 
                    type="number" 
                    value={ventForm.respiratoryRate} 
                    onChange={(e) => setVentForm({ ...ventForm, respiratoryRate: Number(e.target.value) })} 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsVentModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] text-white font-bold">Save Ventilation parameters</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Infusion Pumps modal */}
      {isInfusionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Initialize Syringe / Infusion Pump</h3>
              <button onClick={() => setIsInfusionModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAddInfusion} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Target Bed ID *</Label>
                  <Select value={selectedBedId} onValueChange={(val) => setSelectedBedId(val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {beds.filter(b => b.patientName !== 'Vacant').map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.id} ({b.patientName})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Inotrope / Drug *</Label>
                  <Select 
                    value={infForm.drugName} 
                    onValueChange={(val) => setInfForm({ ...infForm, drugName: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Noradrenaline">Noradrenaline</SelectItem>
                      <SelectItem value="Adrenaline">Adrenaline</SelectItem>
                      <SelectItem value="Vasopressin">Vasopressin</SelectItem>
                      <SelectItem value="Dobutamine">Dobutamine</SelectItem>
                      <SelectItem value="Propofol">Propofol</SelectItem>
                      <SelectItem value="Fentanyl">Fentanyl</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Infusion Rate * (e.g. ml/hr)</Label>
                  <Input 
                    value={infForm.rate} 
                    onChange={(e) => setInfForm({ ...infForm, rate: e.target.value })}
                    placeholder="e.g. 0.1 mcg/kg/min or 15 ml/hr" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Concentration *</Label>
                  <Input 
                    value={infForm.concentration} 
                    onChange={(e) => setInfForm({ ...infForm, concentration: e.target.value })}
                    placeholder="e.g. 4 mg in 50ml NS" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Dosage / Infuser Remarks</Label>
                <textarea 
                  value={infForm.remarks} 
                  onChange={(e) => setInfForm({ ...infForm, remarks: e.target.value })}
                  rows={2} 
                  placeholder="Titrate to target MAP or keep RASS score -2..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5E63]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsInfusionModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] text-white font-bold">Start Infusion Pump</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Critical Alert modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-red-700 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Log Critical ICU Incident / Code Event</h3>
              <button onClick={() => setIsAlertModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAddAlert} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Incident Bed ID *</Label>
                  <Select value={selectedBedId} onValueChange={(val) => setSelectedBedId(val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {beds.filter(b => b.patientName !== 'Vacant').map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.id} ({b.patientName})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Severity *</Label>
                  <Select 
                    value={altForm.severity} 
                    onValueChange={(val) => setAltForm({ ...altForm, severity: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Critical">Critical (Stat Alert)</SelectItem>
                      <SelectItem value="Emergency">Emergency (Code Blue / Arrest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Event / Call Name *</Label>
                <Input 
                  value={altForm.eventName} 
                  onChange={(e) => setAltForm({ ...altForm, eventName: e.target.value })}
                  placeholder="e.g. Code Blue called / Accidental Extubation" 
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <Label>Immediate Action Taken *</Label>
                <textarea 
                  value={altForm.actionTaken} 
                  onChange={(e) => setAltForm({ ...altForm, actionTaken: e.target.value })}
                  rows={3} 
                  placeholder="CPR initiated, emergency intubation performed, epinephrine given stat..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5E63]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAlertModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-red-700 hover:bg-red-800 text-white font-bold">Lock Incident Log</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
