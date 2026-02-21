"use client";

import { useEffect, useState } from "react";
import { Plus, Calendar, FileText, Loader2, Eye, EyeOff, Sparkles, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link"
import { Header } from "@/components/header";
import { getInstructorCourses, CourseWithModules } from "@/lib/instructor-api";

export default function CoursesPage() {
  const basePath = process.env.NODE_ENV === 'production' ? '/learn' : '';
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
      <div
        className="pt-24 min-h-screen bg-cover bg-center bg-no-repeat bg-fixed font-sans"
        style={{ backgroundImage: `url('${basePath}/back.png')` }}
      >
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fff5f0] text-[#3d2c24] font-semibold text-sm mb-6 border border-[#f0e0d6]">
              <Sparkles className="h-4 w-4 text-[#ffc09f]" />
              <span>Course Management</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-[#3d2c24] mb-4">
              My <span className="text-[#ff9f6b]">Courses</span>
            </h1>
            <p className="text-xl text-[#7a6358] max-w-2xl mx-auto mb-8">
              Manage and create your course content
            </p>
            <Button asChild className="gap-2 h-12 px-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <Link href="/instructor/courses/create">
                <Plus className="h-4 w-4" />
                Create New Course
              </Link>
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-7xl mx-auto px-8 py-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#ffc09f]" />
          </div>
        ) : courses.length === 0 ? (
          /* Empty State */
          <div className="max-w-7xl mx-auto px-8 py-12">
            <Card className="warm-card">
              <CardContent className="py-20 text-center">
                <BookOpen className="h-16 w-16 text-[#ffc09f] mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-[#3d2c24] mb-2">No courses yet</h3>
                <p className="text-[#7a6358] mb-6">Create your first course to get started!</p>
                <Button asChild>
                  <Link href="/instructor/courses/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Course
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Courses Grid */
          <div className="max-w-7xl mx-auto px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card
                  key={course.courseid}
                  className="warm-card-interactive overflow-hidden group"
                >
                  <div className="h-2 warm-gradient-bar"></div>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-bold text-[#3d2c24] line-clamp-2 group-hover:text-[#ff9f6b] transition-colors">
                        {course.course_name}
                      </CardTitle>
                      <Badge
                        className={course.is_published
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                        }
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
                    <CardDescription className="text-[#7a6358] line-clamp-3 leading-relaxed">
                      {course.coursedescription || "No description provided"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Course Stats */}
                    <div className="flex items-center justify-between text-sm text-[#7a6358]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Updated {formatDate(course.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-[#7a6358]">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{course.modules.length} modules</span>
                      </div>
                      {course.targetaudience && (
                        <div className="text-xs bg-[#ffc09f]/20 text-[#3d2c24] px-2 py-1 rounded border border-[#ffc09f]/50">
                          {course.targetaudience}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1 font-semibold" asChild>
                        <Link href={`/instructor/courses/${course.courseid}`}>View Course</Link>
                      </Button>
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
