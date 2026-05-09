"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Package,
  Image as ImageIcon,
  Sparkles,
  Save,
  Loader2,
  Plus,
  LayoutGrid,
  FileText,
  DollarSign,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  Link2,
  Download,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Copy,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/shared";
import { ShopeeSkuExport } from "@/components/admin/shopee-sku-export";
import { ProductMetadataEditor } from "@/components/admin/product-metadata-editor";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  extractProductFromImage,
  generateMarketingContent,
  saveProduct,
  deleteProduct,
  setProductArchived,
  checkProductImageExists,
  type ProductInput,
} from "@/lib/actions/product-actions";
import { useRouter } from "next/navigation";
import type { Product } from "@prisma/client";

import type { AdminPageContent, ProductManagerMessages as Messages } from "@/lib/admin/content";

type ProductKind = "PHYSICAL" | "DIGITAL" | "THIRD_PARTY" | "SERVICE";
type PaymentMode = "PREPAID" | "COD" | "EXTERNAL_COLLECT" | "MANUAL_REVIEW";
type FulfillmentMode = "GHN_SHIPPING" | "ZALO_GROUP" | "EMAIL_DELIVERY" | "THIRD_PARTY_API" | "MANUAL";

function parsePolicy(json: string | undefined): { productKind: ProductKind; paymentMode: PaymentMode; fulfillmentMode: FulfillmentMode } {
  try {
    const p = JSON.parse(json || "{}");
    return {
      productKind:    ["PHYSICAL","DIGITAL","THIRD_PARTY","SERVICE"].includes(p.productKind) ? p.productKind : "PHYSICAL",
      paymentMode:    ["PREPAID","COD","EXTERNAL_COLLECT","MANUAL_REVIEW"].includes(p.paymentMode) ? p.paymentMode : "PREPAID",
      fulfillmentMode:["GHN_SHIPPING","ZALO_GROUP","EMAIL_DELIVERY","THIRD_PARTY_API","MANUAL"].includes(p.fulfillmentMode) ? p.fulfillmentMode : "GHN_SHIPPING",
    };
  } catch {
    return { productKind: "PHYSICAL", paymentMode: "PREPAID", fulfillmentMode: "GHN_SHIPPING" };
  }
}

function CommercePolicyEditor({ value, onChange, messages }: { value?: string; onChange: (v: string) => void, messages: Messages }) {
  const parsed = parsePolicy(value);
  const [kind, setKind] = useState<ProductKind>(parsed.productKind);
  const [payment, setPayment] = useState<PaymentMode>(parsed.paymentMode);
  const [fulfillment, setFulfillment] = useState<FulfillmentMode>(parsed.fulfillmentMode);

  const emit = (k: ProductKind, p: PaymentMode, f: FulfillmentMode) => {
    onChange(JSON.stringify({ productKind: k, paymentMode: p, fulfillmentMode: f }));
  };

  const KIND_DEFAULTS: Record<ProductKind, { paymentMode: PaymentMode; fulfillmentMode: FulfillmentMode }> = {
    PHYSICAL:    { paymentMode: "PREPAID",       fulfillmentMode: "GHN_SHIPPING" },
    DIGITAL:     { paymentMode: "PREPAID",       fulfillmentMode: "EMAIL_DELIVERY" },
    THIRD_PARTY: { paymentMode: "MANUAL_REVIEW", fulfillmentMode: "MANUAL" },
    SERVICE:     { paymentMode: "MANUAL_REVIEW", fulfillmentMode: "MANUAL" },
  };

  const KIND_LABELS: Record<ProductKind, string> = (messages.kinds as any) || {
    PHYSICAL:    "Physical",
    DIGITAL:     "Digital",
    THIRD_PARTY: "Third Party",
    SERVICE:     "Service",
  };

  const PAYMENT_LABELS: Record<PaymentMode, string> = (messages.payments as any) || {
    PREPAID:         "Prepaid",
    COD:             "COD",
    EXTERNAL_COLLECT:"External",
    MANUAL_REVIEW:   "Manual Review",
  };

  const FULFILLMENT_LABELS: Record<FulfillmentMode, string> = (messages.fulfillments as any) || {
    GHN_SHIPPING:   "GHN",
    ZALO_GROUP:     "Zalo Group",
    EMAIL_DELIVERY: "Email",
    THIRD_PARTY_API:"API",
    MANUAL:         "Manual",
  };

  const PAYMENT_HINT: Record<string, string> = (messages.hints as any) || {};
  const FULFILLMENT_HINT: Record<string, string> = (messages.hints as any) || {};

  const handleKindChange = (k: ProductKind) => {
    const defaults = KIND_DEFAULTS[k];
    setKind(k);
    setPayment(defaults.paymentMode);
    setFulfillment(defaults.fulfillmentMode);
    emit(k, defaults.paymentMode, defaults.fulfillmentMode);
  };

  const paymentColor = payment === "PREPAID" ? "bg-sky-500/10 text-sky-700 border-sky-500/20"
    : payment === "COD" ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
    : "bg-slate-100 text-slate-600 border-slate-200";

  const fulfillColor = fulfillment === "GHN_SHIPPING" ? "bg-green-500/10 text-green-700 border-green-500/20"
    : fulfillment === "ZALO_GROUP" ? "bg-indigo-500/10 text-indigo-700 border-indigo-500/20"
    : fulfillment === "EMAIL_DELIVERY" ? "bg-purple-500/10 text-purple-700 border-purple-500/20"
    : "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div className="rounded-2xl border-2 border-[color:var(--brand-soft)] bg-[color:var(--brand-softer)]/20 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-[color:var(--brand-softer)]/40 border-b border-[color:var(--brand-soft)]">
        <ShieldCheck className="h-4 w-4 text-[color:var(--brand)]" />
        <span className="text-xs font-black uppercase tracking-wider text-[color:var(--brand)]">{messages.commercePolicyTitle}</span>
        <span className="ml-auto text-[10px] text-[color:var(--muted)]">{messages.commercePolicySubtitle}</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Loại SP */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">{messages.productKind}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["PHYSICAL", "DIGITAL", "THIRD_PARTY", "SERVICE"] as ProductKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleKindChange(k)}
                className={cn(
                  "h-9 rounded-xl border text-xs font-bold transition-all",
                  kind === k
                    ? "bg-[color:var(--brand)] text-white border-[color:var(--brand)] shadow-sm"
                    : "bg-[color:var(--surface)] text-[color:var(--muted)] border-[color:var(--line)] hover:border-[color:var(--brand-soft)]"
                )}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Thanh toán */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">{messages.paymentMode}</label>
            <div className="space-y-1.5">
              {(["PREPAID", "COD", "EXTERNAL_COLLECT", "MANUAL_REVIEW"] as PaymentMode[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setPayment(p); emit(kind, p, fulfillment); }}
                  className={cn(
                    "w-full h-10 rounded-xl border text-xs font-bold text-left px-3 transition-all flex items-center justify-between",
                    payment === p
                      ? paymentColor + " shadow-sm"
                      : "bg-[color:var(--surface)] text-[color:var(--muted)] border-[color:var(--line)] hover:border-[color:var(--brand-soft)]"
                  )}
                >
                  <span>{PAYMENT_LABELS[p]}</span>
                  {payment === p && <span className="text-[8px] opacity-60 font-normal">✓ {messages.isSelecting}</span>}
                </button>
              ))}
            </div>
            {PAYMENT_HINT[payment] && (
              <p className="text-[10px] text-[color:var(--muted)] italic px-1 leading-relaxed">{PAYMENT_HINT[payment]}</p>
            )}
          </div>

          {/* Giao hàng */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">{messages.fulfillmentMode}</label>
            <div className="space-y-1.5">
              {(["GHN_SHIPPING", "ZALO_GROUP", "EMAIL_DELIVERY", "THIRD_PARTY_API", "MANUAL"] as FulfillmentMode[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setFulfillment(f); emit(kind, payment, f); }}
                  className={cn(
                    "w-full h-10 rounded-xl border text-xs font-bold text-left px-3 transition-all flex items-center justify-between",
                    fulfillment === f
                      ? fulfillColor + " shadow-sm"
                      : "bg-[color:var(--surface)] text-[color:var(--muted)] border-[color:var(--line)] hover:border-[color:var(--brand-soft)]"
                  )}
                >
                  <span>{FULFILLMENT_LABELS[f]}</span>
                  {fulfillment === f && <span className="text-[8px] opacity-60 font-normal">✓ {messages.isSelecting}</span>}
                </button>
              ))}
            </div>
            {FULFILLMENT_HINT[fulfillment === "MANUAL" ? "MANUAL_F" : fulfillment] && (
              <p className="text-[10px] text-[color:var(--muted)] italic px-1 leading-relaxed">{FULFILLMENT_HINT[fulfillment === "MANUAL" ? "MANUAL_F" : fulfillment]}</p>
            )}
          </div>
        </div>

        {/* Summary row */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-[color:var(--brand-soft)]">
          <span className="text-[10px] text-[color:var(--muted)] font-bold uppercase mr-1 self-center">{messages.summary}</span>
          <span className={cn("text-[10px] px-2.5 py-1 rounded-full font-bold border", paymentColor)}>{PAYMENT_LABELS[payment]}</span>
          <span className="text-[10px] text-[color:var(--muted)] self-center">→</span>
          <span className={cn("text-[10px] px-2.5 py-1 rounded-full font-bold border", fulfillColor)}>{FULFILLMENT_LABELS[fulfillment]}</span>
        </div>
      </div>
    </div>
  );
}

export function ProductManager({
  messages,
  initialProducts = [],
}: {
  messages: Messages;
  initialProducts?: Product[];
}) {
  // Trạng thái preview ảnh khi nhập URL
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Khởi tạo danh sách category từ messages để hỗ trợ đa ngôn ngữ
  const categories = useMemo(() => {
    if (!messages.categories) return [];
    return Object.entries(messages.categories)
      .filter(([code]) => code !== "label" && code !== "selectPrompt")
      .map(([code, name]) => ({
        code,
        name,
      }));
  }, [messages.categories]);

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [tab, setTab] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");

  const PAYMENT_LABELS: Record<PaymentMode, string> = (messages.payments as any) || {};
  const FULFILLMENT_LABELS: Record<FulfillmentMode, string> = (messages.fulfillments as any) || {};
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);
  const [currentPreviewImage, setCurrentPreviewImage] = useState(0);
  const [formData, setFormData] = useState<ProductInput>({
    name: "",
    price: 0,
    description: "",
    category: "",
    productCode: "",
    metadata: "",
    commercePolicyJson: JSON.stringify({ productKind: "PHYSICAL", paymentMode: "PREPAID", fulfillmentMode: "GHN_SHIPPING" }),
    images: [],
  });
  const [isUploading, setIsUploading] = useState(false);

  const [marketingContent, setMarketingContent] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    if (tab === "ALL") return products;
    return products.filter((p) => p.status === tab);
  }, [products, tab]);

  const beginEdit = (p: Product) => {
    setEditingId(p.id);
    setFormData({
      id: p.id,
      name: p.name,
      price: p.price,
      description: p.description ?? "",
      imageUrl: p.imageUrl ?? "",
      category: p.category ?? "",
      productCode: (p as any).productCode ?? "",
      metadata: (p as any).metadata ?? "",
      commercePolicyJson: (p as any).commercePolicyJson ?? JSON.stringify({ productKind: "PHYSICAL", paymentMode: "PREPAID", fulfillmentMode: "GHN_SHIPPING" }),
      status: p.status as "ACTIVE" | "ARCHIVED",
      images: (p as any).images ? JSON.parse((p as any).images) : [],
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      price: 0,
      description: "",
      imageUrl: "",
      category: "",
      productCode: "",
      metadata: "",
      commercePolicyJson: JSON.stringify({ productKind: "PHYSICAL", paymentMode: "PREPAID", fulfillmentMode: "GHN_SHIPPING" }),
    });
    setMarketingContent("");
    setImagePreviewError(false);
    setIsUploading(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const formDataUpload = new FormData();
    Array.from(files).forEach(file => formDataUpload.append("files", file));

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (data.urls) {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), ...data.urls],
          imageUrl: prev.imageUrl || data.urls[0],
        }));
        toast.success(`Đã tải lên ${data.urls.length} ảnh`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Lỗi khi tải ảnh lên");
    } finally {
      setIsUploading(false);
    }
  };

  const generateCodeFromName = (name: string) => {
    if (!name) return "";
    
    // Chuyển sang không dấu, viết hoa, thay khoảng trắng bằng gạch ngang
    const slug = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "-");

    // Lấy tối đa 4 từ đầu tiên để mã mang tính mô tả cao hơn
    const parts = slug.split("-");
    const shortSlug = parts.slice(0, 4).join("-");
    
    // Thêm mã ngẫu nhiên ngắn để đảm bảo unique
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${shortSlug}-${random}`;
  };

  const handleExtract = async () => {
    const images = formData.images && formData.images.length > 0 ? formData.images : (formData.imageUrl ? [formData.imageUrl] : []);
    
    if (images.length === 0) {
      toast.error(messages.alerts?.enterImageUrl || "Vui lòng upload hoặc nhập link ảnh sản phẩm trước!");
      return;
    }

    setIsExtracting(true);
    try {
      // Check if image already exists
      const primaryUrl = formData.imageUrl || images[0];
      const check = await checkProductImageExists(primaryUrl, editingId ?? undefined);
      
      if (check.exists) {
        const msg = (messages.alerts?.imageExists || "Ảnh này đã được dùng cho sản phẩm: \"{name}\"")
          .replace("{name}", check.product?.name || "");
        toast.warning(msg, {
          description: "Vẫn đang tiến hành bóc tách thông tin...",
          duration: 5000,
        });
      }

      const result = await extractProductFromImage(images);
      
      // Tự động tạo mã sản phẩm nếu chưa có
      const newCode = formData.productCode || generateCodeFromName(result.name);

      setFormData({
        ...formData,
        name: result.name,
        price: result.price,
        description: result.description,
        category: result.category,
        productCode: newCode,
      });
      toast.success("AI đã bóc tách thông tin và gợi ý Mã sản phẩm thành công!");
    } catch (error) {
      console.error("Lỗi AI bóc tách:", error);
      toast.error("AI không thể bóc tách thông tin từ ảnh này.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateMarketing = async () => {
    if (!formData.name) return;
    setIsGenerating(true);
    try {
      const content = await generateMarketingContent(
        formData.name,
        formData.description || "",
      );
      setMarketingContent(content);
    } catch (error) {
      console.error("Lỗi Marketing AI:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error(messages.alerts?.enterName || "Vui lòng nhập tên sản phẩm!");
      return;
    }
    if (formData.price <= 0) {
      toast.error(messages.alerts?.enterPrice || "Vui lòng nhập giá sản phẩm lớn hơn 0!");
      return;
    }
    if (!formData.productCode || formData.productCode.includes(" ")) {
      toast.error("Mã sản phẩm không được để trống và không được chứa khoảng trắng!");
      return;
    }
    setIsSaving(true);
    try {
      const payload: ProductInput = {
        ...formData,
        id: editingId ?? undefined,
      };
      const res = await saveProduct(payload);
      if (res.success && res.product) {
        toast.success(res.message || messages.alerts?.saveSuccess || "Lưu sản phẩm thành công!");
        
        setProducts((prev) => {
          const exists = prev.some((x) => x.id === res.product!.id);
          if (exists) {
            return prev.map((x) => (x.id === res.product!.id ? res.product! : x));
          }
          return [res.product!, ...prev];
        });
        
        // Không đóng form để người dùng tiếp tục thao tác
        // setShowForm(false);
        // resetForm(); 
        
        router.refresh();
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.error("Lỗi lưu sản phẩm:", error);
      toast.error(messages.alerts?.saveError || "Đã xảy ra lỗi không xác định khi lưu.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    const product = products.find(p => p.id === id);
    toast(`Xác nhận xóa sản phẩm: ${product?.name || ""}?`, {
      description: "Hành động này không thể hoàn tác.",
      action: {
        label: "Xóa ngay",
        onClick: () => {
          startTransition(async () => {
            const res = await deleteProduct(id);
            if (res.success) {
              setProducts((prev) => prev.filter((p) => p.id !== id));
              toast.success("Đã xóa sản phẩm thành công");
              router.refresh();
            } else {
              toast.error("Không thể xóa sản phẩm");
            }
          });
        },
      },
    });
  };

  const handleArchiveToggle = (id: string, archived: boolean) => {
    startTransition(async () => {
      const res = await setProductArchived(id, archived);
      if (res.success && res.product) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? res.product! : p)),
        );
        router.refresh();
      }
    });
  };

  // Stats tổng nhanh
  const totalActive = products.filter(p => p.status === "ACTIVE").length;
  const totalArchived = products.filter(p => p.status === "ARCHIVED").length;

  return (
    <div className="grid gap-6">
      {/* Quick stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: messages.active || "Đang bán", value: totalActive, color: "var(--brand)" },
          { label: messages.archived || "Lưu kho", value: totalArchived, color: "var(--muted)" },
          { label: messages.total || "Tổng cộng", value: products.length, color: "var(--foreground-strong)" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3 flex items-center gap-3">
            <BarChart3 className="h-4 w-4 shrink-0" style={{ color: s.color }} />
            <div>
              <div className="text-xs text-[color:var(--muted)] font-medium">{s.label}</div>
              <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-[color:var(--brand)]" />
          {messages.catalog || "Danh mục Sản phẩm"}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[color:var(--line)] p-0.5 bg-[color:var(--surface-soft)]">
            {(["ACTIVE", "ARCHIVED", "ALL"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  tab === k
                    ? "bg-[color:var(--brand)] text-white"
                    : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                }`}
              >
                {k === "ACTIVE"
                  ? messages.active || "Đang bán"
                  : k === "ARCHIVED"
                    ? messages.archived || "Lưu kho"
                    : messages.all || "Tất cả"}
              </button>
            ))}
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="rounded-xl"
            variant={showForm ? "outline" : "primary"}
          >
            {showForm ? (messages.closeForm || "Đóng Form") : (
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {messages.addProduct}
              </div>
            )}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] animate-in fade-in slide-in-from-top-4 duration-300">
          <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-lg overflow-hidden relative h-fit">
            <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--brand)]" />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-[color:var(--brand)]" />
                {editingId ? messages.edit || "Sửa sản phẩm" : (messages.productInfo || "Thông tin Sản phẩm")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-col sm:flex-row">
                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                      {messages.productName}
                    </label>
                    <input
                      type="text"
                      className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)]"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)] flex items-center justify-between">
                      <span>{messages.productCodeLabel || "Mã SP (Product Code)"}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const code = generateCodeFromName(formData.name);
                          if (code) {
                            setFormData({ ...formData, productCode: code });
                            toast.info(messages.autoGenerateHint || "Đã tạo mã sản phẩm tự động");
                          } else {
                            toast.error(messages.autoGenerateError || "Vui lòng nhập tên sản phẩm trước để tạo mã");
                          }
                        }}
                        className="text-[10px] text-[color:var(--brand)] hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        {messages.autoGenerate || "Tạo tự động"}
                      </button>
                    </label>
                    <input
                      type="text"
                      placeholder={messages.productCodePlaceholder || "VD: AO-SOMI-01"}
                      className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)] font-mono"
                      value={formData.productCode || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\s+/g, "").toUpperCase();
                        setFormData({ ...formData, productCode: val });
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                        {messages.price}
                      </label>
                      <input
                        type="number"
                        className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)]"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                        {messages.categories?.label || "Danh mục"}
                      </label>
                      <select
                        className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)] appearance-none"
                        value={formData.category || ""}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="">-- {messages.categories?.selectPrompt || "Chọn danh mục"} --</option>
                        {categories.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="sm:w-36 space-y-2">
                  <label className="text-[10px] font-bold uppercase text-[color:var(--muted)] text-center block">
                    Ảnh sản phẩm
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                    {formData.images?.map((url, idx) => (
                      <div key={idx} className="relative group h-16 w-16 sm:h-24 sm:w-full rounded-xl border border-[color:var(--line)] overflow-hidden bg-[color:var(--surface-soft)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = formData.images?.filter((_, i) => i !== idx) || [];
                            setFormData({ 
                              ...formData, 
                              images: newImages,
                              imageUrl: formData.imageUrl === url ? (newImages[0] || "") : formData.imageUrl
                            });
                          }}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
                        {formData.imageUrl === url && (
                          <div className="absolute top-1 left-1 bg-[color:var(--brand)] text-white text-[8px] px-1 rounded font-bold uppercase">
                            Chính
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.multiple = true;
                        input.accept = "image/*";
                        input.onchange = (e) => handleFileUpload((e.target as HTMLInputElement).files);
                        input.click();
                      }}
                      className="flex h-16 w-16 sm:h-24 sm:w-full items-center justify-center rounded-xl border-2 border-dashed border-[color:var(--line)] hover:border-[color:var(--brand)] text-[color:var(--muted)] hover:text-[color:var(--brand)] transition-all bg-[color:var(--surface-soft)]"
                    >
                      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)] flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  {messages.imageUrl || "URL ảnh sản phẩm"}
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)]"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setImagePreviewError(false); // Reset lỗi khi người dùng thay đổi URL
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                  {messages.description}
                </label>
                <textarea
                  className="w-full min-h-[80px] rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)] resize-none"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <ProductMetadataEditor
                value={formData.metadata || ""}
                onChange={(val) => setFormData({ ...formData, metadata: val })}
              />

              <CommercePolicyEditor
                value={formData.commercePolicyJson}
                onChange={(val) => setFormData({ ...formData, commercePolicyJson: val })}
                messages={messages}
              />

              <div className="flex gap-2 pt-2 flex-wrap">
                <Button
                  variant="outline"
                  className="flex-1 min-w-[140px] h-11 rounded-xl border-[color:var(--brand-soft)] text-[color:var(--brand-strong)] hover:bg-[color:var(--brand-softer)]"
                  onClick={handleExtract}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {messages.aiExtract}
                </Button>
                <Button
                  className="flex-1 min-w-[140px] h-11 rounded-xl bg-[image:var(--brand-gradient)] font-semibold"
                  onClick={handleSave}
                  disabled={isSaving || !formData.name}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {messages.saveProduct}
                </Button>
                {editingId ? (
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-11"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                  >
                    {messages.cancelEdit || "Hủy sửa"}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader className="pb-3 border-b border-[color:var(--line)]">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-[color:var(--brand)]" />
                {messages.marketingAssist}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="min-h-[200px] rounded-2xl bg-[color:var(--surface-soft)] border border-[color:var(--line)] p-5 text-sm leading-relaxed whitespace-pre-wrap italic text-[color:var(--foreground-strong)]">
                {isGenerating ? (
                  <div className="space-y-3">
                    <div className="h-4 w-full animate-pulse bg-[color:var(--line)] rounded" />
                    <div className="h-4 w-5/6 animate-pulse bg-[color:var(--line)] rounded" />
                    <div className="h-4 w-4/6 animate-pulse bg-[color:var(--line)] rounded" />
                  </div>
                ) : (
                  marketingContent || (
                    <span className="text-[color:var(--muted)] opacity-50">
                      {messages.marketingPlaceholder}
                    </span>
                  )
                )}
              </div>

              {marketingContent && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-9 rounded-xl text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(marketingContent);
                      toast.success(messages.alerts?.copySuccess || "Đã sao chép nội dung marketing!");
                    }}
                  >
                    {messages.alerts?.copyLabel || "Sao chép đăng bài"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-9 rounded-xl text-xs text-[color:var(--brand-strong)]"
                    onClick={() => setFormData({ ...formData, description: marketingContent })}
                  >
                    {messages.alerts?.useAsDescription || "Dùng làm mô tả SP"}
                  </Button>
                </div>
              )}

              <Button
                variant="primary"
                className="w-full h-11 rounded-xl"
                onClick={handleGenerateMarketing}
                disabled={isGenerating || !formData.name}
              >
                {!isGenerating && <Sparkles className="h-4 w-4 mr-2" />}
                {isGenerating ? messages.generating : (messages.alerts?.writeNew || "Soạn nội dung mới")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Preview Slider Modal */}
      {previewProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setPreviewProduct(null)}>
          <div 
            className="bg-[color:var(--surface)] w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Slider Section */}
            <div className="relative w-full md:w-1/2 bg-black flex items-center justify-center group min-h-[300px]">
              {(() => {
                const images = previewProduct.images ? JSON.parse(previewProduct.images) : (previewProduct.imageUrl ? [previewProduct.imageUrl] : []);
                const currentImg = images[currentPreviewImage] || previewProduct.imageUrl;
                
                return (
                  <>
                    {currentImg ? (
                      <img 
                        src={currentImg} 
                        alt={previewProduct.name} 
                        className="max-h-full w-full object-contain"
                      />
                    ) : (
                      <Package className="h-20 w-20 text-white/20" />
                    )}
                    
                    {images.length > 1 && (
                      <>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPreviewImage(prev => (prev - 1 + images.length) % images.length);
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all z-20 border border-white/10"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPreviewImage(prev => (prev + 1) % images.length);
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all z-20 border border-white/10"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                        
                        {/* Dots */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_: any, idx: number) => (
                            <div 
                              key={idx}
                              className={cn(
                                "h-1.5 rounded-full transition-all",
                                idx === currentPreviewImage ? "w-4 bg-[color:var(--brand)]" : "w-1.5 bg-white/40"
                              )}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
              
              <button 
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md z-10 md:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info Section */}
            <div className="w-full md:w-1/2 p-8 flex flex-col relative overflow-y-auto bg-[color:var(--surface)]">
              <button 
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-[color:var(--surface-soft)] text-[color:var(--muted)] transition-colors hidden md:block"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="flex-1">
                <Badge className="w-fit mb-4 bg-[color:var(--brand-softer)] text-[color:var(--brand-strong)] border-none px-3 py-1">
                  {previewProduct.category ? (messages.categories?.[previewProduct.category] || previewProduct.category) : "Sản phẩm"}
                </Badge>
                
                <h2 className="text-2xl font-bold text-[color:var(--foreground-strong)] mb-2">
                  {previewProduct.name}
                </h2>
                
                {previewProduct.productCode && (
                  <div className="text-sm font-mono text-[color:var(--muted)] mb-6 flex items-center gap-2">
                    <span className="bg-[color:var(--surface-soft)] px-2 py-0.5 rounded border border-[color:var(--line)]">
                      {previewProduct.productCode}
                    </span>
                  </div>
                )}

                <div className="text-3xl font-bold text-[color:var(--brand-strong)] mb-8">
                  {previewProduct.price.toLocaleString("vi-VN")} đ
                </div>

                <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] mb-3">
                  Mô tả sản phẩm
                </div>
                <p className="text-[color:var(--foreground)] leading-relaxed whitespace-pre-wrap">
                  {previewProduct.description || "Chưa có mô tả chi tiết cho sản phẩm này."}
                </p>
              </div>

              <div className="mt-10 flex gap-3">
                <Button 
                  className="flex-1 h-12 rounded-2xl bg-[color:var(--brand)] text-white hover:bg-[color:var(--brand-strong)] font-bold shadow-lg shadow-[color:var(--brand-softer)]"
                  onClick={() => {
                    beginEdit(previewProduct);
                    setPreviewProduct(null);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Button>
                <Button 
                  variant="outline"
                  className="h-12 w-12 rounded-2xl flex items-center justify-center border-[color:var(--line)]"
                  onClick={() => {
                    const content = `${previewProduct.name}\nGiá: ${previewProduct.price.toLocaleString("vi-VN")}đ\n${previewProduct.description || ""}`;
                    navigator.clipboard.writeText(content);
                    toast.success("Đã sao chép nội dung");
                  }}
                >
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <Card
            key={product.id}
            className="overflow-hidden group hover:border-[color:var(--brand)] transition-all hover:shadow-xl hover:-translate-y-1"
          >
            <div 
              className="h-32 bg-[color:var(--surface-soft)] flex items-center justify-center relative overflow-hidden group cursor-pointer"
              onClick={() => {
                setPreviewProduct(product);
                setCurrentPreviewImage(0);
              }}
            >
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    // Ảnh lỗi → ẩn và hiện icon fallback
                    (e.target as HTMLImageElement).style.display = "none";
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      const icon = parent.querySelector(".fallback-icon") as HTMLElement | null;
                      if (icon) icon.style.display = "flex";
                    }
                  }}
                />
              ) : null}
              <div
                className="fallback-icon absolute inset-0 flex items-center justify-center"
                style={{ display: product.imageUrl ? "none" : "flex" }}
              >
                <Package className="h-10 w-10 text-[color:var(--muted)] opacity-20 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                  <Badge className="bg-white/90 text-black border-none shadow-xl">{messages.quickView || "Xem nhanh"}</Badge>
                </div>
              </div>
              <Badge className="absolute top-2 right-2 bg-[color:var(--surface-glass)] backdrop-blur text-[color:var(--foreground)] border-[color:var(--brand-soft)]">
                {product.category ? (messages.categories?.[product.category] || product.category) : (messages.categories?.OTHER || "General")}
              </Badge>
              {product.status === "ARCHIVED" ? (
                <Badge className="absolute top-2 left-2 bg-amber-500/90 text-white border-0 text-[10px]">
                  {messages.archived || "Lưu kho"}
                </Badge>
              ) : null}
            </div>
            <CardContent className="p-4">
              <div className="font-bold text-[color:var(--foreground-strong)] truncate">
                {product.name}
              </div>
              {((product as any).productCode) && (
                <div className="text-[10px] text-[color:var(--muted)] truncate font-mono">
                  {(product as any).productCode}
                </div>
              )}
              <div className="mt-1 flex items-center gap-1.5 font-bold text-[color:var(--brand-strong)]">
                <DollarSign className="h-3.5 w-3.5" />
                {product.price.toLocaleString("vi-VN")} đ
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(() => {
                  const p = parsePolicy((product as any).commercePolicyJson);
                  const paymentColor = p.paymentMode === "PREPAID" ? "bg-sky-500/10 text-sky-700 border-sky-500/20" : p.paymentMode === "COD" ? "bg-amber-500/10 text-amber-700 border-amber-500/20" : "bg-slate-100 text-slate-500 border-slate-200";
                  const fulfillColor = p.fulfillmentMode === "GHN_SHIPPING" ? "bg-green-500/10 text-green-700 border-green-500/20" : p.fulfillmentMode === "EMAIL_DELIVERY" ? "bg-purple-500/10 text-purple-700 border-purple-500/20" : "bg-slate-100 text-slate-500 border-slate-200";
                  return (
                    <>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-bold border", paymentColor)}>{PAYMENT_LABELS[p.paymentMode]?.split(" ")[0] ?? p.paymentMode}</span>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-bold border", fulfillColor)}>{FULFILLMENT_LABELS[p.fulfillmentMode]?.split(" ")[0] ?? p.fulfillmentMode}</span>
                    </>
                  );
                })()}
              </div>
              <div className="mt-2 text-xs text-[color:var(--muted)] line-clamp-2 min-h-[2.5rem]">
                {product.description || "Chưa có mô tả..."}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={isPending}
                  onClick={() => beginEdit(product)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  {messages.edit || "Sửa"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={isPending}
                  onClick={() =>
                    handleArchiveToggle(product.id, product.status !== "ARCHIVED")}
                >
                  {product.status === "ARCHIVED" ? (
                    <>
                      <ArchiveRestore className="h-3 w-3 mr-1" />
                      {messages.restore || "Khôi phục"}
                    </>
                  ) : (
                    <>
                      <Archive className="h-3 w-3 mr-1" />
                      {messages.archive || "Lưu kho"}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-red-600 hover:text-red-700"
                  disabled={isPending}
                  onClick={() => handleDelete(product.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {messages.delete || "Xóa"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && !showForm && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-[color:var(--muted)] opacity-50 border-2 border-dashed rounded-3xl">
            <Package className="h-12 w-12 mb-4" />
            <p>{messages.emptyList || "Danh sách sản phẩm trống. Hãy thêm sản phẩm mới!"}</p>
          </div>
        )}
      </div>

      {/* Xuất SKU - tích hợp phía cuối trang */}
      {products.length > 0 && (
        <ShopeeSkuExport
          products={products.map(p => ({ name: p.name, price: Number(p.price) }))}
          messages={{
            title: messages.exportTitle || "Xuất danh sách sản phẩm",
            description: messages.exportDescription || "Tải file CSV chứa tên và giá để dùng với Shopee, TikTok Shop, v.v.",
            button: messages.exportButton || "Tải CSV",
          }}
        />
      )}
    </div>
  );
}
