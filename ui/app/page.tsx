"use client";
import React from 'react';
import { ArrowRight, Sparkles, GraduationCap, BookOpen } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import PillNav from '@/components/ui/PillNav';

const LandingPage = () => {
  const basePath = process.env.NODE_ENV === 'production' ? '/learn' : '';
  
  return (
    <div className="min-h-screen w-full bg-[#FFF5F0] overflow-x-hidden font-sans">
      {/* PillNav Navigation */}
      <PillNav
        items={[
          { label: 'For Instructors', href: '/instructor/auth' },
          { label: 'For Learners', href: '/learner/auth' }
        ]}
        activeHref="/"
        baseColor="#5a402c"
        pillColor="#fff5f0"
        hoveredPillTextColor="#ffffff"
        pillTextColor="#3d2c24"
        ease="power2.easeOut"
        initialLoadAnimation={true}
      />

      {/* Hero Section with ContainerScroll */}
      <div className="flex flex-col overflow-hidden pt-16">
        <div className="flex flex-col overflow-hidden">
          <ContainerScroll
            titleComponent={
              <>
                <h1 className="text-4xl md:text-6xl font-bold text-[#3d2c24] leading-[1.2] tracking-tight">
                  <span className="text-3xl md:text-5xl font-medium text-[#3c280d] block mb-2">
                    Transform Learning with
                  </span>
                  <span className="text-4xl md:text-[5.5rem] font-bold leading-none bg-gradient-to-r from-[#3c280d] to-[#3c280d] bg-clip-text text-transparent">
                    Intelligent Adaption.
                  </span>
                </h1>
              </>
            }
          >
            <Image
              src={`${basePath}/tablet.png`}
              alt="Learning Middleware Platform"
              height={720}
              width={1400}
              className="mx-auto rounded-2xl object-cover h-full object-left-top"
              draggable={false}
            />
          </ContainerScroll>
        </div>
      </div>

      {/* Instructor Path Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#f0d5c4] bg-[#fff5f0] p-8">
              <Image
                src={`${basePath}/LO_landing.png`}
                alt="Learning Objectives Interface"
                width={600}
                height={400}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl md:text-5xl font-bold text-[#3d2c24] mb-6 leading-tight">
              Create once.<br />
              Teach everyone differently.
            </h2>
            <p className="text-lg md:text-xl text-[#7a6358] leading-relaxed mb-8">
              Build your curriculum and watch it evolve. Our middleware adapts your content in real-time to match every student's unique pace.
            </p>
            <Link href="/instructor/auth">
              <button className="group inline-flex items-center gap-3 px-8 py-4 bg-[#ffb89f] text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:bg-[#ff9565] transition-all duration-300">
                Design a Course
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Learner Path Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#3d2c24] mb-6 leading-tight">
              Learning that<br />
              responds to you.
            </h2>
            <p className="text-lg md:text-xl text-[#7a6358] leading-relaxed mb-8">
              Learning that moves at your rhythm, not a fixed pace.
            </p>
            <Link href="/learner/auth">
              <button className="group inline-flex items-center gap-3 px-8 py-4 bg-transparent border-2 border-[#ffb89f] text-[#3d2c24] rounded-xl font-semibold text-lg hover:bg-[#fff5f0] transition-all duration-300">
                Start Learning
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
          <div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#f0d5c4] bg-[#fff5f0] p-8 max-w-md mx-auto">
              <Image
                src={`${basePath}/learning_landing.png`}
                alt="Customize My Learning Interface"
                width={500}
                height={400}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#f0d5c4] bg-[#fff5f0] mt-32">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#ffb89f] to-[#ff9565] rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-semibold text-[#3d2c24]">Learning Middleware</span>
            </div>
            <p className="text-[#7a6358] text-sm">
              © 2026 Learning Middleware - iREL. All rights reserved.{" "}
              <a
                href="mailto:learn@iiit.ac.in"
                className="underline hover:text-[#3d2c24] transition-colors"
              >
                learn@iiit.ac.in
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;