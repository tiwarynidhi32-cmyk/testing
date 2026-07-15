import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  User, 
  CheckCircle, 
  Clock, 
  Printer, 
  Trash2, 
  Eye, 
  X, 
  Calendar,
  AlertTriangle,
  FileCheck2,
  Lock,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import { supabaseService } from '@/services/supabaseService';
import { OTConsent } from '@/types';

const CONSENT_TEMPLATES: Record<string, { title: string; text: string }> = {
  'General': {
    title: 'General Admission & Diagnostic Treatment Consent',
    text: `1. CONSENT TO TREATMENT: I hereby authorize the medical, nursing, and administrative staff of GASTROPLUS HOSPITAL to administer diagnostics, lab tests, routine nursing interventions, and general non-invasive healthcare treatments deemed appropriate by my attending physicians.\n\n2. FINANCIAL DISCLOSURE: I understand that I am fully responsible for any charges incurred during my hospital visit that are not covered by insurance or government schemes.\n\n3. PRIVACY & RECORDS: I agree to the storage and sharing of my clinical data for ongoing care, billing, and regulatory audits in compliance with healthcare data protection standards.`
  },
  'Surgery': {
    title: 'Informed Surgical Procedure Consent',
    text: `1. AUTHORIZATION OF PROCEDURE: I authorize the primary surgeon and their assistants to perform the scheduled surgical operation on me. The nature, purpose, and visual scope of the surgery have been explained to me in detail.\n\n2. SURGICAL RISKS: I recognize that all surgical procedures carry inherent risks, including but not limited to severe hemorrhage, post-operative infection, scarring, adjacent organ injury, or cardiac event. No guarantee has been made regarding the absolute outcome of the surgery.\n\n3. EMERGENCY CLINICAL ALTERATIONS: If during the course of the surgery any unforeseen conditions arise requiring immediate actions, I authorize the surgical team to perform whatever procedures are medically necessary to save my life.`
  },
  'Anaesthesia': {
    title: 'Anesthesia Administration Informed Consent',
    text: `1. ANESTHETIC OPTIONS: I authorize the anesthesiology team to administer General, Spinal, Epidural, Regional, or Monitored Anesthesia Care (MAC) as deemed appropriate for my scheduled surgical procedure.\n\n2. KNOWN SIDE EFFECTS & COMPLICATIONS: I am aware that anesthesia carries potential complications, ranging from mild side effects (nausea, vomiting, sore throat, shivering, headache) to extremely rare but severe life-threatening events (malignant hyperthermia, anaphylaxis, permanent nerve injury, respiratory failure, or stroke).\n\n3. PRE-OP DISCLOSURE: I certify that I have fully disclosed my medical history, current medications, allergies, and fasting (nil-by-mouth) status to the anesthesiologist.`
  },
  'Blood Transfusion': {
    title: 'Blood and Blood Product Transfusion Consent',
    text: `1. RECOMMENDATION OF THERAPY: I consent to the administration of blood, packed cells, platelets, fresh frozen plasma, or other blood products under the direction of my treating medical team.\n\n2. BENEFITS & CRITICAL RISKS: While blood screening minimizes risks, I acknowledge that transfusions carry minor risks (fever, allergic hives) and rare, critical risks (hemolytic transfusion reaction, transfusion-related acute lung injury (TRALI), bacterial contamination, or transmission of viral infections like Hepatitis or HIV).\n\n3. DIRECTED ALTERNATIVES: I have been briefed on alternative treatments such as iron therapy or volume expanders and understand why blood transfusion is recommended in my current clinical situation.`
  },
  'ICU': {
    title: 'Intensive Care Unit (ICU) Admission and Monitoring Consent',
    text: `1. ICU ADMISSION CRITERIA: I consent to my/the patient's admission to the Intensive Care Unit (ICU) for high-intensity clinical monitoring and multi-organ life support interventions.\n\n2. INVASIVE PROCEDURES: I understand that ICU care frequently requires invasive procedures, including central venous catheter insertion, arterial lines, endotracheal intubation, mechanical ventilation, renal dialysis, or temporary pacemaker placement.\n\n3. REAL-TIME PROGNOSIS: I acknowledge that critical illness is unstable, and the ICU team will provide regular clinical briefings. I understand that the primary goal is resuscitation, stabilizing major vitals, and preventing multi-organ failure.`
  },
  'High-risk': {
    title: 'High-Risk Surgical and Morbidity Consent',
    text: `1. CRITICAL DESIGNATION: I acknowledge that my planned procedure is classified as HIGH-RISK due to pre-existing co-morbidities (such as advanced heart failure, pulmonary dysfunction, renal impairment, or septic shock) or the complex anatomical nature of the surgery.\n\n2. ELEVATED MORTALITY DISCLOSURE: The medical team has explicitly explained to me and my next-of-kin that there is a significant, elevated risk of intra-operative or post-operative mortality (death) or severe, irreversible disability (e.g. major stroke, paralysis, permanent vegetative state).\n\n3. RESUSCITATION PREFERENCES: In signing this, I acknowledge that I want the medical team to undertake all logical resuscitative measures unless an active, verified DNR (Do Not Resuscitate) order is on file.`
  }
};

const INITIAL_CONSENTS: OTConsent[] = [
  { id: 'ct-1', patientId: 'p1', type: 'General', terms: CONSENT_TEMPLATES['General'].text, patientName: 'Arjun Mehta', witnessName: 'Dr. Sarah Sharma', signedAt: '2026-07-01T10:00:00Z', signatureType: 'Typed', signatureData: 'Arjun Mehta', status: 'Signed' },
  { id: 'ct-2', patientId: 'p2', type: 'Surgery', terms: CONSENT_TEMPLATES['Surgery'].text, patientName: 'Ananya Iyer', witnessName: 'Nurse Deepika Roy', signedAt: '2026-07-02T14:30:00Z', signatureType: 'Typed', signatureData: 'Ananya Iyer', status: 'Signed' },
  { id: 'ct-3', patientId: 'p3', type: 'Anaesthesia', terms: CONSENT_TEMPLATES['Anaesthesia'].text, patientName: 'Rajesh Kumar', guardianName: 'Meena Kumar', witnessName: 'Dr. Alok Verma', signedAt: '2026-07-03T08:15:00Z', signatureType: 'Typed', signatureData: 'Rajesh Kumar', status: 'Signed' }
];

export default function OTConsentManagement() {
  const [consents, setConsents] = useState<OTConsent[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingConsent, setViewingConsent] = useState<OTConsent | null>(null);

  // Patient dropdown search
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    type: 'General' as OTConsent['type'],
    terms: CONSENT_TEMPLATES['General'].text,
    guardianName: '',
    witnessName: '',
    signatureData: '',
    status: 'Signed' as OTConsent['status']
  });

  useEffect(() => {
    const fetchConsentsAndPatients = async () => {
      // Load consents
      const storedCons = await supabaseService.getOTConsents();
      if (storedCons && storedCons.length > 0) {
        setConsents(storedCons);
      } else {
        setConsents(INITIAL_CONSENTS);
      }

      // Load patients
      const data = await supabaseService.getPatients();
      if (data) setPatients(data);
    };
    fetchConsentsAndPatients();
  }, []);

  const handleOpenAdd = () => {
    setPatientSearch('');
    setFormData({
      patientId: '',
      patientName: '',
      type: 'General',
      terms: CONSENT_TEMPLATES['General'].text,
      guardianName: '',
      witnessName: '',
      signatureData: '',
      status: 'Signed'
    });
    setIsAddOpen(true);
  };

  const handleTypeChange = (type: OTConsent['type']) => {
    setFormData(prev => ({
      ...prev,
      type,
      terms: CONSENT_TEMPLATES[type]?.text || ''
    }));
  };

  const handleSelectPatient = (pat: any) => {
    setFormData(prev => ({
      ...prev,
      patientId: pat.id,
      patientName: pat.name
    }));
    setPatientSearch(pat.name);
    setShowPatientList(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId) {
      toast.error('Please select a valid patient');
      return;
    }
    if (!formData.signatureData) {
      toast.error('Patient or Guardian Signature is required to authorize the consent.');
      return;
    }
    if (!formData.witnessName) {
      toast.error('Witness Name is required.');
      return;
    }

    const newConsent: OTConsent = {
      id: `ct-${Date.now()}`,
      patientId: formData.patientId,
      type: formData.type,
      terms: formData.terms,
      patientName: formData.patientName,
      guardianName: formData.guardianName || undefined,
      witnessName: formData.witnessName,
      signedAt: new Date().toISOString(),
      signatureType: 'Typed',
      signatureData: formData.signatureData,
      status: formData.status
    };

    const saved = await supabaseService.createOTConsent(newConsent);
    if (saved) {
      setConsents(prev => [saved, ...prev]);
      toast.success('Informed clinical consent signed and archived successfully');
      setIsAddOpen(false);
    } else {
      toast.error('Failed to archive consent');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete/revoke this consent form from archives?')) {
      const success = await supabaseService.deleteOTConsent(id);
      if (success) {
        setConsents(prev => prev.filter(c => c.id !== id));
        toast.success('Consent record deleted');
      } else {
        toast.error('Failed to delete consent record');
      }
    }
  };

  const handlePrint = (consent: OTConsent) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Failed to open print layout. Please disable popup blockers.');
      return;
    }

    const patientDetails = patients.find(p => p.id === consent.patientId) || { mrn: 'N/A', age: 'N/A', gender: 'N/A', phone: 'N/A' };
    const dateFormatted = new Date(consent.signedAt).toLocaleString();

    printWindow.document.write(`
      <html>
        <head>
          <title>Consent Form - ${consent.type}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 3px double #1A5E63; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #1A5E63; margin: 0; font-size: 26px; font-weight: bold; }
            .header p { margin: 5px 0 0 0; color: #666; font-size: 13px; }
            .title { text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 20px 0; color: #111; letter-spacing: 0.5px; }
            .patient-box { border: 1px solid #ccc; background-color: #fcfcfc; padding: 15px; border-radius: 8px; margin-bottom: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
            .patient-box div span { font-weight: bold; color: #111; }
            .terms-box { border: 1px solid #e0e0e0; padding: 20px; font-size: 14px; background: #fff; border-radius: 8px; white-space: pre-wrap; margin-bottom: 35px; color: #444; }
            .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; font-size: 14px; page-break-inside: avoid; }
            .sig-block { border-top: 1px solid #999; padding-top: 10px; text-align: center; }
            .sig-block p { margin: 5px 0; }
            .sig-data { font-family: 'Georgia', serif; font-style: italic; font-size: 20px; color: #1A5E63; margin: 15px 0; }
            .footer { margin-top: 60px; font-size: 11px; text-align: center; border-top: 1px solid #eee; padding-top: 15px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GASTROPLUS MULTISPECIALITY HOSPITAL</h1>
            <p>Plot No. 12, Healthcare Sector, Tech City • Tel: +91 98765 43210 • Email: info@gastroplus.com</p>
          </div>
          <div class="title">${CONSENT_TEMPLATES[consent.type]?.title || consent.type + ' Consent'}</div>
          
          <div class="patient-box">
            <div><span>Patient Name:</span> ${consent.patientName}</div>
            <div><span>MRN:</span> ${patientDetails.mrn}</div>
            <div><span>Age / Gender:</span> ${patientDetails.age} Yrs / ${patientDetails.gender}</div>
            <div><span>Signed Date & Time:</span> ${dateFormatted}</div>
          </div>

          <div class="terms-box">
            ${consent.terms}
          </div>

          <div class="signature-section">
            <div class="sig-block">
              <div class="sig-data">${consent.signatureData}</div>
              <p><strong>Patient / Guardian Signature</strong></p>
              ${consent.guardianName ? `<p style="font-size:12px; color:#555;">Guardian: ${consent.guardianName}</p>` : ''}
            </div>
            <div class="sig-block">
              <div class="sig-data" style="font-size:16px;">${consent.witnessName}</div>
              <p><strong>Witness / Clinical Staff Signature</strong></p>
            </div>
          </div>

          <div class="footer">
            <p>This is an archived, legally-binding clinical consent form. Digitally locked at ${dateFormatted}.</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('Print layout generated');
  };

  const filteredConsents = consents.filter(c => {
    const matchesSearch = c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.witnessName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All' || c.type === selectedType;
    return matchesSearch && matchesType;
  });

  const consentTypes = ['All', 'General', 'Surgery', 'Anaesthesia', 'Blood Transfusion', 'ICU', 'High-risk'];

  return (
    <div className="space-y-6">
      {/* Informational Banner */}
      <div className="flex flex-col md:flex-row gap-6 p-6 rounded-2xl border border-[#1A5E63]/20 bg-slate-50/50">
        <div className="p-4 rounded-xl bg-[#1A5E63]/10 text-[#1A5E63] self-start">
          <FileCheck2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="font-bold text-[#1A5E63] text-lg">Informed Digital Consents</h3>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            Authorize surgical and critical interventions securely. Each consent generates a digitally timestamped record detailing surgical benefits, anesthetist responsibilities, blood transfusions, or intensive care unit designations.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-800 text-[10px] font-bold">256-Bit Encrypted</Badge>
            <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-800 text-[10px] font-bold">Audit Trails Intact</Badge>
            <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800 text-[10px] font-bold">Printable Layouts</Badge>
          </div>
        </div>
      </div>

      {/* Main Grid: list + quick creation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Filterable Consent Archives */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Informed Consent Archives</CardTitle>
                  <CardDescription className="text-xs">Access pre-operative, anesthetic, and critical care consent authorizations.</CardDescription>
                </div>
                <Button onClick={handleOpenAdd} className="bg-medical-blue hover:bg-medical-blue/90 gap-1 text-xs font-semibold h-9">
                  <Plus className="w-4 h-4" />
                  Sign New Consent
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by patient or witness..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Consent Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {consentTypes.map(t => <SelectItem key={t} value={t} className="text-xs">{t === 'All' ? 'All Types' : t + ' Consent'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {filteredConsents.length > 0 ? (
                  filteredConsents.map((consent) => {
                    const patientDetails = patients.find(p => p.id === consent.patientId) || {};
                    return (
                      <div key={consent.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-xs transition-all bg-white flex items-center justify-between gap-4 group">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[9px] font-bold px-2 py-0.5 uppercase ${
                              consent.type === 'High-risk' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              consent.type === 'ICU' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              consent.type === 'Surgery' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              consent.type === 'Anaesthesia' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}>
                              {consent.type} Consent
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {new Date(consent.signedAt).toLocaleDateString()} at {new Date(consent.signedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-800">{consent.patientName}</h4>
                          <p className="text-[11px] text-slate-500 truncate">
                            Witness: <strong className="text-slate-600">{consent.witnessName}</strong> {consent.guardianName ? `• Guardian: ${consent.guardianName}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-500 hover:bg-slate-100" 
                            onClick={() => setViewingConsent(consent)}
                            title="Quick View Terms"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-medical-blue hover:bg-blue-50"
                            onClick={() => handlePrint(consent)}
                            title="Print Formal Layout"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                            onClick={() => handleDelete(consent.id)}
                            title="Revoke / Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    No consent authorization records matched criteria.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Quick Check List & Templates */}
        <div className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-[#1A5E63]">Required Checklists</CardTitle>
              <CardDescription className="text-[10px]">Verify all patient permissions before scheduling incision times.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 pt-2 text-xs font-semibold text-slate-700">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-emerald-50/40 border border-emerald-100">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-emerald-950">Pre-Op Anaesthesia Form</p>
                  <p className="text-[10px] text-emerald-800 font-medium mt-0.5">Mandatory for any spinal or general block procedures.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-emerald-50/40 border border-emerald-100">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-emerald-950">Blood Autologous Reserve</p>
                  <p className="text-[10px] text-emerald-800 font-medium mt-0.5">Checked when high blood loss is estimated (e.g. cardiac).</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-amber-50/30 border border-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-950">High-Risk Signatures</p>
                  <p className="text-[10px] text-amber-800 font-medium mt-0.5">Co-signed by next-of-kin if ASA score is Class IV or V.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-extrabold text-slate-800">Quick Template Review</CardTitle>
              <CardDescription className="text-[10px]">Read core conditions for various consent modules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {Object.entries(CONSENT_TEMPLATES).slice(0, 4).map(([key, item]) => (
                <div 
                  key={key} 
                  className="p-2 border rounded-lg hover:bg-slate-50 cursor-pointer flex justify-between items-center group transition-colors"
                  onClick={() => setViewingConsent({
                    id: 'temp',
                    patientId: '',
                    type: key as any,
                    terms: item.text,
                    patientName: 'Template Viewer',
                    witnessName: 'None',
                    signedAt: new Date().toISOString(),
                    signatureType: 'Typed',
                    signatureData: '',
                    status: 'Draft'
                  })}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">{key} Consent</p>
                    <p className="text-[9px] text-slate-400 truncate mt-0.5">{item.title}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 transition-colors" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add New Consent Form Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1A5E63] font-bold text-xl">Digital Clinical Consent Authorization</DialogTitle>
            <DialogDescription>
              Select a patient, choose the consent type, review template terms, and capture authorization details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Patient Search Dropdown */}
            <div className="space-y-1.5 relative">
              <Label className="font-semibold text-slate-800">Select Patient *</Label>
              <div className="relative">
                <Input 
                  placeholder="Type name or phone to search..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowPatientList(true);
                  }}
                  onFocus={() => setShowPatientList(true)}
                  required
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
              
              {showPatientList && patientSearch.length > 0 && (
                <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-[160px] overflow-y-auto">
                  {patients.filter(p => 
                    p.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
                    (p.phone || '').includes(patientSearch)
                  ).length > 0 ? (
                    patients.filter(p => 
                      p.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
                      (p.phone || '').includes(patientSearch)
                    ).map(p => (
                      <div 
                        key={p.id} 
                        className="p-2.5 hover:bg-slate-50 cursor-pointer border-b last:border-0 flex justify-between items-center"
                        onClick={() => handleSelectPatient(p)}
                      >
                        <div>
                          <p className="text-xs font-bold">{p.name}</p>
                          <p className="text-[10px] text-slate-400">MRN: {p.mrn} • Age: {p.age} • Gender: {p.gender}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-3 text-xs text-center text-slate-400">No patients matched search criteria</p>
                  )}
                </div>
              )}
            </div>

            {/* Consent Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-800">Consent Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v: any) => handleTypeChange(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General Consent</SelectItem>
                    <SelectItem value="Surgery">Surgery Consent</SelectItem>
                    <SelectItem value="Anaesthesia">Anaesthesia Consent</SelectItem>
                    <SelectItem value="Blood Transfusion">Blood Transfusion</SelectItem>
                    <SelectItem value="ICU">ICU Admission</SelectItem>
                    <SelectItem value="High-risk">High-Risk Consent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-800">Guardian Name (If minor / ward)</Label>
                <Input 
                  placeholder="e.g. Mary Doe (Relationship: Mother)"
                  value={formData.guardianName}
                  onChange={(e) => setFormData({...formData, guardianName: e.target.value})}
                />
              </div>
            </div>

            {/* Terms review (editable) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-slate-800">Legal & Medical Terms of Consent</Label>
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 font-bold">Standard Template Loaded</Badge>
              </div>
              <textarea 
                value={formData.terms}
                onChange={(e) => setFormData({...formData, terms: e.target.value})}
                rows={6}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium leading-relaxed font-sans ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5E63] disabled:cursor-not-allowed disabled:opacity-50 custom-scrollbar"
              />
            </div>

            {/* Witness & Signature */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-800">Authorized Witness / Staff *</Label>
                <Input 
                  placeholder="e.g. Dr. Alok Verma"
                  value={formData.witnessName}
                  onChange={(e) => setFormData({...formData, witnessName: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-800">Patient/Guardian E-Signature *</Label>
                <Input 
                  placeholder="Type Full Legal Name to Sign"
                  value={formData.signatureData}
                  onChange={(e) => setFormData({...formData, signatureData: e.target.value})}
                  required
                  className="font-serif italic text-sm text-[#1A5E63] font-bold"
                />
              </div>
            </div>

            <Separator className="pt-2" />

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold px-1">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Submitting this form certifies verbal briefing of medical procedure benefits, alternatives, and catastrophic failure outcomes.
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#1A5E63] hover:bg-[#154c50]">Sign & Archive</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detailed View Modal */}
      <Dialog open={!!viewingConsent} onOpenChange={() => setViewingConsent(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">ARCHIVED DOCUMENT</Badge>
              {viewingConsent?.status === 'Signed' && <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">SIGNED</Badge>}
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 mt-2">
              {viewingConsent ? CONSENT_TEMPLATES[viewingConsent.type]?.title : ''}
            </DialogTitle>
          </DialogHeader>

          {viewingConsent && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 border rounded-lg text-xs grid grid-cols-2 gap-2 text-slate-600 font-semibold">
                <div>Patient Name: <strong className="text-slate-800">{viewingConsent.patientName}</strong></div>
                <div>Witness: <strong className="text-slate-800">{viewingConsent.witnessName}</strong></div>
                {viewingConsent.guardianName && <div className="col-span-2">Guardian: <strong className="text-slate-800">{viewingConsent.guardianName}</strong></div>}
                <div className="col-span-2">Signed At: <strong className="text-slate-800">{new Date(viewingConsent.signedAt).toLocaleString()}</strong></div>
              </div>

              <div className="p-4 bg-slate-50 border rounded-lg text-xs max-h-[220px] overflow-y-auto font-medium leading-relaxed text-slate-600 white-space-pre-wrap font-sans custom-scrollbar">
                {viewingConsent.terms}
              </div>

              <div className="p-3 border rounded-lg border-dashed bg-emerald-50/20 flex flex-col items-center justify-center py-4">
                <span className="font-serif italic text-xl text-[#1A5E63] font-bold mb-1">
                  {viewingConsent.signatureData || 'No Signature'}
                </span>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Authorized Digital E-Signature</span>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setViewingConsent(null)}>Close</Button>
                <Button className="bg-[#1A5E63]" onClick={() => handlePrint(viewingConsent)}>
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print Consent Form
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
