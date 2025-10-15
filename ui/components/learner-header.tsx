"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GraduationCap, LogOut, MessageSquare } from "lucide-react"
import { deleteCookie } from "cookies-next"

const navigation = [
  { name: "Explore", href: "/learner/explore" },
  { name: "My Courses", href: "/learner/courses" },
]

export function LearnerHeader() {
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
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/learner/explore" className="flex items-center gap-3 group">
          <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl text-white shadow-lg group-hover:shadow-xl transition-all duration-200">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">LMW Learner</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <Button
                variant={pathname === item.href ? "default" : "ghost"}
                className={`font-medium transition-all duration-200 ${
                  pathname === item.href
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {item.name}
              </Button>
            </Link>
          ))}
          
          {/* Logout Button */}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-slate-600 hover:text-red-600 hover:bg-red-50 font-medium ml-2"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  )
}
