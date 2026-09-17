"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in" style={{ background: "var(--color-bg-primary)" }}>
      <div className="max-w-md space-y-6">
        <h1 className="text-6xl font-bold" style={{ color: "var(--color-purple-primary)" }}>404</h1>
        <h2 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Page not found</h2>
        <p style={{ color: "var(--color-text-muted)" }}>
          We couldn't find the page you were looking for. It might have been moved or doesn't exist.
        </p>
        <Link 
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-transform active:scale-95"
          style={{ background: "var(--color-purple-primary)", color: "white" }}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
