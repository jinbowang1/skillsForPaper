import { useEffect, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';

export function Demo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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
      id="demo"
      ref={sectionRef}
      className="relative py-32 bg-black overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#ff6b35]/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            观看大师兄的
            <span className="text-gradient">实际操作</span>
          </h2>
          <p
            className={`text-lg text-white/60 max-w-2xl mx-auto transition-all duration-700 delay-150 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            看看大师兄如何帮助你轻松写论文
          </p>
        </div>

        {/* Video container */}
        <div
          className={`relative transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
          }`}
        >
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
            {/* Video thumbnail / placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]">
              {/* Mock app interface for video thumbnail */}
              <div className="absolute inset-0 flex">
                {/* Sidebar */}
                <div className="w-64 bg-[#1e1e1e] border-r border-white/5 p-4 hidden sm:block">
                  <div className="text-white/50 text-sm mb-4">书桌</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                      <div className="w-8 h-8 rounded bg-[#ff6b35]/20 flex items-center justify-center">
                        <span className="text-[#ff6b35] text-xs">📄</span>
                      </div>
                      <div>
                        <div className="text-white text-sm">毕业论文</div>
                        <div className="text-white/40 text-xs">thesis.pdf</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg">
                      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                        <span className="text-white/50 text-xs">📄</span>
                      </div>
                      <div>
                        <div className="text-white/70 text-sm">开题报告</div>
                        <div className="text-white/30 text-xs">opening.pdf</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat area */}
                <div className="flex-1 bg-[#121212] p-4">
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                    <div className="w-10 h-10 rounded-full bg-[#ff6b35] flex items-center justify-center">
                      <span className="text-white font-bold">大</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">大师兄</div>
                      <div className="text-green-400 text-xs">在线</div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="mt-4 space-y-4">
                    <div className="flex justify-end">
                      <div className="bg-[#007aff] text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-[70%]">
                        <div className="text-sm">帮我找一下深度学习相关的最新文献</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">大</span>
                      </div>
                      <div className="bg-[#2a2a2a] text-white px-4 py-2 rounded-2xl rounded-tl-sm max-w-[70%]">
                        <div className="text-sm">正在搜索深度学习相关文献...</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Play button overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <button
                  onClick={() => setIsPlaying(true)}
                  className="w-20 h-20 rounded-full bg-[#ff6b35] flex items-center justify-center transition-all duration-300 hover:scale-110 hover:bg-[#e55a2b] group"
                >
                  <Play className="w-8 h-8 text-white ml-1" />
                  {/* Pulse rings */}
                  <span className="absolute w-full h-full rounded-full bg-[#ff6b35] animate-ping opacity-30" />
                  <span className="absolute w-full h-full rounded-full bg-[#ff6b35] animate-ping opacity-20 delay-300" />
                </button>
              </div>
            )}

            {/* Actual video */}
            {isPlaying && (
              <div className="absolute inset-0 bg-black">
                <video
                  src="/assets/demo_video.mp4"
                  autoPlay
                  controls
                  className="w-full h-full object-contain"
                  onEnded={() => setIsPlaying(false)}
                />
                <button
                  onClick={() => setIsPlaying(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-[#ff6b35]/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
        </div>

        {/* Feature highlights */}
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 transition-all duration-700 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {[
            { label: '本地运行', value: '100%' },
            { label: '支持格式', value: '20+' },
            { label: '响应速度', value: '<1s' },
            { label: '准确率', value: '99%' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-[#ff6b35] mb-1">{stat.value}</div>
              <div className="text-white/50 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
