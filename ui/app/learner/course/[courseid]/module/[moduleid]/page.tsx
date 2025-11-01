"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, CheckCircle, Loader2, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LearningPreferencesModal } from "@/components/learner/learning-preferences-modal";
import { EnhancedMarkdown } from "@/components/learner/enhanced-markdown";
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
    
    // Cleanup poll interval on unmount
    return () => {
      if (pollIntervalId) {
        console.log("[CLEANUP] Clearing poll interval");
        clearInterval(pollIntervalId);
      }
    };
  }, [courseid, moduleid]);

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

      // Update module status to in_progress
      await updateModuleProgress(moduleid, "in_progress");

      // Check if content record exists in database
      const contentCheck = await checkModuleContent(moduleid);
      console.log("[DEBUG] Content check result:", contentCheck);
      console.log("[DEBUG] Content exists:", contentCheck.exists);
      console.log("[DEBUG] Content value:", contentCheck.content);
      
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

      // First, check if quiz already exists in database
      console.log("[QUIZ] Checking for cached quiz...");
      const quizCheck = await checkModuleQuiz(moduleid);
      
      if (quizCheck.exists && quizCheck.quiz_data) {
        console.log("[QUIZ] ✅ Found cached quiz, using it");
        setQuiz(quizCheck.quiz_data);
        setFlowState("quiz");
        return;
      }

      // Quiz doesn't exist, generate new one
      console.log("[QUIZ] No cached quiz found, generating new one...");
      const quizData = await generateQuiz(moduleContent, module?.title || "", courseid);
      
      // Save the generated quiz to database
      console.log("[QUIZ] Saving generated quiz to database...");
      await saveModuleQuiz(moduleid, courseid, quizData.quiz_data);
      console.log("[QUIZ] ✅ Quiz saved successfully");
      
      setQuiz(quizData.quiz_data);
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

      if (!quiz) return;

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
        quiz_id: `QUIZ_${moduleid}_${Date.now()}`,
        module_id: moduleid,
        responses,
      });

      setQuizResult({
        score: result.score,
        total: result.total_questions,
        percentage: result.percentage,
        status: result.status,
      });
      setFlowState("quiz-result");
    } catch (err: any) {
      console.error("Error submitting quiz:", err);
      setError(err.message || "Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAfterQuiz = () => {
    // Show preferences modal for feedback
    setPreferencesModalOpen(true);
    setFlowState("preferences");
  };

  const handlePreferencesSubmit = async (preferences: LearningPreferences) => {
    try {
      setLoading(true);
      setError(null);

      // Update preferences
      await updateLearningPreferences(learnerId, courseid, preferences);

      // Mark module as completed
      await updateModuleProgress(moduleid, "completed", 100);
      const nextModuleInfo = await completeModule(learnerId, courseid, moduleid);

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

      {/* Module Content View */}
      {flowState === "module" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Module Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moduleContent ? (
                <EnhancedMarkdown content={moduleContent} />
              ) : (
                <p className="text-slate-600">Loading content...</p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col items-end gap-2">
            <Button onClick={handleStartQuiz} size="lg" disabled={loading || !moduleContent}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  Continue to Quiz
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            {loading && (
              <p className="text-sm text-slate-600">
                Quiz generation may take a few minutes. Please wait...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quiz View */}
      {flowState === "quiz" && quiz && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Module Quiz
              </CardTitle>
              <CardDescription>
                Answer all questions to complete this module
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {quiz.questions.map((question, index) => (
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
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${question.questionNo}-${optIndex}`} />
                        <Label
                          htmlFor={`${question.questionNo}-${optIndex}`}
                          className="font-normal cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
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
                You scored {quizResult.score} out of {quizResult.total} ({quizResult.percentage}%)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={quizResult.percentage} className="h-3" />
              <p className="text-center text-slate-700">
                {quizResult.status === "passed"
                  ? "Excellent work! Now let's update your learning preferences for the next module."
                  : "You've completed the quiz. Let's update your preferences for better learning experience."}
              </p>
              <div className="flex justify-center">
                <Button onClick={handleContinueAfterQuiz} size="lg">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}
