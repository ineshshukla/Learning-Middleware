import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, BookOpen, MessageSquare, Award } from "lucide-react"

const metrics = [
  {
    title: "Total Students",
    value: "2,847",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    description: "Active enrolled students",
  },
  {
    title: "Course Completion",
    value: "87.3%",
    change: "+5.2%",
    trend: "up",
    icon: BookOpen,
    description: "Average completion rate",
  },
  {
    title: "Engagement Score",
    value: "94.2",
    change: "+2.1%",
    trend: "up",
    icon: MessageSquare,
    description: "Student interaction rating",
  },
  {
    title: "Certificates Issued",
    value: "1,234",
    change: "+18.7%",
    trend: "up",
    icon: Award,
    description: "This month",
  },
]

export function MetricsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metric.trend === "up" ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              <span className={metric.trend === "up" ? "text-green-500" : "text-red-500"}>{metric.change}</span>
              <span className="ml-1">{metric.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
