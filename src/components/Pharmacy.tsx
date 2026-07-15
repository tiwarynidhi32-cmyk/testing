import { useState, useEffect, useMemo } from 'react';
import { 
  Pill, 
  Search, 
  Plus, 
  AlertTriangle, 
  Package, 
  History, 
  ArrowRight,
  ShoppingCart,
  Calendar,
  CreditCard,
  Download,
  Printer,
  Trash2,
  Edit,
  Loader2,
  Settings
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
import { Separator } from '@/components/ui/separator';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate } from '@/lib/utils';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { canUserModifyRecord, normalizeRole } from '@/utils/rbac';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { generatePharmacyInvoiceHtml, DEFAULT_PHARMACY_SETTINGS } from '@/lib/pharmacyInvoicePrint';

export default function Pharmacy() {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isAccountant = normalizeRole(currentUser?.role) === 'ACCOUNTANT';

  const [activeTab, setActiveTab] = useState(isAccountant ? 'billing' : 'inventory');
  const [inventory, setInventory] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const templateImage = storage.get(STORAGE_KEYS.TEMPLATE_IMAGE, null);

  const [pharmacySettings, setPharmacySettings] = useState<any>(() => {
    return storage.get('hms_pharmacy_settings', DEFAULT_PHARMACY_SETTINGS);
  });

  const [editingBillInner, setEditingBillInner] = useState<any | null>(null);
  const [isEditBillOpen, setIsEditBillOpen] = useState(false);

  const handleSaveEditBillInner = async () => {
    if (!editingBillInner) return;
    
    const updatedBill = {
      ...editingBillInner,
      is_edited: true,
      tpa_approval_status: 'Edited',
      total_amount: Number(editingBillInner.totalAmount) || Number(editingBillInner.total_amount),
      paid_amount: Number(editingBillInner.paidAmount) || Number(editingBillInner.paid_amount) || Number(editingBillInner.totalAmount) || Number(editingBillInner.total_amount),
    };

    try {
      const dbRes = await supabaseService.updateInvoice(
        editingBillInner.id,
        updatedBill,
        editingBillInner.invoice_items || []
      );
      
      const sessionBills = storage.get(STORAGE_KEYS.BILLING, []);
      const index = sessionBills.findIndex((b: any) => b.id === editingBillInner.id);
      if (index !== -1) {
        sessionBills[index] = {
          ...sessionBills[index],
          ...updatedBill,
          patient_name: editingBillInner.patient_name || editingBillInner.patient_name,
          patient_phone: editingBillInner.patient_phone || editingBillInner.patient_phone,
          prescribing_doctor: editingBillInner.prescribing_doctor || editingBillInner.prescribing_doctor,
          totalAmount: Number(editingBillInner.totalAmount),
          total_amount: Number(editingBillInner.totalAmount),
          paid_amount: Number(editingBillInner.totalAmount),
          is_edited: true
        };
        storage.set(STORAGE_KEYS.BILLING, sessionBills);
      }
      
      toast.success('Pharmacy billing invoice updated successfully & marked as Edited!');
      setIsEditBillOpen(false);
      setEditingBillInner(null);
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to update billing invoice');
    }
  };

  const fetchData = async () => {
    if (inventory.length === 0) {
      setLoading(true);
    }
    const [invData, invoicesData, patientsData, dbSettings] = await Promise.all([
      supabaseService.getPharmacyItems(),
      supabaseService.getInvoices(),
      supabaseService.getPatients(),
      supabaseService.getPharmacySettings ? supabaseService.getPharmacySettings() : Promise.resolve(null)
    ]);

    if (invData) setInventory(invData);
    if (invoicesData) setBills(invoicesData.filter(inv => inv.type === 'Pharmacy' || inv.invoice_items?.some((item: any) => item.category === 'PHARMACY')));
    if (patientsData) setPatients(patientsData);
    if (dbSettings) {
      setPharmacySettings(dbSettings);
      const currentSettings = storage.get('hms_pharmacy_settings', null);
      if (JSON.stringify(currentSettings) !== JSON.stringify(dbSettings)) {
        storage.set('hms_pharmacy_settings', dbSettings);
      }
    }
    setLoading(false);
  };

  useDataSync(fetchData);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [inventory, searchQuery]);

  const [newItem, setNewItem] = useState({ 
    name: '', 
    category: 'Medicine', 
    stock: 0, 
    unit: 'Tablets', 
    min_stock_level: 10,
    mrp: 0,
    selling_price: 0,
    purchase_price: 0,
    tax_percentage: 12,
    hsn_code: '',
    rack_number: '',
    batch_number: '',
    expiry_date: '',
    composition: '',
    is_loose_sale_enabled: false,
    units_per_strip: 10,
    loose_selling_price: 0,
    loose_stock: 0,
  });
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const handleAddItem = async () => {
    if (!newItem.name) {
      toast.error('Please enter item name');
      return;
    }
    const itemToAdd = {
      name: newItem.name,
      category: newItem.category,
      unit: newItem.unit,
      hsn_code: newItem.hsn_code,
      rack_number: newItem.rack_number,
      batch_number: newItem.batch_number,
      expiry_date: newItem.expiry_date || null,
      stock: Number(newItem.stock),
      mrp: Number(newItem.mrp),
      selling_price: Number(newItem.selling_price),
      purchase_price: Number(newItem.purchase_price),
      tax_percentage: Number(newItem.tax_percentage),
      min_stock_level: Number(newItem.min_stock_level),
      composition: newItem.composition,
      is_loose_sale_enabled: newItem.is_loose_sale_enabled,
      units_per_strip: Number(newItem.units_per_strip || 10),
      loose_selling_price: Number(newItem.loose_selling_price || 0),
      loose_stock: Number(newItem.loose_stock || 0)
    };
    
    const result = await supabaseService.createPharmacyItem(itemToAdd);
    if (result) {
      toast.success('New item added to inventory');
      fetchData();
      setNewItem({ 
        name: '', 
        category: 'Medicine', 
        stock: 0, 
        unit: 'Tablets', 
        min_stock_level: 10,
        mrp: 0,
        selling_price: 0,
        purchase_price: 0,
        tax_percentage: 12,
        hsn_code: '',
        rack_number: '',
        batch_number: '',
        expiry_date: '',
        composition: '',
        is_loose_sale_enabled: false,
        units_per_strip: 10,
        loose_selling_price: 0,
        loose_stock: 0,
      });
    } else {
      toast.error('Failed to add item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (item && !canUserModifyRecord(item, currentUser)) {
      toast.error("Access Denied: This inventory item was created by an Admin and cannot be deleted by non-admin users.");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete "${item?.name || 'this item'}" from inventory?`)) {
      return;
    }
    const success = await supabaseService.deletePharmacyItem(id);
    if (success) {
      setInventory(inventory.filter(item => item.id !== id));
      toast.success('Item removed from inventory');
    } else {
      toast.error('Failed to delete item');
    }
  };

  const printPharmacyInvoice = (bill: any) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Please allow popups to print invoice');
      return;
    }

    const patient = patients.find(p => p.id === bill.patient_id);
    const patientDetails = {
      name: bill.patientName || bill.patient_name || patient?.name || 'Walk-in Customer',
      phone: bill.patientPhone || bill.patient_phone || patient?.phone || 'N/A',
      address: patient?.address || 'N/A',
      gstin: patient?.gst_no || 'N/A'
    };

    const invoiceHtml = generatePharmacyInvoiceHtml(bill, inventory, patientDetails, pharmacySettings);
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const handleExportInventory = () => {
    const headers = ['Name', 'Category', 'Stock', 'Unit', 'Min Level', 'Expiry Date'];
    const rows = inventory.map((item: any) => [
      item.name,
      item.category,
      item.stock,
      item.unit,
      item.min_stock_level,
      item.expiry_date || 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'pharmacy_inventory.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Inventory exported as CSV');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 font-medium">Loading Pharmacy...</span>
      </div>
    );
  }

  const lowStockCount = inventory.filter(i => i.stock < (i.min_stock_level || 10)).length;
  const expiringSoonCount = inventory.filter(i => {
    if (!i.expiry_date) return false;
    const expiry = new Date(i.expiry_date);
    const today = new Date();
    const monthsDiff = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsDiff >= 0 && monthsDiff < 3;
  }).length;
  const totalInvValue = inventory.reduce((acc, i) => acc + (i.stock * (i.purchase_price || 0)), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Dynamic, Vibrant, Richly Colored Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white p-6 sm:p-8 shadow-xl shadow-orange-100 animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-rose-400/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest bg-white/20 text-white px-3 py-1 rounded-full uppercase my-1 select-none w-fit">
              ★ PHARMACY DEPOT ONLINE
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
              Pharmacy & Inventory
            </h1>
            <p className="text-orange-50 text-sm font-medium max-w-xl">
              Real-time stock level analysis, drug formulation indices, expiry tracking alerts, and loose tablet POS sales tracking.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-inner">
            <Link to="/pharmacy/pos">
              <Button className="bg-white text-orange-950 hover:bg-orange-50 gap-2 rounded-xl font-black h-10 shadow-md">
                <ShoppingCart className="w-4 h-4 text-orange-600" />
                POS Sell Terminal
              </Button>
            </Link>
            <Button variant="outline" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-orange-900 rounded-xl font-bold h-10" onClick={handleExportInventory}>
              <Download className="w-4 h-4" />
              Export Stock
            </Button>
            {!isAccountant && (
              <Button 
                variant="outline" 
                className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white hover:text-orange-900 rounded-xl font-bold h-10" 
                onClick={() => setIsPurchaseOpen(true)}
              >
                <History className="w-4 h-4" />
                Purchase Stock
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
        <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Purchase New Stock</DialogTitle>
                <DialogDescription>Record a new purchase from a supplier.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="space-y-2">
                  <Label>Medicine / Item</Label>
                  <Select 
                    onValueChange={(val) => {
                      const item = inventory.find(i => i.id === val);
                      if (item) {
                        setEditingItem(item);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {editingItem && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity to Add</Label>
                        <Input 
                          type="number" 
                          id="purchase-qty"
                          placeholder="0" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Purchase Price (₹)</Label>
                        <Input 
                          type="number" 
                          id="purchase-price"
                          defaultValue={editingItem.purchase_price}
                          placeholder="0.00" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>New MRP (₹)</Label>
                        <Input 
                          type="number" 
                          id="purchase-mrp"
                          defaultValue={editingItem.mrp}
                          placeholder="0.00" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Selling Price (₹)</Label>
                        <Input 
                          type="number" 
                          id="purchase-sp"
                          defaultValue={editingItem.selling_price}
                          placeholder="0.00" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Batch Number</Label>
                      <Input id="purchase-batch" placeholder="Enter batch number" defaultValue={editingItem.batch_number} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input type="date" id="purchase-expiry" defaultValue={editingItem.expiry_date} />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Supplier Name</Label>
                  <Input placeholder="Enter supplier name" id="purchase-supplier" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsPurchaseOpen(false);
                  setEditingItem(null);
                }}>Cancel</Button>
                <Button className="bg-medical-blue" onClick={async () => {
                  if (!editingItem) {
                    toast.error('Please select an item');
                    return;
                  }
                  
                  const qtyToAdd = Number((document.getElementById('purchase-qty') as HTMLInputElement)?.value || 0);
                  const newPP = Number((document.getElementById('purchase-price') as HTMLInputElement)?.value || editingItem.purchase_price);
                  const newMRP = Number((document.getElementById('purchase-mrp') as HTMLInputElement)?.value || editingItem.mrp);
                  const newSP = Number((document.getElementById('purchase-sp') as HTMLInputElement)?.value || editingItem.selling_price);
                  const newBatch = (document.getElementById('purchase-batch') as HTMLInputElement)?.value || editingItem.batch_number;
                  const newExpiry = (document.getElementById('purchase-expiry') as HTMLInputElement)?.value || editingItem.expiry_date;
                  const supplier = (document.getElementById('purchase-supplier') as HTMLInputElement)?.value || 'N/A';

                  const updates = {
                    stock: editingItem.stock + qtyToAdd,
                    purchase_price: newPP,
                    mrp: newMRP,
                    selling_price: newSP,
                    batch_number: newBatch,
                    expiry_date: newExpiry,
                    updated_at: new Date().toISOString()
                  };

                  const result = await supabaseService.updatePharmacyItem(editingItem.id, updates);
                  
                  if (result) {
                    // Log the transaction
                    await supabaseService.logInventoryTransaction({
                      item_id: editingItem.id,
                      transaction_type: 'PURCHASE',
                      quantity: qtyToAdd,
                      unit_price: newPP,
                      total_price: qtyToAdd * newPP,
                      reference_id: `SUP-${supplier}`,
                      performed_by: currentUser?.id
                    });

                    toast.success('Stock purchase recorded and inventory updated');
                    fetchData();
                    setIsPurchaseOpen(false);
                    setEditingItem(null);
                  } else {
                    toast.error('Failed to update stock');
                  }
                }}>Record Purchase</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
            {!isAccountant && (
              <DialogTrigger asChild>
                <Button className="bg-medical-blue gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Stock
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Medicine/Item</DialogTitle>
                <DialogDescription>Add a new item to the pharmacy inventory.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Item Name</Label>
                    <Input 
                      placeholder="e.g. Ibuprofen 400mg" 
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={newItem.category}
                      onValueChange={(v) => setNewItem({...newItem, category: v as any})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medicine">Medicine</SelectItem>
                        <SelectItem value="Surgical">Surgical</SelectItem>
                        <SelectItem value="Consumable">Consumable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input 
                      placeholder="e.g. Tablets, Bottles" 
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Initial Stock</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={newItem.stock}
                      onChange={(e) => setNewItem({...newItem, stock: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Stock Level</Label>
                    <Input 
                      type="number" 
                      placeholder="10" 
                      value={newItem.min_stock_level}
                      onChange={(e) => setNewItem({...newItem, min_stock_level: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rack No.</Label>
                    <Input 
                      placeholder="A-1" 
                      value={newItem.rack_number}
                      onChange={(e) => setNewItem({...newItem, rack_number: e.target.value})}
                    />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Purchase Price (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newItem.purchase_price}
                      onChange={(e) => setNewItem({...newItem, purchase_price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>MRP (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newItem.mrp}
                      onChange={(e) => setNewItem({...newItem, mrp: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Selling Price (₹)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={newItem.selling_price}
                      onChange={(e) => setNewItem({...newItem, selling_price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Percentage (%)</Label>
                    <Select 
                      value={newItem.tax_percentage.toString()}
                      onValueChange={(v) => setNewItem({...newItem, tax_percentage: Number(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Tax" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const activeSlabs = storage.get(STORAGE_KEYS.TAX_SLABS, [
                            { id: 'tax-ex', name: 'GST Zero (Exempt)', rate: 0, type: 'GST', isActive: true },
                            { id: 'tax-5', name: 'GST 5%', rate: 5, type: 'GST', isActive: true },
                            { id: 'tax-12', name: 'GST 12%', rate: 12, type: 'GST', isActive: true },
                            { id: 'tax-18', name: 'GST 18%', rate: 18, type: 'GST', isActive: true },
                            { id: 'tax-28', name: 'GST 28%', rate: 28, type: 'GST', isActive: true }
                          ]).filter((s: any) => s.isActive);
                          
                          return activeSlabs.map((s: any) => (
                            <SelectItem key={s.id} value={s.rate.toString()}>
                              {s.name} ({s.rate}%)
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>HSN Code</Label>
                    <Input 
                      placeholder="HSN" 
                      value={newItem.hsn_code}
                      onChange={(e) => setNewItem({...newItem, hsn_code: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Batch Number</Label>
                    <Input 
                      placeholder="Batch" 
                      value={newItem.batch_number}
                      onChange={(e) => setNewItem({...newItem, batch_number: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input 
                    type="date" 
                    value={newItem.expiry_date}
                    onChange={(e) => setNewItem({...newItem, expiry_date: e.target.value})}
                  />
                </div>

                <div className="space-y-4 pt-2 border-t border-dashed col-span-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Salt Composition & Loose Sale Setup</h4>
                  <div className="space-y-2">
                    <Label>Chemical Composition / Salt Formula</Label>
                    <Input 
                      placeholder="e.g. Amoxicillin + Clavulanic Acid" 
                      value={newItem.composition}
                      onChange={(e) => setNewItem({...newItem, composition: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50 border border-orange-100 mt-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-slate-800 cursor-pointer" htmlFor="loose-sale-checkbox">Enable Loose Sale</Label>
                      <p className="text-[10px] text-muted-foreground">Allows selling pills or capsules individually</p>
                    </div>
                    <input 
                      id="loose-sale-checkbox"
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      checked={newItem.is_loose_sale_enabled}
                      onChange={(e) => setNewItem({...newItem, is_loose_sale_enabled: e.target.checked})}
                    />
                  </div>

                  {newItem.is_loose_sale_enabled && (
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Units per Strip</Label>
                        <Input 
                          type="number" 
                          placeholder="10" 
                          value={newItem.units_per_strip}
                          onChange={(e) => setNewItem({...newItem, units_per_strip: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Loose Price (₹)</Label>
                        <Input 
                          type="number" 
                          placeholder="12.00" 
                          value={newItem.loose_selling_price}
                          onChange={(e) => setNewItem({...newItem, loose_selling_price: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Loose Stock</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={newItem.loose_stock}
                          onChange={(e) => setNewItem({...newItem, loose_stock: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogTrigger>
                <Button className="bg-medical-blue" onClick={() => {
                  handleAddItem();
                  setIsAddStockOpen(false);
                }}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      <Tabs defaultValue={isAccountant ? "billing" : "inventory"} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1">
          {!isAccountant && <TabsTrigger value="inventory">Inventory</TabsTrigger>}
          <TabsTrigger value="billing">Pharmacy Billing</TabsTrigger>
          {!isAccountant && (
            <TabsTrigger value="settings" className="flex gap-2 items-center">
              <Settings className="w-4 h-4" />
              Pharmacy Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="inventory" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Inventory Items</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <h3 className="text-3xl font-bold">{inventory.length}</h3>
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Package className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Low Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <h3 className="text-3xl font-bold text-amber-600">
                  {lowStockCount}
                </h3>
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Expiring Soon (30 Days)</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <h3 className="text-3xl font-bold text-rose-600">{expiringSoonCount}</h3>
                <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                  <Calendar className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Medicine Inventory</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search medicine..." 
                    className="pl-10 bg-slate-50 border-none h-9" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Link to="/pharmacy/pos">
                  <Button className="bg-teal-accent hover:bg-teal-600 h-9 gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    New Sale (POS)
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="whitespace-nowrap">Medicine Name</TableHead>
                      <TableHead className="whitespace-nowrap">Category</TableHead>
                      <TableHead className="whitespace-nowrap">MRP / Selling</TableHead>
                      <TableHead className="whitespace-nowrap">Stock</TableHead>
                      <TableHead className="whitespace-nowrap">Expiry Date</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id} className="border-slate-50">
                        <TableCell className="font-medium whitespace-nowrap">
                          <div>
                            <p>{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">Rack: {item.rack_number || 'N/A'} | Batch: {item.batch_number || 'N/A'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground line-through">MRP: {formatCurrency(item.mrp || 0)}</span>
                            <span className="font-bold text-medical-blue">SP: {formatCurrency(item.selling_price || 0)}</span>
                            <span className="text-[10px] text-emerald-600">Tax: {item.tax_percentage || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold">{item.stock} {item.unit}</span>
                            {item.is_loose_sale_enabled && (
                              <span className="text-[10px] font-semibold text-amber-600">
                                + {item.loose_stock || 0} Loose Units ({ (item.stock * (item.units_per_strip || 10)) + (item.loose_stock || 0) } total)
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">Min Level: {item.min_stock_level || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.expiry_date ? formatDate(item.expiry_date) : 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary" className={`border-none ${
                            item.stock > (item.min_stock_level || 0) ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {item.stock > (item.min_stock_level || 0) ? 'In Stock' : 'Low Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Dialog open={editingItem?.id === item.id} onOpenChange={(open) => setEditingItem(open ? item : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-medical-blue gap-1 h-8">
                                Manage
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Manage Stock: {item.name}</DialogTitle>
                                <DialogDescription>Update stock levels or edit item details.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Current Stock</Label>
                                    <Input 
                                      type="number" 
                                      id={`stock-${item.id}`}
                                      defaultValue={item.stock} 
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Min Stock Level</Label>
                                    <Input 
                                      type="number" 
                                      id={`min-stock-${item.id}`}
                                      defaultValue={item.min_stock_level}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>MRP (₹)</Label>
                                    <Input 
                                      type="number" 
                                      id={`mrp-${item.id}`}
                                      defaultValue={item.mrp}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Selling Price (₹)</Label>
                                    <Input 
                                      type="number" 
                                      id={`selling-price-${item.id}`}
                                      defaultValue={item.selling_price}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Batch Number</Label>
                                    <Input 
                                      id={`batch-${item.id}`}
                                      defaultValue={item.batch_number}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Tax (%)</Label>
                                    <Input 
                                      type="number"
                                      id={`tax-${item.id}`}
                                      defaultValue={item.tax_percentage}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Expiry Date</Label>
                                  <Input 
                                    type="date" 
                                    id={`expiry-${item.id}`}
                                    defaultValue={item.expiry_date} 
                                  />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-dashed col-span-2">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loose Sale Setup</h4>
                                  <div className="space-y-2">
                                    <Label>Composition / Salt Formula</Label>
                                    <Input 
                                      id={`composition-${item.id}`}
                                      defaultValue={item.composition || ''}
                                      placeholder="e.g. Amoxicillin + Clavulanic Acid"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50 border border-orange-100 mt-2">
                                    <div className="space-y-0.5">
                                      <Label className="text-sm font-bold text-slate-800 cursor-pointer" htmlFor={`loose-enabled-${item.id}`}>Enable Loose Sale</Label>
                                      <p className="text-[10px] text-muted-foreground">Allows selling pills or capsules individually</p>
                                    </div>
                                    <input 
                                      id={`loose-enabled-${item.id}`}
                                      type="checkbox" 
                                      className="uncontrolled-loose-checkbox w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                      defaultChecked={item.is_loose_sale_enabled || false}
                                      onChange={(e) => {
                                        const subDiv = document.getElementById(`loose-sub-fields-${item.id}`);
                                        if (subDiv) subDiv.style.display = e.target.checked ? 'grid' : 'none';
                                      }}
                                    />
                                  </div>

                                  <div 
                                    id={`loose-sub-fields-${item.id}`}
                                    className="grid grid-cols-3 gap-3 pt-2"
                                    style={{ display: item.is_loose_sale_enabled ? 'grid' : 'none' }}
                                  >
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Units/Strip</Label>
                                      <Input 
                                        type="number" 
                                        id={`units-per-strip-${item.id}`}
                                        defaultValue={item.units_per_strip || 10}
                                        placeholder="10"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Loose Price (₹)</Label>
                                      <Input 
                                        type="number" 
                                        id={`loose-price-${item.id}`}
                                        defaultValue={item.loose_selling_price || 0}
                                        placeholder="12.00"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Loose Stock</Label>
                                      <Input 
                                        type="number" 
                                        id={`loose-stock-${item.id}`}
                                        defaultValue={item.loose_stock || 0}
                                        placeholder="0"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter className="flex justify-between sm:justify-between">
                                {!isAccountant && (
                                  <Button 
                                    variant="ghost" 
                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    onClick={() => {
                                      handleDeleteItem(item.id);
                                      setEditingItem(null);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Item
                                  </Button>
                                )}
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                                {!isAccountant && (
                                  <Button className="bg-medical-blue" onClick={async () => {
                                    const stock = Number((document.getElementById(`stock-${item.id}`) as HTMLInputElement)?.value);
                                    const min_stock_level = Number((document.getElementById(`min-stock-${item.id}`) as HTMLInputElement)?.value);
                                    const mrp = Number((document.getElementById(`mrp-${item.id}`) as HTMLInputElement)?.value);
                                    const selling_price = Number((document.getElementById(`selling-price-${item.id}`) as HTMLInputElement)?.value);
                                    const batch_number = (document.getElementById(`batch-${item.id}`) as HTMLInputElement)?.value;
                                    const tax_percentage = Number((document.getElementById(`tax-${item.id}`) as HTMLInputElement)?.value);
                                    const expiry_date = (document.getElementById(`expiry-${item.id}`) as HTMLInputElement)?.value;
                                    const composition = (document.getElementById(`composition-${item.id}`) as HTMLInputElement)?.value;
                                    const is_loose_sale_enabled = (document.getElementById(`loose-enabled-${item.id}`) as HTMLInputElement)?.checked;
                                    const units_per_strip = Number((document.getElementById(`units-per-strip-${item.id}`) as HTMLInputElement)?.value || 10);
                                    const loose_selling_price = Number((document.getElementById(`loose-price-${item.id}`) as HTMLInputElement)?.value || 0);
                                    const loose_stock = Number((document.getElementById(`loose-stock-${item.id}`) as HTMLInputElement)?.value || 0);

                                    const updates = {
                                      stock,
                                      min_stock_level,
                                      mrp,
                                      selling_price,
                                      batch_number,
                                      tax_percentage,
                                      expiry_date,
                                      composition,
                                      is_loose_sale_enabled,
                                      units_per_strip,
                                      loose_selling_price,
                                      loose_stock
                                    };

                                    const result = await supabaseService.updatePharmacyItem(item.id, updates);
                                    if (result) {
                                      toast.success('Stock updated successfully');
                                      fetchData();
                                      setEditingItem(null);
                                    } else {
                                      toast.error('Failed to update stock');
                                    }
                                  }}>Update Stock</Button>
                                )}
                                </div>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Pharmacy Billing History</CardTitle>
                <CardDescription>View and manage pharmacy-specific invoices.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search invoice or MRN..." className="pl-10 bg-slate-50 border-none h-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="whitespace-nowrap">Invoice ID</TableHead>
                      <TableHead className="whitespace-nowrap">Patient</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => {
                      const patient = patients.find(p => p.id === bill.patient_id);
                      return (
                        <TableRow key={bill.id} className="border-slate-50">
                          <TableCell className="font-medium text-medical-blue whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <span>#{bill.id.toUpperCase()}</span>
                              {(bill.is_edited || bill.tpa_approval_status === 'Edited') && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200 font-bold select-none">
                                  Edited
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div>
                              <p className="font-medium text-sm">
                                {bill.patient_name || patient?.name || 'Walk-in Customer'}
                              </p>
                              {bill.patient_phone && <p className="text-[10px] text-muted-foreground">Ph: {bill.patient_phone}</p>}
                              {bill.prescribing_doctor && <p className="text-[10px] text-medical-blue italic">Dr: {bill.prescribing_doctor}</p>}
                              {!bill.patient_phone && patient?.mrn && <p className="text-xs text-muted-foreground">{patient.mrn}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(bill.date)}</TableCell>
                          <TableCell className="font-bold whitespace-nowrap">{formatCurrency(bill.totalAmount)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none">
                              Paid
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              {!isAccountant && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-medical-blue" 
                                  title="Edit Pharmacy Bill"
                                  onClick={() => {
                                    setEditingBillInner({
                                      ...bill,
                                      patient_name: bill.patient_name || patient?.name || 'Walk-in Customer',
                                      patient_phone: bill.patient_phone || patient?.phone || ''
                                    });
                                    setIsEditBillOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => printPharmacyInvoice(bill)}>
                                <Printer className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.success('Downloading invoice...')}>
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Pharmacy & Billing Settings</CardTitle>
              <CardDescription>
                Configure pharmacy headers, GST details, bank accounts, UPI codes, and terms for invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Brand & Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Brand Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-name">Pharmacy Professional Name</Label>
                    <Input 
                      id="pharmacy-name" 
                      value={pharmacySettings.pharmacyName}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, pharmacyName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-tagline">Dynamic Tagline / Promotion</Label>
                    <Input 
                      id="pharmacy-tagline" 
                      value={pharmacySettings.tagline}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, tagline: e.target.value })}
                      placeholder="e.g. A single stop for all your Healthcare needs!"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="logo-url">Pharmacy Logo URL</Label>
                      <span className="text-[10px] text-muted-foreground">Upload image or enter web link</span>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        id="logo-url" 
                        value={pharmacySettings.logoUrl}
                        onChange={(e) => setPharmacySettings({ ...pharmacySettings, logoUrl: e.target.value })}
                        placeholder="https://..."
                      />
                      <div className="relative">
                        <Button variant="outline" className="cursor-pointer relative overflow-hidden" asChild nativeButton={false}>
                          <label className="text-xs">
                            Upload
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setPharmacySettings({ ...pharmacySettings, logoUrl: reader.result as string });
                                    toast.success('Logo uploaded successfully!');
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                          </label>
                        </Button>
                      </div>
                    </div>
                    {pharmacySettings.logoUrl && (
                      <div className="mt-2 p-2 border border-dashed rounded flex justify-between items-center bg-slate-50">
                        <img src={pharmacySettings.logoUrl} className="max-h-12 max-w-[120px] object-contain rounded" alt="Preview" />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 h-8 hover:text-red-600 hover:bg-red-50 text-xs"
                          onClick={() => setPharmacySettings({ ...pharmacySettings, logoUrl: '' })}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-phone">Support Contacts (Phone)</Label>
                    <Input 
                      id="pharmacy-phone" 
                      value={pharmacySettings.phone}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-address">Retail Location (Address)</Label>
                    <Input 
                      id="pharmacy-address" 
                      value={pharmacySettings.address}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-gstin">Enterprise Tax Reference (GSTIN)</Label>
                    <Input 
                      id="pharmacy-gstin" 
                      value={pharmacySettings.gstin}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, gstin: e.target.value })}
                    />
                  </div>
                </div>

                {/* Bank / Payment config */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Acquirer & Bank Accounts</h3>
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Financial Institution (Bank Name)</Label>
                    <Input 
                      id="bank-name" 
                      value={pharmacySettings.bankName}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-branch">Branch Location</Label>
                    <Input 
                      id="bank-branch" 
                      value={pharmacySettings.bankBranch}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankBranch: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-acc">Deposit Account Number</Label>
                    <Input 
                      id="bank-acc" 
                      value={pharmacySettings.bankAccNo}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankAccNo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-ifsc">Routing Code (IFSC)</Label>
                    <Input 
                      id="bank-ifsc" 
                      value={pharmacySettings.bankIfsc}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, bankIfsc: e.target.value })}
                      className="font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI Virtual Address (UPI ID)</Label>
                    <Input 
                      id="upi-id" 
                      value={pharmacySettings.upiId}
                      onChange={(e) => setPharmacySettings({ ...pharmacySettings, upiId: e.target.value })}
                      placeholder="e.g. name@bank"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-4 bg-slate-100" />

              {/* Terms and Footers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="terms-conditions">Terms & Conditions (One per line)</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">Use line breaks</span>
                  </div>
                  <textarea 
                    id="terms-conditions" 
                    className="w-full h-32 border border-slate-200 rounded-md p-3 text-xs focus:ring-1 focus:ring-medical-blue focus:outline-none"
                    value={pharmacySettings.termsAndConditions.join('\n')}
                    onChange={(e) => {
                      const list = e.target.value.split('\n').filter(line => line.trim() !== '');
                      setPharmacySettings({ ...pharmacySettings, termsAndConditions: list });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-footer">Document Footer Slogan</Label>
                  <textarea 
                    id="invoice-footer" 
                    className="w-full h-32 border border-slate-200 rounded-md p-3 text-xs focus:ring-1 focus:ring-medical-blue focus:outline-none"
                    value={pharmacySettings.additionalFooter}
                    onChange={(e) => setPharmacySettings({ ...pharmacySettings, additionalFooter: e.target.value })}
                    placeholder="e.g. Thanks for your order!"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    const confirmReset = window.confirm("Are you sure you want to reset to default Medicare Wholesale Pharmacy settings?");
                    if (confirmReset) {
                      setPharmacySettings(DEFAULT_PHARMACY_SETTINGS);
                      storage.set('hms_pharmacy_settings', DEFAULT_PHARMACY_SETTINGS);
                      if (supabaseService.updatePharmacySettings) {
                        await supabaseService.updatePharmacySettings(DEFAULT_PHARMACY_SETTINGS);
                      }
                      toast.success('Reset to defaults successfully');
                    }
                  }}
                >
                  Reset Defaults
                </Button>
                <Button 
                  className="bg-medical-blue text-white hover:bg-medical-blue/90"
                  onClick={async () => {
                    storage.set('hms_pharmacy_settings', pharmacySettings);
                    if (supabaseService.updatePharmacySettings) {
                      await supabaseService.updatePharmacySettings(pharmacySettings);
                    }
                    toast.success('Pharmacy settings saved successfully!');
                  }}
                >
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Pharmacy Bill Dialog */}
      <Dialog open={isEditBillOpen} onOpenChange={setIsEditBillOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Pharmacy Bill #{editingBillInner?.id.slice(0, 8).toUpperCase()}</DialogTitle>
            <DialogDescription>
              Modify customer details and total amount. This action will label the bill as Edited.
            </DialogDescription>
          </DialogHeader>
          {editingBillInner && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bill-name">Patient/Customer Name</Label>
                <Input
                  id="edit-bill-name"
                  value={editingBillInner.patient_name || ''}
                  onChange={(e) => setEditingBillInner({ ...editingBillInner, patient_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bill-phone">Customer Phone (Optional)</Label>
                <Input
                  id="edit-bill-phone"
                  value={editingBillInner.patient_phone || ''}
                  onChange={(e) => setEditingBillInner({ ...editingBillInner, patient_phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bill-doctor">Prescribing Doctor</Label>
                <Input
                  id="edit-bill-doctor"
                  value={editingBillInner.prescribing_doctor || ''}
                  onChange={(e) => setEditingBillInner({ ...editingBillInner, prescribing_doctor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bill-amount">Total Bill Amount</Label>
                <Input
                  id="edit-bill-amount"
                  type="number"
                  value={editingBillInner.totalAmount ?? editingBillInner.total_amount ?? 0}
                  onChange={(e) => setEditingBillInner({ 
                    ...editingBillInner, 
                    totalAmount: Number(e.target.value),
                    total_amount: Number(e.target.value),
                    paidAmount: Number(e.target.value),
                    paid_amount: Number(e.target.value)
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditBillOpen(false);
              setEditingBillInner(null);
            }}>
              Cancel
            </Button>
            <Button className="bg-medical-blue text-white" onClick={handleSaveEditBillInner}>
              Save and Mark Edited
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
