import { useState } from 'react';
import { 
  Activity, 
  FileText, 
  ClipboardList, 
  FlaskConical, 
  Printer, 
  AlertCircle, 
  Clock, 
  BadgeAlert, 
  HeartHandshake,
  Eye,
  X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { toast } from 'sonner';

interface OPDPatientHistoryProps {
  patient: any;
  vitals: any[];
  notes: any[];
  prescriptions: any[];
  labRequests: any[];
  loading?: boolean;
  onPrintPrescription?: (prescription: any) => void;
}

export default function OPDPatientHistory({
  patient,
  vitals = [],
  notes = [],
  prescriptions = [],
  labRequests = [],
  loading = false,
  onPrintPrescription
}: OPDPatientHistoryProps) {
  const [activeHistoryTab, setActiveHistoryTab] = useState<'rx' | 'vitals' | 'notes' | 'labs'>('rx');
  const [activeZoomUrl, setActiveZoomUrl] = useState<string | null>(null);

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-slate-400 text-center">
        <HeartHandshake className="w-10 h-10 mb-2 opacity-30 text-slate-500 animate-pulse" />
        <p className="text-sm font-medium">No Patient Selected</p>
        <p className="text-xs">Select a patient from the queue or records to load their clinical history.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-3">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-amber-600 font-bold animate-pulse">Loading clinical history records...</p>
      </div>
    );
  }

  // Filter clinical data by patientId
  const patientPrescriptions = prescriptions.filter(rx => rx.patientId === patient.id || rx.patient_id === patient.id);
  const patientVitals = vitals.filter(v => v.patientId === patient.id || v.patient_id === patient.id);
  const patientNotes = notes.filter(n => n.patientId === patient.id || n.patient_id === patient.id);
  const patientLabs = labRequests.filter(l => l.patientId === patient.id || l.patient_id === patient.id);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Emergency': return 'bg-rose-500 text-white';
      case 'Urgent': return 'bg-amber-500 text-white';
      case 'Routine': return 'bg-emerald-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-1.5 rounded-xl border border-slate-100 max-h-[600px] overflow-hidden">
      {/* Header Profile Summary */}
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-xs mb-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0 uppercase border border-amber-100">
          {patient.name?.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-800 truncate">{patient.name}</h4>
            <Badge className="bg-slate-100 text-slate-700 border-none font-bold text-[8px] py-0 px-1.5 h-4 uppercase shrink-0">
              {patient.mrn}
            </Badge>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate uppercase font-medium">
            {patient.age ? `${patient.age}Y` : 'Age N/A'} • {patient.gender} • Blood: {patient.bloodGroup || patient.blood_group || 'N/A'}
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <Tabs value={activeHistoryTab} onValueChange={(val: any) => setActiveHistoryTab(val)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-4 bg-slate-100/80 p-0.5 rounded-lg h-9 shrink-0">
          <TabsTrigger value="rx" className="text-[10px] py-1 font-bold gap-1 rounded-md">
            <FileText className="w-3 h-3 text-emerald-600" />
            Rx ({patientPrescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="vitals" className="text-[10px] py-1 font-bold gap-1 rounded-md">
            <Activity className="w-3 h-3 text-rose-500" />
            Vitals ({patientVitals.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-[10px] py-1 font-bold gap-1 rounded-md">
            <ClipboardList className="w-3 h-3 text-blue-500" />
            Notes ({patientNotes.length})
          </TabsTrigger>
          <TabsTrigger value="labs" className="text-[10px] py-1 font-bold gap-1 rounded-md">
            <FlaskConical className="w-3 h-3 text-purple-500" />
            Lab ({patientLabs.length})
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 mt-3">
          {/* PRESCRIPTIONS TAB CONTAINER */}
          <TabsContent value="rx" className="h-full m-0">
            <ScrollArea className="h-full pr-1">
              <div className="space-y-2.5 pb-4">
                {patientPrescriptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <FileText className="w-8 h-8 opacity-20 mb-1.5 text-slate-500" />
                    <p className="text-[11px] font-bold">No Previous Prescriptions</p>
                    <p className="text-[10px]">No medical checkout prescriptions found.</p>
                  </div>
                ) : (
                  patientPrescriptions.map((rx, index) => (
                    <Card key={rx.id || index} className="border-slate-100 shadow-xs bg-white rounded-xl overflow-hidden">
                      <div className="p-3 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                            {rx.date ? new Date(rx.date).toLocaleDateString() : 'N/A'}
                          </p>
                          <p className="text-[11px] font-black text-slate-800 truncate">
                            {rx.doctor || rx.doctor_name || 'Dr. Rajesh Sharma'}
                          </p>
                        </div>
                        {onPrintPrescription && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-medical-blue hover:bg-slate-100 rounded-md shrink-0"
                            onClick={() => onPrintPrescription(rx)}
                            title="Print Prescription Recall"
                          >
                            <Printer className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <CardContent className="p-3">
                        {rx.diagnosis && (
                          <div className="mb-2">
                            <span className="text-[9px] uppercase font-bold text-teal-600 block bg-teal-50/80 px-1.5 py-0.5 rounded w-fit my-0.5">Diagnosis</span>
                            <p className="text-[11px] font-bold text-slate-700">{rx.diagnosis}</p>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {Array.isArray(rx.medicines) && rx.medicines.map((m: any, i: number) => (
                            <div key={i} className="flex justify-between items-start gap-2 text-[11px] border-b border-dashed border-slate-100 pb-1 last:border-0 last:pb-0">
                              <div>
                                <span className="font-bold text-slate-800">{m.name}</span>
                                {m.dosage && <span className="text-slate-500 ml-1">({m.dosage})</span>}
                              </div>
                              <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono shrink-0">
                                {m.frequency} {m.duration ? `• ${m.duration}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                        {rx.advice && (
                          <div className="mt-2.5 pt-2 border-t border-slate-50">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">General Advice</span>
                            <p className="text-[10px] text-slate-600 italic leading-relaxed">{rx.advice}</p>
                          </div>
                        )}
                        {(rx.attachment_url || rx.attachmentUrl) && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="text-[10px] text-slate-500 truncate font-mono">
                                {rx.attachment_name || rx.attachmentName || 'prescription.pdf'}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 text-rose-600 border-rose-100 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                              onClick={() => {
                                const url = rx.attachment_url || rx.attachmentUrl;
                                if (url.startsWith('data:application/pdf;base64,')) {
                                  const win = window.open();
                                  if (win) {
                                    win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  } else {
                                    toast.error('Failed to open PDF, please allow popups');
                                  }
                                } else {
                                  window.open(url, '_blank');
                                }
                              }}
                            >
                              Open PDF
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* VITALS TAB CONTAINER */}
          <TabsContent value="vitals" className="h-full m-0">
            <ScrollArea className="h-full pr-1">
              <div className="space-y-3 pb-4">
                {patientVitals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Activity className="w-8 h-8 opacity-20 mb-1.5 text-rose-500" />
                    <p className="text-[11px] font-bold">No Past Vitals Registered</p>
                    <p className="text-[10px]">No vitals metrics logged for this patient ID.</p>
                  </div>
                ) : (
                  patientVitals.map((v, index) => (
                    <Card key={v.id || index} className="border-slate-100 shadow-xs bg-white rounded-xl overflow-hidden">
                      <div className="p-2.5 border-b border-slate-50 bg-rose-50/25 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-rose-700 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" />
                          Vitals Record
                        </span>
                        <span className="text-[9px] font-black text-slate-400">
                          {v.lastUpdated ? new Date(v.lastUpdated).toLocaleString() : 'Recent'}
                        </span>
                      </div>
                      <CardContent className="p-3">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-slate-50 p-2 rounded-lg">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">BP</p>
                            <p className="text-xs font-black text-slate-800 mt-0.5">{v.bp || '120/80'}</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Pulse</p>
                            <p className="text-xs font-black text-slate-800 mt-0.5">{v.pulse ? `${v.pulse} bpm` : '78 bpm'}</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Temp</p>
                            <p className="text-xs font-black text-slate-800 mt-0.5">{v.temp || v.temperature ? `${v.temp || v.temperature}°F` : '98.6°F'}</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">SpO2</p>
                            <p className="text-xs font-black text-slate-800 mt-0.5">{v.spo2 ? `${v.spo2}%` : '98%'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* CLINICAL NOTES TAB CONTAINER */}
          <TabsContent value="notes" className="h-full m-0">
            <ScrollArea className="h-full pr-1">
              <div className="space-y-2.5 pb-4">
                {patientNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <ClipboardList className="w-8 h-8 opacity-20 mb-1.5 text-blue-500" />
                    <p className="text-[11px] font-bold">No Clinical Notes Logged</p>
                    <p className="text-[10px]">No medical progress or clinical nursing notes.</p>
                  </div>
                ) : (
                  patientNotes.map((n, index) => (
                    <Card key={n.id || index} className="border-slate-100 shadow-xs bg-white rounded-xl overflow-hidden">
                      <div className="p-2.5 border-b border-slate-50 bg-blue-50/20 flex items-center justify-between">
                        <Badge className={`text-[8px] py-0 h-4 border-none font-bold uppercase ${n.note_type === 'NURSE' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                          {n.note_type || 'DOCTOR'} NOTE
                        </Badge>
                        <span className="text-[8.5px] font-bold text-slate-400">
                          {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <CardContent className="p-3">
                        <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                          {n.content}
                        </p>
                        {n.author_name && (
                          <p className="text-[9px] text-slate-400 mt-2 text-right font-bold uppercase tracking-wider">
                            By: {n.author_name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* LAB & RADIOLOGY TAB CONTAINER */}
          <TabsContent value="labs" className="h-full m-0">
            <ScrollArea className="h-full pr-1">
              <div className="space-y-2.5 pb-4">
                {patientLabs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <FlaskConical className="w-8 h-8 opacity-20 mb-1.5 text-purple-500" />
                    <p className="text-[11px] font-bold">No Lab Reports Found</p>
                    <p className="text-[10px]">No laboratory or radiology orders placed.</p>
                  </div>
                ) : (
                  patientLabs.map((lab, index) => (
                    <Card key={lab.id || index} className="border-slate-100 shadow-xs bg-white rounded-xl overflow-hidden">
                      <div className="p-2.5 border-b border-slate-50 bg-purple-50/25 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-700 flex items-center gap-1.5">
                          <FlaskConical className="w-3.5 h-3.5" />
                          Diagnostics
                        </span>
                        <Badge className={`text-[8px] py-0 h-4 uppercase font-black border-none select-none ${
                          lab.status === 'Completed' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {lab.status || 'Requested'}
                        </Badge>
                      </div>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-[11px] font-black text-slate-700">{lab.test_name || lab.test || 'Pathology Test'}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Category: {lab.category || 'Pathology'}</p>
                          </div>
                          {lab.requested_at && (
                            <span className="text-[8.5px] font-semibold text-slate-400">
                              {new Date(lab.requested_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {lab.status === 'Completed' ? (
                          <div className="space-y-2">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <p className="text-[9px] uppercase font-bold text-indigo-600">Reef Values / Result</p>
                              <p className="text-[11px] font-black text-slate-800 mt-0.5">
                                {lab.result_value || lab.result || 'Normal'} {lab.unit || ''}
                              </p>
                              {lab.reference_range && (
                                <p className="text-[8.5px] text-slate-500 mt-0.5">
                                  Normal Range: {lab.reference_range}
                                </p>
                              )}
                            </div>
                            
                            {lab.findings && (
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[10px]">
                                <span className="font-bold text-indigo-600 block mb-0.5">Report Findings:</span>
                                <p className="whitespace-pre-line text-slate-700 leading-tight">{lab.findings}</p>
                              </div>
                            )}

                            {(() => {
                              const linkedScans = storage.get<{id: string, orderId: string, url: string, type: string}[]>(STORAGE_KEYS.RADIOLOGY_FILES, [])
                                .filter(f => f.orderId === lab.id);
                              if (linkedScans.length > 0) {
                                return (
                                  <div className="p-2 bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                                    <p className="text-[8.5px] font-black uppercase text-indigo-400 mb-1 flex items-center gap-1 font-mono">
                                      <Activity className="w-2.5 h-2.5 text-indigo-400 animate-pulse" />
                                      RIS PACS Imaging Scans
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {linkedScans.map(scan => (
                                        <div key={scan.id} className="relative group/scan rounded overflow-hidden bg-black/40 border border-white/5 flex flex-col items-center">
                                          <img 
                                            src={scan.url} 
                                            alt={lab.test_name || "Diagnostic Scan"} 
                                            className="h-12 w-16 object-cover cursor-pointer hover:scale-110 transition-transform duration-300"
                                            referrerPolicy="no-referrer"
                                            onClick={() => setActiveZoomUrl(scan.url)}
                                          />
                                          <div className="p-0.5 text-[7px] font-mono text-slate-400 bg-slate-950 text-center truncate w-16">
                                            {scan.type?.includes('/') ? scan.type.split('/')[1].toUpperCase() : (scan.type || 'SCAN')}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <p className="text-[10px] text-amber-600 italic bg-amber-50/50 p-1.5 rounded text-center font-medium">
                            🔬 Diagnostics request processing...
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>

      {activeZoomUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200" onClick={() => setActiveZoomUrl(null)}>
          <div className="relative max-w-3xl max-h-[85vh] w-full flex items-center justify-center bg-slate-950 rounded-2xl p-2 border border-slate-800" onClick={e => e.stopPropagation()}>
            <Button 
              variant="secondary" 
              size="icon" 
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-xl border border-slate-800 hover:bg-slate-900 bg-slate-950 text-white"
              onClick={() => setActiveZoomUrl(null)}
            >
              <X className="w-4 h-4" />
            </Button>
            <img 
              src={activeZoomUrl} 
              alt="Scan Zoom View" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl select-none"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
