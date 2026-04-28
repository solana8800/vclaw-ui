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
} from "lucide-react";
import { ShopeeSkuExport } from "@/components/admin/shopee-sku-export";
import { ProductMetadataEditor } from "@/components/admin/product-metadata-editor";

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

type ProductManagerMessages = {
  addProduct: string;
  productName: string;
  price: string;
  description: string;
  uploadImage: string;
  imageUrl?: string;
  aiExtract: string;
  marketingAssist: string;
  extracting: string;
  generating: string;
  saveProduct: string;
  marketingPlaceholder: string;
  edit?: string;
  delete?: string;
  archive?: string;
  restore?: string;
  archived?: string;
  active?: string;
  cancelEdit?: string;
};

export function ProductManager({
  messages,
  initialProducts = [],
}: {
  messages: ProductManagerMessages;
  initialProducts?: Product[];
}) {
  // Trạng thái preview ảnh khi nhập URL
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState(initialProducts);
  const [tab, setTab] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductInput>({
    name: "",
    price: 0,
    description: "",
    imageUrl: "",
    category: "",
    productCode: "",
    metadata: "",
  });

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
      status: p.status as "ACTIVE" | "ARCHIVED",
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
    });
    setMarketingContent("");
    setImagePreviewError(false);
  };

  const handleExtract = async () => {
    const url = formData.imageUrl?.trim();
    if (!url) {
      alert("Vui lòng nhập link ảnh sản phẩm trước!");
      return;
    }

    setIsExtracting(true);
    try {
      // Check if image already exists
      const check = await checkProductImageExists(url, editingId ?? undefined);
      if (check.exists) {
        if (!confirm(`Ảnh này đã được dùng cho sản phẩm: "${check.product?.name}". Bạn có muốn tiếp tục bóc tách không?`)) {
          setIsExtracting(false);
          return;
        }
      }

      const result = await extractProductFromImage(url);
      setFormData({
        ...formData,
        name: result.name,
        price: result.price,
        description: result.description,
        category: result.category,
      });
    } catch (error) {
      console.error("Lỗi AI bóc tách:", error);
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
      alert("Vui lòng nhập tên sản phẩm!");
      return;
    }
    if (formData.price <= 0) {
      alert("Vui lòng nhập giá sản phẩm lớn hơn 0!");
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
        alert(res.message || "Lưu sản phẩm thành công!");
        
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
        alert(res.error);
      }
    } catch (error) {
      console.error("Lỗi lưu sản phẩm:", error);
      alert("Đã xảy ra lỗi không xác định khi lưu.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Xóa vĩnh viễn sản phẩm này?")) return;
    startTransition(async () => {
      const res = await deleteProduct(id);
      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      }
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
          { label: "Đang bán", value: totalActive, color: "var(--brand)" },
          { label: "Lưu kho", value: totalArchived, color: "var(--muted)" },
          { label: "Tổng cộng", value: products.length, color: "var(--foreground-strong)" },
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
          Danh mục Sản phẩm
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
                    : "Tất cả"}
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
            {showForm ? "Đóng Form" : (
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
                {editingId ? messages.edit || "Sửa sản phẩm" : "Thông tin Sản phẩm"}
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
                    <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                      Mã SP (Product Code)
                    </label>
                    <input
                      type="text"
                      className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)]"
                      value={formData.productCode || ""}
                      onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
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
                        Danh mục
                      </label>
                      <input
                        type="text"
                        className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)]"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                {/* Image preview realtime */}
              <div className="sm:w-36 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[color:var(--line)] p-3 overflow-hidden relative">
                {formData.imageUrl && !imagePreviewError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="absolute inset-0 h-full w-full object-cover rounded-2xl"
                    onError={() => setImagePreviewError(true)}
                  />
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-[color:var(--muted)]" />
                    <span className="text-[10px] text-[color:var(--muted)] font-medium text-center">
                      {imagePreviewError ? "Ảnh lỗi" : messages.uploadImage}
                    </span>
                  </>
                )}
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
                    onClick={() => navigator.clipboard.writeText(marketingContent)}
                  >
                    Sao chép đăng bài
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-9 rounded-xl text-xs text-[color:var(--brand-strong)]"
                    onClick={() => setFormData({ ...formData, description: marketingContent })}
                  >
                    Dùng làm mô tả SP
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
                {isGenerating ? messages.generating : "Soạn nội dung mới"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <Card
            key={product.id}
            className="overflow-hidden group hover:border-[color:var(--brand)] transition-all hover:shadow-xl hover:-translate-y-1"
          >
            <div className="h-32 bg-[color:var(--surface-soft)] flex items-center justify-center relative overflow-hidden">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
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
              <Badge className="absolute top-2 right-2 bg-[color:var(--surface-glass)] backdrop-blur text-[color:var(--foreground)] border-[color:var(--brand-soft)]">
                {product.category || "General"}
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
              <div className="mt-3 text-xs text-[color:var(--muted)] line-clamp-2 min-h-[2.5rem]">
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
            <p>Danh sách sản phẩm trống. Hãy thêm sản phẩm mới!</p>
          </div>
        )}
      </div>

      {/* Xuất SKU - tích hợp phía cuối trang */}
      {products.length > 0 && (
        <ShopeeSkuExport
          products={products.map(p => ({ name: p.name, price: Number(p.price) }))}
          messages={{
            title: "Xuất danh sách SKU",
            description: "Tải file CSV chứa tên và giá để dùng với Shopee, TikTok Shop, v.v.",
            button: "Tải CSV",
          }}
        />
      )}
    </div>
  );
}
