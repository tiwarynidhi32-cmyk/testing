import { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Stethoscope, 
  Calendar, 
  Pill, 
  CreditCard, 
  FlaskConical, 
  Users, 
  Settings, 
  FileText, 
  Shield, 
  ClipboardList, 
  Baby, 
  Scissors, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  HelpCircle, 
  Activity, 
  Sparkles, 
  Printer, 
  Download,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';

interface ManualSection {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  role: string[];
  steps: {
    title: string;
    description: string;
    tips?: string[];
  }[];
  importantNote?: string;
}

export default function UserManual() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeManualTab, setActiveManualTab] = useState('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'getting-started': true,
    'pharmacy-pos': true,
    'opd-flow': true
  });

  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const userRole = (currentUser?.role || '').toUpperCase();
  const userName = currentUser?.name || 'Guest User';

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const hasRoleAccess = (urole: string, sectionRoles: string[]) => {
    const r = (urole || '').toUpperCase().trim();
    
    // Admins have access to all guidelines
    if (r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'HOSPITAL_ADMIN') {
      return true;
    }
    
    return sectionRoles.some(secRole => {
      const s = secRole.toUpperCase().trim();
      if (s === r) return true;
      
      // Map common role equivalents
      if (s === 'DOCTOR' && (r === 'DOCTOR' || r === 'SURGEON' || r === 'CLINICIAN')) return true;
      if (s === 'SURGEON' && (r === 'SURGEON' || r === 'DOCTOR')) return true;
      if (s === 'RECEPTIONIST' && (r === 'RECEPTIONIST' || r === 'RECEPTION' || r === 'FRONT_DESK' || r === 'FRONT_OFFICE')) return true;
      if (s === 'ACCOUNTANT' && (r === 'ACCOUNTANT' || r === 'ACCOUNTS')) return true;
      if (s === 'LAB_STAFF' && (r === 'LAB_STAFF' || r === 'RADIOLOGIST' || r === 'TECHNICIAN' || r === 'LAB')) return true;
      if (s === 'PHARMACIST' && r === 'PHARMACIST') return true;
      if (s === 'NURSE' && r === 'NURSE') return true;
      
      return false;
    });
  };

  const manualSections: ManualSection[] = [
    {
      id: 'getting-started',
      title: 'Administrator Dashboard & Basic Setup',
      subtitle: 'Hospital configuration, metrics overview, and quick patient register.',
      icon: Settings,
      role: ['SUPER_ADMIN', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE', 'ADMIN', 'HOSPITAL_ADMIN'],
      steps: [
        {
          title: 'Quick Register & Intake Flow',
          description: 'Use the "Quick Register" button in the header from any screen to sign up a patient quickly. Enter Name, Phone, Age, Gender, and the target service (OPD Consultation, Pharmacy, Lab, or Radiology). This automatically creates a unique Medical Record Number (MRN) and queues them appropriately.',
        },
        {
          title: 'Configuring Hospital Profile',
          description: 'Navigate to "Settings" in the sidebar. Inside "Hospital Settings", the Administrator can customize professional details like the Hospital Name, Address, Contact Email, GST Registration Number, and invoice headers. You can also upload a logo which automatically structures invoice receipt printouts and OPD prescription headers.',
          tips: ['Uploading a black-and-white or high-contrast logo ensures optimal receipt printing.', 'Role-based profiles are strictly managed from the "Staff Management" panel.']
        }
      ],
      importantNote: 'All user sessions are persistent. Staff names, avatars, and specific permission profiles are dynamically mapped to secure system policies.'
    },
    {
      id: 'opd-flow',
      title: 'Outpatient Department (OPD) Consultation & Prescriptions',
      subtitle: 'Doctor queue, digital prescriptions, vital entry, auto-fetched doctor details, and patient history.',
      icon: Stethoscope,
      role: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK', 'NURSE'],
      steps: [
        {
          title: 'Booking & Queuing Appoints',
          description: 'Go to the "OPD Management" tab in the navigation. Book a new appointment by selecting an existing patient by typing their name/MRN, selecting consecutive active OPD doctors, setting urgency, and choosing time blocks.',
        },
        {
          title: 'Recording Symptoms, Vitals & Examination',
          description: 'From the Doctor queue list, click "Consult" or "Modify". Insert critical clinical logs: Blood Pressure, Pulse, Core Temperature, Chief Complaints, Clinical Observations, and Diagnosis.',
        },
        {
          title: 'Automated Doctor Prefilling for Prescriptions',
          description: 'When writing a prescription, the system automatically fetches the doctor who is fixed with the patient\'s active appointment to prevent selection errors. If that assigned doctor is unavailable or another specialist steps in, the Doctor input remains fully editable, allowing selection of any available practitioner from the dropdown.',
          tips: ['Automatic lookup optimizes doctor-to-prescription matching.', 'Always confirm the final consulting doctor list when printing.']
        },
        {
          title: 'Generating Digital Prescriptions',
          description: 'Inside the prescription manager block, select appropriate medications mapped directly from active pharmacy inventories. Write strict dosage instructions (e.g., "1-0-1", "Once Daily", "After Meal"), duration, and optional advice.',
          tips: ['Saving a prescription generates a print-ready OPD Consult card file.', 'Diagnostic orders for Labs or Radiology can be initiated concurrently inside the clinical panel.']
        }
      ]
    },
    {
      id: 'ipd-flow',
      title: 'Inpatient (IPD) Admissions & Nursing Ward',
      subtitle: 'Bed assignments, medication logs, nurse checklists, and multi-stage discharge clearances.',
      icon: Calendar,
      role: ['SUPER_ADMIN', 'DOCTOR', 'NURSE'],
      steps: [
        {
          title: 'Patient Intake & Bed Allocations',
          description: 'Navigate to "IPD Management". If a doctor recommends hospitalization, click "Admit Patient". Select the patient, the admitting doctor, the diagnosis, and assign a physical bed.',
          tips: ['Supported ... ward categories: General Ward, Semi-Private, Deluxe Cabin, and ICU.', 'Beds currently occupied will show up as red in real-time. Available beds are in green.']
        },
        {
          title: 'Hourly Nursing Station Checklist',
          description: 'Go to the "Nursing Station" tab. This dashboard lists all current residential ward patients. Nurses can write hourly medical logs, administer medication sheets mapped from pharmacy stocks, register continuous vital charting (BP/Temp/SpO2), and trigger immediate emergency alerts.',
        },
        {
          title: 'Multi-Department Discharge Clearance Checklist',
          description: 'To clear a patient for discharge, a strict 4-tier check schema is followed: (1) Attending Doctor marks clinical clearance, (2) Ward Nurse registers physical checklist verification, (3) Accountant validates full ledger bills, and (4) Receptionist confirms safe recovery checkouts and handovers.',
          tips: ['Discharge Clearance avoids premature checkout errors.', 'The checklist updates in real-time for all connected staff interfaces.']
        }
      ]
    },
    {
      id: 'ot-surgery',
      title: 'Operating Theatre (OT) Management',
      subtitle: 'Booking surgeries, assigning surgeons, and updates on operating stages.',
      icon: Scissors,
      role: ['SUPER_ADMIN', 'DOCTOR', 'SURGEON', 'NURSE'],
      steps: [
        {
          title: 'Scheduling Surgical Procedures',
          description: 'In "OT Management", register a new surgical session. Set the Patient MRN, Surgery Category (Orthopedic, Cardiac, General, etc.), OT Room Index, surgeon in charge, assistant nurses, and raw scheduler timestamps.',
        },
        {
          title: 'Tracking Live Surgery Stages',
          description: 'As the clinical operation runs, update the status: Scheduled ➔ In Progress ➔ Completed ➔ Under Inspection. This updates dashboard grids in real-time so administrative ward personnel remain in sync.',
          tips: ['Consumables used during surgery can be integrated into the final billing ledger from the logs.', 'Post-op diagnostics are flagged directly for immediate recovery checkups.']
        }
      ]
    },
    {
      id: 'pharmacy-pos',
      title: 'Pharmacy Inventory & Loose Tablet Sales Mode',
      subtitle: 'Complete stock control, strip vs. single tablet configurations, and custom loose medicine manual POS billing.',
      icon: Pill,
      role: ['SUPER_ADMIN', 'PHARMACIST', 'DOCTOR'],
      steps: [
        {
          title: 'Defining Strip and Single-tablet Loose Configurations',
          description: 'Go to the "Pharmacy" tab. In the "Inventory" view, add or edit any medicine. Ensure you enter the primary "Strips Stock" count and specify "Units Per Strip" (e.g., 10 tablets in one strip).',
        },
        {
          title: 'Activating "Enable Loose Sale" Mode',
          description: 'To sell individual/loose units (such as 3 separate tablets instead of a full strip of 10), toggle the "Enable Loose Sale" checkbox when creating or editing a medicine. Provide a Custom Unit Price for loose selling. If left empty, the POS automatically calculates a proportional loose tablet price based on the full strip selling price.',
          tips: ['Formula: Proportional Single tablet price = Strip Price / Units per Strip.', 'Loose Stock: You can initialize the loose stock count separately. Real POS sales of strips will automatically deplete strips, whereas selling loose tablets depletes the loose stock, seamlessly converting standard strips into loose tablets whenever loose inventory drops below zero.']
        },
        {
          title: 'Adding Pharmacy Items in the POS Billing Cart',
          description: 'Open "Pharmacy POS" (accessible from the quick buttons in Dashboard or Pharmacy tabs). You can browse all inventory, filter items specifically by active "Loose Sale Available" tags, or use the comprehensive top search bar (which also matches compositions and batch numbers). Click "Add to Cart / Setup Billing" to choose whether to sell full Strips or Loose Tablets. The POS dynamically structures billing prices based on your unit choices.',
        },
        {
          title: 'Sell Loose / Custom Medicine (Manual Entry Block)',
          description: 'When patients require loose medicine that is not pre-registered in the standard inventory databases, click the "Sell Loose / Custom Menu" button in the Pharmacy POS sidebar. You can: (a) Perform quick-search autocomplete queries over existing inventory—even those not initially configured for loose selling—to automatically load proportional loose prices, or (b) Fill out a manual custom form by writing a Custom Name, choosing a Unit Type (Tablet(s), Syrup, Injection, Vials), choosing tax rates (0%, 5%, 12%, 18%), entering custom unit price, and adding manual counts directly to the billing cart. This ensures total flexibility for generic tablet distributions.',
          tips: ['Custom loose items added manually can have their quantities updated or deleted directly in the cart without clashing with structured databases.', 'Cart invoices automatically handle separate CGST/SGST breakdowns for both custom loose and standard products.']
        }
      ],
      importantNote: 'Always maintain correct "Units per Strip" values to avoid mathematical rounding discrepancies during automatic strip-to-tablet item breakdowns.'
    },
    {
      id: 'billing-insurance',
      title: 'Billing & TPA Insurance Management',
      subtitle: 'Invoice creation, discharge billing, and TPA pre-authorization details.',
      icon: CreditCard,
      role: ['SUPER_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'RECEPTION', 'FRONT_DESK'],
      steps: [
        {
          title: 'Invoice Consolidation & Generation',
          description: 'Navigate to "Billing & Accounts". The invoicing section consolidates all costs registered across OPD Consultations, IPD residential bed fees, Pharmacy purchases, and Lab tests automatically under the patient MRN history profile.',
        },
        {
          title: 'Handling Third-Party Administrator (TPA) & Insurance Claims',
          description: 'Navigate to the "Insurance & TPA" panel. Easily create and audit active patient claims: Link patient records, specify Insurance Providers (e.g., Star Health, Care, ICICI Lombard), declare Policy Numbers, log Approved Pre-Authorization Limits, declare Co-pay percentages, and upload medical validation sheets.',
          tips: ['Pre-auth limits are compared automatically against real-time billing totals.', 'Co-pay values determine the exact pocket costs splits for patients during checkout clearance.']
        },
        {
          title: 'Discharge Clearance & Printing Professional Receipts',
          description: 'Ensure all bills are cleared before a patient can be checked out of IPD. Invoices can be set to Paid, Unpaid, or Partially Paid. Clear, printable receipt templates with individual tax calculations (CGST/SGST) are immediately accessible by clicking "View Receipt / Print".',
        }
      ]
    },
    {
      id: 'lab-radiology',
      title: 'Lab & Radiology Diagnostics Workspace',
      subtitle: 'Diagnostic orders, test codes, results recording, and digital attachments.',
      icon: FlaskConical,
      role: ['SUPER_ADMIN', 'LAB_STAFF', 'DOCTOR'],
      steps: [
        {
          title: 'Tracking Active Diagnostic Orders',
          description: 'Under "Lab & Radiology", technicians can view active pending requests submitted by consult doctors. Tests are categorized as Pathology Labs (Blood, Lipid Profile, Urine) or Radiology (X-Ray, Ultrasound, CT Scan, MRI).',
        },
        {
          title: 'Logging Sample Collection & Tests Progress',
          description: 'Mark order status from ' + '`Pending` ➔ `Sample Collected` ➔ `In Lab` ➔ `Completed`. Register collection timestamps to preserve precise clinical audits.',
        },
        {
          title: 'Uploading Secure Diagnostic Reports',
          description: 'Click "Update Results" on any diagnostic. Type numerical values against active reference ranges (e.g. Hemoglobin levels), write overall medical interpretations, and attach clean host links of digital scans or PDFs.',
          tips: ['Completed reports are instantly visible inside the Patients 360 unified timeline.', 'Doctors can fetch and read raw scans immediately during follow-up consults.']
        }
      ]
    }
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.success('User manual guidelines configured! Use Ctrl+P or Cmd+P to export as highly polished PDF.');
  };

  // Filter sections dynamically so that ONLY parts of manual relevant to the user are shown!
  const accessibleSections = manualSections.filter(section => {
    if (!currentUser) return true; // fallback for safety
    return hasRoleAccess(userRole, section.role);
  });

  const filteredSections = accessibleSections.filter(section => {
    const matchesSearch = section.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          section.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          section.steps.some(step => 
                            step.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            step.description.toLowerCase().includes(searchQuery.toLowerCase())
                          );
    
    if (activeManualTab === 'all') {
      return matchesSearch;
    }
    return matchesSearch && section.role.some(r => r.toUpperCase().replace('-', '_') === activeManualTab.toUpperCase().replace('-', '_'));
  });

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'HOSPITAL_ADMIN';

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 print:p-0 print:bg-white print:max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-3xl border shadow-sm print:shadow-none print:border-none print:bg-none print:p-0" style={{ background: 'linear-gradient(135deg, #D6C5F0, #F3EDFC, #D6C5F0)', borderColor: '#c3b1e3' }}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#3D275A] text-white text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase">Helpdesk</span>
            <span className="flex items-center gap-1 text-[11px] font-black text-[#5D487C] uppercase bg-white/70 px-3 py-0.5 rounded-full border border-[#c3b1e3]/30">
              <Sparkles className="w-3 h-3 animate-pulse" /> Updated for POS & Prefilling
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#3D275A] tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#3D275A]" />
            Gastro Plus Hospital User Manual
          </h1>
          <p className="text-[#5D487C] text-xs font-semibold mt-1">
            Complete interactive workflows, module rules, and live reference guidelines for admin, doctors, nurses, and pharmacists.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 rounded-xl font-bold cursor-pointer transition-all bg-white/80 border-[#3D275A]/25 text-[#3D275A] hover:bg-white">
            <Printer className="w-4 h-4 mr-1.5" />
            Print Guide
          </Button>
          <Button onClick={handleDownload} size="sm" className="h-9 bg-[#1A5E63] hover:bg-[#154c50] rounded-xl font-bold cursor-pointer shadow-sm transition-all text-white">
            <Download className="w-4 h-4 mr-1.5" />
            Get PDF Manual
          </Button>
        </div>
      </div>

      {/* Main Grid: Control / Tabs Bar */}
      <div className="space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Wrapper */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search guide categories, rules, manual inputs, medicine calculations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-slate-200 focus:ring-medical-blue/20 placeholder:text-slate-400 font-medium"
            />
          </div>
          
          {/* Dynamic Safe Access control indicator */}
          {currentUser ? (
            isAdmin ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 flex-shrink-0 animate-pulse">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] text-blue-700 font-bold uppercase tracking-wider">🔒 Full Admin Mode</p>
                  <p className="text-xs font-bold text-slate-700 leading-tight">All department guides are fully visible.</p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                  <Users className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">🔒 Role Isolated ({userRole})</p>
                  <p className="text-xs font-bold text-slate-700 leading-tight">Showing only guides relevant to you ({userName}).</p>
                </div>
              </div>
            )
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Guest Mode</p>
                <p className="text-xs font-bold text-slate-700 leading-tight">Browsing with generic view options.</p>
              </div>
            </div>
          )}
        </div>

        {/* Roles Navigation Filter Tabs (Filtered dynamically based on access) */}
        <div>
          <Tabs defaultValue="all" value={activeManualTab} className="w-full" onValueChange={setActiveManualTab}>
            <TabsList className="bg-slate-100 p-1 rounded-xl flex flex-wrap gap-1 h-auto overflow-x-auto w-full max-w-full">
              <TabsTrigger value="all" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-800 transition-all cursor-pointer">
                🌟 All Guidelines
              </TabsTrigger>
              
              {(isAdmin || hasRoleAccess(userRole, ['SUPER_ADMIN'])) && (
                <TabsTrigger value="super-admin" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-800 transition-all cursor-pointer">
                  ⚙️ Administrators
                </TabsTrigger>
              )}
              
              {(isAdmin || hasRoleAccess(userRole, ['DOCTOR'])) && (
                <TabsTrigger value="doctor" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-800 transition-all cursor-pointer">
                  🩺 Doctors (OPD/OT)
                </TabsTrigger>
              )}
              
              {(isAdmin || hasRoleAccess(userRole, ['NURSE'])) && (
                <TabsTrigger value="nurse" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-800 transition-all cursor-pointer">
                  🛌 Nurses (IPD)
                </TabsTrigger>
              )}
              
              {(isAdmin || hasRoleAccess(userRole, ['PHARMACIST'])) && (
                <TabsTrigger value="pharmacist" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-800 transition-all cursor-pointer font-black text-amber-750">
                  💊 Pharmacists
                </TabsTrigger>
              )}
              
              {(isAdmin || hasRoleAccess(userRole, ['ACCOUNTANT'])) && (
                <TabsTrigger value="accountant" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-800 transition-all cursor-pointer">
                  💳 Accountants
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Manual Content Sections */}
      <div className="space-y-6">
        {filteredSections.length > 0 ? (
          filteredSections.map((section) => {
            const IconComponent = section.icon;
            const isOpen = !!expandedSections[section.id];
            
            return (
              <Card 
                key={section.id} 
                className={`border border-slate-100 shadow-sm overflow-hidden transition-all duration-200 rounded-3xl ${
                  isOpen ? 'ring-1 ring-medical-blue/10 bg-white' : 'bg-slate-50/50 hover:bg-slate-50'
                } print:border-none print:shadow-none print:bg-white print:ring-0`}
              >
                {/* Accordion Trigger Header */}
                <div 
                  onClick={() => toggleSection(section.id)}
                  className="p-6 flex items-center justify-between cursor-pointer select-none print:cursor-default print:pointer-events-none"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                      isOpen ? 'bg-medical-blue/10 text-medical-blue' : 'bg-slate-200/60 text-slate-600'
                    } print:bg-slate-50 print:text-black`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 leading-tight flex items-center gap-2">
                        {section.title}
                        <span className="hidden sm:inline-flex text-[9px] uppercase font-bold tracking-tight px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          {section.id.replace('-', ' ')}
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 font-bold">{section.subtitle}</p>
                    </div>
                  </div>
                  <div className="print:hidden text-slate-400">
                    {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </div>

                {/* Extended Details Content */}
                {isOpen && (
                  <CardContent className="px-6 pb-6 pt-0 space-y-6 border-t border-slate-100/60">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                      {section.steps.map((step, idx) => (
                        <div key={idx} className="space-y-2 p-5 bg-slate-50/60 rounded-2xl border border-slate-150/40 relative">
                          <span className="absolute right-4 top-4 text-xs font-black text-slate-300">0{idx + 1}</span>
                          <h4 className="text-xs font-black text-slate-700 uppercase tracking-tight flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            {step.title}
                          </h4>
                          <p className="text-xs text-secondary-text leading-relaxed font-semibold">
                            {step.description}
                          </p>
                          {step.tips && step.tips.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-dashed border-slate-200/50 space-y-1">
                              {step.tips.map((tip, tIdx) => (
                                <p key={tIdx} className="text-[10px] text-slate-500 font-semibold flex items-start gap-1">
                                  <span className="text-amber-500 mt-0.5">•</span>
                                  {tip}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Highly Targeted Important Notes Banner */}
                    {section.importantNote && (
                      <div className="bg-amber-50/75 border border-amber-200/75 rounded-2xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] uppercase font-black text-amber-800 tracking-wider">Critical System Rule</p>
                          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed font-semibold">
                            {section.importantNote}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8">
            <HelpCircle className="w-12 h-12 mx-auto text-slate-300 mb-3 animate-bounce" />
            <h3 className="text-sm font-black text-slate-700 uppercase">No matching guides found</h3>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Try typing general key terms like "loose", "POS", "invoice", "prescription" or "bed".
            </p>
          </div>
        )}
      </div>

      {/* Emergency Quick Action Cards / FAQ */}
      <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest pt-4 print:hidden">Frequently Asked Questions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <Card className="border border-slate-100 bg-slate-50/40 rounded-2xl">
          <CardHeader className="p-4 flex flex-row items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-800">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-black text-slate-800 uppercase">Loose tablet vs Strip stock calculation</CardTitle>
              <CardDescription className="text-[10px] font-semibold">How does stock update?</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-xs text-secondary-text leading-relaxed font-semibold">
              When a loose unit is sold at the POS, it deprives 1 single unit from `loose_stock`. If `loose_stock` hits zero or goes negative, the system automatically subtracts **1 Full Strip** from `stock` and adds **Units Per Strip** (e.g. 10) back into `loose_stock` to maintain accurate billing and avoid mathematical rounding errors.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 bg-slate-50/40 rounded-2xl">
          <CardHeader className="p-4 flex flex-row items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-800">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-black text-slate-800 uppercase">Pre-Authorization and Claim Settlements</CardTitle>
              <CardDescription className="text-[10px] font-semibold">What is the claim lifecycle?</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-xs text-secondary-text leading-relaxed font-semibold">
              Under TPA, a claim is first logged as `Pending`. Once approved, the Approved Amount is locked and compared against Total Accrued Invoice amounts. Patient Co-pay indicates what fraction must be collected physically in cash or card before marking the clearance summary as completed.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Print Footer Notice */}
      <div className="hidden print:block text-center mt-12 text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-4">
        <p>© {new Date().getFullYear()} GASTRO PLUS HOSPITAL. All rights reserved.</p>
        <p className="mt-1">Generated electronically from the hospital dashboard system for helpdesk reference.</p>
      </div>
    </div>
  );
}
