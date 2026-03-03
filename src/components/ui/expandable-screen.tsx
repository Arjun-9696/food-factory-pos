"use client";

import { useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface ExpandableScreenProps {
  children: ReactNode;
}

interface ExpandableScreenTriggerProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ExpandableScreen({ children }: ExpandableScreenProps) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const childArray = Array.isArray(children) ? children : [children];

  return (
    <>
      {/* Trigger slot — renders the first child's className + children as a clickable button */}
      {childArray.map((child, index) => {
        if (index !== 0) return null;
        if (!child || typeof child !== "object" || !("props" in child)) return null;
        const el = child as React.ReactElement<{ children?: ReactNode; className?: string }>;
        return (
          <button
            key="trigger"
            type="button"
            onClick={open}
            className={el.props.className}
          >
            {el.props.children}
          </button>
        );
      })}

      {/* Content slot — portaled to body so it always covers the full viewport */}
      {childArray.map((child, index) => {
        if (index !== 1) return null;
        if (!child || typeof child !== "object" || !("props" in child)) return null;
        const el = child as React.ReactElement<{ children?: ReactNode; className?: string }>;
        return createPortal(
          <PaymentExpandableContent key="content" isOpen={isOpen} onClose={close}>
            {el.props.children}
          </PaymentExpandableContent>,
          document.body
        );
      })}
    </>
  );
}

function PaymentExpandableContent({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[200]  bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
          className={[
  "fixed z-[201]",
  "inset-0",
  "sm:inset-auto sm:top-2.5 sm:left-[37%] sm:-translate-x-1/2 sm:-translate-y-1/2",
  "sm:w-[420px] sm:h-[700px] sm:rounded-md",
  "flex flex-col",
  "bg-card shadow-2xl",
  "overflow-hidden",
].join(" ")}
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 40 }}
            transition={{ type: "spring", damping: 28, stiffness: 350, mass: 0.8 }}
          >
            {/* Decorative gradient bar at top */}
            <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-primary flex-shrink-0" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-secondary/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ExpandableScreenTrigger({
  children,
  onClick,
  className,
}: ExpandableScreenTriggerProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={className}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
    >
      {children}
    </motion.button>
  );
}

export function ExpandableScreenContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
