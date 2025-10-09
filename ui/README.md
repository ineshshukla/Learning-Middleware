
# LMW React - Instructor Dashboard

Welcome to the Instructor Dashboard for the LMW (Learning Management Workspace) React application. This document provides an overview of the project's structure, UI components, and how to get it running.

![Instructor Dashboard Screenshot](public/placeholder.jpg) 
*Note: The image above is a placeholder. Replace with an actual screenshot of the dashboard.*

## ✨ Features

The instructor dashboard is designed to provide a comprehensive set of tools for educators to manage their courses and students effectively.

- **📊 Analytics Dashboard:** Visualize key metrics and track learner progress with interactive charts and cards.
- **📚 Course Management:** Easily create, update, and manage courses.
- **📝 Assignment & Quiz Management:** Create and grade assignments and quizzes.
- **🤖 AI Assistant:** An integrated AI chat assistant to help with course creation and management.
- **📁 Resource Library:** A central place to upload and manage course materials.
- **👤 Profile Management:** Instructors can manage their profiles and settings.
- **📱 Responsive Design:** A fully responsive interface that works on all devices.

## 🛠️ Tech Stack

This project is built with a modern, robust, and scalable tech stack:

- **[Next.js](https://nextjs.org/):** A React framework for building server-side rendered and static web applications.
- **[TypeScript](https://www.typescriptlang.org/):** A typed superset of JavaScript that compiles to plain JavaScript.
- **[Tailwind CSS](https://tailwindcss.com/):** A utility-first CSS framework for rapid UI development.
- **[Shadcn/ui](https://ui.shadcn.com/):** A collection of re-usable components built using Radix UI and Tailwind CSS.
- **[NextAuth.js](https://next-auth.js.org/):** Authentication for Next.js applications.
- **[pnpm](https://pnpm.io/):** Fast, disk space-efficient package manager.

## 📂 Project Structure

The `instructor-dashboard` is organized to maintain a clean and scalable codebase. Here's a look at the key directories:

```
instructor-dashboard/
├── app/
│   ├── api/                # API routes (e.g., NextAuth)
│   ├── dashboard/          # Main dashboard page
│   ├── courses/            # Course listing and management pages
│   ├── assignment/         # Assignment creation and review
│   ├── chat/               # AI Assistant interface
│   ├── library/            # Resource library
│   ├── profile/            # User profile page
│   └── ...                 # Other pages and layouts
├── components/
│   ├── ui/                 # Core UI components from Shadcn/ui
│   ├── learner/            # Components shared with the learner view
│   ├── app-header.tsx      # Main application header
│   ├── app-sidebar.tsx     # Navigation sidebar
│   └── ...                 # Other custom components
├── lib/
│   ├── auth.ts             # NextAuth.js configuration
│   └── utils.ts            # Utility functions
├── public/
│   └── ...                 # Static assets (images, logos)
└── ...                     # Config files, etc.
```

## 🎨 UI and Components

The UI is built with a component-driven approach, leveraging **Shadcn/ui** for the base components and custom components for specific features.

### Core UI Components (`components/ui/`)

This directory contains the building blocks of our UI, such as:
- `Button`
- `Card`
- `Dialog`
- `Input`
- `Table`
- `Tabs`

These components are styled with Tailwind CSS and are highly customizable.

### Feature Components (`components/`)

These are higher-level components that compose the UI for different features:

- **`AppHeader` & `AppSidebar`:** Provide the main navigation and layout structure.
- **`AnalyticsChart`:** A reusable chart component for data visualization.
- **`MetricsCards`:** Displays key performance indicators on the dashboard.
- **`RecentActivity`:** A feed of recent actions and events.
- **`CourseOnboardingModal`:** A guided flow for creating a new course.

## 🚀 Getting Started

To get the instructor dashboard up and running locally, follow these steps:

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [pnpm](https://pnpm.io/installation)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/thebhavyaahuja/lmw-react.git
    cd lmw-react/instructor-dashboard
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the `instructor-dashboard` directory by copying the example file:
    ```bash
    cp .env.example .env.local
    ```
    Update the `.env.local` file with your configuration (e.g., database URL, NextAuth secret).

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```

The application should now be running at [http://localhost:3000](http://localhost:3000).

---

Thank you for contributing to the LMW React project!
