"use client"

import { useState } from "react"
import { Plus, GripVertical, Edit, Save, BookOpen, FileQuestion, PenTool, Bot, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

const courseOutline = [
  {
    id: "module-1",
    title: "Introduction to Programming",
    type: "module",
    lessons: [
      { id: "lesson-1-1", title: "What is Programming?", type: "lesson" },
      { id: "lesson-1-2", title: "Setting up Development Environment", type: "lesson" },
      { id: "lesson-1-3", title: "Your First Program", type: "lesson" },
    ],
  },
  {
    id: "module-2",
    title: "Python Fundamentals",
    type: "module",
    lessons: [
      { id: "lesson-2-1", title: "Variables and Data Types", type: "lesson" },
      { id: "lesson-2-2", title: "Control Structures", type: "lesson" },
      { id: "lesson-2-3", title: "Functions and Modules", type: "lesson" },
    ],
  },
]

export default function CourseEditorPage() {
  const [selectedItem, setSelectedItem] = useState("lesson-1-1")
  const [activeTab, setActiveTab] = useState("editor")
  const [lessonContent, setLessonContent] = useState(
    "# What is Programming?\n\nProgramming is the process of creating instructions for computers to follow...",
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-900">Course Editor</h1>
        <p className="text-slate-600 mt-1">Build and refine your course content</p>
      </div>

      <div className="flex h-screen">
        {/* Left Column - Course Outline */}
        <div className="w-80 border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">Course Outline</h2>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <Accordion type="multiple" defaultValue={["module-1", "module-2"]}>
              {courseOutline.map((module) => (
                <AccordionItem key={module.id} value={module.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{module.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1 ml-6">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-100 ${
                            selectedItem === lesson.id ? "bg-primary/10 text-primary" : "text-slate-700"
                          }`}
                          onClick={() => setSelectedItem(lesson.id)}
                        >
                          <GripVertical className="h-3 w-3 text-slate-400" />
                          <span className="text-sm flex-1">{lesson.title}</span>
                          <Edit className="h-3 w-3 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <Button variant="outline" className="w-full mt-4 gap-2 bg-transparent">
              <Plus className="h-4 w-4" />
              Add Module/Lesson
            </Button>
          </div>
        </div>

        {/* Middle Column - Content Editor */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-slate-200 bg-white p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="editor">Text Editor</TabsTrigger>
                <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="editor" className="h-full">
                <Card className="h-full border-0 modern-shadow-lg glass-effect">
                  <CardHeader className="border-b border-slate-200/50 bg-slate-50/50">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Edit className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <span className="text-xl font-bold tracking-tight">Content Editor</span>
                          <p className="text-sm text-slate-600 font-medium mt-1">What is Programming? - Lesson 1.1</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          Auto-saved 2 min ago
                        </Badge>
                        <Button size="sm" className="gap-2 font-semibold">
                          <Save className="h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-full p-0 flex flex-col">
                    {/* Editor Toolbar */}
                    <div className="flex items-center gap-2 p-4 border-b border-slate-200/50 bg-white/50">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2 font-bold">
                          B
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2 italic">
                          I
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2 underline">
                          U
                        </Button>
                      </div>
                      <div className="w-px h-6 bg-slate-300"></div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-semibold">
                          H1
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-semibold">
                          H2
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-semibold">
                          Code
                        </Button>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Lines: 12 | Words: 156</span>
                      </div>
                    </div>

                    {/* Main Editor Area */}
                    <div className="flex-1 flex">
                      {/* Line Numbers */}
                      <div className="w-12 bg-slate-50/80 border-r border-slate-200/50 p-2 text-right">
                        <div className="text-xs text-slate-400 font-mono leading-6 select-none">
                          {Array.from({ length: 20 }, (_, i) => (
                            <div key={i + 1} className="h-6">
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Editor Content */}
                      <div className="flex-1 relative">
                        <Textarea
                          value={lessonContent}
                          onChange={(e) => setLessonContent(e.target.value)}
                          className="h-full w-full border-0 resize-none bg-white/80 backdrop-blur-sm text-slate-900 leading-6 p-4 focus:ring-0 focus:outline-none"
                          style={{
                            fontFamily:
                              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                            fontSize: "15px",
                            lineHeight: "1.6",
                          }}
                          placeholder="# What is Programming?

Programming is the process of creating instructions for computers to follow...

## Key Concepts

1. **Variables** - Store and manipulate data
2. **Functions** - Reusable blocks of code
3. **Control Flow** - Decision making in code

\`\`\`python
def hello_world():
    print('Hello, World!')
    
hello_world()
\`\`\`

Start writing your lesson content here. Use Markdown syntax for formatting."
                        />

                        {/* Floating Action Buttons */}
                        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm shadow-lg"
                          >
                            <Bot className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm shadow-lg"
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Status Bar */}
                    <div className="flex items-center justify-between p-2 border-t border-slate-200/50 bg-slate-50/50 text-xs">
                      <div className="flex items-center gap-4 text-slate-600 font-medium">
                        <span>Markdown</span>
                        <span>UTF-8</span>
                        <span>Ln 1, Col 1</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-slate-600 font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="graph" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Knowledge Graph</CardTitle>
                    <CardDescription>Visual representation of concepts and their relationships</CardDescription>
                  </CardHeader>
                  <CardContent className="h-full">
                    <div className="h-96 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                      <div className="text-center text-slate-500">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                          <BookOpen className="h-8 w-8" />
                        </div>
                        <p>Knowledge graph will be generated based on your content</p>
                        <p className="text-sm mt-1">Add content in the Text Editor to see the graph</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Column - Details & Actions */}
        <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">Lesson: What is Programming?</h2>
          </div>

          <div className="p-4 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Learning Objectives</label>
              <Textarea placeholder="List the learning outcomes for this lesson..." className="h-24" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Instructional Strategy</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worked-example">Worked Example</SelectItem>
                  <SelectItem value="drill">Drill</SelectItem>
                  <SelectItem value="feedback">Feedback-based</SelectItem>
                  <SelectItem value="discovery">Discovery Learning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-slate-900">Actions</h3>

              <Link href="/quiz">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileQuestion className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Design Quiz</h4>
                        <p className="text-sm text-slate-600">Create a set of questions for this lesson</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/assignment">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <PenTool className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Design Assignment</h4>
                        <p className="text-sm text-slate-600">Develop a project or problem set</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
