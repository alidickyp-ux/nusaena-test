"use client";

import { useRef, useState, useEffect } from "react";
import SignaturePad from "signature_pad";

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  clearText?: string;
  saveText?: string;
}

export default function SignaturePadModal({
  onSave,
  onClose,
  title = "Tanda Tangan",
  subtitle = "Silakan tanda tangan di area di bawah ini",
  clearText = "Hapus",
  saveText = "Simpan",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (isMounted && canvasRef.current) {
      const canvas = canvasRef.current;
      
      // Set canvas size
      const container = canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width || 400;
        canvas.height = 200;
      } else {
        canvas.width = 400;
        canvas.height = 200;
      }

      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: "rgba(255, 255, 255, 1)",
        penColor: "rgb(0, 0, 0)",
        velocityFilterWeight: 0.7,
        minWidth: 1,
        maxWidth: 3,
      });

      // Handle resize
      const handleResize = () => {
        if (signaturePadRef.current) {
          const data = signaturePadRef.current.toData();
          const container = canvas.parentElement;
          if (container) {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width || 400;
            canvas.height = 200;
          }
          signaturePadRef.current.fromData(data);
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isMounted]);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setIsDrawing(false);
    }
  };

  const handleSave = () => {
    if (signaturePadRef.current) {
      const data = signaturePadRef.current.toDataURL("image/png");
      
      // Cek apakah ada tanda tangan
      if (signaturePadRef.current.isEmpty()) {
        alert("Silakan tanda tangan terlebih dahulu!");
        return;
      }
      
      onSave(data);
    }
  };

  const handleBegin = () => {
    setIsDrawing(true);
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isMounted) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isMounted]);

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-stone-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-800">{title}</h2>
              <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Signature Area */}
        <div className="p-6">
          <div className="bg-stone-50 rounded-xl border-2 border-stone-200 overflow-hidden">
            <div className="relative" style={{ width: "100%", height: "200px" }}>
              <canvas
                ref={canvasRef}
                className="w-full h-full touch-none"
                onMouseDown={handleBegin}
                onMouseUp={handleEnd}
                onTouchStart={handleBegin}
                onTouchEnd={handleEnd}
              />
              {/* Placeholder text */}
              {!signaturePadRef.current?.isEmpty() && (
                <div className="absolute bottom-2 right-3 text-[10px] text-stone-400 bg-white px-2 py-0.5 rounded">
                  {isDrawing ? "✍️ Menandatangani..." : "✅ Tanda tangan tersimpan"}
                </div>
              )}
            </div>
          </div>
          <p className="text-[10px] text-stone-400 mt-2 text-center">
            Gunakan mouse atau sentuh layar untuk menandatangani
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors"
          >
            🗑️ {clearText}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-orange-600/20"
          >
            ✅ {saveText}
          </button>
        </div>
      </div>
    </div>
  );
}