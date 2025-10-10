import { Plus, Calendar, FileText, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const courses = [
  {
    id: 1,
    title: "Introduction to Python Programming",
    description:
      "A comprehensive course covering Python fundamentals, data structures, and basic algorithms for beginners.",
    lastEdited: "July 7, 2025",
    status: "Published",
    modules: 8,
    students: 234,
    progress: 87,
  },
  {
    id: 2,
    title: "Advanced React Development",
    description: "Deep dive into React hooks, context, performance optimization, and modern development patterns.",
    lastEdited: "July 5, 2025",
    status: "Draft",
    modules: 12,
    students: 0,
    progress: 45,
  },
  {
    id: 3,
    title: "Database Design Fundamentals",
    description: "Learn relational database design, SQL queries, normalization, and database optimization techniques.",
    lastEdited: "July 3, 2025",
    status: "Published",
    modules: 6,
    students: 156,
    progress: 92,
  },
  {
    id: 4,
    title: "UI/UX Design Principles",
    description: "Master the fundamentals of user interface and user experience design with practical projects.",
    lastEdited: "June 28, 2025",
    status: "Draft",
    modules: 10,
    students: 0,
    progress: 23,
  },
]

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gradient">My Courses</h1>
              <p className="text-slate-600 text-lg font-medium">Manage and create your course content</p>
            </div>
            <Button className="gap-2 h-12 px-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <Plus className="h-4 w-4" />
              Create New Course
            </Button>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-white/80 backdrop-blur-sm group"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </CardTitle>
                  <Badge
                    variant={course.status === "Published" ? "default" : "secondary"}
                    className={`${course.status === "Published" ? "bg-primary shadow-md" : ""} font-medium`}
                  >
                    {course.status}
                  </Badge>
                </div>
                <CardDescription className="text-slate-600 line-clamp-3 leading-relaxed">
                  {course.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">Course Progress</span>
                    <span className="text-primary font-semibold">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary to-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                {/* Course Stats */}
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Updated {course.lastEdited}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{course.modules} modules</span>
                  </div>
                  {course.status === "Published" && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>{course.students} students</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 font-semibold">Edit Course</Button>
                  <Button variant="outline" className="flex-1 font-semibold bg-transparent">
                    Analytics
                  </Button>
                  <Button variant="outline" className="flex-1 font-semibold bg-transparent" asChild>
                    <Link href={`/courses/${course.id}/history`}>History</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
