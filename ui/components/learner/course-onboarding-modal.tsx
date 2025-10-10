"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Award, ArrowRight } from "lucide-react"
import { OnboardingQuiz } from "./onboarding-quiz"

interface Course {
  id: number
  title: string
  description: string
  progress: number
  status: "in-progress" | "not-started"
}

interface CourseOnboardingModalProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
}

export function CourseOnboardingModal({ course, isOpen, onClose }: CourseOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)

  if (!course) return null

  const mockCourseDetails = {
    duration: "8 weeks",
    students: "2,341",
    level: "Beginner",
    modules: [
      "Introduction and Setup",
      "Basic Concepts",
      "Practical Applications",
      "Advanced Topics",
      "Final Project"
    ]
  }

  const handleStartCourse = () => {
    // For new courses, show onboarding quiz first
    if (course.status === "not-started") {
      setShowQuiz(true)
    } else {
      // Navigate to the course directly for in-progress courses
      window.location.href = `/learner/course/${course.id}`
      onClose()
    }
  }

  const handleQuizComplete = () => {
    setShowQuiz(false)
    // Navigate to the course after quiz completion
    window.location.href = `/learner/course/${course.id}`
    onClose()
  }

  return (
    <>
      <Dialog open={isOpen && !showQuiz} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{course.title}</DialogTitle>
            <DialogDescription className="text-base">
              {course.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Course Stats */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-slate-600">{mockCourseDetails.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm text-slate-600">{mockCourseDetails.students} students</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-500" />
                <Badge variant="secondary">{mockCourseDetails.level}</Badge>
              </div>
            </div>

            {/* Course Modules */}
            <div>
              <h3 className="font-semibold mb-3">Course Modules</h3>
              <div className="space-y-2">
                {mockCourseDetails.modules.map((module, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm">{module}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Special notice for new courses */}
            {course.status === "not-started" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Personalized Learning Experience</h4>
                <p className="text-sm text-blue-700">
                  Before starting this course, we'll guide you through a quick onboarding process to personalize your learning experience based on your goals, current skills, and preferences.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Maybe Later
              </Button>
              <Button onClick={handleStartCourse} className="flex-1 gap-2">
                {course.status === "in-progress" ? "Continue Learning" : "Start Course"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Quiz */}
      <OnboardingQuiz
        course={course}
        isOpen={showQuiz}
        onClose={() => setShowQuiz(false)}
        onComplete={handleQuizComplete}
      />
    </>
  )
}
