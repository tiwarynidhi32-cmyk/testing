import { useState, useEffect, FormEvent } from 'react';
import { 
  Trash2, 
  Plus, 
  Activity, 
  Calendar, 
  Truck, 
  ShieldCheck, 
  FileText, 
  AlertOctagon, 
  Sparkles, 
  Clock, 
  CheckCircle,
  Eye,
  FileSpreadsheet,
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

const SAMPLE_WASTE_COLLECTIONS = [
  { id: 'WST001', category: 'Yellow (Anatomical/Soiled)', weight: 14.5, ward: 'ICU Block A', loggedBy: 'Nurse Roy Thomas', date: '2026-07-08', time: '08:30 AM', notes: 'Maternity soiled dressings and tissues' },
  { id: 'WST002', category: 'Red (Contaminated Tubing/Plastics)', weight: 8.2, ward: 'OT Room 2', loggedBy: 'Tech Anita Desai', date: '2026-07-08', time: '11:15 AM', notes: 'Surgical IV lines and plastic syringes (without needles)' },
  { id: 'WST003', category: 'White (Sharps/Needles)', weight: 3.1, ward: 'Emergency Unit', loggedBy: 'Nurse Mary Kutty', date: '2026-07-08', time: '02:00 PM', notes: 'Used scalpels and insulin syringes from sharp box' },
  { id: 'WST004', category: 'Blue (Glassware/Vials)', weight: 6.7, ward: 'IPD Pharmacy', loggedBy: 'Pharmacist Vivek Sen', date: '2026-07-08', time: '04:30 PM', notes: 'Broken antibiotic vials and glass bottles' },
  { id: 'WST005', category: 'Yellow (Anatomical/Soiled)', weight: 18.2, ward: 'Maternity Ward', loggedBy: 'Nurse Julie Andrews', date: '2026-07-09', time: '06:00 AM', notes: 'Placental tissue and blood-soiled cotton rolls' }
];

const SAMPLE_DISPOSALS = [
  { id: 'DSP001', date: '2026-07-07', agencyName: 'Metropolitan Clean-Bio Solutions', vehicleNo: 'MH-12-WA-8849', driverName: 'Satish Patil', totalWeight: 42.5, status: 'Handed Over', certificateRef: 'BM-CERT-77382', remarks: 'All bags barcoded and securely sealed.' },
  { id: 'DSP002', date: '2026-07-05', agencyName: 'Metropolitan Clean-Bio Solutions', vehicleNo: 'MH-12-WA-4112', driverName: 'Ramesh Sawant', totalWeight: 38.0, status: 'Incinerated', certificateRef: 'BM-CERT-77112', remarks: 'Autoclavable plastics separated.' }
];

export default function WasteManagement() {
  const [activeTab, setActiveTab] = useState<'collection' | 'segregation' | 'disposal'>('collection');
  const [collections, setCollections] = useState<any[]>([]);
  const [disposals, setDisposals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal forms
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState(false);

  // Form payloads
  const [collectForm, setCollectForm] = useState({
    category: 'Yellow (Anatomical/Soiled)', weight: 1.0, ward: 'ICU Block A', loggedBy: '', date: '', time: '', notes: ''
  });
  const [disposalForm, setDisposalForm] = useState({
    agencyName: 'Metropolitan Clean-Bio Solutions', vehicleNo: '', driverName: '', totalWeight: 5.0, status: 'Handed Over', certificateRef: '', remarks: '', date: ''
  });

  // Load from Supabase with robust cache / sample fallback
  useEffect(() => {
    const loadWasteData = async () => {
      setIsLoading(true);
      try {
        const dbCollections = await supabaseService.getBioWasteCollections();
        const dbDisposals = await supabaseService.getBioWasteTransfers();

        if (dbCollections && dbCollections.length > 0) {
          const mappedC = dbCollections.map((item: any) => ({
            id: item.custom_id || item.id,
            dbId: item.id,
            category: item.category,
            weight: Number(item.weight),
            ward: item.ward,
            loggedBy: item.logged_by || item.loggedBy,
            date: item.collection_date || item.date,
            time: item.collection_time || item.time,
            notes: item.notes
          }));
          setCollections(mappedC);
          storage.set('hms_waste_collections', mappedC);
        } else {
          const cachedC = storage.get('hms_waste_collections', SAMPLE_WASTE_COLLECTIONS);
          setCollections(cachedC);
        }

        if (dbDisposals && dbDisposals.length > 0) {
          const mappedD = dbDisposals.map((item: any) => ({
            id: item.custom_id || item.id,
            dbId: item.id,
            date: item.transfer_date || item.date,
            agencyName: item.agency_name || item.agencyName,
            vehicleNo: item.vehicle_no || item.vehicleNo,
            driverName: item.driver_name || item.driverName,
            totalWeight: Number(item.total_weight || item.totalWeight),
            status: item.status,
            certificateRef: item.certificate_ref || item.certificateRef,
            remarks: item.remarks
          }));
          setDisposals(mappedD);
          storage.set('hms_waste_disposals', mappedD);
        } else {
          const cachedD = storage.get('hms_waste_disposals', SAMPLE_DISPOSALS);
          setDisposals(cachedD);
        }
      } catch (err) {
        console.warn('Fallback loading waste management local data:', err);
        const cachedC = storage.get('hms_waste_collections', SAMPLE_WASTE_COLLECTIONS);
        const cachedD = storage.get('hms_waste_disposals', SAMPLE_DISPOSALS);
        setCollections(cachedC);
        setDisposals(cachedD);
      } finally {
        setIsLoading(false);
      }
    };
    loadWasteData();
  }, []);

  const saveCollections = (newC: any[]) => {
    setCollections(newC);
    storage.set('hms_waste_collections', newC);
  };

  const saveDisposals = (newD: any[]) => {
    setDisposals(newD);
    storage.set('hms_waste_disposals', newD);
  };

  const handleAddCollection = async (e: FormEvent) => {
    e.preventDefault();
    if (!collectForm.weight || !collectForm.loggedBy || !collectForm.date) {
      toast.error('Please specify weight, logger name, and date');
      return;
    }
    const newId = `WST${String(collections.length + 1).padStart(3, '0')}`;
    const now = new Date();
    const timeString = collectForm.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localPayload = { ...collectForm, id: newId, time: timeString };

    const dbPayload = {
      custom_id: newId,
      category: collectForm.category,
      weight: Number(collectForm.weight),
      ward: collectForm.ward,
      logged_by: collectForm.loggedBy,
      collection_date: collectForm.date,
      collection_time: timeString,
      notes: collectForm.notes
    };

    setIsSubmitting(true);
    try {
      const created = await supabaseService.createBioWasteCollection(dbPayload);
      if (created) {
        const updatedObj = {
          id: created.custom_id || created.id,
          dbId: created.id,
          category: created.category,
          weight: Number(created.weight),
          ward: created.ward,
          loggedBy: created.logged_by || created.loggedBy,
          date: created.collection_date || created.date,
          time: created.collection_time || created.time,
          notes: created.notes
        };
        const updated = [updatedObj, ...collections];
        saveCollections(updated);
        toast.success('Bio-waste collection logged and saved to Supabase!');
      } else {
        const updated = [localPayload, ...collections];
        saveCollections(updated);
        toast.success('Waste collection log added (Offline Mode)');
      }
    } catch (err) {
      console.error('Error creating collection record:', err);
      const updated = [localPayload, ...collections];
      saveCollections(updated);
      toast.success('Waste collection log added (Local Sync Mode)');
    } finally {
      setIsSubmitting(false);
      setIsCollectModalOpen(false);
      setCollectForm({ category: 'Yellow (Anatomical/Soiled)', weight: 1.0, ward: 'ICU Block A', loggedBy: '', date: '', time: '', notes: '' });
    }
  };

  const handleAddDisposal = async (e: FormEvent) => {
    e.preventDefault();
    if (!disposalForm.vehicleNo || !disposalForm.driverName || !disposalForm.certificateRef) {
      toast.error('Please specify vehicle number, driver, and disposal certificate ref');
      return;
    }
    const newId = `DSP${String(disposals.length + 1).padStart(3, '0')}`;
    const localPayload = { ...disposalForm, id: newId };

    const dbPayload = {
      custom_id: newId,
      agency_name: disposalForm.agencyName,
      vehicle_no: disposalForm.vehicleNo,
      driver_name: disposalForm.driverName,
      total_weight: Number(disposalForm.totalWeight),
      transfer_date: disposalForm.date || new Date().toISOString().split('T')[0],
      certificate_ref: disposalForm.certificateRef,
      remarks: disposalForm.remarks,
      status: disposalForm.status || 'Handed Over'
    };

    setIsSubmitting(true);
    try {
      const created = await supabaseService.createBioWasteTransfer(dbPayload);
      if (created) {
        const updatedObj = {
          id: created.custom_id || created.id,
          dbId: created.id,
          date: created.transfer_date || created.date,
          agencyName: created.agency_name || created.agencyName,
          vehicleNo: created.vehicle_no || created.vehicleNo,
          driverName: created.driver_name || created.driverName,
          totalWeight: Number(created.total_weight || created.totalWeight),
          status: created.status,
          certificateRef: created.certificate_ref || created.certificateRef,
          remarks: created.remarks
        };
        const updated = [updatedObj, ...disposals];
        saveDisposals(updated);
        toast.success('Waste transfer to agency logged and saved to Supabase!');
      } else {
        const updated = [localPayload, ...disposals];
        saveDisposals(updated);
        toast.success('Disposal handover logged (Offline Mode)');
      }
    } catch (err) {
      console.error('Error creating transfer record:', err);
      const updated = [localPayload, ...disposals];
      saveDisposals(updated);
      toast.success('Disposal handover logged (Local Sync Mode)');
    } finally {
      setIsSubmitting(false);
      setIsDisposalModalOpen(false);
      setDisposalForm({ agencyName: 'Metropolitan Clean-Bio Solutions', vehicleNo: '', driverName: '', totalWeight: 5.0, status: 'Handed Over', certificateRef: '', remarks: '', date: '' });
    }
  };

  // Colored bucket helpers
  const getCategoryColor = (cat: string) => {
    if (cat.includes('Yellow')) return { bg: 'bg-yellow-50 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' };
    if (cat.includes('Red')) return { bg: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500' };
    if (cat.includes('White')) return { bg: 'bg-slate-100 text-slate-800 border-slate-300', dot: 'bg-slate-400' };
    if (cat.includes('Blue')) return { bg: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-600' };
    return { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' };
  };

  // Calculated totals
  const totalWeightCurrentMonth = collections.reduce((acc, curr) => acc + Number(curr.weight), 0);
  const totalDisposedWeight = disposals.reduce((acc, curr) => acc + Number(curr.totalWeight), 0);

  return (
    <div id="biomedical-waste-management" className="p-4 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-[#1A5E63] rounded-3xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-white/15 rounded-2xl">
              <Trash2 className="w-7 h-7 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif" style={{ fontFamily: "Georgia, serif" }}>Biomedical Waste Management (BMWM)</h1>
              <p className="text-xs text-teal-100 font-medium">WHO Compliant Color-Coded Segregation, Daily Collection Logs, and Central Disposal Transfer Registers.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setIsCollectModalOpen(true)} className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold gap-2 rounded-full px-5 py-5 h-auto text-xs shadow-sm">
            <Plus className="w-4 h-4 stroke-[3]" /> Log Daily Collection
          </Button>
          <Button onClick={() => setIsDisposalModalOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold gap-2 rounded-full px-5 py-5 h-auto text-xs shadow-sm">
            <Truck className="w-4 h-4" /> Transfer to Disposal Agency
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Collected This Period</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalWeightCurrentMonth.toFixed(1)} <span className="text-sm font-bold text-slate-400">KG</span></p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <Trash2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Handed Over / Disposed</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalDisposedWeight.toFixed(1)} <span className="text-sm font-bold text-slate-400">KG</span></p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Remaining in Storage</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{(totalWeightCurrentMonth - totalDisposedWeight).toFixed(1)} <span className="text-sm font-bold text-slate-400">KG</span></p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Compliant Auditing Rate</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">100%</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
        <button 
          onClick={() => setActiveTab('collection')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'collection' 
              ? 'border-[#1A5E63] text-[#1A5E63]' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daily Collection Logs
        </button>
        <button 
          onClick={() => setActiveTab('segregation')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'segregation' 
              ? 'border-[#1A5E63] text-[#1A5E63]' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          WHO Segregation Standards
        </button>
        <button 
          onClick={() => setActiveTab('disposal')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'disposal' 
              ? 'border-[#1A5E63] text-[#1A5E63]' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Disposal Handovers & Certificates
        </button>
      </div>

      {/* Main Tab View */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 lg:p-6 min-h-[350px]">
        {/* Collection Logs */}
        {activeTab === 'collection' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
              <span className="text-xs font-semibold text-slate-600">Daily weight registers logged by ward personnel.</span>
              <span className="text-xs text-[#1A5E63] font-bold">Total Collection Count: {collections.length}</span>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Category (Color Code)</th>
                    <th className="p-3">Weight (KG)</th>
                    <th className="p-3">Ward / Area</th>
                    <th className="p-3">Logged By</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Description / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {collections.map((item) => {
                    const cStyle = getCategoryColor(item.category);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-500">{item.id}</td>
                        <td className="p-3">
                          <Badge className={`${cStyle.bg} border text-[10px] font-bold gap-1.5`}>
                            <span className={`w-2 h-2 rounded-full ${cStyle.dot}`} />
                            {item.category}
                          </Badge>
                        </td>
                        <td className="p-3 font-black text-slate-800">{item.weight} kg</td>
                        <td className="p-3 font-semibold text-slate-600">{item.ward}</td>
                        <td className="p-3 text-slate-600 font-medium">{item.loggedBy}</td>
                        <td className="p-3 text-slate-500">
                          <p className="font-semibold">{item.date}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.time}</p>
                        </td>
                        <td className="p-3 text-slate-500 max-w-sm">{item.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Segregation Guide */}
        {activeTab === 'segregation' && (
          <div className="space-y-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-yellow-800 uppercase tracking-wider">Crucial Bio-Waste Compliance Mandate</h4>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Mixing biomedical waste with municipal general trash is a severe offense punishable under environmental safety rules. Ensure exact segregation at source in these color-coded receptacles.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-yellow-200 bg-yellow-50/20 relative flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 block" />
                    <h4 className="font-extrabold text-yellow-900 text-sm">Yellow Bag</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    Anatomical waste, placentas, biopsy samples, amputated parts, blood bags, soiled dressings, plaster casts, and chemical liquid wastes.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-yellow-100 flex justify-between items-center text-[10px] font-bold text-yellow-800">
                  <span>DISPOSAL: Incineration</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/10 relative flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500 block" />
                    <h4 className="font-extrabold text-rose-900 text-sm">Red Bag</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    Contaminated plastic recyclables, IV catheters, urine bags, tubing sets, syringes (without needles), dialysis kits, and vacuum tubes.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-rose-100 flex justify-between items-center text-[10px] font-bold text-rose-800">
                  <span>DISPOSAL: Autoclave + Shred</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-300 bg-slate-50 relative flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-400 block" />
                    <h4 className="font-extrabold text-slate-800 text-sm">White Box (Puncture Proof)</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    Sharps, metal scalpels, reusable needles, infusion sets blades, stylets, and broken surgical instruments.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-700">
                  <span>DISPOSAL: Autoclave + Melt</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/20 relative flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-600 block" />
                    <h4 className="font-extrabold text-blue-900 text-sm">Blue Box</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    Glassware, medicine ampoules, vials, glassware plates, slides, and metallic surgical implants or prosthesis.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-blue-100 flex justify-between items-center text-[10px] font-bold text-blue-800">
                  <span>DISPOSAL: Chemical Sanitization</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Disposal Registers */}
        {activeTab === 'disposal' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Agency Name</th>
                    <th className="p-3">Vehicle No</th>
                    <th className="p-3">Driver Name</th>
                    <th className="p-3">Disposed Weight</th>
                    <th className="p-3">Cert Ref</th>
                    <th className="p-3">Disposal Status</th>
                    <th className="p-3">Disposal Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {disposals.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-[#1A5E63]">{item.id}</td>
                      <td className="p-3 font-bold text-slate-800">{item.agencyName}</td>
                      <td className="p-3 font-mono text-slate-600 font-bold">{item.vehicleNo}</td>
                      <td className="p-3 text-slate-600">{item.driverName}</td>
                      <td className="p-3 font-extrabold text-[#1A5E63]">{item.totalWeight} kg</td>
                      <td className="p-3 font-mono text-slate-400 font-bold">{item.certificateRef}</td>
                      <td className="p-3">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{item.status}</Badge>
                      </td>
                      <td className="p-3 text-slate-500 font-semibold">{item.date || '2026-07-09'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Log Collection Modal */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Log Daily Bio-Waste Collection</h3>
              <button onClick={() => setIsCollectModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAddCollection} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Waste Category / Receptacle Color *</Label>
                <Select 
                  value={collectForm.category} 
                  onValueChange={(val) => setCollectForm({ ...collectForm, category: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yellow (Anatomical/Soiled)">Yellow (Anatomical, Tissues, Soiled Gauze)</SelectItem>
                    <SelectItem value="Red (Contaminated Tubing/Plastics)">Red (Surgical plastics, Intubations, Syringes)</SelectItem>
                    <SelectItem value="White (Sharps/Needles)">White (Reusable metals, Scalpels, Needles)</SelectItem>
                    <SelectItem value="Blue (Glassware/Vials)">Blue (Vials, Glass ampoules, Metallic plates)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Weight of bag * (KG)</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={collectForm.weight} 
                    onChange={(e) => setCollectForm({ ...collectForm, weight: Number(e.target.value) })}
                    placeholder="e.g. 10.5" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Source Ward / Location</Label>
                  <Select 
                    value={collectForm.ward} 
                    onValueChange={(val) => setCollectForm({ ...collectForm, ward: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ICU Block A">ICU Block A</SelectItem>
                      <SelectItem value="OT Room 1">OT Room 1</SelectItem>
                      <SelectItem value="OT Room 2">OT Room 2</SelectItem>
                      <SelectItem value="Maternity Ward">Maternity Ward</SelectItem>
                      <SelectItem value="Emergency Unit">Emergency Unit</SelectItem>
                      <SelectItem value="IPD Pharmacy">IPD Pharmacy</SelectItem>
                      <SelectItem value="Lab & Radiology">Lab & Radiology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Collection Staff Name *</Label>
                  <Input 
                    value={collectForm.loggedBy} 
                    onChange={(e) => setCollectForm({ ...collectForm, loggedBy: e.target.value })}
                    placeholder="e.g. Roy Thomas" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Collection Date *</Label>
                  <Input 
                    type="date" 
                    value={collectForm.date} 
                    onChange={(e) => setCollectForm({ ...collectForm, date: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Incident Notes / Description</Label>
                <textarea 
                  value={collectForm.notes} 
                  onChange={(e) => setCollectForm({ ...collectForm, notes: e.target.value })}
                  rows={2} 
                  placeholder="Detail bags double checked, barcodes applied correctly..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5E63]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsCollectModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] hover:bg-[#1A5E63]/90 text-white font-bold" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : 'Log Collection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disposal Modal */}
      {isDisposalModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Transfer Waste to Authorized Agency</h3>
              <button onClick={() => setIsDisposalModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAddDisposal} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Authorized Agency *</Label>
                <Select 
                  value={disposalForm.agencyName} 
                  onValueChange={(val) => setDisposalForm({ ...disposalForm, agencyName: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Metropolitan Clean-Bio Solutions">Metropolitan Clean-Bio Solutions Ltd.</SelectItem>
                    <SelectItem value="Safe-Dispose Hospital Services">Safe-Dispose Hospital Services Inc.</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Vehicle Reg Number *</Label>
                  <Input 
                    value={disposalForm.vehicleNo} 
                    onChange={(e) => setDisposalForm({ ...disposalForm, vehicleNo: e.target.value })}
                    placeholder="e.g. MH-12-WA-4000" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Driver Name *</Label>
                  <Input 
                    value={disposalForm.driverName} 
                    onChange={(e) => setDisposalForm({ ...disposalForm, driverName: e.target.value })}
                    placeholder="e.g. Satish Patil" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Total Weight Manifested * (KG)</Label>
                  <Input 
                    type="number" 
                    value={disposalForm.totalWeight} 
                    onChange={(e) => setDisposalForm({ ...disposalForm, totalWeight: Number(e.target.value) })} 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Transfer Date *</Label>
                  <Input 
                    type="date" 
                    value={disposalForm.date} 
                    onChange={(e) => setDisposalForm({ ...disposalForm, date: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Disposal Manifest / Certificate Reference *</Label>
                <Input 
                  value={disposalForm.certificateRef} 
                  onChange={(e) => setDisposalForm({ ...disposalForm, certificateRef: e.target.value })}
                  placeholder="e.g. BM-CERT-12345" 
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <Label>Handover Remarks / Audit notes</Label>
                <textarea 
                  value={disposalForm.remarks} 
                  onChange={(e) => setDisposalForm({ ...disposalForm, remarks: e.target.value })}
                  rows={2} 
                  placeholder="Barcode validation passed. Driver bio checked."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5E63]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDisposalModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] hover:bg-[#1A5E63]/90 text-white font-bold" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Transmitting...
                    </>
                  ) : 'Authenticate & Transmit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
