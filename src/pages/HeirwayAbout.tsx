import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, ArrowRight } from 'lucide-react';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';
import keenanPhoto from '@/assets/keenan-roberts.png';
import jerryPhoto from '@/assets/jerry-van-essen.png';
import { useForceLightMode } from '@/hooks/useForceLightMode';

const NAV_LINKS = [
  { label: 'Why Heirway', href: '/#why-heirway' },
  { label: 'How it Works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/heirway/pricing' },
  { label: 'About', href: '/heirway/about' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Contact', href: '/#contact' },
];

export default function HeirwayAbout() {
  useForceLightMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* SEO */}
      <title>About Heirway | Estate Planning & Trust Education</title>
      <meta
        name="description"
        content="Learn about Heirway — a platform built by Keenan Roberts and Jerry Van Essen to bring clarity, structure, and education to estate planning and private trusts."
      />
      <link rel="canonical" href="https://myheirway.com/heirway/about" />

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <Link to="/" className="shrink-0">
            <img src={heirwayLogo} alt="Heirway" className="h-28 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm flex-1 justify-center pl-12">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link to="/login?mode=login">
              <Button variant="ghost" className="rounded-full px-5 h-9 text-sm">Login</Button>
            </Link>
            <Link to="/#get-started">
              <Button className="rounded-full px-5 h-9 text-sm bg-foreground text-background hover:bg-foreground/90">
                Get Started for Free
              </Button>
            </Link>
          </div>
          <button className="md:hidden ml-auto" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-border/30 bg-card px-6 py-4 space-y-3">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground">
                {l.label}
              </a>
            ))}
            <Link to="/login?mode=login"><Button variant="ghost" className="w-full rounded-full">Login</Button></Link>
            <Link to="/#get-started" onClick={() => setMobileOpen(false)}>
              <Button className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">Get Started for Free</Button>
            </Link>
          </div>
        )}
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        {/* HERO */}
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-4">About Us</p>
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-4 leading-tight">
            Bringing clarity to
            <br />
            <span className="text-primary">what matters most.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-5">
            Heirway is a platform designed to help individuals and families understand how their assets are
            structured, protected, and passed on.
          </p>
        </div>

        {/* ABOUT HEIRWAY */}
        <div className="relative mb-16">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent rounded-3xl" />
          <div className="relative glass-panel rounded-2xl p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-4">About Heirway</p>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-6">
              Practical, usable, and clear.
            </h2>
            <div className="space-y-5 text-base text-muted-foreground leading-relaxed">
              <p>
                We focus on making estate planning and trust structures clear, practical, and usable—so people
                aren't left guessing or relying entirely on someone else to interpret it for them.
              </p>
              <p>
                The structures behind Heirway aren't theoretical. They've been used to protect estates worth
                millions of dollars, help families avoid probate, and provide a level of clarity and peace of
                mind that most people don't realize is possible.
              </p>
              <p>
                At its core, Heirway exists to bring understanding to something that directly impacts families,
                but is often treated as overly complex or pushed aside until it's too late.
              </p>
            </div>
          </div>
        </div>

        {/* OUR STORY */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-4">Our Story</p>
            <h2 className="text-2xl md:text-4xl font-display font-bold leading-tight">
              Founded by Keenan Roberts
              <br />
              <span className="text-primary">&amp; Jerry Van Essen</span>
            </h2>
          </div>

          {/* FOUNDER PORTRAITS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
              <div className="aspect-[4/5] w-full bg-gradient-to-b from-primary/5 to-muted overflow-hidden">
                <img
                  src={keenanPhoto}
                  alt="Keenan Roberts, Co-Founder of Heirway"
                  className="w-full h-full object-contain object-bottom"
                />
              </div>
              <div className="p-5 text-center border-t border-border/40">
                <h3 className="text-lg font-display font-bold text-foreground">Keenan Roberts</h3>
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mt-1">Co-Founder</p>
              </div>
            </div>
            <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
              <div className="aspect-[4/5] w-full bg-gradient-to-b from-primary/5 to-muted overflow-hidden">
                <img
                  src={jerryPhoto}
                  alt="Jerry Van Essen, Co-Founder of Heirway"
                  className="w-full h-full object-contain object-bottom"
                />
              </div>
              <div className="p-5 text-center border-t border-border/40">
                <h3 className="text-lg font-display font-bold text-foreground">Jerry Van Essen</h3>
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mt-1">Co-Founder</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-8 md:p-10 space-y-5 text-base text-muted-foreground leading-relaxed">
            <p>
              Before starting Heirway, Keenan spent years working across retail, corporate environments, and
              consulting—eventually working closely with business owners, investors, and families who had
              built meaningful assets and income. Jerry has been operating in and through private trusts for
              over 25 years, helping families discover the hidden strategies of preserving the family
              legacy.
            </p>
            <p>
              From the outside, many of them appeared well-positioned. They had businesses, investments, and
              what looked like solid plans in place. But when conversations went deeper, a consistent pattern
              started to show.
            </p>

            <blockquote className="my-8 border-l-2 border-primary pl-6 py-1 text-lg md:text-xl font-display italic text-foreground">
              Most people didn't actually understand how everything they had set up worked together.
            </blockquote>

            <p>
              They had documents. They had entities. They had been given recommendations. But there was
              little clarity around how those pieces functioned as a system—especially in the moments when
              it would matter most.
            </p>
            <p>
              Keenan recognized the same issue in his own journey. Like many people, he had relied on what
              he was told, assuming things were "set up" correctly without fully understanding the structure
              behind it. That changed over time—through better relationships, deeper study, and exposure to
              how these structures are actually used in practice, not just discussed.
            </p>
            <p>
              Around that same time, his relationship with Jerry Van Essen developed. Coming from different
              backgrounds but seeing the same problem, they aligned on a simple idea:
            </p>

            <div className="my-8 p-8 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <p className="text-xl md:text-2xl font-display font-semibold text-foreground mb-1">
                People don't need more complexity.
              </p>
              <p className="text-xl md:text-2xl font-display font-semibold text-primary">
                They need clarity.
              </p>
            </div>

            <p>
              Estate planning has been positioned as something technical and out of reach—something you hand
              off and hope was done correctly. But it doesn't have to be that way.
            </p>
            <p>
              Heirway was built to make this process more accessible and understandable—so people can see
              how things work, ask better questions, and make more informed decisions. This is about real
              families, real responsibilities, and what happens when plans are actually tested.
            </p>
            <p>
              Keenan is a husband, a father and a family-oriented builder himself. Jerry is also a husband,
              a father and even has grandchildren to carry on the legacy that he is building—and that
              perspective shapes how Heirway operates. The goal is to make sure plans are understood—so the
              people it's meant to serve aren't left trying to figure it out later.
            </p>
            <p>
              Today, Heirway continues to grow as a platform centered on education, structure, and long-term
              clarity.
            </p>

            <blockquote className="mt-8 border-l-2 border-primary pl-6 py-1 text-lg md:text-xl font-display italic text-foreground">
              Because when it comes to what you're building, understanding it shouldn't be optional.
              <span className="block mt-2 not-italic font-semibold text-primary">It should be the standard.</span>
            </blockquote>
          </div>
        </div>

        {/* CTA */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent rounded-3xl" />
          <div className="relative glass-panel rounded-2xl p-8 md:p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
              Ready to see what clarity looks like?
            </h2>
            <p className="text-base text-muted-foreground max-w-lg mx-auto mb-6 leading-relaxed">
              Take the first step toward understanding how your assets are structured, protected, and
              passed on.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/#get-started">
                <Button size="lg" className="rounded-full px-8 h-12 bg-foreground text-background hover:bg-foreground/90">
                  Get Started for Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/heirway/pricing">
                <Button size="lg" variant="outline" className="rounded-full px-8 h-12">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-border/40 py-10 px-6 text-center text-sm text-muted-foreground space-y-2">
        <p className="text-xs">
          1560 E Southlake Blvd Ste 100, Southlake, TX 76092 &nbsp;·&nbsp;
          <a href="tel:18884347929" className="hover:text-foreground transition-colors">1-888-HEIRWAY (1-888-434-7929)</a> &nbsp;·&nbsp;
          Mon–Fri, 9:00 AM – 5:00 PM CT
        </p>
        <p className="text-xs">&copy; {new Date().getFullYear()} Heirway. All rights reserved.</p>
      </footer>
    </div>
  );
}
