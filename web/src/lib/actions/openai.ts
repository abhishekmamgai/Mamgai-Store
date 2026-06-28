"use server";

import { requireStoreId } from "@/lib/auth/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ParsedBill } from "@/lib/ocr/parse-bill";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

/**
 * Calls OpenAI GPT-4o to parse raw OCR text from a bill into structured data.
 * Falls back gracefully if the API key is missing or the call fails.
 */
export async function parseBillWithAI(rawText: string): Promise<ParsedBill | null> {
  if (!OPENAI_API_KEY || !rawText.trim()) return null;

  // Fetch existing product names for this store so the AI can match/normalize
  let existingProducts: string[] = [];
  try {
    const storeId = await requireStoreId();
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("products")
      .select("name")
      .eq("store_id", storeId)
      .order("purchase_count", { ascending: false })
      .limit(200);
    existingProducts = (data ?? []).map((p) => p.name);
  } catch {
    // If store/auth is not ready, continue without product matching
  }

  const systemPrompt = `You are a bill/invoice parser for an Indian Kirana (general) store. You receive raw OCR text extracted from a supplier bill image (could be Hindi, English, or mixed). Your job is to return a clean, structured JSON object.

RULES:
1. Correct common OCR misspellings (e.g. "Amui Butter" → "Amul Butter", "Maggl" → "Maggi").
2. Normalize product names to their standard form. Remove extra whitespace.
3. If the user already has products in their database, try to match scanned items to these existing names when the match is obvious (e.g. "Lays Classic 26g" ≈ "Lays 26g").
4. Extract quantities, units (kg, liter, piece, packet, box, gram, bottle, carton), and per-unit purchase prices.
5. Extract bill metadata: bill_number, bill_date (YYYY-MM-DD), supplier_name, gst_amount, tax_amount, grand_total.
6. For dates, prefer DD/MM/YYYY → YYYY-MM-DD conversion. Default to today if not found.
7. Ignore lines that are headers, footers, thank-you messages, addresses, or phone numbers.
8. If you cannot determine a value, use null.
9. Return ONLY valid JSON, no markdown fences, no explanation.

EXISTING PRODUCTS IN DATABASE (try to match to these names):
${existingProducts.length > 0 ? existingProducts.join("\n") : "(none yet)"}

RESPONSE FORMAT:
{
  "items": [
    {
      "product_name": "string",
      "quantity": number,
      "unit": "piece|kg|gram|liter|packet|box|bottle|carton",
      "purchase_price": number,
      "total_price": number,
      "category": "string or null"
    }
  ],
  "bill_number": "string or null",
  "bill_date": "YYYY-MM-DD or null",
  "supplier_name": "string or null",
  "gst_amount": number,
  "tax_amount": number,
  "grand_total": number or null,
  "raw_text": "the original text"
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse this bill OCR text:\n\n${rawText}` },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    // Strip markdown fences if the model adds them
    const cleaned = content
      .replace(/^```json?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate structure and return as ParsedBill
    const result: ParsedBill = {
      items: (parsed.items ?? []).map((item: Record<string, unknown>) => ({
        product_name: String(item.product_name ?? "").trim(),
        quantity: Number(item.quantity) || 1,
        unit: String(item.unit ?? "piece"),
        purchase_price: Number(item.purchase_price) || 0,
        total_price: Number(item.total_price) || Number(item.quantity || 1) * Number(item.purchase_price || 0),
        category: item.category ? String(item.category) : undefined,
      })),
      bill_number: parsed.bill_number ?? null,
      bill_date: parsed.bill_date ?? null,
      supplier_name: parsed.supplier_name ?? null,
      gst_amount: Number(parsed.gst_amount) || 0,
      tax_amount: Number(parsed.tax_amount) || 0,
      grand_total: parsed.grand_total != null ? Number(parsed.grand_total) : null,
      raw_text: rawText,
    };

    // Filter out items with no name or zero price
    result.items = result.items.filter(
      (i) => i.product_name.length > 0 && i.purchase_price > 0
    );

    return result.items.length > 0 ? result : null;
  } catch (e) {
    console.error("AI bill parsing failed:", e);
    return null;
  }
}

/**
 * Matches a scanned product name against a list of existing product names using OpenAI.
 * Returns the exact matched product name from the list, or "NEW" if it is a new product.
 */
export async function matchProductWithAI(scannedName: string, existingNames: string[]): Promise<string> {
  if (!OPENAI_API_KEY || !scannedName.trim() || !existingNames.length) return "NEW";

  const systemPrompt = `You are a product name normalization assistant for an Indian Kirana (general) store.
You are given a scanned product name from a bill and a list of existing product names in the store's database.
Determine if the scanned name refers to one of the existing products.
If it is a clear match to one of the existing products (with spelling corrections, typos, variations in quantity format like '70g' vs '70 gm', or minor brand ordering), return the EXACT name of that matching product from the list.
If it is a new product that is not present in the list, return 'NEW'.
Return ONLY the matching product name or 'NEW'. No explanation, no markdown.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: roleSystem(), content: systemPrompt },
          { role: "user", content: `Scanned Product Name: "${scannedName}"\n\nExisting Products:\n${existingNames.join("\n")}` },
        ],
        temperature: 0,
        max_tokens: 50,
      }),
    });

    if (!response.ok) return "NEW";
    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content ?? "").trim();
    return content;
  } catch {
    return "NEW";
  }
}

// Helper to keep typescript/eslint happy
function roleSystem(): "system" {
  return "system";
}
