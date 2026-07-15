import { useState, useEffect, FormEvent } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Tag, 
  FileCheck, 
  ShieldAlert, 
  Layers, 
  User, 
  Eye, 
  Sliders, 
  FileText,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';

// Sample equipment data for first launch
const SAMPLE_EQUIPMENT = [
  { id: 'EQ001', name: 'GE Optima CT Scanner', department: 'Radiology', model: 'GE Optima 660', serialNumber: 'CT-992384-A', installDate: '2023-04-12', status: 'Operational', lastPmDate: '2026-05-10', nextPmDate: '2026-11-10', amcVendor: 'GE Healthcare Services', amcExpiry: '2027-04-12' },
  { id: 'EQ002', name: 'Mindray BeneHeart Defibrillator', department: 'Emergency', model: 'Mindray D3', serialNumber: 'DF-112349-B', installDate: '2024-01-15', status: 'Operational', lastPmDate: '2026-06-01', nextPmDate: '2026-12-01', amcVendor: 'Mindray Diagnostics Ltd', amcExpiry: '2025-12-31' },
  { id: 'EQ003', name: 'Maquet FLOW-i Anesthesia Machine', department: 'OT / Surgery', model: 'Maquet C20', serialNumber: 'AN-775612-F', installDate: '2022-09-20', status: 'Under Maintenance', lastPmDate: '2025-09-15', nextPmDate: '2026-03-15', amcVendor: 'Getinge Medical India', amcExpiry: '2026-09-19' },
  { id: 'EQ004', name: 'Dräger Babylog Ventilator', department: 'ICU / Neonatal', model: 'Dräger VN500', serialNumber: 'VT-441299-X', installDate: '2023-11-05', status: 'Calibration Due', lastPmDate: '2025-11-05', nextPmDate: '2026-05-05', amcVendor: 'Draeger Medical Solutions', amcExpiry: '2026-11-04' },
  { id: 'EQ005', name: 'Olympus CV-190 Endoscopy Processor', department: 'Gastroenterology', model: 'Evis Exera III', serialNumber: 'EN-884910-Y', installDate: '2024-06-10', status: 'Broken Down', lastPmDate: '2025-12-10', nextPmDate: '2026-06-10', amcVendor: 'Olympus Medical India', amcExpiry: '2026-06-09' }
];

const SAMPLE_BREAKDOWNS = [
  { id: 'BD001', equipmentId: 'EQ005', reportedBy: 'Dr. Suresh Nair', reportedDate: '2026-07-01', description: 'Screen flickering and light source failing during colonoscopy procedure.', severity: 'High', status: 'Under Repair', estimatedCost: 1200, resolvedDate: '' },
  { id: 'BD002', equipmentId: 'EQ003', reportedBy: 'Anesthetist Nurse George', reportedDate: '2026-06-15', description: 'O2 alarm sensor triggering falsely.', severity: 'Medium', status: 'Resolved', estimatedCost: 450, resolvedDate: '2026-06-18' }
];

const SAMPLE_PM_LOGS = [
  { id: 'PM001', equipmentId: 'EQ001', doneBy: 'Senior Engineer Rajesh Kumar', date: '2026-05-10', findings: 'Fitted new coolant filter, calibrated tube rotor speed. All stats within acceptable tolerances.', status: 'Completed', nextDate: '2026-11-10' },
  { id: 'PM002', equipmentId: 'EQ002', doneBy: 'Biomed Tech Susan', date: '2026-06-01', findings: 'Battery cycle test passed. Defib shock test delivered successfully at 200J into simulator load.', status: 'Completed', nextDate: '2026-12-01' }
];

const SAMPLE_CALIBRATIONS = [
  { id: 'CAL001', equipmentId: 'EQ004', agency: 'National Metrology Labs', date: '2025-11-05', certificateRef: 'NML-VT-2025-998', status: 'Certified', dueDate: '2026-05-05', remarks: 'Pressure and flow sensors calibrated accurately.' },
  { id: 'CAL002', equipmentId: 'EQ002', agency: 'Apex Medical Calibration', date: '2025-12-01', certificateRef: 'AMC-DF-7412', status: 'Certified', dueDate: '2026-12-01', remarks: 'Energy output synchronized and timer verified.' }
];

export default function EquipmentManagement() {
  const [activeTab, setActiveTab] = useState<'register' | 'pm' | 'calibration' | 'amc' | 'breakdowns'>('register');
  const [equipment, setEquipment] = useState<any[]>([]);
  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [pmLogs, setPmLogs] = useState<any[]>([]);
  const [calibrations, setCalibrations] = useState<any[]>([]);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal forms states
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [isPmModalOpen, setIsPmModalOpen] = useState(false);
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [isBdModalOpen, setIsBdModalOpen] = useState(false);

  // Form payloads
  const [equipForm, setEquipForm] = useState({
    id: '', name: '', department: 'Radiology', model: '', serialNumber: '', installDate: '', status: 'Operational', lastPmDate: '', nextPmDate: '', amcVendor: '', amcExpiry: ''
  });
  const [pmForm, setPmForm] = useState({
    equipmentId: '', doneBy: '', date: '', findings: '', status: 'Completed', nextDate: ''
  });
  const [calForm, setCalForm] = useState({
    equipmentId: '', agency: '', date: '', certificateRef: '', status: 'Certified', dueDate: '', remarks: ''
  });
  const [bdForm, setBdForm] = useState({
    equipmentId: '', reportedBy: '', reportedDate: '', description: '', severity: 'High', status: 'Pending', estimatedCost: 0
  });

  const fetchData = async () => {
    try {
      const eqData = await supabaseService.getEquipment();
      const bdData = await supabaseService.getBreakdowns();
      
      // Seed if empty and using Supabase or fallback
      if (eqData && eqData.length === 0) {
        for (const item of SAMPLE_EQUIPMENT) {
          await supabaseService.createEquipment(item);
        }
        const reEqData = await supabaseService.getEquipment();
        setEquipment(reEqData || SAMPLE_EQUIPMENT);
      } else {
        setEquipment(eqData || SAMPLE_EQUIPMENT);
      }

      if (bdData && bdData.length === 0) {
        for (const item of SAMPLE_BREAKDOWNS) {
          await supabaseService.createBreakdown(item);
        }
        const reBdData = await supabaseService.getBreakdowns();
        setBreakdowns(reBdData || SAMPLE_BREAKDOWNS);
      } else {
        setBreakdowns(bdData || SAMPLE_BREAKDOWNS);
      }
    } catch (err) {
      console.error('Error fetching equipment / breakdowns:', err);
    }

    const cachedPm = storage.get('hms_pm_logs', SAMPLE_PM_LOGS);
    const cachedCal = storage.get('hms_calibrations', SAMPLE_CALIBRATIONS);
    setPmLogs(cachedPm);
    setCalibrations(cachedCal);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveEquipment = async (newEq: any[]) => {
    setEquipment(newEq);
    storage.set('hms_equipment', newEq);
  };

  const saveBreakdowns = async (newBd: any[]) => {
    setBreakdowns(newBd);
    storage.set('hms_breakdowns', newBd);
  };

  const savePmLogs = (newPm: any[]) => {
    setPmLogs(newPm);
    storage.set('hms_pm_logs', newPm);
  };

  const saveCalibrations = (newCal: any[]) => {
    setCalibrations(newCal);
    storage.set('hms_calibrations', newCal);
  };

  // Add Equipment handler
  const handleAddEquipment = async (e: FormEvent) => {
    e.preventDefault();
    if (!equipForm.name || !equipForm.model || !equipForm.serialNumber) {
      toast.error('Please fill in name, model, and serial number');
      return;
    }
    const isEditing = equipForm.id !== '';
    if (isEditing) {
      await supabaseService.updateEquipment(equipForm.id, equipForm);
      toast.success('Equipment updated successfully');
    } else {
      await supabaseService.createEquipment(equipForm);
      toast.success('New medical equipment registered successfully');
    }
    await fetchData();
    setIsEquipModalOpen(false);
    setEquipForm({ id: '', name: '', department: 'Radiology', model: '', serialNumber: '', installDate: '', status: 'Operational', lastPmDate: '', nextPmDate: '', amcVendor: '', amcExpiry: '' });
  };

  // Log Preventive Maintenance
  const handleLogPm = (e: FormEvent) => {
    e.preventDefault();
    if (!pmForm.equipmentId || !pmForm.doneBy || !pmForm.date) {
      toast.error('Please fill in equipment, engineer name, and date');
      return;
    }
    const newId = `PM${String(pmLogs.length + 1).padStart(3, '0')}`;
    const payload = { id: newId, ...pmForm };
    const updatedLogs = [payload, ...pmLogs];
    savePmLogs(updatedLogs);

    // Update equipment PM dates
    const updatedEq = equipment.map(eq => {
      if (eq.id === pmForm.equipmentId) {
        const up = {
          ...eq,
          lastPmDate: pmForm.date,
          nextPmDate: pmForm.nextDate || eq.nextPmDate,
          status: 'Operational' // reset status on successful maintenance
        };
        supabaseService.updateEquipment(eq.id, up);
        return up;
      }
      return eq;
    });
    saveEquipment(updatedEq);
    setIsPmModalOpen(false);
    toast.success('Preventive Maintenance record saved successfully');
    setPmForm({ equipmentId: '', doneBy: '', date: '', findings: '', status: 'Completed', nextDate: '' });
  };

  // Log Calibration Record
  const handleLogCal = (e: FormEvent) => {
    e.preventDefault();
    if (!calForm.equipmentId || !calForm.agency || !calForm.date) {
      toast.error('Please fill in equipment, calibrating agency, and date');
      return;
    }
    const newId = `CAL${String(calibrations.length + 1).padStart(3, '0')}`;
    const payload = { id: newId, ...calForm };
    const updatedCal = [payload, ...calibrations];
    saveCalibrations(updatedCal);

    // Update equipment status
    const updatedEq = equipment.map(eq => {
      if (eq.id === calForm.equipmentId) {
        const up = {
          ...eq,
          status: 'Operational'
        };
        supabaseService.updateEquipment(eq.id, up);
        return up;
      }
      return eq;
    });
    saveEquipment(updatedEq);
    setIsCalModalOpen(false);
    toast.success('Calibration certificate logged successfully');
    setCalForm({ equipmentId: '', agency: '', date: '', certificateRef: '', status: 'Certified', dueDate: '', remarks: '' });
  };

  // Report Breakdown
  const handleReportBreakdown = async (e: FormEvent) => {
    e.preventDefault();
    if (!bdForm.equipmentId || !bdForm.description || !bdForm.reportedBy) {
      toast.error('Please specify equipment, fault description, and reporter');
      return;
    }
    
    const payload = { ...bdForm, resolvedDate: '' };
    await supabaseService.createBreakdown(payload);

    // Change equipment status to Broken Down
    await supabaseService.updateEquipment(bdForm.equipmentId, { status: 'Broken Down' });
    
    await fetchData();
    setIsBdModalOpen(false);
    toast.error('Breakdown reported. Equipment marked as Broken Down.');
    setBdForm({ equipmentId: '', reportedBy: '', reportedDate: '', description: '', severity: 'High', status: 'Pending', estimatedCost: 0 });
  };

  // Resolve Breakdown action
  const handleResolveBreakdown = async (bdId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const bd = breakdowns.find(b => b.id === bdId);
    if (bd) {
      await supabaseService.updateBreakdown(bdId, { status: 'Resolved', resolvedDate: today });
      await supabaseService.updateEquipment(bd.equipmentId || bd.equipment_id, { status: 'Operational' });
      toast.success('Breakdown resolved. Equipment marked as Operational.');
      await fetchData();
    }
  };

  // Delete equipment
  const handleDeleteEquipment = async (id: string) => {
    if (confirm('Are you sure you want to delete this equipment register record?')) {
      await supabaseService.deleteEquipment(id);
      await fetchData();
      toast.info('Equipment record removed');
    }
  };

  // Filters
  const filteredEq = equipment.filter(eq => 
    eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Operational':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"><CheckCircle className="w-3 h-3" /> Operational</Badge>;
      case 'Under Maintenance':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><Clock className="w-3 h-3" /> Under Maintenance</Badge>;
      case 'Calibration Due':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 gap-1"><Sliders className="w-3 h-3" /> Calibration Due</Badge>;
      case 'Broken Down':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 gap-1"><AlertTriangle className="w-3 h-3" /> Broken Down</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div id="equipment-management" className="p-4 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-[#1A5E63] rounded-3xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-white/15 rounded-2xl">
              <Wrench className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif" style={{ fontFamily: "Georgia, serif" }}>Medical Equipment & Biomedical Engineering</h1>
              <p className="text-xs text-teal-100 font-medium">Register, preventive maintenance logs, calibration control, breakdown tickets & AMC tracking.</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => {
            setEquipForm({ id: '', name: '', department: 'Radiology', model: '', serialNumber: '', installDate: '', status: 'Operational', lastPmDate: '', nextPmDate: '', amcVendor: '', amcExpiry: '' });
            setIsEquipModalOpen(true);
          }} className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold gap-2 rounded-full px-5 py-5 h-auto text-xs shadow-sm">
            <Plus className="w-4 h-4 stroke-[3]" />
            Register Equipment
          </Button>
          
          <Button onClick={() => setIsBdModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 rounded-full px-5 py-5 h-auto text-xs shadow-sm border border-rose-500">
            <AlertTriangle className="w-4 h-4" />
            Report Breakdown
          </Button>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Equipment</p>
            <p className="text-xl font-extrabold text-slate-900">{equipment.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Operational</p>
            <p className="text-xl font-extrabold text-slate-900">{equipment.filter(e => e.status === 'Operational').length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Broken Down</p>
            <p className="text-xl font-extrabold text-slate-900">{equipment.filter(e => e.status === 'Broken Down').length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending PM</p>
            <p className="text-xl font-extrabold text-slate-900">
              {equipment.filter(e => e.status === 'Under Maintenance' || e.status === 'Calibration Due').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border shadow-sm col-span-2 lg:col-span-1 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active AMC Contracts</p>
            <p className="text-xl font-extrabold text-slate-900">{equipment.filter(e => e.amcVendor).length}</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
        <button 
          onClick={() => setActiveTab('register')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'register' 
              ? 'border-[#1A5E63] text-[#1A5E63]' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Equipment Register
        </button>
        <button 
          onClick={() => setActiveTab('pm')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'pm' 
              ? 'border-[#1A5E63] text-[#1A5E63]' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Preventive Maintenance (PM)
        </button>
        <button 
          onClick={() => setActiveTab('calibration')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'calibration' 
              ? 'border-[#1A5E63] text-[#1A5E63]' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Calibration Controls
        </button>
        <button 
          onClick={() => setActiveTab('amc')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'amc' 
              ? 'border-[#1A5E63] text-[#1A5E63]' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          AMC Tracking
        </button>
        <button 
          onClick={() => setActiveTab('breakdowns')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'breakdowns' 
              ? 'border-[#1A5E63] text-[#1A5E63]' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Breakdown Ticket Log
          {breakdowns.filter(b => b.status === 'Pending' || b.status === 'Under Repair').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-rose-500 text-white rounded-full font-black">
              {breakdowns.filter(b => b.status === 'Pending' || b.status === 'Under Repair').length}
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 lg:p-6 min-h-[400px]">
        
        {/* Register Tab */}
        {activeTab === 'register' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input 
                  placeholder="Search registers by name, model, Dept..." 
                  className="pl-9 h-9 text-xs" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 font-semibold">Showing {filteredEq.length} registered equipment units</p>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Equip ID</th>
                    <th className="p-3">Equipment Name</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Model & Serial</th>
                    <th className="p-3">Installation</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Next PM</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {filteredEq.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">No medical equipment matches your search filter</td>
                    </tr>
                  ) : (
                    filteredEq.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-[#1A5E63]">{item.id}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">AMC: {item.amcVendor || 'None'}</p>
                        </td>
                        <td className="p-3 font-medium text-slate-600">{item.department}</td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-700">{item.model}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.serialNumber}</p>
                        </td>
                        <td className="p-3 text-slate-500 font-medium">{item.installDate}</td>
                        <td className="p-3">{getStatusBadge(item.status)}</td>
                        <td className="p-3 text-slate-600 font-semibold">{item.nextPmDate || 'Not set'}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-teal-600 hover:bg-teal-50"
                              onClick={() => {
                                setEquipForm(item);
                                setIsEquipModalOpen(true);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                              onClick={() => handleDeleteEquipment(item.id)}
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
        )}

        {/* PM Tab */}
        {activeTab === 'pm' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-teal-50/60 p-4 rounded-xl border border-teal-100">
              <div>
                <h3 className="text-xs font-black text-[#1A5E63] uppercase tracking-wider">Preventive Maintenance Schedule</h3>
                <p className="text-[11px] text-slate-600 mt-0.5">Maintain uptime ratios by adhering strictly to predefined calibration and equipment servicing runs.</p>
              </div>
              <Button onClick={() => setIsPmModalOpen(true)} className="bg-[#1A5E63] hover:bg-[#1A5E63]/90 text-white text-xs h-8 rounded-full gap-1.5">
                <FileCheck className="w-3.5 h-3.5" /> Log PM Service
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Equipment</th>
                    <th className="p-3">Service Engineer</th>
                    <th className="p-3">Service Date</th>
                    <th className="p-3">Next Due Date</th>
                    <th className="p-3">Findings / Work Performed</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {pmLogs.map((log) => {
                    const eq = equipment.find(e => e.id === log.equipmentId);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-700">{log.id}</td>
                        <td className="p-3 font-semibold text-slate-800">{eq ? eq.name : log.equipmentId}</td>
                        <td className="p-3 text-slate-600 font-medium">{log.doneBy}</td>
                        <td className="p-3 text-slate-500 font-mono">{log.date}</td>
                        <td className="p-3 text-slate-500 font-mono font-bold text-amber-700">{log.nextDate || 'N/A'}</td>
                        <td className="p-3 text-slate-600 leading-normal max-w-sm">{log.findings}</td>
                        <td className="p-3">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{log.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calibration Tab */}
        {activeTab === 'calibration' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-50/60 p-4 rounded-xl border border-blue-100">
              <div>
                <h3 className="text-xs font-black text-blue-800 uppercase tracking-wider">Calibration Control Logs</h3>
                <p className="text-[11px] text-slate-600 mt-0.5">Critical sensors, CT X-Ray dose levels, lasers, and monitoring devices must hold active, certified calibration sheets.</p>
              </div>
              <Button onClick={() => setIsCalModalOpen(true)} className="bg-blue-700 hover:bg-blue-800 text-white text-xs h-8 rounded-full gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Log Calibration Cert
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Cert ID</th>
                    <th className="p-3">Equipment Unit</th>
                    <th className="p-3">Calibration Agency</th>
                    <th className="p-3">Cert Reference</th>
                    <th className="p-3">Calibration Date</th>
                    <th className="p-3">Due Recalibration Date</th>
                    <th className="p-3">Audit / Remarks</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {calibrations.map((cal) => {
                    const eq = equipment.find(e => e.id === cal.equipmentId);
                    return (
                      <tr key={cal.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-700">{cal.id}</td>
                        <td className="p-3 font-semibold text-slate-800">{eq ? eq.name : cal.equipmentId}</td>
                        <td className="p-3 text-slate-600">{cal.agency}</td>
                        <td className="p-3 font-mono text-slate-500 font-bold">{cal.certificateRef}</td>
                        <td className="p-3 text-slate-500 font-mono">{cal.date}</td>
                        <td className="p-3 text-rose-700 font-mono font-bold">{cal.dueDate}</td>
                        <td className="p-3 text-slate-600 max-w-xs">{cal.remarks}</td>
                        <td className="p-3">
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">Certified</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AMC Tab */}
        {activeTab === 'amc' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border rounded-xl">
              <h3 className="text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Annual Maintenance Contract (AMC) Register</h3>
              <p className="text-[11px] text-slate-500">Track supplier warranties, third-party AMC coverage end dates, and service contact personnel.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipment.filter(e => e.amcVendor).map((item) => (
                <div key={item.id} className="p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-teal-600" />
                  <div className="space-y-2 mt-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-widest">{item.id}</span>
                      <Badge className="bg-emerald-50 text-emerald-700 text-[10px] font-bold">Active AMC</Badge>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{item.name}</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Vendor: <span className="text-slate-800 font-semibold">{item.amcVendor}</span></p>
                    <p className="text-[11px] text-slate-500 font-medium">Expiry: <span className="text-rose-600 font-bold font-mono">{item.amcExpiry}</span></p>
                  </div>
                  
                  <div className="pt-3 border-t mt-4 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Department: {item.department}</span>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-[#1A5E63] font-bold">Contact Vendor</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Breakdowns Tab */}
        {activeTab === 'breakdowns' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Ticket ID</th>
                    <th className="p-3">Equipment Unit</th>
                    <th className="p-3">Fault Description</th>
                    <th className="p-3">Reported By / Date</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Est Cost</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {breakdowns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">No breakdowns logged currently</td>
                    </tr>
                  ) : (
                    breakdowns.map((bd) => {
                      const eq = equipment.find(e => e.id === bd.equipmentId);
                      return (
                        <tr key={bd.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-black text-rose-600">{bd.id}</td>
                          <td className="p-3">
                            <p className="font-bold text-slate-800">{eq ? eq.name : bd.equipmentId}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Serial: {eq?.serialNumber || 'N/A'}</p>
                          </td>
                          <td className="p-3 text-slate-700 leading-normal max-w-sm">{bd.description}</td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-700">{bd.reportedBy}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{bd.reportedDate}</p>
                          </td>
                          <td className="p-3">
                            <Badge className={bd.severity === 'High' ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-amber-100 text-amber-800 font-bold'}>
                              {bd.severity}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {bd.status === 'Resolved' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Resolved ({bd.resolvedDate})</Badge>
                            ) : bd.status === 'Under Repair' ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 animate-pulse">Under Repair</Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200">Pending Inspection</Badge>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-700">${bd.estimatedCost || '0'}</td>
                          <td className="p-3 text-right">
                            {bd.status !== 'Resolved' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleResolveBreakdown(bd.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 rounded text-[10px]"
                              >
                                Mark Resolved
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Equipment Register / Edit Modal */}
      {isEquipModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg font-serif">
                {equipForm.id ? `Edit Equipment : ${equipForm.id}` : 'Register Medical Equipment'}
              </h3>
              <button onClick={() => setIsEquipModalOpen(false)} className="text-white/80 hover:text-white font-black text-lg">×</button>
            </div>
            <form onSubmit={handleAddEquipment} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Equipment Name *</Label>
                  <Input 
                    value={equipForm.name} 
                    onChange={(e) => setEquipForm({ ...equipForm, name: e.target.value })}
                    placeholder="e.g. Philips InteliVue ICU Monitor" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select 
                    value={equipForm.department} 
                    onValueChange={(val) => setEquipForm({ ...equipForm, department: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Radiology">Radiology</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="OT / Surgery">OT / Surgery</SelectItem>
                      <SelectItem value="ICU / Neonatal">ICU / Neonatal</SelectItem>
                      <SelectItem value="Gastroenterology">Gastroenterology</SelectItem>
                      <SelectItem value="Maternity">Maternity</SelectItem>
                      <SelectItem value="Outpatient (OPD)">Outpatient (OPD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Model No *</Label>
                  <Input 
                    value={equipForm.model} 
                    onChange={(e) => setEquipForm({ ...equipForm, model: e.target.value })}
                    placeholder="e.g. MP50" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Serial Number *</Label>
                  <Input 
                    value={equipForm.serialNumber} 
                    onChange={(e) => setEquipForm({ ...equipForm, serialNumber: e.target.value })}
                    placeholder="e.g. SN-9981-G" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Installation Date</Label>
                  <Input 
                    type="date" 
                    value={equipForm.installDate} 
                    onChange={(e) => setEquipForm({ ...equipForm, installDate: e.target.value })} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select 
                    value={equipForm.status} 
                    onValueChange={(val) => setEquipForm({ ...equipForm, status: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operational">Operational</SelectItem>
                      <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                      <SelectItem value="Calibration Due">Calibration Due</SelectItem>
                      <SelectItem value="Broken Down">Broken Down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Next PM Due Date</Label>
                  <Input 
                    type="date" 
                    value={equipForm.nextPmDate} 
                    onChange={(e) => setEquipForm({ ...equipForm, nextPmDate: e.target.value })} 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>AMC Vendor Name</Label>
                  <Input 
                    value={equipForm.amcVendor} 
                    onChange={(e) => setEquipForm({ ...equipForm, amcVendor: e.target.value })}
                    placeholder="e.g. Philips Healthcare Services" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>AMC Warranty Expiry</Label>
                  <Input 
                    type="date" 
                    value={equipForm.amcExpiry} 
                    onChange={(e) => setEquipForm({ ...equipForm, amcExpiry: e.target.value })} 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEquipModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] hover:bg-[#1A5E63]/90 text-white font-bold px-5">
                  {equipForm.id ? 'Update Registered Unit' : 'Save New Equipment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log PM Modal */}
      {isPmModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Log Preventive Maintenance (PM) run</h3>
              <button onClick={() => setIsPmModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleLogPm} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Select Equipment Unit *</Label>
                <Select 
                  value={pmForm.equipmentId} 
                  onValueChange={(val) => setPmForm({ ...pmForm, equipmentId: val })}
                >
                  <SelectTrigger><SelectValue placeholder="Select device..." /></SelectTrigger>
                  <SelectContent>
                    {equipment.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Biomedical Service Engineer *</Label>
                <Input 
                  value={pmForm.doneBy} 
                  onChange={(e) => setPmForm({ ...pmForm, doneBy: e.target.value })}
                  placeholder="e.g. Sunita Verma, PM Tech" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Service Date *</Label>
                  <Input 
                    type="date" 
                    value={pmForm.date} 
                    onChange={(e) => setPmForm({ ...pmForm, date: e.target.value })} 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Next Scheduled Date</Label>
                  <Input 
                    type="date" 
                    value={pmForm.nextDate} 
                    onChange={(e) => setPmForm({ ...pmForm, nextDate: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Biomed findings / Parts replaced</Label>
                <textarea 
                  value={pmForm.findings} 
                  onChange={(e) => setPmForm({ ...pmForm, findings: e.target.value })}
                  rows={3} 
                  placeholder="e.g. Calibrated pressure valves, replaced vacuum pump seal..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5E63]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsPmModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] hover:bg-[#1A5E63]/90 text-white font-bold">Log PM Session</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Calibration Modal */}
      {isCalModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-blue-800 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Log Calibration Certificate</h3>
              <button onClick={() => setIsCalModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleLogCal} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Select Medical Equipment Unit *</Label>
                <Select 
                  value={calForm.equipmentId} 
                  onValueChange={(val) => setCalForm({ ...calForm, equipmentId: val })}
                >
                  <SelectTrigger><SelectValue placeholder="Select device..." /></SelectTrigger>
                  <SelectContent>
                    {equipment.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Calibrating Laboratory / Agency *</Label>
                <Input 
                  value={calForm.agency} 
                  onChange={(e) => setCalForm({ ...calForm, agency: e.target.value })}
                  placeholder="e.g. Standard Calibration Labs, Inc." 
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <Label>Certificate ID / Ref No *</Label>
                <Input 
                  value={calForm.certificateRef} 
                  onChange={(e) => setCalForm({ ...calForm, certificateRef: e.target.value })}
                  placeholder="e.g. SCL-99128" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Calibration Date *</Label>
                  <Input 
                    type="date" 
                    value={calForm.date} 
                    onChange={(e) => setCalForm({ ...calForm, date: e.target.value })} 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Next Recalibration Due *</Label>
                  <Input 
                    type="date" 
                    value={calForm.dueDate} 
                    onChange={(e) => setCalForm({ ...calForm, dueDate: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Auditor remarks / Tolerances verified</Label>
                <textarea 
                  value={calForm.remarks} 
                  onChange={(e) => setCalForm({ ...calForm, remarks: e.target.value })}
                  rows={2} 
                  placeholder="Sensor precision matches certified ISO 13485 metrics..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsCalModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-800 hover:bg-blue-900 text-white font-bold">Store Calibration Cert</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Breakdown Modal */}
      {isBdModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-600 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Report Equipment Breakdown</h3>
              <button onClick={() => setIsBdModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleReportBreakdown} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Select Malfunctioning Equipment *</Label>
                <Select 
                  value={bdForm.equipmentId} 
                  onValueChange={(val) => setBdForm({ ...bdForm, equipmentId: val })}
                >
                  <SelectTrigger><SelectValue placeholder="Select device..." /></SelectTrigger>
                  <SelectContent>
                    {equipment.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Severity Level</Label>
                  <Select 
                    value={bdForm.severity} 
                    onValueChange={(val) => setBdForm({ ...bdForm, severity: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High (Device inoperable)</SelectItem>
                      <SelectItem value="Medium">Medium (Partial function loss)</SelectItem>
                      <SelectItem value="Low">Low (Minor cosmetic / non-vital)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Est Repair Cost ($)</Label>
                  <Input 
                    type="number" 
                    value={bdForm.estimatedCost} 
                    onChange={(e) => setBdForm({ ...bdForm, estimatedCost: Number(e.target.value) })}
                    placeholder="0" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Reported By *</Label>
                  <Input 
                    value={bdForm.reportedBy} 
                    onChange={(e) => setBdForm({ ...bdForm, reportedBy: e.target.value })}
                    placeholder="Nurse or Doctor name" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Incident Date *</Label>
                  <Input 
                    type="date" 
                    value={bdForm.reportedDate} 
                    onChange={(e) => setBdForm({ ...bdForm, reportedDate: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Describe the Malfunction / Error Codes *</Label>
                <textarea 
                  value={bdForm.description} 
                  onChange={(e) => setBdForm({ ...bdForm, description: e.target.value })}
                  rows={3} 
                  placeholder="Detail exactly what failed (e.g., error code ERR-02 light output failure)..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsBdModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">Report Breakdown</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
