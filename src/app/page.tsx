"use client";

import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  BarChart3,
  Users,
  MessageSquare,
  Zap,
  Check,
  ArrowRight,
  Globe,
  Lock,
  Smartphone
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  const features = [
    {
      icon: ShoppingCart,
      title: "Multi-Channel Selling",
      description: "Manage your LINE OA, website storefront, and orders in one dashboard"
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Track sales, inventory, and customer insights instantly"
    },
    {
      icon: Users,
      title: "Customer Management",
      description: "Keep track of all your customers and their purchase history"
    },
    {
      icon: MessageSquare,
      title: "LINE Chat Integration",
      description: "Send order updates and promotions directly via LINE"
    },
    {
      icon: Zap,
      title: "Instant Setup",
      description: "Go live in minutes with our quick configuration wizard"
    },
    {
      icon: Globe,
      title: "Custom Storefront",
      description: "Build your unique brand with customizable shop themes"
    },
  ];

  const benefits = [
    "No coding required - pure no-code management",
    "Unlimited products and orders",
    "Secure payment processing with PromptPay",
    "Mobile-friendly storefronts",
    "24/7 platform reliability",
    "Import/export data anytime"
  ];

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white">
      {/* Navigation */}
      <nav className="border-b border-[#1f2335] sticky top-0 z-50 bg-[#0a0d14]/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#00b900]/10 text-[#00b900] rounded-lg flex items-center justify-center font-bold">
              OA
            </div>
            <span className="text-xl font-bold">LineOA SaaS</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2 text-[#8b92ad] hover:text-white transition"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="px-6 py-3 bg-[#00b900] hover:bg-[#009900] text-white font-bold rounded-xl transition"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="space-y-6 mb-12">
          <div className="inline-block px-4 py-2 bg-[#00b900]/10 border border-[#00b900]/20 rounded-full">
            <span className="text-[#00b900] text-sm font-semibold">✨ All-in-One E-Commerce Platform</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Sell on LINE with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00b900] to-[#00ff00]"> Zero Code</span>
          </h1>

          <p className="text-xl text-[#8b92ad] max-w-2xl mx-auto">
            Turn your LINE Official Account into a powerful e-commerce store.
            Manage inventory, process orders, and grow your business—all from one beautiful dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <button
              onClick={() => router.push('/signup')}
              className="px-8 py-4 bg-[#00b900] hover:bg-[#009900] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition transform hover:scale-105"
            >
              Start Free Trial
              <ArrowRight size={20} />
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-[#1a1d2e] hover:bg-[#1f2335] text-white font-bold rounded-2xl border border-[#1f2335] transition"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Hero Image/Stats */}
        <div className="grid grid-cols-3 gap-8 mt-20 pt-20 border-t border-[#1f2335]">
          <div className="space-y-2">
            <div className="text-3xl font-bold text-[#00b900]">1000+</div>
            <div className="text-[#8b92ad]">Active Shops</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-[#00b900]">50K+</div>
            <div className="text-[#8b92ad]">Monthly Orders</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-[#00b900]">99.9%</div>
            <div className="text-[#8b92ad]">Uptime</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#1f2335]">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-[#8b92ad] text-lg">Powerful features designed for modern e-commerce businesses</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="p-8 bg-[#161925] border border-[#1f2335] rounded-2xl hover:border-[#00b900]/30 transition">
                <Icon className="text-[#00b900] mb-4" size={32} />
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-[#8b92ad]">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#1f2335]">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Get Started in 3 Steps</h2>
          <p className="text-[#8b92ad] text-lg">Simple setup, powerful results</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Create Account",
              description: "Sign up with your email and set your shop name. Takes 2 minutes."
            },
            {
              step: "2",
              title: "Connect LINE OA",
              description: "Link your LINE Official Account and configure your products."
            },
            {
              step: "3",
              title: "Start Selling",
              description: "Share your storefront and start receiving orders instantly."
            }
          ].map((item, idx) => (
            <div key={idx} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#00b900] text-[#0a0d14] font-bold text-lg rounded-full flex items-center justify-center">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-[#8b92ad]">{item.description}</p>
                </div>
              </div>
              {idx < 2 && (
                <div className="hidden md:block absolute top-6 right-0 transform translate-x-1/2 text-[#1f2335]">
                  <ArrowRight size={24} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#1f2335]">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">Why Choose LineOA?</h2>
            <ul className="space-y-4">
              {benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check className="text-[#00b900] flex-shrink-0 mt-1" size={24} />
                  <span className="text-lg text-[#8b92ad]">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <div className="p-8 bg-[#161925] border border-[#1f2335] rounded-2xl">
              <Lock className="text-[#00b900] mb-4" size={32} />
              <h3 className="text-xl font-bold mb-2">Bank-Grade Security</h3>
              <p className="text-[#8b92ad]">Your data is encrypted and protected with industry-leading security standards.</p>
            </div>

            <div className="p-8 bg-[#161925] border border-[#1f2335] rounded-2xl">
              <Smartphone className="text-[#00b900] mb-4" size={32} />
              <h3 className="text-xl font-bold mb-2">Mobile Optimized</h3>
              <p className="text-[#8b92ad]">Manage your shop from anywhere with our responsive mobile design.</p>
            </div>

            <div className="p-8 bg-[#161925] border border-[#1f2335] rounded-2xl">
              <Zap className="text-[#00b900] mb-4" size={32} />
              <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
              <p className="text-[#8b92ad]">Optimized performance ensures your customers have the best experience.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#1f2335]">
        <div className="bg-gradient-to-r from-[#00b900]/10 to-[#00ff00]/10 border border-[#00b900]/20 rounded-3xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your LINE Business?</h2>
          <p className="text-xl text-[#8b92ad] mb-8">Start your free trial today. No credit card required.</p>
          <button
            onClick={() => router.push('/signup')}
            className="px-8 py-4 bg-[#00b900] hover:bg-[#009900] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition transform hover:scale-105 mx-auto"
          >
            Get Started Now
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f2335] mt-20 py-12 text-center text-[#8b92ad]">
        <p>&copy; 2024 LineOA SaaS. All rights reserved. | Privacy Policy | Terms of Service</p>
      </footer>
    </div>
  );
}
