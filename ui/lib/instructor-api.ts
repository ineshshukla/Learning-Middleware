import { getCookie } from 'cookies-next';

const INSTRUCTOR_API_BASE = process.env.NEXT_PUBLIC_INSTRUCTOR_API_URL || "http://localhost:8001";
const API_PREFIX = "/api/v1/instructor";

export interface InstructorLoginData {
  email: string;
  password: string;
}

export interface InstructorSignupData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
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

export interface Module {
  moduleid: string;
  courseid: string;
  title: string;
  description?: string;
  order_index: number;
  content_path?: string;
  created_at: string;
  updated_at: string;
}

export interface ModuleInput {
  title: string;
  description?: string;
}

export interface CourseWithModules extends Course {
  modules: Module[];
}

/**
 * Get authorization header with instructor token
 */
function getAuthHeader(): HeadersInit {
  const token = getCookie('instructor_token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Login instructor
 */
export async function loginInstructor(data: InstructorLoginData) {
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/login`, {
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
 * Signup new instructor
 */
export async function signupInstructor(data: InstructorSignupData) {
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/signup`, {
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
 * Get current instructor info
 */
export async function getCurrentInstructor() {
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/me`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get instructor info');
  }

  return response.json();
}

/**
 * Get all courses for current instructor
 */
export async function getInstructorCourses(): Promise<CourseWithModules[]> {
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/courses`, {
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
 * Get a specific course by ID
 */
export async function getCourse(courseid: string): Promise<CourseWithModules> {
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/courses/${courseid}`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get course');
  }

  return response.json();
}

/**
 * Create a new course
 */
export async function createCourse(courseData: {
  course_name: string;
  coursedescription?: string;
  targetaudience?: string;
  prereqs?: string;
  modules?: ModuleInput[];
}): Promise<CourseWithModules> {
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/courses`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(courseData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create course');
  }

  return response.json();
}

/**
 * Upload file to course
 */
export async function uploadCourseFile(courseid: string, file: File) {
  const token = getCookie('instructor_token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/courses/${courseid}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload file');
  }

  return response.json();
}

/**
 * Get learning objectives for a module
 */
export async function getModuleObjectives(moduleid: string) {
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/modules/${moduleid}/objectives`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get objectives');
  }

  return response.json();
}

/**
 * Add learning objective to module
 */
export async function addModuleObjective(moduleid: string, text: string) {
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/modules/${moduleid}/objectives`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add objective');
  }

  return response.json();
}
