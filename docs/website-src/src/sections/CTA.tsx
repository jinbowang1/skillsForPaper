import { useEffect, useRef, useState } from 'react';
import { Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTA() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 overflow-hidden"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#ff6b35] via-[#e55a2b] to-[#ff6b35] animate-gradient" />
      
      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2
          className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          准备好改变你的写作过程了吗？
        </h2>
        <p
          className={`text-lg text-white/80 mb-10 max-w-2xl mx-auto transition-all duration-700 delay-150 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          加入成千上万已经使用大师兄的学生和研究人员，让AI助力你的学术之旅
        </p>
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <Button
            size="lg"
            className="bg-white text-[#ff6b35] hover:bg-white/90 px-8 py-6 rounded-full font-semibold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
          >
            <Download className="w-5 h-5 mr-2" />
            免费下载
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 px-8 py-6 rounded-full font-semibold text-lg"
          >
            了解更多
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
