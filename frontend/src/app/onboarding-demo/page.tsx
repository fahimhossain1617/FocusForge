"use client";

import React, { useState } from "react";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

export default function OnboardingDemoPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <main className="relative min-h-screen w-full bg-[#020612] text-white overflow-hidden">
      {/* Direct Fullscreen Onboarding Screen */}
      <OnboardingModal
        isOpen={isOpen}
        onEnterApp={() => {
          setIsOpen(false);
        }}
      />
    </main>
  );
}
