import { Link, useLocation } from "wouter";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [location, setLocation] = useLocation();

  const scrollToSection = (sectionId: string) => {
    // Als we niet op de homepage zijn, navigeer eerst naar home
    if (location !== "/") {
      setLocation("/");
      // Wacht tot de pagina geladen is en scroll dan
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      // We zijn al op de homepage, scroll direct
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="bg-[#0D1A3B] text-white/70">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Bedrijfsinfo */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img 
                src="/ro-flow-logo.png" 
                alt="Ro-flow" 
                className="h-8 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-sm text-white/50 mb-4">
              Ro-flow is een handelsnaam van Policy AI Assist
            </p>
            <div className="text-sm space-y-1">
              <p>Adriaan Anthoniszstraat 16</p>
              <p>1689 XM Zwaag</p>
              <p className="mt-2">
                <a 
                  href="tel:0229511911" 
                  className="hover:text-white transition-colors"
                >
                  Tel: 0229-511911
                </a>
              </p>
              <p>
                <a 
                  href="mailto:info@ro-flow.nl" 
                  className="hover:text-white transition-colors"
                >
                  info@ro-flow.nl
                </a>
              </p>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-bold text-white mb-4">Informatie</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button 
                  onClick={() => scrollToSection("features")}
                  className="hover:text-white transition-colors text-left"
                >
                  Features
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("how-it-works")}
                  className="hover:text-white transition-colors text-left"
                >
                  Hoe het werkt
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("pricing")}
                  className="hover:text-white transition-colors text-left"
                >
                  Contact
                </button>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Juridisch */}
          <div>
            <h3 className="font-bold text-white mb-4">Juridisch</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/voorwaarden" className="hover:text-white transition-colors">
                  Algemene Voorwaarden
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacybeleid
                </Link>
              </li>
              <li>
                <Link href="/demo" className="hover:text-white transition-colors">
                  Plan een demonstratie
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/40">
            &copy; {currentYear} Policy AI Assist. Alle rechten voorbehouden.
          </p>
          <div className="flex items-center gap-4 text-sm text-white/40">
            <span>KvK: 88843564</span>
            <span>BTW: NL864797345B01</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
