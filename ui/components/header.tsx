"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GraduationCap, LogOut } from "lucide-react"
import { deleteCookie } from "cookies-next"

const navigation = [
  { name: "Dashboard", href: "/instructor/dashboard" },
  { name: "Courses", href: "/instructor/courses" },
  // { name: "Library", href: "/instructor/library" },
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
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-neutral-200/50 shadow-soft">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/instructor/dashboard" className="flex items-center gap-3 group">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl text-white shadow-violet hover:shadow-lg transition-all duration-200 group-hover:scale-105">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-neutral-900 tracking-tight">Learning Middleware</span>
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
                    ? ""
                    : "text-neutral-600 hover:text-neutral-900"
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
            className="text-neutral-600 hover:text-red-600 hover:bg-red-50 font-semibold ml-2"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  )
}
