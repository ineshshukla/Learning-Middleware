"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Plus, BookOpen, Loader2, Sparkles, LayoutDashboard, Layers } from "lucide-react"
import { getInstructorCourses, getCurrentInstructor, CourseWithModules } from "@/lib/instructor-api"

export default function DashboardPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<CourseWithModules[]>([])
  const [instructorName, setInstructorName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalModules: 0,
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [coursesData, instructorData] = await Promise.all([
        getInstructorCourses(),
        getCurrentInstructor(),
      ])

      setCourses(coursesData)
      setInstructorName(instructorData.first_name || instructorData.email)

      // Calculate stats
      const totalModules = coursesData.reduce((sum, course) => sum + course.modules.length, 0)
      setStats({
        totalCourses: coursesData.length,
        totalModules,
      })
    } catch (err) {
      console.error("Failed to load dashboard:", err)
      // If authentication fails, clear cookies and redirect to auth
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('authentication'))) {
        document.cookie = 'instructor_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
        document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
        router.push('/instructor/auth')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div
          className="pt-24 min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/back.png')" }}
        >
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#ffc09f] mx-auto mb-4" />
            <p className="text-[#7a6358]">Loading dashboard...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <main
        className="pt-24 min-h-screen bg-cover bg-center bg-no-repeat bg-fixed font-sans"
        style={{ backgroundImage: "url('/back.png')" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fadeIn">
          {/* Welcome Section */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fff5f0] text-[#3d2c24] font-semibold text-sm mb-6 border border-[#f0e0d6]">
              <Sparkles className="h-4 w-4 text-[#ffc09f]" />
              <span>Instructor Dashboard</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-[#3d2c24] mb-4">
              Welcome back, <span className="text-[#ff9f6b]">{instructorName}</span>!
            </h1>
            <p className="text-xl text-[#7a6358] max-w-2xl mx-auto">
              Here's an overview of your teaching activity
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="warm-card">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ffc09f] to-[#ff9f6b] flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-[#3d2c24]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#7a6358] uppercase tracking-wide mb-1">Total Courses</p>
                    <p className="text-4xl font-bold text-[#3d2c24]">{stats.totalCourses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="warm-card">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ffc09f] to-[#ff9f6b] flex items-center justify-center">
                    <Layers className="h-6 w-6 text-[#3d2c24]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#7a6358] uppercase tracking-wide mb-1">Total Modules</p>
                    <p className="text-4xl font-bold text-[#3d2c24]">{stats.totalModules}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="warm-card">
              <CardContent className="pt-8 pb-6">
                <div>
                  <p className="text-sm font-semibold text-[#7a6358] uppercase tracking-wide mb-3">Quick Actions</p>
                  <Button asChild size="sm">
                    <Link href="/instructor/courses/create">
                      <Plus className="h-4 w-4 mr-2" />
                      New Course
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Courses Section */}
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-[#3d2c24]">Recent Courses</h2>
              <p className="text-[#7a6358] mt-1">Manage and track your course content</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/instructor/courses">View All Courses</Link>
            </Button>
          </div>

          {courses.length === 0 ? (
            <Card className="warm-card">
              <CardContent className="py-20 text-center">
                <BookOpen className="h-16 w-16 text-[#ffc09f] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-[#3d2c24] mb-3">No courses yet</h3>
                <p className="text-[#7a6358] mb-8 max-w-md mx-auto">Create your first course to get started with personalized learning!</p>
                <Button asChild size="lg">
                  <Link href="/instructor/courses/create">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Course
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.slice(0, 6).map((course, index) => (
                <Card
                  key={course.courseid}
                  className="group warm-card-interactive overflow-hidden cursor-pointer stagger-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => router.push(`/instructor/courses/${course.courseid}`)}
                >
                  <div className="h-2 warm-gradient-bar"></div>

                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-[#3d2c24] line-clamp-2 group-hover:text-[#ff9f6b] transition-colors">
                      {course.course_name}
                    </CardTitle>
                    <CardDescription className="text-[#7a6358] line-clamp-2 mt-2">
                      {course.coursedescription || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-[#7a6358] font-medium">
                        <BookOpen className="h-4 w-4" />
                        {course.modules.length} modules
                      </span>
                      {course.targetaudience && (
                        <span className="text-xs bg-[#ffc09f]/20 text-[#3d2c24] px-3 py-1 rounded-full font-semibold border border-[#ffc09f]/50">
                          {course.targetaudience}
                        </span>
                      )}
                    </div>
                    <Button className="w-full" variant="outline" size="sm">
                      Manage Course
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
