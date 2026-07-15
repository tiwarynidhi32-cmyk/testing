import React, { useMemo } from 'react';
import { isDummyPatient } from '@/services/supabaseService';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Users, CreditCard, Filter, ArrowUpRight, Check, X, Printer, IndianRupee } from 'lucide-react';

interface OPDCollectionTabProps {
  bills: any[];
  appointments: any[];
  patients: any[];
  users: any[];
  opdStartDate: string;
  setOpdStartDate: (val: string) => void;
  opdEndDate: string;
  setOpdEndDate: (val: string) => void;
  opdDoctorFilter: string;
  setOpdDoctorFilter: (val: string) => void;
}

export function OPDCollectionTab({
  bills,
  appointments,
  patients,
  users,
  opdStartDate,
  setOpdStartDate,
  opdEndDate,
  setOpdEndDate,
  opdDoctorFilter,
  setOpdDoctorFilter,
}: OPDCollectionTabProps) {

  // Map raw appointments to include patient and doctor details
  const mappedApts = useMemo(() => {
    return appointments.map((apt: any) => {
      const pId = apt.patient_id || apt.patientId;
      const matchedPatient = patients.find((p: any) => 
        p.id === pId || 
        p.mrn === pId || 
        (p.id && pId && String(p.id).replace(/[^0-9a-zA-Z]/g, '') === String(pId).replace(/[^0-9a-zA-Z]/g, ''))
      );
      
      const docId = apt.doctor_id || apt.doctorId;
      const doc = users.find((u: any) => 
        u.id === docId || 
        u.name === apt.doctor || 
        u.name === apt.doctorName ||
        (u.id && docId && String(u.id).replace(/[^0-9a-zA-Z]/g, '') === String(docId).replace(/[^0-9a-zA-Z]/g, ''))
      );
      
      const aptDate = apt.appointment_date || apt.date || '';
      const dateStr = typeof aptDate === 'string' ? aptDate.split('T')[0] : '';
      
      return {
        ...apt,
        id: apt.id,
        patientName: matchedPatient?.name || apt.patientName || 'Unknown',
        patientPhone: matchedPatient?.phone || apt.patientPhone || 'N/A',
        patientMrn: matchedPatient?.mrn || apt.patientMrn || 'N/A',
        doctor: doc?.name || apt.doctor || apt.doctorName || 'GP / Duty Doctor',
        doctorDepartment: doc?.department || apt.doctorDepartment || 'General Medicine',
        dateStr,
        fee: Number(apt.fee || 500),
        discountAmount: Number(apt.discount_amount || apt.discountAmount || 0),
        discountGivenBy: apt.discount_given_by || apt.discountGivenBy || null,
        refundGivenBy: apt.refund_given_by || apt.refundGivenBy || null,
        paymentStatus: apt.payment_status || 'Pending'
      };
    }).filter((apt: any) => {
      const pId = apt.patient_id || apt.patientId;
      const matchedPatient = patients.find((p: any) => 
        p.id === pId || 
        p.mrn === pId || 
        (p.id && pId && String(p.id).replace(/[^0-9a-zA-Z]/g, '') === String(pId).replace(/[^0-9a-zA-Z]/g, ''))
      );
      const patObj = matchedPatient || { id: pId, name: apt.patientName, phone: apt.patientPhone };
      return !isDummyPatient(patObj);
    });
  }, [appointments, patients, users]);

  // Filter mapped appointments by date range and selected doctor
  const filteredApts = useMemo(() => {
    return mappedApts.filter((apt: any) => {
      // Must be Paid or Refunded to show in the collections report
      if (apt.paymentStatus !== 'Paid' && apt.paymentStatus !== 'Refunded') return false;
      
      // Date filter
      if (opdStartDate && apt.dateStr < opdStartDate) return false;
      if (opdEndDate && apt.dateStr > opdEndDate) return false;
      
      // Doctor filter
      if (opdDoctorFilter !== 'all' && apt.doctor !== opdDoctorFilter) return false;
      
      return true;
    });
  }, [mappedApts, opdStartDate, opdEndDate, opdDoctorFilter]);

  // Compute aggregate statistics
  const stats = useMemo(() => {
    let grossCollection = 0;
    let totalDiscounts = 0;
    let totalRefunds = 0;
    let transactionsCount = 0;

    filteredApts.forEach((apt) => {
      transactionsCount++;
      grossCollection += apt.fee;
      totalDiscounts += apt.discountAmount;
      if (apt.paymentStatus === 'Refunded') {
        totalRefunds += (apt.fee - apt.discountAmount);
      }
    });

    const netCollection = grossCollection - totalDiscounts - totalRefunds;

    return {
      grossCollection,
      totalDiscounts,
      totalRefunds,
      netCollection,
      transactionsCount
    };
  }, [filteredApts]);

  // Doctor-wise aggregate collection data
  const doctorSummaries = useMemo(() => {
    const docs: Record<string, { doctor: string, department: string, patientsCount: number, gross: number, discounts: number, refunds: number, net: number }> = {};
    
    filteredApts.forEach((apt) => {
      const docName = apt.doctor;
      const dept = apt.doctorDepartment;
      
      if (!docs[docName]) {
        docs[docName] = {
          doctor: docName,
          department: dept,
          patientsCount: 0,
          gross: 0,
          discounts: 0,
          refunds: 0,
          net: 0
        };
      }
      
      const aptNet = apt.fee - apt.discountAmount;
      docs[docName].patientsCount += 1;
      docs[docName].gross += apt.fee;
      docs[docName].discounts += apt.discountAmount;
      if (apt.paymentStatus === 'Refunded') {
        docs[docName].refunds += aptNet;
      } else {
        docs[docName].net += aptNet;
      }
    });
    
    return Object.values(docs);
  }, [filteredApts]);

  // Date-wise list of transactions (sorted by date descending)
  const detailedTransactions = useMemo(() => {
    return [...filteredApts].sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [filteredApts]);

  const activeDoctors = useMemo(() => {
    return users.filter(u => u.role?.toUpperCase() === 'DOCTOR' || u.role?.toUpperCase() === 'SUPER_ADMIN' || u.role?.toUpperCase() === 'SURGEON');
  }, [users]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Search and Period Filters Card */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div>
              <h2 className="text-base font-bold text-slate-800">OPD Collections Statement</h2>
              <p className="text-xs text-muted-foreground">Select date filters and medical staff to audit collections.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">From Date</Label>
                <Input 
                  type="date" 
                  value={opdStartDate}
                  onChange={(e) => setOpdStartDate(e.target.value)}
                  className="h-9 w-36 text-xs font-bold"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">To Date</Label>
                <Input 
                  type="date" 
                  value={opdEndDate}
                  onChange={(e) => setOpdEndDate(e.target.value)}
                  className="h-9 w-36 text-xs font-bold"
                />
              </div>
              
              <div className="space-y-1 min-w-[160px]">
                <Label className="text-[10px] font-black uppercase text-slate-500">Doctor</Label>
                <Select value={opdDoctorFilter} onValueChange={setOpdDoctorFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Doctors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {activeDoctors.map(doc => (
                      <SelectItem key={doc.id} value={doc.name}>{doc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-5">
                <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 border-slate-200">
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print Statement
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50/50">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Gross OPD Collection</p>
              <h3 className="text-2xl font-black mt-1 text-slate-800">₹{stats.grossCollection.toLocaleString()}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stats.transactionsCount} consultations</p>
            </div>
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
              <IndianRupee className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-orange-50/50">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Discounts Allowed</p>
              <h3 className="text-2xl font-black mt-1 text-slate-800">₹{stats.totalDiscounts.toLocaleString()}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Applied by authorized roles</p>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600">
              <ArrowUpRight className="w-5 h-5 rotate-180" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-rose-50 to-red-50/50">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">OPD Refunds Issued</p>
              <h3 className="text-2xl font-black mt-1 text-slate-800">₹{stats.totalRefunds.toLocaleString()}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Refunded consultation fees</p>
            </div>
            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-600">
              <X className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50/50">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Net OPD Revenue</p>
              <h3 className="text-2xl font-black mt-1 text-slate-800">₹{stats.netCollection.toLocaleString()}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Safe & balanced collections</p>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
              <Check className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Doctor-wise OPD Collection Statements */}
        <Card className="xl:col-span-1 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Doctor-wise OPD Summary</CardTitle>
            <CardDescription className="text-[10px]">Aggregated consultant collection stats for selected period</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-slate-100 text-[10px] font-bold uppercase text-slate-500">
                    <TableHead>Doctor Name</TableHead>
                    <TableHead className="text-center">Visits</TableHead>
                    <TableHead className="text-right">Net Collection</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctorSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                        No OPD collections for selected parameters
                      </TableCell>
                    </TableRow>
                  ) : (
                    doctorSummaries.map((ds, i) => (
                      <TableRow key={i} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{ds.doctor}</p>
                            <p className="text-[9px] text-muted-foreground">{ds.department}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold text-slate-600">{ds.patientsCount}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-800">
                          <div className="flex flex-col items-end">
                            <span>₹{ds.net.toLocaleString()}</span>
                            {ds.discounts > 0 && (
                              <span className="text-[9px] text-amber-500">Disc: ₹{ds.discounts}</span>
                            )}
                            {ds.refunds > 0 && (
                              <span className="text-[9px] text-rose-500">Rfnd: ₹{ds.refunds}</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Date-wise Detailed Ledger Statement */}
        <Card className="xl:col-span-2 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Date-wise Detailed Collections</CardTitle>
            <CardDescription className="text-[10px]">Itemized logs of consultation transactions and discounts</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-slate-100 text-[10px] font-bold uppercase text-slate-500">
                    <TableHead>Date</TableHead>
                    <TableHead>Patient & Phone</TableHead>
                    <TableHead>Assigned Doctor</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                        No transactions found matching the filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    detailedTransactions.map((tx) => (
                      <TableRow key={tx.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-xs font-semibold text-slate-600">
                          {tx.dateStr ? new Date(tx.dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{tx.patientName}</p>
                            <p className="text-[10px] text-muted-foreground">Call: {tx.patientPhone} • {tx.patientMrn}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs font-medium text-slate-700">{tx.doctor}</p>
                            <p className="text-[10px] text-muted-foreground">{tx.doctorDepartment}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-slate-600">₹{tx.fee}</TableCell>
                        <TableCell className="text-right">
                          {tx.discountAmount > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-bold text-amber-600">-₹{tx.discountAmount}</span>
                              {tx.discountGivenBy && (
                                <span className="text-[8px] text-amber-500/80 leading-none mt-0.5">By: {tx.discountGivenBy}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-800">
                          ₹{tx.paymentStatus === 'Refunded' ? 0 : (tx.fee - tx.discountAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Badge 
                              variant="secondary" 
                              className={`text-[9px] uppercase font-bold ${
                                tx.paymentStatus === 'Refunded' 
                                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200' 
                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              }`}
                            >
                              {tx.paymentStatus}
                            </Badge>
                            {tx.paymentStatus === 'Refunded' && tx.refundGivenBy && (
                              <span className="text-[8px] text-amber-600 leading-none mt-1">By: {tx.refundGivenBy}</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
