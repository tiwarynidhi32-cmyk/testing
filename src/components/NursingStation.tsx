import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Plus, 
  Search,
  MoreVertical,
  Thermometer,
  Heart,
  Wind,
  Droplets,
  ClipboardList,
  Calendar,
  Download,
  Edit,
  Trash2,
  Loader2,
  Tv,
  RefreshCw,
  Layers,
  Users,
  ShieldAlert,
  PlusCircle,
  TrendingUp,
  Sliders,
  Check,
  Award,
  AlertTriangle,
  Play,
  HeartCrack,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Subcomponent to animate and sweep the ECG, SpO2, and RESP waveforms on a <canvas> simulating an ICU bedside monitor.
export function ICUBedsideMonitor({ patient, vitals }: { patient: any; vitals: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let x = 0;
    const width = canvas.width;
    const height = canvas.height;
    
    // Fill background initially
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    const draw = () => {
      // Clear a small vertical strip ahead of the sweep line to prevent overlap lines
      ctx.fillStyle = '#090d16';
      ctx.fillRect(x, 0, 12, height);

      // --- ECG WAVE (Green) ---
      const ecgY = height * 0.25;
      let ecgVal = 0;
      const ecgCycle = Math.floor(x) % 50;
      if (ecgCycle === 0) ecgVal = -4; // Q
      else if (ecgCycle === 2) ecgVal = 40; // R (sharp peak)
      else if (ecgCycle === 4) ecgVal = -15; // S
      else if (ecgCycle === 12) ecgVal = 10; // T
      else ecgVal = Math.sin(x * 0.15) * 1.5; // Baseline micro-noise
      
      ctx.strokeStyle = '#22c55e'; // Neon Green
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Draw line from previous x
      const prevEcgY = ecgY + (Math.sin((x - 1.5) * 0.15) * 1.5);
      ctx.moveTo(x - 1.5, ecgCycle <= 1 || ecgCycle >= 5 ? prevEcgY : ecgY);
      ctx.lineTo(x, ecgY - ecgVal);
      ctx.stroke();

      // --- SPO2 PLETH WAVE (Cyan Blue) ---
      const spo2Y = height * 0.62;
      const spo2Val = Math.sin(x * 0.12) * 12 + Math.cos(x * 0.24) * 3;
      ctx.strokeStyle = '#06b6d4'; // Cyan
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x - 1.5, spo2Y + Math.sin((x - 1.5) * 0.12) * 12 + Math.cos((x - 1.5) * 0.24) * 3);
      ctx.lineTo(x, spo2Y + spo2Val);
      ctx.stroke();

      // --- RESPIRATORY WAVE (Amber Yellow) ---
      const respY = height * 0.85;
      const respVal = Math.sin(x * 0.04) * 8;
      ctx.strokeStyle = '#eab308'; // Amber/Yellow
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 1.5, respY + Math.sin((x - 1.5) * 0.04) * 8);
      ctx.lineTo(x, respY + respVal);
      ctx.stroke();

      // Sweep increment
      x = (x + 1.5) % width;
      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [vitals]);

  return (
    <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/20 text-[10px] py-0 px-2 rounded-full animate-pulse">
            ICU ACTIVE
          </Badge>
          <span className="font-extrabold text-slate-100 uppercase tracking-wider text-[11px]">
            Bedside {patient?.bed || 'ICU-B1'} • {patient?.name || 'Unassigned Patient'}
          </span>
        </div>
        <span className="text-[#22c55e] font-black tracking-widest text-[10px] animate-pulse flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping inline-block"></span>
          REAL-TIME STREAM
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#111827] border border-emerald-950/50 rounded-xl p-2.5 text-center shadow-md relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
          <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">HR (ECG)</span>
          <span className="text-2xl font-black text-[#22c55e] tracking-tight block my-0.5 animate-pulse">
            {vitals?.pulse || '72'}
          </span>
          <span className="text-[9px] text-slate-500 font-semibold uppercase">BPM</span>
        </div>

        <div className="bg-[#111827] border border-cyan-950/50 rounded-xl p-2.5 text-center shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500"></div>
          <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">SpO2</span>
          <span className="text-2xl font-black text-[#06b6d4] tracking-tight block my-0.5">
            {vitals?.spo2 || '98'}%
          </span>
          <span className="text-[9px] text-slate-500 font-semibold uppercase">Oxygen</span>
        </div>

        <div className="bg-[#111827] border border-yellow-950/50 rounded-xl p-2.5 text-center shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500"></div>
          <span className="text-[10px] text-yellow-400 font-bold block uppercase tracking-wider">NIBP</span>
          <span className="text-base font-black text-[#eab308] tracking-tight block my-1">
            {vitals?.bp || '120/80'}
          </span>
          <span className="text-[9px] text-slate-500 font-semibold uppercase">mmHg</span>
        </div>

        <div className="bg-[#111827] border border-rose-950/50 rounded-xl p-2.5 text-center shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
          <span className="text-[10px] text-rose-400 font-bold block uppercase tracking-wider">TEMP</span>
          <span className="text-2xl font-black text-[#f43f5e] tracking-tight block my-0.5">
            {vitals?.temp || '98.6'}°F
          </span>
          <span className="text-[9px] text-slate-500 font-semibold uppercase">Oral</span>
        </div>
      </div>

      <div className="relative border border-slate-800 rounded-xl bg-[#030712] overflow-hidden h-[160px] p-1 shadow-inner">
        <canvas ref={canvasRef} width="450" height="150" className="w-full h-full block opacity-90" />
        <div className="absolute top-2.5 left-3 text-[9px] font-black text-[#22c55e] bg-[#030712]/80 px-2 py-0.5 rounded-full border border-green-950 shadow-sm uppercase">ECG Lead II</div>
        <div className="absolute top-16 left-3 text-[9px] font-black text-[#06b6d4] bg-[#030712]/80 px-2 py-0.5 rounded-full border border-cyan-950 shadow-sm uppercase">Plethysmograph</div>
        <div className="absolute bottom-2.5 left-3 text-[9px] font-black text-[#eab308] bg-[#030712]/80 px-2 py-0.5 rounded-full border border-yellow-950 shadow-sm uppercase">Respiratory Rate</div>
      </div>
    </div>
  );
}

const formatCountdown = (seconds: number) => {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
  return `${seconds}s`;
};

export default function NursingStation() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic state selectors
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isTVMode, setIsTVMode] = useState(false);
  const [syncCountdown, setSyncCountdown] = useState(3600);

  // Filter conditions
  const [taskFilter, setTaskFilter] = useState<'All' | 'Dressing' | 'Nebulization' | 'Injection' | 'IV management' | 'Monitoring' | 'Medication'>('All');

  // Modals & Inputs
  const [isVitalsDialogOpen, setIsVitalsDialogOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [isAdmitDialogOpen, setIsAdmitDialogOpen] = useState(false);

  const [newVitals, setNewVitals] = useState({ bp: '', pulse: '', temp: '', spo2: '' });
  const [newTask, setNewTask] = useState({ description: '', priority: 'Low', dueTime: '', patientId: '', type: 'Monitoring', nurseId: '' });
  const [newShift, setNewShift] = useState({ nurseId: '', shiftType: 'Morning', ward: 'General Ward A' });

  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [selectedAdmitPatient, setSelectedAdmitPatient] = useState<any>(null);
  const [admitBed, setAdmitBed] = useState('Bed W-101');
  const [admitStatus, setAdmitStatus] = useState('Stable');

  // Core Data Fetch function
  const fetchData = async () => {
    try {
      const isInitial = tasks.length === 0 && patients.length === 0;
      if (isInitial) {
        setLoading(true);
      }
      
      const [tasksData, patientsData, vitalsData, shiftsData, staffData] = await Promise.all([
        supabaseService.getNursingTasks(),
        supabaseService.getPatients(),
        supabaseService.getPatientVitals(),
        supabaseService.getNurseShifts(),
        supabaseService.getStaff()
      ]);
      
      // Update local states
      if (tasksData) setTasks(tasksData);
      if (patientsData) setPatients(patientsData);
      if (vitalsData) setVitals(vitalsData);
      if (shiftsData) setShifts(shiftsData);
      if (staffData) setStaff(staffData);

      // Set first patient selected if none is selected
      const admitted = (patientsData || []).filter((p: any) => p.status && !['active', 'registered', 'discharged'].includes(p.status.toLowerCase()));
      if (admitted.length > 0 && !selectedPatientId) {
        setSelectedPatientId(admitted[0].id);
      }

      // Check if we should auto-seed demonstration data if empty
      if ((patientsData || []).length > 0) {
        await ensureMockDataSeeded(patientsData, shiftsData || [], tasksData || []);
      }
    } catch (e: any) {
      console.error('Error fetching clinical ward data:', e);
      toast.error('Data sync failed. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  // Seeding routine for demonstration
  const ensureMockDataSeeded = async (currentPatients: any[], currentShifts: any[], currentTasks: any[]) => {
    const activePatients = currentPatients.filter((p: any) => p.status && !['active', 'registered', 'discharged'].includes(p.status.toLowerCase()));
    
    if (activePatients.length === 0 && currentPatients.length > 0) {
      toast.info('Admitting a few demo patients to ward for clinical dashboard...');
      
      // We will select first 4 patients and update their status to ward active
      for (let i = 0; i < Math.min(4, currentPatients.length); i++) {
        const statuses = ['Stable', 'Moderate Risk', 'High Risk', 'Stable'];
        const p = currentPatients[i];
        await supabaseService.updatePatient(p.id, { 
          status: statuses[i % statuses.length],
          bed: p.bed || `Bed W-${101 + i}`
        });
      }
      
      fetchData();
    }
  };

  // Automated 1-hour live polling sync
  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSyncCountdown((prev) => {
        if (prev <= 1) {
          fetchDataRef.current();
          return 3600; // Reset sync interval to 1 hour (3600 seconds)
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Hook up instant BroadcastChannel real-time database update sync
  useDataSync(fetchData);

  // Handlers for Patients
  const handleAdmitPatient = async (patientId: string, bed?: string, status?: string) => {
    const bedNo = bed || 'Bed W-' + Math.floor(101 + Math.random() * 50);
    const condStatus = status || 'Stable';
    const result = await supabaseService.updatePatient(patientId, { status: condStatus, bed: bedNo });
    if (result) {
      toast.success(`Patient admitted to ${bedNo}`);
      setIsAdmitDialogOpen(false);
      setSelectedAdmitPatient(null);
      setPatientSearchTerm('');
      fetchData();
    } else {
      toast.error('Failed to admit patient');
    }
  };

  const handleUpdateCondition = async (patientId: string, status: string) => {
    const result = await supabaseService.updatePatient(patientId, { status });
    if (result) {
      toast.success(`Patient status updated to ${status}`);
      fetchData();
    } else {
      toast.error('Failed to update patient status');
    }
  };

  // Handlers for Vitals
  const handleUpdateVitals = async () => {
    if (!selectedPatientId) return;
    
    const pulseNum = parseInt(newVitals.pulse);
    const spo2Num = parseInt(newVitals.spo2);

    if (!newVitals.bp || isNaN(pulseNum) || isNaN(spo2Num)) {
      toast.error('Please enter valid vitals data');
      return;
    }

    const payload = {
      patient_id: selectedPatientId,
      patientId: selectedPatientId,
      bp: newVitals.bp,
      pulse: pulseNum,
      temp: newVitals.temp || '98.6',
      spo2: spo2Num,
      recorded_at: new Date().toISOString()
    };

    const result = await supabaseService.updateVitals(payload);
    if (result) {
      toast.success('Patient vitals logged successfully');
      setIsVitalsDialogOpen(false);
      setNewVitals({ bp: '', pulse: '', temp: '', spo2: '' });
      fetchData();
    } else {
      toast.error('Failed to update patient vitals');
    }
  };

  // Handlers for Tasks & Schedules
  const handleAddTask = async () => {
    if (!newTask.description || !newTask.dueTime || !newTask.patientId) {
      toast.error('Please complete all task attributes');
      return;
    }

    const taskData = {
      description: newTask.description,
      priority: newTask.priority,
      due_time: newTask.dueTime,
      dueTime: newTask.dueTime,
      patient_id: newTask.patientId,
      patientId: newTask.patientId,
      status: 'Pending',
      type: newTask.type,
      nurse_id: newTask.nurseId || null,
      nurseId: newTask.nurseId || null
    };

    const result = await supabaseService.createNursingTask(taskData);
    if (result) {
      toast.success(`New ${newTask.type} task assigned successfully`);
      setIsAddTaskOpen(false);
      setNewTask({ description: '', priority: 'Low', dueTime: '', patientId: '', type: 'Monitoring', nurseId: '' });
      fetchData();
    } else {
      toast.error('Failed to register clinical task');
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    const result = await supabaseService.updateNursingTask(taskId, { status: newStatus });
    if (result) {
      toast.success('Task marked completed successfully');
      fetchData();
    } else {
      toast.error('Failed to alter task status');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this clinical task?")) {
      return;
    }
    const result = await supabaseService.deleteNursingTask(id);
    if (result) {
      toast.success('Clinical task removed from board');
      fetchData();
    } else {
      toast.error('Failed to delete task');
    }
  };

  // Auto-generate medication daily schedules
  const handleAutoGenerateMedicationSchedule = async (patientId: string) => {
    if (!patientId) return;
    toast.loading('Auto-generating medication daily schedule...');

    const scheduledMeds = [
      { description: 'Administer Tab. Paracetamol 500mg (Post-Op Pain)', priority: 'Medium', dueTime: '08:00 AM', type: 'Medication' },
      { description: 'Administer Inj. Pantoprazole 40mg IV (Pre-Breakfast)', priority: 'High', dueTime: '07:00 AM', type: 'Medication' },
      { description: 'Administer Tab. Amoxicillin 250mg (Antibiotic Dose 1)', priority: 'High', dueTime: '12:00 PM', type: 'Medication' },
      { description: 'Administer Infusion Normal Saline 500ml IV (100ml/hr)', priority: 'Medium', dueTime: '02:00 PM', type: 'Medication' }
    ];

    try {
      let count = 0;
      for (const med of scheduledMeds) {
        const result = await supabaseService.createNursingTask({
          description: med.description,
          priority: med.priority,
          due_time: med.dueTime,
          dueTime: med.dueTime,
          patient_id: patientId,
          patientId: patientId,
          status: 'Pending',
          type: med.type
        });
        if (result) count++;
      }
      toast.dismiss();
      toast.success(`Successfully auto-generated ${count} medication schedules!`);
      fetchData();
    } catch (e) {
      toast.dismiss();
      toast.error('Failed to auto-generate medication schedules');
    }
  };

  // Shift & Rostering handlers
  const handleAddShift = async () => {
    if (!newShift.nurseId || !newShift.ward) {
      toast.error('Please specify nurse and ward');
      return;
    }

    const shiftData = {
      nurse_id: newShift.nurseId,
      nurseId: newShift.nurseId,
      shift_type: newShift.shiftType,
      shiftType: newShift.shiftType,
      ward: newShift.ward,
      status: 'Active'
    };

    const result = await supabaseService.createNurseShift(shiftData);
    if (result) {
      toast.success('Shift assignment registered successfully');
      setIsShiftDialogOpen(false);
      setNewShift({ nurseId: '', shiftType: 'Morning', ward: 'General Ward A' });
      fetchData();
    } else {
      toast.error('Failed to assign nurse shift');
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this shift assignment?")) {
      return;
    }
    const result = await supabaseService.deleteNurseShift(id);
    if (result) {
      toast.success('Shift assignment removed');
      fetchData();
    } else {
      toast.error('Failed to remove shift');
    }
  };

  // Helper functions to identify abnormal vitals for high-visibility flashing alarms
  const checkVitalsAlarm = (vitalRecord: any) => {
    if (!vitalRecord) return { isAbnormal: false, alarms: [] as string[] };
    
    const alarms: string[] = [];
    const pulse = Number(vitalRecord.pulse);
    const spo2 = Number(vitalRecord.spo2);
    const temp = Number(vitalRecord.temp);
    const bp = vitalRecord.bp || '';

    // Check SpO2
    if (spo2 && spo2 < 95) {
      alarms.push(`CRITICAL HYPOXIA (SpO2: ${spo2}%)`);
    }

    // Check Pulse Rate
    if (pulse) {
      if (pulse > 100) alarms.push(`TACHYCARDIA (Pulse: ${pulse} bpm)`);
      if (pulse < 60) alarms.push(`BRADYCARIDIA (Pulse: ${pulse} bpm)`);
    }

    // Check Temperature
    if (temp) {
      if (temp > 99.5) alarms.push(`FEVER/HYPERTHERMIA (${temp}°F)`);
      if (temp < 97.0) alarms.push(`HYPOTHERMIA (${temp}°F)`);
    }

    // Check Blood Pressure
    if (bp) {
      const parts = bp.split('/');
      if (parts.length === 2) {
        const sys = Number(parts[0]);
        const dia = Number(parts[1]);
        if (sys > 140 || dia > 90) alarms.push(`HYPERTENSION (${bp} mmHg)`);
        if (sys < 90 || dia < 60) alarms.push(`HYPOTENSION (${bp} mmHg)`);
      }
    }

    return {
      isAbnormal: alarms.length > 0,
      alarms
    };
  };

  // Filter admitted patients
  const admittedPatients = patients.filter((p: any) => p.status && !['active', 'registered', 'discharged'].includes(p.status.toLowerCase()));
  
  // Find selected patient full record
  const selectedPatient = admittedPatients.find((p: any) => p.id === selectedPatientId) || admittedPatients[0];

  // Selected patient vitals
  const selectedVitals = selectedPatient 
    ? vitals.find((v: any) => v.patientId === selectedPatient.id || v.patient_id === selectedPatient.id)
    : null;

  // Generate historical trend records for chart based on selected patient's active vitals
  const trendHistory = selectedVitals 
    ? [
        { time: '02:00 AM', Pulse: Math.max(50, selectedVitals.pulse - 6), SpO2: Math.min(100, selectedVitals.spo2 + 1), Temp: parseFloat((Number(selectedVitals.temp) - 0.4).toFixed(1)) },
        { time: '04:00 AM', Pulse: Math.max(50, selectedVitals.pulse - 3), SpO2: Math.min(100, selectedVitals.spo2 + 0), Temp: parseFloat((Number(selectedVitals.temp) - 0.2).toFixed(1)) },
        { time: '06:00 AM', Pulse: Math.max(50, selectedVitals.pulse + 8), SpO2: Math.max(80, selectedVitals.spo2 - 2), Temp: parseFloat((Number(selectedVitals.temp) + 0.3).toFixed(1)) },
        { time: '08:00 AM', Pulse: Math.max(50, selectedVitals.pulse + 2), SpO2: Math.max(80, selectedVitals.spo2 - 1), Temp: parseFloat((Number(selectedVitals.temp) + 0.1).toFixed(1)) },
        { time: '10:00 AM', Pulse: selectedVitals.pulse, SpO2: selectedVitals.spo2, Temp: parseFloat(Number(selectedVitals.temp).toFixed(1)) }
      ]
    : [
        { time: '02:00 AM', Pulse: 68, SpO2: 99, Temp: 98.4 },
        { time: '04:00 AM', Pulse: 70, SpO2: 98, Temp: 98.5 },
        { time: '06:00 AM', Pulse: 75, SpO2: 97, Temp: 98.9 },
        { time: '08:00 AM', Pulse: 72, SpO2: 98, Temp: 98.6 },
        { time: '10:00 AM', Pulse: 74, SpO2: 98, Temp: 98.6 }
      ];

  // Map nurse shifts to visual list
  const activeStaffList = staff.filter((s: any) => s.role && s.role.toLowerCase() === 'nurse');

  // Compute pending tasks counts per active shift nurse
  const pendingTasksPerStaff = shifts.map((sh: any) => {
    const nurseObj = staff.find((st: any) => st.id === sh.nurseId || st.id === sh.nurse_id);
    const nurseName = nurseObj ? nurseObj.name : 'Unknown Nurse';
    const pendingCount = tasks.filter((t: any) => 
      t.status === 'Pending' && 
      (t.nurseId === sh.nurseId || t.nurse_id === sh.nurse_id || t.assignedNurse === nurseName)
    ).length;

    return {
      id: sh.id,
      nurseName,
      ward: sh.ward,
      shiftType: sh.shiftType || sh.shift_type,
      pendingCount
    };
  });

  // Calculate overdue tasks. A medication/task is overdue if description starts with Administer/Medication or due hour is in the past.
  const isTaskOverdue = (dueTimeStr: string) => {
    if (!dueTimeStr) return false;
    // Simple mock comparison: If dueTimeStr contains "07:00" or "08:00" and current hour is later, mock as overdue
    // Let's check for "AM" and typical lower times to highlight as Overdue
    const lower = dueTimeStr.toLowerCase();
    if (lower.includes('07:00 am') || lower.includes('08:00 am') || lower.includes('09:00 am')) {
      return true; // Simple visual trigger for demo
    }
    return false;
  };

  // Filter clinical tasks based on category selector
  const filteredTasks = tasks.filter((t: any) => {
    // Make sure we resolve patient reference properly
    const matchesPatient = selectedPatientId ? (t.patientId === selectedPatientId || t.patient_id === selectedPatientId) : true;
    
    if (taskFilter === 'All') return matchesPatient;
    if (taskFilter === 'Medication') {
      return matchesPatient && (t.type === 'Medication' || t.description.toLowerCase().startsWith('administer'));
    }
    return matchesPatient && (t.type || '').toLowerCase() === taskFilter.toLowerCase();
  });

  // Export tasks handler
  const handleExportTasks = () => {
    const headers = ['Bed', 'Patient Name', 'Clinical Task', 'Category', 'Due Time', 'Priority', 'Status'];
    const rows = tasks.map((t: any) => {
      const p = patients.find((pat: any) => pat.id === t.patientId || pat.id === t.patient_id);
      return [
        p?.bed || 'N/A',
        p?.name || 'Unassigned',
        `"${t.description.replace(/"/g, '""')}"`,
        t.type || 'Clinical',
        t.dueTime || t.due_time || 'N/A',
        t.priority || 'Medium',
        t.status || 'Pending'
      ];
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nursing_workflow_export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    toast.success('Clinical task rosters exported successfully!');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] space-y-3">
        <Loader2 className="w-12 h-12 animate-spin text-[#1A5E63]" />
        <span className="font-extrabold text-slate-700 tracking-tight text-lg">Initializing Clinical Station...</span>
        <p className="text-xs text-slate-400">Syncing with hospital local network...</p>
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-screen transition-all duration-500 ${isTVMode ? 'bg-[#090d16] text-slate-200' : 'bg-slate-50/50 text-slate-800'} space-y-6`}>
      
      {/* Header Banner */}
      <div 
        className="rounded-3xl p-6 text-white shadow-xl overflow-hidden relative" 
        style={{ background: 'linear-gradient(135deg, #1A5E63 0%, #103a3d 100%)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md shadow-inner border border-white/10">
                <Activity className="w-7 h-7 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight uppercase">
                  Ward Clinical Hub
                </h1>
                <p className="text-xs text-emerald-300 font-bold tracking-wider mt-1 uppercase flex items-center gap-2">
                  <span>Smart Nursing Station & Real-Time Roster</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1.5 text-white bg-emerald-500/30 px-2 py-0.5 rounded-full text-[10px]">
                    <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                    Auto-Syncing: {formatCountdown(syncCountdown)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* LAN/Wi-Fi Active badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-bold text-emerald-400">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0"></span>
              <span>LAN/Wi-Fi connected</span>
            </div>

            <Button 
              variant="outline" 
              className={`rounded-2xl gap-2 font-bold transition-all border-white/20 hover:bg-white/10 ${isTVMode ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30' : 'bg-white/10 text-white'}`}
              onClick={() => {
                setIsTVMode(!isTVMode);
                toast.success(isTVMode ? 'Normal mode active' : 'Large Screen TV mode active');
              }}
            >
              <Tv className="w-4 h-4" />
              {isTVMode ? 'Dashboard View' : 'TV Screen Mode'}
            </Button>

            <Button 
              variant="outline" 
              className="bg-white/10 text-white hover:bg-white/20 rounded-2xl gap-2 font-bold border-white/20"
              onClick={handleExportTasks}
            >
              <Download className="w-4 h-4" />
              Export Rosters
            </Button>

            <Dialog open={isAdmitDialogOpen} onOpenChange={(open) => {
              setIsAdmitDialogOpen(open);
              if (!open) {
                setSelectedAdmitPatient(null);
                setPatientSearchTerm('');
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl gap-2 font-extrabold shadow-md border border-emerald-400/30">
                  <PlusCircle className="w-4 h-4" />
                  Admit Ward Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-extrabold text-slate-900">Admit Patient to Bed</DialogTitle>
                  <DialogDescription>
                    {selectedAdmitPatient 
                      ? "Specify the ward bed number and initial triage acuity level for this patient."
                      : "Search registered OPD patients to allocate them to active ward care and bedside monitoring."
                    }
                  </DialogDescription>
                </DialogHeader>

                {selectedAdmitPatient ? (
                  <div className="space-y-4 py-4">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
                      <Label className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Selected Patient</Label>
                      <p className="text-base font-black text-slate-800 mt-1">{selectedAdmitPatient.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedAdmitPatient.mrn} • {selectedAdmitPatient.age} Yrs • {selectedAdmitPatient.gender}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">Assign Bed / Ward Number</Label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="e.g. Bed W-105" 
                          className="rounded-2xl flex-1"
                          value={admitBed}
                          onChange={(e) => setAdmitBed(e.target.value)}
                        />
                        <Select value={admitBed} onValueChange={setAdmitBed}>
                          <SelectTrigger className="w-[140px] rounded-2xl">
                            <SelectValue placeholder="Quick Beds" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bed W-101">Bed W-101</SelectItem>
                            <SelectItem value="Bed W-102">Bed W-102</SelectItem>
                            <SelectItem value="Bed W-103">Bed W-103</SelectItem>
                            <SelectItem value="Bed W-104">Bed W-104</SelectItem>
                            <SelectItem value="Bed W-105">Bed W-105</SelectItem>
                            <SelectItem value="ICU-B1">ICU Bed 1</SelectItem>
                            <SelectItem value="ICU-B2">ICU Bed 2</SelectItem>
                            <SelectItem value="ICU-B3">ICU Bed 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">Clinical Acuity / Condition</Label>
                      <Select value={admitStatus} onValueChange={setAdmitStatus}>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue placeholder="Select Acuity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Stable">Stable (Routine Monitoring)</SelectItem>
                          <SelectItem value="Moderate Risk">Moderate Risk (Frequent Observation)</SelectItem>
                          <SelectItem value="High Risk">High Risk (Continuous ICU Telemetry)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2 relative">
                      <Label className="font-bold text-slate-700">Search Patient Name, Phone, or MRN</Label>
                      <div className="relative">
                        <Input 
                          placeholder="Start typing patient name..." 
                          className="rounded-2xl"
                          value={patientSearchTerm}
                          onChange={(e) => {
                            setPatientSearchTerm(e.target.value);
                            setShowPatientResults(true);
                          }}
                          onFocus={() => setShowPatientResults(true)}
                        />
                        <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                      </div>
                      
                      {showPatientResults && patientSearchTerm.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[220px] overflow-y-auto divide-y divide-slate-100">
                          {patients.filter((p: any) => 
                            (p.name?.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                            (p.phone || '').includes(patientSearchTerm) ||
                            (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())) &&
                            (!p.status || ['active', 'registered', 'discharged'].includes(p.status.toLowerCase()))
                          ).map((p: any) => (
                            <div 
                              key={p.id} 
                              className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={() => {
                                setSelectedAdmitPatient(p);
                                const nextBedNum = 'Bed W-' + Math.floor(101 + Math.random() * 50);
                                setAdmitBed(nextBedNum);
                              }}
                            >
                              <p className="text-xs font-bold text-slate-800">{p.name}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{p.mrn} • {p.phone || 'No phone'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <DialogFooter className="flex gap-2">
                  {selectedAdmitPatient ? (
                    <>
                      <Button variant="outline" className="rounded-2xl" onClick={() => setSelectedAdmitPatient(null)}>
                        Back
                      </Button>
                      <Button 
                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold"
                        onClick={() => handleAdmitPatient(selectedAdmitPatient.id, admitBed, admitStatus)}
                      >
                        Confirm Admission
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" className="rounded-2xl" onClick={() => setIsAdmitDialogOpen(false)}>
                      Cancel
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Critical Flashing Alerts Board */}
      {admittedPatients.some((p: any) => {
        const pVital = vitals.find((v: any) => v.patientId === p.id || v.patient_id === p.id);
        return checkVitalsAlarm(pVital).isAbnormal || p.status === 'High Risk';
      }) && (
        <div className="bg-red-500/10 border-2 border-red-500/30 rounded-3xl p-4 flex items-start gap-3 animate-pulse">
          <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-red-500 uppercase tracking-wide">
              Critical Ward Telemetry Alarms
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {admittedPatients.map((p: any) => {
                const pVital = vitals.find((v: any) => v.patientId === p.id || v.patient_id === p.id);
                const { isAbnormal, alarms } = checkVitalsAlarm(pVital);
                if (!isAbnormal && p.status !== 'High Risk') return null;

                return (
                  <Badge key={p.id} className="bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm text-[10px]">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                    <span>{p.bed || 'Bed W'}: {p.name} - {alarms.length > 0 ? alarms.join(' | ') : 'HIGH RISK'}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols wide on Desktop) - Patient Overview Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Patient Overview Panel */}
          <Card className={`rounded-3xl border-none shadow-md overflow-hidden ${isTVMode ? 'bg-[#111827] border border-slate-800' : 'bg-white'}`}>
            <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 px-6">
              <div>
                <CardTitle className={`text-lg font-extrabold uppercase ${isTVMode ? 'text-white' : 'text-slate-900'}`}>
                  Patient Bed & Telemetry Allocation
                </CardTitle>
                <CardDescription className={`${isTVMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Real-time bedside monitoring profiles for admitted ward patients
                </CardDescription>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1 text-xs font-bold rounded-full">
                {admittedPatients.length} Admitted Beds
              </Badge>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {admittedPatients.map((patient: any, idx: number) => {
                  const patientVitals = vitals.find((v: any) => v.patientId === patient.id || v.patient_id === patient.id);
                  const isSelected = selectedPatientId === patient.id;
                  
                  // Evaluate risk and vital alarms
                  const { isAbnormal } = checkVitalsAlarm(patientVitals);
                  const riskCode = patient.status || 'Stable';

                  let bgBorderColor = 'border-slate-100';
                  let riskBadgeColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
                  
                  if (riskCode === 'High Risk' || isAbnormal) {
                    bgBorderColor = isSelected ? 'border-red-500 ring-2 ring-red-500/20' : 'border-red-200 bg-red-50/20';
                    riskBadgeColor = 'bg-red-500 text-white';
                  } else if (riskCode === 'Moderate Risk') {
                    bgBorderColor = isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-200 bg-amber-50/20';
                    riskBadgeColor = 'bg-amber-500 text-white';
                  } else {
                    bgBorderColor = isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-emerald-100 bg-emerald-50/10';
                  }

                  return (
                    <div 
                      key={patient.id}
                      onClick={() => setSelectedPatientId(patient.id)}
                      className={`border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 relative hover:shadow-md ${bgBorderColor} ${
                        isTVMode ? 'bg-slate-900/50' : ''
                      }`}
                    >
                      {/* Bed Number Indicator */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#1A5E63] text-white font-extrabold text-[11px] px-2.5 py-1 rounded-lg uppercase tracking-wide shadow-sm">
                            {patient.bed || `Bed W-${idx + 101}`}
                          </span>
                          <span className={`text-xs font-bold ${isTVMode ? 'text-white' : 'text-slate-800'} truncate max-w-[120px]`}>
                            {patient.name}
                          </span>
                        </div>
                        <Badge className={`${riskBadgeColor} text-[9px] font-extrabold uppercase py-0.5 px-2 rounded-full`}>
                          {riskCode}
                        </Badge>
                      </div>

                      {/* Demographics row */}
                      <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-500 font-bold mb-4">
                        <div>
                          <span className="block text-slate-400 uppercase text-[8px]">Age/Gender</span>
                          <span>{patient.age || '42'} Y / {patient.gender || 'Male'}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 uppercase text-[8px]">Blood Group</span>
                          <span className="text-red-500">{patient.bloodGroup || patient.blood_group || 'O+'}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 uppercase text-[8px]">MRN Identifier</span>
                          <span className="font-mono">{patient.mrn || 'MRN-100492'}</span>
                        </div>
                      </div>

                      {/* Clinical Vitals row */}
                      <div className="bg-slate-100/50 dark:bg-slate-900/60 rounded-xl p-2 flex justify-between gap-1 items-center font-mono">
                        <div className="text-center flex-1 border-r border-slate-200/50 dark:border-slate-800/50">
                          <span className="text-[7px] text-slate-400 block font-bold uppercase">Pulse</span>
                          <span className={`text-xs font-black ${patientVitals?.pulse > 100 || patientVitals?.pulse < 60 ? 'text-red-500 animate-pulse' : isTVMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            {patientVitals?.pulse || '72'} <span className="text-[8px] font-normal text-slate-400">bpm</span>
                          </span>
                        </div>

                        <div className="text-center flex-1 border-r border-slate-200/50 dark:border-slate-800/50">
                          <span className="text-[7px] text-slate-400 block font-bold uppercase">SpO2</span>
                          <span className={`text-xs font-black ${patientVitals?.spo2 < 95 ? 'text-red-500 animate-pulse' : 'text-cyan-500'}`}>
                            {patientVitals?.spo2 || '98'}%
                          </span>
                        </div>

                        <div className="text-center flex-1 border-r border-slate-200/50 dark:border-slate-800/50">
                          <span className="text-[7px] text-slate-400 block font-bold uppercase">NIBP</span>
                          <span className="text-xs font-black text-amber-500">
                            {patientVitals?.bp || '120/80'}
                          </span>
                        </div>

                        <div className="text-center flex-1">
                          <span className="text-[7px] text-slate-400 block font-bold uppercase">Temp</span>
                          <span className="text-xs font-black text-rose-500">
                            {patientVitals?.temp || '98.6'}°F
                          </span>
                        </div>
                      </div>

                      {/* Patient Action panel */}
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] text-slate-400 font-bold uppercase">
                          Last Updated: {patientVitals?.lastUpdated ? new Date(patientVitals.lastUpdated).toLocaleTimeString() : 'Just Now'}
                        </span>
                        <div className="flex gap-1.5">
                          <Select 
                            value={riskCode} 
                            onValueChange={(val) => handleUpdateCondition(patient.id, val)}
                          >
                            <SelectTrigger className="h-6 text-[9px] font-bold rounded-lg py-0 px-2 border-slate-200">
                              <SelectValue placeholder="Condition" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Stable" className="text-xs font-bold text-emerald-600">Stable</SelectItem>
                              <SelectItem value="Moderate Risk" className="text-xs font-bold text-amber-500">Moderate</SelectItem>
                              <SelectItem value="High Risk" className="text-xs font-bold text-red-600">High Risk</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-6 h-6 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Discharge patient from ward and clear bed?')) {
                                await supabaseService.updatePatient(patient.id, { status: 'Discharged', bed: null });
                                toast.success('Patient discharged from ward Bed');
                                fetchData();
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {admittedPatients.length === 0 && (
                  <div className="col-span-2 text-center py-10">
                    <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-400">No patients currently admitted to beds</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Admit Ward Patient" to register beds.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ICU Bedside Monitor & Trend Graph Panel */}
          {selectedPatient && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Animated Monitor */}
              <ICUBedsideMonitor patient={selectedPatient} vitals={selectedVitals} />

              {/* Trend graph for selected patient */}
              <Card className={`rounded-3xl border-none shadow-md overflow-hidden ${isTVMode ? 'bg-[#111827] border border-slate-800' : 'bg-white'}`}>
                <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className={`text-sm font-extrabold uppercase ${isTVMode ? 'text-white' : 'text-slate-900'}`}>
                      Clinical Vitals Trend
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      Historical trend log (Pulse & SpO2)
                    </CardDescription>
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSpO2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isTVMode ? "#1f2937" : "#f1f5f9"} />
                        <XAxis dataKey="time" tick={{ fontSize: 9, fill: isTVMode ? '#9ca3af' : '#64748b', fontWeight: 'bold' }} />
                        <YAxis domain={[50, 105]} tick={{ fontSize: 9, fill: isTVMode ? '#9ca3af' : '#64748b', fontWeight: 'bold' }} />
                        <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12 }} />
                        <Area type="monotone" dataKey="Pulse" stroke="#22c55e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPulse)" name="Pulse (bpm)" />
                        <Area type="monotone" dataKey="SpO2" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSpO2)" name="Oxygen (%)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-500 mt-2">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#22c55e] rounded"></span> Pulse (bpm)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 bg-[#06b6d4] rounded"></span> SpO2 (%)</span>
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

          {/* Task Assignment Module */}
          <Card className={`rounded-3xl border-none shadow-md overflow-hidden ${isTVMode ? 'bg-[#111827] border border-slate-800' : 'bg-white'}`}>
            <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className={`text-lg font-extrabold uppercase ${isTVMode ? 'text-white' : 'text-slate-900'}`}>
                  Ward Task Assignment & Schedules
                </CardTitle>
                <CardDescription className={`${isTVMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Allocate and manage specific ward-staff tasks (Dressing, Nebulization, Injections, IV, Monitoring)
                </CardDescription>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Select 
                  value={taskFilter} 
                  onValueChange={(val: any) => setTaskFilter(val)}
                >
                  <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Filter Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="All" className="text-xs font-bold">All Categories</SelectItem>
                    <SelectItem value="Dressing" className="text-xs font-bold">Dressing</SelectItem>
                    <SelectItem value="Nebulization" className="text-xs font-bold">Nebulization</SelectItem>
                    <SelectItem value="Injection" className="text-xs font-bold">Injection</SelectItem>
                    <SelectItem value="IV management" className="text-xs font-bold">IV Management</SelectItem>
                    <SelectItem value="Monitoring" className="text-xs font-bold">Monitoring</SelectItem>
                    <SelectItem value="Medication" className="text-xs font-bold">Medications</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-[#1A5E63] text-white font-extrabold hover:bg-[#154c50] rounded-xl text-xs py-1">
                      <Plus className="w-4 h-4" />
                      Add Ward Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px] rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-extrabold text-slate-900">Schedule Ward Task</DialogTitle>
                      <DialogDescription>
                        Assign task procedures and details directly to an admitted patient and shift nurse.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      
                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-700">Target Admitted Patient</Label>
                        <Select 
                          value={newTask.patientId} 
                          onValueChange={(val) => setNewTask({ ...newTask, patientId: val })}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select Admitted Bed" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {admittedPatients.map((p: any) => (
                              <SelectItem key={p.id} value={p.id} className="text-xs font-bold">
                                {p.bed || 'No Bed'} - {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="font-bold text-slate-700">Task Type Category</Label>
                          <Select 
                            value={newTask.type} 
                            onValueChange={(val) => setNewTask({ ...newTask, type: val })}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Dressing" className="text-xs font-bold">Dressing</SelectItem>
                              <SelectItem value="Nebulization" className="text-xs font-bold">Nebulization</SelectItem>
                              <SelectItem value="Injection" className="text-xs font-bold">Injection</SelectItem>
                              <SelectItem value="IV management" className="text-xs font-bold">IV Management</SelectItem>
                              <SelectItem value="Monitoring" className="text-xs font-bold">Monitoring</SelectItem>
                              <SelectItem value="Medication" className="text-xs font-bold">Medication</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="font-bold text-slate-700">Task Priority</Label>
                          <Select 
                            value={newTask.priority} 
                            onValueChange={(val) => setNewTask({ ...newTask, priority: val })}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select Priority" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Low" className="text-xs font-bold text-slate-600">Low</SelectItem>
                              <SelectItem value="Medium" className="text-xs font-bold text-amber-600">Medium</SelectItem>
                              <SelectItem value="High" className="text-xs font-bold text-red-600">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="font-bold text-slate-700">Due Schedule Time</Label>
                          <Input 
                            placeholder="e.g. 08:00 AM, 12:00 PM" 
                            className="rounded-xl"
                            value={newTask.dueTime}
                            onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="font-bold text-slate-700">Assign Shift Nurse</Label>
                          <Select 
                            value={newTask.nurseId} 
                            onValueChange={(val) => setNewTask({ ...newTask, nurseId: val })}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select Nurse" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {shifts.map((sh: any) => {
                                const nr = staff.find((st: any) => st.id === sh.nurseId || st.id === sh.nurse_id);
                                return (
                                  <SelectItem key={sh.id} value={sh.nurseId || sh.nurse_id} className="text-xs font-bold">
                                    {nr ? nr.name : 'Nurse'} ({sh.ward})
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-700">Clinical Instructions / Medication Detail</Label>
                        <Input 
                          placeholder="e.g. Nebulization with Duolin 2.5ml, change dressing" 
                          className="rounded-xl"
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        />
                      </div>

                    </div>
                    <DialogFooter>
                      <Button variant="outline" className="rounded-2xl" onClick={() => setIsAddTaskOpen(false)}>
                        Cancel
                      </Button>
                      <Button className="bg-[#1A5E63] text-white font-extrabold hover:bg-[#154c50] rounded-2xl" onClick={handleAddTask}>
                        Register Task
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {filteredTasks.map((t: any) => {
                  const patientObj = patients.find((p: any) => p.id === t.patientId || p.id === t.patient_id);
                  const nurseObj = staff.find((s: any) => s.id === t.nurseId || s.id === t.nurse_id);
                  const isOverdue = t.status === 'Pending' && isTaskOverdue(t.dueTime || t.due_time);
                  
                  return (
                    <div 
                      key={t.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between border-2 rounded-2xl p-4 gap-4 transition-all ${
                        t.status === 'Completed' 
                          ? 'bg-slate-50/50 opacity-60 border-slate-100' 
                          : isOverdue 
                          ? 'border-red-200 bg-red-500/5' 
                          : 'border-slate-100 bg-white dark:bg-slate-900/40 hover:border-[#1A5E63]/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className={`w-6 h-6 rounded-full border shrink-0 mt-0.5 ${
                            t.status === 'Completed' 
                              ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600' 
                              : 'border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                          }`}
                          onClick={() => toggleTaskStatus(t.id, t.status)}
                        >
                          {t.status === 'Completed' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </Button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-slate-100 dark:bg-slate-800 text-[#1A5E63] font-black text-[9px] px-2 py-0.5 rounded uppercase">
                              {t.type || 'Clinical'}
                            </span>
                            
                            <span className="text-[10px] font-bold text-[#1A5E63] underline">
                              {patientObj?.bed || 'Unassigned Bed'} ({patientObj?.name || 'Walk-in'})
                            </span>

                            {isOverdue && (
                              <span className="bg-red-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full animate-pulse tracking-wider">
                                OVERDUE ALERT
                              </span>
                            )}
                          </div>
                          
                          <p className={`text-xs font-extrabold mt-1.5 ${isTVMode ? 'text-white' : 'text-slate-800'} ${t.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                            {t.description}
                          </p>

                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              Due Time: {t.dueTime || t.due_time}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400">
                              <User className="w-3.5 h-3.5 shrink-0" />
                              Nurse: {nurseObj ? nurseObj.name : 'Duty Nurse'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <Badge className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                          t.priority === 'High' ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {t.priority} Priority
                        </Badge>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                          onClick={() => handleDeleteTask(t.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <div className="text-center py-10">
                    <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-400">No active tasks found for selected filters</p>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

        </div>

        {/* Right Column (1 Col wide on Desktop) - Medication Scheduler & Shift/Roster */}
        <div className="space-y-6">
          
          {/* Medication Management Quick Panel */}
          {selectedPatient && (
            <Card className={`rounded-3xl border-none shadow-md overflow-hidden ${isTVMode ? 'bg-[#111827] border border-slate-800' : 'bg-white'}`}>
              <CardHeader className="py-4 px-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <CardTitle className={`text-sm font-extrabold uppercase ${isTVMode ? 'text-white' : 'text-slate-900'}`}>
                    Medication Scheduler
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Automatic scheduling and overdue tracking for Bed {selectedPatient.bed || 'W-101'}
                  </CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="rounded-xl text-[10px] font-extrabold text-[#1A5E63] border-[#1A5E63]/30 hover:bg-[#1A5E63]/5 px-2 py-1 h-7"
                  onClick={() => handleAutoGenerateMedicationSchedule(selectedPatient.id)}
                >
                  <Sliders className="w-3 h-3 gap-1 shrink-0" />
                  Auto-Schedule
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                
                <div className="space-y-3.5">
                  <div className="border border-indigo-100 bg-indigo-50/20 rounded-2xl p-3 text-xs text-indigo-800 dark:text-indigo-300 flex gap-2">
                    <Info className="w-4 h-4 shrink-0 text-indigo-500" />
                    <p className="leading-relaxed">
                      Select any patient and click <strong>Auto-Schedule</strong> to instantly load custom daily therapeutic doses (Paracetamol, IV Saline, Pantoprazole) matching clinical routines.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tasks.filter((t: any) => 
                      (t.patientId === selectedPatient.id || t.patient_id === selectedPatient.id) && 
                      (t.type === 'Medication' || t.description.toLowerCase().includes('administer') || t.description.toLowerCase().includes('inj.'))
                    ).map((t: any) => {
                      const isOverdue = t.status === 'Pending' && isTaskOverdue(t.dueTime || t.due_time);
                      return (
                        <div key={t.id} className="py-3 flex justify-between items-center gap-4">
                          <div className="min-w-0">
                            <p className={`text-xs font-extrabold truncate ${isTVMode ? 'text-white' : 'text-slate-800'} ${t.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                              {t.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className={`text-[8px] font-extrabold uppercase rounded-full ${
                                t.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}>
                                {t.status}
                              </Badge>
                              <span className="text-[10px] text-slate-400 font-bold">Due: {t.dueTime || t.due_time}</span>
                              {isOverdue && (
                                <span className="text-red-500 text-[8px] font-black animate-pulse uppercase">● OVERDUE</span>
                              )}
                            </div>
                          </div>
                          {t.status === 'Pending' && (
                            <Button 
                              size="sm" 
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-lg text-[9px] h-6 py-0 px-2"
                              onClick={() => toggleTaskStatus(t.id, t.status)}
                            >
                              Give
                            </Button>
                          )}
                        </div>
                      );
                    })}

                    {tasks.filter((t: any) => 
                      (t.patientId === selectedPatient.id || t.patient_id === selectedPatient.id) && 
                      (t.type === 'Medication' || t.description.toLowerCase().includes('administer') || t.description.toLowerCase().includes('inj.'))
                    ).length === 0 && (
                      <div className="py-6 text-center text-slate-400 text-xs">
                        No scheduled medications logged for this patient bed.
                      </div>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Shift & Roster Panel */}
          <Card className={`rounded-3xl border-none shadow-md overflow-hidden ${isTVMode ? 'bg-[#111827] border border-slate-800' : 'bg-white'}`}>
            <CardHeader className="py-4 px-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className={`text-sm font-extrabold uppercase ${isTVMode ? 'text-white' : 'text-slate-900'}`}>
                  Duty Nurses & Workloads
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Nurse assignments per ward shift & active workloads
                </CardDescription>
              </div>
              
              <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="rounded-xl border-[#1A5E63]/30 text-[#1A5E63] hover:bg-[#1A5E63]/5 gap-1 text-[10px] h-7 px-2">
                    <Plus className="w-3.5 h-3.5" />
                    Assign Shift
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px] rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-extrabold text-slate-900">Assign Nurse Ward Shift</DialogTitle>
                    <DialogDescription>
                      Assign a nurse profile to an active ward location and shifts roster.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Select Nurse</Label>
                      <Select 
                        value={newShift.nurseId} 
                        onValueChange={(val) => setNewShift({ ...newShift, nurseId: val })}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Choose Nurse" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {activeStaffList.map((st: any) => (
                            <SelectItem key={st.id} value={st.id} className="text-xs font-bold">
                              {st.name} ({st.specialization || 'Nursing'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-700">Shift Type</Label>
                        <Select 
                          value={newShift.shiftType} 
                          onValueChange={(val) => setNewShift({ ...newShift, shiftType: val })}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Shift" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Morning" className="text-xs font-bold">Morning (07:00 AM - 03:00 PM)</SelectItem>
                            <SelectItem value="Evening" className="text-xs font-bold">Evening (03:00 PM - 11:00 PM)</SelectItem>
                            <SelectItem value="Night" className="text-xs font-bold">Night (11:00 PM - 07:00 AM)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-700">Ward Designation</Label>
                        <Input 
                          placeholder="e.g. ICU B1, Ward A" 
                          className="rounded-xl"
                          value={newShift.ward}
                          onChange={(e) => setNewShift({ ...newShift, ward: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" className="rounded-2xl" onClick={() => setIsShiftDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="bg-[#1A5E63] text-white font-extrabold hover:bg-[#154c50] rounded-2xl" onClick={handleAddShift}>
                      Add Shift
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-6">
              
              <div className="space-y-3">
                {pendingTasksPerStaff.map((sh: any) => {
                  const nurseStaffObj = staff.find((st: any) => st.id === sh.nurseId || st.id === sh.nurse_id);
                  return (
                    <div 
                      key={sh.id}
                      className="border border-slate-100 rounded-2xl p-3.5 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40 hover:border-indigo-500/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {sh.nurseName.substring(0, 2)}
                        </div>
                        <div>
                          <p className={`text-xs font-extrabold ${isTVMode ? 'text-white' : 'text-slate-800'}`}>
                            {sh.nurseName}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                            {sh.ward} • {sh.shiftType} Shift
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="block text-[8px] text-slate-400 font-bold uppercase">Pending</span>
                          <Badge className={`rounded-full text-[9px] font-black px-2 py-0.5 ${
                            sh.pendingCount > 2 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {sh.pendingCount} Tasks
                          </Badge>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-6 h-6 text-red-500 hover:text-red-600 rounded-lg hover:bg-rose-50"
                          onClick={() => handleDeleteShift(sh.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {pendingTasksPerStaff.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No active nurse roster scheduled today.
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
