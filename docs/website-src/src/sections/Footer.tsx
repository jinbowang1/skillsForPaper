import { Github, Twitter, MessageCircle } from 'lucide-react';

const footerLinks = {
  product: {
    title: '产品',
    links: [
      { label: '功能', href: '#features' },
      { label: '定价', href: '#' },
      { label: '下载', href: '#download' },
    ],
  },
  resources: {
    title: '资源',
    links: [
      { label: '博客', href: '#' },
      { label: '教程', href: '#' },
      { label: '支持', href: '#' },
    ],
  },
  legal: {
    title: '法律',
    links: [
      { label: '隐私政策', href: '#' },
      { label: '服务条款', href: '#' },
      { label: 'Cookie政策', href: '#' },
    ],
  },
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: MessageCircle, href: '#', label: 'Discord' },
];

export function Footer() {
  return (
    <footer className="relative bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Logo & description */}
          <div className="col-span-2 md:col-span-1">
            <a href="#hero" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#ff6b35] flex items-center justify-center">
                <span className="text-white font-bold text-lg">大</span>
              </div>
              <span className="text-white font-semibold text-xl">大师兄</span>
            </a>
            <p className="text-white/50 text-sm leading-relaxed">
              你聪明的AI论文写作助手。从文献检索到最终润色，全程陪伴你的学术之旅。
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-white/50 hover:text-white transition-colors duration-300 text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            © 2024 大师兄. 保留所有权利。
          </p>

          {/* Social links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300"
                aria-label={social.label}
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
