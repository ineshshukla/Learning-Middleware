"use client";

import { useEffect, useState } from "react";
import { Plus, Calendar, FileText, Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link"
import { Header } from "@/components/header";
import { getInstructorCourses, CourseWithModules } from "@/lib/instructor-api";
import Plasma from "@/components/Plasma";

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithModules[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const data = await getInstructorCourses();
      setCourses(data);
    } catch (err: any) {
      setError(err.message || "Failed to load courses");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };
  return (
    <>
      <Header />
      <div className="pt-16 min-h-screen bg-black relative overflow-hidden font-sans">
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
        
        {/* Header */}
        <div className="backdrop-blur-md bg-white/5 border-b border-white/10 relative z-10">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white">My Courses</h1>
                <p className="text-white/70 text-lg font-medium">Manage and create your course content</p>
              </div>
              <Button asChild className="gap-2 h-12 px-6 shadow-lg hover:shadow-xl transition-all duration-200">
                <Link href="/instructor/courses/create">
                  <Plus className="h-4 w-4" />
                  Create New Course
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-7xl mx-auto px-8 py-4 relative z-10">
            <Alert variant="destructive" className="backdrop-blur-md bg-red-500/20 border-red-500/50">
              <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 relative z-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#A78BFA]" />
          </div>
        ) : courses.length === 0 ? (
          /* Empty State */
          <div className="max-w-7xl mx-auto px-8 py-20 text-center relative z-10">
            <h3 className="text-2xl font-semibold text-white mb-2">No courses yet</h3>
            <p className="text-white/70 mb-6">Create your first course to get started!</p>
            <Button asChild>
              <Link href="/instructor/courses/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Course
              </Link>
            </Button>
          </div>
        ) : (
          /* Courses Grid */
          <div className="max-w-7xl mx-auto px-8 py-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card
                  key={course.courseid}
                  className="backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-200 group"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-bold text-white line-clamp-2 group-hover:text-[#A78BFA] transition-colors">
                        {course.course_name}
                      </CardTitle>
                      <Badge 
                        variant={course.is_published ? "default" : "secondary"}
                        className={course.is_published ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/10 text-white/70 border border-white/20"}
                      >
                        {course.is_published ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Draft
                          </>
                        )}
                      </Badge>
                    </div>
                    <CardDescription className="text-white/60 line-clamp-3 leading-relaxed">
                      {course.coursedescription || "No description provided"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Course Stats */}
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Updated {formatDate(course.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-white/70">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{course.modules.length} modules</span>
                      </div>
                      {course.targetaudience && (
                        <div className="text-xs bg-[#A78BFA]/20 text-[#A78BFA] px-2 py-1 rounded border border-[#A78BFA]/30">
                          {course.targetaudience}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1 font-semibold" asChild>
                        <Link href={`/instructor/courses/${course.courseid}`}>View Course</Link>
                      </Button>
                      {/* <Button variant="outline" className="flex-1 font-semibold bg-transparent">
                        Edit
                      </Button> */}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
