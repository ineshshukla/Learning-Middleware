"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Search, Loader2, CheckCircle, GraduationCap, Clock } from "lucide-react"
import Link from "next/link"
import { LearnerHeader } from "@/components/learner-header"
import { 
  getAllCourses, 
  getMyCourses, 
  enrollInCourse, 
  getCurrentLearner,
  type Course, 
  type Enrollment
} from "@/lib/learner-api"

// No need to redefine interfaces, using types from learner-api

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [courses, enrolled] = await Promise.all([
        getAllCourses(),
        getMyCourses()
      ])
      
      setAllCourses(courses)
      setEnrolledCourses(enrolled)
    } catch (err: any) {
      setError(err.message || "Failed to load courses")
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (courseId: string) => {
    try {
      setError("")
      setSuccessMessage("")
      setEnrollingCourseId(courseId)
      
      // Simply enroll - no preferences needed at this stage
      await enrollInCourse(courseId)
      
      setSuccessMessage("Successfully enrolled in course!")
      
      // Refresh enrolled courses
      const enrolled = await getMyCourses()
      setEnrolledCourses(enrolled)
      
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to enroll in course")
    } finally {
      setEnrollingCourseId(null)
    }
  }

  const isEnrolled = (courseId: string) => {
    return enrolledCourses.some(enrollment => enrollment.courseid === courseId)
  }

  const filteredAvailableCourses = allCourses.filter(course =>
    !isEnrolled(course.courseid) &&
    (course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.coursedescription?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredEnrolledCourses = enrolledCourses.filter(enrollment =>
    enrollment.course?.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enrollment.course?.coursedescription?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    })
  }

  if (loading) {
    return (
      <>
        <LearnerHeader />
        <div className="pt-16 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    )
  }

  return (
    <>
      <LearnerHeader />
      <div className="pt-16 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Explore Courses</h1>
            <p className="text-lg text-slate-600">
              Discover new skills and advance your learning journey
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {successMessage && (
            <Alert className="mb-6 border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs defaultValue="available" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="available">
                Available Courses ({filteredAvailableCourses.length})
              </TabsTrigger>
              <TabsTrigger value="enrolled">
                My Enrolled Courses ({filteredEnrolledCourses.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="available">
              {filteredAvailableCourses.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No courses found</h3>
                  <p className="text-slate-500">
                    {searchTerm ? "Try a different search term" : "No courses available at the moment"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAvailableCourses.map((course) => (
                    <Card
                      key={course.courseid}
                      className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg"
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-primary transition-colors">
                            {course.course_name}
                          </CardTitle>
                        </div>
                        {course.targetaudience && (
                          <Badge className="w-fit mb-2">
                            {course.targetaudience}
                          </Badge>
                        )}
                        <CardDescription className="text-slate-600 line-clamp-3">
                          {course.coursedescription || "No description available"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {course.prereqs && (
                          <div className="text-sm text-slate-600">
                            <span className="font-semibold">Prerequisites:</span> {course.prereqs}
                          </div>
                        )}
                        <div className="flex items-center text-sm text-slate-500">
                          <Clock className="h-4 w-4 mr-1" />
                          Updated {formatDate(course.updated_at)}
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => handleEnroll(course.courseid)}
                          disabled={enrollingCourseId === course.courseid}
                        >
                          {enrollingCourseId === course.courseid ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Enrolling...
                            </>
                          ) : (
                            "Enroll Now"
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="enrolled">
              {filteredEnrolledCourses.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">
                    No enrolled courses
                  </h3>
                  <p className="text-slate-500 mb-6">
                    Start learning by enrolling in a course
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEnrolledCourses.map((enrollment) => (
                    <Card
                      key={enrollment.id}
                      className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-green-50"
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-primary transition-colors">
                            {enrollment.course?.course_name || "Unknown Course"}
                          </CardTitle>
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enrolled
                          </Badge>
                        </div>
                        {enrollment.course?.targetaudience && (
                          <Badge variant="outline" className="w-fit mb-2">
                            {enrollment.course.targetaudience}
                          </Badge>
                        )}
                        <CardDescription className="text-slate-600 line-clamp-3">
                          {enrollment.course?.coursedescription || "No description available"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-sm text-slate-600">
                          <span className="font-semibold">Status:</span> {enrollment.status}
                        </div>
                        <div className="flex items-center text-sm text-slate-500">
                          <Clock className="h-4 w-4 mr-1" />
                          Enrolled on {formatDate(enrollment.enrollment_date)}
                        </div>
                        <Button className="w-full" asChild>
                          <Link href={`/learner/course/${enrollment.courseid}`}>
                            Continue Learning
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  )
}
