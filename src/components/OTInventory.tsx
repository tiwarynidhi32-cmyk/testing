import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Trash2, 
  Edit, 
  Activity, 
  SlidersHorizontal,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { storage } from '@/lib/storage';
import { supabaseService } from '@/services/supabaseService';
import { OTInventoryItem } from '@/types';

const INITIAL_OT_INVENTORY: OTInventoryItem[] = [
  { id: 'oti-1', code: 'OTI001', name: 'General Surgery Kit (Major)', category: 'Surgical Kit', stock: 8, unit: 'Kit', minStockLevel: 3, mrp: 4500, purchasePrice: 3200, batchNumber: 'GSK-2026-04', expiryDate: '2028-12-31' },
  { id: 'oti-2', code: 'OTI002', name: 'Laparoscopic Procedure Kit', category: 'Surgical Kit', stock: 2, unit: 'Kit', minStockLevel: 3, mrp: 8500, purchasePrice: 6000, batchNumber: 'LPK-8812', expiryDate: '2027-06-30' },
  { id: 'oti-3', code: 'OTI003', name: 'Orthopedic Fracture Kit', category: 'Surgical Kit', stock: 4, unit: 'Kit', minStockLevel: 2, mrp: 12000, purchasePrice: 9500, batchNumber: 'OFK-4402', expiryDate: '2029-01-15' },
  { id: 'oti-4', code: 'OTI004', name: 'Propofol Injection 10mg/mL (20ml)', category: 'Anesthesia Drug', stock: 45, unit: 'Vial', minStockLevel: 15, mrp: 280, purchasePrice: 190, batchNumber: 'PPF-552A', expiryDate: '2027-08-24' },
  { id: 'oti-5', code: 'OTI005', name: 'Sevoflurane Inhalant (250ml)', category: 'Anesthesia Drug', stock: 3, unit: 'Bottle', minStockLevel: 5, mrp: 4800, purchasePrice: 3800, batchNumber: 'SVF-001X', expiryDate: '2028-03-10' },
  { id: 'oti-6', code: 'OTI006', name: 'Fentanyl Citrate 50mcg/mL (2ml)', category: 'Anesthesia Drug', stock: 30, unit: 'Ampoule', minStockLevel: 10, mrp: 150, purchasePrice: 90, batchNumber: 'FTN-991B', expiryDate: '2027-11-12' },
  { id: 'oti-7', code: 'OTI007', name: 'Vicryl 2-0 Absorbable Suture', category: 'Suture', stock: 12, unit: 'Box(12pcs)', minStockLevel: 15, mrp: 1800, purchasePrice: 1350, batchNumber: 'VCR-2219', expiryDate: '2029-05-01' },
  { id: 'oti-8', code: 'OTI008', name: 'Prolene 3-0 Non-absorbable Suture', category: 'Suture', stock: 24, unit: 'Box(12pcs)', minStockLevel: 10, mrp: 2100, purchasePrice: 1600, batchNumber: 'PRL-3012', expiryDate: '2029-07-22' },
  { id: 'oti-9', code: 'OTI009', name: 'Sterile Disposables Pack (PPE/Drapes)', category: 'Disposable', stock: 65, unit: 'Pack', minStockLevel: 20, mrp: 450, purchasePrice: 280, batchNumber: 'DSP-2026', expiryDate: '2028-02-28' },
  { id: 'oti-10', code: 'OTI010', name: 'IV Cannula 20G (Pink)', category: 'Disposable', stock: 140, unit: 'Piece', minStockLevel: 50, mrp: 45, purchasePrice: 20, batchNumber: 'CAN-20G', expiryDate: '2030-01-01' },
  { id: 'oti-11', code: 'OTI011', name: 'Titanium Locking Plate 4-Hole', category: 'Implant', stock: 5, unit: 'Piece', minStockLevel: 2, mrp: 7500, purchasePrice: 5200, batchNumber: 'IMP-TLP4', expiryDate: '2031-10-15' },
  { id: 'oti-12', code: 'OTI012', name: 'Cortical Screw 3.5mm x 14mm', category: 'Implant', stock: 18, unit: 'Piece', minStockLevel: 20, mrp: 380, purchasePrice: 240, batchNumber: 'IMP-CS35', expiryDate: '2032-04-18' }
];

export default function OTInventory() {
  const [inventory, setInventory] = useState<OTInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OTInventoryItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Disposable' as OTInventoryItem['category'],
    stock: 0,
    unit: '',
    minStockLevel: 5,
    mrp: 0,
    purchasePrice: 0,
    batchNumber: '',
    expiryDate: ''
  });

  // Sync and fetch from database
  useEffect(() => {
    const fetchOTInventory = async () => {
      const stored = await supabaseService.getOTInventory();
      if (stored && stored.length > 0) {
        setInventory(stored);
      } else {
        // Seed INITIAL_OT_INVENTORY to supabase
        const seedPromises = INITIAL_OT_INVENTORY.map(item => supabaseService.createOTInventoryItem(item));
        await Promise.all(seedPromises);
        const refetched = await supabaseService.getOTInventory();
        setInventory(refetched || INITIAL_OT_INVENTORY);
      }
    };
    fetchOTInventory();
  }, []);

  const syncWithMasterInventory = (otInv: OTInventoryItem[]) => {
    const masterItems = storage.get('hms_inv_items', []);
    let updatedMaster = [...masterItems];
    let changed = false;

    otInv.forEach(otItem => {
      // Find matching item in master list
      const idx = updatedMaster.findIndex(m => 
        (otItem.code && m.code === otItem.code) || 
        (m.name.toLowerCase() === otItem.name.toLowerCase() && m.location === 'OT Sub-store')
      );

      // Category mapping for master items
      let masterCategory = 'OT Implants & Snare';
      if (otItem.category === 'Disposable') masterCategory = 'Consumables';
      else if (otItem.category === 'Anesthesia Drug') masterCategory = 'Drugs';
      else if (otItem.category === 'Suture') masterCategory = 'Clinical Supplies';

      if (idx > -1) {
        // Update in-place
        const currentMaster = updatedMaster[idx];
        if (
          currentMaster.stock !== otItem.stock || 
          currentMaster.name !== otItem.name ||
          currentMaster.unitCost !== otItem.purchasePrice ||
          currentMaster.minLevel !== otItem.minStockLevel ||
          currentMaster.code !== otItem.code
        ) {
          updatedMaster[idx] = {
            ...currentMaster,
            code: otItem.code || currentMaster.code,
            name: otItem.name,
            stock: otItem.stock,
            unitCost: otItem.purchasePrice,
            minLevel: otItem.minStockLevel,
            unit: otItem.unit,
            location: 'OT Sub-store',
            category: masterCategory
          };
          changed = true;
        }
      } else {
        // Add new item to master list
        const newItem = {
          code: otItem.code || `OTI${String(Math.floor(100 + Math.random() * 900))}`,
          name: otItem.name,
          category: masterCategory,
          stock: otItem.stock,
          unit: otItem.unit,
          minLevel: otItem.minStockLevel,
          unitCost: otItem.purchasePrice,
          location: 'OT Sub-store'
        };
        updatedMaster.push(newItem);
        changed = true;
      }
    });

    if (changed) {
      storage.set('hms_inv_items', updatedMaster);
    }
  };

  const deleteFromMasterInventory = (code?: string, name?: string) => {
    const masterItems = storage.get('hms_inv_items', []);
    const updatedMaster = masterItems.filter((m: any) => {
      if (code && m.code === code) return false;
      if (name && m.name.toLowerCase() === name.toLowerCase() && m.location === 'OT Sub-store') return false;
      return true;
    });
    storage.set('hms_inv_items', updatedMaster);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      code: `OTI${String(Math.floor(100 + Math.random() * 900))}`,
      name: '',
      category: 'Disposable',
      stock: 10,
      unit: 'Piece',
      minStockLevel: 5,
      mrp: 100,
      purchasePrice: 70,
      batchNumber: `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
      expiryDate: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: OTInventoryItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      name: item.name,
      category: item.category,
      stock: item.stock,
      unit: item.unit,
      minStockLevel: item.minStockLevel,
      mrp: item.mrp,
      purchasePrice: item.purchasePrice,
      batchNumber: item.batchNumber || '',
      expiryDate: item.expiryDate || ''
    });
    setIsAddOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this inventory item?')) {
      const itemToDelete = inventory.find(i => i.id === id);
      const success = await supabaseService.deleteOTInventoryItem(id);
      if (success) {
        setInventory(prev => prev.filter(i => i.id !== id));
        if (itemToDelete) {
          deleteFromMasterInventory(itemToDelete.code, itemToDelete.name);
        }
        toast.success('Inventory item deleted successfully');
      } else {
        toast.error('Failed to delete inventory item');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.unit) {
      toast.error('Please enter Name and Unit');
      return;
    }

    if (editingItem) {
      // Update
      const updatedData = {
        ...formData,
        stock: Number(formData.stock),
        minStockLevel: Number(formData.minStockLevel),
        mrp: Number(formData.mrp),
        purchasePrice: Number(formData.purchasePrice)
      };
      const res = await supabaseService.updateOTInventoryItem(editingItem.id, updatedData);
      if (res) {
        setInventory(prev => prev.map(item => item.id === editingItem.id ? res : item));
        syncWithMasterInventory([...inventory.filter(item => item.id !== editingItem.id), res]);
        toast.success('Inventory item updated successfully');
      } else {
        toast.error('Failed to update inventory item');
      }
    } else {
      // Create
      const newItem: OTInventoryItem = {
        id: `oti-${Date.now()}`,
        code: formData.code || `OTI${String(Math.floor(100 + Math.random() * 900))}`,
        name: formData.name,
        category: formData.category,
        stock: Number(formData.stock),
        unit: formData.unit,
        minStockLevel: Number(formData.minStockLevel),
        mrp: Number(formData.mrp),
        purchasePrice: Number(formData.purchasePrice),
        batchNumber: formData.batchNumber,
        expiryDate: formData.expiryDate
      };
      const res = await supabaseService.createOTInventoryItem(newItem);
      if (res) {
        setInventory(prev => [...prev, res]);
        syncWithMasterInventory([...inventory, res]);
        toast.success('New inventory item added successfully');
      } else {
        toast.error('Failed to add inventory item');
      }
    }
    setIsAddOpen(false);
  };

  const categories = ['All', 'Surgical Kit', 'Disposable', 'Anesthesia Drug', 'Suture', 'Implant'];

  const filteredItems = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.batchNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = inventory.filter(item => item.stock <= item.minStockLevel);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Items</p>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{inventory.length}</h3>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm border-amber-100 bg-amber-50/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Low Stock Items</p>
              <h3 className="text-2xl font-extrabold text-amber-900 mt-1">{lowStockItems.length}</h3>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Surgical Kits Ready</p>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
                {inventory.filter(i => i.category === 'Surgical Kit' && i.stock > 0).reduce((acc, i) => acc + i.stock, 0)}
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Anesthesia Stock</p>
              <h3 className="text-2xl font-extrabold text-emerald-800 mt-1">
                {inventory.filter(i => i.category === 'Anesthesia Drug').reduce((acc, i) => acc + i.stock, 0)} Units
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter and Search Controls */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold">Operation Theatre Inventory</CardTitle>
              <CardDescription className="text-xs">Manage sterile surgical supplies, disposable protective equipment, implants, and vital anesthesia materials.</CardDescription>
            </div>
            <Button onClick={handleOpenAdd} className="bg-medical-blue hover:bg-medical-blue/90 gap-1 text-sm font-semibold h-10 shrink-0">
              <Plus className="w-4 h-4" />
              Add Inventory Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, batch number..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  className={`h-9 text-xs rounded-full px-3.5 font-medium shrink-0 ${
                    selectedCategory === cat ? 'bg-[#1A5E63] text-white hover:bg-[#1A5E63]' : ''
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b text-[11px] uppercase tracking-wider">
                  <th className="p-4">Item Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Stock Level</th>
                  <th className="p-4">Batch / Expiry</th>
                  <th className="p-4 text-right">Cost Info</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const isLow = item.stock <= item.minStockLevel;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            {item.code && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-semibold">SKU: {item.code}</span>}
                            <span>ID: {item.id}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={`font-semibold text-xs ${
                            item.category === 'Surgical Kit' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                            item.category === 'Anesthesia Drug' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                            item.category === 'Implant' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                            item.category === 'Suture' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                            'bg-slate-50 text-slate-600'
                          }`}>
                            {item.category}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${isLow ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                              {item.stock} {item.unit}s
                            </span>
                            {isLow && (
                              <Badge className="bg-rose-50 border-rose-100 text-rose-600 text-[9px] font-extrabold tracking-wider hover:bg-rose-50 uppercase gap-1 p-0.5 px-2">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {item.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">Min safe level: {item.minStockLevel}</p>
                        </td>
                        <td className="p-4 text-xs">
                          <div className="font-medium text-slate-700">Batch: {item.batchNumber || 'N/A'}</div>
                          <div className={`text-[10px] ${
                            item.expiryDate && new Date(item.expiryDate) < new Date() ? 'text-rose-500 font-bold' : 'text-slate-400'
                          }`}>
                            Expires: {item.expiryDate || 'N/A'}
                          </div>
                        </td>
                        <td className="p-4 text-right text-xs">
                          <div className="font-semibold text-slate-800">Selling Price: ₹{item.mrp}</div>
                          <div className="text-[10px] text-slate-400">Cost: ₹{item.purchasePrice}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-medical-blue hover:bg-blue-50"
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                      <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      No matching inventory items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}</DialogTitle>
            <DialogDescription>
              Provide absolute stock details and prices for auditing.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-3">
            <div className="col-span-2 grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1.5">
                <Label>Item Code (SKU)</Label>
                <Input 
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="e.g. OTI001"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Item Name *</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Absorbable Suture Vicryl 3-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select 
                value={formData.category}
                onValueChange={(v: any) => setFormData({...formData, category: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Surgical Kit">Surgical Kit</SelectItem>
                  <SelectItem value="Disposable">Disposable</SelectItem>
                  <SelectItem value="Anesthesia Drug">Anesthesia Drug</SelectItem>
                  <SelectItem value="Suture">Suture</SelectItem>
                  <SelectItem value="Implant">Implant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Unit of Measure *</Label>
              <Input 
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                placeholder="e.g. Box, Vial, Kit, Pc"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Current Stock *</Label>
              <Input 
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                min="0"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Min Stock (Safety) Level</Label>
              <Input 
                type="number"
                value={formData.minStockLevel}
                onChange={(e) => setFormData({...formData, minStockLevel: parseInt(e.target.value) || 0})}
                min="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Purchase Price (₹)</Label>
              <Input 
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({...formData, purchasePrice: parseFloat(e.target.value) || 0})}
                min="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Selling Price/MRP (₹) *</Label>
              <Input 
                type="number"
                value={formData.mrp}
                onChange={(e) => setFormData({...formData, mrp: parseFloat(e.target.value) || 0})}
                min="0"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Batch Number</Label>
              <Input 
                value={formData.batchNumber}
                onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
                placeholder="e.g. BAT-1234"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input 
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
              />
            </div>

            <DialogFooter className="col-span-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-medical-blue">Save Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
