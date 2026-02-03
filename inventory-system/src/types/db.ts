// Database schema interfaces mirroring PostgreSQL tables

export interface User {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  token_version: number;
  beta_code_id: number | null;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

export interface BetaCode {
  id: number;
  code: string;
  is_used: boolean;
  used_by_user_id: number | null;
  created_at: Date;
}

export interface InventoryItem {
  id: number;
  user_id: number;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  game: string;
  card_type: string;
  purchase_price: number | null;
  front_label_price: number;
  condition: string | null;
  quantity: number;
  barcode_id: string | null;
  cert_number: string | null;
  grade: string | null;
  image_url: string | null;
  status: string;
  purchase_date: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface Trade {
  id: number;
  user_id: number;
  customer_name: string | null;
  trade_date: Date | null;
  total_trade_in_value: number | null;
  total_trade_out_value: number | null;
  cash_difference: number | null;
  notes: string | null;
  created_at: Date;
}

export interface TradeItem {
  id: number;
  trade_id: number;
  inventory_id: number | null;
  direction: 'IN' | 'OUT';
  item_value: number | null;
  created_at: Date;
}

export interface SavedDeal {
  id: number;
  user_id: number;
  deal_type: 'purchase' | 'trade' | 'sale';
  customer_name: string | null;
  customer_note: string | null;
  deal_data: Record<string, any>;
  total_items: number | null;
  total_value: number | null;
  trade_out_inventory_ids: number[] | null;
  show_id: number | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface Transaction {
  id: number;
  user_id: number;
  inventory_id: number | null;
  sale_price: number;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  customer_email: string | null;
  sale_date: Date;
  created_at: Date;
}

export interface CardShow {
  id: number;
  user_id: number;
  show_name: string;
  location: string | null;
  show_date: Date | null;
  created_at: Date;
}

// DTOs (Data Transfer Objects) for API requests/responses

export interface CreateInventoryItemDTO {
  card_name: string;
  set_name?: string;
  card_number?: string;
  game?: string;
  card_type?: string;
  purchase_price?: number;
  front_label_price: number;
  condition?: string;
  quantity?: number;
  barcode_id?: string;
  cert_number?: string;
  grade?: string;
  image_url?: string;
  status?: string;
  purchase_date?: string;
}

export interface UpdateInventoryItemDTO {
  card_name?: string;
  set_name?: string;
  card_number?: string;
  game?: string;
  card_type?: string;
  purchase_price?: number;
  front_label_price?: number;
  condition?: string;
  quantity?: number;
  barcode_id?: string;
  cert_number?: string;
  grade?: string;
  image_url?: string;
  status?: string;
  purchase_date?: string;
}

export interface CreateTradeDTO {
  customer_name?: string;
  trade_date?: string;
  trade_percentage?: number;
  cash_to_customer?: number;
  cash_from_customer?: number;
  notes?: string;
  show_id?: number;
  trade_in_items?: Array<{
    card_name: string;
    set_name?: string;
    card_number?: string;
    game?: string;
    card_type?: string;
    condition?: string;
    card_value: number;
    trade_percentage?: number;
    front_label_price?: number;
    cert_number?: string;
    grade?: string;
    grade_qualifier?: string;
    image_url?: string;
  }>;
  trade_out_items?: Array<{
    inventory_id: number;
    card_name: string;
    set_name?: string;
    card_value: number;
  }>;
}

export interface CreateSavedDealDTO {
  deal_type: 'purchase' | 'trade' | 'sale';
  customer_name?: string;
  customer_note?: string;
  deal_data: Record<string, any>;
  total_items?: number;
  total_value?: number;
  trade_out_inventory_ids?: number[];
  show_id?: number;
  expires_at?: string;
}

export interface UpdateUserProfileDTO {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
}

export interface BulkUploadResult {
  success: Array<{
    index: number;
    item: InventoryItem;
  }>;
  failed: Array<{
    index: number;
    item: CreateInventoryItemDTO;
    error: string;
  }>;
  total: number;
}

// Query result types
export interface InventoryMetrics {
  total_inventory: number;
  total_value: number;
  avg_price: number;
}

export interface SalesMetrics {
  total_sales: number;
  total_revenue: number;
  avg_sale_price: number;
}

export interface TradeMetrics {
  total_trades: number;
  total_trade_in_value: number;
  total_trade_out_value: number;
}
