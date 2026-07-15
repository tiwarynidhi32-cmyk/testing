export interface TestCategory {
  id: string; // e.g. "CAT-HEM"
  name: string; // e.g. "Hematology"
  description: string;
  status: 'Active' | 'Inactive';
}

export interface TestSubCategory {
  id: string; // e.g. "SUB-CBC"
  categoryId: string; // CAT-HEM
  name: string; // e.g. "Complete Blood Count"
  description: string;
  status: 'Active' | 'Inactive';
}

export interface InvestigationTest {
  code: string; // e.g. "HEM01"
  name: string; // e.g. "Complete Blood Count (CBC)"
  shortName: string; // e.g. "CBC"
  department: string; // e.g. "Pathology"
  categoryId: string; // e.g. "CAT-HEM"
  subCategoryId: string; // e.g. "SUB-CBC"
  sampleType: string; // e.g. "EDTA Whole Blood"
  method: string; // e.g. "Automated Cell Counter"
  machineName: string; // e.g. "Sysmex XN-1000"
  reportType: 'Quantitative' | 'Qualitative' | 'Narrative';
  tat: string; // e.g. "4 Hours"
  normalRangeApplicable: boolean;
  criticalValueApplicable: boolean;
  nablCompliance: boolean;
  activeStatus: 'Active' | 'Inactive';
  price: number;
}

export interface Parameter {
  id: string; // e.g. "PAR-HB"
  testCode: string; // e.g. "HEM01"
  name: string; // e.g. "Hemoglobin"
  unit: string; // e.g. "g/dL"
  decimalPlaces: number; // e.g. 1
  sequenceNumber: number; // e.g. 10
  formulaBased: boolean;
  formula?: string; // e.g. "HCT * 10 / RBC"
}

export interface LabUnit {
  id: string;
  name: string;
  symbol: string;
}

export type AgeGroup = 
  | 'Newborn' // 0-28 Days
  | 'Infant' // 1 Month-1 Year
  | 'Child' // 1-12 Years
  | 'Adolescent' // 13-18 Years
  | 'Adult' // 19-60 Years
  | 'Senior'; // >60 Years

export interface AgeGenderReferenceRange {
  id: string;
  parameterId: string; // e.g. "PAR-HB"
  gender: 'Male' | 'Female' | 'Other' | 'All';
  ageGroup: AgeGroup | 'All';
  lowRange: number;
  highRange: number;
  unit: string;
  criticalLow?: number;
  criticalHigh?: number;
}

export interface CriticalValueConfig {
  id: string;
  parameterId: string;
  lowCritical: number;
  highCritical: number;
  alertMessage: string;
}

export interface ParameterResult {
  parameterId: string;
  parameterName: string;
  value: string;
  unit: string;
  referenceRangeStr: string;
  status: 'Normal' | 'Low' | 'High' | 'Critical';
  interpretation: string;
  isFormulaBased?: boolean;
}

export interface LISResultRecord {
  id: string; // orderId / sampleID
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  patientMRN: string;
  testCode: string;
  testName: string;
  sampleId: string; // e.g. "SMP-00109"
  orderedDate: string;
  collectionDate: string;
  collectionStatus: 'Pending' | 'Collected' | 'Received' | 'In-Process' | 'Completed';
  results: Record<string, ParameterResult>; // parameterId -> result
  pathologistOpinion?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  machineId?: string;
  deltaCheckStatus?: 'Good' | 'Attention' | 'No History';
  deltaCheckMessage?: string;
  barcodeUrl?: string;
  qrVerified?: boolean;
}

export interface HomeCollectionBooking {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  address: string;
  date: string;
  timeSlot: string;
  testsOrdered: string[];
  phlebotomistId: string;
  phlebotomistName: string;
  status: 'Scheduled' | 'Dispatched' | 'Collected' | 'In-Transit' | 'Received';
  collectTime?: string;
}

export interface FranchiseCollectionCenter {
  id: string;
  name: string;
  address: string;
  code: string;
  commissionRate: number; // e.g. 15 for 15%
  outstandingBalance: number;
  status: 'Active' | 'Suspended';
}

export interface ReferralDoctor {
  id: string;
  name: string;
  hospital: string;
  commissionPercentage: number; // e.g. 10 for 10%
  totalReferrals: number;
  totalCommissionsEarned: number;
}

export interface DoctorCommission {
  doctorId: string;
  doctorName: string;
  specialization: string;
  totalReferralsCount: number;
  totalReferredBillAmount: number;
  commissionPercentage: number;
  unpaidAccruedAmount: number;
}

export interface FranchiseCenter {
  centerId: string;
  centerName: string;
  location: string;
  commissionPercentage: number; // e.g. 15 for 15%
  samplesDispatched: number;
  unpaidCommissions: number;
  status: 'Active' | 'Suspended';
}
