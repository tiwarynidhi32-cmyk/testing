import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { 
  FlaskConical, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Printer,
  Share2,
  Image as ImageIcon,
  Download,
  CreditCard,
  Receipt,
  Edit,
  Trash2,
  User,
  UserPlus,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  FileCheck,
  Eye,
  Settings,
  Loader2,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatCurrency } from '@/lib/utils';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { canUserModifyRecord } from '@/utils/rbac';
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
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import LISTestMasters from './lis/LISTestMasters';
import LISResultEntry from './lis/LISResultEntry';
import LISReportDesigner from './lis/LISReportDesigner';
import LISAdvancedModules from './lis/LISAdvancedModules';
import ErrorBoundary from './ErrorBoundary';

function LabQuickRegisterForm({ onRegistered, canMakeLabAndRadio }: { onRegistered: () => void; canMakeLabAndRadio: boolean }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'male'
  });
  const [loading, setLoading] = useState(false);
  const [mergePatientData, setMergePatientData] = useState<{ existing: any, newDetails: any } | null>(null);

  const confirmLabMergeAndContinue = async () => {
    if (!mergePatientData) return;
    const { existing, newDetails } = mergePatientData;
    setMergePatientData(null);
    setLoading(true);
    try {
      const mergedData = {
        name: existing.name,
        phone: existing.phone,
        age: Number(newDetails.age) || existing.age,
        gender: newDetails.gender || existing.gender
      };

      const result = await supabaseService.updatePatient(existing.id, mergedData);
      if (result) {
        // Save patient into the separate Quick Registration database table
        await supabaseService.createQuickRegistration({
          mrn: existing.mrn,
          name: existing.name,
          phone: existing.phone,
          age: Number(newDetails.age) || existing.age || 0,
          gender: newDetails.gender || existing.gender || 'male',
          facility: 'Lab',
          status: 'Active'
        });

        toast.success(`Patient record found and merged successfully! MRN: ${existing.mrn}`);
        setFormData({ name: '', phone: '', age: '', gender: 'male' });
        onRegistered();
      } else {
        toast.error('Failed to merge patient details');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error merging records');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!canMakeLabAndRadio) {
      toast.error('Access Denied: Only assigned Radiologists, Pathologists, or Admin can register patients here.');
      return;
    }
    if (!formData.name || !formData.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    // Duplicate patient check
    const existingPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
    const trimmedNewName = (formData.name || '').trim().toLowerCase();
    const trimmedNewPhone = (formData.phone || '').trim().replace(/\D/g, '');

    // Look for EXACT name and phone match for merge
    const exactMatch = existingPatients.find((p: any) => {
      const pName = (p.name || '').trim().toLowerCase();
      const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');
      return pName === trimmedNewName && pPhone === trimmedNewPhone && trimmedNewPhone !== '';
    });

    if (exactMatch) {
      setMergePatientData({
        existing: exactMatch,
        newDetails: { ...formData }
      });
      return;
    }

    const isDuplicate = existingPatients.some((p: any) => {
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

    setLoading(true);
    const mrn = `MRN${Math.floor(Math.random() * 90000) + 10000}`;
    
    const patientToAdd = {
      name: formData.name,
      phone: formData.phone,
      age: Number(formData.age) || 0,
      gender: formData.gender,
      mrn,
      status: 'Stable',
      registration_type: 'Quick-Lab'
    };

    const result = await supabaseService.createPatient(patientToAdd);
    setLoading(false);
    
    if (result) {
      // Save patient into the separate Quick Registration database table
      await supabaseService.createQuickRegistration({
        mrn,
        name: formData.name,
        phone: formData.phone,
        age: Number(formData.age) || 0,
        gender: formData.gender,
        facility: 'Lab',
        status: 'Active'
      });

      toast.success(`Patient registered successfully! MRN: ${mrn}`);
      setFormData({ name: '', phone: '', age: '', gender: 'male' });
      onRegistered();
    } else {
      toast.error('Failed to register patient');
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Full Name *</Label>
          <Input 
            placeholder="Enter patient name" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone Number *</Label>
          <Input 
            placeholder="Enter phone number" 
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>Age</Label>
          <Input 
            type="number" 
            placeholder="Age" 
            value={formData.age}
            onChange={(e) => setFormData({...formData, age: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select 
            value={formData.gender}
            onValueChange={(v) => setFormData({...formData, gender: v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">male</SelectItem>
              <SelectItem value="female">female</SelectItem>
              <SelectItem value="other">other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button className="bg-medical-blue w-full" onClick={handleRegister} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Complete Registration
        </Button>
      </DialogFooter>

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
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={confirmLabMergeAndContinue}>
              Yes, Merge Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Lab() {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isRadiologist = currentUser?.role === 'RADIOLOGIST';
  const isDeleteForbidden = false;

  const isUserAdmin = currentUser?.role === 'SUPER_ADMIN' || 
                      currentUser?.role === 'ADMIN' || 
                      currentUser?.role === 'HOSPITAL_ADMIN' ||
                      currentUser?.role?.toUpperCase().includes('ADMIN') ||
                      (currentUser?.email && currentUser.email.toLowerCase().includes('admin'));

  const isAssignedPractitioner = currentUser?.role === 'RADIOLOGIST' || 
                                 currentUser?.role === 'PATHOLOGIST' ||
                                 currentUser?.department?.toLowerCase().includes('radiology') ||
                                 currentUser?.department?.toLowerCase().includes('pathology') ||
                                 (currentUser?.role === 'DOCTOR' && (
                                   currentUser?.department?.toLowerCase().includes('radiology') ||
                                   currentUser?.department?.toLowerCase().includes('pathology') ||
                                   currentUser?.specialty?.toLowerCase().includes('radiolog') ||
                                   currentUser?.specialty?.toLowerCase().includes('patholog')
                                 ));

  const canMakeLabAndRadio = isUserAdmin || isAssignedPractitioner;

  const checkPermission = () => {
    if (!canMakeLabAndRadio) {
      toast.error('Access Denied: Only assigned Radiologists, Pathologists, or Admin can make clinical laboratory and radiology modifications.');
      return false;
    }
    return true;
  };

  const [activeTab, setActiveTab] = useState<'pathology' | 'radiology' | 'external'>('pathology');
  const [pathologyMode, setPathologyMode] = useState<'standard' | 'masters' | 'workbench' | 'reports' | 'advanced'>('standard');
  const [mainTab, setMainTab] = useState<'orders' | 'billing' | 'appointments' | 'setup'>('orders');
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [labRates, setLabRates] = useState<any[]>([]);
  const [testOrders, setTestOrders] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    patientId: '',
    type: 'LAB', // 'LAB' or 'RADIOLOGY'
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    urgency: 'Routine'
  });
  const [orderTestSelectValue, setOrderTestSelectValue] = useState("");
  const [billingTestSelectValue, setBillingTestSelectValue] = useState("");
  const [billingPkgSelectValue, setBillingPkgSelectValue] = useState("");
  
  // Test Setup states
  const [isTestSetupOpen, setIsTestSetupOpen] = useState(false);
  const [editingTestConfig, setEditingTestConfig] = useState<any>(null);
  const [testConfigData, setTestConfigData] = useState({
    name: '',
    category: 'Pathology',
    price: 0,
    range: '',
    unit: '',
    groupId: 'misc'
  });
  
  const [templateImage, setTemplateImage] = useState<string | null>(() => storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null));
  const [hospitalInfo, setHospitalInfo] = useState(() => storage.get(STORAGE_KEYS.HOSPITAL_INFO, {
    name: 'Gastro Plus Hospital',
    address: 'Gastro Plus Hospital ,Infront of Aura Inn Bansi Road Basti',
    phone: '+91 6394517005',
    email: 'info@gastroplushospital.com',
    logo: null as string | null
  }));

  const [externalReports, setExternalReports] = useState<{id: string, patentName: string, testName: string, date: string, url: string}[]>(() => storage.get(STORAGE_KEYS.EXTERNAL_REPORTS, []));
  const [radiologyFiles, setRadiologyFiles] = useState<{id: string, orderId: string, url: string, type: string}[]>(() => storage.get(STORAGE_KEYS.RADIOLOGY_FILES, []));

  // Radiologist Advanced Workstation States
  const [selectedRadioOrder, setSelectedRadioOrder] = useState<string>('');
  const [selectedRadioTemplate, setSelectedRadioTemplate] = useState<string>('chest-xray');
  const [radioFindings, setRadioFindings] = useState<string>('');
  const [radioClinicalNotes, setRadioClinicalNotes] = useState<string>('');
  const [uploadedRadioUrl, setUploadedRadioUrl] = useState<string>('');
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [radioBillPaymentMode, setRadioBillPaymentMode] = useState<'Cash' | 'Card' | 'UPI' | 'Insurance'>('Cash');

  // Lab Packages
  const LAB_PACKAGES = [
    { id: 'PKG1', name: 'Executive Health Checkup', price: 2500, tests: ['CBC', 'LFT', 'KFT', 'Lipid Profile', 'Blood Sugar'] },
    { id: 'PKG2', name: 'Diabetes Screening', price: 1200, tests: ['Blood Sugar (F/PP)', 'HbA1c', 'Urine Routine'] },
    { id: 'PKG3', name: 'Fever Profile', price: 1500, tests: ['CBC', 'Widal', 'Malaria Parasite', 'Urine Routine'] },
    { id: 'PKG4', name: 'Antenatal Profile (ANC)', price: 3500, tests: ['CBC', 'Blood Group', 'HIV', 'HBsAg', 'VDRL', 'Blood Sugar'] }
  ];

  const fetchData = async () => {
    const isInitial = testOrders.length === 0 && patients.length === 0;
    if (isInitial) {
      setLoading(true);
    }
    const [patientsData, testsData, ordersData, radiologyData, invoicesData, appointmentsData] = await Promise.all([
      supabaseService.getPatients(),
      supabaseService.getLabTests(),
      supabaseService.getLabTestRequests(),
      supabaseService.getRadiologyRecords(),
      supabaseService.getInvoices(),
      supabaseService.getAppointments()
    ]);

    if (patientsData) setPatients(patientsData);
    if (testsData) setLabRates(testsData);
    
     // Combine and normalize orders
     const pathOrders = (ordersData || []).map(o => ({ 
       ...o, 
       category: 'pathology',
       result: o.result_value || o.result || '',
       clinicalNotes: o.clinical_notes || o.clinicalNotes || '',
       findings: o.findings || ''
     }));
     const radioOrders = (radiologyData || []).map(o => ({ 
       ...o, 
       category: 'radiology',
       result_value: o.result_notes || o.result_value, // Alias result_notes to result_value for shared UI
       result: o.result_value || o.result_notes || o.result || '',
       clinicalNotes: o.clinical_notes || o.clinicalNotes || '',
       findings: o.findings || ''
     }));
     setTestOrders([...pathOrders, ...radioOrders]);

    if (invoicesData) setBills(invoicesData.filter(inv => inv.invoice_items?.some((item: any) => 
      ['lab', 'path', 'radio'].includes(item.category?.toLowerCase()))));
    
    if (appointmentsData) {
      setAppointments(appointmentsData.filter((a: any) => a.type === 'LAB' || a.type === 'RADIOLOGY'));
    }

    setLoading(false);
  };

  useDataSync(fetchData);

  // All states are declared once at the top of Lab function
  const [testGroups, setTestGroups] = useState(() => storage.get('lab_test_groups', [
    { id: 'heme', name: 'Hematology' },
    { id: 'biochem', name: 'Biochemistry' },
    { id: 'serology', name: 'Serology' },
    { id: 'urine', name: 'Urine Analysis' },
    { id: 'misc', name: 'Miscellaneous' }
  ]));
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleExternalUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!checkPermission()) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const patient = patients.find(p => p.id === selectedPatientId);
        const newReport = {
          id: `EXT-${Date.now()}`,
          patentName: patient?.name || 'Walk-in Patient',
          testName: file.name.split('.')[0],
          date: new Date().toISOString(),
          url: event.target?.result as string
        };
        const updated = [newReport, ...externalReports];
        setExternalReports(updated);
        storage.set(STORAGE_KEYS.EXTERNAL_REPORTS, updated);
        toast.success('External report uploaded successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRadiologyUpload = (e: ChangeEvent<HTMLInputElement>, orderId: string) => {
    if (!checkPermission()) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newFile = {
          id: `RAD-IMG-${Date.now()}`,
          orderId: orderId,
          url: event.target?.result as string,
          type: 'X-Ray'
        };
        const updated = [newFile, ...radiologyFiles];
        setRadiologyFiles(updated);
        storage.set(STORAGE_KEYS.RADIOLOGY_FILES, updated);
        toast.success('Radiology scan uploaded successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  // Workstation interactive actions
  const handleWorkstationUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!checkPermission()) return;
    const file = e.target.files?.[0];
    if (file) {
      if (!selectedRadioOrder) {
        toast.error('Please select an active radiology order first');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;
        const newFile = {
          id: `rf-${Date.now()}`,
          orderId: selectedRadioOrder,
          url: base64Url,
          type: file.type
        };
        const updated = [newFile, ...radiologyFiles];
        setRadiologyFiles(updated);
        storage.set(STORAGE_KEYS.RADIOLOGY_FILES, updated);
        setUploadedRadioUrl(base64Url);
        toast.success('Radiology scan uploaded successfully to current order!');
      };
      reader.readAsDataURL(file);
    }
  };

  const applyRadiologyTemplate = (templateKey: string) => {
    const templates: Record<string, any> = {
      'chest-xray': {
        findings: 'Chest X-Ray PA View:\n- Both lung fields show normal vascularity with no consolidation.\n- Bony cage & thoracic soft tissues are normal.\n- Heart size and configuration are within normal limits.\n- Diaphragmatic domes are smooth and translucent.',
        notes: 'No active clinical pathology detected.'
      },
      'spine-xray': {
        findings: 'X-Ray Lumbar Spine AP/Lateral:\n- Vertebral body heights and joint spaces are within normal limits.\n- Pedicles, laminae, and spinous processes are intact.\n- Normal lumbar lordosis preserved with no evidence of subluxation.',
        notes: 'Normal study of the lumbar spine.'
      },
      'usg-abdomen': {
        findings: 'USG Abdomen & Pelvis:\n- Liver displays normal size and homogeneous echotexture.\n- Gall bladder is thin-walled and contains no calculus/sludge.\n- Both kidneys, spleen, and pancreas are normal.\n- No evidence of free fluid or intra-abdominal lymphadenopathy.',
        notes: 'Normal clinical baseline scan.'
      }
    };
    setSelectedRadioTemplate(templateKey);
    const t = templates[templateKey];
    if (t) {
      setRadioFindings(t.findings);
      setRadioClinicalNotes(t.notes);
      toast.success(`Applied report findings template!`);
    }
  };

  const handlePublishRadiologyResult = async () => {
    if (!checkPermission()) return;
    if (!selectedRadioOrder) {
      toast.error('Please select a radiology order to publish');
      return;
    }
    
    const updates = {
      result_value: 'Report Generated & Published',
      clinical_notes: radioClinicalNotes,
      findings: radioFindings,
      status: 'Completed',
      updated_at: new Date().toISOString()
    };

    const result = await supabaseService.updateRadiologyRecord(selectedRadioOrder, updates);
    if (result) {
      const normalizedResult = {
        ...result,
        category: 'radiology',
        result_value: result.result_notes || result.result_value || 'Completed',
        result: result.result_value || result.result_notes || 'Completed',
        clinicalNotes: result.clinical_notes || '',
        findings: result.findings || ''
      };
      setTestOrders(testOrders.map(t => t.id === selectedRadioOrder ? { ...t, ...normalizedResult } : t));
      toast.success('Radiology report generated, verified and published successfully!');
      
      setSelectedRadioOrder('');
      setRadioFindings('');
      setRadioClinicalNotes('');
      setUploadedRadioUrl('');
    } else {
      const fallbackResult = {
        id: selectedRadioOrder,
        category: 'radiology',
        result_value: 'Completed / Report Released',
        result: 'Completed / Report Released',
        clinicalNotes: radioClinicalNotes,
        findings: radioFindings,
        status: 'Completed',
        updated_at: new Date().toISOString()
      };
      setTestOrders(testOrders.map(t => t.id === selectedRadioOrder ? { ...t, ...fallbackResult } : t));
      toast.success('Radiology report generated & published (Offline Mode)!');
      
      setSelectedRadioOrder('');
      setRadioFindings('');
      setRadioClinicalNotes('');
      setUploadedRadioUrl('');
    }
  };

  const handleCollectWorkstationBill = (billId: string) => {
    if (!checkPermission()) return;
    const billToPay = bills.find(b => b.id === billId);
    if (!billToPay) {
      toast.error('Invoice/Bill not found');
      return;
    }

    const updatedBills = bills.map(b => b.id === billId ? { ...b, status: 'Paid', payment_mode: radioBillPaymentMode } : b);
    setBills(updatedBills);
    storage.set(STORAGE_KEYS.LAB_BILLS, updatedBills);
    toast.success(`Bill collected successfully (${formatCurrency(billToPay.paid_amount || billToPay.total_amount)} via ${radioBillPaymentMode})!`);
    setSelectedBillId('');
  };

  // Result entry state
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<any>(null);
  const [resultData, setResultData] = useState({
    value: '',
    findings: '',
    clinicalNotes: '',
    status: 'Completed'
  });

  // Package state
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);

  // New states for search and dialog control
  const [isNewTestOpen, setIsNewTestOpen] = useState(false);
  const [isNewBillOpen, setIsNewBillOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);

  // New Test Order state
  const [newTestOrder, setNewTestOrder] = useState({
    patientId: '',
    category: 'pathology',
    testName: '',
    urgency: 'routine'
  });
  const [selectedTestConfigs, setSelectedTestConfigs] = useState<any[]>([]);

  // Billing State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTests, setSelectedTests] = useState<{id: string, name: string, price: number}[]>([]);
  const [paymentMode, setPaymentMode] = useState('cash');

  useEffect(() => {
    const current = storage.get(STORAGE_KEYS.LAB_BILLS, null);
    if (JSON.stringify(current) !== JSON.stringify(bills)) {
      storage.set(STORAGE_KEYS.LAB_BILLS, bills);
    }
  }, [bills]);

  useEffect(() => {
    const handleStorage = () => {
      setPatients(storage.get(STORAGE_KEYS.PATIENTS, []));
      setTemplateImage(storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null));
      setHospitalInfo(storage.get(STORAGE_KEYS.HOSPITAL_INFO, hospitalInfo));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addTestToBill = (testId: string) => {
    const test = labRates.find((t: any) => (t.id || t.name) === testId);
    if (test) {
      setSelectedTests([...selectedTests, { id: test.id || test.name, name: test.name, price: test.price || test.rate }]);
    }
    setTimeout(() => {
      setBillingTestSelectValue("");
    }, 50);
  };

  const removeTestFromBill = (index: number) => {
    const newTests = [...selectedTests];
    newTests.splice(index, 1);
    setSelectedTests(newTests);
  };

  const [discount, setDiscount] = useState(0);

  const totalBillAmount = selectedTests.reduce((sum, t) => sum + t.price, 0);
  const finalBillAmount = totalBillAmount - (totalBillAmount * (discount / 100));

  const resetBilling = () => {
    setSelectedPatientId('');
    setSelectedTests([]);
    setPaymentMode('cash');
    setPatientSearchTerm('');
    setShowPatientResults(false);
    setDiscount(0);
    setBillingTestSelectValue("");
    setBillingPkgSelectValue("");
  };

  const handleDeleteBill = async (id: string) => {
    if (isDeleteForbidden) {
      toast.error('Deletion of lab bills is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    if (!checkPermission()) return;
    const bill = bills.find(b => b.id === id);
    if (bill && !canUserModifyRecord(bill, currentUser)) {
      toast.error("Access Denied: This lab bill was created by an Admin and cannot be deleted by non-admin users.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete this lab bill?")) {
      return;
    }
    const success = await supabaseService.deleteInvoice(id);
    if (success) {
      setBills(bills.filter(b => b.id !== id));
      toast.success('Lab bill removed');
    } else {
      toast.error('Failed to remove bill');
    }
  };

  const getResultStatus = (value: string, range: string) => {
    if (!range || !value) return 'normal';
    try {
      const cleanRange = range.replace(/[a-zA-Z]/g, '').trim();
      const parts = cleanRange.split('-').map(p => parseFloat(p.trim()));
      if (parts.length !== 2) return 'normal';
      const val = parseFloat(value);
      if (isNaN(val)) return 'normal';
      if (val < parts[0]) return 'low';
      if (val > parts[1]) return 'high';
    } catch (e) {
      return 'normal';
    }
    return 'normal';
  };

  const handleSaveResult = async () => {
    if (!checkPermission()) return;
    if (!editingResult) return;
    
    const updates = {
      result_value: resultData.value,
      clinical_notes: resultData.clinicalNotes,
      findings: resultData.findings,
      status: resultData.status,
      updated_at: new Date().toISOString()
    };

    const isRadio = editingResult.category === 'radiology';
    const result = isRadio
       ? await supabaseService.updateRadiologyRecord(editingResult.id, updates)
       : await supabaseService.updateLabTestRequest(editingResult.id, updates);

    if (result) {
      const normalizedResult = {
        ...result,
        result_value: isRadio ? (result.result_notes || result.result_value) : result.result_value,
        result: result.result_value || result.result || '',
        clinicalNotes: result.clinical_notes || result.clinicalNotes || '',
        findings: result.findings || ''
      };
      setTestOrders(testOrders.map(t => t.id === editingResult.id ? { ...t, ...normalizedResult } : t));
      setIsResultDialogOpen(false);
      toast.success('Test results saved successfully');
    } else {
      toast.error('Failed to save results');
    }
  };

  const printReport = (test: any) => {
    const templateImage = storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null);
    const hospitalInfo = storage.get<{
      name?: string;
      address?: string;
      phone?: string;
      logo?: string | null;
    }>(STORAGE_KEYS.HOSPITAL_INFO, {});
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print report');
      return;
    }

    const reportHtml = `
      <html>
        <head>
          <title>Laboratory Report - ${test.id}</title>
          <style>
            @page { margin: 10mm; size: A4; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 0;
              color: #1e293b;
              line-height: 1.5;
            }
            .template-bg {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: -1;
            }
            .content { 
              position: relative;
              padding-top: ${templateImage ? '260px' : '20px'}; 
              padding-bottom: ${templateImage ? '100px' : '20px'};
              margin: 0 40px;
              z-index: 10;
            }
            .hospital-header {
              text-align: center;
              margin-bottom: 30px;
              display: ${templateImage ? 'none' : 'block'};
            }
            .hospital-name { font-size: 28px; font-weight: 800; color: #2563eb; letter-spacing: -0.025em; }
            .report-title { 
              text-align: center; 
              font-size: 20px; 
              font-weight: 800; 
              margin: 20px 0; 
              color: #0f172a; 
              text-transform: uppercase;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10px;
            }
            .patient-card { 
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 30px;
              display: grid;
              grid-template-columns: 1.5fr 1fr;
              gap: 15px;
              background-color: #f8fafc;
            }
            .info-item { font-size: 14px; }
            .info-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px; margin-right: 5px; }
            .info-value { font-weight: 700; color: #0f172a; }
            
            .report-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 40px; }
            .report-table th { 
              text-align: left; 
              background-color: #f1f5f9;
              padding: 12px 15px; 
              color: #475569; 
              font-size: 11px; 
              text-transform: uppercase; 
              font-weight: 700;
              border-bottom: 2px solid #e2e8f0;
            }
            .report-table td { padding: 18px 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .test-name { font-weight: 800; color: #1e293b; font-size: 15px; }
            .result-value { font-weight: 800; color: #2563eb; font-size: 16px; text-align: center; }
            
            .findings-section { 
              margin-top: 30px;
              padding: 20px;
              background-color: #f8fafc;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            .footer { 
              margin-top: 80px; 
              display: flex; 
              justify-content: space-between;
              align-items: flex-end;
              padding-bottom: 40px;
            }
            .sig-area { text-align: center; }
            .sig-line { border-top: 2px solid #0f172a; width: 180px; margin-bottom: 10px; }
            .sig-text { font-weight: 700; font-size: 14px; }
            .hospital-info { font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          ${templateImage ? `<div class="template-bg"><img src="${templateImage}" style="width: 100%;" /></div>` : ''}
          <div class="content">
            <div class="hospital-header">
              ${(hospitalInfo.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '') ? `<img src="${hospitalInfo.logo}" style="height: 60px; margin-bottom: 10px;" />` : ''}
              <div class="hospital-name">${hospitalInfo.name}</div>
              <div class="hospital-info">${hospitalInfo.address} | Tel: ${hospitalInfo.phone}</div>
            </div>

            <div class="report-title">Laboratory Investigation Report</div>

            <div class="patient-card">
              <div class="info-item"><span class="info-label">Patient Name:</span> <span class="info-value">${test.patient}</span></div>
              <div class="info-item" style="text-align: right;"><span class="info-label">Report Date:</span> <span class="info-value">${formatDate(test.date)}</span></div>
              <div class="info-item"><span class="info-label">Age / Gender:</span> <span class="info-value">45Y / Male</span></div>
              <div class="info-item" style="text-align: right;"><span class="info-label">Report ID:</span> <span class="info-value">#${test.id}</span></div>
              <div class="info-item"><span class="info-label">Ref By Dr:</span> <span class="info-value">${test.doctor}</span></div>
            </div>

            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 40%;">Test Description</th>
                  <th style="text-align: center;">Result</th>
                  <th style="text-align: center;">Ref Range</th>
                  <th style="text-align: center;">Unit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><div class="test-name">${test.test}</div></td>
                  <td><div class="result-value">${test.result || 'Pending'}</div></td>
                  <td style="text-align: center;">${test.range || '-'}</td>
                  <td style="text-align: center;">${test.unit || '-'}</td>
                </tr>
              </tbody>
            </table>

            <div class="findings-section">
              <div class="info-label" style="margin-bottom: 8px; display: block;">Clinical Findings & Notes</div>
              <div style="font-size: 14px; color: #334155;">${test.findings || 'No significant abnormalities detected in the sample. Results should be clinically correlated.'}</div>
            </div>

            <div class="footer">
              <div class="sig-area">
                <div class="sig-line"></div>
                <div class="sig-text">Lab Technician</div>
              </div>
              <div class="sig-area">
                <div class="sig-line"></div>
                <div class="sig-text">Pathologist</div>
              </div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 700);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  const printBill = (bill: any) => {
    const templateImage = storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null);
    const hospitalInfo = storage.get<{
      name?: string;
      address?: string;
      phone?: string;
      logo?: string | null;
    }>(STORAGE_KEYS.HOSPITAL_INFO, {});
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print bill');
      return;
    }

    const billHtml = `
      <html>
        <head>
          <title>Lab Bill - ${bill.id}</title>
          <style>
            @page { margin: 10mm; size: A4; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 0;
              color: #1e293b;
              line-height: 1.5;
            }
            .template-bg {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: -1;
            }
            .content { 
              position: relative;
              padding-top: ${templateImage ? '260px' : '20px'}; 
              padding-bottom: ${templateImage ? '100px' : '20px'};
              margin: 0 40px;
              z-index: 10;
            }
            .hospital-header {
              text-align: center;
              margin-bottom: 30px;
              display: ${templateImage ? 'none' : 'block'};
              border-bottom: 2px solid #2563eb;
              padding-bottom: 15px;
            }
            .hospital-name { font-size: 28px; font-weight: 800; color: #2563eb; letter-spacing: -0.025em; }
            .bill-title { text-align: center; font-size: 22px; font-weight: 800; margin: 20px 0; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .bill-info { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 30px; 
              padding: 15px; 
              background-color: #f8fafc;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            .bill-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 40px; }
            .bill-table th { text-align: left; background-color: #f1f5f9; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; font-weight: 700; }
            .bill-table td { padding: 15px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .total-section { text-align: right; margin-top: 30px; padding-top: 20px; border-top: 2px solid #0f172a; }
            .total-label { font-size: 16px; font-weight: 600; color: #64748b; }
            .total-amount { font-size: 24px; font-weight: 800; color: #0f172a; }
          </style>
        </head>
        <body>
          ${templateImage ? `<div class="template-bg"><img src="${templateImage}" style="width: 100%;" /></div>` : ''}
          <div class="content">
            <div class="hospital-header">
              ${(hospitalInfo.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '') ? `<img src="${hospitalInfo.logo}" style="height: 60px; margin-bottom: 10px;" />` : ''}
              <div class="hospital-name">${hospitalInfo.name}</div>
              <div style="font-size: 11px; color: #64748b;">${hospitalInfo.address} | Tel: ${hospitalInfo.phone}</div>
            </div>
            
            <div class="bill-title">Laboratory Invoice</div>
            
            <div class="bill-info">
              <div>
                <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Bill To:</div>
                <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${bill.patient}</div>
                <div style="font-size: 12px; color: #64748b;">Patient ID: #P-${Date.now().toString().slice(-4)}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Invoice Details:</div>
                <div style="font-size: 14px; font-weight: 700;">Inv No: ${bill.id}</div>
                <div style="font-size: 14px; font-weight: 700;">Date: ${formatDate(bill.date)}</div>
              </div>
            </div>

            <table class="bill-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Laboratory Investigations & Diagnostic Services</td>
                  <td style="text-align: right; font-weight: 700;">${formatCurrency(bill.amount)}</td>
                </tr>
              </tbody>
            </table>

            <div class="total-section">
              <span class="total-label">Grand Total:</span>
              <span class="total-amount">${formatCurrency(bill.amount)}</span>
              <div style="font-size: 12px; color: #059669; font-weight: 700; margin-top: 5px;">Status: PAID</div>
            </div>

            <div style="margin-top: 80px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px;">
              Thank you for choosing Gastro Plus Hospital Diagnostics. Get well soon!
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 700);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(billHtml);
    printWindow.document.close();
  };

  const handleExportLab = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (activeTab === 'external') {
      headers = ['Report ID', 'Patient Name', 'Test Name', 'Uploaded Date'];
      rows = externalReports.map(report => [
        report.id || '',
        report.patentName || 'N/A',
        report.testName || '',
        report.date ? new Date(report.date).toLocaleDateString() : 'N/A'
      ]);
      filename = 'external_lab_reports.csv';
    } else {
      headers = ['Order ID', 'Patient Name', 'Date', 'Test Name', 'Requested By', 'Result Value', 'Reference Range', 'Status'];
      rows = filteredOrders.map(test => [
        test.id?.slice(0, 8) || '',
        test.patients?.name || 'N/A',
        test.created_at ? new Date(test.created_at).toLocaleDateString() : 'N/A',
        test.test_name || '',
        test.profiles?.name || 'Self/Ordered',
        test.result_value || '-',
        test.reference_range || 'N/A',
        test.status || ''
      ]);
      filename = `${activeTab}_test_orders.csv`;
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
    toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} data exported successfully`);
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBills = bills.filter(b => b.created_at?.startsWith(today));
    const totalCollection = todayBills.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
    const pendingBills = bills.filter(b => b.status === 'Pending').length;
    return {
      todayCollection: totalCollection,
      pendingCount: pendingBills,
      totalBilled: bills.length
    };
  }, [bills]);

  const filteredOrders = useMemo(() => {
    return testOrders.filter(order => {
      // Category filter
      if (activeTab === 'pathology' && order.category !== 'pathology') return false;
      if (activeTab === 'radiology' && order.category !== 'radiology') return false;
      if (activeTab === 'external') return false; // Handled by externalReports state separately in UI

      const searchStr = searchQuery.toLowerCase();
      const patient = patients.find(p => p.id === order.patient_id);
      
      return (
        order.test_name?.toLowerCase().includes(searchStr) ||
        patient?.name?.toLowerCase().includes(searchStr) ||
        patient?.mrn?.toLowerCase().includes(searchStr)
      );
    });
  }, [testOrders, activeTab, searchQuery, patients]);

  const labStats = useMemo(() => {
    return {
      pending: testOrders.filter(t => t.status === 'Ordered').length,
      processing: testOrders.filter(t => t.status === 'Processing').length,
      completed: testOrders.filter(t => t.status === 'Completed').length,
      critical: testOrders.filter(t => {
        const resValue = t.result_value || '';
        const refRange = t.reference_range || '';
        if (!resValue || !refRange) return false;
        
        // Basic check for numeric values out of range
        const val = parseFloat(resValue);
        if (isNaN(val)) return false;
        
        const rangeMatch = refRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
        if (rangeMatch) {
          const min = parseFloat(rangeMatch[1]);
          const max = parseFloat(rangeMatch[2]);
          return val < min || val > max;
        }
        return false;
      }).length
    };
  }, [testOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 text-sm text-muted-foreground font-medium">Loading Lab Data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {!canMakeLabAndRadio && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm animate-in slide-in-from-top duration-300">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Viewing Only (Restricted Access)</h3>
              <p className="mt-1 text-xs text-amber-700 leading-relaxed font-semibold">
                You are logged in as <span className="font-bold underline text-amber-950">{currentUser?.name || 'Staff'} ({currentUser?.role || 'Guest'})</span>.
                Only an assigned Radiologist / Pathologist doctor or an Administrator can generate labology/pathology/radiology test results, save entries, or configure master setups.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Dynamic, Vibrant, Richly Colored Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-600 to-blue-600 text-white p-6 sm:p-8 shadow-xl shadow-indigo-100 animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest bg-white/20 text-white px-3 py-1 rounded-full uppercase my-1 select-none w-fit">
              ★ AUTOMATED CLINICAL LAB DIAGNOSTICS
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              Lab & Radiology
            </h1>
            <p className="text-indigo-50 text-sm font-medium max-w-xl">
              Execute modern assays, oversee pathology reports, configure test rates, schedule diagnostic scan slots, and print custom barcode receipts.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
            <Button variant="outline" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-indigo-900 rounded-xl font-bold h-10" onClick={handleExportLab}>
              <Download className="w-4 h-4" />
              Export Data
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-indigo-900 rounded-xl font-bold h-10">
                  <UserPlus className="w-4 h-4" />
                  Quick Register
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Lab Quick Registration</DialogTitle>
                  <DialogDescription>Quickly register a patient for laboratory or radiology services.</DialogDescription>
                </DialogHeader>
                <LabQuickRegisterForm onRegistered={fetchData} canMakeLabAndRadio={canMakeLabAndRadio} />
              </DialogContent>
            </Dialog>
            <Button 
              variant="outline" 
              className={`gap-2 border-white/20 rounded-xl font-bold h-10 ${mainTab === 'setup' ? 'bg-white text-indigo-950 hover:bg-white/95' : 'bg-white/10 text-white hover:bg-white hover:text-indigo-950'}`}
              onClick={() => setMainTab(mainTab === 'setup' ? 'orders' : 'setup')}
            >
              <Settings className="w-4 h-4" />
              Master Setup
            </Button>
            <Button 
              variant="outline" 
              className={`gap-2 border-white/20 rounded-xl font-bold h-10 ${mainTab === 'appointments' ? 'bg-white text-indigo-950 hover:bg-white/95' : 'bg-white/10 text-white hover:bg-white hover:text-indigo-950'}`}
              onClick={() => setMainTab(mainTab === 'appointments' ? 'orders' : 'appointments')}
            >
              <Calendar className="w-4 h-4" />
              Appointments Tab
            </Button>
            <Button 
              className="bg-white text-indigo-900 hover:bg-indigo-50 gap-2 rounded-xl font-black h-10 shadow-md"
              onClick={() => setIsBookingOpen(true)}
            >
              <Clock className="w-4 h-4" />
              Book Slot
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Book Diagnostic Slot</DialogTitle>
                <DialogDescription>Schedule a time for Lab or Radiology tests.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2 relative">
                  <Label>Patient</Label>
                  <div className="relative">
                    <Input 
                      placeholder="Search patient..." 
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientResults(true);
                      }}
                    />
                    {showPatientResults && patientSearchTerm.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                        {patients.filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase())).map(p => (
                          <div 
                            key={p.id} 
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer"
                            onClick={() => {
                              setNewBooking({...newBooking, patientId: p.id});
                              setPatientSearchTerm(p.name);
                              setShowPatientResults(false);
                            }}
                          >
                            <p className="text-sm font-medium">{p.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Select value={newBooking.type} onValueChange={(v) => setNewBooking({...newBooking, type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LAB">LAB</SelectItem>
                      <SelectItem value="RADIOLOGY">RADIOLOGY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={newBooking.date} onChange={(e) => setNewBooking({...newBooking, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input placeholder="10:00 AM" value={newBooking.time} onChange={(e) => setNewBooking({...newBooking, time: e.target.value})} />
                  </div>
                </div>
              </div>
              <DialogFooter className="flex gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => setIsBookingOpen(false)} className="flex-1 sm:flex-initial">
                  Cancel
                </Button>
                <Button className="bg-medical-blue flex-1 sm:flex-initial" onClick={async () => {
                  if (!checkPermission()) return;
                  if (!newBooking.patientId) return toast.error('Select patient');
                  const selectedPat = patients.find(p => p.id === newBooking.patientId);
                  const result = await supabaseService.createAppointment({
                    patient_id: newBooking.patientId,
                    patientName: selectedPat?.name || undefined,
                    type: newBooking.type,
                    appointment_date: newBooking.date,
                    appointment_time: newBooking.time,
                    urgency: newBooking.urgency,
                    status: 'Scheduled'
                  });
                  if (result) {
                    toast.success('Appointment booked');
                    setIsBookingOpen(false);
                    fetchData();
                  }
                }}>Confirm Booking</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button 
            variant={mainTab === 'billing' ? 'secondary' : 'outline'} 
            className="gap-2"
            onClick={() => setMainTab(mainTab === 'billing' ? 'orders' : 'billing')}
          >
            <Receipt className="w-4 h-4" />
            {mainTab === 'billing' ? 'View Orders' : 'Lab Billing'}
          </Button>
          <Dialog open={isNewTestOpen} onOpenChange={(open) => {
            setIsNewTestOpen(open);
            if (!open) {
              setPatientSearchTerm('');
              setShowPatientResults(false);
              setNewTestOrder({ patientId: '', category: 'pathology', testName: '', urgency: 'routine' });
              setSelectedTestConfigs([]);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-medical-blue gap-2" onClick={() => setIsNewTestOpen(true)}>
                <Plus className="w-4 h-4" />
                New Test Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>New Diagnostic Test Order</DialogTitle>
                <DialogDescription>Order pathology or radiology tests for a patient.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2 relative">
                  <Label>Patient (Search by Name or Phone)</Label>
                  <div className="relative">
                    <Input 
                      placeholder="Start typing name or phone..." 
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientResults(true);
                        if (e.target.value === '') {
                          setNewTestOrder({...newTestOrder, patientId: ''});
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
                              setNewTestOrder({...newTestOrder, patientId: p.id});
                              setPatientSearchTerm(p.name);
                              setShowPatientResults(false);
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground">{p.phone} • MRN: {p.mrn}</p>
                            </div>
                            {newTestOrder.patientId === p.id && <CheckCircle2 className="w-4 h-4 text-medical-blue" />}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                          No patients found.
                        </div>
                      )}
                    </div>
                  )}
 
                  {newTestOrder.patientId && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-blue-700 truncate">
                          {patients.find(pat => pat.id === newTestOrder.patientId)?.name}
                        </p>
                        <p className="text-[10px] text-blue-600 truncate">
                          Ph: {patients.find(pat => pat.id === newTestOrder.patientId)?.phone} • MRN: {patients.find(pat => pat.id === newTestOrder.patientId)?.mrn}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Test Category</Label>
                  <Select 
                    value={newTestOrder.category} 
                    onValueChange={(v) => {
                      setNewTestOrder({...newTestOrder, category: v});
                      setSelectedTestConfigs([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pathology">pathology</SelectItem>
                      <SelectItem value="radiology">radiology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Add Tests under {newTestOrder.category === 'pathology' ? 'Pathology' : 'Radiology'}</Label>
                  <Select 
                    value={orderTestSelectValue}
                    onValueChange={(name) => {
                      const test = labRates.find(t => t.name === name);
                      if (test && !selectedTestConfigs.some(t => t.id === test.id)) {
                        setSelectedTestConfigs([...selectedTestConfigs, test]);
                      }
                      setTimeout(() => {
                        setOrderTestSelectValue("");
                      }, 50);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose test to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {labRates
                        .filter(t => t.category.toLowerCase() === newTestOrder.category)
                        .map(t => (
                          <SelectItem key={t.id || t.name} value={t.name}>
                            {t.name}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                {selectedTestConfigs.length > 0 && (
                  <div className="space-y-1.5 border border-slate-150 rounded-lg p-2.5 bg-slate-50 max-h-[150px] overflow-y-auto">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 px-1">
                      <span>Selected Tests ({selectedTestConfigs.length})</span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedTestConfigs([])}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-1 mt-1">
                      {selectedTestConfigs.map((test, idx) => (
                        <div key={test.id || idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-100 text-xs shadow-sm">
                          <span className="font-semibold text-slate-700 truncate max-w-[280px]">{test.name}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 text-rose-500 hover:bg-rose-50 rounded"
                            onClick={() => setSelectedTestConfigs(selectedTestConfigs.filter((_, subIdx) => subIdx !== idx))}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select 
                    value={newTestOrder.urgency} 
                    onValueChange={(v) => setNewTestOrder({...newTestOrder, urgency: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">routine</SelectItem>
                      <SelectItem value="urgent">urgent</SelectItem>
                      <SelectItem value="stat">stat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogTrigger>
                <Button 
                  className="bg-medical-blue" 
                  onClick={async () => {
                    if (!newTestOrder.patientId || selectedTestConfigs.length === 0) {
                      toast.error('Please select patient and add at least one test to the order');
                      return;
                    }
                    
                    let successCount = 0;
                    const createdResults = [];

                    for (const test of selectedTestConfigs) {
                      const isRadiology = test.category?.toLowerCase() === 'radiology' || 
                                         test.name.toLowerCase().includes('x-ray') || 
                                         test.name.toLowerCase().includes('scan');
                      
                      const newOrder = {
                        patient_id: newTestOrder.patientId,
                        test_name: test.name,
                        status: 'Ordered',
                        reference_range: test.range || test.reference_range || '',
                        unit: test.unit || '',
                        urgency: newTestOrder.urgency
                      };

                      const result = isRadiology 
                        ? await supabaseService.createRadiologyRecord({ ...newOrder, result_notes: '' })
                        : await supabaseService.createLabTestRequest(newOrder);

                      if (result) {
                        successCount++;
                        createdResults.push({...result, category: isRadiology ? 'radiology' : 'pathology'});
                      }
                    }

                    if (successCount > 0) {
                      setTestOrders(prev => [...createdResults, ...prev]);
                      toast.success(`Successfully placed ${successCount} diagnostic test order(s)`);
                      setIsNewTestOpen(false);
                      setSelectedTestConfigs([]);
                      fetchData();
                    } else {
                      toast.error('Failed to place ordered tests');
                    }
                  }}
                >
                  Place Order ({selectedTestConfigs.length})
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      {mainTab === 'orders' ? (
        <>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between border-b border-slate-150 pb-4">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
              <Button 
                variant={activeTab === 'pathology' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('pathology')}
                className={activeTab === 'pathology' ? 'bg-white shadow-sm' : ''}
              >
                Pathology
              </Button>
              <Button 
                variant={activeTab === 'radiology' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('radiology')}
                className={activeTab === 'radiology' ? 'bg-white shadow-sm' : ''}
              >
                Radiology (X-Ray/USG)
              </Button>
              <Button 
                variant={activeTab === 'external' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('external')}
                className={activeTab === 'external' ? 'bg-white shadow-sm text-medical-blue' : ''}
              >
                External Reports
              </Button>
            </div>

            {activeTab === 'pathology' && (
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-xl w-full lg:w-auto">
                <Button 
                  variant={pathologyMode === 'standard' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setPathologyMode('standard')}
                  className={`text-xs font-bold leading-none h-8 px-3 rounded-lg ${pathologyMode === 'standard' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-600'}`}
                >
                  Patients & Orders
                </Button>
                <Button 
                  variant={pathologyMode === 'masters' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setPathologyMode('masters')}
                  className={`text-xs font-bold leading-none h-8 px-3 rounded-lg ${pathologyMode === 'masters' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-600'}`}
                >
                  LIMS Masters
                </Button>
                <Button 
                  variant={pathologyMode === 'workbench' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setPathologyMode('workbench')}
                  className={`text-xs font-bold leading-none h-8 px-3 rounded-lg ${pathologyMode === 'workbench' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-600'}`}
                >
                  Diagnostic Workbench
                </Button>
                <Button 
                  variant={pathologyMode === 'reports' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setPathologyMode('reports')}
                  className={`text-xs font-bold leading-none h-8 px-3 rounded-lg ${pathologyMode === 'reports' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-600'}`}
                >
                  Reports Designer
                </Button>
                <Button 
                  variant={pathologyMode === 'advanced' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setPathologyMode('advanced')}
                  className={`text-xs font-bold leading-none h-8 px-3 rounded-lg ${pathologyMode === 'advanced' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-600'}`}
                >
                  Advanced Ops & Logistics
                </Button>
              </div>
            )}
          </div>
 
          {activeTab === 'pathology' && pathologyMode === 'masters' && <LISTestMasters readOnly={!canMakeLabAndRadio} />}
          {activeTab === 'pathology' && pathologyMode === 'workbench' && (
            <ErrorBoundary>
              <LISResultEntry onRelease={fetchData} readOnly={!canMakeLabAndRadio} />
            </ErrorBoundary>
          )}
          {activeTab === 'pathology' && pathologyMode === 'reports' && <LISReportDesigner />}
          {activeTab === 'pathology' && pathologyMode === 'advanced' && <LISAdvancedModules readOnly={!canMakeLabAndRadio} />}

          {((activeTab === 'pathology' && pathologyMode === 'standard') || activeTab === 'radiology' || activeTab === 'external') && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Pending Samples</p>
                <h3 className="text-xl font-bold text-amber-600">{labStats.pending}</h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">In Processing</p>
                <h3 className="text-xl font-bold text-blue-600">{labStats.processing}</h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Reports Ready</p>
                <h3 className="text-xl font-bold text-emerald-600">{labStats.completed}</h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Critical Results</p>
                <h3 className="text-xl font-bold text-rose-600">{labStats.critical}</h3>
              </CardContent>
            </Card>
          </div>

          {activeTab === 'radiology' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 animate-in fade-in duration-300">
              {/* Left Column: X-Ray Report Generator & Scan Upload */}
              <Card className="lg:col-span-2 border-none shadow-md bg-gradient-to-br from-white to-slate-50/50">
                <CardHeader className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <FlaskConical className="w-5 h-5 text-indigo-600 animate-pulse" />
                        Radiologist Interactive RIS Workstation
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Prepare clinical findings, upload scan imaging, and publish verified digital X-Ray reports.
                      </CardDescription>
                    </div>
                    {isRadiologist ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] uppercase font-bold py-1">
                        Active Radiologist Session
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-indigo-600 border-indigo-100 bg-indigo-50/50 text-[10px] font-bold">
                        RIS Workstation Preview
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {/* Select Order */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Select Active Pathology/Radiology Order *</Label>
                      <Select 
                        value={selectedRadioOrder} 
                        onValueChange={(val) => {
                          setSelectedRadioOrder(val);
                          const ord = testOrders.find(o => o.id === val);
                          if (ord) {
                            setRadioFindings(ord.findings || '');
                            setRadioClinicalNotes(ord.clinicalNotes || '');
                            const image = radiologyFiles.find(f => f.orderId === val)?.url || '';
                            setUploadedRadioUrl(image);
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white">
                          <SelectValue placeholder="-- Select Radiology Patient/Order --" />
                        </SelectTrigger>
                        <SelectContent>
                          {testOrders.length === 0 ? (
                            <SelectItem value="none" disabled>No active orders found</SelectItem>
                          ) : (
                            testOrders.map((ord: any) => (
                              <SelectItem key={ord.id} value={ord.id}>
                                {ord.patients?.name || ord.patient || 'Unknown'} - {ord.test_name} (#{ord.id.slice(0, 8)}) [{ord.status}]
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Apply Standard Diagnostic Templates</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          type="button"
                          className="h-9 text-[11px] px-2.5 bg-white border-slate-200"
                          onClick={() => applyRadiologyTemplate('chest-xray')}
                        >
                          Chest X-Ray
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          type="button"
                          className="h-9 text-[11px] px-2.5 bg-white border-slate-200"
                          onClick={() => applyRadiologyTemplate('spine-xray')}
                        >
                          Lumbar Spine
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          type="button"
                          className="h-9 text-[11px] px-2.5 bg-white border-slate-200"
                          onClick={() => applyRadiologyTemplate('usg-abdomen')}
                        >
                          USG Abdomen
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Radiology Scan Upload Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col justify-between p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl relative group">
                      <div>
                        <span className="text-xs font-bold text-slate-600 block mb-1">Upload Scanned X-Ray Report Image</span>
                        <p className="text-[10px] text-muted-foreground mr-4">Select an imaging JPEG/PNG format to overlay onto this digital study.</p>
                      </div>
                      <div className="mt-3 relative flex gap-2">
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={handleWorkstationUpload}
                          accept="image/*"
                          disabled={!selectedRadioOrder}
                        />
                        <Button variant="outline" size="sm" className="h-8 text-xs bg-white pointer-events-none" disabled={!selectedRadioOrder}>
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Choose Scan Image
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          type="button"
                          className="h-8 text-[10px] text-indigo-600 font-semibold"
                          disabled={!selectedRadioOrder}
                          onClick={() => {
                            if (!selectedRadioOrder) {
                              toast.error('Please select an active order first');
                              return;
                            }
                            const seedUrl = `https://picsum.photos/seed/xray_${selectedRadioOrder}/500/500`;
                            const newFile = {
                              id: `rf-seed-${Date.now()}`,
                              orderId: selectedRadioOrder,
                              url: seedUrl,
                              type: 'image/jpeg'
                            };
                            const updated = [newFile, ...radiologyFiles];
                            setRadiologyFiles(updated);
                            storage.set(STORAGE_KEYS.RADIOLOGY_FILES, updated);
                            setUploadedRadioUrl(seedUrl);
                            toast.success('Medical Chest X-ray diagnostic scan placeholder added!');
                          }}
                        >
                          Generate Diagnostic Mock
                        </Button>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center relative min-h-[110px] group">
                      {uploadedRadioUrl ? (
                        <>
                          <img 
                            src={uploadedRadioUrl} 
                            alt="Scan preview" 
                            className="max-h-[140px] w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setUploadedRadioUrl('');
                              setRadiologyFiles(radiologyFiles.filter(f => f.orderId !== selectedRadioOrder));
                              toast.info('Scan removed');
                            }}
                          >
                            ×
                          </Button>
                        </>
                      ) : (
                        <div className="text-center p-3">
                          <ImageIcon className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                          <p className="text-[10px] text-slate-400">No report scan uploaded for current order.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Findings and Clinical Interpretation */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Clinical Findings & Diagnosis Summary *</Label>
                      <textarea 
                        className="w-full min-h-[90px] p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                        value={radioFindings}
                        onChange={(e) => setRadioFindings(e.target.value)}
                        placeholder="State clinical observation, shadow densities, cardiac indices, costophrenic recesses etc..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Impression / Clinical Notes & Recommendations</Label>
                      <textarea 
                        className="w-full min-h-[60px] p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        value={radioClinicalNotes}
                        onChange={(e) => setRadioClinicalNotes(e.target.value)}
                        placeholder="Final radiologist diagnosis. Recommend follow-up scans or specific clinician actions here..."
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Releasing this report automatically publishes it to the primary patient profile and clinician dashboard.
                    </span>
                    <Button 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 h-9 shrink-0 animate-bounce"
                      onClick={handlePublishRadiologyResult}
                      disabled={!selectedRadioOrder || !radioFindings}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Publish & Release X-Ray Result
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Collect Outstanding Radiology Bills */}
              <Card className="border-none shadow-md bg-white">
                <CardHeader className="border-b border-slate-100 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Radiology Outstanding Bill Collector
                  </CardTitle>
                  <CardDescription className="text-xs">
                    View outstanding radiology service receipts, authorize invoicing, and process payments instantly on reception bypass.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Select Outstanding Pending Invoice</Label>
                    <Select 
                      value={selectedBillId} 
                      onValueChange={(val) => setSelectedBillId(val)}
                    >
                      <SelectTrigger className="h-9 text-xs bg-slate-50 border-none">
                        <SelectValue placeholder="-- Select Outstanding Invoice --" />
                      </SelectTrigger>
                      <SelectContent>
                        {bills.filter(b => b.status === 'Pending').length === 0 ? (
                          <SelectItem value="none" disabled>No pending invoices found</SelectItem>
                        ) : (
                          bills.filter(b => b.status === 'Pending').map((bill: any) => (
                            <SelectItem key={bill.id} value={bill.id}>
                              #{bill.id.slice(0, 8)} - {bill.patients?.name || bill.patient} ({formatCurrency(bill.paid_amount || bill.total_amount)})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedBillId && selectedBillId !== 'none' ? (
                    (() => {
                      const activeBill = bills.find(b => b.id === selectedBillId);
                      if (!activeBill) return null;
                      return (
                        <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100/50 space-y-3 animate-in slide-in-from-top-1 duration-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-black text-slate-800">{activeBill.patients?.name || activeBill.patient}</p>
                              <p className="text-[10px] text-muted-foreground">Invoice #{activeBill.id.slice(0, 8)}</p>
                            </div>
                            <Badge className="bg-amber-100 text-amber-700 border-none text-[9px] hover:bg-amber-100 uppercase font-black">
                              Outstanding Payment
                            </Badge>
                          </div>

                          <div className="space-y-1.5 border-t border-emerald-100/30 pt-2 text-[11px] text-slate-600">
                            <div className="flex justify-between font-bold">
                              <span>Radiology Tests:</span>
                              <span className="text-[10px] text-slate-400">Rate Card Base</span>
                            </div>
                            <div className="space-y-1 text-slate-500 font-medium pl-1">
                              {activeBill.invoice_items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-[11px]">
                                  <span>• {item.item_name || item.name}</span>
                                  <span>{formatCurrency(item.unit_price || item.price || 0)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between border-t border-dashed border-emerald-100/60 pt-2 font-black text-slate-800 text-sm">
                              <span>Total Amount Due:</span>
                              <span className="text-emerald-700">{formatCurrency(activeBill.paid_amount || activeBill.total_amount || 250)}</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <Label className="text-[10px] font-bold uppercase text-slate-500">Select Collection Method</Label>
                            <div className="grid grid-cols-4 gap-1">
                              {['Cash', 'Card', 'UPI', 'Insurance'].map((mode) => (
                                <Button
                                  key={mode}
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  className={`h-8 text-[11px] px-0 ${radioBillPaymentMode === mode ? 'bg-emerald-600 border-none text-white hover:bg-emerald-700' : 'bg-white hover:bg-slate-50'}`}
                                  onClick={() => setRadioBillPaymentMode(mode as any)}
                                >
                                  {mode}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-9 font-bold text-xs"
                            onClick={() => handleCollectWorkstationBill(activeBill.id)}
                          >
                            <CreditCard className="w-4 h-4 mr-1.5" />
                            Collect Bill & Process Receipt
                          </Button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl text-center p-4">
                      <Receipt className="w-7 h-7 text-slate-300 mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No active invoice selected</p>
                      <p className="text-[10px] text-slate-400 mt-1">Select an outstanding billing receipt from the list above to process collection.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Test Orders</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search patient or MRN..." 
                    className="pl-10 bg-slate-50 border-none h-9" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="whitespace-nowrap">Order ID</TableHead>
                      <TableHead className="whitespace-nowrap">Patient</TableHead>
                      <TableHead className="whitespace-nowrap">Test Name</TableHead>
                      <TableHead className="whitespace-nowrap">Ordered By</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTab === 'external' ? (
                      externalReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-40 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                              <div className="p-4 bg-slate-50 rounded-full">
                                <FileCheck className="w-10 h-10 text-slate-300" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold">No external reports uploaded</p>
                                <p className="text-xs">Upload reports from other diagnostic centers here.</p>
                              </div>
                              <div className="relative">
                                <input 
                                  type="file" 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                  onChange={handleExternalUpload}
                                  accept="image/*,application/pdf"
                                />
                                <Button variant="outline" size="sm" className="mt-2 text-medical-blue border-medical-blue hover:bg-blue-50">
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload External PDF / Image
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        externalReports.map(report => (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium text-medical-blue">#{report.id}</TableCell>
                            <TableCell>{report.patentName}</TableCell>
                            <TableCell>{report.testName}</TableCell>
                            <TableCell colSpan={2}>{formatDate(report.date)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => window.open(report.url, '_blank')}>
                                <Eye className="w-4 h-4 text-medical-blue" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )
                    ) : filteredOrders.map((test: any) => {
                      const resStatus = getResultStatus(test.result_value || '', test.reference_range || '');
                      return (
                        <TableRow key={test.id} className="border-slate-50">
                          <TableCell className="font-medium text-medical-blue whitespace-nowrap">#{test.id.slice(0, 8)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div>
                              <p className="font-medium">{test.patients?.name}</p>
                              <p className="text-[10px] text-muted-foreground">{formatDate(test.created_at)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{test.test_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{test.profiles?.name || 'Self/Ordered'}</TableCell>
                          <TableCell className="whitespace-nowrap text-center">
                            {test.result_value ? (
                              <div className={`flex flex-col items-center ${
                                resStatus === 'high' ? 'text-rose-600 font-bold' : 
                                resStatus === 'low' ? 'text-amber-600 font-bold' : 
                                'text-slate-700'
                              }`}>
                                <span>{test.result_value} {test.unit}</span>
                                <span className="text-[9px] opacity-70">Ref: {test.reference_range}</span>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="secondary" className={`border-none ${
                              test.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                              test.status === 'Processing' ? 'bg-blue-50 text-blue-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {test.status === 'Completed' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : 
                               test.status === 'Processing' ? <Clock className="w-3 h-3 mr-1" /> : 
                               <AlertCircle className="w-3 h-3 mr-1" />}
                              {test.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              {test.status !== 'Completed' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs gap-1 border-medical-blue text-medical-blue"
                                  onClick={() => {
                                    setEditingResult(test);
                                    setResultData({
                                      value: test.result || '',
                                      findings: test.findings || '',
                                      clinicalNotes: test.clinicalNotes || '',
                                      status: 'Completed'
                                    });
                                    setIsResultDialogOpen(true);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                  Enter Result
                                </Button>
                              )}
                              {test.status === 'Completed' && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-medical-blue" onClick={() => printReport(test)}>
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => printReport(test)}>
                                    <Printer className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {activeTab === 'radiology' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <ImageIcon className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                      <DialogTitle>Radiology Image Viewer</DialogTitle>
                                      <DialogDescription>Viewing digital X-Ray for {test.patient}</DialogDescription>
                                    </DialogHeader>
                                    <div className="aspect-square rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-800 relative group">
                                      <img 
                                        src={radiologyFiles.find(f => f.orderId === test.id)?.url || "https://picsum.photos/seed/xray/800/800"} 
                                        alt="X-Ray" 
                                        className="w-full h-full object-contain opacity-80"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                         <div className="relative">
                                           <input 
                                              type="file" 
                                              className="absolute inset-0 opacity-0 cursor-pointer" 
                                              onChange={(e) => handleRadiologyUpload(e, test.id)}
                                              accept="image/*"
                                           />
                                           <Button variant="secondary" size="sm" className="gap-2">
                                             <Upload className="w-4 h-4" />
                                             Upload X-Ray / Scan
                                           </Button>
                                         </div>
                                      </div>
                                    </div>
                                    <DialogFooter className="flex justify-between sm:justify-between gap-2">
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">Close</Button>
                                      </DialogTrigger>
                                      <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="gap-2">
                                          <Download className="w-4 h-4" />
                                          Download DICOM
                                        </Button>
                                        <Button className="bg-medical-blue" onClick={() => toast.success('Report shared with doctor')}>Share with Doctor</Button>
                                      </div>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
            </>
          )}
        </>
      ) : mainTab === 'setup' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Master Test Configuration</h2>
              <p className="text-xs text-muted-foreground">Define test groups, reference ranges, and units for reports.</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isTestSetupOpen} onOpenChange={(open) => {
                setIsTestSetupOpen(open);
                if (!open) {
                  setEditingTestConfig(null);
                  setTestConfigData({ name: '', category: 'Pathology', price: 0, range: '', unit: '', groupId: 'misc' });
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-medical-blue gap-2" onClick={() => setIsTestSetupOpen(true)}>
                    <Plus className="w-4 h-4" />
                    New Test Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{editingTestConfig ? 'Edit Test' : 'Add New Test Master'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label>Test Name</Label>
                        <Input 
                          placeholder="e.g. CBC, HbA1c" 
                          value={testConfigData.name}
                          onChange={e => setTestConfigData({...testConfigData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={testConfigData.category} onValueChange={v => setTestConfigData({...testConfigData, category: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pathology">Pathology</SelectItem>
                            <SelectItem value="Radiology">Radiology</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Test Group</Label>
                        <Select value={testConfigData.groupId} onValueChange={v => setTestConfigData({...testConfigData, groupId: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {testGroups.map((g: any) => (
                              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Default Price (₹)</Label>
                        <Input 
                          type="number"
                          value={testConfigData.price}
                          onChange={e => setTestConfigData({...testConfigData, price: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Input 
                          placeholder="e.g. g/dL, mg/dL" 
                          value={testConfigData.unit}
                          onChange={e => setTestConfigData({...testConfigData, unit: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Normal Reference Range</Label>
                        <Input 
                          placeholder="e.g. 13.5 - 17.5" 
                          value={testConfigData.range}
                          onChange={e => setTestConfigData({...testConfigData, range: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTestSetupOpen(false)}>Cancel</Button>
                    <Button className="bg-medical-blue" onClick={() => {
                      if (!checkPermission()) return;
                      if (editingTestConfig) {
                        setLabRates(labRates.map((t: any) => t.id === editingTestConfig.id ? { ...t, ...testConfigData } : t));
                        toast.success('Test configuration updated');
                      } else {
                        const newMaster = {
                          ...testConfigData,
                          id: `lt-${Date.now()}`,
                          price: testConfigData.price // ensure price is saved as price
                        };
                        setLabRates([...labRates, newMaster]);
                        toast.success('New test master added');
                      }
                      setIsTestSetupOpen(false);
                    }}>
                      Save Configuration
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-1 border-none shadow-sm h-fit">
              <CardHeader className="pb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground bg-slate-50/50">Test Groups</CardHeader>
              <CardContent className="p-2 space-y-1">
                {testGroups.map((group: any) => (
                  <div 
                    key={group.id} 
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm group cursor-pointer border border-transparent hover:border-slate-100"
                  >
                    <span className="text-sm font-medium">{group.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{labRates.filter((t: any) => t.groupId === group.id).length}</Badge>
                  </div>
                ))}
                <Separator className="my-2" />
                <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-medical-blue h-8 text-xs font-semibold" onClick={() => setIsAddGroupOpen(true)}>
                      <Plus className="w-3 h-3 mr-2" />
                      Add New Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[400px] bg-white rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-bold">Create Test Group</DialogTitle>
                      <DialogDescription className="text-xs text-slate-500">
                        Add a new pathology test group or profile category.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-3 text-xs">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Group Name *</Label>
                        <Input 
                          placeholder="e.g. Immunology" 
                          value={newGroupName} 
                          onChange={e => setNewGroupName(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" size="sm" onClick={() => {
                        setIsAddGroupOpen(false);
                        setNewGroupName('');
                      }}>
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-medical-blue text-white"
                        onClick={() => {
                          if (!newGroupName.trim()) {
                            toast.error('Please enter a group name');
                            return;
                          }
                          const id = newGroupName.trim().toLowerCase().replace(/\s+/g, '-');
                          if (testGroups.some((g: any) => g.id === id)) {
                            toast.error('Group already exists');
                            return;
                          }
                          const updated = [...testGroups, { id, name: newGroupName.trim() }];
                          setTestGroups(updated);
                          storage.set('lab_test_groups', updated);
                          toast.success('Successfully created new test group!');
                          setNewGroupName('');
                          setIsAddGroupOpen(false);
                        }}
                      >
                        Create Group
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card className="md:col-span-3 border-none shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Master</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Range & Unit</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labRates.map((test: any) => (
                      <TableRow key={test.id || test.name}>
                        <TableCell>
                          <p className="font-bold text-sm">{test.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{test.category}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {testGroups.find((g: any) => g.id === test.groupId)?.name || 'Misc'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-medium">{test.range || 'N/A'}</p>
                          <p className="text-[10px] text-muted-foreground">{test.unit || 'No unit'}</p>
                        </TableCell>
                        <TableCell className="text-right font-bold">₹{test.price || test.rate}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingTestConfig(test);
                                setTestConfigData({
                                  name: test.name,
                                  category: test.category,
                                  price: test.price || test.rate,
                                  range: test.range,
                                  unit: test.unit,
                                  groupId: test.groupId
                                });
                                setIsTestSetupOpen(true);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : mainTab === 'appointments' ? (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Scheduled Diagnostic Slots</CardTitle>
            <CardDescription>Appointments booked specifically for Lab & Radiology tests.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.length > 0 ? (
                    appointments.map((apt: any) => (
                      <TableRow key={apt.id}>
                        <TableCell>
                          <Badge variant="outline" className={apt.type === 'RADIOLOGY' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-blue-50 text-blue-600 border-blue-100'}>
                            {apt.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold">{apt.patients?.name || 'Loading...'}</TableCell>
                        <TableCell>{formatDate(apt.appointment_date)}</TableCell>
                        <TableCell>{apt.appointment_time}</TableCell>
                        <TableCell>
                          <Badge className={apt.status === 'Completed' ? 'bg-emerald-500' : 'bg-sky-500'}>
                            {apt.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">No appointments found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : mainTab === 'billing' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm text-white bg-gradient-to-br from-purple-600 to-indigo-700">
              <CardContent className="p-6">
                <p className="text-xs text-white/70 font-bold uppercase tracking-wider mb-1">Today's Lab Collection</p>
                <h3 className="text-3xl font-black">{formatCurrency(stats.todayCollection)}</h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm text-white bg-gradient-to-br from-amber-500 to-orange-600">
              <CardContent className="p-6">
                <p className="text-xs text-white/70 font-bold uppercase tracking-wider mb-1">Pending Lab Bills</p>
                <h3 className="text-3xl font-black">{stats.pendingCount}</h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm text-white bg-gradient-to-br from-blue-600 to-sky-700">
              <CardContent className="p-6">
                <p className="text-xs text-white/70 font-bold uppercase tracking-wider mb-1">Total Tests Billed</p>
                <h3 className="text-3xl font-black">{stats.totalBilled}</h3>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Lab Billing History</CardTitle>
              <Dialog open={isNewBillOpen} onOpenChange={(open) => {
                setIsNewBillOpen(open);
                if (!open) resetBilling();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-medical-blue gap-2 h-9" onClick={() => setIsNewBillOpen(true)}>
                    <Plus className="w-4 h-4" />
                    New Lab Bill
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Generate Lab Bill</DialogTitle>
                    <DialogDescription>Collect payment for lab services.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 relative">
                        <Label>Patient (Search Name/Phone)</Label>
                        <div className="relative">
                          <Input 
                            placeholder="Type name or phone..." 
                            value={patientSearchTerm}
                            onChange={(e) => {
                              setPatientSearchTerm(e.target.value);
                              setShowPatientResults(true);
                              if (e.target.value === '') {
                                setSelectedPatientId('');
                              }
                            }}
                            onFocus={() => setShowPatientResults(true)}
                            className="h-9"
                          />
                          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
                        
                        {showPatientResults && patientSearchTerm.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[180px] overflow-y-auto custom-scrollbar">
                            {patients.filter(p => 
                              p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                              (p.phone && p.phone.includes(patientSearchTerm)) ||
                              (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())
                            ).length > 0 ? (
                              patients.filter(p => 
                                p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                                (p.phone && p.phone.includes(patientSearchTerm)) ||
                                (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())
                              ).map(p => (
                                <div 
                                  key={p.id} 
                                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                                  onClick={() => {
                                    setSelectedPatientId(p.id);
                                    setPatientSearchTerm(p.name);
                                    setShowPatientResults(false);
                                  }}
                                >
                                  <div>
                                    <p className="text-sm font-medium">{p.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{p.phone || 'No phone'}</p>
                                  </div>
                                  {selectedPatientId === p.id && <CheckCircle2 className="w-3 h-3 text-medical-blue" />}
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-center text-xs text-muted-foreground">
                                No patients found.
                              </div>
                            )}
                          </div>
                        )}

                        {selectedPatientId && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                              <User className="h-3 w-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-blue-700 truncate">
                                {patients.find(pat => pat.id === selectedPatientId)?.name}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Add Test</Label>
                          <Select value={billingTestSelectValue} onValueChange={addTestToBill}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select test" />
                            </SelectTrigger>
                            <SelectContent>
                              {labRates.map((t: any) => (
                                <SelectItem key={t.id || t.name} value={t.id || t.name}>{t.name} (₹{t.price || t.rate})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Add Package</Label>
                          <Select 
                            value={billingPkgSelectValue}
                            onValueChange={(val) => {
                              const pkg = LAB_PACKAGES.find(p => p.id === val);
                              if (pkg) {
                                setSelectedTests([...selectedTests, { id: pkg.id, name: pkg.name, price: pkg.price }]);
                              }
                              setTimeout(() => {
                                setBillingPkgSelectValue("");
                              }, 50);
                            }}
                          >
                            <SelectTrigger className="h-9 border-medical-blue text-medical-blue font-semibold">
                              <Package className="w-3 h-3 mr-2" />
                              <SelectValue placeholder="Select package" />
                            </SelectTrigger>
                            <SelectContent>
                              {LAB_PACKAGES.map(pkg => (
                                <SelectItem key={pkg.id} value={pkg.id}>{pkg.name} (₹{pkg.price})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="h-9">Test Name</TableHead>
                            <TableHead className="h-9 text-right">Price</TableHead>
                            <TableHead className="h-9 w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedTests.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No tests added yet</TableCell>
                            </TableRow>
                          ) : (
                            selectedTests.map((test, idx) => (
                              <TableRow key={`${test.id}-${idx}`}>
                                <TableCell className="py-2">{test.name}</TableCell>
                                <TableCell className="py-2 text-right">{formatCurrency(test.price)}</TableCell>
                                <TableCell className="py-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-rose-500"
                                    onClick={() => removeTestFromBill(idx)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
                        <span className="text-sm font-bold text-slate-700">₹{totalBillAmount}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-3 h-3 text-medical-blue" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Discount (%)</span>
                        </div>
                        <Input 
                          type="number" 
                          className="h-8 w-24 text-right text-xs font-bold border-slate-200" 
                          value={discount} 
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          min="0"
                          max="100"
                        />
                      </div>
                      <Separator className="bg-slate-200" />
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-bold text-medical-blue uppercase tracking-widest">Final Bill Amount</span>
                        <div className="text-right">
                          <p className="text-lg font-black text-medical-blue leading-none">₹{finalBillAmount}</p>
                          {discount > 0 && <p className="text-[9px] text-emerald-600 font-bold mt-1">SAVING ₹{totalBillAmount - finalBillAmount}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Mode</Label>
                      <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">cash</SelectItem>
                          <SelectItem value="upi">upi</SelectItem>
                          <SelectItem value="card">card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <DialogTrigger asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogTrigger>
                    <Button 
                      className="bg-medical-blue" 
                      onClick={async () => {
                        const invoice = {
                          patient_id: selectedPatientId,
                          total_amount: totalBillAmount,
                          discount_amount: totalBillAmount - finalBillAmount,
                          paid_amount: finalBillAmount,
                          payment_status: 'Paid',
                          payment_method: paymentMode,
                          status: 'Settled',
                          type: 'Lab'
                        };
                        const invoiceItems = selectedTests.map(t => ({
                          item_name: t.name,
                          quantity: 1,
                          unit_price: t.price,
                          total_price: t.price,
                          category: 'LAB'
                        }));

                        const result = await supabaseService.createInvoice(invoice, invoiceItems);
                        if (result) {
                          toast.success('Lab payment collected successfully');
                          resetBilling();
                          setIsNewBillOpen(false);
                          fetchData();
                        } else {
                          toast.error('Failed to collect payment');
                        }
                      }}
                      disabled={!selectedPatientId || selectedTests.length === 0}
                    >
                      Collect {formatCurrency(finalBillAmount)}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="whitespace-nowrap">Bill ID</TableHead>
                      <TableHead className="whitespace-nowrap">Patient</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => (
                      <TableRow key={bill.id} className="border-slate-50">
                        <TableCell className="font-medium text-medical-blue whitespace-nowrap">#{bill.id.slice(0, 8)}</TableCell>
                        <TableCell className="whitespace-nowrap">{bill.patients?.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(bill.created_at)}</TableCell>
                        <TableCell className="font-bold whitespace-nowrap">{formatCurrency(bill.paid_amount)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none">
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => printBill(bill)}>
                              <Printer className="w-4 h-4" />
                            </Button>
                            {!isDeleteForbidden && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteBill(bill.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Enter Test Results</DialogTitle>
            <DialogDescription>
              Patient: {editingResult?.patients?.name} | Test: {editingResult?.test_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Result Value</Label>
                  <div className="flex gap-2 items-center">
                    <Input 
                      value={resultData.value} 
                      onChange={e => setResultData({...resultData, value: e.target.value})}
                      placeholder="e.g. 14.5"
                      className={`text-lg font-bold ${
                        getResultStatus(resultData.value, editingResult?.range) === 'high' ? 'border-rose-500 text-rose-600 bg-rose-50' :
                        getResultStatus(resultData.value, editingResult?.range) === 'low' ? 'border-amber-500 text-amber-600 bg-amber-50' :
                        ''
                      }`}
                    />
                    <span className="font-medium text-slate-500 shrink-0">{editingResult?.unit || ''}</span>
                  </div>
                </div>
                
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Normal Range</span>
                    <Badge variant="outline" className="text-[10px]">{editingResult?.unit || 'No unit'}</Badge>
                  </div>
                  <p className="text-sm font-black text-slate-700">{editingResult?.range || 'Direct Observation'}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Based on lab master configuration.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={resultData.status} onValueChange={v => setResultData({...resultData, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Completed">Completed & Released</SelectItem>
                      <SelectItem value="Processing">Partially Ready</SelectItem>
                      <SelectItem value="High Risk">Flag Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {getResultStatus(resultData.value, editingResult?.range) !== 'normal' && resultData.value && (
                  <div className={`p-2 rounded-md flex items-center gap-2 animate-in fade-in duration-300 ${
                    getResultStatus(resultData.value, editingResult?.range) === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Result is {getResultStatus(resultData.value, editingResult?.range)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Findings / Remarks</Label>
              <Input 
                value={resultData.findings} 
                onChange={e => setResultData({...resultData, findings: e.target.value})}
                placeholder="Observed findings..."
              />
            </div>
            <div className="space-y-2">
              <Label>Clinical Notes</Label>
              <textarea 
                className="w-full min-h-[80px] p-2 bg-slate-50 border border-slate-200 rounded-md text-sm"
                value={resultData.clinicalNotes}
                onChange={e => setResultData({...resultData, clinicalNotes: e.target.value})}
                placeholder="Doctor's reference notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>Cancel</Button>
            <Button className="bg-medical-blue" onClick={handleSaveResult}>Save Results</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
