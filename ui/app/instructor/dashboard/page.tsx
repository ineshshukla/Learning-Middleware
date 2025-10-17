"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Plus, BookOpen, Users, TrendingUp, Loader2 } from "lucide-react"
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
        <main className="pt-16 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50/20">
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fadeIn">
          {/* Welcome Section */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-3">
              Welcome back, {instructorName}! 👋
            </h1>
            <p className="text-xl text-neutral-600">Here's an overview of your teaching activity</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="glass-effect border border-neutral-200/50 shadow-medium hover:shadow-strong hover:-translate-y-1 transition-all duration-300">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Total Courses</p>
                    <p className="text-4xl font-bold text-neutral-900">{stats.totalCourses}</p>
                  </div>
                  <div className="h-16 w-16 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-violet">
                    <BookOpen className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border border-neutral-200/50 shadow-medium hover:shadow-strong hover:-translate-y-1 transition-all duration-300">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Total Modules</p>
                    <p className="text-4xl font-bold text-neutral-900">{stats.totalModules}</p>
                  </div>
                  <div className="h-16 w-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-emerald">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border border-neutral-200/50 shadow-medium hover:shadow-strong hover:-translate-y-1 transition-all duration-300">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Quick Actions</p>
                    <Button asChild size="sm" className="mt-3">
                      <Link href="/instructor/courses/create">
                        <Plus className="h-4 w-4 mr-2" />
                        New Course
                      </Link>
                    </Button>
                  </div>
                  <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/25">
                    <Plus className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Courses Section */}
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900">Recent Courses</h2>
              <p className="text-neutral-600 mt-1">Manage and track your course content</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/instructor/courses">View All Courses</Link>
            </Button>
          </div>

          {courses.length === 0 ? (
            <Card className="glass-effect border border-neutral-200/50 shadow-medium">
              <CardContent className="py-20 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-violet-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="h-10 w-10 text-violet-600" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-3">No courses yet</h3>
                <p className="text-neutral-600 mb-8 max-w-md mx-auto">Create your first course to get started with personalized learning!</p>
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
                  className="group border border-neutral-200 shadow-soft hover:shadow-strong hover:-translate-y-2 hover:border-violet-300 transition-all duration-300 cursor-pointer overflow-hidden stagger-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => router.push(`/instructor/courses/${course.courseid}`)}
                >
                  {/* Gradient Accent Bar */}
                  <div className="h-2 bg-gradient-to-r from-violet-600 to-emerald-600"></div>
                  
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-neutral-900 line-clamp-2 group-hover:text-violet-600 transition-colors">
                      {course.course_name}
                    </CardTitle>
                    <CardDescription className="text-neutral-600 line-clamp-2 mt-2">
                      {course.coursedescription || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-neutral-600 font-medium">
                        <BookOpen className="h-4 w-4" />
                        {course.modules.length} modules
                      </span>
                      {course.targetaudience && (
                        <span className="text-xs bg-violet-100 text-violet-700 px-3 py-1 rounded-full font-semibold">
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
