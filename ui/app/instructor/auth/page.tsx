"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setCookie } from "cookies-next";
import Particles from "@/components/Particles";

const INSTRUCTOR_API_BASE = process.env.NEXT_PUBLIC_INSTRUCTOR_API_URL || "http://localhost:8003";

export default function InstructorAuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Construct the login URL - handle both base URL formats
      const apiUrl = INSTRUCTOR_API_BASE.endsWith('/api/v1/instructor') 
        ? `${INSTRUCTOR_API_BASE}/login`
        : `${INSTRUCTOR_API_BASE}/api/v1/instructor/login`;
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Login failed");
      }

      const data = await response.json();
      
      // Store token and user info in cookies
      setCookie("instructor_token", data.access_token, { 
        path: "/",
        maxAge: 60 * 60 * 24 // 24 hours
      });
      setCookie("user_role", "instructor", { path: "/" });

      // Redirect to instructor dashboard
      router.push("/instructor/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    // Validate passwords match
    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (signupData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      // Construct the signup URL - handle both base URL formats
      const apiUrl = INSTRUCTOR_API_BASE.endsWith('/api/v1/instructor') 
        ? `${INSTRUCTOR_API_BASE}/signup`
        : `${INSTRUCTOR_API_BASE}/api/v1/instructor/signup`;
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: signupData.email,
          password: signupData.password,
          first_name: signupData.first_name,
          last_name: signupData.last_name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Signup failed");
      }

      const data = await response.json();
      setSuccess("Account created successfully! Please login.");
      
      // Clear signup form
      setSignupData({
        email: "",
        password: "",
        confirmPassword: "",
        first_name: "",
        last_name: "",
      });

      // Switch to login tab after 2 seconds
      setTimeout(() => {
        const loginTab = document.querySelector('[value="login"]') as HTMLElement;
        loginTab?.click();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden font-sans">
      {/* Particles Background */}
      <div className="absolute inset-0 z-0">
        <Particles
          particleColors={["#A78BFA", "#60A5FA", "#22D3EE"]}
          particleCount={250}
          particleSpread={12}
          speed={0.02}
          particleBaseSize={120}
          moveParticlesOnHover={true}
          particleHoverFactor={0.3}
          alphaParticles={true}
          disableRotation={false}
          pixelRatio={1}
        />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-8 animate-fadeIn">
          <h1 className="text-4xl font-bold text-white mb-2">Instructor Portal</h1>
          <p className="text-white/70">Sign in or create an account to manage your courses</p>
        </div>

        <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-2xl animate-scaleIn">
          <CardContent className="pt-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-white">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-white">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="bg-green-50 text-green-900 border-green-200">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-white">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={signupData.email}
                    onChange={(e) =>
                      setSignupData({ ...signupData, email: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname" className="text-white">First Name</Label>
                    <Input
                      id="signup-firstname"
                      placeholder="John"
                      value={signupData.first_name}
                      onChange={(e) =>
                        setSignupData({ ...signupData, first_name: e.target.value })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname" className="text-white">Last Name</Label>
                    <Input
                      id="signup-lastname"
                      placeholder="Doe"
                      value={signupData.last_name}
                      onChange={(e) =>
                        setSignupData({ ...signupData, last_name: e.target.value })
                      }
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-white">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={signupData.password}
                    onChange={(e) =>
                      setSignupData({ ...signupData, password: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-white">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={signupData.confirmPassword}
                    onChange={(e) =>
                      setSignupData({ ...signupData, confirmPassword: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
