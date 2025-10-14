import { getCookie } from 'cookies-next';

const INSTRUCTOR_API_BASE = process.env.NEXT_PUBLIC_INSTRUCTOR_API_URL || "http://localhost:8003";
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
 * Publish a course to make it visible to learners
 */
export async function publishCourse(courseid: string) {
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/courses/${courseid}/publish`, {
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
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/courses/${courseid}/unpublish`, {
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
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/courses/${courseid}`, {
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
 * Add a new module to a course
 */
export async function addModule(courseid: string, moduleData: ModuleInput): Promise<Module> {
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/courses/${courseid}/modules`, {
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
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/modules/${moduleid}`, {
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
  const response = await fetch(`${INSTRUCTOR_API_BASE}${API_PREFIX}/modules/${moduleid}`, {
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

  const url = `${INSTRUCTOR_API_BASE}${API_PREFIX}/courses/${courseid}/upload-to-sme?create_vector_store=${createVectorStore}`;
  
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
 * Check vector store status for a course
 */
export async function getVectorStoreStatus(courseid: string) {
  const response = await fetch(
    `${INSTRUCTOR_API_BASE}${API_PREFIX}/courses/${courseid}/vector-store-status`,
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
 */
export async function generateLearningObjectives(
  courseid: string,
  moduleNames: string[],
  nLos: number = 6
) {
  const response = await fetch(
    `${INSTRUCTOR_API_BASE}${API_PREFIX}/courses/${courseid}/generate-los`,
    {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        courseid,
        module_names: moduleNames,
        n_los: nLos,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate learning objectives');
  }

  return response.json();
}

/**
 * Get learning objectives for a specific module
 */
export async function getModuleLearningObjectives(moduleid: string) {
  const response = await fetch(
    `${INSTRUCTOR_API_BASE}${API_PREFIX}/modules/${moduleid}/learning-objectives`,
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
    `${INSTRUCTOR_API_BASE}${API_PREFIX}/modules/${moduleid}/learning-objectives`,
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
    `${INSTRUCTOR_API_BASE}${API_PREFIX}/courses/${courseid}/create-vector-store`,
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
