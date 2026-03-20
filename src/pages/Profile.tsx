import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase, SUPABASE_CONFIG } from "@/lib/supabaseClient";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Save, 
  Loader2,
  Phone,
  Mail,
  Home,
  Building,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X,
  Locate,
  Navigation
} from "lucide-react";
import { toast } from "sonner";
import { MobileNav } from "@/components/pos/MobileNav";
import { CartDrawer } from "@/components/pos/CartDrawer";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

interface ProfileData {
  id: string;
  user_id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  gender?: string;
  dob?: string;
  house_number?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  full_address?: string;
  created_at?: string;
  updated_at?: string;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
}

export default function Profile() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [cartOpen, setCartOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("personal");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    gender: "prefer_not_to_say",
    dateOfBirth: "",
    houseNumber: "",
    street: "",
    area: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    latitude: 0,
    longitude: 0,
    fullAddress: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      console.log("Fetching profile for user:", user?.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      
      console.log("Profile fetch result:", data, error);
      
      if (data) {
        setProfile(data);
        setFormData({
          name: data.full_name || data.name || user?.name || "",
          phone: data.phone || "",
          gender: data.gender || "prefer_not_to_say",
          dateOfBirth: data.dob || data.date_of_birth || "",
          houseNumber: data.house_number || "",
          street: data.street || "",
          area: data.area || "",
          city: data.city || "",
          state: data.state || "",
          postalCode: data.postal_code || "",
          country: data.country || "India",
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          fullAddress: data.full_address || "",
        });
      } else if (error?.message?.includes("No rows") || !data) {
        console.log("No profile found, creating one...");
        await createProfile();
      }
    } catch (error: unknown) {
      console.error("Error fetching profile:", error);
      // Try to create profile on error
      await createProfile();
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    try {
      const now = new Date().toISOString();
      console.log("Creating profile for user...");
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          user_id: user!.id,
          full_name: user?.name || "",
          email: user?.email || "",
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      
      console.log("Profile create result:", data, error);
      
      if (data) {
        setProfile(data);
        toast.success("Profile created!");
      } else if (error) {
        console.error("Error creating profile:", error);
        // Try to fetch existing profile
        fetchProfile();
      }
    } catch (error: unknown) {
      console.error("Error creating profile:", error);
      // Try to fetch on error
      fetchProfile();
    }
  };

  const saveProfile = async () => {
    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setSaving(true);
    try {
      const fullAddress = [
        formData.houseNumber,
        formData.street,
        formData.area,
        formData.city,
        formData.state,
        formData.postalCode,
        formData.country,
      ].filter(Boolean).join(", ");

      const now = new Date().toISOString();
      
      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      
      if (existingProfile) {
        console.log("Updating existing profile...");
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: formData.name.trim() || user?.name || "",
            email: user?.email || "",
            phone: formData.phone.trim(),
            gender: formData.gender,
            dob: formData.dateOfBirth || null,
            house_number: formData.houseNumber.trim() || "",
            street: formData.street.trim() || "",
            area: formData.area.trim() || "",
            city: formData.city.trim() || "",
            state: formData.state.trim() || "",
            postal_code: formData.postalCode.trim() || "",
            country: formData.country.trim() || "",
            latitude: formData.latitude || 0,
            longitude: formData.longitude || 0,
            full_address: fullAddress,
            updated_at: now,
          })
          .eq("user_id", user!.id);
        
        if (error) {
          console.error("Update error:", error);
          toast.error(error.message || "Failed to update profile");
        } else {
          toast.success("Profile updated!");
          fetchProfile();
        }
      } else {
        console.log("Inserting new profile...");
        const { error } = await supabase
          .from("profiles")
          .insert({
            user_id: user!.id,
            full_name: formData.name.trim() || user?.name || "",
            email: user?.email || "",
            phone: formData.phone.trim(),
            gender: formData.gender,
            dob: formData.dateOfBirth || null,
            house_number: formData.houseNumber.trim() || "",
            street: formData.street.trim() || "",
            area: formData.area.trim() || "",
            city: formData.city.trim() || "",
            state: formData.state.trim() || "",
            postal_code: formData.postalCode.trim() || "",
            country: formData.country.trim() || "",
            latitude: formData.latitude || 0,
            longitude: formData.longitude || 0,
            full_address: fullAddress,
            created_at: now,
            updated_at: now,
          });
        
        if (error) {
          console.error("Insert error:", error);
          toast.error(error.message || "Failed to save profile");
        } else {
          toast.success("Profile saved!");
          fetchProfile();
        }
      }
    } catch (error: unknown) {
      console.error("Error saving profile:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();

        if (data.address) {
          setFormData(prev => ({
            ...prev,
            houseNumber: data.address.house_number || prev.houseNumber,
            street: data.address.road || prev.street,
            area: data.address.suburb || data.address.neighbourhood || prev.area,
            city: data.address.city || data.address.town || data.address.village || prev.city,
            state: data.address.state || prev.state,
            postalCode: data.address.postcode || prev.postalCode,
            country: data.address.country || prev.country,
          }));
          toast.success("Location detected!");
        }
      } catch {
        toast.success(`Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (error: unknown) {
      const err = error as GeolocationPositionError;
      if (err.code === err.PERMISSION_DENIED) {
        toast.error("Location permission denied. Please enable location access.");
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        toast.error("Location information unavailable.");
      } else if (err.code === err.TIMEOUT) {
        toast.error("Location request timed out.");
      } else {
        toast.error("Failed to get location.");
      }
    } finally {
      setGettingLocation(false);
    }
  }, []);

  const updateFormField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please <Link to="/login" className="text-primary font-semibold">sign in</Link> to view profile.</p>
      </div>
    );
  }

  const isDark = theme === "dark" || (!theme && typeof window !== "undefined" && document.documentElement.classList.contains("dark"));

  const inputBg = isDark ? "bg-gray-800/50" : "bg-white/50";
  const cardBg = isDark ? "bg-gray-900/50" : "bg-white/50";
  const borderColor = isDark ? "border-gray-700/50" : "border-gray-200";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-600";

  return (
    <div className="min-h-screen bg-background">
      <header className={`sticky top-0 z-40 ${isDark ? "bg-gray-900/95" : "bg-white/95"} backdrop-blur-lg ${borderColor} border-b`}>
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
            <ArrowLeft className={`w-5 h-5 ${textSecondary}`} />
          </Link>
          <div>
            <h1 className={`text-lg font-bold ${textPrimary}`}>My Profile</h1>
            <p className={`text-xs ${textSecondary}`}>Manage your account</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 pb-32">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Profile Header Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${cardBg} backdrop-blur-lg ${borderColor} border rounded-2xl p-6`}
            >
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-orange-500/30">
                  {formData.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className={`text-xl font-bold ${textPrimary}`}>{formData.name || "Your Name"}</h2>
                  <p className={`text-sm ${textSecondary} flex items-center gap-1`}>
                    <Mail className="w-3.5 h-3.5" /> {user.email}
                  </p>
                  <p className={`text-sm ${textSecondary} flex items-center gap-1 mt-1`}>
                    <Phone className="w-3.5 h-3.5" /> {formData.phone || "Add phone"}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Personal Details Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`${cardBg} backdrop-blur-lg ${borderColor} border rounded-2xl overflow-hidden`}
            >
              <button
                onClick={() => toggleSection("personal")}
                className={`w-full p-4 flex items-center justify-between ${isDark ? "hover:bg-gray-800/50" : "hover:bg-gray-50"} transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <h3 className={`font-semibold ${textPrimary}`}>Personal Details</h3>
                    <p className={`text-xs ${textSecondary}`}>Name, phone, gender, DOB</p>
                  </div>
                </div>
                {expandedSection === "personal" ? (
                  <ChevronUp className={`w-5 h-5 ${textSecondary}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 ${textSecondary}`} />
                )}
              </button>

              <AnimatePresence>
                {expandedSection === "personal" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`px-4 pb-4 space-y-4`}>
                      <div>
                        <label className={`text-sm font-medium ${textSecondary} mb-1.5 block`}>Full Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => updateFormField("name", e.target.value)}
                          placeholder="Enter your name"
                          className={`w-full px-4 py-3 rounded-xl ${inputBg} ${borderColor} border text-sm ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                        />
                      </div>

                      <div>
                        <label className={`text-sm font-medium ${textSecondary} mb-1.5 block`}>Phone Number *</label>
                        <div className="relative">
                          <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => updateFormField("phone", e.target.value)}
                            placeholder="Enter phone number"
                            className={`w-full pl-10 pr-4 py-3 rounded-xl ${inputBg} ${borderColor} border text-sm ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`text-sm font-medium ${textSecondary} mb-1.5 block`}>Gender</label>
                          <select
                            value={formData.gender}
                            onChange={(e) => updateFormField("gender", e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${borderColor} border text-sm ${textPrimary} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                          >
                            <option value="prefer_not_to_say">Prefer not to say</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className={`text-sm font-medium ${textSecondary} mb-1.5 block`}>Date of Birth</label>
                          <div className="relative">
                            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
                            <input
                              type="date"
                              value={formData.dateOfBirth}
                              onChange={(e) => updateFormField("dateOfBirth", e.target.value)}
                              className={`w-full pl-10 pr-4 py-3 rounded-xl ${inputBg} ${borderColor} border text-sm ${textPrimary} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Delivery Address Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`${cardBg} backdrop-blur-lg ${borderColor} border rounded-2xl overflow-hidden`}
            >
              <button
                onClick={() => toggleSection("address")}
                className={`w-full p-4 flex items-center justify-between ${isDark ? "hover:bg-gray-800/50" : "hover:bg-gray-50"} transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Home className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="text-left">
                    <h3 className={`font-semibold ${textPrimary}`}>Delivery Address</h3>
                    <p className={`text-xs ${textSecondary}`}>
                      {formData.fullAddress ? `${formData.fullAddress.substring(0, 40)}...` : "Add delivery address"}
                    </p>
                  </div>
                </div>
                {expandedSection === "address" ? (
                  <ChevronUp className={`w-5 h-5 ${textSecondary}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 ${textSecondary}`} />
                )}
              </button>

              <AnimatePresence>
                {expandedSection === "address" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4">
                      {/* Location Button */}
                      <button
                        onClick={getCurrentLocation}
                        disabled={gettingLocation}
                        className={`w-full py-3 rounded-xl border-2 ${
                          gettingLocation 
                            ? "border-orange-300 bg-orange-50" 
                            : "border-orange-500 bg-orange-50 hover:bg-orange-100"
                        } text-orange-600 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50`}
                      >
                        {gettingLocation ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Locate className="w-4 h-4" />
                        )}
                        {gettingLocation ? "Detecting Location..." : "Use Current Location"}
                      </button>

                      {/* Latitude/Longitude Display */}
                      {(formData.latitude !== 0 || formData.longitude !== 0) && (
                        <div className={`p-3 rounded-xl ${inputBg} ${borderColor} border`}>
                          <p className={`text-xs ${textSecondary} flex items-center gap-1`}>
                            <Navigation className="w-3 h-3" />
                            Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`text-sm font-medium ${textSecondary} mb-1.5 block`}>House/Flat No.</label>
                          <input
                            type="text"
                            value={formData.houseNumber}
                            onChange={(e) => updateFormField("houseNumber", e.target.value)}
                            placeholder="A-101"
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${borderColor} border text-sm ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                          />
                        </div>
                        <div>
                          <label className={`text-sm font-medium ${textSecondary} mb-1.5 block`}>Street</label>
                          <input
                            type="text"
                            value={formData.street}
                            onChange={(e) => updateFormField("street", e.target.value)}
                            placeholder="Main Road"
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${borderColor} border text-sm ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={`text-sm font-medium ${textSecondary} mb-1.5 block`}>Area/Locality</label>
                        <input
                          type="text"
                          value={formData.area}
                          onChange={(e) => updateFormField("area", e.target.value)}
                          placeholder="Near mall, market area"
                          className={`w-full px-4 py-3 rounded-xl ${inputBg} ${borderColor} border text-sm ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`text-sm font-medium ${textSecondary} mb-1.5 block`}>City *</label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => updateFormField("city", e.target.value)}
                            placeholder="City"
                            required
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${borderColor} border text-sm ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                          />
                        </div>
                        <div>
                          <label className={`text-sm font-medium ${textSecondary} mb-1.5 block`}>State</label>
                          <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => updateFormField("state", e.target.value)}
                            placeholder="State"
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${borderColor} border text-sm ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`text-sm font-medium ${textSecondary} mb-1.5 block`}>Postal Code</label>
                          <input
                            type="text"
                            value={formData.postalCode}
                            onChange={(e) => updateFormField("postalCode", e.target.value)}
                            placeholder="123456"
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${borderColor} border text-sm ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                          />
                        </div>
                        <div>
                          <label className={`text-sm font-medium ${textSecondary} mb-1.5 block`}>Country</label>
                          <input
                            type="text"
                            value={formData.country}
                            onChange={(e) => updateFormField("country", e.target.value)}
                            placeholder="India"
                            className={`w-full px-4 py-3 rounded-xl ${inputBg} ${borderColor} border text-sm ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Save Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={saveProfile}
              disabled={saving}
              className={`w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? "Saving..." : "Save Profile"}
            </motion.button>
          </div>
        )}
      </main>

      <MobileNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
