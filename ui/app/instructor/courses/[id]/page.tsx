"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/header";
import { ModuleManagement } from "@/components/module-management";
import {
  Loader2,
  BookOpen,
  Target,
  FileText,
  Edit,
  ChevronRight,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { 
  getCourse, 
  getVectorStoreStatus,
  publishCourse,
  unpublishCourse,
  deleteCourse 
} from "@/lib/instructor-api";
import type { CourseWithModules } from "@/lib/instructor-api";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseid = params.id as string;

  const [course, setCourse] = useState<CourseWithModules | null>(null);
  const [vsStatus, setVsStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState("");

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

  const handlePublish = async () => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      await publishCourse(courseid);
      setSuccess("Course published successfully! It is now visible to learners.");
      await loadCourseData(); // Reload to update is_published status
    } catch (err: any) {
      setError(err.message || "Failed to publish course");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      await unpublishCourse(courseid);
      setSuccess("Course unpublished successfully! It is now hidden from learners.");
      await loadCourseData(); // Reload to update is_published status
    } catch (err: any) {
      setError(err.message || "Failed to unpublish course");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this course? This action cannot be undone and will delete all modules, learning objectives, and associated data."
    );
    
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      await deleteCourse(courseid);
      router.push("/instructor/courses?deleted=true");
    } catch (err: any) {
      setError(err.message || "Failed to delete course");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-[#181818] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#a020f0]" />
        </main>
      </>
    );
  }

  if (error || !course) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-[#181818] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              {error || "Course Not Found"}
            </h1>
            <Button onClick={() => router.push("/instructor/courses")} className="bg-[#a020f0] hover:bg-[#8c1acc] text-white">
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
      <main className="pt-16 min-h-screen bg-[#181818]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Success/Error Messages */}
          {success && (
            <Alert className="mb-6 bg-[#282828] border-[#a020f0] text-white">
              <AlertDescription className="text-white">{success}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-6 bg-[#282828] border-red-500 text-white">
              <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
          )}

          {/* Course Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-2">
                  {course.course_name}
                </h1>
                {course.coursedescription && (
                  <p className="text-xl text-white mt-2">
                    {course.coursedescription}
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  {course.targetaudience && (
                    <Badge className="bg-[#3f3f3f] text-white">
                      <Target className="h-3 w-3 mr-1 text-white" />
                      {course.targetaudience}
                    </Badge>
                  )}
                  <Badge className="bg-[#3f3f3f] text-white border-white">
                    <BookOpen className="h-3 w-3 mr-1 text-white" />
                    {course.modules.length} Modules
                  </Badge>
                  <Badge className={course.is_published ? "bg-[#a020f0] text-white" : "bg-[#3f3f3f] text-white"}>
                    {course.is_published ? (
                      <>
                        <Eye className="h-3 w-3 mr-1 text-white" />
                        Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 mr-1 text-white" />
                        Unpublished
                      </>
                    )}
                  </Badge>
                  {vsStatus && (
                    <Badge
                      className={
                        vsStatus.status === "ready"
                          ? "bg-[#a020f0] text-white"
                          : vsStatus.status === "creating"
                          ? "bg-[#3f3f3f] text-white"
                          : "bg-red-500 text-white"
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
                {/* <Button
                  onClick={() =>
                    router.push(`/instructor/courses/${courseid}/objectives`)
                  }
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Manage Learning Objectives
                </Button> */}
                
                {/* Publish/Unpublish Button */}
                {course.is_published ? (
                  <Button
                    variant="outline"
                    onClick={handleUnpublish}
                    disabled={actionLoading}
                    className="border-white text-black hover:bg-[#3f3f3f] hover:text-white"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-black" />
                    ) : (
                      <EyeOff className="h-4 w-4 mr-2 text-black" />
                    )}
                    Unpublish Course
                  </Button>
                ) : (
                  <Button
                    onClick={handlePublish}
                    disabled={actionLoading}
                    className="border-white text-black hover:bg-[#3f3f3f] hover:text-white"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-black" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2 text-black" />
                    )}
                    Publish Course
                  </Button>
                )}

                {/* Delete Button */}
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2 text-white" />
                  )}
                  Delete Course
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push("/instructor/courses")}
                  className="border-white text-black hover:bg-[#3f3f3f] hover:text-white"
                >
                  Back to Courses
                </Button>
              </div>
            </div>
          </div>

          {/* Prerequisites */}
          {course.prereqs && (
            <Card className="mb-6 bg-[#282828] border-[#3f3f3f]">
              <CardHeader>
                <CardTitle className="text-lg text-white">Prerequisites</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white">{course.prereqs}</p>
              </CardContent>
            </Card>
          )}

          {/* Modules */}
          <Card className="bg-[#282828] border-[#3f3f3f]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Course Modules</CardTitle>
                <Badge className="bg-[#3f3f3f] text-white border-white">{course.modules.length} Total</Badge>
              </div>
              <CardDescription className="text-white">
                Manage your course modules and their learning objectives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModuleManagement 
                courseid={courseid}
                modules={course.modules}
                onModulesChange={loadCourseData}
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-[#282828] border-[#3f3f3f] hover:bg-[#3f3f3f]"
                  onClick={() => router.push(`/instructor/courses/${courseid}/objectives`)}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-white">
                  <Target className="h-5 w-5 mr-2 text-[#a020f0]" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white">
                  View and edit learning objectives for each module
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-[#282828] border-[#3f3f3f] hover:bg-[#3f3f3f]"
                  onClick={() => router.push(`/instructor/courses/${courseid}/history`)}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-white">
                  <FileText className="h-5 w-5 mr-2 text-[#a020f0]" />
                  Course History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white">
                  View changes and version history
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Vector Store Status Info */}
          {vsStatus && vsStatus.status === "creating" && (
            <Alert className="mt-6 bg-[#282828] border-[#a020f0]">
              <Loader2 className="h-4 w-4 animate-spin text-[#a020f0]" />
              <AlertDescription className="text-white">
                Course materials are being processed. Learning objectives will be generated
                automatically once processing completes. This usually takes a few minutes.
              </AlertDescription>
            </Alert>
          )}

          {vsStatus && vsStatus.status === "failed" && (
            <Alert variant="destructive" className="mt-6 bg-[#282828] border-red-500">
              <AlertDescription className="text-white">
                Failed to process course materials: {vsStatus.error}
                <br />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 border-white text-white hover:bg-[#3f3f3f]"
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
