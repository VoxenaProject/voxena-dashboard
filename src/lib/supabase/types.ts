// Types de la base de données Voxena

export type UserRole = "admin" | "owner";
export type OrderStatus = "nouvelle" | "en_preparation" | "prete" | "en_livraison" | "livree" | "recuperee" | "annulee";
export type OrderType = "emporter" | "livraison";
export type AgentStatus = "active" | "paused" | "error";

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
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  whatsapp_phone: string | null;
  whatsapp_phone_id: string | null;
  agent_id: string | null;
  agent_status: AgentStatus;
  owner_name: string | null;
  logo_url: string | null;
  opening_hours: Record<string, { open: string; close: string }[]> | null;
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
