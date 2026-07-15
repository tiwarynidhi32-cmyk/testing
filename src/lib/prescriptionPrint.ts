export interface PrintPatient {
  name: string;
  age?: number | string;
  gender?: string;
  mrn?: string;
  phone?: string;
  fatherName?: string;
}

export interface PrintMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  time?: string;
  startTime?: string;
}

export interface PrintVitals {
  temp?: string | number;
  bp?: string;
  pulse?: string | number;
  spo2?: string | number;
  weight?: string | number;
  rr?: string | number;
}

export interface PrintPrescription {
  date?: string;
  medicines: PrintMedicine[];
  advice?: string;
  diagnosis?: string;
  notes?: string;
  vitals?: PrintVitals;
}

export interface PrintDoctor {
  name?: string;
  degree?: string;
  specialization?: string;
  department?: string;
  id?: string;
}

export function getPrescriptionPrintHtml(
  patient: PrintPatient,
  prescription: PrintPrescription,
  doctor?: PrintDoctor,
  hospitalInfo?: { name: string; address: string; phone: string },
  templateImage?: string | null
): string {
  const actualTemplateImage = templateImage !== undefined ? templateImage : (typeof window !== 'undefined' ? localStorage.getItem('hms_template_image') : null);

  // Parse whether there is a valid custom preprinted background letterhead image (to overlay on)
  const isValidTemplateImage = !!(
    actualTemplateImage &&
    typeof actualTemplateImage === 'string' &&
    actualTemplateImage.trim() !== '' &&
    actualTemplateImage !== 'null' &&
    actualTemplateImage !== 'undefined' &&
    (actualTemplateImage.startsWith('http') || actualTemplateImage.startsWith('data:image') || actualTemplateImage.startsWith('/'))
  );

  const hospName = hospitalInfo?.name || 'GASTRO PLUS HOSPITAL';
  const hospAddress = hospitalInfo?.address || '123 Healthcare Way, Medical City';
  const hospPhone = hospitalInfo?.phone || '+91 98765 43210';
  const hospEmail = `contact@${hospName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'globalhospital'}.com`;
  
  const patName = patient?.name || 'N/A';
  const patAgeGender = `${patient?.age || 'N/A'}Y / ${patient?.gender || 'N/A'}`;
  const presDate = prescription?.date || new Date().toISOString().split('T')[0];
  const patMRN = patient?.mrn || 'N/A';
  const patPhone = patient?.phone || '';
  const patFatherName = patient?.fatherName || (patient as any)?.father_name || '';

  // Extract vitals
  const vts = prescription?.vitals;
  const bpVal = vts?.bp || '';
  const pulseVal = vts?.pulse !== undefined && vts?.pulse !== 0 ? String(vts.pulse) : '';
  const tempVal = vts?.temp !== undefined ? String(vts.temp) : '';
  const spo2Val = vts?.spo2 !== undefined && vts?.spo2 !== 0 ? String(vts.spo2) : '';
  const weightVal = vts?.weight !== undefined ? String(vts.weight) : '';
  const rrVal = vts?.rr !== undefined && vts?.rr !== 0 ? String(vts.rr) : '';

  const docName = doctor?.name || 'Attending Doctor';
  const docReg = doctor?.degree ? `Reg No: MC-${doctor.id?.toUpperCase() || '1234567'}` : 'Reg No: MC1234567';
  const docSpecialty = doctor?.specialization || doctor?.department || 'Senior Consultant';

  // Format Medicines content
  let medContent = '';
  if (prescription.medicines && prescription.medicines.length > 0) {
    medContent = prescription.medicines.map(m => `
      <tr style="border-bottom: 1.5px solid #e2e8f0; page-break-inside: avoid;">
        <td style="padding: 16px 14px; font-weight: 700; color: #0f172a; font-size: 14px;">${m.name}</td>
        <td style="padding: 16px 14px; font-weight: 600; color: #334155; font-size: 14px;">${m.dosage || '-'}</td>
        <td style="padding: 16px 14px; font-weight: 600; color: #334155; font-size: 14px;">${m.frequency || '-'}</td>
        <td style="padding: 16px 14px; font-weight: 600; color: #334155; font-size: 14px;">${m.duration || '-'}</td>
      </tr>
    `).join('');
  } else {
    // Return high-quality empty lines with dotted borders for the blank pad to look beautiful when printed
    for (let i = 0; i < 6; i++) {
      medContent += `
        <tr style="border-bottom: 1px dotted #cbd5e1; height: 52px; page-break-inside: avoid;">
          <td style="padding: 16px 14px;"></td>
          <td style="padding: 16px 14px;"></td>
          <td style="padding: 16px 14px;"></td>
          <td style="padding: 16px 14px;"></td>
        </tr>
      `;
    }
  }

  const adviceContent = (prescription.advice || prescription.notes || prescription.diagnosis) ? `
    <div style="margin-top: 30px; font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif; page-break-inside: avoid;">
      <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: #475569; letter-spacing: 0.08em; margin-bottom: 8px;">Clinical Remarks & Advice:</div>
      <div style="font-size: 13.5px; color: #1e293b; font-weight: 500; line-height: 1.6; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; border-left: 4px solid #0284c7;">
        ${prescription.diagnosis ? `<div style="font-weight: 800; color: #0f172a; margin-bottom: 6px; font-size: 13.5px;">Diagnosis: ${prescription.diagnosis}</div>` : ''}
        ${prescription.advice || prescription.notes || ''}
      </div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Prescription - ${patName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
          
          @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: #fff;
            position: relative;
          }
          .template-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
          }
          .container {
            width: 100%;
            min-height: 262mm;
            position: relative;
            box-sizing: border-box;
            padding-top: ${isValidTemplateImage ? '240px' : '0px'};
            padding-bottom: 220px; /* Safe space to prevent table content overlap with footers */
          }
          
          /* Custom Premium Letterhead styling */
          .header {
            display: ${isValidTemplateImage ? 'none' : 'block'};
            margin-bottom: 22px;
          }
          
          /* Rx Symbol & Watermark */
          .rx-container {
            position: relative;
            margin-left: 2px;
          }
          .rx-symbol {
            font-size: 44px;
            font-style: italic;
            font-weight: 700;
            font-family: 'Playfair Display', Georgia, serif;
            margin: 0 0 12px 0;
            color: #1d4ed8;
            display: inline-block;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 320px;
            height: 320px;
            opacity: 0.03;
            z-index: -2;
            pointer-events: none;
          }
          
          /* Medicines Table Styling */
          .meds-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            z-index: 10;
          }
          .meds-table th {
            background-color: #1e3a8a;
            color: #ffffff;
            font-size: 10.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 11px 14px;
            text-align: left;
          }
          .meds-table th:first-child {
            border-top-left-radius: 8px;
            border-bottom-left-radius: 8px;
          }
          .meds-table th:last-child {
            border-top-right-radius: 8px;
            border-bottom-right-radius: 8px;
          }
          
          /* Footer & Authorizations */
          .footer-section {
            position: absolute;
            bottom: 110px; /* Positioned perfectly above bottom footer */
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            page-break-inside: avoid;
          }
          .footer-left {
            max-width: 360px;
            border-left: 3px solid #1d4ed8;
            padding-left: 12px;
          }
          .footer-right {
            text-align: right;
            min-width: 230px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          .sig-line {
            width: 180px;
            border-bottom: 1.5px solid #0f172a;
            margin-bottom: 10px;
          }
          .doc-name {
            font-size: 14.5px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 2px 0;
          }
          .doc-reg {
            font-size: 11.5px;
            color: #475569;
            margin: 0 0 2px 0;
            font-weight: 600;
          }
          .doc-spec {
            font-size: 10.5px;
            color: #64748b;
            margin: 0;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
        </style>
      </head>
      <body>
        <!-- Background Premium Watermark -->
        <div class="watermark">
          <svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#1d4ed8" stroke-width="3" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#ef4444" stroke-width="1.5" />
            <!-- Letters GH in bold blue -->
            <text x="50" y="55" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="24" fill="#1d4ed8" text-anchor="middle" style="letter-spacing: -0.5px;">GH</text>
          </svg>
        </div>

        <div class="container">
          ${isValidTemplateImage ? `<div class="template-bg"><img src="${actualTemplateImage}" style="width: 100%;" /></div>` : ''}
          
          <!-- Custom Bilingual Premium Letterhead from Image 2 -->
          <div class="header">
            <div style="position: relative; padding: 15px 20px; display: flex; align-items: center; background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 60%, #e0f2fe 100%); border-bottom: 3.5px solid #b91c1c; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); overflow: hidden;">
              <!-- Top blue gradient accent bar -->
              <div style="position: absolute; top: 0; left: 0; right: 0; height: 8px; background: linear-gradient(90deg, #1d4ed8 0%, #3b82f6 50%, #1d4ed8 100%);"></div>
              
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 5px;">
                <!-- Left: Circular Logo -->
                <div style="flex-shrink: 0; margin-right: 15px;">
                  <svg viewBox="0 0 100 100" style="width: 80px; height: 80px;">
                    <!-- Outer Blue Ring with double lines -->
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#1d4ed8" stroke-width="3.5" />
                    <circle cx="50" cy="50" r="41" fill="none" stroke="#ef4444" stroke-width="1.5" />
                    <circle cx="50" cy="50" r="40" fill="#ffffff" />
                    <!-- Medical Cross symbol faint in center -->
                    <path d="M44 28 H56 V72 H44 Z" fill="#ef4444" opacity="0.1" />
                    <path d="M28 44 H72 V56 H28 Z" fill="#ef4444" opacity="0.1" />
                    <!-- Inner red dotted/dashed circle -->
                    <circle cx="50" cy="50" r="34" fill="none" stroke="#ef4444" stroke-width="1" stroke-dasharray="3,2" />
                    <!-- Letters GH in bold blue -->
                    <text x="50" y="53" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="22" fill="#1d4ed8" text-anchor="middle" dominant-baseline="middle" style="letter-spacing: -0.5px;">G+</text>
                    <!-- Hindi curved text at top -->
                    <text x="50" y="24" font-family="'Noto Sans Devanagari', sans-serif" font-weight="700" font-size="5.5" fill="#ef4444" text-anchor="middle">गैस्ट्रो प्लस हॉस्पिटल</text>
                    <!-- English curved text at bottom -->
                    <text x="50" y="80" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="5.5" fill="#1d4ed8" text-anchor="middle">GASTRO PLUS HOSPITAL</text>
                  </svg>
                </div>
                
                <!-- Middle: Center Title with Red & White Styling from Image 2 -->
                <div style="flex-grow: 1; text-align: center;">
                  <div style="font-family: 'Noto Sans Devanagari', sans-serif; font-weight: 900; font-size: 38px; color: #ef4444; text-shadow: 2px 2px 0px #fff, -2px -2px 0px #fff, 2px -2px 0px #fff, -2px 2px 0px #fff, 3px 3px 5px rgba(0,0,0,0.2); text-transform: uppercase; margin: 0; line-height: 1; letter-spacing: 0.5px;">गैस्ट्रो प्लस हॉस्पिटल</div>
                  <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 10px; color: #1d4ed8; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; opacity: 0.9;">Gastro Plus Hospital</div>
                </div>

                <!-- Right: Extra spacing for visual symmetry, or we can put a beautiful caduceus/hospital icon -->
                <div style="flex-shrink: 0; width: 80px; text-align: right; opacity: 0.15;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.5" style="width: 55px; height: 55px; margin-left: auto;">
                    <path d="M19 10.5H13.5V5C13.5 4.17157 12.8284 3.5 12 3.5C11.1716 3.5 10.5 4.17157 10.5 5V10.5H5C4.17157 10.5 3.5 11.1716 3.5 12C3.5 12.8284 4.17157 13.5 5 13.5H10.5V19C10.5 19.8284 11.1716 20.5 12 20.5C12.8284 20.5 13.5 19.8284 13.5 19V13.5H19C19.8284 13.5 20.5 12.8284 20.5 12C20.5 11.1716 19.8284 10.5 19 10.5Z" fill="#e0f2fe"/>
                    <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Dotted Line Patient Information Grid from Image 2 -->
          <div style="border-top: 1.5px solid #e2e8f0; border-bottom: 1.5px solid #e2e8f0; padding: 12px 10px; margin-bottom: 20px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 700; color: #1e293b; display: flex; flex-direction: column; gap: 12px;">
            <!-- Row 1 -->
            <div style="display: flex; gap: 20px; flex-wrap: wrap; width: 100%;">
              <div style="flex: 1.8; min-width: 240px; display: flex; align-items: flex-end;">
                <span>Patient Name:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${patName}</span>
              </div>
              <div style="flex: 1; min-width: 130px; display: flex; align-items: flex-end;">
                <span>Age / Sex:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${patAgeGender}</span>
              </div>
              <div style="flex: 1; min-width: 120px; display: flex; align-items: flex-end;">
                <span>Date:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${presDate}</span>
              </div>
            </div>
            <!-- Row 2 -->
            <div style="display: flex; gap: 20px; flex-wrap: wrap; width: 100%;">
              <div style="flex: 1.5; min-width: 250px; display: flex; align-items: flex-end;">
                <span>Father / Husband Name:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${patFatherName || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span>
              </div>
              <div style="flex: 1; min-width: 150px; display: flex; align-items: flex-end;">
                <span>Mobile No:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${patPhone || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span>
              </div>
              <div style="flex: 0.8; min-width: 110px; display: flex; align-items: flex-end;">
                <span>MRN:</span>
                <span style="flex-grow: 1; border-bottom: 1.5px dotted #94a3b8; margin-left: 8px; padding-bottom: 2px; font-weight: 800; color: #1d4ed8; padding-left: 5px;">${patMRN}</span>
              </div>
            </div>
          </div>

          <!-- Vitals / On Examination (O/E) Box -->
          <div style="display: flex; gap: 15px; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; font-weight: 700; color: #334155; background-color: #f8fafc; align-items: center; page-break-inside: avoid;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.05em; border-right: 1.5px solid #cbd5e1; padding-right: 10px; margin-right: 5px;">Vitals / O/E</span>
            <div style="flex: 1; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div>BP: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 60px; display: inline-block; text-align: center; padding-bottom: 1px;">${bpVal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> mmHg</div>
              <div>Pulse: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 45px; display: inline-block; text-align: center; padding-bottom: 1px;">${pulseVal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> /min</div>
              <div>Temp: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 45px; display: inline-block; text-align: center; padding-bottom: 1px;">${tempVal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> °F</div>
              <div>SpO2: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 45px; display: inline-block; text-align: center; padding-bottom: 1px;">${spo2Val || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> %</div>
              <div>Weight: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 45px; display: inline-block; text-align: center; padding-bottom: 1px;">${weightVal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> kg</div>
              <div>Resp Rate: <span style="font-weight: 800; color: #1d4ed8; border-bottom: 1px dotted #94a3b8; min-width: 45px; display: inline-block; text-align: center; padding-bottom: 1px;">${rrVal || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span> /min</div>
            </div>
          </div>
          
          <div class="rx-container">
            <div class="rx-symbol">Rx</div>
          </div>
          
          <table class="meds-table">
            <thead>
              <tr>
                <th style="width: 44%;">MEDICINE & STRENGTH</th>
                <th style="width: 18%;">DOSAGE</th>
                <th style="width: 22%;">FREQUENCY</th>
                <th style="width: 16%;">DURATION</th>
              </tr>
            </thead>
            <tbody>
              ${medContent}
            </tbody>
          </table>
          
          ${adviceContent}
          
          <div class="footer-section">
            <div class="footer-left">
              <h3 style="font-size: 11px; font-weight: 800; color: #1d4ed8; margin: 0 0 3px 0; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Plus Jakarta Sans', sans-serif;">Digital Health Record</h3>
              <p style="font-size: 10px; color: #64748b; margin: 0; line-height: 1.5; font-weight: 500;">
                This document is an authorized clinical prescription registered under hospital safety guidelines. Valid for 7 days.
              </p>
            </div>
            <div class="footer-right">
              <div class="sig-line"></div>
              <h3 class="doc-name">${docName}</h3>
              <p class="doc-reg">${docReg}</p>
              <p class="doc-spec">${docSpecialty}</p>
            </div>
          </div>

          <!-- Bottom Custom Footer from Image 2 -->
          <div style="position: absolute; bottom: 0; left: 0; right: 0; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 10px 5px 10px; border-top: 1.5px solid #e2e8f0;">
              <!-- Left: 24/7 Services Badge -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="position: relative; width: 44px; height: 44px; background-color: #1d4ed8; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ef4444; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                  <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 900; font-size: 13px; color: #ffffff; position: absolute; top: 6px; left: 6px;">24</span>
                  <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 900; font-size: 13px; color: #ef4444; position: absolute; bottom: 6px; right: 6px;">7</span>
                  <div style="position: absolute; width: 28px; height: 1.5px; background-color: #ffffff; transform: rotate(-45deg);"></div>
                </div>
                <div style="display: flex; flex-direction: column;">
                  <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 10px; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1;">Emergency</span>
                  <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 900; font-size: 12px; color: #ef4444; text-transform: uppercase; line-height: 1.1;">Services</span>
                </div>
              </div>

              <!-- Middle/Left: Location Address (Reddish brown/crimson) -->
              <div style="display: flex; align-items: center; gap: 6px; color: #b91c1c; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; max-width: 320px; line-height: 1.4;">
                <span style="font-size: 14px; color: #ef4444;">📍</span>
                <span>Near-Aura Inn Hotel, Bargadwa Badeban, Bansi & Dumariyaganj Road-Basti 272001</span>
              </div>

              <!-- Right: Telephone Numbers with red circular icon -->
              <div style="display: flex; align-items: center; gap: 10px; border-left: 1.5px solid #e2e8f0; padding-left: 15px;">
                <div style="display: flex; flex-direction: column; text-align: left; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 800; color: #1d4ed8; line-height: 1.3;">
                  <span style="display: flex; align-items: center; gap: 4px;">+91-8299713820</span>
                  <span style="display: flex; align-items: center; gap: 4px;">+91-7007128144</span>
                </div>
                <div style="width: 28px; height: 28px; background-color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  📞
                </div>
              </div>
            </div>
            
            <!-- Dark blue solid strip at the very bottom -->
            <div style="height: 12px; background-color: #1e3a8a; margin-top: 10px; border-radius: 2px; width: 100%;"></div>
          </div>
        </div>
        
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `;
}
