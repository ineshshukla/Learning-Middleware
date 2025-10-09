"use client";

import { deleteCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = () => {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(() => {
      deleteCookie('googleId');
      router.push('/signin');
    });
  };

  return (
    <Button onClick={handleSignOut} variant="outline">
      Sign Out
    </Button>
  );
}
