import { getCookie } from 'cookies-next';

const LEARNER_API_BASE = process.env.NEXT_PUBLIC_LEARNER_API_URL || "http://localhost:8002";
const ORCHESTRATOR_API_BASE = process.env.NEXT_PUBLIC_ORCHESTRATOR_API_URL || "http://localhost:8001";
const SME_API_BASE = process.env.NEXT_PUBLIC_SME_API_URL || "http://localhost:8000";

/**
 * Helper function to construct API URL for learner service
 * Backends now handle routes without prefixes, nginx handles the /api/learner routing
 */
function getApiUrl(endpoint: string): string {
  return `${LEARNER_API_BASE}${endpoint}`;
}

/**
 * Helper function to construct API URL for orchestrator service
 * Backends now handle routes without prefixes, nginx handles the /api/orchestrator routing
 */
function getOrchestratorUrl(endpoint: string): string {
  return `${ORCHESTRATOR_API_BASE}${endpoint}`;
}

/**
 * Helper function to construct API URL for SME service
 */
function getSmeUrl(endpoint: string): string {
  return `${SME_API_BASE}${endpoint}`;
}

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
  const response = await fetch(getApiUrl('/login-json'), {
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
  const response = await fetch(getApiUrl('/signup'), {
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
  const response = await fetch(getApiUrl(`/me`), {
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
  const response = await fetch(getApiUrl('/courses'), {
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
  const response = await fetch(getApiUrl('/my-courses'), {
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
  const response = await fetch(getApiUrl('/enroll'), {
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
  const response = await fetch(getApiUrl(`/unenroll/${courseid}`), {
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
  const response = await fetch(getApiUrl(`/dashboard`), {
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
  const response = await fetch(getApiUrl(`/progress/${courseId}`), {
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
  const response = await fetch(getApiUrl(`/courses/${courseId}`), {
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
  const response = await fetch(getApiUrl(`/progress/module/${moduleId}`), {
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
  const response = await fetch(getOrchestratorUrl('/preferences'), {
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
    getOrchestratorUrl('/preferences/${learnerId}/${courseId}'),
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
  id: number;
  type: string;
  topic?: string;
  question: string;
  options: string[];
  correct_answer?: string;
  correctAnswer?: string; // Legacy support
  questionNo?: string | number; // Legacy support
  explanation?: string;
}

export interface Quiz {
  module_name?: string;
  questions: QuizQuestion[];
  quiz_metadata?: {
    module_name: string;
    generated_at: string;
    question_types: string[];
    total_questions: number;
    generation_config?: any;
    generation_method?: string;
  };
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
    getOrchestratorUrl('/module/current/${learnerId}/${courseId}'),
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
  learningObjectives: string[],
  moduleId?: string // Optional module ID for module-specific vector store
): Promise<{ success: boolean; module_name: string; content: string }> {
  // Create AbortController with long timeout (50 minutes to match backend)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000000); // 3000 seconds = 50 minutes

  try {
    const response = await fetch(getOrchestratorUrl('/sme/generate-module'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        course_id: courseId,
        learner_id: learnerId,
        module_name: moduleName,
        learning_objectives: learningObjectives,
        module_id: moduleId, // Pass module_id for module-specific vector store
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
  courseId: string,
  moduleId?: string
): Promise<{ success: boolean; quiz_data: Quiz }> {
  // Create AbortController with long timeout (50 minutes to match backend)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000000); // 3000 seconds = 50 minutes

  try {
    const requestBody: any = {
      module_content: moduleContent,
      module_name: moduleName,
      course_id: courseId,
    };

    // Add module_id if provided for module-specific vector store usage
    if (moduleId) {
      requestBody.module_id = moduleId;
    }

    const response = await fetch(getOrchestratorUrl('/sme/generate-quiz'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
  const response = await fetch(getOrchestratorUrl('/quiz/submit'), {
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
    getOrchestratorUrl(`/module/complete?learner_id=${learnerId}&course_id=${courseId}&module_id=${moduleId}`),
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
    getApiUrl(`/module/${moduleId}/content`),
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
    getApiUrl(`/module/${moduleId}/content`),
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
 * Fetch real learning objectives for a module from MongoDB (via orchestrator)
 * Falls back to empty array if not found
 */
export async function getModuleLearningObjectives(
  moduleId: string
): Promise<{ learning_objectives: string[]; found: boolean }> {
  try {
    const response = await fetch(
      getOrchestratorUrl(`/modules/${moduleId}/learning-objectives`),
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      console.warn(`[API] Failed to fetch LOs for module ${moduleId}: ${response.status}`);
      return { learning_objectives: [], found: false };
    }

    return response.json();
  } catch (err) {
    console.warn(`[API] Error fetching LOs for module ${moduleId}:`, err);
    return { learning_objectives: [], found: false };
  }
}

/**
 * Check if quiz exists in database and return it if it does
 */
export async function checkModuleQuiz(
  moduleId: string
): Promise<{ exists: boolean; quiz_data: Quiz | null }> {
  const response = await fetch(
    getApiUrl(`/module/${moduleId}/quiz`),
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
    getApiUrl(`/module/${moduleId}/quiz`),
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

// =============== Chat with Course APIs ===============

export interface ChatResponse {
  answer: string;
  sources?: any[];
}

/**
 * Chat with course content using RAG with optional module-specific context
 */
export async function chatWithCourse(
  courseId: string,
  message: string,
  moduleId?: string
): Promise<ChatResponse> {
  const requestBody: any = {
    courseid: courseId,
    userprompt: message,
  };

  // Add module_id if provided for module-specific vector store usage
  if (moduleId) {
    requestBody.moduleid = moduleId;
  }

  const response = await fetch(getSmeUrl('/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to chat with course');
  }

  return response.json();
}

// =============== Chat Logging APIs ===============

export interface ChatLogData {
  courseid: string;
  moduleid?: string;
  user_question: string;
  ai_response: string;
  sources_count?: number;
  response_time_ms?: number;
  session_id?: string;
}

export interface ChatLog {
  id: number;
  learnerid: string;
  courseid: string;
  moduleid?: string;
  user_question: string;
  ai_response: string;
  sources_count: number;
  response_time_ms?: number;
  feedback?: 'like' | 'dislike';
  session_id?: string;
  created_at: string;
}

export interface ChatLogStats {
  total_chats: number;
  unique_learners: number;
  unique_courses: number;
  avg_response_time_ms?: number;
  chats_by_course: Record<string, number>;
  chats_by_date: Record<string, number>;
}

/**
 * Log a chat interaction
 */
export async function logChatInteraction(data: ChatLogData): Promise<ChatLog> {
  const response = await fetch(getApiUrl('/chat-logs'), {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to log chat interaction');
  }

  return response.json();
}

/**
 * Get chat logs for the current learner
 */
export async function getChatLogs(params?: {
  courseid?: string;
  moduleid?: string;
  session_id?: string;
  limit?: number;
  skip?: number;
}): Promise<ChatLog[]> {
  const queryParams = new URLSearchParams();
  if (params?.courseid) queryParams.append('courseid', params.courseid);
  if (params?.moduleid) queryParams.append('moduleid', params.moduleid);
  if (params?.session_id) queryParams.append('session_id', params.session_id);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.skip) queryParams.append('skip', params.skip.toString());

  const response = await fetch(
    getApiUrl(`/chat-logs${queryParams.toString() ? '?' + queryParams.toString() : ''}`),
    {
      method: 'GET',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get chat logs');
  }

  return response.json();
}

/**
 * Get chat statistics for the current learner
 */
export async function getChatStats(courseid?: string): Promise<ChatLogStats> {
  const queryParams = new URLSearchParams();
  if (courseid) queryParams.append('courseid', courseid);

  const response = await fetch(
    getApiUrl(`/chat-logs/stats/summary${queryParams.toString() ? '?' + queryParams.toString() : ''}`),
    {
      method: 'GET',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get chat stats');
  }

  return response.json();
}

/**
 * Update feedback for a chat log entry
 */
export async function updateChatFeedback(
  logId: number,
  feedback: 'like' | 'dislike'
): Promise<ChatLog> {
  const response = await fetch(getApiUrl(`/chat-logs/${logId}/feedback`), {
    method: 'PATCH',
    headers: getAuthHeader(),
    body: JSON.stringify({ feedback }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update feedback');
  }

  return response.json();
}


// ============================================================================
// MODULE FEEDBACK API
// ============================================================================

export interface ModuleFeedback {
  id: number;
  learnerid: string;
  courseid: string;
  moduleid: string;
  module_title?: string;
  rating: number; // 1-5
  feedback_text?: string;
  created_at: string;
}

export interface ModuleFeedbackCreate {
  courseid: string;
  moduleid: string;
  module_title?: string;
  rating: number; // 1-5
  feedback_text?: string;
}

/**
 * Submit module feedback after completing a module
 */
export async function submitModuleFeedback(
  data: ModuleFeedbackCreate
): Promise<ModuleFeedback> {
  const response = await fetch(getApiUrl('/module-feedback'), {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit module feedback');
  }

  return response.json();
}

/**
 * Get module feedback for a specific module
 */
export async function getModuleFeedback(
  moduleid: string
): Promise<ModuleFeedback | null> {
  const response = await fetch(getApiUrl(`/module-feedback/${moduleid}`), {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get module feedback');
  }

  return response.json();
}


// ============================================================================
// QUIZ FEEDBACK API
// ============================================================================

export interface QuizFeedback {
  id: number;
  learnerid: string;
  courseid: string;
  moduleid: string;
  quiz_id?: number;
  module_title?: string;
  quiz_score?: number;
  rating: number; // 1-5
  feedback_text?: string;
  created_at: string;
}

export interface QuizFeedbackCreate {
  courseid: string;
  moduleid: string;
  quiz_id?: number;
  module_title?: string;
  quiz_score?: number;
  rating: number; // 1-5
  feedback_text?: string;
}

/**
 * Submit quiz feedback after completing a quiz
 */
export async function submitQuizFeedback(
  data: QuizFeedbackCreate
): Promise<QuizFeedback> {
  const response = await fetch(getApiUrl('/quiz-feedback'), {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit quiz feedback');
  }

  return response.json();
}

/**
 * Get quiz feedback for a specific module
 */
export async function getQuizFeedback(
  moduleid: string
): Promise<QuizFeedback | null> {
  const response = await fetch(getApiUrl(`/quiz-feedback/${moduleid}`), {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get quiz feedback');
  }

  return response.json();
}
