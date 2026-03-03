import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { Link, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Loader2,
  Phone,
  Mail,
  Home,
  Building,
  Star
} from "lucide-react";
import { toast } from "sonner";
import { MobileNav } from "@/components/pos/MobileNav";
import { CartDrawer } from "@/components/pos/CartDrawer";

interface Address {
  $id: string;
  label: string;
  fullAddress: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

interface Profile {
  $id: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";
  const [cartOpen, setCartOpen] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    phone: "",
    alternatePhone: "",
    dateOfBirth: "",
    gender: "prefer_not_to_say",
  });

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    fullAddress: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    isDefault: false,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchAddresses();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.PROFILES_COLLECTION,
        [Query.equal("userId", user!.id)]
      );
      if (response.documents.length > 0) {
        const doc = response.documents[0] as any;
        setProfile(doc);
        setProfileForm({
          phone: doc.phone || "",
          alternatePhone: doc.alternatePhone || "",
          dateOfBirth: doc.dateOfBirth || "",
          gender: doc.gender || "prefer_not_to_say",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchAddresses = async () => {
    try {
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        "addresses",
        [Query.equal("userId", user!.id), Query.orderDesc("isDefault")]
      );
      setAddresses(response.documents as any);
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profileForm.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setSaving(true);
    try {
      const data = {
        userId: user!.id,
        phone: profileForm.phone.trim(),
        alternatePhone: profileForm.alternatePhone?.trim() || "",
        dateOfBirth: profileForm.dateOfBirth || "",
        gender: profileForm.gender,
      };

      if (profile) {
        await databases.updateDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.PROFILES_COLLECTION,
          profile.$id,
          data
        );
        toast.success("Profile updated!");
      } else {
        const newProfile = await databases.createDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.PROFILES_COLLECTION,
          ID.unique(),
          data
        );
        setProfile(newProfile as any);
        toast.success("Profile saved!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      label: "Home",
      fullAddress: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      isDefault: false,
    });
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  const saveAddress = async () => {
    if (!addressForm.fullAddress.trim() || !addressForm.city.trim() || !addressForm.pincode.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const data = {
        userId: user!.id,
        label: addressForm.label,
        fullAddress: addressForm.fullAddress.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pincode: addressForm.pincode.trim(),
        phone: addressForm.phone.trim() || profileForm.phone,
        isDefault: addressForm.isDefault,
      };

      if (addressForm.isDefault) {
        for (const addr of addresses) {
          if (addr.isDefault) {
            await databases.updateDocument(
              APPWRITE_CONFIG.DATABASE_ID,
              "addresses",
              addr.$id,
              { isDefault: false }
            );
          }
        }
      }

      if (editingAddressId) {
        await databases.updateDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          "addresses",
          editingAddressId,
          data
        );
        toast.success("Address updated!");
      } else {
        await databases.createDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          "addresses",
          ID.unique(),
          data
        );
        toast.success("Address added!");
      }
      
      resetAddressForm();
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.message || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    
    try {
      await databases.deleteDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        "addresses",
        id
      );
      toast.success("Address deleted!");
      fetchAddresses();
    } catch (error) {
      toast.error("Failed to delete address");
    }
  };

  const setDefaultAddress = async (address: Address) => {
    try {
      for (const addr of addresses) {
        if (addr.isDefault) {
          await databases.updateDocument(
            APPWRITE_CONFIG.DATABASE_ID,
            "addresses",
            addr.$id,
            { isDefault: false }
          );
        }
      }
      await databases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        "addresses",
        address.$id,
        { isDefault: true }
      );
      toast.success("Default address updated!");
      fetchAddresses();
    } catch (error) {
      toast.error("Failed to set default address");
    }
  };

  const editAddress = (addr: Address) => {
    setAddressForm({
      label: addr.label,
      fullAddress: addr.fullAddress,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      phone: addr.phone,
      isDefault: addr.isDefault,
    });
    setEditingAddressId(addr.$id);
    setShowAddressForm(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please <Link to="/login" className="text-primary font-semibold">sign in</Link> to view profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">My Profile</h1>
            <p className="text-xs text-muted-foreground">Manage your account</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 pb-40">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSearchParams({ tab: "profile" })}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "profile" 
                ? "cart-gradient text-primary-foreground" 
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setSearchParams({ tab: "addresses" })}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "addresses" 
                ? "cart-gradient text-primary-foreground" 
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Addresses
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "profile" ? (
          <div className="max-w-xl">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{user.name || "User"}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {user.email}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Alternate Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      placeholder="Alternate phone (optional)"
                      value={profileForm.alternatePhone}
                      onChange={(e) => setProfileForm({ ...profileForm, alternatePhone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Date of Birth</label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Gender</label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground"
                    >
                      <option value="prefer_not_to_say">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full py-3 rounded-xl cart-gradient text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-xl">
            {/* Add Address Button */}
            {!showAddressForm && (
              <button
                onClick={() => setShowAddressForm(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground font-medium flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors mb-4"
              >
                <Plus className="w-4 h-4" />
                Add New Address
              </button>
            )}

            {/* Address Form */}
            {showAddressForm && (
              <div className="glass-card rounded-xl p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-foreground">{editingAddressId ? "Edit Address" : "Add New Address"}</h3>
                  <button onClick={resetAddressForm} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Label</label>
                    <div className="flex gap-2">
                      {["Home", "Work", "Other"].map((label) => (
                        <button
                          key={label}
                          onClick={() => setAddressForm({ ...addressForm, label })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            addressForm.label === label
                              ? "cart-gradient text-primary-foreground"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          {label === "Home" && <Home className="w-3 h-3 inline mr-1" />}
                          {label === "Work" && <Building className="w-3 h-3 inline mr-1" />}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Full Address *</label>
                    <textarea
                      placeholder="Street address, landmark..."
                      value={addressForm.fullAddress}
                      onChange={(e) => setAddressForm({ ...addressForm, fullAddress: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground resize-none h-20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">City *</label>
                      <input
                        type="text"
                        placeholder="City"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">State</label>
                      <input
                        type="text"
                        placeholder="State"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Pincode *</label>
                      <input
                        type="text"
                        placeholder="PIN code"
                        value={addressForm.pincode}
                        onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
                      <input
                        type="tel"
                        placeholder="Contact number"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    Set as default address
                  </label>

                  <button
                    onClick={saveAddress}
                    disabled={saving}
                    className="w-full py-3 rounded-xl cart-gradient text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingAddressId ? "Update Address" : "Save Address"}
                  </button>
                </div>
              </div>
            )}

            {/* Address List */}
            <div className="space-y-3">
              {addresses.length === 0 && !showAddressForm ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No addresses saved</p>
                  <p className="text-sm text-foreground">Add an address for faster checkout</p>
                </div>
              ) : (
                addresses.map((addr) => (
                  <div key={addr.$id} className="glass-card rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          addr.isDefault ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                        }`}>
                          {addr.label === "Home" ? <Home className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{addr.label}</p>
                            {addr.isDefault && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Default</span>
                            )}
                          </div>
                          <p className="text-sm text-foreground">{addr.fullAddress}</p>
                          <p className="text-xs text-muted-foreground">
                            {addr.city}{addr.state ? `, ${addr.state}` : ""} - {addr.pincode}
                          </p>
                          {addr.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" /> {addr.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!addr.isDefault && (
                          <button
                            onClick={() => setDefaultAddress(addr)}
                            className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary"
                            title="Set as default"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => editAddress(addr)}
                          className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteAddress(addr.$id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <MobileNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
