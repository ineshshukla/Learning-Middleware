"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Bell, User, Search } from "lucide-react"
import Link from "next/link"

interface Course {
    course_id: string;
    course_name: string;
    course_description: string;
    created_at: string | null;
    updated_at: string | null;
    is_active: boolean;
}

export default function ExplorePage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        // Get user ID from cookies
        const cookies = document.cookie.split(';');
        let userIdFromCookie = null;
        
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'user_id') {
                userIdFromCookie = value;
                break;
            }
        }
        
        if (userIdFromCookie && userIdFromCookie !== 'undefined') {
            setUserId(userIdFromCookie);
        }

        // Fetch courses
        const fetchCourses = async () => {
            try {
                const response = await fetch('http://10.4.25.215:8000/api/courses', {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Courses API Response:', data);
                    setCourses(data);
                } else {
                    console.error('Failed to fetch courses:', response.status);
                }
            } catch (error) {
                console.error('Error fetching courses:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            course.course_description.toLowerCase().includes(searchTerm.toLowerCase())
        
        return matchesSearch
    })

    const handleJoinCourse = async (courseId: string) => {
        if (!userId) {
            alert('Please log in to join a course.');
            return;
        }

        try {
            const response = await fetch(`http://10.4.25.215:8000/api/users/${userId}/enroll_course`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                body: JSON.stringify({
                    course_id: courseId
                })
            });

            if (response.ok) {
                const enrollmentData = await response.json();
                console.log('Enrollment successful:', enrollmentData);
                
                // Show success message
                alert(`Successfully enrolled in course! ${enrollmentData.modules_initialized} modules initialized.`);
                
                // Optionally redirect to the course page
                // window.location.href = `/learner/course/${courseId}`;
            } else {
                const errorData = await response.json();
                console.error('Enrollment failed:', errorData);
                alert('Failed to enroll in course. Please try again.');
            }
        } catch (error) {
            console.error('Error enrolling in course:', error);
            alert('An error occurred while enrolling. Please try again.');
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/learner" className="text-2xl font-bold text-slate-900 hover:text-primary">
                                LMW.ai
                            </Link>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/learner" className="text-slate-600 hover:text-slate-900">
                                My Courses
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
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 mb-3">Explore Courses</h1>
                    <p className="text-lg text-slate-600">Discover new skills and advance your career with our expert-led courses.</p>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                                <Input
                                    placeholder="Search courses..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results count */}
                <div className="mb-6">
                    <p className="text-slate-600">
                        Showing {filteredCourses.length} of {courses.length} courses
                    </p>
                </div>

                {/* Course Grid */}
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-slate-600">Loading courses...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((course) => (
                            <Card
                                key={course.course_id}
                                className="group hover:shadow-xl transition-all duration-300 border-0 shadow-sm hover:scale-105"
                            >
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
                                        {course.course_name}
                                    </CardTitle>
                                    <CardDescription className="text-slate-600 line-clamp-3">
                                        {course.course_description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50"
                                        >
                                            Preview
                                        </Button>
                                        <Button 
                                            className="flex-1 bg-primary hover:bg-primary/90"
                                            onClick={() => handleJoinCourse(course.course_id)}
                                        >
                                            Join Course
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* No results message */}
                {filteredCourses.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-slate-400 mb-4">
                            <Search className="h-12 w-12 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No courses found</h3>
                        <p className="text-slate-600">
                            Try adjusting your search or filter criteria to find more courses.
                        </p>
                    </div>
                )}
            </main>
        </div>
    )
}
