"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Lock, CheckCircle2, PlayCircle, ArrowLeft } from "lucide-react";
import { CourseChat } from "@/components/course-chat";
import {
  getCourseProgress,
  getCourseModules,
  type Course,
  type Module,
  type ModuleProgress as ModuleProgressType,
  type CourseProgress,
} from "@/lib/learner-api";

export default function CourseModulesPage() {
  const params = useParams();
  const router = useRouter();
  const courseid = params.courseid as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourseData();
  }, [courseid]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch course progress (includes current module and module progress)
      const progressData = await getCourseProgress(courseid);
      setCourseProgress(progressData);
      setCourse(progressData.course || null);

      // Fetch all modules for the course
      const modulesData = await getCourseModules(courseid);
      setModules(modulesData);
    } catch (err: any) {
      console.error("Error fetching course data:", err);
      setError(err.message || "Failed to load course data");
    } finally {
      setLoading(false);
    }
  };

  const getModuleProgress = (moduleId: string): ModuleProgressType | undefined => {
    return courseProgress?.modules_progress?.find((mp) => mp.moduleid === moduleId);
  };

  const isModuleAccessible = (moduleIndex: number, moduleId: string): boolean => {
    if (moduleIndex === 0) return true; // First module always accessible

    // Check if current module
    if (courseProgress?.currentmodule === moduleId) return true;

    // Check if this module is already completed
    const moduleProgress = getModuleProgress(moduleId);
    if (moduleProgress?.status === "completed") return true;

    // Check if all previous modules are completed
    let allPreviousCompleted = true;
    for (let i = 0; i < moduleIndex; i++) {
      const prevModule = modules[i];
      const prevProgress = getModuleProgress(prevModule.moduleid);
      if (prevProgress?.status !== "completed") {
        allPreviousCompleted = false;
        break;
      }
    }

    // If all previous modules are completed, this module is accessible
    if (allPreviousCompleted) return true;

    return false;
  };

  const getModuleStatusBadge = (moduleId: string, index: number) => {
    const progress = getModuleProgress(moduleId);
    const isAccessible = isModuleAccessible(index, moduleId);

    if (progress?.status === "completed") {
      return <Badge className="bg-green-500">Completed</Badge>;
    } else if (courseProgress?.currentmodule === moduleId) {
      return <Badge className="bg-blue-500">Current</Badge>;
    } else if (progress?.status === "in_progress") {
      return <Badge className="bg-yellow-500">In Progress</Badge>;
    } else if (!isAccessible) {
      return <Badge variant="secondary">Locked</Badge>;
    } else {
      return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const handleModuleClick = (moduleId: string, index: number) => {
    if (!isModuleAccessible(index, moduleId)) {
      return; // Don't navigate to locked modules
    }
    router.push(`/learner/course/${courseid}/module/${moduleId}`);
  };

  const calculateOverallProgress = (): number => {
    if (!courseProgress?.modules_progress || modules.length === 0) return 0;
    const completedCount = courseProgress.modules_progress.filter(
      (mp) => mp.status === "completed"
    ).length;
    return Math.round((completedCount / modules.length) * 100);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading course...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Course</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/learner/explore")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Course Header */}
      <div className="mb-6">
        <Button
          onClick={() => router.push("/learner/explore")}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Courses
        </Button>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-slate-800">
              {course?.course_name || "Course"}
            </CardTitle>
            <CardDescription className="text-slate-600 text-base">
              {course?.coursedescription || ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Overall Progress</span>
                <span className="text-slate-600">
                  {courseProgress?.modules_progress?.filter((mp) => mp.status === "completed")
                    .length || 0}{" "}
                  / {modules.length} modules completed
                </span>
              </div>
              <Progress value={calculateOverallProgress()} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Course Modules</h2>

        {modules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No modules available yet.</p>
            </CardContent>
          </Card>
        ) : (
          modules.map((module, index) => {
            const isAccessible = isModuleAccessible(index, module.moduleid);
            const progress = getModuleProgress(module.moduleid);

            return (
              <Card
                key={module.moduleid}
                className={`transition-all hover:shadow-md ${
                  isAccessible ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
                }`}
                onClick={() => handleModuleClick(module.moduleid, index)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full ${
                          progress?.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : courseProgress?.currentmodule === module.moduleid
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {progress?.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : isAccessible ? (
                          <PlayCircle className="h-5 w-5" />
                        ) : (
                          <Lock className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-500">
                            Module {index + 1}
                          </span>
                          {getModuleStatusBadge(module.moduleid, index)}
                        </div>
                        <CardTitle className="text-xl mb-2">{module.title}</CardTitle>
                        <CardDescription>{module.description}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {progress && progress.progress_percentage > 0 && (
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-medium">{progress.progress_percentage}%</span>
                      </div>
                      <Progress value={progress.progress_percentage} className="h-1.5" />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Floating Chat Assistant */}
      <CourseChat 
        courseId={courseid} 
        courseName={course?.course_name}
      />
    </div>
  );
}
