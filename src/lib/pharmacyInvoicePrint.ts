export interface PharmacySettings {
  logoUrl: string;
  pharmacyName: string;
  address: string;
  phone: string;
  tagline: string;
  gstin: string;
  bankName: string;
  bankBranch: string;
  bankAccNo: string;
  bankIfsc: string;
  upiId: string;
  termsAndConditions: string[];
  additionalFooter: string;
}

export const DEFAULT_PHARMACY_SETTINGS: PharmacySettings = {
  logoUrl: '',
  pharmacyName: 'Gastro Plus Hospital',
  address: 'Infront of Aura Inn , Bansi Road near Badewan , Basti UP 272001',
  phone: '+918601561055',
  tagline: 'A single stop for all your Healthcare needs!',
  gstin: '',
  bankName: 'pnb',
  bankBranch: 'BASTI',
  bankAccNo: '11272187888',
  bankIfsc: 'HDFC272001',
  upiId: 'GDHJGFD',
  termsAndConditions: [
    'Subject to Uttar Pradesh Jurisdiction.',
    'Our Responsibility Ceases as soon as goods leave our Premises.',
    'Goods once sold will not be taken back.',
    'Delivery Ex-Premises.'
  ],
  additionalFooter: 'Thanks for your order! We look forward to working with you again soon.'
};

// Simple English Number-to-Words converter for Indian currency (INR)
export function numberToWords(num: number): string {
  if (num === 0) return 'ZERO RUPEES ONLY';
  
  const ones = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
    'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'
  ];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  
  function convertLessThanOneThousand(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' HUNDRED ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  let result = '';
  
  if (integerPart > 0) {
    let n = integerPart;
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    
    if (crore > 0) {
      result += convertLessThanOneThousand(crore) + ' CRORE ';
    }
    if (lakh > 0) {
      result += convertLessThanOneThousand(lakh) + ' LAKH ';
    }
    if (thousand > 0) {
      result += convertLessThanOneThousand(thousand) + ' THOUSAND ';
    }
    if (n > 0) {
      result += convertLessThanOneThousand(n);
    }
    result = result.trim() + ' RUPEES';
  }
  
  if (decimalPart > 0) {
    if (result !== '') {
      result += ' AND ';
    }
    result += convertLessThanOneThousand(decimalPart) + ' PAISA';
  }
  
  return result ? (result + ' ONLY') : 'ZERO RUPEES ONLY';
}

function formatDateToInvoice(dateStr: any): string {
  try {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export function generatePharmacyInvoiceHtml(
  bill: any,
  inventory: any[],
  patientDetails?: { name: string; phone?: string; address?: string; gstin?: string },
  customSettings?: PharmacySettings
): string {
  const settings = customSettings || DEFAULT_PHARMACY_SETTINGS;

  // Extract date
  const rawDate = bill.date || bill.created_at || new Date().toISOString();
  const invoiceDate = formatDateToInvoice(rawDate);
  const invoiceNo = bill.invoiceId || (bill.id ? bill.id.substring(0, 8).toUpperCase() : 'TEMP-01');

  // Parse items
  let rawItems = bill.items || bill.invoice_items || [];
  if (rawItems.length === 0 && bill.total_amount) {
    rawItems = [{ description: 'Pharmacy Consultation & Sales', quantity: 1, unit_price: bill.total_amount, total_price: bill.total_amount }];
  }

  // Map and hydrate item properties from current inventory
  const hydratedItems = rawItems.map((item: any, idx: number) => {
    // Attempt lookup in inventory
    const itemName = item.name || item.item_name || item.description || 'Unknown Medicine';
    const invItem = inventory.find(i => 
      i.name?.toLowerCase().trim() === itemName.toLowerCase().trim() || 
      i.id === item.id
    );

    const price = Number(item.price || item.unit_price || 0);
    const quantity = Number(item.quantity || 1);
    const taxPercentage = Number(item.taxPercentage || item.tax_percentage || invItem?.tax_percentage || 12);
    const batchNo = item.batchNumber || item.batch_number || invItem?.batch_number || invItem?.batchNumber || 'A1';
    
    // Guess manufacturing date by subtracting 2 years from expiry or default to current year minus 1
    let expiryVal = item.expiryDate || item.expiry_date || invItem?.expiry_date || invItem?.expiryDate;
    let mfgDateStr = 'Dec 2024';
    let expiryDateStr = 'Dec 2026';

    if (expiryVal) {
      try {
        const expDate = new Date(expiryVal);
        const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        expiryDateStr = `${monthsShort[expDate.getMonth()]} ${expDate.getFullYear()}`;
        
        // MFG is typical 2 years earlier
        const mfgDate = new Date(expDate.getFullYear() - 2, expDate.getMonth());
        mfgDateStr = `${monthsShort[mfgDate.getMonth()]} ${mfgDate.getFullYear()}`;
      } catch {
        expiryDateStr = expiryVal;
      }
    }

    const hsnCode = item.hsnCode || item.hsn_code || invItem?.hsn_code || invItem?.hsnCode || '30045031';
    const mrp = Number(item.mrp || invItem?.mrp || (price * 1.25));
    const discount = mrp > price ? Math.max(0, parseFloat((((mrp - price) / mrp) * 100).toFixed(2))) : 0;
    
    const taxableValue = price * quantity;
    
    return {
      srNo: idx + 1,
      name: itemName,
      batchNo,
      mfgDateStr,
      expiryDateStr,
      hsnCode,
      quantity,
      unit: item.isLoose ? 'Loose' : (invItem?.unit || 'TBS'),
      mrp,
      rate: price,
      discount,
      taxableValue,
      taxPercentage
    };
  });

  // Calculations
  const calculatedSubtotal = hydratedItems.reduce((sum, item) => sum + item.taxableValue, 0);
  
  // Group by HSN for tax grid
  const hsnMap: Record<string, { hsn: string; taxableValue: number; taxRate: number; taxAmount: number }> = {};
  
  hydratedItems.forEach(item => {
    const key = item.hsnCode;
    const taxRate = item.taxPercentage;
    const taxAmount = item.taxableValue * (taxRate / 100);
    
    if (hsnMap[key]) {
      hsnMap[key].taxableValue += item.taxableValue;
      hsnMap[key].taxAmount += taxAmount;
    } else {
      hsnMap[key] = {
        hsn: key,
        taxableValue: item.taxableValue,
        taxRate,
        taxAmount
      };
    }
  });

  const hsnRowsArray = Object.values(hsnMap);
  const totalTaxCalculated = hsnRowsArray.reduce((sum, row) => sum + row.taxAmount, 0);
  const grandTotal = bill.totalAmount || bill.total_amount || (calculatedSubtotal + totalTaxCalculated);

  const totalInWordsString = numberToWords(grandTotal);

  // Generate UPI payment URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=8&data=${encodeURIComponent(
    `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.pharmacyName)}&am=${grandTotal.toFixed(2)}&cu=INR`
  )}`;

  // Patient Address Info fallbacks
  const pName = patientDetails?.name || 'Walk-in Customer';
  const pPhone = patientDetails?.phone || 'N/A';
  const pAddress = patientDetails?.address || 'N/A';
  const pGstin = patientDetails?.gstin || 'N/A';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Pharmacy Invoice - ${invoiceNo}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #fff;
            color: #000;
            font-size: 11px;
            line-height: 1.3;
          }
          
          /* Master Frame */
          .invoice-frame {
            border: 2px solid #55ac68;
            padding: 10px;
            box-sizing: border-box;
            max-width: 210mm;
            min-height: 275mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          /* Header Styling */
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 5px;
          }
          .logo-cell {
            width: 55%;
            vertical-align: top;
          }
          .brand-logo-container {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 6px;
          }
          .custom-logo-img {
            max-height: 52px;
            max-width: 150px;
            object-fit: contain;
          }
          .default-logo-svg {
            fill: #34a853;
            width: 48px;
            height: 48px;
          }
          .brand-text-block {
            line-height: 1.1;
          }
          .brand-title {
            font-size: 22px;
            font-weight: 700;
            color: #318214;
            letter-spacing: -0.5px;
            text-transform: uppercase;
          }
          .brand-subtitle {
            font-size: 11px;
            color: #2e7d32;
            font-weight: 600;
            margin-top: 2px;
          }
          .address-tag {
            font-size: 10px;
            color: #4b5563;
            margin-top: 4px;
            line-height: 1.4;
          }
          .ad-cell {
            width: 45%;
            text-align: right;
            vertical-align: top;
          }
          
          /* Promo Badge */
          .promo-container {
            display: inline-block;
            background: #eef9ee;
            border: 1.5px solid #2e7d32;
            border-radius: 6px;
            padding: 8px 12px;
            text-align: center;
            max-width: 220px;
          }
          .promo-title {
            font-size: 12px;
            font-weight: 700;
            color: #2e7d32;
            margin: 0;
            text-transform: uppercase;
          }
          .promo-tagline {
            font-size: 9px;
            color: #4b5563;
            font-style: italic;
            margin-top: 3px;
          }

          .border-divider {
            border-bottom: 2px solid #000;
            margin-bottom: 8px;
            text-align: center;
            font-size: 10px;
            font-weight: 600;
            color: #1f2937;
            padding-bottom: 4px;
          }

          /* GSTIN & Tax Invoice Bar */
          .gst-invoice-bar {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 8px;
            background: #f3f4f6;
          }
          .gst-invoice-bar td {
            border: 1px solid #000;
            padding: 4px 10px;
            font-weight: 700;
            font-size: 11px;
          }
          .gst-left {
            width: 33%;
          }
          .gst-center {
            width: 34%;
            text-align: center;
            font-size: 13px;
            color: #1f2937;
          }
          .gst-right {
            width: 33%;
            text-align: right;
            color: #374151;
          }

          /* Details double-column layout */
          .details-layout {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 8px;
          }
          .details-layout td {
            border: 1px solid #000;
            padding: 5px 8px;
            vertical-align: top;
          }
          .cust-details-cell {
            width: 55%;
          }
          .inv-details-cell {
            width: 45%;
          }
          .detail-tag {
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            color: #4b5563;
            margin-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 2px;
          }
          
          .grid-row {
            display: flex;
            margin-bottom: 3px;
          }
          .grid-label {
            width: 90px;
            font-weight: 700;
            color: #111;
          }
          .grid-dots {
            width: 15px;
          }
          .grid-val {
            flex-grow: 1;
            color: #333;
          }

          /* Medicine product table */
          .product-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 8px;
          }
          .product-table th {
            border: 1px solid #000;
            background: #f8fafc;
            padding: 4px;
            font-size: 10px;
            font-weight: bold;
            text-align: center;
          }
          .product-table td {
            border-left: 1px solid #000;
            border-right: 1px solid #000;
            border-bottom: 1px dotted #ccc;
            padding: 6px 4px;
            font-size: 10.5px;
            vertical-align: middle;
          }
          .product-table tr:last-child td {
            border-bottom: 1px solid #000;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .product-title {
            font-weight: 600;
            color: #000;
          }

          /* Words bar */
          .words-bar {
            border: 1px solid #000;
            padding: 5px 8px;
            font-weight: 750;
            margin-bottom: 8px;
            background-color: #fafbfc;
          }

          /* Bottom double grid: HSN table, QR bank, and T&C */
          .bottom-layout {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 8px;
          }
          .bottom-layout td {
            border: 1px solid #000;
            padding: 6px;
            vertical-align: top;
          }
          
          /* HSN tax grid */
          .hsn-table {
            width: 100%;
            border-collapse: collapse;
          }
          .hsn-table th {
            background: #f3f4f6;
            font-size: 9px;
            font-weight: 700;
            border: 1px solid #000;
            padding: 3px;
          }
          .hsn-table td {
            font-size: 9.5px;
            border: 1px solid #aaa;
            padding: 3px;
          }
          
          /* Bank and QR styling */
          .bank-grid {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .bank-info-panel {
            width: 60%;
          }
          .bank-field {
            margin-bottom: 2px;
            font-size: 10px;
          }
          .qr-panel {
            width: 35%;
            text-align: center;
          }
          .qr-img {
            width: 85px;
            height: 85px;
            border: 1px solid #e5e7eb;
          }
          .qr-txt {
            font-size: 9px;
            font-weight: 700;
            margin-top: 2px;
          }

          /* T&C Bullet Points */
          .tc-list {
            margin: 0;
            padding-left: 14px;
            font-size: 10px;
            color: #374151;
            line-height: 1.3;
          }
          
          /* Signature and cert footer */
          .cert-sign-grid {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 6px;
          }
          .cert-sign-grid td {
            border: 1px solid #000;
            padding: 6px;
            vertical-align: top;
          }
          .sign-box-left {
            width: 50%;
            height: 70px;
            position: relative;
          }
          .sign-box-right {
            width: 50%;
            height: 70px;
            position: relative;
            text-align: center;
          }
          .sign-tag-line {
            font-weight: bold; 
            font-size: 9.5px;
            margin-bottom: 12px;
          }
          .sign-desc {
            font-size: 9px;
            color: #4b5563;
          }
          
          .signature-anchor {
            position: absolute;
            bottom: 6px;
            left: 10px;
            right: 10px;
            text-align: center;
            font-weight: 700;
            border-top: 1px dotted #333;
            padding-top: 2px;
            font-size: 9.5px;
          }
          
          .grand-footer {
            text-align: center;
            font-style: italic;
            font-size: 10px;
            color: #4b5563;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="invoice-frame">
          <div>
            <!-- Banner/Top Header -->
            <table class="header-table">
              <tr>
                <td class="logo-cell">
                  <div class="brand-logo-container">
                    ${settings.logoUrl ? `
                      <img src="${settings.logoUrl}" class="custom-logo-img" referrerPolicy="no-referrer" />
                    ` : `
                      <svg class="default-logo-svg" viewBox="0 0 24 24">
                        <path d="M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3z"/>
                        <path d="M0 0h24v24H0z" fill="none"/>
                      </svg>
                    `}
                    <div class="brand-text-block">
                      <div class="brand-title">${settings.pharmacyName}</div>
                      <div class="brand-subtitle">WHOLESALE & RETAIL PHARMACY</div>
                    </div>
                  </div>
                  <div class="address-tag">
                    <strong>Address:</strong> ${settings.address}<br/>
                    <strong>Phone:</strong> ${settings.phone}
                  </div>
                </td>
                <td class="ad-cell">
                  <div class="promo-container">
                    <p class="promo-title">Buy 1 Get 1 Free</p>
                    <p class="promo-tagline">${settings.tagline}</p>
                  </div>
                </td>
              </tr>
            </table>

            <div class="border-divider">
              A single stop for all your Healthcare needs!
            </div>

            <!-- GSTIN Tag bar -->
            <table class="gst-invoice-bar">
              <tr>
                <td class="gst-left">GSTIN : ${settings.gstin}</td>
                <td class="gst-center">TAX INVOICE</td>
                <td class="gst-right">ORIGINAL FOR RECIPIENT</td>
              </tr>
            </table>

            <!-- Customer & Invoice details Grid -->
            <table class="details-layout">
              <tr>
                <td class="cust-details-cell">
                  <div class="detail-tag">Customer Detail</div>
                  <div class="grid-row">
                    <div class="grid-label">M/S</div>
                    <div class="grid-dots">:</div>
                    <div class="grid-val" style="font-weight: 700;">${pName}</div>
                  </div>
                  <div class="grid-row">
                    <div class="grid-label">C.Person</div>
                    <div class="grid-dots">:</div>
                    <div class="grid-val">${pName}</div>
                  </div>
                  <div class="grid-row">
                    <div class="grid-label">Address</div>
                    <div class="grid-dots">:</div>
                    <div class="grid-val">${pAddress}</div>
                  </div>
                  <div class="grid-row">
                    <div class="grid-label">Phone</div>
                    <div class="grid-dots">:</div>
                    <div class="grid-val">${pPhone}</div>
                  </div>
                  <div class="grid-row">
                    <div class="grid-label">GSTIN</div>
                    <div class="grid-dots">:</div>
                    <div class="grid-val">${pGstin}</div>
                  </div>
                  <div class="grid-row">
                    <div class="grid-label">Place of Supply</div>
                    <div class="grid-dots">:</div>
                    <div class="grid-val">Local State Supply</div>
                  </div>
                </td>
                <td class="inv-details-cell">
                  <div class="detail-tag">Billing Detail</div>
                  <div class="grid-row">
                    <div class="grid-label">Invoice No.</div>
                    <div class="grid-dots">:</div>
                    <div class="grid-val" style="font-weight: 700; color: #1e3a8a;">${invoiceNo}</div>
                  </div>
                  <div class="grid-row">
                    <div class="grid-label">Invoice Date</div>
                    <div class="grid-dots">:</div>
                    <div class="grid-val">${invoiceDate}</div>
                  </div>
                  <div class="grid-row">
                    <div class="grid-label">Payment Mode</div>
                    <div class="grid-dots">:</div>
                    <div class="grid-val" style="font-weight: 600;">${bill.payment_method || bill.paymentMethod || 'Cash'}</div>
                  </div>
                  <div class="grid-row">
                    <div class="grid-label">Status</div>
                    <div class="grid-dots">:</div>
                    <div class="grid-val" style="color: green; font-weight: 700;">PAID (SETTLED)</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Medicine List Table -->
            <table class="product-table">
              <thead>
                <tr>
                  <th style="width: 4%;">Sr. No.</th>
                  <th style="width: 32%;">Name of Product / Service</th>
                  <th style="width: 8%;">Batch No</th>
                  <th style="width: 9%;">MFG Date</th>
                  <th style="width: 9%;">Expiry Date</th>
                  <th style="width: 9%;">HSN/SAC</th>
                  <th style="width: 6%;">Qty</th>
                  <th style="width: 7%;">MRP</th>
                  <th style="width: 7%;">Rate</th>
                  <th style="width: 4%;">Disc. (%)</th>
                  <th style="width: 9%;">Taxable Value</th>
                </tr>
              </thead>
              <tbody>
                ${hydratedItems.map(item => `
                  <tr>
                    <td class="text-center">${item.srNo}</td>
                    <td>
                      <span class="product-title">${item.name}</span>
                    </td>
                    <td class="text-center" style="font-family: monospace;">${item.batchNo}</td>
                    <td class="text-center">${item.mfgDateStr}</td>
                    <td class="text-center" style="font-weight: 500; color: #b91c1c;">${item.expiryDateStr}</td>
                    <td class="text-center">${item.hsnCode}</td>
                    <td class="text-center">${item.quantity} ${item.unit}</td>
                    <td class="text-right">${item.mrp.toFixed(2)}</td>
                    <td class="text-right">${item.rate.toFixed(2)}</td>
                    <td class="text-center">${item.discount > 0 ? item.discount.toFixed(1) : '-'}</td>
                    <td class="text-right" style="font-weight: 600;">₹${item.taxableValue.toFixed(2)}</td>
                  </tr>
                `).join('')}
                
                <!-- Spacer lines if item list is short to look professional like standard tax bills -->
                ${Array.from({ length: Math.max(0, 4 - hydratedItems.length) }).map(() => `
                  <tr style="height: 18px;">
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                `).join('')}

                <!-- Totals row -->
                <tr style="font-weight: 700; background-color: #fafbfc;">
                  <td colspan="6" class="text-right" style="padding-right: 10px;">Total Qty:</td>
                  <td class="text-center">${hydratedItems.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td colspan="3" class="text-right">Total Payable Price:</td>
                  <td class="text-right">₹${calculatedSubtotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <!-- Words Bar -->
            <div class="words-bar">
              Total in words: <span style="font-weight: 700; color: #111;">${totalInWordsString}</span>
            </div>

            <!-- Bottom grid: LHS-HSST breakdown, RHS-Bank/QR and T&C -->
            <table class="bottom-layout">
              <tr>
                <td style="width: 50%;">
                  <div style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 4px; font-size: 10px;">Tax Breakdown (GST)</div>
                  <table class="hsn-table">
                    <thead>
                      <tr>
                        <th>HSN / SAC</th>
                        <th>Taxable Value</th>
                        <th>IGST Avg %</th>
                        <th>IGST Amount</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${hsnRowsArray.map(row => `
                        <tr>
                          <td class="text-center">${row.hsn}</td>
                          <td class="text-right">${row.taxableValue.toFixed(2)}</td>
                          <td class="text-center">${row.taxRate.toFixed(1)}%</td>
                          <td class="text-right">${row.taxAmount.toFixed(2)}</td>
                          <td class="text-right">${(row.taxableValue + row.taxAmount).toFixed(2)}</td>
                        </tr>
                      `).join('')}
                      <tr style="font-weight: 800; background: #eef2fd;">
                        <td>Total</td>
                        <td class="text-right">${calculatedSubtotal.toFixed(2)}</td>
                        <td class="text-center">-</td>
                        <td class="text-right">${totalTaxCalculated.toFixed(2)}</td>
                        <td class="text-right">₹${grandTotal.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p style="font-size: 8.5px; font-weight: bold; margin-top: 6px; color: #374151;">
                    Total Tax in words: ${numberToWords(totalTaxCalculated)}
                  </p>
                </td>
                
                <td style="width: 50%;">
                  <div class="bank-grid">
                    <div class="bank-info-panel">
                      <div style="font-weight: bold; font-size: 10px; border-bottom: 1px solid #e5e7eb; margin-bottom: 4px;">Bank & UPI Details</div>
                      <div class="bank-field"><strong>Bank Name:</strong> ${settings.bankName}</div>
                      <div class="bank-field"><strong>Branch:</strong> ${settings.bankBranch}</div>
                      <div class="bank-field"><strong>A/c No:</strong> ${settings.bankAccNo}</div>
                      <div class="bank-field"><strong>IFSC:</strong> ${settings.bankIfsc}</div>
                      <div class="bank-field"><strong>UPI ID:</strong> ${settings.upiId}</div>
                    </div>
                    <div class="qr-panel">
                      <img src="${qrCodeUrl}" class="qr-img" />
                      <div class="qr-txt">Pay using UPI</div>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td colspan="2">
                  <div style="font-weight: bold; font-size: 10px; margin-bottom: 3px;">Terms and Conditions</div>
                  <ol class="tc-list">
                    ${settings.termsAndConditions.map((term: string) => `<li>${term}</li>`).join('')}
                  </ol>
                </td>
              </tr>
            </table>

            <!-- Signature block -->
            <table class="cert-sign-grid">
              <tr>
                <td class="sign-box-left">
                  <div class="sign-tag-line">Customer Signature</div>
                  <div class="signature-anchor">Debtor/Receiver Signature</div>
                </td>
                <td class="sign-box-right">
                  <div class="sign-desc">Certified that the particulars given above are true and correct.</div>
                  <div style="font-weight: 700; font-size: 10px; margin-top: 4px;">For ${settings.pharmacyName}</div>
                  <div class="signature-anchor">Authorised Signatory</div>
                </td>
              </tr>
            </table>
          </div>
          
          <div class="grand-footer">
            ${settings.additionalFooter}
          </div>
        </div>

        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => { window.close(); }, 800);
          }
        </script>
      </body>
    </html>
  `;
}
