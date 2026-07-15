import { useState, useEffect, FormEvent } from 'react';
import { 
  Droplet, 
  Plus, 
  Search, 
  Users, 
  ShieldCheck, 
  Heart, 
  Thermometer, 
  Calendar, 
  Clock, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Shuffle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';

function normalizeDonor(dnr: any) {
  if (!dnr) return dnr;
  return {
    ...dnr,
    bloodGroup: dnr.blood_group || dnr.bloodGroup || 'O+',
    lastDonation: dnr.last_donation || dnr.lastDonation || '',
  };
}

function normalizeIssue(iss: any) {
  if (!iss) return iss;
  return {
    ...iss,
    recipientName: iss.recipient_name || iss.recipientName || '',
    bloodGroup: iss.blood_group || iss.bloodGroup || 'O+',
    bagNo: iss.bag_no || iss.bagNo || '',
    issuedBy: iss.issued_by || iss.issuedBy || '',
  };
}

// Sample blood stock units (in bags)
const DEFAULT_STOCKS = {
  'A+': 12, 'A-': 3,
  'B+': 18, 'B-': 4,
  'AB+': 8, 'AB-': 2,
  'O+': 24, 'O-': 6
};

const SAMPLE_DONORS = [
  { id: 'DNR001', name: 'Jayesh Sharma', age: 34, gender: 'Male', bloodGroup: 'O+', bp: '120/80', hemoglobin: '14.8', lastDonation: '2026-07-01', status: 'Fit' },
  { id: 'DNR002', name: 'Kavita Rao', age: 29, gender: 'Female', bloodGroup: 'A-', bp: '115/75', hemoglobin: '12.5', lastDonation: '2026-06-15', status: 'Fit' },
  { id: 'DNR003', name: 'Rohan Chaudhari', age: 45, gender: 'Male', bloodGroup: 'B+', bp: '138/85', hemoglobin: '13.9', lastDonation: '2026-05-10', status: 'Deferred' }
];

const SAMPLE_ISSUES = [
  { id: 'ISS001', recipientName: 'Sunita Joshi', mrn: 'MRN-7738', bloodGroup: 'O+', bagNo: 'BAG-O-9912', ward: 'OT Room 1', date: '2026-07-08', crossMatched: 'Compatible', issuedBy: 'Dr. Suresh Nair' },
  { id: 'ISS002', recipientName: 'Milind Chandra', mrn: 'MRN-4119', bloodGroup: 'A-', bagNo: 'BAG-A-8812', ward: 'ICU Block B', date: '2026-07-09', crossMatched: 'Compatible', issuedBy: 'Nurse Rahul Thomas' }
];

const SAMPLE_TEMPS = [
  { id: 'TMP001', timestamp: '2026-07-09 08:00 AM', temp: 3.4, status: 'Normal', recordedBy: 'Tech Anita Desai' },
  { id: 'TMP002', timestamp: '2026-07-09 12:00 PM', temp: 4.1, status: 'Normal', recordedBy: 'Tech Anita Desai' },
  { id: 'TMP003', timestamp: '2026-07-09 04:00 PM', temp: 3.8, status: 'Normal', recordedBy: 'Tech Anita Desai' }
];

// Blood Compatibility Map
// key = Recipient Group, value = Compatible Donor Groups
const COMPATIBILITY_MAP: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'] // Universal donor
};

export default function BloodBank() {
  const [activeTab, setActiveTab] = useState<'stock' | 'donors' | 'compatibility' | 'issues' | 'temps'>('stock');
  
  // State
  const [stocks, setStocks] = useState<Record<string, number>>(DEFAULT_STOCKS);
  const [donors, setDonors] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [temps, setTemps] = useState<any[]>([]);

  // Testing Compatibility
  const [patientBg, setPatientBg] = useState('A+');
  const [testResult, setTestResult] = useState<string[]>([]);

  // Modal forms
  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isTempModalOpen, setIsTempModalOpen] = useState(false);

  // Form payloads
  const [donorForm, setDonorForm] = useState({ name: '', age: 30, gender: 'Male', bloodGroup: 'O+', bp: '120/80', hemoglobin: '14.0', status: 'Fit', lastDonation: '' });
  const [issueForm, setIssueForm] = useState({ recipientName: '', mrn: '', bloodGroup: 'O+', bagNo: '', ward: 'OT Room 1', date: '', crossMatched: 'Compatible', issuedBy: '' });
  const [tempForm, setTempForm] = useState({ temp: 4.0, status: 'Normal', recordedBy: '' });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load state
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const dbDonors = await supabaseService.getBloodDonations();
        const dbIssues = await supabaseService.getBloodIssues();

        const localDonors = storage.get('hms_blood_donors', SAMPLE_DONORS);
        const localIssues = storage.get('hms_blood_issues', SAMPLE_ISSUES);

        // Map and normalize records
        const normalizedDbDonors = dbDonors.map(normalizeDonor);
        const normalizedDbIssues = dbIssues.map(normalizeIssue);

        // Merge DB data with local fallbacks
        const mergedDonors = [
          ...normalizedDbDonors,
          ...localDonors.filter((ld: any) => !normalizedDbDonors.some((dd: any) => dd.id === ld.id || dd.name === ld.name))
        ];
        const mergedIssues = [
          ...normalizedDbIssues,
          ...localIssues.filter((li: any) => !normalizedDbIssues.some((di: any) => di.id === li.id || di.recipientName === li.recipientName))
        ];

        setDonors(mergedDonors);
        setIssues(mergedIssues);

        // Re-calculate live stock counts from donor sessions and release issues
        const computedStocks = { ...DEFAULT_STOCKS };
        mergedDonors.forEach((dnr: any) => {
          if (dnr.status === 'Fit' && dnr.bloodGroup && computedStocks[dnr.bloodGroup] !== undefined) {
            computedStocks[dnr.bloodGroup] = (computedStocks[dnr.bloodGroup] || 0) + 1;
          }
        });
        mergedIssues.forEach((iss: any) => {
          if (iss.bloodGroup && computedStocks[iss.bloodGroup] !== undefined) {
            computedStocks[iss.bloodGroup] = Math.max(0, (computedStocks[iss.bloodGroup] || 0) - 1);
          }
        });

        setStocks(computedStocks);
        storage.set('hms_blood_stocks', computedStocks);
      } catch (err) {
        console.error('Failed to load blood bank records from Supabase:', err);
        setDonors(storage.get('hms_blood_donors', SAMPLE_DONORS));
        setIssues(storage.get('hms_blood_issues', SAMPLE_ISSUES));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    setTemps(storage.get('hms_blood_temps', SAMPLE_TEMPS));
  }, []);

  const saveStocks = (ns: Record<string, number>) => { setStocks(ns); storage.set('hms_blood_stocks', ns); };
  const saveDonors = (nd: any[]) => { setDonors(nd); storage.set('hms_blood_donors', nd); };
  const saveIssues = (ni: any[]) => { setIssues(ni); storage.set('hms_blood_issues', ni); };
  const saveTemps = (nt: any[]) => { setTemps(nt); storage.set('hms_blood_temps', nt); };

  // Compatibility Checker
  useEffect(() => {
    setTestResult(COMPATIBILITY_MAP[patientBg] || []);
  }, [patientBg]);

  // Handlers
  const handleAddDonor = async (e: FormEvent) => {
    e.preventDefault();
    if (!donorForm.name || !donorForm.hemoglobin) {
      toast.error('Donor name and hemoglobin index required');
      return;
    }

    setIsSaving(true);
    try {
      const dbPayload = {
        name: donorForm.name,
        age: donorForm.age,
        gender: donorForm.gender,
        blood_group: donorForm.bloodGroup,
        bp: donorForm.bp,
        hemoglobin: parseFloat(donorForm.hemoglobin) || 14.0,
        status: donorForm.status,
        last_donation: donorForm.lastDonation || null
      };

      const result = await supabaseService.createBloodDonation(dbPayload);

      const savedDonor = result ? normalizeDonor(result) : {
        id: `DNR${String(donors.length + 1).padStart(3, '0')}`,
        ...donorForm
      };

      const updatedDonors = [savedDonor, ...donors];
      saveDonors(updatedDonors);

      // Recalculate stocks dynamically
      const computedStocks = { ...stocks };
      if (donorForm.status === 'Fit') {
        const bg = donorForm.bloodGroup;
        computedStocks[bg] = (computedStocks[bg] || 0) + 1;
        saveStocks(computedStocks);
        toast.success(`Donation session registered. 1 bag added to blood group ${bg}. Saved to Supabase.`);
      } else {
        toast.info('Donor logged. Deferred for medical safety parameters.');
      }

      setIsDonorModalOpen(false);
      setDonorForm({ name: '', age: 30, gender: 'Male', bloodGroup: 'O+', bp: '120/80', hemoglobin: '14.0', status: 'Fit', lastDonation: '' });
    } catch (err: any) {
      toast.error('Failed to save donor session: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleIssueBlood = async (e: FormEvent) => {
    e.preventDefault();
    if (!issueForm.recipientName || !issueForm.mrn || !issueForm.bagNo) {
      toast.error('Patient Name, MRN, and Bag reference are required');
      return;
    }

    // Check stock
    const currentQty = stocks[issueForm.bloodGroup] || 0;
    if (currentQty <= 0) {
      toast.error(`Zero stock available in group ${issueForm.bloodGroup}! Cannot release blood bag.`);
      return;
    }

    setIsSaving(true);
    try {
      const dbPayload = {
        recipient_name: issueForm.recipientName,
        mrn: issueForm.mrn,
        blood_group: issueForm.bloodGroup,
        bag_no: issueForm.bagNo,
        ward: issueForm.ward || 'General',
        issued_by: issueForm.issuedBy || 'Duty Doctor',
        date: issueForm.date || new Date().toISOString().split('T')[0]
      };

      const result = await supabaseService.createBloodIssue(dbPayload);

      const savedIssue = result ? normalizeIssue(result) : {
        id: `ISS${String(issues.length + 1).padStart(3, '0')}`,
        ...issueForm
      };

      const updatedIssues = [savedIssue, ...issues];
      saveIssues(updatedIssues);

      // Deduct stock
      const computedStocks = { ...stocks };
      const bg = issueForm.bloodGroup;
      computedStocks[bg] = Math.max(0, (computedStocks[bg] || 0) - 1);
      saveStocks(computedStocks);

      setIsIssueModalOpen(false);
      toast.success(`Blood Bag ${issueForm.bagNo} released successfully for ${issueForm.recipientName}. Saved to Supabase.`);
    } catch (err: any) {
      toast.error('Failed to release blood bag: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTemp = (e: FormEvent) => {
    e.preventDefault();
    const newId = `TMP${String(temps.length + 1).padStart(3, '0')}`;
    const now = new Date();
    const isAlarm = tempForm.temp < 2 || tempForm.temp > 6;
    const finalForm = {
      id: newId,
      timestamp: now.toLocaleString(),
      temp: Number(tempForm.temp),
      status: isAlarm ? 'ALARM / HIGH TEMP' : 'Normal',
      recordedBy: tempForm.recordedBy || 'Duty Staff'
    };
    saveTemps([finalForm, ...temps]);
    setIsTempModalOpen(false);

    if (isAlarm) {
      toast.error(`CRITICAL ALARM: Storage refrigerator temperature (${tempForm.temp}°C) is outside 2°C - 6°C threshold!`);
    } else {
      toast.success('Temperature parameters locked. Refrigerator is stable.');
    }
    setTempForm({ temp: 4.0, status: 'Normal', recordedBy: '' });
  };

  return (
    <div id="blood-bank" className="p-4 lg:p-8 space-y-6">
      {/* Banner */}
      <div className="bg-[#1A5E63] rounded-3xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-white/15 rounded-2xl">
              <Droplet className="w-7 h-7 text-rose-500 fill-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif" style={{ fontFamily: "Georgia, serif" }}>Blood Bank & Transfusion Logistics</h1>
              <p className="text-xs text-teal-100 font-medium">Safe cold storage auditing, cross-match verification panels, donor registers, and recipient release protocols.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsDonorModalOpen(true)} className="bg-rose-500 hover:bg-rose-600 text-white font-bold gap-2 rounded-full px-5 py-5 h-auto text-xs shadow-sm">
            <Plus className="w-4 h-4 stroke-[3]" /> Register Donor
          </Button>
          <Button onClick={() => setIsIssueModalOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold gap-2 rounded-full px-5 py-5 h-auto text-xs shadow-sm">
            <Shuffle className="w-4 h-4" /> Issue Blood Bag
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Quick Stock Indicators */}
        <div className="lg:col-span-3 bg-white rounded-2xl border shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Blood Stock inventory (In Bags)</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Target Temperature Range: 2°C – 6°C</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(stocks).map(([bg, qty]) => {
              const isLow = (qty as number) <= 4;
              return (
                <div key={bg} className="p-4 rounded-xl border relative overflow-hidden bg-slate-50 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-lg font-black text-slate-800">{bg}</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Available Units</p>
                  </div>
                  <div className="text-right flex items-center gap-1.5">
                    <span className={`text-2xl font-black ${isLow ? 'text-rose-600' : 'text-[#1A5E63]'}`}>{qty}</span>
                    <Droplet className={`w-6 h-6 ${isLow ? 'text-rose-400 animate-pulse' : 'text-rose-600'} fill-rose-600/20`} />
                  </div>
                  {isLow && <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cold Storage Temp Widget */}
        <div className="bg-white rounded-2xl border shadow-sm p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Cold Storage temp</h3>
              <Thermometer className="w-4 h-4 text-rose-500 animate-bounce" />
            </div>
            <div className="text-center py-4 bg-slate-50 rounded-xl border">
              <span className="text-4xl font-black text-slate-800">
                {temps[0]?.temp || '3.8'}°C
              </span>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Last Logged: {temps[0]?.timestamp.split(' ')[1] || 'Today'}</p>
            </div>
          </div>
          <div className="pt-3 border-t mt-4 flex justify-between items-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">SAFE STATUS</span>
            <Button onClick={() => setIsTempModalOpen(true)} variant="link" size="sm" className="h-auto p-0 text-xs font-bold text-[#1A5E63]">Log Temperature</Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
        <button 
          onClick={() => setActiveTab('stock')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'stock' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Transfusion & Issue History
        </button>
        <button 
          onClick={() => setActiveTab('donors')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'donors' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Donor Registry
        </button>
        <button 
          onClick={() => setActiveTab('compatibility')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'compatibility' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Compatibility Lookup Tool
        </button>
        <button 
          onClick={() => setActiveTab('temps')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'temps' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Refrigerator Temp Auditing
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 lg:p-6 min-h-[350px]">
        {/* Issues history */}
        {activeTab === 'stock' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Issue ID</th>
                    <th className="p-3">Recipient Patient</th>
                    <th className="p-3">MRN Reference</th>
                    <th className="p-3">Blood Group</th>
                    <th className="p-3">Bag Serial Ref</th>
                    <th className="p-3">Recipient Ward</th>
                    <th className="p-3">Cross-match Status</th>
                    <th className="p-3">Authorized By</th>
                    <th className="p-3">Dispatched Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {issues.map(iss => (
                    <tr key={iss.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-500">{iss.id}</td>
                      <td className="p-3 font-bold text-slate-800">{iss.recipientName}</td>
                      <td className="p-3 font-mono text-[#1A5E63] font-semibold">{iss.mrn}</td>
                      <td className="p-3 font-extrabold text-rose-600">{iss.bloodGroup}</td>
                      <td className="p-3 font-mono font-bold text-slate-500">{iss.bagNo}</td>
                      <td className="p-3 text-slate-600 font-medium">{iss.ward}</td>
                      <td className="p-3">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Compatible</Badge>
                      </td>
                      <td className="p-3 text-slate-600">{iss.issuedBy}</td>
                      <td className="p-3 text-slate-500 font-semibold">{iss.date || '2026-07-09'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Donors list */}
        {activeTab === 'donors' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Donor ID</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Age / Gender</th>
                    <th className="p-3">Blood Group</th>
                    <th className="p-3">Blood Pressure</th>
                    <th className="p-3">Hemoglobin Index</th>
                    <th className="p-3">Last Donation</th>
                    <th className="p-3">Screening Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {donors.map(dnr => (
                    <tr key={dnr.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-600">{dnr.id}</td>
                      <td className="p-3 font-bold text-slate-800">{dnr.name}</td>
                      <td className="p-3 text-slate-600 font-medium">{dnr.age} yrs / {dnr.gender}</td>
                      <td className="p-3 font-extrabold text-rose-600">{dnr.bloodGroup}</td>
                      <td className="p-3 font-mono text-slate-500">{dnr.bp} mmHg</td>
                      <td className="p-3 font-mono font-bold text-slate-700">{dnr.hemoglobin} g/dL</td>
                      <td className="p-3 text-slate-500">{dnr.lastDonation || 'Today'}</td>
                      <td className="p-3">
                        <Badge className={dnr.status === 'Fit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}>
                          {dnr.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Compatibility Matrix lookup tool */}
        {activeTab === 'compatibility' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border bg-teal-50/40 border-teal-100 max-w-xl">
              <h4 className="text-xs font-black text-[#1A5E63] uppercase tracking-wider mb-2">Patient Compatibility Simulation Engine</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Choose the recipient's blood group below. The system will automatically compute which donor bags can be safely transfused without triggering immune hemolysis reactions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
              <div className="p-4 rounded-xl border bg-slate-50 space-y-3">
                <Label className="font-extrabold text-slate-800">Select Recipient's Blood Group</Label>
                <Select value={patientBg} onValueChange={(val) => setPatientBg(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(COMPATIBILITY_MAP).map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 p-5 rounded-xl border bg-[#1A5E63]/5 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-[#1A5E63] uppercase tracking-widest">Simulation Output</span>
                  <p className="text-sm font-bold text-slate-800">
                    Recipient Group <span className="text-rose-600 text-lg font-black">{patientBg}</span> can safely receive:
                  </p>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    {testResult.map(res => (
                      <Badge key={res} className="bg-rose-600 text-white font-extrabold text-sm px-3.5 py-1 rounded-full shadow-sm gap-1">
                        <Droplet className="w-3.5 h-3.5 fill-white" />
                        {res}
                      </Badge>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-bold uppercase mt-4">
                  {patientBg === 'AB+' ? '★ UNIVERSAL RECIPIENT MODE ACTIVE' : patientBg === 'O-' ? '★ ONLY COMPATIBLE WITH UNIVERSAL DONOR' : '★ standard physiological compatibility list'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Temperature log registers */}
        {activeTab === 'temps' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Checked Timestamp</th>
                    <th className="p-3">Temperature (°C)</th>
                    <th className="p-3">Safety Status</th>
                    <th className="p-3">Duty Officer</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {temps.map(tmp => (
                    <tr key={tmp.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-700">{tmp.id}</td>
                      <td className="p-3 font-semibold text-slate-600">{tmp.timestamp}</td>
                      <td className="p-3 font-black text-slate-800">{tmp.temp} °C</td>
                      <td className="p-3">
                        <Badge className={tmp.status === 'Normal' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600 animate-pulse'}>
                          {tmp.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-500 font-medium">{tmp.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Donor Modal */}
      {isDonorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Register Blood Donor Session</h3>
              <button onClick={() => setIsDonorModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAddDonor} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Full Donor Name *</Label>
                <Input 
                  value={donorForm.name} 
                  onChange={(e) => setDonorForm({ ...donorForm, name: e.target.value })}
                  placeholder="e.g. Jayesh Sharma" 
                  required 
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Age *</Label>
                  <Input 
                    type="number" 
                    value={donorForm.age} 
                    onChange={(e) => setDonorForm({ ...donorForm, age: Number(e.target.value) })} 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select 
                    value={donorForm.gender} 
                    onValueChange={(val) => setDonorForm({ ...donorForm, gender: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Blood Group</Label>
                  <Select 
                    value={donorForm.bloodGroup} 
                    onValueChange={(val) => setDonorForm({ ...donorForm, bloodGroup: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(DEFAULT_STOCKS).map(bg => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Blood Pressure (BP) *</Label>
                  <Input 
                    value={donorForm.bp} 
                    onChange={(e) => setDonorForm({ ...donorForm, bp: e.target.value })}
                    placeholder="120/80" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Hemoglobin (Hb g/dL) *</Label>
                  <Input 
                    value={donorForm.hemoglobin} 
                    onChange={(e) => setDonorForm({ ...donorForm, hemoglobin: e.target.value })}
                    placeholder="13.5" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Screening Status</Label>
                  <Select 
                    value={donorForm.status} 
                    onValueChange={(val) => setDonorForm({ ...donorForm, status: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fit">Fit to Donate</SelectItem>
                      <SelectItem value="Deferred">Deferred / Medical hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Donation Date</Label>
                  <Input 
                    type="date" 
                    value={donorForm.lastDonation} 
                    onChange={(e) => setDonorForm({ ...donorForm, lastDonation: e.target.value })} 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" disabled={isSaving} onClick={() => setIsDonorModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="bg-[#1A5E63] text-white font-bold flex items-center gap-2">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'Logging Bag...' : 'Log Donation Bag'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Release bag modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Release blood bag / Issue</h3>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleIssueBlood} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Patient Name (Recipient) *</Label>
                <Input 
                  value={issueForm.recipientName} 
                  onChange={(e) => setIssueForm({ ...issueForm, recipientName: e.target.value })}
                  placeholder="e.g. Sarah Jenkins" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Patient MRN *</Label>
                  <Input 
                    value={issueForm.mrn} 
                    onChange={(e) => setIssueForm({ ...issueForm, mrn: e.target.value })}
                    placeholder="MRN-8821" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Required Blood Group *</Label>
                  <Select 
                    value={issueForm.bloodGroup} 
                    onValueChange={(val) => setIssueForm({ ...issueForm, bloodGroup: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(DEFAULT_STOCKS).map(bg => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Released Bag Serial *</Label>
                  <Input 
                    value={issueForm.bagNo} 
                    onChange={(e) => setIssueForm({ ...issueForm, bagNo: e.target.value })}
                    placeholder="BAG-O-9912" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Dispatched Ward</Label>
                  <Input 
                    value={issueForm.ward} 
                    onChange={(e) => setIssueForm({ ...issueForm, ward: e.target.value })} 
                    placeholder="OT Room 2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Issued By *</Label>
                  <Input 
                    value={issueForm.issuedBy} 
                    onChange={(e) => setIssueForm({ ...issueForm, issuedBy: e.target.value })} 
                    placeholder="Dr. Suresh Nair"
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Dispatched Date *</Label>
                  <Input 
                    type="date" 
                    value={issueForm.date} 
                    onChange={(e) => setIssueForm({ ...issueForm, date: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" disabled={isSaving} onClick={() => setIsIssueModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="bg-[#1A5E63] text-white font-bold flex items-center gap-2">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'Releasing...' : 'Authenticate & Release Bag'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fridge Temp Modal */}
      {isTempModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Log refrigerator Temperature</h3>
              <button onClick={() => setIsTempModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAddTemp} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Temperature (°C) *</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  value={tempForm.temp} 
                  onChange={(e) => setTempForm({ ...tempForm, temp: Number(e.target.value) })} 
                  required 
                />
                <p className="text-[10px] text-slate-400">Normal operating parameters are between 2.0°C and 6.0°C.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Duty Auditor Staff Name *</Label>
                <Input 
                  value={tempForm.recordedBy} 
                  onChange={(e) => setTempForm({ ...tempForm, recordedBy: e.target.value })} 
                  placeholder="Anita Desai"
                  required 
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsTempModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] text-white font-bold">Lock Temperature</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
