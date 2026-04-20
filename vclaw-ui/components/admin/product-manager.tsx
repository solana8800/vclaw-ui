"use client";

import { useState } from "react";
import { 
  Package, 
  Image as ImageIcon, 
  Sparkles, 
  Save, 
  Loader2, 
  Plus, 
  LayoutGrid,
  FileText,
  Tag,
  DollarSign
} from "lucide-react";

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  extractProductFromImage, 
  generateMarketingContent, 
  saveProduct, 
  type ProductInput 
} from "@/lib/actions/product-actions";

export function ProductManager({ 
  messages, 
  initialProducts = [] 
}: { 
  messages: any, 
  initialProducts?: any[] 
}) {
  const [products, setProducts] = useState(initialProducts);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<ProductInput>({
    name: "",
    price: 0,
    description: "",
    imageUrl: "",
    category: ""
  });
  
  const [marketingContent, setMarketingContent] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Giả lập bóc tách thông tin từ ảnh
  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      const result = await extractProductFromImage("mock-url");
      setFormData({
        ...formData,
        name: result.name,
        price: result.price,
        description: result.description,
        category: result.category
      });
    } catch (error) {
      console.error("Lỗi AI bóc tách:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  // Giả lập tạo nội dung marketing
  const handleGenerateMarketing = async () => {
    if (!formData.name) return;
    setIsGenerating(true);
    try {
      const content = await generateMarketingContent(formData.name, formData.description || "");
      setMarketingContent(content);
    } catch (error) {
      console.error("Lỗi Marketing AI:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || formData.price <= 0) return;
    setIsSaving(true);
    try {
      const res = await saveProduct(formData);
      if (res.success) {
        setProducts([res.product, ...products]);
        setShowForm(false);
        setFormData({ name: "", price: 0, description: "", imageUrl: "", category: "" });
        setMarketingContent("");
      }
    } catch (error) {
      console.error("Lỗi lưu sản phẩm:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-[color:var(--brand)]" />
          Danh mục Sản phẩm
        </h2>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl"
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? "Đóng Form" : (
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {messages.addProduct}
            </div>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Form Section */}
          <Card className="border-[color:var(--brand-soft)] bg-[color:var(--surface-strong)] shadow-lg overflow-hidden relative h-fit">
            <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--brand)]" />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-[color:var(--brand)]" />
                Thông tin Sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">{messages.productName}</label>
                    <input 
                      type="text"
                      className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)]"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">{messages.price}</label>
                      <input 
                        type="number"
                        className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)]"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Danh mục</label>
                      <input 
                        type="text"
                        className="w-full h-11 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)]"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-[color:var(--line)] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[color:var(--surface-soft)] transition-colors group">
                   <ImageIcon className="h-6 w-6 text-[color:var(--muted)] group-hover:text-[color:var(--brand)]" />
                   <span className="text-[10px] text-[color:var(--muted)] font-medium">Tải ảnh</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">{messages.description}</label>
                <textarea 
                  className="w-full min-h-[80px] rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)] resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-11 rounded-xl border-[color:var(--brand-soft)] text-[color:var(--brand-strong)] hover:bg-[color:var(--brand-softer)]"
                  onClick={handleExtract}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : <Sparkles className="h-4 w-4 mr-2" />}
                  {messages.aiExtract}
                </Button>
                <Button 
                  className="flex-1 h-11 rounded-xl bg-[image:var(--brand-gradient)] font-semibold"
                  onClick={handleSave}
                  disabled={isSaving || !formData.name}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : <Save className="h-4 w-4 mr-2" />}
                  {messages.saveProduct}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Marketing Section */}
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
                  marketingContent || <span className="text-[color:var(--muted)] opacity-50">{messages.marketingPlaceholder}</span>
                )}
              </div>
              
              <Button 
                variant="glow"
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

      {/* Product List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden group hover:border-[color:var(--brand)] transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="h-32 bg-[color:var(--surface-soft)] flex items-center justify-center relative overflow-hidden">
               <Package className="h-10 w-10 text-[color:var(--muted)] opacity-20 group-hover:scale-110 transition-transform duration-500" />
               <Badge className="absolute top-2 right-2 bg-[color:var(--surface-glass)] backdrop-blur text-[color:var(--foreground)] border-[color:var(--brand-soft)]">
                 {product.category || "General"}
               </Badge>
            </div>
            <CardContent className="p-4">
              <div className="font-bold text-[color:var(--foreground-strong)] truncate">{product.name}</div>
              <div className="mt-1 flex items-center gap-1.5 font-bold text-[color:var(--brand-strong)]">
                <DollarSign className="h-3.5 w-3.5" />
                {product.price.toLocaleString("vi-VN")} đ
              </div>
              <div className="mt-3 text-xs text-[color:var(--muted)] line-clamp-2 min-h-[2.5rem]">
                {product.description || "Chưa có mô tả..."}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {products.length === 0 && !showForm && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-[color:var(--muted)] opacity-50 border-2 border-dashed rounded-3xl">
             <Package className="h-12 w-12 mb-4" />
             <p>Danh sách sản phẩm trống. Hãy thêm sản phẩm mới!</p>
          </div>
        )}
      </div>
    </div>
  );
}
