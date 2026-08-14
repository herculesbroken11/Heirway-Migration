import { useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, ShieldCheck, Shield, GraduationCap, Users, Landmark, CheckCircle, ChevronDown, Play, Clock, Menu, X, MapPin, Phone } from 'lucide-react';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';
import familyPhoto from '@/assets/heirway-family.jpg';
import dashboardPreview from '@/assets/heirway-dashboard-preview.png';
import PrivateTrustQuiz from '@/components/heirway/PrivateTrustQuiz';
import ContactFormSection from '@/components/heirway/ContactFormSection';
import { useForceLightMode } from '@/hooks/useForceLightMode';

/* ─── DATA ─── */

const TESTIMONIALS = [
{ name: 'Jim & Megan G.', quote: "We're able to sleep at night much better not worrying about how am I going to do this or do that. I am much more at peace now with the strategy." },
{ name: 'Val D.', quote: '"I hope everyone looks into this because it\'s a thing that we are not aware of..."' },
{ name: 'Paul F.', quote: '"Number one we wanted privacy... and obviously, to not get taxed to death."' },
{ name: 'Anthony T.', quote: "It was an experience that I appreciate beyond just the idea of doing something for a tax protective measure, but it actually felt like I was doing something important for my family's legacy." }];


const DIFFERENTIATORS = [
{ icon: Landmark, title: 'Structure over default', desc: "Most family businesses run on unwritten habits. We replace default arrangements with a clear operating structure everyone can see, understand, and follow." },
{ icon: Shield, title: 'Built for when things change', desc: 'Illness, exits, divorce, growth, death. Your structure should already know what happens next instead of forcing your family to decide under pressure.' },
{ icon: Users, title: 'Continuity over transfer', desc: "Handing over assets is not the same as handing over a working business. We build for the business to keep operating, not just change hands." }];


const PILLARS = [
{ number: '01', label: 'The Foundation', title: 'Structure', description: 'We map how the family business is actually owned, operated, and controlled today — then design a structure that matches how the family really works. Entities, roles, and decision rights are documented so nothing depends on memory or assumption.' },
{ number: '02', label: 'How Decisions Get Made', title: 'Family Governance', description: 'Clear roles, meeting rhythms, voting thresholds, and written decisions. Family governance turns informal conversations into a repeatable process, so the business keeps moving even when the family disagrees.' },
{ number: '03', label: 'Before It Breaks', title: 'Family Conflict', description: 'Most family businesses do not fail on the numbers — they fail on unresolved expectations. We surface the friction points early and put agreed-upon rules in place for compensation, entry, exit, and dispute resolution.' },
{ number: '04', label: 'Built to Outlast You', title: 'Continuity', description: 'Succession is an operating plan, not a document. We prepare the next generation, define who steps in and when, and make sure the business can run through a transition without losing customers, cash flow, or trust.' }];


const HOW_IT_WORKS = [
{ icon: CheckCircle, title: 'Get Started', desc: 'Answer a few quick questions about your family and your business' },
{ icon: BookOpen, title: 'Get Educated', desc: 'Learn how family business structure, governance, and continuity actually work' },
{ icon: Landmark, title: 'Build Your Structure', desc: 'Put your family business operating system in place, step by step' },
{ icon: Users, title: 'Steward It Forward', desc: 'Run it, review it, and prepare the next generation to carry it' }];


const WHY_FEATURES = [
{ icon: GraduationCap, title: 'Expert-Guided Education', desc: 'Learn from operators and advisors who have worked inside family businesses — practical lessons on structure, governance, and continuity, not theory.' },
{ icon: Users, title: 'Built for Families in Business Together', desc: 'Owners, spouses, successors, and key people all see the same plan. Everyone knows their role and how decisions get made.' },
{ icon: ShieldCheck, title: 'Practical Tools and Next Steps', desc: 'Heirway gives you system templates, checklists, and a working dashboard so you can take action immediately instead of waiting on a document.' }];


const FAQS = [
{ q: 'What is a family business operating system?', a: 'It is the written structure behind how your family business is owned, governed, and continued. It covers entity and ownership structure, decision rights, meeting and record-keeping rhythms, conflict rules, and a succession plan — all in one place, kept current.' },
{ q: 'We already have an attorney and a CPA. Where does Heirway fit?', a: 'Your attorney and CPA handle the legal and tax execution. Heirway handles the structure and governance layer that sits above them — what the family has agreed to, who decides what, and what happens when circumstances change. Most families find their advisors work better with that clarity in hand.' },
{ q: 'Is this only for large family businesses?', a: 'No. If a family depends on a business — or a business depends on a family — the same failure points apply. The system scales from a single operating company to multiple entities and generations.' },
{ q: 'How is this different from a succession plan?', a: 'A succession plan usually answers one question: who takes over. An operating system answers the rest — how the business is structured, how decisions get made, how conflict gets resolved, and how the business keeps running through the change.' },
{ q: 'How long does it take to get started?', a: 'You can start for free today. Answer a short set of questions, get educated on the fundamentals, and begin building your structure at your own pace. Families who want guided support can move into a full build with our team.' }];

const EDUCATION_CARDS = [
{ title: 'Welcome to Heirway', level: 'Beginner', duration: '3 min', desc: 'A practical introduction to family business structure' },
{ title: 'Get an Understanding', level: 'Beginner', duration: '5 min', desc: 'Why most family businesses never make it past the second generation' },
{ title: 'Ownership and Structure', level: 'Beginner', duration: '3 min', desc: 'How ownership, control, and roles fit together — and how to structure entities for flexibility as the family grows.' }];


const PODCASTS = [
{ title: 'How Structure Keeps a Family Business in the Family for Generations', desc: 'Most owners think continuity means selling to the next generation, but what if there was a smarter way?...', duration: '20 min' },
{ title: 'How an Informal Handshake Could Cost Your Family Everything', desc: 'Think a verbal agreement is enough to protect your family and your business? Think again...', duration: '12 min' },
{ title: 'Why Every Family Business Needs Governance', desc: 'Are you running your business the right way for the next generation?...', duration: '16 min' },
{ title: 'How to Structure Ownership the Right Way', desc: 'Most owners treat ownership as a formality. In this episode, we flip the script.', duration: '14 min' }];



/* ─── COMPONENT ─── */

export default function HeirwayLanding() {
  useForceLightMode();
  const getStartedRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeHowStep, setActiveHowStep] = useState(0);

  const navigate = useNavigate();
  const { hash } = useLocation();
  const scrollTo = () => getStartedRef.current?.scrollIntoView({ behavior: 'smooth' });
  const handleFreeStart = () => {
    getStartedRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    if (!hash) {
      scrollTop();
      const frame = window.requestAnimationFrame(scrollTop);
      const timer = window.setTimeout(scrollTop, 120);
      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timer);
      };
    }
  }, [hash]);

  // Scroll-driven "How it works" step tracking
  useEffect(() => {
    const handleScroll = () => {
      const steps = document.querySelectorAll('[data-how-step]');
      steps.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.3) {
          setActiveHowStep(i);
        }
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <a href="#" className="shrink-0">
            <img src={heirwayLogo} alt="Heirway" className="h-28 w-auto" />
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm flex-1 justify-center pl-12">
            {['Why Heirway', 'How it Works', 'Pricing', 'About', 'FAQ', 'Contact'].map((l) => {
              if (l === 'Pricing') {
                return (
                  <a key={l} href="/heirway/pricing" className="text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                );
              }
              if (l === 'About') {
                return (
                  <a
                    key={l}
                    href="#about"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                );
              }
              const targetId = l.toLowerCase().replace(/\s+/g, '-');
              return (
                <a
                  key={l}
                  href={`#${targetId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  {l}
                </a>
              );
            })}
          </div>
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link to="/login?mode=login"><Button variant="ghost" className="rounded-full px-5 h-9 text-sm">Login</Button></Link>
            <Button onClick={handleFreeStart} className="rounded-full px-5 h-9 text-sm bg-foreground text-background hover:bg-foreground/90">
              Get Started for Free
            </Button>
          </div>
          <button className="md:hidden ml-auto" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {mobileOpen &&
        <div className="md:hidden border-t border-border/30 bg-card px-6 py-4 space-y-3">
            {['Why Heirway', 'How it Works', 'Pricing', 'About', 'FAQ', 'Contact'].map((l) => {
              if (l === 'Pricing') {
                return (
                  <a key={l} href="/heirway/pricing" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground">{l}</a>
                );
              }
              if (l === 'About') {
                return (
                  <a
                    key={l}
                    href="#about"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileOpen(false);
                      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="block text-sm text-muted-foreground">{l}</a>
                );
              }
              const targetId = l.toLowerCase().replace(/\s+/g, '-');
              return (
                <a
                  key={l}
                  href={`#${targetId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileOpen(false);
                    setTimeout(() => {
                      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);
                  }}
                  className="block text-sm text-muted-foreground">
                  {l}
                </a>
              );
            })}
            <Link to="/login?mode=login"><Button variant="ghost" className="w-full rounded-full">Login</Button></Link>
            <Button onClick={() => {handleFreeStart();setMobileOpen(false);}} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">Get Started for Free</Button>
          </div>
        }
      </nav>

      {/* ─── HERO ─── */}
      <section className="max-w-7xl mx-auto px-6 pt-6 pb-4 md:pt-10 md:pb-6">
        <div className="max-w-3xl lg:max-w-5xl">
          
          <h1 className="text-5xl lg:text-[5.5rem] font-display font-bold leading-[1.05] tracking-tight mb-8">
            Build a Business<br />That <span className="text-primary">Outlasts You.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl lg:max-w-4xl mb-10 leading-relaxed">
            We help families grow, protect, and steward the family business across generations. Heirway gives you a family business operating system — structure, governance, and continuity — with guided education, step-by-step setup, and a live dashboard for your family.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleFreeStart} size="lg" className="rounded-full px-7 bg-foreground text-background hover:bg-foreground/90">
              Get Started for Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="mt-12 md:mt-16 rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-black">
          <video
            className="w-full h-auto block"
            src="/heirway-commercial.mp4"
            controls
            controlsList="nodownload"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section id="proof" className="pt-4 pb-12 md:pt-6 md:pb-20">
        <div className="max-w-7xl mx-auto px-6 text-center mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-4">Families We Serve</p>
          <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight mb-6">
            Structure that actually works...<br /><span className="text-muted-foreground">in real life.</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            From ownership structure and family governance to succession and continuity, Heirway gives families in business together a clear operating system they can run for generations.
          </p>
        </div>


        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Left testimonials */}
            <div className="space-y-10">
              {TESTIMONIALS.slice(0, 2).map((t) =>
              <div key={t.name} className="space-y-2">
                  <p className="font-display font-bold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t.quote}</p>
                </div>
              )}
            </div>
            {/* Center photo — wide horizontal */}
            <div className="flex justify-center">
              <img src={familyPhoto} alt="Father and child" className="rounded-xl w-full object-cover aspect-[4/3] shadow-lg" />
            </div>
            {/* Right testimonials */}
            <div className="space-y-10">
              {TESTIMONIALS.slice(2).map((t) =>
              <div key={t.name} className="space-y-2">
                  
                  <p className="font-display font-bold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t.quote}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-12">
            <Button onClick={handleFreeStart} className="rounded-full px-7 bg-foreground text-background hover:bg-foreground/90">Get Started for Free</Button>
          </div>
        </div>
      </section>

      {/* ─── DASHBOARD PREVIEW ─── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-4">Your Legacy Vault</p>
          <h2 className="text-2xl md:text-3xl font-display font-bold leading-tight">
            Run your family business operating system in one place
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mx-auto mt-4 leading-relaxed md:whitespace-nowrap">
            A single, secure dashboard for your structure, assets, records, and family — updated in real time.
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3">
            <span className="w-3 h-3 rounded-full bg-destructive/60" />
            <span className="w-3 h-3 rounded-full bg-warning/60" />
            <span className="w-3 h-3 rounded-full bg-success/60" />
          </div>
          <div className="px-2 pb-2">
            <img src={dashboardPreview} alt="Heirway dashboard preview" className="w-full rounded-lg" />
          </div>
        </div>
      </section>

      {/* ─── WHAT MAKES US DIFFERENT ─── */}
      <section id="what-makes-us-different" className="py-16 md:py-24 bg-muted/20 border-y border-border/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-4">Our Approach</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold leading-tight">What Makes Us Different</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIFFERENTIATORS.map((d) =>
            <div key={d.title} className="bg-card border border-border/40 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <d.icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-display font-bold mb-2">{d.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
              </div>
            )}
          </div>
        </div>
      </section>



      {/* ─── FOUR PILLARS — scroll-sticky number ─── */}
      <section id="how-it-works" className="pt-8 md:pt-12 pb-16 md:pb-28">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs uppercase tracking-[0.15em] text-primary font-medium mb-3">What We Do</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-12">The Four Pillars</h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-8">
            {/* Sticky number column */}
            <div className="hidden md:block md:col-span-3">
              <div className="sticky top-24">
                <span className="text-[180px] font-display font-bold text-foreground/8 leading-none select-none block transition-all duration-500">
                  {PILLARS[activeHowStep]?.number || '01'}
                </span>
              </div>
            </div>

            {/* Scrolling content */}
            <div className="md:col-span-9 space-y-0">
              {PILLARS.map((pillar, i) =>
              <div key={pillar.number} data-how-step={i} className="border-t border-border/50 py-16 first:pt-0 first:border-t-0">
                  <span className="md:hidden text-[100px] font-display font-bold text-foreground/8 leading-none select-none block mb-4">{pillar.number}</span>
                  <p className="text-xs uppercase tracking-[0.15em] text-primary font-medium mb-2">{pillar.label}</p>
                  <h3 className="text-3xl md:text-4xl font-display font-bold mb-5">{pillar.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mb-6">{pillar.description}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleFreeStart} className="rounded-full px-6 text-sm bg-foreground text-background hover:bg-foreground/90">Get Started for Free</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>


      {/* ─── HOW IT WORKS (steps) ─── */}
      <section className="py-16 md:py-28 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-14">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) =>
            <div key={step.title} className="bg-card border border-border/40 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-display font-bold text-foreground mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── GUIDED EDUCATION ─── */}
      <section className="py-16 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16">
            {/* Left column */}
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-primary font-medium mb-3">Learn at your own pace</p>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Guided Education</h2>
              <p className="text-base text-muted-foreground">
                We don't just help you build the structure — we teach your family how to run it, so the business keeps working long after the founders step back.
              </p>

            </div>

            {/* Right column */}
            <div>
              {/* Filter tabs */}
              <div className="flex gap-0 border border-border rounded-lg w-fit mb-6 overflow-hidden">
                {['Beginner', 'Intermediate', 'Advanced'].map((tab, i) =>
                <div
                  key={tab}
                  className={`px-4 py-2 text-sm font-medium ${
                  i === 0 ?
                  'bg-foreground text-background' :
                  'bg-card text-muted-foreground/50 cursor-default'} ${
                  i > 0 ? 'border-l border-border' : ''}`}>
                  
                    {tab}
                  </div>
                )}
              </div>

              {/* Video cards */}
              <div className="space-y-4">
                {EDUCATION_CARDS.map((card) =>
                <div key={card.title} className="bg-card border border-border/40 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-display font-bold text-foreground">{card.title}</h4>
                        <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary">{card.level}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{card.desc}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Online</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {card.duration}</span>
                      </div>
                    </div>
                    <Link to="/login">
                      <Button size="sm" className="rounded-full shrink-0 bg-foreground text-background hover:bg-foreground/90">
                        Watch Video <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BIG TESTIMONIAL ─── */}
      <section className="py-16 md:py-28 bg-muted/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-[0.15em] text-primary font-medium mb-4">Customer testimonials</p>
          <blockquote className="text-xl md:text-2xl font-display font-bold leading-relaxed mb-8 text-foreground">
            "Truly special, I don't fully understand it yet. I just knew there was something special about it that I knew that this was a pivotal moment. To be in this position, to be able to have this and be able to set the course."
          </blockquote>
          <p className="font-medium text-foreground">Calvin T.</p>
          <p className="text-sm text-muted-foreground">Board Member, Private Equity Firm</p>
        </div>
      </section>

      {/* ─── WHY HEIRWAY ─── */}
      <section id="why-heirway" className="py-16 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center md:text-left">
          <p className="text-xs uppercase tracking-[0.15em] text-primary font-medium mb-3">Why Heirway</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">The Platform for Family Business Structure</h2>
          <p className="text-base text-muted-foreground max-w-3xl mb-12 leading-relaxed mx-auto md:mx-0">
            Heirway is the trusted resource for learning how to structure, govern, and continue a family business. We break down complex business structure and governance strategy into a clear, step-by-step system your whole family can follow.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {WHY_FEATURES.map((f) =>
            <div key={f.title} className="bg-card border border-border/40 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-display font-bold mb-2">{f.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleFreeStart} className="rounded-full px-7 bg-foreground text-background hover:bg-foreground/90">Get Started for Free</Button>
          </div>
        </div>
      </section>

      {/* ABOUT PREVIEW */}
      <section id="about" className="py-16 md:py-24 bg-muted/20 border-y border-border/30">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-4">About Us</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-5 leading-tight">
            Built by people who've <span className="text-primary">lived this work.</span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-4">
            Heirway was founded by Keenan Roberts and Jerry Van Essen to bring clarity to family business
            structure and governance—so families can actually understand how the business is owned, run, and carried forward.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            With over 25 years of experience working with family-owned businesses and a shared belief that families don't need
            more complexity—they need clarity—Heirway exists to make this work accessible.
          </p>

          <Link to="/heirway/about">
            <Button variant="outline" className="rounded-full px-6 h-11">
              Read Our Full Story <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <section id="faq" className="py-16 md:py-28">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-3">FAQs</h2>
          <p className="text-base text-muted-foreground text-center mb-10">Quick answers about building a family business that lasts</p>
          <div className="space-y-3">
            {FAQS.map((faq, i) =>
            <div key={i} className="border-2 border-border/60 rounded-xl overflow-hidden bg-card/50">
                <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className={`w-full flex items-center justify-between p-5 text-left font-medium transition-colors ${
                openFaq === i ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted/30'}`
                }>
                
                  <span className="text-sm pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-primary transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i &&
              <div className="px-5 pb-5 pt-2 text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-muted/10 animate-fade-in">{faq.a}</div>
              }
              </div>
            )}
          </div>
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground mb-3">Still have questions? Don't hesitate to reach out!</p>
            <Button variant="outline" className="rounded-full px-6" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>Contact</Button>
          </div>
        </div>
      </section>

      {/* ─── GET STARTED ─── */}
      <section id="get-started" ref={getStartedRef} className="py-16 md:py-28 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">What To Do Next</h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">Get started for free and begin building your family business operating system. Answer a few quick questions so we can understand your situation and point you in the right direction.</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border/50 rounded-2xl shadow-lg p-6 md:p-10">
              <PrivateTrustQuiz />
            </div>
          </div>
        </div>
      </section>

      <ContactFormSection />


      {/* ─── FOOTER ─── */}
      <footer className="bg-muted/20 border-t border-border/30 text-foreground">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-5 space-y-3">
              <img src={heirwayLogo} alt="Heirway" className="h-16 md:h-20 w-auto -mt-2" />
              <p className="text-[11px] md:text-xs text-foreground font-medium leading-relaxed max-w-md">
                Heirway is brought to you by <span className="text-primary">Asset Smart — The Private Trust Company</span>
              </p>
              <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed max-w-md">
                Operating out of the Asset Smart office in Southlake, Texas and serving families in all 50 states.
              </p>
            </div>

            <div className="lg:col-span-4">
              <h4 className="mb-3 text-[10px] uppercase tracking-[0.15em] font-display font-bold text-primary">Contact</h4>
              <ul className="space-y-3.5">
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-primary" />
                  </span>
                  <span className="text-[11px] md:text-xs text-muted-foreground leading-relaxed pt-1">
                    1560 E Southlake Blvd Ste 100, Southlake, TX 76092
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
                    <Phone className="w-4 h-4 text-primary" />
                  </span>
                  <span className="text-[11px] md:text-xs leading-relaxed pt-1">
                    <a href="tel:18884347929" className="block text-foreground font-medium hover:text-primary transition-colors">
                      1-888-HEIRWAY
                    </a>
                    <span className="text-muted-foreground">1-888-434-7929</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-primary" />
                  </span>
                  <span className="text-[11px] md:text-xs text-muted-foreground leading-relaxed pt-1">
                    Mon–Fri, 9:00 AM – 5:00 PM CT
                  </span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h4 className="mb-3 text-[10px] uppercase tracking-[0.15em] font-display font-bold text-primary">Explore</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[11px] md:text-xs text-muted-foreground">
                <Link to="/login?mode=login" className="hover:text-foreground transition-colors">Sign In</Link>
                <button onClick={scrollTo} className="text-left hover:text-foreground transition-colors">Sign Up</button>
                <Link to="/heirway/about" className="hover:text-foreground transition-colors">About</Link>
                <button onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} className="text-left hover:text-foreground transition-colors">Contact</button>
                <Link to="/heirway/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-foreground transition-colors col-span-2">Terms of Service</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-border/30 mt-10 pt-6 space-y-3">
            <p className="text-[8px] md:text-[9px] leading-relaxed text-muted-foreground/70 max-w-5xl">
              <strong>Disclaimer:</strong> Heirway is not a law firm, accounting firm, or registered investment advisory firm. We do not provide legal, financial, or tax advice. We are not CPAs, attorneys, or licensed financial advisors. All trust documents provided through our platform are templates intended for educational and informational purposes only and do not constitute legal instruments unless and until properly executed in accordance with applicable law. Users should seek qualified counsel regarding their specific legal circumstances. Any information, content, or materials available on this site are for general informational purposes only and should not be relied upon as a substitute for professional advice from a qualified attorney, CPA, or financial advisor. Use of this platform does not create an attorney-client, fiduciary, or advisory relationship. You are solely responsible for consulting with qualified professionals regarding your specific legal, tax, and financial circumstances.
            </p>
            <p className="text-[10px] md:text-[11px] text-muted-foreground">© 2026 Heirway. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>);

}