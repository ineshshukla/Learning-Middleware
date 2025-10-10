"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts"

const enrollmentData = [
  { month: "Jan", students: 186, completed: 145 },
  { month: "Feb", students: 305, completed: 267 },
  { month: "Mar", students: 237, completed: 198 },
  { month: "Apr", students: 273, completed: 234 },
  { month: "May", students: 209, completed: 182 },
  { month: "Jun", students: 314, completed: 287 },
]

const engagementData = [
  { day: "Mon", engagement: 85 },
  { day: "Tue", engagement: 92 },
  { day: "Wed", engagement: 78 },
  { day: "Thu", engagement: 95 },
  { day: "Fri", engagement: 88 },
  { day: "Sat", engagement: 76 },
  { day: "Sun", engagement: 82 },
]

export function AnalyticsChart() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Student Enrollment & Completion</CardTitle>
          <CardDescription>Monthly enrollment vs completion rates</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={enrollmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="students" stroke="hsl(var(--primary))" strokeWidth={2} name="Enrolled" />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="hsl(142.1 76.2% 36.3%)"
                strokeWidth={2}
                name="Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Engagement</CardTitle>
          <CardDescription>Student engagement scores by day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
