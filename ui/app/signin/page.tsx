"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setCookie } from 'cookies-next';
import { jwtDecode } from 'jwt-decode';

export default function SignIn() {
  const router = useRouter();

  const handleCredentialResponse = (response: any) => {
    console.log("Encoded JWT ID token: " + response.credential);
    const decoded: any = jwtDecode(response.credential);
    console.log(decoded);
    setCookie('googleId', response.credential, { path: '/' });
    router.push('/');
  }

  useEffect(() => {
    const initializeGsi = () => {
      if (window.google) {
        google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse
        });
        google.accounts.id.renderButton(
          document.getElementById("buttonDiv"),
          { theme: "outline", size: "large" }  // customization attributes
        );
        google.accounts.id.prompt(); // also display the One Tap dialog
      }
    }

    const checkGoogle = setInterval(() => {
        if (window.google) {
            clearInterval(checkGoogle);
            initializeGsi();
        }
    }, 100);

  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Sign In</h1>
        <p className="text-gray-600 mb-6 text-center">Please sign in with your Google account to continue.</p>
        <div id="buttonDiv" className="flex justify-center"></div>
      </div>
    </div>
  );
}