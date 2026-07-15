import { useState, useEffect } from 'react';
import { 
  Baby, 
  Heart, 
  Activity, 
  Calendar, 
  Plus, 
  MoreVertical,
  ClipboardList,
  Download,
  Edit,
  Trash2,
  Loader2,
  Users,
  ArrowUpRight,
  UserCheck,
  UserMinus,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { canUserModifyRecord } from '@/utils/rbac';

export default function Maternity() {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isDeleteForbidden = false;
  const [patients, setPatients] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [newborns, setNewborns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDelivery, setNewDelivery] = useState({ 
    motherId: '', 
    date: '', 
    time: '', 
    gender: 'male', 
    weight: 3.0, 
    type: 'normal',
    surgeon_id: ''
  });
  const [staff, setStaff] = useState<any[]>([]);
  const [editingDelivery, setEditingDelivery] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [isAddDeliveryOpen, setIsAddDeliveryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerNewMother, setRegisterNewMother] = useState(false);
  const [motherForm, setMotherForm] = useState({ 
    name: '', 
    age: '28', 
    phone: '', 
    bloodGroup: 'O+', 
    husbandName: '', 
    address: '' 
  });

  const [mergePatientData, setMergePatientData] = useState<{ existing: any, newDetails: any } | null>(null);

  const confirmMaternityMergeAndContinue = async () => {
    if (!mergePatientData) return;
    const { existing, newDetails } = mergePatientData;
    setMergePatientData(null);
    setIsSubmitting(true);
    try {
      const mergedData = {
        name: existing.name,
        phone: existing.phone,
        age: parseInt(newDetails.age) || existing.age,
        gender: 'Female',
        blood_group: newDetails.bloodGroup || existing.blood_group,
        husband_name: newDetails.husbandName || existing.husband_name,
        address: newDetails.address || existing.address
      };

      const result = await supabaseService.updatePatient(existing.id, mergedData);
      if (result) {
        setPatients(patients.map(p => p.id === existing.id ? { ...p, ...result } : p));
        toast.success(`Mother record found and merged successfully! MRN: ${existing.mrn}`);
        
        // Continue with active delivery booking flow using the merged ID
        const deliveryRecord = {
          patient_id: existing.id,
          delivery_date: newDelivery.date,
          delivery_time: newDelivery.time,
          delivery_type: newDelivery.type,
          surgeon_id: newDelivery.surgeon_id || null,
          notes: `Baby weight: ${newDelivery.weight}kg, Gender: ${newDelivery.gender}`
        };

        const resultDel = await supabaseService.createDelivery(deliveryRecord);
        if (resultDel) {
          toast.success('Delivery record added successfully!');
          setIsAddDeliveryOpen(false);
          setRegisterNewMother(false);
          setNewDelivery({
            motherId: '',
            date: '',
            time: '12:00',
            type: 'Normal',
            weight: '3.0',
            gender: 'Male',
            surgeon_id: ''
          });
          setMotherForm({ name: '', age: '28', phone: '', bloodGroup: 'O+', husbandName: '', address: '' });
          fetchData();
        } else {
          toast.error('Failed to create delivery record');
        }
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

  const mothersList = patients.filter((p: any) => 
    p.registration_type === 'Maternity' || (p.gender?.toLowerCase() === 'female' && p.age >= 15 && p.age <= 50)
  );

  const fetchData = async () => {
    const isInitial = deliveries.length === 0 && newborns.length === 0;
    if (isInitial) {
      setLoading(true);
    }
    const [patientsData, deliveriesData, newbornsData, staffData] = await Promise.all([
      supabaseService.getPatients(),
      supabaseService.getDeliveries(),
      supabaseService.getNewborns(),
      supabaseService.getStaff()
    ]);
    if (patientsData) setPatients(patientsData);
    if (deliveriesData) setDeliveries(deliveriesData);
    if (newbornsData) setNewborns(newbornsData);
    if (staffData) setStaff(staffData.filter((s: any) => {
      const r = s.role?.toUpperCase() || '';
      return r === 'DOCTOR' || r === 'SURGEON' || r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'HOSPITAL_ADMIN';
    }));
    setLoading(false);
  };

  useDataSync(fetchData);

  const handleAddDelivery = async () => {
    if (!registerNewMother && (!newDelivery.motherId || !newDelivery.date)) {
      toast.error('Please fill in required fields');
      return;
    }
    if (registerNewMother && (!motherForm.name || !newDelivery.date)) {
      toast.error('Please fill in required fields (Mother Name and Date of Delivery)');
      return;
    }

    if (isSubmitting) return;

    if (registerNewMother) {
      const trimmedNewName = (motherForm.name || '').trim().toLowerCase();
      const trimmedNewPhone = (motherForm.phone || '').trim().replace(/\D/g, '');

      // Look for EXACT name and phone match for merge
      const exactMatch = patients.find((p: any) => {
        const pName = (p.name || '').trim().toLowerCase();
        const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');
        return pName === trimmedNewName && pPhone === trimmedNewPhone && trimmedNewPhone !== '';
      });

      if (exactMatch) {
        setMergePatientData({
          existing: exactMatch,
          newDetails: { ...motherForm }
        });
        return;
      }

      const isDuplicate = patients.some((p: any) => {
        const pName = (p.name || '').trim().toLowerCase();
        const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');

        const nameMatches = pName === trimmedNewName;
        const phoneMatches = trimmedNewPhone && pPhone && (trimmedNewPhone === pPhone);

        if (nameMatches && phoneMatches) return true;
        if (trimmedNewPhone && trimmedNewPhone.length >= 10 && pPhone === trimmedNewPhone) return true;
        if (nameMatches && !trimmedNewPhone && !pPhone) return true;
        return false;
      });

      if (isDuplicate) {
        toast.warning('A patient with this Name and/or Phone Number is already registered!');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let selectedMotherId = newDelivery.motherId;

      if (registerNewMother) {
        // Register New Mother as patient
        const newMotherRecord = {
          name: motherForm.name,
          gender: 'Female',
          age: parseInt(motherForm.age) || 28,
          phone: motherForm.phone || '',
          blood_group: motherForm.bloodGroup,
          husband_name: motherForm.husbandName,
          address: motherForm.address,
          mrn: 'MRN-' + Math.floor(100000 + Math.random() * 900000),
          registration_type: 'Maternity',
          status: 'Active'
        };

        const createdMother = await supabaseService.createPatient(newMotherRecord);
        if (createdMother && createdMother.id) {
          selectedMotherId = createdMother.id;
        } else {
          toast.error('Failed to register new mother');
          setIsSubmitting(false);
          return;
        }
      }

      const deliveryRecord = {
        patient_id: selectedMotherId,
        delivery_date: newDelivery.date,
        delivery_time: newDelivery.time,
        delivery_type: newDelivery.type,
        surgeon_id: newDelivery.surgeon_id || null,
        notes: `Baby weight: ${newDelivery.weight}kg, Gender: ${newDelivery.gender}`
      };

      const result = await supabaseService.createDelivery(deliveryRecord);
      if (result) {
        // Also update mother's status
        await supabaseService.updatePatient(selectedMotherId, { status: 'Post-Delivery' });

        // Calculate Maternity Package Fees for Automatic Invoice Creation
        const isCSection = newDelivery.type === 'cesarean';
        const packageName = isCSection ? 'Maternity C-Section (LSCS) Delivery Package' : 'Maternity Normal Delivery Package';
        const packagePrice = isCSection ? 35000 : 15000;
        
        const invoiceItems = [
          {
            item_name: packageName,
            unit_price: packagePrice,
            quantity: 1,
            total_price: packagePrice,
            category: 'IPD'
          }
        ];

        let surgeonFeeSum = 0;
        if (newDelivery.surgeon_id) {
          const surgeonObj = staff.find((s: any) => s.id === newDelivery.surgeon_id);
          const surgeonName = surgeonObj ? surgeonObj.name : 'Attending Obstetrician';
          const surgeonFee = 5000;
          invoiceItems.push({
            item_name: `Surgeon Attendance Fee - ${surgeonName}`,
            unit_price: surgeonFee,
            quantity: 1,
            total_price: surgeonFee,
            category: 'IPD'
          });
          surgeonFeeSum = surgeonFee;
        }

        const totalBillAmount = packagePrice + surgeonFeeSum;
        const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);

        const invoiceData = {
          patient_id: selectedMotherId,
          invoice_number: `INV-MAT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'Unpaid',
          total_amount: totalBillAmount,
          paid_amount: 0,
          payment_method: 'Cash',
          type: 'IPD',
          created_by: currentUser?.id || null
        };

        try {
          await supabaseService.createInvoice(invoiceData, invoiceItems);
          toast.success(`Maternity delivery bill of ₹${totalBillAmount} generated under maternal MRN!`);
        } catch (billingErr: any) {
          console.error('Maternity Billing Generation failed:', billingErr);
        }

        toast.success('Delivery record saved successfully');
        setNewDelivery({ motherId: '', date: '', time: '', gender: 'male', weight: 3.0, type: 'normal', surgeon_id: '' });
        setMotherForm({ name: '', age: '28', phone: '', bloodGroup: 'O+', husbandName: '', address: '' });
        setRegisterNewMother(false);
        setIsAddDeliveryOpen(false);
        fetchData();
      } else {
        toast.error('Failed to save delivery record');
      }
    } catch (error) {
      console.error('Error in handleAddDelivery:', error);
      toast.error('An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    if (isDeleteForbidden) {
      toast.error('Deletion of delivery records is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    const delivery = deliveries.find(d => d.id === id);
    if (delivery && !canUserModifyRecord(delivery, currentUser, staff)) {
      toast.error("Access Denied: This delivery record was created by an Admin and cannot be deleted by non-admin users.");
      return;
    }
    if (confirm('Are you sure you want to delete this delivery record?')) {
      const result = await supabaseService.deleteDelivery(id);
      if (result) {
        toast.success('Delivery record deleted successfully');
        fetchData();
      } else {
        toast.error('Failed to delete delivery record');
      }
    }
  };

  const handleStartEdit = (d: any) => {
    if (!canUserModifyRecord(d, currentUser, staff)) {
      toast.error("Access Denied: This delivery record was created by an Admin and cannot be modified by non-admin users.");
      return;
    }
    setEditingDelivery({
      id: d.id,
      motherId: d.patient_id,
      date: d.delivery_date || '',
      time: d.delivery_time || '',
      type: d.delivery_type || 'normal',
      surgeon_id: d.surgeon_id || '',
      notes: d.notes || ''
    });
    setIsEditOpen(true);
  };

  const handleUpdateDelivery = async () => {
    if (!editingDelivery) return;
    const result = await supabaseService.updateDelivery(editingDelivery.id, {
      delivery_date: editingDelivery.date,
      delivery_time: editingDelivery.time,
      delivery_type: editingDelivery.type,
      surgeon_id: editingDelivery.surgeon_id || null,
      notes: editingDelivery.notes
    });
    if (result) {
      toast.success('Delivery record updated successfully');
      setIsEditOpen(false);
      setEditingDelivery(null);
      fetchData();
    } else {
      toast.error('Failed to update delivery');
    }
  };

  const handleExportMaternity = () => {
    const headers = ['Mother Name', 'MRN', 'Status'];
    const rows = mothersList.map((m: any) => [m.name, m.mrn, m.status || 'Prenatal']);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'maternity_records.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Maternity records exported');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 font-medium">Loading Maternity Records...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-sm text-slate-900" style={{ background: 'linear-gradient(135deg, #D6C5F0, #F3EDFC, #D6C5F0)', borderColor: '#c3b1e3' }}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#3D275A]">Maternity Module</h1>
          <p className="text-[#5D487C] font-semibold text-sm">Specialized care for mothers and newborns.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-white/80 border-[#3D275A]/25 text-[#3D275A] hover:bg-white font-bold" onClick={handleExportMaternity}>
            <Download className="w-4 h-4 text-[#3D275A]" />
            Export Records
          </Button>
          <Dialog open={isAddDeliveryOpen} onOpenChange={setIsAddDeliveryOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1A5E63] hover:bg-[#154c50] text-white gap-2 font-bold" onClick={() => {
                setRegisterNewMother(false);
                setIsAddDeliveryOpen(true);
              }}>
                <Plus className="w-4 h-4" />
                New Delivery Record
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Delivery Record</DialogTitle>
                <DialogDescription>Record a new birth or delivery details.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">Mother Demographics</Label>
                    <Button 
                      type="button"
                      variant="link" 
                      className="h-auto p-0 text-xs text-pink-600 hover:text-pink-700 font-bold"
                      onClick={() => setRegisterNewMother(!registerNewMother)}
                    >
                      {registerNewMother ? "← Select Existing Mother" : "+ Register New Mother Directly"}
                    </Button>
                  </div>

                  {!registerNewMother ? (
                    <Select 
                      value={newDelivery.motherId}
                      onValueChange={(v) => setNewDelivery({...newDelivery, motherId: v})}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select mother" />
                      </SelectTrigger>
                      <SelectContent>
                        {mothersList.map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>{m.name} ({m.mrn})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100/50 space-y-3 transition-all">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Full Name *</Label>
                        <Input 
                          placeholder="Mother's Full Name" 
                          value={motherForm.name} 
                          onChange={(e) => setMotherForm({...motherForm, name: e.target.value})}
                          className="h-9 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Age</Label>
                          <Input 
                            type="number" 
                            placeholder="28" 
                            value={motherForm.age} 
                            onChange={(e) => setMotherForm({...motherForm, age: e.target.value})}
                            className="h-9 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Blood Group</Label>
                          <Select 
                            value={motherForm.bloodGroup} 
                            onValueChange={(v) => setMotherForm({...motherForm, bloodGroup: v})}
                          >
                            <SelectTrigger className="h-9 bg-white">
                              <SelectValue placeholder="Blood group" />
                            </SelectTrigger>
                            <SelectContent>
                              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Phone</Label>
                          <Input 
                            placeholder="Phone number" 
                            value={motherForm.phone} 
                            onChange={(e) => setMotherForm({...motherForm, phone: e.target.value})}
                            className="h-9 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Husband Name</Label>
                          <Input 
                            placeholder="Husband's name" 
                            value={motherForm.husbandName} 
                            onChange={(e) => setMotherForm({...motherForm, husbandName: e.target.value})}
                            className="h-9 bg-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Address</Label>
                        <Input 
                          placeholder="Current Address" 
                          value={motherForm.address} 
                          onChange={(e) => setMotherForm({...motherForm, address: e.target.value})}
                          className="h-9 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Delivery</Label>
                    <Input 
                      type="date" 
                      value={newDelivery.date}
                      onChange={(e) => setNewDelivery({...newDelivery, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input 
                      type="time" 
                      value={newDelivery.time}
                      onChange={(e) => setNewDelivery({...newDelivery, time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Baby Gender</Label>
                    <Select 
                      value={newDelivery.gender}
                      onValueChange={(v) => setNewDelivery({...newDelivery, gender: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input 
                      type="number" 
                      step="0.1" 
                      placeholder="3.0" 
                      value={newDelivery.weight}
                      onChange={(e) => setNewDelivery({...newDelivery, weight: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delivery Type</Label>
                    <Select 
                      value={newDelivery.type}
                      onValueChange={(v) => setNewDelivery({...newDelivery, type: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal Delivery</SelectItem>
                        <SelectItem value="cesarean">C-Section (LSCS)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Surgeon / Doctor</Label>
                    <Select 
                      value={newDelivery.surgeon_id}
                      onValueChange={(v) => setNewDelivery({...newDelivery, surgeon_id: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDeliveryOpen(false)}>Cancel</Button>
                <Button className="bg-pink-500 hover:bg-pink-600 text-white" onClick={handleAddDelivery}>Save Record</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-pink-50/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-pink-600 font-bold uppercase tracking-wider mb-1">Active Mother Cases</p>
              <h3 className="text-3xl font-bold text-pink-700">{mothersList.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-pink-100 text-pink-600">
              <Heart className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-blue-50/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Newborns (Total)</p>
              <h3 className="text-3xl font-bold text-blue-700">{newborns.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
              <Baby className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-purple-50/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">Total Deliveries</p>
              <h3 className="text-3xl font-bold text-purple-700">{deliveries.length}</h3>
            </div>
            <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-pink-500" />
              Recent Delivery Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="whitespace-nowrap">Mother</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Type</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.length > 0 ? deliveries.map((d) => (
                    <TableRow key={d.id} className="border-slate-50">
                      <TableCell className="font-medium whitespace-nowrap">{d.patients?.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{d.delivery_date}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="secondary" className="border-none bg-pink-50 text-pink-600">
                          {d.delivery_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue hover:bg-blue-50" onClick={() => handleStartEdit(d)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!isDeleteForbidden && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteDelivery(d.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No delivery records found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Recent Newborns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {newborns.length > 0 ? newborns.slice(0, 5).map((baby, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Baby className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Baby of {baby.patients?.name}</p>
                      <p className="text-xs text-muted-foreground">Weight: {baby.birth_weight}kg • {new Date(baby.birth_date_time).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                      {baby.gender}
                    </Badge>
                    {!isDeleteForbidden && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" 
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this newborn record?')) {
                            await supabaseService.deleteNewborn(baby.id);
                            toast.success('Newborn record deleted');
                            fetchData();
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-center py-6 text-muted-foreground text-sm">No newborn records found</p>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-xs text-medical-blue">View All Baby Records</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-500" />
            Mothers & Maternal Patients Registry
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="whitespace-nowrap">MRN</TableHead>
                  <TableHead className="whitespace-nowrap">Mother Name</TableHead>
                  <TableHead className="whitespace-nowrap">Age</TableHead>
                  <TableHead className="whitespace-nowrap">Phone</TableHead>
                  <TableHead className="whitespace-nowrap">Husband</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mothersList.length > 0 ? mothersList.map((mother) => (
                  <TableRow key={mother.id} className="border-slate-50">
                    <TableCell className="font-bold text-medical-blue whitespace-nowrap">{mother.mrn}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{mother.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{mother.age} Yrs</TableCell>
                    <TableCell className="whitespace-nowrap">{mother.phone || 'N/A'}</TableCell>
                    <TableCell className="whitespace-nowrap">{mother.husband_name || 'N/A'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge className={`border-none ${
                        mother.status?.toLowerCase() === 'discharged' 
                          ? 'bg-rose-50 text-rose-600' 
                          : mother.status?.toLowerCase() === 'post-delivery'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {mother.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        {mother.status?.toLowerCase() !== 'discharged' ? (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-xs text-medical-blue hover:bg-blue-50 font-bold gap-1"
                              onClick={async () => {
                                try {
                                  await supabaseService.updatePatient(mother.id, { 
                                    status: 'Admitting', 
                                    registrationType: 'OPD/IPD', 
                                    needsAdmission: true 
                                  });
                                  toast.success(`Mother ${mother.name} is marked for IPD Admission. You can now assign her a bed in IPD Ward!`);
                                  fetchData();
                                } catch (error) {
                                  toast.error('Failed to transfer mother to IPD');
                                }
                              }}
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              Admit (IPD)
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-xs text-teal-600 hover:bg-teal-50 font-bold gap-1"
                              onClick={async () => {
                                try {
                                  await supabaseService.updatePatient(mother.id, { 
                                    registration_type: 'OPD',
                                    status: 'Active'
                                  });
                                  toast.success(`Mother ${mother.name} has been transferred to OPD Directory successfully!`);
                                  fetchData();
                                } catch (error) {
                                  toast.error('Failed to transfer mother to OPD');
                                }
                              }}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              To OPD
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-xs text-rose-500 hover:bg-rose-50 font-bold gap-1"
                              onClick={async () => {
                                try {
                                  await supabaseService.updatePatient(mother.id, { status: 'Discharged' });
                                  toast.success(`Mother ${mother.name} discharged successfully!`);
                                  fetchData();
                                } catch (error) {
                                  toast.error('Failed to discharge mother');
                                }
                              }}
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              Discharge
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic px-2">Case Discharged</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">No mother registrations found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Merge Patient Confirmation Dialog */}
      <Dialog open={!!mergePatientData} onOpenChange={(open) => { if (!open) setMergePatientData(null); }}>
        <DialogContent className="sm:max-w-[450px]">
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
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={confirmMaternityMergeAndContinue}>
              Yes, Merge Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Delivery Record</DialogTitle>
            <DialogDescription>Modify existing delivery or birth data.</DialogDescription>
          </DialogHeader>
          {editingDelivery && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Delivery</Label>
                  <Input 
                    type="date" 
                    value={editingDelivery.date}
                    onChange={(e) => setEditingDelivery({...editingDelivery, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input 
                    type="time" 
                    value={editingDelivery.time}
                    onChange={(e) => setEditingDelivery({...editingDelivery, time: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delivery Type</Label>
                  <Select 
                    value={editingDelivery.type}
                    onValueChange={(v) => setEditingDelivery({...editingDelivery, type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal Delivery</SelectItem>
                      <SelectItem value="cesarean">C-Section (LSCS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Surgeon / Doctor</Label>
                  <Select 
                    value={editingDelivery.surgeon_id}
                    onValueChange={(v) => setEditingDelivery({...editingDelivery, surgeon_id: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes & Details</Label>
                <Input 
                  value={editingDelivery.notes}
                  onChange={(e) => setEditingDelivery({...editingDelivery, notes: e.target.value})}
                  placeholder="Notes about weight, checkup, etc."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="bg-pink-500 hover:bg-pink-600 text-white" onClick={handleUpdateDelivery}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
