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
import Plasma from "@/components/Plasma";

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
        <div className="pt-16 min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#A78BFA] mx-auto mb-4" />
            <p className="text-white/70">Loading your courses...</p>
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
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-3">My Courses</h1>
            <p className="text-lg text-white/70">
              Continue your learning journey
            </p>
          </div>

          {error && (
            <Card className="mb-6 backdrop-blur-md bg-red-500/20 border-red-500/50">
              <CardContent className="pt-6">
                <p className="text-white">{error}</p>
              </CardContent>
            </Card>
          )}

          {enrolledCourses.length === 0 ? (
            <Card className="backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="text-xl font-semibold text-white mb-2">
                  No courses yet
                </h3>
                <p className="text-white/70 text-center mb-6 max-w-md">
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
                  className="backdrop-blur-md bg-white/5 border border-white/10 hover:bg-white/10 shadow-2xl transition-all duration-200 cursor-pointer group"
                  onClick={() => router.push(`/learner/course/${enrollment.courseid}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      {/* <div className="text-2xl"></div> */}
                      {enrollment.status === "completed" ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Completed</Badge>
                      ) : enrollment.status === "in_progress" ? (
                        <Badge className="bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/30">In Progress</Badge>
                      ) : enrollment.status === "enrolled" ? (
                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">Enrolled</Badge>
                      ) : (
                        <Badge className="bg-white/10 text-white/70 border border-white/20">{enrollment.status}</Badge>
                      )}
                    </div>
                    <CardTitle className="group-hover:text-[#A78BFA] text-white transition-colors line-clamp-2">
                      {enrollment.course?.course_name || "Untitled Course"}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-white/60">
                      {enrollment.course?.coursedescription || "No description available"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Enrolled
                        </span>
                        <span className="text-white/70 font-medium">
                          {formatDate(enrollment.enrollment_date)}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white group-hover:bg-gradient-to-r group-hover:from-[#A78BFA] group-hover:to-[#60A5FA] transition-all"
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
