"use client";
import React from 'react';
import { ArrowRight, BookOpen, Brain, Sparkles, Zap, Rocket, Target } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';

const LandingPage = () => {
  return (
    <div className="min-h-screen w-full bg-[#FFE9DD] overflow-x-hidden font-sans">
      {/* Hero Section with ContainerScroll */}
      <div className="flex flex-col overflow-hidden">
        <div className="flex flex-col overflow-hidden -mb-37">
          <ContainerScroll
            titleComponent={
              <>
                <h1 className="text-4xl md:text-5xl font-bold text-[#3d2c24] leading-[1.1] tracking-tight">
                  Transform Learning with
                  <br />
                  <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none bg-gradient-to-r from-[#ffc09f] to-[#ff9f6b] bg-clip-text text-transparent">
                    Intelligent Adaptation
                  </span>
                </h1>
                <p className="text-xl text-[#7a6358] leading-relaxed max-w-3xl mx-auto mt-6">
                  Create personalized learning experiences that adapt to each student's
                  pace, style, and goals — in minutes, not hours.
                </p>
              </>
            }
          >
            <Image
              src="/tablet.png"
              alt="Learning Middleware Platform"
              height={720}
              width={1400}
              className="mx-auto rounded-2xl object-cover h-full object-left-top"
              draggable={false}
            />
          </ContainerScroll>
        </div>
      </div>

      {/* CTA Buttons */}
      <section className="relative max-w-7xl mx-auto px-6 pb-20">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/instructor/auth">
            <button className="group flex items-center gap-3 px-10 py-5 bg-[#ffc09f] text-[#3d2c24] rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-[#ff9f6b] transition-all duration-300">
              <Rocket className="h-6 w-6" />
              <span>For Instructors</span>
              <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </button>
          </Link>
          <Link href="/learner/auth">
            <button className="group flex items-center gap-3 px-10 py-5 bg-[#fff5f0] text-[#3d2c24] border-2 border-[#ffc09f] rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-[#ffd9c4] transition-all duration-300">
              <Target className="h-6 w-6" />
              <span>Start Learning</span>
              <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-[#3d2c24] mb-4">
            Why Choose Learning Middleware?
          </h2>
          <p className="text-lg text-[#7a6358] max-w-2xl mx-auto">
            The intelligent platform that brings personalized learning to life
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Feature 1 */}
          <div className="group warm-card-interactive p-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ffc09f] to-[#ff9f6b] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Brain className="h-7 w-7 text-[#3d2c24]" />
            </div>
            <h3 className="text-xl font-semibold text-[#3d2c24] mb-3">AI-Powered Adaptation</h3>
            <p className="text-[#7a6358] leading-relaxed">
              Intelligent algorithms analyze learning patterns and automatically adjust content difficulty and pacing for optimal comprehension.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group warm-card-interactive p-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ffc09f] to-[#ff9f6b] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="h-7 w-7 text-[#3d2c24]" />
            </div>
            <h3 className="text-xl font-semibold text-[#3d2c24] mb-3">Rich Content Library</h3>
            <p className="text-[#7a6358] leading-relaxed">
              Access diverse learning materials including videos, interactive quizzes, and AI-generated assessments.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group warm-card-interactive p-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ffc09f] to-[#ff9f6b] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="h-7 w-7 text-[#3d2c24]" />
            </div>
            <h3 className="text-xl font-semibold text-[#3d2c24] mb-3">Personalized Pathways</h3>
            <p className="text-[#7a6358] leading-relaxed">
              Automatically generate customized learning paths based on student goals, preferences, and performance.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="group warm-card-interactive p-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ffc09f] to-[#ff9f6b] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Zap className="h-7 w-7 text-[#3d2c24]" />
            </div>
            <h3 className="text-xl font-semibold text-[#3d2c24] mb-3">Rapid Course Creation</h3>
            <p className="text-[#7a6358] leading-relaxed">
              Build comprehensive courses in minutes with AI assistance, templates, and smart content recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative max-w-7xl mx-auto px-6 pb-32">
        <div className="relative rounded-3xl bg-[#fff5f0] border border-[#f0e0d6] p-12 md:p-20 text-center shadow-xl">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-semibold text-[#3d2c24] mb-6">
              Ready to Transform Education?
            </h2>
            <p className="text-lg text-[#7a6358] mb-10 max-w-2xl mx-auto">
              Join thousands of educators and learners who are already experiencing the future of personalized education.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/instructor/auth">
                <button className="flex items-center gap-3 px-8 py-4 bg-[#ffc09f] text-[#3d2c24] rounded-xl font-semibold text-base shadow-lg hover:shadow-xl hover:scale-105 hover:bg-[#ff9f6b] transition-all duration-200">
                  Get Started as Instructor
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <Link href="/learner/auth">
                <button className="flex items-center gap-3 px-8 py-4 bg-transparent border-2 border-[#ffc09f] text-[#3d2c24] rounded-xl font-semibold text-base hover:bg-[#ffd9c4] transition-all duration-200">
                  Start Learning Today
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#f0e0d6] bg-[#fff5f0]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#ffc09f] to-[#ff9f6b] rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-[#3d2c24]" />
              </div>
              <span className="text-base font-semibold text-[#3d2c24]">Learning Middleware</span>
            </div>
            <p className="text-[#7a6358] text-sm">
              © 2025 Learning Middleware - iREL. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;