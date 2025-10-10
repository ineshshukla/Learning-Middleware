"use client";

import { deleteCookie, getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = () => {
    const userRole = getCookie('user_role');
    const instructorToken = getCookie('instructor_token');
    const learnerToken = getCookie('learner_token');

    // Handle instructor signout
    if (userRole === 'instructor' && instructorToken) {
      deleteCookie('instructor_token');
      deleteCookie('user_role');
      router.push('/instructor/auth');
      return;
    }

    // Handle learner signout
    if (userRole === 'learner' && learnerToken) {
      deleteCookie('learner_token');
      deleteCookie('user_role');
      router.push('/learner/auth');
      return;
    }

    // Fallback: clear all cookies and redirect to home
    deleteCookie('instructor_token');
    deleteCookie('learner_token');
    deleteCookie('user_role');
    router.push('/');
  };

  return (
    <Button onClick={handleSignOut} variant="outline">
      Sign Out
    </Button>
  );
}
