"use client"

import type React from "react"
import { useState } from "react"
import { Header } from "@/components/header"
import { AIAssistant } from "@/components/ai-assistant"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Upload, FileText, Search, Save, Network } from "lucide-react"

const libraryFiles = [
  { name: "intro_to_physics.pdf", date: "2024-01-15", size: "2.4 MB" },
  { name: "chemistry_basics.docx", date: "2024-01-12", size: "1.8 MB" },
  { name: "math_fundamentals.pdf", date: "2024-01-10", size: "3.2 MB" },
  { name: "biology_overview.txt", date: "2024-01-08", size: "0.9 MB" },
  { name: "data_science_primer.pdf", date: "2024-01-05", size: "4.1 MB" },
]

export default function UploadPage() {
  const [courseTitle, setCourseTitle] = useState("")
  const [courseDescription, setCourseDescription] = useState("")
  const [strategy, setStrategy] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [isGenerated, setIsGenerated] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "graph">("list")

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedFiles(files.map((file) => file.name))
  }

  const generateCourse = () => {
    setIsGenerated(true)
  }

  const courseStructure = [
    {
      topic: "Introduction to Programming",
      lessons: ["What is Programming?", "Setting up Development Environment", "Your First Program"],
    },
    {
      topic: "Python Fundamentals",
      lessons: ["Variables and Data Types", "Control Structures", "Functions and Modules"],
    },
    {
      topic: "Data Structures",
      lessons: ["Lists and Tuples", "Dictionaries and Sets", "Working with Files"],
    },
  ]

  return (
    <>
      <Header />
      <AIAssistant />
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
            {/* Left Column: Library */}
            <Card className="border-0 glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  My Library
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search documents..." className="pl-10" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {libraryFiles.map((file, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-slate-900">{file.name}</div>
                    <div className="text-sm text-slate-500 flex justify-between">
                      <span>{file.date}</span>
                      <span>{file.size}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Middle Column: Workspace */}
            <Card className="border-0 glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Workspace
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-slate-700 mb-2">
                    Drag & drop PDFs, text files, or paste links here
                  </p>
                  <Button variant="outline" className="mt-2 bg-transparent">
                    Browse Files
                  </Button>
                  <input type="file" multiple onChange={handleFileUpload} className="hidden" accept=".pdf,.txt,.docx" />
                </div>

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Files</Label>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="p-2 bg-slate-100 rounded-lg text-sm">
                        {file}
                      </div>
                    ))}
                  </div>
                )}

                {/* Course Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Course Title</Label>
                    <Input
                      id="title"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      placeholder="Enter course title..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Short Course Description</Label>
                    <Textarea
                      id="description"
                      value={courseDescription}
                      onChange={(e) => setCourseDescription(e.target.value)}
                      placeholder="Describe your course..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Select Instructional Strategy</Label>
                    <Select value={strategy} onValueChange={setStrategy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose strategy..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drill">Drill-based</SelectItem>
                        <SelectItem value="feedback">Feedback-based</SelectItem>
                        <SelectItem value="worked">Worked Example-oriented</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={generateCourse}
                  className="w-full bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={!courseTitle || !strategy}
                >
                  Generate Course Structure
                </Button>
              </CardContent>
            </Card>

            {/* Right Column: Generated Content */}
            <Card className="border-0 glass-effect">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Content</CardTitle>
                  {isGenerated && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="view-toggle" className="text-sm">
                        Graph View
                      </Label>
                      <Switch
                        id="view-toggle"
                        checked={viewMode === "graph"}
                        onCheckedChange={(checked) => setViewMode(checked ? "graph" : "list")}
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!isGenerated ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500">Your generated course content will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {viewMode === "list" ? (
                      <div className="space-y-4">
                        {courseStructure.map((topic, index) => (
                          <div key={index} className="space-y-2">
                            <h3 className="font-semibold text-slate-900">{topic.topic}</h3>
                            <ul className="ml-4 space-y-1">
                              {topic.lessons.map((lesson, lessonIndex) => (
                                <li key={lessonIndex} className="text-slate-600 text-sm">
                                  • {lesson}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Network className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                          <p className="text-slate-500">Knowledge Graph Visualization</p>
                          <p className="text-xs text-slate-400 mt-1">Interactive graph showing topic relationships</p>
                        </div>
                      </div>
                    )}

                    <Button className="w-full gap-2 bg-gradient-to-r from-accent to-emerald-500 text-white">
                      <Save className="h-4 w-4" />
                      Save Course
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}
