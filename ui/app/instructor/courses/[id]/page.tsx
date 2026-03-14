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
  getKliPipelineStatus,
  publishCourse,
  unpublishCourse,
  deleteCourse,
  createVectorStore 
} from "@/lib/instructor-api";
import type { CourseWithModules } from "@/lib/instructor-api";

export default function CourseDetailPage() {
  const basePath = process.env.NODE_ENV === 'production' ? '/learn' : '';
  const router = useRouter();
  const params = useParams();
  const courseid = params.id as string;

  const [course, setCourse] = useState<CourseWithModules | null>(null);
  const [vsStatus, setVsStatus] = useState<any>(null);
  const [kliStatus, setKliStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [vsLoading, setVsLoading] = useState(false);
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

      try {
        const ks = await getKliPipelineStatus(courseid);
        setKliStatus(ks);
      } catch (err) {
        console.log("No KLI pipeline status yet:", err);
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

  const handleCreateVectorStore = async () => {
    try {
      setVsLoading(true);
      setError("");
      setSuccess("");
      await createVectorStore(courseid);
      setSuccess("Vector store created successfully!");
      // Reload vector store status
      await loadCourseData();
    } catch (err: any) {
      setError(err.message || "Failed to create vector store");
    } finally {
      setVsLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen flex items-center justify-center" style={{
          backgroundImage: `url(${basePath}/lmw_bg_stacked_waves.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#fff4ec'
        }}>
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </main>
      </>
    );
  }

  if (error || !course) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen flex items-center justify-center" style={{
          backgroundImage: `url(${basePath}/lmw_bg_stacked_waves.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#fff4ec'
        }}>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              {error || "Course Not Found"}
            </h1>
            <Button onClick={() => router.push("/instructor/courses")} className="bg-orange-500 hover:bg-orange-600 text-white">
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
      <main className="pt-16 min-h-screen" style={{
        backgroundImage: `url(${basePath}/lmw_bg_stacked_waves.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#fff4ec'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Success/Error Messages */}
          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertDescription className="text-green-900">{success}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
              <AlertDescription className="text-red-900">{error}</AlertDescription>
            </Alert>
          )}

          {/* Course Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  {course.course_name}
                </h1>
                {course.coursedescription && (
                  <p className="text-xl text-gray-600 mt-2">
                    {course.coursedescription}
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  {course.targetaudience && (
                    <Badge className="bg-white text-gray-700 border-gray-300">
                      <Target className="h-3 w-3 mr-1 text-orange-500" />
                      {course.targetaudience}
                    </Badge>
                  )}
                  <Badge className="bg-white text-gray-700 border-gray-300">
                    <BookOpen className="h-3 w-3 mr-1 text-orange-500" />
                    {course.modules.length} Modules
                  </Badge>
                  <Badge className={course.is_published ? "bg-orange-500 text-white" : "bg-white text-gray-700 border-gray-300"}>
                    {course.is_published ? (
                      <>
                        <Eye className="h-3 w-3 mr-1 text-white" />
                        Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 mr-1 text-gray-600" />
                        Unpublished
                      </>
                    )}
                  </Badge>
                  {vsStatus && (
                    <Badge
                      className={
                        vsStatus.status === "ready"
                          ? "bg-orange-500 text-white"
                          : vsStatus.status === "creating"
                          ? "bg-white text-gray-700 border-gray-300"
                          : "bg-red-500 text-white"
                      }
                    >
                      {vsStatus.status === "ready" && "✓ Vector Store Ready"}
                      {vsStatus.status === "creating" && "⏳ Processing..."}
                      {vsStatus.status === "failed" && "✗ Processing Failed"}
                    </Badge>
                  )}
                  {kliStatus && kliStatus.total_jobs > 0 && (
                    <Badge className="bg-white text-gray-700 border-gray-300">
                      KLI: {kliStatus.approved_jobs}/{kliStatus.total_jobs} approved
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {/* Publish/Unpublish Button */}
                {course.is_published ? (
                  <Button
                    variant="outline"
                    onClick={handleUnpublish}
                    disabled={actionLoading}
                    className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <EyeOff className="h-4 w-4 mr-2" />
                    )}
                    Unpublish Course
                  </Button>
                ) : (
                  <Button
                    onClick={handlePublish}
                    disabled={actionLoading}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Publish Course
                  </Button>
                )}

                {/* Create Vector Store Button - only show if not ready */}
                {vsStatus && vsStatus.status === "not_started" && (
                  <Button
                    onClick={handleCreateVectorStore}
                    disabled={vsLoading}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {vsLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2 text-white" />
                    )}
                    Create Vector Store
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
                  className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                >
                  Back to Courses
                </Button>
              </div>
            </div>
          </div>

          {/* Prerequisites */}
          {course.prereqs && (
            <Card className="mb-6 bg-white border-gray-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg text-gray-800">Prerequisites</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{course.prereqs}</p>
              </CardContent>
            </Card>
          )}

          {/* Modules */}
          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-800">Course Modules</CardTitle>
                <Badge className="bg-orange-100 text-orange-700 border-orange-300">{course.modules.length} Total</Badge>
              </div>
              <CardDescription className="text-gray-600">
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
          <div className="mt-8 grid grid-cols-1 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white border-gray-200 hover:border-orange-300 hover:shadow-orange-100"
                  onClick={() => router.push(`/instructor/courses/${courseid}/process`)}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-800">
                  <FileText className="h-5 w-5 mr-2 text-orange-500" />
                  KLI Processing Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Track async quorum planning and golden-sample generation for each LO
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white border-gray-200 hover:border-orange-300 hover:shadow-orange-100"
                  onClick={() => router.push(`/instructor/courses/${courseid}/process`)}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-800">
                  <Edit className="h-5 w-5 mr-2 text-orange-500" />
                  Review KLI Outputs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Open LO-by-LO review to approve or edit quorum plans and golden samples
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white border-gray-200 hover:border-orange-300 hover:shadow-orange-100"
                  onClick={() => router.push(`/instructor/courses/${courseid}/objectives`)}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center text-gray-800">
                  <Target className="h-5 w-5 mr-2 text-orange-500" />
                  Learning Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  View and edit learning objectives for each module
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Vector Store Status Info */}
          {vsStatus && vsStatus.status === "creating" && (
            <Alert className="mt-6 bg-orange-50 border-orange-200">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              <AlertDescription className="text-gray-700">
                Course materials are being processed. Learning objectives will be generated
                automatically once processing completes. This usually takes a few minutes.
              </AlertDescription>
            </Alert>
          )}

          {vsStatus && vsStatus.status === "failed" && (
            <Alert variant="destructive" className="mt-6 bg-red-50 border-red-200">
              <AlertDescription className="text-red-900">
                Failed to process course materials: {vsStatus.error}
                <br />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 border-gray-300 text-gray-700 hover:bg-orange-50"
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
