"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Bell, User, BarChart3, Eye, BookOpen } from "lucide-react"
import { CourseOnboardingModal } from "@/components/learner/course-onboarding-modal"

interface Course {
    course_id: string;
    course_name: string;
    course_description: string;
    created_at: string | null;
    updated_at: string | null;
    is_active: boolean;
}

interface Enrollment {
    user_id: string;
    course_id: string;
    enrollment_date: string;
    completion_date: string | null;
    current_status: string;
    progress_percentage: number;
}

interface EnrolledCourse extends Course {
    enrollment: Enrollment;
}

// Function to fetch all courses
const fetchAllCourses = async () => {
    try {
        const response = await fetch('http://10.4.25.215:8000/api/courses', {
            method: 'GET',
            headers: {
                'accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            console.error('Failed to fetch courses:', response.status);
            return [];
        }
    } catch (error) {
        console.error('Error fetching courses:', error);
        return [];
    }
};

// Function to fetch user course enrollments
const fetchUserCourseEnrollments = async (userId: string) => {

    try {
        const response = await fetch('http://10.4.25.215:8000/api/user_course_enrollments', {
            method: 'GET',
            headers: {
                'accept': 'application/json',
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            // Filter enrollments for the current user
            const userEnrollments = data.filter((enrollment: any) => enrollment.user_id === userId);
            console.log('Courses enrolled by user:', userEnrollments);
            return userEnrollments;
        } else {
            console.error('Failed to fetch user course enrollments:', response.status);
            return [];
        }
    } catch (error) {
        console.error('Error fetching user course enrollments:', error);
        return [];
    }
};

export default function CourseDashboard() {
    const router = useRouter()
    const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
    const [selectedCourse, setSelectedCourse] = useState<EnrolledCourse | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    // Fetch user enrolled courses on component mount
    useEffect(() => {
        const fetchUserEnrolledCourses = async () => {
            // Get userId from cookies
            const cookies = document.cookie.split(';');
            let userId = null;
            
            for (const cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'user_id') {
                    userId = value;
                }
            }

            if (!userId) {
                console.log('No user ID found in cookies');
                setLoading(false);
                return;
            }

            try {
                // Fetch both courses and enrollments in parallel
                const [allCourses, userEnrollments] = await Promise.all([
                    fetchAllCourses(),
                    fetchUserCourseEnrollments(userId)
                ]);

                // Match enrollments with course details
                const enrolledCoursesWithDetails = userEnrollments.map((enrollment: Enrollment) => {
                    const courseDetails = allCourses.find((course: Course) => course.course_id === enrollment.course_id);
                    return {
                        ...courseDetails,
                        enrollment
                    };
                }).filter(course => course.course_id); // Filter out any courses that weren't found

                console.log('Enrolled courses with details:', enrolledCoursesWithDetails);
                setEnrolledCourses(enrolledCoursesWithDetails);
            } catch (error) {
                console.error('Error fetching enrolled courses:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserEnrolledCourses();
    }, []);

    const handleStartCourse = (course: EnrolledCourse) => {
        setSelectedCourse(course)
        setIsModalOpen(true)
    }

    const handleContinueCourse = (courseId: string) => {
        // Navigate to module list page
        router.push(`/learner/course/${courseId}`)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50/20 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg text-neutral-600 font-semibold">Loading your courses...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50/20">
            {/* Header */}
            <header className="glass-effect border-b border-neutral-200/50 shadow-soft sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg">
                                <BarChart3 className="h-6 w-6 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-neutral-900">Learning Middleware</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/learner/explore" className="text-neutral-600 hover:text-neutral-900 font-semibold transition-colors">
                                Explore Courses
                            </Link>
                            <Button variant="ghost" size="icon" className="hover:bg-neutral-100 text-neutral-600 rounded-xl">
                                <Bell className="h-5 w-5" />
                            </Button>
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-violet-700 rounded-full flex items-center justify-center shadow-lg">
                                <User className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-3">My Learning Journey 🎓</h1>
                    <p className="text-xl text-neutral-600">Continue your learning journey with personalized courses.</p>
                </div>

                {/* Explore More Section */}
                <div className="relative rounded-2xl bg-gradient-to-r from-violet-100 via-purple-100 to-emerald-100 p-8 mb-10 border border-violet-200 overflow-hidden shadow-medium">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600 rounded-full blur-3xl"></div>
                    </div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">Ready to learn something new?</h2>
                            <p className="text-neutral-700 text-lg">Discover personalized courses across various topics and skill levels.</p>
                        </div>
                        <Button asChild size="lg" className="shrink-0">
                            <Link href="/learner/explore">
                                Explore All Courses
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Course Grid */}
                <div>
                    <h2 className="text-2xl font-bold text-neutral-900 mb-6">Your Courses</h2>
                    {enrolledCourses.length === 0 ? (
                        <Card className="glass-effect border border-neutral-200/50 shadow-medium">
                            <CardContent className="py-20 text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-violet-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <BookOpen className="h-10 w-10 text-violet-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-neutral-900 mb-3">No courses yet</h3>
                                <p className="text-neutral-600 mb-8 max-w-md mx-auto">Start your learning journey by exploring our course catalog!</p>
                                <Button asChild size="lg">
                                    <Link href="/learner/explore">
                                        Explore Courses
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {enrolledCourses.map((course, index) => (
                                <Card
                                    key={course.course_id}
                                    className="group border border-neutral-200 shadow-soft hover:shadow-strong hover:-translate-y-2 hover:border-violet-300 transition-all duration-300 overflow-hidden stagger-item"
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    {/* Gradient Accent Bar */}
                                    <div className="h-2 bg-gradient-to-r from-violet-600 to-emerald-600"></div>
                                    
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-xl font-bold text-neutral-900 group-hover:text-violet-600 transition-colors">
                                            {course.course_name}
                                        </CardTitle>
                                        <CardDescription className="text-neutral-600 line-clamp-3 mt-2">{course.course_description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {course.enrollment.current_status === "in_progress" && (
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm font-semibold">
                                                    <span className="text-neutral-600">Progress</span>
                                                    <span className="text-violet-700">{course.enrollment.progress_percentage}% Complete</span>
                                                </div>
                                                <Progress value={course.enrollment.progress_percentage} className="h-2.5" />
                                            </div>
                                        )}
                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 gap-2"
                                            >
                                                <BarChart3 className="h-4 w-4" />
                                                Outline
                                            </Button>
                                            {course.enrollment.current_status === "not_started" ? (
                                                <Button 
                                                    size="sm"
                                                    className="flex-1 gap-2"
                                                    onClick={() => handleStartCourse(course)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Start
                                                </Button>
                                            ) : (
                                                <Button size="sm" className="flex-1 gap-2" asChild>
                                                    <Link href={`/learner/course/${course.course_id}`}>
                                                        <Eye className="h-4 w-4" />
                                                        Continue
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Course Onboarding Modal */}
            <CourseOnboardingModal
                course={selectedCourse ? {
                    id: parseInt(selectedCourse.course_id) || 0,
                    title: selectedCourse.course_name,
                    description: selectedCourse.course_description,
                    progress: selectedCourse.enrollment.progress_percentage,
                    status: selectedCourse.enrollment.current_status === "not_started" ? "not-started" : "in-progress"
                } : null}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedCourse(null)
                }}
            />
        </div>
    )
}
