"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function FeedbackFooter() {
  const feedbackFormUrl =
    "https://docs.google.com/forms/d/e/1FAIpQLSfrzlFmvhk50nOsFR4HtDvU4_BS9Yr8yEg0oFiSoVTYBaHmZA/viewform?usp=dialog";

  return (
    <footer className="w-full border-t border-orange-200 bg-[#f6d2bd]">
      <div className="container mx-auto px-4 py-2 flex items-center justify-center">
        <Link
          href={feedbackFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 px-3 py-1.5 text-sm text-[#3d2c24] hover:bg-orange-200 rounded-md transition-all"
        >
          <MessageCircle className="h-4 w-4 text-[#ff9f6b] group-hover:rotate-12 transition-transform" />
          Facing problems? Submit feedback
        </Link>
      </div>
    </footer>
  );
}
