import { z } from "zod";

// ─── Admin: Create User ─────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().email("Invalid email"),
  full_name: z.string().min(2, "Name too short"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  plan_id: z.string().uuid().optional().nullable(),
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
