"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/header";
import { Loader2, Save, Plus, X, Edit2, Check } from "lucide-react";
import {
  getCourse,
  getModuleLearningObjectives,
  updateModuleLearningObjectives,
  generateLearningObjectives,
  getVectorStoreStatus,
} from "@/lib/instructor-api";
import type { CourseWithModules } from "@/lib/instructor-api";

interface LearningObjective {
  objective_id: string;
  text: string;
  order_index: number;
  generated_by_sme?: boolean;
  edited?: boolean;
}

interface ModuleLOs {
  module_id: string;
  module_name: string;
  learning_objectives: LearningObjective[];
}

export default function EditLearningObjectivesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseid = params.id as string;
  const selectedModuleId = searchParams.get('module');

  const [course, setCourse] = useState<CourseWithModules | null>(null);
  const [moduleLOs, setModuleLOs] = useState<Record<string, ModuleLOs>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeModule, setActiveModule] = useState<string>("");
  const [editingLO, setEditingLO] = useState<string | null>(null);

  useEffect(() => {
    loadCourseAndLOs();
  }, [courseid]);

  useEffect(() => {
    // Update active module when URL parameter changes
    if (course && selectedModuleId) {
      const moduleExists = course.modules.find(m => m.moduleid === selectedModuleId);
      if (moduleExists) {
        setActiveModule(selectedModuleId);
      }
    }
  }, [selectedModuleId, course]);

  const loadCourseAndLOs = async () => {
    try {
      setLoading(true);
      const courseData = await getCourse(courseid);
      setCourse(courseData);

      if (courseData.modules.length > 0) {
        // Set active module based on URL parameter or default to first module
        const moduleToActivate = selectedModuleId && 
          courseData.modules.find(m => m.moduleid === selectedModuleId) 
          ? selectedModuleId 
          : courseData.modules[0].moduleid;
        setActiveModule(moduleToActivate);

        // Load LOs for each module
        const losData: Record<string, ModuleLOs> = {};
        for (const module of courseData.modules) {
          try {
            const los = await getModuleLearningObjectives(module.moduleid);
            losData[module.moduleid] = los;
          } catch (err) {
            console.error(`Failed to load LOs for module ${module.moduleid}:`, err);
            losData[module.moduleid] = {
              module_id: module.moduleid,
              module_name: module.title,
              learning_objectives: [],
            };
          }
        }
        setModuleLOs(losData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load course data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLOs = async () => {
    if (!course || !activeModule) return;

    try {
      setGenerating(true);
      setError("");
      setSuccess("");

      // Check vector store status first
      const vsStatus = await getVectorStoreStatus(courseid);
      if (vsStatus.status !== "ready") {
        throw new Error(
          "Vector store is not ready. Please ensure course materials are uploaded and processed."
        );
      }

      // Find the active module and generate LOs only for it
      const activeModuleData = course.modules.find(m => m.moduleid === activeModule);
      if (!activeModuleData) {
        throw new Error("Selected module not found");
      }

      await generateLearningObjectives(courseid, [activeModuleData.title], 6);

      setSuccess("Learning objectives generated successfully for this module!");
      
      // Reload LOs
      await loadCourseAndLOs();
    } catch (err: any) {
      setError(err.message || "Failed to generate learning objectives");
    } finally {
      setGenerating(false);
    }
  };

  const handleAddLO = (moduleid: string) => {
    const moduleData = moduleLOs[moduleid];
    if (!moduleData) return;

    // Generate unique ID using timestamp and random number to avoid collisions
    const uniqueId = `lo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newLO: LearningObjective = {
      objective_id: uniqueId,
      text: "",
      order_index: moduleData.learning_objectives.length,
      edited: true,
    };

    setModuleLOs({
      ...moduleLOs,
      [moduleid]: {
        ...moduleData,
        learning_objectives: [...moduleData.learning_objectives, newLO],
      },
    });

    setEditingLO(newLO.objective_id);
  };

  const handleRemoveLO = (moduleid: string, objectiveId: string) => {
    const moduleData = moduleLOs[moduleid];
    if (!moduleData) return;

    setModuleLOs({
      ...moduleLOs,
      [moduleid]: {
        ...moduleData,
        learning_objectives: moduleData.learning_objectives.filter(
          (lo) => lo.objective_id !== objectiveId
        ),
      },
    });
  };

  const handleUpdateLOText = (moduleid: string, objectiveId: string, text: string) => {
    const moduleData = moduleLOs[moduleid];
    if (!moduleData) return;

    setModuleLOs({
      ...moduleLOs,
      [moduleid]: {
        ...moduleData,
        learning_objectives: moduleData.learning_objectives.map((lo) =>
          lo.objective_id === objectiveId ? { ...lo, text, edited: true } : lo
        ),
      },
    });
  };

  const handleSaveLOs = async (moduleid: string) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const moduleData = moduleLOs[moduleid];
      if (!moduleData) return;

      const loTexts = moduleData.learning_objectives
        .filter((lo) => lo.text.trim() !== "")
        .map((lo) => lo.text);

      await updateModuleLearningObjectives(moduleid, loTexts);

      setSuccess("Learning objectives saved successfully!");
      setEditingLO(null);

      // Reload LOs to get updated data
      const updatedLOs = await getModuleLearningObjectives(moduleid);
      setModuleLOs({
        ...moduleLOs,
        [moduleid]: updatedLOs,
      });
    } catch (err: any) {
      setError(err.message || "Failed to save learning objectives");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </main>
      </>
    );
  }

  if (!course) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h1>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Learning Objectives</h1>
                <p className="text-xl text-slate-600 mt-2">{course.course_name}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleGenerateLOs}
                  disabled={generating || course.modules.length === 0 || !activeModule}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>Generate LOs for Current Module</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => router.push(`/instructor/courses/${courseid}`)}>
                  Back to Course
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {course.modules.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600">No modules found. Please add modules to your course first.</p>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeModule} onValueChange={setActiveModule}>
              <TabsList className="mb-6">
                {course.modules.map((module) => (
                  <TabsTrigger key={module.moduleid} value={module.moduleid}>
                    {module.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {course.modules.map((module) => {
                const moduleData = moduleLOs[module.moduleid];
                const objectives = moduleData?.learning_objectives || [];

                return (
                  <TabsContent key={module.moduleid} value={module.moduleid}>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{module.title}</CardTitle>
                            <CardDescription>{module.description || "No description"}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddLO(module.moduleid)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add LO
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveLOs(module.moduleid)}
                              disabled={saving}
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              Save
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {objectives.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-600 mb-4">
                              No learning objectives yet. Generate them with AI or add manually.
                            </p>
                            <Button onClick={() => handleAddLO(module.moduleid)} variant="outline">
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Learning Objective
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {objectives.map((lo, idx) => (
                              <div
                                key={lo.objective_id}
                                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                              >
                                <span className="font-semibold text-gray-600 mt-2">{idx + 1}.</span>
                                {editingLO === lo.objective_id ? (
                                  <Textarea
                                    value={lo.text}
                                    onChange={(e) =>
                                      handleUpdateLOText(module.moduleid, lo.objective_id, e.target.value)
                                    }
                                    className="flex-1"
                                    rows={2}
                                    autoFocus
                                  />
                                ) : (
                                  <p className="flex-1 mt-2">{lo.text}</p>
                                )}
                                <div className="flex gap-2">
                                  {editingLO === lo.objective_id ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingLO(null)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingLO(lo.objective_id)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveLO(module.moduleid, lo.objective_id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>
      </main>
    </>
  );
}
