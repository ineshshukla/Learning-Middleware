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
      
      // Close modal immediately to prevent double-showing
      setPreferencesModalOpen(false);
      
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
        learningObjectives,
        moduleid  // Pass moduleId for module-specific vector store
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
        console.log("[QUIZ DEBUG] Quiz data structure:", JSON.stringify(quizCheck.quiz_data, null, 2));
        // Extract the actual quiz data from the wrapper
        const actualQuizData = quizCheck.quiz_data.quiz_data || quizCheck.quiz_data;
        setQuiz(actualQuizData);
        setFlowState("quiz");
        return;
      }

      // Quiz doesn't exist, generate new one
      console.log("[QUIZ] No cached quiz found, generating new one...");
      const quizData = await generateQuiz(moduleContent, module?.title || "", courseid);
      
      console.log("[QUIZ DEBUG] Generated quiz structure:", JSON.stringify(quizData.quiz_data, null, 2));
      
      // Save the generated quiz to database
      console.log("[QUIZ] Saving generated quiz to database...");
      await saveModuleQuiz(moduleid, courseid, quizData.quiz_data);
      console.log("[QUIZ] ✅ Quiz saved successfully");
      
      // Extract the actual quiz data from the wrapper
      const actualQuizData = quizData.quiz_data.quiz_data || quizData.quiz_data;
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

      // Check all questions answered
      const allAnswered = quiz.questions.every((q) => quizAnswers[q.id]);
      if (!allAnswered) {
        setError("Please answer all questions before submitting");
        setLoading(false);
        return;
      }

      // Calculate score locally using the quiz data we already have
      let correctCount = 0;
      const totalQuestions = quiz.questions.length;

      quiz.questions.forEach((question) => {
        const userAnswer = quizAnswers[question.id];
        const correctAnswer = question.correct_answer || question.correctAnswer;
        
        // Extract letter from user answer (e.g., "B) Option text" -> "B")
        const userLetter = userAnswer?.match(/^([A-D])\)/)?.[1] || userAnswer;
        
        console.log(`[QUIZ SCORE] Q${question.id}: user="${userLetter}" correct="${correctAnswer}"`);
        
        if (userLetter === correctAnswer) {
          correctCount++;
        }
      });

      const percentage = Math.round((correctCount / totalQuestions) * 100);
      const passed = percentage >= 60; // 60% passing threshold

      console.log(`[QUIZ SCORE] Final: ${correctCount}/${totalQuestions} = ${percentage}%`);

      // Set result directly without backend call
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
      console.log("[PREFERENCES] Updating learning preferences...");
      await updateLearningPreferences(learnerId, courseid, preferences);

      // Mark current module as completed
      console.log("[COMPLETE] Marking module as completed:", moduleid);
      await updateModuleProgress(moduleid, "completed", 100);
      
      setPreferencesModalOpen(false);

      // Get all modules to find the next one
      const modules = await getCourseModules(courseid);
      const currentIndex = modules.findIndex(m => m.moduleid === moduleid);
      const nextModule = modules[currentIndex + 1];

      if (nextModule) {
        console.log("[COMPLETE] Found next module:", nextModule.moduleid);
        
        // Unlock the next module
        console.log("[COMPLETE] Unlocking next module...");
        await updateModuleProgress(nextModule.moduleid, "in_progress");
        
        console.log("[COMPLETE] Navigating to next module:", nextModule.moduleid);
        router.push(`/learner/course/${courseid}/module/${nextModule.moduleid}`);
      } else {
        console.log("[COMPLETE] Course complete, returning to course page");
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
      <div className="min-h-screen bg-[#181818]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="h-16 w-16 animate-spin text-[#A78BFA] mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Loading Module
            </h2>
            <p className="text-white">
              Please wait while we load your module...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (flowState === "generating") {
    return (
      <div className="min-h-screen bg-[#181818]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="h-16 w-16 animate-spin text-[#A78BFA] mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Generating Personalized Content
            </h2>
            <p className="text-white mb-4">
              Creating a customized learning experience just for you...
            </p>
            <p className="text-sm text-white/60">
              This usually takes 1-2 minutes. The page will auto-refresh when ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (flowState === "completed") {
    return (
      <div className="min-h-screen bg-[#181818]">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Card className="border-green-500/50 bg-[#282828]">
            <CardHeader className="text-center">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <CardTitle className="text-3xl text-white">Course Completed!</CardTitle>
              <CardDescription className="text-white">
                Congratulations! You've completed all modules in this course.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.push("/learner/explore")} size="lg" className="bg-[#A78BFA] hover:bg-[#9333EA] text-white">
                Explore More Courses
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181818]">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push(`/learner/course/${courseid}`)}
            variant="ghost"
            className="mb-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Modules
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{module?.title}</h1>
              <p className="text-white mt-1">{module?.description}</p>
            </div>
            <Badge className="h-fit bg-[#A78BFA]/20 text-[#A78BFA] border-[#A78BFA]/30">
              {flowState === "module"
                ? "Learning"
                : flowState === "quiz"
                ? "Quiz"
                : "Review"}
            </Badge>
          </div>
        </div>

      {error && (
        <Alert variant="destructive" className="mb-6 bg-[#282828] border-red-500/50">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-white">Error</AlertTitle>
          <AlertDescription className="text-white">{error}</AlertDescription>
        </Alert>
      )}

      {/* Module Content View */}
      {flowState === "module" && (
        <div className="space-y-6">
          <Card className="bg-[#282828] border-[#3f3f3f]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BookOpen className="h-5 w-5 text-white" />
                Module Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moduleContent ? (
                <EnhancedMarkdown content={moduleContent} />
              ) : (
                <p className="text-white">Loading content...</p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col items-end gap-2">
            <Button onClick={handleStartQuiz} size="lg" disabled={loading || !moduleContent} className="bg-[#A78BFA] hover:bg-[#9333EA] text-white">
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
              <p className="text-sm text-white">
                Quiz generation may take a few minutes. Please wait...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quiz View */}
      {flowState === "quiz" && quiz && (
        <div className="space-y-6">
          <Card className="bg-[#282828] border-[#3f3f3f]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5 text-white" />
                Module Quiz
              </CardTitle>
              <CardDescription className="text-white">
                Answer all questions to complete this module
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                console.log("[RENDER DEBUG] Quiz object:", quiz);
                console.log("[RENDER DEBUG] Quiz.questions:", quiz?.questions);
                console.log("[RENDER DEBUG] Is Array?", Array.isArray(quiz?.questions));
                console.log("[RENDER DEBUG] Length:", quiz?.questions?.length);
                
                return quiz.questions && Array.isArray(quiz.questions) && quiz.questions.length > 0 ? (
                quiz.questions.map((question, index) => (
                  <div key={question.id} className="space-y-3 p-4 rounded-lg bg-[#3f3f3f] border border-white/10">
                    <Label className="text-base font-semibold text-white">
                      {index + 1}. {question.question}
                    </Label>
                    <RadioGroup
                      value={quizAnswers[question.id] || ""}
                      onValueChange={(value) =>
                        handleQuizAnswerChange(question.id.toString(), value)
                      }
                      className="space-y-2"
                    >
                      {question.options && Array.isArray(question.options) ? (
                        question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-3 p-3 rounded-md bg-[#282828] border border-white/10 hover:bg-[#333333] transition-colors">
                            <RadioGroupItem value={option} id={`${question.id}-${optIndex}`} className="border-white text-white" />
                            <Label
                              htmlFor={`${question.id}-${optIndex}`}
                              className="font-normal cursor-pointer text-white flex-1"
                            >
                              {option}
                            </Label>
                          </div>
                        ))
                      ) : (
                        <p className="text-red-400 text-sm">No options available for this question</p>
                      )}
                    </RadioGroup>
                  </div>
                ))
              ) : (
                <Alert variant="destructive" className="bg-[#282828] border-red-500/50">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertTitle className="text-white">Quiz Data Error</AlertTitle>
                  <AlertDescription className="text-white">
                    The quiz questions could not be loaded properly. Please try generating the quiz again.
                  </AlertDescription>
                </Alert>
              );
              })()}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button onClick={() => setFlowState("module")} variant="outline" className="border-white/20 text-black hover:bg-white/10 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Content
            </Button>
            <Button onClick={handleSubmitQuiz} size="lg" disabled={loading || !quiz.questions || quiz.questions.length === 0} className="bg-[#A78BFA] hover:bg-[#9333EA] text-white">
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
                ? "border-green-500/50 bg-[#282828]"
                : "border-yellow-500/50 bg-[#282828]"
            }
          >
            <CardHeader className="text-center">
              <CheckCircle
                className={`h-16 w-16 mx-auto mb-4 ${
                  quizResult.status === "passed" ? "text-green-400" : "text-yellow-400"
                }`}
              />
              <CardTitle className="text-2xl text-white">
                {quizResult.status === "passed" ? "Great Job!" : "Quiz Completed"}
              </CardTitle>
              <CardDescription className="text-white">
                You scored {quizResult.score} out of {quizResult.total} ({quizResult.percentage}%)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={quizResult.percentage} className="h-3 bg-[#3f3f3f]" />
              <p className="text-center text-white">
                {quizResult.status === "passed"
                  ? "Excellent work! Review your answers below."
                  : "You've completed the quiz. Review your answers below."}
              </p>
            </CardContent>
          </Card>

          {/* Quiz Review Section */}
          <Card className="bg-[#282828] border-[#3f3f3f]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5 text-white" />
                Quiz Review
              </CardTitle>
              <CardDescription className="text-white">
                Review your answers and see the correct solutions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {quiz?.questions && Array.isArray(quiz.questions) && quiz.questions.length > 0 ? (
                quiz.questions.map((question, index) => {
                  const userAnswer = quizAnswers[question.id];
                  // Handle both correctAnswer and correct_answer field names
                  const correctAnswer = question.correct_answer || question.correctAnswer;
                  
                  // Extract letter prefix from user answer (e.g., "B) 97% accuracy" -> "B")
                  const userAnswerPrefix = userAnswer?.match(/^([A-D])\)/)?.[1] || userAnswer;
                  const isCorrect = userAnswerPrefix === correctAnswer;
                  
                  console.log(`[QUIZ REVIEW] Question ${question.id}:`, {
                    userAnswer,
                    userAnswerPrefix,
                    correctAnswer,
                    isCorrect,
                    questionData: question
                  });
                  
                  return (
                    <div key={question.id} className="space-y-4 p-4 rounded-lg bg-[#3f3f3f] border border-white/10">
                      <div className="flex items-start justify-between gap-4">
                        <Label className="text-base font-semibold text-white flex-1">
                          {index + 1}. {question.question}
                        </Label>
                        <Badge 
                          className={isCorrect 
                            ? "bg-green-500/20 text-green-400 border-green-500/30" 
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {isCorrect ? "Correct" : "Incorrect"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {question.options && Array.isArray(question.options) && question.options.map((option, optIndex) => {
                          const isUserAnswer = userAnswer === option;
                          // Extract letter prefix from option (e.g., "B) 97% accuracy" -> "B")
                          const optionPrefix = option?.match(/^([A-D])\)/)?.[1] || "";
                          const isCorrectAnswer = correctAnswer === optionPrefix;
                          
                          return (
                            <div 
                              key={optIndex} 
                              className={`flex items-center space-x-3 p-3 rounded-md border transition-colors ${
                                isCorrectAnswer 
                                  ? "bg-green-500/10 border-green-500/50" 
                                  : isUserAnswer 
                                  ? "bg-red-500/10 border-red-500/50" 
                                  : "bg-[#282828] border-white/10"
                              }`}
                            >
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-white">{option}</span>
                                {isCorrectAnswer && (
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <span className="text-sm text-red-400">(Your answer)</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {question.explanation && (
                        <div className="mt-3 p-3 rounded-md bg-[#282828] border border-[#A78BFA]/30">
                          <p className="text-sm font-semibold text-[#A78BFA] mb-1">Explanation:</p>
                          <p className="text-sm text-white">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-white text-center">No quiz questions available for review.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button onClick={handleContinueAfterQuiz} size="lg" className="bg-[#A78BFA] hover:bg-[#9333EA] text-white">
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

      {/* Floating Course Chat with Module Context */}
      <CourseChat 
        courseId={courseid} 
        courseName={module?.title}
        moduleId={moduleid}
      />
      </div>
    </div>
  );
}
