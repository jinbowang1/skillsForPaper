import { useEffect, useRef, useState } from 'react';
import { BookOpen, Lightbulb, FileText, Code2, Sparkles } from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: '文献检索',
    description: '自动搜索、下载和管理学术文献，支持知网、Google Scholar等多个数据库。',
    color: '#ff6b35',
  },
  {
    icon: Lightbulb,
    title: '创新点挖掘',
    description: 'AI分析领域趋势，发现研究空白，帮你找到有价值的创新方向。',
    color: '#ff6b35',
  },
  {
    icon: FileText,
    title: '论文写作',
    description: '从大纲到全文，一步步完成。支持各种学术格式和规范。',
    color: '#ff6b35',
  },
  {
    icon: Code2,
    title: '代码执行',
    description: '本地运行代码，验证实验结果，自动生成图表和数据分析。',
    color: '#ff6b35',
  },
  {
    icon: Sparkles,
    title: '智能润色',
    description: '优化表达，提升学术规范性，让你的论文更加专业。',
    color: '#ff6b35',
  },
];

export function Features() {
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
      id="features"
      ref={sectionRef}
      className="relative py-32 bg-black overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ff6b35]/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-20">
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            一站式论文写作
            <span className="text-gradient">解决方案</span>
          </h2>
          <p
            className={`text-lg text-white/60 max-w-2xl mx-auto transition-all duration-700 delay-150 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            从文献检索到最终润色，大师兄全程指导你完成学术写作之旅
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group relative p-8 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm transition-all duration-500 hover:bg-white/[0.06] hover:border-[#ff6b35]/30 hover:-translate-y-2 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ backgroundColor: `${feature.color}15` }}
              >
                <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-white/50 leading-relaxed">{feature.description}</p>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#ff6b35]/10 to-transparent" />
              </div>
            </div>
          ))}
        </div>

        {/* Highlight card */}
        <div
          className={`mt-12 p-8 rounded-2xl bg-gradient-to-r from-[#ff6b35]/10 to-transparent border border-[#ff6b35]/30 transition-all duration-700 delay-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-[#ff6b35] mb-2">
                本地AI Agent，你的电脑大师兄最懂
              </h3>
              <p className="text-white/60">
                读取本地文件 · 自动下载软件 · 执行代码 · 零门槛使用
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#e55a2b] border-2 border-black flex items-center justify-center"
                  >
                    <span className="text-white text-xs font-bold">{i}</span>
                  </div>
                ))}
              </div>
              <span className="text-white/60 text-sm">+10K 用户</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
