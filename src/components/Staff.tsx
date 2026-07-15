import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone,
  Edit, 
  Trash2, 
  Download,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { canUserModifyRecord, normalizeRole } from '@/utils/rbac';

export default function Staff() {
  const currentUser = storage.get(STORAGE_KEYS.SESSION_USER, null);
  const isAccountant = normalizeRole(currentUser?.role) === 'ACCOUNTANT';
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [newStaff, setNewStaff] = useState({ name: '', role: 'doctor', department: '', email: '', phone: '', specialty: '', consultationFee: '' });

  const isDoctorOrSurgeon = (role: string) => {
    const r = (role || '').toUpperCase();
    return r.includes('DOCTOR') || r.includes('SURGEON');
  };

  const mapDbRoleToFormRole = (dbRole: string): string => {
    if (!dbRole) return 'doctor';
    const r = dbRole.toUpperCase().trim();
    if (r === 'RECEPTIONIST') return 'reception';
    if (r === 'LAB_TECHNICIAN') return 'lab_staff';
    return r.toLowerCase();
  };

  const mapFormRoleToDbRole = (formRole: string): string => {
    if (!formRole) return 'DOCTOR';
    const r = formRole.toLowerCase().trim();
    if (r === 'reception') return 'RECEPTIONIST';
    if (r === 'lab_staff') return 'LAB_TECHNICIAN';
    return r.toUpperCase().replace(' ', '_');
  };

  const fetchData = async () => {
    const isInitial = staff.length === 0;
    if (isInitial) {
      setLoading(true);
    }
    const data = await supabaseService.getStaff();
    if (data) setStaff(data);
    setLoading(false);
  };

  useDataSync(fetchData);

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email) {
      toast.error('Please fill in required fields');
      return;
    }
    const staffToAdd = {
      name: newStaff.name,
      email: newStaff.email,
      role: mapFormRoleToDbRole(newStaff.role),
      department: newStaff.department,
      specialization: newStaff.specialty,
      consultationFee: isDoctorOrSurgeon(newStaff.role) && newStaff.consultationFee ? Number(newStaff.consultationFee) : 0,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newStaff.name}`
    };

    const result = await supabaseService.createStaff(staffToAdd);
    if (result) {
      toast.success('New staff member added');
      setIsAddOpen(false);
      setNewStaff({ name: '', role: 'doctor', department: '', email: '', phone: '', specialty: '', consultationFee: '' });
      fetchData();
    } else {
      toast.error('Failed to add staff member');
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff.name || !editingStaff.email) {
      toast.error('Please fill in required fields');
      return;
    }
    const updates = {
      name: editingStaff.name,
      email: editingStaff.email,
      role: mapFormRoleToDbRole(editingStaff.role),
      department: editingStaff.department,
      specialization: editingStaff.specialty,
      consultationFee: isDoctorOrSurgeon(editingStaff.role) && editingStaff.consultationFee ? Number(editingStaff.consultationFee) : 0,
      avatar: editingStaff.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${editingStaff.name}`,
      degree: editingStaff.degree || '',
      password: editingStaff.password || '',
      phone: editingStaff.phone || null
    };

    const result = await supabaseService.updateStaff(editingStaff.id, updates);
    if (result) {
      toast.success('Staff member updated');
      setIsEditOpen(false);
      setEditingStaff(null);
      fetchData();
    } else {
      toast.error('Failed to update staff member');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const roleUpper = (currentUser?.role || '').toUpperCase();
    if (roleUpper === 'RECEPTIONIST' || roleUpper === 'RECEPTION' || roleUpper === 'FRONT_DESK' || roleUpper === 'DOCTOR' || roleUpper === 'SURGEON' || roleUpper === 'ACCOUNTANT' || roleUpper === 'ACCOUNTS') {
      toast.error('Deletion of staff members is restricted for Front Office, Doctor, and Accountant roles.');
      return;
    }
    const member = staff.find(s => s.id === id);
    if (member && !canUserModifyRecord(member, currentUser, staff)) {
      toast.error("Access Denied: This staff profile was created by an Admin and cannot be deleted by non-admin users.");
      return;
    }
    if (confirm('Are you sure you want to remove this staff member?')) {
      const result = await supabaseService.deleteStaff(id);
      if (result) {
        toast.success('Staff member removed');
        fetchData();
      } else {
        toast.error('Failed to remove staff member');
      }
    }
  };

  const handleExportStaff = () => {
    const headers = ['Name', 'Role', 'Department', 'Email'];
    const rows = staff.map(s => [
      s.name,
      s.role,
      s.department || 'N/A',
      s.email
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'staff_directory.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Staff directory exported');
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = {
    total: staff.length,
    doctors: staff.filter(s => s.role.includes('DOCTOR') || s.role.includes('SURGEON')).length,
    nurses: staff.filter(s => s.role.includes('NURSE')).length,
    others: staff.filter(s => !s.role.includes('DOCTOR') && !s.role.includes('SURGEON') && !s.role.includes('NURSE')).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-2 font-medium">Loading Staff Directory...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-sm text-slate-900" style={{ background: 'linear-gradient(135deg, #FFD1A9, #FFE5C9, #FFF3E5)', borderColor: '#F5CBB0' }}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#5A2D1B]">Staff Management</h1>
          <p className="text-[#8A563F] font-semibold text-sm">Manage hospital employees, roles, and access permissions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-white/80 border-[#5A2D1B]/25 text-[#5A2D1B] hover:bg-white font-bold" onClick={handleExportStaff}>
            <Download className="w-4 h-4 text-[#5A2D1B]" />
            Export Directory
          </Button>
          {!isAccountant && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1A5E63] hover:bg-[#154c50] text-white gap-2 font-bold" onClick={() => setIsAddOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Add New Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>Register a new staff member in the system.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input 
                      placeholder="Enter name" 
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select 
                      value={newStaff.role}
                      onValueChange={(v) => setNewStaff({...newStaff, role: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">super_admin</SelectItem>
                        <SelectItem value="doctor">doctor</SelectItem>
                        <SelectItem value="surgeon">surgeon</SelectItem>
                        <SelectItem value="nurse">nurse</SelectItem>
                        <SelectItem value="reception">reception</SelectItem>
                        <SelectItem value="pharmacist">pharmacist</SelectItem>
                        <SelectItem value="lab_staff">lab_staff</SelectItem>
                        <SelectItem value="accountant">accountant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input 
                      placeholder="e.g. Cardiology" 
                      value={newStaff.department}
                      onChange={(e) => setNewStaff({...newStaff, department: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specialty</Label>
                    <Input 
                      placeholder="e.g. Pediatrics" 
                      value={newStaff.specialty}
                      onChange={(e) => setNewStaff({...newStaff, specialty: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email" 
                      placeholder="email@hospital.com" 
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    />
                  </div>
                  {isDoctorOrSurgeon(newStaff.role) && (
                    <div className="space-y-2">
                      <Label>Consultation Fee (₹)</Label>
                      <Input 
                        type="number" 
                        placeholder="e.g. 500" 
                        value={newStaff.consultationFee}
                        onChange={(e) => setNewStaff({...newStaff, consultationFee: e.target.value})}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button className="bg-medical-blue" onClick={handleAddStaff}>Add Staff</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Staff</p>
            <h3 className="text-xl font-bold">{stats.total}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Doctors</p>
            <h3 className="text-xl font-bold text-blue-600">{stats.doctors}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Nurses</p>
            <h3 className="text-xl font-bold text-teal-600">{stats.nurses}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Admin/Support</p>
            <h3 className="text-xl font-bold text-slate-600">{stats.others}</h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Employee Directory</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search employee..." 
                className="pl-10 bg-slate-50 border-none h-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 font-medium">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="whitespace-nowrap">Employee</TableHead>
                  <TableHead className="whitespace-nowrap">Role & Dept</TableHead>
                  <TableHead className="whitespace-nowrap">Contact</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length > 0 ? filteredStaff.map((user) => (
                  <TableRow key={user.id} className="border-slate-50 transition-colors hover:bg-slate-50/50">
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-slate-100">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-medical-blue/10 text-medical-blue font-bold">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm text-slate-800">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground">EMP-{user.id.substring(0, 6).toUpperCase()}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <Badge variant="outline" className="w-fit text-[10px] font-bold uppercase tracking-tight mb-1 bg-white">
                          {user.role.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{user.department || 'Administration'}</span>
                        {(user.role?.toUpperCase().includes('DOCTOR') || user.role?.toUpperCase().includes('SURGEON')) && (
                          <span className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                            Consultation: ₹{user.consultationFee ?? user.consultation_fee ?? 0}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        {!isAccountant && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-medical-blue/10 hover:text-medical-blue" 
                            onClick={() => {
                              try {
                                setEditingStaff({
                                  ...user,
                                  role: mapDbRoleToFormRole(user.role),
                                  specialty: user.specialization || '',
                                  consultationFee: user.consultationFee !== undefined && user.consultationFee !== null 
                                    ? String(user.consultationFee) 
                                    : (user.consultation_fee !== undefined && user.consultation_fee !== null ? String(user.consultation_fee) : '')
                                });
                                setIsEditOpen(true);
                              } catch (err) {
                                console.error('Error opening edit staff details:', err);
                              }
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {!isAccountant && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteStaff(user.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No employees found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Staff Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Employee Details</DialogTitle>
            <DialogDescription>Modify information for {editingStaff?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                placeholder="Enter name" 
                value={editingStaff?.name || ''}
                onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select 
                value={editingStaff?.role || 'doctor'}
                onValueChange={(v) => setEditingStaff({...editingStaff, role: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="surgeon">Surgeon</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="reception">Receptionist</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="lab_staff">Lab Staff</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input 
                placeholder="e.g. Cardiology" 
                value={editingStaff?.department || ''}
                onChange={(e) => setEditingStaff({...editingStaff, department: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Specialty</Label>
              <Input 
                placeholder="e.g. Pediatrics" 
                value={editingStaff?.specialty || ''}
                onChange={(e) => setEditingStaff({...editingStaff, specialty: e.target.value})}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                placeholder="email@hospital.com" 
                value={editingStaff?.email || ''}
                onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})}
              />
            </div>
            {isDoctorOrSurgeon(editingStaff?.role) && (
              <div className="space-y-2 col-span-2">
                <Label>Consultation Fee (₹)</Label>
                <Input 
                  type="number" 
                  placeholder="e.g. 500" 
                  value={editingStaff?.consultationFee || ''}
                  onChange={(e) => setEditingStaff({...editingStaff, consultationFee: e.target.value})}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="bg-medical-blue" onClick={handleUpdateStaff}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
