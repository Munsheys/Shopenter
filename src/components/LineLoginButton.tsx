'use client';

import { useState } from 'react';

interface LineLoginButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
}

export default function LineLoginButton({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  label = 'Sign in with LINE',
  loadingLabel = 'Redirecting...',
}: LineLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLineLogin = () => {
    if (disabled) return;
    setIsLoading(true);
    // Redirect to LINE OAuth authorization endpoint
    window.location.href = '/api/auth/line/authorize';
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    primary: 'bg-[#00B900] hover:bg-[#009500] text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300',
  };

  return (
    <button
      onClick={handleLineLogin}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {/* LINE Logo */}
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C6.48 2 2 5.58 2 10c0 2.54 1.19 4.85 3.15 6.37.09 2.85-1.4 5.57-2.05 6.29.56.42 2.36 1.42 5.5-.66 1.02.22 2.08.34 3.4.34 5.52 0 10-3.58 10-8 0-4.42-4.48-8-10-8z" />
      </svg>
      {isLoading ? loadingLabel : label}
    </button>
  );
}
