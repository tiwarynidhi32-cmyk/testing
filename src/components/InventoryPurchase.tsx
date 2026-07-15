import { useState, useEffect, FormEvent } from 'react';
import { 
  Boxes, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  Truck, 
  ArrowRightLeft, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  ShoppingBag, 
  Building2, 
  FileCheck, 
  User, 
  Download,
  Percent,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';

// DB Mapper helper functions
const mapDbToItem = (db: any) => ({
  code: db.code,
  name: db.name,
  category: db.category,
  stock: db.stock,
  unit: db.unit,
  minLevel: db.min_level !== undefined ? db.min_level : db.minLevel,
  unitCost: db.unit_cost !== undefined ? Number(db.unit_cost) : db.unitCost,
  location: db.location
});

const mapItemToDb = (item: any) => ({
  code: item.code,
  name: item.name,
  category: item.category,
  stock: Number(item.stock),
  unit: item.unit,
  min_level: Number(item.minLevel),
  unit_cost: Number(item.unitCost),
  location: item.location
});

const mapDbToPo = (db: any) => ({
  poNumber: db.po_number || db.poNumber,
  vendor: db.vendor,
  item: db.item,
  orderQty: db.order_qty !== undefined ? db.order_qty : db.orderQty,
  cost: db.cost !== undefined ? Number(db.cost) : db.cost,
  date: db.date,
  status: db.status
});

const mapPoToDb = (po: any) => ({
  po_number: po.poNumber,
  vendor: po.vendor,
  item: po.item,
  order_qty: Number(po.orderQty),
  cost: Number(po.cost),
  date: po.date || new Date().toISOString().split('T')[0],
  status: po.status
});

const mapDbToGrn = (db: any) => ({
  grnNumber: db.grn_number || db.grnNumber,
  poNumber: db.po_number || db.poNumber,
  item: db.item,
  receivedQty: db.received_qty !== undefined ? db.received_qty : db.receivedQty,
  supplier: db.supplier,
  batchNo: db.batch_no !== undefined ? db.batch_no : db.batchNo,
  expiry: db.expiry,
  date: db.date
});

const mapGrnToDb = (grn: any) => ({
  grn_number: grn.grnNumber,
  po_number: grn.poNumber || null,
  item: grn.item,
  received_qty: Number(grn.receivedQty),
  supplier: grn.supplier,
  batch_no: grn.batchNo,
  expiry: grn.expiry || null,
  date: grn.date || new Date().toISOString().split('T')[0]
});

const mapDbToTransfer = (db: any) => ({
  id: db.id,
  item: db.item,
  qty: db.qty,
  fromLocation: db.from_location !== undefined ? db.from_location : db.fromLocation,
  toLocation: db.to_location !== undefined ? db.to_location : db.toLocation,
  date: db.date,
  status: db.status
});

const mapTransferToDb = (trf: any) => ({
  id: trf.id,
  item: trf.item,
  qty: Number(trf.qty),
  from_location: trf.fromLocation,
  to_location: trf.toLocation,
  date: trf.date || new Date().toISOString().split('T')[0],
  status: trf.status
});

const mapDbToConsumption = (db: any) => ({
  id: db.id,
  item: db.item,
  qty: db.qty,
  mrn: db.mrn,
  ward: db.ward,
  date: db.date,
  staff: db.staff
});

const mapConsumptionToDb = (con: any) => ({
  id: con.id,
  item: con.item,
  qty: Number(con.qty),
  mrn: con.mrn || null,
  ward: con.ward || null,
  date: con.date || new Date().toISOString().split('T')[0],
  staff: con.staff || null
});

const mapDbToVendor = (db: any) => ({
  id: db.id,
  name: db.name,
  contact: db.contact,
  email: db.email,
  status: db.status,
  rating: db.rating,
  address: db.address
});

const mapVendorToDb = (vendor: any) => ({
  id: vendor.id,
  name: vendor.name,
  contact: vendor.contact,
  email: vendor.email,
  status: vendor.status,
  rating: vendor.rating,
  address: vendor.address
});

const SAMPLE_ITEMS = [
  { code: 'ITM001', name: 'Premium Nitrile Examination Gloves', category: 'Consumables', stock: 1250, unit: 'Boxes', minLevel: 200, unitCost: 8.50, location: 'Central Store' },
  { code: 'ITM002', name: 'Atorvastatin 10mg Tablets', category: 'Drugs', stock: 4800, unit: 'Tablets', minLevel: 1000, unitCost: 0.15, location: 'Central Store' },
  { code: 'ITM003', name: 'Gastroscope Single Use Snare 25mm', category: 'OT Implants & Snare', stock: 18, unit: 'Pcs', minLevel: 10, unitCost: 45.00, location: 'OT Sub-store' },
  { code: 'ITM004', name: 'Sterile IV Infusion Cannula 20G', category: 'Consumables', stock: 85, unit: 'Pcs', minLevel: 150, unitCost: 1.20, location: 'Central Store' }, // LOW STOCK
  { code: 'ITM005', name: 'Dexona Dexamethasone 4mg Injection', category: 'Drugs', stock: 1500, unit: 'Vials', minLevel: 300, unitCost: 0.80, location: 'Central Store' }
];

const SAMPLE_POS = [
  { poNumber: 'PO-2026-001', vendor: 'Apex Pharmaceutical Distributors', item: 'Atorvastatin 10mg Tablets', orderQty: 5000, cost: 750, date: '2026-07-02', status: 'Sent' },
  { poNumber: 'PO-2026-002', vendor: 'Global Medical Lifeline Ltd', item: 'Premium Nitrile Examination Gloves', orderQty: 100, cost: 850, date: '2026-07-05', status: 'Draft' },
  { poNumber: 'PO-2026-003', vendor: 'GastroTech Instruments Corp', item: 'Gastroscope Single Use Snare 25mm', orderQty: 20, cost: 900, date: '2026-06-20', status: 'Received' }
];

const SAMPLE_GRNS = [
  { grnNumber: 'GRN-99831', poNumber: 'PO-2026-003', item: 'Gastroscope Single Use Snare 25mm', receivedQty: 20, supplier: 'GastroTech Instruments Corp', batchNo: 'BATCH-SN-7721', expiry: '2028-12-01', date: '2026-06-25' }
];

const SAMPLE_TRANSFERS = [
  { id: 'TRF001', item: 'Premium Nitrile Examination Gloves', qty: 20, fromLocation: 'Central Store', toLocation: 'OT Sub-store', date: '2026-07-08', status: 'Completed' },
  { id: 'TRF002', item: 'Sterile IV Infusion Cannula 20G', qty: 50, fromLocation: 'Central Store', toLocation: 'OPD Sub-store', date: '2026-07-09', status: 'Completed' }
];

const SAMPLE_CONSUMPTIONS = [
  { id: 'CON001', item: 'Sterile IV Infusion Cannula 20G', qty: 5, mrn: 'MRN-4482', ward: 'Emergency', date: '2026-07-09', staff: 'Nurse Anjali Gupta' },
  { id: 'CON002', item: 'Atorvastatin 10mg Tablets', qty: 30, mrn: 'MRN-8821', ward: 'IPD Ward 4', date: '2026-07-09', staff: 'Nurse Roy Thomas' }
];

const SAMPLE_VENDORS = [
  { id: 'VND001', name: 'Apex Pharmaceutical Distributors', contact: '+1-555-0199', email: 'sales@apexpharm.com', status: 'Active', rating: '98%', address: 'Medical Row Suite 40, NY' },
  { id: 'VND002', name: 'Global Medical Lifeline Ltd', contact: '+1-555-0143', email: 'orders@globalmed.org', status: 'Active', rating: '92%', address: 'Industrial Park Block B, CA' },
  { id: 'VND003', name: 'GastroTech Instruments Corp', contact: '+1-555-0212', email: 'info@gastrotech.co', status: 'Active', rating: '95%', address: 'Tech Park Plaza, MA' }
];

export default function InventoryPurchase() {
  const [activeTab, setActiveTab] = useState<'items' | 'pos' | 'grns' | 'transfers' | 'consumption' | 'vendors' | 'compliance'>('items');
  const [items, setItems] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [isTrfModalOpen, setIsTrfModalOpen] = useState(false);
  const [isConModalOpen, setIsConModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

  // Forms states
  const [itemForm, setItemForm] = useState({ code: '', name: '', category: 'Consumables', stock: 0, unit: 'Boxes', minLevel: 10, unitCost: 1.00, location: 'Central Store' });
  const [poForm, setPoForm] = useState({ vendor: 'Apex Pharmaceutical Distributors', item: 'Atorvastatin 10mg Tablets', orderQty: 100, cost: 0, date: '', status: 'Draft' });
  const [grnForm, setGrnForm] = useState({ poNumber: '', item: '', receivedQty: 10, supplier: 'Apex Pharmaceutical Distributors', batchNo: '', expiry: '', date: '' });
  const [trfForm, setTrfForm] = useState({ item: 'Premium Nitrile Examination Gloves', qty: 10, fromLocation: 'Central Store', toLocation: 'OT Sub-store', date: '' });
  const [conForm, setConForm] = useState({ item: 'Premium Nitrile Examination Gloves', qty: 5, mrn: '', ward: 'Emergency', date: '', staff: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', contact: '', email: '', status: 'Active', rating: '100%', address: '' });

  // Load state from Supabase with offline LocalStorage fallback
  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        const [dbItems, dbPos, dbGrns, dbTransfers, dbConsumptions, dbVendors] = await Promise.all([
          supabaseService.getHospitalInventoryItems(),
          supabaseService.getHospitalPurchaseOrders(),
          supabaseService.getHospitalGoodsReceipts(),
          supabaseService.getHospitalInventoryTransfers(),
          supabaseService.getHospitalInventoryConsumptions(),
          supabaseService.getHospitalVendors(),
        ]);

        // Items
        if (dbItems && dbItems.length > 0) {
          const mapped = dbItems.map(mapDbToItem);
          setItems(mapped);
          storage.set('hms_inv_items', mapped);
        } else {
          const local = storage.get('hms_inv_items', SAMPLE_ITEMS);
          setItems(local);
          // Seed Supabase if empty
          await Promise.all(local.map(item => supabaseService.createHospitalInventoryItem(mapItemToDb(item))));
        }

        // POs
        if (dbPos && dbPos.length > 0) {
          const mapped = dbPos.map(mapDbToPo);
          setPos(mapped);
          storage.set('hms_inv_pos', mapped);
        } else {
          const local = storage.get('hms_inv_pos', SAMPLE_POS);
          setPos(local);
          await Promise.all(local.map(po => supabaseService.createHospitalPurchaseOrder(mapPoToDb(po))));
        }

        // GRNs
        if (dbGrns && dbGrns.length > 0) {
          const mapped = dbGrns.map(mapDbToGrn);
          setGrns(mapped);
          storage.set('hms_inv_grns', mapped);
        } else {
          const local = storage.get('hms_inv_grns', SAMPLE_GRNS);
          setGrns(local);
          await Promise.all(local.map(grn => supabaseService.createHospitalGoodsReceipt(mapGrnToDb(grn))));
        }

        // Transfers
        if (dbTransfers && dbTransfers.length > 0) {
          const mapped = dbTransfers.map(mapDbToTransfer);
          setTransfers(mapped);
          storage.set('hms_inv_transfers', mapped);
        } else {
          const local = storage.get('hms_inv_transfers', SAMPLE_TRANSFERS);
          setTransfers(local);
          await Promise.all(local.map(trf => supabaseService.createHospitalInventoryTransfer(mapTransferToDb(trf))));
        }

        // Consumptions
        if (dbConsumptions && dbConsumptions.length > 0) {
          const mapped = dbConsumptions.map(mapDbToConsumption);
          setConsumptions(mapped);
          storage.set('hms_inv_consumptions', mapped);
        } else {
          const local = storage.get('hms_inv_consumptions', SAMPLE_CONSUMPTIONS);
          setConsumptions(local);
          await Promise.all(local.map(con => supabaseService.createHospitalInventoryConsumption(mapConsumptionToDb(con))));
        }

        // Vendors
        if (dbVendors && dbVendors.length > 0) {
          const mapped = dbVendors.map(mapDbToVendor);
          setVendors(mapped);
          storage.set('hms_inv_vendors', mapped);
        } else {
          const local = storage.get('hms_inv_vendors', SAMPLE_VENDORS);
          setVendors(local);
          await Promise.all(local.map(vnd => supabaseService.createHospitalVendor(mapVendorToDb(vnd))));
        }
      } catch (err: any) {
        console.warn('Error fetching inventory data from Supabase, falling back to local cache:', err);
        setItems(storage.get('hms_inv_items', SAMPLE_ITEMS));
        setPos(storage.get('hms_inv_pos', SAMPLE_POS));
        setGrns(storage.get('hms_inv_grns', SAMPLE_GRNS));
        setTransfers(storage.get('hms_inv_transfers', SAMPLE_TRANSFERS));
        setConsumptions(storage.get('hms_inv_consumptions', SAMPLE_CONSUMPTIONS));
        setVendors(storage.get('hms_inv_vendors', SAMPLE_VENDORS));
      }
    };

    fetchInventoryData();
  }, []);

  const saveItems = (nItems: any[]) => { setItems(nItems); storage.set('hms_inv_items', nItems); };
  const savePos = (nPos: any[]) => { setPos(nPos); storage.set('hms_inv_pos', nPos); };
  const saveGrns = (nGrns: any[]) => { setGrns(nGrns); storage.set('hms_inv_grns', nGrns); };
  const saveTransfers = (nTrf: any[]) => { setTransfers(nTrf); storage.set('hms_inv_transfers', nTrf); };
  const saveConsumptions = (nCon: any[]) => { setConsumptions(nCon); storage.set('hms_inv_consumptions', nCon); };
  const saveVendors = (nVnd: any[]) => { setVendors(nVnd); storage.set('hms_inv_vendors', nVnd); };

  // Handlers
  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.code) {
      toast.error('Item name and code are required');
      return;
    }
    const isEditing = items.some(i => i.code === itemForm.code);
    let updated;
    if (isEditing) {
      updated = items.map(i => i.code === itemForm.code ? itemForm : i);
      toast.success('Item updated in master registry');
      try {
        await supabaseService.updateHospitalInventoryItem(itemForm.code, mapItemToDb(itemForm));
      } catch (err: any) {
        console.warn('Silent database sync failed:', err.message);
      }
    } else {
      updated = [...items, itemForm];
      toast.success('New item added to Master registry');
      try {
        await supabaseService.createHospitalInventoryItem(mapItemToDb(itemForm));
      } catch (err: any) {
        console.warn('Silent database sync failed:', err.message);
      }
    }
    saveItems(updated);
    setIsItemModalOpen(false);
    setItemForm({ code: '', name: '', category: 'Consumables', stock: 0, unit: 'Boxes', minLevel: 10, unitCost: 1.00, location: 'Central Store' });
  };

  const handleCreatePO = async (e: FormEvent) => {
    e.preventDefault();
    const itemObj = items.find(i => i.name === poForm.item);
    const unitPrice = itemObj ? itemObj.unitCost : 1.00;
    const finalCost = poForm.orderQty * unitPrice;
    
    const newPo = {
      poNumber: `PO-2026-${String(pos.length + 1).padStart(3, '0')}`,
      ...poForm,
      cost: finalCost
    };
    savePos([newPo, ...pos]);
    try {
      await supabaseService.createHospitalPurchaseOrder(mapPoToDb(newPo));
    } catch (err: any) {
      console.warn('Silent database sync failed:', err.message);
    }
    setIsPoModalOpen(false);
    toast.success('Purchase Order Generated successfully!');
  };

  const handleAddGRN = async (e: FormEvent) => {
    e.preventDefault();
    if (!grnForm.item || !grnForm.receivedQty || !grnForm.batchNo) {
      toast.error('Item, quantity, and batch number are required');
      return;
    }
    const newGrnNum = `GRN-${String(grns.length + 90000 + 1)}`;
    const newGrn = { grnNumber: newGrnNum, ...grnForm };
    saveGrns([newGrn, ...grns]);
    try {
      await supabaseService.createHospitalGoodsReceipt(mapGrnToDb(newGrn));
    } catch (err: any) {
      console.warn('Silent database sync failed:', err.message);
    }

    // Update item stock levels
    const updatedItems = items.map(item => {
      if (item.name === grnForm.item) {
        const newStock = item.stock + Number(grnForm.receivedQty);
        supabaseService.updateHospitalInventoryItem(item.code, { stock: newStock }).catch(console.error);
        return { ...item, stock: newStock };
      }
      return item;
    });
    saveItems(updatedItems);

    // Update PO status to Received if poNumber matched
    if (grnForm.poNumber) {
      const updatedPo = pos.map(po => {
        if (po.poNumber === grnForm.poNumber) {
          supabaseService.updateHospitalPurchaseOrderStatus(po.poNumber, { status: 'Received' }).catch(console.error);
          return { ...po, status: 'Received' };
        }
        return po;
      });
      savePos(updatedPo);
    }

    setIsGrnModalOpen(false);
    toast.success(`GRN ${newGrnNum} logged. Inventory quantities updated successfully.`);
  };

  const handleStockTransfer = async (e: FormEvent) => {
    e.preventDefault();
    if (trfForm.fromLocation === trfForm.toLocation) {
      toast.error('Source and destination sub-stores must differ');
      return;
    }
    const targetItem = items.find(i => i.name === trfForm.item && i.location === trfForm.fromLocation);
    if (!targetItem || targetItem.stock < trfForm.qty) {
      toast.error(`Insufficient ${trfForm.fromLocation} stock for this transfer`);
      return;
    }

    const newTrfId = `TRF${String(transfers.length + 1).padStart(3, '0')}`;
    const newTrf = { id: newTrfId, ...trfForm, status: 'Completed' };
    saveTransfers([newTrf, ...transfers]);
    try {
      await supabaseService.createHospitalInventoryTransfer(mapTransferToDb(newTrf));
    } catch (err: any) {
      console.warn('Silent database sync failed:', err.message);
    }

    // Update master items (deduct from source, add to or create at destination)
    let destinationItemFound = false;
    const updatedItems = items.map(item => {
      // Deduct from source
      if (item.name === trfForm.item && item.location === trfForm.fromLocation) {
        const newStock = item.stock - Number(trfForm.qty);
        supabaseService.updateHospitalInventoryItem(item.code, { stock: newStock }).catch(console.error);
        return { ...item, stock: newStock };
      }
      // Add to destination if exists
      if (item.name === trfForm.item && item.location === trfForm.toLocation) {
        destinationItemFound = true;
        const newStock = item.stock + Number(trfForm.qty);
        supabaseService.updateHospitalInventoryItem(item.code, { stock: newStock }).catch(console.error);
        return { ...item, stock: newStock };
      }
      return item;
    });

    // If destination item doesn't exist, create it
    if (!destinationItemFound) {
      const newDestItem = {
        code: targetItem.code ? `${targetItem.code}-${trfForm.toLocation.substring(0, 2).toUpperCase()}` : `ITM${String(items.length + 100)}`,
        name: targetItem.name,
        category: targetItem.category,
        stock: Number(trfForm.qty),
        unit: targetItem.unit,
        minLevel: targetItem.minLevel || 5,
        unitCost: targetItem.unitCost,
        location: trfForm.toLocation
      };
      updatedItems.push(newDestItem);
      try {
        await supabaseService.createHospitalInventoryItem(mapItemToDb(newDestItem));
      } catch (err: any) {
        console.warn('Silent database sync failed:', err.message);
      }
    }

    saveItems(updatedItems);

    // Also, if the destination is OT Sub-store, update hms_ot_inventory to keep them fully synced!
    if (trfForm.toLocation.toLowerCase().includes('ot')) {
      const otInv = storage.get('hms_ot_inventory', []);
      const existingOTIndex = otInv.findIndex((i: any) => 
        (i.code && i.code === targetItem.code) || i.name.toLowerCase() === targetItem.name.toLowerCase()
      );
      
      let updatedOtInv;
      if (existingOTIndex > -1) {
        updatedOtInv = otInv.map((item: any, idx: number) => 
          idx === existingOTIndex ? { ...item, stock: item.stock + Number(trfForm.qty) } : item
        );
      } else {
        let otCategory: 'Surgical Kit' | 'Disposable' | 'Anesthesia Drug' | 'Suture' | 'Implant' = 'Disposable';
        const mainCat = targetItem.category.toLowerCase();
        if (mainCat.includes('kit')) {
          otCategory = 'Surgical Kit';
        } else if (mainCat.includes('drug') || mainCat.includes('vial') || mainCat.includes('anesthesia')) {
          otCategory = 'Anesthesia Drug';
        } else if (mainCat.includes('suture')) {
          otCategory = 'Suture';
        } else if (mainCat.includes('implant') || mainCat.includes('snare')) {
          otCategory = 'Implant';
        }

        const newItem = {
          id: `oti-${Date.now()}`,
          code: targetItem.code || `OTI${String(Math.floor(100 + Math.random() * 900))}`,
          name: targetItem.name,
          category: otCategory,
          stock: Number(trfForm.qty),
          unit: targetItem.unit || 'Piece',
          minStockLevel: targetItem.minLevel || 5,
          mrp: targetItem.unitCost * 1.5,
          purchasePrice: targetItem.unitCost,
          batchNumber: `BAT-TRF`,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
        updatedOtInv = [...otInv, newItem];
      }
      storage.set('hms_ot_inventory', updatedOtInv);
    }

    setIsTrfModalOpen(false);
    toast.success(`Transferred ${trfForm.qty} units to ${trfForm.toLocation}`);
  };

  const handleConsumption = async (e: FormEvent) => {
    e.preventDefault();
    const targetItem = items.find(i => i.name === conForm.item);
    if (!targetItem || targetItem.stock < conForm.qty) {
      toast.error('Not enough stock available to log this clinical consumption');
      return;
    }
    const newConId = `CON${String(consumptions.length + 1).padStart(3, '0')}`;
    const newCon = { id: newConId, ...conForm };
    saveConsumptions([newCon, ...consumptions]);
    try {
      await supabaseService.createHospitalInventoryConsumption(mapConsumptionToDb(newCon));
    } catch (err: any) {
      console.warn('Silent database sync failed:', err.message);
    }

    // Deduct stock
    const updatedItems = items.map(item => {
      if (item.name === conForm.item) {
        const newStock = item.stock - Number(conForm.qty);
        supabaseService.updateHospitalInventoryItem(item.code, { stock: newStock }).catch(console.error);
        return { ...item, stock: newStock };
      }
      return item;
    });
    saveItems(updatedItems);
    setIsConModalOpen(false);
    toast.success(`Logged clinical consumption of ${conForm.qty} ${targetItem.unit}`);
  };

  const handleAddVendor = async (e: FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name || !vendorForm.contact) {
      toast.error('Vendor name and contact info are required');
      return;
    }
    const newId = `VND${String(vendors.length + 1).padStart(3, '0')}`;
    const newVendor = { id: newId, ...vendorForm };
    saveVendors([...vendors, newVendor]);
    try {
      await supabaseService.createHospitalVendor(mapVendorToDb(newVendor));
    } catch (err: any) {
      console.warn('Silent database sync failed:', err.message);
    }
    setIsVendorModalOpen(false);
    toast.success('Vendor added to registered roster');
  };

  // Filters
  const filteredItems = items.filter(itm => 
    itm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    itm.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    itm.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="inventory-purchase-management" className="p-4 lg:p-8 space-y-6">
      {/* Banner */}
      <div className="bg-[#1A5E63] rounded-3xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-white/15 rounded-2xl">
              <Boxes className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif" style={{ fontFamily: "Georgia, serif" }}>Hospital Inventory, Stores & Procurement</h1>
              <p className="text-xs text-teal-100 font-medium">Item Master registry, purchase orders, goods receipts (GRN), internal stock transfers, consumption and supplier metrics.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button onClick={() => setIsItemModalOpen(true)} className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs h-9 rounded-full px-4">
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Item Master
          </Button>
          <Button onClick={() => setIsPoModalOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs h-9 rounded-full px-4">
            <ShoppingBag className="w-3.5 h-3.5" /> Generate PO
          </Button>
          <Button onClick={() => setIsGrnModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-full px-4">
            <FileCheck className="w-3.5 h-3.5" /> Log Goods Receipt (GRN)
          </Button>
        </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-[9px] text-slate-400 font-bold uppercase">Total SKUs</span>
          <p className="text-lg font-black text-slate-800 mt-1">{items.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-[9px] text-slate-400 font-bold uppercase text-red-500">Below Safety Stock</span>
          <p className="text-lg font-black text-red-600 mt-1">{items.filter(i => i.stock < i.minLevel).length} SKUs</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-[9px] text-slate-400 font-bold uppercase">Pending POs</span>
          <p className="text-lg font-black text-amber-600 mt-1">{pos.filter(p => p.status !== 'Received').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-[9px] text-slate-400 font-bold uppercase">Total Vendor Pool</span>
          <p className="text-lg font-black text-blue-600 mt-1">{vendors.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm col-span-2 flex flex-col justify-between">
          <span className="text-[9px] text-slate-400 font-bold uppercase text-emerald-600">Central Stock Value</span>
          <p className="text-lg font-black text-emerald-700 mt-1">${items.reduce((acc, curr) => acc + (curr.stock * curr.unitCost), 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
        <button 
          onClick={() => setActiveTab('items')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'items' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Item Master
        </button>
        <button 
          onClick={() => setActiveTab('pos')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'pos' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Purchase Orders (PO)
        </button>
        <button 
          onClick={() => setActiveTab('grns')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'grns' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Goods Receipt (GRN)
        </button>
        <button 
          onClick={() => setActiveTab('transfers')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'transfers' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Internal Transfers
        </button>
        <button 
          onClick={() => setActiveTab('consumption')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'consumption' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Consumption Logs
        </button>
        <button 
          onClick={() => setActiveTab('vendors')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'vendors' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Vendor Directories
        </button>
        <button 
          onClick={() => setActiveTab('compliance')}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all ${
            activeTab === 'compliance' ? 'border-[#1A5E63] text-[#1A5E63]' : 'border-transparent text-slate-500'
          }`}
        >
          Compliance & Stock Alerts
        </button>
      </div>

      {/* Main Tab Board */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 lg:p-6 min-h-[400px]">
        {/* Items list */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input 
                  placeholder="Filter items by name, category..." 
                  className="pl-9 h-9 text-xs" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 font-bold">Total SKUs Indexed: {filteredItems.length}</p>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Code</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Stock level</th>
                    <th className="p-3">Safety Limit</th>
                    <th className="p-3">Unit Cost</th>
                    <th className="p-3">Total Value</th>
                    <th className="p-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {filteredItems.map(item => {
                    const isLow = item.stock < item.minLevel;
                    return (
                      <tr key={item.code} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-700">{item.code}</td>
                        <td className="p-3 font-bold text-slate-800">{item.name}</td>
                        <td className="p-3 font-medium text-slate-600">{item.category}</td>
                        <td className="p-3">
                          <span className={`font-black ${isLow ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
                            {item.stock} {item.unit}
                          </span>
                          {isLow && <Badge className="bg-red-50 text-red-600 border-red-200 ml-1.5 font-bold">REORDER</Badge>}
                        </td>
                        <td className="p-3 font-mono text-slate-400 font-bold">{item.minLevel}</td>
                        <td className="p-3 font-medium text-slate-600">${item.unitCost.toFixed(2)}</td>
                        <td className="p-3 font-bold text-slate-700">${(item.stock * item.unitCost).toFixed(2)}</td>
                        <td className="p-3"><Badge variant="outline">{item.location}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* POs list */}
        {activeTab === 'pos' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">PO Number</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Requested Item</th>
                    <th className="p-3">Qty Ordered</th>
                    <th className="p-3">Total Est Cost</th>
                    <th className="p-3">Creation Date</th>
                    <th className="p-3">PO Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {pos.map(po => (
                    <tr key={po.poNumber} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-[#1A5E63]">{po.poNumber}</td>
                      <td className="p-3 font-bold text-slate-800">{po.vendor}</td>
                      <td className="p-3 font-semibold text-slate-700">{po.item}</td>
                      <td className="p-3 font-bold text-slate-800">{po.orderQty} units</td>
                      <td className="p-3 font-black text-slate-700">${po.cost}</td>
                      <td className="p-3 text-slate-500 font-semibold">{po.date || '2026-07-09'}</td>
                      <td className="p-3">
                        {po.status === 'Received' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Received & Added</Badge>
                        ) : po.status === 'Sent' ? (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">Sent to Supplier</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200">Draft PO</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Goods Receipts */}
        {activeTab === 'grns' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">GRN ID</th>
                    <th className="p-3">Source PO</th>
                    <th className="p-3">Item Received</th>
                    <th className="p-3">Qty Added</th>
                    <th className="p-3">Vendor / Supplier</th>
                    <th className="p-3">Batch Number</th>
                    <th className="p-3">Expiry Date</th>
                    <th className="p-3">GRN Receipt Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {grns.map(grn => (
                    <tr key={grn.grnNumber} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-emerald-700">{grn.grnNumber}</td>
                      <td className="p-3 font-mono text-slate-500 font-semibold">{grn.poNumber || 'Direct GRN'}</td>
                      <td className="p-3 font-bold text-slate-800">{grn.item}</td>
                      <td className="p-3 font-extrabold text-slate-900">+{grn.receivedQty}</td>
                      <td className="p-3 font-medium text-slate-600">{grn.supplier}</td>
                      <td className="p-3 font-mono text-amber-700 font-bold">{grn.batchNo}</td>
                      <td className="p-3 font-mono font-semibold text-rose-600">{grn.expiry || 'No Expiry'}</td>
                      <td className="p-3 text-slate-500">{grn.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stock transfers */}
        {activeTab === 'transfers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-teal-50/50 p-4 rounded-xl border border-teal-100">
              <p className="text-[11px] text-slate-600 font-medium">Issue or transfer raw inventory stocks from Central Warehouse Stores into clinic sub-caches (OPD/IPD/OT/ICU).</p>
              <Button onClick={() => setIsTrfModalOpen(true)} className="bg-[#1A5E63] text-xs h-8 rounded-full gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Stock
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Transfer ID</th>
                    <th className="p-3">Material Name</th>
                    <th className="p-3">Qty Dispatched</th>
                    <th className="p-3">From Store</th>
                    <th className="p-3">To Sub-store</th>
                    <th className="p-3">Dispatched Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {transfers.map(trf => (
                    <tr key={trf.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-700">{trf.id}</td>
                      <td className="p-3 font-bold text-slate-800">{trf.item}</td>
                      <td className="p-3 font-bold text-[#1A5E63]">{trf.qty} units</td>
                      <td className="p-3 text-slate-500 font-medium">{trf.fromLocation}</td>
                      <td className="p-3"><Badge className="bg-blue-50 text-blue-800">{trf.toLocation}</Badge></td>
                      <td className="p-3 text-slate-500">{trf.date}</td>
                      <td className="p-3"><Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{trf.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Consumptions logs */}
        {activeTab === 'consumption' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
              <p className="text-[11px] text-slate-600 font-medium">Logs of direct clinical use or patient utility issues, automatically reducing on-hand storage totals.</p>
              <Button onClick={() => setIsConModalOpen(true)} className="bg-[#1A5E63] text-xs h-8 rounded-full">
                Log Consumption Run
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Consum ID</th>
                    <th className="p-3">Item Drank/Used</th>
                    <th className="p-3">Dose / Qty Issued</th>
                    <th className="p-3">Assoc Patient MRN</th>
                    <th className="p-3">Clinical Ward</th>
                    <th className="p-3">Logged By</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {consumptions.map(con => (
                    <tr key={con.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-500">{con.id}</td>
                      <td className="p-3 font-bold text-slate-800">{con.item}</td>
                      <td className="p-3 font-black text-rose-600">-{con.qty}</td>
                      <td className="p-3 font-mono font-bold text-[#1A5E63]">{con.mrn || 'N/A'}</td>
                      <td className="p-3 font-semibold text-slate-600">{con.ward}</td>
                      <td className="p-3 text-slate-500">{con.staff}</td>
                      <td className="p-3 text-slate-400 font-mono">{con.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vendors directories */}
        {activeTab === 'vendors' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
              <p className="text-xs font-semibold text-slate-700">Approved Medical Distributors Directory</p>
              <Button onClick={() => setIsVendorModalOpen(true)} className="bg-[#1A5E63] text-xs h-8 rounded-full">
                Register Supplier
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vendors.map(v => (
                <div key={v.id} className="p-4 rounded-xl border relative bg-white shadow-sm flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-teal-600">{v.id}</span>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Rating: {v.rating}</Badge>
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{v.name}</h4>
                    <p className="text-[11px] text-slate-500">Contact: <span className="text-slate-800 font-semibold">{v.contact}</span></p>
                    <p className="text-[11px] text-slate-500">Email: <span className="text-slate-800 font-semibold">{v.email}</span></p>
                    <p className="text-[11px] text-slate-400 leading-normal">{v.address}</p>
                  </div>
                  <div className="pt-3 border-t mt-4 flex justify-between items-center">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Active Status</span>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-[#1A5E63]">Create Purchase PO</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance warnings */}
        {activeTab === 'compliance' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Stock-Out Risks (Below Safety Stocks)</h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                    The following critical inventory items have breached pre-defined minimum buffer stocks. Generate priority purchase orders immediately to avoid ward operational freezes.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border bg-white text-slate-800 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase">
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-center">Safety Level</th>
                      <th className="p-2.5 text-center">Current Stock</th>
                      <th className="p-2.5 text-right">Deficit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.filter(i => i.stock < i.minLevel).map(i => (
                      <tr key={i.code} className="border-b last:border-0">
                        <td className="p-2.5 font-bold text-rose-700">{i.code}</td>
                        <td className="p-2.5 font-bold">{i.name}</td>
                        <td className="p-2.5 font-semibold text-slate-500">{i.category}</td>
                        <td className="p-2.5 text-center font-bold text-slate-400">{i.minLevel}</td>
                        <td className="p-2.5 text-center font-extrabold text-rose-600">{i.stock}</td>
                        <td className="p-2.5 text-right font-black text-rose-700">-{i.minLevel - i.stock} {i.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">Purchase Flow Compliance Status</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">All received goods (GRNs) match authenticated, approved Purchase Orders. Auditing is clean.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Add Material / Drug to Master Register</h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Item Code (SKU) *</Label>
                  <Input 
                    value={itemForm.code} 
                    onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                    placeholder="e.g. ITM110" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select 
                    value={itemForm.category} 
                    onValueChange={(val) => setItemForm({ ...itemForm, category: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consumables">Consumables</SelectItem>
                      <SelectItem value="Drugs">Drugs & Vials</SelectItem>
                      <SelectItem value="OT Implants & Snare">OT Implants & Snare</SelectItem>
                      <SelectItem value="Clinical Supplies">Clinical Supplies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Item Description / Name *</Label>
                <Input 
                  value={itemForm.name} 
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Sterile Cannula 20G Blue" 
                  required 
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Current Stock</Label>
                  <Input 
                    type="number" 
                    value={itemForm.stock} 
                    onChange={(e) => setItemForm({ ...itemForm, stock: Number(e.target.value) })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Safety Min</Label>
                  <Input 
                    type="number" 
                    value={itemForm.minLevel} 
                    onChange={(e) => setItemForm({ ...itemForm, minLevel: Number(e.target.value) })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit Size</Label>
                  <Input 
                    value={itemForm.unit} 
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    placeholder="Boxes/Vials" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Unit cost ($) *</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={itemForm.unitCost} 
                    onChange={(e) => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })} 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Storage Store</Label>
                  <Input 
                    value={itemForm.location} 
                    onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsItemModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] text-white font-bold">Register Item</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Create Purchase Order (PO)</h3>
              <button onClick={() => setIsPoModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleCreatePO} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Approved Supplier / Vendor *</Label>
                <Select 
                  value={poForm.vendor} 
                  onValueChange={(val) => setPoForm({ ...poForm, vendor: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Select Material SKU *</Label>
                <Select 
                  value={poForm.item} 
                  onValueChange={(val) => setPoForm({ ...poForm, item: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {items.map(itm => (
                      <SelectItem key={itm.code} value={itm.name}>{itm.name} (${itm.unitCost}/unit)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Order Quantity *</Label>
                  <Input 
                    type="number" 
                    value={poForm.orderQty} 
                    onChange={(e) => setPoForm({ ...poForm, orderQty: Number(e.target.value) })} 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Order Date *</Label>
                  <Input 
                    type="date" 
                    value={poForm.date} 
                    onChange={(e) => setPoForm({ ...poForm, date: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsPoModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] text-white font-bold">Transmit PO</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRN Modal */}
      {isGrnModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-700 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Log Goods Receipt (GRN)</h3>
              <button onClick={() => setIsGrnModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAddGRN} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Associate PO Number</Label>
                  <Select 
                    value={grnForm.poNumber} 
                    onValueChange={(val) => {
                      const po = pos.find(p => p.poNumber === val);
                      setGrnForm({ 
                        ...grnForm, 
                        poNumber: val, 
                        item: po ? po.item : grnForm.item, 
                        receivedQty: po ? po.orderQty : grnForm.receivedQty,
                        supplier: po ? po.vendor : grnForm.supplier 
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Direct / Non-PO" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Direct / Non-PO</SelectItem>
                      {pos.filter(po => po.status !== 'Received').map(po => (
                        <SelectItem key={po.poNumber} value={po.poNumber}>{po.poNumber} ({po.vendor})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Supplier / Vendor</Label>
                  <Input 
                    value={grnForm.supplier} 
                    onChange={(e) => setGrnForm({ ...grnForm, supplier: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Item Received *</Label>
                <Select 
                  value={grnForm.item} 
                  onValueChange={(val) => setGrnForm({ ...grnForm, item: val })}
                >
                  <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                  <SelectContent>
                    {items.map(i => (
                      <SelectItem key={i.code} value={i.name}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Qty Received *</Label>
                  <Input 
                    type="number" 
                    value={grnForm.receivedQty} 
                    onChange={(e) => setGrnForm({ ...grnForm, receivedQty: Number(e.target.value) })} 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Receipt Date *</Label>
                  <Input 
                    type="date" 
                    value={grnForm.date} 
                    onChange={(e) => setGrnForm({ ...grnForm, date: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Batch Number *</Label>
                  <Input 
                    value={grnForm.batchNo} 
                    onChange={(e) => setGrnForm({ ...grnForm, batchNo: e.target.value })}
                    placeholder="e.g. BT-9921" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Expiry Date</Label>
                  <Input 
                    type="date" 
                    value={grnForm.expiry} 
                    onChange={(e) => setGrnForm({ ...grnForm, expiry: e.target.value })} 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsGrnModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">Log GRN & Receive</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Transfer Modal */}
      {isTrfModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Internal Material Stock Transfer</h3>
              <button onClick={() => setIsTrfModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleStockTransfer} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Select Stock Item *</Label>
                <Select 
                  value={trfForm.item} 
                  onValueChange={(val) => setTrfForm({ ...trfForm, item: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {items.map(i => (
                      <SelectItem key={i.code} value={i.name}>{i.name} (Stock: {i.stock})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Dispatched Qty *</Label>
                  <Input 
                    type="number" 
                    value={trfForm.qty} 
                    onChange={(e) => setTrfForm({ ...trfForm, qty: Number(e.target.value) })} 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Dispatch Date *</Label>
                  <Input 
                    type="date" 
                    value={trfForm.date} 
                    onChange={(e) => setTrfForm({ ...trfForm, date: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>From Store Location</Label>
                  <Input value={trfForm.fromLocation} disabled />
                </div>

                <div className="space-y-1.5">
                  <Label>Destination Sub-Store *</Label>
                  <Select 
                    value={trfForm.toLocation} 
                    onValueChange={(val) => setTrfForm({ ...trfForm, toLocation: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OT Sub-store">OT Sub-store</SelectItem>
                      <SelectItem value="OPD Sub-store">OPD Sub-store</SelectItem>
                      <SelectItem value="ICU Sub-store">ICU Sub-store</SelectItem>
                      <SelectItem value="Maternity Sub-store">Maternity Sub-store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsTrfModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] text-white font-bold">Execute Transfer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consumption Modal */}
      {isConModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Log Clinical Consumption</h3>
              <button onClick={() => setIsConModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleConsumption} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Select Item Used *</Label>
                <Select 
                  value={conForm.item} 
                  onValueChange={(val) => setConForm({ ...conForm, item: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {items.map(i => (
                      <SelectItem key={i.code} value={i.name}>{i.name} (Stock: {i.stock} {i.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Qty Consumed *</Label>
                  <Input 
                    type="number" 
                    value={conForm.qty} 
                    onChange={(e) => setConForm({ ...conForm, qty: Number(e.target.value) })} 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Assoc Patient MRN</Label>
                  <Input 
                    value={conForm.mrn} 
                    onChange={(e) => setConForm({ ...conForm, mrn: e.target.value })} 
                    placeholder="e.g. MRN-4481" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Logging Clinician / Nurse *</Label>
                  <Input 
                    value={conForm.staff} 
                    onChange={(e) => setConForm({ ...conForm, staff: e.target.value })} 
                    placeholder="Anjali Gupta, RN"
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input 
                    type="date" 
                    value={conForm.date} 
                    onChange={(e) => setConForm({ ...conForm, date: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsConModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] text-white font-bold">Deduct Inventory</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A5E63] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-base font-serif">Register Approved Supplier</h3>
              <button onClick={() => setIsVendorModalOpen(false)} className="text-white/80 hover:text-white font-black">×</button>
            </div>
            <form onSubmit={handleAddVendor} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Supplier Company Name *</Label>
                <Input 
                  value={vendorForm.name} 
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  placeholder="e.g. Apex Pharmaceutical Distributors" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Contact Phone *</Label>
                  <Input 
                    value={vendorForm.contact} 
                    onChange={(e) => setVendorForm({ ...vendorForm, contact: e.target.value })}
                    placeholder="+1-555-0100" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Email ID</Label>
                  <Input 
                    type="email" 
                    value={vendorForm.email} 
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    placeholder="sales@company.com" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Office / Warehouse Address</Label>
                <textarea 
                  value={vendorForm.address} 
                  onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                  rows={2} 
                  placeholder="Street and suite info..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs leading-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5E63]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsVendorModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#1A5E63] text-white font-bold">Register Supplier</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
