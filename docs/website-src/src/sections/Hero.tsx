import { useEffect, useRef } from 'react';
import { Download, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const rotateX = (e.clientY - centerY) / 50;
      const rotateY = (centerX - e.clientX) / 50;
      imageRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      if (imageRef.current) {
        imageRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      }
    };

    const hero = heroRef.current;
    if (hero) {
      hero.addEventListener('mousemove', handleMouseMove);
      hero.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (hero) {
        hero.removeEventListener('mousemove', handleMouseMove);
        hero.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black pt-20"
    >
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff6b35]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <Sparkles className="w-4 h-4 text-[#ff6b35]" />
              <span className="text-sm text-white/80">AI驱动的论文助手</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              像一位知识渊博的
              <span className="text-gradient">师兄</span>
              一样写论文
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto lg:mx-0">
              从文献检索到最终润色，大师兄全程指导你完成学术写作之旅。
              本地AI Agent，零门槛使用。
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-8 py-6 rounded-full font-semibold text-lg transition-all duration-300 animate-pulse-glow"
              >
                <Download className="w-5 h-5 mr-2" />
                免费下载
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 px-8 py-6 rounded-full font-semibold text-lg"
              >
                <Play className="w-5 h-5 mr-2" />
                观看演示
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-12 justify-center lg:justify-start">
              <div>
                <div className="text-3xl font-bold text-white">10K+</div>
                <div className="text-sm text-white/50">活跃用户</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">50K+</div>
                <div className="text-sm text-white/50">论文完成</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">4.9</div>
                <div className="text-sm text-white/50">用户评分</div>
              </div>
            </div>

            {/* Partner Universities */}
            <div className="mt-8 text-sm text-white/40 flex items-center gap-2 justify-center lg:justify-start flex-wrap">
              <span>内测合作院校:</span>
              <span className="text-white/60">清华大学</span>
              <span>·</span>
              <span className="text-white/60">中国科学院</span>
              <span>·</span>
              <span className="text-white/60">中国科学技术大学</span>
              <span>·</span>
              <span className="text-white/60">武汉大学</span>
              <span>·</span>
              <span className="text-white/60">中南大学</span>
            </div>
          </div>

          {/* Right content - App screenshot */}
          <div
            ref={imageRef}
            className="relative transition-transform duration-200 ease-out"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              {/* App Interface Mockup */}
              <div className="bg-[#1a1a1a] aspect-video">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center">
                      <span className="text-white text-xs font-bold">大</span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">大师兄</div>
                      <div className="text-green-400 text-xs">在线</div>
                    </div>
                  </div>
                  <div className="text-white/50 text-xs">MiniMax M2.1 ▼</div>
                </div>

                {/* Chat area */}
                <div className="p-4 space-y-4">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-[#007aff] text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-[80%]">
                      <div className="text-sm">你好，帮我写一个hello world，循环一百次</div>
                    </div>
                  </div>

                  {/* AI thinking */}
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">大</span>
                    </div>
                    <div className="bg-[#3a3a3a] text-white/70 px-4 py-2 rounded-2xl rounded-tl-sm">
                      <div className="text-sm">✨ 思考了一下</div>
                    </div>
                  </div>

                  {/* AI response */}
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">大</span>
                    </div>
                    <div className="bg-[#3a3a3a] text-white px-4 py-2 rounded-2xl rounded-tl-sm max-w-[80%]">
                      <div className="text-sm">搞定了，文件在 output/hello_world.py，运行正常。</div>
                    </div>
                  </div>

                  {/* Action items */}
                  <div className="flex items-start gap-2 ml-10">
                    <div className="bg-[#2a2a2a] text-white/70 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <span className="text-xs">📄 写入文件 .../output/hello_world.py</span>
                      <span className="text-green-400 text-xs">✓</span>
                    </div>
                  </div>

                  {/* User message 2 */}
                  <div className="flex justify-end">
                    <div className="bg-[#007aff] text-white px-4 py-2 rounded-2xl rounded-tr-sm">
                      <div className="text-sm">运行起来看一下</div>
                    </div>
                  </div>

                  {/* AI response 2 */}
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">大</span>
                    </div>
                    <div className="bg-[#3a3a3a] text-white px-4 py-2 rounded-2xl rounded-tl-sm max-w-[80%]">
                      <div className="text-sm">跑完了，100次 Hello World 正常输出。</div>
                    </div>
                  </div>
                </div>

                {/* Input area */}
                <div className="px-4 py-3 bg-[#252525] border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-[#3a3a3a] rounded-full px-4 py-2">
                      <span className="text-white/40 text-sm">和大师兄说点什么...</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#007aff] flex items-center justify-center">
                      <span className="text-white text-xs">🎤</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-[#ff6b35]/20 rounded-full blur-xl animate-float" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
