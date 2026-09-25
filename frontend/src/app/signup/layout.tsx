import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Join FocusForge to capture ideas, plan routines, organize tasks, and master deep focus.",
  alternates: {
    canonical: "/signup",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
