export type ParsedBillItem = {
  product_name: string;
  quantity: number;
  unit: string;
  purchase_price: number;
  total_price: number;
  category?: string;
};

export type ParsedBill = {
  items: ParsedBillItem[];
  bill_number: string | null;
  bill_date: string | null;
  supplier_name: string | null;
  gst_amount: number;
  tax_amount: number;
  grand_total: number | null;
  raw_text: string;
};

const ITEM_LINE =
  /^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:x|X|\*|@)?\s*(\d+(?:\.\d+)?)\s*(?:=|:)?\s*(\d+(?:\.\d+)?)?$/;

const PRICE_ONLY = /^(.+?)\s+(\d+(?:\.\d+)?)\s*$/;
const QTY_UNIT_PRICE = /^(.+?)\s+(\d+(?:\.\d+)?)\s+(kg|g|gm|gram|ltr|liter|pc|pcs|piece|pkt|packet|box|nos|no\.?)\s+(\d+(?:\.\d+)?)/i;

function parseNumber(s: string): number {
  const n = parseFloat(s.replace(/[,₹]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function detectUnit(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("kg")) return "kg";
  if (t.includes("ltr") || t.includes("liter")) return "liter";
  if (t.includes("pkt") || t.includes("packet")) return "packet";
  if (t.includes("box")) return "box";
  if (t.includes("gm") || t.includes("gram")) return "gram";
  return "piece";
}

function extractMeta(lines: string[]) {
  let bill_number: string | null = null;
  let bill_date: string | null = null;
  let supplier_name: string | null = null;
  let gst_amount = 0;
  let tax_amount = 0;
  let grand_total: number | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (!bill_number && /bill\s*(no|#|number)?[:\s]*([a-z0-9\-\/]+)/i.test(line)) {
      const m = line.match(/bill\s*(?:no|#|number)?[:\s]*([a-z0-9\-\/]+)/i);
      if (m) bill_number = m[1];
    }
    if (!bill_number && /invoice\s*(no|#)?[:\s]*([a-z0-9\-\/]+)/i.test(line)) {
      const m = line.match(/invoice\s*(?:no|#)?[:\s]*([a-z0-9\-\/]+)/i);
      if (m) bill_number = m[1];
    }

    if (!bill_date) {
      const dm = line.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dm) {
        const [, d, mo, y] = dm;
        const year = y.length === 2 ? `20${y}` : y;
        bill_date = `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
    }

    if (/gst|cgst|sgst|igst/.test(lower)) {
      const nums = line.match(/(\d+(?:\.\d+)?)/g);
      if (nums) {
        const val = parseNumber(nums[nums.length - 1]);
        if (val > 0 && val < 100000) gst_amount += val;
      }
    }
    if (/tax/.test(lower) && !/gst/.test(lower)) {
      const nums = line.match(/(\d+(?:\.\d+)?)/g);
      if (nums) tax_amount += parseNumber(nums[nums.length - 1]);
    }

    if (/grand\s*total|net\s*amount|total\s*amount|कुल|योग/i.test(line)) {
      const nums = line.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/g);
      if (nums) grand_total = parseNumber(nums[nums.length - 1]);
    }

    if (!supplier_name && lines.indexOf(line) < 5 && line.length > 3 && !/\d{3,}/.test(line)) {
      if (/shop|store|mart|market|traders|enterprise|agency|dairy|kirana/i.test(line)) {
        supplier_name = line.trim();
      }
    }
  }

  return { bill_number, bill_date, supplier_name, gst_amount, tax_amount, grand_total };
}

function parseItemLine(line: string): ParsedBillItem | null {
  const cleaned = line.replace(/\s+/g, " ").trim();
  if (cleaned.length < 3) return null;
  if (/total|gst|tax|sub|cash|change|thank|bill|invoice|date|phone|address|कुल|योग/i.test(cleaned)) {
    return null;
  }

  let m = cleaned.match(QTY_UNIT_PRICE);
  if (m) {
    const qty = parseNumber(m[2]);
    const unit = detectUnit(m[3]);
    const price = parseNumber(m[4]);
    return {
      product_name: m[1].trim(),
      quantity: qty || 1,
      unit,
      purchase_price: price,
      total_price: qty * price,
    };
  }

  m = cleaned.match(ITEM_LINE);
  if (m) {
    const qty = parseNumber(m[2]);
    const price = parseNumber(m[3]);
    const total = m[4] ? parseNumber(m[4]) : qty * price;
    return {
      product_name: m[1].trim(),
      quantity: qty || 1,
      unit: detectUnit(m[1]),
      purchase_price: price || total / (qty || 1),
      total_price: total,
    };
  }

  m = cleaned.match(PRICE_ONLY);
  if (m && parseNumber(m[2]) > 0) {
    const price = parseNumber(m[2]);
    return {
      product_name: m[1].trim(),
      quantity: 1,
      unit: detectUnit(m[1]),
      purchase_price: price,
      total_price: price,
    };
  }

  const nums = cleaned.match(/(\d+(?:\.\d+)?)/g);
  if (nums && nums.length >= 2) {
    const name = cleaned.replace(/\d+(?:\.\d+)?/g, "").replace(/[@x*=]/gi, "").trim();
    if (name.length >= 2) {
      const qty = parseNumber(nums[0]);
      const price = parseNumber(nums[nums.length - 1]);
      return {
        product_name: name,
        quantity: qty || 1,
        unit: detectUnit(name),
        purchase_price: price,
        total_price: (qty || 1) * price,
      };
    }
  }

  return null;
}

export function parseBillText(rawText: string): ParsedBill {
  const lines = rawText
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const meta = extractMeta(lines);
  const items: ParsedBillItem[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const item = parseItemLine(line);
    if (!item || item.purchase_price <= 0) continue;
    const key = `${item.product_name.toLowerCase()}-${item.purchase_price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  const itemsTotal = items.reduce((s, i) => s + i.total_price, 0);
  const grand_total = meta.grand_total ?? (itemsTotal > 0 ? itemsTotal + meta.gst_amount + meta.tax_amount : null);

  return {
    items,
    bill_number: meta.bill_number,
    bill_date: meta.bill_date,
    supplier_name: meta.supplier_name,
    gst_amount: meta.gst_amount,
    tax_amount: meta.tax_amount,
    grand_total,
    raw_text: rawText,
  };
}

export function createBillFingerprint(input: {
  market_id: string;
  bill_number?: string | null;
  bill_date: string;
  grand_total: number;
  item_count: number;
}): string {
  const parts = [
    input.market_id,
    input.bill_number ?? "no-bill-no",
    input.bill_date,
    input.grand_total.toFixed(2),
    String(input.item_count),
  ];
  return parts.join("|");
}
