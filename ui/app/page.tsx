"use client";
import React, { useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';

const LandingPage = () => {
  useEffect(() => {
    const cookies = document.cookie.split(';');
    let userId = null;
    let googleIdToken = null;
    
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'user_id') {
        userId = value;
      }
      if (name === 'googleId') {
        googleIdToken = value;
      }
    }

    if (userId && userId !== 'undefined') {
      console.log(`User ID found: ${userId}`);
    }

    // Decode and display JWT token if it exists
    if (googleIdToken) {
      try {
        const decoded: any = jwtDecode(googleIdToken);
        console.log("Name:", decoded.name);
        console.log("Email:", decoded.email);
        
        // Check if user exists and handle accordingly
        if (!userId || userId === 'undefined') {
          console.log('User ID cookie not found. Fetching all users...');
          fetch('http://10.4.25.215:8000/api/users/all')
            .then(response => response.json())
            .then(data => {
              console.log('All users:', data);
              
              // Check if user with this email exists
              const existingUser = data.find((user: any) => user.email === decoded.email);
              
              if (existingUser) {
                // User exists, set the user_id cookie
                console.log('User found! Setting user_id cookie:', existingUser.user_id);
                document.cookie = `user_id=${existingUser.user_id}; path=/`;
              } else {
                // User doesn't exist, create new user
                console.log('User not found. Creating new user...');
                fetch('http://10.4.25.215:8000/api/users', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: decoded.name,
                    email: decoded.email
                  })
                })
                .then(response => response.json())
                .then(newUser => {
                  console.log('New user created:', newUser);
                  // Set the user_id cookie for the new user
                  document.cookie = `user_id=${newUser.user_id}; path=/`;
                })
                .catch(error => console.error('Error creating user:', error));
              }
            })
            .catch(error => console.error('Error fetching users:', error));
        }
      } catch (error) {
        console.error("Error decoding JWT:", error);
      }
    }
  }, []);
// console.log("Cookies:", document.cookie);
  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* White Navigation Bar */}
      <nav className="relative z-50 bg-white w-full px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-600 rounded-md"></div>
          <span className="text-lg font-semibold text-gray-800">Learning Middleware</span>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-2 bg-green-400 text-green-900 rounded-full font-medium hover:bg-green-500 transition-colors shadow-md">
            Log In
          </button>
          <button className="px-6 py-2 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 transition-colors shadow-md">
            Sign Up
          </button>
        </div>
      </nav>

      {/* Main Content Container */}
      <div className="relative h-[calc(100vh-64px)]">
        {/* Top Section - Green Gradient */}
        <div className="relative bg-gradient-to-br from-green-300 via-green-200 to-green-100 pt-8 pb-16 h-3/5">
          <div className="relative z-10 max-w-6xl mx-auto px-6 pt-2">
            <h1 className="text-4xl md:text-6xl font-bold text-purple-700 leading-tight">
              Turn your learners' outcomes into{" "}
              <span className="relative inline-block border-2 border-dashed border-purple-700 px-3 py-1 my-2 rounded-full hover:bg-purple-600 hover:text-green-200 transition-colors">
                adaptive learning
              </span>{" "}
              experiences in{" "}
              <span className="relative inline-block border-2 border-dashed border-purple-700 px-3 py-1 rounded-full hover:bg-purple-600 hover:text-green-200">
                minutes,
              </span>{" "}
              not hours.
            </h1>
          </div>
          
          {/* Action Buttons */}
          <div className="relative z-10 max-w-6xl mx-auto px-6 mt-8 flex justify-start items-center">
            <Link href="/dashboard">
              <button className="flex items-center gap-2 px-6 py-3 bg-purple-400 text-purple-900 rounded-full font-semibold hover:bg-purple-500 transition-colors shadow-lg">
                For Tutors <ArrowUpRight size={18} />
              </button>
            </Link>
          </div>

          {/* Curved Bottom Edge */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden">
            <svg className="relative block w-full h-20" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,0 C150,100 350,100 600,50 C850,0 1050,0 1200,50 L1200,120 L0,120 Z" fill="#9333ea"></path>
            </svg>
          </div>
        </div>

        {/* Bottom Section - Purple Background */}
        <div className="relative bg-purple-600 pt-4 pb-8 h-2/5 -mt-1">
          <div className="relative z-10 max-w-6xl mx-auto px-6">
            <div className="flex justify-end mb-4">
              <Link href="/learner">
                <button className="flex items-center gap-2 px-6 py-3 bg-green-400 text-green-900 rounded-full font-semibold hover:bg-green-500 transition-colors shadow-lg">
                  For Learners <ArrowUpRight size={18} />
                </button>
              </Link>
            </div>
            <div className="text-right mt-2">
              <h2 className="text-4xl md:text-6xl font-bold text-purple-100 leading-tight">
                Learn your way,{" "}
                <span className="relative inline-block border-2 border-dashed border-purple-100 px-3 py-1 my-2 rounded-full hover:bg-green-200 hover:text-purple-600">
                  at your pace
                </span>{" "}
                with content that{" "}
                <span className="relative inline-block border-2 border-dashed border-purple-100 px-3 py-1 rounded-full hover:bg-green-200 hover:text-purple-600">
                  adapts
                </span>{" "}
                to you.
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;