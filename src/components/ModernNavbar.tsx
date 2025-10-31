'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { Shield, Menu, X, ChevronDown } from "lucide-react";

export default function ModernNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      dir="rtl"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-lg shadow-lg border-b border-slate-200' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className={`w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold transition-colors ${isScrolled ? 'text-slate-900' : 'text-white'}`}>
                Clearpoint
              </h1>
              <p className={`text-xs transition-colors ${isScrolled ? 'text-blue-600' : 'text-blue-300'}`}>
                Security Solutions
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href="/#features" 
              className={`font-medium transition-colors hover:text-blue-600 ${
                isScrolled ? 'text-slate-700' : 'text-white'
              }`}
            >
              למה Clearpoint?
            </Link>
            <Link 
              href="/#plans" 
              className={`font-medium transition-colors hover:text-blue-600 ${
                isScrolled ? 'text-slate-700' : 'text-white'
              }`}
            >
              חבילות ומחירים
            </Link>
            <Link 
              href="/about" 
              className={`font-medium transition-colors hover:text-blue-600 ${
                isScrolled ? 'text-slate-700' : 'text-white'
              }`}
            >
              אודות
            </Link>
            <Link 
              href="/services" 
              className={`font-medium transition-colors hover:text-blue-600 ${
                isScrolled ? 'text-slate-700' : 'text-white'
              }`}
            >
              שירותים
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link 
              href="/login"
              className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                isScrolled 
                  ? 'text-slate-700 hover:bg-slate-100' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              התחברות
            </Link>
            <Link 
              href="/subscribe"
              className="px-5 py-2.5 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              הרשמה
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isScrolled 
                ? 'text-slate-900 hover:bg-slate-100' 
                : 'text-white hover:bg-white/10'
            }`}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 bg-white/95 backdrop-blur-lg">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/#features" 
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors px-4 py-2 hover:bg-slate-50 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                למה Clearpoint?
              </Link>
              <Link 
                href="/#plans" 
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors px-4 py-2 hover:bg-slate-50 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                חבילות ומחירים
              </Link>
              <Link 
                href="/about" 
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors px-4 py-2 hover:bg-slate-50 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                אודות
              </Link>
              <Link 
                href="/services" 
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors px-4 py-2 hover:bg-slate-50 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                שירותים
              </Link>
              <div className="border-t border-slate-200 pt-4 mt-2 space-y-2">
                <Link 
                  href="/login"
                  className="block text-center px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  התחברות
                </Link>
                <Link 
                  href="/subscribe"
                  className="block text-center px-4 py-2.5 bg-gradient-to-l from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  הרשמה
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
