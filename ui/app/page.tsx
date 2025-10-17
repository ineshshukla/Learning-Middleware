"use client";
import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Brain, Sparkles, TrendingUp, Users, Zap, Rocket, Target, Award } from 'lucide-react';
import Link from 'next/link';

const LandingPage = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-violet-50 via-white to-emerald-50/20 overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-20 left-10 w-72 h-72 bg-violet-300/20 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)` }}
        ></div>
        <div 
          className="absolute top-40 right-20 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl animate-pulse"
          style={{ 
            transform: `translate(${-mousePosition.x * 0.015}px, ${-mousePosition.y * 0.015}px)`,
            animationDelay: '1s'
          }}
        ></div>
        <div 
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl animate-pulse"
          style={{ 
            transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`,
            animationDelay: '2s'
          }}
        ></div>
      </div>

      {/* Modern Navigation Bar with Glassmorphism */}
      <nav className="relative z-50 glass-effect border-b border-neutral-200/50 shadow-soft sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-900">Learning Middleware</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/instructor/auth">
              <button className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-semibold shadow-violet hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                For Instructors
              </button>
            </Link>
            <Link href="/learner/auth">
              <button className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-500 text-white rounded-xl font-semibold shadow-violet hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                For Learners
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Parallax */}
      <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-40">
        <div 
          className="text-center max-w-5xl mx-auto space-y-10"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        >
          {/* Animated Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 font-bold text-sm border-2 border-violet-200 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="w-2 h-2 bg-violet-600 rounded-full animate-pulse"></div>
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>Powered by AI · Adaptive Learning</span>
            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
          </div>

          {/* Main Heading with Animation */}
          <h1 className="text-6xl md:text-8xl font-extrabold text-neutral-900 leading-[1.1] tracking-tight">
            Transform Learning
            <br />
            with{" "}
            <span className="relative inline-block">
              <span className="text-gradient-brand animate-pulse">
                Intelligent
              </span>
              <div className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-violet-600/30 to-emerald-600/30 blur-lg"></div>
            </span>
            <br />
            Adaptation
          </h1>

          {/* Subtitle */}
          <p className="text-2xl md:text-3xl text-neutral-600 leading-relaxed max-w-4xl mx-auto font-medium">
            Create <span className="text-violet-600 font-bold">personalized</span> learning experiences that adapt to each student's
            <span className="text-emerald-600 font-bold"> pace, style, and goals</span> — in{" "}
            <span className="relative inline-block">
              <span className="font-bold text-violet-700">minutes</span>
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-emerald-600"></span>
            </span>, not hours.
          </p>

          

          {/* CTA Buttons with Enhanced Design */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
            <Link href="/instructor/auth">
              <button className="group relative flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-bold text-xl shadow-violet hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Rocket className="h-6 w-6 relative z-10" />
                <span className="relative z-10">For Instructors</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform relative z-10" />
              </button>
            </Link>
            <Link href="/learner/auth">
              <button className="group relative flex items-center gap-3 px-10 py-5 bg-green-500 text-white border-2 border-emerald-600 text-emerald-700 rounded-2xl font-bold text-xl shadow-emerald hover:shadow-2xl hover:-translate-y-2 hover:bg-green-600 transition-all duration-300">
                <Target className="h-6 w-6" />
                <span>Start Learning</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </button>
            </Link>
          </div>
        </div>

        {/* Floating Visual Elements */}
        <div className="absolute top-40 left-10 animate-bounce" style={{ animationDuration: '3s' }}>
          <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl rotate-12 shadow-violet flex items-center justify-center">
            <Brain className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className="absolute top-60 right-10 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}>
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl -rotate-12 shadow-emerald flex items-center justify-center">
            <Award className="h-10 w-10 text-white" />
          </div>
        </div>
        {/* <div className="absolute bottom-40 left-1/4 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>
          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full shadow-lg flex items-center justify-center">
            <Zap className="h-7 w-7 text-white" />
          </div>
        </div> */}
      </section>

      {/* Features Section */}
      <section className="relative max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
            Why Choose Learning Middleware?
          </h2>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            The intelligent platform that brings personalized learning to life
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Feature 1 */}
          <div className="group p-8 rounded-2xl bg-white border border-neutral-200 shadow-soft hover:shadow-strong hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-3">AI-Powered Adaptation</h3>
            <p className="text-neutral-600 leading-relaxed">
              Intelligent algorithms analyze learning patterns and automatically adjust content difficulty and pacing for optimal comprehension.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group p-8 rounded-2xl bg-white border border-neutral-200 shadow-soft hover:shadow-strong hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-3">Rich Content Library</h3>
            <p className="text-neutral-600 leading-relaxed">
              Access diverse learning materials including videos, interactive quizzes, and AI-generated assessments.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group p-8 rounded-2xl bg-white border border-neutral-200 shadow-soft hover:shadow-strong hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-3">Personalized Pathways</h3>
            <p className="text-neutral-600 leading-relaxed">
              Automatically generate customized learning paths based on student goals, preferences, and performance.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="group p-8 rounded-2xl bg-white border border-neutral-200 shadow-soft hover:shadow-strong hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-3">Rapid Course Creation</h3>
            <p className="text-neutral-600 leading-relaxed">
              Build comprehensive courses in minutes with AI assistance, templates, and smart content recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative max-w-7xl mx-auto px-6 pb-32">
        <div className="relative rounded-3xl bg-gradient-to-br from-violet-600 to-violet-800 p-12 md:p-20 text-center overflow-hidden shadow-strong">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Education?
            </h2>
            <p className="text-xl text-violet-100 mb-10 max-w-2xl mx-auto">
              Join thousands of educators and learners who are already experiencing the future of personalized education.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/instructor/auth">
                <button className="flex items-center gap-3 px-8 py-4 bg-white text-violet-700 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200">
                  Get Started as Instructor
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <Link href="/learner/auth">
                <button className="flex items-center gap-3 px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-200">
                  Start Learning Today
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-violet-700 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-neutral-900">Learning Middleware</span>
            </div>
            <p className="text-neutral-600 text-sm">
              © 2025 Learning Middleware - iREL. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;