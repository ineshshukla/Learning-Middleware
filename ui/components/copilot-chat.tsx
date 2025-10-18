"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, X, Minimize2, Maximize2, BookOpen, Lightbulb, Code, MessageSquare, Zap, Brain } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { chatWithCourse } from "@/lib/learner-api";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  sources?: any[];
}

interface CopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
  context?: {
    moduleTitle?: string;
    courseTitle?: string;
    learnerId?: string;
    courseId?: string;
  };
}

export function CopilotChat({ isOpen, onClose, context }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI learning assistant. I can help you understand concepts, provide examples, clarify doubts, or test your knowledge. What would you like to explore?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    const userQuestion = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      // Call the chat API using the correct format
      const data = await chatWithCourse(
        context?.courseId || 'demo_course',
        userQuestion
      );
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer || "I understand your question. Let me help you with that...",
        isUser: false,
        timestamp: new Date(),
        sources: data.sources || []
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: Brain, label: "Explain this concept", color: "violet", gradient: "from-violet-500 to-purple-500" },
    { icon: Lightbulb, label: "Provide an example", color: "amber", gradient: "from-amber-500 to-orange-500" },
    { icon: Code, label: "Show implementation", color: "blue", gradient: "from-blue-500 to-cyan-500" },
    { icon: Zap, label: "Test my understanding", color: "emerald", gradient: "from-emerald-500 to-teal-500" },
  ];

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        isMinimized ? 'w-80' : 'w-[500px]'
      } bg-white border-l border-neutral-200 shadow-2xl flex flex-col`}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white px-6 py-5 flex items-center justify-between border-b border-neutral-700">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Brain className="h-6 w-6" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-neutral-900"></div>
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">AI Assistant</h2>
            {context?.moduleTitle && (
              <p className="text-xs text-neutral-400 mt-0.5 font-medium">{context.moduleTitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-neutral-400 hover:text-white hover:bg-white/10 h-8 w-8"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-neutral-400 hover:text-white hover:bg-white/10 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-5 bg-gradient-to-b from-neutral-50 to-white">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} group`}
                >
                  {!message.isUser && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                      message.isUser
                        ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg'
                        : 'bg-white border border-neutral-200 text-neutral-800 shadow-sm'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-[11px] mt-2 ${message.isUser ? 'text-violet-200' : 'text-neutral-400'} font-medium`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.isUser && (
                    <div className="w-8 h-8 rounded-lg bg-neutral-200 flex items-center justify-center ml-3 flex-shrink-0 text-neutral-600 font-semibold text-sm">
                      {context?.learnerId?.substring(0, 2).toUpperCase() || 'ME'}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          {
          // messages.length === 1 && (
          //   <div className="px-5 py-4 bg-neutral-50 border-y border-neutral-200">
          //     <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Suggested Actions</p>
          //     <div className="grid grid-cols-1 gap-2">
          //       {quickActions.map((action, index) => (
          //         <button
          //           key={index}
          //           onClick={() => setInputValue(action.label)}
          //           className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${action.gradient} text-white hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group`}
          //         >
          //           <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
          //             <action.icon className="h-4 w-4" />
          //           </div>
          //           <span className="text-sm font-medium">{action.label}</span>
          //         </button>
          //       ))}
          //     </div>
          //   </div>
          // )
          }

          {/* Input Area */}
          <div className="p-5 bg-white border-t border-neutral-200">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Ask a question..."
                  className="h-11 text-[15px] pr-12 border-neutral-300 focus:border-violet-500 focus:ring-violet-500/20"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="h-11 w-11 p-0 bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-2 font-medium">
              Press Enter to send · Powered by AI
            </p>
          </div>
        </>
      )}

      {isMinimized && (
        <div className="flex-1 flex items-center justify-center p-5">
          <Button
            onClick={() => setIsMinimized(false)}
            variant="outline"
            className="w-full h-12 border-neutral-300 hover:bg-neutral-50"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Expand Chat
          </Button>
        </div>
      )}
    </div>
  );
}
