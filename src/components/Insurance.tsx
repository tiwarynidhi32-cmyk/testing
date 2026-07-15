import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileCheck,
  UserCheck,
  User,
  Printer,
  Loader2,
  Coins,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Building,
  Check,
  X,
  CreditCard,
  FileSpreadsheet
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
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
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { storage } from '@/lib/storage';

const STORAGE_KEYS_STAFF_PAYABLES = 'hms_staff_payables';
const STORAGE_KEYS_SEEDED = 'hms_insurance_and_payouts_seeded';

export default function Insurance() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'claims' | 'payables' | 'ledger' | 'discharge'>('claims');
  
  const [insuranceRecords, setInsuranceRecords] = useState<any[]>([]);
  const [dischargeRecords, setDischargeRecords] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffPayables, setStaffPayables] = useState<any[]>([]);
  const [hospitalInfo, setHospitalInfo] = useState<any>({
    name: 'Gastro Plus Hospital',
    address: 'Gastro Plus Hospital ,Infront of Aura Inn Bansi Road Basti',
    phone: '+91 6394517005',
    email: 'info@gastroplushospital.com',
    logo: null
  });
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterPayableStatus, setFilterPayableStatus] = useState<string>('all');

  // Dialog states
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);
  const [isProcessPayoutOpen, setIsProcessPayoutOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);

  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);

  // Form states
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  
  const [newClaim, setNewClaim] = useState({
    patientId: '',
    policyNo: '',
    insuranceCompany: '',
    tpaName: '',
    insuranceLimit: '',
    corporateType: 'Insurance TPA' as 'Insurance TPA' | 'Corporate Direct',
    procedureName: '',
    procedureCost: '',
    date: new Date().toISOString().split('T')[0],
    payableSplits: [] as Array<{ staffId: string, staffName: string, role: string, amount: string }>
  });

  const [paymentForm, setPaymentForm] = useState({
    approvedAmount: '',
    tdsDeducted: '0',
    utrNo: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [payoutForm, setPayoutForm] = useState({
    paymentMode: 'Net Banking' as 'Net Banking' | 'UPI' | 'Cash' | 'Cheque',
    utrNo: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const fetchData = async () => {
    try {
      const isInitial = insuranceRecords.length === 0;
      if (isInitial) setLoading(true);

      const [insuranceData, patientsData, hospitalData, staffData] = await Promise.all([
        supabaseService.getInsuranceClaims(),
        supabaseService.getPatients(),
        supabaseService.getHospitalInfo(),
        supabaseService.getStaff ? supabaseService.getStaff() : Promise.resolve([])
      ]);

      if (patientsData) setPatients(patientsData);
      if (hospitalData) setHospitalInfo(hospitalData);
      if (staffData) setStaffList(staffData);

      // Setup seeded data if first time
      const isSeeded = storage.get(STORAGE_KEYS_SEEDED, false);
      let activeClaims = insuranceData || [];
      let activePayables = storage.get(STORAGE_KEYS_STAFF_PAYABLES, []);

      if (!isSeeded || activeClaims.length === 0) {
        // Prepare beautiful seed data linked to patient IDs if possible
        const p1 = patientsData?.[0]?.id || 'p-seed-1';
        const p2 = patientsData?.[1]?.id || 'p-seed-2';
        const p3 = patientsData?.[2]?.id || 'p-seed-3';

        const seedClaims = [
          {
            id: 'claim-corp-1',
            patient_id: p1,
            patientId: p1,
            policy_no: 'POL-CGHS-99211',
            policyNo: 'POL-CGHS-99211',
            insurance_company: 'CGHS Central Govt Health Scheme',
            insuranceCompany: 'CGHS Central Govt Health Scheme',
            tpa_name: 'CGHS Delhi Division',
            tpaName: 'CGHS Delhi Division',
            insurance_limit: 55000,
            insuranceLimit: 55000,
            approved_amount: 50000,
            approvedAmount: 50000,
            corporateType: 'Corporate Direct',
            procedureName: 'Laparoscopic Cholecystectomy',
            procedureCost: 55000,
            receivedAmount: 49000,
            tdsDeducted: 1000,
            utrNo: 'UTRIBIN202607058821',
            status: 'Approved',
            claim_date: '2026-07-01',
            date: '2026-07-01'
          },
          {
            id: 'claim-corp-2',
            patient_id: p2,
            patientId: p2,
            policy_no: 'POL-STAR-88122',
            policyNo: 'POL-STAR-88122',
            insurance_company: 'Star Health Insurance',
            insuranceCompany: 'Star Health Insurance',
            tpa_name: 'MediAssist TPA',
            tpaName: 'MediAssist TPA',
            insurance_limit: 40000,
            insuranceLimit: 40000,
            approved_amount: 40000,
            approvedAmount: 40000,
            corporateType: 'Insurance TPA',
            procedureName: 'Open Hernia Repair',
            procedureCost: 45000,
            receivedAmount: 40000,
            tdsDeducted: 0,
            utrNo: 'UTRSTAR202607071120',
            status: 'Approved',
            claim_date: '2026-07-02',
            date: '2026-07-02'
          },
          {
            id: 'claim-corp-3',
            patient_id: p3,
            patientId: p3,
            policy_no: 'POL-RELIANCE-11234',
            policyNo: 'POL-RELIANCE-11234',
            insurance_company: 'Reliance Industries Contract',
            insuranceCompany: 'Reliance Industries Contract',
            tpa_name: 'Reliance Health TPA',
            tpaName: 'Reliance Health TPA',
            insurance_limit: 65000,
            insuranceLimit: 65000,
            approved_amount: 0,
            approvedAmount: 0,
            corporateType: 'Corporate Direct',
            procedureName: 'Emergency Appendectomy',
            procedureCost: 65000,
            receivedAmount: 0,
            tdsDeducted: 0,
            status: 'Pending',
            claim_date: '2026-07-03',
            date: '2026-07-03'
          }
        ];

        const seedPayables = [
          {
            id: 'pay-1-1',
            claimId: 'claim-corp-1',
            patientName: patientsData?.[0]?.name || 'Arjun Mehta',
            procedureName: 'Laparoscopic Cholecystectomy',
            staffId: 'staff-1',
            staffName: 'Dr. Rajesh Sharma',
            role: 'Surgeon',
            payableAmount: 15000,
            status: 'Paid Out',
            paidAt: '2026-07-06',
            disbursementMode: 'Net Banking',
            disbursementUtr: 'PAYOUT-RAJESH-991',
            disbursementNotes: 'Direct bank settlement'
          },
          {
            id: 'pay-1-2',
            claimId: 'claim-corp-1',
            patientName: patientsData?.[0]?.name || 'Arjun Mehta',
            procedureName: 'Laparoscopic Cholecystectomy',
            staffId: 'staff-2',
            staffName: 'Dr. Alok Verma',
            role: 'Anesthetist',
            payableAmount: 5000,
            status: 'Paid Out',
            paidAt: '2026-07-06',
            disbursementMode: 'UPI',
            disbursementUtr: 'PAYOUT-ALOK-221',
            disbursementNotes: 'Disbursed to Dr. Alok'
          },
          {
            id: 'pay-2-1',
            claimId: 'claim-corp-2',
            patientName: patientsData?.[1]?.name || 'Ananya Iyer',
            procedureName: 'Open Hernia Repair',
            staffId: 'staff-1',
            staffName: 'Dr. Rajesh Sharma',
            role: 'Surgeon',
            payableAmount: 12000,
            status: 'Ready for Payout'
          },
          {
            id: 'pay-2-2',
            claimId: 'claim-corp-2',
            patientName: patientsData?.[1]?.name || 'Ananya Iyer',
            procedureName: 'Open Hernia Repair',
            staffId: 'staff-3',
            staffName: 'Nurse Deepika Roy',
            role: 'Scrub Nurse',
            payableAmount: 2000,
            status: 'Ready for Payout'
          },
          {
            id: 'pay-3-1',
            claimId: 'claim-corp-3',
            patientName: patientsData?.[2]?.name || 'Rajesh Kumar',
            procedureName: 'Emergency Appendectomy',
            staffId: 'staff-4',
            staffName: 'Dr. Sarah Sharma',
            role: 'Surgeon',
            payableAmount: 18000,
            status: 'Pending Corporate Payment'
          },
          {
            id: 'pay-3-2',
            claimId: 'claim-corp-3',
            patientName: patientsData?.[2]?.name || 'Rajesh Kumar',
            procedureName: 'Emergency Appendectomy',
            staffId: 'staff-2',
            staffName: 'Dr. Alok Verma',
            role: 'Anesthetist',
            payableAmount: 6000,
            status: 'Pending Corporate Payment'
          }
        ];

        // Seed to local fallbacks to show real corporate features
        for (const c of seedClaims) {
          await supabaseService.createInsuranceClaim(c);
        }
        storage.set(STORAGE_KEYS_STAFF_PAYABLES, seedPayables);
        storage.set(STORAGE_KEYS_SEEDED, true);
        
        activeClaims = seedClaims;
        activePayables = seedPayables;
      }

      // Deduplicate claims and payables to avoid duplicate keys in React render loops
      const uniqueClaims: any[] = [];
      const seenClaimIds = new Set();
      for (const c of activeClaims) {
        if (c && c.id && !seenClaimIds.has(c.id)) {
          seenClaimIds.add(c.id);
          uniqueClaims.push(c);
        }
      }

      const uniquePayables: any[] = [];
      const seenPayableIds = new Set();
      for (const p of activePayables) {
        if (p && p.id && !seenPayableIds.has(p.id)) {
          seenPayableIds.add(p.id);
          uniquePayables.push(p);
        }
      }

      setInsuranceRecords(uniqueClaims);
      setStaffPayables(uniquePayables);

      // Normal Patient Discharge Mapping
      if (patientsData) {
        const uniqueDischarge: any[] = [];
        const seenDischargeIds = new Set();
        patientsData
          .filter(p => (p.status || '').toLowerCase() === 'discharge' || (p.status || '').toLowerCase() === 'waiting')
          .forEach(p => {
            if (p && p.id && !seenDischargeIds.has(p.id)) {
              seenDischargeIds.add(p.id);
              uniqueDischarge.push({
                id: p.id,
                patientId: p.id,
                name: p.name,
                nurseVerification: 'Verified',
                accountantVerification: p.billing_status === 'Paid' ? 'Verified' : 'Pending'
              });
            }
          });
        setDischargeRecords(uniqueDischarge);
      }
    } catch (err: any) {
      toast.error('Error fetching billing records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useDataSync(fetchData);

  // Financial statistics calculation
  const stats = useMemo(() => {
    let totalApprovedClaimsVal = 0;
    let totalReceivedClaimsVal = 0;
    let totalTdsVal = 0;
    let totalDisbursedVal = 0;
    let totalPendingDisbursalVal = 0;

    insuranceRecords.forEach(rec => {
      const approvedAmt = parseFloat(rec.approvedAmount || rec.approved_amount || '0');
      totalApprovedClaimsVal += approvedAmt;
      
      if ((rec.status || '').toLowerCase() === 'approved') {
        const receivedAmt = parseFloat(rec.receivedAmount || approvedAmt || '0');
        totalReceivedClaimsVal += receivedAmt;
        totalTdsVal += parseFloat(rec.tdsDeducted || '0');
      }
    });

    staffPayables.forEach(p => {
      if (p.status === 'Paid Out') {
        totalDisbursedVal += parseFloat(p.payableAmount || '0');
      } else if (p.status === 'Ready for Payout') {
        totalPendingDisbursalVal += parseFloat(p.payableAmount || '0');
      }
    });

    const netHospitalKeep = totalReceivedClaimsVal - totalDisbursedVal - totalPendingDisbursalVal;

    return {
      approvedClaims: totalApprovedClaimsVal,
      receivedClaims: totalReceivedClaimsVal,
      tds: totalTdsVal,
      disbursed: totalDisbursedVal,
      pendingDisbursal: totalPendingDisbursalVal,
      netMargin: netHospitalKeep
    };
  }, [insuranceRecords, staffPayables]);

  // Submit new Claim (including doctor payables)
  const handleCreateClaim = async () => {
    if (!newClaim.patientId || !newClaim.insuranceCompany || !newClaim.procedureCost) {
      toast.error('Please enter patient, corporate partner and total procedure cost');
      return;
    }

    const patientObj = patients.find(p => p.id === newClaim.patientId);
    const claimId = 'claim-' + Math.random().toString(36).substring(2, 9);
    
    const claimData = {
      id: claimId,
      patient_id: newClaim.patientId,
      patientId: newClaim.patientId,
      policy_no: newClaim.policyNo,
      policyNo: newClaim.policyNo,
      insurance_company: newClaim.insuranceCompany,
      insuranceCompany: newClaim.insuranceCompany,
      tpa_name: newClaim.tpaName,
      tpaName: newClaim.tpaName,
      insurance_limit: parseFloat(newClaim.insuranceLimit || '0'),
      insuranceLimit: parseFloat(newClaim.insuranceLimit || '0'),
      approved_amount: 0,
      approvedAmount: 0,
      status: 'Pending',
      claim_date: newClaim.date,
      date: newClaim.date,
      corporateType: newClaim.corporateType,
      procedureName: newClaim.procedureName,
      procedureCost: parseFloat(newClaim.procedureCost || '0'),
      receivedAmount: 0,
      tdsDeducted: 0
    };

    const result = await supabaseService.createInsuranceClaim(claimData);
    if (result) {
      // Save doctor payables splits
      const newPayables = [...staffPayables];
      newClaim.payableSplits.forEach((split, index) => {
        newPayables.push({
          id: `pay-${claimId}-${index}-${Math.random().toString(36).substring(2, 5)}`,
          claimId: claimId,
          patientName: patientObj?.name || 'Unknown',
          procedureName: newClaim.procedureName || 'Procedure',
          staffId: split.staffId,
          staffName: split.staffName,
          role: split.role,
          payableAmount: parseFloat(split.amount || '0'),
          status: 'Pending Corporate Payment'
        });
      });

      storage.set(STORAGE_KEYS_STAFF_PAYABLES, newPayables);
      toast.success('Corporate claim & doctor splits successfully recorded!');
      setIsNewClaimOpen(false);
      
      // Reset form
      setNewClaim({
        patientId: '',
        policyNo: '',
        insuranceCompany: '',
        tpaName: '',
        insuranceLimit: '',
        corporateType: 'Insurance TPA',
        procedureName: '',
        procedureCost: '',
        date: new Date().toISOString().split('T')[0],
        payableSplits: []
      });
      setPatientSearchTerm('');
      fetchData();
    } else {
      toast.error('Failed to create claim');
    }
  };

  // Submit Receive Corporate Payment
  const handleReceivePaymentSubmit = () => {
    if (!paymentForm.approvedAmount || !paymentForm.utrNo) {
      toast.error('Please enter approved amount and transaction UTR code');
      return;
    }

    const appAmt = parseFloat(paymentForm.approvedAmount);
    const tds = parseFloat(paymentForm.tdsDeducted || '0');
    const recAmt = appAmt - tds;

    // Update claim
    const updatedClaims = insuranceRecords.map((rec: any) => {
      if (rec.id === selectedClaim.id) {
        return {
          ...rec,
          status: 'Approved',
          approved_amount: appAmt,
          approvedAmount: appAmt,
          receivedAmount: recAmt,
          tdsDeducted: tds,
          utrNo: paymentForm.utrNo,
          payment_received_date: paymentForm.date
        };
      }
      return rec;
    });

    // Update associated staff payables state to Ready for Payout
    const updatedPayables = staffPayables.map((p: any) => {
      if (p.claimId === selectedClaim.id) {
        return {
          ...p,
          status: 'Ready for Payout'
        };
      }
      return p;
    });

    storage.set(STORAGE_KEYS_STAFF_PAYABLES, updatedPayables);
    // Since we're using fallback local storage syncing, save the main claim records there too
    storage.set('hms_insurance', updatedClaims);

    toast.success(`Successfully received corporate payment of ${formatCurrency(recAmt)}. Doctors splits are now unlocked!`);
    setIsReceivePaymentOpen(false);
    fetchData();
  };

  // Process Doctor Disbursal Payment
  const handleProcessPayoutSubmit = () => {
    if (!payoutForm.utrNo) {
      toast.error('Please enter payment Transaction Ref / UTR number');
      return;
    }

    const updatedPayables = staffPayables.map((p: any) => {
      if (p.id === selectedPayable.id) {
        return {
          ...p,
          status: 'Paid Out',
          paidAt: payoutForm.date,
          disbursementMode: payoutForm.paymentMode,
          disbursementUtr: payoutForm.utrNo,
          disbursementNotes: payoutForm.notes
        };
      }
      return p;
    });

    storage.set(STORAGE_KEYS_STAFF_PAYABLES, updatedPayables);
    toast.success(`Disbursed payment of ${formatCurrency(selectedPayable.payableAmount)} to ${selectedPayable.staffName} successfully!`);
    setIsProcessPayoutOpen(false);
    fetchData();
  };

  // Delete a Claim & its associated splits
  const handleDeleteClaim = async (id: string) => {
    if (confirm('Are you sure you want to delete this corporate claim and all its associated staff payable records?')) {
      const result = await supabaseService.deleteInsuranceClaim(id);
      if (result) {
        const filteredPayables = staffPayables.filter(p => p.claimId !== id);
        storage.set(STORAGE_KEYS_STAFF_PAYABLES, filteredPayables);
        toast.success('Corporate claim and splits deleted');
        fetchData();
      } else {
        toast.error('Failed to delete claim');
      }
    }
  };

  // Print Payout Voucher
  const printPayoutVoucher = (payable: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Disbursement Voucher - ${payable.staffName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #334155; }
            .voucher-container { border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; max-width: 700px; margin: 0 auto; background-color: #f8fafc; }
            .header { text-align: center; border-bottom: 3px double #3b82f6; padding-bottom: 20px; margin-bottom: 25px; }
            .hospital-name { font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
            .title { text-align: center; font-size: 16px; font-weight: 700; color: #0f172a; border: 1px solid #94a3b8; display: inline-block; padding: 6px 16px; border-radius: 6px; margin-top: 10px; background-color: #f1f5f9; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; margin-bottom: 25px; padding: 15px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; }
            .section-title { font-size: 14px; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .amount-box { text-align: center; margin: 25px 0; padding: 15px; border-radius: 8px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 22px; font-weight: 800; }
            .footer-sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; text-align: center; font-size: 12px; }
            .sig-line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 6px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="voucher-container">
            <div class="header">
              <div class="hospital-name">${hospitalInfo.name}</div>
              <div style="font-size:12px; color: #64748b;">${hospitalInfo.address} | Tel: ${hospitalInfo.phone}</div>
              <div class="title">DOCTOR & STAFF DISBURSEMENT VOUCHER</div>
            </div>
            
            <div class="meta-grid">
              <div><strong>Voucher ID:</strong> VOUCH-${payable.id?.toUpperCase().substring(0,8)}</div>
              <div><strong>Disbursement Date:</strong> ${formatDate(payable.paidAt)}</div>
              <div><strong>Staff / Clinician:</strong> ${payable.staffName} (${payable.role})</div>
              <div><strong>Payment Mode:</strong> ${payable.disbursementMode}</div>
              <div><strong>Bank UTR / Ref No:</strong> ${payable.disbursementUtr}</div>
              <div><strong>Related Case:</strong> Patient ${payable.patientName} (${payable.procedureName})</div>
            </div>

            <div class="section-title">Payment Settlement Details</div>
            <div style="font-size: 13px; line-height: 1.6; background-color: white; padding: 15px; border-radius:8px; border: 1px solid #e2e8f0;">
              This voucher acknowledges the formal fee payout split to <strong>${payable.staffName}</strong>. 
              The settlement is disbursed post-receipt of corporate health clearance and verification of procedure logs. 
              <br/><br/>
              <strong>Remarks:</strong> ${payable.disbursementNotes || 'Standard revenue split settlement.'}
            </div>

            <div class="amount-box">
              ₹${payable.payableAmount?.toLocaleString('en-IN') || '0'}.00
            </div>

            <div class="footer-sigs">
              <div>
                <div class="sig-line">Prepared & Verified By (Accountant)</div>
              </div>
              <div>
                <div class="sig-line">Recipient / Doctor Signature</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Print Complete Financial Ledger
  const printFinancialLedger = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Corporate Accounts Ledger</title>
          <style>
            body { font-family: sans-serif; padding: 30px; color: #333; }
            h1 { color: #1e3a8a; text-align: center; font-size: 20px; margin-bottom: 2px; }
            .subtitle { text-align: center; font-size: 11px; color: #666; margin-bottom: 25px; }
            .kpis { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 25px; }
            .kpi-card { flex: 1; border: 1px solid #ddd; padding: 12px; border-radius: 6px; text-align: center; }
            .kpi-title { font-size: 10px; text-transform: uppercase; color: #666; font-weight: bold; }
            .kpi-val { font-size: 16px; font-weight: 800; margin-top: 4px; color: #111; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
            th { background: #f1f5f9; color: #1e3a8a; text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>${hospitalInfo.name}</h1>
          <div class="subtitle">Corporate Accounts Ledger & Splits Settlement Summary (${new Date().toLocaleDateString()})</div>
          
          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-title">Total Claims Approved</div>
              <div class="kpi-val">₹${stats.approvedClaims.toLocaleString('en-IN')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Funds Received</div>
              <div class="kpi-val">₹${stats.receivedClaims.toLocaleString('en-IN')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">TDS Deducted</div>
              <div class="kpi-val">₹${stats.tds.toLocaleString('en-IN')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Disbursed to Staff</div>
              <div class="kpi-val">₹${stats.disbursed.toLocaleString('en-IN')}</div>
            </div>
            <div class="kpi-card" style="background:#ecfdf5;">
              <div class="kpi-title" style="color:#065f46;">Hospital Keep</div>
              <div class="kpi-val" style="color:#047857;">₹${stats.netMargin.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <h3>Active Claims Summary</h3>
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Corporate Partner</th>
                <th>Procedure</th>
                <th>Claim Cost</th>
                <th>Limit</th>
                <th>Approved</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${insuranceRecords.map(r => `
                <tr>
                  <td>${patients.find(p => p.id === r.patientId)?.name || 'Unknown'}</td>
                  <td>${r.insuranceCompany}</td>
                  <td>${r.procedureName || 'N/A'}</td>
                  <td>₹${(r.procedureCost || 0).toLocaleString('en-IN')}</td>
                  <td>₹${(r.insuranceLimit || 0).toLocaleString('en-IN')}</td>
                  <td>₹${(r.approvedAmount || 0).toLocaleString('en-IN')}</td>
                  <td><strong>${r.status}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 40px; text-align: right; font-size: 11px;">
            <strong>Authorized Accountant Signature:</strong> _____________________________
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const printDischargeSummary = (record: any) => {
    const patient = patients.find(p => p.id === record.patientId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Discharge Summary - ${record.name}</title>
          <style>
            @page { margin: 0; }
            body { font-family: sans-serif; margin: 0; padding: 40px; color: #333; }
            .hospital-info { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
            .title { text-align: center; font-size: 22px; font-weight: bold; text-decoration: underline; margin-bottom: 30px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; border: 1px solid #eee; padding: 15px; border-radius: 8px; font-size: 14px; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; color: #1E6FA8; }
            .text { font-size: 14px; line-height: 1.6; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 20px; }
            .signature { text-align: center; width: 220px; font-size: 12px; }
            .sig-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="content">
            <div class="hospital-info">
              <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${hospitalInfo.name}</div>
              <div>${hospitalInfo.address}</div>
              <div>Contact: ${hospitalInfo.phone} | Email: ${hospitalInfo.email}</div>
            </div>
            <div class="title">DISCHARGE SUMMARY</div>
            <div class="grid">
              <div><strong>Patient Name:</strong> ${record.name}</div>
              <div><strong>MRN:</strong> ${patient?.mrn || 'N/A'}</div>
              <div><strong>Age / Gender:</strong> ${patient?.age || '--'} / ${patient?.gender || '--'}</div>
              <div><strong>Patient ID:</strong> ${record.patientId?.substring(0, 8).toUpperCase()}</div>
              <div><strong>Discharge Date:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
            <div class="section">
              <div class="section-title">Condition at Discharge</div>
              <div class="text">Patient is hemodynamically stable, afebrile, and tolerating oral diet. Discharge clearance granted.</div>
            </div>
            <div class="footer">
              <div class="signature"><div class="sig-line">Patient / Relative Signature</div></div>
              <div class="signature"><div class="sig-line">Authorized Signatory / RMO</div></div>
              <div class="signature"><div class="sig-line">Consultant Signature</div></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Filters calculation
  const filteredInsuranceAll = insuranceRecords.filter(record => {
    const patient = patients.find(p => p.id === record.patientId);
    const matchesSearch = (patient?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (record.policyNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (patient?.mrn || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || record.corporateType === filterType;
    const matchesStatus = filterStatus === 'all' || (
      filterStatus === 'Approved' ? record.status === 'Approved' : record.status === 'Pending'
    );
    return matchesSearch && matchesType && matchesStatus;
  });

  const seenClaimsFront = new Set();
  const filteredInsurance = filteredInsuranceAll.filter(record => {
    if (!record || !record.id) return true;
    if (seenClaimsFront.has(record.id)) return false;
    seenClaimsFront.add(record.id);
    return true;
  });

  const filteredPayables = staffPayables.filter(p => {
    const matchesStaff = filterStaff === 'all' || p.staffId === filterStaff;
    const matchesStatus = filterPayableStatus === 'all' || p.status === filterPayableStatus;
    const matchesSearch = p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.procedureName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.staffName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStaff && matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 font-medium">Loading Corporate Accounts & Ledgers...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building className="w-6 h-6 text-indigo-600" />
            Corporate & TPA Accounts
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage corporate contracts, procedure billing approval tracking, and doctor payout settlement splits.
          </p>
        </div>
        
        <div className="flex gap-2">
          {activeTab === 'ledger' && (
            <Button variant="outline" className="gap-2 text-indigo-700 border-indigo-200" onClick={printFinancialLedger}>
              <Printer className="w-4 h-4" />
              Print Ledger Statement
            </Button>
          )}
          <Dialog open={isNewClaimOpen} onOpenChange={(open) => {
            setIsNewClaimOpen(open);
            if(!open) {
              setPatientSearchTerm('');
              setShowPatientResults(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="w-4 h-4" />
                New Corporate Claim
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg text-indigo-900 font-bold">New Corporate / TPA Billing Log</DialogTitle>
                <DialogDescription>Initialize a patient pre-authorization under corporate coverage with revenue shares.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-3">
                {/* Billing Type Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Billing Class</Label>
                    <select 
                      className="w-full text-xs h-9 border rounded-md px-3 bg-white focus:border-indigo-500"
                      value={newClaim.corporateType}
                      onChange={(e) => setNewClaim({...newClaim, corporateType: e.target.value as any})}
                    >
                      <option value="Insurance TPA">Insurance TPA Cover</option>
                      <option value="Corporate Direct">Corporate Direct Contract</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Claim Log Date</Label>
                    <Input 
                      type="date"
                      className="h-9 text-xs"
                      value={newClaim.date}
                      onChange={(e) => setNewClaim({...newClaim, date: e.target.value})}
                    />
                  </div>
                </div>

                {/* Patient Search */}
                <div className="space-y-1.5 relative">
                  <Label className="text-xs font-bold">Patient Link (Search Name/MRN)</Label>
                  <div className="relative">
                    <Input 
                      placeholder="Type patient's name..." 
                      className="h-9 text-xs pl-8"
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientResults(true);
                      }}
                      onFocus={() => setShowPatientResults(true)}
                    />
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  </div>

                  {showPatientResults && patientSearchTerm.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[160px] overflow-y-auto">
                      {patients.filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase())).map(p => (
                        <div 
                          key={p.id}
                          className="px-3 py-1.5 hover:bg-indigo-50 cursor-pointer text-xs border-b last:border-0"
                          onClick={() => {
                            setNewClaim({...newClaim, patientId: p.id});
                            setPatientSearchTerm(p.name);
                            setShowPatientResults(false);
                          }}
                        >
                          <div className="font-bold text-slate-800">{p.name}</div>
                          <div className="text-[10px] text-slate-500">MRN: {p.mrn} • Phone: {p.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {newClaim.patientId && (
                    <div className="p-2 bg-indigo-50/50 border border-indigo-100 rounded text-[11px] flex justify-between items-center">
                      <span>Linked Patient: <strong>{patients.find(p => p.id === newClaim.patientId)?.name}</strong></span>
                      <Button variant="ghost" className="h-5 p-1 text-slate-400 hover:text-rose-500" onClick={() => setNewClaim({...newClaim, patientId: ''})}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Corporate Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Corporate Company / Insurer *</Label>
                    <Input 
                      placeholder="e.g. Star Health / Reliance Contract"
                      className="h-9 text-xs"
                      value={newClaim.insuranceCompany}
                      onChange={(e) => setNewClaim({...newClaim, insuranceCompany: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Policy / Employee ID</Label>
                    <Input 
                      placeholder="e.g. POL-102923"
                      className="h-9 text-xs"
                      value={newClaim.policyNo}
                      onChange={(e) => setNewClaim({...newClaim, policyNo: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">TPA Desk Coordinator</Label>
                    <Input 
                      placeholder="e.g. MediAssist Desk"
                      className="h-9 text-xs"
                      value={newClaim.tpaName}
                      onChange={(e) => setNewClaim({...newClaim, tpaName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Approved Limits Amount (₹)</Label>
                    <Input 
                      type="number"
                      placeholder="0.00"
                      className="h-9 text-xs"
                      value={newClaim.insuranceLimit}
                      onChange={(e) => setNewClaim({...newClaim, insuranceLimit: e.target.value})}
                    />
                  </div>
                </div>

                {/* Procedure Specifics */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Procedure / Surgery Name</Label>
                    <Input 
                      placeholder="e.g. Open Hernia Repair"
                      className="h-9 text-xs bg-white"
                      value={newClaim.procedureName}
                      onChange={(e) => setNewClaim({...newClaim, procedureName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Total Bill / Procedure Cost (₹) *</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 45000"
                      className="h-9 text-xs bg-white font-bold"
                      value={newClaim.procedureCost}
                      onChange={(e) => setNewClaim({...newClaim, procedureCost: e.target.value})}
                    />
                  </div>
                </div>

                {/* Staff Splits Record Keeping */}
                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Clinician & Staff Payable Splits</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-[10px] gap-1 text-indigo-600 hover:bg-indigo-50"
                      onClick={() => {
                        setNewClaim({
                          ...newClaim,
                          payableSplits: [...newClaim.payableSplits, { staffId: '', staffName: '', role: 'Surgeon', amount: '' }]
                        });
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Split Row
                    </Button>
                  </div>

                  {newClaim.payableSplits.length === 0 ? (
                    <div className="text-center py-4 bg-slate-50 rounded border border-dashed text-slate-400 text-xs">
                      No clinician payouts mapped yet. Add row to capture doctor payables.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {newClaim.payableSplits.map((split, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <select
                            className="text-xs h-8 border rounded px-2 flex-1 bg-white"
                            value={split.staffId}
                            onChange={(e) => {
                              const staffObj = staffList.find(s => s.id === e.target.value);
                              const updated = [...newClaim.payableSplits];
                              updated[i] = { 
                                ...updated[i], 
                                staffId: e.target.value, 
                                staffName: staffObj ? (staffObj.name || staffObj.fullName) : ''
                              };
                              setNewClaim({...newClaim, payableSplits: updated});
                            }}
                          >
                            <option value="">-- Choose Doctor/Staff --</option>
                            {staffList.map(s => (
                              <option key={s.id} value={s.id}>{s.name || s.fullName} ({s.role || 'Staff'})</option>
                            ))}
                          </select>

                          <select
                            className="text-xs h-8 border rounded px-2 w-28 bg-white"
                            value={split.role}
                            onChange={(e) => {
                              const updated = [...newClaim.payableSplits];
                              updated[i].role = e.target.value;
                              setNewClaim({...newClaim, payableSplits: updated});
                            }}
                          >
                            <option value="Surgeon">Surgeon</option>
                            <option value="Anesthetist">Anesthetist</option>
                            <option value="Assistant">Assistant</option>
                            <option value="Duty Doctor">Duty Doctor</option>
                            <option value="Nurse">Staff Nurse</option>
                          </select>

                          <Input
                            type="number"
                            placeholder="₹ Split Amount"
                            className="h-8 text-xs w-24 font-semibold text-slate-800"
                            value={split.amount}
                            onChange={(e) => {
                              const updated = [...newClaim.payableSplits];
                              updated[i].amount = e.target.value;
                              setNewClaim({...newClaim, payableSplits: updated});
                            }}
                          />

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-500"
                            onClick={() => {
                              const updated = [...newClaim.payableSplits];
                              updated.splice(i, 1);
                              setNewClaim({...newClaim, payableSplits: updated});
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-4 border-t pt-3">
                <Button variant="outline" size="sm" onClick={() => setIsNewClaimOpen(false)}>Cancel</Button>
                <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleCreateClaim}>
                  Register Claim & Mapped Splits
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Total Approved Claims</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(stats.approvedClaims)}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Shield className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Payments Received</p>
              <h3 className="text-xl font-extrabold text-emerald-600 mt-1">{formatCurrency(stats.receivedClaims)}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Disbursed to Staff</p>
              <h3 className="text-xl font-extrabold text-indigo-600 mt-1">{formatCurrency(stats.disbursed)}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-indigo-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Hospital Net Share</p>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">{formatCurrency(stats.netMargin)}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
              <Coins className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('claims')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'claims' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Shield className="w-4 h-4" />
          Corporate & TPA Claims
        </button>
        <button 
          onClick={() => setActiveTab('payables')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'payables' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Coins className="w-4 h-4" />
          Staff & Doctor Payables
        </button>
        <button 
          onClick={() => setActiveTab('ledger')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'ledger' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <TrendingUp className="w-4 h-4" />
          Ledger & Accounts Reports
        </button>
        <button 
          onClick={() => setActiveTab('discharge')} 
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'discharge' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <UserCheck className="w-4 h-4" />
          Discharge Clearance ({dischargeRecords.length})
        </button>
      </div>

      {/* Tab: Corporate / TPA Claims */}
      {activeTab === 'claims' && (
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm font-extrabold text-slate-800">Active Claims & Pre-Auths</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-56">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input 
                    placeholder="Search patient, policy..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                </div>
                <select 
                  className="text-xs h-8 border rounded px-2 bg-white"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Channels</option>
                  <option value="Insurance TPA">Insurance TPA Cover</option>
                  <option value="Corporate Direct">Corporate Contract</option>
                </select>
                <select 
                  className="text-xs h-8 border rounded px-2 bg-white"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending Pre-Auth</option>
                  <option value="Approved">Settled / Received</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-700">Patient Details</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Corporate Account</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Procedure</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Cost / Limit</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Funds Approved</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Clearance Status</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInsurance.map((record) => {
                  const patient = patients.find(p => p.id === record.patientId);
                  const isApproved = (record.status || '').toLowerCase() === 'approved';
                  
                  return (
                    <TableRow key={record.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs">
                        <div className="font-bold text-slate-800">{patient?.name || 'Seeded Record'}</div>
                        <div className="text-[10px] text-muted-foreground">MRN: {patient?.mrn || 'MRN-77291'}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-800">{record.insuranceCompany}</div>
                        <div className="text-[10px] text-muted-foreground">{record.policyNo || 'Policy ID Unavailable'} • {record.corporateType || 'TPA'}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold">{record.procedureName || 'Procedure Pending'}</div>
                        <div className="text-[10px] text-slate-400">Claim Date: {formatDate(record.claim_date || record.date)}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold">{formatCurrency(record.procedureCost || record.insuranceLimit || 0)}</div>
                        <div className="text-[10px] text-slate-500">Pre-Auth limit: {formatCurrency(record.insuranceLimit || 0)}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {isApproved ? (
                          <div>
                            <div className="font-bold text-emerald-600">{formatCurrency(record.approvedAmount || record.approved_amount || 0)}</div>
                            <div className="text-[9px] text-emerald-700">TDS: {formatCurrency(record.tdsDeducted || 0)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Awaiting Settlement</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className={`h-5 gap-1 ${isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {isApproved ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3 animate-pulse" />}
                          {isApproved ? 'Settled & Received' : 'Pre-Auth Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!isApproved && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-[10px] gap-1 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => {
                                setSelectedClaim(record);
                                setPaymentForm({
                                  approvedAmount: (record.insuranceLimit || record.procedureCost || '').toString(),
                                  tdsDeducted: '0',
                                  utrNo: '',
                                  date: new Date().toISOString().split('T')[0]
                                });
                                setIsReceivePaymentOpen(true);
                              }}
                            >
                              <Coins className="w-3.5 h-3.5" />
                              Receive Payment
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-indigo-600"
                            title="View Split details"
                            onClick={() => {
                              setSelectedClaim(record);
                              setIsViewDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-rose-500"
                            onClick={() => handleDeleteClaim(record.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredInsurance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                      No corporate claims found. Register a claim to begin tracking corporate billing.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab: Doctor & Staff Payables */}
      {activeTab === 'payables' && (
        <Card className="border-none shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm font-extrabold text-slate-800 font-mono">Clinician / Staff Payables Ledger</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select 
                  className="text-xs h-8 border rounded px-2 bg-white"
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                >
                  <option value="all">All Clinicians</option>
                  {Array.from(new Set(staffPayables.map(p => p.staffId))).map(id => {
                    const name = staffPayables.find(p => p.staffId === id)?.staffName;
                    return <option key={id} value={id}>{name}</option>;
                  })}
                </select>
                <select 
                  className="text-xs h-8 border rounded px-2 bg-white"
                  value={filterPayableStatus}
                  onChange={(e) => setFilterPayableStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending Corporate Payment">Pending Corporate Payment</option>
                  <option value="Ready for Payout">Ready for Payout</option>
                  <option value="Paid Out">Disbursed (Paid Out)</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-700">Clinician / Staff</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Associated Patient & Case</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Split Role</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Payable Amount</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Payout Status</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">Settlement Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayables.map((payable) => {
                  const claim = insuranceRecords.find(c => c.id === payable.claimId);
                  
                  return (
                    <TableRow key={payable.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs">
                        <div className="font-bold text-slate-800">{payable.staffName}</div>
                        <div className="text-[10px] text-muted-foreground">{payable.role} ID: {payable.staffId}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-800">{payable.patientName}</div>
                        <div className="text-[10px] text-muted-foreground">{payable.procedureName}</div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-600">
                        {payable.role}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-900">
                        {formatCurrency(payable.payableAmount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className={`h-5 gap-1 ${
                          payable.status === 'Paid Out' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          payable.status === 'Ready for Payout' ? 'bg-sky-50 text-sky-700 border-sky-100 animate-pulse' :
                          'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {payable.status === 'Paid Out' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {payable.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {payable.status === 'Ready for Payout' && (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] bg-sky-600 text-white hover:bg-sky-700 gap-1"
                              onClick={() => {
                                setSelectedPayable(payable);
                                setPayoutForm({
                                  paymentMode: 'Net Banking',
                                  utrNo: '',
                                  date: new Date().toISOString().split('T')[0],
                                  notes: `Fee split settlement for ${payable.procedureName}`
                                });
                                setIsProcessPayoutOpen(true);
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Disburse Payout
                            </Button>
                          )}
                          {payable.status === 'Paid Out' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] text-indigo-700 border-indigo-100 hover:bg-indigo-50 gap-1"
                              onClick={() => printPayoutVoucher(payable)}
                            >
                              <Printer className="w-3 h-3" />
                              Print Voucher
                            </Button>
                          )}
                          {payable.status === 'Pending Corporate Payment' && (
                            <span className="text-[10px] italic text-slate-400 font-medium">Awaiting Corp Claim Settled</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredPayables.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                      No clinician payables found matching these search criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab: Financial Ledger & Reports */}
      {activeTab === 'ledger' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Summary Card */}
          <Card className="border-none shadow-sm lg:col-span-1 bg-slate-50/30">
            <CardHeader>
              <CardTitle className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Ledger Statistics
              </CardTitle>
              <CardDescription className="text-xs">Historical ledger and share breakdown across corporate billing accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs pb-2 border-b">
                <span className="text-slate-500 font-bold">Total Approved Invoices:</span>
                <span className="font-mono font-extrabold">{formatCurrency(stats.approvedClaims)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b">
                <span className="text-slate-500 font-bold">Total Net Received:</span>
                <span className="font-mono font-extrabold text-emerald-600">{formatCurrency(stats.receivedClaims)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b">
                <span className="text-slate-500 font-bold">Total Government TDS Retained:</span>
                <span className="font-mono font-bold text-amber-700">{formatCurrency(stats.tds)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b">
                <span className="text-indigo-600 font-bold">Paid Out to Clinicians:</span>
                <span className="font-mono font-bold text-indigo-700">{formatCurrency(stats.disbursed)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b">
                <span className="text-amber-600 font-bold">Outstanding Ready Payouts:</span>
                <span className="font-mono font-bold text-amber-700">{formatCurrency(stats.pendingDisbursal)}</span>
              </div>
              
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col items-center">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Hospital Net Retained Surplus</span>
                <span className="text-xl font-black text-indigo-900 mt-1">{formatCurrency(stats.netMargin)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Right Chronological History Ledger */}
          <Card className="border-none shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-extrabold text-slate-800">Settlement Receipts & Outflows Logs</CardTitle>
              <CardDescription className="text-xs">Audit trails of payments received from corporates and payouts settled to doctors.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                <div className="divide-y text-xs">
                  {/* Generate unified ledger chronologically */}
                  {(() => {
                    const events: any[] = [];
                    
                    insuranceRecords.forEach(c => {
                      if (c.status === 'Approved') {
                        events.push({
                          type: 'INFLOW',
                          title: `Corporate Settlement Received - ${c.insuranceCompany}`,
                          desc: `Patient: ${patients.find(p => p.id === c.patientId)?.name || 'Unknown'} (${c.procedureName})`,
                          amount: c.receivedAmount || c.approvedAmount,
                          ref: c.utrNo,
                          date: c.payment_received_date || c.claim_date || c.date
                        });
                      }
                    });

                    staffPayables.forEach(p => {
                      if (p.status === 'Paid Out') {
                        events.push({
                          type: 'OUTFLOW',
                          title: `Doctor Payable Settled - ${p.staffName}`,
                          desc: `Procedure: ${p.procedureName} (${p.role})`,
                          amount: p.payableAmount,
                          ref: p.disbursementUtr,
                          date: p.paidAt
                        });
                      }
                    });

                    // Sort events by date descending
                    const sorted = events.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (sorted.length === 0) {
                      return <div className="text-center py-10 text-slate-400">No transactions recorded yet in the ledger.</div>;
                    }

                    return sorted.map((e, index) => (
                      <div key={index} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                        <div className="flex gap-3 items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${e.type === 'INFLOW' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                            {e.type === 'INFLOW' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 text-xs">{e.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{e.desc}</div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">Ref: {e.ref || 'N/A'} • Date: {formatDate(e.date)}</div>
                          </div>
                        </div>
                        <div className={`font-mono font-extrabold text-xs ${e.type === 'INFLOW' ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {e.type === 'INFLOW' ? '+' : '-'}{formatCurrency(e.amount)}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Patient Discharge clearance (The original flow from earlier code) */}
      {activeTab === 'discharge' && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Initiates Discharge List</CardTitle>
            <CardDescription>Patients waiting for final clearance from nursing and accounts.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">ID / MRN</TableHead>
                    <TableHead className="whitespace-nowrap">Nurse Verification</TableHead>
                    <TableHead className="whitespace-nowrap">Accountant Verification</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dischargeRecords.map((record) => {
                    const patient = patients.find(p => p.id === record.patientId);
                    return (
                      <TableRow key={record.id} className="border-slate-50 hover:bg-slate-50/40">
                        <TableCell className="font-medium text-sm whitespace-nowrap">{record.name}</TableCell>
                        <TableCell className="font-bold text-medical-blue text-xs whitespace-nowrap">
                          {patient?.mrn || record.patientId.substring(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className={`gap-1.5 ${record.nurseVerification === 'Verified' ? 'text-emerald-600 border-emerald-100 bg-emerald-50' : 'text-amber-600 border-amber-100 bg-amber-50'}`}>
                            <UserCheck className="w-3 h-3" />
                            {record.nurseVerification}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className={`gap-1.5 ${record.accountantVerification === 'Verified' ? 'text-emerald-600 border-emerald-100 bg-emerald-50' : 'text-amber-600 border-amber-100 bg-amber-50'}`}>
                            <FileCheck className="w-3 h-3" />
                            {record.accountantVerification}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="text-medical-blue h-8" onClick={() => printDischargeSummary(record)}>
                              <Printer className="w-3.5 h-3.5 mr-1.5" />
                              Summary
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {dischargeRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No patients initiated for discharge.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DIALOG: Receive Payment */}
      <Dialog open={isReceivePaymentOpen} onOpenChange={setIsReceivePaymentOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-lg text-emerald-950 font-bold">Receive Corporate/TPA Payment</DialogTitle>
            <DialogDescription>Record final settlement received from insurer for this claim.</DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 py-3 text-xs">
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
                <div>Insurer: <strong>{selectedClaim.insuranceCompany}</strong></div>
                <div>Procedure: <strong>{selectedClaim.procedureName}</strong></div>
                <div>Patient: <strong>{patients.find(p => p.id === selectedClaim.patientId)?.name || 'Unknown'}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Approved / Settled Amount (₹) *</Label>
                  <Input 
                    type="number"
                    className="h-9 text-xs"
                    value={paymentForm.approvedAmount}
                    onChange={(e) => setPaymentForm({...paymentForm, approvedAmount: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Government TDS Deducted (₹)</Label>
                  <Input 
                    type="number"
                    className="h-9 text-xs"
                    value={paymentForm.tdsDeducted}
                    onChange={(e) => setPaymentForm({...paymentForm, tdsDeducted: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">UTR / Bank Transaction Ref *</Label>
                  <Input 
                    placeholder="e.g. UTR10292388"
                    className="h-9 text-xs"
                    value={paymentForm.utrNo}
                    onChange={(e) => setPaymentForm({...paymentForm, utrNo: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Received Date</Label>
                  <Input 
                    type="date"
                    className="h-9 text-xs"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="text-[10px] text-slate-500 bg-emerald-50 p-2.5 rounded border border-emerald-100">
                Note: Saving this settlement automatically unlocks any doctor or clinician payables linked to this case, transitioning them to "Ready for Payout".
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsReceivePaymentOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleReceivePaymentSubmit}>
              Commit Settlement & Unlock Payouts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Process Staff Disbursal */}
      <Dialog open={isProcessPayoutOpen} onOpenChange={setIsProcessPayoutOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-lg text-indigo-950 font-bold">Process Staff Disbursal</DialogTitle>
            <DialogDescription>Log direct payment payout to clinicians after corporate settlement received.</DialogDescription>
          </DialogHeader>

          {selectedPayable && (
            <div className="space-y-4 py-3 text-xs">
              <div className="p-3 bg-slate-50 border rounded space-y-1">
                <div>Recipient: <strong className="text-indigo-800">{selectedPayable.staffName}</strong> ({selectedPayable.role})</div>
                <div>Amount Payable: <strong className="text-slate-800">{formatCurrency(selectedPayable.payableAmount)}</strong></div>
                <div>Case Link: <span>Patient {selectedPayable.patientName} ({selectedPayable.procedureName})</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Payout Mode</Label>
                  <select
                    className="w-full text-xs h-9 border rounded-md px-3 bg-white focus:border-indigo-500"
                    value={payoutForm.paymentMode}
                    onChange={(e) => setPayoutForm({...payoutForm, paymentMode: e.target.value as any})}
                  >
                    <option value="Net Banking">Net Banking Transfer</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cash">Cash Disbursement</option>
                    <option value="Cheque">Cheque Settlement</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Transaction Reference / UTR *</Label>
                  <Input 
                    placeholder="e.g. PYOUT-8812-UTR"
                    className="h-9 text-xs"
                    value={payoutForm.utrNo}
                    onChange={(e) => setPayoutForm({...payoutForm, utrNo: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Disbursal Date</Label>
                <Input 
                  type="date"
                  className="h-9 text-xs"
                  value={payoutForm.date}
                  onChange={(e) => setPayoutForm({...payoutForm, date: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Disbursal Notes / Remarks</Label>
                <Input 
                  placeholder="e.g. Direct bank settlement processed"
                  className="h-9 text-xs"
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm({...payoutForm, notes: e.target.value})}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsProcessPayoutOpen(false)}>Cancel</Button>
            <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white" onClick={handleProcessPayoutSubmit}>
              Confirm Disbursement & Save Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: View Details (Splits List) */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-indigo-900">Corporate Case Details & Doctor Splits</DialogTitle>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 py-1 text-xs">
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1.5">
                <div>Patient: <strong>{patients.find(p => p.id === selectedClaim.patientId)?.name || 'Unknown'}</strong></div>
                <div>Insurer: <span>{selectedClaim.insuranceCompany}</span></div>
                <div>Procedure: <strong className="text-indigo-800">{selectedClaim.procedureName || 'N/A'}</strong></div>
                <div>Procedure Total Cost: <strong className="font-bold">{formatCurrency(selectedClaim.procedureCost || selectedClaim.insuranceLimit || 0)}</strong></div>
              </div>

              <div>
                <Label className="text-xs font-black uppercase text-indigo-950 tracking-wider">Associated Doctor & Staff Revenue Splits</Label>
                <div className="border rounded-md mt-2 divide-y bg-white">
                  {staffPayables.filter(p => p.claimId === selectedClaim.id).length === 0 ? (
                    <div className="p-3 text-center text-slate-400 italic">No revenue payout splits mapped to this case.</div>
                  ) : (
                    staffPayables.filter(p => p.claimId === selectedClaim.id).map(p => (
                      <div key={p.id} className="p-2.5 flex justify-between items-center hover:bg-slate-50">
                        <div>
                          <div className="font-bold text-slate-800">{p.staffName}</div>
                          <div className="text-[10px] text-slate-500">{p.role}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold">{formatCurrency(p.payableAmount)}</div>
                          <Badge variant="outline" className={`h-4 text-[9px] px-1 ${
                            p.status === 'Paid Out' ? 'bg-emerald-50 text-emerald-700' :
                            p.status === 'Ready for Payout' ? 'bg-sky-50 text-sky-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setIsViewDetailsOpen(false)}>Close Overview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
