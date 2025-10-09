"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GraduationCap } from "lucide-react"

const navigation = [
  { name: "Courses", href: "/dashboard" },
  { name: "Library", href: "/library" },
  { name: "Upload", href: "/upload" },
  { name: "SME Chat", href: "/chat", special: true },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="p-2 bg-gradient-to-br from-green-400 to-green-800 rounded-xl text-white shadow-lg group-hover:shadow-xl transition-all duration-200">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">Instructor LMW</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <Button
                variant={pathname === item.href ? "default" : "ghost"}
                className={`font-medium transition-all duration-200 ${
                  item.special
                    ? "bg-gradient-to-r from-accent to-emerald-500 text-white hover:from-accent/90 hover:to-emerald-500/90 shadow-lg"
                    : pathname === item.href
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {item.name}
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
