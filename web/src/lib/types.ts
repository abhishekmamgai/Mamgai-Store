export type UserRole = "owner" | "manager" | "staff";

export type Market = {
  id: string;
  store_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  store_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category_id: string | null;
  supplier_id: string | null;
  market_id: string | null;
  purchase_price: number;
  selling_price: number;
  stock_qty: number;
  stock_unit: string;
  low_stock_threshold: number;
  last_purchase_date: string | null;
  purchase_count: number;
  created_at: string;
  updated_at: string;
  markets?: { name: string } | null;
};

export type Supplier = {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  gst_number: string | null;
  notes: string | null;
  created_at: string;
};

export type Bill = {
  id: string;
  store_id: string;
  market_id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  bill_date: string;
  total_amount: number;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  markets?: { name: string };
  bill_items?: BillItem[];
};

export type BillItem = {
  id: string;
  bill_id: string;
  store_id: string;
  market_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  purchase_price: number;
  total_price: number;
  created_at: string;
  markets?: { name: string };
};

export type DailySale = {
  id: string;
  store_id: string;
  sale_date: string;
  cash_sale: number;
  upi_sale: number;
  credit_sale: number;
  expenses: number;
  opening_cash: number;
  notes: string | null;
  created_at: string;
};

export type PurchasePlanItem = {
  id: string;
  store_id: string;
  plan_date: string;
  item_name: string;
  quantity: string | null;
  status: "pending" | "purchased" | "cancelled";
  created_at: string;
};

export type MilkEntry = {
  id: string;
  store_id: string;
  entry_date: string;
  today_milk: number;
  tomorrow_requirement: number;
  remaining_stock: number;
  notes: string | null;
  created_at: string;
};

export type DailyNote = {
  id: string;
  store_id: string;
  note_date: string;
  content: string;
  created_at: string;
};

export type BillLineInput = {
  product_name: string;
  quantity: number;
  unit: string;
  purchase_price: number;
  category?: string;
};

export const STOCK_UNITS = [
  "piece",
  "box",
  "carton",
  "packet",
  "bottle",
  "kg",
  "gram",
  "liter",
] as const;
