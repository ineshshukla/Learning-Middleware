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
import { uploadModuleFiles, createVectorStore } from "@/lib/instructor-api";

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
  files?: File[];
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
    { title: "", description: "", files: [] },
  ]);

  const [files, setFiles] = useState<File[]>([]);

  const handleAddModule = () => {
    setModules([...modules, { title: "", description: "", files: [] }]);
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

  const handleModuleFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newModules = [...modules];
      newModules[index].files = [...(newModules[index].files || []), ...newFiles];
      setModules(newModules);
    }
  };

  const handleRemoveModuleFile = (moduleIndex: number, fileIndex: number) => {
    const newModules = [...modules];
    newModules[moduleIndex].files = (newModules[moduleIndex].files || []).filter((_, i) => i !== fileIndex);
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

      // Check if at least course-level OR module-level files are uploaded
      const totalModuleFiles = validModules.reduce((sum, m) => sum + (m.files?.length || 0), 0);
      if (files.length === 0 && totalModuleFiles === 0) {
        throw new Error("Please upload at least one file (either at course level or module level). Files are required to create the course.");
      }

      const requestBody = {
        ...courseData,
        modules: validModules.map(m => ({ title: m.title, description: m.description })),
      };
      
      console.log("Creating course with data:", requestBody);
      console.log("Number of modules:", validModules.length);

      // Step 1: Create course with modules
      const baseUrl = process.env.NEXT_PUBLIC_INSTRUCTOR_API_URL || "http://localhost:8003";
      const apiUrl = `${baseUrl}/courses`;
      
      const courseResponse = await fetch(
        apiUrl,
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

      // Step 2: Upload course-level files (if any)
      setUploadingFiles(true);
      
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(file => {
          formData.append("files", file);
        });

        console.log(`Uploading ${files.length} course-level files to SME service...`);

        const uploadUrl = `${baseUrl}/courses/${courseid}/upload-to-sme?create_vector_store=true`;
        
        const uploadResponse = await fetch(
          uploadUrl,
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
          throw new Error(errorData.detail || "Failed to upload course files to SME");
        }

        const uploadResult = await uploadResponse.json();
        console.log("Course files uploaded to SME:", uploadResult);
      }

      // Step 3: Upload module-level files (if any)
      if (createdCourse.modules && createdCourse.modules.length > 0) {
        for (let i = 0; i < validModules.length; i++) {
          const module = validModules[i];
          const createdModule = createdCourse.modules[i];
          
          if (module.files && module.files.length > 0) {
            console.log(`Uploading ${module.files.length} files for module "${module.title}"...`);
            
            try {
              await uploadModuleFiles(createdModule.moduleid, module.files, false); // Upload files without creating vector store yet
              console.log(`Module files uploaded for "${module.title}"`);
            } catch (uploadErr: any) {
              console.error(`Failed to upload files for module "${module.title}":`, uploadErr);
              // Continue with other modules even if one fails
            }
          }
        }
      }

      // Step 4: Create vector store automatically after all files are uploaded
      console.log("Creating vector store for course...");
      try {
        await createVectorStore(courseid);
        console.log("Vector store created successfully");
      } catch (vsErr: any) {
        console.error("Failed to create vector store:", vsErr);
        // Don't fail the whole process if vector store creation fails
      }
      
      setUploadingFiles(false);

      // Step 5: Redirect to processing page for LO generation (vector store will be ready)
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
      <main className="pt-16 min-h-screen bg-[#181818]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white">Create New Course</h1>
            <p className="text-xl text-white mt-2">Set up your course details and modules</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-[#282828] border-red-500/50">
                <AlertDescription className="text-white">{error}</AlertDescription>
              </Alert>
            )}

            {/* Course Details Card */}
            <Card className="bg-[#282828] border-[#3f3f3f]">
              <CardHeader>
                <CardTitle className="text-white">Course Information</CardTitle>
                <CardDescription className="text-white">Basic details about your course</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course_name" className="text-white">Course Name *</Label>
                  <Input
                    id="course_name"
                    placeholder="e.g., Introduction to Machine Learning"
                    value={courseData.course_name}
                    onChange={(e) =>
                      setCourseData({ ...courseData, course_name: e.target.value })
                    }
                    required
                    disabled={isLoading}
                    className="bg-[#3f3f3f] border-[#333] text-white placeholder:text-white/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coursedescription" className="text-white">Course Description</Label>
                  <Textarea
                    id="coursedescription"
                    placeholder="Describe what students will learn in this course..."
                    value={courseData.coursedescription}
                    onChange={(e) =>
                      setCourseData({ ...courseData, coursedescription: e.target.value })
                    }
                    rows={4}
                    disabled={isLoading}
                    className="bg-[#3f3f3f] border-[#3f3f3f] text-white placeholder:text-white/40"
                  />
                </div>

                <div className="space-y-2 text-white">
                  <Label htmlFor="targetaudience" className="text-white">Target Audience *</Label>
                  <Select
                    value={courseData.targetaudience}
                    onValueChange={(value) =>
                      setCourseData({ ...courseData, targetaudience: value })
                    }
                    disabled={isLoading}
                    required
                  >
                    <SelectTrigger className="bg-[#3f3f3f] border-[#3f3f3f] text-white">
                      <SelectValue placeholder="Select target audience" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#282828] border-[#3f3f3f]">
                      {TARGET_AUDIENCES.map((audience) => (
                        <SelectItem key={audience} value={audience} className="bg-[#282828] text-white hover:bg-[#3f3f3f] focus:bg-[#3f3f3f]">
                          {audience}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prereqs" className="text-white">Prerequisites</Label>
                  <Textarea
                    id="prereqs"
                    placeholder="e.g., Basic Python, Linear Algebra, Statistics"
                    value={courseData.prereqs}
                    onChange={(e) =>
                      setCourseData({ ...courseData, prereqs: e.target.value })
                    }
                    rows={2}
                    disabled={isLoading}
                    className="bg-[#3f3f3f] border-[#3f3f3f] text-white placeholder:text-white/40"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Modules Card */}
            <Card className="bg-[#282828] border-[#3f3f3f]">
              <CardHeader>
                <CardTitle className="text-white">Course Modules</CardTitle>
                <CardDescription className="text-white">Add modules to organize your course content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map((module, index) => (
                  <div key={index} className="p-4 border border-white/20 rounded-lg space-y-3 bg-[#3f3f3f]">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold text-white">Module {index + 1}</Label>
                      {modules.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveModule(index)}
                          disabled={isLoading}
                          className="text-white hover:bg-white/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2 text-white">
                      <Label htmlFor={`module-title-${index}`} className="text-white">Module Title *</Label>
                      <Input
                        id={`module-title-${index}`}
                        placeholder="e.g., Introduction to Neural Networks"
                        value={module.title}
                        onChange={(e) => handleModuleChange(index, "title", e.target.value)}
                        disabled={isLoading}
                        className="bg-[#282828] border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`module-description-${index}`} className="text-white">Module Description</Label>
                      <Textarea
                        id={`module-description-${index}`}
                        placeholder="Describe what this module covers... (optional)"
                        value={module.description || ""}
                        onChange={(e) => handleModuleChange(index, "description", e.target.value)}
                        disabled={isLoading}
                        rows={3}
                        className="bg-[#282828] border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>

                    {/* Module File Upload */}
                    <div className="space-y-2 border-t border-white/20 pt-3">
                      <Label htmlFor={`module-files-${index}`} className="text-white">Module Files (Optional)</Label>
                      <Input
                        id={`module-files-${index}`}
                        type="file"
                        multiple
                        accept=".pdf,.txt,.md"
                        onChange={(e) => handleModuleFileSelect(index, e)}
                        disabled={isLoading}
                        className="cursor-pointer bg-[#282828] border-white/20 text-white"
                      />
                      <p className="text-xs text-white/60">
                        Upload files specific to this module (PDF, TXT, MD)
                      </p>
                      
                      {module.files && module.files.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {module.files.map((file, fileIndex) => (
                            <div
                              key={fileIndex}
                              className="flex items-center justify-between p-2 bg-[#282828] rounded border border-white/20"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3 text-[#A78BFA]" />
                                <span className="text-xs text-white">{file.name}</span>
                                <span className="text-xs text-white/60">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveModuleFile(index, fileIndex)}
                                disabled={isLoading}
                                className="text-white hover:bg-white/10"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddModule}
                  disabled={isLoading}
                  className="w-full border-white/20 text-black hover:bg-white/10 hover:text-white "
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Module
                </Button>
              </CardContent>
            </Card>

            {/* File Upload Card */}
            <Card className="bg-[#282828] border-[#3f3f3f]">
              <CardHeader>
                <CardTitle className="text-white">Course Materials (General)</CardTitle>
                <CardDescription className="text-white">
                  Upload general course materials (optional if you upload files per module). 
                  <span className="font-semibold text-amber-400"> At least one file is required</span> - either at course level or module level.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="text-white">Upload General Course Files</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                      onChange={handleFileSelect}
                      disabled={isLoading || uploadingFiles}
                      className="cursor-pointer bg-[#3f3f3f] border-[#3f3f3f] text-white"
                    />
                    <Upload className="h-5 w-5 text-white/40" />
                  </div>
                  <p className="text-sm text-white/60">
                    Accepted formats: PDF, DOC, DOCX, TXT, PPT, PPTX
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-white">Selected Files:</Label>
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-[#3f3f3f] rounded border border-white/20"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#A78BFA]" />
                            <span className="text-sm text-white">{file.name}</span>
                            <span className="text-xs text-white/60">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            disabled={isLoading || uploadingFiles}
                            className="text-white hover:bg-white/10"
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
                className="flex-1 border-white/20 text-black hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || uploadingFiles}
                className="flex-1 bg-[#A78BFA] hover:bg-[#9333EA] text-white"
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
