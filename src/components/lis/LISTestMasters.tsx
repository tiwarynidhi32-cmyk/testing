import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Settings, 
  ShieldCheck, 
  Edit, 
  Layers, 
  Database,
  Grid,
  TrendingUp,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { storage, STORAGE_KEYS } from '@/lib/storage';

import { 
  TestCategory, 
  TestSubCategory, 
  InvestigationTest, 
  Parameter, 
  LabUnit 
} from './listTypes';

import { 
  MOCK_CATEGORIES, 
  MOCK_SUBCATEGORIES, 
  MOCK_INVESTIGATIONS, 
  MOCK_PARAMETERS, 
  MOCK_UNITS 
} from './lisMockData';

export default function LISTestMasters({ readOnly }: { readOnly?: boolean }) {
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
      toast.error('Access Denied: Only assigned Radiologists, Pathologists, or Admin can configure laboratory resources.');
      return false;
    }
    return true;
  };

  const [categories, setCategories] = useState<TestCategory[]>(() => storage.get('lis_categories', MOCK_CATEGORIES));
  const [subCategories, setSubCategories] = useState<TestSubCategory[]>(() => storage.get('lis_subcategories', MOCK_SUBCATEGORIES));
  const [investigations, setInvestigations] = useState<InvestigationTest[]>(() => storage.get('lis_investigations', MOCK_INVESTIGATIONS));
  const [parameters, setParameters] = useState<Parameter[]>(() => storage.get('lis_parameters', MOCK_PARAMETERS));
  const [units] = useState<LabUnit[]>(MOCK_UNITS);

  // Search States
  const [catSearch, setCatSearch] = useState('');
  const [subSearch, setSubSearch] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [paramSearch, setParamSearch] = useState('');

  // Dialog & Form States - New Test Category
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [newCat, setNewCat] = useState<Partial<TestCategory>>({ name: '', description: '', status: 'Active' });

  // Dialog & Form States - New SubCategory
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  const [newSub, setNewSub] = useState<Partial<TestSubCategory>>({ categoryId: '', name: '', description: '', status: 'Active' });

  // Dialog & Form States - New Investigation
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [newTest, setNewTest] = useState<Partial<InvestigationTest>>({
    code: '', name: '', shortName: '', department: 'Pathology',
    categoryId: '', subCategoryId: '', sampleType: 'Whole Blood',
    method: 'Automated Analyzer', machineName: 'General Analyzer',
    reportType: 'Quantitative', tat: '4 Hours', normalRangeApplicable: true,
    criticalValueApplicable: true, nablCompliance: true, activeStatus: 'Active', price: 200
  });

  // Dialog & Form States - New Parameter
  const [isParamDialogOpen, setIsParamDialogOpen] = useState(false);
  const [newParam, setNewParam] = useState<Partial<Parameter>>({
    testCode: '', name: '', unit: 'g/dL', decimalPlaces: 1, sequenceNumber: 10, formulaBased: false, formula: ''
  });

  // Add Respective Handlers
  const handleAddCategory = () => {
    if (!checkPermission()) return;
    if (!newCat.name) {
      toast.error('Please enter a category name');
      return;
    }
    const cat: TestCategory = {
      id: `CAT-${newCat.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      name: newCat.name,
      description: newCat.description || '',
      status: 'Active'
    };
    const updated = [...categories, cat];
    setCategories(updated);
    storage.set('lis_categories', updated);
    setIsCatDialogOpen(false);
    setNewCat({ name: '', description: '', status: 'Active' });
    toast.success('Pathology Master Category registered!');
  };

  const handleAddSubCategory = () => {
    if (!checkPermission()) return;
    if (!newSub.name || !newSub.categoryId) {
      toast.error('Please complete both Category mapping and Sub-Category Name');
      return;
    }
    const sub: TestSubCategory = {
      id: `SUB-${newSub.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      categoryId: newSub.categoryId,
      name: newSub.name,
      description: newSub.description || '',
      status: 'Active'
    };
    const updated = [...subCategories, sub];
    setSubCategories(updated);
    storage.set('lis_subcategories', updated);
    setIsSubDialogOpen(false);
    setNewSub({ categoryId: '', name: '', description: '', status: 'Active' });
    toast.success('Pathology Master Sub-Category configured!');
  };

  const handleAddTest = () => {
    if (!checkPermission()) return;
    if (!newTest.code || !newTest.name || !newTest.categoryId || !newTest.subCategoryId) {
      toast.error('Please fill in Test Code, Name, Category, and Sub-Category');
      return;
    }
    const testToAdd: InvestigationTest = {
      code: newTest.code.toUpperCase(),
      name: newTest.name,
      shortName: newTest.shortName || newTest.name,
      department: newTest.department || 'Pathology',
      categoryId: newTest.categoryId,
      subCategoryId: newTest.subCategoryId,
      sampleType: newTest.sampleType || 'SST Serum',
      method: newTest.method || 'Automated Spectrometry',
      machineName: newTest.machineName || 'Modular line',
      reportType: newTest.reportType as 'Quantitative',
      tat: newTest.tat || '6 Hours',
      normalRangeApplicable: !!newTest.normalRangeApplicable,
      criticalValueApplicable: !!newTest.criticalValueApplicable,
      nablCompliance: !!newTest.nablCompliance,
      activeStatus: 'Active',
      price: Number(newTest.price) || 200
    };
    const updated = [...investigations, testToAdd];
    setInvestigations(updated);
    storage.set('lis_investigations', updated);
    setIsTestDialogOpen(false);
    setNewTest({
      code: '', name: '', shortName: '', department: 'Pathology',
      categoryId: '', subCategoryId: '', sampleType: 'Whole Blood',
      method: 'Automated Analyzer', machineName: 'General Analyzer',
      reportType: 'Quantitative', tat: '4 Hours', normalRangeApplicable: true,
      criticalValueApplicable: true, nablCompliance: true, activeStatus: 'Active', price: 200
    });
    toast.success('New Investigation Master registered!');
  };

  const handleAddParam = () => {
    if (!checkPermission()) return;
    if (!newParam.testCode || !newParam.name) {
      toast.error('Investigation Test code and Parameter Name are required');
      return;
    }
    const param: Parameter = {
      id: `P-${newParam.name.replace(/\s+/g, '').substring(0, 5).toUpperCase()}-${Date.now().toString().slice(-3)}`,
      testCode: newParam.testCode,
      name: newParam.name,
      unit: newParam.unit || 'g/dL',
      decimalPlaces: Number(newParam.decimalPlaces) || 0,
      sequenceNumber: Number(newParam.sequenceNumber) || 10,
      formulaBased: !!newParam.formulaBased,
      formula: newParam.formula || ''
    };
    const updated = [...parameters, param];
    setParameters(updated);
    storage.set('lis_parameters', updated);
    setIsParamDialogOpen(false);
    setNewParam({
      testCode: '', name: '', unit: 'g/dL', decimalPlaces: 1, sequenceNumber: 10, formulaBased: false, formula: ''
    });
    toast.success('Parameter linked under the Investigation!');
  };

  return (
    <div className="space-y-6">
      <div className="border bg-slate-50 border-slate-200/60 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            LIMS Master Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maintain strict pathology templates, categorize parameters, reference standard analyzer machines and NABL quality configurations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> NABL Compliant Template
          </Badge>
          <Badge variant="outline" className="text-slate-500 bg-white">
            Total Tests: {investigations.length}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="tests" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-4 grid grid-cols-2 md:grid-cols-4 max-w-2xl gap-1">
          <TabsTrigger value="tests" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Grid className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Test Directory
          </TabsTrigger>
          <TabsTrigger value="params" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Layers className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Parameters Setup
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Tag className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Category Master
          </TabsTrigger>
          <TabsTrigger value="subcategories" className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Sub-Category
          </TabsTrigger>
        </TabsList>

        {/* 1. TEST DIRECTORY TAB */}
        <TabsContent value="tests">
          <Card className="border-none shadow-sm shadow-slate-100 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-md font-bold">Investigation & Diagnostic Tests</CardTitle>
                <CardDescription className="text-xs">Search and register standard laboratory profiles with specific techniques and analyzers.</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search test or code..." 
                    className="pl-9 h-9 border-slate-200 text-xs rounded-lg"
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                  />
                </div>
                <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-lg gap-1 shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Add Test
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[550px] rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Investigation Master Test</DialogTitle>
                      <DialogDescription>Define diagnostic test with dedicated parameters, machines, and TAT configurations.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4 te">
                      <div className="space-y-1">
                        <Label className="text-xs">Test Code (Unique) *</Label>
                        <Input placeholder="e.g. HEM01" value={newTest.code} onChange={e => setNewTest({...newTest, code: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Test Name *</Label>
                        <Input placeholder="e.g. Complete Blood Count" value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Short Name</Label>
                        <Input placeholder="e.g. CBC" value={newTest.shortName} onChange={e => setNewTest({...newTest, shortName: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Department</Label>
                        <Select value={newTest.department} onValueChange={v => setNewTest({...newTest, department: v})}>
                          <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pathology">Pathology</SelectItem>
                            <SelectItem value="Biochemistry">Biochemistry</SelectItem>
                            <SelectItem value="Microbiology">Microbiology</SelectItem>
                            <SelectItem value="Radiology">Radiology</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Category mapping *</Label>
                        <Select value={newTest.categoryId} onValueChange={v => setNewTest({...newTest, categoryId: v})}>
                          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select Category" /></SelectTrigger>
                          <SelectContent>
                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sub-Category mapping *</Label>
                        <Select value={newTest.subCategoryId} onValueChange={v => setNewTest({...newTest, subCategoryId: v})}>
                          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select Sub-Category" /></SelectTrigger>
                          <SelectContent>
                            {subCategories.filter(s => !newTest.categoryId || s.categoryId === newTest.categoryId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sample Specimen Type</Label>
                        <Input placeholder="e.g. Fluoride Plasma" value={newTest.sampleType} onChange={e => setNewTest({...newTest, sampleType: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Method of Estimation</Label>
                        <Input placeholder="e.g. GOD-POD Colorimetric" value={newTest.method} onChange={e => setNewTest({...newTest, method: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Analyzer Machine Name</Label>
                        <Input placeholder="e.g. Beckman Coulter AU480" value={newTest.machineName} onChange={e => setNewTest({...newTest, machineName: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Turnaround Time (TAT)</Label>
                        <Input placeholder="e.g. 4 Hours" value={newTest.tat} onChange={e => setNewTest({...newTest, tat: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">B2C Rate Price (₹) *</Label>
                        <Input type="number" placeholder="500" value={newTest.price} onChange={e => setNewTest({...newTest, price: Number(e.target.value)})} />
                      </div>
                      <div className="flex flex-col gap-2 pt-5">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="chkNabl" checked={newTest.nablCompliance} onChange={e => setNewTest({...newTest, nablCompliance: e.target.checked})} className="rounded text-indigo-600 focus:ring-slate-300" />
                          <Label htmlFor="chkNabl" className="text-xs font-semibold cursor-pointer">NABL Calibration Compliant</Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" className="text-xs font-semibold" onClick={() => setIsTestDialogOpen(false)}>Cancel</Button>
                      <Button className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold" onClick={handleAddTest}>Save to Database</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold">Code & Profile</TableHead>
                    <TableHead className="text-[11px] font-bold">Mapping</TableHead>
                    <TableHead className="text-[11px] font-bold">Sample & Method</TableHead>
                    <TableHead className="text-[11px] font-bold">Analyzer Machine</TableHead>
                    <TableHead className="text-[11px] font-bold">TAT</TableHead>
                    <TableHead className="text-[11px] font-bold">NABL</TableHead>
                    <TableHead className="text-right text-[11px] font-bold">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investigations.filter(t => 
                    t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
                    t.code.toLowerCase().includes(testSearch.toLowerCase()) ||
                    t.shortName.toLowerCase().includes(testSearch.toLowerCase())
                  ).map((test) => (
                    <TableRow key={test.code} className="hover:bg-slate-50/50 text-xs border-slate-100">
                      <TableCell className="py-2.5">
                        <p className="font-bold text-slate-800">{test.name}</p>
                        <span className="text-[10px] text-muted-foreground uppercase font-black">{test.code} ({test.shortName})</span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <p className="font-medium text-slate-700">{categories.find(c => c.id === test.categoryId)?.name || 'Misc'}</p>
                        <p className="text-[10px] text-muted-foreground">{subCategories.find(s => s.id === test.subCategoryId)?.name || 'General'}</p>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <p className="text-slate-700 font-medium">{test.sampleType}</p>
                        <p className="text-[10px] text-muted-foreground italic">{test.method}</p>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50/20 text-indigo-700 border-indigo-100/50">
                          {test.machineName}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 font-medium text-slate-600">{test.tat}</TableCell>
                      <TableCell className="py-2.5">
                        {test.nablCompliance ? (
                          <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 text-[9px] font-bold border-none">NABL Verified</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-600">Standard</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-bold text-slate-900">₹{test.price}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. PARAMETERS SETUP TAB */}
        <TabsContent value="params">
          <Card className="border-none shadow-sm shadow-slate-100 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-md font-bold">Investigation Parameter Mappings</CardTitle>
                <CardDescription className="text-xs">Define single or multiple sub-parameters under each test. Support structural sequence, decimals, and formulas.</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search parameter..." 
                    className="pl-9 h-9 border-slate-200 text-xs rounded-lg"
                    value={paramSearch}
                    onChange={(e) => setParamSearch(e.target.value)}
                  />
                </div>
                <Dialog open={isParamDialogOpen} onOpenChange={setIsParamDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-lg gap-1 shrink-0"
                      onClick={() => setIsParamDialogOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5" /> Map Parameter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[480px] rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Map Parameter to Investigation</DialogTitle>
                      <DialogDescription>Create a measurement component that loads when a lab order completes.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Linked Investigation Test *</Label>
                        <Select value={newParam.testCode} onValueChange={v => setNewParam({...newParam, testCode: v})}>
                          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select Parent Test" /></SelectTrigger>
                          <SelectContent>
                            {investigations.map(i => <SelectItem key={i.code} value={i.code}>{i.name} ({i.code})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Parameter Name *</Label>
                          <Input placeholder="e.g. Hemoglobin" value={newParam.name} onChange={e => setNewParam({...newParam, name: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Measurement Standard Unit</Label>
                          <Select value={newParam.unit} onValueChange={v => setNewParam({...newParam, unit: v})}>
                            <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select Unit" /></SelectTrigger>
                            <SelectContent>
                              {units.map(u => <SelectItem key={u.id} value={u.symbol}>{u.symbol} - {u.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Decimal Precision</Label>
                          <Input type="number" placeholder="2" value={newParam.decimalPlaces} onChange={e => setNewParam({...newParam, decimalPlaces: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Discharge Order Sequence</Label>
                          <Input type="number" placeholder="10" value={newParam.sequenceNumber} onChange={e => setNewParam({...newParam, sequenceNumber: Number(e.target.value)})} />
                        </div>
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="chkFormula" 
                            checked={newParam.formulaBased} 
                            onChange={e => setNewParam({...newParam, formulaBased: e.target.checked})} 
                            className="rounded text-indigo-600 focus:ring-slate-300"
                          />
                          <Label htmlFor="chkFormula" className="text-xs font-semibold cursor-pointer">Automatic Formula Based</Label>
                        </div>
                        {newParam.formulaBased && (
                          <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-1">
                            <Label className="text-[10px] uppercase font-bold text-indigo-700">Formula Rule Syntax</Label>
                            <Input placeholder="e.g. {P-HB} * 3 (Use brackets to call parameter codes)" value={newParam.formula} onChange={e => setNewParam({...newParam, formula: e.target.value})} />
                            <p className="text-[9px] text-muted-foreground mt-1">LIMS engine calculates this value automatically upon constituent entries.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" className="text-xs font-semibold" onClick={() => setIsParamDialogOpen(false)}>Cancel</Button>
                      <Button className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold" onClick={handleAddParam}>Link Parameter</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold">Investigation Test</TableHead>
                    <TableHead className="text-[11px] font-bold">Parameter ID</TableHead>
                    <TableHead className="text-[11px] font-bold">Parameter Name</TableHead>
                    <TableHead className="text-[11px] font-bold">Measurement Unit</TableHead>
                    <TableHead className="text-[11px] font-bold">Sequence Order</TableHead>
                    <TableHead className="text-[11px] font-bold">Formula Based</TableHead>
                    <TableHead className="text-right text-[11px] font-bold">Precision Dev</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameters.filter(p => 
                    p.name.toLowerCase().includes(paramSearch.toLowerCase()) || 
                    p.testCode.toLowerCase().includes(paramSearch.toLowerCase())
                  ).map((param) => {
                    const testRef = investigations.find(i => i.code === param.testCode);
                    return (
                      <TableRow key={param.id} className="hover:bg-slate-50/50 text-xs border-slate-100">
                        <TableCell className="py-2.5 font-bold text-slate-800">
                          {testRef?.name || 'Unknown test'}
                          <span className="block text-[9px] font-normal text-muted-foreground uppercase">{param.testCode}</span>
                        </TableCell>
                        <TableCell className="py-2.5 font-mono font-medium text-slate-600">{param.id}</TableCell>
                        <TableCell className="py-2.5 font-semibold text-slate-700">{param.name}</TableCell>
                        <TableCell className="py-2.5 font-medium text-slate-500">{param.unit || 'Direct/Qual'}</TableCell>
                        <TableCell className="py-2.5 font-bold text-slate-400">#{param.sequenceNumber}</TableCell>
                        <TableCell className="py-2.5">
                          {param.formulaBased ? (
                            <Badge className="bg-indigo-100 hover:bg-indigo-100 text-indigo-800 text-[10px] font-medium border-none">
                              Formula: {param.formula || 'Rule'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-200">Manual Entry</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-medium text-slate-600">{param.decimalPlaces} Dec</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. CATEGORIES MASTER */}
        <TabsContent value="categories">
          <Card className="border-none shadow-sm shadow-slate-100 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-md font-bold">Test Category Master</CardTitle>
                <CardDescription className="text-xs">Primary biochemical, serological, and pathological groups managing physical lab streams.</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search Category..." 
                    className="pl-9 h-9 border-slate-200 text-xs rounded-lg"
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                  />
                </div>
                <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-lg gap-1 shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[420px] rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Master Category</DialogTitle>
                      <DialogDescription>Configure secondary routing workflows on pathology analyzer lines.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Category Name *</Label>
                        <Input placeholder="e.g. Biochemistry" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <textarea 
                          className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 min-h-[80px]"
                          placeholder="Short description of physical test routing and sample workflow..."
                          value={newCat.description}
                          onChange={e => setNewCat({...newCat, description: e.target.value})}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" className="text-xs font-semibold" onClick={() => setIsCatDialogOpen(false)}>Cancel</Button>
                      <Button className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold" onClick={handleAddCategory}>Save Category</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold">Category ID</TableHead>
                    <TableHead className="text-[11px] font-bold">Category Name</TableHead>
                    <TableHead className="text-[11px] font-bold">Description Summary</TableHead>
                    <TableHead className="text-right text-[11px] font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.filter(c => 
                    c.name.toLowerCase().includes(catSearch.toLowerCase()) || 
                    c.id.toLowerCase().includes(catSearch.toLowerCase())
                  ).map((cat) => (
                    <TableRow key={cat.id} className="hover:bg-slate-50/50 text-xs border-slate-100">
                      <TableCell className="py-3 font-mono font-bold text-slate-600">{cat.id}</TableCell>
                      <TableCell className="py-3 font-semibold text-slate-800">{cat.name}</TableCell>
                      <TableCell className="py-3 text-muted-foreground italic font-medium">{cat.description || 'No description logged.'}</TableCell>
                      <TableCell className="py-3 text-right">
                        <Badge className="bg-emerald-50 text-emerald-700 border-none">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. SUBCATEGORY MASTER */}
        <TabsContent value="subcategories">
          <Card className="border-none shadow-sm shadow-slate-100 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-md font-bold">Test Sub-Category Master</CardTitle>
                <CardDescription className="text-xs">Specific profiles mapped to primary categories, managing lab setup sheets.</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search Subcategory..." 
                    className="pl-9 h-9 border-slate-200 text-xs rounded-lg"
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                  />
                </div>
                <Dialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-lg gap-1 shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Add Sub-Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[420px] rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Sub-Category Master</DialogTitle>
                      <DialogDescription>Map a subcategory grouping to a primary clinical scope category.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Parent Category Mapping *</Label>
                        <Select value={newSub.categoryId} onValueChange={v => setNewSub({...newSub, categoryId: v})}>
                          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Choose Category" /></SelectTrigger>
                          <SelectContent>
                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sub-Category Name *</Label>
                        <Input placeholder="e.g. Thyroid Profile" value={newSub.name} onChange={e => setNewSub({...newSub, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <textarea 
                          className="w-full text-xs p-2 rounded-lg bg-slate-50 border border-slate-200 min-h-[85px]"
                          placeholder="Description of biochemical constituent parameters included..."
                          value={newSub.description}
                          onChange={e => setNewSub({...newSub, description: e.target.value})}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" className="text-xs font-semibold" onClick={() => setIsSubDialogOpen(false)}>Cancel</Button>
                      <Button className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold" onClick={handleAddSubCategory}>Save Sub-Category</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold">Sub-Category ID</TableHead>
                    <TableHead className="text-[11px] font-bold">Primary Category Map</TableHead>
                    <TableHead className="text-[11px] font-bold">Sub-Category Name</TableHead>
                    <TableHead className="text-[11px] font-bold">Included Elements / Comments</TableHead>
                    <TableHead className="text-right text-[11px] font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subCategories.filter(s => 
                    s.name.toLowerCase().includes(subSearch.toLowerCase()) || 
                    s.id.toLowerCase().includes(subSearch.toLowerCase())
                  ).map((sub) => {
                    const catRef = categories.find(c => c.id === sub.categoryId);
                    return (
                      <TableRow key={sub.id} className="hover:bg-slate-50/50 text-xs border-slate-100">
                        <TableCell className="py-3 font-mono font-bold text-slate-600">{sub.id}</TableCell>
                        <TableCell className="py-3 font-semibold text-slate-700">
                          {catRef?.name || 'Unknown Category'}
                        </TableCell>
                        <TableCell className="py-3 font-bold text-indigo-950">{sub.name}</TableCell>
                        <TableCell className="py-3 text-muted-foreground italic font-medium">{sub.description || 'Clinical constituents.'}</TableCell>
                        <TableCell className="py-3 text-right">
                          <Badge className="bg-emerald-50 text-emerald-700 border-none">Active</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
