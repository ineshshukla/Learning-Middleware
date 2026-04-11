"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { EnhancedMarkdown } from "@/components/enhanced-markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  approveModuleLearningObjectives,
  generateLearningObjectives,
  getCourseBlueprint,
  getModuleGoldenSample,
  updateModuleGoldenSample,
  updateModuleLearningObjectives,
  type CourseBlueprint,
  type LearningObjective,
  type ModuleGoldenSample,
} from "@/lib/instructor-api";
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  Loader2,
  PencilLine,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Target,
  Wand2,
  X,
} from "lucide-react";

type ModuleDrafts = Record<string, LearningObjective[]>;
type GoldenSampleMap = Record<string, ModuleGoldenSample>;

const statusLabel: Record<string, string> = {
  not_started: "Not Started",
  pending_review: "Needs Review",
  approved: "Approved",
  generated: "Generated",
  edited: "Edited",
  stale: "Outdated",
};

function getStatusClasses(status: string) {
  switch (status) {
    case "approved":
    case "generated":
      return "bg-green-100 text-green-800 border-green-200";
    case "edited":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "pending_review":
    case "stale":
      return "bg-amber-100 text-amber-900 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default function BlueprintStudioPage() {
  const basePath = process.env.NODE_ENV === "production" ? "/learn" : "";
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseid = params.id as string;
  const selectedModuleId = searchParams.get("module");

  const [blueprint, setBlueprint] = useState<CourseBlueprint | null>(null);
  const [draftObjectives, setDraftObjectives] = useState<ModuleDrafts>({});
  const [goldenSamples, setGoldenSamples] = useState<GoldenSampleMap>({});
  const [goldenDraft, setGoldenDraft] = useState("");
  const [activeModuleId, setActiveModuleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingObjectives, setSavingObjectives] = useState(false);
  const [approving, setApproving] = useState<Set<string>>(new Set());
  const [savingGoldenSample, setSavingGoldenSample] = useState(false);
  const [loadingGoldenSample, setLoadingGoldenSample] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeModule = useMemo(
    () => blueprint?.modules.find((module) => module.moduleid === activeModuleId) || null,
    [blueprint, activeModuleId]
  );

  const approvedCount = useMemo(
    () => blueprint?.modules.filter((module) => module.approval_status === "approved").length || 0,
    [blueprint]
  );

  useEffect(() => {
    void loadBlueprint();
  }, [courseid]);

  useEffect(() => {
    if (!blueprint || blueprint.modules.length === 0) {
      return;
    }

    const preferredModule =
      (selectedModuleId && blueprint.modules.some((module) => module.moduleid === selectedModuleId)
        ? selectedModuleId
        : blueprint.modules[0]?.moduleid) || "";

    if (!preferredModule) {
      return;
    }

    setActiveModuleId((current) => current || preferredModule);
  }, [blueprint, selectedModuleId]);

  useEffect(() => {
    if (!activeModuleId) {
      setGoldenDraft("");
      return;
    }

    void loadGoldenSample(activeModuleId);
  }, [activeModuleId]);

  async function loadBlueprint() {
    try {
      setLoading(true);
      setError("");
      const data = await getCourseBlueprint(courseid);
      setBlueprint(data);

      const initialDrafts: ModuleDrafts = {};
      data.modules.forEach((module) => {
        initialDrafts[module.moduleid] = module.learning_objectives.map((objective) => ({ ...objective }));
      });
      setDraftObjectives(initialDrafts);
    } catch (err: any) {
      setError(err.message || "Failed to load course blueprint");
    } finally {
      setLoading(false);
    }
  }

  async function loadGoldenSample(moduleId: string) {
    try {
      setLoadingGoldenSample(true);
      const sample = await getModuleGoldenSample(moduleId);
      setGoldenSamples((current) => ({
        ...current,
        [moduleId]: sample,
      }));
      if (moduleId === activeModuleId) {
        setGoldenDraft(sample.golden_sample || "");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load golden sample");
    } finally {
      setLoadingGoldenSample(false);
    }
  }

  function updateDraftObjective(moduleId: string, objectiveId: string, value: string) {
    setDraftObjectives((current) => ({
      ...current,
      [moduleId]: (current[moduleId] || []).map((objective) =>
        objective.objective_id === objectiveId
          ? { ...objective, text: value, edited: true, approved: false }
          : objective
      ),
    }));
  }

  function addObjective(moduleId: string) {
    const currentObjectives = draftObjectives[moduleId] || [];
    const nextObjective: LearningObjective = {
      objective_id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: "",
      order_index: currentObjectives.length,
      edited: true,
      approved: false,
    };

    setDraftObjectives((current) => ({
      ...current,
      [moduleId]: [...currentObjectives, nextObjective],
    }));
  }

  function removeObjective(moduleId: string, objectiveId: string) {
    setDraftObjectives((current) => ({
      ...current,
      [moduleId]: (current[moduleId] || [])
        .filter((objective) => objective.objective_id !== objectiveId)
        .map((objective, index) => ({ ...objective, order_index: index })),
    }));
  }

  async function handleGenerateObjectives() {
    if (!activeModule) {
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setSuccess("");
      await generateLearningObjectives(courseid, [activeModule.title], 6);
      await loadBlueprint();
      setSuccess("KLI drafted a fresh set of learning objectives for this module.");
    } catch (err: any) {
      setError(err.message || "Failed to generate learning objectives");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveObjectives() {
    if (!activeModule) {
      return;
    }

    try {
      setSavingObjectives(true);
      setError("");
      setSuccess("");
      const objectiveTexts = (draftObjectives[activeModule.moduleid] || [])
        .map((objective) => objective.text.trim())
        .filter(Boolean);

      await updateModuleLearningObjectives(activeModule.moduleid, objectiveTexts);
      await loadBlueprint();
      setSuccess("Saved the draft learning objectives. The module now needs instructor approval.");
    } catch (err: any) {
      setError(err.message || "Failed to save learning objectives");
    } finally {
      setSavingObjectives(false);
    }
  }

  async function handleApproveModule() {
    if (!activeModule) {
      return;
    }

    const moduleId = activeModule.moduleid;
    try {
      setApproving((prev) => new Set(prev).add(moduleId));
      setError("");
      setSuccess("");
      const objectiveTexts = (draftObjectives[moduleId] || [])
        .map((objective) => objective.text.trim())
        .filter(Boolean);

      if (objectiveTexts.length === 0) {
        throw new Error("Add at least one learning objective before approval.");
      }

      const result = await approveModuleLearningObjectives(moduleId, objectiveTexts);
      await loadBlueprint();
      await loadGoldenSample(moduleId);
      setGoldenDraft(result.golden_sample || "");
      setSuccess("Module approved and golden sample generated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to approve the module blueprint");
    } finally {
      setApproving((prev) => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
    }
  }

  async function handleSaveGoldenSample() {
    if (!activeModule) {
      return;
    }

    try {
      setSavingGoldenSample(true);
      setError("");
      setSuccess("");
      const updatedSample = await updateModuleGoldenSample(activeModule.moduleid, goldenDraft);
      setGoldenSamples((current) => ({
        ...current,
        [activeModule.moduleid]: updatedSample,
      }));
      await loadBlueprint();
      setSuccess("Golden sample updated. Learner personalization will now use the edited version.");
    } catch (err: any) {
      setError(err.message || "Failed to save the golden sample");
    } finally {
      setSavingGoldenSample(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main
          className="pt-16 min-h-screen flex items-center justify-center"
          style={{
            backgroundImage: `url(${basePath}/lmw_bg_stacked_waves.png)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#fff4ec",
          }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </main>
      </>
    );
  }

  if (!blueprint) {
    return (
      <>
        <Header />
        <main
          className="pt-16 min-h-screen flex items-center justify-center"
          style={{
            backgroundImage: `url(${basePath}/lmw_bg_stacked_waves.png)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#fff4ec",
          }}
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-3">Blueprint not found</h1>
            <Button onClick={() => router.push(`/instructor/courses/${courseid}`)}>Back to Course</Button>
          </div>
        </main>
      </>
    );
  }

  const activeObjectives = activeModule ? draftObjectives[activeModule.moduleid] || [] : [];
  const activeGoldenSample = activeModule ? goldenSamples[activeModule.moduleid] : undefined;

  return (
    <>
      <Header />
      <main
        className="pt-16 min-h-screen"
        style={{
          backgroundImage: `url(${basePath}/lmw_bg_stacked_waves.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#fff4ec",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm">
                <Sparkles className="h-4 w-4" />
                KLI Blueprint Studio
              </div>
              <h1 className="mt-4 text-4xl font-bold text-gray-800">{blueprint.course_name}</h1>
              <p className="mt-2 max-w-3xl text-lg text-gray-600">
                Review KLI-drafted learning objectives, approve the instructor golden sample, and keep the learner-facing blueprint up to date.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-orange-200 bg-white text-gray-700">
                <ClipboardCheck className="mr-1 h-3.5 w-3.5 text-orange-500" />
                {approvedCount}/{blueprint.modules.length} Approved
              </Badge>
              <Badge className="border-orange-200 bg-white text-gray-700">
                <BookOpen className="mr-1 h-3.5 w-3.5 text-orange-500" />
                {blueprint.modules.length} Modules
              </Badge>
              <Button
                variant="outline"
                onClick={() => router.push(`/instructor/courses/${courseid}`)}
                className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
              >
                Back to Course
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
              <AlertDescription className="text-red-900">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertDescription className="text-green-900">{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="bg-white/90 border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-800">Modules</CardTitle>
                <CardDescription className="text-gray-600">
                  Pick a module to review its objectives and golden sample.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {blueprint.modules.map((module, index) => {
                  const isActive = module.moduleid === activeModuleId;
                  return (
                    <button
                      key={module.moduleid}
                      onClick={() => setActiveModuleId(module.moduleid)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? "border-orange-300 bg-orange-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                            Module {index + 1}
                          </p>
                          <h3 className="mt-1 font-semibold text-gray-800">{module.title}</h3>
                        </div>
                        <Badge className={getStatusClasses(module.approval_status)}>
                          {statusLabel[module.approval_status] || module.approval_status}
                        </Badge>
                      </div>
                      {module.learning_intent && (
                        <p className="mt-3 line-clamp-3 text-sm text-gray-600">{module.learning_intent}</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge className={getStatusClasses(module.golden_sample_status)}>
                          <FileStack className="mr-1 h-3 w-3" />
                          {statusLabel[module.golden_sample_status] || module.golden_sample_status}
                        </Badge>
                        <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                          {module.learning_objectives.length} LOs
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {activeModule ? (
              <div className="space-y-6">
                <Card className="bg-white/90 border-gray-200 shadow-lg">
                  <CardHeader>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="border-orange-200 bg-orange-50 text-orange-800">
                            <Target className="mr-1 h-3 w-3" />
                            {statusLabel[activeModule.approval_status] || activeModule.approval_status}
                          </Badge>
                          <Badge className={getStatusClasses(activeModule.golden_sample_status)}>
                            <Wand2 className="mr-1 h-3 w-3" />
                            {statusLabel[activeModule.golden_sample_status] || activeModule.golden_sample_status}
                          </Badge>
                        </div>
                        <div>
                          <CardTitle className="text-2xl text-gray-800">{activeModule.title}</CardTitle>
                          <CardDescription className="mt-2 text-base text-gray-600">
                            {activeModule.description || "No module description yet."}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          onClick={handleGenerateObjectives}
                          disabled={generating}
                          className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                        >
                          {generating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCcw className="mr-2 h-4 w-4" />
                          )}
                          Regenerate KLI LOs
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleSaveObjectives}
                          disabled={savingObjectives}
                          className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                        >
                          {savingObjectives ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save Draft
                        </Button>
                        <Button
                          onClick={handleApproveModule}
                          disabled={approving.has(activeModule.moduleid)}
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          {approving.has(activeModule.moduleid) ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Approve And Build Golden Sample
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">Module Learning Intent</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {activeModule.learning_intent || "Add a learning intent from the module editor to enable the KLI flow."}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-800">Learning Objectives</h2>
                          <p className="text-sm text-gray-600">
                            Edit the draft objectives until they reflect what should be stored as the instructor-approved blueprint.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addObjective(activeModule.moduleid)}
                          className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Objective
                        </Button>
                      </div>

                      {activeObjectives.length === 0 ? (
                        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-slate-50 p-10 text-center">
                          <p className="text-gray-600">
                            No objectives drafted yet. Generate a KLI draft or add your own objectives manually.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeObjectives.map((objective, index) => (
                            <div
                              key={objective.objective_id}
                              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                            >
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                                    LO {index + 1}
                                  </Badge>
                                  {objective.generated_by_kli && (
                                    <Badge className="border-orange-200 bg-orange-100 text-orange-800">KLI Draft</Badge>
                                  )}
                                  {objective.edited && (
                                    <Badge className="border-blue-200 bg-blue-100 text-blue-800">Edited</Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeObjective(activeModule.moduleid, objective.objective_id)}
                                  className="text-gray-500 hover:bg-red-50 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <Textarea
                                value={objective.text}
                                onChange={(event) =>
                                  updateDraftObjective(activeModule.moduleid, objective.objective_id, event.target.value)
                                }
                                rows={3}
                                className="border-gray-200 bg-slate-50 text-gray-800"
                              />
                              {(objective.knowledge_component || objective.learning_process || objective.instructional_principle) && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {objective.knowledge_component && (
                                    <Badge className="border-purple-200 bg-purple-50 text-purple-800">
                                      KC: {objective.knowledge_component}
                                    </Badge>
                                  )}
                                  {objective.learning_process && (
                                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                      Process: {objective.learning_process}
                                    </Badge>
                                  )}
                                  {objective.instructional_principle && (
                                    <Badge className="border-sky-200 bg-sky-50 text-sky-800">
                                      Instruction: {objective.instructional_principle}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {objective.rationale && (
                                <p className="mt-3 text-sm text-gray-600">
                                  <span className="font-medium text-gray-800">KLI rationale:</span> {objective.rationale}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-gray-200 shadow-lg">
                  <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="text-xl text-gray-800">Golden Sample</CardTitle>
                        <CardDescription className="text-gray-600">
                          This is the canonical instructor-approved sample that learner personalization will adapt.
                        </CardDescription>
                      </div>
                      <Button
                        onClick={handleSaveGoldenSample}
                        disabled={savingGoldenSample || !activeGoldenSample || activeGoldenSample.status === "not_started"}
                        className="bg-[#1f7a8c] hover:bg-[#176170] text-white"
                      >
                        {savingGoldenSample ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PencilLine className="mr-2 h-4 w-4" />
                        )}
                        Save Golden Sample
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingGoldenSample ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                      </div>
                    ) : !activeGoldenSample || activeGoldenSample.status === "not_started" ? (
                      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-slate-50 p-10 text-center">
                        <p className="text-gray-600">
                          Approve this module&apos;s learning objectives to generate the instructor golden sample.
                        </p>
                      </div>
                    ) : (
                      <Tabs defaultValue="editor" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-100">
                          <TabsTrigger value="editor">Editor</TabsTrigger>
                          <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>
                        <TabsContent value="editor" className="mt-4 space-y-4">
                          {activeGoldenSample.subtopics.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {activeGoldenSample.subtopics.map((subtopic) => (
                                <Badge
                                  key={subtopic.title}
                                  className="border-orange-200 bg-orange-50 text-orange-800"
                                >
                                  {subtopic.title}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <Alert className="border-blue-200 bg-blue-50">
                            <AlertDescription className="text-blue-900">
                              Keep the `##` section headings intact when editing so the learner personalization agent can safely transform the approved sample.
                            </AlertDescription>
                          </Alert>
                          <Textarea
                            value={goldenDraft}
                            onChange={(event) => setGoldenDraft(event.target.value)}
                            rows={24}
                            className="min-h-[520px] border-gray-200 bg-slate-50 font-mono text-sm text-gray-800"
                          />
                        </TabsContent>
                        <TabsContent value="preview" className="mt-4">
                          <div className="rounded-3xl border border-gray-200 bg-white p-6">
                            <div className="prose prose-slate max-w-none">
                              <EnhancedMarkdown content={goldenDraft || activeGoldenSample.golden_sample} />
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-white/90 border-gray-200 shadow-lg">
                <CardContent className="py-16 text-center text-gray-600">
                  Select a module to start reviewing its blueprint.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
