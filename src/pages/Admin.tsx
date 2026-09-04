"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { supabase, SUPABASE_CONFIG } from "@/lib/supabaseClient";
import { uploadImageToCloudinary } from "@/lib/uploadImage";
import { 
  ArrowLeft, Plus, Pencil, Trash2, ShieldAlert, Save, X, Upload, Loader2, 
  Package, CheckCircle, XCircle, Search, Grid, List, Coffee, Database,
  ArrowUpDown, Eye, EyeOff, ChevronDown, ChevronUp, BarChart3, Users, ReceiptIndianRupee, Coins
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { MobileNav } from "@/components/pos/MobileNav";
import { CartDrawer } from "@/components/pos/CartDrawer";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getCategoryEmoji, CATEGORY_EMOJI_MAP, AVAILABLE_EMOJIS } from "@/data/categories";
import GoogleReviewsManager from "@/components/admin/GoogleReviewsManager";

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  food_type: "veg" | "egg" | "nonveg";
  is_veg: boolean;
  image: string;
  available: boolean;
  details?: Record<string, unknown> | null;
}

interface ProductDetailsForm {
  shortDescription: string;
  compareAtPrice: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  servingLabel: string;
  ingredients: string;
  spiceLevel: "" | "mild" | "medium" | "spicy";
  prepTimeMinutes: string;
  isVegan: boolean;
  isJainFriendly: boolean;
  containsDairy: boolean;
  containsGluten: boolean;
  containsNuts: boolean;
  isInHouseMade: boolean;
  isBestseller: boolean;
}

const EMPTY_DETAILS: ProductDetailsForm = {
  shortDescription: "", compareAtPrice: "", calories: "", protein: "", carbs: "", fat: "",
  servingLabel: "", ingredients: "", spiceLevel: "", prepTimeMinutes: "",
  isVegan: false, isJainFriendly: false, containsDairy: false, containsGluten: false,
  containsNuts: false, isInHouseMade: false, isBestseller: false,
};

function detailsToForm(details: Record<string, unknown> | null | undefined): ProductDetailsForm {
  if (!details) return { ...EMPTY_DETAILS };
  const n = (details.nutrition && typeof details.nutrition === "object" ? details.nutrition : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const numStr = (v: unknown) => (typeof v === "number" && !isNaN(v) ? String(v) : "");
  return {
    shortDescription: str(details.shortDescription),
    compareAtPrice: numStr(details.compareAtPrice),
    calories: numStr(n.calories),
    protein: numStr(n.protein),
    carbs: numStr(n.carbs),
    fat: numStr(n.fat),
    servingLabel: str(n.servingLabel),
    ingredients: Array.isArray(details.ingredients)
      ? details.ingredients.filter((i): i is string => typeof i === "string").join(", ")
      : "",
    spiceLevel: details.spiceLevel === "mild" || details.spiceLevel === "medium" || details.spiceLevel === "spicy"
      ? details.spiceLevel
      : "",
    prepTimeMinutes: numStr(details.prepTimeMinutes),
    isVegan: details.isVegan === true,
    isJainFriendly: details.isJainFriendly === true,
    containsDairy: details.containsDairy === true,
    containsGluten: details.containsGluten === true,
    containsNuts: details.containsNuts === true,
    isInHouseMade: details.isInHouseMade === true,
    isBestseller: details.isBestseller === true,
  };
}

function formToDetails(f: ProductDetailsForm): Record<string, unknown> | null {
  const num = (v: string): number | undefined => {
    const parsed = Number(v);
    return v !== "" && !isNaN(parsed) && parsed > 0 ? parsed : undefined;
  };
  const nutrition: Record<string, unknown> = {};
  if (num(f.calories) != null) nutrition.calories = num(f.calories);
  if (num(f.protein) != null) nutrition.protein = num(f.protein);
  if (num(f.carbs) != null) nutrition.carbs = num(f.carbs);
  if (num(f.fat) != null) nutrition.fat = num(f.fat);
  if (f.servingLabel.trim()) nutrition.servingLabel = f.servingLabel.trim();

  const ingredients = f.ingredients.split(",").map(s => s.trim()).filter(Boolean);

  const details: Record<string, unknown> = {};
  if (f.shortDescription.trim()) details.shortDescription = f.shortDescription.trim();
  if (num(f.compareAtPrice) != null) details.compareAtPrice = num(f.compareAtPrice);
  if (Object.keys(nutrition).length) details.nutrition = nutrition;
  if (ingredients.length) details.ingredients = ingredients;
  if (f.spiceLevel) details.spiceLevel = f.spiceLevel;
  if (num(f.prepTimeMinutes) != null) details.prepTimeMinutes = num(f.prepTimeMinutes);
  if (f.isVegan) details.isVegan = true;
  if (f.isJainFriendly) details.isJainFriendly = true;
  if (f.containsDairy) details.containsDairy = true;
  if (f.containsGluten) details.containsGluten = true;
  if (f.containsNuts) details.containsNuts = true;
  if (f.isInHouseMade) details.isInHouseMade = true;
  if (f.isBestseller) details.isBestseller = true;

  return Object.keys(details).length ? details : null;
}

const DEFAULT_CATEGORIES = [
  "Burger", "Pizza", "Smoothies", "Mojito", "Lassi", "Shakes", "Chinese", "Fast Food", "Dessert"
];

const categoryColors: Record<string, string> = {
  "All": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "Fresh Juices": "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  "Milkshakes": "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "Special Milkshake": "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  "Cold Coffee": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Burgers": "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  "Sandwich": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  "Momos": "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  "Noodles": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Fries": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  "Snacks": "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  "Egg Items": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  "Bakery": "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
  "Desserts": "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "Hot Beverages": "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  "Fresh Juice": "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  "Fruite Milk Shake": "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "Food Factory Special": "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  "Soda": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
  "Lassi": "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  "Smoothie": "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
  "Falooda": "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  "Mojito": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  "Health Drinks": "bg-lime-100 text-lime-700 dark:bg-lime-900/50 dark:text-lime-300",
  "Non Veg Sandwich": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  "Maggie": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Maggi": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Non Veg Maggi": "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  "Juice": "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  "Coffee": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Tea": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Shake": "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "Milk Shake": "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "Ice Cream": "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
};

const getCategoryColor = (category: string) => {
  return categoryColors[category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
};

type FilterType = "all" | "available" | "unavailable";

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
  const [filterStock, setFilterStock] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [sortBy, setSortBy] = useState<"name" | "price" | "category">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [selectCategoryOpen, setSelectCategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{name: string; emoji: string} | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("🍴");
  const [categoryEmojis, setCategoryEmojis] = useState<Record<string, string>>(CATEGORY_EMOJI_MAP);
  const [categoryIds, setCategoryIds] = useState<Record<string, string>>({});
  
  // Dashboard stats
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [monthlySales, setMonthlySales] = useState(0);

  useEffect(() => {
    setIsDark(theme === "dark");
  }, [theme]);

  const fetchCategoriesFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from(SUPABASE_CONFIG.CATEGORIES_TABLE)
        .select("*");
      
      if (data && data.length > 0) {
        const emojis: Record<string, string> = { ...CATEGORY_EMOJI_MAP };
        const ids: Record<string, string> = {};
        
        data.forEach((doc: any) => {
          if (doc.name) {
            emojis[doc.name] = doc.emoji || CATEGORY_EMOJI_MAP[doc.name] || "🍴";
            ids[doc.name] = doc.id;
          }
        });
        
        setCategoryEmojis(emojis);
        setCategoryIds(ids);
      }
    } catch (error) {
      console.log("Using local category emojis", error);
    }
  };

  const [form, setForm] = useState<{
    name: string;
    description: string;
    category: string;
    price: number;
    foodType: "veg" | "egg" | "nonveg";
    image: string;
    imagePreview: string;
    available: boolean;
    details: ProductDetailsForm;
  }>({
    name: "", description: "", category: DEFAULT_CATEGORIES[0], price: 0,
    foodType: "veg", image: "", imagePreview: "", available: true,
    details: { ...EMPTY_DETAILS },
  });

  const checkDatabase = async () => {
    try {
      console.log("Checking database connection...");
      const { error } = await supabase
        .from("products")
        .select("id")
        .limit(1);
      
      if (error) {
        console.log("Database error:", error);
        throw error;
      }
      console.log("Database ready!");
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
      console.log("Fetching products from admin...");
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) {
        console.error("Products fetch error:", error);
        throw error;
      }
      
      console.log("Admin products fetched:", data?.length);
      
      const productsList = (data || []).map((doc: any) => ({
        ...doc,
        foodType: doc.food_type || "veg",
        image: doc.image || "",
      })) as Product[];
      
      setProducts(productsList);
      extractCategories(productsList);
    } catch (error: any) {
      console.log("Fetch error:", error.message);
      setProducts([]);
      setCategories(["All", ...DEFAULT_CATEGORIES]);
    }
    setLoading(false);
  };

  const fetchDashboardStats = async () => {
    try {
      // Fetch total orders
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });
      setTotalOrders(ordersCount || 0);

      // Fetch total customers
      const { count: customersCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });
      setTotalCustomers(customersCount || 0);

      // Reset sales to 0 since we removed them from display
      setTodaySales(0);
      setMonthlySales(0);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchCategoriesFromDB();
      checkDatabase().then((ready) => {
        if (ready) {
          fetchProducts();
          fetchDashboardStats();
        } else {
          setLoading(false);
        }
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
    setForm({
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      foodType: p.food_type || "veg",
      image: p.image || "",
      imagePreview: p.image,
      available: p.available,
      details: detailsToForm(p.details),
    });
    setIsNew(false);
  };

  const startNew = () => {
    setEditingProduct({} as Product);
    setForm({
      name: "", description: "", category: categories[1] || DEFAULT_CATEGORIES[0], price: 0,
      foodType: "veg", image: "", imagePreview: "", available: true,
      details: { ...EMPTY_DETAILS },
    });
    setIsNew(true);
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setForm({ name: "", description: "", category: categories[1] || DEFAULT_CATEGORIES[0], price: 0, foodType: "veg", image: "", imagePreview: "", available: true, details: { ...EMPTY_DETAILS } });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const tempPreview = URL.createObjectURL(file);
      const { url, error: uploadError } = await uploadImageToCloudinary(file);
      
      if (uploadError) {
        toast.error(uploadError);
        setUploading(false);
        return;
      }
      
      setForm(prev => ({ ...prev, image: url, imagePreview: tempPreview }));
      toast.success("Image uploaded!");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Storage upload failed:", err);
      toast.error(err.message || "Failed to upload image");
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
      const now = new Date().toISOString();
      const details = formToDetails(form.details);
      const data: Record<string, unknown> = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        description: form.description || "",
        category: form.category,
        price: Number(form.price) || 0,
        food_type: form.foodType,
        is_veg: form.foodType === "veg",
        available: form.available,
        image: form.image || null,
        created_at: now,
        updated_at: now,
      };
      if (details) data.details = details;

      if (isNew) {
        let error;
        ({ error } = await supabase.from(SUPABASE_CONFIG.PRODUCTS_TABLE).insert(data));
        // `details` column may not exist yet — retry without it so the core save still succeeds.
        if (error && data.details !== undefined) {
          console.warn("Retrying save without product details:", error.message);
          delete data.details;
          ({ error } = await supabase.from(SUPABASE_CONFIG.PRODUCTS_TABLE).insert(data));
          if (!error) toast.warning("Saved without menu details — run the details migration to enable them.");
        }
        if (error) throw error;
        toast.success("Product added successfully!");
      } else {
        const updateData: Record<string, unknown> = {
          name: form.name.trim(),
          description: form.description || "",
          category: form.category,
          price: Number(form.price) || 0,
          food_type: form.foodType,
          is_veg: form.foodType === "veg",
          available: form.available,
          image: form.image || null,
          updated_at: now,
        };
        if (details) updateData.details = details;

        let error;
        ({ error } = await supabase.from(SUPABASE_CONFIG.PRODUCTS_TABLE).update(updateData).eq("id", editingProduct.id));
        if (error && updateData.details !== undefined) {
          console.warn("Retrying save without product details:", error.message);
          delete updateData.details;
          ({ error } = await supabase.from(SUPABASE_CONFIG.PRODUCTS_TABLE).update(updateData).eq("id", editingProduct.id));
          if (!error) toast.warning("Saved without menu details — run the details migration to enable them.");
        }
        if (error) throw error;
        toast.success("Product updated successfully!");
      }
      cancelEdit();
      setTimeout(() => fetchProducts(), 100);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const { error } = await supabase
        .from(SUPABASE_CONFIG.PRODUCTS_TABLE)
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Product deleted!");
      fetchProducts();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleAvailability = async (p: Product) => {
    try {
      const { error } = await supabase
        .from(SUPABASE_CONFIG.PRODUCTS_TABLE)
        .update({ available: !p.available })
        .eq("id", p.id);
      
      if (error) throw error;
      fetchProducts();
      toast.success(p.available ? "Marked as out of stock" : "Marked as available");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    
    const trimmedName = newCategoryName.trim();
    if (categories.some(c => c.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from(SUPABASE_CONFIG.CATEGORIES_TABLE)
        .insert({ name: trimmedName, emoji: newCategoryEmoji, created_at: now });
      
      if (error) {
        console.log("Categories collection not available, using local only", error);
      }

      const newCategories = [...categories, trimmedName];
      setCategories(newCategories);
      setCategoryEmojis(prev => ({ ...prev, [trimmedName]: newCategoryEmoji }));
      setNewCategoryName("");
      setNewCategoryEmoji("🍴");
      setAddCategoryOpen(false);
      toast.success(`Category "${trimmedName}" added!`);
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    
    const oldName = editingCategory.name;
    const trimmedName = newCategoryName.trim();
    
    if (oldName === trimmedName && newCategoryEmoji === editingCategory.emoji) {
      setEditCategoryOpen(false);
      setEditingCategory(null);
      return;
    }

    if (categories.some(c => c.toLowerCase() === trimmedName.toLowerCase() && c.toLowerCase() !== oldName.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }

    try {
      if (categoryIds[oldName]) {
        const { error } = await supabase
          .from(SUPABASE_CONFIG.CATEGORIES_TABLE)
          .update({ name: trimmedName, emoji: newCategoryEmoji, updated_at: new Date().toISOString() })
          .eq("id", categoryIds[oldName]);
        
        if (error) {
          await supabase
            .from(SUPABASE_CONFIG.CATEGORIES_TABLE)
            .insert({ name: trimmedName, emoji: newCategoryEmoji, created_at: new Date().toISOString() });
        }
      } else {
        await supabase
          .from(SUPABASE_CONFIG.CATEGORIES_TABLE)
          .insert({ name: trimmedName, emoji: newCategoryEmoji, created_at: new Date().toISOString() });
      }

      // Update category in the list
      const newCategories = categories.map(c => c === oldName ? trimmedName : c);
      setCategories(newCategories);
      
      // Update emoji map
      setCategoryEmojis(prev => {
        const updated = { ...prev };
        delete updated[oldName];
        updated[trimmedName] = newCategoryEmoji;
        return updated;
      });

      // Update all products with this category
      const productsToUpdate = products.filter(p => p.category === oldName);
      for (const product of productsToUpdate) {
        await supabase
          .from(SUPABASE_CONFIG.PRODUCTS_TABLE)
          .update({ category: trimmedName, updated_at: new Date().toISOString() })
          .eq("id", product.id);
      }

      setNewCategoryName("");
      setNewCategoryEmoji("🍴");
      setEditingCategory(null);
      setEditCategoryOpen(false);
      
      // Update category IDs if renamed
      if (oldName !== trimmedName && categoryIds[oldName]) {
        const newIds = { ...categoryIds };
        newIds[trimmedName] = newIds[oldName];
        delete newIds[oldName];
        setCategoryIds(newIds);
      }
      
      toast.success(`Category "${oldName}" renamed to "${trimmedName}"! (${productsToUpdate.length} products updated)`);
      fetchProducts();
    } catch (error) {
      toast.error("Failed to rename category");
    }
  };

  const openEditCategory = (cat: string) => {
    setEditingCategory({ name: cat, emoji: categoryEmojis[cat] || "🍴" });
    setNewCategoryName(cat);
    setNewCategoryEmoji(categoryEmojis[cat] || "🍴");
    setEditCategoryOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory) return;
    const catName = editingCategory.name;
    const productCount = products.filter(p => p.category === catName).length;

    const confirmed = window.confirm(
      `Delete category "${catName}"?\n\nThis will PERMANENTLY delete the category and ALL ${productCount} product(s) in it.\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingCategory(true);
    try {
      // Delete all products in this category
      const { error: productsError } = await supabase
        .from(SUPABASE_CONFIG.PRODUCTS_TABLE)
        .delete()
        .eq("category", catName);
      if (productsError) throw productsError;

      // Delete the category row itself
      if (categoryIds[catName]) {
        const { error: categoryError } = await supabase
          .from(SUPABASE_CONFIG.CATEGORIES_TABLE)
          .delete()
          .eq("id", categoryIds[catName]);
        if (categoryError) throw categoryError;
      }

      // Update local state
      setCategories(prev => prev.filter(c => c !== catName));
      setCategoryEmojis(prev => {
        const updated = { ...prev };
        delete updated[catName];
        return updated;
      });
      setCategoryIds(prev => {
        const updated = { ...prev };
        delete updated[catName];
        return updated;
      });
      if (filterCategory === catName) {
        setFilterCategory("All");
      }

      setEditingCategory(null);
      setEditCategoryOpen(false);
      setNewCategoryName("");
      setNewCategoryEmoji("🍴");

      toast.success(`Category "${catName}" deleted (${productCount} products removed)!`);
      fetchProducts();
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error("Failed to delete category");
    } finally {
      setDeletingCategory(false);
    }
  };

  const stats = {
    total: products.length,
    available: products.filter(p => p.available !== false).length,
    unavailable: products.filter(p => p.available === false).length,
    categories: categories.length - 1,
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "All" || p.category === filterCategory;
    const matchesStock = filterStock === "all" || 
      (filterStock === "available" && p.available !== false) || 
      (filterStock === "unavailable" && p.available === false);
    return matchesSearch && matchesCategory && matchesStock;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") comparison = a.name.localeCompare(b.name);
    else if (sortBy === "price") comparison = a.price - b.price;
    else if (sortBy === "category") comparison = a.category.localeCompare(b.category);
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: "name" | "price" | "category") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link to="/" className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">
                  {dbStatus === "ready" ? `${products.length} Products • ${categories.length - 1} Categories` : dbStatus === "checking" ? "Checking..." : "Setup Required"}
                </p>
              </div>
            </div>
          </div>
          
          {/* Admin Buttons - Responsive Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link to="/admin/sales" className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20">
              <BarChart3 className="w-4 h-4" /> Sales
            </Link>
            <Link to="/admin/customers" className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20">
              <Users className="w-4 h-4" /> Customers
            </Link>
            <Link to="/admin/orders" className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
              <ReceiptIndianRupee className="w-4 h-4" /> Orders
            </Link>
            <Link to="/admin/loyalty" className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20">
              <Coins className="w-4 h-4" /> Loyalty
            </Link>
            {dbStatus === "ready" && (
              <button onClick={startNew} className="px-3 py-2.5 rounded-xl cart-gradient text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20">
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
        {/* Stats Cards - Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <motion.button 
            onClick={() => setFilterStock("all")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`p-4 rounded-2xl text-left transition-all ${
              filterStock === "all" 
                ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25" 
                : "bg-card border border-border hover:border-primary/30"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl ${filterStock === "all" ? "bg-white/20" : "bg-blue-100 dark:bg-blue-900/30"} flex items-center justify-center mb-3`}>
              <Package className={`w-5 h-5 ${filterStock === "all" ? "text-white" : "text-blue-600 dark:text-blue-400"}`} />
            </div>
            <p className={`text-2xl font-bold ${filterStock === "all" ? "text-white" : "text-foreground"}`}>{stats.total}</p>
            <p className={`text-xs ${filterStock === "all" ? "text-white/80" : "text-muted-foreground"}`}>Total Products</p>
          </motion.button>

          <motion.button 
            onClick={() => setFilterStock("available")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`p-4 rounded-2xl text-left transition-all ${
              filterStock === "available" 
                ? "bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/25" 
                : "bg-card border border-border hover:border-primary/30"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl ${filterStock === "available" ? "bg-white/20" : "bg-green-100 dark:bg-green-900/30"} flex items-center justify-center mb-3`}>
              <CheckCircle className={`w-5 h-5 ${filterStock === "available" ? "text-white" : "text-green-600 dark:text-green-400"}`} />
            </div>
            <p className={`text-2xl font-bold ${filterStock === "available" ? "text-white" : "text-foreground"}`}>{stats.available}</p>
            <p className={`text-xs ${filterStock === "available" ? "text-white/80" : "text-muted-foreground"}`}>In Stock</p>
          </motion.button>

          <motion.button 
            onClick={() => setFilterStock("unavailable")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`p-4 rounded-2xl text-left transition-all ${
              filterStock === "unavailable" 
                ? "bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/25" 
                : "bg-card border border-border hover:border-primary/30"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl ${filterStock === "unavailable" ? "bg-white/20" : "bg-red-100 dark:bg-red-900/30"} flex items-center justify-center mb-3`}>
              <XCircle className={`w-5 h-5 ${filterStock === "unavailable" ? "text-white" : "text-red-600 dark:text-red-400"}`} />
            </div>
            <p className={`text-2xl font-bold ${filterStock === "unavailable" ? "text-white" : "text-foreground"}`}>{stats.unavailable}</p>
            <p className={`text-xs ${filterStock === "unavailable" ? "text-white/80" : "text-muted-foreground"}`}>Out of Stock</p>
          </motion.button>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-2xl text-left bg-card border border-border hover:border-purple-500/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Coffee className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectCategoryOpen(true); }}
                  className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                  title="Edit category"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setAddCategoryOpen(true); }}
                  className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600 transition-colors"
                  title="Add category"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.categories}</p>
            <p className="text-xs text-muted-foreground">Categories</p>
          </motion.div>
        </div>

        {/* Top Google Reviews - admin curated */}
        <GoogleReviewsManager />

        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40 bg-secondary border-border/50 text-foreground">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {categories.slice(1).map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="hidden sm:flex gap-1 bg-secondary dark:bg-gray-800 rounded-xl p-1">
            <button onClick={() => setViewMode("table")} className={`p-2 rounded-lg ${viewMode === "table" ? "bg-orange-500 text-white" : "text-muted-foreground dark:text-gray-400 hover:text-foreground"}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-orange-500 text-white" : "text-muted-foreground dark:text-gray-400 hover:text-foreground"}`}>
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            Showing {sortedProducts.length} of {filteredProducts.length} products
          </p>
        </div>

        {/* Products Table/Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Image</th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">
                    <button onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-foreground">
                      Name {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </button>
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">
                    <button onClick={() => handleSort("category")} className="flex items-center gap-1 hover:text-foreground">
                      Category {sortBy === "category" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </button>
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">
                    <button onClick={() => handleSort("price")} className="flex items-center gap-1 hover:text-foreground">
                      Price {sortBy === "price" && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </button>
                  </th>
                  <th className="text-center p-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-3">
                      <img src={p.image || "/placeholder.svg"} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          p.food_type === "veg" ? "bg-green-500" : p.food_type === "egg" ? "bg-yellow-500" : "bg-red-500"
                        }`} />
                        <span className="font-medium text-foreground">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(p.category)}`}>
                        {p.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-foreground">₹{p.price}</span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleAvailability(p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          p.available 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200" 
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200"
                        }`}
                      >
                        {p.available ? <><CheckCircle className="w-3 h-3" /> Available</> : <><XCircle className="w-3 h-3" /> Unavailable</>}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(p)} className="w-8 h-8 rounded-lg bg-secondary dark:bg-gray-700 flex items-center justify-center hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {sortedProducts.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                  <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
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
                        <div className={`w-3 h-3 rounded-full ${
                          p.food_type === "veg" ? "bg-green-500" : p.food_type === "egg" ? "bg-yellow-500" : "bg-red-500"
                        }`} />
                        <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                      </div>
                      <p className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit mb-2 ${getCategoryColor(p.category)}`}>{p.category}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">₹{p.price}</span>
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(p)} className="w-7 h-7 rounded-lg bg-secondary dark:bg-gray-700 flex items-center justify-center hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-foreground">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
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
              className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">{isNew ? "Add Product" : "Edit Product"}</h2>
                <button onClick={cancelEdit} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-white mb-1 block">Product Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40" placeholder="Enter product name" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground dark:text-white mb-1 block">Category</label>
                    <div className="flex gap-2">
                      <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                        <SelectTrigger className="flex-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-foreground dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          {categories.slice(1).map(c => (
                            <SelectItem key={c} value={c} className="text-foreground dark:text-white focus:bg-orange-100 dark:focus:bg-orange-900/30">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input
                        type="text"
                        placeholder="New"
                        list="new-category"
                        className="w-24 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                    <label className="text-sm font-medium text-foreground dark:text-white mb-1 block">Price (₹)</label>
                    <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground dark:text-white mb-1 block">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none h-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40" placeholder="Product description" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground dark:text-white mb-1 block">Product Image</label>
                  <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? "Uploading..." : "Choose Image"}
                    </button>
                    <input type="text" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500" placeholder="Or paste image URL" />
                  </div>
                  {form.imagePreview ? (
                    <div className="mt-3 relative inline-block">
                      <img src={form.imagePreview} alt="Preview" className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-700" />
                      <button onClick={() => setForm({ ...form, image: "", imagePreview: "" })} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-foreground dark:text-white cursor-pointer">
                    <input
                      type="radio"
                      name="foodType"
                      checked={form.foodType === "veg"}
                      onChange={() => setForm({ ...form, foodType: "veg" })}
                      className="w-4 h-4"
                    />
                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500" /> Veg</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground dark:text-white cursor-pointer">
                    <input
                      type="radio"
                      name="foodType"
                      checked={form.foodType === "egg"}
                      onChange={() => setForm({ ...form, foodType: "egg" })}
                      className="w-4 h-4"
                    />
                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500" /> Egg</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground dark:text-white cursor-pointer">
                    <input
                      type="radio"
                      name="foodType"
                      checked={form.foodType === "nonveg"}
                      onChange={() => setForm({ ...form, foodType: "nonveg" })}
                      className="w-4 h-4"
                    />
                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500" /> Non-Veg</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground dark:text-white">
                    <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="w-4 h-4 rounded" />
                    Available
                  </label>
                </div>

                {/* Menu Details — optional attributes rendered on the product page */}
                <details className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
                  <summary className="cursor-pointer select-none text-sm font-semibold text-foreground dark:text-white">
                    Menu Details <span className="font-normal text-muted-foreground">(optional — shown on the product page)</span>
                  </summary>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Short description (for the product page)</label>
                      <input type="text" value={form.details.shortDescription} onChange={(e) => setForm({ ...form, details: { ...form.details, shortDescription: e.target.value } })}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white placeholder:text-gray-400"
                        placeholder="A quick, appetizing one-liner" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Compare-at price ₹ (shows discount)</label>
                        <input type="number" min="0" value={form.details.compareAtPrice} onChange={(e) => setForm({ ...form, details: { ...form.details, compareAtPrice: e.target.value } })}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white" placeholder="e.g. 199" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Prep time (minutes)</label>
                        <input type="number" min="0" value={form.details.prepTimeMinutes} onChange={(e) => setForm({ ...form, details: { ...form.details, prepTimeMinutes: e.target.value } })}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white" placeholder="e.g. 10" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Ingredients (comma separated)</label>
                      <textarea value={form.details.ingredients} onChange={(e) => setForm({ ...form, details: { ...form.details, ingredients: e.target.value } })}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white resize-none h-16"
                        placeholder="House-made patty, Fresh lettuce, Tomato, Signature sauce" />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">Nutrition per serving (leave blank if unknown)</label>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <input type="number" min="0" value={form.details.calories} onChange={(e) => setForm({ ...form, details: { ...form.details, calories: e.target.value } })}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white" placeholder="kcal" aria-label="Calories" />
                        <input type="number" min="0" value={form.details.protein} onChange={(e) => setForm({ ...form, details: { ...form.details, protein: e.target.value } })}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white" placeholder="Protein g" aria-label="Protein grams" />
                        <input type="number" min="0" value={form.details.carbs} onChange={(e) => setForm({ ...form, details: { ...form.details, carbs: e.target.value } })}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white" placeholder="Carbs g" aria-label="Carbs grams" />
                        <input type="number" min="0" value={form.details.fat} onChange={(e) => setForm({ ...form, details: { ...form.details, fat: e.target.value } })}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white" placeholder="Fat g" aria-label="Fat grams" />
                        <input type="text" value={form.details.servingLabel} onChange={(e) => setForm({ ...form, details: { ...form.details, servingLabel: e.target.value } })}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-foreground dark:text-white" placeholder="per burger" aria-label="Serving label" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Spice level</label>
                        <Select value={form.details.spiceLevel || "none"} onValueChange={(v) => setForm({ ...form, details: { ...form.details, spiceLevel: v === "none" ? "" : v as ProductDetailsForm["spiceLevel"] } })}>
                          <SelectTrigger className="w-full rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-foreground dark:text-white">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-800">
                            <SelectItem value="none">Not specified</SelectItem>
                            <SelectItem value="mild">Mild</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="spicy">Spicy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 content-start pt-1">
                        <label className="flex items-center gap-1.5 text-xs text-foreground dark:text-white cursor-pointer">
                          <input type="checkbox" checked={form.details.isInHouseMade} onChange={(e) => setForm({ ...form, details: { ...form.details, isInHouseMade: e.target.checked } })} className="w-3.5 h-3.5 rounded" />
                          In-house made
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-foreground dark:text-white cursor-pointer">
                          <input type="checkbox" checked={form.details.isBestseller} onChange={(e) => setForm({ ...form, details: { ...form.details, isBestseller: e.target.checked } })} className="w-3.5 h-3.5 rounded" />
                          Bestseller
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-foreground dark:text-white cursor-pointer">
                          <input type="checkbox" checked={form.details.containsDairy} onChange={(e) => setForm({ ...form, details: { ...form.details, containsDairy: e.target.checked } })} className="w-3.5 h-3.5 rounded" />
                          Dairy
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-foreground dark:text-white cursor-pointer">
                          <input type="checkbox" checked={form.details.containsGluten} onChange={(e) => setForm({ ...form, details: { ...form.details, containsGluten: e.target.checked } })} className="w-3.5 h-3.5 rounded" />
                          Gluten
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-foreground dark:text-white cursor-pointer">
                          <input type="checkbox" checked={form.details.containsNuts} onChange={(e) => setForm({ ...form, details: { ...form.details, containsNuts: e.target.checked } })} className="w-3.5 h-3.5 rounded" />
                          Nuts
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-foreground dark:text-white cursor-pointer">
                          <input type="checkbox" checked={form.details.isVegan} onChange={(e) => setForm({ ...form, details: { ...form.details, isVegan: e.target.checked } })} className="w-3.5 h-3.5 rounded" />
                          Vegan
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-foreground dark:text-white cursor-pointer">
                          <input type="checkbox" checked={form.details.isJainFriendly} onChange={(e) => setForm({ ...form, details: { ...form.details, isJainFriendly: e.target.checked } })} className="w-3.5 h-3.5 rounded" />
                          Jain-friendly
                        </label>
                      </div>
                    </div>
                  </div>
                </details>

                <button onClick={handleSave} className="w-full py-3 rounded-xl cart-gradient text-white font-semibold flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {isNew ? "Add Product" : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Category Dialog */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-white">Add New Category</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground dark:text-white mb-2 block">Category Name</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name..."
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-foreground dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground dark:text-white mb-2 block">Select Icon</label>
              <div className="grid grid-cols-8 gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl max-h-40 overflow-y-auto">
                {AVAILABLE_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewCategoryEmoji(emoji)}
                    className={`w-8 h-8 text-lg rounded-lg flex items-center justify-center transition-all ${
                      newCategoryEmoji === emoji 
                        ? "bg-purple-500 text-white scale-110" 
                        : "hover:bg-purple-200 dark:hover:bg-purple-600 text-foreground dark:text-white"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setAddCategoryOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-foreground dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCategory}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-500 text-white hover:bg-purple-600"
            >
              Add Category
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-white">Edit Category</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground dark:text-white mb-2 block">Category Name</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name..."
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-foreground dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleEditCategory()}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground dark:text-white mb-2 block">Select Icon</label>
              <div className="grid grid-cols-8 gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl max-h-40 overflow-y-auto">
                {AVAILABLE_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewCategoryEmoji(emoji)}
                    className={`w-8 h-8 text-lg rounded-lg flex items-center justify-center transition-all ${
                      newCategoryEmoji === emoji 
                        ? "bg-purple-500 text-white scale-110" 
                        : "hover:bg-purple-200 dark:hover:bg-purple-600 text-foreground dark:text-white"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This will rename the category and update all {products.filter(p => p.category === editingCategory?.name).length} products with this category.
              </p>
            </div>
            <div className="pt-3 mt-1 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs font-semibold text-red-500 dark:text-red-400 mb-2">Danger Zone</p>
              <button
                onClick={handleDeleteCategory}
                disabled={deletingCategory}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {deletingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deletingCategory ? "Deleting..." : `Delete Category & All ${products.filter(p => p.category === editingCategory?.name).length} Products`}
              </button>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setEditCategoryOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-foreground dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleEditCategory}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-500 text-white hover:bg-purple-600"
            >
              Save Changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Category to Edit Dialog */}
      <Dialog open={selectCategoryOpen} onOpenChange={setSelectCategoryOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-white">Select Category to Edit</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
            {categories.slice(1).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectCategoryOpen(false);
                  setTimeout(() => openEditCategory(cat), 100);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-purple-200 dark:hover:bg-purple-600 transition-colors text-left"
              >
                <span className="text-xl">{categoryEmojis[cat] || "🍴"}</span>
                <span className="font-medium text-foreground dark:text-white">{cat}</span>
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  {products.filter(p => p.category === cat).length} products
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <MobileNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
