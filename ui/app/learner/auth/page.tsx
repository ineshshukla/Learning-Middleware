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
import { loginLearner, signupLearner } from "@/lib/learner-api";
import { BookOpen, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export default function LearnerAuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      const data = await loginLearner({
        email: loginData.email,
        password: loginData.password,
      });

      // Store token in cookie
      setCookie("learner_token", data.access_token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });

      // Redirect to learner dashboard
      router.push("/learner/explore");
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
      await signupLearner({
        email: signupData.email,
        password: signupData.password,
        first_name: signupData.first_name,
        last_name: signupData.last_name,
      });

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      backgroundImage: 'url(/blobs_login_lmw.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundColor: '#fff4ec'
    }}>
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 via-[#fff4ec]/90 to-orange-100/80"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-8 animate-fadeIn">
          <div className="bg-white p-4 rounded-2xl shadow-lg mb-6 border-2 border-orange-100">
            <BookOpen className="h-12 w-12 text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 text-center">
            Learner Portal
          </h2>
          <p className="text-center text-gray-600 mt-2">
            Sign in to continue your learning journey
          </p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-none">
                <TabsTrigger 
                  value="login"
                  className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm rounded-md"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm rounded-md"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="p-8 space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 h-12 bg-gray-50 border-gray-200 text-gray-900 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus:border-orange-500 rounded-lg"
                        value={loginData.email}
                        onChange={(e) =>
                          setLoginData({ ...loginData, email: e.target.value })
                        }
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                        Password
                      </Label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-12 h-12 bg-gray-50 border-gray-200 text-gray-900 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus:border-orange-500 rounded-lg"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({ ...loginData, password: e.target.value })
                        }
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 hover:from-orange-600 hover:via-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup" className="p-8 space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="bg-green-50 text-green-900 border-green-200">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-gray-700">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 h-12 bg-gray-50 border-gray-200 text-gray-900 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus:border-orange-500 rounded-lg"
                        value={signupData.email}
                        onChange={(e) =>
                          setSignupData({ ...signupData, email: e.target.value })
                        }
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname" className="text-sm font-medium text-gray-700">
                        First Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="signup-firstname"
                          placeholder="John"
                          className="pl-10 h-12 bg-gray-50 border-gray-200 text-gray-900 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus:border-orange-500 rounded-lg"
                          value={signupData.first_name}
                          onChange={(e) =>
                            setSignupData({ ...signupData, first_name: e.target.value })
                          }
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname" className="text-sm font-medium text-gray-700">
                        Last Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="signup-lastname"
                          placeholder="Doe"
                          className="pl-10 h-12 bg-gray-50 border-gray-200 text-gray-900 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus:border-orange-500 rounded-lg"
                          value={signupData.last_name}
                          onChange={(e) =>
                            setSignupData({ ...signupData, last_name: e.target.value })
                          }
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        className="pl-10 pr-12 h-12 bg-gray-50 border-gray-200 text-gray-900 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus:border-orange-500 rounded-lg"
                        value={signupData.password}
                        onChange={(e) =>
                          setSignupData({ ...signupData, password: e.target.value })
                        }
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                      >
                        {showSignupPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-sm font-medium text-gray-700">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        className="pl-10 pr-12 h-12 bg-gray-50 border-gray-200 text-gray-900 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus:border-orange-500 rounded-lg"
                        value={signupData.confirmPassword}
                        onChange={(e) =>
                          setSignupData({ ...signupData, confirmPassword: e.target.value })
                        }
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 hover:from-orange-600 hover:via-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
                    disabled={isLoading}
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
