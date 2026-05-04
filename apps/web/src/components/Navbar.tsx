import { useState } from 'react';
import { Link } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'WAAROM',         href: '/#waarom' },
  { label: 'HOE HET WERKT', href: '/#hoe-het-werkt' },
  { label: 'PILOT',         href: '/#pilot' },
  { label: 'FAQ',           href: '/#faq' },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/95 backdrop-blur-md border-b border-bg-light">
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <img
            src="https://ro-flow.nl/ro-flow-logo.png"
            alt="Ro-flow"
            className="h-7 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden xl:flex items-center gap-6 flex-1 justify-center">
          {NAV_ITEMS.map((item) => (
            <a key={item.label} href={item.href} className="nav-link whitespace-nowrap">
              {item.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden xl:flex items-center gap-3 flex-shrink-0">
          <Link
            to="/aanvraag"
            className="text-xs font-bold tracking-wider text-orange hover:text-orange-light uppercase transition-colors whitespace-nowrap"
          >
            Scan Dashboard
          </Link>
          <Link
            to="/dashboard"
            className="text-xs font-semibold tracking-wider text-text-muted hover:text-white uppercase transition-colors"
          >
            Dashboard
          </Link>
          <Link to="/pilot" className="btn-primary text-xs py-2 px-4 whitespace-nowrap">
            Aanmelden als pilotgemeente
          </Link>
        </div>

        {/* Mobile: scan knop + hamburger */}
        <div className="xl:hidden flex items-center gap-3">
          <Link to="/aanvraag" className="btn-primary text-xs py-2 px-4">
            Scan starten
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-text-muted hover:text-white transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="xl:hidden bg-bg-card border-t border-bg-light px-6 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2.5 text-sm font-semibold text-text-muted hover:text-white transition-colors tracking-wider"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-3 border-t border-bg-light space-y-2">
            <Link to="/dashboard" className="block py-2 text-sm font-semibold text-text-muted hover:text-white">
              Dashboard
            </Link>
            <Link to="/pilot" className="btn-primary text-sm py-2.5 w-full justify-center">
              Aanmelden als pilotgemeente
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
