"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, CheckCircle, Loader2, FileText, MessageSquare } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LearningPreferencesModal } from "@/components/learner/learning-preferences-modal";
import { EnhancedMarkdown } from "@/components/enhanced-markdown";
import { CopilotChat } from "@/components/copilot-chat";
import {
  getCurrentLearner,
  generateModuleContent,
  generateQuiz,
  submitQuiz,
  updateLearningPreferences,
  getLearningPreferences,
  completeModule,
  getCourseModules,
  getModuleProgress,
  updateModuleProgress,
  checkModuleContent,
  saveModuleContent,
  type Quiz,
  type QuizQuestion,
  type Module,
  type LearningPreferences,
} from "@/lib/learner-api";

type FlowState =
  | "loading"
  | "preferences-first-time"
  | "generating"
  | "module"
  | "quiz"
  | "quiz-result"
  | "preferences"
  | "completed";

export default function ModuleViewerPage() {
  const params = useParams();
  const router = useRouter();
  const courseid = params.courseid as string;
  const moduleid = params.moduleid as string;

  const [learnerId, setLearnerId] = useState<string>("");
  const [module, setModule] = useState<Module | null>(null);
  const [moduleContent, setModuleContent] = useState<string>("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizId, setQuizId] = useState<string>("");
  const [quizFromCache, setQuizFromCache] = useState<boolean>(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    status: string;
    question_results?: Array<{
      questionNo: string;
      question: string;
      options: string[];
      selectedOption: string;
      correctAnswer: string;
      isCorrect: boolean;
      explanation?: string;
    }>;
  } | null>(null);

  const [flowState, setFlowState] = useState<FlowState>("loading");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [isFirstTimeContent, setIsFirstTimeContent] = useState(false);
  const [pollIntervalId, setPollIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isModuleCompleted, setIsModuleCompleted] = useState(false);

  // NEW: Pagination state for module content
  const [contentPages, setContentPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // NEW: Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    initializeModule();
    
    // Cleanup poll interval on unmount
    return () => {
      if (pollIntervalId) {
        console.log("[CLEANUP] Clearing poll interval");
        clearInterval(pollIntervalId);
      }
    };
  }, [courseid, moduleid]);

  // Clear quiz when module changes
  useEffect(() => {
    setQuiz(null);
    setQuizId("");
    setQuizAnswers({});
    setQuizResult(null);
    setQuizFromCache(false);
    setIsModuleCompleted(false);
  }, [moduleid]);

  // Split content into pages for better reading experience
  const splitContentIntoPages = (content: string, wordsPerPage: number = 400): string[] => {
    const paragraphs = content.split('\n\n');
    const pages: string[] = [];
    let currentPageContent = '';
    let wordCount = 0;

    for (const paragraph of paragraphs) {
      const words = paragraph.split(' ').length;
      
      if (wordCount + words > wordsPerPage && currentPageContent) {
        pages.push(currentPageContent.trim());
        currentPageContent = paragraph + '\n\n';
        wordCount = words;
      } else {
        currentPageContent += paragraph + '\n\n';
        wordCount += words;
      }
    }

    if (currentPageContent) {
      pages.push(currentPageContent.trim());
    }

    return pages.length > 0 ? pages : [content];
  };

  // Split content when it's loaded
  useEffect(() => {
    if (moduleContent && moduleContent.trim()) {
      const pages = splitContentIntoPages(moduleContent, 400);
      setContentPages(pages);
      setCurrentPage(0);
    }
  }, [moduleContent]);

  const initializeModule = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get learner ID
      const learner = await getCurrentLearner();
      setLearnerId(learner.learnerid);

      // Get module info
      const modules = await getCourseModules(courseid);
      const currentModule = modules.find((m) => m.moduleid === moduleid);
      if (!currentModule) {
        throw new Error("Module not found");
      }
      setModule(currentModule);

      // Check current module progress before updating
      let currentProgress;
      try {
        currentProgress = await getModuleProgress(moduleid);
        console.log("[DEBUG] Current module progress:", currentProgress);
      } catch (err) {
        console.log("[DEBUG] No existing progress found, will create new");
        currentProgress = null;
      }

      // Note: Module progress is now managed by the orchestrator
      // The in_progress status is not critical for functionality
      // Only update to in_progress if the module is not already completed
      if (!currentProgress || currentProgress.status !== "completed") {
        console.log("[DEBUG] Module not completed");
        setIsModuleCompleted(false);
      } else {
        console.log("[DEBUG] Module already completed, keeping status as completed");
        setIsModuleCompleted(true);
      }

      // Check if content record exists in database
      const contentCheck = await checkModuleContent(moduleid);
      console.log("[DEBUG] Content check result:", contentCheck);
      console.log("[DEBUG] Content exists:", contentCheck.exists);
      console.log("[DEBUG] Content value:", contentCheck.content);
      
      // If module is completed, show content directly and allow quiz retake
      if (currentProgress && currentProgress.status === "completed") {
        console.log("✅ Module already completed, showing content");
        if (contentCheck.exists && contentCheck.content && contentCheck.content.trim() !== "") {
          setModuleContent(contentCheck.content);
          setIsFirstTimeContent(false);
          setFlowState("module");
          return;
        } else {
          console.warn("⚠️ Module marked as completed but no content found - unusual state");
        }
      }
      
      if (!contentCheck.exists) {
        // No content record at all = Form was never submitted for this learner+module
        console.log("🆕 No content record found - showing preferences form (first time)");
        setIsFirstTimeContent(true);
        setFlowState("preferences-first-time");
        setPreferencesModalOpen(true);
        return;
      }
      
      // Content record exists (form was submitted before)
      if (contentCheck.content && contentCheck.content.trim() !== "") {
        // Real content exists - display it
        console.log("✅ Content found in database, loading existing content");
        setModuleContent(contentCheck.content);
        setIsFirstTimeContent(false);
        setFlowState("module");
        return;
      }
      
      // Content record exists but content is empty/null = Still generating
      console.log("⏳ Content record exists but empty - generation in progress, waiting...");
      setFlowState("generating");
      
      // Poll for content every 5 seconds until it's populated
      const interval = setInterval(async () => {
        console.log("[POLL] Checking if content generation completed...");
        try {
          const check = await checkModuleContent(moduleid);
          console.log("[POLL] Check result:", check);
          
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
  };  const handleFirstTimePreferences = async (preferences: LearningPreferences) => {
    try {
      setLoading(true);
      setError(null);
      setPreferencesModalOpen(false);
      setFlowState("generating");
      
      // Step 1: Save preferences to MongoDB (for content generation)
      await updateLearningPreferences(learnerId, courseid, preferences);
      
      // Step 2: Create empty content record in PostgreSQL to mark form as submitted
      // This prevents the form from showing again even if generation fails or user navigates away
      await saveModuleContent(moduleid, courseid, "");
      
      // Step 3: Now generate content - this will update the empty record with real content
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
      
      // For demo purposes, using placeholder learning objectives
      // In production, these should come from the instructor's course setup
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
        learningObjectives
      );
      console.log("[GENERATE] ✅ Content generated successfully, length:", result.content.length);

      // Save the generated content to database
      console.log("[SAVE] Saving content to database...");
      await saveModuleContent(moduleid, courseid, result.content);
      console.log("[SAVE] ✅ Content saved successfully");
      
      setModuleContent(result.content);
      setFlowState("module");
      console.log("[DISPLAY] Content set and displaying");
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

      // If we already have a quiz in memory, just show it
      if (quiz && quiz.questions && quiz.questions.length > 0) {
        console.log("[DEBUG] Using existing quiz from memory");
        setFlowState("quiz");
        setLoading(false);
        return;
      }

      console.log("[DEBUG] No quiz in memory, checking cache or generating new...");

      // Generate new quiz (will check cache automatically)
      const quizData = await generateQuiz(
        moduleContent, 
        module?.title || "",
        learnerId,
        moduleid,
        false // don't force regenerate by default
      );
      
      console.log("[DEBUG] Quiz response full:", JSON.stringify(quizData, null, 2));
      console.log("[DEBUG] Quiz data nested:", JSON.stringify(quizData.quiz_data, null, 2));
      
      // Validate quiz structure - note the nested quiz_data structure
      if (!quizData.quiz_data) {
        console.error("[ERROR] Missing quiz_data in response:", JSON.stringify(quizData));
        throw new Error("Quiz data is missing from response");
      }
      
      // Access the deeply nested quiz questions
      const smeResponse = quizData.quiz_data as any;
      
      // Handle both fresh generation and cached quiz structures
      let actualQuestions;
      if (smeResponse.quiz_data?.quiz_data?.questions) {
        // Triple nested (cached quiz)
        actualQuestions = smeResponse.quiz_data.quiz_data.questions;
      } else if (smeResponse.quiz_data?.questions) {
        // Double nested (fresh quiz)
        actualQuestions = smeResponse.quiz_data.questions;
      } else if (smeResponse.questions) {
        // Single nested
        actualQuestions = smeResponse.questions;
      } else {
        actualQuestions = null;
      }
      console.log("[DEBUG] Direct questions access:", actualQuestions);
      console.log("[DEBUG] Questions type:", typeof actualQuestions);
      console.log("[DEBUG] Is array?:", Array.isArray(actualQuestions));
      
      if (!actualQuestions || !Array.isArray(actualQuestions)) {
        console.error("[ERROR] Questions validation failed. Questions:", actualQuestions);
        throw new Error("Quiz questions are missing or invalid");
      }
      
      if (actualQuestions.length === 0) {
        throw new Error("Quiz has no questions");
      }
      
      console.log("[DEBUG] Quiz validated successfully, questions count:", actualQuestions.length);
      
      // Transform SME format to frontend format
      // Handle different nesting levels for metadata
      let quizMetadata;
      if (smeResponse.quiz_data?.quiz_data?.quiz_metadata) {
        quizMetadata = smeResponse.quiz_data.quiz_data.quiz_metadata;
      } else if (smeResponse.quiz_data?.quiz_metadata) {
        quizMetadata = smeResponse.quiz_data.quiz_metadata;
      } else {
        quizMetadata = smeResponse.quiz_metadata;
      }
      
      const transformedQuiz = {
        module_name: quizMetadata?.module_name || module?.title || "",
        questions: actualQuestions.map((q: any) => ({
          questionNo: String(q.id || q.questionNo || Math.random()),
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correct_answer || q.correctAnswer
        }))
      };
      
      console.log("[DEBUG] Transformed quiz:", transformedQuiz);
      console.log(quizData.from_cache ? "[INFO] ✅ Quiz loaded from cache" : "[INFO] 🆕 Fresh quiz generated");
      
      setQuiz(transformedQuiz);
      setQuizId(quizData.quiz_id || "");
      setQuizFromCache(quizData.from_cache || false);
      setFlowState("quiz");
    } catch (err: any) {
      console.error("Error generating quiz:", err);
      setError(err.message || "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      const quizData = await generateQuiz(
        moduleContent, 
        module?.title || "",
        learnerId,
        moduleid,
        true // force regenerate
      );
      
      console.log("[DEBUG] Regenerated quiz:", quizData);
      
      // Validate quiz structure - same as before
      if (!quizData.quiz_data) {
        console.error("[ERROR] Missing quiz_data in response:", JSON.stringify(quizData));
        throw new Error("Quiz data is missing from response");
      }
      
      const smeResponse = quizData.quiz_data as any;
      const actualQuestions = smeResponse.quiz_data?.questions;
      
      if (!actualQuestions || !Array.isArray(actualQuestions)) {
        console.error("[ERROR] Questions validation failed. Questions:", actualQuestions);
        throw new Error("Quiz questions are missing or invalid");
      }
      
      if (actualQuestions.length === 0) {
        throw new Error("Quiz has no questions");
      }
      
      // Transform and set new quiz
      const smeQuizData = smeResponse.quiz_data;
      const transformedQuiz = {
        module_name: smeQuizData.quiz_metadata?.module_name || module?.title || "",
        questions: actualQuestions.map((q: any) => ({
          questionNo: String(q.id || q.questionNo || Math.random()),
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correct_answer || q.correctAnswer
        }))
      };
      
      setQuiz(transformedQuiz);
      setQuizId(quizData.quiz_id || "");
      setQuizFromCache(false);
      setQuizAnswers({}); // Clear previous answers
      // Stay in quiz state, don't change flowState
      
    } catch (err: any) {
      console.error("Error regenerating quiz:", err);
      setError(err.message || "Failed to regenerate quiz");
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

      if (!quiz) return;

      // Validate quiz structure
      if (!quiz.questions || !Array.isArray(quiz.questions)) {
        setError("Quiz is invalid - missing questions");
        setLoading(false);
        return;
      }

      // Check all questions answered
      const allAnswered = quiz.questions.every((q) => quizAnswers[q.questionNo]);
      if (!allAnswered) {
        setError("Please answer all questions before submitting");
        setLoading(false);
        return;
      }

      const responses = Object.entries(quizAnswers).map(([questionNo, selectedOption]) => ({
        questionNo,
        selectedOption,
      }));

      const result = await submitQuiz({
        learner_id: learnerId,
        quiz_id: quizId || `QUIZ_${moduleid}_${Date.now()}`, // Use stored quiz_id or fallback
        module_id: moduleid,
        responses,
      });

      setQuizResult({
        score: result.score,
        total: result.total_questions,
        percentage: result.percentage,
        status: result.status,
        question_results: result.question_results,
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

      // Complete module via orchestrator (handles all module completion logic)
      const nextModuleInfo = await completeModule(learnerId, courseid, moduleid);
      
      if (nextModuleInfo.is_course_complete) {
        // No more modules - course completed!
        console.log("[INFO] Course completed!");
        setFlowState("completed");
      } else if (nextModuleInfo.next_module_id) {
        // Navigate directly to next module (unlocked automatically by backend)
        console.log("[INFO] Moving to next module:", nextModuleInfo.next_module_id);
        router.push(`/learner/course/${courseid}/module/${nextModuleInfo.next_module_id}`);
      } else {
        // Fallback to course page
        console.log("[INFO] No next module found, returning to course page");
        router.push(`/learner/course/${courseid}`);
      }
    } catch (error) {
      console.error("Error completing module:", error);
      setError("Failed to complete module. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async (preferences: LearningPreferences) => {
    try {
      setLoading(true);
      setError(null);

      // Update preferences
      await updateLearningPreferences(learnerId, courseid, preferences);

      // Complete module and get next module info
      const nextModuleInfo = await completeModule(learnerId, courseid, moduleid);
      setIsModuleCompleted(true);

      setPreferencesModalOpen(false);

      if (nextModuleInfo.is_course_complete) {
        // Course completed!
        setFlowState("completed");
      } else if (nextModuleInfo.next_module_id) {
        // Navigate to next module
        router.push(`/learner/course/${courseid}/module/${nextModuleInfo.next_module_id}`);
      } else {
        // Back to course page
        router.push(`/learner/course/${courseid}`);
      }
    } catch (err: any) {
      console.error("Error updating preferences:", err);
      setError(err.message || "Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  if (flowState === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Loading Module
          </h2>
          <p className="text-slate-600">
            Please wait while we load your module...
          </p>
        </div>
      </div>
    );
  }

  if (flowState === "generating") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Generating Personalized Content
          </h2>
          <p className="text-slate-600 mb-4">
            Creating a customized learning experience just for you...
          </p>
          <p className="text-sm text-slate-500">
            This usually takes 1-2 minutes. The page will auto-refresh when ready.
          </p>
        </div>
      </div>
    );
  }

  if (flowState === "completed") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-3xl text-green-800">Course Completed!</CardTitle>
            <CardDescription className="text-green-700">
              Congratulations! You've completed all modules in this course.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/learner/explore")} size="lg">
              Explore More Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 ease-in-out ${isChatOpen ? 'mr-[500px]' : ''}`}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push(`/learner/course/${courseid}`)}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Modules
          </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{module?.title}</h1>
            <p className="text-slate-600 mt-1">{module?.description}</p>
          </div>
          <Badge className="h-fit">
            {flowState === "module"
              ? "Learning"
              : flowState === "quiz"
              ? "Quiz"
              : "Review"}
          </Badge>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Module Content View - Enhanced Professional Layout */}
      {flowState === "module" && (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50/20 -m-6 p-6">
          {/* Reading Progress Bar */}
          <div className="fixed top-0 left-0 right-0 h-1 bg-neutral-200 z-50">
            <div 
              className="h-full bg-gradient-to-r from-violet-600 to-emerald-600 transition-all duration-300"
              style={{ width: `${contentPages.length > 0 ? ((currentPage + 1) / contentPages.length) * 100 : 0}%` }}
            />
          </div>

          {/* Content Container - Reading Optimized */}
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Module Header */}
            <div className="mb-8 text-center animate-fadeIn">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 text-violet-700 font-semibold text-sm mb-4">
                <BookOpen className="h-4 w-4" />
                <span>Section {currentPage + 1} of {contentPages.length > 0 ? contentPages.length : 1}</span>
              </div>
              <h1 className="text-4xl font-bold text-neutral-900 mb-3">{module?.title}</h1>
              {module?.description && (
                <p className="text-lg text-neutral-600">{module.description}</p>
              )}
            </div>

            {/* Content Card - Professional Reading Layout */}
            <Card className="border-2 border-neutral-200/50 shadow-lg mb-6">
              <CardContent className="p-8 md:p-12">
                {/* Typography-optimized content */}
                <div className="prose prose-lg max-w-none">
                  <div className="text-neutral-800 leading-relaxed text-lg">
                    {moduleContent ? (
                      contentPages.length > 0 ? (
                        <EnhancedMarkdown content={contentPages[currentPage]} />
                      ) : (
                        <EnhancedMarkdown content={moduleContent} />
                      )
                    ) : (
                      <p className="text-slate-600">Loading content...</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            {contentPages.length > 1 && (
              <div className="flex items-center justify-between mb-8">
                <Button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  variant="outline"
                  size="lg"
                  className="group"
                >
                  <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                  Previous Section
                </Button>

                {/* Page Indicators */}
                <div className="flex items-center gap-2">
                  {contentPages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index)}
                      className={`h-3 rounded-full transition-all duration-300 ${
                        index === currentPage
                          ? 'bg-violet-600 w-8'
                          : index < currentPage
                          ? 'bg-emerald-500 w-3'
                          : 'bg-neutral-300 w-3'
                      }`}
                      aria-label={`Go to section ${index + 1}`}
                    />
                  ))}
                </div>

                {currentPage < contentPages.length - 1 ? (
                  <Button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    size="lg"
                    className="group"
                  >
                    Next Section
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartQuiz}
                    size="lg"
                    className="group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    disabled={loading || !moduleContent}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Quiz...
                      </>
                    ) : (
                      <>
                        {isModuleCompleted ? "Retake Quiz" : "Complete & Take Quiz"}
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Single page layout - show quiz button */}
            {contentPages.length <= 1 && (
              <div className="flex justify-end mb-8">
                <Button
                  onClick={handleStartQuiz}
                  size="lg"
                  className="group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  disabled={loading || !moduleContent}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    <>
                      {isModuleCompleted ? "Retake Quiz" : "Complete & Take Quiz"}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Reading Time Estimate */}
            {moduleContent && (
              <div className="text-center text-neutral-500 text-sm">
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Estimated reading time: {Math.ceil(moduleContent.split(' ').length / 200)} minutes
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quiz View */}
      {flowState === "quiz" && quiz && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Module Quiz
                    {quizFromCache && (
                      <Badge variant="secondary" className="ml-2">
                        Cached
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Answer all questions to complete this module
                  </CardDescription>
                </div>
                <Button
                  onClick={handleRegenerateQuiz}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "New Quiz"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {quiz.questions && Array.isArray(quiz.questions) ? quiz.questions.map((question, index) => (
                <div key={question.questionNo} className="space-y-3">
                  <Label className="text-base font-semibold">
                    {index + 1}. {question.question}
                  </Label>
                  <RadioGroup
                    value={quizAnswers[question.questionNo] || ""}
                    onValueChange={(value) =>
                      handleQuizAnswerChange(question.questionNo, value)
                    }
                  >
                    {question.options && Array.isArray(question.options) ? question.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${question.questionNo}-${optIndex}`} />
                        <Label
                          htmlFor={`${question.questionNo}-${optIndex}`}
                          className="font-normal cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    )) : <p>No options available for this question</p>}
                  </RadioGroup>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No quiz questions available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button onClick={() => setFlowState("module")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Content
            </Button>
            <Button onClick={handleSubmitQuiz} size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Quiz"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Quiz Result View */}
      {flowState === "quiz-result" && quizResult && (
        <div className="space-y-6">
          <Card
            className={
              quizResult.status === "passed"
                ? "border-green-200 bg-green-50"
                : "border-yellow-200 bg-yellow-50"
            }
          >
            <CardHeader className="text-center">
              <CheckCircle
                className={`h-16 w-16 mx-auto mb-4 ${
                  quizResult.status === "passed" ? "text-green-600" : "text-yellow-600"
                }`}
              />
              <CardTitle className="text-2xl">
                {quizResult.status === "passed" ? "Great Job!" : "Quiz Completed"}
              </CardTitle>
              <CardDescription>
                You scored {quizResult.score} out of {quizResult.total} ({quizResult.percentage.toFixed(2)}%)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={quizResult.percentage} className="h-3" />
              <p className="text-center text-slate-700">
                {quizResult.status === "passed"
                  ? "Excellent work! Review your answers below."
                  : "You've completed the quiz. Review your answers and explanations below."}
              </p>
            </CardContent>
          </Card>

          {/* Detailed Question Results */}
          {quizResult.question_results && quizResult.question_results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-800">Question Review</h3>
              {quizResult.question_results.map((questionResult, index) => (
                <Card key={questionResult.questionNo} className="border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {index + 1}. {questionResult.question}
                      </CardTitle>
                      <Badge 
                        variant={questionResult.isCorrect ? "default" : "destructive"}
                        className={questionResult.isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {questionResult.isCorrect ? "Correct" : "Incorrect"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {questionResult.options.map((option, optIndex) => {
                        const isSelected = option === questionResult.selectedOption;
                        
                        // Extract letter from option for comparison (e.g., "B) Text..." -> "B")
                        const optionLetter = option.trim()[0] && "ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(option.trim()[0]) && option.includes(")") 
                          ? option.trim().split(")")[0].trim() 
                          : option.trim();
                        
                        const isCorrect = optionLetter === questionResult.correctAnswer;
                        
                        // Determine styling: correct answers always green, incorrect selections red
                        let containerClass = "bg-slate-50 border-slate-200"; // default
                        if (isCorrect) {
                          // Correct answer is always green (regardless if selected or not)
                          containerClass = "bg-green-100 border-green-300 text-green-800";
                        } else if (isSelected && !isCorrect) {
                          // User selected wrong answer - show in red
                          containerClass = "bg-red-100 border-red-300 text-red-800";
                        }
                        
                        return (
                          <div 
                            key={optIndex} 
                            className={`p-2 rounded-md border ${containerClass}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{option}</span>
                              <div className="flex items-center space-x-2">
                                {isSelected && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    Your Answer
                                  </Badge>
                                )}
                                {isCorrect && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 text-xs border-green-200">
                                    Correct Answer
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {questionResult.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">Explanation:</span> {questionResult.explanation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button onClick={handleContinueAfterQuiz} size="lg">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      <LearningPreferencesModal
        open={preferencesModalOpen}
        onOpenChange={setPreferencesModalOpen}
        onSubmit={isFirstTimeContent ? handleFirstTimePreferences : handlePreferencesSubmit}
        courseName={module?.title || ""}
        isUpdate={!isFirstTimeContent}
      />

      {/* Floating AI Chat Button */}
      {flowState === "module" && !isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all duration-300 z-40 group hover:shadow-violet"
          aria-label="Open AI Assistant"
        >
          <MessageSquare className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {/* Copilot Chat Panel */}
      <CopilotChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        context={{
          moduleTitle: module?.title,
          courseTitle: "Current Course",
          learnerId: learnerId,
          courseId: courseid
        }}
      />
      </div>
    </div>
  );
}
