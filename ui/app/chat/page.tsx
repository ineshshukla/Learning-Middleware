"use client"

import { useState, useEffect, useRef } from "react" 
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown";
import { Send, Bot, User, Sparkles, BookOpen, Users, Target, Lightbulb, Loader2, ChevronDown, ChevronRight } from "lucide-react"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  sources?: any[]
}
// ... (expertiseAreas and quickStarters arrays remain the same) ...
const expertiseAreas = [
  { icon: BookOpen, label: "Curriculum Design", color: "bg-green-100 text-green-700" },
  { icon: Users, label: "Student Engagement", color: "bg-emerald-100 text-emerald-700" },
  { icon: Target, label: "Learning Objectives", color: "bg-teal-100 text-teal-700" },
  { icon: Lightbulb, label: "Pedagogical Strategies", color: "bg-lime-100 text-lime-700" },
]

const quickStarters = [
  "How do I create engaging online content?",
  "What's the best way to assess student learning?",
  "How can I improve student participation?",
  "What are effective teaching strategies for my subject?",
]


export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "🎓 Hello! I'm your Subject Matter Expert assistant with deep knowledge in educational design and pedagogy. I'm here to help you create exceptional learning experiences. Whether you need help with curriculum design, student engagement strategies, or assessment methods, I'm ready to provide expert guidance tailored to your needs. What educational challenge can I help you solve today?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null) // CHANGED: Added ref for auto-scrolling

  // CHANGED: Logic to determine if the conversation has started
  const hasStartedChat = messages.length > 1

  // CHANGED: useEffect for auto-scrolling to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const toggleSources = (messageId: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("http://10.4.25.215:8000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: inputValue }),
      })

      if (response.ok) {
        const data = await response.json()
        const smeResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: data.answer,
          isUser: false,
          timestamp: new Date(),
          sources: data.sources,
        }
        setMessages((prev) => [...prev, smeResponse])
      } else {
        const errorData = await response.json()
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: `Error: ${errorData.detail[0].msg || "An error occurred."}`,
          isUser: false,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorResponse])
      }
    } catch (error) {
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting to the server. Please try again later.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickStart = (question: string) => {
    setInputValue(question)
  }

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        {/* CHANGED: Container padding is now conditional */}
        <div
          className={`max-w-6xl mx-auto px-6 h-[calc(100vh-4rem)] flex flex-col transition-all duration-500 ${
            hasStartedChat ? "py-4" : "py-8"
          }`}
        >
          {/* CHANGED: Chat Header is now conditionally rendered */}
          {!hasStartedChat && (
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl text-white shadow-lg">
                  <Bot className="h-8 w-8" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gradient mb-1 tracking-tight">Subject Matter Expert Chat</h1>
              <p className="text-green-700 text-lg font-medium">Get expert guidance on educational design and pedagogy</p>
            </div>
          )}

          {/* Chat Messages Card */}
          <Card className="flex-1 border-0 bg-gradient-to-br from-white to-green-50/50 backdrop-blur-sm border border-green-100 p-6 mb-6 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-4 ${message.isUser ? "flex-row-reverse" : "flex-row"}`}>
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                      message.isUser
                        ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                        : "bg-gradient-to-br from-white to-green-50 text-green-600 border-2 border-green-200"
                    }`}
                  >
                    {message.isUser ? <User className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  </div>

                  <div className={`flex-1 max-w-2xl ${message.isUser ? "text-right" : "text-left"}`}>
                    <div
                      className={`inline-block p-4 rounded-2xl shadow-lg ${
                        message.isUser
                          ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                          : "bg-white border-2 border-green-100 text-green-800"
                      }`}
                    >
                      <div className="leading-relaxed font-medium break-words">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-green-200">
                          <button
                            onClick={() => toggleSources(message.id)}
                            className="flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
                          >
                            {expandedSources.has(message.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            Sources ({message.sources.length})
                          </button>
                          {expandedSources.has(message.id) && (
                            <div className="mt-2">
                              <pre className="bg-green-50 p-2 rounded-md text-xs whitespace-pre-wrap">
                                {JSON.stringify(message.sources, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-green-600 mt-2 font-medium">{message.timestamp.toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 flex-row">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-white to-green-50 text-green-600 border-2 border-green-200">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1 max-w-2xl text-left">
                    <div className="inline-block p-4 rounded-2xl shadow-lg bg-white border-2 border-green-100 text-green-800">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  </div>
                </div>
              )}
              {/* CHANGED: Empty div to act as a scroll target */}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Starters are already correctly conditional */}
            {/* {!hasStartedChat && (
              <div className="mb-6 bg-white/80 rounded-lg p-4 border border-green-200">
                <p className="text-sm font-semibold text-green-700 mb-3">💡 Quick conversation starters:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {quickStarters.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickStart(question)}
                      className="text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors text-sm font-medium text-green-800"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )} */}

            {/* Input Form */}
            <div className="flex gap-4 border-t border-green-200 pt-6 bg-white/60 rounded-lg p-4">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about course design, learning objectives, assessment strategies..."
                className="flex-1 h-12 text-base border-green-200 focus:border-green-400 bg-white/80"
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                className="h-12 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </>
  )
}