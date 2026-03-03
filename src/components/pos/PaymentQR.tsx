"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Sparkles } from "lucide-react";

interface PaymentQRProps {
  grandTotal: number; // ✅ FIXED
  onClose?: () => void;
}

const UPI_ID = "foodfactory@upi";

export function PaymentQR({ grandTotal }: PaymentQRProps) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const copyUPI = useCallback(() => {
    navigator.clipboard.writeText(UPI_ID).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="flex flex-col">

      {/* Header */}
         <p className="text-sm text-muted-foreground mt-1">
          Use any UPI app to scan and pay instantly
        </p>
      <div className="px-6 pt-2 pb-2 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-purple-500 mb-2">
          <Sparkles className="w-3 h-3" />
          UPI Payment
          <Sparkles className="w-3 h-3" />
        </div>

        <h2 className="text-2xl font-extrabold text-foreground">
          Scan & Pay
        </h2>

       
      </div>

      {/* Amount */}
      <div className="px-6 pb-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Amount to Pay
        </p>
        <p className="text-3xl font-bold text-primary">
          ₹{grandTotal}
        </p>
      </div>

      {/* QR Card */}
      <div className="px-6 pb-6">
        <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-lg bg-white">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-indigo-500/10 pointer-events-none" />

          <div className="flex flex-col items-center p-6">
            {imgError ? (
              <div className="w-48 h-48 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                <span className="text-3xl mb-2">📵</span>
                <p className="text-xs font-medium text-center">
                  QR not available
                </p>
                <p className="text-xs mt-0.5 text-center">
                  Use UPI ID below
                </p>
              </div>
            ) : (
              <img
                src="/PhonePayQR.png"
                alt="UPI QR Code — Food Factory"
                className="w-48 h-48 object-contain rounded-lg"
                onError={() => setImgError(true)}
              />
            )}

            <div className="mt-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs text-gray-500 font-medium">
                Scan with any UPI app
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* UPI ID */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/60 border border-border/50">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              UPI ID
            </p>
            <p className="text-sm font-bold text-foreground mt-0.5 font-mono">
              {UPI_ID}
            </p>
          </div>

          <button
            onClick={copyUPI}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
              copied
                ? "bg-green-500/20 text-green-600"
                : "bg-background border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {copied && (
          <p className="text-xs text-green-600 text-center mt-1.5 font-medium">
            ✓ UPI ID copied to clipboard
          </p>
        )}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-center text-muted-foreground px-6 pb-0">
        Secured by UPI · Payment goes to Food Factory
      </p>
    </div>
  );
}