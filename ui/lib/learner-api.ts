import { getCookie } from 'cookies-next';

const LEARNER_API_BASE = process.env.NEXT_PUBLIC_LEARNER_API_URL || "http://localhost:8002";
const ORCHESTRATOR_API_BASE = process.env.NEXT_PUBLIC_ORCHESTRATOR_API_URL || "http://localhost:8001";
const API_PREFIX = "/api/v1/learner/auth";  // Learner routes with /learner prefix

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

export interface ModuleProgress {
  id: number;
  learnerid: string;
  moduleid: string;
  status: "not_started" | "in_progress" | "completed";
  progress_percentage: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CourseProgress {
  courseid: string;
  learnerid: string;
  currentmodule?: string;
  status: string;
  course?: Course;
  modules_progress?: ModuleProgress[];
}

export interface LearningPreferences {
  DetailLevel: "detailed" | "moderate" | "brief";
  ExplanationStyle: "examples-heavy" | "conceptual" | "practical" | "visual";
  Language: "simple" | "technical" | "balanced";
}

export interface PreferencesResponse {
  _id?: {
    CourseID: string;
    LearnerID: string;
  };
  preferences: LearningPreferences;
  lastUpdated?: string;
  message?: string;
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

/**
 * Get course progress for learner
 */
export async function getCourseProgress(courseId: string): Promise<CourseProgress> {
  const response = await fetch(`${LEARNER_API_BASE}${API_PREFIX}/progress/${courseId}`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get course progress');
  }

  return response.json();
}

/**
 * Get all modules for a course
 */
export async function getCourseModules(courseId: string): Promise<Module[]> {
  const response = await fetch(`${LEARNER_API_BASE}${API_PREFIX}/courses/${courseId}`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get course modules');
  }

  const courseData = await response.json();
  return courseData.modules || [];
}

/**
 * Update module progress
 */
export async function updateModuleProgress(
  moduleId: string,
  status: "not_started" | "in_progress" | "completed",
  progressPercentage?: number
): Promise<ModuleProgress> {
  const response = await fetch(`${LEARNER_API_BASE}${API_PREFIX}/progress/module/${moduleId}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify({
      status,
      progress_percentage: progressPercentage,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update module progress');
  }

  return response.json();
}

/**
 * Update learner's learning preferences for a course
 */
export async function updateLearningPreferences(
  learnerId: string,
  courseId: string,
  preferences: LearningPreferences
) {
  const response = await fetch(`${ORCHESTRATOR_API_BASE}/api/orchestrator/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      learner_id: learnerId,
      course_id: courseId,
      preferences: preferences,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.message || 'Failed to update preferences');
  }

  return response.json();
}

/**
 * Get learner's learning preferences for a course
 */
export async function getLearningPreferences(
  learnerId: string,
  courseId: string
): Promise<PreferencesResponse> {
  const response = await fetch(
    `${ORCHESTRATOR_API_BASE}/api/orchestrator/preferences/${learnerId}/${courseId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get preferences');
  }

  return response.json();
}

// =============== Orchestrator Module & Quiz APIs ===============

export interface ModuleContent {
  course_id: string;
  learner_id: string;
  current_module: string;
  module_title: string;
  module_content: any;
  status: string;
}

export interface QuizQuestion {
  questionNo: string;
  question: string;
  options: string[];
  correctAnswer?: string;
}

export interface Quiz {
  module_name: string;
  questions: QuizQuestion[];
}

export interface QuizSubmission {
  learner_id: string;
  quiz_id: string;
  module_id: string;
  responses: Array<{
    questionNo: string;
    selectedOption: string;
  }>;
}

export interface QuizResult {
  quiz_id: string;
  learner_id: string;
  module_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  status: "passed" | "failed";
  feedback?: string;
}

export interface NextModuleResponse {
  course_id: string;
  next_module_id: string | null;
  next_module_title: string | null;
  is_course_complete: boolean;
  message: string;
}

/**
 * Get current module content for learner
 */
export async function getCurrentModule(
  learnerId: string,
  courseId: string
): Promise<ModuleContent> {
  const response = await fetch(
    `${ORCHESTRATOR_API_BASE}/api/orchestrator/module/current/${learnerId}/${courseId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get current module');
  }

  return response.json();
}

/**
 * Generate module content using SME service
 * Note: Module content generation can take several minutes as it involves LLM processing
 */
export async function generateModuleContent(
  courseId: string,
  learnerId: string,
  moduleName: string,
  learningObjectives: string[]
): Promise<{ success: boolean; module_name: string; content: string }> {
  // Create AbortController with long timeout (50 minutes to match backend)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000000); // 3000 seconds = 50 minutes

  try {
    const response = await fetch(`${ORCHESTRATOR_API_BASE}/api/orchestrator/sme/generate-module`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        course_id: courseId,
        learner_id: learnerId,
        module_name: moduleName,
        learning_objectives: learningObjectives,
      }),
      signal: controller.signal,
      // Keep connection alive for long-running request
      keepalive: false, // Disable keepalive for long requests
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate module content');
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Module content generation timed out. Please try again.');
    }
    throw err;
  }
}

/**
 * Generate quiz for module content
 * Note: Quiz generation can take several minutes as it involves LLM processing
 */
export async function generateQuiz(
  moduleContent: string,
  moduleName: string,
  courseId: string
): Promise<{ success: boolean; quiz_data: Quiz }> {
  // Create AbortController with long timeout (50 minutes to match backend)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000000); // 3000 seconds = 50 minutes

  try {
    const response = await fetch(`${ORCHESTRATOR_API_BASE}/api/orchestrator/sme/generate-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        module_content: moduleContent,
        module_name: moduleName,
        course_id: courseId,
      }),
      signal: controller.signal,
      // Keep connection alive for long-running request
      keepalive: false, // Disable keepalive for long requests
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate quiz');
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Quiz generation timed out. Please try again.');
    }
    throw err;
  }
}

/**
 * Submit quiz answers
 */
export async function submitQuiz(submission: QuizSubmission): Promise<QuizResult> {
  const response = await fetch(`${ORCHESTRATOR_API_BASE}/api/orchestrator/quiz/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit quiz');
  }

  return response.json();
}

/**
 * Complete module and get next module
 */
export async function completeModule(
  learnerId: string,
  courseId: string,
  moduleId: string
): Promise<NextModuleResponse> {
  const response = await fetch(
    `${ORCHESTRATOR_API_BASE}/api/orchestrator/module/complete?learner_id=${learnerId}&course_id=${courseId}&module_id=${moduleId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to complete module');
  }

  return response.json();
}

/**
 * Check if module content exists in database and return it if it does
 */
export async function checkModuleContent(
  moduleId: string
): Promise<{ exists: boolean; content: string | null }> {
  const response = await fetch(
    `${LEARNER_API_BASE}${API_PREFIX}/module/${moduleId}/content`,
    {
      method: 'GET',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to check module content');
  }

  return response.json();
}

/**
 * Save generated module content to database
 */
export async function saveModuleContent(
  moduleId: string,
  courseId: string,
  content: string
): Promise<void> {
  console.log(`[API] saveModuleContent called: moduleId=${moduleId}, courseId=${courseId}, contentLength=${content.length}`);
  
  const response = await fetch(
    `${LEARNER_API_BASE}${API_PREFIX}/module/${moduleId}/content`,
    {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        module_id: moduleId,
        course_id: courseId,
        content: content,
      }),
    }
  );

  console.log(`[API] saveModuleContent response status: ${response.status}`);
  
  if (!response.ok) {
    const error = await response.json();
    console.error(`[API] saveModuleContent failed:`, error);
    throw new Error(error.detail || 'Failed to save module content');
  }

  const result = await response.json();
  console.log(`[API] saveModuleContent success:`, result);
  return result;
}

/**
 * Check if quiz exists in database and return it if it does
 */
export async function checkModuleQuiz(
  moduleId: string
): Promise<{ exists: boolean; quiz_data: Quiz | null }> {
  const response = await fetch(
    `${LEARNER_API_BASE}${API_PREFIX}/module/${moduleId}/quiz`,
    {
      method: 'GET',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to check module quiz');
  }

  return response.json();
}

/**
 * Save generated quiz to database
 */
export async function saveModuleQuiz(
  moduleId: string,
  courseId: string,
  quizData: Quiz
): Promise<void> {
  console.log(`[API] saveModuleQuiz called: moduleId=${moduleId}, courseId=${courseId}`);
  
  const response = await fetch(
    `${LEARNER_API_BASE}${API_PREFIX}/module/${moduleId}/quiz`,
    {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        module_id: moduleId,
        course_id: courseId,
        quiz_data: quizData,
      }),
    }
  );

  console.log(`[API] saveModuleQuiz response status: ${response.status}`);
  
  if (!response.ok) {
    const error = await response.json();
    console.error(`[API] saveModuleQuiz failed:`, error);
    throw new Error(error.detail || 'Failed to save module quiz');
  }

  const result = await response.json();
  console.log(`[API] saveModuleQuiz success:`, result);
  return result;
}
