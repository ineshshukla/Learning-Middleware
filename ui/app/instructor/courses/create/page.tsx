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
import { Plus, X, Upload, FileText, Sparkles } from "lucide-react";
import { Header } from "@/components/header";
import {
  uploadModuleFiles,
  createVectorStore,
  updateModuleLearningObjectives,
} from "@/lib/instructor-api";

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
  learningOutcomes: string;
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
    { title: "", description: "", learningOutcomes: "", files: [] },
  ]);

  const [files, setFiles] = useState<File[]>([]);

  const handleAddModule = () => {
    setModules([...modules, { title: "", description: "", learningOutcomes: "", files: [] }]);
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

      const moduleMissingOutcomes = validModules.find(
        (m) => !m.learningOutcomes || m.learningOutcomes.trim() === ""
      );
      if (moduleMissingOutcomes) {
        throw new Error("Each module must include natural-language learning outcomes.");
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

      // Step 2: Save instructor-provided module outcomes as learning objectives
      if (createdCourse.modules && createdCourse.modules.length > 0) {
        for (let i = 0; i < validModules.length; i++) {
          const module = validModules[i];
          const createdModule = createdCourse.modules[i];

          const learningObjectives = module.learningOutcomes
            .split(/\n+/)
            .map((item) => item.replace(/^[-*•\d.)\s]+/, "").trim())
            .filter((item) => item.length > 0);

          if (learningObjectives.length === 0) {
            throw new Error(`Module \"${module.title}\" must include at least one valid learning outcome.`);
          }

          await updateModuleLearningObjectives(createdModule.moduleid, learningObjectives);
        }
      }

      // Step 3: Upload course-level files (if any)
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

      // Step 4: Upload module-level files (if any)
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

      // Step 5: Create vector store automatically after all files are uploaded
      console.log("Creating vector store for course...");
      try {
        await createVectorStore(courseid);
        console.log("Vector store created successfully");
      } catch (vsErr: any) {
        console.error("Failed to create vector store:", vsErr);
        // Don't fail the whole process if vector store creation fails
      }

      setUploadingFiles(false);

      // Step 6: Redirect to processing page for KLI workflow
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
      <main className="pt-24 min-h-screen bg-[#FFE9DD] font-sans">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Hero Section */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fff5f0] text-[#3d2c24] font-semibold text-sm mb-6 border border-[#f0e0d6]">
              <Sparkles className="h-4 w-4 text-[#ffc09f]" />
              <span>Create New Course</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-[#3d2c24] mb-4">
              Build Your <span className="text-[#ff9f6b]">Course</span>
            </h1>
            <p className="text-xl text-[#7a6358] max-w-2xl mx-auto">
              Set up your course details and modules
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            {/* Course Details Card */}
            <Card className="warm-card">
              <CardHeader>
                <CardTitle className="text-[#3d2c24]">Course Information</CardTitle>
                <CardDescription className="text-[#7a6358]">Basic details about your course</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course_name" className="text-[#3d2c24]">Course Name *</Label>
                  <Input
                    id="course_name"
                    placeholder="e.g., Introduction to Machine Learning"
                    value={courseData.course_name}
                    onChange={(e) =>
                      setCourseData({ ...courseData, course_name: e.target.value })
                    }
                    required
                    disabled={isLoading}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coursedescription" className="text-[#3d2c24]">Course Description</Label>
                  <Textarea
                    id="coursedescription"
                    placeholder="Describe what students will learn in this course..."
                    value={courseData.coursedescription}
                    onChange={(e) =>
                      setCourseData({ ...courseData, coursedescription: e.target.value })
                    }
                    rows={4}
                    disabled={isLoading}
                    className="bg-white border-[#f0e0d6] text-[#3d2c24] placeholder:text-[#7a6358]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetaudience" className="text-[#3d2c24]">Target Audience *</Label>
                  <Select
                    value={courseData.targetaudience}
                    onValueChange={(value) =>
                      setCourseData({ ...courseData, targetaudience: value })
                    }
                    disabled={isLoading}
                    required
                  >
                    <SelectTrigger className="bg-white border-[#f0e0d6] text-[#3d2c24]">
                      <SelectValue placeholder="Select target audience" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#f0e0d6]">
                      {TARGET_AUDIENCES.map((audience) => (
                        <SelectItem key={audience} value={audience} className="text-[#3d2c24] hover:bg-[#fff5f0] focus:bg-[#fff5f0]">
                          {audience}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prereqs" className="text-[#3d2c24]">Prerequisites</Label>
                  <Textarea
                    id="prereqs"
                    placeholder="e.g., Basic Python, Linear Algebra, Statistics"
                    value={courseData.prereqs}
                    onChange={(e) =>
                      setCourseData({ ...courseData, prereqs: e.target.value })
                    }
                    rows={2}
                    disabled={isLoading}
                    className="bg-white border-[#f0e0d6] text-[#3d2c24] placeholder:text-[#7a6358]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Modules Card */}
            <Card className="warm-card">
              <CardHeader>
                <CardTitle className="text-[#3d2c24]">Course Modules</CardTitle>
                <CardDescription className="text-[#7a6358]">Add modules to organize your course content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map((module, index) => (
                  <div key={index} className="p-4 border border-[#f0e0d6] rounded-lg space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold text-[#3d2c24]">Module {index + 1}</Label>
                      {modules.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveModule(index)}
                          disabled={isLoading}
                          className="text-[#7a6358] hover:bg-[#fff5f0] hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`module-title-${index}`} className="text-[#3d2c24]">Module Title *</Label>
                      <Input
                        id={`module-title-${index}`}
                        placeholder="e.g., Introduction to Neural Networks"
                        value={module.title}
                        onChange={(e) => handleModuleChange(index, "title", e.target.value)}
                        disabled={isLoading}
                        className="bg-[#fff5f0] border-[#f0e0d6]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`module-description-${index}`} className="text-[#3d2c24]">Module Description</Label>
                      <Textarea
                        id={`module-description-${index}`}
                        placeholder="Describe what this module covers... (optional)"
                        value={module.description || ""}
                        onChange={(e) => handleModuleChange(index, "description", e.target.value)}
                        disabled={isLoading}
                        rows={3}
                        className="bg-[#fff5f0] border-[#f0e0d6] text-[#3d2c24] placeholder:text-[#7a6358]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`module-outcomes-${index}`} className="text-[#3d2c24]">
                        Module Learning Outcomes *
                      </Label>
                      <Textarea
                        id={`module-outcomes-${index}`}
                        placeholder={"Write natural-language outcomes, one per line.\nExample: Explain gradient descent in your own words."}
                        value={module.learningOutcomes}
                        onChange={(e) => handleModuleChange(index, "learningOutcomes", e.target.value)}
                        disabled={isLoading}
                        rows={4}
                        required
                        className="bg-[#fff5f0] border-[#f0e0d6] text-[#3d2c24] placeholder:text-[#7a6358]"
                      />
                      <p className="text-xs text-[#7a6358]">
                        Required. These outcomes are used directly for KLI generation.
                      </p>
                    </div>

                    {/* Module File Upload */}
                    <div className="space-y-2 border-t border-[#f0e0d6] pt-3">
                      <Label htmlFor={`module-files-${index}`} className="text-[#3d2c24]">Module Files (Optional)</Label>
                      <Input
                        id={`module-files-${index}`}
                        type="file"
                        multiple
                        accept=".pdf,.txt,.md"
                        onChange={(e) => handleModuleFileSelect(index, e)}
                        disabled={isLoading}
                        className="cursor-pointer bg-[#fff5f0] border-[#f0e0d6]"
                      />
                      <p className="text-xs text-[#7a6358]">
                        Upload files specific to this module (PDF, TXT, MD)
                      </p>

                      {module.files && module.files.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {module.files.map((file, fileIndex) => (
                            <div
                              key={fileIndex}
                              className="flex items-center justify-between p-2 bg-[#fff5f0] rounded border border-[#f0e0d6]"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3 text-[#ffc09f]" />
                                <span className="text-xs text-[#3d2c24]">{file.name}</span>
                                <span className="text-xs text-[#7a6358]">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveModuleFile(index, fileIndex)}
                                disabled={isLoading}
                                className="text-[#7a6358] hover:bg-white hover:text-red-600"
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
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Module
                </Button>
              </CardContent>
            </Card>

            {/* File Upload Card */}
            <Card className="warm-card">
              <CardHeader>
                <CardTitle className="text-[#3d2c24]">Course Materials (General)</CardTitle>
                <CardDescription className="text-[#7a6358]">
                  Upload general course materials (optional if you upload files per module).
                  <span className="font-semibold text-amber-600"> At least one file is required</span> - either at course level or module level.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="text-[#3d2c24]">Upload General Course Files</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                      onChange={handleFileSelect}
                      disabled={isLoading || uploadingFiles}
                      className="cursor-pointer bg-white border-[#f0e0d6]"
                    />
                    <Upload className="h-5 w-5 text-[#7a6358]" />
                  </div>
                  <p className="text-sm text-[#7a6358]">
                    Accepted formats: PDF, DOC, DOCX, TXT, PPT, PPTX
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-[#3d2c24]">Selected Files:</Label>
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white rounded border border-[#f0e0d6]"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#ffc09f]" />
                            <span className="text-sm text-[#3d2c24]">{file.name}</span>
                            <span className="text-xs text-[#7a6358]">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            disabled={isLoading || uploadingFiles}
                            className="text-[#7a6358] hover:bg-[#fff5f0] hover:text-red-600"
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
                className="flex-1"
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
