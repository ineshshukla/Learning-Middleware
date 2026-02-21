"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, Lock, CheckCircle2, PlayCircle, ArrowLeft } from "lucide-react";
import {
  getCourseProgress,
  getCourseModules,
  type Course,
  type Module,
  type ModuleProgress as ModuleProgressType,
  type CourseProgress,
} from "@/lib/learner-api";

export default function CourseModulesPage() {
  const basePath = process.env.NODE_ENV === 'production' ? '/learn' : '';
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
    
    // Refetch when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCourseData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

    // Check if this module is already started or completed
    const moduleProgress = getModuleProgress(moduleId);
    if (moduleProgress?.status === "completed" || moduleProgress?.status === "in_progress") return true;

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
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundImage: `url(${basePath}/lmw_bg_stacked_waves.png)`,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center'
      }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundImage: `url(${basePath}/lmw_bg_stacked_waves.png)`,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center'
      }}>
        <div className="bg-[#fff4ec] rounded-3xl shadow-2xl p-8 max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowLeft className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Course</h2>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => router.push("/learner/explore")}
            className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      backgroundImage: `url(${basePath}/lmw_bg_stacked_waves.png)`,
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      backgroundPosition: 'center'
    }}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <button
          onClick={() => router.push("/learner/explore")}
          className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Courses</span>
        </button>

        {/* Main Content Card */}
        <div className="bg-[#fff4ec] rounded-3xl shadow-2xl overflow-hidden">
          {/* Course Header */}
          <div className="bg-gradient-to-r from-[#fff4ec] to-[#ffe8d6] border-b border-gray-300 p-8">
            <div className="inline-block px-5 py-2 bg-orange-500 rounded-full mb-4">
              <span className="text-white font-bold">Course Overview</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-3">
              {course?.course_name || "Course"}
            </h1>
            <p className="text-gray-600 text-lg mb-6">
              {course?.coursedescription || ""}
            </p>

            {/* Progress Section */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-800">Your Progress</span>
                <span className="text-gray-700 font-medium">
                  {courseProgress?.modules_progress?.filter((mp) => mp.status === "completed").length || 0} / {modules.length} modules completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-orange-400 to-orange-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${calculateOverallProgress()}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {calculateOverallProgress()}% complete
              </p>
            </div>
          </div>

          {/* Modules List */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-orange-500" />
              Course Modules
            </h2>

            {modules.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No modules available yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((module, index) => {
                  const isAccessible = isModuleAccessible(index, module.moduleid);
                  const progress = getModuleProgress(module.moduleid);
                  const isCompleted = progress?.status === "completed";
                  const isCurrent = courseProgress?.currentmodule === module.moduleid;

                  return (
                    <div
                      key={module.moduleid}
                      onClick={() => handleModuleClick(module.moduleid, index)}
                      className={`
                        bg-white rounded-2xl p-6 border-2 transition-all
                        ${isAccessible ? 'cursor-pointer hover:shadow-lg hover:border-orange-300' : 'cursor-not-allowed opacity-60'}
                        ${isCurrent ? 'border-orange-400 shadow-md' : 'border-gray-200'}
                        ${isCompleted ? 'border-green-300' : ''}
                      `}
                    >
                      <div className="flex items-start gap-4">
                        {/* Module Icon */}
                        <div className={`
                          flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center
                          ${isCompleted ? 'bg-green-100' : isCurrent ? 'bg-orange-100' : isAccessible ? 'bg-blue-100' : 'bg-gray-100'}
                        `}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-7 w-7 text-green-600" />
                          ) : isAccessible ? (
                            <PlayCircle className="h-7 w-7 text-orange-500" />
                          ) : (
                            <Lock className="h-7 w-7 text-gray-400" />
                          )}
                        </div>

                        {/* Module Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-500">
                              Module {index + 1}
                            </span>
                            {isCompleted && (
                              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                Completed
                              </span>
                            )}
                            {isCurrent && !isCompleted && (
                              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                Current
                              </span>
                            )}
                            {!isAccessible && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Locked
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl font-bold text-gray-800 mb-2">
                            {module.title}
                          </h3>
                          <p className="text-gray-600 mb-3">
                            {module.description}
                          </p>

                          {/* Module Progress Bar */}
                          {progress && progress.progress_percentage > 0 && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-gray-600">Progress</span>
                                <span className="font-semibold text-gray-700">
                                  {progress.progress_percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all"
                                  style={{ width: `${progress.progress_percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
