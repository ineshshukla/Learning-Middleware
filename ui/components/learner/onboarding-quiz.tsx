"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Star, ArrowRight, ArrowLeft, Clock, Code, Brain, HardDrive } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface OnboardingQuizProps {
  course: any
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

interface QuizQuestion {
  id: number
  type: string
  question: string
  code?: string
  options: string[]
  correctAnswer: number
}

// Quiz data structure
const quizData = {
  coding: {
    icon: Code,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    questions: [
      {
        id: 1,
        type: "multiple-choice",
        question: "What will be the output of this Python code?",
        code: `def calculate_discount(price, customer_type):
    if customer_type == "premium":
        return price * 0.8
    elif customer_type == "regular":
        return price * 0.9
    else:
        return price

result = calculate_discount(100, "premium")`,
        options: ["80", "90", "100", "20"],
        correctAnswer: 0
      },
      {
        id: 2,
        type: "multiple-choice",
        question: "What will this JavaScript code output?",
        code: `function createButtons() {
    for (var i = 0; i < 3; i++) {
        setTimeout(function() {
            console.log("Button " + i + " clicked");
        }, 100);
    }
}`,
        options: [
          'Prints "Button 0 clicked", "Button 1 clicked", "Button 2 clicked"',
          'Prints "Button 3 clicked" three times',
          'Throws a syntax error',
          'Prints nothing'
        ],
        correctAnswer: 1
      }
    ] as QuizQuestion[]
  },
  logic: {
    icon: Brain,
    color: "text-green-600",
    bgColor: "bg-green-100",
    questions: [
      {
        id: 1,
        type: "multiple-choice",
        question: "What comes next in this sequence: 3, 7, 15, 31, 63, ?",
        options: ["95", "127", "126", "125"],
        correctAnswer: 1
      },
      {
        id: 2,
        type: "multiple-choice",
        question: "Given the premises: All programmers drink coffee. Some coffee drinkers work late. Sarah is a programmer. Which conclusion is definitely true?",
        options: [
          "Sarah works late",
          "Sarah drinks coffee",
          "All coffee drinkers are programmers",
          "Sarah doesn't work late"
        ],
        correctAnswer: 1
      }
    ] as QuizQuestion[]
  },
  memory: {
    icon: HardDrive,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    passage: `Sarah Martinez, a 29-year-old software engineer from Austin, Texas, started her new job at TechCorp on Monday, March 15th, 2024. Her first assignment was to debug a critical payment system that had been failing since last Friday. She worked with her team lead, Michael Chen, and discovered the issue was in the database connection timeout settings. By Wednesday evening, they had successfully deployed the fix to production, reducing transaction failures by 85%. Sarah's starting salary was $95,000 annually.`,
    questions: [
      {
        id: 1,
        type: "multiple-choice",
        question: "What is Sarah's profession?",
        options: ["Database Administrator", "Software Engineer", "System Analyst", "Project Manager"],
        correctAnswer: 1
      },
      {
        id: 2,
        type: "multiple-choice",
        question: "By what percentage did they reduce transaction failures?",
        options: ["75%", "80%", "85%", "90%"],
        correctAnswer: 2
      }
    ] as QuizQuestion[]
  }
}

export function OnboardingQuiz({ course, isOpen, onClose, onComplete }: OnboardingQuizProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [showPassage, setShowPassage] = useState(true)
  const [passageTimer, setPassageTimer] = useState(60)
  const [currentSkillArea, setCurrentSkillArea] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  const steps = [
    "learner-purpose",
    "proficiency-goal", 
    "skill-assessment",
    "learning-style"
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleResponse = (key: string, value: any) => {
    setResponses({ ...responses, [key]: value })
  }

  const handleComfortRating = (skill: string, rating: number) => {
    setResponses({ 
      ...responses, 
      [`${skill}_comfort`]: rating 
    })
  }

  const StarRating = ({ skill, currentRating }: { skill: string, currentRating: number }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleComfortRating(skill, star)}
          className="hover:scale-110 transition-transform"
        >
          <Star 
            className={`h-6 w-6 ${star <= currentRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  )

  const renderLearnerPurpose = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Learning Purpose</h3>
        <p className="text-slate-600">What brings you to this course?</p>
      </div>
      <RadioGroup 
        value={responses.learnerPurpose} 
        onValueChange={(value) => handleResponse('learnerPurpose', value)}
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="scratch" id="scratch" />
            <Label htmlFor="scratch" className="cursor-pointer flex-1">
              <div>
                <div className="font-medium">Starting from scratch</div>
                <div className="text-sm text-slate-600">I'm completely new to this topic</div>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="revising" id="revising" />
            <Label htmlFor="revising" className="cursor-pointer flex-1">
              <div>
                <div className="font-medium">Revising</div>
                <div className="text-sm text-slate-600">I want to refresh or improve my existing knowledge</div>
              </div>
            </Label>
          </div>
        </div>
      </RadioGroup>
    </div>
  )

  const renderProficiencyGoal = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Proficiency Goal</h3>
        <p className="text-slate-600">What level do you want to achieve?</p>
      </div>
      <RadioGroup 
        value={responses.proficiencyGoal} 
        onValueChange={(value) => handleResponse('proficiencyGoal', value)}
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="basic" id="basic" />
            <Label htmlFor="basic" className="cursor-pointer flex-1">
              <div>
                <div className="font-medium">Basic</div>
                <div className="text-sm text-slate-600">Fundamental understanding and basic skills</div>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="intermediate" id="intermediate" />
            <Label htmlFor="intermediate" className="cursor-pointer flex-1">
              <div>
                <div className="font-medium">Intermediate</div>
                <div className="text-sm text-slate-600">Solid grasp with practical application skills</div>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="advanced" id="advanced" />
            <Label htmlFor="advanced" className="cursor-pointer flex-1">
              <div>
                <div className="font-medium">Advanced</div>
                <div className="text-sm text-slate-600">Expert-level knowledge and complex problem-solving</div>
              </div>
            </Label>
          </div>
        </div>
      </RadioGroup>
    </div>
  )

  const renderSkillAssessment = () => {
    if (!currentSkillArea) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">Basic Skill Analyzer</h3>
            <p className="text-slate-600">Let's assess your current skills in key areas</p>
          </div>
          <div className="grid gap-4">
            {Object.entries(quizData).map(([skill, data]) => {
              const IconComponent = data.icon
              return (
                <Card key={skill} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${data.bgColor}`}>
                        <IconComponent className={`h-6 w-6 ${data.color}`} />
                      </div>
                      <div>
                        <CardTitle className="capitalize">{skill}</CardTitle>
                        <CardDescription>Rate your comfort level and answer questions</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Comfort Rating (1-5 stars)</Label>
                      <StarRating 
                        skill={skill} 
                        currentRating={responses[`${skill}_comfort`] || 0} 
                      />
                    </div>
                    <Button 
                      onClick={() => setCurrentSkillArea(skill)}
                      className="w-full"
                      variant="outline"
                    >
                      Take {skill.charAt(0).toUpperCase() + skill.slice(1)} Assessment
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )
    }

    // Show memory passage first
    if (currentSkillArea === 'memory' && showPassage) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">Memory Assessment</h3>
            <p className="text-slate-600">Read the following passage carefully. You have 60 seconds.</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-mono">{passageTimer}s</span>
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-700 leading-relaxed">
                {quizData.memory.passage}
              </p>
            </CardContent>
          </Card>
          <Button 
            onClick={() => setShowPassage(false)}
            className="w-full"
          >
            I have read the passage
          </Button>
        </div>
      )
    }

    // Show skill questions
    const skillData = quizData[currentSkillArea as keyof typeof quizData]
    const questions = 'questions' in skillData ? skillData.questions : []
    const currentQuestion = questions[currentQuestionIndex]

    if (!currentQuestion) {
      setCurrentSkillArea(null)
      setCurrentQuestionIndex(0)
      return renderSkillAssessment()
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setCurrentSkillArea(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Skills
          </Button>
          <div className="text-sm text-slate-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 capitalize">
              {React.createElement(skillData.icon, { className: `h-5 w-5 ${skillData.color}` })}
              {currentSkillArea} Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">{currentQuestion.question}</h4>
              
              {currentQuestion.code && (
                <pre className="bg-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{currentQuestion.code}</code>
                </pre>
              )}
              
              <RadioGroup 
                value={responses[`${currentSkillArea}_q${currentQuestion.id}`]} 
                onValueChange={(value) => handleResponse(`${currentSkillArea}_q${currentQuestion.id}`, value)}
              >
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex(currentQuestionIndex - 1)
                  } else {
                    setCurrentSkillArea(null)
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button 
                onClick={() => {
                  if (currentQuestionIndex < questions.length - 1) {
                    setCurrentQuestionIndex(currentQuestionIndex + 1)
                  } else {
                    setCurrentSkillArea(null)
                    setCurrentQuestionIndex(0)
                  }
                }}
                disabled={!responses[`${currentSkillArea}_q${currentQuestion.id}`]}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderLearningStyle = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Learning Style</h3>
        <p className="text-slate-600">How do you prefer to learn?</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Session Preference</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={responses.sessionPreference} 
            onValueChange={(value) => handleResponse('sessionPreference', value)}
          >
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50">
                <RadioGroupItem value="short" id="short" />
                <Label htmlFor="short" className="cursor-pointer flex-1">
                  <div>
                    <div className="font-medium">Short chunks</div>
                    <div className="text-sm text-slate-600">15-20 minute focused sessions</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50">
                <RadioGroupItem value="long" id="long" />
                <Label htmlFor="long" className="cursor-pointer flex-1">
                  <div>
                    <div className="font-medium">Long sessions</div>
                    <div className="text-sm text-slate-600">45-60 minute deep-dive sessions</div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  )

  const renderCurrentStep = () => {
    switch (steps[currentStep]) {
      case "learner-purpose":
        return renderLearnerPurpose()
      case "proficiency-goal":
        return renderProficiencyGoal()
      case "skill-assessment":
        return renderSkillAssessment()
      case "learning-style":
        return renderLearningStyle()
      default:
        return null
    }
  }

  const canProceed = () => {
    const step = steps[currentStep]
    switch (step) {
      case "learner-purpose":
        return responses.learnerPurpose
      case "proficiency-goal":
        return responses.proficiencyGoal
      case "skill-assessment":
        // Check if all skills have comfort ratings
        return Object.keys(quizData).every(skill => responses[`${skill}_comfort`])
      case "learning-style":
        return responses.sessionPreference
      default:
        return false
    }
  }

  if (!course) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Course Onboarding - {course.title}
          </DialogTitle>
          <div className="space-y-2">
            <Progress value={(currentStep + 1) / steps.length * 100} className="w-full" />
            <p className="text-sm text-slate-600">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </DialogHeader>

        <div className="min-h-[500px]">
          {renderCurrentStep()}
        </div>

        {/* Navigation - hide during skill assessment questions */}
        {!(currentStep === 2 && currentSkillArea) && (
          <div className="flex justify-between pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {currentStep === steps.length - 1 ? "Complete Onboarding" : "Next"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
