"use client"

import { useState } from "react"
import { ArrowLeft, GitBranch, Clock, FileText, Plus, Minus, Eye, Download, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

const courseHistory = [
  {
    id: "commit-1",
    message: "Added quiz section to Module 2: Python Fundamentals",
    description: "Created 5 multiple choice questions covering variables and data types",
    author: "John Doe",
    timestamp: "2 hours ago",
    date: "July 8, 2025",
    changes: {
      added: 15,
      modified: 3,
      deleted: 0,
    },
    files: [
      { name: "Module 2: Variables and Data Types", type: "modified", changes: "+12 -2" },
      { name: "Quiz: Python Basics", type: "added", changes: "+25" },
      { name: "Learning Objectives", type: "modified", changes: "+3 -1" },
    ],
  },
  {
    id: "commit-2",
    message: "Updated course introduction and learning objectives",
    description: "Refined course overview and added specific learning outcomes for each module",
    author: "John Doe",
    timestamp: "1 day ago",
    date: "July 7, 2025",
    changes: {
      added: 8,
      modified: 12,
      deleted: 3,
    },
    files: [
      { name: "Course Introduction", type: "modified", changes: "+5 -2" },
      { name: "Module 1: What is Programming?", type: "modified", changes: "+3 -1" },
      { name: "Learning Objectives", type: "modified", changes: "+8 -3" },
    ],
  },
  {
    id: "commit-3",
    message: "Added practical coding exercises to Module 1",
    description: "Included hands-on Python exercises with step-by-step solutions",
    author: "John Doe",
    timestamp: "3 days ago",
    date: "July 5, 2025",
    changes: {
      added: 45,
      modified: 8,
      deleted: 2,
    },
    files: [
      { name: "Module 1: Your First Program", type: "modified", changes: "+35 -1" },
      { name: "Code Examples", type: "added", changes: "+28" },
      { name: "Exercise Solutions", type: "added", changes: "+15" },
      { name: "Module Overview", type: "modified", changes: "+2 -1" },
    ],
  },
  {
    id: "commit-4",
    message: "Initial course structure and content",
    description: "Created basic course outline with 2 modules and initial lesson content",
    author: "John Doe",
    timestamp: "1 week ago",
    date: "July 1, 2025",
    changes: {
      added: 120,
      modified: 0,
      deleted: 0,
    },
    files: [
      { name: "Course Outline", type: "added", changes: "+45" },
      { name: "Module 1: Introduction to Programming", type: "added", changes: "+38" },
      { name: "Module 2: Python Fundamentals", type: "added", changes: "+37" },
    ],
  },
]

export default function CourseHistoryPage() {
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"timeline" | "diff">("timeline")

  const selectedCommitData = courseHistory.find((commit) => commit.id === selectedCommit)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 pt-14">
      {/* Header */}
      <div className="glass-effect border-b border-slate-200/30">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/courses">
                <Button variant="outline" size="sm" className="gap-2 bg-white/80">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Courses
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gradient tracking-tight">Course History</h1>
                <p className="text-slate-600 font-medium mt-1">Introduction to Python Programming</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-2 font-semibold">
                <GitBranch className="h-3 w-3" />
                main branch
              </Badge>
              <Button variant="outline" className="gap-2 bg-white/80 font-semibold">
                <Download className="h-4 w-4" />
                Export History
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "timeline" | "diff")}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white/80">
              <TabsTrigger value="timeline">Timeline View</TabsTrigger>
              <TabsTrigger value="diff">Diff View</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
              <span>{courseHistory.length} commits</span>
              <span>•</span>
              <span>Last updated 2 hours ago</span>
            </div>
          </div>

          <TabsContent value="timeline" className="space-y-4">
            {courseHistory.map((commit, index) => (
              <Card
                key={commit.id}
                className="border-0 modern-shadow-lg glass-effect hover:shadow-xl transition-all duration-200 group"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Timeline Line */}
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-primary rounded-full border-2 border-white shadow-md"></div>
                        {index < courseHistory.length - 1 && <div className="w-px h-16 bg-slate-200 mt-2"></div>}
                      </div>

                      {/* Commit Info */}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold tracking-tight text-slate-900 mb-2">
                          {commit.message}
                        </CardTitle>
                        <CardDescription className="text-slate-600 font-medium mb-3">
                          {commit.description}
                        </CardDescription>

                        {/* Author and Time */}
                        <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-xs bg-slate-200">JD</AvatarFallback>
                            </Avatar>
                            <span>{commit.author}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{commit.timestamp}</span>
                          </div>
                          <span>{commit.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 bg-white/80 font-semibold"
                        onClick={() => setSelectedCommit(commit.id)}
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 bg-white/80 font-semibold">
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Changes Summary */}
                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <div className="flex items-center gap-1 text-green-600">
                        <Plus className="h-3 w-3" />
                        <span>{commit.changes.added}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-600">
                        <Minus className="h-3 w-3" />
                        <span>{commit.changes.deleted}</span>
                      </div>
                      <span className="text-slate-500">
                        {commit.changes.modified} file{commit.changes.modified !== 1 ? "s" : ""} changed
                      </span>
                    </div>
                  </div>

                  {/* Files Changed */}
                  <div className="space-y-2">
                    {commit.files.map((file, fileIndex) => (
                      <div
                        key={fileIndex}
                        className="flex items-center gap-3 p-2 bg-slate-50/80 rounded-lg border border-slate-200/60"
                      >
                        <div className="p-1 bg-white rounded-md">
                          <FileText className="h-3 w-3 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-900 flex-1">{file.name}</span>
                        <Badge
                          variant={
                            file.type === "added" ? "default" : file.type === "modified" ? "secondary" : "outline"
                          }
                          className="text-xs font-semibold"
                        >
                          {file.type}
                        </Badge>
                        <span className="text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded">
                          {file.changes}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="diff" className="space-y-6">
            {selectedCommitData ? (
              <Card className="border-0 modern-shadow-lg glass-effect">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <GitBranch className="h-5 w-5 text-primary" />
                    Commit Details: {selectedCommitData.message}
                  </CardTitle>
                  <CardDescription>{selectedCommitData.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCommitData.files.map((file, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">{file.name}</span>
                          <span className="text-xs font-mono text-slate-500">{file.changes}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-white">
                        <div className="space-y-1 font-mono text-sm">
                          {file.type === "added" && (
                            <>
                              <div className="text-green-700 bg-green-50 px-2 py-1 rounded">
                                + # What is Programming?
                              </div>
                              <div className="text-green-700 bg-green-50 px-2 py-1 rounded">
                                + Programming is the process of creating instructions...
                              </div>
                              <div className="text-green-700 bg-green-50 px-2 py-1 rounded">
                                + ## Learning Objectives
                              </div>
                            </>
                          )}
                          {file.type === "modified" && (
                            <>
                              <div className="text-red-700 bg-red-50 px-2 py-1 rounded">- ## Introduction</div>
                              <div className="text-green-700 bg-green-50 px-2 py-1 rounded">
                                + ## Course Introduction
                              </div>
                              <div className="text-slate-600 px-2 py-1">
                                Welcome to our comprehensive programming course...
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 modern-shadow-lg glass-effect">
                <CardContent className="py-12 text-center">
                  <GitBranch className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a commit to view changes</h3>
                  <p className="text-slate-600">Click "View" on any commit in the timeline to see detailed changes</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
