import { storage, STORAGE_KEYS } from '../lib/storage';

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DOCTOR' 
  | 'RECEPTIONIST' 
  | 'RECEPTION'
  | 'FRONT_DESK'
  | 'NURSE' 
  | 'LAB_STAFF' 
  | 'PHARMACIST' 
  | 'ACCOUNTANT'
  | 'ACCOUNTS'
  | 'SURGEON'
  | 'RADIOLOGIST'
  | 'PATHOLOGIST';

// Normalizes role names to handle spelling differences/upper/lower cases
export const normalizeRole = (role: string | undefined | null): string => {
  if (!role) return '';
  const r = role.toUpperCase().trim().replace(/_/g, '').replace(/ /g, '');
  if (r === 'RECEPTION' || r === 'RECEPTIONIST' || r === 'FRONTDESK') return 'RECEPTIONIST';
  if (r === 'ACCOUNTANT' || r === 'ACCOUNTS' || r === 'FINANCE') return 'ACCOUNTANT';
  if (r === 'SUPERADMIN' || r === 'ADMIN' || r === 'HOSPITALADMIN') return 'ADMIN';
  return r;
};

// Returns whether the current user role is an Admin
export const isUserAdmin = (role: string | undefined | null): boolean => {
  const norm = normalizeRole(role);
  return norm === 'ADMIN';
};

// Checks if a record was created by an admin
export const isRecordCreatedByAdmin = (record: any): boolean => {
  if (!record) return false;
  
  // Explicit flag
  if (record.created_by_admin === true || record.createdByAdmin === true) return true;
  
  // Check the role of the creator if saved
  const role = record.created_by_role || record.createdByRole;
  if (role && isUserAdmin(role)) return true;
  
  // Check the UUID/ID of the creator (if matches seeded admin)
  const creatorId = record.created_by || record.createdBy || record.issued_by || record.issuedBy;
  if (creatorId) {
    const adminUserIds = ['u-admin', 'u-admingh', 'u2', '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-b000-000000000002'];
    if (adminUserIds.includes(String(creatorId))) return true;
  }
  
  // Fallback: Check doctor or staff name if it matches "Admin"
  const creatorName = record.created_by_name || record.createdByName || record.doctor || record.doctorName || record.surgeon;
  if (creatorName && (creatorName.toLowerCase() === 'admin' || creatorName.toLowerCase() === 'admin gh')) {
    return true;
  }
  
  return false;
};

// Checks if a user has permission to edit/delete a specific record
// RULE: any data /entries made by ADMIN should not be editable by other users
export const canUserEditRecord = (record: any, currentUser: any): boolean => {
  if (!currentUser) return false;
  
  const userRole = currentUser.role;
  const isAdmin = isUserAdmin(userRole);
  
  // Admins can edit anything
  if (isAdmin) return true;
  
  // If the record was created by an Admin, and the current user is NOT an Admin, they cannot edit
  if (isRecordCreatedByAdmin(record)) {
    return false;
  }
  
  // Otherwise, they can edit/delete if their role typically permits editing in that module
  return true;
};

export const canUserModifyRecord = (record: any, currentUser: any, users?: any[]): boolean => {
  return canUserEditRecord(record, currentUser);
};

// Check if a user has access to view a specific menu
export const hasMenuAccess = (path: string, userRole: string | undefined | null): boolean => {
  const norm = normalizeRole(userRole);
  if (norm === 'ADMIN') return true; // Admins have access to everything
  
  switch (path) {
    case '/':
      return true;
    case '/emergency':
      return ['DOCTOR', 'RECEPTIONIST', 'NURSE', 'ACCOUNTANT'].includes(norm);
    case '/opd':
      return ['DOCTOR', 'RECEPTIONIST', 'NURSE', 'ACCOUNTANT'].includes(norm);
    case '/ipd':
      return ['DOCTOR', 'RECEPTIONIST', 'NURSE', 'ACCOUNTANT'].includes(norm);
    case '/ot':
      return ['DOCTOR', 'NURSE', 'SURGEON'].includes(norm);
    case '/lab':
      return ['DOCTOR', 'NURSE', 'LAB_STAFF', 'RADIOLOGIST', 'PATHOLOGIST', 'ACCOUNTANT'].includes(norm);
    case '/patient-overview':
      return ['DOCTOR', 'RECEPTIONIST', 'NURSE', 'ACCOUNTANT'].includes(norm);
    case '/maternity':
      return ['DOCTOR', 'RECEPTIONIST', 'NURSE'].includes(norm);
    case '/pharmacy':
    case '/pharmacy/pos':
      return ['PHARMACIST', 'ACCOUNTANT'].includes(norm);
    case '/billing':
      return ['ACCOUNTANT'].includes(norm);
    case '/expenses':
      return ['ACCOUNTANT'].includes(norm);
    case '/settings':
    case '/staff':
      return false; // restricted to admins only
    case '/manual':
      return true; // open to all roles
    default:
      return true;
  }
};

// Returns whether the current user role can view general financial figures and graphs
export const canUserViewFinancials = (userRole: string | undefined | null): boolean => {
  const norm = normalizeRole(userRole);
  // Only Admins and Accountants can view high-level financial figures/graphs
  return ['ADMIN', 'ACCOUNTANT'].includes(norm);
};

// Checks if specific clinical fields/forms (like prescription entry) are editable/visible
export const canUserEditClinicalData = (userRole: string | undefined | null): boolean => {
  const norm = normalizeRole(userRole);
  // Only Doctors, Nurses, and Admins can handle clinical data
  return ['ADMIN', 'DOCTOR', 'NURSE', 'SURGEON'].includes(norm);
};

// Checks if specific billing operations (refund, discount, edit invoice) are allowed
export const canUserManageBilling = (userRole: string | undefined | null): boolean => {
  const norm = normalizeRole(userRole);
  // Only Admins, Accountants, and Receptionists can collect/issue billing
  return ['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(norm);
};
