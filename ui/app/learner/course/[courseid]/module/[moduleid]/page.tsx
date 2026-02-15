"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Loader2, Lock } from "lucide-react";
import { LearningPreferencesModal } from "@/components/learner/learning-preferences-modal";
import { EnhancedMarkdown } from "@/components/learner/enhanced-markdown";
import { CourseChat } from "@/components/course-chat";
import {
  getCurrentLearner,
  generateModuleContent,
  generateQuiz,
  submitQuiz,
  updateLearningPreferences,
  getLearningPreferences,
  completeModule,
  getCourseModules,
  updateModuleProgress,
  checkModuleContent,
  saveModuleContent,
  checkModuleQuiz,
  saveModuleQuiz,
  getCourseProgress,
  type Quiz,
  type QuizQuestion,
  type Module,
  type LearningPreferences,
  type ModuleProgress as ModuleProgressType,
} from "@/lib/learner-api";

type FlowState =
  | "loading"
  | "preferences-first-time"
  | "generating"
  | "module"
  | "quiz"
  | "quiz-result"
  | "completed";

export default function ModuleViewerPage() {
  const params = useParams();
  const router = useRouter();
  const courseid = params.courseid as string;
  const moduleid = params.moduleid as string;

  const [learnerId, setLearnerId] = useState<string>("");
  const [module, setModule] = useState<Module | null>(null);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [modulesProgress, setModulesProgress] = useState<ModuleProgressType[]>([]);
  const [moduleContent, setModuleContent] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);
  const [contentPages, setContentPages] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    status: string;
  } | null>(null);

  const [flowState, setFlowState] = useState<FlowState>("loading");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [isFirstTimeContent, setIsFirstTimeContent] = useState(false);
  const [pollIntervalId, setPollIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeModule();
    
    return () => {
      if (pollIntervalId) {
        console.log("[CLEANUP] Clearing poll interval");
        clearInterval(pollIntervalId);
      }
    };
  }, [courseid, moduleid]);

  // Split content into pages
  const splitContentIntoPages = (content: string): string[] => {
    if (!content || content.trim() === "") return [];
    
    const sections = content.split(/(?=^## )/gm).filter(s => s.trim());
    
    if (sections.length > 1) {
      // Combine first two sections to ensure content appears on first page
      if (sections.length >= 2) {
        const firstPage = sections[0] + "\n\n" + sections[1];
        return [firstPage, ...sections.slice(2)];
      }
      return sections;
    }
    
    const words = content.split(/\s+/);
    const wordsPerPage = 500;
    const pages: string[] = [];
    
    for (let i = 0; i < words.length; i += wordsPerPage) {
      pages.push(words.slice(i, i + wordsPerPage).join(' '));
    }
    
    return pages.length > 0 ? pages : [content];
  };

  useEffect(() => {
    if (moduleContent) {
      const pages = splitContentIntoPages(moduleContent);
      setContentPages(pages);
      setCurrentPage(0);
    }
  }, [moduleContent]);

  const initializeModule = async () => {
    try {
      setLoading(true);
      setError(null);

      const learner = await getCurrentLearner();
      setLearnerId(learner.learnerid);

      const modules = await getCourseModules(courseid);
      setAllModules(modules);
      
      // Fetch course progress to get module statuses
      try {
        const courseProgress = await getCourseProgress(courseid);
        if (courseProgress.modules_progress) {
          setModulesProgress(courseProgress.modules_progress);
        }
      } catch (progErr) {
        console.log("Could not fetch course progress:", progErr);
      }
      
      const currentModule = modules.find((m) => m.moduleid === moduleid);
      if (!currentModule) {
        throw new Error("Module not found");
      }
      setModule(currentModule);

      await updateModuleProgress(moduleid, "in_progress");

      const contentCheck = await checkModuleContent(moduleid);
      console.log("[DEBUG] Content check result:", contentCheck);
      
      if (!contentCheck.exists) {
        console.log("🆕 No content record found - showing preferences form");
        setIsFirstTimeContent(true);
        setFlowState("preferences-first-time");
        setPreferencesModalOpen(true);
        return;
      }
      
      if (contentCheck.content && contentCheck.content.trim() !== "") {
        console.log("✅ Content found in database, loading existing content");
        setModuleContent(contentCheck.content);
        setIsFirstTimeContent(false);
        setFlowState("module");
        return;
      }
      
      console.log("⏳ Content record exists but empty - generation in progress, waiting...");
      setFlowState("generating");
      
      const interval = setInterval(async () => {
        console.log("[POLL] Checking if content generation completed...");
        try {
          const check = await checkModuleContent(moduleid);
          
          if (check.exists && check.content && check.content.trim() !== "") {
            console.log("[POLL] ✅ Content generated! Displaying...");
            clearInterval(interval);
            setPollIntervalId(null);
            setModuleContent(check.content);
            setFlowState("module");
          } else {
            console.log("[POLL] ⏳ Still waiting for content...");
          }
        } catch (err) {
          console.error("[POLL] Error checking content:", err);
        }
      }, 5000);
      
      setPollIntervalId(interval);
      
    } catch (err: any) {
      console.error("Error initializing module:", err);
      setError(err.message || "Failed to load module");
      setFlowState("module");
    } finally {
      setLoading(false);
    }
  };

  const handleFirstTimePreferences = async (preferences: LearningPreferences) => {
    try {
      setLoading(true);
      setError(null);
      setPreferencesModalOpen(false);
      setFlowState("generating");
      
      await updateLearningPreferences(learnerId, courseid, preferences);
      await saveModuleContent(moduleid, courseid, "");
      setPreferencesModalOpen(false);
      await generateContent(learnerId, module!);
    } catch (err: any) {
      console.error("Error with first-time preferences:", err);
      setError(err.message || "Failed to generate content");
      setFlowState("module");
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async (learnerId: string, module: Module) => {
    try {
      setFlowState("generating");
      
      const learningObjectives = [
        `Understand ${module.title}`,
        `Apply concepts from ${module.title}`,
        `Analyze key principles of ${module.title}`,
      ];

      console.log("[GENERATE] Starting content generation...");
      const result = await generateModuleContent(
        courseid,
        learnerId,
        module.title,
        learningObjectives,
        moduleid
      );
      console.log("[GENERATE] ✅ Content generated successfully");

      console.log("[SAVE] Saving content to database...");
      await saveModuleContent(moduleid, courseid, result.content);
      console.log("[SAVE] ✅ Content saved successfully");
      
      setModuleContent(result.content);
      setFlowState("module");
    } catch (err: any) {
      console.error("[ERROR] Error generating module content:", err);
      setError(err.message || "Failed to generate module content");
      setFlowState("module");
    }
  };

  const handleStartQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("[QUIZ] Checking for cached quiz...");
      const quizCheck = await checkModuleQuiz(moduleid);
      
      if (quizCheck.exists && quizCheck.quiz_data) {
        console.log("[QUIZ] ✅ Found cached quiz, using it");
        const quizData: any = quizCheck.quiz_data;
        const actualQuizData = quizData.quiz_data || quizData;
        setQuiz(actualQuizData);
        setFlowState("quiz");
        return;
      }

      console.log("[QUIZ] No cached quiz found, generating new one...");
      const quizData: any = await generateQuiz(moduleContent, module?.title || "", courseid);
      
      console.log("[QUIZ] Saving generated quiz to database...");
      await saveModuleQuiz(moduleid, courseid, quizData.quiz_data || quizData);
      console.log("[QUIZ] ✅ Quiz saved successfully");
      
      const actualQuizData = quizData.quiz_data?.quiz_data || quizData.quiz_data || quizData;
      setQuiz(actualQuizData);
      setFlowState("quiz");
    } catch (err: any) {
      console.error("[QUIZ ERROR]", err);
      setError(err.message || "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizAnswerChange = (questionNo: string, answer: string) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionNo]: answer,
    }));
  };

  const handleSubmitQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!quiz || !quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        setError("Quiz data is not available. Please try generating the quiz again.");
        setLoading(false);
        return;
      }

      const allAnswered = quiz.questions.every((q) => quizAnswers[q.id]);
      if (!allAnswered) {
        setError("Please answer all questions before submitting");
        setLoading(false);
        return;
      }

      let correctCount = 0;
      const totalQuestions = quiz.questions.length;

      quiz.questions.forEach((question) => {
        const userAnswer = quizAnswers[question.id];
        const correctAnswer = question.correct_answer || question.correctAnswer;
        const userLetter = userAnswer?.match(/^([A-D])\)/)?.[1] || userAnswer;
        
        if (userLetter === correctAnswer) {
          correctCount++;
        }
      });

      const percentage = Math.round((correctCount / totalQuestions) * 100);
      const passed = percentage >= 60;

      setQuizResult({
        score: correctCount,
        total: totalQuestions,
        percentage: percentage,
        status: passed ? "passed" : "failed",
      });
      
      setFlowState("quiz-result");
    } catch (err: any) {
      console.error("Error submitting quiz:", err);
      setError(err.message || "Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAfterQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("[COMPLETE] Marking module as completed:", moduleid);
      await updateModuleProgress(moduleid, "completed", 100);

      const modules = await getCourseModules(courseid);
      const currentIndex = modules.findIndex(m => m.moduleid === moduleid);
      const nextModule = modules[currentIndex + 1];

      if (nextModule) {
        console.log("[COMPLETE] Found next module:", nextModule.moduleid);
        
        // Unlock the next module
        await updateModuleProgress(nextModule.moduleid, "in_progress");
        
        // Navigate to next module (preference form will show on module init)
        router.push(`/learner/course/${courseid}/module/${nextModule.moduleid}`);
      } else {
        console.log("[COMPLETE] Course complete, returning to course page");
        router.push(`/learner/course/${courseid}`);
      }
    } catch (err: any) {
      console.error("Error completing module:", err);
      setError(err.message || "Failed to complete module");
    } finally {
      setLoading(false);
    }
  };

  if (flowState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundImage: 'url(/lmw_bg_stacked_waves.png)',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center'
      }}>
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-orange-600 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Module</h2>
          <p className="text-gray-700">Please wait while we load your module...</p>
        </div>
      </div>
    );
  }

  if (flowState === "generating") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundImage: 'url(/lmw_bg_stacked_waves.png)',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center'
      }}>
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-orange-600 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Generating Personalized Content</h2>
          <p className="text-gray-700 mb-4">Creating a customized learning experience just for you...</p>
          <p className="text-sm text-gray-600">
            This usually takes 1-2 minutes. The page will auto-refresh when ready.
          </p>
        </div>
      </div>
    );
  }

  if (flowState === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundImage: 'url(/lmw_bg_stacked_waves.png)',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center'
      }}>
        <div className="bg-[#fff4ec] rounded-3xl shadow-2xl p-12 max-w-2xl text-center">
          <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Course Completed!</h1>
          <p className="text-gray-700 mb-8">
            Congratulations! You've completed all modules in this course.
          </p>
          <button 
            onClick={() => router.push("/learner/explore")} 
            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition-colors"
          >
            Explore More Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      backgroundImage: 'url(/lmw_bg_stacked_waves.png)',
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      backgroundPosition: 'center'
    }}>
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => router.push(`/learner/course/${courseid}`)}
          className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Course</span>
        </button>

        <div className="bg-[#fff4ec] rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex min-h-[80vh]">
            {/* LEFT SIDEBAR */}
            <div className="w-64 bg-[#f5e6d3] border-r border-gray-300 p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">
                Course Modules
              </h3>
              <div className="space-y-2">
                {allModules.map((mod, idx) => {
                  const isCurrent = mod.moduleid === moduleid;
                  const currentIndex = allModules.findIndex(m => m.moduleid === moduleid);
                  const isPast = idx < currentIndex;
                  
                  // Check if this module is accessible (completed, in_progress, or all previous are completed)
                  const modProgress = modulesProgress.find(mp => mp.moduleid === mod.moduleid);
                  const isCompleted = modProgress?.status === "completed";
                  const isInProgress = modProgress?.status === "in_progress";
                  const isAccessible = isPast || isCurrent || isCompleted || isInProgress;
                  const isFuture = idx > currentIndex && !isAccessible;
                  
                  return (
                    <div
                      key={mod.moduleid}
                      className={`
                        p-3 rounded-lg text-sm transition-all
                        ${isCurrent ? 'bg-orange-500 text-white font-semibold shadow-md' : ''}
                        ${isAccessible && !isCurrent ? 'bg-white text-gray-700 cursor-pointer hover:bg-gray-100' : ''}
                        ${isFuture ? 'bg-white/50 text-gray-400 cursor-not-allowed' : ''}
                      `}
                      onClick={() => {
                        if (isAccessible && !isCurrent) {
                          router.push(`/learner/course/${courseid}/module/${mod.moduleid}`);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{mod.title}</span>
                        {isFuture && <Lock className="h-3 w-3 flex-shrink-0 ml-2" />}
                        {isCurrent && <span className="text-xs ml-2">●</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT CONTENT AREA */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="border-b border-gray-300 p-6 bg-gradient-to-r from-[#fff4ec] to-[#ffe8d6]">
                <div className="inline-block px-4 py-2 bg-orange-100 rounded-full">
                  <span className="text-orange-700 font-semibold">{module?.title}</span>
                </div>
                {module?.description && (
                  <p className="text-gray-600 mt-2 text-sm">{module.description}</p>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="m-6 p-4 bg-red-100 border border-red-300 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800">Error</h4>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* CONTENT BODY */}
              <div className="flex-1 p-8 overflow-y-auto">
                {/* MODULE CONTENT VIEW */}
                {flowState === "module" && (
                  <div className="space-y-6">
                    {moduleContent ? (
                      <>
                        <div className="prose prose-lg max-w-none">
                          <EnhancedMarkdown content={contentPages[currentPage] || moduleContent} />
                        </div>

                        {/* Pagination */}
                        {contentPages.length > 1 && (
                          <div className="flex items-center justify-between pt-6 border-t border-gray-300">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                              disabled={currentPage === 0}
                              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowLeft className="h-4 w-4" />
                              <span>Previous</span>
                            </button>

                            <span className="text-sm text-gray-600">
                              Page {currentPage + 1} of {contentPages.length}
                            </span>

                            <button
                              onClick={() => setCurrentPage(prev => Math.min(contentPages.length - 1, prev + 1))}
                              disabled={currentPage === contentPages.length - 1}
                              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <span>Next</span>
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {/* Quiz Button - Only show on last page */}
                        {(contentPages.length === 0 || currentPage === contentPages.length - 1) && (
                          <div className="flex justify-end pt-6">
                            <button
                              onClick={handleStartQuiz}
                              disabled={loading || !moduleContent}
                              className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition-colors disabled:opacity-50"
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Generating Quiz...</span>
                                </>
                              ) : (
                                <>
                                  <span>Take Quiz to Complete</span>
                                  <ArrowRight className="h-4 w-4" />
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
                        <p className="text-gray-600">Loading content...</p>
                      </div>
                    )}
                  </div>
                )}

                {/* QUIZ VIEW */}
                {flowState === "quiz" && quiz && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">Module Quiz</h2>
                      <p className="text-gray-600 mb-6">Answer all questions to complete this module</p>

                      <div className="space-y-6">
                        {quiz.questions && Array.isArray(quiz.questions) && quiz.questions.length > 0 ? (
                          quiz.questions.map((question, index) => (
                            <div key={question.id} className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                              <p className="font-semibold text-gray-800 mb-4">
                                {index + 1}. {question.question}
                              </p>
                              <div className="space-y-3">
                                {question.options && Array.isArray(question.options) ? (
                                  question.options.map((option, optIndex) => (
                                    <label
                                      key={optIndex}
                                      className="flex items-center gap-3 p-3 rounded-lg bg-white border-2 border-gray-200 hover:border-orange-300 cursor-pointer transition-all"
                                    >
                                      <input
                                        type="radio"
                                        name={`question-${question.id}`}
                                        value={option}
                                        checked={quizAnswers[question.id] === option}
                                        onChange={(e) => handleQuizAnswerChange(question.id.toString(), e.target.value)}
                                        className="w-4 h-4 text-orange-500"
                                      />
                                      <span className="text-gray-700">{option}</span>
                                    </label>
                                  ))
                                ) : (
                                  <p className="text-gray-500 italic">No options available</p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-600 text-center py-8">No quiz questions available.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setFlowState("module")}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Content</span>
                      </button>

                      <button
                        onClick={handleSubmitQuiz}
                        disabled={loading || !quiz.questions || quiz.questions.length === 0}
                        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full disabled:opacity-50"
                      >
                        {loading ? 'Submitting...' : 'Submit Quiz'}
                      </button>
                    </div>
                  </div>
                )}

                {/* QUIZ RESULT VIEW */}
                {flowState === "quiz-result" && quizResult && (
                  <div className="space-y-6">
                    <div className={`bg-white rounded-2xl p-8 shadow-lg border-2 text-center ${
                      quizResult.status === "passed" ? "border-green-400" : "border-yellow-400"
                    }`}>
                      <CheckCircle
                        className={`h-20 w-20 mx-auto mb-6 ${
                          quizResult.status === "passed" ? "text-green-500" : "text-yellow-500"
                        }`}
                      />
                      <h2 className="text-3xl font-bold text-gray-800 mb-3">
                        {quizResult.status === "passed" ? "Great Job!" : "Quiz Completed"}
                      </h2>
                      <p className="text-xl text-gray-700 mb-6">
                        You scored {quizResult.score} out of {quizResult.total} ({quizResult.percentage}%)
                      </p>

                      <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
                        <div
                          className={`h-4 rounded-full ${
                            quizResult.status === "passed" ? "bg-green-500" : "bg-yellow-500"
                          }`}
                          style={{ width: `${quizResult.percentage}%` }}
                        ></div>
                      </div>

                      <p className="text-gray-600">
                        {quizResult.status === "passed"
                          ? "Well done! You can now continue to the next module."
                          : "You need 60% to pass. Review the material and try again."}
                      </p>
                    </div>

                    {/* Quiz Review */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Review Your Answers</h3>

                      <div className="space-y-6">
                        {quiz && quiz.questions && Array.isArray(quiz.questions) ? (
                          quiz.questions.map((question, index) => {
                            const userAnswer = quizAnswers[question.id];
                            const correctAnswer = question.correct_answer || question.correctAnswer;
                            const userLetter = userAnswer?.match(/^([A-D])\)/)?.[1] || userAnswer;
                            const isCorrect = userLetter === correctAnswer;

                            return (
                              <div key={question.id} className={`p-5 rounded-xl border-2 ${
                                isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
                              }`}>
                                <div className="flex items-start gap-3 mb-3">
                                  {isCorrect ? (
                                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                                      <span className="text-white text-xs">✕</span>
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-800 mb-3">
                                      {index + 1}. {question.question}
                                    </p>

                                    <div className="space-y-2">
                                      {question.options.map((option, optIndex) => {
                                        const optionLetter = option.match(/^([A-D])\)/)?.[1] || "";
                                        const isCorrectAnswer = optionLetter === correctAnswer;
                                        const isUserAnswer = option === userAnswer;

                                        return (
                                          <div
                                            key={optIndex}
                                            className={`p-3 rounded-lg ${
                                              isCorrectAnswer
                                                ? "bg-green-100 border-2 border-green-400 font-semibold"
                                                : isUserAnswer && !isCorrect
                                                ? "bg-red-100 border-2 border-red-400"
                                                : "bg-white border border-gray-200"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-gray-800">{option}</span>
                                              {isCorrectAnswer && (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                              )}
                                              {isUserAnswer && !isCorrect && (
                                                <span className="text-xs text-red-600">(Your answer)</span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {question.explanation && (
                                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm font-semibold text-blue-800 mb-1">Explanation:</p>
                                        <p className="text-sm text-gray-700">{question.explanation}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-gray-600 text-center">No quiz questions available for review.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button
                        onClick={handleContinueAfterQuiz}
                        className="flex items-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full"
                      >
                        <span>Continue</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <LearningPreferencesModal
        open={preferencesModalOpen}
        onOpenChange={setPreferencesModalOpen}
        onSubmit={handleFirstTimePreferences}
        courseName={module?.title || ""}
        isUpdate={false}
      />

      <CourseChat 
        courseId={courseid} 
        courseName={module?.title}
        moduleId={moduleid}
      />
    </div>
  );
}
