"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, BookOpen, LogOut, Sparkles } from "lucide-react"
import { clearAuthState } from "@/lib/auth"

const navigation = [
  { name: "Home", href: "/instructor/dashboard", icon: Home },
  { name: "Courses", href: "/instructor/courses", icon: BookOpen },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    // Clear all auth cookies, localStorage, and sessionStorage
    clearAuthState()

    // Redirect to home
    router.push('/')
  }

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
      <div className="warm-nav-glass rounded-2xl shadow-lg px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/instructor/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-gradient-to-br from-[#ffc09f] to-[#ff9f6b] rounded-lg flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-[#3d2c24]" />
          </div>
          <span className="text-lg font-bold text-[#3d2c24] tracking-tight">Instructor Portal</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={`font-semibold transition-all duration-200 ${pathname === item.href
                    ? "bg-[#ffc09f]/30 text-[#3d2c24]"
                    : "text-[#7a6358] hover:text-[#3d2c24] hover:bg-[#fff5f0]"
                  }`}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.name}
              </Button>
            </Link>
          ))}

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-[#7a6358] hover:text-red-600 hover:bg-red-50 font-semibold ml-2"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  )
}
