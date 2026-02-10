import { Navbar } from './sections/Navbar';
import { Hero } from './sections/Hero';
import { Features } from './sections/Features';
import { Demo } from './sections/Demo';
import { DownloadSection } from './sections/Download';
import { Testimonials } from './sections/Testimonials';
import { FAQ } from './sections/FAQ';
import { CTA } from './sections/CTA';
import { Footer } from './sections/Footer';

function App() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Demo />
        <DownloadSection />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default App;
