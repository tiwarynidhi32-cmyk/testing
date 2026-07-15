import { 
  TestCategory, 
  TestSubCategory, 
  InvestigationTest, 
  Parameter, 
  LabUnit, 
  AgeGenderReferenceRange, 
  CriticalValueConfig,
  LISResultRecord,
  HomeCollectionBooking,
  FranchiseCollectionCenter,
  ReferralDoctor
} from './listTypes';

export const MOCK_CATEGORIES: TestCategory[] = [
  { id: 'CAT-HEM', name: 'Hematology', description: 'Study of blood cells, coagulation, and blood-related disorders.', status: 'Active' },
  { id: 'CAT-CLP', name: 'Clinical Pathology', description: 'Body fluids analysis, including urinalysis and feces analysis.', status: 'Active' },
  { id: 'CAT-BIO', name: 'Biochemistry', description: 'Quantitative chemical testing of serum, plasma, and spinal liquids.', status: 'Active' },
  { id: 'CAT-IMM', name: 'Immunology & Hormones', description: 'Antibody testing, thyroid hormone panels, and fertility checks.', status: 'Active' },
  { id: 'CAT-SER', name: 'Serology', description: 'Serological antibody/antigen bindings for rapid infectious disease identification.', status: 'Active' },
  { id: 'CAT-MIC', name: 'Microbiology', description: 'Bacterial culture, spore staining, drug sensitivity assays, and PCR tests.', status: 'Active' },
  { id: 'CAT-HIS', name: 'Histopathology', description: 'Biopsy tissue preparations, thin sections cutting, and microscopic diagnosis.', status: 'Active' },
  { id: 'CAT-CYT', name: 'Cytology', description: 'Fine-needle aspirations (FNAC), smear stains, and liquid pep screenings.', status: 'Active' },
  { id: 'CAT-MOL', name: 'Molecular Biology', description: 'Viral load PCRs, HLA genotyping, DNA mutation sequencing.', status: 'Active' },
  { id: 'CAT-COA', name: 'Coagulation Studies', description: 'Prothrombin time, thrombin times, and factor assay panels.', status: 'Active' },
  { id: 'CAT-TXC', name: 'Toxicology', description: 'Heavy metals, drug of abuse panels, and medical toxicity profiles.', status: 'Active' }
];

export const MOCK_SUBCATEGORIES: TestSubCategory[] = [
  // Hematology
  { id: 'SUB-CBC', categoryId: 'CAT-HEM', name: 'Complete Blood Count', description: 'CBC panels containing hematological differentials', status: 'Active' },
  { id: 'SUB-COA', categoryId: 'CAT-HEM', name: 'Coagulation Metrics', description: 'PT-INR, aPTT and fibrin factors', status: 'Active' },
  
  // Biochemistry
  { id: 'SUB-LFT', categoryId: 'CAT-BIO', name: 'Liver Function Test', description: 'Bilirubin, SGOT, SGPT, Alkaline Phosphatase, total protein', status: 'Active' },
  { id: 'SUB-KFT', categoryId: 'CAT-BIO', name: 'Kidney Function Test', description: 'Urea, Creatinine, Uric Acid, Sodium, Potassium', status: 'Active' },
  { id: 'SUB-LIP', categoryId: 'CAT-BIO', name: 'Lipid Profile', description: 'Triglycerides, Total Cholesterol, HDL, LDL, VLDL', status: 'Active' },
  { id: 'SUB-GLU', categoryId: 'CAT-BIO', name: 'Glucose Studies', description: 'Fasting Glucose, Post-Prandial, HbA1c', status: 'Active' },

  // Immunology & Hormones
  { id: 'SUB-THY', categoryId: 'CAT-IMM', name: 'Thyroid Panel', description: 'Free T3, Free T4, TSH assays', status: 'Active' },
  { id: 'SUB-FER', categoryId: 'CAT-IMM', name: 'Fertility Hormones', description: 'LH, FSH, Prolactin, beta-hCG', status: 'Active' },
  { id: 'SUB-VIT', categoryId: 'CAT-IMM', name: 'Vitamin Levels', description: 'Vitamin D3, Vitamin B12, Serum Iron profile', status: 'Active' },

  // Urinary
  { id: 'SUB-URN', categoryId: 'CAT-CLP', name: 'Routine Urinalysis', description: 'Chemical, physical, and macroscopic deposit findings', status: 'Active' }
];

export const MOCK_UNITS: LabUnit[] = [
  { id: 'U-GDL', name: 'grams per deciliter', symbol: 'g/dL' },
  { id: 'U-MGDL', name: 'milligrams per deciliter', symbol: 'mg/dL' },
  { id: 'U-IUL', name: 'International Units per Liter', symbol: 'IU/L' },
  { id: 'U-MIUL', name: 'milli-International Units per Liter', symbol: 'mIU/L' },
  { id: 'U-NGML', name: 'nanograms per milliliter', symbol: 'ng/mL' },
  { id: 'U-PGML', name: 'picograms per milliliter', symbol: 'pg/mL' },
  { id: 'U-MMOLL', name: 'millimoles per Liter', symbol: 'mmol/L' },
  { id: 'U-CELLS', name: 'cells per cubic millimeter', symbol: 'cells/cumm' },
  { id: 'U-LAKHS', name: 'lakhs per cubic millimeter', symbol: 'lakh/cumm' },
  { id: 'U-PCT', name: 'percentage', symbol: '%' },
  { id: 'U-RATIO', name: 'ratio', symbol: 'ratio' },
  { id: 'U-SEC', name: 'seconds', symbol: 'seconds' }
];

export const MOCK_INVESTIGATIONS: InvestigationTest[] = [
  { 
    code: 'HEM01', 
    name: 'Complete Blood Count (CBC)', 
    shortName: 'CBC', 
    department: 'Pathology',
    categoryId: 'CAT-HEM', 
    subCategoryId: 'SUB-CBC', 
    sampleType: 'EDTA Whole Blood', 
    method: 'Automated Flow Cytometry', 
    machineName: 'Sysmex XN-1000', 
    reportType: 'Quantitative', 
    tat: '4 Hours', 
    normalRangeApplicable: true, 
    criticalValueApplicable: true, 
    nablCompliance: true, 
    activeStatus: 'Active',
    price: 350
  },
  { 
    code: 'BIO01', 
    name: 'Liver Function Test (LFT)', 
    shortName: 'LFT', 
    department: 'Biochemistry',
    categoryId: 'CAT-BIO', 
    subCategoryId: 'SUB-LFT', 
    sampleType: 'SST Serum', 
    method: 'Spectrophotometry / Enzymatic', 
    machineName: 'Beckman Coulter AU480', 
    reportType: 'Quantitative', 
    tat: '6 Hours', 
    normalRangeApplicable: true, 
    criticalValueApplicable: true, 
    nablCompliance: true, 
    activeStatus: 'Active',
    price: 750
  },
  { 
    code: 'BIO02', 
    name: 'Kidney Function Test (KFT)', 
    shortName: 'KFT', 
    department: 'Biochemistry',
    categoryId: 'CAT-BIO', 
    subCategoryId: 'SUB-KFT', 
    sampleType: 'SST Serum', 
    method: 'Colorimetric & ISE', 
    machineName: 'Abbott Alinity c', 
    reportType: 'Quantitative', 
    tat: '6 Hours', 
    normalRangeApplicable: true, 
    criticalValueApplicable: true, 
    nablCompliance: true, 
    activeStatus: 'Active',
    price: 650
  },
  { 
    code: 'BIO03', 
    name: 'Lipid Profile', 
    shortName: 'Lipid', 
    department: 'Biochemistry',
    categoryId: 'CAT-BIO', 
    subCategoryId: 'SUB-LIP', 
    sampleType: 'SST Serum', 
    method: 'Homogeneous Assay', 
    machineName: 'Beckman Coulter AU480', 
    reportType: 'Quantitative', 
    tat: '8 Hours', 
    normalRangeApplicable: true, 
    criticalValueApplicable: false, 
    nablCompliance: true, 
    activeStatus: 'Active',
    price: 550
  },
  { 
    code: 'IMM01', 
    name: 'Thyroid Panel (T3, T4, TSH)', 
    shortName: 'Thyroid', 
    department: 'Pathology',
    categoryId: 'CAT-IMM', 
    subCategoryId: 'SUB-THY', 
    sampleType: 'SST Serum', 
    method: 'Chemiluminescence (CLIA)', 
    machineName: 'Roche cobas e411', 
    reportType: 'Quantitative', 
    tat: '12 Hours', 
    normalRangeApplicable: true, 
    criticalValueApplicable: true, 
    nablCompliance: true, 
    activeStatus: 'Active',
    price: 1100
  },
  { 
    code: 'BIO04', 
    name: 'Glycated Hemoglobin (HbA1c)', 
    shortName: 'HbA1c', 
    department: 'Biochemistry',
    categoryId: 'CAT-BIO', 
    subCategoryId: 'SUB-GLU', 
    sampleType: 'EDTA Whole Blood', 
    method: 'HPLC Chromatography', 
    machineName: 'Bio-Rad D-10', 
    reportType: 'Quantitative', 
    tat: '4 Hours', 
    normalRangeApplicable: true, 
    criticalValueApplicable: false, 
    nablCompliance: true, 
    activeStatus: 'Active',
    price: 450
  },
  { 
    code: 'CLP01', 
    name: 'Urine Routine & Microscopic', 
    shortName: 'Urine R/M', 
    department: 'Pathology',
    categoryId: 'CAT-CLP', 
    subCategoryId: 'SUB-URN', 
    sampleType: 'Midstream Urine', 
    method: 'Reflectance & Microscopy', 
    machineName: 'Dirui H-800', 
    reportType: 'Quantitative', 
    tat: '2 Hours', 
    normalRangeApplicable: true, 
    criticalValueApplicable: false, 
    nablCompliance: true, 
    activeStatus: 'Active',
    price: 150
  }
];

export const MOCK_PARAMETERS: Parameter[] = [
  // CBC Parameters (HEM01)
  { id: 'P-HB', testCode: 'HEM01', name: 'Hemoglobin', unit: 'g/dL', decimalPlaces: 1, sequenceNumber: 1, formulaBased: false },
  { id: 'P-RBC', testCode: 'HEM01', name: 'Total RBC Count', unit: 'million/cumm', decimalPlaces: 2, sequenceNumber: 2, formulaBased: false },
  { id: 'P-WBC', testCode: 'HEM01', name: 'Total Leukocyte Count (TLC)', unit: 'cells/cumm', decimalPlaces: 0, sequenceNumber: 3, formulaBased: false },
  { id: 'P-PLT', testCode: 'HEM01', name: 'Platelet Count', unit: 'lakh/cumm', decimalPlaces: 2, sequenceNumber: 4, formulaBased: false },
  { id: 'P-MCV', testCode: 'HEM01', name: 'Mean Corpuscular Volume (MCV)', unit: 'fL', decimalPlaces: 1, sequenceNumber: 5, formulaBased: true, formula: 'HCT * 10 / RBC' },
  { id: 'P-MCH', testCode: 'HEM01', name: 'Mean Corpuscular Hemoglobin (MCH)', unit: 'pg', decimalPlaces: 1, sequenceNumber: 6, formulaBased: true, formula: 'HB * 10 / RBC' },
  { id: 'P-MCHC', testCode: 'HEM01', name: 'Mean Corpuscular Hb Conc (MCHC)', unit: 'g/dL', decimalPlaces: 1, sequenceNumber: 7, formulaBased: true, formula: 'HB * 100 / HCT' },

  // Liver Parameters (BIO01)
  { id: 'P-SGOT', testCode: 'BIO01', name: 'SGOT (AST)', unit: 'U/L', decimalPlaces: 0, sequenceNumber: 1, formulaBased: false },
  { id: 'P-SGPT', testCode: 'BIO01', name: 'SGPT (ALT)', unit: 'U/L', decimalPlaces: 0, sequenceNumber: 2, formulaBased: false },
  { id: 'P-BIL-T', testCode: 'BIO01', name: 'Total Bilirubin', unit: 'mg/dL', decimalPlaces: 2, sequenceNumber: 3, formulaBased: false },
  { id: 'P-BIL-D', testCode: 'BIO01', name: 'Direct Bilirubin', unit: 'mg/dL', decimalPlaces: 2, sequenceNumber: 4, formulaBased: false },
  { id: 'P-ALKP', testCode: 'BIO01', name: 'Alkaline Phosphatase (ALP)', unit: 'U/L', decimalPlaces: 0, sequenceNumber: 5, formulaBased: false },
  { id: 'P-PROT', testCode: 'BIO01', name: 'Total Proteins', unit: 'g/dL', decimalPlaces: 1, sequenceNumber: 6, formulaBased: false },

  // Kidney Parameters (BIO02)
  { id: 'P-UREA', testCode: 'BIO02', name: 'Blood Urea', unit: 'mg/dL', decimalPlaces: 1, sequenceNumber: 1, formulaBased: false },
  { id: 'P-CREAT', testCode: 'BIO02', name: 'Serum Creatinine', unit: 'mg/dL', decimalPlaces: 2, sequenceNumber: 2, formulaBased: false },
  { id: 'P-URIC', testCode: 'BIO02', name: 'Uric Acid', unit: 'mg/dL', decimalPlaces: 1, sequenceNumber: 3, formulaBased: false },
  { id: 'P-S_SOD', testCode: 'BIO02', name: 'Serum Sodium (Na+)', unit: 'mmol/L', decimalPlaces: 1, sequenceNumber: 4, formulaBased: false },
  { id: 'P-S_POT', testCode: 'BIO02', name: 'Serum Potassium (K+)', unit: 'mmol/L', decimalPlaces: 1, sequenceNumber: 5, formulaBased: false },

  // Lipid Parameters (BIO03)
  { id: 'P-CHOL', testCode: 'BIO03', name: 'Total Cholesterol', unit: 'mg/dL', decimalPlaces: 0, sequenceNumber: 1, formulaBased: false },
  { id: 'P-TRIG', testCode: 'BIO03', name: 'Triglycerides', unit: 'mg/dL', decimalPlaces: 0, sequenceNumber: 2, formulaBased: false },
  { id: 'P-HDL', testCode: 'BIO03', name: 'HDL Cholesterol (Good)', unit: 'mg/dL', decimalPlaces: 0, sequenceNumber: 3, formulaBased: false },
  { id: 'P-LDL', testCode: 'BIO03', name: 'LDL Cholesterol (Bad)', unit: 'mg/dL', decimalPlaces: 0, sequenceNumber: 4, formulaBased: true, formula: 'CHOL - HDL - (TRIG / 5)' },

  // Thyroid Parameters (IMM01)
  { id: 'P-T3', testCode: 'IMM01', name: 'Triiodothyronine (T3)', unit: 'ng/dL', decimalPlaces: 2, sequenceNumber: 1, formulaBased: false },
  { id: 'P-T4', testCode: 'IMM01', name: 'Thyroxine (T4)', unit: 'mcg/dL', decimalPlaces: 2, sequenceNumber: 2, formulaBased: false },
  { id: 'P-TSH', testCode: 'IMM01', name: 'Thyroid Stimulating Hormone (TSH)', unit: 'mIU/L', decimalPlaces: 3, sequenceNumber: 3, formulaBased: false },

  // HbA1c (BIO04)
  { id: 'P-HBA1C', testCode: 'BIO04', name: 'HbA1c', unit: '%', decimalPlaces: 1, sequenceNumber: 1, formulaBased: false },

  // Urine Parameters (CLP01)
  { id: 'P-U_GLU', testCode: 'CLP01', name: 'Urine Glucose', unit: 'qualitative', decimalPlaces: 0, sequenceNumber: 1, formulaBased: false },
  { id: 'P-U_PRO', testCode: 'CLP01', name: 'Urine Protein', unit: 'qualitative', decimalPlaces: 0, sequenceNumber: 2, formulaBased: false },
  { id: 'P-U_PUS', testCode: 'CLP01', name: 'Pus Cells', unit: '/HPF', decimalPlaces: 0, sequenceNumber: 3, formulaBased: false }
];

export const MOCK_REFERENCE_RANGES: AgeGenderReferenceRange[] = [
  // Hemoglobin (P-HB)
  { id: 'R01', parameterId: 'P-HB', gender: 'Male', ageGroup: 'Adult', lowRange: 13.0, highRange: 17.0, unit: 'g/dL', criticalLow: 5.0, criticalHigh: 20.0 },
  { id: 'R02', parameterId: 'P-HB', gender: 'Female', ageGroup: 'Adult', lowRange: 12.0, highRange: 15.0, unit: 'g/dL', criticalLow: 5.0, criticalHigh: 19.0 },
  { id: 'R03', parameterId: 'P-HB', gender: 'All', ageGroup: 'Child', lowRange: 11.0, highRange: 14.0, unit: 'g/dL', criticalLow: 5.0, criticalHigh: 18.0 },
  { id: 'R04', parameterId: 'P-HB', gender: 'All', ageGroup: 'Newborn', lowRange: 15.0, highRange: 21.0, unit: 'g/dL', criticalLow: 8.0, criticalHigh: 24.0 },
  { id: 'R05', parameterId: 'P-HB', gender: 'Male', ageGroup: 'Senior', lowRange: 12.0, highRange: 16.0, unit: 'g/dL', criticalLow: 5.0, criticalHigh: 19.0 },

  // RBC Count (P-RBC)
  { id: 'R06', parameterId: 'P-RBC', gender: 'Male', ageGroup: 'Adult', lowRange: 4.5, highRange: 5.9, unit: 'million/cumm' },
  { id: 'R07', parameterId: 'P-RBC', gender: 'Female', ageGroup: 'Adult', lowRange: 4.0, highRange: 5.2, unit: 'million/cumm' },

  // Platelets (P-PLT)
  { id: 'R08', parameterId: 'P-PLT', gender: 'All', ageGroup: 'Adult', lowRange: 1.5, highRange: 4.5, unit: 'lakh/cumm', criticalLow: 0.20, criticalHigh: 9.0 },
  
  // WBC (P-WBC)
  { id: 'R09', parameterId: 'P-WBC', gender: 'All', ageGroup: 'Adult', lowRange: 4000, highRange: 11000, unit: 'cells/cumm', criticalLow: 1500, criticalHigh: 30000 },
  
  // SGPT (P-SGPT)
  { id: 'R10', parameterId: 'P-SGPT', gender: 'All', ageGroup: 'Adult', lowRange: 5, highRange: 40, unit: 'U/L' },
  
  // SGOT (P-SGOT)
  { id: 'R11', parameterId: 'P-SGOT', gender: 'All', ageGroup: 'Adult', lowRange: 5, highRange: 40, unit: 'U/L' },

  // Creatinine (P-CREAT)
  { id: 'R12', parameterId: 'P-CREAT', gender: 'Male', ageGroup: 'Adult', lowRange: 0.70, highRange: 1.30, unit: 'mg/dL', criticalLow: 0.3, criticalHigh: 4.0 },
  { id: 'R13', parameterId: 'P-CREAT', gender: 'Female', ageGroup: 'Adult', lowRange: 0.60, highRange: 1.10, unit: 'mg/dL', criticalLow: 0.3, criticalHigh: 3.5 },

  // Potassium (P-S_POT)
  { id: 'R14', parameterId: 'P-S_POT', gender: 'All', ageGroup: 'Adult', lowRange: 3.5, highRange: 5.1, unit: 'mmol/L', criticalLow: 2.8, criticalHigh: 6.2 },

  // Cholesterol (P-CHOL)
  { id: 'R15', parameterId: 'P-CHOL', gender: 'All', ageGroup: 'Adult', lowRange: 100, highRange: 200, unit: 'mg/dL' },

  // HbA1c (P-HBA1C)
  { id: 'R16', parameterId: 'P-HBA1C', gender: 'All', ageGroup: 'Adult', lowRange: 4.0, highRange: 5.6, unit: '%' },

  // TSH (P-TSH)
  { id: 'R17', parameterId: 'P-TSH', gender: 'All', ageGroup: 'Adult', lowRange: 0.45, highRange: 4.5, unit: 'mIU/L', criticalLow: 0.1, criticalHigh: 20.0 }
];

export const MOCK_CRITICALS: CriticalValueConfig[] = [
  { id: 'C01', parameterId: 'P-HB', lowCritical: 5.0, highCritical: 20.0, alertMessage: 'HEMOGLOBIN CRITICALLY LOW! Suggests acute clinical anemia. Transfusion trigger alert.' },
  { id: 'C02', parameterId: 'P-PLT', lowCritical: 0.20, highCritical: 9.0, alertMessage: 'THROMBOCYTOPENIA CRISIS! High risk of spontaneous internal bleed.' },
  { id: 'C03', parameterId: 'P-S_POT', lowCritical: 2.8, highCritical: 6.2, alertMessage: 'POTASSIUM ARRHYTHMIA WARNING! Risk of cardiac sudden collapse.' },
  { id: 'C04', parameterId: 'P-CREAT', lowCritical: 0.2, highCritical: 3.8, alertMessage: 'RENAL FAILURE RISK! Serum Creatinine levels indicate potential uremia overload.' },
  { id: 'C05', parameterId: 'P-TSH', lowCritical: 0.05, highCritical: 25.0, alertMessage: 'THYROID THYROTOXICOSIS / MYXEDEMA ALERT! Serious metabolic distress.' }
];

// Sample metadata representing 500 pathology items spanning all diagnostic systems (index-structure)
export const PATHOLOGY_500_DESCRIPTIONS: { code: string, name: string, category: string, subCategory: string, method: string, sample: string }[] = [
  { code: 'HEM001', name: 'Complete Blood Count (CBC) with diff', category: 'Hematology', subCategory: 'General Cells', method: 'VCS Flow Cytometry', sample: 'EDTA Blood' },
  { code: 'HEM002', name: 'Erythrocyte Sedimentation Rate (ESR)', category: 'Hematology', subCategory: 'ESR Panel', method: 'Westergren Method', sample: 'EDTA Blood' },
  { code: 'HEM003', name: 'Peripheral Smear Examination', category: 'Hematology', subCategory: 'Morphology', method: 'Manual Microscopy Leishman Stain', sample: 'Smear slide' },
  { code: 'HEM004', name: 'Reticulocyte Count', category: 'Hematology', subCategory: 'Reticulocytes', method: 'Supravital Staining Counter', sample: 'EDTA Blood' },
  { code: 'HEM005', name: 'Sickle Cell Preparation', category: 'Hematology', subCategory: 'Hemoglobins', method: 'Sodium Metabisulfite Slide', sample: 'Whole Blood' },
  { code: 'HEM006', name: 'G6PD Quality Screening', category: 'Hematology', subCategory: 'Enzymes', method: 'Visual Methemoglobin Reduction', sample: 'Heparinized Blood' },
  { code: 'HEM007', name: 'Absolute Eosinophil Count (AEC)', category: 'Hematology', subCategory: 'Diff Cells', method: 'Hemocytometer / Laser Counter', sample: 'EDTA Blood' },
  { code: 'HEM008', name: 'Osmotic Fragility Test', category: 'Hematology', subCategory: 'RBC Fragility', method: 'Buffered Saline Dilution Series', sample: 'Heparinized Blood' },
  { code: 'HEM009', name: 'LE Cell Phenotyping', category: 'Hematology', subCategory: 'Autoimmune', method: 'Slide Smear Smudge', sample: 'Defibrinated Blood' },
  { code: 'HEM010', name: 'Bone Marrow Aspirate Study', category: 'Hematology', subCategory: 'Marrow', method: 'Wright-Giemsa Cytochemistry', sample: 'Marrow biopsy' },
  { code: 'COA001', name: 'Prothrombin Time (PT-INR)', category: 'Coagulation Studies', subCategory: 'Clotting', method: 'Electromagnetic Clot Detection', sample: 'Sodium Citrate Plasma' },
  { code: 'COA002', name: 'Activated Partial Thromboplastin Time (aPTT)', category: 'Coagulation Studies', subCategory: 'Clotting', method: 'Nephelometric Clot Sensor', sample: 'Sodium Citrate Plasma' },
  { code: 'COA003', name: 'Fibrinogen Activity Assay', category: 'Coagulation Studies', subCategory: 'Fibrin', method: 'Clauss Chronometric Method', sample: 'Sodium Citrate Plasma' },
  { code: 'COA004', name: 'D-Dimer Level', category: 'Coagulation Studies', subCategory: 'Fibrinolysis', method: 'Quantitative Turbidimetric latex', sample: 'Sodium Citrate Plasma' },
  { code: 'COA005', name: 'Thrombin Time (TT)', category: 'Coagulation Studies', subCategory: 'Clotting', method: 'Enzymatic addition clot time', sample: 'Sodium Citrate Plasma' },
  { code: 'BIO001', name: 'Blood Glucose Fasting (F)', category: 'Biochemistry', subCategory: 'Glucose', method: 'GOD-POD Enzymatic', sample: 'Fluoride Plasma' },
  { code: 'BIO002', name: 'Blood Glucose Post Prandial (PP)', category: 'Biochemistry', subCategory: 'Glucose', method: 'GOD-POD Hexokinase', sample: 'Fluoride Plasma' },
  { code: 'BIO003', name: 'Blood Glucose Random (R)', category: 'Biochemistry', subCategory: 'Glucose', method: 'Sensor strip / Hexokinase', sample: 'Plasma/Whole blood' },
  { code: 'BIO004', name: 'Oral Glucose Tolerance Test (OGTT)', category: 'Biochemistry', subCategory: 'Glucose', method: 'Multi-point Colorimetric GOD', sample: 'Fluoride Series' },
  { code: 'BIO005', name: 'Glycated Albumin', category: 'Biochemistry', subCategory: 'Glycation', method: 'Enzymatic colorimetric', sample: 'Serum' },
  { code: 'BIO006', name: 'Serum Bilirubin Total & Fractions', category: 'Biochemistry', subCategory: 'Liver Profile', method: 'Jendrassik-Grof Diazo Reaction', sample: 'Serum' },
  { code: 'BIO007', name: 'SGOT (Aspartate Aminotransferase)', category: 'Biochemistry', subCategory: 'Liver Profile', method: 'IFCC UV modification kinetic', sample: 'Serum' },
  { code: 'BIO008', name: 'SGPT (Alanine Aminotransferase)', category: 'Biochemistry', subCategory: 'Liver Profile', method: 'IFCC UV Rate Assay', sample: 'Serum' },
  { code: 'BIO009', name: 'Alkaline Phosphatase (ALP)', category: 'Biochemistry', subCategory: 'Liver Profile', method: 'pNPP Kinetic Assay', sample: 'Serum' },
  { code: 'BIO010', name: 'Gamma Glutamyl Transferase (GGT)', category: 'Biochemistry', subCategory: 'Liver Profile', method: 'Szasz Substrate Kinetic', sample: 'Serum' },
  { code: 'BIO011', name: 'Lactate Dehydrogenase (LDH)', category: 'Biochemistry', subCategory: 'Enzymes', method: 'Pyruvate-Lactate UV Speed', sample: 'Serum' },
  { code: 'BIO012', name: 'Serum Amylase Activity', category: 'Biochemistry', subCategory: 'Pancreas', method: 'Blocked G7-CNP Direct Rate', sample: 'Serum' },
  { code: 'BIO013', name: 'Serum Lipase Activity', category: 'Biochemistry', subCategory: 'Pancreas', method: 'Methyl Resorufin Colorimetric', sample: 'Serum' },
  { code: 'BIO014', name: 'Serum Total Proteins & A/G ratio', category: 'Biochemistry', subCategory: 'Proteins', method: 'Biuret & Bromocresol Green', sample: 'Serum' },
  { code: 'BIO015', name: 'Serum Albumin', category: 'Biochemistry', subCategory: 'Proteins', method: 'Bromocresol Green Dye binding', sample: 'Serum' },
  { code: 'BIO016', name: 'Serum Globulin Estimation', category: 'Biochemistry', subCategory: 'Proteins', method: 'Mathematical subtraction calculation', sample: 'Serum' },
  { code: 'BIO017', name: 'Blood Urea Nitrogen (BUN)', category: 'Biochemistry', subCategory: 'Kidney Profile', method: 'Urease GLDH Spectrometric', sample: 'Serum' },
  { code: 'BIO018', name: 'Serum Creatinine with eGFR Rate', category: 'Biochemistry', subCategory: 'Kidney Profile', method: 'Modified Jaffe Kinetic / Enzymatic', sample: 'Serum' },
  { code: 'BIO019', name: 'Serum Uric Acid Profile', category: 'Biochemistry', subCategory: 'Kidney Profile', method: 'Uricase PAP enzymatic', sample: 'Serum' },
  { code: 'BIO020', name: 'Serum Cystatin C', category: 'Biochemistry', subCategory: 'Kidney Profile', method: 'PETIA Immunoturbidimetric', sample: 'Serum' },
  { code: 'BIO021', name: 'Electrolytes Panel (Na+, K+, Cl-)', category: 'Biochemistry', subCategory: 'Electrolytes', method: 'Indirect Ion-Selective Electrode', sample: 'Serum' },
  { code: 'BIO022', name: 'Serum Calcium Total with Ionized', category: 'Biochemistry', subCategory: 'Minerals', method: 'Arsenazo III Binding / Ion Sensor', sample: 'Serum / Whole heparin' },
  { code: 'BIO023', name: 'Serum Inorganic Phosphorus', category: 'Biochemistry', subCategory: 'Minerals', method: 'Phosphomolybdate Coloration', sample: 'Serum' },
  { code: 'BIO024', name: 'Serum Magnesium Level', category: 'Biochemistry', subCategory: 'Minerals', method: 'Xylidyl Blue complex spectrophotometry', sample: 'Serum' },
  { code: 'BIO025', name: 'Total Cholesterol', category: 'Biochemistry', subCategory: 'Lipid Profile', method: 'CHOD-PAP enzymatic endpoints', sample: 'Serum' },
  { code: 'BIO026', name: 'Triglycerides Level', category: 'Biochemistry', subCategory: 'Lipid Profile', method: 'GPO-PAP Colorimetric detection', sample: 'Serum' },
  { code: 'BIO027', name: 'HDL Cholesterol direct clearance', category: 'Biochemistry', subCategory: 'Lipid Profile', method: 'Immunoinhibition enzymatic', sample: 'Serum' },
  { code: 'BIO028', name: 'LDL Cholesterol calculated/direct', category: 'Biochemistry', subCategory: 'Lipid Profile', method: 'Friedewald formula / Direct Clearance', sample: 'Serum' },
  { code: 'BIO029', name: 'Apolipoprotein A-1 Assay', category: 'Biochemistry', subCategory: 'Cardiovascular', method: 'Immunoturbidimetry assay', sample: 'Serum' },
  { code: 'BIO030', name: 'Apolipoprotein B Assay', category: 'Biochemistry', subCategory: 'Cardiovascular', method: 'Immunoturbidimetric calculation', sample: 'Serum' },
  { code: 'BIO031', name: 'Lipoprotein(a) [Lp(a)] Level', category: 'Biochemistry', subCategory: 'Cardiovascular', method: 'Latex agglutination immuno', sample: 'Serum' },
  { code: 'BIO032', name: 'Serum Iron Profile (Iron, TIBC, Saturation)', category: 'Biochemistry', subCategory: 'Anemia Panel', method: 'Ferrozine chromogen binding', sample: 'Serum' },
  { code: 'BIO033', name: 'Total Iron Binding Capacity (TIBC)', category: 'Biochemistry', subCategory: 'Anemia Panel', method: 'Carbonate saturation calculation', sample: 'Serum' },
  { code: 'BIO034', name: 'Serum Ferritin Assay', category: 'Biochemistry', subCategory: 'Anemia Panel', method: 'Chemiluminescent Immunometric', sample: 'Serum' },
  { code: 'BIO035', name: 'Serum Transferrin Level', category: 'Biochemistry', subCategory: 'Anemia Panel', method: 'Turbidimetric nephelometric', sample: 'Serum' },
  { code: 'IMM001', name: 'TSH (Thyroid Stimulating Hormone)', category: 'Immunology & Hormones', subCategory: 'Thyroid', method: 'Ultra-sensitive Sandwich CLIA', sample: 'Serum' },
  { code: 'IMM002', name: 'Free Triiodothyronine (FT3)', category: 'Immunology & Hormones', subCategory: 'Thyroid', method: 'Competitive Immunoassay CLIA', sample: 'Serum' },
  { code: 'IMM003', name: 'Free Thyroxine (FT4)', category: 'Immunology & Hormones', subCategory: 'Thyroid', method: 'CLIA Competitive displacement', sample: 'Serum' },
  { code: 'IMM004', name: 'Anti-TPO (Thyroid Peroxidase Antibodies)', category: 'Immunology & Hormones', subCategory: 'Autoimmune Thyroid', method: 'CLIA Sandwich reaction', sample: 'Serum' },
  { code: 'IMM005', name: 'Anti-Thyroglobulin Antibody (ATG)', category: 'Immunology & Hormones', subCategory: 'Autoimmune Thyroid', method: 'CLIA detection', sample: 'Serum' },
  { code: 'IMM006', name: 'Luteinizing Hormone (LH)', category: 'Immunology & Hormones', subCategory: 'Fertility Panel', method: 'Chemiluminescence Immunoassay', sample: 'Serum' },
  { code: 'IMM007', name: 'FSH (Follicle Stimulating Hormone)', category: 'Immunology & Hormones', subCategory: 'Fertility Panel', method: 'Chemiluminescence CLIA', sample: 'Serum' },
  { code: 'IMM008', name: 'Serum Prolactin Level', category: 'Immunology & Hormones', subCategory: 'Fertility Panel', method: 'One-step Sandwich immuno', sample: 'Serum' },
  { code: 'IMM009', name: 'Progesterone Assay', category: 'Immunology & Hormones', subCategory: 'Fertility Panel', method: 'Competitive binding CLIA', sample: 'Serum' },
  { code: 'IMM010', name: 'Estradiol (E2) Levels', category: 'Immunology & Hormones', subCategory: 'Fertility Panel', method: 'Competitive Immunometric', sample: 'Serum' },
  { code: 'IMM011', name: 'Beta-hCG Quantitative', category: 'Immunology & Hormones', subCategory: 'Pregnancy Hormones', method: 'Sandwich Immunoassay CLIA', sample: 'Serum' },
  { code: 'IMM012', name: 'Testosterone Total', category: 'Immunology & Hormones', subCategory: 'Androgens', method: 'Competitive binding CLIA', sample: 'Serum' },
  { code: 'IMM013', name: 'Free Testosterone Profile', category: 'Immunology & Hormones', subCategory: 'Androgens', method: 'Equilibrium Dialysis / ELISA', sample: 'Serum' },
  { code: 'IMM014', name: 'DHEA-S (Dehydroepiandrosterone Sulfate)', category: 'Immunology & Hormones', subCategory: 'Androgens', method: 'Competitive Chemiluminescent', sample: 'Serum' },
  { code: 'IMM015', name: 'Cortisol (Fasting or Diurnal)', category: 'Immunology & Hormones', subCategory: 'Adrenal Panel', method: 'CLIA Solid phase competitive', sample: 'Serum' },
  { code: 'IMM016', name: 'Vitamin D3 (25-Hydroxycalciferol)', category: 'Immunology & Hormones', subCategory: 'Vitamins', method: 'Competitive CLIA / LC-MSMS', sample: 'Serum' },
  { code: 'IMM017', name: 'Vitamin B12 Assay', category: 'Immunology & Hormones', subCategory: 'Vitamins', method: 'Competitive binding CLIA', sample: 'Serum' },
  { code: 'IMM018', name: 'Intact PTH (Parathyroid Hormone)', category: 'Immunology & Hormones', subCategory: 'Minerals', method: 'Two-site Immunometric CLIA', sample: 'EDTA Plasma / Serum' },
  { code: 'IMM019', name: 'Folate (Serum/RBC)', category: 'Immunology & Hormones', subCategory: 'Vitamins', method: 'Competitive enzymatic binding', sample: 'Serum / EDTA' },
  { code: 'IMM020', name: 'PSA Total (Prostate Specific Antigen)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'Two-site Sandwich CLIA', sample: 'Serum' },
  { code: 'IMM021', name: 'PSA Free fraction with ratio', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'Chemiluminescent sandwich', sample: 'Serum' },
  { code: 'IMM022', name: 'CA 125 (Ovarian Cancer Antigen)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'One-step Sandwich immunometric', sample: 'Serum' },
  { code: 'IMM023', name: 'CA 15-3 (Breast Cancer Antigen)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'CLIA Immunochemical reaction', sample: 'Serum' },
  { code: 'IMM024', name: 'CA 19-9 (Gastrointestinal Marker)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'Chemiluminescence CLIA', sample: 'Serum' },
  { code: 'IMM025', name: 'Carcinoembryonic Antigen (CEA)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'Solid-phase Sandwich CLIA', sample: 'Serum' },
  { code: 'IMM026', name: 'AFP (Alpha-Fetoprotein Tumor)', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'Two-site immunochemical', sample: 'Serum' },
  { code: 'IMM027', name: 'Beta-2 Microglobulin Level', category: 'Immunology & Hormones', subCategory: 'Tumor Markers', method: 'PETIA immunoturbidimetric', sample: 'Serum / Urine' },
  { code: 'SER001', name: 'C-Reactive Protein (CRP) Quantitative', category: 'Serology', subCategory: 'Inflammatory', method: 'High-sensitivity Latex Turbidimetry', sample: 'Serology Serum' },
  { code: 'SER002', name: 'Rheumatoid Factor (RF) Quant', category: 'Serology', subCategory: 'Inflammatory', method: 'nephelometric immunoturbidimetric', sample: 'Serum' },
  { code: 'SER003', name: 'ASO Titre (Anti-Streptolysin O)', category: 'Serology', subCategory: 'Infections', method: 'Latex agglutination quantitative', sample: 'Serum' },
  { code: 'SER004', name: 'Widal Agglutination Slide / Tube', category: 'Serology', subCategory: 'Infections', method: 'O & H Salmonella antigens serum speed', sample: 'Serum' },
  { code: 'SER005', name: 'VDRL / RPR Syphilis test', category: 'Serology', subCategory: 'Infections', method: 'Flocculation qualitative reaction', sample: 'Serum' },
  { code: 'SER006', name: 'HIV 1 & 2 ELISA screening', category: 'Serology', subCategory: 'Viruses', method: '4th Generation Antigen/Antibody ELISA', sample: 'Serum' },
  { code: 'SER007', name: 'HBsAg (Hepatitis B Surface Antigen)', category: 'Serology', subCategory: 'Viruses', method: 'Chemiluminescence / ELISA', sample: 'Serum' },
  { code: 'SER008', name: 'HCV Total Antibodies Screening', category: 'Serology', subCategory: 'Viruses', method: 'Chemiluminescent sandwich reaction', sample: 'Serum' },
  { code: 'SER009', name: 'Dengue NS1 Antigen Card/ELISA', category: 'Serology', subCategory: 'Viruses', method: 'Immunochromatographic lateral flow', sample: 'Serum' },
  { code: 'SER010', name: 'Dengue IgM & IgG Antibodies', category: 'Serology', subCategory: 'Viruses', method: 'Lateral Flow Strip / ELISA', sample: 'Serum' },
  { code: 'SER011', name: 'Dengue IgG ELISA', category: 'Serology', subCategory: 'Viruses', method: 'Solid-phase capture ELISA', sample: 'Serum' },
  { code: 'SER012', name: 'Chikungunya IgM Assay', category: 'Serology', subCategory: 'Viruses', method: 'ELISA Immunocapture', sample: 'Serum' },
  { code: 'SER013', name: 'Typhidot IgM & IgG', category: 'Serology', subCategory: 'Infections', method: 'Immunochromatographic dot assay', sample: 'Serum' },
  { code: 'SER014', name: 'Leptospira IgM screening', category: 'Serology', subCategory: 'Infections', method: 'Rapid slide agglutination / ELISA', sample: 'Serum' },
  { code: 'SER015', name: 'ANA (Antinuclear Antibodies) Screen', category: 'Serology', subCategory: 'Autoimmune', method: 'Indirect Immunofluorescence (IFA)', sample: 'Serum' },
  { code: 'SER016', name: 'ANA Profile (Immunoblot series)', category: 'Serology', subCategory: 'Autoimmune', method: 'Line Immunoassay membrane blot', sample: 'Serum' },
  { code: 'SER017', name: 'Anti-dsDNA quantitative', category: 'Serology', subCategory: 'Autoimmune', method: 'ELISA / Crithidia luciliae IFA', sample: 'Serum' },
  { code: 'SER018', name: 'Brucella Antibody agglutination', category: 'Serology', subCategory: 'Infections', method: 'Standard Tube Agglutination (SAT)', sample: 'Serum' },
  { code: 'CLP001', name: 'Urine Routine chemical with microscopic deposits', category: 'Clinical Pathology', subCategory: 'Urine Routine', method: 'Spectro dipstick & centrifuge micro', sample: 'Mid Urine Tube' },
  { code: 'CLP002', name: 'Urine Microalbumin / Creatinine Ratio', category: 'Clinical Pathology', subCategory: 'Special Urine', method: 'Immunoturbidimetric & Jaffe', sample: 'Spot Urine' },
  { code: 'CLP003', name: 'Urine 24 Hour Urea & Creatinine clearance', category: 'Clinical Pathology', subCategory: 'Special Urine', method: 'Timed collection biochemical assays', sample: '24 Hour Urine container' },
  { code: 'CLP004', name: 'Urine Bence Jones Protein qualitative', category: 'Clinical Pathology', subCategory: 'Proteins', method: 'Heat Precipitation & Sulfosalicylic', sample: 'Fresh Morning Urine' },
  { code: 'CLP005', name: 'Urine Pregnancy Test hCG speed card', category: 'Clinical Pathology', subCategory: 'Pregnancy', method: 'Lateral Flow immunochromatography', sample: 'Morning Urine' },
  { code: 'CLP006', name: 'Stool Routine examination & deposit', category: 'Clinical Pathology', subCategory: 'Stool routine', method: 'Physical, chemical, wet mount micro', sample: 'Fresh Stool container' },
  { code: 'CLP007', name: 'Stool Occult Blood (FOBT)', category: 'Clinical Pathology', subCategory: 'Stool routine', method: 'Guaiac / Immunochemical (iFOBT)', sample: 'Stool sample' },
  { code: 'CLP008', name: 'Stool Reducing Substances quality', category: 'Clinical Pathology', subCategory: 'Stool routine', method: 'Clinitest tablet / Benedict\'s chemical', sample: 'Fresh Stool sample' },
  { code: 'CLP009', name: 'Semen Routine Analysis / Spermogram', category: 'Clinical Pathology', subCategory: 'Semen panel', method: 'Macroscopic physical & count chambers', sample: 'Semen container' },
  { code: 'CLP010', name: 'Sperm DNA Fragmentation Index (DFI)', category: 'Clinical Pathology', subCategory: 'Semen panel', method: 'Sperm Chromatin Dispersion (SCD)', sample: 'Liquefied Semen' },
  { code: 'MIC001', name: 'Urine Culture and Drug Sensitivity', category: 'Microbiology', subCategory: 'Cultures', method: 'Quantitative plating & Kirby-Bauer', sample: 'Sterile urine container' },
  { code: 'MIC002', name: 'Blood Culture and Sensitivity Automated', category: 'Microbiology', subCategory: 'Cultures', method: 'Continuous monitoring bottle sensors', sample: 'Blood culture vial' },
  { code: 'MIC003', name: 'Sputum Acid Fast Bacilli (AFB) smear', category: 'Microbiology', subCategory: 'Tubercle', method: 'Hot Ziehl-Neelsen staining microscopy', sample: 'Early sputum cup' },
  { code: 'MIC004', name: 'TB Culture automated (MGIT system)', category: 'Microbiology', subCategory: 'Tubercle', method: 'Fluorescence detection tube', sample: 'Sputum / tissue' },
  { code: 'MIC005', name: 'Pus Smear Gram Stain Examination', category: 'Microbiology', subCategory: 'Staining', method: 'Gram differentiation dye microscopy', sample: 'Sterile pus swab' },
  { code: 'MIC006', name: 'Vaginal Swear wet mount / Gram study', category: 'Microbiology', subCategory: 'Staining', method: 'Physical saline & methylene stains', sample: 'Swab on slides' },
  { code: 'MIC007', name: 'Stool Hanging Drop cholera motility', category: 'Microbiology', subCategory: 'Staining', method: 'Wet hanging drop microscopy', sample: 'Liquid fresh stool' },
  { code: 'MIC008', name: 'Fungal Culture / KOH smear prep', category: 'Microbiology', subCategory: 'Mycology', method: '10% Potassium hydroxide digest Sabouraud', sample: 'Skin scraping / Nail / Hair' },
  { code: 'HIS001', name: 'Histopathology Biopsy - Small specimen', category: 'Histopathology', subCategory: 'Tissue pathology', method: 'Formalin fix, paraffin block, H&E', sample: 'Tissue vial' },
  { code: 'HIS002', name: 'Histopathology Biopsy - Medium organ spec', category: 'Histopathology', subCategory: 'Tissue pathology', method: 'Tissue trimming, serial slide staining', sample: 'Specimen in formalin' },
  { code: 'HIS003', name: 'Histopathology Biopsy - Large radical resect', category: 'Histopathology', subCategory: 'Tissue pathology', method: 'Grossing, extensive staging blocks', sample: 'Resected organ block' },
  { code: 'HIS004', name: 'Immunohistochemistry (IHC) marker panel', category: 'Histopathology', subCategory: 'Tumor IHC', method: 'Horseradish peroxidase polymers', sample: 'Paraffin slide sections' },
  { code: 'CYT001', name: 'Pap Smear Cervical cytology (Conventional)', category: 'Cytology', subCategory: 'Smears', method: 'Papanicolaou smear collection', sample: 'Cervical slide sweep' },
  { code: 'CYT002', name: 'Liquid Based Cytology (LBC)', category: 'Cytology', subCategory: 'Smears', method: 'Preservative filtration monolayer cytoprep', sample: 'Preservative vial' },
  { code: 'CYT003', name: 'FNAC (Fine Needle Aspiration Cytology)', category: 'Cytology', subCategory: 'FNAC nodes', method: 'Syringe aspirator smear stain microscopy', sample: 'Aspirate cells' },
  { code: 'CYT004', name: 'FNAC with Ultrasound guidance', category: 'Cytology', subCategory: 'FNAC nodes', method: 'USG needle target aspirate smears', sample: 'Nodal aspirates' },
  { code: 'MOL001', name: 'SARS-CoV-2 Real-Time RT-PCR', category: 'Molecular Biology', subCategory: 'Viral PCR', method: 'TaqMan probes fluorimetry RT-PCR', sample: 'Nasopharyngeal swab' },
  { code: 'MOL002', name: 'Hepatitis B DNA Viral Load Quantitative', category: 'Molecular Biology', subCategory: 'Viral PCR', method: 'COBAS Real-time amplification PCR', sample: 'EDTA Plasma' },
  { code: 'MOL003', name: 'Hepatitis C RNA Viral Load Quantitative', category: 'Molecular Biology', subCategory: 'Viral PCR', method: 'Real-time TaqMan RT-PCR', sample: 'EDTA Plasma' },
  { code: 'MOL004', name: 'HLA-B27 PCR detection', category: 'Molecular Biology', subCategory: 'Genotyping', method: 'Real-time multiplex DNA PCR', sample: 'EDTA Whole Blood' },
  { code: 'MOL005', name: 'GeneXpert TB PCR with Rifampicin resistance', category: 'Molecular Biology', subCategory: 'Tubercle', method: 'Cartridge base integrated PCR real-time', sample: 'Sputum / fluid' }
];

// Populate the mock database descriptions up to 500 records automatically by looping and generating codes
for (let i = PATHOLOGY_500_DESCRIPTIONS.length; i < 500; i++) {
  const catNames = ['Biochemistry', 'Hematology', 'Microbiology', 'Immunology & Hormones', 'Toxicology', 'Clinical Pathology', 'Coagulation Studies', 'Histopathology', 'Special Investigations'];
  const cat = catNames[i % catNames.length];
  let subcat = 'General Screening';
  let method = 'Automated Photometric Analysis';
  let sample = 'Venous Serum';
  
  if (cat === 'Hematology') { subcat = 'Blood counts'; method = 'Impedance Aperture System'; sample = 'EDTA Blood'; }
  else if (cat === 'Microbiology') { subcat = 'Fungal & Bacterial detection'; method = 'Sensititre automation'; sample = 'Body Fluid Swab'; }
  else if (cat === 'Toxicology') { subcat = 'Heavy Metals assay'; method = 'Inductively Coupled Plasma Mass Spec (ICP-MS)'; sample = 'Random Urine / Blood'; }
  else if (cat === 'Histopathology') { subcat = 'Special Staining'; method = 'Immunoperoxidase speed stains'; sample = 'Formalin Biopsy Block'; }
  else if (cat === 'Coagulation Studies') { subcat = 'Clot factors'; method = 'Turbidimetric Mechanical Fibrin check'; sample = 'Citrated Plasma'; }

  PATHOLOGY_500_DESCRIPTIONS.push({
    code: `SPC${100 + i}`,
    name: [
      'Serum Acetaminophen Level', 'Salivary Cortisol Rhythm', 'Blood Lead Concentration', 'Arterial Blood Gas Analysis',
      'Urinary Cortisol 24Hr', 'Serum Choline Esterase', 'Homocysteine Quantitative', 'Interleukin-6 (IL-6) Cytokine',
      'Cyclosporine trough concentration', 'Tacrolimus immunosuppression blood Level', 'Anti-Mullerian Hormone (AMH)', 'Inhibin B level',
      'Serum Erythropoietin', 'Osteocalcin bone marker', 'Active Renin-Aldosterone Ratio', 'Metanephrines 24-Hour Urine',
      'Complement C3 & C4 values', 'Urinary Protein Electrophoresis Screen', 'Immunofixation Electrophoresis serum', 'Lithium monitoring',
      'Valproic acid therapeutic Level', 'Phenytoin concentration', 'Vancomycin peak/trough levels', 'Plasma Lactate concentration'
    ][i % 24] + ` - Sample Run ${i}`,
    category: cat,
    subCategory: subcat,
    method: method,
    sample: sample
  });
}

// Generate some Referral Doctors reference data
export const MOCK_DOCTORS: ReferralDoctor[] = [];

// Generate some Franchise Collection Centers reference data
export const MOCK_FRANCHISES: FranchiseCollectionCenter[] = [];

// Generate Home Collection Phlebotomist bookings
export const MOCK_HOME_COLLECTIONS: HomeCollectionBooking[] = [];

// Complete dynamic results records matching historical patient lists
export const MOCK_LIS_RESULTS: LISResultRecord[] = [];
