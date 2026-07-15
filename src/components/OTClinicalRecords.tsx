import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Activity, 
  HeartPulse, 
  Thermometer, 
  Sliders, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  CheckSquare, 
  BriefcaseMedical,
  Scale,
  Sparkles,
  ClipboardCheck,
  AlertTriangle,
  Receipt,
  User,
  ExternalLink,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { OTInventoryItem } from '@/types';

interface ClinicalWorkflowProps {
  record: any; // OperationRecord
  patient: any;
  surgeonName: string;
  onClose: () => void;
  onSaveNotes?: (notes: string) => void;
}

export default function OTClinicalRecords({ record, patient, surgeonName, onClose, onSaveNotes }: ClinicalWorkflowProps) {
  const [activeSubTab, setActiveSubTab] = useState<'preop' | 'anesthesia' | 'intraop' | 'postop' | 'consumables'>('preop');
  
  // Clinical state for this specific record ID
  const [clinicalData, setClinicalData] = useState<any>({
    preOp: {
      fastingStatus: 'Yes (8 Hours)',
      airwayClass: 'Class II',
      asaClass: 'ASA II',
      bp: '128/84',
      pulse: 78,
      temp: '98.6',
      spo2: 99,
      cleared: true,
      assessor: 'Dr. Sarah Sharma',
      notes: 'No cardiac contraindications. Fasting adequate.'
    },
    anesthesia: {
      type: 'General Anesthesia',
      inductionTime: '10:15 AM',
      maintainedWith: 'Sevoflurane + Propofol Infusion',
      anesthetist: 'Dr. Alok Verma',
      complications: 'None',
      vitalsTimeline: [
        { time: '10:15 AM', bp: '120/80', pulse: 76, spo2: 100 },
        { time: '10:30 AM', bp: '115/75', pulse: 72, spo2: 99 },
        { time: '10:45 AM', bp: '118/77', pulse: 74, spo2: 100 },
        { time: '11:00 AM', bp: '122/82', pulse: 75, spo2: 99 }
      ]
    },
    intraOp: {
      incisionTime: '10:25 AM',
      closureTime: '11:15 AM',
      findings: 'Identified acutely inflamed appendix. Normal surrounding tissue, minor localized serous fluid.',
      implantsUsed: false,
      implantDetails: '',
      bloodLoss: 50,
      specimenCollected: true,
      specimenDetails: 'Inflamed appendix tissue for histopathology.',
      surgeonNotes: 'Standard laparotomy incision made. Appendix isolated, ligated at base, and excised safely. Hemostasis achieved.'
    },
    postOp: {
      pacuIn: '11:20 AM',
      pacuOut: '12:30 PM',
      aldreteScore: 9,
      instructions: 'Monitor vitals every 15 mins for 2 hours. Keep NBM till bowel sounds return. Analgesics as prescribed.',
      destination: 'IPD Ward (Bed B2)',
      dischargingNurse: 'Nurse Deepika Roy'
    },
    consumables: [
      { id: 'c1', name: 'Vicryl 2-0 Absorbable Suture', qty: 2, price: 180 },
      { id: 'c2', name: 'Sterile Disposables Pack', qty: 1, price: 450 },
      { id: 'c3', name: 'Propofol Injection 10mg/mL (20ml)', qty: 2, price: 280 }
    ]
  });

  // Load state from local storage on mount
  useEffect(() => {
    const key = `hms_ot_clinical_${record.id}`;
    const stored = storage.get(key, null);
    if (stored) {
      setClinicalData(stored);
    } else {
      // Create and save default clinical data for this record
      storage.set(key, clinicalData);
    }
  }, [record.id]);

  const saveToStorage = (updatedData: any) => {
    storage.set(`hms_ot_clinical_${record.id}`, updatedData);
    setClinicalData(updatedData);
  };

  // Pre-Op Form Handler
  const handleSavePreOp = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Pre-operative assessment recorded successfully');
  };

  // Anesthesia Timeline Adder
  const [newVital, setNewVital] = useState({ time: '', bp: '', pulse: 75, spo2: 99 });
  const handleAddAnesthesiaVital = () => {
    if (!newVital.time || !newVital.bp) {
      toast.error('Please enter Time and Blood Pressure');
      return;
    }
    const updatedTimeline = [...clinicalData.anesthesia.vitalsTimeline, newVital];
    const updated = {
      ...clinicalData,
      anesthesia: {
        ...clinicalData.anesthesia,
        vitalsTimeline: updatedTimeline
      }
    };
    saveToStorage(updated);
    setNewVital({ time: '', bp: '', pulse: 75, spo2: 99 });
    toast.success('Anesthesia vitals logged at timeline');
  };

  const handleSaveAnesthesia = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Anesthesia record locked');
  };

  // Intra-Op Form Handler
  const handleSaveIntraOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveNotes) {
      onSaveNotes(clinicalData.intraOp.surgeonNotes);
    }
    toast.success('Intra-operative surgical notes documented successfully');
  };

  // Post-Op Form Handler
  const handleSavePostOp = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Post-operative recovery checklist saved');
  };

  // Consumables Logic
  const [otInventory, setOtInventory] = useState<OTInventoryItem[]>([]);
  const [selectedInvId, setSelectedInvId] = useState<string>('');
  const [useQty, setUseQty] = useState<number>(1);
  const [billingPosted, setBillingPosted] = useState<boolean>(false);

  useEffect(() => {
    const inv = storage.get('hms_ot_inventory', []);
    setOtInventory(inv);
    if (inv.length > 0) {
      setSelectedInvId(inv[0].id);
    }

    // Check if already posted to billing
    const postedKey = `hms_billing_posted_${record.id}`;
    setBillingPosted(storage.get(postedKey, false));
  }, [record.id]);

  const handleAddConsumable = () => {
    const invItem = otInventory.find(i => i.id === selectedInvId);
    if (!invItem) return;

    if (invItem.stock < useQty) {
      toast.error(`Insufficient stock! Current stock: ${invItem.stock}`);
      return;
    }

    // Add to local list
    const newConsumable = {
      id: `c-${Date.now()}`,
      name: invItem.name,
      qty: useQty,
      price: invItem.mrp,
      inventoryId: invItem.id
    };

    const updatedConsumables = [...clinicalData.consumables, newConsumable];
    const updated = { ...clinicalData, consumables: updatedConsumables };
    saveToStorage(updated);

    // Deduct from inventory
    const updatedInventory = otInventory.map(item => 
      item.id === invItem.id ? { ...item, stock: item.stock - useQty } : item
    );
    storage.set('hms_ot_inventory', updatedInventory);
    setOtInventory(updatedInventory);

    // Sync with Master Inventory
    const masterItems = storage.get('hms_inv_items', []);
    const updatedMaster = masterItems.map((m: any) => {
      if ((invItem.code && m.code === invItem.code) || (m.name.toLowerCase() === invItem.name.toLowerCase() && m.location === 'OT Sub-store')) {
        return { ...m, stock: Math.max(0, m.stock - useQty) };
      }
      return m;
    });
    storage.set('hms_inv_items', updatedMaster);

    toast.success(`${invItem.name} added to usage record`);
  };

  const handleRemoveConsumable = (id: string, qty: number, invId?: string) => {
    const updatedConsumables = clinicalData.consumables.filter((c: any) => c.id !== id);
    const updated = { ...clinicalData, consumables: updatedConsumables };
    saveToStorage(updated);

    // Return stock
    if (invId) {
      const updatedInventory = otInventory.map(item => 
        item.id === invId ? { ...item, stock: item.stock + qty } : item
      );
      storage.set('hms_ot_inventory', updatedInventory);
      setOtInventory(updatedInventory);

      // Sync with Master Inventory
      const matchedItem = otInventory.find(item => item.id === invId);
      if (matchedItem) {
        const masterItems = storage.get('hms_inv_items', []);
        const updatedMaster = masterItems.map((m: any) => {
          if ((matchedItem.code && m.code === matchedItem.code) || (m.name.toLowerCase() === matchedItem.name.toLowerCase() && m.location === 'OT Sub-store')) {
            return { ...m, stock: m.stock + qty };
          }
          return m;
        });
        storage.set('hms_inv_items', updatedMaster);
      }
    }
    toast.success('Consumable removed from surgery usage');
  };

  // Post to Billing System integration
  const handlePostToBilling = () => {
    if (clinicalData.consumables.length === 0) {
      toast.error('No consumables registered to post.');
      return;
    }

    // Fetch existing bills
    const allBills = storage.get(STORAGE_KEYS.BILLING, []);
    
    // Find patient's Unpaid bill, or create one
    let targetBill = allBills.find((b: any) => b.patientId === patient.id && b.status !== 'Paid');
    
    const billingItems = clinicalData.consumables.map((c: any) => ({
      description: `OT Consumable: ${c.name} x${c.qty}`,
      amount: c.price * c.qty,
      category: 'IPD' as const
    }));

    const totalConsumableCost = clinicalData.consumables.reduce((acc: number, c: any) => acc + (c.price * c.qty), 0);

    if (targetBill) {
      // Append items
      targetBill.items = [...targetBill.items, ...billingItems];
      targetBill.totalAmount = (targetBill.totalAmount || 0) + totalConsumableCost;
    } else {
      // Create new IPD Bill
      targetBill = {
        id: `bill-${Date.now()}`,
        patientId: patient.id,
        date: new Date().toISOString().split('T')[0],
        type: 'IPD',
        items: [
          { description: `OT Surgery Procedure Charges: ${record.operationName}`, amount: 15000, category: 'IPD' },
          ...billingItems
        ],
        totalAmount: 15000 + totalConsumableCost,
        paidAmount: 0,
        status: 'Unpaid',
        patientName: patient.name,
        patientPhone: patient.phone
      };
      allBills.push(targetBill);
    }

    // Save bills
    storage.set(STORAGE_KEYS.BILLING, allBills);
    
    // Mark as posted to prevent double charging
    storage.set(`hms_billing_posted_${record.id}`, true);
    setBillingPosted(true);

    toast.success(`₹${totalConsumableCost} posted to patient's billing file! Invoice ID: ${targetBill.id}`);
  };

  const totalConsumablesCost = clinicalData.consumables.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
      {/* Workflow Navigation */}
      <div className="lg:w-1/4 flex flex-col gap-2 shrink-0">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold space-y-1">
          <p className="text-slate-400 uppercase tracking-widest text-[10px]">Patient File</p>
          <p className="text-slate-900 text-sm font-bold truncate">{patient?.name}</p>
          <p className="text-slate-500 font-medium">MRN: {patient?.mrn} • Age: {patient?.age}</p>
          <div className="pt-2 flex flex-wrap gap-1">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">Cleared for Op</Badge>
            {billingPosted && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Billed</Badge>}
          </div>
        </div>

        <div className="space-y-1 mt-2">
          <Button
            variant="ghost"
            onClick={() => setActiveSubTab('preop')}
            className={`w-full justify-start gap-2 h-10 font-bold text-xs ${activeSubTab === 'preop' ? 'bg-[#1A5E63]/10 text-[#1A5E63] hover:bg-[#1A5E63]/10' : 'text-slate-600'}`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Pre-Op Assessment
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveSubTab('anesthesia')}
            className={`w-full justify-start gap-2 h-10 font-bold text-xs ${activeSubTab === 'anesthesia' ? 'bg-[#1A5E63]/10 text-[#1A5E63] hover:bg-[#1A5E63]/10' : 'text-slate-600'}`}
          >
            <Activity className="w-4 h-4" />
            Anesthesia Record
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveSubTab('intraop')}
            className={`w-full justify-start gap-2 h-10 font-bold text-xs ${activeSubTab === 'intraop' ? 'bg-[#1A5E63]/10 text-[#1A5E63] hover:bg-[#1A5E63]/10' : 'text-slate-600'}`}
          >
            <FileText className="w-4 h-4" />
            Intra-Op Notes
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveSubTab('postop')}
            className={`w-full justify-start gap-2 h-10 font-bold text-xs ${activeSubTab === 'postop' ? 'bg-[#1A5E63]/10 text-[#1A5E63] hover:bg-[#1A5E63]/10' : 'text-slate-600'}`}
          >
            <HeartPulse className="w-4 h-4" />
            Post-Op Care / PACU
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveSubTab('consumables')}
            className={`w-full justify-start gap-2 h-10 font-bold text-xs ${activeSubTab === 'consumables' ? 'bg-[#1A5E63]/10 text-[#1A5E63] hover:bg-[#1A5E63]/10' : 'text-slate-600'}`}
          >
            <BriefcaseMedical className="w-4 h-4" />
            Consumables & Billing
          </Button>
        </div>
      </div>

      <Separator orientation="vertical" className="hidden lg:block h-auto" />

      {/* Dynamic Workflow Area */}
      <div className="flex-1">
        {activeSubTab === 'preop' && (
          <form onSubmit={handleSavePreOp} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Pre-operative Clinical Assessment</h3>
                <p className="text-xs text-slate-500 font-semibold">Perform airway and ASA physical condition assessments before administering preoperative sedative drugs.</p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 uppercase text-[9px] font-extrabold tracking-widest h-6 px-3">Completed</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fasting Status (NBM)</Label>
                <Select 
                  value={clinicalData.preOp.fastingStatus} 
                  onValueChange={(v) => saveToStorage({ ...clinicalData, preOp: { ...clinicalData.preOp, fastingStatus: v } })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes (8 Hours)" className="text-xs">Yes (8 Hours)</SelectItem>
                    <SelectItem value="Yes (6 Hours)" className="text-xs">Yes (6 Hours)</SelectItem>
                    <SelectItem value="No Fasting" className="text-xs text-rose-600 font-bold">No Fasting (Emergency Exception)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Airway Class</Label>
                  <Select 
                    value={clinicalData.preOp.airwayClass} 
                    onValueChange={(v) => saveToStorage({ ...clinicalData, preOp: { ...clinicalData.preOp, airwayClass: v } })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Class I" className="text-xs">Mallampati Class I</SelectItem>
                      <SelectItem value="Class II" className="text-xs">Mallampati Class II</SelectItem>
                      <SelectItem value="Class III" className="text-xs text-amber-600 font-bold">Mallampati Class III</SelectItem>
                      <SelectItem value="Class IV" className="text-xs text-rose-600 font-bold">Mallampati Class IV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>ASA Score</Label>
                  <Select 
                    value={clinicalData.preOp.asaClass} 
                    onValueChange={(v) => saveToStorage({ ...clinicalData, preOp: { ...clinicalData.preOp, asaClass: v } })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASA I" className="text-xs">ASA I - Normal Healthy</SelectItem>
                      <SelectItem value="ASA II" className="text-xs">ASA II - Mild Systemic Disease</SelectItem>
                      <SelectItem value="ASA III" className="text-xs text-amber-600">ASA III - Severe Disease</SelectItem>
                      <SelectItem value="ASA IV" className="text-xs text-rose-600 font-bold">ASA IV - Life Threatening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="col-span-2 p-4 bg-slate-50 border rounded-xl">
                <p className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wider">Active Baseline Pre-Op Vitals</p>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">BP (mmHg)</Label>
                    <Input 
                      className="h-9 text-xs" 
                      value={clinicalData.preOp.bp} 
                      onChange={(e) => saveToStorage({ ...clinicalData, preOp: { ...clinicalData.preOp, bp: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Pulse (bpm)</Label>
                    <Input 
                      type="number" 
                      className="h-9 text-xs" 
                      value={clinicalData.preOp.pulse} 
                      onChange={(e) => saveToStorage({ ...clinicalData, preOp: { ...clinicalData.preOp, pulse: parseInt(e.target.value) || 0 } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Temp (°F)</Label>
                    <Input 
                      className="h-9 text-xs" 
                      value={clinicalData.preOp.temp} 
                      onChange={(e) => saveToStorage({ ...clinicalData, preOp: { ...clinicalData.preOp, temp: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">SpO2 (%)</Label>
                    <Input 
                      type="number" 
                      className="h-9 text-xs" 
                      value={clinicalData.preOp.spo2} 
                      onChange={(e) => saveToStorage({ ...clinicalData, preOp: { ...clinicalData.preOp, spo2: parseInt(e.target.value) || 0 } })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Assessing Clinician</Label>
                <Input 
                  value={clinicalData.preOp.assessor} 
                  onChange={(e) => saveToStorage({ ...clinicalData, preOp: { ...clinicalData.preOp, assessor: e.target.value } })}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Clearance Status</Label>
                <Select 
                  value={clinicalData.preOp.cleared ? 'cleared' : 'hold'} 
                  onValueChange={(v) => saveToStorage({ ...clinicalData, preOp: { ...clinicalData.preOp, cleared: v === 'cleared' } })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleared" className="text-xs text-emerald-600 font-bold">✓ Cleared & Ready for Incision</SelectItem>
                    <SelectItem value="hold" className="text-xs text-rose-600 font-bold">⚠ On Hold (Review Pending)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Clinical Assessment & Fasting Notes</Label>
                <textarea 
                  value={clinicalData.preOp.notes} 
                  onChange={(e) => saveToStorage({ ...clinicalData, preOp: { ...clinicalData.preOp, notes: e.target.value } })}
                  rows={3} 
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5E63] disabled:cursor-not-allowed disabled:opacity-50" 
                />
              </div>
            </div>

            <Button type="submit" className="bg-[#1A5E63] text-xs font-bold h-9">
              Lock Pre-Op File
            </Button>
          </form>
        )}

        {activeSubTab === 'anesthesia' && (
          <form onSubmit={handleSaveAnesthesia} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Anesthesia Administration Log</h3>
                <p className="text-xs text-slate-500 font-semibold">Document anesthetic agents used, induction time, complications, and log real-time vitals checks.</p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 uppercase text-[9px] font-extrabold tracking-widest h-6 px-3">Active Record</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Anesthesia Modality</Label>
                <Select 
                  value={clinicalData.anesthesia.type} 
                  onValueChange={(v) => saveToStorage({ ...clinicalData, anesthesia: { ...clinicalData.anesthesia, type: v } })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General Anesthesia" className="text-xs">General Anesthesia (IV/Inhalation)</SelectItem>
                    <SelectItem value="Spinal Block" className="text-xs">Spinal / Epidural Regional Block</SelectItem>
                    <SelectItem value="Local Block" className="text-xs">Local Infiltration</SelectItem>
                    <SelectItem value="MAC" className="text-xs">Monitored Anesthesia Care (MAC/Sedation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Induction Time</Label>
                  <Input 
                    value={clinicalData.anesthesia.inductionTime} 
                    onChange={(e) => saveToStorage({ ...clinicalData, anesthesia: { ...clinicalData.anesthesia, inductionTime: e.target.value } })}
                    className="h-10 text-xs" 
                    placeholder="e.g. 10:15 AM"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Primary Anesthetist</Label>
                  <Input 
                    value={clinicalData.anesthesia.anesthetist} 
                    onChange={(e) => saveToStorage({ ...clinicalData, anesthesia: { ...clinicalData.anesthesia, anesthetist: e.target.value } })}
                    className="h-10 text-xs" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Maintenance Agents</Label>
                <Input 
                  value={clinicalData.anesthesia.maintainedWith} 
                  onChange={(e) => saveToStorage({ ...clinicalData, anesthesia: { ...clinicalData.anesthesia, maintainedWith: e.target.value } })}
                  className="h-10 text-xs" 
                  placeholder="e.g. Sevoflurane + Fentanyl"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Anesthetic Complications (If Any)</Label>
                <Input 
                  value={clinicalData.anesthesia.complications} 
                  onChange={(e) => saveToStorage({ ...clinicalData, anesthesia: { ...clinicalData.anesthesia, complications: e.target.value } })}
                  className="h-10 text-xs" 
                  placeholder="None"
                />
              </div>

              {/* Vitals Timeline Logging */}
              <div className="col-span-2 border rounded-xl overflow-hidden bg-slate-50/50">
                <div className="bg-slate-100 p-3 flex items-center justify-between border-b">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Intra-operative Vitals Timeline (15 Min Logs)</span>
                  <Badge variant="outline" className="bg-white text-[10px] font-bold text-indigo-700">Timeline Active</Badge>
                </div>
                <div className="p-4 space-y-3">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 font-bold border-b text-[10px] uppercase">
                        <th className="pb-2">Time</th>
                        <th className="pb-2">BP (mmHg)</th>
                        <th className="pb-2">Pulse (bpm)</th>
                        <th className="pb-2">SpO2 (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700 font-semibold">
                      {clinicalData.anesthesia.vitalsTimeline.map((timeline: any, index: number) => (
                        <tr key={index} className="h-8">
                          <td>{timeline.time}</td>
                          <td>{timeline.bp}</td>
                          <td>{timeline.pulse} bpm</td>
                          <td className={timeline.spo2 < 95 ? 'text-rose-600 font-extrabold' : ''}>{timeline.spo2}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Add Timeline Entry Form */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 items-end">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Time</Label>
                      <Input 
                        placeholder="11:15 AM" 
                        value={newVital.time} 
                        onChange={(e) => setNewVital({...newVital, time: e.target.value})}
                        className="h-8 text-xs bg-white" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">BP</Label>
                      <Input 
                        placeholder="120/80" 
                        value={newVital.bp} 
                        onChange={(e) => setNewVital({...newVital, bp: e.target.value})}
                        className="h-8 text-xs bg-white" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Pulse</Label>
                      <Input 
                        type="number"
                        value={newVital.pulse} 
                        onChange={(e) => setNewVital({...newVital, pulse: parseInt(e.target.value) || 75})}
                        className="h-8 text-xs bg-white" 
                      />
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleAddAnesthesiaVital} 
                      className="bg-medical-blue hover:bg-medical-blue/90 h-8 text-xs gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Log Vitals
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="bg-[#1A5E63] text-xs font-bold h-9">
              Lock Anesthesia File
            </Button>
          </form>
        )}

        {activeSubTab === 'intraop' && (
          <form onSubmit={handleSaveIntraOp} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Intra-operative Notes & Surgical Log</h3>
                <p className="text-xs text-slate-500 font-semibold">Document surgical findings, incision times, implants used, blood loss, and biopsy specimens collected.</p>
              </div>
              <Badge className="bg-amber-50 text-amber-800 border-amber-200 uppercase text-[9px] font-extrabold tracking-widest h-6 px-3">Surgical Team Input</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Incision Time</Label>
                  <Input 
                    value={clinicalData.intraOp.incisionTime} 
                    onChange={(e) => saveToStorage({ ...clinicalData, intraOp: { ...clinicalData.intraOp, incisionTime: e.target.value } })}
                    className="h-10 text-xs" 
                    placeholder="e.g. 10:25 AM"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Closure Time</Label>
                  <Input 
                    value={clinicalData.intraOp.closureTime} 
                    onChange={(e) => saveToStorage({ ...clinicalData, intraOp: { ...clinicalData.intraOp, closureTime: e.target.value } })}
                    className="h-10 text-xs" 
                    placeholder="e.g. 11:15 AM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Blood Loss (mL)</Label>
                  <Input 
                    type="number"
                    value={clinicalData.intraOp.bloodLoss} 
                    onChange={(e) => saveToStorage({ ...clinicalData, intraOp: { ...clinicalData.intraOp, bloodLoss: parseInt(e.target.value) || 0 } })}
                    className="h-10 text-xs" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Implants Inserted</Label>
                  <Select 
                    value={clinicalData.intraOp.implantsUsed ? 'yes' : 'no'} 
                    onValueChange={(v) => saveToStorage({ ...clinicalData, intraOp: { ...clinicalData.intraOp, implantsUsed: v === 'yes' } })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no" className="text-xs">No Implants</SelectItem>
                      <SelectItem value="yes" className="text-xs text-indigo-600 font-bold">Yes Implants</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {clinicalData.intraOp.implantsUsed && (
                <div className="col-span-2 space-y-1.5">
                  <Label>Implant Serial Number & Brand Details *</Label>
                  <Input 
                    value={clinicalData.intraOp.implantDetails} 
                    onChange={(e) => saveToStorage({ ...clinicalData, intraOp: { ...clinicalData.intraOp, implantDetails: e.target.value } })}
                    placeholder="e.g. Depuy Orthopaedic Locking Plate Serial #2026-X818"
                    className="h-10 text-xs font-semibold"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 col-span-2">
                <div className="space-y-1.5">
                  <Label>Biopsy Specimen Collected</Label>
                  <Select 
                    value={clinicalData.intraOp.specimenCollected ? 'yes' : 'no'} 
                    onValueChange={(v) => saveToStorage({ ...clinicalData, intraOp: { ...clinicalData.intraOp, specimenCollected: v === 'yes' } })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no" className="text-xs">No Specimen</SelectItem>
                      <SelectItem value="yes" className="text-xs text-indigo-600 font-bold">Yes (Pathology Lab Sample)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {clinicalData.intraOp.specimenCollected && (
                  <div className="space-y-1.5">
                    <Label>Specimen Label / Description *</Label>
                    <Input 
                      value={clinicalData.intraOp.specimenDetails} 
                      onChange={(e) => saveToStorage({ ...clinicalData, intraOp: { ...clinicalData.intraOp, specimenDetails: e.target.value } })}
                      placeholder="e.g. Excised Appendiceal Tissue"
                      className="h-10 text-xs font-semibold"
                    />
                  </div>
                )}
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Intra-operative Anatomical Findings</Label>
                <textarea 
                  value={clinicalData.intraOp.findings} 
                  onChange={(e) => saveToStorage({ ...clinicalData, intraOp: { ...clinicalData.intraOp, findings: e.target.value } })}
                  rows={2} 
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5E63] disabled:cursor-not-allowed disabled:opacity-50" 
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Surgeon's Complete Procedural Notes</Label>
                <textarea 
                  value={clinicalData.intraOp.surgeonNotes} 
                  onChange={(e) => saveToStorage({ ...clinicalData, intraOp: { ...clinicalData.intraOp, surgeonNotes: e.target.value } })}
                  rows={4} 
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-relaxed font-sans ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5E63] disabled:cursor-not-allowed disabled:opacity-50" 
                />
              </div>
            </div>

            <Button type="submit" className="bg-[#1A5E63] text-xs font-bold h-9">
              Lock Surgical Record
            </Button>
          </form>
        )}

        {activeSubTab === 'postop' && (
          <form onSubmit={handleSavePostOp} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Post-operative Care & PACU Recovery</h3>
                <p className="text-xs text-slate-500 font-semibold">Document Post-Anesthesia Care Unit logs, recovery scores, pain-management pathways, and discharge instructions.</p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 uppercase text-[9px] font-extrabold tracking-widest h-6 px-3">Recovery File</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>PACU Check-In Time</Label>
                  <Input 
                    value={clinicalData.postOp.pacuIn} 
                    onChange={(e) => saveToStorage({ ...clinicalData, postOp: { ...clinicalData.postOp, pacuIn: e.target.value } })}
                    className="h-10 text-xs" 
                    placeholder="e.g. 11:20 AM"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>PACU Check-Out Time</Label>
                  <Input 
                    value={clinicalData.postOp.pacuOut} 
                    onChange={(e) => saveToStorage({ ...clinicalData, postOp: { ...clinicalData.postOp, pacuOut: e.target.value } })}
                    className="h-10 text-xs" 
                    placeholder="e.g. 12:30 PM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Aldrete Score (0-10)</Label>
                  <Select 
                    value={String(clinicalData.postOp.aldreteScore)} 
                    onValueChange={(v) => saveToStorage({ ...clinicalData, postOp: { ...clinicalData.postOp, aldreteScore: parseInt(v) } })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10" className="text-xs">10 - Fully Stable</SelectItem>
                      <SelectItem value="9" className="text-xs">9 - Responding / Stable</SelectItem>
                      <SelectItem value="8" className="text-xs">8 - Safe to Transfer</SelectItem>
                      <SelectItem value="7" className="text-xs text-amber-600 font-bold">7 - Moderately Depressed</SelectItem>
                      <SelectItem value="6" className="text-xs text-rose-600 font-bold">&lt; 7 Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Discharging Nurse</Label>
                  <Input 
                    value={clinicalData.postOp.dischargingNurse} 
                    onChange={(e) => saveToStorage({ ...clinicalData, postOp: { ...clinicalData.postOp, dischargingNurse: e.target.value } })}
                    className="h-10 text-xs" 
                  />
                </div>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Discharge Destination</Label>
                <Select 
                  value={clinicalData.postOp.destination} 
                  onValueChange={(v) => saveToStorage({ ...clinicalData, postOp: { ...clinicalData.postOp, destination: v } })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IPD Ward (Bed B2)" className="text-xs">General IPD Ward (Inpatient)</SelectItem>
                    <SelectItem value="Semi-Private Bed B5" className="text-xs">Semi-Private Bed</SelectItem>
                    <SelectItem value="ICU Bed ICU-03" className="text-xs text-[#1A5E63] font-bold">Critical Care Unit (ICU)</SelectItem>
                    <SelectItem value="Home (Outpatient)" className="text-xs">Home (Day Surgery discharge)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Post-operative Recovery & Ward Instructions</Label>
                <textarea 
                  value={clinicalData.postOp.instructions} 
                  onChange={(e) => saveToStorage({ ...clinicalData, postOp: { ...clinicalData.postOp, instructions: e.target.value } })}
                  rows={4} 
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5E63] disabled:cursor-not-allowed disabled:opacity-50" 
                />
              </div>
            </div>

            <Button type="submit" className="bg-[#1A5E63] text-xs font-bold h-9">
              Lock Recovery Checklist
            </Button>
          </form>
        )}

        {activeSubTab === 'consumables' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Surgical Consumables & Billing</h3>
                <p className="text-xs text-slate-500 font-semibold">Track sutures, implants, disposables, and medicines used during the procedure. Post items directly to the patient invoice.</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handlePostToBilling} 
                  disabled={billingPosted || clinicalData.consumables.length === 0}
                  className={`text-xs gap-1 font-bold h-9 ${
                    billingPosted ? 'bg-slate-100 text-slate-400 border-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  {billingPosted ? 'Posted to Invoice ✓' : 'Post to Invoice (₹)'}
                </Button>
              </div>
            </div>

            {billingPosted && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-indigo-900 animate-in fade-in duration-300">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span>The surgical consumables listed below have been permanently locked and appended to the patient's master invoice for billing.</span>
              </div>
            )}

            {/* Consumable Adder */}
            {!billingPosted && (
              <div className="p-4 bg-slate-50 border rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Select Consumable (From OT Inventory)</Label>
                  <Select value={selectedInvId} onValueChange={setSelectedInvId}>
                    <SelectTrigger className="bg-white text-xs h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {otInventory.map(item => (
                        <SelectItem key={item.id} value={item.id} className="text-xs">
                          {item.name} (Stock: {item.stock} • MRP: ₹{item.mrp})
                        </SelectItem>
                      ))}
                      {otInventory.length === 0 && <SelectItem value="none">No inventory loaded</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <div className="space-y-1.5 flex-1">
                    <Label>Quantity Used</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={useQty} 
                      onChange={(e) => setUseQty(parseInt(e.target.value) || 1)}
                      className="bg-white text-xs h-10" 
                    />
                  </div>
                  <Button 
                    onClick={handleAddConsumable}
                    className="bg-medical-blue hover:bg-medical-blue/90 h-10 text-xs font-semibold px-4 self-end shrink-0"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}

            {/* Registered Usage Table */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b text-[10px] uppercase">
                    <th className="p-3">Consumable Item</th>
                    <th className="p-3">Unit Price (₹)</th>
                    <th className="p-3">Qty Used</th>
                    <th className="p-3 text-right">Total (₹)</th>
                    {!billingPosted && <th className="p-3 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 font-semibold">
                  {clinicalData.consumables.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/20">
                      <td className="p-3 text-slate-900">{item.name}</td>
                      <td className="p-3">₹{item.price}</td>
                      <td className="p-3">{item.qty}</td>
                      <td className="p-3 text-right text-slate-900">₹{item.price * item.qty}</td>
                      {!billingPosted && (
                        <td className="p-3">
                          <div className="flex justify-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                              onClick={() => handleRemoveConsumable(item.id, item.qty, item.inventoryId)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}

                  <tr className="bg-slate-50 font-bold border-t h-10">
                    <td colSpan={3} className="p-3 text-right text-slate-500 uppercase tracking-wider">Total Consumables Cost:</td>
                    <td className="p-3 text-right text-indigo-700 text-sm">₹{totalConsumablesCost}</td>
                    {!billingPosted && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
