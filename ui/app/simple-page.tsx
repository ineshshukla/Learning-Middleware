"use client";
import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Learning Middleware - iREL
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Welcome to the Learning Management System
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/instructor" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Instructor Portal
            </Link>
            <Link 
              href="/learner" 
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Learner Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}