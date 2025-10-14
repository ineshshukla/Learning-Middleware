"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { Header } from "@/components/header";
import {
  getVectorStoreStatus,
  generateLearningObjectives,
} from "@/lib/instructor-api";

type VectorStoreStatus = "not_started" | "creating" | "ready" | "failed";

export default function CourseProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseid = params.id as string;
  
  const [moduleNames, setModuleNames] = useState<string[]>([]);
  const [vsStatus, setVsStatus] = useState<VectorStoreStatus>("creating");
  const [vsMessage, setVsMessage] = useState("");
  const [loStatus, setLoStatus] = useState<"pending" | "generating" | "completed" | "failed">("pending");
  const [loMessage, setLoMessage] = useState("");
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const maxPolls = 60; // 5 minutes max (5 sec intervals)

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

    // Poll for vector store status
    const pollVectorStore = async () => {
      try {
        const status = await getVectorStoreStatus(courseid);
        setVsStatus(status.status);
        setVsMessage(status.message || "");

        if (status.status === "ready") {
          // Vector store ready, proceed to generate LOs
          if (loStatus === "pending") {
            generateLOs();
          }
        } else if (status.status === "failed") {
          setError(status.error || "Vector store creation failed");
        } else if (status.status === "creating") {
          // Continue polling
          if (pollCount < maxPolls) {
            setPollCount(prev => prev + 1);
            setTimeout(pollVectorStore, 5000); // Poll every 5 seconds
          } else {
            setError("Vector store creation is taking too long. Please check back later.");
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to check vector store status");
      }
    };

    const generateLOs = async () => {
      if (moduleNames.length === 0) {
        setLoStatus("completed");
        setLoMessage("No modules to generate learning objectives for");
        return;
      }

      setLoStatus("generating");
      setLoMessage("Generating learning objectives using AI...");

      try {
        const result = await generateLearningObjectives(courseid, moduleNames, 6);
        setLoStatus("completed");
        setLoMessage("Learning objectives generated successfully!");
        
        // Wait 2 seconds then redirect to course detail page
        setTimeout(() => {
          router.push(`/instructor/courses/${courseid}`);
        }, 2000);
      } catch (err: any) {
        setLoStatus("failed");
        setLoMessage(err.message || "Failed to generate learning objectives");
        setError(err.message || "Failed to generate learning objectives");
      }
    };

    // Start polling
    pollVectorStore();
  }, [courseid, moduleNames, loStatus, pollCount, router]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "creating":
      case "generating":
      case "pending":
        return <Loader2 className="h-6 w-6 animate-spin text-blue-600" />;
      case "ready":
      case "completed":
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case "failed":
        return <XCircle className="h-6 w-6 text-red-600" />;
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

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Processing Your Course
            </h1>
            <p className="text-xl text-slate-600">
              Please wait while we set up your course materials...
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Vector Store Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Vector Store Creation
                    </CardTitle>
                    <CardDescription>
                      Processing course materials for AI-powered features
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(vsStatus)}
                    <span className="font-medium">{getStatusText(vsStatus)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{vsMessage}</p>
                {vsStatus === "creating" && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Learning Objectives Generation
                    </CardTitle>
                    <CardDescription>
                      AI-generated learning objectives for each module
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(loStatus)}
                    <span className="font-medium">{getStatusText(loStatus)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {loMessage || "Waiting for vector store to complete..."}
                </p>
                {loStatus === "generating" && (
                  <div className="mt-4">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                )}
                {moduleNames.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Modules:</p>
                    <ul className="space-y-1">
                      {moduleNames.map((name, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            {(vsStatus === "failed" || loStatus === "failed") && (
              <div className="space-y-4">
                <Button
                  onClick={() => router.push(`/instructor/courses/${courseid}`)}
                  variant="outline"
                >
                  Continue to Course (Manual Setup Required)
                </Button>
                <p className="text-sm text-gray-500">
                  You can manually add learning objectives later from the course page.
                </p>
              </div>
            )}
            {loStatus === "completed" && (
              <div className="space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                <p className="text-lg font-medium text-green-700">
                  Course setup complete! Redirecting...
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
