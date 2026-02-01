"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Search, Loader2, CheckCircle, Clock, TrendingUp, Users, Star, Sparkles } from "lucide-react";
import Link from "next/link";
import { LearnerHeader } from "@/components/learner-header";
import { 
  getAllCourses, 
  getMyCourses, 
  enrollInCourse, 
  type Course, 
  type Enrollment
} from "@/lib/learner-api";
import Plasma from "@/components/Plasma";

export default function ExplorePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

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
      
      // Redirect to courses page
      setTimeout(() => {
        router.push("/learner/courses")
      }, 1500)
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
        <div className="pt-16 min-h-screen flex items-center justify-center bg-[#181818]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#A78BFA] mx-auto mb-4" />
            <p className="text-white/70">Discovering amazing courses...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LearnerHeader />
      <div className="pt-16 min-h-screen bg-[#080808] relative overflow-hidden font-sans">
        {/* Plasma Background */}
        <div className="fixed inset-0 z-0">
          <Plasma
            color="#7c3aed"
            speed={0.3}
            direction="forward"
            scale={1.1}
            opacity={0.6}
            mouseInteractive={true}
          />
        </div>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/10 text-white font-semibold text-sm mb-6 border border-white/20">
              <Sparkles className="h-4 w-4" />
              <span>Discover Your Next Learning Adventure</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Explore <span className="bg-gradient-to-r from-[#A78BFA] to-[#60A5FA] bg-clip-text text-transparent">Courses</span>
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Browse our curated collection of courses designed to help you master new skills and achieve your goals
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <Alert variant="destructive" className="mb-6 max-w-3xl mx-auto backdrop-blur-md bg-red-500/20 border-red-500/50">
              <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
          )}
          
          {successMessage && (
            <Alert className="mb-6 max-w-3xl mx-auto backdrop-blur-md bg-emerald-500/20 border-emerald-500/50">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              <AlertDescription className="text-white font-medium">{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Search Bar */}
          <Card className="mb-10 max-w-3xl mx-auto backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 h-5 w-5" />
                <Input
                  placeholder="Search for courses by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-14 text-base bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#A78BFA] focus:ring-[#A78BFA]/20"
                />
              </div>
            </CardContent>
          </Card>

          {/* Stats Bar */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Available Courses</h2>
              <p className="text-white/70">{filteredAvailableCourses.length} courses ready for you</p>
            </div>
            <Link href="/learner/courses">
              <Button variant="outline" size="lg" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <BookOpen className="mr-2 h-5 w-5" />
                My Courses
              </Button>
            </Link>
          </div>

          {/* Courses Grid */}
          {filteredAvailableCourses.length === 0 ? (
            <Card className="backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl">
              <CardContent className="py-20 text-center">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {searchTerm ? "No courses found" : "No courses available"}
                </h3>
                <p className="text-white/70 max-w-md mx-auto">
                  {searchTerm
                    ? "Try adjusting your search terms or browse all available courses"
                    : "Check back later for new courses"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAvailableCourses.map((course) => (
                <Card
                  key={course.courseid}
                  className="group backdrop-blur-md bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 shadow-2xl hover:border-white/20 overflow-hidden"
                >
                  <div className="h-2 bg-gradient-to-r from-[#A78BFA] to-[#60A5FA]"></div>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <CardTitle className="text-xl font-bold text-white line-clamp-2 group-hover:text-[#A78BFA] transition-colors">
                        {course.course_name}
                      </CardTitle>
                    </div>
                    {course.targetaudience && (
                      <Badge className="w-fit mb-2 bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30 hover:bg-[#A78BFA]/30">
                        {course.targetaudience}
                      </Badge>
                    )}
                    <CardDescription className="text-base text-white/60 line-clamp-3">
                      {course.coursedescription || "No description available"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {course.prereqs && (
                      <div className="text-sm text-white/90 bg-amber-500/20 border-l-4 border-amber-400 p-3 rounded">
                        <span className="font-semibold">Prerequisites:</span> {course.prereqs}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Updated {formatDate(course.updated_at)}</span>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-[#A78BFA] to-[#60A5FA] hover:from-[#9333ea] hover:to-[#3b82f6] text-white group-hover:shadow-lg transition-all h-11"
                      onClick={() => handleEnroll(course.courseid)}
                      disabled={enrollingCourseId === course.courseid}
                    >
                      {enrollingCourseId === course.courseid ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-2" />
                          Enroll Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
