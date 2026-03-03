"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { databases, APPWRITE_CONFIG, storage } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { 
  ArrowLeft, Plus, Pencil, Trash2, ShieldAlert, Save, X, Upload, Loader2, 
  Package, CheckCircle, XCircle, Search, Grid, List, Coffee, Database, Settings
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { MobileNav } from "@/components/pos/MobileNav";
import { CartDrawer } from "@/components/pos/CartDrawer";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTheme } from "next-themes";

interface Product {
  $id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  isVeg: boolean;
  image: string;
  available: boolean;
}

const DEFAULT_CATEGORIES = [
  "Fresh Juice", "Fruite Milk Shake", "Food Factory Special", "Soda",
  "Lassi", "Smoothie", "Falooda", "Mojito", "Health Drinks",
  "Sandwich", "Non Veg Sandwich", "Maggie", "Non Veg Maggi",
];

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<"checking" | "ready" | "error">("checking");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(theme === "dark");
  }, [theme]);

  const [form, setForm] = useState({
    name: "", description: "", category: DEFAULT_CATEGORIES[0], price: 0,
    isVeg: true, image: "", imagePreview: "", available: true,
  });

  const checkDatabase = async () => {
    try {
      await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.PRODUCTS_COLLECTION,
        [Query.limit(1)]
      );
      setDbStatus("ready");
      return true;
    } catch (error: any) {
      console.log("Database not ready:", error.message);
      setDbStatus("error");
      return false;
    }
  };

  const extractCategories = (productList: Product[]) => {
    const cats = new Set<string>();
    productList.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    const sortedCats = Array.from(cats).sort();
    setCategories(["All", ...sortedCats]);
  };

  const fetchProducts = async () => {
    try {
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.PRODUCTS_COLLECTION,
        [Query.limit(500), Query.orderDesc("name")]
      );
      const productsList = response.documents.map((doc: any) => {
        let imageUrl = "";
        const imageField = doc.image || "";
        if (imageField) {
          if (imageField.startsWith('http')) {
            imageUrl = imageField;
          } else {
            imageUrl = `${APPWRITE_CONFIG.ENDPOINT}/storage/buckets/${APPWRITE_CONFIG.IMAGES_BUCKET}/files/${imageField}/view?project=${APPWRITE_CONFIG.PROJECT_ID}`;
          }
        }
        return { ...doc, image: imageUrl };
      }) as unknown as Product[];
      setProducts(productsList);
      extractCategories(productsList);
      extractCategories(productsList);
    } catch (error: any) {
      console.log("Fetch error:", error.message);
      setProducts([]);
      setCategories(["All", ...DEFAULT_CATEGORIES]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && isAdmin) {
      checkDatabase().then((ready) => {
        if (ready) fetchProducts();
        else setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, isAdmin]);

  if (authLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-6">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Only admin can access this page</p>
          <Link to="/" className="text-primary font-semibold">Go to Home</Link>
        </div>
      </div>
    );
  }

  const startEdit = (p: Product) => {
    setEditingProduct(p);
    // Check if image is already a fileId (no slashes) or a full URL
    const isFileId = p.image && !p.image.includes('/storage/') && !p.image.startsWith('http');
    setForm({
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      isVeg: p.isVeg,
      image: isFileId ? p.image : "", // Keep fileId if exists
      imagePreview: p.image, // Show current image as preview
      available: p.available,
    });
    setIsNew(false);
  };

  const startNew = () => {
    setEditingProduct({} as Product);
    setForm({
      name: "", description: "", category: categories[1] || DEFAULT_CATEGORIES[0], price: 0,
      isVeg: true, image: "", imagePreview: "", available: true,
    });
    setIsNew(true);
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setForm({ name: "", description: "", category: categories[1] || DEFAULT_CATEGORIES[0], price: 0, isVeg: true, image: "", imagePreview: "", available: true });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Create temp URL for immediate preview
      const tempPreview = URL.createObjectURL(file);
      
      // Upload to Appwrite
      const uploaded = await storage.createFile(APPWRITE_CONFIG.IMAGES_BUCKET, ID.unique(), file);
      const fileId = uploaded.$id;
      
      // Use temp preview immediately, save fileId for database
      setForm(prev => ({ ...prev, image: fileId, imagePreview: tempPreview }));
      toast.success("Image uploaded!");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Storage upload failed:", err);
      toast.error(err.message || "Failed to upload image. Check bucket permissions.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.error("Product name is required");
      return;
    }
    try {
      const data: Record<string, any> = {
        name: form.name.trim(),
        description: form.description || "",
        category: form.category,
        price: Number(form.price) || 0,
        isVeg: form.isVeg,
        available: form.available,
      };
      
      // Only update image if user uploaded a new one (fileId format)
      // If image is empty, keep the original
      if (form.image) {
        const isFileId = !form.image.includes('/storage/') && !form.image.startsWith('http') && !form.image.startsWith('blob:') && !form.image.startsWith('data:');
        data.image = form.image;
      } else if (editingProduct?.image && !isNew) {
        // Keep original image if no new image uploaded
        delete data.image;
      }
      
      if (isNew) {
        await databases.createDocument(APPWRITE_CONFIG.DATABASE_ID, APPWRITE_CONFIG.PRODUCTS_COLLECTION, ID.unique(), data);
        toast.success("Product added!");
      } else {
        await databases.updateDocument(APPWRITE_CONFIG.DATABASE_ID, APPWRITE_CONFIG.PRODUCTS_COLLECTION, editingProduct.$id, data);
        toast.success("Product updated!");
      }
      cancelEdit();
      setTimeout(() => fetchProducts(), 100);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await databases.deleteDocument(APPWRITE_CONFIG.DATABASE_ID, APPWRITE_CONFIG.PRODUCTS_COLLECTION, id);
      toast.success("Deleted!");
      fetchProducts();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleAvailability = async (p: Product) => {
    try {
      await databases.updateDocument(APPWRITE_CONFIG.DATABASE_ID, APPWRITE_CONFIG.PRODUCTS_COLLECTION, p.$id, { available: !p.available });
      fetchProducts();
      toast.success(p.available ? "Marked as unavailable" : "Marked as available");
    } catch {
      toast.error("Failed to update");
    }
  };

  const stats = {
    total: products.length,
    available: products.filter(p => p.available).length,
    unavailable: products.filter(p => !p.available).length,
    categories: categories.length - 1,
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "All" || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                {dbStatus === "ready" ? `${stats.total} Products` : dbStatus === "checking" ? "Checking..." : "Setup Required"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {dbStatus === "ready" && (
              <button onClick={startNew} className="px-4 py-2 rounded-xl cart-gradient text-white text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-orange-500/20">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            )}
          </div>
        </div>
      </header>

      {dbStatus !== "ready" ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Database className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            {dbStatus === "checking" ? "Checking Database..." : "Database Not Connected"}
          </h2>
          <p className="text-muted-foreground text-center">
            {dbStatus === "checking" ? "Please wait..." : "Database not available"}
          </p>
        </div>
      ) : (
      <main className="container mx-auto px-4 py-4 pb-40">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Products", value: stats.total, icon: Package, color: "from-blue-500 to-blue-600" },
            { label: "Available", value: stats.available, icon: CheckCircle, color: "from-green-500 to-green-600" },
            { label: "Unavailable", value: stats.unavailable, icon: XCircle, color: "from-red-500 to-red-600" },
            { label: "Categories", value: stats.categories, icon: Coffee, color: "from-purple-500 to-purple-600" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <MagicCard className="p-4" gradientColor={isDark ? "#1e293b" : "#e2e8f0"}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </MagicCard>
            </motion.div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground"
          >
            <option value="All">All Categories</option>
            {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-1 bg-secondary rounded-xl p-1">
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-primary text-white" : "text-muted-foreground"}`}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg ${viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Products Grid/List */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredProducts.map((p, i) => (
                <motion.div key={p.$id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                  <MagicCard className="overflow-hidden" gradientColor={isDark ? "#1e293b" : "#f1f5f9"}>
                    <div className="relative aspect-square">
                      <img src={p.image || "/placeholder.svg"} alt={p.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => toggleAvailability(p)}
                        className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                          p.available ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        {p.available ? <CheckCircle className="w-4 h-4 text-white" /> : <XCircle className="w-4 h-4 text-white" />}
                      </button>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={p.isVeg ? "w-3 h-3 rounded-full bg-green-500" : "w-3 h-3 rounded-full bg-red-500"} />
                        <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{p.category}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">₹{p.price}</span>
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(p)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(p.$id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </MagicCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((p, i) => (
              <motion.div key={p.$id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                  <img src={p.image || "/placeholder.svg"} alt={p.name} className="w-14 h-14 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={p.isVeg ? "w-3 h-3 rounded-full bg-green-500" : "w-3 h-3 rounded-full bg-red-500"} />
                      <p className="font-semibold text-foreground truncate">{p.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">₹{p.price}</p>
                    <button onClick={() => toggleAvailability(p)} className={`text-xs ${p.available ? "text-green-500" : "text-red-500"}`}>
                      {p.available ? "Available" : "Unavailable"}
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(p)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p.$id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={cancelEdit}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg glass-card rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">{isNew ? "Add Product" : "Edit Product"}</h2>
                <button onClick={cancelEdit} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Product Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground" placeholder="Enter product name" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Category</label>
                    <div className="flex gap-2">
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground">
                        {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input
                        type="text"
                        placeholder="New"
                        list="new-category"
                        className="w-24 px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground"
                        onChange={(e) => {
                          if (e.target.value && !categories.includes(e.target.value)) {
                            setForm({ ...form, category: e.target.value });
                          }
                        }}
                      />
                      <datalist id="new-category">
                        {DEFAULT_CATEGORIES.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Price (₹)</label>
                    <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground resize-none h-20" placeholder="Product description" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Product Image</label>
                  <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm flex items-center gap-2">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? "Uploading..." : "Choose Image"}
                    </button>
                    <input type="text" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground" placeholder="Or paste image URL" />
                  </div>
                  {form.imagePreview ? (
                    <div className="mt-3 relative inline-block">
                      <img src={form.imagePreview} alt="Preview" className="w-24 h-24 rounded-lg object-cover border-2 border-border" />
                      <button onClick={() => setForm({ ...form, image: "", imagePreview: "" })} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={form.isVeg} onChange={(e) => setForm({ ...form, isVeg: e.target.checked })} className="w-4 h-4 rounded" />
                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500" /> Veg</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="w-4 h-4 rounded" />
                    Available
                  </label>
                </div>

                <button onClick={handleSave} className="w-full py-3 rounded-xl cart-gradient text-white font-semibold flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {isNew ? "Add Product" : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
