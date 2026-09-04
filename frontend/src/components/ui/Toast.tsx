"use client";

import { useAppContext } from "../../context/AppContext";
import { useEffect } from "react";

export default function Toast() {
  const { toasts } = useAppContext();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} message={toast.message} type={toast.type} />
      ))}
    </div>
  );
}

function ToastItem({ message, type }: { message: string; type: string }) {
  const bgColor =
    type === "error"
      ? "bg-red-500/10 border-red-500/20 text-red-400"
      : type === "info"
        ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";

  return (
    <div
      className={`app-toast app-toast--${type} ${bgColor} border rounded-xl px-4 py-3 text-sm font-medium scale-in pointer-events-auto max-w-sm`}
    >
      {message}
    </div>
  );
}
