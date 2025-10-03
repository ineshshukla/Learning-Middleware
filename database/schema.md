# Postgres
## Instructor
- InstructorID
- Library (contains all the uploaded content) -> mongoDB ref

## Course
- CourseID
- InstructorID
- CourseDescription
- TargetAudience
- Prereqs
- LearningObjectives -> mongoDB ref

## Learner
- LearnerID
- EnrolledCourses

## LearnerAttribute
- LearnerID
- Education
- Interests

## Quiz
- QuizID
- QuizContent -> mongoDB ref
- LearnerID
- LearnerResponse -> mongoDB ref
- ModuleID
- Score
- Status (ongoing/completed)

## CourseContent
- CourseID
- LearnerID
- CourseContent -> mongoDB ref (modules)
- Preferences -> mongoDB ref
- CurrentModule
- Status (ongoing/completed)


# Mongo
## Library -> Key InstructorID
```
{
  "InstructorID": "instructor123",
  "uploads": [
    {
      "fileId": "f001",
      "filename": "resume.pdf",
      "contentType": "application/pdf",
      "size": 204800,
      "uploadDate": "2025-10-04T09:00:00Z",
      "storagePath": "/uploads/instructor123/resume.pdf" 
    }
    ...
  ]
}

```
## CourseLearningObjective -> Key CourseID
```
{
  "CourseID": "CSE101",
  "learningObjectives": [
    "Understand basic data structures",
    "Implement sorting algorithms",
    "Analyze algorithm complexity"
  ]
}

```
## CourseContent_Pref -> Key (CourseID, LearnerID)
```
{
  "_id": {
    "CourseID": "CSE101",
    "LearnerID": "L123"
  },
  "preferences": {
    "DetailLevel": "detailed|moderate|brief",
    "ExplanationStyle": "examples-heavy|conceptual|practical|visual",
    "Language": "simple|technical|balanced"
  },
  "lastUpdated": "2025-10-04T10:30:00Z"
}
```
## QuizContent -> Key QuizID
```
{
  "QuizID": "QZ1001",
  "title": "Module 1 Quiz",
  "questions": [
    {
      "questionNo": "q1",
      "questionText": "What is the time complexity of binary search?",
      "options": [
        "O(n)",
        "O(log n)",
        "O(n log n)",
        "O(1)"
      ],
      "correctAnswer": "O(log n)"
    },
    {
      "questionNo": "q2",
      "questionText": "Which data structure uses FIFO?",
      "options": ["Stack", "Queue", "Graph", "Tree"],
      "correctAnswer": "Queue"
    }
    ...
  ]
}

```
## LearnerResponse -> Key QuizID
```
{
  "_id": {
    "QuizID": "QZ1001",
    "LearnerID": "L123"
  },
  "responses": [
    {
      "questionNo": "q1",
      "selectedOption": "O(log n)",
      "isCorrect": true
    },
    {
      "questionNo": "q2",
      "selectedOption": "Stack",
      "isCorrect": false
    }
    ...
  ],
  "submittedAt": "2025-10-04T10:00:00Z"
}

```
## CourseContent -> Key (CourseID, LearnerID)
```
{
  "_id": {
    "CourseID": "CSE101",
    "LearnerID": "L123"
  },
  "modules": [
    {
      "moduleId": "M1",
      "title": "Introduction to Data Structures",
      "contentPath": "/content/L123/CSE101/M1",
      "status": "completed"
    },
    {
      "moduleId": "M2",
      "title": "Sorting Algorithms",
      "contentPath": "/content/L123/CSE101/M2",
      "status": "in-progress"
    }
    ...
  ],
  "currentModule": "M2",
  "status": "ongoing"
}

```