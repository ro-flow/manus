import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Aanvraag } from './pages/Aanvraag';
import { AanvraagResultaat } from './pages/AanvraagResultaat';
import { Pilot } from './pages/Pilot';

export function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16">
        <Routes>
          <Route path="/"              element={<Home />} />
          <Route path="/aanvraag"      element={<Aanvraag />} />
          <Route path="/aanvraag/:id"  element={<AanvraagResultaat />} />
          <Route path="/pilot"         element={<Pilot />} />
        </Routes>
      </main>
    </div>
  );
}
