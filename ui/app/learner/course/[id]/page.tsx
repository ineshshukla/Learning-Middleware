"use client"

import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play, Check, Lock, Clock, BookOpen } from "lucide-react"
import Link from "next/link"

// Types for API data
interface UserModule {
    user_id: string;
    course_id: string;
    module_id: string;
    enrollment_date: string | null;
    completion_date: string | null;
    current_status: "not_started" | "in_progress" | "completed";
    progress_percentage: number;
}

interface Module {
    module_id: string;
    course_id: string;
    module_name: string;
    module_description: string;
    order_sequence: number;
    duration?: string;
    lessons?: number;
}

const courseData = {
    1: { title: "Introduction to Python", progress: 75 },
    2: { title: "Web Development Basics", progress: 45 },
    3: { title: "Data Structures & Algorithms", progress: 0 },
    4: { title: "Machine Learning Fundamentals", progress: 0 },
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const resolvedParams = use(params)
    const courseId = parseInt(resolvedParams.id)
    const course = courseData[courseId as keyof typeof courseData]
    const [userId, setUserId] = useState<string | null>(null)
    const [userModules, setUserModules] = useState<UserModule[]>([])
    const [modules, setModules] = useState<Module[]>([])
    const [loading, setLoading] = useState(true)

    // Function to get userId from cookies
    const getUserIdFromCookies = () => {
        const cookies = document.cookie.split(';');
        let userId = null;
        
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'user_id') {
                userId = value;
            }
        }

        if (userId && userId !== 'undefined') {
            console.log(`User ID found: ${userId}`);
            setUserId(userId);
            return userId;
        }
        return null;
    }

    // Function to fetch user modules
    const fetchUserModules = async (userIdParam: string) => {
        try {
            const response = await fetch(`http://10.4.25.215:8000/api/user_modules?user_id=${userIdParam}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json'
                }
            })
            
            if (response.ok) {
                const userModulesData = await response.json()
                console.log('User Modules:', userModulesData)
                setUserModules(userModulesData)
                return userModulesData
            } else {
                console.error('Failed to fetch user modules:', response.status)
            }
        } catch (error) {
            console.error('Error fetching user modules:', error)
        }
    }

    // Function to fetch modules data
    const fetchModules = async () => {
        try {
            const response = await fetch('http://10.4.25.215:8000/api/modules', {
                method: 'GET',
                headers: {
                    'accept': 'application/json'
                }
            })
            
            if (response.ok) {
                const modulesData = await response.json()
                console.log('Modules:', modulesData)
                setModules(modulesData)
                return modulesData
            } else {
                console.error('Failed to fetch modules:', response.status)
            }
        } catch (error) {
            console.error('Error fetching modules:', error)
        }
    }

    // Get userId and fetch data on component mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const userIdFromCookies = getUserIdFromCookies();
            
            if (userIdFromCookies) {
                await Promise.all([
                    fetchUserModules(userIdFromCookies),
                    fetchModules()
                ])
            } else {
                await fetchModules()
            }
            setLoading(false)
        }
        
        fetchData()
    }, [])

    // Combine user modules with module details
    const getCombinedModules = () => {
        return modules.map(module => {
            const userModule = userModules.find(um => um.module_id === module.module_id)
            return {
                id: module.module_id,
                title: module.module_name,
                description: module.module_description,
                duration: module.duration || "30 min", // Default duration if not provided
                lessons: module.lessons || 5, // Default lessons if not provided
                status: userModule?.current_status || 'not_started',
                progress: userModule?.progress_percentage || 0,
                order: module.order_sequence
            }
        }).sort((a, b) => a.order - b.order) // Sort by order_sequence
    }

    if (!course) {
        return <div>Course not found</div>
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <Check className="h-5 w-5 text-green-600" />
            case "in_progress":
                return <Play className="h-5 w-5 text-blue-600" />
            case "not_started":
                return <Lock className="h-5 w-5 text-slate-400" />
            default:
                return null
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-800 border-green-200"
            case "in_progress":
                return "bg-blue-100 text-blue-800 border-blue-200"
            case "not_started":
                return "bg-slate-100 text-slate-500 border-slate-200"
            default:
                return ""
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Link href="/learner">
                                <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <h1 className="text-xl font-semibold text-slate-900">{course.title}</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-slate-600">
                                Progress: {course.progress}%
                            </div>
                            <Progress value={course.progress} className="w-32" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Course Modules</h1>
                    <p className="text-lg text-slate-600">Progress through each module to complete the course.</p>
                </div>

                {/* Module List */}
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="text-lg text-slate-600">Loading modules...</div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {getCombinedModules().map((module) => (
                            <Card
                                key={module.id}
                                className={`group hover:shadow-lg transition-all duration-300 ${module.status === "not_started" ? "opacity-60" : "cursor-pointer hover:scale-[1.02]"
                                    }`}
                            >
                                <CardHeader className="pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">
                                                {getStatusIcon(module.status)}
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                                                    {module.title}
                                                </CardTitle>
                                                <CardDescription className="text-slate-600 mt-1">
                                                    {module.description}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge className={`${getStatusColor(module.status)} capitalize`}>
                                            {module.status.replace("_", " ").replace("-", " ")}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6 text-sm text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {module.duration}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <BookOpen className="h-4 w-4" />
                                                {module.lessons} lessons
                                            </div>
                                        </div>
                                        {module.status !== "not_started" && (
                                            <Button
                                                variant={module.status === "completed" ? "outline" : "default"}
                                                className="gap-2"
                                                asChild
                                            >
                                                <Link href={`/learner/course/${courseId}/module/${module.id}`}>
                                                    {module.status === "completed" ? (
                                                        <>
                                                            <Check className="h-4 w-4" />
                                                            Review
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="h-4 w-4" />
                                                            {module.status === "in_progress" ? "Continue" : "Start"}
                                                        </>
                                                    )}
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
