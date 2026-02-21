"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LearnerHeader } from "@/components/learner-header";
import { BookOpen, ArrowRight, Clock, Loader2, Sparkles } from "lucide-react";
import { getMyCourses, type Enrollment } from "@/lib/learner-api";

export default function MyCoursesPage() {
  const basePath = process.env.NODE_ENV === 'production' ? '/learn' : '';
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

  if (loading) {
    return (
      <>
        <LearnerHeader />
        <div
          className="pt-24 min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${basePath}/back.png')` }}
        >
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#ffc09f] mx-auto mb-4" />
            <p className="text-[#7a6358]">Loading your courses...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <LearnerHeader />
      <div
        className="pt-24 min-h-screen bg-cover bg-center bg-no-repeat bg-fixed font-sans"
        style={{ backgroundImage: `url('${basePath}/back.png')` }}
      >
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fff5f0] text-[#3d2c24] font-semibold text-sm mb-6 border border-[#f0e0d6]">
              <Sparkles className="h-4 w-4 text-[#ffc09f]" />
              <span>Your Learning Journey</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-[#3d2c24] mb-4">
              My <span className="text-[#ff9f6b]">Courses</span>
            </h1>
            <p className="text-xl text-[#7a6358] max-w-2xl mx-auto">
              Continue your learning journey and track your progress
            </p>
          </div>

          {error && (
            <Card className="mb-6 bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {enrolledCourses.length === 0 ? (
            <Card className="warm-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-16 w-16 text-[#ffc09f] mb-4" />
                <h3 className="text-xl font-semibold text-[#3d2c24] mb-2">
                  No courses yet
                </h3>
                <p className="text-[#7a6358] text-center mb-6 max-w-md">
                  You haven't enrolled in any courses yet. Explore available courses and start learning!
                </p>
                <Button
                  onClick={() => router.push("/learner/explore")}
                  className="bg-[#ffc09f] hover:bg-[#ff9f6b] text-[#3d2c24] font-semibold"
                >
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
                  className="warm-card-interactive overflow-hidden cursor-pointer group"
                  onClick={() => router.push(`/learner/course/${enrollment.courseid}`)}
                >
                  <div className="h-2 warm-gradient-bar"></div>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      {enrollment.status === "completed" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">Completed</Badge>
                      ) : enrollment.status === "in_progress" ? (
                        <Badge className="bg-blue-100 text-blue-700 border border-blue-200">In Progress</Badge>
                      ) : enrollment.status === "enrolled" ? (
                        <Badge className="bg-amber-100 text-amber-700 border border-amber-200">Enrolled</Badge>
                      ) : (
                        <Badge className="bg-[#ffc09f]/20 text-[#3d2c24] border border-[#ffc09f]/50">{enrollment.status}</Badge>
                      )}
                    </div>
                    <CardTitle className="group-hover:text-[#ff9f6b] text-[#3d2c24] transition-colors line-clamp-2">
                      {enrollment.course?.course_name || "Untitled Course"}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-[#7a6358]">
                      {enrollment.course?.coursedescription || "No description available"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#7a6358] flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Enrolled
                        </span>
                        <span className="text-[#3d2c24] font-medium">
                          {formatDate(enrollment.enrollment_date)}
                        </span>
                      </div>

                      <Button
                        className="w-full bg-[#ffc09f] hover:bg-[#ff9f6b] text-[#3d2c24] font-semibold"
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
