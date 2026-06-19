import { Suspense } from 'react';
import JoinContent from './JoinContent';

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-accent to-[#005500] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
