"use client";
import React from 'react';
import { ArrowRight, BookOpen, Brain, Sparkles, TrendingUp, Users, Zap } from 'lucide-react';
import Link from 'next/link';

const LandingPage = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-violet-50 via-white to-emerald-50/20">
      {/* Modern Navigation Bar */}
      <nav className="relative z-50 glass-effect border-b border-neutral-200/50 shadow-soft">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-900">Learning Middleware</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto space-y-8 animate-fadeIn">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 text-violet-700 font-semibold text-sm border border-violet-200">
            <Zap className="h-4 w-4" />
            <span>Powered by AI · Adaptive Learning</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-neutral-900 leading-tight tracking-tight">
            Transform Learning with{" "}
            <span className="text-gradient-brand">
              Intelligent Adaptation
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-neutral-600 leading-relaxed max-w-3xl mx-auto">
            Create personalized learning experiences that adapt to each student's pace, 
            style, and goals — in minutes, not hours.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/instructor/auth">
              <button className="group flex items-center gap-3 px-8 py-4 bg-violet-600 text-white rounded-xl font-bold text-lg shadow-violet hover:bg-violet-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                For Instructors
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/learner/auth">
              <button className="group flex items-center gap-3 px-8 py-4 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl font-bold text-lg shadow-soft hover:bg-emerald-50 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                For Learners
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-3">Real-Time Analytics</h3>
            <p className="text-neutral-600 leading-relaxed">
              Track progress, identify knowledge gaps, and make data-driven decisions to enhance learning outcomes.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group p-8 rounded-2xl bg-white border border-neutral-200 shadow-soft hover:shadow-strong hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-3">Rich Content Library</h3>
            <p className="text-neutral-600 leading-relaxed">
              Access diverse learning materials including videos, interactive quizzes, and AI-generated assessments.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="group p-8 rounded-2xl bg-white border border-neutral-200 shadow-soft hover:shadow-strong hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-3">Collaborative Learning</h3>
            <p className="text-neutral-600 leading-relaxed">
              Foster engagement through peer discussions, group projects, and interactive study sessions.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="group p-8 rounded-2xl bg-white border border-neutral-200 shadow-soft hover:shadow-strong hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-3">Personalized Pathways</h3>
            <p className="text-neutral-600 leading-relaxed">
              Automatically generate customized learning paths based on student goals, preferences, and performance.
            </p>
          </div>

          {/* Feature 6 */}
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