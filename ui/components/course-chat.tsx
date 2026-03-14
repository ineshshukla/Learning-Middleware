"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Bot,
  User,
  AlertCircle,
  X,
  Minimize2,
  Maximize2,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { chatWithCourse, logChatInteraction, updateChatFeedback } from "@/lib/learner-api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  logId?: number; // ID of the chat log entry in database
  feedback?: 'like' | 'dislike'; // User feedback
}

interface CourseChatProps {
  courseId: string;
  courseName?: string;
  moduleId?: string; // Optional module ID for module-specific chat context
}

export function CourseChat({ courseId, courseName, moduleId }: CourseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !courseId) return;

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

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Preserve current behavior: course-level chat context only.
      const data = await chatWithCourse(courseId, currentQuestion);
      const fullAnswer = data.answer || "No answer received";
      const responseTime = Date.now() - startTime; // Calculate response time

      // Simulate streaming by displaying character by character
      let currentIndex = 0;
      const streamInterval = setInterval(() => {
        if (currentIndex < fullAnswer.length) {
          const charsToAdd = Math.min(3, fullAnswer.length - currentIndex); // Add 3 chars at a time
          currentIndex += charsToAdd;
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullAnswer.substring(0, currentIndex) }
                : msg
            )
          );
        } else {
          // Streaming complete
          clearInterval(streamInterval);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullAnswer, isStreaming: false }
                : msg
            )
          );
          setLoading(false);

          // Log the chat interaction (non-blocking)
          try {
            logChatInteraction({
              courseid: courseId,
              moduleid: moduleId,
              user_question: currentQuestion,
              ai_response: fullAnswer,
              sources_count: data.sources?.length || 0,
              response_time_ms: responseTime,
            }).then((chatLog) => {
              // Store the log ID in the message for feedback tracking
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, logId: chatLog.id }
                    : msg
                )
              );
            }).catch((logError) => {
              // Silently fail logging - don't interrupt user experience
              console.error("Failed to log chat interaction:", logError);
            });
          } catch (logError) {
            console.error("Error in logging:", logError);
          }
        }
      }, 20); // 20ms delay between updates for smooth streaming effect

    } catch (err: any) {
      console.error("Error in chat:", err);
      setError(err.message || "Failed to get response");
      
      // Update the assistant message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { 
                ...msg, 
                content: "Sorry, I encountered an error while processing your question. Please try again.",
                isStreaming: false 
              }
            : msg
        )
      );
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

  const handleClose = () => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50 bg-gradient-to-r from-[#ffc09f] to-[#ff9f6b] hover:from-[#ff9f6b] hover:to-[#ffc09f] text-[#3d2c24]"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-80 shadow-2xl bg-[#3d2c24] border-2 border-[#ffc09f]">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-[#ffc09f]/30">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#ffc09f]" />
              <CardTitle className="text-sm text-white">Chat Assistant</CardTitle>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/10 text-white"
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/10 text-white"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-96 h-[600px] flex flex-col shadow-2xl bg-[#3d2c24] border-2 border-[#ffc09f]">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-[#ffc09f]/30 bg-gradient-to-r from-[#3d2c24] to-[#4a3a2e]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Bot className="h-5 w-5 text-[#ffc09f] flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm truncate text-white">Chat Assistant</CardTitle>
              {courseName && (
                <p className="text-xs text-[#ffc09f]/70 truncate">{courseName}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white/10 text-white"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-white/10 text-white"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#2a1f1a]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <MessageSquare className="h-12 w-12 text-[#ffc09f]/30 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">
                Start a Conversation
              </h3>
              <p className="text-xs text-[#ffc09f]/60">
                Ask any question about the course content
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gradient-to-br from-[#ffc09f] to-[#ff9f6b] flex items-center justify-center shadow-md">
                      <Bot className="h-4 w-4 text-[#3d2c24]" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[75%] rounded-lg p-3 text-sm shadow-md ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-[#ffc09f] to-[#ff9f6b] text-[#3d2c24]"
                        : "bg-[#fff5f0] text-[#3d2c24] border border-[#ffc09f]/30"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-[#ff9f6b] animate-pulse" />
                      )}
                    </p>
                    <div className={`flex items-center gap-2 mt-1 ${message.role === "user" ? "opacity-70" : "text-[#7a6358]"}`}>
                      <p className="text-xs">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      {message.role === "assistant" && !message.isStreaming && message.logId && (
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
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gradient-to-br from-[#ff9f6b] to-[#ffc09f] flex items-center justify-center shadow-md">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Input Area */}
        <div className="border-t border-[#ffc09f]/30 p-3 bg-gradient-to-r from-[#3d2c24] to-[#4a3a2e]">
          {error && (
            <Alert variant="destructive" className="mb-2 py-2 bg-red-500/10 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-xs text-red-400">{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 text-sm bg-[#fff5f0] border-[#ffc09f]/30 text-[#3d2c24] placeholder:text-[#7a6358]/60 focus:ring-[#ffc09f]"
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !inputMessage.trim()}
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
    </div>
  );
}
