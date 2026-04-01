import { z } from "zod";

// ── Commandes ──

export const createOrderSchema = z.object({
  restaurant_id: z.string().uuid(),
  customer_name: z.string().optional().nullable(),
  customer_phone: z.string().optional().nullable(),
  caller_id: z.string().optional().nullable(),
  order_type: z.string().optional().nullable(),
  order_items: z.union([z.string(), z.array(z.any())]).optional().nullable(),
  items: z.union([z.string(), z.array(z.any())]).optional().nullable(),
  special_instructions: z.string().optional().nullable(),
  pickup_time: z.string().optional().nullable(),
  delivery_address: z.string().optional().nullable(),
  delivery_time_estimate: z.string().optional().nullable(),
  conversation_id: z.string().optional().nullable(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "nouvelle",
    "en_preparation",
    "prete",
    "en_livraison",
    "livree",
    "recuperee",
    "annulee",
  ]),
});

// ── Réservations ──

export const createReservationSchema = z.object({
  restaurant_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time_slot: z.string().regex(/^\d{2}:\d{2}$/),
  covers: z.union([z.number().int().positive(), z.string()]),
  customer_name: z.string().min(1),
  customer_phone: z.string().optional().nullable(),
  caller_id: z.string().optional().nullable(),
  customer_email: z.string().email().optional().nullable().or(z.literal("")),
  table_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.enum(["phone", "web", "manual"]).optional().default("manual"),
  preferences: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  occasion: z.string().optional().nullable(),
  conversation_id: z.string().optional().nullable(),
  duration: z.number().int().positive().optional().default(90),
  status: z.enum(["en_attente", "confirmee", "assise", "liste_attente"]).optional(),
});

export const bookReservationSchema = z.object({
  restaurant_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time_slot: z.string().regex(/^\d{2}:\d{2}$/),
  covers: z.union([z.number().int().positive(), z.string()]),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  customer_email: z.string().email().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
  preferences: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  occasion: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
});

export const updateReservationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "en_attente",
    "confirmee",
    "assise",
    "terminee",
    "annulee",
    "no_show",
    "liste_attente",
  ]).optional(),
  table_id: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time_slot: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration: z.number().int().positive().optional(),
  covers: z.number().int().positive().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  preferences: z.array(z.string()).optional(),
  occasion: z.string().optional().nullable(),
});

// ── Helper pour valider et retourner erreur formatée ──

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return { data: null, error: `${firstIssue.path.join(".")}: ${firstIssue.message}` };
  }
  return { data: result.data, error: null };
}
