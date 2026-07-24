"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      expand={false}
      richColors
      closeButton
      visibleToasts={5}
      toastOptions={{
        duration: 4000,
        className: "font-sans !rounded-2xl !shadow-xl",
        style: {
          background: "#ffffff",
          border: "none",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
          borderRadius: "16px",
          padding: "18px 24px",
          fontWeight: 500,
          // Gradient border effect
          borderLeft: "6px solid",
          borderImage: "linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef) 1",
        },
      }}
    />
  );
}