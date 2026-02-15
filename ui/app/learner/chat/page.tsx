"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LearnerHeader } from "@/components/learner-header";
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  BookOpen, 
  Bot,
  User,
  AlertCircle,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMyCourses, chatWithCourse, logChatInteraction, updateChatFeedback, type Enrollment } from "@/lib/learner-api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: any[];
  logId?: number; // ID of the chat log entry in database
  feedback?: 'like' | 'dislike'; // User feedback
}

export default function ChatPage() {
  const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchEnrolledCourses = async () => {
    try {
      setLoadingCourses(true);
      const courses = await getMyCourses();
      setEnrolledCourses(courses);
      
      // Auto-select first course if available
      if (courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courses[0].courseid);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load courses");
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedCourseId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentQuestion = inputMessage;
    setInputMessage("");
    setLoading(true);
    setError("");

    const startTime = Date.now(); // Track response time

    try {
      const response = await chatWithCourse(selectedCourseId, currentQuestion);
      const responseTime = Date.now() - startTime; // Calculate response time

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Log the chat interaction (non-blocking)
      try {const chatLog = await logChatInteraction({
          courseid: selectedCourseId,
          user_question: currentQuestion,
          ai_response: response.answer,
          sources_count: response.sources?.length || 0,
          response_time_ms: responseTime,
        });
        
        // Store the log ID in the message for feedback tracking
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, logId: chatLog.id }
              : msg
          )
        );
      } catch (logError) {
        // Silently fail logging - don't interrupt user experience
        console.error("Failed to log chat interaction:", logError);
      }
    } catch (err: any) {
      setError(err.message || "Failed to get response");
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, feedbackType: 'like' | 'dislike') => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message || !message.logId) {
      console.error("Cannot submit feedback: log ID not found");
      return;
    }

    // Optimistically update UI
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, feedback: msg.feedback === feedbackType ? undefined : feedbackType }
          : msg
      )
    );

    try {
      const newFeedback = message.feedback === feedbackType ? undefined : feedbackType;
      if (newFeedback) {
        await updateChatFeedback(message.logId, newFeedback);
      }
    } catch (error) {
      console.error("Failed to update feedback:", error);
      // Revert optimistic update on error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, feedback: message.feedback }
            : msg
        )
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedCourse = enrolledCourses.find((e) => e.courseid === selectedCourseId);

  return (
    <>
      <LearnerHeader />
      <div 
        className="min-h-screen pt-20 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ backgroundImage: "url('/back.png')" }}
      >
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fff5f0] text-[#3d2c24] font-semibold text-sm mb-4 border border-[#f0e0d6]">
              <MessageSquare className="h-4 w-4 text-[#ffc09f]" />
              <span>AI Chat Assistant</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#3d2c24] mb-2">
              Chat with Course Content
            </h1>
            <p className="text-[#7a6358] text-lg max-w-2xl mx-auto">
              Ask questions about your enrolled courses and get instant AI-powered answers
            </p>
          </div>

          {/* Course Selection */}
          <Card className="mb-6 warm-card border-2 border-[#f0e0d6] shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#fff5f0] to-[#ffe9dd] border-b border-[#f0e0d6]">
              <CardTitle className="flex items-center gap-2 text-[#3d2c24]">
                <BookOpen className="h-5 w-5 text-[#ffc09f]" />
                Select Course
              </CardTitle>
              <CardDescription className="text-[#7a6358]">
                Choose a course to ask questions about
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 bg-white/50">
              {loadingCourses ? (
                <div className="flex items-center gap-2 text-[#7a6358]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#ffc09f]" />
                  Loading courses...
                </div>
              ) : enrolledCourses.length === 0 ? (
                <Alert className="bg-[#fff5f0] border-[#ffc09f]">
                  <AlertCircle className="h-4 w-4 text-[#ff9f6b]" />
                  <AlertDescription className="text-[#3d2c24]">
                    You haven't enrolled in any courses yet. Visit the Explore page to enroll in courses.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger className="w-full border-[#f0e0d6] focus:ring-[#ffc09f]">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {enrolledCourses.map((enrollment) => (
                      <SelectItem key={enrollment.courseid} value={enrollment.courseid}>
                        {enrollment.course?.course_name || enrollment.courseid}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {selectedCourse && (
                <div className="mt-4 p-4 bg-gradient-to-r from-[#fff5f0] to-[#ffe9dd] rounded-lg border-2 border-[#ffc09f]">
                  <p className="font-semibold text-[#3d2c24]">{selectedCourse.course?.course_name}</p>
                  {selectedCourse.course?.coursedescription && (
                    <p className="text-sm text-[#7a6358] mt-1">{selectedCourse.course.coursedescription}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Interface */}
          {selectedCourseId && (
            <Card className="flex flex-col h-[600px] warm-card border-2 border-[#f0e0d6] shadow-2xl">
              <CardHeader className="border-b border-[#f0e0d6] bg-gradient-to-r from-[#fff5f0] to-[#ffe9dd]">
                <CardTitle className="flex items-center gap-2 text-[#3d2c24]">
                  <Bot className="h-5 w-5 text-[#ffc09f]" />
                  Chat Assistant
                </CardTitle>
              </CardHeader>

              {/* Messages Area */}
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-white/50">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-16 w-16 text-[#ffc09f] mb-4" />
                    <h3 className="text-xl font-semibold text-[#3d2c24] mb-2">
                      Start a Conversation
                    </h3>
                    <p className="text-[#7a6358] max-w-md">
                      Ask any question about the course content. I'll search through the course materials to provide accurate answers.
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-[#ffc09f] to-[#ff9f6b] flex items-center justify-center shadow">
                            <Bot className="h-5 w-5 text-[#3d2c24]" />
                          </div>
                        )}
                        
                        <div
                          className={`max-w-[70%] rounded-lg p-4 shadow-md ${
                            message.role === "user"
                              ? "bg-gradient-to-r from-[#ffc09f] to-[#ff9f6b] text-[#3d2c24]"
                              : "bg-white border-2 border-[#f0e0d6] text-[#3d2c24]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[#f0e0d6]">
                              <p className="text-xs font-semibold mb-1 text-[#7a6358]">
                                Sources: {message.sources.length} document(s)
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                            {message.role === "assistant" && message.logId && (
                              <div className="flex items-center gap-1 ml-auto">
                                <button
                                  onClick={() => handleFeedback(message.id, 'like')}
                                  className={`p-0.5 rounded hover:bg-[#ffc09f]/20 transition-colors ${
                                    message.feedback === 'like' ? 'text-green-600' : 'text-[#7a6358]/60'
                                  }`}
                                  title="Helpful"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleFeedback(message.id, 'dislike')}
                                  className={`p-0.5 rounded hover:bg-[#ffc09f]/20 transition-colors ${
                                    message.feedback === 'dislike' ? 'text-red-600' : 'text-[#7a6358]/60'
                                  }`}
                                  title="Not helpful"
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {message.role === "user" && (
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-[#ff9f6b] to-[#ffc09f] flex items-center justify-center shadow">
                            <User className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                    {loading && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-[#ffc09f] to-[#ff9f6b] flex items-center justify-center shadow">
                          <Bot className="h-5 w-5 text-[#3d2c24]" />
                        </div>
                        <div className="bg-white border-2 border-[#f0e0d6] rounded-lg p-4 shadow-md">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-[#ffc09f]" />
                            <span className="text-[#7a6358]">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </CardContent>

              {/* Input Area */}
              <div className="border-t border-[#f0e0d6] p-4 bg-gradient-to-r from-[#fff5f0] to-[#ffe9dd]">
                {error && (
                  <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about the course..."
                    disabled={loading || !selectedCourseId}
                    className="flex-1 border-[#f0e0d6] focus:ring-[#ffc09f] bg-white"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={loading || !inputMessage.trim() || !selectedCourseId}
                    size="icon"
                    className="flex-shrink-0 bg-gradient-to-r from-[#ffc09f] to-[#ff9f6b] hover:from-[#ff9f6b] hover:to-[#ffc09f] text-[#3d2c24] shadow-lg"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
