import { getCookie } from 'cookies-next';

const INSTRUCTOR_API_BASE = process.env.NEXT_PUBLIC_INSTRUCTOR_API_URL || "http://localhost:8003";

/**
 * Helper function to construct API URL
 * Backends now handle routes without prefixes, nginx handles the /api/instructor routing
 */
function getApiUrl(endpoint: string): string {
  return `${INSTRUCTOR_API_BASE}${endpoint}`;
}

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
  is_published?: boolean;
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

export interface KliJobSummary {
  job_id: string;
  course_id: string;
  module_id: string;
  module_title?: string;
  lo_id: string;
  lo_text: string;
  status: string;
  stage: string;
  approved: boolean;
  plan_ready: boolean;
  golden_ready: boolean;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface KliCoursePipelineStatus {
  courseid: string;
  total_jobs: number;
  queued_jobs: number;
  in_progress_jobs: number;
  review_pending_jobs: number;
  approved_jobs: number;
  failed_jobs: number;
  current_job: KliJobSummary | null;
  jobs: KliJobSummary[];
}

export interface KliJobDetail extends KliJobSummary {
  plan?: Record<string, any> | null;
  golden_sample?: Record<string, any> | null;
  review?: Record<string, any> | null;
}

export interface KliContentGenerationResponse {
  courseid: string;
  status: string;
  message: string;
  generated_modules: number;
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
  const response = await fetch(getApiUrl('/login'), {
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
 * Get current instructor info
 */
export async function getCurrentInstructor() {
  const response = await fetch(getApiUrl('/me'), {
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
 * Get a specific course by ID
 */
export async function getCourse(courseid: string): Promise<CourseWithModules> {
  const response = await fetch(getApiUrl(`/courses/${courseid}`), {
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
 * Publish a course to make it visible to learners
 */
export async function publishCourse(courseid: string) {
  const response = await fetch(getApiUrl(`/courses/${courseid}/publish`), {
    method: 'PUT',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to publish course');
  }

  return response.json();
}

/**
 * Unpublish a course to hide it from learners
 */
export async function unpublishCourse(courseid: string) {
  const response = await fetch(getApiUrl(`/courses/${courseid}/unpublish`), {
    method: 'PUT',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to unpublish course');
  }

  return response.json();
}

/**
 * Delete a course and all associated data
 */
export async function deleteCourse(courseid: string) {
  const response = await fetch(getApiUrl(`/courses/${courseid}`), {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete course');
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
  const response = await fetch(getApiUrl('/courses'), {
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

  const response = await fetch(getApiUrl(`/courses/${courseid}/upload`), {
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
 * Add a new module to a course
 */
export async function addModule(courseid: string, moduleData: ModuleInput): Promise<Module> {
  const response = await fetch(getApiUrl(`/courses/${courseid}/modules`), {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(moduleData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add module');
  }

  return response.json();
}

/**
 * Update a module
 */
export async function updateModule(moduleid: string, moduleData: Partial<ModuleInput>): Promise<Module> {
  const response = await fetch(getApiUrl(`/modules/${moduleid}`), {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(moduleData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update module');
  }

  return response.json();
}

/**
 * Delete a module
 */
export async function deleteModule(moduleid: string): Promise<void> {
  const response = await fetch(getApiUrl(`/modules/${moduleid}`), {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete module');
  }
}

/**
 * Get learning objectives for a module
 */
export async function getModuleObjectives(moduleid: string) {
  const response = await fetch(getApiUrl(`/modules/${moduleid}/objectives`), {
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
  const response = await fetch(getApiUrl(`/modules/${moduleid}/objectives`), {
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

/**
 * Upload files to SME service and create vector store
 */
export async function uploadFilesToSME(
  courseid: string, 
  files: File[],
  createVectorStore: boolean = true
) {
  const token = getCookie('instructor_token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const url = getApiUrl(`/courses/${courseid}/upload-to-sme?create_vector_store=${createVectorStore}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload files to SME');
  }

  return response.json();
}

/**
 * Upload files to a specific module
 */
export async function uploadModuleFiles(
  moduleid: string,
  files: File[],
  createVectorStore: boolean = false
) {
  const token = getCookie('instructor_token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const url = getApiUrl(`/modules/${moduleid}/upload?create_vector_store=${createVectorStore}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload module files');
  }

  return response.json();
}

/**
 * Check vector store status for a course
 */
export async function getVectorStoreStatus(courseid: string) {
  const response = await fetch(
    getApiUrl(`/courses/${courseid}/vector-store-status`),
    {
      method: 'GET',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get vector store status');
  }

  return response.json();
}

/**
 * Generate learning objectives for course modules
 * @deprecated Legacy name retained for compatibility. This now initializes
 * KLI async processing from existing module learning objectives.
 */
export async function generateLearningObjectives(
  courseid: string,
  moduleNames: string[],
  nLos: number = 6
) {
  // Unused args are kept to avoid breaking old callsites.
  void moduleNames;
  void nLos;
  return initKliPipeline(courseid, false);
}

/**
 * Get learning objectives for a specific module
 */
export async function getModuleLearningObjectives(moduleid: string) {
  const response = await fetch(
    getApiUrl(`/modules/${moduleid}/learning-objectives`),
    {
      method: 'GET',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get learning objectives');
  }

  return response.json();
}

/**
 * Update learning objectives for a module
 */
export async function updateModuleLearningObjectives(
  moduleid: string,
  learningObjectives: string[]
) {
  const response = await fetch(
    getApiUrl(`/modules/${moduleid}/learning-objectives`),
    {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({
        moduleid,
        learning_objectives: learningObjectives,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update learning objectives');
  }

  return response.json();
}

/**
 * Create vector store manually (if needed)
 */
export async function createVectorStore(courseid: string) {
  const response = await fetch(
    getApiUrl(`/courses/${courseid}/create-vector-store`),
    {
      method: 'POST',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create vector store');
  }

  return response.json();
}

/**
 * Initialize async KLI pipeline jobs for all module learning objectives in a course.
 */
export async function initKliPipeline(courseid: string, resetExisting: boolean = false) {
  const response = await fetch(
    getApiUrl(`/courses/${courseid}/kli/pipeline/init`),
    {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ reset_existing: resetExisting }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to initialize KLI pipeline');
  }

  return response.json();
}

/**
 * Manually trigger KLI background worker for queued jobs.
 */
export async function runKliPipeline(courseid: string) {
  const response = await fetch(
    getApiUrl(`/courses/${courseid}/kli/pipeline/run`),
    {
      method: 'POST',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start KLI pipeline worker');
  }

  return response.json();
}

/**
 * Get aggregated async KLI pipeline status for a course.
 */
export async function getKliPipelineStatus(courseid: string): Promise<KliCoursePipelineStatus> {
  const response = await fetch(
    getApiUrl(`/courses/${courseid}/kli/pipeline/status`),
    {
      method: 'GET',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch KLI pipeline status');
  }

  return response.json();
}

/**
 * Fetch detailed plan/golden payload for a single KLI pipeline job.
 */
export async function getKliPipelineJobDetail(courseid: string, jobId: string): Promise<KliJobDetail> {
  const response = await fetch(
    getApiUrl(`/courses/${courseid}/kli/pipeline/jobs/${jobId}`),
    {
      method: 'GET',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch KLI job details');
  }

  return response.json();
}

/**
 * Instructor review for quorum plan.
 */
export async function reviewKliPlan(
  courseid: string,
  jobId: string,
  payload: {
    approved: boolean;
    edited_plan?: Record<string, any>;
    review_notes?: string;
  }
) {
  const response = await fetch(
    getApiUrl(`/courses/${courseid}/kli/pipeline/jobs/${jobId}/review-plan`),
    {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit KLI plan review');
  }

  return response.json();
}

/**
 * Instructor review for generated golden sample.
 */
export async function reviewKliGolden(
  courseid: string,
  jobId: string,
  payload: {
    approved: boolean;
    edited_golden_sample?: Record<string, any>;
    review_notes?: string;
  }
) {
  const response = await fetch(
    getApiUrl(`/courses/${courseid}/kli/pipeline/jobs/${jobId}/review-golden`),
    {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit KLI golden review');
  }

  return response.json();
}

/**
 * Generate final module content from approved KLI outputs.
 */
export async function generateKliModuleContent(
  courseid: string
): Promise<KliContentGenerationResponse> {
  const response = await fetch(
    getApiUrl(`/courses/${courseid}/kli/pipeline/generate-content`),
    {
      method: 'POST',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate module content');
  }

  return response.json();
}
