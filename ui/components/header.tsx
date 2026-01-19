"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, BookOpen, LogOut } from "lucide-react"
import { deleteCookie } from "cookies-next"

const navigation = [
  { name: "Home", href: "/instructor/dashboard", icon: Home },
  { name: "Courses", href: "/instructor/courses", icon: BookOpen },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    // Clear all auth cookies
    deleteCookie('instructor_token')
    deleteCookie('learner_token')
    deleteCookie('user_role')
    deleteCookie('googleId')
    
    // Redirect to home
    router.push('/')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/20 border-b border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/instructor/dashboard" className="flex items-center gap-3 group">
          <span className="text-xl font-bold text-white tracking-tight">Instructor Portal</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <Button
                variant={pathname === item.href ? "default" : "ghost"}
                size="sm"
                className={`font-semibold transition-all duration-200 ${
                  pathname === item.href
                    ? "bg-white/20 text-white hover:bg-white/30"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {item.name}
              </Button>
            </Link>
          ))}
          
          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white/70 hover:text-red-400 hover:bg-red-500/10 font-semibold ml-2"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  )
}
