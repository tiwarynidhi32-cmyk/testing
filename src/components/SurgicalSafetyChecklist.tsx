import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  ShieldAlert, 
  ClipboardCheck, 
  UserCheck, 
  Save, 
  Clock, 
  CheckCircle,
  HelpCircle,
  Stethoscope,
  Scissors,
  Wrench,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Activity,
  Heart,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';

interface SurgicalSafetyChecklistProps {
  record: any;
  patient: any;
  onClose: () => void;
  onSave?: () => void;
}

export default function SurgicalSafetyChecklist({ record, patient, onClose, onSave }: SurgicalSafetyChecklistProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [coordinator, setCoordinator] = useState('');
  const [notes, setNotes] = useState('');

  // Step 1: Patient Identity Verification
  const [identityChecks, setIdentityChecks] = useState({
    nameVerified: false,
    mrnVerified: false,
    consentFormSigned: false,
    idBandSecured: false,
    procedureConfirmed: false,
    allergyStatusChecked: false,
  });

  // Step 2: Surgical Site Marking
  const [siteChecks, setSiteChecks] = useState({
    siteMarked: false,
    siteCorrectlyIdentified: false,
    notApplicableReason: '', // e.g. single organ, dental, etc.
    surgicalSiteConfirmedWithPatient: false,
    consentMatchesSite: false,
  });

  // Step 3: Equipment & Anesthesia Readiness
  const [equipmentChecks, setEquipmentChecks] = useState({
    anesthesiaMachineChecked: false,
    airwayAspirationChecked: false,
    pulseOximeterFunctioning: false,
    sterileIndicatorConfirmed: false,
    diathermyGroundingSecured: false,
    implantsAvailable: false,
    equipmentCalibrated: false,
  });

  // Step 4: Final Sign-Off & Team Coordination
  const [signOffChecks, setSignOffChecks] = useState({
    teamIntroduced: false,
    bloodLossRiskAssessed: false,
    antibioticProphylaxisGiven: false,
    specimenLabelingPlanChecked: false,
    spongeInstrumentCountCorrect: false,
    criticalConcernsReviewed: false,
  });

  // Load existing checklist state if available
  useEffect(() => {
    const savedChecklists = storage.get('hms_ot_surgical_checklists', {});
    const saved = savedChecklists[record.id];
    if (saved) {
      if (saved.identityChecks) setIdentityChecks(saved.identityChecks);
      if (saved.siteChecks) setSiteChecks(saved.siteChecks);
      if (saved.equipmentChecks) setEquipmentChecks(saved.equipmentChecks);
      if (saved.signOffChecks) setSignOffChecks(saved.signOffChecks);
      if (saved.completedBy) setCoordinator(saved.completedBy);
      if (saved.notes) setNotes(saved.notes);
      if (saved.currentStep) setCurrentStep(saved.currentStep);
    }
  }, [record.id]);

  // Calculate completeness score
  const totalChecks = 
    Object.keys(identityChecks).length + 
    Object.keys(siteChecks).length - 1 + // Exclude 'notApplicableReason' string
    Object.keys(equipmentChecks).length + 
    Object.keys(signOffChecks).length;

  const completedChecksCount = 
    Object.values(identityChecks).filter(Boolean).length + 
    Object.values(siteChecks).filter(v => typeof v === 'boolean' && v).length + 
    Object.values(equipmentChecks).filter(Boolean).length + 
    Object.values(signOffChecks).filter(Boolean).length;

  const percentComplete = Math.round((completedChecksCount / totalChecks) * 100);

  const handleSave = () => {
    if (!coordinator.trim()) {
      toast.error('Please enter the name of the Checklist Coordinator');
      return;
    }

    const savedChecklists = storage.get('hms_ot_surgical_checklists', {});
    savedChecklists[record.id] = {
      recordId: record.id,
      identityChecks,
      siteChecks,
      equipmentChecks,
      signOffChecks,
      completedBy: coordinator,
      notes,
      percentComplete,
      currentStep,
      updatedAt: new Date().toISOString()
    };

    storage.set('hms_ot_surgical_checklists', savedChecklists);
    toast.success('Surgical Safety Checklist saved successfully!');
    if (onSave) onSave();
    onClose();
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-white text-slate-800">
        {/* Header section with progress indicator */}
        <DialogHeader className="p-6 bg-gradient-to-r from-slate-900 to-slate-850 text-white relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500 text-white">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <DialogTitle className="text-xl font-black tracking-tight">Surgical Safety Checklist (WHO Protocol)</DialogTitle>
              </div>
              <DialogDescription className="text-xs font-semibold text-slate-300">
                Operating Theatre Safety Compliance for <span className="text-emerald-400 font-extrabold">{patient?.name || 'Unknown Patient'}</span> • MRN: <span className="text-emerald-400 font-extrabold">{patient?.mrn || 'N/A'}</span>
              </DialogDescription>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Total Progress:</span>
                <Badge variant="outline" className={`font-black tracking-tight border-none ${percentComplete === 100 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                  {percentComplete}% Complete ({completedChecksCount}/{totalChecks})
                </Badge>
              </div>
              <div className="w-48 h-2.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Procedure & Patient summary bar */}
        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs">
            <Stethoscope className="w-4 h-4 text-indigo-500" />
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-widest text-[9px]">Procedure</span>
              <span className="font-black text-slate-800">{record.operationName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <UserCheck className="w-4 h-4 text-teal-500" />
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-widest text-[9px]">Surgeon</span>
              <span className="font-black text-slate-800">{record.surgeonName || 'Assigned Surgeon'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-4 h-4 text-amber-500" />
            <div>
              <span className="font-bold text-slate-400 block uppercase tracking-widest text-[9px]">Schedule</span>
              <span className="font-black text-slate-800">{record.date || record.scheduled_date} • {record.startTime || record.scheduled_time || 'Pending'}</span>
            </div>
          </div>
        </div>

        {/* Interactive Step Progress Tracker */}
        <div className="px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between relative max-w-2xl mx-auto">
            {/* Step 1 */}
            <button 
              onClick={() => setCurrentStep(1)}
              className="flex flex-col items-center z-10 focus:outline-none"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                currentStep === 1 
                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' 
                  : currentStep > 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
              }`}>
                {Object.values(identityChecks).every(Boolean) ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={`text-[10px] font-black uppercase mt-1 tracking-tight ${currentStep === 1 ? 'text-indigo-600' : 'text-slate-400'}`}>Identity</span>
            </button>

            {/* Line 1 */}
            <div className={`flex-1 h-1 mx-2 rounded ${currentStep > 1 ? 'bg-indigo-500' : 'bg-slate-100'}`} />

            {/* Step 2 */}
            <button 
              onClick={() => setCurrentStep(2)}
              className="flex flex-col items-center z-10 focus:outline-none"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                currentStep === 2 
                  ? 'bg-amber-500 text-white ring-4 ring-amber-100' 
                  : currentStep > 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
              }`}>
                {siteChecks.siteMarked && siteChecks.siteCorrectlyIdentified ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className={`text-[10px] font-black uppercase mt-1 tracking-tight ${currentStep === 2 ? 'text-amber-500' : 'text-slate-400'}`}>Site Mark</span>
            </button>

            {/* Line 2 */}
            <div className={`flex-1 h-1 mx-2 rounded ${currentStep > 2 ? 'bg-amber-500' : 'bg-slate-100'}`} />

            {/* Step 3 */}
            <button 
              onClick={() => setCurrentStep(3)}
              className="flex flex-col items-center z-10 focus:outline-none"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                currentStep === 3 
                  ? 'bg-sky-500 text-white ring-4 ring-sky-100' 
                  : currentStep > 3 ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-400'
              }`}>
                {Object.values(equipmentChecks).every(Boolean) ? <Check className="w-4 h-4" /> : '3'}
              </div>
              <span className={`text-[10px] font-black uppercase mt-1 tracking-tight ${currentStep === 3 ? 'text-sky-500' : 'text-slate-400'}`}>Equipment</span>
            </button>

            {/* Line 3 */}
            <div className={`flex-1 h-1 mx-2 rounded ${currentStep > 3 ? 'bg-sky-500' : 'bg-slate-100'}`} />

            {/* Step 4 */}
            <button 
              onClick={() => setCurrentStep(4)}
              className="flex flex-col items-center z-10 focus:outline-none"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                currentStep === 4 
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' 
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {Object.values(signOffChecks).every(Boolean) ? <Check className="w-4 h-4" /> : '4'}
              </div>
              <span className={`text-[10px] font-black uppercase mt-1 tracking-tight ${currentStep === 4 ? 'text-emerald-600' : 'text-slate-400'}`}>Sign-Off</span>
            </button>
          </div>
        </div>

        {/* Step Contents */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-slate-50/50">
          {/* STEP 1: PATIENT IDENTITY VERIFICATION */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0" />
                <p className="text-xs font-bold text-indigo-800 leading-relaxed">
                  <span className="uppercase font-black mr-1">Phase 1: Sign-In Protocol</span>
                  Before induction of anesthesia, the coordinator must verbally confirm the patient's identity, surgical site, planned procedure, and written consent.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${identityChecks.nameVerified ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={identityChecks.nameVerified}
                    onCheckedChange={(checked) => setIdentityChecks(prev => ({ ...prev, nameVerified: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Patient's Name is Confirmed</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Verify verbally with patient or legal guardian</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${identityChecks.mrnVerified ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={identityChecks.mrnVerified}
                    onCheckedChange={(checked) => setIdentityChecks(prev => ({ ...prev, mrnVerified: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Medical Record Number (MRN) Matches</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Verify matches of case sheet & ID bracelet</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${identityChecks.consentFormSigned ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={identityChecks.consentFormSigned}
                    onCheckedChange={(checked) => setIdentityChecks(prev => ({ ...prev, consentFormSigned: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Written Informed Consent Secured</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Explicit signature of patient and doctor on file</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${identityChecks.idBandSecured ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={identityChecks.idBandSecured}
                    onCheckedChange={(checked) => setIdentityChecks(prev => ({ ...prev, idBandSecured: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">ID Barcode/Band Placed on Patient</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Double check secure wrist/ankle attachment</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${identityChecks.procedureConfirmed ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={identityChecks.procedureConfirmed}
                    onCheckedChange={(checked) => setIdentityChecks(prev => ({ ...prev, procedureConfirmed: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Surgical Procedure Confirmed</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Check specific clinical system records match</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${identityChecks.allergyStatusChecked ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={identityChecks.allergyStatusChecked}
                    onCheckedChange={(checked) => setIdentityChecks(prev => ({ ...prev, allergyStatusChecked: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Allergy Status Checked & Logged</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Confirm known drug or latex hyper-sensitivities</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: SURGICAL SITE MARKING */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-50 border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-800 leading-relaxed">
                  <span className="uppercase font-black mr-1">Phase 2: Surgical Site Validation</span>
                  Verify that the surgical site has been physically marked by the clinician performing the surgery. If not marked, document why (e.g., midline laparotomy).
                </p>
              </div>

              <div className="space-y-3">
                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${siteChecks.siteMarked ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={siteChecks.siteMarked}
                    onCheckedChange={(checked) => setSiteChecks(prev => ({ ...prev, siteMarked: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Surgical Site is Visibly Marked</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Clinician mark must remain visible after prep and draping</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${siteChecks.siteCorrectlyIdentified ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={siteChecks.siteCorrectlyIdentified}
                    onCheckedChange={(checked) => setSiteChecks(prev => ({ ...prev, siteCorrectlyIdentified: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Right/Left Lateralization Confirmed</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Verify correct side/limb/digit against diagnostic records</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${siteChecks.surgicalSiteConfirmedWithPatient ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={siteChecks.surgicalSiteConfirmedWithPatient}
                    onCheckedChange={(checked) => setSiteChecks(prev => ({ ...prev, surgicalSiteConfirmedWithPatient: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Surgical Site Confirmed with Patient</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Patient verbally agrees that this is the correct target site</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${siteChecks.consentMatchesSite ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={siteChecks.consentMatchesSite}
                    onCheckedChange={(checked) => setSiteChecks(prev => ({ ...prev, consentMatchesSite: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Consent Details Match Site Mark</p>
                    <p className="text-[11px] text-slate-500 font-semibold">The written surgical consent forms align perfectly with the mark</p>
                  </div>
                </label>

                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <Label className="text-xs font-black text-slate-700 uppercase tracking-tight">If NOT marked, specify the clinical justification:</Label>
                  <Input 
                    placeholder="e.g. Endoscopic procedure, single midline incision, or bilateral tooth extraction..."
                    value={siteChecks.notApplicableReason}
                    onChange={(e) => setSiteChecks(prev => ({ ...prev, notApplicableReason: e.target.value }))}
                    className="text-xs font-semibold bg-slate-50/50 border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EQUIPMENT & ANESTHESIA READINESS */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-sky-50 border border-sky-100">
                <Wrench className="w-5 h-5 text-sky-600 shrink-0" />
                <p className="text-xs font-bold text-sky-800 leading-relaxed">
                  <span className="uppercase font-black mr-1">Phase 3: Equipment & Patient Systems</span>
                  Ensure the anesthesia machines are safe, vital monitors are functioning, sterile indicators are checked, and essential instrumentation is ready.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${equipmentChecks.anesthesiaMachineChecked ? 'border-sky-200 bg-sky-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={equipmentChecks.anesthesiaMachineChecked}
                    onCheckedChange={(checked) => setEquipmentChecks(prev => ({ ...prev, anesthesiaMachineChecked: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Anesthesia Machine Check</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Machine safety test run, drug checks, suction, and gas logs</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${equipmentChecks.airwayAspirationChecked ? 'border-sky-200 bg-sky-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={equipmentChecks.airwayAspirationChecked}
                    onCheckedChange={(checked) => setEquipmentChecks(prev => ({ ...prev, airwayAspirationChecked: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Difficult Airway Checked</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Airway / aspiration risk assessed; rescue devices at hand</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${equipmentChecks.pulseOximeterFunctioning ? 'border-sky-200 bg-sky-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={equipmentChecks.pulseOximeterFunctioning}
                    onCheckedChange={(checked) => setEquipmentChecks(prev => ({ ...prev, pulseOximeterFunctioning: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Pulse Oximeter Active & Audible</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Placed on patient and reading oxygen saturation accurately</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${equipmentChecks.sterileIndicatorConfirmed ? 'border-sky-200 bg-sky-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={equipmentChecks.sterileIndicatorConfirmed}
                    onCheckedChange={(checked) => setEquipmentChecks(prev => ({ ...prev, sterileIndicatorConfirmed: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Sterility Indicator Confirmed</p>
                    <p className="text-[11px] text-slate-500 font-semibold">CSSD chemical indicator strip inspected and verified correct</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${equipmentChecks.diathermyGroundingSecured ? 'border-sky-200 bg-sky-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={equipmentChecks.diathermyGroundingSecured}
                    onCheckedChange={(checked) => setEquipmentChecks(prev => ({ ...prev, diathermyGroundingSecured: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Diathermy Patient Plate Grounded</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Cautery return electrode pad placed properly on dry muscle mass</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${equipmentChecks.implantsAvailable ? 'border-sky-200 bg-sky-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={equipmentChecks.implantsAvailable}
                    onCheckedChange={(checked) => setEquipmentChecks(prev => ({ ...prev, implantsAvailable: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Surgical Implants & Hardware</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Special implants, stents, or mesh are sterile and verified</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${equipmentChecks.equipmentCalibrated ? 'border-sky-200 bg-sky-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={equipmentChecks.equipmentCalibrated}
                    onCheckedChange={(checked) => setEquipmentChecks(prev => ({ ...prev, equipmentCalibrated: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Telemetry & Monitor Calibration</p>
                    <p className="text-[11px] text-slate-500 font-semibold">All vital scanners and surgical laser grids calibrated recently</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: FINAL SIGN-OFF & TEAM COORDINATION */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-emerald-800 leading-relaxed">
                  <span className="uppercase font-black mr-1">Phase 4: Verbal Time-Out & Sign-Out</span>
                  Confirm surgical steps, blood availability, counts of tools/swabs, specimen labeling, and post-operative safety considerations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${signOffChecks.teamIntroduced ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={signOffChecks.teamIntroduced}
                    onCheckedChange={(checked) => setSignOffChecks(prev => ({ ...prev, teamIntroduced: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Surgical Team Introduction Pause</p>
                    <p className="text-[11px] text-slate-500 font-semibold">All members introduced themselves by name and clinical role</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${signOffChecks.bloodLossRiskAssessed ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={signOffChecks.bloodLossRiskAssessed}
                    onCheckedChange={(checked) => setSignOffChecks(prev => ({ ...prev, bloodLossRiskAssessed: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Anticipated Blood Loss Assessment</p>
                    <p className="text-[11px] text-slate-500 font-semibold">If yes, confirm 2 wide-bore IV lines/fluids and blood bags ready</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${signOffChecks.antibioticProphylaxisGiven ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={signOffChecks.antibioticProphylaxisGiven}
                    onCheckedChange={(checked) => setSignOffChecks(prev => ({ ...prev, antibioticProphylaxisGiven: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Prophylactic Antibiotics (last 60 min)</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Documented administration or confirmed clinically not needed</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${signOffChecks.specimenLabelingPlanChecked ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={signOffChecks.specimenLabelingPlanChecked}
                    onCheckedChange={(checked) => setSignOffChecks(prev => ({ ...prev, specimenLabelingPlanChecked: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Specimen Labeling Protocol Ready</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Verbalized specimen labeling including patient name & ID</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${signOffChecks.spongeInstrumentCountCorrect ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={signOffChecks.spongeInstrumentCountCorrect}
                    onCheckedChange={(checked) => setSignOffChecks(prev => ({ ...prev, spongeInstrumentCountCorrect: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Sponge & Instrument Counts Checked</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Confirm pre-closure and final counts match initial counts</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${signOffChecks.criticalConcernsReviewed ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200 bg-white'}`}>
                  <Checkbox 
                    checked={signOffChecks.criticalConcernsReviewed}
                    onCheckedChange={(checked) => setSignOffChecks(prev => ({ ...prev, criticalConcernsReviewed: !!checked }))}
                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-extrabold text-slate-900">Post-Op Recovery Concerns Reviewed</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Surgeon, anesthetist, and nurse review critical recovery key plans</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Audit Sign-off Form with Coordinator name and general notes */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-tight">Checklist Coordinator (Nurse / Surgeon Name) <span className="text-rose-500 font-extrabold">*</span></Label>
            <Input 
              placeholder="e.g. Charge Nurse Aarti Verma"
              value={coordinator}
              onChange={(e) => setCoordinator(e.target.value)}
              className="text-xs h-10 bg-white border-slate-200 font-bold text-slate-900 shadow-sm focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-slate-700 uppercase tracking-tight">Safety Auditing & Equipment Readiness Notes</Label>
            <Input 
              placeholder="e.g. Difficulty airway equipment verified, sterile tags matched..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs h-10 bg-white border-slate-200 font-semibold text-slate-800 shadow-sm focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Action button footer with Navigation controls */}
        <DialogFooter className="p-6 border-t border-slate-100 bg-white flex flex-row items-center justify-between sm:justify-between gap-4">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 1}
            className="font-bold border-slate-200 gap-1 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous Phase
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} className="font-bold text-xs text-slate-500 hover:bg-slate-100">
              Close Preview
            </Button>

            {currentStep < 4 ? (
              <Button 
                onClick={nextStep} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 font-bold text-xs px-5"
              >
                Next Phase
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button 
                onClick={handleSave} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold text-xs px-6"
              >
                <Save className="w-4 h-4" />
                Authorize & Save Checklist
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
