import { useState, useEffect } from 'react';
import { useDataSync } from '@/hooks/useDataSync';
import { 
  Search, 
  FlaskConical, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Terminal, 
  RotateCcw, 
  User, 
  Clock, 
  Activity, 
  HelpCircle,
  FileCheck,
  TrendingDown,
  Percent,
  CheckCircle2,
  CalendarCheck,
  Plus,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';
import { storage } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/storage';

import { 
  LISResultRecord, 
  InvestigationTest, 
  Parameter, 
  AgeGenderReferenceRange, 
  AgeGroup,
  ParameterResult
} from './listTypes';

import { 
  MOCK_LIS_RESULTS, 
  MOCK_INVESTIGATIONS, 
  MOCK_PARAMETERS, 
  MOCK_REFERENCE_RANGES, 
  MOCK_CRITICALS 
} from './lisMockData';

// Helper to determine Age Group enum based on years
function getAgeGroup(age: number): AgeGroup {
  if (age <= 0.08) return 'Newborn'; // Under 28 days (~0.08 years)
  if (age <= 1) return 'Infant';
  if (age <= 12) return 'Child';
  if (age <= 18) return 'Adolescent';
  if (age <= 60) return 'Adult';
  return 'Senior';
}

export default function LISResultEntry({ onRelease, readOnly }: { onRelease?: () => void, readOnly?: boolean }) {
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
      toast.error('Access Denied: Only assigned Radiologists, Pathologists, or Admin can make clinical laboratory and radiology modifications.');
      return false;
    }
    return true;
  };

  const [lisRecords, setLisRecords] = useState<LISResultRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LISResultRecord | null>(null);

  const [patients, setPatients] = useState<any[]>([]);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [newOrder, setNewOrder] = useState({ patientId: '', testName: 'Complete Blood Count (CBC)' });
  const [createLoading, setCreateLoading] = useState(false);

  // Dynamic Real Orders Loading from Supabase
  const fetchRealOrders = async () => {
    try {
      const [realOrders, patientsData] = await Promise.all([
        supabaseService.getLabTestRequests(),
        supabaseService.getPatients()
      ]);
      
      if (patientsData) {
        setPatients(patientsData);
      }

      if (realOrders) {
        // Map real DB test requests to LISResultRecords
        const mappedRealRecords: LISResultRecord[] = realOrders.map((o: any) => {
          // Determine test code
          let testCode = 'GEN01';
          const name = (o.test_name || '').toLowerCase();
          if (name.includes('cbc') || name.includes('blood count')) {
            testCode = 'HEM01';
          } else if (name.includes('lft') || name.includes('liver')) {
            testCode = 'BIO01';
          } else if (name.includes('kft') || name.includes('kidney') || name.includes('renal')) {
            testCode = 'BIO02';
          } else if (name.includes('lipid') || name.includes('cholesterol')) {
            testCode = 'BIO03';
          } else if (name.includes('thyroid') || name.includes('tsh') || name.includes('t3')) {
            testCode = 'IMM01';
          }

          // Prepare default results structure based on code or database values
          const patientGenderObj = o.patients?.gender || 'Male';
          const patientGenderFormatted = patientGenderObj.charAt(0).toUpperCase() + patientGenderObj.slice(1).toLowerCase();
          const patientAgeNum = o.patients?.age || 35;

          // Look up parameters for this investigation
          const resultsObj: Record<string, any> = {};
          
          if (testCode === 'HEM01') {
            resultsObj['P-HB'] = { parameterId: 'P-HB', parameterName: 'Hemoglobin', value: o.result_value || '', unit: 'g/dL', referenceRangeStr: '12.0 - 17.0 g/dL', status: 'Normal', interpretation: '' };
            resultsObj['P-RBC'] = { parameterId: 'P-RBC', parameterName: 'Total RBC Count', value: '', unit: 'million/cumm', referenceRangeStr: '4.00 - 5.90 million/cumm', status: 'Normal', interpretation: '' };
            resultsObj['P-WBC'] = { parameterId: 'P-WBC', parameterName: 'Total Leukocyte Count (TLC)', value: '', unit: 'cells/cumm', referenceRangeStr: '4000 - 11000 cells/cumm', status: 'Normal', interpretation: '' };
            resultsObj['P-PLT'] = { parameterId: 'P-PLT', parameterName: 'Platelet Count', value: '', unit: 'lakh/cumm', referenceRangeStr: '1.50 - 4.50 lakh/cumm', status: 'Normal', interpretation: '' };
            resultsObj['P-MCV'] = { parameterId: 'P-MCV', parameterName: 'Mean Corpuscular Volume (MCV)', value: '', unit: 'fL', referenceRangeStr: '80.0 - 100.0 fL', status: 'Normal', interpretation: '', isFormulaBased: true };
          } else if (testCode === 'BIO01') {
            resultsObj['P-SGOT'] = { parameterId: 'P-SGOT', parameterName: 'SGOT (AST)', value: o.result_value || '', unit: 'IU/L', referenceRangeStr: '5 - 40 IU/L', status: 'Normal', interpretation: '' };
            resultsObj['P-SGPT'] = { parameterId: 'P-SGPT', parameterName: 'SGPT (ALT)', value: '', unit: 'IU/L', referenceRangeStr: '5 - 40 IU/L', status: 'Normal', interpretation: '' };
            resultsObj['P-BIL-T'] = { parameterId: 'P-BIL-T', parameterName: 'Total Bilirubin', value: '', unit: 'mg/dL', referenceRangeStr: '0.2 - 1.2 mg/dL', status: 'Normal', interpretation: '' };
            resultsObj['P-BIL-D'] = { parameterId: 'P-BIL-D', parameterName: 'Direct Bilirubin', value: '', unit: 'mg/dL', referenceRangeStr: '0.0 - 0.3 mg/dL', status: 'Normal', interpretation: '' };
          } else if (testCode === 'BIO02') {
            resultsObj['P-UREA'] = { parameterId: 'P-UREA', parameterName: 'Blood Urea', value: o.result_value || '', unit: 'mg/dL', referenceRangeStr: '15 - 45 mg/dL', status: 'Normal', interpretation: '' };
            resultsObj['P-CREAT'] = { parameterId: 'P-CREAT', parameterName: 'Serum Creatinine', value: '', unit: 'mg/dL', referenceRangeStr: '0.6 - 1.3 mg/dL', status: 'Normal', interpretation: '' };
          } else if (testCode === 'IMM01') {
            resultsObj['P-TSH'] = { parameterId: 'P-TSH', parameterName: 'Thyroid Stimulating Hormone (TSH)', value: o.result_value || '', unit: 'mIU/L', referenceRangeStr: '0.4 - 4.5 mIU/L', status: 'Normal', interpretation: '' };
            resultsObj['P-T3'] = { parameterId: 'P-T3', parameterName: 'Free Triiodothyronine (FT3)', value: '', unit: 'pg/mL', referenceRangeStr: '2.0 - 4.4 pg/mL', status: 'Normal', interpretation: '' };
            resultsObj['P-T4'] = { parameterId: 'P-T4', parameterName: 'Free Thyroxine (FT4)', value: '', unit: 'ng/dL', referenceRangeStr: '0.8 - 2.0 ng/dL', status: 'Normal', interpretation: '' };
          } else {
            resultsObj['GEN-RES'] = { parameterId: 'GEN-RES', parameterName: 'Result Observation', value: o.result_value || '', unit: o.unit || '', referenceRangeStr: o.reference_range || 'Direct Obs', status: 'Normal', interpretation: '' };
          }

          return {
            id: o.id,
            patientId: o.patient_id,
            patientName: o.patients?.name || 'Unknown Patient',
            patientAge: patientAgeNum,
            patientGender: patientGenderFormatted,
            patientMRN: o.patients?.mrn || 'MRN-NEW',
            testCode,
            testName: o.test_name,
            sampleId: o.sample_id || `SMP-${(o.id || '').substring(0, 5).toUpperCase()}`,
            orderedDate: o.requested_at || new Date().toISOString(),
            collectionDate: o.requested_at || new Date().toISOString(),
            collectionStatus: o.status === 'Completed' ? 'Completed' : 'Received',
            deltaCheckStatus: 'No History',
            deltaCheckMessage: '',
            qrVerified: true,
            verifiedBy: o.verified_by || '',
            verifiedAt: o.verified_at || '',
            pathologistOpinion: o.findings || '',
            results: resultsObj,
            isDbRecord: true
          };
        });

        // "remove old data which i have not entered in lab": Filter out MOCK records (non-DB) completely
        // so they only see the real records that they entered or ordered in the lab!
        setLisRecords(mappedRealRecords);
        
        if (mappedRealRecords.length > 0) {
          setSelectedRecord(prevSel => {
            if (prevSel) {
              const match = mappedRealRecords.find(m => m.id === prevSel.id);
              if (match) return match;
            }
            return mappedRealRecords[0];
          });
        } else {
          setSelectedRecord(null);
        }
      }
    } catch (err) {
      console.error('Error fetching real orders in LIS:', err);
    }
  };

  // Subscribes dynamically to real-time database changes and sync alerts
  useDataSync(fetchRealOrders);

  const handleCreateNewOrder = async () => {
    if (!checkPermission()) return;
    if (!newOrder.patientId) {
      toast.error('Please select a registered patient first');
      return;
    }

    setCreateLoading(true);
    try {
      const selectedPatient = patients.find(p => p.id === newOrder.patientId);
      const mrnStr = selectedPatient?.mrn || 'MRN-NEW';
      const cleanMrnNoPrefix = mrnStr.replace('MRN-', '').replace('MRN', '');
      
      const newOrderData = {
        patient_id: newOrder.patientId,
        test_name: newOrder.testName,
        status: 'Ordered',
        requested_at: new Date().toISOString(),
        sample_id: `SMP-${cleanMrnNoPrefix || Math.floor(10000 + Math.random() * 90000)}`,
        reference_range: newOrder.testName.toLowerCase().includes('cbc') ? '12.0 - 15.0 g/dL' : 'Direct Obs',
        unit: newOrder.testName.toLowerCase().includes('cbc') ? 'g/dL' : ''
      };

      const result = await supabaseService.createLabTestRequest(newOrderData);
      if (result) {
        toast.success(`Lab sample order placed successfully!`);
        setIsNewOrderOpen(false);
        setPatientSearchTerm('');
        setNewOrder({ patientId: '', testName: 'Complete Blood Count (CBC)' });
        await fetchRealOrders();
      } else {
        toast.error('Failed to place lab order');
      }
    } catch (err) {
      console.error('Error creating lab order:', err);
      toast.error('Error creating lab order');
    } finally {
      setCreateLoading(false);
    }
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Analyzer Simulation States
  const [simulatingMachine, setSimulatingMachine] = useState<string | null>(null);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [isSimInProgress, setIsSimInProgress] = useState(false);

  // Form states matching current parameters of selected record
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [opinionText, setOpinionText] = useState('');

  // Update input values when the selected record changes
  useEffect(() => {
    if (selectedRecord && selectedRecord.results) {
      const vals: Record<string, string> = {};
      Object.keys(selectedRecord.results).forEach(pid => {
        vals[pid] = selectedRecord.results[pid]?.value || '';
      });
      setInputValues(vals);
      setOpinionText(selectedRecord.pathologistOpinion || '');
    }
  }, [selectedRecord]);

  // Fetch reference range based on patient parameters
  const getReferenceRange = (parameterId: string, gender: string, age: number): AgeGenderReferenceRange | null => {
    const ageGroup = getAgeGroup(age);
    
    // First try exact parameter, gender and ageMatch
    let match = MOCK_REFERENCE_RANGES.find(r => 
      r.parameterId === parameterId && 
      (r.gender === gender || r.gender === 'All') && 
      (r.ageGroup === ageGroup || r.ageGroup === 'All')
    );

    if (!match) {
      // Fallback to general matched parameterId
      match = MOCK_REFERENCE_RANGES.find(r => r.parameterId === parameterId);
    }
    return match || null;
  };

  // Evaluate the status of entering value: Normal, Low, High, Critical
  const evaluateValueStatus = (parameterId: string, strVal: string, gender: string, age: number): {
    status: 'Normal' | 'Low' | 'High' | 'Critical';
    rangeStr: string;
    unit: string;
  } => {
    const ref = getReferenceRange(parameterId, gender, age);
    if (!ref || !strVal) {
      return { status: 'Normal', rangeStr: 'Direct Obs', unit: '' };
    }

    const val = parseFloat(strVal);
    if (isNaN(val)) {
      const lowVal = typeof ref.lowRange === 'number' ? ref.lowRange : parseFloat(ref.lowRange as any);
      const highVal = typeof ref.highRange === 'number' ? ref.highRange : parseFloat(ref.highRange as any);
      const lowStr = isNaN(lowVal) ? '' : lowVal.toString();
      const highStr = isNaN(highVal) ? '' : highVal.toString();
      const rangeText = (lowStr && highStr) ? `${lowStr} - ${highStr}` : 'Direct Obs';
      return { status: 'Normal', rangeStr: rangeText, unit: ref.unit || '' };
    }

    const lowVal = typeof ref.lowRange === 'number' ? ref.lowRange : parseFloat(ref.lowRange as any);
    const highVal = typeof ref.highRange === 'number' ? ref.highRange : parseFloat(ref.highRange as any);

    if (isNaN(lowVal) || isNaN(highVal)) {
      return { status: 'Normal', rangeStr: 'Direct Obs', unit: ref.unit || '' };
    }

    const rangeStr = `${lowVal.toFixed(lowVal % 1 === 0 ? 0 : 2)} - ${highVal.toFixed(highVal % 1 === 0 ? 0 : 2)}`;
    const unit = ref.unit || '';

    // Check critical configs first
    const criticalConfig = MOCK_CRITICALS.find(c => c.parameterId === parameterId);
    if (criticalConfig) {
      if (val <= criticalConfig.lowCritical || val >= criticalConfig.highCritical) {
        return { status: 'Critical', rangeStr, unit };
      }
    } else if (ref.criticalLow !== undefined && ref.criticalHigh !== undefined) {
      if (val <= ref.criticalLow || val >= ref.criticalHigh) {
        return { status: 'Critical', rangeStr, unit };
      }
    }

    // Checking regular high/low
    if (val < lowVal) return { status: 'Low', rangeStr, unit };
    if (val > highVal) return { status: 'High', rangeStr, unit };

    return { status: 'Normal', rangeStr, unit };
  };

  // Formula Calculations Engine
  const triggerFormulaCalculations = (currentValues: Record<string, string>, age: number, gender: string) => {
    const updated = { ...currentValues };
    let changed = false;

    // MCV = HCT * 10 / RBC (Let's check if we have HB and RBC. Since HCT is normally HB * 3, let's derive it or calculate)
    if (updated['P-HB'] && updated['P-RBC']) {
      const hb = parseFloat(updated['P-HB']);
      const rbc = parseFloat(updated['P-RBC']);
      if (!isNaN(hb) && !isNaN(rbc) && rbc > 0) {
        const hct = hb * 3; // Standard clinical coefficient
        // MCV (fL)
        const mcvVal = (hct * 10) / rbc;
        if (!updated['P-MCV'] || parseFloat(updated['P-MCV']).toFixed(1) !== mcvVal.toFixed(1)) {
          updated['P-MCV'] = mcvVal.toFixed(1);
          changed = true;
        }
        // MCH (pg) = HB * 10 / RBC
        const mchVal = (hb * 10) / rbc;
        if (!updated['P-MCH'] || parseFloat(updated['P-MCH']).toFixed(1) !== mchVal.toFixed(1)) {
          updated['P-MCH'] = mchVal.toFixed(1);
          changed = true;
        }
        // MCHC (g/dL) = HB * 100 / HCT
        const mchcVal = (hb * 100) / hct;
        if (!updated['P-MCHC'] || parseFloat(updated['P-MCHC']).toFixed(1) !== mchcVal.toFixed(1)) {
          updated['P-MCHC'] = mchcVal.toFixed(1);
          changed = true;
        }
      }
    }

    // LDL = Cholesterol - HDL - Triglycerides/5
    if (updated['P-CHOL'] && updated['P-HDL'] && updated['P-TRIG']) {
      const chol = parseFloat(updated['P-CHOL']);
      const hdl = parseFloat(updated['P-HDL']);
      const trig = parseFloat(updated['P-TRIG']);
      if (!isNaN(chol) && !isNaN(hdl) && !isNaN(trig) && trig >= 0) {
        const ldlVal = chol - hdl - (trig / 5);
        if (!updated['P-LDL'] || parseFloat(updated['P-LDL']).toFixed(0) !== ldlVal.toFixed(0)) {
          updated['P-LDL'] = ldlVal.toFixed(0);
          changed = true;
        }
      }
    }

    if (changed) {
      setInputValues(updated);
    }
  };

  const handleInputChange = (pid: string, val: string) => {
    const updated = { ...inputValues, [pid]: val };
    setInputValues(updated);
    if (selectedRecord) {
      triggerFormulaCalculations(updated, selectedRecord.patientAge, selectedRecord.patientGender);
    }
  };

  // Auto-Diagnosis and Pathological Interpretation Engine
  const generateInterpretationRemarks = (vals: Record<string, string>, rec: LISResultRecord): string => {
    const remarks: string[] = [];

    // Hemoglobin analysis
    if (vals['P-HB']) {
      const hb = parseFloat(vals['P-HB']);
      const ref = getReferenceRange('P-HB', rec.patientGender, rec.patientAge);
      if (ref && !isNaN(hb)) {
        if (hb < ref.lowRange) {
          remarks.push(`Erythrocytes show decreased Hemoglobin pigment limits (${vals['P-HB']} g/dL). Suggestive of microcytic clinical anemia (e.g., Iron Deficiency Anemia vs Thalassemia Trait). Recommend serum Ferritin correlation.`);
        } else if (hb > ref.highRange) {
          remarks.push(`Elevated Hemoglobin density observed (${vals['P-HB']} g/dL). Consider polycythemia screening or transient hemoconcentration. Promote clinical rehydration.`);
        }
      }
    }

    // Kidney analysis
    if (vals['P-CREAT'] || vals['P-UREA']) {
      const creat = parseFloat(vals['P-CREAT']);
      const urea = parseFloat(vals['P-UREA']);
      if (creat > 1.3 || urea > 45) {
        remarks.push(`Serum Creatinine/Urea levels show signs of high renal filtration index. Decreased glomerular clearance. Fluid logs and clinical nephrology consultation suggested.`);
      }
    }

    // Thyroid profile
    if (vals['P-TSH']) {
      const tsh = parseFloat(vals['P-TSH']);
      if (tsh > 4.5) {
        remarks.push(`TSH level is elevated (${tsh} mIU/L). Highly suggestive of Primary Hypothyroidism. Correlation with Free T3 and Free T4 advised for clinical hormone replacement titration.`);
      } else if (tsh < 0.4) {
        remarks.push(`TSH level is significantly suppressed (${tsh} mIU/L). Suggestive of Hyperthyroid metabolic status. Suggest thyroid antibody assays (Anti-TPO).`);
      }
    }

    // Liver profile
    if (vals['P-SGPT'] || vals['P-SGOT']) {
      const sgpt = parseFloat(vals['P-SGPT']);
      const sgot = parseFloat(vals['P-SGOT']);
      if (sgpt > 40 || sgot > 40) {
        remarks.push(`Mild to moderate elevation of cellular transaminases (ALT/AST). Suggests hepatocellular irritation. Correlate with alcohol ingestion history, drug-induced hepatotoxicity, or fatty liver syndrome.`);
      }
    }

    // Potassium Panic
    if (vals['P-S_POT']) {
      const pot = parseFloat(vals['P-S_POT']);
      if (pot > 5.5) {
        remarks.push(`CRITICAL ALERT: Hyperkalemia detected (${pot} mmol/L). Extreme cardiac risk factor. Coordinate with emergency physician instantly.`);
      } else if (pot < 3.2) {
        remarks.push(`ALERT: Hypokalemia warning (${pot} mmol/L). Muscle weakness and ECG abnormalities alert. Recommend electrolyte replacement.`);
      }
    }

    if (remarks.length === 0) {
      remarks.push('Constituents values are absolute and reside inside normal biological baseline envelopes. Patient exhibits normal diagnostic homeostasis. No immediate critical review needed.');
    } else {
      remarks.push('Results should be clinically mapped to physical symptoms and diagnostic histories.');
    }

    return remarks.join(' ');
  };

  const handleAutoInterpret = () => {
    if (!checkPermission()) return;
    if (!selectedRecord) return;
    const computed = generateInterpretationRemarks(inputValues, selectedRecord);
    setOpinionText(computed);
    toast.success('Clinical Interpretation remarks generated successfully!');
  };

  // Analyzer Automation Robotic Simulation Process
  const handleSimulateAnalyzer = (machine: string) => {
    if (!checkPermission()) return;
    if (!selectedRecord) return;
    setSimulatingMachine(machine);
    setSimulationLogs([]);
    setIsSimInProgress(true);

    const logs: string[] = [];
    const addLog = (msg: string, delay: number) => {
      setTimeout(() => {
        setSimulationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
      }, delay);
    };

    addLog(`INIT - Handshake with Laboratory Machine: ${machine}...`, 300);
    addLog(`PORT OPEN - Commencing ASTM E1394 duplex binding on RS-232 serial logic...`, 800);
    addLog(`QUERY - Fetching analyzer record for Query Sample ID: [${selectedRecord.sampleId}]`, 1400);
    addLog(`MATCH - Barcode mapped to Patient: ${selectedRecord.patientName} (${selectedRecord.patientGender}, ${selectedRecord.patientAge} Y)`, 1900);
    addLog(`RUNNING - Scanning colorimetric assays, computing fluidic laser lines...`, 2500);

    // Dynamic filling simulation
    setTimeout(() => {
      const simulatedVals: Record<string, string> = { ...inputValues };

      if (selectedRecord.testCode === 'HEM01') {
        simulatedVals['P-HB'] = selectedRecord.patientGender === 'Female' ? '12.8' : '14.5';
        simulatedVals['P-RBC'] = '4.82';
        simulatedVals['P-WBC'] = '7400';
        simulatedVals['P-PLT'] = '2.85';
      } else if (selectedRecord.testCode === 'BIO01') {
        simulatedVals['P-SGOT'] = '32';
        simulatedVals['P-SGPT'] = '28';
        simulatedVals['P-BIL-T'] = '0.90';
        simulatedVals['P-BIL-D'] = '0.25';
        simulatedVals['P-ALKP'] = '110';
        simulatedVals['P-PROT'] = '7.1';
      } else if (selectedRecord.testCode === 'BIO02') {
        simulatedVals['P-UREA'] = '28.5';
        simulatedVals['P-CREAT'] = '0.92';
        simulatedVals['P-S_SOD'] = '141.0';
        simulatedVals['P-S_POT'] = '4.2';
      } else if (selectedRecord.testCode === 'IMM01') {
        simulatedVals['P-T3'] = '1.20';
        simulatedVals['P-T4'] = '8.50';
        simulatedVals['P-TSH'] = '2.140';
      } else {
        // Fallback random entries
        Object.keys(selectedRecord?.results || {}).forEach(pid => {
          simulatedVals[pid] = (Math.random() * 20 + 2).toFixed(1);
        });
      }

      setInputValues(simulatedVals);
      triggerFormulaCalculations(simulatedVals, selectedRecord.patientAge, selectedRecord.patientGender);
      
      setSimulationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] HL7 Parser - Record successfully decrypted without packets collision code 0`]);
      setSimulationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] SUCCESS - Values loaded into result entries grid safely.`]);
      setIsSimInProgress(false);
      toast.success(`Data retrieved from ${machine} successfully!`);
    }, 4500);
  };

  // Release and Approve test results
  const handleReleaseResults = () => {
    if (!checkPermission()) return;
    if (!selectedRecord) return;

    // Compile released parameters objects
    const releasedResults: Record<string, ParameterResult> = {};
    Object.keys(selectedRecord?.results || {}).forEach(pid => {
      const parameterObj = MOCK_PARAMETERS.find(p => p.id === pid);
      const val = inputValues[pid] || '';
      const evaluation = evaluateValueStatus(pid, val, selectedRecord.patientGender, selectedRecord.patientAge);
      const originalResult = selectedRecord?.results?.[pid];
      
      releasedResults[pid] = {
        parameterId: pid,
        parameterName: parameterObj?.name || originalResult?.parameterName || pid,
        value: val,
        unit: evaluation.unit || originalResult?.unit || '',
        referenceRangeStr: evaluation.rangeStr || originalResult?.referenceRangeStr || 'Direct Obs',
        status: evaluation.status,
        interpretation: evaluation.status === 'Normal' ? 'Normal Baseline' : `${parameterObj?.name || originalResult?.parameterName || pid} is abnormal (${evaluation.status})`,
        isFormulaBased: parameterObj?.formulaBased || originalResult?.isFormulaBased || false
      };
    });

    const updatedRecord: LISResultRecord = {
      ...selectedRecord,
      collectionStatus: 'Completed',
      verifiedBy: 'Dr. Ramesh Chandra (MD, Pathology) - Reg No: 8192A',
      verifiedAt: new Date().toISOString(),
      pathologistOpinion: opinionText,
      results: releasedResults
    };

    setLisRecords(lisRecords.map(r => r.id === selectedRecord.id ? updatedRecord : r));
    setSelectedRecord(updatedRecord);
    toast.success('Pathology test released and sent to patient files!');

    // Synchronize released result entry to Supabase database
    if (selectedRecord.isDbRecord || (selectedRecord.id && !selectedRecord.id.startsWith('LIS-'))) {
      let primaryValue = '';
      const rkeys = Object.keys(releasedResults);
      if (rkeys.length > 0) {
        const preferredKey = rkeys.find(k => k === 'P-HB' || k === 'P-TSH' || k === 'P-UREA' || k === 'P-SGOT' || k === 'GEN-RES') || rkeys[0];
        primaryValue = releasedResults[preferredKey]?.value || '';
      }

      supabaseService.updateLabTestRequest(selectedRecord.id, {
        result_value: primaryValue,
        findings: opinionText,
        status: 'Completed',
        updated_at: new Date().toISOString()
      }).then((res) => {
        if (res) {
          toast.success('Database Pathology order synchronized successfully!');
          if (onRelease) onRelease();
        }
      }).catch(err => {
        console.error('Error syncing released result to database:', err);
        toast.error('Failed to sync result to database');
      });
    } else {
      if (onRelease) onRelease();
    }
  };

  const filteredRecords = lisRecords.filter(r => {
    const searchLow = searchQuery.toLowerCase();
    const queryMatch = 
      r.patientName.toLowerCase().includes(searchLow) ||
      r.id.toLowerCase().includes(searchLow) ||
      r.sampleId.toLowerCase().includes(searchLow) ||
      r.patientMRN.toLowerCase().includes(searchLow);
    
    if (filterStatus === 'All') return queryMatch;
    return queryMatch && r.collectionStatus === filterStatus;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: ACTIVE LIS ORDERS & SAMPLES WORKLIST */}
      <div className="xl:col-span-4 space-y-4">
        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-indigo-600" />
                LIS Samples Worklist
              </CardTitle>
              <Button 
                onClick={() => setIsNewOrderOpen(true)}
                className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3 h-3" />
                New Order
              </Button>
            </div>
            <CardDescription className="text-xs mt-1">Browse clinical test requests mapped dynamically from hospital beds and OPD desks.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Patient name, SMP ID..." 
                  className="pl-9 h-9 border-slate-200 text-xs rounded-lg"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-28 text-xs border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="All">All statuses</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Completed">Released</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto custom-scrollbar">
              {filteredRecords.map(rec => {
                const isSelected = selectedRecord?.id === rec.id;
                return (
                  <div 
                    key={rec.id}
                    onClick={() => setSelectedRecord(rec)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{rec.patientName}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                          MRN: {rec.patientMRN} • {rec.patientGender}, {rec.patientAge}Y
                        </p>
                      </div>
                      <Badge className={`text-[9px] px-2 py-0.5 ${
                        rec.collectionStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      } border-none font-bold`}>
                        {rec.collectionStatus === 'Completed' ? 'Released' : 'Processing'}
                      </Badge>
                    </div>
                    <Separator className="my-2 bg-slate-100/60" />
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                      <span className="bg-indigo-100/20 px-2 py-0.5 rounded text-indigo-700">Sample: {rec.sampleId}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {(rec.testName || '').substring(0, 16)}...</span>
                    </div>
                  </div>
                );
              })}
              {filteredRecords.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground italic">No matching sample requests.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: DETAILED DIAGNOSTIC PATHOLOGY WORKBENCH */}
      <div className="xl:col-span-8 space-y-4">
        {selectedRecord ? (
          <div className="space-y-4">
            
            {/* WORKBENCH PATIENT INFO STRIP */}
            <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-50/20 to-slate-50/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-md font-bold text-slate-900">{selectedRecord.patientName}</h3>
                    <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-700 border-slate-200">
                      {selectedRecord.patientGender} / {selectedRecord.patientAge} Years
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground mt-1 font-semibold">
                    <span>MRN: <b className="text-slate-800">{selectedRecord.patientMRN}</b></span>
                    <span>Sample ID: <b className="text-slate-800">{selectedRecord.sampleId}</b></span>
                    <span>Test Group: <b className="text-indigo-600">{selectedRecord.testName}</b></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Analyzer Machine Trigger button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-[11px] font-bold">
                        <Terminal className="w-3.5 h-3.5 mr-1" /> Simulate Analyzer Run
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl border-slate-800">
                      <DialogHeader>
                        <DialogTitle className="text-white text-sm font-bold flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                          ASTM Analyzer Duplex Interface
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">Duplex query interfaces directly with integrated analyzer software via TCP sockets.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex-1"
                            onClick={() => handleSimulateAnalyzer('Sysmex XN-1000 CBC Analyzer')}
                            disabled={isSimInProgress || selectedRecord.testCode !== 'HEM01'}
                          >
                            Sysmex XN-1000 (CBC)
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex-1"
                            onClick={() => handleSimulateAnalyzer('Beckman Coulter AU480')}
                            disabled={isSimInProgress || !['BIO01', 'BIO03'].includes(selectedRecord.testCode)}
                          >
                            Beckman AU480 (Biochem)
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex-1"
                            onClick={() => handleSimulateAnalyzer('Roche cobas e411 CLIA')}
                            disabled={isSimInProgress || selectedRecord.testCode !== 'IMM01'}
                          >
                            Roche cobas e411 (CLIA)
                          </Button>
                        </div>

                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg min-h-[160px] max-h-[220px] overflow-y-auto custom-scrollbar text-[10px] space-y-1">
                          {simulationLogs.map((log, idx) => (
                            <div key={idx}>{log}</div>
                          ))}
                          {isSimInProgress && (
                            <div className="text-yellow-400 animate-pulse">*** PIPELINE BUSY - LASER FLUOROPHOTOMETER SCANNING FLUIDICS... ***</div>
                          )}
                          {simulationLogs.length === 0 && (
                            <div className="text-slate-600 italic">No simulator actions initiated. Click any machine above to pull results into the spreadsheet.</div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* PARAMETERS SPREADSHEET CARD */}
            <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-sm font-bold">Constituent Parameter Entry</CardTitle>
                <CardDescription className="text-xs">Fill constituent assays values. Auto equations run locally during typing.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold">Parameter</TableHead>
                      <TableHead className="text-[11px] font-bold">Demographics Normal Limit</TableHead>
                      <TableHead className="text-[11px] font-bold text-center w-28">Result Value</TableHead>
                      <TableHead className="text-[11px] font-bold">Unit</TableHead>
                      <TableHead className="text-right text-[11px] font-bold">Diagnostic Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(selectedRecord?.results || {}).map(pid => {
                      const paramObj = MOCK_PARAMETERS.find(p => p.id === pid);
                      const val = inputValues[pid] || '';
                      
                      const evaluation = evaluateValueStatus(
                        pid, 
                        val, 
                        selectedRecord.patientGender, 
                        selectedRecord.patientAge
                      );

                      return (
                        <TableRow key={pid} className="hover:bg-slate-50/30 text-xs border-slate-100">
                           <TableCell className="py-2.5 font-semibold text-slate-800">
                            {paramObj?.name || selectedRecord?.results?.[pid]?.parameterName || pid}
                            {paramObj?.formulaBased && (
                              <Badge className="bg-slate-100 text-slate-500 font-mono text-[9px] ml-1 px-1 py-0 hover:bg-slate-100">Formula</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 font-medium text-slate-500">{evaluation.rangeStr}</TableCell>
                          <TableCell className="py-2.5 text-center">
                            <Input 
                              type="text"
                              disabled={paramObj?.formulaBased}
                              value={val}
                              onChange={e => handleInputChange(pid, e.target.value)}
                              placeholder="..."
                              className={`h-8 font-bold text-xs text-center border-slate-200 rounded-md focus:border-indigo-600 focus:ring-slate-200 ${
                                evaluation.status === 'High' ? 'text-red-600 border-red-300 bg-red-50/50' : 
                                evaluation.status === 'Low' ? 'text-sky-600 border-sky-300 bg-sky-50/50' : 
                                evaluation.status === 'Critical' ? 'text-rose-700 bg-rose-100 border-rose-400 animate-pulse' :
                                ''
                              }`}
                            />
                          </TableCell>
                          <TableCell className="py-2.5 font-medium text-slate-600">{evaluation.unit}</TableCell>
                          <TableCell className="py-2.5 text-right font-black">
                            {evaluation.status === 'Critical' ? (
                              <span className="text-rose-600 bg-rose-50 text-[10px] px-2 py-0.5 rounded border border-rose-100 inline-block font-black select-none shadow-sm shadow-red-200">
                                ! CRITICAL PANIC !
                              </span>
                            ) : evaluation.status === 'High' ? (
                              <span className="text-red-600 inline-block">● HIGH RANGE</span>
                            ) : evaluation.status === 'Low' ? (
                              <span className="text-sky-600 inline-block">● LOW RANGE</span>
                            ) : (
                              <span className="text-emerald-600 font-semibold inline-block">✓ Normal</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* AUTO INTERPRETATION & OPINION CORE CARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Prior historical check / Delta warning / NABL rule cards */}
              <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Automated Quality Safety Gate</h4>
                  
                  {/* Delta validation warn */}
                  {selectedRecord.deltaCheckStatus === 'Attention' ? (
                    <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-100 text-orange-800 text-xs flex gap-2">
                      <TrendingDown className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold uppercase text-[10px] tracking-wider text-orange-700">Delta Check Trigger Alert</p>
                        <p className="mt-1 leading-relaxed text-orange-800 font-medium text-[11px]">{selectedRecord.deltaCheckMessage}</p>
                      </div>
                    </div>
                  ) : selectedRecord.deltaCheckStatus === 'Good' ? (
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-800 text-xs flex gap-2">
                      <Percent className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold uppercase text-[10px] tracking-wider text-emerald-700">Delta Validation Certified</p>
                        <p className="mt-1 leading-relaxed text-emerald-800 font-medium text-[11px]">{selectedRecord.deltaCheckMessage}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-xs flex gap-2">
                      <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold uppercase text-[10px] tracking-wider text-slate-500">First Time Sample Profile</p>
                        <p className="mt-1 leading-relaxed text-slate-600 font-medium text-[11px]">No prior records found for this patient, establishing first diagnostic baseline.</p>
                      </div>
                    </div>
                  )}

                  {/* NABL standard guideline indicators */}
                  <div className="mt-4 flex items-center gap-1.5 p-2 bg-indigo-50/10 border border-slate-100 rounded-lg text-[10px] font-semibold text-slate-600">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Control Lot calibrated. Machine validation active.</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex gap-2">
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 rounded-lg"
                    onClick={handleAutoInterpret}
                  >
                    <Activity className="w-3.5 h-3.5 mr-1" /> Auto-Compile Remarks
                  </Button>
                </div>
              </Card>

              {/* OPINION COMPILER */}
              <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden p-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-black uppercase tracking-wider text-slate-400">Pathologist Comments & Remarks</Label>
                    <Badge variant="outline" className="text-[9px] bg-slate-50 border-none">Clinical Sync</Badge>
                  </div>
                  <textarea 
                    className="w-full text-xs p-3 bg-slate-50/70 border border-slate-200 rounded-xl min-h-[110px] leading-relaxed text-slate-700 focus:outline-indigo-600 focus:bg-white"
                    placeholder="Enter diagnostic impressions, cellular morphology, or clinical suggestions..."
                    value={opinionText}
                    onChange={e => setOpinionText(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs font-semibold h-9 rounded-lg"
                    onClick={() => setOpinionText('')}
                  >
                    Clear Text
                  </Button>
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 rounded-lg gap-1 shadow-sm shadow-emerald-200"
                    onClick={handleReleaseResults}
                  >
                    <FileCheck className="w-3.5 h-3.5" /> Release & Released
                  </Button>
                </div>
              </Card>
            </div>

          </div>
        ) : (
          <div className="h-96 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-muted-foreground p-6">
            <FlaskConical className="w-12 h-12 text-slate-300 animate-pulse mb-3" />
            <p className="text-xs font-semibold">Select a sample on the left panel to load parameters workbench.</p>
          </div>
        )}
      </div>

      {/* NEW ORDER DIALOG */}
      <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white rounded-2xl overflow-hidden p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5 font-sans">
              <FlaskConical className="w-5 h-5 text-indigo-600" /> New Diagnostics Order
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a lab test request / order for any registered patient.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Search Patient */}
            <div className="space-y-2 relative">
              <Label className="text-xs font-semibold text-slate-700">Patient (Search Name, MRN or Phone)</Label>
              <div className="relative">
                <Input 
                  placeholder="Type patient name or MRN..." 
                  className="h-9 text-xs border-slate-200"
                  value={patientSearchTerm}
                  onChange={(e) => {
                    setPatientSearchTerm(e.target.value);
                    setShowPatientResults(true);
                    if (e.target.value === '') {
                      setNewOrder(prev => ({ ...prev, patientId: '' }));
                    }
                  }}
                  onFocus={() => setShowPatientResults(true)}
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>

              {showPatientResults && patientSearchTerm.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[180px] overflow-y-auto custom-scrollbar">
                  {patients.filter(p => 
                    p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                    (p.phone || '').includes(patientSearchTerm) ||
                    (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())
                  ).length > 0 ? (
                    patients.filter(p => 
                      p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                      (p.phone || '').includes(patientSearchTerm) ||
                      (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())
                    ).map(p => (
                      <div 
                        key={p.id} 
                        className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0 text-xs"
                        onClick={() => {
                          setNewOrder(prev => ({ ...prev, patientId: p.id }));
                          setPatientSearchTerm(p.name);
                          setShowPatientResults(false);
                        }}
                      >
                        <div>
                          <p className="font-semibold text-slate-700">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">Ph: {p.phone || 'N/A'} • MRN: {p.mrn}</p>
                        </div>
                        {newOrder.patientId === p.id && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center text-slate-500 italic">
                      No matching integrated patients found.
                    </div>
                  )}
                </div>
              )}

              {newOrder.patientId && (
                <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px] uppercase shrink-0">
                    {(patients.find(pat => pat.id === newOrder.patientId)?.name || 'PT').substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-indigo-800 leading-none truncate">
                      {patients.find(pat => pat.id === newOrder.patientId)?.name}
                    </p>
                    <p className="text-[10px] text-indigo-600 mt-1 truncate">
                      Phone: {patients.find(pat => pat.id === newOrder.patientId)?.phone || 'N/A'} • MRN: {patients.find(pat => pat.id === newOrder.patientId)?.mrn}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Test Choice */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Lab Investigation Test Profile</Label>
              <Select 
                value={newOrder.testName} 
                onValueChange={(v) => setNewOrder(prev => ({ ...prev, testName: v }))}
              >
                <SelectTrigger className="h-9 text-xs border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="Complete Blood Count (CBC)">Complete Blood Count (CBC) - Hematology</SelectItem>
                  <SelectItem value="Liver Function Test (LFT)">Liver Function Test (LFT) - Biochemistry</SelectItem>
                  <SelectItem value="Kidney Function Test (KFT)">Kidney Function Test (KFT) - Biochemistry</SelectItem>
                  <SelectItem value="Thyroid Profile (T3, T4, TSH)">Thyroid Profile (T3, T4, TSH) - Immunology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2 sm:space-x-0">
            <Button 
              variant="outline" 
              type="button"
              className="h-9 text-xs font-semibold flex-1 border-slate-200"
              onClick={() => {
                setIsNewOrderOpen(false);
                setPatientSearchTerm('');
                setNewOrder({ patientId: '', testName: 'Complete Blood Count (CBC)' });
              }}
            >
              Cancel
            </Button>
            <Button 
              className="h-9 text-xs font-bold flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              disabled={createLoading || !newOrder.patientId}
              onClick={handleCreateNewOrder}
            >
              {createLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Place Order'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
