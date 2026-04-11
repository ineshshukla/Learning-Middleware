"use client";

import React, { useState, useEffect } from "react";
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
  const basePath = process.env.NODE_ENV === 'production' ? '/learn' : '';
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseid = params.id as string;
  
  const [moduleNames, setModuleNames] = useState<string[]>([]);
  const [vsStatus, setVsStatus] = useState<VectorStoreStatus>("creating");
  const [vsMessage, setVsMessage] = useState("");
  const [loStatus, setLoStatus] = useState<"pending" | "ready_to_generate" | "generating" | "completed" | "failed">("pending");
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

  // Ref to guard against duplicate LO generation calls
  const loTriggered = React.useRef(false);

  // Effect 1: Poll vector store status
  useEffect(() => {
    if (!courseid) return;
    let cancelled = false;
    let currentPoll = 0;

    const pollVectorStore = async () => {
      if (cancelled) return;
      try {
        const result = await getVectorStoreStatus(courseid);
        if (cancelled) return;
        setVsStatus(result.status);
        setVsMessage(result.message || "");

        if (result.status === "ready") {
          // Done polling — trigger LO generation
          setLoStatus("ready_to_generate");
        } else if (result.status === "failed") {
          setError(result.error || "Vector store creation failed");
        } else if (result.status === "creating") {
          currentPoll++;
          setPollCount(currentPoll);
          if (currentPoll < maxPolls) {
            setTimeout(pollVectorStore, 5000);
          } else {
            setError("Vector store creation is taking too long. Please check back later.");
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to check vector store status");
      }
    };

    pollVectorStore();
    return () => { cancelled = true; };
  }, [courseid]);

  // Effect 2: Generate LOs once vector store is ready (fires exactly once)
  useEffect(() => {
    if (loStatus !== "ready_to_generate") return;
    if (loTriggered.current) return;
    loTriggered.current = true;

    if (moduleNames.length === 0) {
      setLoStatus("completed");
      setLoMessage("No modules to generate learning objectives for");
      return;
    }

    setLoStatus("generating");
    setLoMessage("Generating KLI-aligned learning objectives for instructor review...");

    generateLearningObjectives(courseid, moduleNames, 6)
      .then(() => {
        setLoStatus("completed");
        setLoMessage("KLI learning objectives generated successfully. Redirecting to the review studio...");
        setTimeout(() => {
          router.push(`/instructor/courses/${courseid}/objectives`);
        }, 2000);
      })
      .catch((err: any) => {
        setLoStatus("failed");
        setLoMessage(err.message || "Failed to generate learning objectives");
        setError(err.message || "Failed to generate learning objectives");
        loTriggered.current = false; // allow retry
      });
  }, [loStatus, courseid, moduleNames, router]);

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
              Please wait while we prepare the course blueprint...
            </p>
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
                      KLI Blueprint Drafting
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Drafting pedagogically aligned learning objectives for each module
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
                  You can manually add learning objectives later from the course page.
                </p>
              </div>
            )}
            {loStatus === "completed" && (
              <div className="space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-lg font-medium text-green-700">
                  Blueprint ready for review. Redirecting...
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
