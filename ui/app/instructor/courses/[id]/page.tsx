"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/header";
import {
  Loader2,
  BookOpen,
  Target,
  FileText,
  Edit,
  Upload,
  ChevronRight,
} from "lucide-react";
import { getCourse, getVectorStoreStatus } from "@/lib/instructor-api";
import type { CourseWithModules } from "@/lib/instructor-api";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseid = params.id as string;

  const [course, setCourse] = useState<CourseWithModules | null>(null);
  const [vsStatus, setVsStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCourseData();
  }, [courseid]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const courseData = await getCourse(courseid);
      setCourse(courseData);

      // Check vector store status
      try {
        const vs = await getVectorStoreStatus(courseid);
        setVsStatus(vs);
      } catch (err) {
        console.log("No vector store yet:", err);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </main>
      </>
    );
  }

  if (error || !course) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error || "Course Not Found"}
            </h1>
            <Button onClick={() => router.push("/instructor/courses")}>
              Back to Courses
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Course Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  {course.course_name}
                </h1>
                {course.coursedescription && (
                  <p className="text-xl text-slate-600 mt-2">
                    {course.coursedescription}
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  {course.targetaudience && (
                    <Badge variant="secondary">
                      <Target className="h-3 w-3 mr-1" />
                      {course.targetaudience}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {course.modules.length} Modules
                  </Badge>
                  {vsStatus && (
                    <Badge
                      variant={
                        vsStatus.status === "ready"
                          ? "default"
                          : vsStatus.status === "creating"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {vsStatus.status === "ready" && "✓ Vector Store Ready"}
                      {vsStatus.status === "creating" && "⏳ Processing..."}
                      {vsStatus.status === "failed" && "✗ Processing Failed"}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() =>
                    router.push(`/instructor/courses/${courseid}/objectives`)
                  }
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Manage Learning Objectives
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/instructor/courses")}
                >
                  Back to Courses
                </Button>
              </div>
            </div>
          </div>

          {/* Prerequisites */}
          {course.prereqs && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Prerequisites</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{course.prereqs}</p>
              </CardContent>
            </Card>
          )}

          {/* Modules */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Course Modules</CardTitle>
                <Badge variant="outline">{course.modules.length} Total</Badge>
              </div>
              <CardDescription>
                Organized learning content for your course
              </CardDescription>
            </CardHeader>
            <CardContent>
              {course.modules.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No modules added yet</p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(`/instructor/courses/create?courseid=${courseid}`)
                    }
                  >
                    Add Modules
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {course.modules.map((module, index) => (
                    <Card key={module.moduleid} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Module {index + 1}</Badge>
                              <CardTitle className="text-lg">
                                {module.title}
                              </CardTitle>
                            </div>
                            {module.description && (
                              <CardDescription>{module.description}</CardDescription>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              router.push(`/instructor/courses/${courseid}/objectives`)
                            }
                          >
                            View LOs
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </CardHeader>
                      {module.content_path && (
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FileText className="h-4 w-4" />
                            <span>Content file attached</span>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/instructor/courses/${courseid}/objectives`)}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Target className="h-5 w-5 mr-2 text-blue-600" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  View and edit learning objectives for each module
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/instructor/courses/${courseid}/history`)}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-green-600" />
                  Course History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  View changes and version history
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-purple-600" />
                  Upload Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Add more course materials and resources
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  disabled={!vsStatus || vsStatus.status === "creating"}
                >
                  Upload Files
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Vector Store Status Info */}
          {vsStatus && vsStatus.status === "creating" && (
            <Alert className="mt-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Course materials are being processed. Learning objectives will be generated
                automatically once processing completes. This usually takes a few minutes.
              </AlertDescription>
            </Alert>
          )}

          {vsStatus && vsStatus.status === "failed" && (
            <Alert variant="destructive" className="mt-6">
              <AlertDescription>
                Failed to process course materials: {vsStatus.error}
                <br />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    // Trigger re-upload/re-process
                    router.push(`/instructor/courses/${courseid}/upload`);
                  }}
                >
                  Retry Upload
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </main>
    </>
  );
}
