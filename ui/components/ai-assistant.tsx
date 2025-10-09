"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Send, Sparkles, Lightbulb, BookOpen, FileQuestion, Upload, ChevronUp } from "lucide-react"

const suggestions = [
  {
    text: "Create a Python course",
    icon: BookOpen,
    category: "Course Creation",
  },
  {
    text: "Generate quiz questions",
    icon: FileQuestion,
    category: "Assessment",
  },
  {
    text: "Upload course materials",
    icon: Upload,
    category: "Content",
  },
  {
    text: "Design learning objectives",
    icon: Lightbulb,
    category: "Planning",
  },
]

const quickTips = [
  "💡 Type 'create course' to start building new content",
  "📚 Upload PDFs and documents to generate structured lessons",
  "❓ Ask me to generate quizzes and assignments",
  "🎯 I can help design learning objectives and outcomes",
]

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content:
        "👋 Welcome to Instructor LMW! I'm your AI teaching assistant. I can help you create courses, generate assessments, and design engaging learning experiences. What would you like to build today?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [currentTip, setCurrentTip] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)

  // Rotate tips every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % quickTips.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue("")
    setShowSuggestions(false)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "Great idea! I'll help you create that. Let me guide you through the process step by step. Would you like me to start with the course outline or help you upload existing materials first?",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    setShowSuggestions(value.length > 0)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    setShowSuggestions(false)
  }

//   return (
// //     <div
// //       className="fixed bottom-6 right-6 z-50 w-96 transition-all duration-300 ease-in-out"
// //       onMouseEnter={() => setIsExpanded(true)}
// //       onMouseLeave={() => setIsExpanded(false)}
// //     >
// //       <Card
// //         className={`shadow-2xl border-0 bg-gradient-to-br from-green-50 to-emerald-50 backdrop-blur-sm border border-green-100 transition-all duration-300 ease-in-out ${
// //           isExpanded ? "h-auto" : "h-20"
// //         } overflow-hidden`}
// //       >
// //         {/* Compact Header - Always Visible */}
// //         <CardHeader
// //           className={`pb-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg transition-all duration-300 ${
// //             isExpanded ? "rounded-t-lg" : "rounded-lg"
// //           }`}
// //         >
// //           <div className="flex items-center gap-3">
// //             <div className="p-2 bg-white/20 rounded-lg">
// //               <Sparkles className="h-5 w-5" />
// //             </div>
// //             <div className="flex-1">
// //               <CardTitle className="text-lg font-bold">AI Teaching Assistant</CardTitle>
// //               {isExpanded && <p className="text-green-100 text-sm font-medium">Always here to help you create</p>}
// //             </div>
// //             <div className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : "rotate-0"}`}>
// //               <ChevronUp className="h-4 w-4 text-green-100" />
// //             </div>
// //           </div>
// //         </CardHeader>

// //         {/* Compact Input - Always Visible */}
// //         {!isExpanded && (
// //           <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-r from-green-50 to-emerald-50">
// //             <div className="flex gap-2">
// //               <Input
// //                 value={inputValue}
// //                 onChange={(e) => handleInputChange(e.target.value)}
// //                 placeholder="Ask me anything about course creation..."
// //                 className="flex-1 border-green-200 focus:border-green-400 bg-white/80 h-8 text-sm"
// //                 onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
// //               />
// //               <Button
// //                 onClick={handleSendMessage}
// //                 size="sm"
// //                 className="px-2 h-8 bg-green-500 hover:bg-green-600 text-white"
// //               >
// //                 <Send className="h-3 w-3" />
// //               </Button>
// //             </div>
// //           </div>
// //         )}

// //         {/* Expanded Content - Only Visible on Hover */}
// //         {isExpanded && (
// //           <CardContent className="space-y-4 p-4">
// //             {/* Rotating Tips */}
// //             <div className="bg-white/80 rounded-lg p-3 border border-green-200">
// //               <div className="flex items-center gap-2 mb-2">
// //                 <Lightbulb className="h-4 w-4 text-green-600" />
// //                 <span className="text-sm font-semibold text-green-800">Quick Tip</span>
// //               </div>
// //               <p className="text-sm text-green-700 font-medium transition-all duration-500">{quickTips[currentTip]}</p>
// //             </div>

// //             {/* Messages */}
// //             <div className="h-48 overflow-y-auto space-y-3 bg-white/60 rounded-lg p-3">
// //               {messages.map((message) => (
// //                 <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
// //                   <div
// //                     className={`max-w-[85%] rounded-lg px-3 py-2 text-sm font-medium ${
// //                       message.isUser ? "bg-green-500 text-white" : "bg-white text-green-800 border border-green-200"
// //                     }`}
// //                   >
// //                     {message.content}
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>

// //             {/* Suggestions */}
// //             {showSuggestions && (
// //               <div className="space-y-2 bg-white/80 rounded-lg p-3 border border-green-200">
// //                 <p className="text-xs font-semibold text-green-700 mb-2">💡 Suggestions:</p>
// //                 {suggestions
// //                   .filter((s) => s.text.toLowerCase().includes(inputValue.toLowerCase()))
// //                   .slice(0, 3)
// //                   .map((suggestion, index) => (
// //                     <div
// //                       key={index}
// //                       onClick={() => handleSuggestionClick(suggestion.text)}
// //                       className="flex items-center gap-2 p-2 hover:bg-green-100 rounded-md cursor-pointer transition-colors"
// //                     >
// //                       <suggestion.icon className="h-4 w-4 text-green-600" />
// //                       <span className="text-sm font-medium text-green-800">{suggestion.text}</span>
// //                       <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-700">
// //                         {suggestion.category}
// //                       </Badge>
// //                     </div>
// //                   ))}
// //               </div>
// //             )}

// //             {/* Expanded Input */}
// //             <div className="flex gap-2">
// //               <Input
// //                 value={inputValue}
// //                 onChange={(e) => handleInputChange(e.target.value)}
// //                 placeholder="Ask me anything about course creation..."
// //                 className="flex-1 border-green-200 focus:border-green-400 bg-white/80"
// //                 onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
// //               />
// //               <Button onClick={handleSendMessage} size="sm" className="px-3 bg-green-500 hover:bg-green-600 text-white">
// //                 <Send className="h-4 w-4" />
// //               </Button>
// //             </div>
// //           </CardContent>
// //         )}
// //       </Card>
// //     </div>
//   )
}
