/**
 * Shared API response types for frontend consumption.
 * Import these in components to get type-safe fetch responses.
 */

// ─── Base ────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Users ───────────────────────────────────────────────────────

export interface UserBasic {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
}

export interface UserFull extends UserBasic {
  plan_id: string | null;
  address: string | null;
  customer_type: string | null;
  company_name: string | null;
  vat_number: string | null;
  business_city: string | null;
  business_postal_code: string | null;
  communication_email: string | null;
  notes: string | null;
  custom_price: number | null;
  plan_duration_days: number | null;
  needs_support: boolean;
  subscription_active: boolean;
  subscription_status: string | null;
  initial_camera_count: number;
  camera_count: number;
  has_pending_support: boolean;
  subscription: SubscriptionInfo | null;
  latest_payment: LatestPayment | null;
}

export interface SubscriptionInfo {
  status: string;
  amount: number;
  next_billing_date: string | null;
  last_billing_date: string | null;
  billing_cycle: string;
}

export interface LatestPayment {
  amount: number;
  status: string;
  paid_at: string | null;
  payment_type: string;
}

export interface GetUsersResponse {
  success: boolean;
  users: UserFull[];
}

// ─── Cameras ─────────────────────────────────────────────────────

export interface Camera {
  id: string;
  name: string;
  rtsp_url: string;
  user_id: string;
  mini_pc_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserCamerasResponse {
  cameras: Camera[];
  isSubscriptionActive: boolean;
  connectionType: string | null;
}

// ─── VOD ─────────────────────────────────────────────────────────

export interface VodFile {
  id: string;
  camera_id: string;
  file_path: string;
  file_size: number | null;
  timestamp: string;
  duration_seconds: number | null;
}

// ─── Payments ────────────────────────────────────────────────────

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_type: string;
  paid_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

// ─── Health ──────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  latencyMs: number;
  checks: {
    database: "ok" | "error";
    env: string;
  };
}

// ─── System Stats ────────────────────────────────────────────────

export interface SystemStatsResponse {
  success: boolean;
  data: {
    totalUsers: number;
    totalCameras: number;
    totalVodFiles: number;
    totalAlerts: number;
    activeSubscriptions: number;
    activeRecurringPayments: number;
    filesLast30Days: number;
    users: Array<{
      id: string;
      full_name: string;
      email: string;
      cameraCount: number;
      vodFileCount: number;
      hasActiveSubscription: boolean;
    }>;
  };
}
