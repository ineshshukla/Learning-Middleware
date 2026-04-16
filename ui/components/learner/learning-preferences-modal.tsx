"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Lightbulb, MessageSquare } from "lucide-react"

export interface LearningPreferences {
  DetailLevel: "detailed" | "moderate" | "brief"
  ExplanationStyle: "examples-heavy" | "conceptual" | "practical" | "visual"
  Language: "simple" | "technical" | "balanced"
}

interface LearningPreferencesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (preferences: LearningPreferences) => Promise<void>
  courseName: string
  isUpdate?: boolean  // Optional: true if updating preferences, false/undefined for initial setup
  initialPreferences?: LearningPreferences | null
}

export function LearningPreferencesModal({
  open,
  onOpenChange,
  onSubmit,
  courseName,
  isUpdate = false,
  initialPreferences,
}: LearningPreferencesModalProps) {
  const [preferences, setPreferences] = useState<LearningPreferences>(
    initialPreferences || {
      DetailLevel: "moderate",
      ExplanationStyle: "conceptual",
      Language: "balanced",
    }
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialPreferences && open) {
      setPreferences(initialPreferences)
    }
  }, [initialPreferences, open])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(preferences)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save preferences:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#fff4ec] border-gray-300">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gray-800">
            {isUpdate ? "Update Your Learning Preferences" : "Personalize Your Learning Experience"}
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            {isUpdate ? (
              <>
                Great job completing the module! Let's update your preferences to make the next module even better.
              </>
            ) : (
              <>
                Help us tailor the course content for <strong className="text-orange-600">{courseName}</strong> to match your learning style.
                These preferences will help us create a better learning experience for you.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Question 1: Content Detail Level */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg text-gray-800">How much detail do you prefer?</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Choose the level of depth that works best for you when learning new concepts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={preferences.DetailLevel}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, DetailLevel: value as LearningPreferences["DetailLevel"] })
                }
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer">
                  <RadioGroupItem value="detailed" id="detailed" className="mt-1 border-gray-400 text-orange-500" />
                  <Label htmlFor="detailed" className="cursor-pointer flex-1">
                    <div className="font-semibold text-gray-800">Comprehensive & In-Depth</div>
                    <div className="text-sm text-gray-600 mt-1">
                      I prefer thorough explanations with extensive coverage of topics and all the details.
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer">
                  <RadioGroupItem value="moderate" id="moderate" className="mt-1 border-gray-400 text-orange-500" />
                  <Label htmlFor="moderate" className="cursor-pointer flex-1">
                    <div className="font-semibold text-gray-800">Balanced & Clear</div>
                    <div className="text-sm text-gray-600 mt-1">
                      I like a good balance - not too detailed, but clear enough to understand well.
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer">
                  <RadioGroupItem value="brief" id="brief" className="mt-1 border-gray-400 text-orange-500" />
                  <Label htmlFor="brief" className="cursor-pointer flex-1">
                    <div className="font-semibold text-gray-800">Concise & Focused</div>
                    <div className="text-sm text-gray-600 mt-1">
                      I prefer brief, to-the-point explanations that get straight to what I need to know.
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Question 2: Explanation Style */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg text-gray-800">How do you learn best?</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Select the teaching approach that helps you understand concepts most effectively.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={preferences.ExplanationStyle}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, ExplanationStyle: value as LearningPreferences["ExplanationStyle"] })
                }
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer">
                  <RadioGroupItem value="examples-heavy" id="examples-heavy" className="mt-1 border-gray-400 text-orange-500" />
                  <Label htmlFor="examples-heavy" className="cursor-pointer flex-1">
                    <div className="font-semibold text-gray-800">Learn by Examples</div>
                    <div className="text-sm text-gray-600 mt-1">
                      I understand better with many concrete examples, use cases, and real-world scenarios.
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer">
                  <RadioGroupItem value="conceptual" id="conceptual" className="mt-1 border-gray-400 text-orange-500" />
                  <Label htmlFor="conceptual" className="cursor-pointer flex-1">
                    <div className="font-semibold text-gray-800">Theory & Concepts First</div>
                    <div className="text-sm text-gray-600 mt-1">
                      I prefer to understand the underlying theories and principles before seeing applications.
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer">
                  <RadioGroupItem value="practical" id="practical" className="mt-1 border-gray-400 text-orange-500" />
                  <Label htmlFor="practical" className="cursor-pointer flex-1">
                    <div className="font-semibold text-gray-800">Hands-On & Practical</div>
                    <div className="text-sm text-gray-600 mt-1">
                      I learn best by doing - give me practical exercises along with the theory.
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer">
                  <RadioGroupItem value="visual" id="visual" className="mt-1 border-gray-400 text-orange-500" />
                  <Label htmlFor="visual" className="cursor-pointer flex-1">
                    <div className="font-semibold text-gray-800">Visual Learning</div>
                    <div className="text-sm text-gray-600 mt-1">
                      I prefer diagrams, charts, and visual representations to understand concepts.
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Question 3: Language Complexity */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg text-gray-800">What language style suits you?</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Choose how you'd like the content to be written and explained to you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={preferences.Language}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, Language: value as LearningPreferences["Language"] })
                }
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer">
                  <RadioGroupItem value="simple" id="simple" className="mt-1 border-gray-400 text-orange-500" />
                  <Label htmlFor="simple" className="cursor-pointer flex-1">
                    <div className="font-semibold text-gray-800">Simple & Accessible</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Use everyday language and avoid jargon. Explain technical terms when necessary.
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer">
                  <RadioGroupItem value="balanced" id="balanced" className="mt-1 border-gray-400 text-orange-500" />
                  <Label htmlFor="balanced" className="cursor-pointer flex-1">
                    <div className="font-semibold text-gray-800">Balanced Approach</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Mix of technical terms with clear explanations - accessible but professional.
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer">
                  <RadioGroupItem value="technical" id="technical" className="mt-1 border-gray-400 text-orange-500" />
                  <Label htmlFor="technical" className="cursor-pointer flex-1">
                    <div className="font-semibold text-gray-800">Technical & Precise</div>
                    <div className="text-sm text-gray-600 mt-1">
                      I'm comfortable with industry terminology and prefer precise technical language.
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving..."
              : isUpdate
              ? "Update & Continue"
              : "Save & Start Learning"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
