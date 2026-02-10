import { useState, useEffect } from 'react';
import { Download, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: '首页', href: '#hero' },
    { label: '功能', href: '#features' },
    { label: '演示', href: '#demo' },
    { label: '下载', href: '#download' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-black/80 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a
            href="#hero"
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-full bg-[#ff6b35] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <span className="text-white font-bold text-lg">大</span>
            </div>
            <span className="text-white font-semibold text-xl">大师兄</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-white/70 hover:text-white transition-colors duration-300 text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button
              className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-6 py-2 rounded-full font-medium transition-all duration-300 animate-pulse-glow"
            >
              <Download className="w-4 h-4 mr-2" />
              立即下载
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10">
          <div className="px-4 py-6 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-white/70 hover:text-white transition-colors duration-300 text-lg font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Button
              className="w-full bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-6 py-3 rounded-full font-medium mt-4"
            >
              <Download className="w-4 h-4 mr-2" />
              立即下载
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
