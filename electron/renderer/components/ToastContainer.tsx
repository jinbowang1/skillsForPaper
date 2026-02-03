import React from "react";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useToastStore } from "../stores/toast-store";

const ICONS = {
  error: <AlertCircle size={14} />,
  success: <CheckCircle size={14} />,
  info: <Info size={14} />,
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{ICONS[toast.type]}</span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
