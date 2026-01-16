"use client";
import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Brain, Sparkles, TrendingUp, Users, Zap, Rocket, Target, Award } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const Prism = dynamic(() => import('@/components/Prism'), { ssr: false });

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
    <div className="min-h-screen w-full bg-black overflow-x-hidden relative font-sans">
      {/* Prism Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
          <Prism
            animationType="rotate"
            timeScale={0.5}
            height={3.5}
            baseWidth={5.5}
            scale={3.6}
            hueShift={0}
            colorFrequency={1}
            noise={0.1}
            glow={1}
            bloom={1}
          />
        </div>
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
      </div>

      {/* Hero Section with Parallax */}
      <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-40">
        <div 
          className="text-center max-w-5xl mx-auto space-y-10"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        >
          {/* Animated Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white font-bold text-sm border-2 border-[#22D3EE]/30 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="w-2 h-2 bg-[#22D3EE] rounded-full animate-pulse"></div>
            <Sparkles className="h-4 w-4 animate-pulse text-[#A78BFA]" />
            <span>Powered by AI · Adaptive Learning</span>
            <div className="w-2 h-2 bg-[#60A5FA] rounded-full animate-pulse"></div>
          </div>

          {/* Main Heading with Animation */}
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight">
            Transform Learning
            <br />
            with{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-[#14B8A6] to-[#A78BFA] bg-clip-text text-transparent">
                Intelligent
              </span>
              <div className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-[#22D3EE]/50 to-[#A78BFA]/50 blur-lg"></div>
            </span>
            <br />
            Adaptation
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/80 leading-relaxed max-w-4xl mx-auto font-normal">
            Create <span className="">personalized</span> learning experiences that adapt to each student's
            <span className=""> pace, style, and goals</span> — in{" "}
            <span className="relative inline-block">
              <span className="font-semibold text-[#60A5FA]">minutes</span>
              <span className="absolute -bottom-1 left-1 right-2 h-0.5 bg-gradient-to-r from-[#22D3EE] to-white"></span>
            </span>, not hours.
          </p>

          

          {/* CTA Buttons with Enhanced Design */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
            <Link href="/instructor/auth">
              <button className="group relative flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#14B8A6] to-[#14B8A6] text-white rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-[#22D3EE]/50 hover:-translate-y-2 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6] to-[#A78BFA] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Rocket className="h-6 w-6 relative z-10" />
                <span className="relative z-10">For Instructors</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform relative z-10" />
              </button>
            </Link>
            <Link href="/learner/auth">
              <button className="group relative flex items-center gap-3 px-10 py-5 bg-white/5 text-white border-2 border-[#A78BFA]/50 rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-[#A78BFA]/50 hover:-translate-y-2 hover:bg-white/10 transition-all duration-300">
                <Target className="h-6 w-6" />
                <span>Start Learning</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative max-w-7xl mx-auto px-6 pb-32 z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
            Why Choose Learning Middleware?
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            The intelligent platform that brings personalized learning to life
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Feature 1 */}
          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hover:shadow-[#22D3EE]/30 hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#22D3EE]/80 to-[#60A5FA]/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">AI-Powered Adaptation</h3>
            <p className="text-white/70 leading-relaxed">
              Intelligent algorithms analyze learning patterns and automatically adjust content difficulty and pacing for optimal comprehension.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hover:shadow-[#60A5FA]/30 hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#60A5FA]/80 to-[#A78BFA]/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Rich Content Library</h3>
            <p className="text-white/70 leading-relaxed">
              Access diverse learning materials including videos, interactive quizzes, and AI-generated assessments.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hover:shadow-[#A78BFA]/30 hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#A78BFA]/80 to-[#22D3EE]/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Personalized Pathways</h3>
            <p className="text-white/70 leading-relaxed">
              Automatically generate customized learning paths based on student goals, preferences, and performance.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hover:shadow-[#60A5FA]/30 hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#60A5FA]/80 to-[#22D3EE]/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Rapid Course Creation</h3>
            <p className="text-white/70 leading-relaxed">
              Build comprehensive courses in minutes with AI assistance, templates, and smart content recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative max-w-7xl mx-auto px-6 pb-32 z-10">
        <div className="relative rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-12 md:p-20 text-center overflow-hidden shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-72 h-72 bg-[#22D3EE] rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#A78BFA] rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
              Ready to Transform Education?
            </h2>
            <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
              Join thousands of educators and learners who are already experiencing the future of personalized education.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/instructor/auth">
                <button className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-xl font-semibold text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200">
                  Get Started as Instructor
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <Link href="/learner/auth">
                <button className="flex items-center gap-3 px-8 py-4 bg-transparent border-2 border-[#A78BFA] text-white rounded-xl font-semibold text-base hover:bg-white/10 transition-all duration-200">
                  Start Learning Today
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#22D3EE]/80 to-[#60A5FA]/80 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-semibold text-white">Learning Middleware</span>
            </div>
            <p className="text-white/60 text-sm">
              © 2025 Learning Middleware - iREL. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;