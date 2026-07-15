import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Plus, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Clock, 
  User, 
  CheckCircle2, 
  Upload,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Edit,
  Loader2,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { OperationRecord, OperationTheatre, OTInfectionControlLog } from '@/types';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { canUserModifyRecord } from '@/utils/rbac';
import OTInventory from './OTInventory';
import OTConsentManagement from './OTConsentManagement';
import OTClinicalRecords from './OTClinicalRecords';
import SurgicalSafetyChecklist from './SurgicalSafetyChecklist';

const INITIAL_INFECTION_LOGS: OTInfectionControlLog[] = [
  { id: 'inf-1', date: '2026-07-08', time: '06:00 AM', theatreId: '1', theatreName: 'OT Room-1', cleaningType: 'Fumigation', disinfectantsUsed: 'Bacillocid Special 2%', airParticleCount: '1250', cultureSwabResult: 'Negative', loggedBy: 'Dr. Sarah Sharma' },
  { id: 'inf-2', date: '2026-07-09', time: '04:30 AM', theatreId: '2', theatreName: 'OT Room-2', cleaningType: 'Post-op Deep Clean', disinfectantsUsed: 'Cidex 2% & Microshield', airParticleCount: '1800', cultureSwabResult: 'Negative', loggedBy: 'Nurse Deepika Roy' }
];

export default function OTManagement() {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isDeleteForbidden = false;
  const [theatres, setTheatres] = useState<OperationTheatre[]>([]);
  const [records, setRecords] = useState<OperationRecord[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('theatres');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<OperationRecord | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [newOp, setNewOp] = useState({ patientId: '', surgeonId: '', theatreId: '', operationName: '', date: '', time: '' });
  const [checklistRecord, setChecklistRecord] = useState<any | null>(null);
  const [surgicalChecklists, setSurgicalChecklists] = useState<Record<string, any>>({});

  useEffect(() => {
    const saved = storage.get('hms_ot_surgical_checklists', {});
    setSurgicalChecklists(saved);
  }, [checklistRecord]);

  // Clinical workflow & Infection control states
  const [clinicalWorkflowRecord, setClinicalWorkflowRecord] = useState<OperationRecord | null>(null);
  const [infectionLogs, setInfectionLogs] = useState<OTInfectionControlLog[]>([]);
  const [isInfectionLogOpen, setIsInfectionLogOpen] = useState(false);
  const [newInfectionLog, setNewInfectionLog] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    theatreId: '',
    cleaningType: 'Routine',
    disinfectantsUsed: 'Cidex 2%',
    airParticleCount: '1400',
    cultureSwabResult: 'Negative',
    loggedBy: ''
  });

  useEffect(() => {
    const fetchLogs = async () => {
      const stored = await supabaseService.getOTInfectionLogs();
      if (stored && stored.length > 0) {
        setInfectionLogs(stored);
      } else {
        setInfectionLogs(INITIAL_INFECTION_LOGS);
      }
    };
    fetchLogs();
  }, []);

  const handleAddInfectionLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInfectionLog.theatreId) {
      toast.error('Please select an OT Room');
      return;
    }
    const selectedRoom = theatres.find(t => t.id === newInfectionLog.theatreId);
    const logToAdd: OTInfectionControlLog = {
      id: `inf-${Date.now()}`,
      date: newInfectionLog.date,
      time: newInfectionLog.time,
      theatreId: newInfectionLog.theatreId,
      theatreName: selectedRoom ? selectedRoom.name : 'OT Room',
      cleaningType: newInfectionLog.cleaningType as any,
      disinfectantsUsed: newInfectionLog.disinfectantsUsed,
      airParticleCount: newInfectionLog.airParticleCount || undefined,
      cultureSwabResult: newInfectionLog.cultureSwabResult as any,
      loggedBy: newInfectionLog.loggedBy || currentUser?.name || 'Staff'
    };

    const saved = await supabaseService.createOTInfectionLog(logToAdd);
    if (saved) {
      setInfectionLogs(prev => [saved, ...prev]);
      setIsInfectionLogOpen(false);
      toast.success('Infection control sanitization log added successfully');
      
      // Reset form
      setNewInfectionLog({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        theatreId: '',
        cleaningType: 'Routine',
        disinfectantsUsed: 'Cidex 2%',
        airParticleCount: '1400',
        cultureSwabResult: 'Negative',
        loggedBy: ''
      });
    } else {
      toast.error('Failed to add infection control log');
    }
  };

  const handleDeleteInfectionLog = async (id: string) => {
    if (confirm('Are you sure you want to delete this infection control log?')) {
      const success = await supabaseService.deleteOTInfectionLog(id);
      if (success) {
        setInfectionLogs(prev => prev.filter(log => log.id !== id));
        toast.success('Infection log deleted');
      } else {
        toast.error('Failed to delete infection control log');
      }
    }
  };

  const fetchData = async () => {
    const isInitial = theatres.length === 0 && records.length === 0;
    if (isInitial) {
      setLoading(true);
    }
    const [theatresData, recordsData, patientsData, staffData] = await Promise.all([
      supabaseService.getOTRooms(),
      supabaseService.getOTSchedules(),
      supabaseService.getPatients(),
      supabaseService.getStaff()
    ]);
    if (theatresData) setTheatres(theatresData);
    if (recordsData) setRecords(recordsData);
    if (patientsData) setPatients(patientsData);
    if (staffData) {
      setStaff(staffData);
      setDoctors(staffData.filter((s: any) => {
        const r = (s.role || '').toUpperCase();
        return r === 'DOCTOR' || r === 'SURGEON' || r === 'SUPER_ADMIN' || r === 'ADMIN';
      }));
    }
    setLoading(false);
  };

  useDataSync(fetchData);

  useEffect(() => {
    if (!isScheduleOpen) {
      setPatientSearchTerm('');
      setShowPatientResults(false);
    }
  }, [isScheduleOpen]);

  const handleScheduleOp = async () => {
    if (!newOp.patientId || !newOp.surgeonId || !newOp.operationName || !newOp.date || !newOp.time) {
      toast.error('Please fill in all required fields (including Date and Time)');
      return;
    }
    const opToAdd = {
      patient_id: newOp.patientId,
      surgeon_id: newOp.surgeonId,
      room_id: newOp.theatreId || (theatres[0]?.id),
      operation_name: newOp.operationName,
      scheduled_date: newOp.date,
      scheduled_time: newOp.time,
      status: 'Scheduled'
    };

    const result = await supabaseService.createOTSchedule(opToAdd);
    if (result) {
      toast.success('Operation scheduled successfully');
      setNewOp({ patientId: '', surgeonId: '', theatreId: '', operationName: '', date: '', time: '' });
      setIsScheduleOpen(false);
      setActiveTab('records');
      fetchData();
    } else {
      toast.error('Failed to schedule operation');
    }
  };

  const filteredRecords = records.filter(record => {
    const recordPatientId = record.patientId || record.patient_id;
    const patient = patients.find(p => p.id === recordPatientId);
    const operationName = record.operationName || record.operation_name || '';
    const query = searchQuery.toLowerCase();
    
    return (
      operationName.toLowerCase().includes(query) ||
      (patient?.name || '').toLowerCase().includes(query) ||
      (patient?.mrn || '').toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Occupied': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'Maintenance': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Scheduled': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'In-Progress': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Completed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Cancelled': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Document uploaded successfully');
    setIsUploadDialogOpen(false);
  };

  const handleDeleteRecord = async (id: string) => {
    if (isDeleteForbidden) {
      toast.error('Deletion of OT scheduling is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    const record = records.find(r => r.id === id);
    if (record && !canUserModifyRecord(record, currentUser, staff)) {
      toast.error("Access Denied: This OT scheduling record was created by an Admin and cannot be deleted by non-admin users.");
      return;
    }
    if (confirm('Are you sure you want to delete this OT record?')) {
      const result = await supabaseService.deleteOTRecord(id);
      if (result) {
        toast.success('Operation record removed');
        fetchData();
      } else {
        toast.error('Failed to delete OT record');
      }
    }
  };

  const handleExportOT = () => {
    const headers = ['Operation Name', 'Patient', 'Surgeon', 'Date', 'Status'];
    const rows = records.map(r => [
      r.operationName,
      patients.find(p => p.id === r.patientId)?.name || 'N/A',
      staff.find(u => u.id === r.surgeonId)?.name || 'N/A',
      r.date || r.scheduled_date,
      r.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'ot_records.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('OT records exported');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 font-medium">Loading OT Records...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-sm text-slate-900" style={{ background: 'linear-gradient(135deg, #E5C39E, #F9EFE5, #E5C39E)', borderColor: '#ebd0a2' }}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-amber-950">Operation Theatre Management</h1>
          <p className="text-amber-900/90 font-semibold text-sm">Monitor OTs, maintain operation records, and manage clinical media.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-white/80 border-amber-900/25 text-amber-950 hover:bg-white font-bold" onClick={handleExportOT}>
            <Download className="w-4 h-4 text-amber-900" />
            Export Records
          </Button>
          <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          {currentUser?.role !== 'DOCTOR' && (
            <DialogTrigger asChild>
              <Button className="bg-[#1A5E63] hover:bg-[#154c50] text-white gap-2 font-bold" onClick={() => setIsScheduleOpen(true)}>
                <Plus className="w-4 h-4" />
                Schedule Operation
              </Button>
            </DialogTrigger>
          )}
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Schedule New Operation</DialogTitle>
                <DialogDescription>Enter details to book an OT for a procedure.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 relative col-span-2">
                  <Label>Patient (Search by Name or Phone)</Label>
                  <div className="relative">
                    <Input 
                      placeholder="Start typing name or phone..." 
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientResults(true);
                        if (e.target.value === '') {
                          setNewOp({...newOp, patientId: ''});
                        }
                      }}
                      onFocus={() => setShowPatientResults(true)}
                    />
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {showPatientResults && patientSearchTerm.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto custom-scrollbar">
                      {patients.filter(p => 
                        (p.name || '').toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                        (p.phone || '').includes(patientSearchTerm)
                      ).length > 0 ? (
                        patients.filter(p => 
                          (p.name || '').toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                          (p.phone || '').includes(patientSearchTerm)
                        ).map(p => (
                          <div 
                            key={p.id} 
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                            onClick={() => {
                              setNewOp({...newOp, patientId: p.id});
                              setPatientSearchTerm(p.name);
                              setShowPatientResults(false);
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground">{p.phone} • MRN: {p.mrn}</p>
                            </div>
                            {newOp.patientId === p.id && <CheckCircle2 className="w-4 h-4 text-medical-blue" />}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                          No patients found.
                        </div>
                      )}
                    </div>
                  )}

                  {newOp.patientId && patients.find(p => p.id === newOp.patientId) && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-blue-700 truncate">
                          {patients.find(p => p.id === newOp.patientId)?.name}
                        </p>
                        <p className="text-[10px] text-blue-600 truncate">
                          {patients.find(p => p.id === newOp.patientId)?.age} yrs • {patients.find(p => p.id === newOp.patientId)?.gender} • MRN: {patients.find(p => p.id === newOp.patientId)?.mrn}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-blue-400 hover:text-blue-600 hover:bg-blue-100"
                        onClick={() => {
                          setNewOp({...newOp, patientId: ''});
                          setPatientSearchTerm('');
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Primary Surgeon</Label>
                  <Select 
                    value={newOp.surgeonId}
                    onValueChange={(v) => setNewOp({...newOp, surgeonId: v})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select surgeon" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-sm">{u.name}</span>
                            <span className="text-[10px] text-muted-foreground lowercase">
                              {u.specialization || u.department || 'Staff'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>OT Unit</Label>
                  <Select 
                    value={newOp.theatreId}
                    onValueChange={(v) => setNewOp({...newOp, theatreId: v})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select OT" />
                    </SelectTrigger>
                    <SelectContent>
                      {theatres.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Procedure Name</Label>
                  <Input 
                    placeholder="e.g. Appendectomy" 
                    value={newOp.operationName}
                    onChange={(e) => setNewOp({...newOp, operationName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={newOp.date}
                    onChange={(e) => setNewOp({...newOp, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input 
                    type="time" 
                    value={newOp.time}
                    onChange={(e) => setNewOp({...newOp, time: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
                <Button className="bg-medical-blue" onClick={handleScheduleOp}>Schedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1 flex flex-wrap gap-1">
          <TabsTrigger value="theatres">OT Status</TabsTrigger>
          <TabsTrigger value="records">Operation Records</TabsTrigger>
          <TabsTrigger value="inventory">OT Inventory</TabsTrigger>
          <TabsTrigger value="consents">Consent Management</TabsTrigger>
          <TabsTrigger value="infection">Infection Control Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="theatres" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {theatres.map((ot) => (
              <Card key={ot.id} className="border-none shadow-sm hover:ring-2 hover:ring-medical-blue/10 transition-all">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-tight ${getStatusColor(ot.status || 'Available')}`}>
                      {ot.status || 'Available'}
                    </Badge>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <Scissors className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{ot.name}</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold tracking-wider">{ot.type || 'General'} Surgery Unit</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {ot.status === 'Occupied' ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Current Procedure</p>
                        <p className="text-sm font-semibold">In Progress...</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-blue-400" />
                          <p className="text-xs text-blue-600">Active Stage</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs h-8 font-medium">View Details</Button>
                    </div>
                  ) : (
                    <div className="py-4 flex flex-col items-center justify-center text-slate-300">
                      <CheckCircle2 className="w-8 h-8 mb-1.5 opacity-20 text-emerald-500" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3.5">Ready for Procedure</p>
                      {currentUser?.role !== 'DOCTOR' ? (
                        <Button 
                          size="sm" 
                          className="bg-medical-blue hover:bg-medical-blue/90 h-8 text-xs font-semibold gap-1 px-3"
                          onClick={() => {
                            setNewOp(prev => ({ ...prev, theatreId: ot.id }));
                            setIsScheduleOpen(true);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Schedule Operation
                        </Button>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Schedule via admin</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="records" className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by patient name, MRN or procedure..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredRecords.length > 0 ? filteredRecords.map((record) => {
              const patient = patients.find(p => p.id === record.patientId);
              const surgeon = staff.find(u => u.id === record.surgeonId);
              const theatre = theatres.find(t => t.id === record.theatreId);
              const checklistInfo = surgicalChecklists[record.id];

              return (
                <Card key={record.id} className="border-none shadow-sm overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 rounded-xl">
                            <AvatarFallback className="bg-slate-100 text-medical-blue font-bold text-lg rounded-xl">
                              {patient?.name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-lg text-slate-800 leading-none">{record.operationName}</h3>
                              {checklistInfo && (
                                <Badge variant="outline" className={`text-[10px] h-5 font-black tracking-tight ${
                                  checklistInfo.percentComplete === 100 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  WHO Safety Checklist: {checklistInfo.percentComplete}%
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                              <span className="text-slate-900">{patient?.name || 'Unknown Patient'}</span>
                              <span>•</span>
                              <span>{patient?.mrn || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={`font-bold uppercase tracking-tighter px-3 h-7 ${getStatusColor(record.status)}`}>
                            {record.status}
                          </Badge>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue hover:bg-blue-50">
                              <Edit className="w-4 h-4" />
                            </Button>
                            {!isDeleteForbidden && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteRecord(record.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6 px-1">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Surgeon</p>
                          <div className="flex items-center gap-2 text-slate-700">
                            <User className="w-3.5 h-3.5 text-medical-blue" />
                            <p className="text-sm font-semibold">{surgeon?.name || 'Not Assigned'}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Theatre</p>
                          <div className="flex items-center gap-2 text-slate-700">
                            <Scissors className="w-3.5 h-3.5 text-medical-blue" />
                            <p className="text-sm font-semibold">{theatre?.name || 'OT Unit'}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Schedule</p>
                          <div className="flex items-center gap-2 text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-medical-blue" />
                            <p className="text-sm font-semibold">{record.date || record.scheduled_date} | {record.startTime || record.scheduled_time}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Clinical Data</p>
                          <div className="flex items-center gap-2 text-slate-700">
                            <ImageIcon className="w-3.5 h-3.5 text-medical-blue" />
                            <p className="text-sm font-semibold">{record.documents?.length || 0} Media Files</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 border-t border-slate-50 pt-4 mt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 font-medium h-9 px-4 border-slate-200" onClick={() => setSelectedRecord(record)}>
                              <Eye className="w-4 h-4" />
                              View Records & Media
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                            <DialogHeader className="p-6 bg-white border-b sticky top-0 z-10">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <DialogTitle className="text-2xl font-bold text-slate-800">{record.operationName}</DialogTitle>
                                  <p className="text-sm text-muted-foreground font-medium">Patient: {patient?.name} | MRN: {patient?.mrn}</p>
                                </div>
                                <Badge variant="outline" className={`font-bold uppercase h-8 px-4 ${getStatusColor(record.status)}`}>{record.status}</Badge>
                              </div>
                            </DialogHeader>
                            
                            <ScrollArea className="flex-1 p-6">
                              <div className="space-y-10">
                                <section>
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Clinical Media & Documents</h4>
                                    <Button variant="outline" size="sm" className="text-xs gap-2 border-slate-200" onClick={() => setIsUploadDialogOpen(true)}>
                                      <Plus className="w-3.5 h-3.5" />
                                      Upload Media
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {record.documents?.map((doc: any) => (
                                      <div key={doc.id} className="group relative aspect-square rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 transition-all hover:ring-2 hover:ring-medical-blue/20">
                                        {doc.type === 'Photo' ? (
                                          <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : doc.type === 'Video' ? (
                                          <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                            <Video className="w-8 h-8 text-white opacity-50" />
                                          </div>
                                        ) : (
                                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                            <FileText className="w-10 h-10 text-slate-200 mb-2" />
                                            <p className="text-[10px] font-bold uppercase tracking-tight truncate w-full text-slate-400">{doc.name}</p>
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                          <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full h-10 w-10">
                                            <Eye className="w-5 h-5" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full h-10 w-10">
                                            <Download className="w-5 h-5" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                    {(!record.documents || record.documents.length === 0) && (
                                      <div 
                                        className="aspect-square rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all hover:border-medical-blue/40 group col-span-full py-12"
                                        onClick={() => setIsUploadDialogOpen(true)}
                                      >
                                        <div className="p-4 rounded-full bg-slate-50 group-hover:bg-medical-blue/10 group-hover:text-medical-blue transition-all">
                                          <ImageIcon className="w-8 h-8 text-slate-300 group-hover:text-medical-blue" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400">No clinical media attached yet</p>
                                        <Button variant="ghost" size="sm" className="text-medical-blue hover:text-medical-blue h-8">Add Pre-Op Files</Button>
                                      </div>
                                    )}
                                  </div>
                                </section>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                  <div className="lg:col-span-2 space-y-6">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Clinical Notes</h4>
                                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 min-h-[160px] relative">
                                      <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                        {record.notes || "No clinical observations recorded for this procedure yet. Please ensure post-operative notes are updated within 24 hours."}
                                      </p>
                                      <Button variant="ghost" size="sm" className="absolute top-4 right-4 h-8 text-medical-blue hover:bg-blue-100">
                                        <Edit className="w-3.5 h-3.5 mr-1" />
                                        Edit Notes
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-6">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Teams Involved</h4>
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                                            {surgeon?.name?.charAt(0) || 'S'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="text-sm font-bold text-slate-800">{surgeon?.name || 'Assigning...'}</p>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Lead Surgeon</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </ScrollArea>
                            
                            <DialogFooter className="p-6 border-t bg-slate-50/30 flex-row items-center gap-3">
                              <DialogTrigger asChild>
                                <Button variant="outline" className="font-bold border-slate-200">
                                  Close
                                </Button>
                              </DialogTrigger>
                              <div className="flex-1" />
                              <Button variant="outline" className="gap-2 font-bold border-slate-200 h-10">
                                <FileText className="w-4 h-4" />
                                Generate OT Report
                              </Button>
                              <Button className="bg-medical-blue gap-2 font-bold h-10 px-6">
                                <Upload className="w-4 h-4" />
                                Add Documents
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2 text-[#1A5E63] hover:text-[#1A5E63] hover:bg-[#1A5E63]/10 font-bold h-9 border border-[#1A5E63]/20 bg-[#1A5E63]/5"
                          onClick={() => setClinicalWorkflowRecord(record)}
                        >
                          <Activity className="w-4 h-4" />
                          Clinical Workflow
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={`gap-2 font-bold h-9 border ${
                            checklistInfo ? 
                              checklistInfo.percentComplete === 100 ? 
                                'text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' : 
                                'text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200' : 
                              'text-medical-blue hover:text-medical-blue hover:bg-blue-50 border-slate-200'
                          }`}
                          onClick={() => setChecklistRecord({ ...record, surgeonName: surgeon?.name || 'Not Assigned' })}
                        >
                          <FileText className="w-4 h-4" />
                          {checklistInfo ? `Checklist (${checklistInfo.percentComplete}%)` : 'Surgical Checklist'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            }) : (
              <div className="py-20 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-400">No Operation Records Found</h3>
                <p className="text-sm text-slate-400 mt-1">Try adjusting your search filters or schedule a new procedure.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <OTInventory />
        </TabsContent>

        <TabsContent value="consents" className="mt-6">
          <OTConsentManagement />
        </TabsContent>

        <TabsContent value="infection" className="mt-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-800">Infection Control & Sanitization Audit Logs</h3>
              <p className="text-xs text-slate-500 font-semibold">Active monitoring of operating room sterilities, air particle measurements, and culture microbiological swabs.</p>
            </div>
            <Dialog open={isInfectionLogOpen} onOpenChange={setIsInfectionLogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1A5E63] text-white hover:bg-[#1A5E63]/90 gap-1.5 text-xs font-bold h-10 px-4">
                  <Plus className="w-4 h-4" />
                  Log Sanitization / Swab
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-slate-800">Add Infection Control Audit</DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    File a professional sanitization, fumigation, or microbiological swab test log for an operating room.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddInfectionLog} className="space-y-4 py-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Sanitization Date</Label>
                      <Input 
                        type="date" 
                        value={newInfectionLog.date} 
                        onChange={(e) => setNewInfectionLog({...newInfectionLog, date: e.target.value})}
                        required 
                        className="text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Log Time</Label>
                      <Input 
                        type="text" 
                        value={newInfectionLog.time} 
                        onChange={(e) => setNewInfectionLog({...newInfectionLog, time: e.target.value})}
                        required 
                        className="text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Operating Theatre Room</Label>
                    <Select 
                      value={newInfectionLog.theatreId} 
                      onValueChange={(v) => setNewInfectionLog({...newInfectionLog, theatreId: v})}
                    >
                      <SelectTrigger className="text-xs h-10">
                        <SelectValue placeholder="Select OT Room" />
                      </SelectTrigger>
                      <SelectContent>
                        {theatres.map(t => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.name} ({t.type || 'General'})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Sanitization Protocol</Label>
                      <Select 
                        value={newInfectionLog.cleaningType} 
                        onValueChange={(v) => setNewInfectionLog({...newInfectionLog, cleaningType: v})}
                      >
                        <SelectTrigger className="text-xs h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Routine" className="text-xs">Routine Quick Clean</SelectItem>
                          <SelectItem value="Fumigation" className="text-xs">Full Fumigation Cycle</SelectItem>
                          <SelectItem value="Post-op Deep Clean" className="text-xs">Post-op Deep Sterilization</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Air Quality (particles/m³)</Label>
                      <Input 
                        type="number" 
                        value={newInfectionLog.airParticleCount} 
                        onChange={(e) => setNewInfectionLog({...newInfectionLog, airParticleCount: e.target.value})}
                        placeholder="e.g. 1400"
                        className="text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Culture Swab Outcome</Label>
                      <Select 
                        value={newInfectionLog.cultureSwabResult} 
                        onValueChange={(v) => setNewInfectionLog({...newInfectionLog, cultureSwabResult: v})}
                      >
                        <SelectTrigger className="text-xs h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Negative" className="text-xs text-emerald-600 font-bold">Negative (Clear Sterile)</SelectItem>
                          <SelectItem value="Positive" className="text-xs text-rose-600 font-bold">Positive (Contaminated!)</SelectItem>
                          <SelectItem value="Pending" className="text-xs text-amber-600">Pending Incubator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Disinfectants Utilized</Label>
                      <Input 
                        value={newInfectionLog.disinfectantsUsed} 
                        onChange={(e) => setNewInfectionLog({...newInfectionLog, disinfectantsUsed: e.target.value})}
                        className="text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Inspected & Logged By</Label>
                    <Input 
                      placeholder="e.g. Infection Control Lead" 
                      value={newInfectionLog.loggedBy} 
                      onChange={(e) => setNewInfectionLog({...newInfectionLog, loggedBy: e.target.value})}
                      className="text-xs h-10"
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsInfectionLogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-[#1A5E63] text-white">Save Audit Log</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase">
                      <th className="p-4">Room Name</th>
                      <th className="p-4">Protocol</th>
                      <th className="p-4">Chemicals Used</th>
                      <th className="p-4">Air Particle Count</th>
                      <th className="p-4">Culture Swab</th>
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Logged By</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700 font-semibold">
                    {infectionLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/10">
                        <td className="p-4 font-bold text-slate-900">{log.theatreName}</td>
                        <td className="p-4">
                          <Badge variant="outline" className={`font-bold ${
                            log.cleaningType === 'Fumigation' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                            log.cleaningType === 'Post-op Deep Clean' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-slate-50 text-slate-700 border-slate-100'
                          }`}>
                            {log.cleaningType}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-600">{log.disinfectantsUsed}</td>
                        <td className="p-4">
                          <span className="font-mono text-slate-800">{log.airParticleCount ? `${log.airParticleCount} particles/m³` : 'N/A'}</span>
                          {log.airParticleCount && parseInt(log.airParticleCount) > 3500 && (
                            <span className="ml-1.5 text-rose-600 font-bold">⚠ Critical</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={`${
                            log.cultureSwabResult === 'Negative' ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-50 border border-emerald-200' :
                            log.cultureSwabResult === 'Positive' ? 'bg-rose-100 text-rose-800 hover:bg-rose-100 border border-rose-200' :
                            'bg-amber-50 text-amber-800 hover:bg-amber-50 border border-amber-200'
                          }`}>
                            {log.cultureSwabResult === 'Negative' ? '✓ Sterile' : 
                             log.cultureSwabResult === 'Positive' ? '⚠ Contaminated' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-500 font-medium">{log.date} at {log.time}</td>
                        <td className="p-4 font-bold text-slate-800">{log.loggedBy}</td>
                        <td className="p-4 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                            onClick={() => handleDeleteInfectionLog(log.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {infectionLogs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No infection control logs registered. Click "Log Sanitization" to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clinical Workflow Dialog */}
      <Dialog open={!!clinicalWorkflowRecord} onOpenChange={(open) => !open && setClinicalWorkflowRecord(null)}>
        <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-white border-b sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-extrabold text-slate-800">
                  Clinical Procedure File: {clinicalWorkflowRecord?.operationName}
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Patient Name: <span className="text-slate-800 font-bold">{patients.find(p => p.id === (clinicalWorkflowRecord?.patientId || clinicalWorkflowRecord?.patient_id))?.name || 'N/A'}</span> • 
                  Surgeon: <span className="text-slate-800 font-bold">{staff.find(s => s.id === clinicalWorkflowRecord?.surgeonId)?.name || 'N/A'}</span>
                </p>
              </div>
              <Badge variant="outline" className={`font-bold uppercase h-7 px-3 text-[10px] ${
                clinicalWorkflowRecord?.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                clinicalWorkflowRecord?.status === 'In Progress' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {clinicalWorkflowRecord?.status}
              </Badge>
            </div>
          </DialogHeader>
          <div className="flex-1 p-6 overflow-y-auto">
            {clinicalWorkflowRecord && (
              <OTClinicalRecords
                record={clinicalWorkflowRecord}
                patient={patients.find(p => p.id === (clinicalWorkflowRecord.patientId || clinicalWorkflowRecord.patient_id)) || {}}
                surgeonName={staff.find(s => s.id === clinicalWorkflowRecord.surgeonId)?.name || 'Not Assigned'}
                onClose={() => setClinicalWorkflowRecord(null)}
                onSaveNotes={async (newNotes) => {
                  const updatedRecords = records.map(r => 
                    r.id === clinicalWorkflowRecord.id ? { ...r, notes: newNotes } : r
                  );
                  setRecords(updatedRecords);
                  storage.set('hms_ot_schedules', updatedRecords);
                }}
              />
            )}
          </div>
          <DialogFooter className="p-6 border-t bg-slate-50 flex-row justify-end items-center">
            <Button variant="outline" onClick={() => setClinicalWorkflowRecord(null)} className="font-bold">
              Close Procedure File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Operation Media</DialogTitle>
            <DialogDescription>
              Attach photos, videos or documents to the operation record.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFileUpload} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file-name">File Name</Label>
              <Input id="file-name" placeholder="e.g. Pre-op X-ray" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-type">File Type</Label>
              <Select defaultValue="Photo">
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Photo">Photo</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                  <SelectItem value="Document">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select File</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer">
                <Upload className="w-8 h-8 text-slate-400" />
                <p className="text-xs font-medium text-slate-500">Click to browse or drag & drop</p>
                <p className="text-[10px] text-slate-400">PNG, JPG, MP4 or PDF (max 50MB)</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-medical-blue">Upload File</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {checklistRecord && (
        <SurgicalSafetyChecklist
          record={checklistRecord}
          patient={patients.find(p => p.id === (checklistRecord.patientId || checklistRecord.patient_id))}
          onClose={() => setChecklistRecord(null)}
          onSave={() => {
            const saved = storage.get('hms_ot_surgical_checklists', {});
            setSurgicalChecklists(saved);
          }}
        />
      )}
    </div>
  );
}

// Added Avatar component for UI consistency
const Avatar = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}>
    {children}
  </div>
);

const AvatarFallback = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className}`}>
    {children}
  </div>
);

