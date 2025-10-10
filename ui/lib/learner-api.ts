import { getCookie } from 'cookies-next';

const LEARNER_API_BASE = process.env.NEXT_PUBLIC_LEARNER_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1/auth";

export interface LearnerLoginData {
  email: string;
  password: string;
}

export interface LearnerSignupData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface Learner {
  learnerid: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  courseid: string;
  instructorid: string;
  course_name: string;
  coursedescription?: string;
  targetaudience?: string;
  prereqs?: string;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: number;
  learnerid: string;
  courseid: string;
  enrollment_date: string;
  status: string;
  course?: Course;
}

/**
 * Get authorization header with learner token
 */
function getAuthHeader(): HeadersInit {
  const token = getCookie('learner_token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Login learner
 */
export async function loginLearner(data: LearnerLoginData) {
  const response = await fetch(`${LEARNER_API_BASE}${API_PREFIX}/login-json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  return response.json();
}

/**
 * Signup new learner
 */
export async function signupLearner(data: LearnerSignupData) {
  const response = await fetch(`${LEARNER_API_BASE}${API_PREFIX}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Signup failed');
  }

  return response.json();
}

/**
 * Get current learner info
 */
export async function getCurrentLearner(): Promise<Learner> {
  const response = await fetch(`${LEARNER_API_BASE}${API_PREFIX}/me`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get learner info');
  }

  return response.json();
}

/**
 * Get all available courses
 */
export async function getAllCourses(): Promise<Course[]> {
  const response = await fetch(`${LEARNER_API_BASE}${API_PREFIX}/courses`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get courses');
  }

  return response.json();
}

/**
 * Get learner's enrolled courses
 */
export async function getMyCourses(): Promise<Enrollment[]> {
  const response = await fetch(`${LEARNER_API_BASE}${API_PREFIX}/my-courses`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get enrolled courses');
  }

  return response.json();
}

/**
 * Enroll in a course
 */
export async function enrollInCourse(courseid: string) {
  const response = await fetch(`${LEARNER_API_BASE}${API_PREFIX}/enroll`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ courseid }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to enroll in course');
  }

  return response.json();
}

/**
 * Unenroll from a course
 */
export async function unenrollFromCourse(courseid: string) {
  const response = await fetch(`${LEARNER_API_BASE}${API_PREFIX}/unenroll/${courseid}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to unenroll from course');
  }

  return response.json();
}

/**
 * Get learner dashboard data
 */
export async function getLearnerDashboard() {
  const response = await fetch(`${LEARNER_API_BASE}${API_PREFIX}/dashboard`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get dashboard data');
  }

  return response.json();
}
