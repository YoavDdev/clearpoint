import { z } from "zod";

// ─── Admin: Create User ─────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().email("Invalid email"),
  full_name: z.string().min(2, "Name too short"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  plan_id: z.string().optional().nullable(),
  plan_duration_days: z.number().int().positive().optional().nullable(),
  custom_price: z.number().positive().optional().nullable(),
  tunnel_name: z.string().optional().nullable(),
  vat_number: z.string().optional().nullable(),
  business_city: z.string().optional().nullable(),
  business_postal_code: z.string().optional().nullable(),
  communication_email: z.string().email().optional().nullable(),
});

// ─── Admin: Edit User ───────────────────────────────────────────────────────

export const editUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  full_name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  email: z.string().email().optional(),
  custom_price: z.number().positive().optional().nullable(),
  plan_duration_days: z.number().int().positive().optional().nullable(),
  customer_type: z.enum(["private", "business"]).optional(),
  company_name: z.string().optional().nullable(),
  vat_number: z.string().optional().nullable(),
  business_city: z.string().optional().nullable(),
  business_postal_code: z.string().optional().nullable(),
  communication_email: z.string().email().optional().nullable(),
});

// ─── Admin: Delete User ─────────────────────────────────────────────────────

export const deleteUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

// ─── Admin: Create Camera ───────────────────────────────────────────────────

export const createCameraSchema = z.object({
  name: z.string().min(1, "Camera name required"),
  serialNumber: z.string().min(1, "Serial number required"),
  userId: z.string().uuid("Invalid user ID"),
  userEmail: z.string().email().optional(),
  streamPath: z.string().min(1, "Stream path required"),
  isStreamActive: z.boolean().optional().default(false),
});

// ─── Admin: Delete Camera ───────────────────────────────────────────────────

export const deleteCameraSchema = z.object({
  cameraId: z.string().uuid("Invalid camera ID"),
});

// ─── Public: Subscribe Request ───────────────────────────────────────────────

export const subscribeRequestSchema = z.object({
  full_name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z.string().min(9, "מספר טלפון לא תקין"),
  address: z.string().min(2, "כתובת חסרה"),
  selected_plan: z.string().min(1, "יש לבחור תוכנית"),
  preferred_date: z.string().optional().nullable(),
  admin_notes: z.string().optional().nullable(),
});

// ─── User: Support Request ──────────────────────────────────────────────────

export const supportRequestSchema = z.object({
  message: z.string().min(1, "הודעה חסרה").max(5000, "הודעה ארוכה מדי"),
  category: z.enum(["technical", "billing", "general", "urgent"], {
    message: "קטגוריה לא תקינה",
  }),
});

// ─── Admin: Create User with Payment ────────────────────────────────────────

export const createWithPaymentSchema = z.object({
  requestId: z.string().uuid("Invalid request ID"),
  planId: z.string().uuid("Invalid plan ID"),
});

// ─── Admin: Create Invoice ──────────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1, "שם פריט חסר"),
  quantity: z.number().int().positive("כמות חייבת להיות חיובית"),
  unit_price: z.number().min(0, "מחיר לא תקין"),
  description: z.string().optional().nullable(),
});

export const createInvoiceSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  items: z.array(invoiceItemSchema).min(1, "חייב להכיל לפחות פריט אחד"),
  notes: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerEmail: z.string().email().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  customerCity: z.string().optional().nullable(),
  customerIdNumber: z.string().optional().nullable(),
  billingCustomerType: z.enum(["private", "business"]).optional().nullable(),
  billingCompanyName: z.string().optional().nullable(),
  billingVatNumber: z.string().optional().nullable(),
  billingBusinessCity: z.string().optional().nullable(),
  billingBusinessPostalCode: z.string().optional().nullable(),
  billingCommunicationEmail: z.string().email().optional().nullable(),
  documentType: z.enum(["invoice", "quote"]).optional().default("invoice"),
  validUntil: z.string().optional().nullable(),
});

// ─── Helper: parse and return error response ────────────────────────────────

export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: message };
  }
  return { success: true, data: result.data };
}
