"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { Header } from "@/components/header";
import {
  getVectorStoreStatus,
  initKliPipeline,
  getKliPipelineStatus,
  runKliPipeline,
  generateKliModuleContent,
  type KliJobSummary,
} from "@/lib/instructor-api";

type VectorStoreStatus = "not_started" | "creating" | "ready" | "failed";

export default function CourseProcessingPage() {
  const basePath = process.env.NODE_ENV === 'production' ? '/learn' : '';
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseid = params.id as string;
  
  const [moduleNames, setModuleNames] = useState<string[]>([]);
  const [vsStatus, setVsStatus] = useState<VectorStoreStatus>("creating");
  const [vsMessage, setVsMessage] = useState("");
  const [loStatus, setLoStatus] = useState<"pending" | "generating" | "completed" | "failed">("pending");
  const [loMessage, setLoMessage] = useState("");
  const [pipelineInitDone, setPipelineInitDone] = useState(false);
  const [pipelineStats, setPipelineStats] = useState<{
    total: number;
    queued: number;
    inProgress: number;
    reviewPending: number;
    approved: number;
    failed: number;
    currentLabel: string;
  }>({
    total: 0,
    queued: 0,
    inProgress: 0,
    reviewPending: 0,
    approved: 0,
    failed: 0,
    currentLabel: "",
  });
  const [jobs, setJobs] = useState<KliJobSummary[]>([]);
  const [isStartingPipeline, setIsStartingPipeline] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [contentMessage, setContentMessage] = useState("");
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const maxPolls = 60; // 5 minutes max (5 sec intervals)

  const refreshKliPipelineStatus = async () => {
    try {
      const status = await getKliPipelineStatus(courseid);
      setPipelineStats({
        total: status.total_jobs,
        queued: status.queued_jobs,
        inProgress: status.in_progress_jobs,
        reviewPending: status.review_pending_jobs,
        approved: status.approved_jobs,
        failed: status.failed_jobs,
        currentLabel: status.current_job
          ? `${status.current_job.module_title || status.current_job.module_id} -> ${status.current_job.lo_text}`
          : "",
      });
      setJobs(status.jobs || []);

      if (status.total_jobs === 0) {
        setLoStatus("completed");
        setLoMessage("No learning objectives found to process. Please add LOs first.");
        return;
      }

      const isDone = status.approved_jobs + status.failed_jobs >= status.total_jobs;
      if (isDone) {
        if (status.failed_jobs > 0) {
          setLoStatus("failed");
          setLoMessage(
            `Processing completed with ${status.failed_jobs} failed LO(s). Review course status for details.`
          );
        } else {
          setLoStatus("completed");
          setLoMessage("All LOs are processed. Complete approvals, then generate module content.");
        }
      } else if (status.in_progress_jobs > 0) {
        setLoStatus("generating");
        setLoMessage("KLI worker is processing LOs asynchronously. You can monitor live progress.");
      } else {
        setLoStatus("pending");
        setLoMessage("KLI jobs are queued. Start KLI generation when you are ready.");
      }
    } catch (err: any) {
      setLoStatus("failed");
      setLoMessage(err.message || "Failed to fetch KLI pipeline status");
      setError(err.message || "Failed to fetch KLI pipeline status");
    }
  };

  useEffect(() => {
    // Parse module names from query param
    const modulesParam = searchParams.get("modules");
    if (modulesParam) {
      try {
        const names = JSON.parse(decodeURIComponent(modulesParam));
        setModuleNames(names);
      } catch (e) {
        console.error("Failed to parse module names:", e);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!courseid) return;

    const initializeKliPipeline = async () => {
      setLoStatus("pending");
      setLoMessage("Queuing module learning objectives for KLI workflow...");

      try {
        await initKliPipeline(courseid, false);
        setPipelineInitDone(true);
        await refreshKliPipelineStatus();
      } catch (err: any) {
        setLoStatus("failed");
        setLoMessage(err.message || "Failed to initialize KLI pipeline");
        setError(err.message || "Failed to initialize KLI pipeline");
      }
    };

    const pollVectorStore = async () => {
      try {
        const status = await getVectorStoreStatus(courseid);
        setVsStatus(status.status);
        setVsMessage(status.message || "");

        if (status.status === "ready") {
          if (!pipelineInitDone) {
            await initializeKliPipeline();
          } else {
            await refreshKliPipelineStatus();
          }
        } else if (status.status === "failed") {
          setError(status.error || "Vector store creation failed");
        } else if (status.status === "creating") {
          if (pollCount < maxPolls) {
            setPollCount(prev => prev + 1);
            setTimeout(pollVectorStore, 5000);
          } else {
            setError("Vector store creation is taking too long. Please check back later.");
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to check vector store status");
      }
    };

    pollVectorStore();
  }, [courseid, moduleNames, pipelineInitDone, pollCount, router]);

  useEffect(() => {
    if (!courseid || !pipelineInitDone || vsStatus !== "ready") {
      return;
    }

    const interval = setInterval(() => {
      refreshKliPipelineStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [courseid, pipelineInitDone, vsStatus]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "creating":
      case "generating":
      case "pending":
        return <Loader2 className="h-6 w-6 animate-spin text-orange-500" />;
      case "ready":
      case "completed":
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case "failed":
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "creating":
        return "In Progress";
      case "ready":
        return "Completed";
      case "failed":
        return "Failed";
      case "generating":
        return "Generating";
      case "completed":
        return "Completed";
      case "pending":
        return "Waiting";
      default:
        return status;
    }
  };

  const allApproved =
    pipelineStats.total > 0 &&
    pipelineStats.approved === pipelineStats.total &&
    pipelineStats.failed === 0;

  const canStartPipeline =
    pipelineInitDone &&
    pipelineStats.queued > 0 &&
    pipelineStats.inProgress === 0;

  const handleStartKliPipeline = async () => {
    setError("");
    setIsStartingPipeline(true);

    try {
      await runKliPipeline(courseid);
      setLoStatus("generating");
      setLoMessage("KLI generation started. Processing queued objectives...");
      await refreshKliPipelineStatus();
    } catch (err: any) {
      setError(err.message || "Failed to start KLI pipeline worker");
    } finally {
      setIsStartingPipeline(false);
    }
  };

  const handleGenerateModuleContent = async () => {
    setError("");
    setContentMessage("");
    setIsGeneratingContent(true);

    try {
      const result = await generateKliModuleContent(courseid);
      setContentMessage(
        `${result.message} Generated modules: ${result.generated_modules}.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to generate module content");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen" style={{
        backgroundImage: `url(${basePath}/lmw_bg_stacked_waves.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#fff4ec'
      }}>
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Processing Your Course
            </h1>
            <p className="text-xl text-gray-600">
              Please wait while we set up your course materials...
            </p>
            <div className="mt-4">
              <Button
                variant="outline"
                className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                onClick={() => router.push(`/instructor/courses/${courseid}`)}
              >
                Continue in Background
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
              <AlertDescription className="text-red-900">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Vector Store Status */}
            <Card className="bg-white border-gray-200 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                      <FileText className="h-5 w-5 text-orange-500" />
                      Vector Store Creation
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Processing course materials for AI-powered features
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(vsStatus)}
                    <span className="font-medium text-gray-700">{getStatusText(vsStatus)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{vsMessage}</p>
                {vsStatus === "creating" && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((pollCount / maxPolls) * 100, 95)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      This may take a few minutes depending on file size...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Learning Objectives Generation Status */}
            <Card className="bg-white border-gray-200 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                      <CheckCircle2 className="h-5 w-5 text-orange-500" />
                      KLI Quorum + Golden Pipeline
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Per-LO async planning, review, and golden-sample generation
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(loStatus)}
                    <span className="font-medium text-gray-700">{getStatusText(loStatus)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {loMessage || "Waiting for vector store to complete..."}
                </p>
                {loStatus === "generating" && (
                  <div className="mt-4">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-orange-500" />
                  </div>
                )}
                {moduleNames.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Modules:</p>
                    <ul className="space-y-1">
                      {moduleNames.map((name, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="w-2 h-2 bg-orange-500 rounded-full" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pipelineStats.total > 0 && (
                  <div className="mt-4 space-y-1 text-sm text-gray-700">
                    <p>Total LOs: {pipelineStats.total}</p>
                    <p>Queued: {pipelineStats.queued}</p>
                    <p>In Progress: {pipelineStats.inProgress}</p>
                    <p>Review Pending: {pipelineStats.reviewPending}</p>
                    <p>Approved: {pipelineStats.approved}</p>
                    <p>Failed: {pipelineStats.failed}</p>
                    {pipelineStats.currentLabel && <p>Current: {pipelineStats.currentLabel}</p>}
                  </div>
                )}
                <div className="mt-4">
                  <Button
                    onClick={handleStartKliPipeline}
                    disabled={!canStartPipeline || isStartingPipeline}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isStartingPipeline ? "Starting..." : "Start KLI + Golden Generation"}
                  </Button>
                  {pipelineInitDone && pipelineStats.queued > 0 && pipelineStats.inProgress === 0 && (
                    <p className="text-xs text-amber-700 mt-2">
                      Generation is queued but not running. Start when ready.
                    </p>
                  )}
                </div>
                {jobs.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">LO Jobs</p>
                    <div className="space-y-2 max-h-72 overflow-auto pr-1">
                      {jobs.map((job) => {
                        const reviewReady =
                          job.plan_ready ||
                          job.golden_ready ||
                          ["review_pending", "approved", "failed"].includes(job.status);

                        return (
                          <div
                            key={job.job_id}
                            className="border rounded-md border-gray-200 bg-gray-50 p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {job.module_title || job.module_id}
                              </p>
                              <p className="text-xs text-gray-600 truncate">{job.lo_text}</p>
                              {!reviewReady && (
                                <p className="text-xs text-amber-700 mt-1">Locked until generation completes</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className="bg-white text-gray-700 border-gray-300">
                                {job.status}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!reviewReady}
                                className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                                onClick={() => router.push(`/instructor/courses/${courseid}/process/${job.job_id}`)}
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-6 border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Generate Module Content</p>
                      <p className="text-xs text-gray-600">
                        Enabled only after every KLI job is approved.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateModuleContent}
                      disabled={!allApproved || isGeneratingContent}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {isGeneratingContent ? "Generating..." : "Generate Module Content"}
                    </Button>
                  </div>
                  {!allApproved && (
                    <p className="text-xs text-amber-700 mt-2">
                      Locked: approve all generated outputs to unlock this action.
                    </p>
                  )}
                  {contentMessage && (
                    <p className="text-sm text-green-700 mt-2">{contentMessage}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            {(vsStatus === "failed" || loStatus === "failed") && (
              <div className="space-y-4">
                <Button
                  onClick={() => router.push(`/instructor/courses/${courseid}`)}
                  variant="outline"
                  className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                >
                  Continue to Course (Manual Setup Required)
                </Button>
                <p className="text-sm text-gray-600">
                  You can resume processing from the course page after fixing the reported issue.
                </p>
              </div>
            )}
            {loStatus === "completed" && (
              <div className="space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-lg font-medium text-green-700">
                  Framework generation complete. Continue with reviews and final content generation.
                </p>
                <Button
                  onClick={() => router.push(`/instructor/courses/${courseid}`)}
                  variant="outline"
                  className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                >
                  Back to Course
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
