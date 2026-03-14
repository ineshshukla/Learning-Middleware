"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  getKliPipelineJobDetail,
  reviewKliPlan,
  reviewKliGolden,
  type KliJobDetail,
} from "@/lib/instructor-api";

function safeStringify(value: unknown): string {
  if (!value) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function parseJsonOrThrow(raw: string, label: string): Record<string, any> | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

export default function KliJobReviewPage() {
  const basePath = process.env.NODE_ENV === "production" ? "/learn" : "";
  const params = useParams();
  const router = useRouter();
  const courseid = params.id as string;
  const jobId = params.jobId as string;

  const [job, setJob] = useState<KliJobDetail | null>(null);
  const [planJson, setPlanJson] = useState("");
  const [goldenJson, setGoldenJson] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canReviewPlan = useMemo(() => !!job?.plan, [job]);
  const canReviewGolden = useMemo(() => !!job?.golden_sample, [job]);

  const loadJob = async () => {
    try {
      setLoading(true);
      setError("");
      const detail = await getKliPipelineJobDetail(courseid, jobId);
      setJob(detail);
      setPlanJson(safeStringify(detail.plan));
      setGoldenJson(safeStringify(detail.golden_sample));
      setReviewNotes(detail.review?.notes || "");
    } catch (err: any) {
      setError(err.message || "Failed to load KLI job detail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseid && jobId) {
      loadJob();
    }
  }, [courseid, jobId]);

  const submitPlanReview = async (approved: boolean) => {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const editedPlan = parseJsonOrThrow(planJson, "Edited plan");
      await reviewKliPlan(courseid, jobId, {
        approved,
        edited_plan: editedPlan,
        review_notes: reviewNotes || undefined,
      });

      setSuccess(approved ? "Plan approved successfully" : "Plan sent back for rework");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to submit plan review");
    } finally {
      setSubmitting(false);
    }
  };

  const submitGoldenReview = async (approved: boolean) => {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const editedGolden = parseJsonOrThrow(goldenJson, "Edited golden sample");
      await reviewKliGolden(courseid, jobId, {
        approved,
        edited_golden_sample: editedGolden,
        review_notes: reviewNotes || undefined,
      });

      setSuccess(approved ? "Golden sample approved successfully" : "Golden sample sent back for rework");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to submit golden review");
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">KLI Job Review</h1>
              {job && (
                <p className="text-gray-600 mt-2">
                  {job.module_title || job.module_id} - {job.lo_text}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
              onClick={() => router.push(`/instructor/courses/${courseid}/process`)}
            >
              Back to Monitor
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-900">{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-900">{success}</AlertDescription>
            </Alert>
          )}

          {job && (
            <Card className="bg-white border-gray-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-gray-800">Job Summary</CardTitle>
                <CardDescription className="text-gray-600">Current async pipeline state</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700">Status: {job.status}</span>
                <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700">Stage: {job.stage}</span>
                <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700">Plan Ready: {job.plan_ready ? "yes" : "no"}</span>
                <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700">Golden Ready: {job.golden_ready ? "yes" : "no"}</span>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${job.approved ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300 bg-white text-gray-700"}`}>
                  Approved: {job.approved ? "yes" : "no"}
                </span>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-800">Plan Review</CardTitle>
              <CardDescription className="text-gray-600">
                Edit JSON if needed, then approve or reject the quorum plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={planJson}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPlanJson(e.target.value)}
                rows={14}
                className="font-mono text-xs"
                placeholder="Plan JSON will appear here once generated"
                disabled={!canReviewPlan || submitting}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => submitPlanReview(true)}
                  disabled={!canReviewPlan || submitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Approve Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => submitPlanReview(false)}
                  disabled={!canReviewPlan || submitting}
                  className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                >
                  Reject Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-800">Golden Sample Review</CardTitle>
              <CardDescription className="text-gray-600">
                Edit golden JSON if needed, then approve for learner personalization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={goldenJson}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setGoldenJson(e.target.value)}
                rows={14}
                className="font-mono text-xs"
                placeholder="Golden sample JSON will appear here once generated"
                disabled={!canReviewGolden || submitting}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => submitGoldenReview(true)}
                  disabled={!canReviewGolden || submitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Approve Golden
                </Button>
                <Button
                  variant="outline"
                  onClick={() => submitGoldenReview(false)}
                  disabled={!canReviewGolden || submitting}
                  className="border-gray-300 bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300"
                >
                  Reject Golden
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-800">Review Notes</CardTitle>
              <CardDescription className="text-gray-600">
                Optional notes persisted with approvals/rejections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={reviewNotes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReviewNotes(e.target.value)}
                rows={5}
                placeholder="Add feedback for this LO job"
                disabled={submitting}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
