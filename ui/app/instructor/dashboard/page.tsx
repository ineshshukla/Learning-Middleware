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
      <main className="pt-16 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Welcome back, {instructorName}!
            </h1>
            <p className="text-xl text-slate-600">Here's an overview of your teaching activity</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Courses</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalCourses}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Modules</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalModules}</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Quick Actions</p>
                    <Button asChild className="mt-2">
                      <Link href="/instructor/courses/create">
                        <Plus className="h-4 w-4 mr-2" />
                        New Course
                      </Link>
                    </Button>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Plus className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Courses Section */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Recent Courses</h2>
            <Button variant="outline" asChild>
              <Link href="/instructor/courses">View All Courses</Link>
            </Button>
          </div>

          {courses.length === 0 ? (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No courses yet</h3>
                <p className="text-slate-500 mb-6">Create your first course to get started!</p>
                <Button asChild>
                  <Link href="/instructor/courses/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Course
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.slice(0, 6).map((course) => (
                <Card
                  key={course.courseid}
                  className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-white/80 backdrop-blur-sm group cursor-pointer"
                  onClick={() => router.push(`/instructor/courses/${course.courseid}`)}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-primary transition-colors">
                      {course.course_name}
                    </CardTitle>
                    <CardDescription className="text-slate-600 line-clamp-2">
                      {course.coursedescription || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>{course.modules.length} modules</span>
                      {course.targetaudience && (
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                          {course.targetaudience}
                        </span>
                      )}
                    </div>
                    <Button className="w-full" variant="outline">
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
