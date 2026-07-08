'use client';

import { useState } from 'react';
import LineLoginButton from './LineLoginButton';

export default function LineOAuthSignupForm() {
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    shopName: '',
    agreedToTerms: false,
    agreedToPrivacy: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email || !formData.password || !formData.shopName) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.agreedToTerms || !formData.agreedToPrivacy) {
      setError('Please agree to Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/merchant/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          shopName: formData.shopName,
          agreedToTerms: formData.agreedToTerms,
          agreedToPrivacy: formData.agreedToPrivacy,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Signup failed');
        return;
      }

      setSuccess(true);
      // Redirect to dashboard after success
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showEmailSignup) {
    return (
      <div className="space-y-4">
        <form onSubmit={handleEmailSignup} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              Account created! Redirecting...
            </div>
          )}

          <div>
            <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-1">
              Shop Name
            </label>
            <input
              id="shopName"
              name="shopName"
              type="text"
              value={formData.shopName}
              onChange={handleInputChange}
              placeholder="My Awesome Shop"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B900]"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B900]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password (min. 8 characters)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B900]"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B900]"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                name="agreedToTerms"
                type="checkbox"
                checked={formData.agreedToTerms}
                onChange={handleInputChange}
                required
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#00B900] hover:underline">
                  Terms of Service
                </a>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                name="agreedToPrivacy"
                type="checkbox"
                checked={formData.agreedToPrivacy}
                onChange={handleInputChange}
                required
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">
                I agree to the{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#00B900] hover:underline">
                  Privacy Policy
                </a>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-[#00B900] hover:bg-[#009500] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        <button
          onClick={() => setShowEmailSignup(false)}
          className="w-full py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back to LINE Sign Up
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <LineLoginButton variant="primary" size="lg" className="w-full" />
        <p className="text-center text-sm text-gray-600 mt-2">
          Create your store with LINE. No password needed.
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      <button
        onClick={() => setShowEmailSignup(true)}
        className="w-full py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
      >
        Create Account with Email
      </button>

      <p className="text-center text-xs text-gray-600">
        By signing up, you agree to our{' '}
        <a href="/terms" className="text-[#00B900] hover:underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-[#00B900] hover:underline">
          Privacy Policy
        </a>
      </p>
    </div>
  );
}
