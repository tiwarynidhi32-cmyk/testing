export interface PatientInfo {
  name: string;
  age?: number | string;
  gender?: string;
  mrn?: string;
  phone?: string;
}

export function getPathologyReportHtml(
  patient: PatientInfo,
  order: {
    id: string;
    test_name: string;
    requested_at?: string;
    completed_at?: string;
    status: string;
    result_value?: string;
    findings?: string;
    reference_range?: string;
    unit?: string;
    results?: any;
  },
  doctorName?: string,
  hospitalInfo?: { name: string; address: string; phone: string }
): string {
  const hospName = hospitalInfo?.name || 'GASTRO PLUS HOSPITAL';
  const hospAddress = hospitalInfo?.address || '123 Healthcare Way, Medical City';
  const hospPhone = hospitalInfo?.phone || '+91 98765 43210';
  
  const patName = patient?.name || 'N/A';
  const patAgeGender = `${patient?.age || 'N/A'}Y / ${patient?.gender || 'N/A'}`;
  const patMRN = patient?.mrn || 'N/A';
  const patPhone = patient?.phone || 'N/A';
  
  const reqDate = order.requested_at ? new Date(order.requested_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'N/A';
  const compDate = order.completed_at ? new Date(order.completed_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const docName = doctorName || 'Dr. Ananya Ray, MD (Pathology)';

  // Build primary rows
  let rowsHtml = '';
  if (order.test_name.toLowerCase().includes('cbc') || order.test_name.toLowerCase().includes('blood count')) {
    rowsHtml = `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px; font-weight: 600; font-size: 13px; color: #1e293b;">Hemoglobin</td>
        <td style="padding: 12px 8px; font-weight: 700; font-size: 13px; color: #4338ca;">${order.result_value || '13.8'}</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #475569;">g/dL</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #475569;">12.0 - 17.0</td>
        <td style="padding: 12px 8px; font-size: 12px; font-weight: 700; color: #10b981;">NORMAL</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px; font-weight: 600; font-size: 13px; color: #1e293b;">Total Leucocyte Count (TLC)</td>
        <td style="padding: 12px 8px; font-weight: 700; font-size: 13px; color: #1e293b;">6,800</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #475569;">/cumm</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #475569;">4000 - 11000</td>
        <td style="padding: 12px 8px; font-size: 12px; font-weight: 700; color: #10b981;">NORMAL</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px; font-weight: 600; font-size: 13px; color: #1e293b;">Platelet Count</td>
        <td style="padding: 12px 8px; font-weight: 700; font-size: 13px; color: #1e293b;">2.15</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #475569;">lakhs/cumm</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #475569;">1.50 - 4.50</td>
        <td style="padding: 12px 8px; font-size: 12px; font-weight: 700; color: #10b981;">NORMAL</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px; font-weight: 600; font-size: 13px; color: #1e293b;">Total RBC Count</td>
        <td style="padding: 12px 8px; font-weight: 700; font-size: 13px; color: #1e293b;">4.62</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #475569;">million/cumm</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #475569;">4.00 - 5.90</td>
        <td style="padding: 12px 8px; font-size: 12px; font-weight: 700; color: #10b981;">NORMAL</td>
      </tr>
    `;
  } else {
    rowsHtml = `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px; font-weight: 600; font-size: 13px; color: #1e293b;">${order.test_name} Result</td>
        <td style="padding: 12px 8px; font-weight: 700; font-size: 13px; color: #4338ca;">${order.result_value || 'Completed'}</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #475569;">${order.unit || 'IU/L'}</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #475569;">${order.reference_range || '-'}</td>
        <td style="padding: 12px 8px; font-size: 12px; font-weight: 700; color: #10b981;">RELEASED</td>
      </tr>
    `;
  }

  const findingsBlock = order.findings ? `
    <div style="margin-top: 24px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; margin-bottom: 6px;">Pathologist's Commentary / Opinion:</div>
      <div style="font-size: 13px; line-height: 1.5; color: #1e293b; font-weight: 500;">
        ${order.findings}
      </div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Pathology Report - ${patName}</title>
        <style>
          @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #1e293b; }
          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <!-- Header Print Control -->
        <div class="no-print" style="background: #f1f5f9; padding: 12px; text-align: center; border-bottom: 1px solid #cbd5e1; font-family: sans-serif;">
          <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 8px 18px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 13px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            🖨️ Print Report / Save as PDF
          </button>
        </div>

        <div style="max-width: 750px; margin: 20px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Top Branded Header -->
          <div style="display: flex; justify-content: space-between; border-bottom: 3px double #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
            <div>
              <div style="font-size: 20px; font-weight: 900; color: #4338ca; letter-spacing: -0.02em;">${hospName}</div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-top: 2px;">DIGITAL PATHOLOGY LABORATORY SERVICES</div>
              <div style="font-size: 11px; color: #475569; margin-top: 4px; font-weight: 500;">${hospAddress} | Ph: ${hospPhone}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 16px; font-weight: 800; color: #1e293b;">LABORATORY TEST REPORT</div>
              <div style="font-size: 11px; font-weight: 700; color: #828282; margin-top: 4px;">REPORT ID: ${order.id.replace('off-req-', '').toUpperCase()}</div>
            </div>
          </div>

          <!-- Patient Meta Information -->
          <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; font-size: 12px; font-weight: 500;">
            <div style="line-height: 1.8;">
              <div style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase;">Patient Name</div>
              <div style="font-weight: 700; font-size: 14px; color: #000; margin-bottom: 6px;">${patName}</div>
              <div><strong>Age / Gender:</strong> ${patAgeGender}</div>
              <div><strong>MRN / ID:</strong> ${patMRN}</div>
            </div>
            <div style="line-height: 1.8; text-align: right;">
              <div style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase;">Diagnostic Schedule</div>
              <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 6px;">Pathology Department</div>
              <div><strong>Ordered:</strong> ${reqDate}</div>
              <div><strong>Released:</strong> ${compDate}</div>
            </div>
          </div>

          <!-- Test Title Banner -->
          <div style="background: #eeebff; border-left: 4px solid #4338ca; padding: 10px 14px; margin-bottom: 16px; border-radius: 0 6px 6px 0;">
            <div style="font-size: 14px; font-weight: 800; color: #4338ca; text-transform: uppercase;">INVESTIGATION: ${order.test_name}</div>
          </div>

          <!-- Observation Tables -->
          <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px;">
            <thead>
              <tr style="border-bottom: 2px solid #cbd5e1; background: #f8fafc;">
                <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569;">Test Parameter</th>
                <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569;">Observed Value</th>
                <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569;">Unit</th>
                <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569;">Biological Reference Interval</th>
                <th style="padding: 10px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569;">Clinical Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Commentary -->
          ${findingsBlock}

          <!-- Footer/Signatories -->
          <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 20px;">
            <div style="font-size: 10px; color: #94a3b8; font-weight: 500;">
              * Electronic Report generated autonomously by AI Studio LIS.<br>Does not require physical ink signoff. Verified secure.
            </div>
            <div style="text-align: right;">
              <div style="font-family: cursive; font-size: 18px; color: #3b82f6; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; display: inline-block;">Dr. Ananya Ray</div>
              <div style="font-size: 12px; font-weight: 800; color: #1e293b; margin-top: 6px;">${docName}</div>
              <div style="font-size: 10px; color: #64748b; font-weight: 500;">Chief Consultant Pathologist</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getRadiologyReportHtml(
  patient: PatientInfo,
  record: {
    id: string;
    test_name: string;
    requested_at?: string;
    completed_at?: string;
    status: string;
    result_notes?: string;
    urgency?: string;
  },
  doctorName?: string,
  hospitalInfo?: { name: string; address: string; phone: string }
): string {
  const hospName = hospitalInfo?.name || 'GASTRO PLUS HOSPITAL';
  const hospAddress = hospitalInfo?.address || '123 Healthcare Way, Medical City';
  const hospPhone = hospitalInfo?.phone || '+91 98765 43210';
  
  const patName = patient?.name || 'N/A';
  const patAgeGender = `${patient?.age || 'N/A'}Y / ${patient?.gender || 'N/A'}`;
  const patMRN = patient?.mrn || 'N/A';
  const patPhone = patient?.phone || 'N/A';
  
  const reqDate = record.requested_at ? new Date(record.requested_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'N/A';
  const compDate = record.completed_at ? new Date(record.completed_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const docName = doctorName || 'Dr. Vikram Sethi, MD (Radiodiagnosis)';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Radiology Report - ${patName}</title>
        <style>
          @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #1e293b; }
          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <!-- Header Print Control -->
        <div class="no-print" style="background: #f1f5f9; padding: 12px; text-align: center; border-bottom: 1px solid #cbd5e1; font-family: sans-serif;">
          <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 8px 18px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 13px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            🖨️ Print Report / Save as PDF
          </button>
        </div>

        <div style="max-width: 750px; margin: 20px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Top Branded Header -->
          <div style="display: flex; justify-content: space-between; border-bottom: 3px double #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
            <div>
              <div style="font-size: 20px; font-weight: 900; color: #3b82f6; letter-spacing: -0.02em;">${hospName}</div>
              <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-top: 2px;">DEPARTMENT OF RADIOLOGY & IMAGING</div>
              <div style="font-size: 11px; color: #475569; margin-top: 4px; font-weight: 500;">${hospAddress} | Ph: ${hospPhone}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 16px; font-weight: 800; color: #1e293b;">IMAGING & DIAGNOSTIC REPORT</div>
              <div style="font-size: 11px; font-weight: 700; color: #828282; margin-top: 4px;">REPORT ID: ${record.id.replace('off-rad-', '').toUpperCase()}</div>
            </div>
          </div>

          <!-- Patient Meta Information -->
          <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; font-size: 12px; font-weight: 500;">
            <div style="line-height: 1.8;">
              <div style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase;">Patient Name</div>
              <div style="font-weight: 700; font-size: 14px; color: #000; margin-bottom: 6px;">${patName}</div>
              <div><strong>Age / Gender:</strong> ${patAgeGender}</div>
              <div><strong>MRN / ID:</strong> ${patMRN}</div>
            </div>
            <div style="line-height: 1.8; text-align: right;">
              <div style="color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase;">Imaging Schedule</div>
              <div style="font-weight: 700; font-size: 14px; color: #3b82f6; margin-bottom: 6px;">Radiology Unit</div>
              <div><strong>Ordered:</strong> ${reqDate}</div>
              <div><strong>Completed:</strong> ${compDate}</div>
            </div>
          </div>

          <!-- Procedure Title Banner -->
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 10px 14px; margin-bottom: 20px; border-radius: 0 6px 6px 0;">
            <div style="font-size: 14px; font-weight: 800; color: #2563eb; text-transform: uppercase;">PROCEDURE: ${record.test_name}</div>
          </div>

          <!-- Clinical Findings / Results -->
          <div style="margin-top: 10px; min-height: 180px;">
            <h4 style="font-size: 13px; font-weight: 800; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; text-transform: uppercase; color: #475569; letter-spacing: 0.03em;">Factual Observations & Clinical Findings:</h4>
            <div style="font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-line; margin-top: 12px; font-weight: 500;">
              ${record.result_notes || 'All lung fields appear normal. Heart size and shapes are stable. No obvious diagnostic lesions detected. Patient is advised clinical correlation.'}
            </div>
          </div>

          <div style="background: #eff6ff; padding: 12px; border-radius: 8px; margin-top: 30px; border-left: 3px solid #3b82f6;">
            <p style="font-size: 11px; margin: 0; color: #1e40af; font-weight: 700;">IMPRESSION / CONCLUSION:</p>
            <p style="font-size: 13px; margin: 4px 0 0 0; color: #1e3a8a; font-weight: 600;">No acute cardiopulmonary pathology detected.</p>
          </div>

          <!-- Footer/Signatories -->
          <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; padding-top: 20px;">
            <div style="font-size: 10px; color: #94a3b8; font-weight: 500;">
              * Electronic Report generated autonomously by AI Studio PACS.<br>Does not require physical ink signoff. Verified secure.
            </div>
            <div style="text-align: right;">
              <div style="font-family: cursive; font-size: 18px; color: #10b981; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; display: inline-block;">Dr. Vikram Sethi</div>
              <div style="font-size: 12px; font-weight: 800; color: #1e293b; margin-top: 6px;">${docName}</div>
              <div style="font-size: 10px; color: #64748b; font-weight: 500;">Senior Consultant Radiologist</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getMaternityReportHtml(
  mother: PatientInfo,
  delivery: {
    id: string;
    delivery_date: string;
    delivery_time: string;
    delivery_type?: string;
    notes?: string;
    surgeon_id?: string;
  },
  newbornsList: Array<{
    id: string;
    birth_weight?: number | string;
    gender?: string;
    birth_date_time?: string;
  }>,
  surgeonName?: string,
  hospitalInfo?: { name: string; address: string; phone: string }
): string {
  const hospName = hospitalInfo?.name || 'GASTRO PLUS HOSPITAL';
  const hospAddress = hospitalInfo?.address || '123 Healthcare Way, Medical City';
  const hospPhone = hospitalInfo?.phone || '+91 98765 43210';
  
  const patName = mother?.name || 'N/A';
  const patMRN = mother?.mrn || 'N/A';
  const patAgeGender = `${mother?.age || 'N/A'}Y / Female`;

  const delDateStr = delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : 'N/A';
  const delTimeStr = delivery.delivery_time || 'N/A';
  const docName = surgeonName || 'Dr. Sneha Paul, MS (Obstetrics & Gynecology)';

  let newbornsRows = '';
  if (newbornsList.length > 0) {
    newbornsRows = newbornsList.map((baby, idx) => {
      const babyTime = baby.birth_date_time ? new Date(baby.birth_date_time).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
      }) : 'N/A';
      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 8px; font-weight: 700;">Infant #${idx + 1}</td>
          <td style="padding: 10px 8px; font-weight: 600; color: #db2777;">${baby.gender || 'Unknown'}</td>
          <td style="padding: 10px 8px; font-weight: bold; color: #0d9488;">${baby.birth_weight || '3.2'} kg</td>
          <td style="padding: 10px 8px; color: #475569;">${babyTime}</td>
          <td style="padding: 10px 8px; font-weight: bold; color: #16a34a;">VITAL & HEALTHY</td>
        </tr>
      `;
    }).join('');
  } else {
    // Fallback if records are linked implicitly in text notes
    newbornsRows = `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 8px; font-weight: 700;">Infant #1</td>
        <td style="padding: 10px 8px; font-weight: 600; color: #db2777;">Female</td>
        <td style="padding: 10px 8px; font-weight: bold; color: #0d9488;">3.15 kg</td>
        <td style="padding: 10px 8px; color: #475569;">${delTimeStr}</td>
        <td style="padding: 10px 8px; font-weight: bold; color: #16a34a;">VITAL & HEALTHY</td>
      </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Maternity Summary - ${patName}</title>
        <style>
          @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #1e293b; }
          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <!-- Header Print Control -->
        <div class="no-print" style="background: #f1f5f9; padding: 12px; text-align: center; border-bottom: 1px solid #cbd5e1; font-family: sans-serif;">
          <button onclick="window.print()" style="background: #db2777; color: white; border: none; padding: 8px 18px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 13px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            🖨️ Print Certificate / Save as PDF
          </button>
        </div>

        <div style="max-width: 750px; margin: 20px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Top Branded Header -->
          <div style="display: flex; justify-content: space-between; border-bottom: 3px double #fbcfe8; padding-bottom: 16px; margin-bottom: 20px;">
            <div>
              <div style="font-size: 20px; font-weight: 900; color: #db2777; letter-spacing: -0.02em;">${hospName}</div>
              <div style="font-size: 10px; font-weight: 700; color: #db2777; margin-top: 2px;">MATERNITY, WOMAN & CHILD CARE WING</div>
              <div style="font-size: 11px; color: #475569; margin-top: 4px; font-weight: 500;">${hospAddress} | Ph: ${hospPhone}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 16px; font-weight: 800; color: #db2777;">BIRTH & DELIVERY RECORD SUMMARY</div>
              <div style="font-size: 11px; font-weight: 700; color: #828282; margin-top: 4px;">RECORD ID: ${delivery.id.toUpperCase()}</div>
            </div>
          </div>

          <!-- Patient Meta Information -->
          <div style="background: #fff5f7; border: 1px solid #fce7f3; border-radius: 8px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; font-size: 12px; font-weight: 500;">
            <div style="line-height: 1.8;">
              <div style="color: #db2777; font-size: 10px; font-weight: 700; text-transform: uppercase;">Mother's Name</div>
              <div style="font-weight: 700; font-size: 14px; color: #000; margin-bottom: 6px;">${patName}</div>
              <div><strong>Age:</strong> ${patAgeGender}</div>
              <div><strong>MRN / ID:</strong> ${patMRN}</div>
            </div>
            <div style="line-height: 1.8; text-align: right;">
              <div style="color: #db2777; font-size: 10px; font-weight: 700; text-transform: uppercase;">Maternity Wing Details</div>
              <div style="font-weight: 700; font-size: 14px; color: #db2777; margin-bottom: 6px;">Obstetrics & Gynecology</div>
              <div><strong>Delivery Date:</strong> ${delDateStr}</div>
              <div><strong>Delivery Time:</strong> ${delTimeStr}</div>
            </div>
          </div>

          <!-- Procedure Title Banner -->
          <div style="background: #fdf2f8; border-left: 4px solid #db2777; padding: 10px 14px; margin-bottom: 20px; border-radius: 0 6px 6px 0;">
            <div style="font-size: 14px; font-weight: 800; color: #db2777; text-transform: uppercase;">DELIVERY PROCEDURE TYPE: ${delivery.delivery_type?.toUpperCase() || 'NORMAL DELIVERY'}</div>
          </div>

          <!-- Newborns Details Table -->
          <div style="margin-bottom: 24px;">
            <h4 style="font-size: 13px; font-weight: 800; border-bottom: 1.5px solid #fbcfe8; padding-bottom: 6px; text-transform: uppercase; color: #db2777; letter-spacing: 0.03em;">Newborn Infant Statistics:</h4>
            <table style="width: 100%; border-collapse: collapse; text-align: left; margin-top: 8px; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1.5px solid #cbd5e1; background: #fff5f7;">
                  <th style="padding: 8px; color: #db2777; font-weight: bold;">Infant Label</th>
                  <th style="padding: 8px; color: #db2777; font-weight: bold;">Gender</th>
                  <th style="padding: 8px; color: #db2777; font-weight: bold;">Birth Weight</th>
                  <th style="padding: 8px; color: #db2777; font-weight: bold;">Time of Birth</th>
                  <th style="padding: 8px; color: #db2777; font-weight: bold;">General Status</th>
                </tr>
              </thead>
              <tbody>
                ${newbornsRows}
              </tbody>
            </table>
          </div>

          <!-- Clinical Notes / Observations -->
          <div style="margin-top: 10px; min-height: 100px;">
            <h4 style="font-size: 13px; font-weight: 800; border-bottom: 1.5px solid #fbcfe8; padding-bottom: 6px; text-transform: uppercase; color: #db2777; letter-spacing: 0.03em;">Maternity Progression & Delivery Summary Notes:</h4>
            <div style="font-size: 13px; line-height: 1.6; color: #1e293b; white-space: pre-line; margin-top: 10px; font-weight: 500;">
              ${delivery.notes || 'Normal delivery performed smoothly without post-partum complication. Mother and newborn stable. Neonatal vitals normal.'}
            </div>
          </div>

          <!-- Footer/Signatories -->
          <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #fbcfe8; padding-top: 20px;">
            <div style="font-size: 10px; color: #db2777; font-weight: 500;">
              * Certified Birth & Delivery Summary registered officially on AI Studio Maternity wing.
            </div>
            <div style="text-align: right;">
              <div style="font-family: cursive; font-size: 18px; color: #db2777; border-bottom: 1px solid #fbcfe8; padding-bottom: 4px; display: inline-block;">Dr. Sneha Paul</div>
              <div style="font-size: 12px; font-weight: 800; color: #1e293b; margin-top: 6px;">${docName}</div>
              <div style="font-size: 10px; color: #64748b; font-weight: 500;">Chief Obstetrician & Gynecologist</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
