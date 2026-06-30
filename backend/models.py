"""Pydantic schemas for API I/O. Documents in Mongo are kept as dicts with string _id (UUID)."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any


# --- Auth ---
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None


# --- Super Admin: Landlords ---
class LandlordCreateIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: Optional[str] = None  # auto-generated if omitted
    plan: Optional[str] = "starter"


class LandlordUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    plan: Optional[str] = None


# --- Caretakers ---
class CaretakerPermissions(BaseModel):
    view_tenants: bool = True
    add_tenants: bool = False
    edit_tenants: bool = False
    record_payment: bool = False
    create_maintenance: bool = True
    update_maintenance: bool = False
    record_expense: bool = False
    view_accounting: bool = False
    view_reports: bool = False


class CaretakerCreateIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: Optional[str] = None
    assigned_properties: List[str] = []
    all_properties: bool = False
    permissions: CaretakerPermissions = CaretakerPermissions()


class CaretakerUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    assigned_properties: Optional[List[str]] = None
    all_properties: Optional[bool] = None
    permissions: Optional[CaretakerPermissions] = None


# --- Property ---
class PropertyIn(BaseModel):
    name: str
    type: str  # Hostel/Flats/Duplex/Self Contain/Apartment/Estate/Commercial Building
    description: Optional[str] = ""
    address: str
    state: str
    lga: Optional[str] = ""
    gps: Optional[str] = ""
    photos: List[str] = []
    active: bool = True
    num_units: Optional[int] = 0
    unit_prefix: Optional[str] = "Room"  # e.g., Room, Flat, Shop, Office


class PropertyUpdateIn(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    lga: Optional[str] = None
    gps: Optional[str] = None
    photos: Optional[List[str]] = None
    active: Optional[bool] = None


# --- Unit ---
class UnitIn(BaseModel):
    property_id: str
    name: str
    status: Optional[str] = "vacant"  # vacant/occupied/reserved


class UnitUpdateIn(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


# --- Tenant ---
class TenantIn(BaseModel):
    property_id: str
    unit_id: str
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    nin: Optional[str] = None
    home_address: Optional[str] = None
    occupation: Optional[str] = None
    workplace: Optional[str] = None
    workplace_address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    relationship: Optional[str] = None
    guarantor_name: Optional[str] = None
    guarantor_phone: Optional[str] = None
    guarantor_address: Optional[str] = None
    social_media: Optional[str] = None
    lease_start: str
    lease_expiry: str
    amount_paid: float = 0
    payment_frequency: str = "yearly"  # yearly/quarterly/monthly
    notes: Optional[str] = ""
    passport_photo: Optional[str] = None
    documents: List[Dict[str, Any]] = []
    portal_enabled: bool = False
    portal_password: Optional[str] = None


class TenantUpdateIn(BaseModel):
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    nin: Optional[str] = None
    home_address: Optional[str] = None
    occupation: Optional[str] = None
    workplace: Optional[str] = None
    workplace_address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    relationship: Optional[str] = None
    guarantor_name: Optional[str] = None
    guarantor_phone: Optional[str] = None
    guarantor_address: Optional[str] = None
    social_media: Optional[str] = None
    lease_start: Optional[str] = None
    lease_expiry: Optional[str] = None
    amount_paid: Optional[float] = None
    payment_frequency: Optional[str] = None
    notes: Optional[str] = None
    passport_photo: Optional[str] = None
    documents: Optional[List[Dict[str, Any]]] = None
    portal_enabled: Optional[bool] = None


# --- Payment ---
class PaymentIn(BaseModel):
    tenant_id: str
    amount: float
    payment_date: str
    payment_method: str
    transaction_ref: Optional[str] = None
    receipt_upload: Optional[str] = None
    outstanding_balance: float = 0
    renewal_date: Optional[str] = None
    notes: Optional[str] = ""


# --- Expense ---
class ExpenseIn(BaseModel):
    property_id: Optional[str] = None
    category: str
    vendor: Optional[str] = None
    description: Optional[str] = ""
    amount: float
    date: str
    receipt: Optional[str] = None
    payment_method: Optional[str] = None


class IncomeIn(BaseModel):
    property_id: Optional[str] = None
    source: str
    description: Optional[str] = ""
    amount: float
    date: str


# --- Maintenance ---
class MaintenanceIn(BaseModel):
    property_id: str
    unit_id: Optional[str] = None
    tenant_id: Optional[str] = None
    category: str
    priority: str  # Low/Medium/High/Emergency
    description: str
    photos: List[str] = []
    estimated_cost: Optional[float] = 0


class MaintenanceUpdateIn(BaseModel):
    category: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None
    photos: Optional[List[str]] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    status: Optional[str] = None  # Open/Assigned/In Progress/Waiting for Parts/Completed/Cancelled
    assigned_to: Optional[str] = None
    completion_date: Optional[str] = None
    notes: Optional[str] = None


# --- Announcement ---
class AnnouncementIn(BaseModel):
    title: str
    message: str
    audience: Optional[str] = "tenants"  # tenants/caretakers/all


# --- Tenant Portal ---
class TenantMaintenanceIn(BaseModel):
    category: str
    priority: str
    description: str
    photos: List[str] = []
