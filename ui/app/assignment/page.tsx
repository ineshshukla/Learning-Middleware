"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, Calendar, Clock, Percent, ArrowLeft, FileText, Users, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

const assignmentTypes = [
  { value: "project", label: "Project", description: "Comprehensive project with deliverables" },
  { value: "problem-set", label: "Problem Set", description: "Collection of problems to solve" },
  { value: "essay", label: "Essay", description: "Written analysis or research paper" },
  { value: "presentation", label: "Presentation", description: "Oral presentation with slides" },
  { value: "lab", label: "Lab Exercise", description: "Hands-on practical exercise" },
]

const rubricCriteria = [
  {
    id: 1,
    name: "Content Knowledge",
    description: "Demonstrates understanding of key concepts",
    weight: 40,
    levels: ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
  },
  {
    id: 2,
    name: "Critical Thinking",
    description: "Shows analysis and evaluation skills",
    weight: 30,
    levels: ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
  },
  {
    id: 3,
    name: "Communication",
    description: "Clear and effective presentation of ideas",
    weight: 20,
    levels: ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
  },
  {
    id: 4,
    name: "Organization",
    description: "Logical structure and flow",
    weight: 10,
    levels: ["Excellent", "Good", "Satisfactory", "Needs Improvement"],
  },
]

export default function AssignmentDesignerPage() {
  const [assignmentSettings, setAssignmentSettings] = useState({
    title: "Python Programming Project",
    type: "project",
    description: "",
    dueDate: "",
    estimatedHours: 8,
    gradingWeight: 25,
    allowLateSubmissions: true,
    groupWork: false,
    maxGroupSize: 3,
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Design Assignment for 'Introduction to Python'</h1>
            <p className="text-slate-600 mt-1">Create comprehensive assignments with detailed rubrics</p>
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
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Assignment Settings</h2>

          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Assignment Title</Label>
              <Input
                id="title"
                value={assignmentSettings.title}
                onChange={(e) => setAssignmentSettings((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Assignment Type</Label>
              <Select
                value={assignmentSettings.type}
                onValueChange={(value) => setAssignmentSettings((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignmentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-slate-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="due-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </Label>
              <Input
                id="due-date"
                type="date"
                value={assignmentSettings.dueDate}
                onChange={(e) => setAssignmentSettings((prev) => ({ ...prev, dueDate: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="estimated-hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Estimated Hours
              </Label>
              <Input
                id="estimated-hours"
                type="number"
                value={assignmentSettings.estimatedHours}
                onChange={(e) =>
                  setAssignmentSettings((prev) => ({ ...prev, estimatedHours: Number.parseInt(e.target.value) }))
                }
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
                value={assignmentSettings.gradingWeight}
                onChange={(e) =>
                  setAssignmentSettings((prev) => ({ ...prev, gradingWeight: Number.parseInt(e.target.value) }))
                }
                className="mt-1"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="late-submissions">Allow Late Submissions</Label>
                <Switch
                  id="late-submissions"
                  checked={assignmentSettings.allowLateSubmissions}
                  onCheckedChange={(checked) =>
                    setAssignmentSettings((prev) => ({ ...prev, allowLateSubmissions: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="group-work" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Group Work
                </Label>
                <Switch
                  id="group-work"
                  checked={assignmentSettings.groupWork}
                  onCheckedChange={(checked) => setAssignmentSettings((prev) => ({ ...prev, groupWork: checked }))}
                />
              </div>

              {assignmentSettings.groupWork && (
                <div>
                  <Label htmlFor="max-group-size">Max Group Size</Label>
                  <Input
                    id="max-group-size"
                    type="number"
                    value={assignmentSettings.maxGroupSize}
                    onChange={(e) =>
                      setAssignmentSettings((prev) => ({ ...prev, maxGroupSize: Number.parseInt(e.target.value) }))
                    }
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            <Button className="w-full gap-2" size="lg">
              Generate Assignment
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Assignment Description */}
          <div className="border-b border-slate-200 bg-white p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Assignment Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Provide detailed instructions for the assignment, including objectives, requirements, deliverables, and submission guidelines..."
                  value={assignmentSettings.description}
                  onChange={(e) => setAssignmentSettings((prev) => ({ ...prev, description: e.target.value }))}
                  className="h-32"
                />
              </CardContent>
            </Card>
          </div>

          {/* Rubric Section */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Grading Rubric
              </h2>
              <p className="text-slate-600">Define criteria and performance levels for assessment</p>
            </div>

            <div className="space-y-4">
              {rubricCriteria.map((criterion) => (
                <Card key={criterion.id} className="border-slate-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{criterion.name}</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">{criterion.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{criterion.weight}%</span>
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
                    <div className="grid grid-cols-4 gap-2">
                      {criterion.levels.map((level, index) => (
                        <div key={index} className="p-3 border border-slate-200 rounded text-center">
                          <div className="font-medium text-sm">{level}</div>
                          <div className="text-xs text-slate-500 mt-1">{4 - index} pts</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button variant="outline" className="w-full gap-2 h-12 border-dashed bg-transparent">
                <Plus className="h-4 w-4" />
                Add Rubric Criterion
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
