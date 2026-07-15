import { useState } from 'react';
import { useDataSync } from '@/hooks/useDataSync';
import { 
  Users, 
  MapPin, 
  Thermometer, 
  Coins, 
  ShieldCheck, 
  Truck, 
  Award,
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';

import { 
  DoctorCommission, 
  FranchiseCenter, 
  HomeCollectionBooking 
} from './listTypes';

export default function LISAdvancedModules({ readOnly }: { readOnly?: boolean }) {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
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
    if (readOnly || !canMakeLabAndRadio) {
      toast.error('Access Denied: Only assigned Radiologists, Pathologists, or Admin can execute LIS actions.');
      return false;
    }
    return true;
  };

  // 1. Referral Doctor Commissions
  const [doctors, setDoctors] = useState<DoctorCommission[]>(() => 
    storage.get('hms_lis_doctors', [])
  );

  // 2. B2B Franchise Centers
  const [franchises, setFranchises] = useState<FranchiseCenter[]>(() => 
    storage.get('hms_lis_franchises', [])
  );

  // 3. Home Sample collection slots
  const [bookings, setBookings] = useState<HomeCollectionBooking[]>(() => 
    storage.get('hms_lis_bookings', [])
  );

  // Enable reactive cross-tab, cross-device synchronization of LIS advanced module stats
  useDataSync(() => {
    setDoctors(storage.get('hms_lis_doctors', []));
    setFranchises(storage.get('hms_lis_franchises', []));
    setBookings(storage.get('hms_lis_bookings', []));
  });

  // 4. Lab Compliance audit list
  const [complianceChecks, setComplianceChecks] = useState([
    { id: 1, topic: 'Daily QC Control Runs', status: 'Completed', detail: 'Sysmex Hematology Controls Calibration successfully registered at 06:15 AM.' },
    { id: 2, topic: 'External Quality Assessment (EQAS)', status: 'Active', detail: 'Proficiency sample results compared & sent. Accuracy: 99.4%' },
    { id: 3, topic: 'Cold Chain Transit Temperature Logs', status: 'Good', detail: 'Refrigerator & mobile transport vaccine coolers currently logging within safe bounds.' },
    { id: 4, topic: 'Critical Alert Callback Audits', status: 'Completed', detail: 'All panic alert results phoned to clinicians under 15 min.' }
  ]);

  // Remit commissions handler
  const handleRemitDoctorFees = (docId: string) => {
    if (!checkPermission()) return;
    const updated = doctors.map(d => {
      if (d.doctorId === docId) {
        toast.success(`Remittance cleared! Transferred ₹${d.unpaidAccruedAmount} to ${d.doctorName}`);
        return { ...d, unpaidAccruedAmount: 0 };
      }
      return d;
    });
    setDoctors(updated);
    storage.set('hms_lis_doctors', updated);
  };

  // Add sample collection temperature simulated alert
  const triggerTemperatureWarningCheck = (temp: number) => {
    if (temp > 8.0) return 'text-red-600 bg-red-50';
    if (temp < 2.0) return 'text-sky-600 bg-sky-50';
    return 'text-emerald-700 bg-emerald-50';
  };

  return (
    <div className="space-y-6">
      
      {/* REFERRAL DOCTORS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* REFERRAL REVENUE COMMISSIONS */}
        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-indigo-600" /> Clinic Referral Commissions
              </CardTitle>
              <CardDescription className="text-xs">Monitor referral commissions and compute splits on doctor referrals.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-[11px] font-bold">Referral Clinician</TableHead>
                  <TableHead className="text-[11px] font-bold text-center">Referrals</TableHead>
                  <TableHead className="text-[11px] font-bold text-center">Split %</TableHead>
                  <TableHead className="text-[11px] font-bold text-right">Outstanding Fee</TableHead>
                  <TableHead className="text-right text-[11px] font-bold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 font-semibold text-xs">
                      No active referral commissions recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  doctors.map(doc => (
                    <TableRow key={doc.doctorId} className="hover:bg-slate-50/30 text-xs border-slate-100">
                      <TableCell className="py-2.5 font-bold text-slate-800">
                        {doc.doctorName}
                        <span className="block text-[9px] font-medium text-muted-foreground">{doc.specialization}</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-center font-bold text-slate-700">{doc.totalReferralsCount}</TableCell>
                      <TableCell className="py-2.5 text-center font-semibold text-slate-500">{doc.commissionPercentage}%</TableCell>
                      <TableCell className="py-2.5 font-bold text-right text-slate-900">₹{doc.unpaidAccruedAmount}</TableCell>
                      <TableCell className="py-2.5 text-right">
                        <Button 
                          size="sm" 
                          disabled={doc.unpaidAccruedAmount === 0}
                          className="h-7 text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-md"
                          onClick={() => handleRemitDoctorFees(doc.doctorId)}
                        >
                          Payout Split
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* FRANCHISE CENTERS B2B NODES */}
        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-50">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" /> Outer Collection Node Centers
            </CardTitle>
            <CardDescription className="text-xs">Manage outer diagnostic franchise centres, security escrow ledgers, and barcode shipments.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-[11px] font-bold">Franchise Center Node</TableHead>
                  <TableHead className="text-[11px] font-bold text-center">ESCROW Limit</TableHead>
                  <TableHead className="text-[11px] font-bold text-center">Outstanding Billing</TableHead>
                  <TableHead className="text-[11px] font-bold text-center">Samples</TableHead>
                  <TableHead className="text-right text-[11px] font-bold">Agreement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {franchises.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 font-semibold text-xs">
                      No outer franchise collection centers configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  franchises.map(fran => (
                    <TableRow key={fran.centerId} className="hover:bg-slate-50/30 text-xs border-slate-100">
                      <TableCell className="py-2.5 font-bold text-slate-800">
                        {fran.centerName}
                        <span className="block text-[9px] font-medium text-muted-foreground">Admin: {fran.ownerName}</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-center font-bold text-slate-600">₹{fran.creditLimitEscrow}</TableCell>
                      <TableCell className={`py-2.5 text-center font-extrabold ${fran.outstandingBalance > 30000 ? 'text-red-650' : 'text-slate-800'}`}>
                        ₹{fran.outstandingBalance}
                      </TableCell>
                      <TableCell className="py-2.5 text-center font-semibold text-slate-500">{fran.sampleCountForwarded}</TableCell>
                      <TableCell className="py-2.5 text-right">
                        {fran.agreementStatus === 'Active' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[9px] shrink-0 border-none font-bold">Licensed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-red-100/30 border-red-200 text-red-600 font-bold">Overlimit Limit</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      {/* PHLEBOTOMIST & HOME SAMPLE COLLECTION AND COLD-CHAIN Logistics */}
      <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-50">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-indigo-600" />
            Home Sample Pickups & Cold-Chain Transit Logs
          </CardTitle>
          <CardDescription className="text-xs">Assigned field laboratory technicians, customer addresses, and real-time cooler temperature mapping.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-[11px] font-bold">Booking ID/Client</TableHead>
                <TableHead className="text-[11px] font-bold">Client Address & Phone</TableHead>
                <TableHead className="text-[11px] font-bold text-center">Clinical Test</TableHead>
                <TableHead className="text-[11px] font-bold text-center">Field Technician</TableHead>
                <TableHead className="text-[11px] font-bold text-center">Logistics Coolant Temp</TableHead>
                <TableHead className="text-right text-[11px] font-bold">Courier Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-semibold text-xs">
                    No home sample collection bookings for today.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map(book => (
                  <TableRow key={book.bookingId} className="hover:bg-slate-50/30 text-xs border-slate-100">
                    <TableCell className="py-3 font-bold text-slate-800">
                      {book.patientName}
                      <span className="block text-[8px] font-mono font-bold text-indigo-600">{book.bookingId}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="font-semibold text-slate-700 leading-none">{book.scheduledAddress}</p>
                      <span className="text-[10px] text-muted-foreground">Ph: {book.phone}</span>
                    </TableCell>
                    <TableCell className="py-3 font-semibold text-slate-600 text-center">{book.testRequested}</TableCell>
                    <TableCell className="py-3 font-bold text-slate-800 text-center">{book.assignedPhlebotomist}</TableCell>
                    <TableCell className="py-3 text-center">
                      <Badge variant="outline" className={`font-mono font-black text-[10px] px-2 py-0.5 rounded-full flex items-center justify-center gap-1 w-20 mx-auto ${triggerTemperatureWarningCheck(book.transitTemperatureCelsius)}`}>
                        <Thermometer className="w-3.5 h-3.5" />
                        {book.transitTemperatureCelsius}°C
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      {book.transitTrackingStatus === 'Completed' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 font-bold border-none text-[9px] py-0.5">Recv at Lab</Badge>
                      ) : book.transitTrackingStatus === 'In-Transit' ? (
                        <Badge className="bg-amber-100 text-amber-800 font-bold border-none text-[9px] py-0.5 animate-pulse">Cold Box Transit</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-200">Dispatched</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ISO 15189 LAB CALIBRATION COMPLIANCE CHECKS */}
      <Card className="border-none shadow-sm bg-white rounded-2xl p-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-emerald-600" />
          ISO 15189 / NABL Compliance Checklist Workbook
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {complianceChecks.map(check => (
            <div key={check.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex gap-3 text-xs">
              <div className="bg-emerald-100/50 p-2 rounded-lg text-emerald-700 shrink-0 h-9 w-9 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800">{check.topic}</h4>
                <p className="text-muted-foreground font-semibold mt-0.5 text-[11px] leading-relaxed">{check.detail}</p>
                <div className="mt-1.5 flex items-center gap-1 text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                  <span>● Standard Calibrated</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
