// Types de la base de données Voxena

export type UserRole = "admin" | "owner";
export type OrderStatus = "nouvelle" | "en_preparation" | "prete" | "en_livraison" | "livree" | "recuperee" | "annulee";
export type OrderType = "emporter" | "livraison";
export type AgentStatus = "active" | "paused" | "error";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled" | "paused";
export type SubscriptionPlan = "orders" | "tables" | "pro";
export type ReservationStatus = "en_attente" | "confirmee" | "assise" | "terminee" | "annulee" | "no_show" | "liste_attente";
export type FloorZone = "salle" | "terrasse" | "bar" | "salle_privee" | "vip";

export interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
  modifications?: string[];
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  restaurant_id: string | null;
  onboarding_completed: boolean;
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string | null;
  phone: string | null;
  address: string | null;
  whatsapp_phone: string | null;
  whatsapp_phone_id: string | null;
  agent_id: string | null;
  agent_status: AgentStatus;
  telnyx_phone: string | null;
  owner_name: string | null;
  logo_url: string | null;
  opening_hours: Record<string, { open: string; close: string }[]> | null;
  // Champs abonnement (phase 8 billing)
  subscription_status: SubscriptionStatus | null;
  subscription_plan: SubscriptionPlan | null;
  subscription_amount: number;
  subscription_started_at: string | null;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  billing_notes: string | null;
  practical_info: PracticalInfo | null;
  default_reservation_duration: number;
  turnover_buffer: number;
  created_at: string;
}

export interface Menu {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuItemOption {
  name: string;
  choices: { label: string; price_delta: number }[];
}

export interface MenuItemSupplement {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  menu_id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  options: MenuItemOption[] | null;
  supplements: MenuItemSupplement[] | null;
  allergens: string[] | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  conversation_id: string | null;
  status: OrderStatus;
  order_type: OrderType | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: OrderItem[];
  special_instructions: string | null;
  pickup_time: string | null;
  delivery_address: string | null;
  delivery_time_estimate: string | null;
  total_amount: number | null;
  transcript: { role: string; message: string; timestamp?: number }[] | null;
  audio_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentLog {
  id: string;
  restaurant_id: string;
  conversation_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

// Suivi de consommation mensuelle par restaurant (phase 8 billing)
export interface UsageRecord {
  id: string;
  restaurant_id: string;
  month: string; // format "YYYY-MM"
  call_count: number;
  total_minutes: number;
  total_cost: number;
  updated_at: string;
  created_at: string;
}

// ── Voxena Tables — Architecture multi-produit ──

export interface FloorTable {
  id: string;
  restaurant_id: string;
  name: string;
  capacity: number;
  shape: "rectangle" | "round" | "square";
  x: number;
  y: number;
  width: number;
  height: number;
  zone: string;
  combinable: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Reservation {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  date: string;
  time_slot: string;
  duration: number;
  covers: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  status: ReservationStatus;
  notes: string | null;
  preferences: string[];
  occasion: string | null;
  waitlist_position: number | null;
  estimated_wait_minutes: number | null;
  source: "phone" | "web" | "manual";
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TableCombination {
  id: string;
  reservation_id: string;
  table_ids: string[];
  total_capacity: number;
  created_at: string;
}

export interface Customer {
  id: string;
  restaurant_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  visit_count: number;
  last_visit_at: string;
  total_spent: number;
  notes: string | null;
  tags: string[];
  created_at: string;
}

export interface PracticalInfo {
  parking?: { type: string; details?: string };
  terrasse?: { available: boolean; capacity?: number };
  accessibility?: { pmr: boolean; notes?: string };
  animals?: { policy: string };
  high_chairs?: { available: boolean; count?: number };
  payments?: string[];
  wifi?: { available: boolean; code?: string };
  private_events?: { available: boolean; capacity?: number; description?: string };
  dress_code?: string;
}
