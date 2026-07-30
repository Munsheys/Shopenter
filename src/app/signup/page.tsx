import { Suspense } from 'react';
import SignupContent from './SignupContent';

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100" />}>
      <SignupContent />
    </Suspense>
  );
}
