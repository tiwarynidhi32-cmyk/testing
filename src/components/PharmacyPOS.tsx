import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  User, 
  CreditCard, 
  ArrowLeft,
  Printer,
  CheckCircle2,
  X,
  Loader2,
  Package,
  AlertCircle,
  ArrowRight,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { generatePharmacyInvoiceHtml, DEFAULT_PHARMACY_SETTINGS } from '@/lib/pharmacyInvoicePrint';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface CartItem {
  id: string;
  cartId?: string;
  name: string;
  price: number;
  quantity: number;
  isLoose?: boolean;
  unitsPerStrip?: number;
  taxPercentage?: number;
}

function PharmacyQuickRegisterForm({ logAudit, onRegister }: { logAudit: (action: string, id: string, details: any) => void, onRegister: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'male'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mergePatientData, setMergePatientData] = useState<{ existing: any, newDetails: any } | null>(null);

  const confirmPharmacyMergeAndContinue = async () => {
    if (!mergePatientData) return;
    const { existing, newDetails } = mergePatientData;
    setMergePatientData(null);
    setIsSubmitting(true);
    try {
      const mergedData = {
        name: existing.name,
        phone: existing.phone,
        age: Number(newDetails.age) || existing.age,
        gender: newDetails.gender || existing.gender
      };

      const result = await supabaseService.updatePatient(existing.id, mergedData);
      if (result) {
        // Save patient into the separate Quick Registration database table
        await supabaseService.createQuickRegistration({
          mrn: existing.mrn,
          name: existing.name,
          phone: existing.phone,
          age: Number(newDetails.age) || existing.age || 0,
          gender: newDetails.gender || existing.gender || 'male',
          facility: 'Pharmacy',
          status: 'Active'
        });

        logAudit('PATIENT_QUICK_REGISTER', existing.id, { name: existing.name, mrn: existing.mrn });
        toast.success(`Patient record found and merged successfully! MRN: ${existing.mrn}`);
        setFormData({ name: '', phone: '', age: '', gender: 'male' });
        onRegister();
      } else {
        toast.error('Failed to merge patient details');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error merging records');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    if (isSubmitting) return;

    // Duplicate check
    const existingPatients = storage.get(STORAGE_KEYS.PATIENTS, []);
    const trimmedNewName = (formData.name || '').trim().toLowerCase();
    const trimmedNewPhone = (formData.phone || '').trim().replace(/\D/g, '');

    // Look for EXACT name and phone match for merge
    const exactMatch = existingPatients.find((p: any) => {
      const pName = (p.name || '').trim().toLowerCase();
      const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');
      return pName === trimmedNewName && pPhone === trimmedNewPhone && trimmedNewPhone !== '';
    });

    if (exactMatch) {
      setMergePatientData({
        existing: exactMatch,
        newDetails: { ...formData }
      });
      return;
    }

    const isDuplicate = existingPatients.some((p: any) => {
      const pName = (p.name || '').trim().toLowerCase();
      const pPhone = (p.phone || p.mobile || '').trim().replace(/\D/g, '');

      const nameMatches = pName === trimmedNewName;
      const phoneMatches = trimmedNewPhone && pPhone && (trimmedNewPhone === pPhone);

      if (nameMatches && phoneMatches) return true;
      if (trimmedNewPhone && trimmedNewPhone.length >= 10 && pPhone === trimmedNewPhone) return true;
      if (nameMatches && !trimmedNewPhone && !pPhone) return true;
      return false;
    });

    if (isDuplicate) {
      toast.warning('A patient with this Name and/or Phone Number is already registered!');
      return;
    }

    setIsSubmitting(true);
    try {
      const mrn = `MRN${Math.floor(Math.random() * 90000) + 10000}`;
      
      const patientToAdd = {
        name: formData.name,
        phone: formData.phone,
        age: Number(formData.age) || 0,
        gender: formData.gender,
        mrn,
        status: 'Active',
        registration_type: 'Quick-Pharmacy'
      };

      const result = await supabaseService.createPatient(patientToAdd);
      if (result) {
        // Save patient into the separate Quick Registration database table
        await supabaseService.createQuickRegistration({
          mrn,
          name: formData.name,
          phone: formData.phone,
          age: Number(formData.age) || 0,
          gender: formData.gender,
          facility: 'Pharmacy',
          status: 'Active'
        });

        logAudit('PATIENT_QUICK_REGISTER', result.id, { name: result.name, mrn });
        toast.success(`Customer registered successfully! MRN: ${mrn}`);
        setFormData({ name: '', phone: '', age: '', gender: 'male' });
        onRegister();
      } else {
        toast.error('Failed to register customer');
      }
    } catch (error) {
      console.error('Pharmacy register customer error:', error);
      toast.error('An error occurred during registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Customer Name *</Label>
        <Input 
          placeholder="Enter name" 
          value={formData.name}
          disabled={isSubmitting}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
      </div>
      <div className="space-y-2">
        <Label>Phone Number *</Label>
        <Input 
          placeholder="Enter phone" 
          value={formData.phone}
          disabled={isSubmitting}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Age</Label>
          <Input 
            type="number" 
            placeholder="Age" 
            value={formData.age}
            disabled={isSubmitting}
            onChange={(e) => setFormData({...formData, age: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select 
            value={formData.gender}
            disabled={isSubmitting}
            onValueChange={(v) => setFormData({...formData, gender: v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button className="bg-medical-blue w-full" onClick={handleRegister} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Creating Record...
            </>
          ) : 'Create Record'}
        </Button>
      </DialogFooter>

      {/* Merge Patient Confirmation Dialog */}
      <Dialog open={!!mergePatientData} onOpenChange={(open) => { if (!open) setMergePatientData(null); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Duplicate Patient Found
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed">
              A patient named <strong className="text-slate-900">{mergePatientData?.existing?.name}</strong> with phone number <strong className="text-slate-900">{mergePatientData?.existing?.phone}</strong> is already registered (MRN: {mergePatientData?.existing?.mrn}).
            </p>
            <p className="text-xs text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-100">
              Would you like to merge the new registration details into the existing patient record? Any empty or outdated fields in the existing record will be updated.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMergePatientData(null)}>
              Cancel
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={confirmPharmacyMergeAndContinue}>
              Yes, Merge Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PharmacyPOS() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLooseOnly, setFilterLooseOnly] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('walk-in');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [billingSetupItem, setBillingSetupItem] = useState<any | null>(null);
  const [billingUnit, setBillingUnit] = useState<'strip' | 'loose'>('strip');
  const [billingQty, setBillingQty] = useState<number>(1);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [walkInDetails, setWalkInDetails] = useState({ name: '', phone: '', doctorName: '' });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<{
    items: CartItem[];
    total: number;
    subtotal: number;
    tax: number;
    patient: string;
    phone?: string;
    doctorName?: string;
    date: string;
    invoiceId: string;
  } | null>(null);

  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);

  const logAudit = (action: string, entityId: string, details: any) => {
    const logs = storage.get(STORAGE_KEYS.AUDIT_LOGS, []);
    const newLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'System',
      role: currentUser?.role || 'User',
      action,
      entityId,
      details
    };
    storage.set(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs].slice(0, 500));
  };

  const [inventory, setInventory] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);

  const [cartPulse, setCartPulse] = useState(false);
  const [isCustomLooseOpen, setIsCustomLooseOpen] = useState(false);
  const [customLooseItem, setCustomLooseItem] = useState({
    name: '',
    pricePerUnit: '',
    quantity: '1',
    unitType: 'Tablet(s)',
    taxPercent: '5',
    isSelected: false,
    isInventoryItem: false,
    itemId: undefined as string | undefined,
    unitsPerStrip: 10
  });

  const addCustomLooseToCart = () => {
    if (!customLooseItem.name.trim()) {
      toast.error('Medicine name is required');
      return;
    }
    const price = parseFloat(customLooseItem.pricePerUnit);
    if (isNaN(price) || price <= 0) {
      toast.error('Valid price per unit is required');
      return;
    }
    const qty = parseInt(customLooseItem.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Valid quantity is required');
      return;
    }
    const tax = parseFloat(customLooseItem.taxPercent) || 0;

    const isInv = customLooseItem.isInventoryItem;
    const itemId = customLooseItem.itemId;
    const unitsPerStrip = customLooseItem.unitsPerStrip;
    
    const cartItemId = isInv ? `${itemId}-loose` : `custom-loose-${Date.now()}`;
    
    setCart([...cart, {
      id: isInv ? itemId : cartItemId,
      cartId: cartItemId,
      name: isInv ? `${customLooseItem.name} (Loose)` : `${customLooseItem.name} (${customLooseItem.unitType} - Loose)`,
      price: price,
      quantity: qty,
      isLoose: true,
      unitsPerStrip: unitsPerStrip,
      taxPercentage: tax
    } as any]);

    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 300);
    toast.success(`${qty} loose units of ${customLooseItem.name} added to cart`);
    
    setCustomLooseItem({
      name: '',
      pricePerUnit: '',
      quantity: '1',
      unitType: 'Tablet(s)',
      taxPercent: '5',
      isSelected: false,
      isInventoryItem: false,
      itemId: undefined,
      unitsPerStrip: 10
    });
    setIsCustomLooseOpen(false);
  };

  const fetchData = async () => {
    setLoading(true);
    const [invData, patientsData, prescriptionsData] = await Promise.all([
      supabaseService.getPharmacyItems(),
      supabaseService.getPatients(),
      supabaseService.getPrescriptions()
    ]);
    if (invData) setInventory(invData);
    if (patientsData) setPatients(patientsData);
    if (prescriptionsData) setPrescriptions(prescriptionsData);
    setLoading(false);
  };

  useDataSync(fetchData);

  const filteredInventory = inventory.filter((item: any) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rack_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.composition || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterLooseOnly) {
      return matchesSearch && item.is_loose_sale_enabled;
    }
    return matchesSearch;
  });

  const addToCart = (item: any) => {
    if (item.stock <= 0) {
      toast.error('Out of stock');
      return;
    }
    const existing = cart.find(c => c.id === item.id && !c.cartId);
    if (existing) {
      if (existing.quantity >= item.stock) {
        toast.error(`Only ${item.stock} items in stock`);
        return;
      }
      setCart(cart.map(c => (c.id === item.id && !c.cartId) ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { 
        id: item.id, 
        name: item.name, 
        price: item.selling_price || 0, 
        quantity: 1,
        taxPercentage: item.tax_percentage || 0,
        batchNumber: item.batch_number || '',
        expiryDate: item.expiry_date || '',
        hsnCode: item.hsn_code || '',
        mrp: item.mrp || item.selling_price || 0
      } as any]);
    }
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 300);
    toast.success(`${item.name} added to cart`);
  };

  const handleItemClick = (item: any) => {
    if (item.is_loose_sale_enabled) {
      setBillingSetupItem(item);
      setBillingUnit('loose');
      setBillingQty(1);
    } else {
      addToCart(item);
    }
  };

  const addBillingSetupToCart = () => {
    if (!billingSetupItem) return;
    
    const isLoose = billingUnit === 'loose';
    const price = isLoose 
      ? (billingSetupItem.loose_selling_price || (billingSetupItem.selling_price / (billingSetupItem.units_per_strip || 10)))
      : (billingSetupItem.selling_price || 0);
    
    const qtyText = isLoose ? 'Tablet(s)' : 'Strip(s)';
    const cartItemId = `${billingSetupItem.id}-${billingUnit}`;
    
    const unitsPerStrip = billingSetupItem.units_per_strip || 10;
    const totalUnitsAvailable = (billingSetupItem.stock * unitsPerStrip) + (billingSetupItem.loose_stock || 0);
    const requestedUnits = isLoose ? billingQty : (billingQty * unitsPerStrip);
    
    if (requestedUnits > totalUnitsAvailable) {
      toast.error(`Insufficient stock! Only ${totalUnitsAvailable} total tablets left.`);
      return;
    }
    
    const existingIndex = cart.findIndex(c => c.cartId === cartItemId);
    if (existingIndex > -1) {
      const newCart = [...cart];
      const newQty = newCart[existingIndex].quantity + billingQty;
      const newRequestedUnits = isLoose ? newQty : (newQty * unitsPerStrip);
      
      if (newRequestedUnits > totalUnitsAvailable) {
        toast.error(`Cannot add. Only ${totalUnitsAvailable} total tablets left.`);
        return;
      }
      newCart[existingIndex].quantity = newQty;
      setCart(newCart);
    } else {
      setCart([...cart, {
        id: billingSetupItem.id,
        cartId: cartItemId,
        name: `${billingSetupItem.name} (${billingUnit === 'loose' ? 'Loose' : 'Strip'})`,
        price: price,
        quantity: billingQty,
        isLoose: isLoose,
        unitsPerStrip: unitsPerStrip,
        taxPercentage: billingSetupItem.tax_percentage || 0,
        batchNumber: billingSetupItem.batch_number || '',
        expiryDate: billingSetupItem.expiry_date || '',
        hsnCode: billingSetupItem.hsn_code || '',
        mrp: billingSetupItem.mrp || billingSetupItem.selling_price || 0
      } as any]);
    }
    
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 300);
    toast.success(`${billingQty} ${qtyText} of ${billingSetupItem.name} added to cart`);
    setBillingSetupItem(null);
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(cart.map(c => {
      const cId = c.cartId || c.id;
      if (cId === cartId) {
        if (c.id.startsWith('custom-loose')) {
          const newQty = c.quantity + delta;
          return newQty >= 1 ? { ...c, quantity: newQty } : c;
        }
        
        const itemInInventory = inventory.find((i: any) => i.id === c.id);
        if (!itemInInventory) return c;
        
        const unitsPerStrip = c.unitsPerStrip || itemInInventory.units_per_strip || 10;
        const totalUnitsAvailable = c.isLoose 
          ? ((itemInInventory.stock * unitsPerStrip) + (itemInInventory.loose_stock || 0))
          : itemInInventory.stock;
        
        const currentQty = c.quantity;
        const newQty = currentQty + delta;
        if (newQty < 1) return c;
        
        if (newQty > totalUnitsAvailable) {
          toast.error(`Only ${totalUnitsAvailable} ${c.isLoose ? 'tablets' : 'strips'} available in stock`);
          return c;
        }
        
        return { ...c, quantity: newQty };
      }
      return c;
    }));
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(c => (c.cartId || c.id) !== cartId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = cart.reduce((sum, item) => sum + (item.price * item.quantity * ((item as any).taxPercentage || 0) / 100), 0);
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setIsCheckoutOpen(true);
  };

  const completeSale = async () => {
    if (cart.length === 0) return;
    
    const patientName = selectedPatientId === 'walk-in' 
      ? (walkInDetails.name || 'Walk-in Customer') 
      : patients.find(p => p.id === selectedPatientId)?.name || 'Unknown';
    
    const patientPhone = selectedPatientId === 'walk-in' ? walkInDetails.phone : patients.find(p => p.id === selectedPatientId)?.phone;
    const doctorName = selectedPatientId === 'walk-in' ? walkInDetails.doctorName : 'Hospital Doctor';

    const invoice = {
      patient_id: selectedPatientId === 'walk-in' ? null : selectedPatientId,
      total_amount: total,
      paid_amount: total,
      discount_amount: 0,
      payment_status: 'Paid',
      payment_method: paymentMode,
      status: 'Settled',
      type: 'Pharmacy'
    };

    const invoiceItems = cart.map(item => ({
      item_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      category: 'PHARMACY'
    }));

    const result = await supabaseService.createInvoice(invoice, invoiceItems);
    if (result) {
      // Accumulate stock changes per item to prevent concurrency issues
      const finalItemChanges = new Map<string, { 
        newStock: number; 
        newLooseStock: number;
        hasLooseUpdate: boolean;
      }>();

      for (const item of cart) {
        const invItem = inventory.find(i => i.id === item.id);
        if (!invItem) continue;

        const unitsPerStrip = item.unitsPerStrip || invItem.units_per_strip || 10;
        
        // Retrieve current accumulated values or initialize from inventory
        const current = finalItemChanges.get(item.id) || {
          newStock: invItem.stock,
          newLooseStock: invItem.loose_stock || 0,
          hasLooseUpdate: !!invItem.is_loose_sale_enabled || !!item.isLoose
        };

        if (item.isLoose) {
          const currentTotalUnits = (current.newStock * unitsPerStrip) + current.newLooseStock;
          const remainingUnits = Math.max(0, currentTotalUnits - item.quantity);
          current.newStock = Math.floor(remainingUnits / unitsPerStrip);
          current.newLooseStock = remainingUnits % unitsPerStrip;
          current.hasLooseUpdate = true;
        } else {
          current.newStock = Math.max(0, current.newStock - item.quantity);
        }

        finalItemChanges.set(item.id, current);
      }

      // Now run database updates and log transactions
      for (const [itemId, changes] of finalItemChanges.entries()) {
        const updatePayload: any = { 
          stock: changes.newStock,
          updated_at: new Date().toISOString()
        };
        if (changes.hasLooseUpdate) {
          updatePayload.loose_stock = changes.newLooseStock;
        }

        await supabaseService.updatePharmacyItem(itemId, updatePayload);

        // Find items in cart for this itemId to log transactions
        const cartItemsForThisId = cart.filter(item => item.id === itemId);
        for (const item of cartItemsForThisId) {
          await supabaseService.logInventoryTransaction({
            item_id: item.id,
            transaction_type: 'SALE',
            quantity: -item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
            reference_id: `INV-${result.id.slice(0, 8)}`,
            performed_by: currentUser?.id,
            notes: item.isLoose ? "Loose Unit Sale" : "Standard Unit Sale"
          });
        }
      }

      setLastOrder({
        items: [...cart],
        total,
        subtotal,
        tax,
        patient: patientName,
        phone: patientPhone,
        doctorName: doctorName,
        date: new Date().toLocaleString(),
        invoiceId: result.id.slice(0, 8).toUpperCase()
      });

      logAudit('PHARMACY_SALE', result.id, { patientName, totalAmount: total, itemsCount: cart.length });
      setIsCheckoutOpen(false);
      setIsSuccessOpen(true);
      setCart([]);
      if (selectedPatientId === 'walk-in') {
        setWalkInDetails({ name: '', phone: '', doctorName: '' });
      }
      setPatientSearchTerm('');
      setSelectedPatientId('walk-in');
      fetchData(); // Refresh inventory and patients
      toast.success('Sale completed successfully');
    } else {
      toast.error('Failed to complete sale');
    }
  };

  const printReceipt = () => {
    if (!lastOrder) return;
    const hospitalInfo = storage.get<{
      name: string;
      address: string;
      phone: string;
      logo?: string | null;
    }>(STORAGE_KEYS.HOSPITAL_INFO, {
      name: 'Gastro Plus Hospital',
      address: 'Gastro Plus Hospital ,Infront of Aura Inn Bansi Road Basti',
      phone: '+91 6394517005'
    });

    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print receipt');
      return;
    }

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt - ${lastOrder.invoiceId}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 58mm; 
              padding: 5mm; 
              margin: 0;
              font-size: 11px;
              line-height: 1.2;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .header { margin-bottom: 5px; }
            .footer { margin-top: 15px; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; border-bottom: 1px solid #000; font-size: 10px; }
            .total-row { font-weight: bold; }
            img.logo { height: 40px; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header text-center">
            ${(hospitalInfo.logo && hospitalInfo.logo !== 'null' && hospitalInfo.logo !== 'undefined' && hospitalInfo.logo.trim() !== '') ? `<img src="${hospitalInfo.logo}" class="logo" />` : ''}
            <div class="bold" style="font-size: 14px;">${hospitalInfo.name}</div>
            <div style="font-size: 9px;">${hospitalInfo.address}</div>
            <div style="font-size: 9px;">Tel: ${hospitalInfo.phone}</div>
            <div class="bold" style="margin-top: 5px;">PHARMACY RECEIPT</div>
          </div>
          
          <div class="divider"></div>
          
          <div>Inv: ${lastOrder.invoiceId}</div>
          <div>Date: ${lastOrder.date}</div>
          <div>Cust: ${lastOrder.patient}</div>
          ${lastOrder.phone ? `<div>Phone: ${lastOrder.phone}</div>` : ''}
          ${lastOrder.doctorName ? `<div>Dr: ${lastOrder.doctorName}</div>` : ''}
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${lastOrder.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <div class="text-right">
            <div>Subtotal: ₹${lastOrder.subtotal.toFixed(2)}</div>
            <div>Tax: ₹${lastOrder.tax.toFixed(2)}</div>
            <div class="bold" style="font-size: 14px;">TOTAL: ₹${lastOrder.total.toFixed(2)}</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="footer text-center">
            <div>Thank You! Get Well Soon.</div>
            <div>Medicines once sold cannot be returned.</div>
            <div style="margin-top: 5px;">Powered by Gastro Plus Hospital HMS</div>
          </div>
          
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const printTaxInvoice = () => {
    if (!lastOrder) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Please allow popups to print invoice');
      return;
    }

    const patientDetails = {
      name: lastOrder.patient || 'Walk-in Customer',
      phone: lastOrder.phone || 'N/A',
      address: 'N/A',
      gstin: 'N/A'
    };

    const pharmacySettings = storage.get('hms_pharmacy_settings', DEFAULT_PHARMACY_SETTINGS);

    // Adapt lastOrder to bill format expected by the template
    const billAdapter = {
      invoiceId: lastOrder.invoiceId,
      date: lastOrder.date,
      payment_method: paymentMode || 'Cash',
      items: lastOrder.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        isLoose: item.isLoose,
        unitsPerStrip: item.unitsPerStrip,
        taxPercentage: item.taxPercentage || item.tax_percentage || 0,
        batchNumber: item.batchNumber || item.batch_number || '',
        expiryDate: item.expiryDate || item.expiry_date || '',
        hsnCode: item.hsnCode || item.hsn_code || '',
        mrp: item.mrp || item.selling_price || item.price || 0
      })),
      totalAmount: lastOrder.total
    };

    const invoiceHtml = generatePharmacyInvoiceHtml(billAdapter, inventory, patientDetails, pharmacySettings);
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 font-medium">Loading POS...</span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50">
      {/* Left Side: Inventory Selection */}
      <div className="flex-1 flex flex-col min-w-0 border-r bg-white">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/pharmacy">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Pharmacy POS</h1>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-amber-600 border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 hover:text-amber-700 h-8 font-black animate-pulse"
                onClick={() => setIsCustomLooseOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Sell Loose Medicine
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-medical-blue border-medical-blue/20 h-8"
                onClick={() => setIsPrescriptionOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Load Prescription
              </Button>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100">
                Terminal #01 - Active
              </Badge>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search medicine by name or barcode..." 
              className="pl-10 h-11 bg-slate-50 border-none rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterLooseOnly(false)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-sm ${
                !filterLooseOnly 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              All Medications
            </button>
            <button
              onClick={() => setFilterLooseOnly(true)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 border ${
                filterLooseOnly 
                  ? 'bg-amber-500 text-white border-amber-500' 
                  : 'bg-amber-50/50 hover:bg-amber-100/50 text-amber-700 border-amber-250'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              Loose Sale Available
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredInventory.map((item) => {
                const isLowStock = item.stock <= (item.min_stock_level || 10);
                const isOutOfStock = item.stock <= 0;
                
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className={`group relative h-full cursor-pointer transition-all border-slate-100 shadow-sm hover:shadow-xl hover:border-medical-blue/20 overflow-hidden ${
                        isOutOfStock ? 'opacity-60 grayscale' : ''
                      }`}
                      onClick={() => !isOutOfStock && handleItemClick(item)}
                    >
                      <div className="p-4 space-y-3 flex flex-col h-full">
                        <div className="relative h-36 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden group-hover:bg-medical-blue/5 transition-all duration-500">
                          {isOutOfStock ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px] z-10">
                              <Badge variant="destructive" className="font-black uppercase tracking-widest px-3 py-1 scale-110 shadow-lg">Out of Stock</Badge>
                            </div>
                          ) : isLowStock && (
                            <div className="absolute top-2 right-2 z-10">
                              <Badge variant="warning" className="bg-amber-100 text-amber-700 border-amber-200 font-bold px-2 py-0.5">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Low Stock
                              </Badge>
                            </div>
                          )}
                          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                             <Badge variant="outline" className="bg-white/80 backdrop-blur-sm text-[9px] font-black uppercase tracking-tighter border-slate-100 self-start">
                               {item.category || 'General'}
                             </Badge>
                             {item.is_loose_sale_enabled && (
                               <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-none text-[8px] font-black uppercase tracking-tighter text-white py-0.5 px-1.5 self-start shadow-sm">
                                 Loose Sale
                               </Badge>
                             )}
                          </div>
                          
                          <motion.div 
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="transition-transform duration-500"
                          >
                             <Package className={`w-12 h-12 text-slate-200 group-hover:text-medical-blue/40 transition-colors ${!isOutOfStock && 'group-hover:scale-110'}`} />
                          </motion.div>
                        </div>
                        
                        <div className="space-y-1 flex-1">
                          <h3 className="font-black text-slate-800 line-clamp-2 leading-[1.2] min-h-[2.4rem] text-sm group-hover:text-medical-blue transition-colors mb-0.5">
                            {item.name}
                          </h3>
                          {item.composition && (
                            <p className="text-[11px] font-semibold text-slate-400 italic line-clamp-1 mb-1" title={item.composition}>
                              {item.composition}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Rack: {item.rack_number || 'N/A'}</span>
                             <span className="text-[10px] text-slate-300">•</span>
                             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Batch: {item.batch_number || 'N/A'}</span>
                          </div>
                        </div>
 
                        <div className="flex items-end justify-between py-2 border-t border-slate-50 mt-auto">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-tight">Selling Price</span>
                            <span className="text-xl font-black text-medical-blue leading-none">{formatCurrency(item.selling_price || 0)}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-tight">In Store</span>
                            <span className={`text-xs font-black ${isLowStock ? 'text-amber-600 font-black' : 'text-emerald-600 font-black'}`}>
                              {item.stock} {item.unit || 'PCS'}
                            </span>
                            {item.is_loose_sale_enabled && (
                              <span className="text-[9px] text-amber-500 font-extrabold mt-0.5">
                                + {item.loose_stock || 0} Tablet(s)
                              </span>
                            )}
                          </div>
                        </div>
 
                        <div className="pt-1">
                          <Button 
                            className={`w-full gap-2 rounded-xl h-11 font-black shadow-sm transition-all duration-300 ${
                              isOutOfStock 
                                ? 'bg-slate-100 text-slate-300 pointer-events-none' 
                                : item.is_loose_sale_enabled
                                ? 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/20'
                                : 'bg-medical-blue text-white hover:bg-medical-blue/90 hover:shadow-lg hover:shadow-medical-blue/20'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item);
                            }}
                          >
                            <ShoppingCart className="w-4 h-4" />
                            {item.is_loose_sale_enabled ? 'Setup Billing' : 'Add to Cart'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Right Side: Cart & Checkout */}
      {/* Enhanced Sidebar: Item Cart - Significantly Wider and More Visible */}
      <motion.div 
        animate={cartPulse ? { scale: [1, 1.05, 1], x: [0, -5, 0] } : {}}
        transition={{ duration: 0.3 }}
        className="w-[480px] flex flex-col bg-white border-l border-slate-200 shadow-2xl relative z-10 transition-all duration-300"
      >
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              animate={cartPulse ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
              className="w-12 h-12 rounded-xl bg-medical-blue flex items-center justify-center text-white shadow-lg shadow-medical-blue/20"
            >
              <ShoppingCart className="w-6 h-6" />
            </motion.div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Checkout Cart</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{cart.length} Item(s) Selected</p>
            </div>
          </div>
          {cart.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-[10px] font-bold gap-1.5"
              onClick={() => setCart([])}
            >
              <Trash2 className="w-3.5 h-3.5" />
              CLEAR ALL
            </Button>
          )}
        </div>

        <div className="p-5 border-b bg-white space-y-4">
          <div className="space-y-3 relative">
            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select Patient (Name / Phone / MRN)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  placeholder="Walk-in or Search..." 
                  className="h-11 bg-slate-50 border-slate-200 pr-10 rounded-xl"
                  value={patientSearchTerm}
                  onChange={(e) => {
                    setPatientSearchTerm(e.target.value);
                    setShowPatientResults(true);
                    if (e.target.value === '') {
                      setSelectedPatientId('walk-in');
                    }
                  }}
                  onFocus={() => setShowPatientResults(true)}
                />
                <Search className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                
                {showPatientResults && patientSearchTerm.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[250px] overflow-y-auto custom-scrollbar">
                    <div 
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                      onClick={() => {
                        setSelectedPatientId('walk-in');
                        setPatientSearchTerm('');
                        setShowPatientResults(false);
                      }}
                    >
                      <span className="text-xs font-black text-slate-700">Walk-in Customer</span>
                      {selectedPatientId === 'walk-in' && <CheckCircle2 className="w-4 h-4 text-medical-blue" />}
                    </div>
                    {patients.filter((p: any) => 
                      p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
                      (p.phone || '').includes(patientSearchTerm) ||
                      (p.mrn || '').toLowerCase().includes(patientSearchTerm.toLowerCase())
                    ).map((p: any) => (
                      <div 
                        key={p.id} 
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setPatientSearchTerm(p.name);
                          setShowPatientResults(false);
                        }}
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-800">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{p.phone} • {p.mrn}</p>
                        </div>
                        {selectedPatientId === p.id && <CheckCircle2 className="w-4 h-4 text-medical-blue" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-100 rounded-xl">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Quick Pharmacy Registration</DialogTitle>
                    <DialogDescription>Create a quick record for this customer.</DialogDescription>
                  </DialogHeader>
                  <PharmacyQuickRegisterForm logAudit={logAudit} onRegister={() => fetchData()} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {selectedPatientId === 'walk-in' && (
            <div className="space-y-4 pt-4 border-t-2 border-dashed border-slate-100 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-medical-blue" />
                <span className="text-[11px] font-black uppercase tracking-widest text-medical-blue">Walk-in Details</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Customer Name</Label>
                  <Input 
                    placeholder="Full name" 
                    className="h-10 text-sm border-slate-100 focus:border-medical-blue/30 rounded-lg bg-slate-50/50"
                    value={walkInDetails.name}
                    onChange={(e) => setWalkInDetails(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Mobile No.</Label>
                  <Input 
                    placeholder="+91 00000 00000" 
                    className="h-10 text-sm border-slate-100 focus:border-medical-blue/30 rounded-lg bg-slate-50/50"
                    value={walkInDetails.phone}
                    onChange={(e) => setWalkInDetails(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Prescribing Doctor</Label>
                <Input 
                  placeholder="Dr. Name / Previous Hospital" 
                  className="h-10 text-sm border-slate-100 focus:border-medical-blue/30 rounded-lg bg-slate-50/50"
                  value={walkInDetails.doctorName}
                  onChange={(e) => setWalkInDetails(prev => ({ ...prev, doctorName: e.target.value }))}
                />
              </div>
            </div>
          )}

          {selectedPatientId !== 'walk-in' && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl animate-in fade-in slide-in-from-top-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-blue-900 text-base truncate leading-none mb-1">
                    {patients.find(p => p.id === selectedPatientId)?.name}
                  </p>
                  <p className="text-[11px] text-blue-700 font-bold uppercase tracking-tight">
                    {patients.find(p => p.id === selectedPatientId)?.mrn} • {patients.find(p => p.id === selectedPatientId)?.phone}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg"
                onClick={() => {
                  setSelectedPatientId('walk-in');
                  setPatientSearchTerm('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 bg-slate-50/50">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Items in Cart</h3>
                <Badge variant="secondary" className="bg-medical-blue/10 text-medical-blue rounded-full px-2 py-0">
                  {cart.length}
                </Badge>
              </div>
              {cart.length > 0 && (
                <Button
                  id="cancel-cart-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCart([]);
                    toast.success('Cart cleared / cancelled');
                  }}
                  className="h-7 text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg gap-1 border border-rose-100/50 px-2.5 transition-all shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cancel Cart
                </Button>
              )}
            </div>
            {cart.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <ShoppingCart className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-base font-bold text-slate-400">Your cart is empty</p>
                <p className="text-xs mt-2 text-slate-300">Select items from the inventory to get started.</p>
              </div>
            ) : (
              <div className="space-y-4 pb-10">
                <AnimatePresence initial={false}>
                  {cart.map((item) => (
                    <motion.div 
                      key={item.cartId || item.id} 
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: 50 }}
                      transition={{ duration: 0.2 }}
                      className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-medical-blue/20 relative overflow-hidden"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-800 leading-tight mb-2 group-hover:text-medical-blue transition-colors">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Rate</span>
                              <span className="text-xs font-black text-medical-blue">₹{item.price.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total</span>
                              <span className="text-xs text-slate-900 font-bold">₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg" 
                            onClick={() => removeFromCart(item.cartId || item.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <div className="flex items-center bg-slate-50/80 rounded-xl p-1 gap-2 border border-slate-100 group-hover:border-slate-200 transition-colors">
                            <button 
                              className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
                              onClick={() => updateQuantity(item.cartId || item.id, -1)}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-black text-slate-800">{item.quantity}</span>
                            <button 
                              className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 rounded-lg transition-colors text-slate-500"
                              onClick={() => updateQuantity(item.cartId || item.id, 1)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-slate-200 bg-white space-y-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-bold text-slate-500">
              <span className="uppercase tracking-widest text-[10px]">Subtotal Cost</span>
              <span className="text-slate-700">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-500">
              <span className="uppercase tracking-widest text-[10px]">Estimated Tax (5%)</span>
              <span className="text-slate-700">{formatCurrency(tax)}</span>
            </div>
            <Separator className="bg-slate-100" />
            <div className="flex justify-between items-end">
              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Grand Total</span>
              <span className="text-3xl font-black text-medical-blue tracking-tighter leading-none">{formatCurrency(total)}</span>
            </div>
          </div>
          <Button 
            className="w-full h-14 text-xl font-black bg-medical-blue hover:bg-medical-blue/90 shadow-xl shadow-medical-blue/30 rounded-2xl transition-all active:scale-[0.98]"
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            Checkout & Pay
          </Button>
        </div>
      </motion.div>

      {/* Select Medicine (Billing Setup) Dialog */}
      <Dialog open={billingSetupItem !== null} onOpenChange={(open) => !open && setBillingSetupItem(null)}>
        <DialogContent className="sm:max-w-[550px] max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-100 p-0 shadow-2xl bg-white scrollbar-thin">
          {billingSetupItem && (
            <div className="flex flex-col">
              {/* Outer Header: Select Medicine */}
              <div className="border-b border-slate-100 p-6 relative bg-white pb-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-4 top-4 h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg"
                  onClick={() => setBillingSetupItem(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
                    Select Medicine
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    Live Stock levels across overall database
                  </p>
                </div>
                
                {/* Search Bar matching mockup design */}
                <div className="mt-4 relative">
                  <Input 
                    placeholder="Filter by name, category or salt compound..." 
                    className="w-full h-11 border-slate-200 rounded-xl px-4 text-xs font-semibold text-slate-700 bg-white shadow-sm focus-visible:ring-teal-500/30 focus-visible:border-teal-500"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                  />
                  {modalSearchQuery && (
                    <div className="absolute top-12 left-0 right-0 max-h-60 overflow-y-auto bg-white border border-slate-100 rounded-2xl z-50 shadow-xl p-2 space-y-1">
                      {inventory
                        .filter((item: any) => 
                          item.is_loose_sale_enabled && (
                            item.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                            (item.composition || '').toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                            (item.category || '').toLowerCase().includes(modalSearchQuery.toLowerCase())
                          )
                        )
                        .map((item: any) => (
                          <div 
                            key={item.id}
                            onClick={() => {
                              setBillingSetupItem(item);
                              setBillingUnit('loose');
                              setBillingQty(1);
                              setModalSearchQuery('');
                            }}
                            className="p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-black text-slate-800">{item.name}</div>
                              <div className="text-[10px] text-slate-400 font-semibold">{item.composition || 'Active Ingredient'}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-black text-teal-600">₹{item.selling_price.toFixed(2)}</div>
                              <div className="text-[9px] font-bold text-slate-500">{item.stock} {item.unit || 'Strips'}</div>
                            </div>
                          </div>
                        ))
                      }
                      {inventory.filter((item: any) => 
                        item.is_loose_sale_enabled && (
                          item.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                          (item.composition || '').toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                          (item.category || '').toLowerCase().includes(modalSearchQuery.toLowerCase())
                        )
                      ).length === 0 && (
                        <div className="p-3 text-center text-xs font-bold text-slate-400">No loose medicines found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Inner Header: Billing Setup Moxikind-CV 625 */}
              <div className="px-6 py-4 border-b border-slate-10 border-dashed flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-teal-600 uppercase tracking-wider block">
                    BILLING SETUP
                  </span>
                  <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                    {billingSetupItem.name}
                  </h4>
                  <p className="text-xs font-bold text-slate-400 leading-tight">
                    {billingSetupItem.composition || 'Primary Active Salt Formulation'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 font-bold rounded-lg px-3 py-1.5 h-8 gap-1 text-xs shrink-0 self-center"
                  onClick={() => setBillingSetupItem(null)}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Button>
              </div>

              {/* Statistics Grid (Available stock metric cards) */}
              <div className="grid grid-cols-2 gap-3.5 px-6 py-3 bg-slate-50/50 border-y border-slate-100">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-150/60 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">STOCK AVAILABLE</span>
                  <div className="text-base font-black text-slate-800 mt-0.5">
                    {billingSetupItem.stock} {billingSetupItem.unit || 'Strip(s)'}
                  </div>
                  <div className="text-[9px] text-indigo-600 font-extrabold mt-1 uppercase tracking-wide">
                    Total Loose: { (billingSetupItem.stock * (billingSetupItem.units_per_strip || 10)) + (billingSetupItem.loose_stock || 0) } Tab(s)
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-150/60 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block font-bold">BATCH & EXPIRY</span>
                    <div className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                      Batch: <span className="font-mono text-slate-800 font-black">{billingSetupItem.batch_number || 'B-902'}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold mt-1">
                    Expiry: {billingSetupItem.expiry_date ? billingSetupItem.expiry_date.substring(0, 7) : '2025-08'}
                  </div>
                </div>
              </div>

              {/* Select Billing Unit Grid */}
              <div className="p-6 py-4 space-y-3.5">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">SELECT BILLING UNIT</span>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Full Strip Option */}
                  <div 
                    onClick={() => {
                      setBillingUnit('strip');
                      setBillingQty(1);
                    }}
                    className={`cursor-pointer rounded-2xl p-3.5 border-2 transition-all flex flex-col justify-between h-28 relative overflow-hidden ${
                      billingUnit === 'strip' 
                        ? 'border-teal-600 bg-teal-50/[0.12] shadow-md' 
                        : 'border-slate-100 hover:border-slate-200 bg-white shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800">Full Strip</span>
                        {billingUnit === 'strip' && (
                          <div className="w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                        ₹{billingSetupItem.selling_price.toFixed(2)} per Strip
                      </span>
                    </div>
                    <div className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider self-start">
                      CONTAINS {billingSetupItem.units_per_strip || 10} TABLETS
                    </div>
                  </div>

                  {/* Loose Tablet Option */}
                  <div 
                    onClick={() => {
                      setBillingUnit('loose');
                      setBillingQty(1);
                    }}
                    className={`cursor-pointer rounded-2xl p-3.5 border-2 transition-all flex flex-col justify-between h-28 relative overflow-hidden ${
                      billingUnit === 'loose' 
                        ? 'border-teal-600 bg-teal-50/[0.12] shadow-md' 
                        : 'border-slate-100 hover:border-slate-250 bg-white shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800">Loose Tablet</span>
                        {billingUnit === 'loose' && (
                          <div className="w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                        ₹{(billingSetupItem.loose_selling_price || (billingSetupItem.selling_price / (billingSetupItem.units_per_strip || 10))).toFixed(2)} per Unit
                      </span>
                    </div>
                    <div className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider self-start">
                      PERFECT FOR LOOSE QTY!
                    </div>
                  </div>
                </div>

                {/* Input Qty & Estimated Cost */}
                <div className="pt-2 grid grid-cols-2 gap-4 items-center">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                      ENTER BILLING QTY ({billingUnit === 'loose' ? 'TABLETS' : 'STRIPS'})
                    </span>
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="rounded-xl border-slate-200 hover:bg-slate-50 w-9 h-9 shadow-sm"
                        onClick={() => setBillingQty(prev => Math.max(1, prev - 1))}
                      >
                        <Minus className="w-3.5 h-3.5 text-slate-600" />
                      </Button>
                      <Input 
                        disabled
                        type="number" 
                        className="w-14 h-9 text-center font-black text-slate-800 border-slate-200 rounded-xl bg-white focus:ring-0 cursor-default text-xs"
                        value={billingQty}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="rounded-xl border-slate-200 hover:bg-slate-50 w-9 h-9 shadow-sm"
                        onClick={() => setBillingQty(prev => prev + 1)}
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-600" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col justify-center">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block text-right">ESTIMATED COST</span>
                    <span className="text-xl font-black text-slate-800 text-right mt-0.5 leading-none">
                      ₹{(
                        billingQty * 
                        (billingUnit === 'loose' 
                          ? (billingSetupItem.loose_selling_price || (billingSetupItem.selling_price / (billingSetupItem.units_per_strip || 10))) 
                          : billingSetupItem.selling_price)
                      ).toFixed(2)}
                    </span>
                    <span className="text-[8px] text-indigo-650 text-right mt-1 leading-tight block font-black uppercase tracking-wider">
                      DEDUCTS {billingUnit === 'loose' ? `${billingQty}` : `${billingQty * (billingSetupItem.units_per_strip || 10)}`} LOOSE UNITS
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-3xl">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 rounded-xl border-slate-200 font-bold px-5 h-12 transition-all text-slate-500"
                  onClick={() => setBillingSetupItem(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  className="flex-[1.5] rounded-xl font-black text-white px-6 h-12 border-none shadow-md bg-[#108595] hover:bg-[#0e7c8a] transition-all"
                  onClick={addBillingSetupToCart}
                >
                  Add {billingQty} {billingUnit === 'loose' ? (billingQty === 1 ? 'Tablet' : 'Tablets') : (billingQty === 1 ? 'Strip' : 'Strips')} to Bill
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>Select payment method to complete the sale.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button variant="outline" className="h-20 flex-col gap-2 border-2 hover:border-medical-blue hover:bg-medical-blue/5">
              <CreditCard className="w-6 h-6" />
              Cash
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 border-2 hover:border-medical-blue hover:bg-medical-blue/5">
              <CreditCard className="w-6 h-6" />
              Card
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 border-2 hover:border-medical-blue hover:bg-medical-blue/5">
              <CreditCard className="w-6 h-6" />
              UPI / QR
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 border-2 hover:border-medical-blue hover:bg-medical-blue/5">
              <User className="w-6 h-6" />
              Credit
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
            <Button className="bg-medical-blue" onClick={completeSale}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground">Invoice #{lastOrder?.invoiceId} has been generated.</p>
            </div>
            <div className="w-full flex flex-col gap-2 pt-4">
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-grow gap-1.5 text-xs h-9 justify-center items-center" onClick={printReceipt}>
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </Button>
                <Button variant="outline" className="flex-grow gap-1.5 text-xs h-9 justify-center items-center border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={printTaxInvoice}>
                  <Printer className="w-3.5 h-3.5" />
                  Print Tax Bill
                </Button>
              </div>
              <Button className="w-full bg-medical-blue h-9 text-xs" onClick={() => setIsSuccessOpen(false)}>
                New Sale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Dialog */}
      <Dialog open={isPrescriptionOpen} onOpenChange={setIsPrescriptionOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Load from Prescription</DialogTitle>
            <DialogDescription>Select a recent prescription to auto-populate the cart.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              {prescriptions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl border-slate-100 italic text-slate-400">
                  No active prescriptions found.
                </div>
              ) : (
                prescriptions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((p: any) => (
                  <Card key={p.id} className="hover:border-medical-blue/50 cursor-pointer transition-all hover:bg-slate-50/50 group" onClick={() => {
                    const patientId = p.patient_id;
                    setSelectedPatientId(patientId);
                    
                    // Add items to cart
                    const itemsToCart: any[] = [];
                    p.medications?.forEach((med: any) => {
                      // Try to find the item in inventory
                      const invItem = inventory.find(i => 
                        i.name.toLowerCase().includes(med.name.toLowerCase()) || 
                        med.name.toLowerCase().includes(i.name.toLowerCase())
                      );
                      
                      if (invItem && invItem.stock > 0) {
                        itemsToCart.push({
                          id: invItem.id,
                          name: invItem.name,
                          price: invItem.selling_price || 0,
                          quantity: 1, // Default to 1, can be adjusted in cart
                          taxPercentage: invItem.tax_percentage || 0
                        });
                      }
                    });

                    if (itemsToCart.length > 0) {
                      setCart([...cart, ...itemsToCart]);
                      toast.success(`Loaded ${itemsToCart.length} items from prescription`);
                    } else {
                      toast.warning('Found medicines but none are currently in stock');
                    }
                    setIsPrescriptionOpen(false);
                  }}>
                    <CardHeader className="p-4 pb-2">
                       <div className="flex justify-between items-start">
                         <div>
                            <CardTitle className="text-base">{p.patients?.name || 'Walk-in'}</CardTitle>
                            <CardDescription className="text-[10px]">MRN: {p.patients?.mrn} • Dr. {p.doctor_name || 'Medical Team'}</CardDescription>
                         </div>
                         <Badge variant="outline" className="text-[9px] font-black">{formatDate(p.created_at)}</Badge>
                       </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                       <div className="flex flex-wrap gap-1 mt-2">
                          {p.medications?.map((m: any, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[9px] bg-slate-100 text-slate-600 border-none px-2 py-0.5">
                              {m.name} {m.dosage && `(${m.dosage})`}
                            </Badge>
                          ))}
                       </div>
                       <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity text-medical-blue text-[10px] font-bold flex items-center justify-end gap-1">
                          Apply to Cart <ArrowRight className="w-4 h-4" />
                       </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
          <DialogFooter className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end">
            <Button variant="outline" className="rounded-xl font-bold px-5" onClick={() => setIsPrescriptionOpen(false)}>
              Cancel / Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Loose Medicine Entry Dialog */}
      <Dialog open={isCustomLooseOpen} onOpenChange={setIsCustomLooseOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-100 p-0 shadow-2xl bg-white">
          <div className="flex flex-col">
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-6 border-b border-slate-100 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4 h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg"
                onClick={() => setIsCustomLooseOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
              <div>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50/80 px-2.5 py-1 rounded-full">
                  Manual Entry
                </span>
                <DialogTitle className="text-xl font-black text-slate-800 mt-2">Sell Loose / Custom Medicine</DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-1">
                  Enter details to directly sell loose or custom medicines not listed in inventory.
                </DialogDescription>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Quick Select of medicines enabled for loose sale */}
              {inventory.filter((item: any) => item.is_loose_sale_enabled).length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quick Select: Active Loose Stock</Label>
                  <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    {inventory
                      .filter((item: any) => item.is_loose_sale_enabled)
                      .map((item: any) => {
                        const calculatedPrice = item.loose_selling_price || (item.selling_price / (item.units_per_strip || 10));
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setCustomLooseItem({
                                name: item.name,
                                pricePerUnit: calculatedPrice.toFixed(2),
                                quantity: '1',
                                unitType: item.unit && (item.unit.toLowerCase().includes('strip') || item.unit.toLowerCase().includes('box')) ? 'Tablet(s)' : item.unit || 'Tablet(s)',
                                taxPercent: String(item.tax_percentage || 0),
                                isInventoryItem: true,
                                itemId: item.id,
                                unitsPerStrip: item.units_per_strip || 10,
                                isSelected: true
                              });
                            }}
                            className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 ${
                              customLooseItem.itemId === item.id
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {item.name} (₹{calculatedPrice.toFixed(2)})
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 relative">
                <Label htmlFor="custom-med-name" className="text-xs font-bold text-slate-600">Medicine Name *</Label>
                <Input 
                  id="custom-med-name"
                  placeholder="Type to search or enter custom name..."
                  value={customLooseItem.name}
                  onChange={(e) => setCustomLooseItem({
                    ...customLooseItem, 
                    name: e.target.value,
                    isSelected: false,
                    isInventoryItem: false,
                    itemId: undefined,
                    unitsPerStrip: 10
                  })}
                  className="rounded-xl border-slate-200/80 h-10 focus:ring-amber-500/30 focus:border-amber-500 placeholder:text-xs"
                />

                {customLooseItem.name && !customLooseItem.isSelected && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[180px] overflow-y-auto p-2 space-y-1">
                    {inventory
                      .filter((item: any) => item.name.toLowerCase().includes(customLooseItem.name.toLowerCase()))
                      .map((item: any) => {
                        const calculatedPrice = item.loose_selling_price || (item.selling_price / (item.units_per_strip || 10));
                        return (
                          <div
                            key={item.id}
                            className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex justify-between items-center"
                            onClick={() => {
                              setCustomLooseItem({
                                name: item.name,
                                pricePerUnit: calculatedPrice.toFixed(2),
                                quantity: '1',
                                unitType: item.unit && (item.unit.toLowerCase().includes('strip') || item.unit.toLowerCase().includes('box')) ? 'Tablet(s)' : item.unit || 'Tablet(s)',
                                taxPercent: String(item.tax_percentage || 0),
                                isInventoryItem: true,
                                itemId: item.id,
                                unitsPerStrip: item.units_per_strip || 10,
                                isSelected: true
                              });
                            }}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{item.name}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">
                                {item.is_loose_sale_enabled ? '✓ Loose configured' : 'Standard medicine (will calculate loose rate)'}
                              </p>
                            </div>
                            <p className="text-xs font-black text-amber-600">₹{calculatedPrice.toFixed(2)}/unit</p>
                          </div>
                        );
                      })}
                    {inventory.filter((item: any) => item.name.toLowerCase().includes(customLooseItem.name.toLowerCase())).length === 0 && (
                      <div className="p-2 text-center text-xs font-bold text-slate-400">Press enter or tab to use custom name</div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-med-unit" className="text-xs font-bold text-slate-600">Unit Type</Label>
                  <Select 
                    value={customLooseItem.unitType}
                    onValueChange={(val) => setCustomLooseItem({...customLooseItem, unitType: val})}
                  >
                    <SelectTrigger id="custom-med-unit" className="rounded-xl border-slate-200/80 h-10">
                      <SelectValue placeholder="Select unit type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tablet(s)">Tablet(s)</SelectItem>
                      <SelectItem value="Capsule(s)">Capsule(s)</SelectItem>
                      <SelectItem value="Vial(s)">Vial(s)</SelectItem>
                      <SelectItem value="Ampoule(s)">Ampoule(s)</SelectItem>
                      <SelectItem value="Spoon(s)">Spoon(s)</SelectItem>
                      <SelectItem value="Unit(s)">Loose Unit(s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="custom-med-tax" className="text-xs font-bold text-slate-600">Tax Percentage (%)</Label>
                  <Select 
                    value={customLooseItem.taxPercent}
                    onValueChange={(val) => setCustomLooseItem({...customLooseItem, taxPercent: val})}
                  >
                    <SelectTrigger id="custom-med-tax" className="rounded-xl border-slate-200/80 h-10">
                      <SelectValue placeholder="Tax Percentage" />
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
                <div className="space-y-1.5">
                  <Label htmlFor="custom-med-price" className="text-xs font-bold text-slate-600">Price per Unit (₹) *</Label>
                  <Input 
                    id="custom-med-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={customLooseItem.pricePerUnit}
                    onChange={(e) => setCustomLooseItem({...customLooseItem, pricePerUnit: e.target.value})}
                    className="rounded-xl border-slate-200/80 h-10 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="custom-med-qty" className="text-xs font-bold text-slate-600">Quantity to Sell *</Label>
                  <Input 
                    id="custom-med-qty"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={customLooseItem.quantity}
                    onChange={(e) => setCustomLooseItem({...customLooseItem, quantity: e.target.value})}
                    className="rounded-xl border-slate-200/80 h-10 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              {customLooseItem.name && customLooseItem.pricePerUnit && customLooseItem.quantity && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex justify-between items-center mt-2 animate-in fade-in duration-200">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Subtotal</span>
                    <span className="text-xs text-slate-600 mt-0.5">
                      {customLooseItem.quantity} x ₹{parseFloat(customLooseItem.pricePerUnit).toFixed(2)} ({customLooseItem.unitType})
                    </span>
                  </div>
                  <span className="text-xl font-black text-amber-600">
                    ₹{(parseFloat(customLooseItem.pricePerUnit) * parseInt(customLooseItem.quantity) || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="bg-slate-50/50 p-6 border-t border-slate-100 flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCustomLooseOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black gap-2"
                onClick={addCustomLooseToCart}
              >
                <ShoppingCart className="w-4 h-4" />
                Add Loose Item to Cart
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
