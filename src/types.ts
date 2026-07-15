export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'HOSPITAL_ADMIN' 
  | 'RECEPTION' 
  | 'DOCTOR' 
  | 'NURSE' 
  | 'LAB_STAFF' 
  | 'PHARMACIST' 
  | 'ACCOUNTANT'
  | 'SURGEON'
  | 'RADIOLOGIST';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  specialization?: string;
  degree?: string;
  avatar?: string;
}

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email?: string;
  address: string;
  bloodGroup?: string;
  lastVisit?: string;
  status: string;
  motherName?: string;
  motherPhone?: string;
  husbandName?: string;
  husbandPhone?: string;
  fatherName?: string;
  fatherPhone?: string;
  dob?: string;
  tpaId?: string;
  tpaValidity?: string;
  guardianName?: string;
  attendingDoctorId?: string;
  isReferral?: boolean;
  referredBy?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: 'OPD' | 'Follow-up' | 'Emergency';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'In-Progress';
  reason?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  diagnosis?: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
  }[];
  tests?: string[];
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface BillingRecord {
  id: string;
  patientId: string;
  date: string;
  type?: string;
  items: {
    description: string;
    amount: number;
    category: 'OPD' | 'IPD' | 'Lab' | 'Radiology' | 'Pharmacy' | 'Other' | 'PHARMACY' | 'path' | 'radio';
  }[];
  totalAmount: number;
  discount?: number;
  paidAmount: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
  paymentMode?: 'Cash' | 'UPI' | 'Card';
  patientName?: string; // For walk-in customers
  patientPhone?: string; // For walk-in customers
  prescribingDoctor?: string; // For pharmacy/lab walk-ins
}

export interface Bed {
  id: string;
  number: string;
  ward: string;
  type: 'General' | 'Semi-Private' | 'Private' | 'ICU' | 'Maternity';
  status: 'Available' | 'Occupied' | 'Maintenance';
  patientId?: string;
}

export interface LabTest {
  id: string;
  patientId: string;
  testName: string;
  category: 'Pathology' | 'Radiology';
  orderedBy: string;
  date: string;
  status: 'Ordered' | 'Sample Collected' | 'Processing' | 'Completed';
  result?: string;
  reportUrl?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Medicine' | 'Surgical' | 'General';
  stock: number;
  unit: string;
  expiryDate?: string;
  expiry_date?: string;
  batchNumber?: string;
  batch_number?: string;
  minStockLevel: number;
  min_stock_level?: number;
  mrp: number;
  sellingPrice: number;
  selling_price?: number;
  purchasePrice: number;
  purchase_price?: number;
  taxPercentage: number;
  tax_percentage?: number;
  hsnCode?: string;
  hsn_code?: string;
  rackNumber?: string;
  rack_number?: string;
  composition?: string;
  units_per_strip?: number;
  loose_selling_price?: number;
  loose_stock?: number;
  is_loose_sale_enabled?: boolean;
}

export interface OperationTheatre {
  id: string;
  name: string;
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Cleaning';
  type: 'Major' | 'Minor' | 'Cardiac' | 'Orthopedic' | 'Emergency';
}

export interface OperationRecord {
  id: string;
  patientId: string;
  theatreId: string;
  surgeonId: string;
  assistantSurgeons?: string[];
  anesthetistId?: string;
  nurses?: string[];
  operationName: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: 'Scheduled' | 'In-Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  documents: {
    id: string;
    name: string;
    url: string;
    type: 'Document' | 'Photo' | 'Video';
    uploadedAt: string;
    uploadedBy: string;
  }[];
}

export interface NursingTask {
  id: string;
  patientId: string;
  description: string;
  dueTime: string;
  status: 'Pending' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
}

export interface NurseShift {
  id: string;
  nurseId: string;
  shiftType: 'Morning' | 'Evening' | 'Night';
  ward: string;
  status: 'Active' | 'Completed';
}

export interface PatientVitals {
  patientId: string;
  bp: string;
  pulse: number;
  temp: string;
  spo2: number;
  lastUpdated: string;
}

export interface OTInventoryItem {
  id: string;
  code?: string;
  name: string;
  category: 'Surgical Kit' | 'Disposable' | 'Anesthesia Drug' | 'Suture' | 'Implant';
  stock: number;
  unit: string;
  minStockLevel: number;
  mrp: number;
  purchasePrice: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface OTConsent {
  id: string;
  patientId: string;
  type: 'General' | 'Surgery' | 'Anaesthesia' | 'Blood Transfusion' | 'ICU' | 'High-risk';
  terms: string;
  patientName: string;
  guardianName?: string;
  witnessName: string;
  signedAt: string;
  signatureType: 'Typed' | 'Digital';
  signatureData: string;
  status: 'Draft' | 'Signed' | 'Revoked';
}

export interface OTInfectionControlLog {
  id: string;
  date: string;
  time: string;
  theatreId: string;
  theatreName: string;
  cleaningType: 'Routine' | 'Fumigation' | 'Post-op Deep Clean';
  disinfectantsUsed: string;
  airParticleCount?: string;
  cultureSwabResult: 'Negative' | 'Positive' | 'Pending';
  loggedBy: string;
}
