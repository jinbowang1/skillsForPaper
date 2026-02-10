import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: '大师兄是什么，如何工作？',
    answer: '大师兄是一款本地AI论文助手，它运行在你的电脑上，可以读取你的本地文件，帮你检索文献、挖掘创新点、撰写论文、执行代码和润色文章。所有数据都在本地处理，确保你的隐私安全。',
  },
  {
    question: '我的数据安全和隐私吗？',
    answer: '绝对安全。大师兄是本地运行的应用程序，所有数据都存储在你的电脑上，不会上传到任何服务器。你的论文、实验数据和个人信息完全由你掌控。',
  },
  {
    question: '大师兄支持哪些文件格式？',
    answer: '大师兄支持多种学术文件格式，包括PDF、Word（.doc/.docx）、LaTeX、Markdown等。你可以直接导入现有论文进行编辑，也可以导出为各种格式提交。',
  },
  {
    question: '有免费试用吗？',
    answer: '是的！大师兄提供免费试用版本，你可以体验所有核心功能。试用期间没有任何功能限制，让你充分了解大师兄的强大之处。',
  },
  {
    question: '如何取消订阅？',
    answer: '你可以随时在应用内的账户设置中取消订阅。取消后，你仍可以使用已付费期间的所有功能，直到当前计费周期结束。我们不设任何取消障碍。',
  },
];

export function FAQ() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
      ref={sectionRef}
      className="relative py-32 bg-black overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ff6b35]/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            常见<span className="text-gradient">问题</span>
          </h2>
          <p
            className={`text-lg text-white/60 transition-all duration-700 delay-150 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            还有其他问题？请联系我们的支持团队
          </p>
        </div>

        {/* FAQ items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border border-white/10 rounded-xl overflow-hidden transition-all duration-500 ${
                openIndex === index ? 'bg-white/[0.03]' : 'bg-transparent hover:bg-white/[0.02]'
              } ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="text-white font-medium pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-white/50 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-6 pb-6 text-white/60 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div
          className={`mt-12 text-center transition-all duration-700 delay-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <p className="text-white/50 mb-4">没找到你的问题？</p>
          <a
            href="mailto:support@dashixiong.ai"
            className="inline-flex items-center gap-2 text-[#ff6b35] hover:text-[#e55a2b] transition-colors"
          >
            联系支持团队
            <span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
