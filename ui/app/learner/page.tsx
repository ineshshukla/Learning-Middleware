"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Bell, User, BarChart3, Eye } from "lucide-react"
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-600">Loading your courses...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-slate-900">LMW.ai</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/learner/explore" className="text-slate-600 hover:text-slate-900">
                                Explore Courses
                            </Link>
                            <Button variant="ghost" size="icon" className="hover:bg-slate-100 text-slate-600">
                                <Bell className="h-5 w-5" />
                            </Button>
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-3">My Courses</h1>
                    <p className="text-lg text-slate-600">Continue your learning journey with our comprehensive courses.</p>
                </div>

                {/* Explore More Section */}
                <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-lg p-6 mb-8 border border-primary/20">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        <div className="mb-4 md:mb-0">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to learn something new?</h2>
                            <p className="text-slate-600">Discover thousands of courses across various topics and skill levels.</p>
                        </div>
                        <Button asChild className="bg-primary hover:bg-primary/90 px-8">
                            <Link href="/learner/explore">
                                Explore All Courses
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {enrolledCourses.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                            <p className="text-slate-600 mb-4">You haven't enrolled in any courses yet.</p>
                            <Button asChild className="bg-primary hover:bg-primary/90">
                                <Link href="/learner/explore">
                                    Explore Courses
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        enrolledCourses.map((course) => (
                            <Card
                                key={course.course_id}
                                className="group hover:shadow-xl transition-all duration-300 border-0 glass-effect hover:scale-105"
                            >
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                                        {course.course_name}
                                    </CardTitle>
                                    <CardDescription className="text-slate-600 line-clamp-3">{course.course_description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {course.enrollment.current_status === "in_progress" && (
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Progress</span>
                                                <span className="font-medium text-slate-700">{course.enrollment.progress_percentage}% Complete</span>
                                            </div>
                                            <Progress value={course.enrollment.progress_percentage} className="h-2" />
                                        </div>
                                    )}
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 gap-2 bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50"
                                        >
                                            <BarChart3 className="h-4 w-4" />
                                            View Outline
                                        </Button>
                                        {course.enrollment.current_status === "not_started" ? (
                                            <Button 
                                                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                                                onClick={() => handleStartCourse(course)}
                                            >
                                                <Eye className="h-4 w-4" />
                                                Start Course
                                            </Button>
                                        ) : (
                                            <Button className="flex-1 gap-2 bg-primary hover:bg-primary/90" asChild>
                                                <Link href={`/learner/course/${course.course_id}`}>
                                                    <Eye className="h-4 w-4" />
                                                    Continue
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
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
