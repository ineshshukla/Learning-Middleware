"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Send, MessageCircle, Clock, ArrowLeft, BookOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DiagnosticAssessmentModal } from "@/components/diagnostic-assessment-modal"

const moduleContent = {
  1: {
    1: {
      title: "Introduction to React",
      progress: 100,
      units: [
        {
          id: 1,
          title: "What is React?",
          content: `
            <h2>What is React?</h2>
            <p>React is a JavaScript library for building user interfaces. It lets you compose complex UIs from small and isolated pieces of code called "components".</p>
          `,
          completed: true,
        },
        {
          id: 2,
          title: "Setting up React",
          content: `
            <h2>Setting up React</h2>
            <p>Learn how to set up a React development environment and create your first React application.</p>
          `,
          completed: true,
        },
      ],
    },
    2: {
      title: "Component Fundamentals",
      progress: 65,
      units: [
        {
          id: 1,
          title: "What are Props?",
          content: `
            <h2>What are Props?</h2>
            <p>Props (short for properties) are read-only data that are passed from a parent component to a child component. They allow you to customize and configure child components.</p>
            
            <div class="code-block">
              <pre><code>function Welcome(props) {
  return &lt;h1&gt;Hello, {props.name}!&lt;/h1&gt;;
}

function App() {
  return (
    &lt;div&gt;
      &lt;Welcome name="Sara" /&gt;
      &lt;Welcome name="Cahal" /&gt;
      &lt;Welcome name="Edite" /&gt;
    &lt;/div&gt;
  );
}</code></pre>
            </div>
          `,
          completed: false,
        },
        {
          id: 2,
          title: "Component Composition",
          content: `
            <h2>Component Composition</h2>
            <p>Learn how to build complex UIs by composing simple components together.</p>
          `,
          completed: false,
        },
        {
          id: 3,
          title: "Props vs State",
          content: `
            <h2>Props vs State</h2>
            <p>Understanding the difference between props and state is crucial for React development.</p>
          `,
          completed: false,
        },
      ],
    },
    3: {
      title: "State Management",
      progress: 0,
      units: [
        {
          id: 1,
          title: "Introduction to State",
          content: `
            <h2>Introduction to State</h2>
            <p>State allows React components to change their output over time in response to user actions, network responses, and anything else.</p>
          `,
          completed: false,
        },
        {
          id: 2,
          title: "useState Hook",
          content: `
            <h2>useState Hook</h2>
            <p>The useState Hook lets you add React state to function components.</p>
          `,
          completed: false,
        },
      ],
    },
    4: {
      title: "Advanced Concepts",
      progress: 0,
      units: [
        {
          id: 1,
          title: "What are components",
          content: `
            <h2>What are Components</h2>
            <p>Components are the building blocks of React applications. They let you split the UI into independent, reusable pieces.</p>
          `,
          completed: false,
        },
        {
          id: 2,
          title: "What are Functions",
          content: `
            <h2>What are Functions</h2>
            <p>Functions in React are a way to define components using JavaScript functions instead of classes.</p>
          `,
          completed: false,
        },
        {
          id: 3,
          title: "Knowledge Check",
          content: `
            <h2>Knowledge Check</h2>
            <p>Test your understanding of React components and functions with this interactive quiz.</p>
          `,
          completed: false,
        },
      ],
    },
    22: {
      title: "Final Project",
      progress: 0,
      units: [
        {
          id: 1,
          title: "Project Overview",
          content: `
            <h2>Final Project Overview</h2>
            <p>In this final module, you'll build a complete React application that demonstrates all the concepts you've learned.</p>
          `,
          completed: false,
        },
        {
          id: 2,
          title: "Project Implementation",
          content: `
            <h2>Project Implementation</h2>
            <p>Start building your React application step by step, applying best practices and patterns.</p>
          `,
          completed: false,
        },
      ],
    },
  },
}

const courseStructure = {
  1: {
    title: "Advanced React Development",
    modules: [
      { id: 1, title: "Module 1", completed: true },
      { id: 2, title: "Module 2", completed: false, current: true, expanded: true },
      { id: 3, title: "Module 3", completed: false },
      {
        id: 4,
        title: "Module 4",
        completed: false,
        expanded: false,
        subItems: ["What are components", "What are Functions", "Knowledge Check"],
      },
      { id: 22, title: "Module 22", completed: false },
    ],
    additionalSections: [
      "My Learning Journey in Advanced React Development",
      "My Notes on Advanced React Dev",
      "Resources",
      "Claude | ChatGPT",
    ],
  },
}

export default function LearningEnvironmentPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = Number.parseInt(params.id as string)
  const moduleId = Number.parseInt(params.moduleId as string)

  const [currentUnitIndex, setCurrentUnitIndex] = useState(0)
  const [flaggedForRevision, setFlaggedForRevision] = useState<number[]>([])
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [sessionTime, setSessionTime] = useState("13:21")
  const [activeLesson, setActiveLesson] = useState<string>("")

  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      type: "ai" as const,
      content:
        "Hi! I'm here to help you understand React props better. Feel free to ask me any questions about the content you're studying!",
      timestamp: new Date(),
    },
  ])

  const suggestionChips = ["Props vs State", "Example", "When to use?"]

  const module = moduleContent[courseId as keyof typeof moduleContent]?.[moduleId as keyof (typeof moduleContent)[1]]
  const course = courseStructure[courseId as keyof typeof courseStructure]

  const extractLessonsFromContent = (content: string) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, "text/html")
    const headings = doc.querySelectorAll("h2, h3")
    return Array.from(headings).map((heading, index) => ({
      id: `lesson-${index}`,
      title: heading.textContent || "",
      element: heading.tagName.toLowerCase(),
    }))
  }

  const currentLessons = module ? extractLessonsFromContent(module.units[currentUnitIndex].content) : []

  const scrollToLesson = (lessonId: string, lessonTitle: string) => {
    setActiveLesson(lessonTitle)
    const element = document.querySelector(`[data-lesson-id="${lessonId}"]`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      const lessonElements = document.querySelectorAll("[data-lesson-id]")
      let currentLesson = ""

      lessonElements.forEach((element) => {
        const rect = element.getBoundingClientRect()
        if (rect.top <= 200 && rect.bottom >= 200) {
          const lessonId = element.getAttribute("data-lesson-id")
          const lesson = currentLessons.find((l) => l.id === lessonId)
          if (lesson) {
            currentLesson = lesson.title
          }
        }
      })

      if (currentLesson && currentLesson !== activeLesson) {
        setActiveLesson(currentLesson)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [currentLessons, activeLesson])

  const renderContentWithLessonAnchors = (content: string) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, "text/html")
    const headings = doc.querySelectorAll("h2, h3")

    headings.forEach((heading, index) => {
      heading.setAttribute("data-lesson-id", `lesson-${index}`)
      heading.classList.add("scroll-mt-32")
    })

    return doc.body.innerHTML
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Course not found</h1>
          <p className="text-slate-600 mb-6">The course you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/learner")} className="bg-emerald-600 hover:bg-emerald-700">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Module not available</h1>
          <p className="text-slate-600 mb-6">This module is not yet available or doesn't exist.</p>
          <Button onClick={() => router.push(`/learner/course/${courseId}`)} className="bg-emerald-600 hover:bg-emerald-700">
            Back to Course
          </Button>
        </div>
      </div>
    )
  }

  const currentUnit = module.units[currentUnitIndex]

  const handleBackToModules = () => {
    router.push(`/learner/course/${courseId}`)
  }

  const handleNextUnit = () => {
    if (currentUnitIndex < module.units.length - 1) {
      setCurrentUnitIndex(currentUnitIndex + 1)
    } else {
      setShowDiagnosticModal(true)
    }
  }

  const handlePreviousUnit = () => {
    if (currentUnitIndex > 0) {
      setCurrentUnitIndex(currentUnitIndex - 1)
    }
  }

  const handleFlagForRevision = () => {
    if (!flaggedForRevision.includes(currentUnit.id)) {
      setFlaggedForRevision([...flaggedForRevision, currentUnit.id])
    }
  }

  const handleRedoModule = () => {
    setShowDiagnosticModal(false)
    setCurrentUnitIndex(0)
  }

  const handleFinishAssessment = () => {
    setShowDiagnosticModal(false)
    router.push(`/learner/course/${courseId}`)
  }

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return

    const userMessage = {
      id: chatMessages.length + 1,
      type: "user" as const,
      content: chatMessage,
      timestamp: new Date(),
    }

    setChatMessages([...chatMessages, userMessage])
    setChatMessage("")

    setTimeout(() => {
      const aiResponse = {
        id: chatMessages.length + 2,
        type: "ai" as const,
        content: `Great question about ${currentUnit.title.toLowerCase()}! Let me explain this concept in more detail...`,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setChatMessage(suggestion)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">L</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">LMW.ai</span>
              </div>

              <Button
                variant="ghost"
                onClick={handleBackToModules}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Course
              </Button>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Session: {sessionTime}</span>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                  3 notifications
                </div>
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-slate-700">AL</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">{course.title}</span>
              <span className="text-slate-400">›</span>
              <span className="text-emerald-600 font-medium">
                Module {moduleId}: {module.title}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <div className="w-80 bg-white border-r border-slate-200 h-screen sticky top-0 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-900">Lessons</h3>
            </div>

            <div className="space-y-2">
              {currentLessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => scrollToLesson(lesson.id, lesson.title)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    activeLesson === lesson.title
                      ? "bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="font-medium text-sm">{lesson.title}</div>
                </button>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="font-medium text-slate-900 mb-4 text-sm">Unit Navigation</h4>
              <div className="space-y-2">
                {module.units.map((unit, index) => (
                  <button
                    key={unit.id}
                    onClick={() => setCurrentUnitIndex(index)}
                    className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                      currentUnitIndex === index
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {unit.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-12">
                <div className="mb-12">
                  <h1 className="text-5xl font-bold text-slate-900 mb-8 leading-tight">{currentUnit.title}</h1>

                  <div className="prose prose-xl prose-slate max-w-none">
                    <div
                      className="text-slate-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderContentWithLessonAnchors(currentUnit.content) }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-slate-100">
                  <Button
                    variant="outline"
                    onClick={handlePreviousUnit}
                    disabled={currentUnitIndex === 0}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 bg-transparent"
                  >
                    Previous Unit
                  </Button>

                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={handleFlagForRevision}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50 bg-transparent"
                    >
                      Flag for Revision
                    </Button>

                    <Button onClick={handleNextUnit} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
                      {currentUnitIndex === module.units.length - 1 ? "Complete Module" : "Next Unit"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <Input
              placeholder="Ask about this lesson..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 h-12 text-base"
            />
            <Button onClick={handleSendMessage} className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6">
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-3">
            {suggestionChips.map((chip) => (
              <Button
                key={chip}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(chip)}
                className="text-slate-600 border-slate-300 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
              >
                {chip}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-32"></div>

      <DiagnosticAssessmentModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
        moduleTitle={module.title}
        onRedoModule={handleRedoModule}
        onFinish={handleFinishAssessment}
      />
    </div>
  )
}
