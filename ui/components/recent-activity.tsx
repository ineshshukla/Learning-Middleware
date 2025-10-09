import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, BookOpen, Users } from "lucide-react"

const recentCourses = [
  {
    title: "Advanced React Development",
    students: 234,
    completion: 89,
    status: "active",
    lastUpdated: "2 hours ago",
  },
  {
    title: "JavaScript Fundamentals",
    students: 567,
    completion: 94,
    status: "active",
    lastUpdated: "1 day ago",
  },
  {
    title: "UI/UX Design Principles",
    students: 189,
    completion: 76,
    status: "draft",
    lastUpdated: "3 days ago",
  },
  {
    title: "Database Design & SQL",
    students: 345,
    completion: 82,
    status: "active",
    lastUpdated: "5 days ago",
  },
]

const recentStudents = [
  {
    name: "Alex Johnson",
    email: "alex@example.com",
    course: "Advanced React",
    progress: 85,
    avatar: "AJ",
  },
  {
    name: "Maria Garcia",
    email: "maria@example.com",
    course: "JavaScript Fund.",
    progress: 92,
    avatar: "MG",
  },
  {
    name: "David Chen",
    email: "david@example.com",
    course: "UI/UX Design",
    progress: 67,
    avatar: "DC",
  },
  {
    name: "Sarah Wilson",
    email: "sarah@example.com",
    course: "Database Design",
    progress: 78,
    avatar: "SW",
  },
]

export function RecentActivity() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Recent Courses
          </CardTitle>
          <CardDescription>Your latest course activity and performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentCourses.map((course, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-1">
                <p className="font-medium leading-none">{course.title}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {course.students}
                  </span>
                  <span>{course.completion}% completion</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={course.status === "active" ? "default" : "secondary"}>{course.status}</Badge>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Performing Students
          </CardTitle>
          <CardDescription>Students with highest engagement this week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentStudents.map((student, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{student.avatar}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-medium leading-none">{student.name}</p>
                  <p className="text-sm text-muted-foreground">{student.course}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{student.progress}%</div>
                <div className="text-xs text-muted-foreground">Progress</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
