// ===================================
// Shared Types for the Application
// ===================================

// User Types
export interface User {
  id: string
  email: string
  user_metadata?: {
    name?: string
    [key: string]: any
  }
}

// Document Types
export interface UploadedDocumentInfo {
  requirement_key: string
  title: string
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_at: string
}

export interface UploadedDocuments {
  documents: UploadedDocumentInfo[]
  customer_type: 'individual' | 'business'
  notes?: string
  documents_deleted?: boolean
  deleted_at?: string
  /** Optional custom documents (up to 10) added by client in addition to required docs */
  other_documents?: UploadedDocumentInfo[]
}

// Country Types
export interface Country {
  id: string
  name: string
  country_code: string
  regulator?: string
  requirements?: CountryRequirements
}

export interface CountryRequirements {
  number_allocation?: {
    end_user_documentation?: {
      individual?: string[]
      business?: string[]
    }
    address_requirements?: string
  }
  sub_allocation?: {
    allowed?: boolean
    rules?: string
  }
  number_porting?: {
    end_user_documentation?: {
      individual?: string[]
      business?: string[]
    }
    process_notes?: string
  }
}

// Number Types
export interface PhoneNumber {
  id: string
  number?: string
  available_numbers?: number
  number_type: string
  sms_capability: string
  direction: string
  mrc: number
  nrc: number
  currency: string
  moq: number
  is_available: boolean
  country_id: string
  country_name?: string
  country_code?: string
  supplier?: string
  specification?: string
  bill_pulse?: string
  requirements_text?: string
  other_charges?: OtherCharges
  features?: Features
  /** Supplier rate (admin only) */
  supplier_mrc?: number | null
  supplier_nrc?: number | null
  supplier_currency?: string | null
  /** Supplier-side fees (admin only); same keys as OtherCharges */
  supplier_other_charges?: OtherCharges
}

export interface OtherCharges {
  inbound_call?: number | null
  outbound_call_fixed?: number | null
  outbound_call_mobile?: number | null
  inbound_sms?: number | null
  outbound_sms?: number | null
  other_fees?: number | null
}

export interface Features {
  voice?: string
  sms?: string
  reach?: string
  emergency_services?: string
}

// Order Types
export type OrderStatus = 'pending' | 'granted' | 'rejected'

export interface Order {
  id: string
  customer_id: string
  number_id: string
  quantity: number
  status: OrderStatus
  mrc_at_order: number
  nrc_at_order: number
  currency_at_order: string
  created_at: string
  granted_at?: string | null
  rejected_at?: string | null
  rejected_reason?: string | null
  admin_notes?: string | null
  uploaded_documents?: UploadedDocuments | null
  // Joined fields
  customer_name?: string
  customer_email?: string
  country_name?: string
  number_type?: string
  sms_capability?: string
  direction?: string
  moq?: number
}

// Customer Types
export interface Customer {
  id: string
  user_id: string
  email: string
  name: string
  created_at?: string
}

// Admin Types
export interface AdminUser {
  id: string
  user_id: string
  email: string
  name?: string
  role: 'admin' | 'super_admin' | 'support'
  is_active: boolean
  last_login_at?: string
  created_at?: string
}

// Signup Request Types
export type SignupStatus = 'pending' | 'approved' | 'rejected'

export interface SignupRequest {
  id: string
  email: string
  name: string
  message: string
  status: SignupStatus
  created_at: string
  approved_at?: string
  approved_by?: string
  rejected_reason?: string
}

// Admin Settings Types
export interface AdminSettings {
  notification_email: string
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

// Form Types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  validation?: {
    min?: number
    max?: number
    pattern?: RegExp
    message?: string
  }
}

// Table Types
export interface TableColumn<T = any> {
  key: keyof T | string
  header: string
  align?: 'left' | 'center' | 'right'
  width?: string
  render?: (value: any, row: T) => React.ReactNode
  sortable?: boolean
}

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface PaginationConfig {
  page: number
  pageSize: number
  total: number
}

// Filter Types
export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  field: string
  label: string
  type: 'select' | 'search' | 'date' | 'range'
  options?: FilterOption[]
}

// Navigation Types
export interface NavItem {
  label: string
  href: string
  icon?: React.ReactNode
  badge?: string | number
  children?: NavItem[]
}

// Modal Types
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

