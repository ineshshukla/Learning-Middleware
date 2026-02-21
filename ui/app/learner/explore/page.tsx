"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Search, Loader2, CheckCircle, Clock, Star, Sparkles } from "lucide-react";
import Link from "next/link";
import { LearnerHeader } from "@/components/learner-header";
import {
    getAllCourses,
    getMyCourses,
    enrollInCourse,
    type Course,
    type Enrollment
} from "@/lib/learner-api";

export default function ExplorePage() {
    const basePath = process.env.NODE_ENV === 'production' ? '/learn' : '';
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [courses, enrolled] = await Promise.all([
                getAllCourses(),
                getMyCourses()
            ])

            setAllCourses(courses)
            setEnrolledCourses(enrolled)
        } catch (err: any) {
            setError(err.message || "Failed to load courses")
        } finally {
            setLoading(false)
        }
    }

    const handleEnroll = async (courseId: string) => {
        try {
            setError("")
            setSuccessMessage("")
            setEnrollingCourseId(courseId)

            await enrollInCourse(courseId)

            setSuccessMessage("Successfully enrolled in course!")

            const enrolled = await getMyCourses()
            setEnrolledCourses(enrolled)

            setTimeout(() => setSuccessMessage(""), 3000)

            setTimeout(() => {
                router.push("/learner/courses")
            }, 1500)
        } catch (err: any) {
            setError(err.message || "Failed to enroll in course")
        } finally {
            setEnrollingCourseId(null)
        }
    }

    const isEnrolled = (courseId: string) => {
        return enrolledCourses.some(enrollment => enrollment.courseid === courseId)
    }

    const filteredAvailableCourses = allCourses.filter(course =>
        !isEnrolled(course.courseid) &&
        (course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.coursedescription?.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        })
    }

    if (loading) {
        return (
            <>
                <LearnerHeader />
                <div
                    className="pt-24 min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url('${basePath}/back.png')` }}
                >
                    <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-[#ffc09f] mx-auto mb-4" />
                        <p className="text-[#7a6358]">Discovering amazing courses...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <LearnerHeader />
            <div
                className="pt-24 min-h-screen bg-cover bg-center bg-no-repeat bg-fixed font-sans"
                style={{ backgroundImage: `url('${basePath}/back.png')` }}
            >
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Hero Section */}
                    <div className="mb-12 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fff5f0] text-[#3d2c24] font-semibold text-sm mb-6 border border-[#f0e0d6]">
                            <Sparkles className="h-4 w-4 text-[#ffc09f]" />
                            <span>Discover Your Next Learning Adventure</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold text-[#3d2c24] mb-4">
                            Explore <span className="text-[#ff9f6b]">Courses</span>
                        </h1>
                        <p className="text-xl text-[#7a6358] max-w-2xl mx-auto">
                            Browse our curated collection of courses designed to help you master new skills and achieve your goals
                        </p>
                    </div>

                    {/* Alerts */}
                    {error && (
                        <Alert variant="destructive" className="mb-6 max-w-3xl mx-auto bg-red-50 border-red-200">
                            <AlertDescription className="text-red-700">{error}</AlertDescription>
                        </Alert>
                    )}

                    {successMessage && (
                        <Alert className="mb-6 max-w-3xl mx-auto bg-emerald-50 border-emerald-200">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <AlertDescription className="text-emerald-700 font-medium">{successMessage}</AlertDescription>
                        </Alert>
                    )}

                    {/* Search Bar */}
                    <div className="mb-10 max-w-3xl mx-auto relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#7a6358] h-5 w-5 z-10" />
                        <Input
                            placeholder="Search for courses by name or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-14 text-base warm-card border-0 text-[#3d2c24] placeholder:text-[#7a6358] focus:ring-[#ffc09f]/20"
                        />
                    </div>

                    {/* Stats Bar */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-[#3d2c24]">Available Courses</h2>
                            <p className="text-[#7a6358]">{filteredAvailableCourses.length} courses ready for you</p>
                        </div>
                        <Link href="/learner/courses">
                            <Button variant="outline" size="lg" className="border-[#ffc09f] bg-[#fff5f0] text-[#3d2c24] hover:bg-[#ffd9c4]">
                                <BookOpen className="mr-2 h-5 w-5" />
                                My Courses
                            </Button>
                        </Link>
                    </div>

                    {/* Courses Grid */}
                    {filteredAvailableCourses.length === 0 ? (
                        <Card className="warm-card">
                            <CardContent className="py-20 text-center">
                                <h3 className="text-2xl font-bold text-[#3d2c24] mb-2">
                                    {searchTerm ? "No courses found" : "No courses available"}
                                </h3>
                                <p className="text-[#7a6358] max-w-md mx-auto">
                                    {searchTerm
                                        ? "Try adjusting your search terms or browse all available courses"
                                        : "Check back later for new courses"}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAvailableCourses.map((course) => (
                                <Card
                                    key={course.courseid}
                                    className="group warm-card-interactive overflow-hidden"
                                >
                                    <div className="h-2 warm-gradient-bar"></div>
                                    <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <CardTitle className="text-xl font-bold text-[#3d2c24] line-clamp-2 group-hover:text-[#ff9f6b] transition-colors">
                                                {course.course_name}
                                            </CardTitle>
                                        </div>
                                        {course.targetaudience && (
                                            <Badge className="w-fit mb-2 bg-[#ffc09f]/40 text-[#3d2c24] border border-[#ffc09f]/50 hover:bg-[#ffc09f]/30">
                                                {course.targetaudience}
                                            </Badge>
                                        )}
                                        <CardDescription className="text-base text-[#7a6358] line-clamp-3">
                                            {course.coursedescription || "No description available"}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {course.prereqs && (
                                            <div className="text-sm text-[#3d2c24] bg-amber-50 border-l-4 border-amber-400 p-3 rounded">
                                                <span className="font-semibold">Prerequisites:</span> {course.prereqs}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4 text-sm text-[#7a6358]">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                <span>Updated {formatDate(course.updated_at)}</span>
                                            </div>
                                        </div>
                                        <Button
                                            className="w-full bg-[#ffc09f] hover:bg-[#ff9f6b] text-[#3d2c24] font-semibold shadow-md group-hover:shadow-lg transition-all h-11"
                                            onClick={() => handleEnroll(course.courseid)}
                                            disabled={enrollingCourseId === course.courseid}
                                        >
                                            {enrollingCourseId === course.courseid ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Enrolling...
                                                </>
                                            ) : (
                                                <>
                                                    <Star className="h-4 w-4 mr-2" />
                                                    Enroll Now
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </>
    )
}
