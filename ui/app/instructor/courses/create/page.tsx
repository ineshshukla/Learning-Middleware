"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Upload, FileText } from "lucide-react";
import { Header } from "@/components/header";

const TARGET_AUDIENCES = [
  "Elementary School",
  "Middle School",
  "High School",
  "Undergraduate",
  "Graduate",
  "Professional Development",
  "General Public",
];

interface ModuleInput {
  title: string;
  description?: string;
}

export default function CreateCoursePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [courseData, setCourseData] = useState({
    course_name: "",
    coursedescription: "",
    targetaudience: "",
    prereqs: "",
  });

  const [modules, setModules] = useState<ModuleInput[]>([
    { title: "", description: "" },
  ]);

  const [files, setFiles] = useState<File[]>([]);

  const handleAddModule = () => {
    setModules([...modules, { title: "", description: "" }]);
  };

  const handleRemoveModule = (index: number) => {
    if (modules.length > 1) {
      const newModules = modules.filter((_, i) => i !== index);
      setModules(newModules);
    }
  };

  const handleModuleChange = (index: number, field: keyof ModuleInput, value: string) => {
    const newModules = [...modules];
    newModules[index][field] = value;
    setModules(newModules);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("instructor_token="))
        ?.split("=")[1];

      if (!token) {
        throw new Error("Not authenticated");
      }

      // Validate at least one module with title
      const validModules = modules.filter((m) => m.title.trim() !== "");
      if (validModules.length === 0) {
        throw new Error("Please add at least one module with a title");
      }

      // Require files to be uploaded
      if (files.length === 0) {
        throw new Error("Please upload at least one course material file. Files are required to create the course.");
      }

      const requestBody = {
        ...courseData,
        modules: validModules,
      };
      
      console.log("Creating course with data:", requestBody);
      console.log("Number of modules:", validModules.length);

      // Step 1: Create course with modules
      const courseResponse = await fetch(
        `${process.env.NEXT_PUBLIC_INSTRUCTOR_API_URL || "http://localhost:8003"}/api/v1/instructor/courses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!courseResponse.ok) {
        const errorData = await courseResponse.json();
        throw new Error(errorData.detail || "Failed to create course");
      }

      const createdCourse = await courseResponse.json();
      console.log("Course created:", createdCourse);
      const courseid = createdCourse.courseid;

      // Step 2: Upload files to SME and create vector store
      setUploadingFiles(true);
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append("files", file);
      });

      console.log(`Uploading ${files.length} files to SME service...`);

      const uploadResponse = await fetch(
        `${process.env.NEXT_PUBLIC_INSTRUCTOR_API_URL || "http://localhost:8003"}/api/v1/instructor/courses/${courseid}/upload-to-sme?create_vector_store=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.detail || "Failed to upload files to SME");
      }

      const uploadResult = await uploadResponse.json();
      console.log("Files uploaded to SME:", uploadResult);
      
      setUploadingFiles(false);

      // Step 3: Redirect to processing page for vector store and LO generation
      const moduleNames = validModules.map(m => m.title);
      router.push(`/instructor/courses/${courseid}/process?modules=${encodeURIComponent(JSON.stringify(moduleNames))}`);


    } catch (err: any) {
      setError(err.message || "Failed to create course. Please try again.");
      setIsLoading(false);
      setUploadingFiles(false);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900">Create New Course</h1>
            <p className="text-xl text-slate-600 mt-2">Set up your course details and modules</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Course Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
                <CardDescription>Basic details about your course</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course_name">Course Name *</Label>
                  <Input
                    id="course_name"
                    placeholder="e.g., Introduction to Machine Learning"
                    value={courseData.course_name}
                    onChange={(e) =>
                      setCourseData({ ...courseData, course_name: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coursedescription">Course Description</Label>
                  <Textarea
                    id="coursedescription"
                    placeholder="Describe what students will learn in this course..."
                    value={courseData.coursedescription}
                    onChange={(e) =>
                      setCourseData({ ...courseData, coursedescription: e.target.value })
                    }
                    rows={4}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetaudience">Target Audience *</Label>
                  <Select
                    value={courseData.targetaudience}
                    onValueChange={(value) =>
                      setCourseData({ ...courseData, targetaudience: value })
                    }
                    disabled={isLoading}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target audience" />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_AUDIENCES.map((audience) => (
                        <SelectItem key={audience} value={audience}>
                          {audience}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prereqs">Prerequisites</Label>
                  <Textarea
                    id="prereqs"
                    placeholder="e.g., Basic Python, Linear Algebra, Statistics"
                    value={courseData.prereqs}
                    onChange={(e) =>
                      setCourseData({ ...courseData, prereqs: e.target.value })
                    }
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Modules Card */}
            <Card>
              <CardHeader>
                <CardTitle>Course Modules</CardTitle>
                <CardDescription>Add modules to organize your course content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map((module, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Module {index + 1}</Label>
                      {modules.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveModule(index)}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`module-title-${index}`}>Module Title *</Label>
                      <Input
                        id={`module-title-${index}`}
                        placeholder="e.g., Introduction to Neural Networks"
                        value={module.title}
                        onChange={(e) => handleModuleChange(index, "title", e.target.value)}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`module-description-${index}`}>Module Description</Label>
                      <Textarea
                        id={`module-description-${index}`}
                        placeholder="Describe what this module covers... (optional)"
                        value={module.description || ""}
                        onChange={(e) => handleModuleChange(index, "description", e.target.value)}
                        disabled={isLoading}
                        rows={3}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddModule}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Module
                </Button>
              </CardContent>
            </Card>

            {/* File Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle>Course Materials *</CardTitle>
                <CardDescription>
                  Upload PDFs, documents, or other learning materials. 
                  <span className="font-semibold text-red-600"> At least one file is required</span> to create the course and generate learning objectives.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Upload Files *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                      onChange={handleFileSelect}
                      disabled={isLoading || uploadingFiles}
                      className="cursor-pointer"
                      required
                    />
                    <Upload className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Accepted formats: PDF, DOC, DOCX, TXT, PPT, PPTX
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Files:</Label>
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            disabled={isLoading || uploadingFiles}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading || uploadingFiles}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || uploadingFiles}
                className="flex-1 bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700"
              >
                {uploadingFiles
                  ? "Uploading Files..."
                  : isLoading
                  ? "Creating Course..."
                  : "Create Course"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
