"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, BarChart3 } from "lucide-react"

interface DiagnosticAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  moduleTitle: string
  onRedoModule: () => void
  onFinish: () => void
}

export function DiagnosticAssessmentModal({ 
  isOpen, 
  onClose, 
  moduleTitle, 
  onRedoModule, 
  onFinish 
}: DiagnosticAssessmentModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)

  // Mock assessment questions
  const questions = [
    {
      id: 1,
      question: "What are props in React?",
      options: [
        "Properties passed from parent to child components",
        "Internal state of a component",
        "Methods used to update component state",
        "Event handlers in React"
      ],
      correct: 0
    },
    {
      id: 2,
      question: "How do you pass data to a child component?",
      options: [
        "Using state",
        "Using props",
        "Using context",
        "Using refs"
      ],
      correct: 1
    },
    {
      id: 3,
      question: "What is the difference between props and state?",
      options: [
        "Props are mutable, state is immutable",
        "Props are passed from parent, state is internal to component",
        "Props are for styling, state is for data",
        "There is no difference"
      ],
      correct: 1
    }
  ]

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...answers]
    newAnswers[currentQuestion] = answerIndex
    setAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setShowResults(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const calculateScore = () => {
    let correct = 0
    answers.forEach((answer, index) => {
      if (answer === questions[index].correct) {
        correct++
      }
    })
    return (correct / questions.length) * 100
  }

  const getScoreStatus = (score: number) => {
    if (score >= 80) return { status: "excellent", color: "text-green-600", icon: CheckCircle }
    if (score >= 60) return { status: "good", color: "text-yellow-600", icon: AlertTriangle }
    return { status: "needs-improvement", color: "text-red-600", icon: XCircle }
  }

  const score = calculateScore()
  const scoreStatus = getScoreStatus(score)

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {showResults ? "Assessment Results" : "Module Assessment"}
          </DialogTitle>
          <DialogDescription className="text-lg">
            {showResults 
              ? `Your performance on ${moduleTitle}`
              : `Test your understanding of ${moduleTitle}`
            }
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6 mt-6">
            {/* Progress bar */}
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              />
            </div>
            
            {/* Question counter */}
            <div className="text-sm text-slate-600 text-center">
              Question {currentQuestion + 1} of {questions.length}
            </div>

            {/* Current question */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  {questions[currentQuestion].question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {questions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full text-left p-4 border rounded-lg transition-all ${
                      answers[currentQuestion] === index
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        answers[currentQuestion] === index
                          ? "border-primary bg-primary"
                          : "border-slate-300"
                      }`}>
                        {answers[currentQuestion] === index && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                        )}
                      </div>
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Navigation buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={answers[currentQuestion] === undefined}
              >
                {currentQuestion === questions.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Score display */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="mb-4">
                    <scoreStatus.icon className={`h-16 w-16 mx-auto ${scoreStatus.color}`} />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    {Math.round(score)}%
                  </h3>
                  <p className={`text-lg font-medium ${scoreStatus.color} capitalize`}>
                    {scoreStatus.status.replace("-", " ")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Performance breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {questions.map((question, index) => (
                  <div key={question.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm text-slate-700">Question {index + 1}</span>
                    <div className="flex items-center gap-2">
                      {answers[index] === question.correct ? (
                        <Badge className="bg-green-100 text-green-800">Correct</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Incorrect</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {score >= 80 ? (
                  <p className="text-slate-700">
                    Excellent work! You have a strong understanding of {moduleTitle}. 
                    You're ready to move on to the next module.
                  </p>
                ) : score >= 60 ? (
                  <p className="text-slate-700">
                    Good job! You understand most concepts, but you might want to review 
                    some areas before moving forward.
                  </p>
                ) : (
                  <p className="text-slate-700">
                    It looks like you could benefit from reviewing {moduleTitle} again. 
                    Don't worry - learning takes time and practice!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              {score < 60 && (
                <Button variant="outline" onClick={onRedoModule} className="flex-1">
                  Review Module
                </Button>
              )}
              <Button onClick={onFinish} className="flex-1">
                {score >= 60 ? "Continue to Next Module" : "Continue Anyway"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
