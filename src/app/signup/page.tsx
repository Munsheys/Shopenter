import { Suspense } from 'react';
import SignupContent from './SignupContent';

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7faf8]" />}>
      <SignupContent />
    </Suspense>
  );
}
