import { useEffect, useRef, useState } from 'react';
import { Apple, Monitor, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DownloadSection() {
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
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="download"
      ref={sectionRef}
      className="relative py-32 bg-black overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#ff6b35]/10 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div>
            <h2
              className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              今天开始你的
              <span className="text-gradient">学术之旅</span>
            </h2>
            <p
              className={`text-lg text-white/60 mb-10 transition-all duration-700 delay-150 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              下载大师兄，让AI的力量助你轻松写论文。本地运行，数据安全，零门槛使用。
            </p>

            {/* Download buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-4 mb-8 transition-all duration-700 delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <Button
                size="lg"
                className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-8 py-6 rounded-xl font-semibold text-lg transition-all duration-300 animate-pulse-glow flex items-center gap-3"
              >
                <Monitor className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-xs opacity-80">下载 for</div>
                  <div className="font-bold">Windows</div>
                </div>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 px-8 py-6 rounded-xl font-semibold text-lg flex items-center gap-3"
              >
                <Apple className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-xs opacity-80">下载 for</div>
                  <div className="font-bold">macOS</div>
                </div>
              </Button>
            </div>

            {/* System requirements */}
            <div
              className={`text-white/40 text-sm transition-all duration-700 delay-400 ${
                isVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              系统要求: Windows 10+ | macOS 12+ | 4GB RAM
            </div>

            {/* Features list */}
            <div
              className={`mt-10 space-y-3 transition-all duration-700 delay-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              {[
                '本地运行，数据永不离开你的电脑',
                '自动下载所需软件，零配置',
                '支持多种学术格式和引用规范',
                '免费试用，无需信用卡',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#ff6b35]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#ff6b35]" />
                  </div>
                  <span className="text-white/70">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right content - Device mockup */}
          <div
            className={`relative transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
            }`}
          >
            <div className="relative">
              {/* Laptop frame */}
              <div className="relative bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-t-2xl p-4 shadow-2xl">
                {/* Screen bezel */}
                <div className="bg-black rounded-lg overflow-hidden">
                  {/* Screen content */}
                  <div className="aspect-[16/10] bg-[#121212]">
                    {/* App header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center">
                          <span className="text-white text-xs font-bold">大</span>
                        </div>
                        <span className="text-white text-sm font-medium">大师兄</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                    </div>

                    {/* App content */}
                    <div className="flex h-full">
                      {/* Sidebar */}
                      <div className="w-32 bg-[#1a1a1a] border-r border-white/5 p-3 hidden sm:block">
                        <div className="text-white/40 text-xs mb-2">书桌</div>
                        <div className="space-y-2">
                          <div className="p-2 rounded bg-white/5">
                            <div className="text-white text-xs">毕业论文</div>
                          </div>
                          <div className="p-2 rounded">
                            <div className="text-white/50 text-xs">开题报告</div>
                          </div>
                        </div>
                      </div>

                      {/* Chat */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#ff6b35] flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[10px] font-bold">大</span>
                          </div>
                          <div className="bg-[#2a2a2a] text-white px-3 py-2 rounded-xl rounded-tl-sm text-xs">
                            你好！我是大师兄，你的AI论文助手。今天想写什么论文？
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Camera */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#1a1a1a]" />
              </div>

              {/* Laptop base */}
              <div className="relative">
                <div className="h-4 bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] rounded-b-lg" />
                <div className="h-2 bg-[#1a1a1a] rounded-b-xl mx-8" />
              </div>

              {/* Glow effect */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-[#ff6b35]/20 rounded-full blur-3xl" />
            </div>

            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 px-4 py-2 bg-[#ff6b35] rounded-full text-white text-sm font-medium animate-float">
              即将上线
            </div>
            <div className="absolute -bottom-4 -left-4 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm animate-float" style={{ animationDelay: '1s' }}>
              v1.0.0
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
