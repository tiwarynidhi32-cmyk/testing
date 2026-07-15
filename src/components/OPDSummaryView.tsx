import { useState, useMemo } from 'react';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Coins, 
  Clock, 
  Printer, 
  ArrowUpRight, 
  BarChart3, 
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface OPDSummaryViewProps {
  appointments: any[];
  users: any[];
}

export default function OPDSummaryView({ appointments = [], users = [] }: OPDSummaryViewProps) {
  const [summaryType, setSummaryType] = useState<'date' | 'doctor' | 'month' | 'year'>('date');

  // Normalize appointment records for reliable analytics
  const processedAppts = useMemo(() => {
    return appointments.map((apt: any) => {
      const dateStr = apt.appointment_date || apt.date || new Date().toISOString().split('T')[0];
      const docName = apt.doctor || apt.doctorName || 'General Consultation';
      
      // Attempt to retrieve consultation fee from doctor if fee matches 0/falsey
      let feeVal = Number(apt.fee);
      if (!feeVal || isNaN(feeVal)) {
        const foundDoc = users.find(u => u.name === docName);
        feeVal = foundDoc?.consultationFee ? Number(foundDoc.consultationFee) : 500;
      }
      
      const discountVal = Number(apt.discount_amount || apt.discountAmount || 0);
      const finalFee = Math.max(0, feeVal - discountVal);
      
      const dateParts = dateStr.split('-');
      const year = dateParts[0] || new Date().getFullYear().toString();
      const monthNum = dateParts[1] || '01';
      
      const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = monthNames[parseInt(monthNum, 10) - 1] || "January";
      
      return {
        ...apt,
        cleanDate: dateStr,
        cleanDoctor: docName,
        cleanFee: finalFee,
        year,
        monthNum,
        monthName,
        monthYear: `${monthName} ${year}`
      };
    });
  }, [appointments, users]);

  // Overall statistics
  const totalConsultations = processedAppts.length;
  const totalRevenue = processedAppts.reduce((sum, item) => sum + item.cleanFee, 0);
  const averageFee = totalConsultations > 0 ? Math.round(totalRevenue / totalConsultations) : 0;

  // 1. Date-wise Data Grouping (sorted recent first)
  const dateWiseData = useMemo(() => {
    const groups: Record<string, { date: string; count: number; revenue: number; doctors: Set<string> }> = {};
    processedAppts.forEach(apt => {
      const key = apt.cleanDate;
      if (!groups[key]) {
        groups[key] = { date: key, count: 0, revenue: 0, doctors: new Set() };
      }
      groups[key].count += 1;
      groups[key].revenue += apt.cleanFee;
      if (apt.cleanDoctor) {
        groups[key].doctors.add(apt.cleanDoctor);
      }
    });
    return Object.values(groups)
      .map(g => ({ ...g, doctorsList: Array.from(g.doctors) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [processedAppts]);

  // 2. Doctor-wise Data Grouping (sorted revenue highest first)
  const doctorWiseData = useMemo(() => {
    const groups: Record<string, { doctor: string; count: number; revenue: number }> = {};
    processedAppts.forEach(apt => {
      const key = apt.cleanDoctor;
      if (!groups[key]) {
        groups[key] = { doctor: key, count: 0, revenue: 0 };
      }
      groups[key].count += 1;
      groups[key].revenue += apt.cleanFee;
    });
    return Object.values(groups).sort((a, b) => b.revenue - a.revenue);
  }, [processedAppts]);

  // 3. Month-wise Data Grouping (Chronologically reverse sorted)
  const monthWiseData = useMemo(() => {
    const groups: Record<string, { monthYear: string; year: string; monthNum: string; count: number; revenue: number }> = {};
    processedAppts.forEach(apt => {
      const key = apt.monthYear;
      if (!groups[key]) {
        groups[key] = { monthYear: key, year: apt.year, monthNum: apt.monthNum, count: 0, revenue: 0 };
      }
      groups[key].count += 1;
      groups[key].revenue += apt.cleanFee;
    });
    return Object.values(groups).sort((a, b) => b.year.localeCompare(a.year) || b.monthNum.localeCompare(a.monthNum));
  }, [processedAppts]);

  // 4. Year-wise Data Grouping
  const yearWiseData = useMemo(() => {
    const groups: Record<string, { year: string; count: number; revenue: number }> = {};
    processedAppts.forEach(apt => {
      const key = apt.year;
      if (!groups[key]) {
        groups[key] = { year: key, count: 0, revenue: 0 };
      }
      groups[key].count += 1;
      groups[key].revenue += apt.cleanFee;
    });
    return Object.values(groups).sort((a, b) => b.year.localeCompare(a.year));
  }, [processedAppts]);

  // Max revenue across items for CSS custom bar charts
  const maxRevenue = useMemo(() => {
    const currentData = 
      summaryType === 'date' ? dateWiseData :
      summaryType === 'doctor' ? doctorWiseData :
      summaryType === 'month' ? monthWiseData : yearWiseData;
    
    if (currentData.length === 0) return 1;
    return Math.max(...currentData.map((d: any) => d.revenue));
  }, [summaryType, dateWiseData, doctorWiseData, monthWiseData, yearWiseData]);

  // Direct print option for summary report
  const handlePrintSummary = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) {
      toast.error('Please allow popups to print summary report');
      return;
    }

    let reportTitle = '';
    let tableHeaders = '';
    let tableRows = '';

    if (summaryType === 'date') {
      reportTitle = 'OPD Date-Wise Summary Report';
      tableHeaders = '<th>Date</th><th>Consultants / Doctors</th><th>Total Appointments</th><th>Revenue Collected</th>';
      tableRows = dateWiseData.map(d => {
        const docsStr = d.doctorsList && d.doctorsList.length > 0 ? d.doctorsList.join(', ') : 'N/A';
        return `
          <tr>
            <td><strong>${formatDate(d.date)}</strong></td>
            <td>${docsStr}</td>
            <td>${d.count}</td>
            <td>₹${d.revenue.toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    } else if (summaryType === 'doctor') {
      reportTitle = 'OPD Doctor-Wise Summary Report';
      tableHeaders = '<th>Doctor Name</th><th>Appointed Bookings</th><th>Revenue Generated</th>';
      tableRows = doctorWiseData.map(d => `
        <tr>
          <td><strong>${d.doctor}</strong></td>
          <td>${d.count} sessions</td>
          <td>₹${d.revenue.toLocaleString()}</td>
        </tr>
      `).join('');
    } else if (summaryType === 'month') {
      reportTitle = 'OPD Month-Wise Summary Report';
      tableHeaders = '<th>Month / Period</th><th>Consultations</th><th>Consultation Revenue</th>';
      tableRows = monthWiseData.map(d => `
        <tr>
          <td><strong>${d.monthYear}</strong></td>
          <td>${d.count}</td>
          <td>₹${d.revenue.toLocaleString()}</td>
        </tr>
      `).join('');
    } else {
      reportTitle = 'OPD Year-Wise Summary Report';
      tableHeaders = '<th>Year</th><th>Total Consultations</th><th>Annual Revenue</th>';
      tableRows = yearWiseData.map(d => `
        <tr>
          <td><strong>Year ${d.year}</strong></dt>
          <td>${d.count}</td>
          <td>₹${d.revenue.toLocaleString()}</td>
        </tr>
      `).join('');
    }

    const printHtml = `
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 30px; }
            .hospital-info h1 { margin: 0; font-size: 24px; color: #0f766e; }
            .hospital-info p { margin: 4px 0 0 0; font-size: 14px; color: #666; }
            .report-title h2 { margin: 0; font-size: 20px; color: #1e293b; }
            .report-title p { margin: 4px 0 0 0; font-size: 13px; color: #888; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px 20px; text-align: center; }
            .stat-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: bold; }
            .stat-card .value { font-size: 22px; font-weight: bold; margin-top: 8px; color: #0f766e; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #0f766e; color: #white; text-align: left; padding: 12px 15px; font-size: 13px; text-transform: uppercase; color: white; letter-spacing: 0.05em; }
            td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { border-top: 1px solid #e2e8f0; margin-top: 60px; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-info">
              <h1>CURELINE MEDICAL CENTER</h1>
              <p>OPD Analytics & Finance Reporting Unit</p>
            </div>
            <div class="report-title">
              <h2>${reportTitle}</h2>
              <p>Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="label">Total OPD Registrations</div>
              <div class="value">${totalConsultations} Patients</div>
            </div>
            <div class="stat-card">
              <div class="label">Consultation Revenue</div>
              <div class="value">₹${totalRevenue.toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="label">Average Session Fee</div>
              <div class="value">₹${averageFee.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                ${tableHeaders}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            <p>Confidential Medical Facility Reports. Authorized personal access only. © ${new Date().getFullYear()} CureLine. All rights reserved.</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Analytics Overview Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-none shadow-sm bg-gradient-to-br from-teal-500/10 via-transparent to-transparent">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Total OPD Registrations</CardDescription>
            <CardTitle className="text-3xl font-black text-slate-800 tracking-tight flex items-baseline gap-2">
              {totalConsultations}
              <span className="text-xs font-normal text-muted-foreground">Patients Booked</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-teal-600 font-semibold">
              <Users className="w-3.5 h-3.5" />
              <span>Full outpatient volume log</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Consultation Earnings</CardDescription>
            <CardTitle className="text-3xl font-black text-medical-blue tracking-tight flex items-baseline gap-1">
              ₹{totalRevenue.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-indigo-600 font-semibold">
              <Coins className="w-3.5 h-3.5" />
              <span>Direct OPD consultation revenue</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Avg consultation fee</CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-600 tracking-tight flex items-baseline gap-1">
              ₹{averageFee.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground">/ patient</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Calculated physician consultation mean</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aggregate Toggles & Interactive View */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
          <div>
            <CardTitle className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              OPD Operations Aggregations
            </CardTitle>
            <CardDescription className="text-[11px]">Toggle operational summary dimensions and print formatted audit sheets.</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <Button 
                variant={summaryType === 'date' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setSummaryType('date')}
                className={`text-xs h-8 px-2.5 ${summaryType === 'date' ? 'bg-white shadow-sm' : ''}`}
              >
                Date-wise
              </Button>
              <Button 
                variant={summaryType === 'doctor' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setSummaryType('doctor')}
                className={`text-xs h-8 px-2.5 ${summaryType === 'doctor' ? 'bg-white shadow-sm' : ''}`}
              >
                Doctor-wise
              </Button>
              <Button 
                variant={summaryType === 'month' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setSummaryType('month')}
                className={`text-xs h-8 px-2.5 ${summaryType === 'month' ? 'bg-white shadow-sm' : ''}`}
              >
                Month-wise
              </Button>
              <Button 
                variant={summaryType === 'year' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setSummaryType('year')}
                className={`text-xs h-8 px-2.5 ${summaryType === 'year' ? 'bg-white shadow-sm' : ''}`}
              >
                Year-wise
              </Button>
            </div>

            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 text-xs hover:bg-slate-50 border-teal-600/30 text-teal-700 h-8 font-bold"
              onClick={handlePrintSummary}
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/* 1. Date Wise Summary Table */}
            {summaryType === 'date' && (
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="w-1/3">Target Date</TableHead>
                    <TableHead className="w-1/4 text-center">Registrations Count</TableHead>
                    <TableHead className="w-1/4 text-right">Consultation Fees Collected</TableHead>
                    <TableHead className="text-right">Revenue Share bar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dateWiseData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs font-medium">
                        No appointments found to generate Date-wise summary data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dateWiseData.map((d) => {
                      const sharePct = Math.round((d.revenue / maxRevenue) * 100) || 5;
                      return (
                        <TableRow key={d.date} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell className="font-bold text-slate-700 text-xs py-3.5">
                            <div>{formatDate(d.date)}</div>
                            {d.doctorsList && d.doctorsList.length > 0 && (
                              <div className="text-[10px] text-muted-foreground font-normal mt-1 flex flex-wrap gap-1 items-center">
                                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mr-0.5">Physicians:</span>
                                {d.doctorsList.map((doc: string) => (
                                  <span key={doc} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-sm">
                                    {doc}
                                  </span>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-600 text-xs">
                            <Badge variant="outline" className="bg-blue-50/30 text-blue-700 border-blue-100 font-extrabold">
                              {d.count} patients
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-medical-blue text-xs">
                            ₹{d.revenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right py-3.5">
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[140px] ml-auto">
                              <div className="bg-teal-600 h-full rounded-full" style={{ width: `${sharePct}%` }} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}

            {/* 2. Doctor Wise Summary Table */}
            {summaryType === 'doctor' && (
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="w-1/3">Consultant Physician</TableHead>
                    <TableHead className="w-1/4 text-center">Appointed Bookings</TableHead>
                    <TableHead className="w-1/4 text-right">Earnings Generated</TableHead>
                    <TableHead className="text-right">Physician Share bar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctorWiseData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs font-medium">
                        No active medical records registered with appointments.
                      </TableCell>
                    </TableRow>
                  ) : (
                    doctorWiseData.map((d) => {
                      const sharePct = Math.round((d.revenue / maxRevenue) * 100) || 5;
                      return (
                        <TableRow key={d.doctor} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell className="font-bold text-slate-700 text-xs py-3.5">
                            {d.doctor}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-600 text-xs">
                            <Badge variant="outline" className="bg-emerald-50/30 text-emerald-700 border-emerald-100 font-extrabold">
                              {d.count} sessions
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-indigo-600 text-xs">
                            ₹{d.revenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right py-3.5">
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[140px] ml-auto">
                              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${sharePct}%` }} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}

            {/* 3. Month Wise Summary Table */}
            {summaryType === 'month' && (
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="w-1/3">Monthly Period</TableHead>
                    <TableHead className="w-1/4 text-center">Total Consultations</TableHead>
                    <TableHead className="w-1/4 text-right">Monthly Billings Generated</TableHead>
                    <TableHead className="text-right">Volume Share bar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthWiseData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs font-medium">
                        No appointments found to generate monthly summaries.
                      </TableCell>
                    </TableRow>
                  ) : (
                    monthWiseData.map((d) => {
                      const sharePct = Math.round((d.revenue / maxRevenue) * 100) || 5;
                      return (
                        <TableRow key={d.monthYear} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell className="font-bold text-slate-800 text-xs py-3.5">
                            {d.monthYear}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-600 text-xs">
                            <Badge variant="outline" className="bg-cyan-50/30 text-cyan-700 border-cyan-100 font-extrabold">
                              {d.count} patients
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-rose-600 text-xs">
                            ₹{d.revenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right py-3.5">
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[140px] ml-auto">
                              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${sharePct}%` }} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}

            {/* 4. Year Wise Summary Table */}
            {summaryType === 'year' && (
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                  <TableRow>
                    <TableHead className="w-1/3">Annual Period</TableHead>
                    <TableHead className="w-1/4 text-center">Aggregate Consultations</TableHead>
                    <TableHead className="w-1/4 text-right">Annual Consultation Revenue</TableHead>
                    <TableHead className="text-right">Volume Share bar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearWiseData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs font-medium">
                        No appointments found to generate annual summary reports.
                      </TableCell>
                    </TableRow>
                  ) : (
                    yearWiseData.map((d) => {
                      const sharePct = Math.round((d.revenue / maxRevenue) * 100) || 5;
                      return (
                        <TableRow key={d.year} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell className="font-bold text-slate-800 text-xs py-3.5">
                            Financial Year {d.year}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-600 text-xs">
                            <Badge variant="outline" className="bg-violet-50/30 text-violet-700 border-violet-100 font-extrabold">
                              {d.count} sessions
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-emerald-600 text-xs">
                            ₹{d.revenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right py-3.5">
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[140px] ml-auto">
                              <div className="bg-violet-600 h-full rounded-full" style={{ width: `${sharePct}%` }} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
