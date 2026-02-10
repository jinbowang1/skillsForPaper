import { useEffect, useRef, useState } from 'react';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    name: '张明',
    role: '博士生',
    university: '清华大学',
    content: '大师兄帮我节省了数月的文献综述时间。它的文献检索功能太强大了，能自动找到最相关的论文，还能帮我整理笔记。',
    avatar: '张',
    rating: 5,
  },
  {
    name: '李雪',
    role: '硕士生',
    university: '北京大学',
    content: '就像身边有一位私人导师。大师兄不仅能帮我写论文，还能教我如何思考研究问题，找到创新点。',
    avatar: '李',
    rating: 5,
  },
  {
    name: '王浩',
    role: '研究员',
    university: '中科院',
    content: '创新点挖掘功能太神奇了。它能分析领域趋势，帮我发现别人没做过的研究方向，这对我的科研工作帮助巨大。',
    avatar: '王',
    rating: 5,
  },
  {
    name: '陈悦',
    role: '本科生',
    university: '复旦大学',
    content: '我不再害怕写论文了。大师兄会一步步引导我，从选题到定稿，整个过程变得轻松愉快。',
    avatar: '陈',
    rating: 5,
  },
];

export function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  // Auto-rotate
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const next = () => setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 bg-black overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#ff6b35]/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            用户们
            <span className="text-gradient">怎么说</span>
          </h2>
          <p
            className={`text-lg text-white/60 max-w-2xl mx-auto transition-all duration-700 delay-150 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            加入成千上万已经使用大师兄转变写作过程的学生和研究人员
          </p>
        </div>

        {/* Testimonial carousel */}
        <div
          className={`relative transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Main card */}
          <div className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-sm">
            {/* Quote icon */}
            <div className="absolute -top-6 left-8 w-12 h-12 rounded-full bg-[#ff6b35] flex items-center justify-center">
              <Quote className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <div className="mt-4">
              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#ff6b35] text-[#ff6b35]" />
                ))}
              </div>

              {/* Quote text */}
              <p className="text-xl md:text-2xl text-white leading-relaxed mb-8">
                "{testimonials[currentIndex].content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#e55a2b] flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    {testimonials[currentIndex].avatar}
                  </span>
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">
                    {testimonials[currentIndex].name}
                  </div>
                  <div className="text-white/50">
                    {testimonials[currentIndex].role} · {testimonials[currentIndex].university}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'w-8 bg-[#ff6b35]'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
