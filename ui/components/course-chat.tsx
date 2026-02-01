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
  Maximize2
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
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
      const SME_API_BASE = process.env.NEXT_PUBLIC_SME_API_URL || "http://localhost:8000";
      
      // Prepare request body - temporarily disable module context to debug
      const requestBody: any = {
        courseid: courseId,
        userprompt: currentQuestion,
      };
      
      // TODO: Re-enable module-specific context once hybrid retrieval is debugged
      // if (moduleId) {
      //   requestBody.moduleid = moduleId;
      // }
      
      const response = await fetch(`${SME_API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const fullAnswer = data.answer || "No answer received";

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
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50 bg-[#A78BFA] hover:bg-[#9333EA]"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-80 shadow-lg bg-[#1e1e1e] border-[#333]">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-[#333]">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#A78BFA]" />
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
      <Card className="w-96 h-[600px] flex flex-col shadow-2xl bg-[#1e1e1e] border-[#333]">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-[#333]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Bot className="h-5 w-5 text-[#A78BFA] flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm truncate text-white">Chat Assistant</CardTitle>
              {courseName && (
                <p className="text-xs text-[#b4b4b4] truncate">{courseName}</p>
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
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0d0d0d]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <MessageSquare className="h-12 w-12 text-white/20 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">
                Start a Conversation
              </h3>
              <p className="text-xs text-[#b4b4b4]">
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
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#A78BFA]/20 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-[#A78BFA]" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[75%] rounded-lg p-3 text-sm ${
                      message.role === "user"
                        ? "bg-[#A78BFA] text-white"
                        : "bg-[#212121] text-white border border-[#333]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-[#A78BFA] animate-pulse" />
                      )}
                    </p>
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#A78BFA] flex items-center justify-center">
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
        <div className="border-t border-[#333] p-3 bg-[#1e1e1e]">
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
              className="flex-1 text-sm bg-[#212121] border-[#333] text-white placeholder:text-white/40"
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !inputMessage.trim()}
              size="icon"
              className="flex-shrink-0 bg-[#A78BFA] hover:bg-[#9333EA]"
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
