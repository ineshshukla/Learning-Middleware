"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Plus, BarChart3, Eye } from "lucide-react"

const courses = [
  {
    id: 1,
    title: "Introduction to Data Science",
    description: "A comprehensive course covering Python, statistics, and machine learning fundamentals for beginners.",
  },
  {
    id: 2,
    title: "Advanced React Development",
    description: "Deep dive into React hooks, context, performance optimization, and modern development patterns.",
  },
  {
    id: 3,
    title: "Digital Marketing Strategy",
    description: "Learn to create effective digital marketing campaigns across multiple channels and platforms.",
  },
  {
    id: 4,
    title: "Financial Analysis Fundamentals",
    description: "Master financial statement analysis, valuation techniques, and investment decision-making.",
  },
  {
    id: 5,
    title: "UI/UX Design Principles",
    description: "Create intuitive and beautiful user interfaces with modern design principles and tools.",
  },
  {
    id: 6,
    title: "Machine Learning Basics",
    description: "Introduction to machine learning algorithms, data preprocessing, and model evaluation.",
  },
]

export default function DashboardPage() {
  return (
    <>
      <Header />
      {/* <AIAssistant /> */}
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">My Courses</h1>
            <p className="text-xl text-slate-600">Manage and create your educational content</p>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <Card
                key={course.id}
                className="group hover:shadow-xl transition-all duration-300 border-0 glass-effect hover:scale-105"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="text-slate-600 line-clamp-3">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1 gap-2 bg-transparent">
                      <BarChart3 className="h-4 w-4" />
                      View Analytics
                    </Button>
                    <Button className="flex-1 gap-2" asChild>
                      <Link href={`/course/${course.id}`}>
                        <Eye className="h-4 w-4" />
                        View Course
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Floating Action Button - moved to left */}
          <Link href="/upload">
            <Button
              size="lg"
              className="fixed bottom-8 left-8 h-16 px-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 shiny-button gap-3 rounded-full text-lg font-semibold z-40"
            >
              <Plus className="h-6 w-6" />
              Create New Course
            </Button>
          </Link>
        </div>
      </main>
    </>
  )
}
