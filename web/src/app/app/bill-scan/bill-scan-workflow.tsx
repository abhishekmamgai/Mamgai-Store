"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/glass-card";
import { saveBill } from "@/lib/actions/bills";
import { addMarket } from "@/lib/actions/markets";
import { updateProductSellingPrices } from "@/lib/actions/products";
import { enhanceBillImage, runOcr } from "@/lib/ocr/client-ocr";
import { parseBillText } from "@/lib/ocr/parse-bill";
import { parseBillWithAI } from "@/lib/actions/openai";
import type { Market, BillLineInput } from "@/lib/types";
import { STOCK_UNITS } from "@/lib/types";
import {
  Camera,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  ScanLine,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Upload,
} from "lucide-react";

type Props = {
  markets: Market[];
  defaultUserName?: string;
};

type Step = "meta" | "scan" | "review";

const emptyLine = (): BillLineInput => ({
  product_name: "",
  quantity: 1,
  unit: "piece",
  purchase_price: 0,
});

export function BillScanWorkflow({ markets: initialMarkets, defaultUserName = "" }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("meta");
  const [markets, setMarkets] = useState(initialMarkets);
  const [marketId, setMarketId] = useState(initialMarkets[0]?.id ?? "");
  const [customMarket, setCustomMarket] = useState("");
  const [scannedBy, setScannedBy] = useState(defaultUserName);
  const [scanDateTime, setScanDateTime] = useState(() => new Date().toISOString().slice(0, 16));

  const [cameraActive, setCameraActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState("");
  const [ocrFailed, setOcrFailed] = useState(false);

  const [supplierName, setSupplierName] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [gstAmount, setGstAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [items, setItems] = useState<BillLineInput[]>([]);
  const [ocrRawText, setOcrRawText] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [priceAlerts, setPriceAlerts] = useState<{
    productId: string;
    product: string;
    oldPrice: number;
    newPrice: number;
    oldSellingPrice: number;
  }[]>([]);
  const [newSellingPrices, setNewSellingPrices] = useState<Record<string, number>>({});
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [pending, startTransition] = useTransition();

  const metaValid = marketId && scannedBy.trim().length >= 2;

  const startCamera = async () => {
    if (!metaValid) {
      setError("Pehle market aur apna naam fill karein");
      return;
    }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setStep("scan");
      }
    } catch (e) {
      console.error("Camera access failed", e);
      setError("Camera could not be started. Please use the Upload Image button.");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopCamera();
    processImage(dataUrl);
  };

  const processImage = async (dataUrl: string) => {
    setStep("review");
    setOcrProgress("Enhancing image...");
    setOcrFailed(false);
    setError("");

    try {
      const enhanced = await enhanceBillImage(dataUrl);
      setImagePreview(enhanced);
      setOcrProgress("Running OCR (Hindi + English)...");
      const text = await runOcr(enhanced);
      setOcrRawText(text);

      // Try AI parsing first (GPT-4o), fall back to regex
      setOcrProgress("🤖 AI is analyzing bill contents...");
      let parsed = await parseBillWithAI(text).catch(() => null);
      let usedAI = !!parsed;

      if (!parsed) {
        // Fallback to regex-based parser
        setOcrProgress("Parsing with local engine...");
        parsed = parseBillText(text);
        usedAI = false;
      }

      if (parsed.items.length === 0) {
        setOcrFailed(true);
        setItems([emptyLine(), emptyLine(), emptyLine()]);
        setOcrProgress("OCR could not detect items — please enter manually");
      } else {
        setItems(parsed.items.map((i) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit: i.unit,
          purchase_price: i.purchase_price,
          category: i.category,
        })));
        setOcrProgress(
          usedAI
            ? `✅ AI detected ${parsed.items.length} items (names normalized)`
            : `Detected ${parsed.items.length} items`
        );
      }

      if (parsed.supplier_name) setSupplierName(parsed.supplier_name);
      if (parsed.bill_number) setBillNumber(parsed.bill_number);
      if (parsed.bill_date) setBillDate(parsed.bill_date);
      setGstAmount(parsed.gst_amount);
      setTaxAmount(parsed.tax_amount);
      if (parsed.grand_total) setGrandTotal(parsed.grand_total);
    } catch (e) {
      setOcrFailed(true);
      setImagePreview(dataUrl);
      setItems([emptyLine(), emptyLine(), emptyLine()]);
      setOcrProgress("OCR failed — enter items manually");
      setError(e instanceof Error ? e.message : "OCR error");
    }
  };

  const handleFile = (file: File | null) => {
    if (!file || !metaValid) return;
    const reader = new FileReader();
    reader.onload = () => processImage(reader.result as string);
    reader.readAsDataURL(file);
    setStep("scan");
  };

  const addCustomMarket = useCallback(async () => {
    if (!customMarket.trim()) return;
    const fd = new FormData();
    fd.set("name", customMarket.trim());
    const m = await addMarket(fd);
    setMarkets((p) => [...p, m as Market]);
    setMarketId((m as Market).id);
    setCustomMarket("");
  }, [customMarket]);

  const updateItem = (index: number, field: keyof BillLineInput, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = () => {
    setError("");
    setSuccess("");
    const validItems = items.filter((i) => i.product_name.trim() && i.purchase_price > 0);
    if (!validItems.length) {
      setError("Add at least one valid item");
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveBill({
          market_id: marketId,
          scanned_by_name: scannedBy.trim(),
          supplier_name: supplierName,
          bill_date: billDate,
          bill_number: billNumber || null,
          gst_amount: gstAmount,
          tax_amount: taxAmount,
          grand_total: grandTotal || undefined,
          items: validItems,
          image_base64: imagePreview ?? undefined,
          ocr_raw_text: ocrRawText || undefined,
        });
        setSuccess(`Bill #${result.billNumber ?? result.billId.slice(0, 8)} saved — ₹${result.totalAmount.toFixed(2)}`);
        
        const initialPrices: Record<string, number> = {};
        result.priceAlerts.forEach((alert) => {
          const markup = alert.oldPrice > 0 ? (alert.oldSellingPrice / alert.oldPrice) : 1.15;
          const recommended = Math.round(alert.newPrice * markup);
          initialPrices[alert.productId] = recommended;
        });
        setNewSellingPrices(initialPrices);
        setPriceAlerts(result.priceAlerts);
        if (result.priceAlerts.length > 0) {
          setShowPriceModal(true);
        }

        setStep("meta");
        setItems([]);
        setImagePreview(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-in fade-in duration-500">
      {/* Progress */}
      <div className="flex items-center gap-2 text-sm">
        {(["meta", "scan", "review"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <Badge variant={step === s ? "default" : "secondary"} className="capitalize">
              {i + 1}. {s === "meta" ? "Market" : s === "scan" ? "Scan" : "Review"}
            </Badge>
            {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Meta */}
      {step === "meta" && (
        <GlassCard className="space-y-4">
          <h2 className="text-lg font-semibold">Step 1 — Market & Scanner Info</h2>
          <p className="text-sm text-muted-foreground">
            Camera tab tak nahi khulega jab tak ye info na ho
          </p>

          <div className="space-y-2">
            <Label>Market / Shop *</Label>
            <select
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
            >
              <option value="">Select market...</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input
                placeholder="Add new market (Mehrauli, Daryaganj...)"
                value={customMarket}
                onChange={(e) => setCustomMarket(e.target.value)}
              />
              <Button variant="secondary" onClick={addCustomMarket} disabled={!customMarket.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Your Name (Scanner) *</Label>
              <Input
                value={scannedBy}
                onChange={(e) => setScannedBy(e.target.value)}
                placeholder="Abhishek"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={scanDateTime}
                onChange={(e) => setScanDateTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button className="w-full" size="lg" disabled={!metaValid} onClick={startCamera}>
              <Camera className="h-5 w-5 mr-2" />
              Open Camera
            </Button>
            <Button 
              className="w-full bg-muted/50" 
              variant="outline"
              size="lg" 
              disabled={!metaValid} 
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Bill
            </Button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </GlassCard>
      )}

      {/* Step 2: Camera */}
      {step === "scan" && (
        <GlassCard className="space-y-4">
          <h2 className="text-lg font-semibold">Step 2 — Capture Bill</h2>

          {cameraActive ? (
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} className="w-full" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-3 bg-black/50 p-4">
                <Button size="lg" onClick={capturePhoto}>
                  <Camera className="h-5 w-5" /> Capture
                </Button>
                <Button variant="secondary" onClick={() => { stopCamera(); setStep("meta"); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <ScanLine className="h-12 w-12 text-muted-foreground" />
              <Button onClick={() => fileRef.current?.click()}>
                Upload / Take Photo
              </Button>
            </div>
          )}
        </GlassCard>
      )}

      {/* Step 3: Review */}
      {step === "review" && (
        <div className="space-y-4">
          <GlassCard className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Step 3 — Review & Save</h2>
              {ocrProgress && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {ocrProgress}
                </span>
              )}
            </div>

            {ocrFailed && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-sm dark:bg-amber-950">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                OCR could not read all items — edit manually below
              </div>
            )}

            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Bill" className="max-h-48 rounded-lg border object-contain" />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Bill Number</Label>
                <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Supplier</Label>
                <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Bill Date</Label>
                <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Grand Total ₹</Label>
                <Input type="number" value={grandTotal || ""} onChange={(e) => setGrandTotal(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>GST ₹</Label>
                <Input type="number" value={gstAmount || ""} onChange={(e) => setGstAmount(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Tax ₹</Label>
                <Input type="number" value={taxAmount || ""} onChange={(e) => setTaxAmount(Number(e.target.value))} />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Items ({items.filter((i) => i.product_name).length})</h3>
              <Button variant="secondary" size="sm" onClick={() => setItems((p) => [...p, emptyLine()])}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>

            {items.map((item, i) => (
              <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-12">
                <Input
                  className="sm:col-span-4"
                  placeholder="Item name"
                  value={item.product_name}
                  onChange={(e) => updateItem(i, "product_name", e.target.value)}
                />
                <Input
                  className="sm:col-span-2"
                  type="number"
                  placeholder="Qty"
                  value={item.quantity || ""}
                  onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                />
                <select
                  className="sm:col-span-2 h-8 rounded-lg border bg-background px-2 text-sm"
                  value={item.unit}
                  onChange={(e) => updateItem(i, "unit", e.target.value)}
                >
                  {STOCK_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <Input
                  className="sm:col-span-2"
                  type="number"
                  placeholder="Price"
                  value={item.purchase_price || ""}
                  onChange={(e) => updateItem(i, "purchase_price", Number(e.target.value))}
                />
                <div className="sm:col-span-2 flex items-center justify-between">
                  <span className="text-sm font-medium">₹{(item.quantity * item.purchase_price).toFixed(2)}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </GlassCard>

          {error && <div className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</div>}
          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-50 p-3 text-sm dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> {success}
            </div>
          )}
          {priceAlerts.length > 0 && (
            <GlassCard className="border-amber-500/20 bg-amber-500/5">
              <div className="font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> {priceAlerts.length} items ke kharid bhaav badh gaye hain!
                </span>
                <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setShowPriceModal(true)}>
                  Review & Update Selling Prices
                </Button>
              </div>
            </GlassCard>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep("meta")}>Back</Button>
            <Button className="flex-1" size="lg" onClick={handleSave} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save to Database
            </Button>
          </div>
        </div>
      )}

      {/* Price Update Modal Overlay */}
      {showPriceModal && priceAlerts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5 animate-pulse" /> Price Change Alerts
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Items are now more expensive. Update selling prices to maintain profit margins.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setShowPriceModal(false)}
              >
                ✕
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
              {priceAlerts.map((alert) => {
                const pctChange = alert.oldPrice > 0 
                  ? ((alert.newPrice - alert.oldPrice) / alert.oldPrice * 100).toFixed(1)
                  : "0.0";
                
                return (
                  <div key={alert.productId} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center rounded-lg border bg-muted/20 p-3 text-sm hover:bg-muted/40 transition-colors">
                    <div className="md:col-span-5">
                      <div className="font-semibold text-foreground truncate">{alert.product}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>Purchase: ₹{alert.oldPrice}</span>
                        <span>→</span>
                        <span className="font-semibold text-rose-500">₹{alert.newPrice}</span>
                        <Badge variant="destructive" className="py-0 px-1 text-[10px] h-4">
                          +{pctChange}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="md:col-span-3 text-xs">
                      <span className="text-muted-foreground block">Old Selling Price:</span>
                      <span className="font-medium text-foreground text-sm">₹{alert.oldSellingPrice || "Not set"}</span>
                    </div>

                    <div className="md:col-span-4 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">New Selling Price ₹</Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          className="h-8 w-24 text-right"
                          value={newSellingPrices[alert.productId] ?? alert.oldSellingPrice}
                          onChange={(e) => setNewSellingPrices(prev => ({
                            ...prev,
                            [alert.productId]: Number(e.target.value) || 0
                          }))}
                        />
                        <Button 
                          variant="outline" 
                          size="xs"
                          className="h-8"
                          title="Apply recommended price"
                          onClick={() => {
                            const markup = alert.oldPrice > 0 ? (alert.oldSellingPrice / alert.oldPrice) : 1.15;
                            const recommended = Math.round(alert.newPrice * markup);
                            setNewSellingPrices(prev => ({
                              ...prev,
                              [alert.productId]: recommended
                            }));
                          }}
                        >
                          Rec
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end border-t pt-3">
              <Button variant="ghost" onClick={() => setShowPriceModal(false)}>
                Skip Updates
              </Button>
              <Button 
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm transition-all"
                disabled={pending}
                onClick={async () => {
                  try {
                    const updates = priceAlerts.map(alert => ({
                      productId: alert.productId,
                      sellingPrice: newSellingPrices[alert.productId] ?? alert.oldSellingPrice
                    }));
                    startTransition(async () => {
                      try {
                        await updateProductSellingPrices(updates);
                        setShowPriceModal(false);
                        router.refresh();
                      } catch (e) {
                        console.error("Failed to update selling prices:", e);
                      }
                    });
                  } catch (e) {
                    console.error("Failed to update selling prices:", e);
                  }
                }}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Update Prices
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
