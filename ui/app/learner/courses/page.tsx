"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LearnerHeader } from "@/components/learner-header";
import { BookOpen, ArrowRight, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { getMyCourses, type Enrollment } from "@/lib/learner-api";

export default function MyCoursesPage() {
  const router = useRouter();
  const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      const courses = await getMyCourses();
      setEnrolledCourses(courses);
    } catch (err: any) {
      setError(err.message || "Failed to load your courses");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "enrolled":
        return <Badge className="bg-yellow-500">Enrolled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <>
        <LearnerHeader />
        <div className="pt-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading your courses...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LearnerHeader />
      <div className="pt-16 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">My Courses</h1>
            <p className="text-lg text-slate-600">
              Continue your learning journey
            </p>
          </div>

          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {enrolledCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  No courses yet
                </h3>
                <p className="text-slate-500 text-center mb-6 max-w-md">
                  You haven't enrolled in any courses yet. Explore available courses and start learning!
                </p>
                <Button onClick={() => router.push("/learner/explore")}>
                  Explore Courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((enrollment) => (
                <Card
                  key={enrollment.id}
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  onClick={() => router.push(`/learner/course/${enrollment.courseid}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BookOpen className="h-6 w-6 text-blue-600" />
                      </div>
                      {getStatusBadge(enrollment.status)}
                    </div>
                    <CardTitle className="group-hover:text-blue-600 transition-colors line-clamp-2">
                      {enrollment.course?.course_name || "Untitled Course"}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {enrollment.course?.coursedescription || "No description available"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Enrolled
                        </span>
                        <span className="text-slate-600 font-medium">
                          {formatDate(enrollment.enrollment_date)}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/learner/course/${enrollment.courseid}`);
                        }}
                      >
                        {enrollment.status === "completed" ? "Review Course" : "Continue Learning"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
