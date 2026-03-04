"use client";

import { useState, useCallback, useMemo } from "react";
import { Copy, Check, Sparkles, Smartphone } from "lucide-react";

interface PaymentQRProps {
  grandTotal: number;
  orderNumber?: string;
  onClose?: () => void;
}

const UPI_ID ="Q077853800@ybl";
const MERCHANT_NAME = "Food Factory - The Quality Taste";

export function PaymentQR({ grandTotal, orderNumber = "ORDER" }: PaymentQRProps) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const upiPaymentLink = useMemo(() => {
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: MERCHANT_NAME,
      am: grandTotal.toString(),
      cu: "INR",
      tn: orderNumber,
    });
    return `upi://pay?${params.toString()}`;
  }, [grandTotal, orderNumber]);

  const qrCodeUrl = useMemo(() => {
    const encodedLink = encodeURIComponent(upiPaymentLink);
    return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodedLink}&bgcolor=FFFFFF&color=000000`;
  }, [upiPaymentLink]);

  const copyUPI = useCallback(() => {
    navigator.clipboard.writeText(UPI_ID).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const copyPaymentLink = useCallback(() => {
    navigator.clipboard.writeText(upiPaymentLink).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [upiPaymentLink]);

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="px-6 pt-4 pb-2 text-center">
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
      <div className="px-6 pb-4 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Amount to Pay
        </p>
        <p className="text-4xl font-extrabold text-orange-600 dark:text-orange-400">
          ₹{grandTotal}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Order: {orderNumber}
        </p>
      </div>

      {/* QR Card */}
      <div className="px-6 pb-4">
        <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-lg bg-white dark:bg-gray-900">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-indigo-500/10 pointer-events-none" />

          <div className="flex flex-col items-center p-6">
            <div className="relative">
              <img
                src={qrCodeUrl}
                alt="UPI QR Code — Food Factory"
                className="w-48 h-48 object-contain rounded-lg bg-white"
                loading="lazy"
              />
              {/* UPI logo badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-full px-3 py-1 shadow-md border border-border/20">
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">UPI</span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs text-muted-foreground font-medium">
                Scan with any UPI app
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pay Option */}
      <div className="px-6 pb-3">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
          <Smartphone className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-orange-800 dark:text-orange-300">
              Open UPI App & Scan
            </p>
            <p className="text-[10px] text-orange-600 dark:text-orange-400 truncate">
              Amount ₹{grandTotal} auto-filled
            </p>
          </div>
        </div>
      </div>

      {/* UPI ID */}
      <div className="px-6 pb-3">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/60 dark:bg-gray-800/60 border border-border/50 dark:border-gray-700">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground dark:text-gray-400">
              UPI ID
            </p>
            <p className="text-sm font-bold text-foreground dark:text-white mt-0.5 font-mono">
              {UPI_ID}
            </p>
          </div>

          <button
            onClick={copyUPI}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
              copied
                ? "bg-green-500/20 text-green-600 dark:text-green-400"
                : "bg-background dark:bg-gray-700 border border-border/60 dark:border-gray-600 text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-white hover:border-primary/40"
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
          <p className="text-xs text-green-600 dark:text-green-400 text-center mt-1.5 font-medium">
            ✓ UPI ID copied to clipboard
          </p>
        )}
      </div>

      {/* Payment Link */}
      <div className="px-6 pb-4">
        <button
          onClick={copyPaymentLink}
          className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-98 ${
            copiedLink
              ? "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30"
              : "bg-secondary dark:bg-gray-800 border border-border/50 dark:border-gray-700 text-foreground dark:text-white hover:border-primary/40"
          }`}
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4" />
              Payment Link Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Payment Link
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-center text-muted-foreground dark:text-gray-500 px-6 pb-4">
        Secured by UPI · Payment goes to Food Factory
      </p>
    </div>
  );
}
