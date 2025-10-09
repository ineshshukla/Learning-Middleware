"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, BookOpen, Users, Award } from "lucide-react"

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
  const [isStarting, setIsStarting] = useState(false)

  if (!course) return null

  const handleStartCourse = async () => {
    setIsStarting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsStarting(false)
    onClose()
    // Navigate to course
    window.location.href = `/learner/course/${course.id}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{course.title}</DialogTitle>
          <DialogDescription className="text-lg text-slate-600 mt-2">
            {course.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Course Details */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">8 weeks</p>
                <p className="text-sm text-slate-500">Self-paced</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Modules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-slate-500">Interactive lessons</p>
              </CardContent>
            </Card>
          </div>

          {/* Course Features */}
          <div>
            <h3 className="font-semibold mb-3">What you'll learn:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm">Fundamental concepts and best practices</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm">Hands-on projects and real-world applications</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm">Industry-relevant skills and techniques</span>
              </div>
            </div>
          </div>

          {/* Prerequisites */}
          <div>
            <h3 className="font-semibold mb-3">Prerequisites:</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Basic computer skills</Badge>
              <Badge variant="secondary">No prior experience required</Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe Later
            </Button>
            <Button 
              onClick={handleStartCourse} 
              disabled={isStarting}
              className="flex-1"
            >
              {isStarting ? "Starting..." : "Start Course"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
