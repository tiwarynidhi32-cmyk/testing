import { PatientInfo } from './reportPrint';

export interface PatientReportData {
  patient: any;
  vitals: any[];
  clinicalNotes: any[];
  prescriptions: any[];
  labOrders: any[];
  radiologyRecords: any[];
  billing: any[];
  staff: any[];
  currentBed?: any;
  hospitalInfo?: { name: string; address: string; phone: string };
  dues: number;
}

export function getPatientReportHtml(data: PatientReportData): string {
  const {
    patient,
    vitals,
    clinicalNotes,
    prescriptions,
    labOrders,
    radiologyRecords,
    billing,
    staff,
    currentBed,
    hospitalInfo,
    dues
  } = data;

  const hospName = hospitalInfo?.name || 'GASTRO PLUS HOSPITAL';
  const hospAddress = hospitalInfo?.address || '123 Healthcare Way, Medical City';
  const hospPhone = hospitalInfo?.phone || '+91 98765 43210';

  // Format Dates Helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Format Currency Helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const patName = patient?.name || 'N/A';
  const patMRN = patient?.mrn || 'N/A';
  const patAgeGender = `${patient?.age || 'N/A'}Y / ${patient?.gender || 'N/A'}`;
  const patPhone = patient?.phone || 'N/A';
  const patEmail = patient?.email || 'N/A';
  const patBloodGroup = patient?.bloodGroup || patient?.blood_group || 'N/A';
  const patAddress = patient?.address || 'N/A';
  const patStatus = patient?.status || 'Active';

  const doc = staff.find(u => u.id === patient?.attending_doctor_id || u.id === patient?.attendingDoctorId);
  const docName = doc?.name || 'Dr. Self / Unassigned';
  const docDept = doc?.department || 'General Practice';

  // 1. Compile Vitals
  const latestVital = vitals && vitals.length > 0 ? vitals[0] : null;
  const bpVal = latestVital?.bp || '120/80';
  const pulseVal = latestVital?.pulse || '78';
  const tempVal = latestVital?.temp || '98.6';
  const spo2Val = latestVital?.spo2 || '98';

  // 2. Compile Clinical Notes and Timeline of Medical History
  const historyList: any[] = [];
  
  // Mock fallback history matches PatientOverview
  if (patient.id === 'p1' || patient.mrn === 'MRN-001') {
    historyList.push({
      date: '2024-04-12T00:00:00.000Z',
      title: 'Acute Bronchitis',
      content: 'Patient admitted with difficulty breathing. Started on nebulization.',
      type: 'Diagnosis'
    });
    historyList.push({
      date: '2024-03-20T00:00:00.000Z',
      title: 'Routine Checkup',
      content: 'General consultation. BP stable. Advised lifestyle changes.',
      type: 'Consultation'
    });
  } else if (patient.id === 'p2' || patient.mrn === 'MRN-002') {
    historyList.push({
      date: '2024-03-25T00:00:00.000Z',
      title: 'Post-Delivery Checkup',
      content: 'Post-pregnancy recovery monitoring. Normal vitals, minor soreness.',
      type: 'Maternity Note'
    });
  }

  if (clinicalNotes && clinicalNotes.length > 0) {
    clinicalNotes.forEach(note => {
      const authorName = staff.find(u => u.id === note.author_id || u.id === note.authorId)?.name || note.profiles?.name || 'Staff';
      historyList.push({
        date: note.created_at || note.date || new Date().toISOString(),
        title: note.note_type === 'NURSE' ? `Nurse Note` : `Clinical Note`,
        content: note.content,
        author: authorName,
        type: note.note_type === 'NURSE' ? 'Nurse Note' : 'Doctor Note'
      });
    });
  }

  // Sort history descending
  historyList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let historyRowsHtml = '';
  if (historyList.length > 0) {
    historyRowsHtml = historyList.map(h => `
      <div style="margin-bottom: 12px; padding: 10px; border-bottom: 1px dashed #e2e8f0;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #475569; margin-bottom: 2px;">
          <span>${formatDate(h.date)}</span>
          <span style="color: #4f46e5; text-transform: uppercase;">${h.type}</span>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">${h.title} ${h.author ? `(by ${h.author})` : ''}</div>
        <div style="font-size: 12px; color: #475569; line-height: 1.4; white-space: pre-wrap;">${h.content}</div>
      </div>
    `).join('');
  } else {
    historyRowsHtml = '<p style="font-size: 11px; text-align: center; color: #94a3b8; padding: 10px 0;">No significant medical history or clinical notes recorded.</p>';
  }

  // 3. Compile Prescriptions
  const patientPrescriptions = prescriptions
    ? prescriptions.filter(rx => rx.patientId === patient.id || rx.patient_id === patient.id)
    : [];

  let prescriptionsHtml = '';
  if (patientPrescriptions.length > 0) {
    prescriptionsHtml = patientPrescriptions.map(rx => {
      const rxDoc = staff.find(u => u.id === rx.doctor_id || u.id === rx.doctorId);
      const rxDocName = rxDoc?.name || 'Doctor';
      const medicinesList = rx.medicines || [];
      const medRowsHtml = medicinesList.map((m: any) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 8px; font-weight: 700; color: #1e293b;">${m.name}</td>
          <td style="padding: 6px 8px; color: #475569;">${m.dosage || '-'}</td>
          <td style="padding: 6px 8px; color: #475569; font-weight: 600;">${m.frequency || '-'}</td>
        </tr>
      `).join('');

      return `
        <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #fafafa;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: 800; color: #4f46e5; text-transform: uppercase;">Rx Date: ${formatDate(rx.prescription_date || rx.date)}</span>
            <span style="font-size: 11px; font-weight: 700; color: #475569;">Prescribed by: ${rxDocName}</span>
          </div>
          ${rx.diagnosis ? `<p style="font-size: 12px; margin: 0 0 6px 0; color: #1e293b;"><strong>Diagnosis:</strong> ${rx.diagnosis}</p>` : ''}
          ${rx.advice ? `<p style="font-size: 12px; margin: 0 0 10px 0; color: #475569;"><strong>Advice:</strong> ${rx.advice}</p>` : ''}
          
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px;">
            <thead>
              <tr style="border-bottom: 1px solid #cbd5e1; background-color: #eee;">
                <th style="padding: 4px 8px; font-weight: bold; color: #1e293b;">Medicine Name</th>
                <th style="padding: 4px 8px; font-weight: bold; color: #1e293b;">Dosage / Regimen</th>
                <th style="padding: 4px 8px; font-weight: bold; color: #1e293b;">Frequency</th>
              </tr>
            </thead>
            <tbody>
              ${medRowsHtml || '<tr><td colspan="3" style="padding: 6px 8px; text-align: center; color: #64748b;">No medication list specified</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }).join('');
  } else {
    prescriptionsHtml = '<p style="font-size: 11px; text-align: center; color: #94a3b8; padding: 10px 0;">No active prescriptions on record.</p>';
  }

  // 4. Lab / Pathology Clinical Investigations
  const patientLabs = labOrders ? labOrders.filter(o => o.patientId === patient.id) : [];
  let labRowsHtml = '';
  if (patientLabs.length > 0) {
    labRowsHtml = patientLabs.map(order => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px 6px; font-weight: bold; color: #1e293b;">${order.test}</td>
        <td style="padding: 8px 6px; color: #475569;">${formatDate(order.date)}</td>
        <td style="padding: 8px 6px; font-weight: 700; color: ${order.status === 'Completed' || order.status === 'Released' ? '#10b981' : '#2563eb'};">${order.status}</td>
        <td style="padding: 8px 6px; font-weight: bold; color: #4338ca;">${order.result ? `${order.result} ${order.unit || ''}` : 'Pending validation'}</td>
      </tr>
    `).join('');
  } else {
    labRowsHtml = `<tr><td colspan="4" style="text-align: center; font-size: 11px; color: #94a3b8; padding: 12px;">No Pathology investigations ordered.</td></tr>`;
  }

  // 5. Radiology Records
  const patientRadiology = radiologyRecords ? radiologyRecords.filter(r => r.patient_id === patient.id || r.patientId === patient.id) : [];
  let radRowsHtml = '';
  if (patientRadiology.length > 0) {
    radRowsHtml = patientRadiology.map(record => `
      <div style="padding: 8px; border: 1px solid #f1f5f9; border-radius: 6px; margin-bottom: 8px; font-size: 11.5px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
          <span style="color: #2563eb;">${record.test_name}</span>
          <span style="color: #64748b; font-size: 10px;">Ordered: ${formatDate(record.requested_at)}</span>
        </div>
        <p style="margin: 0 0 4px 0; color: #475569;"><strong>Status:</strong> ${record.status} (${record.urgency || 'Normal'})</p>
        ${record.result_notes ? `<p style="margin: 2px 0 0 0; color: #1e293b; font-style: italic;"><strong>Notes:</strong> ${record.result_notes}</p>` : ''}
        ${record.findings ? `<div style="margin-top: 4px; padding: 6px; background-color: #fafafa; border-left: 2px solid #2563eb; font-size: 11px; white-space: pre-line;"><strong>Findings:</strong> ${record.findings}</div>` : ''}
      </div>
    `).join('');
  } else {
    radRowsHtml = '<p style="font-size: 11px; text-align: center; color: #94a3b8; padding: 6px 0;">No Radiology imaging orders recorded.</p>';
  }

  // 6. Billing overview
  const patientBills = billing ? billing.filter(b => b.patient_id === patient.id || b.patientId === patient.id) : [];
  const totalBilled = patientBills.reduce((acc, b) => acc + Number(b.payable_amount ?? b.payableAmount ?? b.total_amount ?? b.totalAmount ?? 0), 0);
  const totalPaid = patientBills.reduce((acc, b) => acc + Number(b.paid_amount ?? b.paidAmount ?? 0), 0);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>EHR Patient 360 Report - ${patName}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #1e293b; background-color: #fff; }
          .no-print {
            background-color: #f8fafc;
            border-bottom: 1px solid #cbd5e1;
            padding: 10px;
            text-align: center;
          }
          .print-btn {
            background-color: #4f46e5;
            color: #ffffff;
            border: none;
            padding: 8px 20px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }
          .report-container {
            max-width: 800px;
            margin: 15px auto;
            padding: 20px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .table-style {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            margin-top: 5px;
          }
          .header-title-section {
            display: flex;
            justify-content: space-between;
            border-bottom: 3px double #cbd5e1;
            padding-bottom: 12px;
            margin-bottom: 15px;
          }
          .meta-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 15px;
            font-size: 11px;
            line-height: 1.6;
          }
          .vitals-box {
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 15px;
          }
          .vitals-title {
            font-size: 11px;
            font-weight: bold;
            color: #1e40af;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .vitals-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            text-align: center;
          }
          .vital-item {
            background-color: #ffffff;
            border: 1px solid #dbeafe;
            border-radius: 4px;
            padding: 6px;
          }
          .vital-label {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: bold;
          }
          .vital-value {
            font-size: 13px;
            font-weight: bold;
            color: #1e3a8a;
          }
          .section-block {
            margin-bottom: 15px;
          }
          .section-title {
            font-size: 12px;
            font-weight: bold;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 4px;
            text-transform: uppercase;
            color: #475569;
            margin: 0 0 8px 0;
            letter-spacing: 0.05em;
          }
          @media print {
            .no-print { display: none !important; }
            body { background: #fff; color: #000; }
            .report-container { border: none; padding: 0; margin: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="print-btn" onclick="window.print()">
            🖨️ Action: Print Report / Save PDF
          </button>
        </div>

        <div class="report-container">
          <!-- Main Report Header -->
          <div class="header-title-section">
            <div>
              <div style="font-size: 18px; font-weight: 800; color: #4338ca;">${hospName}</div>
              <div style="font-size: 9px; font-weight: 700; color: #64748b; margin-top: 1px;">PATIENT ELECTRONIC HEALTH RECORD (EHR)</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px;">${hospAddress} | Ph: ${hospPhone}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14px; font-weight: 800; color: #1e293b;">COMPREHENSIVE PATIENT REPORT</div>
              <div style="font-size: 9px; font-weight: 700; color: #94a3b8; margin-top: 2px;">REPORT GENERATED: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          <!-- Demographics & Location -->
          <div class="meta-box">
            <div class="grid-2">
              <div>
                <span style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block;">Patient Demographics</span>
                <strong style="font-size: 14px; color: #000; display: block; margin-bottom: 4px;">${patName}</strong>
                <div><strong>MRN / Patient ID:</strong> ${patMRN}</div>
                <div><strong>Age & Gender:</strong> ${patAgeGender}</div>
                <div><strong>Blood Group:</strong> ${patBloodGroup}</div>
                <div><strong>Contact Phone:</strong> ${patPhone}</div>
                <div><strong>Email Address:</strong> ${patEmail}</div>
              </div>
              <div style="border-left: 1px solid #cbd5e1; padding-left: 15px;">
                <span style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block;">Clinical Routing & Care Location</span>
                <strong style="font-size: 12px; color: #1e293b; display: block; margin-bottom: 4px;">Status: ${patStatus}</strong>
                <div><strong>Attending Doctor:</strong> ${docName} (${docDept})</div>
                <div><strong>Assigned Bed:</strong> ${currentBed ? `Bed ${currentBed.number} (${currentBed.ward})` : 'Hospital outpatient unassigned'}</div>
                <div><strong>Home Address:</strong> ${patAddress}</div>
                ${patient.fatherName ? `<div><strong>Guardian:</strong> ${patient.fatherName} ${patient.fatherPhone ? `(Ph: ${patient.fatherPhone})` : ''}</div>` : ''}
                ${patient.husbandName ? `<div><strong>Spouse:</strong> ${patient.husbandName} ${patient.husbandPhone ? `(Ph: ${patient.husbandPhone})` : ''}</div>` : ''}
              </div>
            </div>
          </div>

          <!-- Vitals Display -->
          <div class="vitals-box">
            <div class="vitals-title">Latest Recorded Physiologic Parameters (vitals)</div>
            <div class="vitals-grid">
              <div class="vital-item">
                <div class="vital-label">Blood Pressure</div>
                <div class="vital-value">${bpVal}</div>
              </div>
              <div class="vital-item">
                <div class="vital-label">Pulse Rate</div>
                <div class="vital-value">${pulseVal} bpm</div>
              </div>
              <div class="vital-item">
                <div class="vital-label">Temperature</div>
                <div class="vital-value">${tempVal} °F</div>
              </div>
              <div class="vital-item">
                <div class="vital-label">SpO2 (Oxygen Sat)</div>
                <div class="vital-value">${spo2Val} %</div>
              </div>
            </div>
          </div>

          <!-- Chronological History / clinical progress timeline -->
          <div class="section-block">
            <h4 class="section-title">Clinical Medical History & Progress Notes</h4>
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
              ${historyRowsHtml}
            </div>
          </div>

          <!-- Active Prescriptions -->
          <div class="section-block">
            <h4 class="section-title">Active Outpatient & Inpatient Prescriptions</h4>
            <div>
              ${prescriptionsHtml}
            </div>
          </div>

          <!-- Pathology/Lab Reports -->
          <div class="section-block">
            <h4 class="section-title">Pathology & Laboratory Diagnostic Summaries</h4>
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; overflow-x: auto;">
              <table class="table-style">
                <thead>
                  <tr style="border-bottom: 2px solid #cbd5e1; background-color: #f1f5f9; font-size: 10px;">
                    <th style="padding: 6px; color: #475569;">Investigation Name</th>
                    <th style="padding: 6px; color: #475569;">Request Date</th>
                    <th style="padding: 6px; color: #475569;">Status</th>
                    <th style="padding: 6px; color: #475569;">Diagnostic Observation</th>
                  </tr>
                </thead>
                <tbody>
                  ${labRowsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Radiology Records -->
          <div class="section-block">
            <h4 class="section-title">Radiology & Clinical Imaging Diagnostics</h4>
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
              ${radRowsHtml}
            </div>
          </div>

          <!-- Billing Logs and Account Status -->
          <div class="section-block" style="page-break-inside: avoid;">
            <h4 class="section-title">Patient Account & billing Statement</h4>
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; color: #d97706; font-weight: bold; text-transform: uppercase;">Financial Billing Status</div>
                <div style="font-size: 13px; color: #1e293b; font-weight: 500; margin-top: 4px;">
                  Total Amount Billed: <strong style="color: #000;">${formatCurrency(totalBilled)}</strong> | 
                  Total Settled / Paid: <strong style="color: #16a34a;">${formatCurrency(totalPaid)}</strong>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 10px; font-weight: bold; color: #b45309;">OUTSTANDING DUES / BALANCE</div>
                <div style="font-size: 18px; font-weight: 900; color: ${dues > 0 ? '#b91c1c' : '#16a34a'}; margin-top: 2px;">
                  ${formatCurrency(dues)}
                </div>
              </div>
            </div>
          </div>

          <!-- Signoff Section -->
          <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 15px; page-break-inside: avoid;">
            <div style="font-size: 9px; color: #94a3b8; font-weight: 500;">
              * Digitally authenticated Electronic Health Record dossier printed on behalf of medical staff.<br>
              Any clinical revisions must be completed via AI Studio Clinical Portal. 
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: bold; color: #1e293b;">Authenticated By Signature:</div>
              <div style="font-family: cursive; font-size: 16px; color: #4338ca; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 2px; margin-top: 4px; display: inline-block;">AI Studio Medical Record Desk</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
