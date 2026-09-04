// ============================================================================
// CoinAdjustmentDialog — Admin manual coin adjustment. Reason is mandatory.
// ============================================================================
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

export interface AdminCustomer {
  id: string;
  name: string | null;
  coin_balance: number;
}

interface CoinAdjustmentDialogProps {
  customer: AdminCustomer | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CoinAdjustmentDialog({ customer, onClose, onSuccess }: CoinAdjustmentDialogProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAmount("");
    setReason("");
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!customer) return;

    const parsed = parseInt(amount, 10);
    if (!parsed || parsed === 0 || Number.isNaN(parsed)) {
      toast.error("Please enter a non-zero integer amount");
      return;
    }
    if (Math.abs(parsed) > 10000) {
      toast.error("Adjustment amount cannot exceed 10,000 coins");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const res = await fetch("/api/admin/coins/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: customer.id, amount: parsed, reason: reason.trim(), accessToken }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Adjustment failed");

      toast.success(`Coins adjusted to ${result.newBalance}`);
      onSuccess();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Adjustment failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const isPositive = parseInt(amount, 10) > 0;

  return (
    <Dialog open={!!customer} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Adjust Coins</DialogTitle>
        </DialogHeader>

        {customer && (
          <div className="space-y-4">
            {/* Customer info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {(customer.name || "C")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{customer.name || "Guest"}</p>
                <p className="text-xs text-muted-foreground">Current balance: {customer.coin_balance} coins</p>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Amount</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = parseInt(amount, 10) || 0;
                    // Toggle sign
                    setAmount(String(current > 0 ? -Math.abs(current) : Math.abs(current) || 0));
                  }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                    isPositive
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-red-500 text-white border-red-500"
                  }`}
                  aria-label={isPositive ? "Switch to negative" : "Switch to positive"}
                >
                  {isPositive ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="+50 or -20"
                  className={`flex-1 px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                    isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}
                  aria-label="Adjustment amount"
                />
                <span className="text-sm text-muted-foreground flex-shrink-0">coins</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {isPositive ? "Adding coins" : "Removing coins"}
              </p>
            </div>

            {/* Reason (mandatory) */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Reason *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Birthday bonus, compensation, manual correction..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                aria-label="Adjustment reason"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/70 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl cart-gradient text-primary-foreground text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Apply Adjustment"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
