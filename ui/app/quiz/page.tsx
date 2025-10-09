"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, Calendar, Clock, Percent, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"

const sampleQuestions = [
  {
    id: 1,
    question: "What is the primary purpose of a variable in programming?",
    type: "multiple-choice",
    options: [
      "To store and manipulate data",
      "To create visual elements",
      "To connect to the internet",
      "To print text to the console",
    ],
    correctAnswer: 0,
  },
  {
    id: 2,
    question: "Explain the difference between a compiler and an interpreter.",
    type: "short-answer",
    sampleAnswer:
      "A compiler translates the entire program before execution, while an interpreter executes code line by line.",
  },
]

export default function QuizDesignerPage() {
  const [questions, setQuestions] = useState(sampleQuestions)
  const [quizSettings, setQuizSettings] = useState({
    title: "Introduction to Python - Quiz 1",
    type: "multiple-choice",
    dueDate: "",
    timeLimit: 30,
    gradingWeight: 10,
    randomizeOrder: false,
    allowLateSubmissions: true,
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Design Quiz for 'Introduction to Python'</h1>
            <p className="text-slate-600 mt-1">Create and configure quiz questions and settings</p>
          </div>
          <div className="flex gap-2">
            <Link href="/editor">
              <Button variant="outline" className="gap-2 bg-transparent">
                <ArrowLeft className="h-4 w-4" />
                Back to Editor
              </Button>
            </Link>
            <Button className="gap-2">Save and Close</Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Settings Sidebar */}
        <div className="w-80 border-r border-slate-200 bg-white p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Settings & Parameters</h2>

          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={quizSettings.title}
                onChange={(e) => setQuizSettings((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Type of Assignment/Quiz</Label>
              <RadioGroup
                value={quizSettings.type}
                onValueChange={(value) => setQuizSettings((prev) => ({ ...prev, type: value }))}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple-choice" id="mc" />
                  <Label htmlFor="mc">Multiple Choice</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="problem-set" id="ps" />
                  <Label htmlFor="ps">Problem Set</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="essay" id="essay" />
                  <Label htmlFor="essay">Essay</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="due-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </Label>
              <Input
                id="due-date"
                type="date"
                value={quizSettings.dueDate}
                onChange={(e) => setQuizSettings((prev) => ({ ...prev, dueDate: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="time-limit" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Limit (minutes)
              </Label>
              <Input
                id="time-limit"
                type="number"
                value={quizSettings.timeLimit}
                onChange={(e) => setQuizSettings((prev) => ({ ...prev, timeLimit: Number.parseInt(e.target.value) }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="grading-weight" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Grading Weight (%)
              </Label>
              <Input
                id="grading-weight"
                type="number"
                value={quizSettings.gradingWeight}
                onChange={(e) =>
                  setQuizSettings((prev) => ({ ...prev, gradingWeight: Number.parseInt(e.target.value) }))
                }
                className="mt-1"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="randomize">Randomize Question Order</Label>
                <Switch
                  id="randomize"
                  checked={quizSettings.randomizeOrder}
                  onCheckedChange={(checked) => setQuizSettings((prev) => ({ ...prev, randomizeOrder: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="late-submissions">Allow Late Submissions</Label>
                <Switch
                  id="late-submissions"
                  checked={quizSettings.allowLateSubmissions}
                  onCheckedChange={(checked) => setQuizSettings((prev) => ({ ...prev, allowLateSubmissions: checked }))}
                />
              </div>
            </div>

            <Button className="w-full gap-2" size="lg">
              Generate Quiz
            </Button>
          </div>
        </div>

        {/* Questions Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Questions</h2>
            {questions.length === 0 ? (
              <p className="text-slate-500">Click 'Generate Quiz' or add a question manually.</p>
            ) : (
              <p className="text-slate-600">{questions.length} questions created</p>
            )}
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card key={question.id} className="border-slate-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">Question {index + 1}</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-slate-900 mb-4">{question.question}</p>

                  {question.type === "multiple-choice" && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`p-3 rounded border ${
                            optionIndex === question.correctAnswer ? "border-primary bg-primary/5" : "border-slate-200"
                          }`}
                        >
                          <span className="font-medium mr-2">{String.fromCharCode(65 + optionIndex)}.</span>
                          {option}
                          {optionIndex === question.correctAnswer && (
                            <span className="ml-2 text-primary text-sm font-medium">(Correct)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === "short-answer" && (
                    <div className="border border-slate-200 rounded p-3 bg-slate-50">
                      <Label className="text-sm font-medium text-slate-700">Sample Answer:</Label>
                      <p className="text-sm text-slate-600 mt-1">{question.sampleAnswer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="w-full gap-2 h-12 border-dashed bg-transparent">
              <Plus className="h-4 w-4" />
              Add Question Manually
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
