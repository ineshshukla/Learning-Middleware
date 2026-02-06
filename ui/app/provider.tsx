"use client";

import { useEffect } from "react";
import { setupAuthInterceptor } from "@/lib/auth";

export default function Provider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupAuthInterceptor();
  }, []);

  return <>{children}</>;
}
