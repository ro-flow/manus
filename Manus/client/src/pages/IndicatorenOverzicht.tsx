import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft, Search, Building2, TreePine, Droplets, Volume2, Shield,
  Landmark, Wheat, Route, Mountain, Heart, ChevronDown, ChevronRight,
  FileText, Globe, Layers, Info, ExternalLink, Filter, BarChart3,
  Hash, BookOpen, Scale, AlertTriangle, CheckCircle, Sparkles,
  MapPin, Zap, Database, Eye, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============ INDICATOR DATA ============

interface IndicatorInfo {
  code: string;
  theme: string;
  humanName: string;
  description: string;
  sourceType: string;
  sourceUrl?: string;
  computeMethod: string;
  bufferM: number;
  wettelijkeGrondslag: string;
  relevantieUitleg: string;
  actie: string;
  bronnen: string[];
}

const THEMES = [
  { code: 'basis', label: 'Basisgegevens', icon: Building2, color: '#1e40af', gradient: 'from-blue-600 to-blue-800', lightBg: 'bg-blue-50', textColor: 'text-blue-700', count: 5 },
  { code: 'plan', label: 'Planologie', icon: FileText, color: '#7c3aed', gradient: 'from-violet-500 to-violet-700', lightBg: 'bg-violet-50', textColor: 'text-violet-700', count: 7 },
  { code: 'dso', label: 'DSO / Omgevingsloket', icon: Globe, color: '#0891b2', gradient: 'from-cyan-500 to-cyan-700', lightBg: 'bg-cyan-50', textColor: 'text-cyan-700', count: 5 },
  { code: 'natuur', label: 'Natuur & Ecologie', icon: TreePine, color: '#16a34a', gradient: 'from-green-500 to-emerald-700', lightBg: 'bg-green-50', textColor: 'text-green-700', count: 10 },
  { code: 'landschap', label: 'Landschap', icon: Mountain, color: '#65a30d', gradient: 'from-lime-500 to-green-700', lightBg: 'bg-lime-50', textColor: 'text-lime-700', count: 5 },
  { code: 'water', label: 'Water & Waterkeringen', icon: Droplets, color: '#2563eb', gradient: 'from-blue-500 to-blue-700', lightBg: 'bg-blue-50', textColor: 'text-blue-700', count: 11 },
  { code: 'bodem', label: 'Bodem & Ondergrond', icon: Mountain, color: '#92400e', gradient: 'from-amber-700 to-amber-900', lightBg: 'bg-amber-50', textColor: 'text-amber-800', count: 6 },
  { code: 'milieu', label: 'Geluid & Milieu', icon: Volume2, color: '#dc2626', gradient: 'from-red-500 to-red-700', lightBg: 'bg-red-50', textColor: 'text-red-700', count: 7 },
  { code: 'veiligheid', label: 'Externe Veiligheid', icon: Shield, color: '#ea580c', gradient: 'from-orange-500 to-orange-700', lightBg: 'bg-orange-50', textColor: 'text-orange-700', count: 5 },
  { code: 'erfgoed', label: 'Cultuurhistorie & Erfgoed', icon: Landmark, color: '#a16207', gradient: 'from-yellow-600 to-yellow-800', lightBg: 'bg-yellow-50', textColor: 'text-yellow-700', count: 7 },
  { code: 'agrarisch', label: 'Agrarisch & Geur', icon: Wheat, color: '#4d7c0f', gradient: 'from-lime-600 to-lime-800', lightBg: 'bg-lime-50', textColor: 'text-lime-700', count: 7 },
  { code: 'infra', label: 'Infrastructuur & Leidingen', icon: Route, color: '#6b7280', gradient: 'from-gray-500 to-gray-700', lightBg: 'bg-gray-50', textColor: 'text-gray-700', count: 6 },
  { code: 'mobiliteit', label: 'Mobiliteit', icon: Route, color: '#475569', gradient: 'from-slate-500 to-slate-700', lightBg: 'bg-slate-50', textColor: 'text-slate-700', count: 3 },
  { code: 'overig', label: 'Gezondheid & Overig', icon: Heart, color: '#78716c', gradient: 'from-stone-500 to-stone-700', lightBg: 'bg-stone-50', textColor: 'text-stone-700', count: 4 },
];

// Full indicator database with wettelijke grondslag
const INDICATORS: IndicatorInfo[] = [
  // ===== BASIS =====
  { code: 'BAG_PAND', theme: 'basis', humanName: 'BAG Pandgegevens', description: 'Bouwjaar, status, oppervlakte en gebruiksdoel uit de Basisregistratie Adressen en Gebouwen', sourceType: 'REST', sourceUrl: 'https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2', computeMethod: 'attribute', bufferM: 0, wettelijkeGrondslag: 'Wet BAG (Stb. 2008, 39); Bbl art. 2.6 (bestaande bouw)', relevantieUitleg: 'Bouwjaar bepaalt welk Bouwbesluit van toepassing is, of asbestonderzoek nodig is (pre-1994), en welke energielabel-eisen gelden. Gebruiksdoel is bepalend voor de toets aan het bestemmingsplan.', actie: 'Controleer bouwjaar voor toepasselijk Bouwbesluit. Bij bouwjaar < 1994: asbestinventarisatie verplicht bij sloop/verbouw.', bronnen: ['BAG API Kadaster', 'PDOK'] },
  { code: 'KADASTER_PERCEEL', theme: 'basis', humanName: 'Kadastraal perceel', description: 'Perceelgrenzen, oppervlakte en kadastrale aanduiding', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0', computeMethod: 'intersect', bufferM: 10, wettelijkeGrondslag: 'Kadasterwet; BRK (Basisregistratie Kadaster)', relevantieUitleg: 'Perceelgrenzen bepalen de exacte locatie van de aanvraag en zijn essentieel voor de toets aan het bestemmingsplan. Oppervlakte is relevant voor berekening bebouwingspercentage en vrijstellingsgrenzen archeologie.', actie: 'Verifieer perceelgrenzen en oppervlakte. Controleer of de aanvraag binnen de perceelgrenzen valt.', bronnen: ['Kadaster BRK', 'PDOK WFS'] },
  { code: 'BGT_TOPOGRAFIE', theme: 'basis', humanName: 'BGT Topografie', description: 'Grootschalige topografie: verharding, groen, water en bebouwing', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/lv/bgt/wfs/v1_0', computeMethod: 'intersect', bufferM: 50, wettelijkeGrondslag: 'Wet BGT (Stb. 2013, 379)', relevantieUitleg: 'BGT geeft inzicht in het huidige grondgebruik (verharding, groen, water). Relevant voor waterbergingsberekeningen en de toets aan het bestemmingsplan.', actie: 'Analyseer huidig grondgebruik voor waterbergingseis en bestemmingsplantoets.', bronnen: ['BGT PDOK', 'Kadaster'] },
  { code: 'BESTUURLIJK_GEBIED', theme: 'basis', humanName: 'Bestuurlijk gebied', description: 'Gemeente, provincie, waterschap en veiligheidsregio', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/kadaster/bestuurlijkegebieden/wfs/v1_0', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Omgevingswet art. 4.1 (omgevingsplan); Waterschapswet', relevantieUitleg: 'Bepaalt welke gemeente bevoegd gezag is, welk waterschap de Keur hanteert, en welke provinciale verordening van toepassing is.', actie: 'Identificeer bevoegd gezag en toepasselijke regelgeving per bestuurslaag.', bronnen: ['PDOK Bestuurlijke Gebieden'] },
  { code: 'LUCHTFOTO', theme: 'basis', humanName: 'Actuele luchtfoto', description: 'Meest recente luchtfoto van de locatie (PDOK)', sourceType: 'WMS', sourceUrl: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0', computeMethod: 'attribute', bufferM: 0, wettelijkeGrondslag: 'Geen directe wettelijke grondslag; ondersteunend bewijs', relevantieUitleg: 'Luchtfoto geeft visueel inzicht in de huidige situatie ter plaatse. Kan dienen als bewijs voor bestaande situatie bij handhaving of vergunningverlening.', actie: 'Vergelijk luchtfoto met ingediende situatietekening voor consistentie.', bronnen: ['PDOK Luchtfoto RGB'] },

  // ===== PLANOLOGIE =====
  { code: 'BESTEMMINGSPLAN', theme: 'plan', humanName: 'Bestemmingsplan', description: 'Vigerende bestemmingsplannen op de locatie', sourceType: 'REST', sourceUrl: 'https://ruimtelijkeplannen.nl', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 3.1 Wro / Art. 4.1 Omgevingswet (omgevingsplan)', relevantieUitleg: 'Het bestemmingsplan (of omgevingsplan) bevat de juridisch bindende regels voor gebruik en bebouwing. Elke omgevingsvergunning wordt hieraan getoetst.', actie: 'Toets de aanvraag aan de regels van het vigerende bestemmingsplan. Bij strijdigheid: buitenplanse omgevingsplanactiviteit (BOPA) of binnenplanse afwijking.', bronnen: ['Ruimtelijkeplannen.nl', 'PDOK'] },
  { code: 'BESTEMMING', theme: 'plan', humanName: 'Bestemmingsvlak (enkelbestemming)', description: 'Enkelbestemming(en) op de locatie (wonen, bedrijf, etc.)', sourceType: 'REST', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 3.1 Wro; SVBP2012 (Standaard Vergelijkbare Bestemmingsplannen)', relevantieUitleg: 'De enkelbestemming bepaalt het toegestane gebruik van de gronden. Afwijking van de bestemming vereist een omgevingsvergunning voor afwijken.', actie: 'Controleer of het voorgenomen gebruik past binnen de enkelbestemming. Zo niet: afwijkingsprocedure nodig.', bronnen: ['Ruimtelijkeplannen.nl'] },
  { code: 'DUBBELBESTEMMING', theme: 'plan', humanName: 'Dubbelbestemming', description: 'Dubbelbestemmingen zoals Waarde-Archeologie, Waterstaat-Waterkering', sourceType: 'REST', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 3.1 Wro; SVBP2012; Verdrag van Malta (archeologie)', relevantieUitleg: 'Dubbelbestemmingen leggen aanvullende beschermingsregimes op. Waarde-Archeologie vereist archeologisch onderzoek bij bodemingrepen. Waterstaat-Waterkering beperkt bebouwing nabij waterkeringen.', actie: 'Identificeer alle dubbelbestemmingen en de bijbehorende onderzoeksplichten en beperkingen.', bronnen: ['Ruimtelijkeplannen.nl'] },
  { code: 'GEBIEDSAANDUIDING', theme: 'plan', humanName: 'Gebiedsaanduiding', description: 'Gebiedsaanduidingen zoals geluidzone, veiligheidszone, milieuzone', sourceType: 'REST', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 3.1 Wro; Wgh (geluidzones); Bevi (veiligheidszones)', relevantieUitleg: 'Gebiedsaanduidingen bevatten aanvullende regels voor specifieke zones. Geluidzones vereisen akoestisch onderzoek, veiligheidszones beperken kwetsbare objecten.', actie: 'Toets de aanvraag aan alle toepasselijke gebiedsaanduidingen en bijbehorende regels.', bronnen: ['Ruimtelijkeplannen.nl'] },
  { code: 'BOUWVLAK', theme: 'plan', humanName: 'Bouwvlak', description: 'Bouwvlak en maatvoering (max hoogte, max percentage, etc.)', sourceType: 'REST', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 3.1 Wro; SVBP2012 (bouwvlak, maatvoering)', relevantieUitleg: 'Het bouwvlak bepaalt waar gebouwd mag worden. Maatvoering (maximale bouwhoogte, goothoogte, bebouwingspercentage) bepaalt de maximale omvang van het bouwwerk.', actie: 'Controleer of het bouwplan binnen het bouwvlak valt en voldoet aan de maatvoering. Bij overschrijding: afwijkingsprocedure.', bronnen: ['Ruimtelijkeplannen.nl'] },
  { code: 'PLANREGELS', theme: 'plan', humanName: 'Planregels (letterlijk)', description: 'Letterlijke tekst van relevante planregels', sourceType: 'REST', computeMethod: 'attribute', bufferM: 0, wettelijkeGrondslag: 'Art. 3.1 Wro; Art. 4.1 Omgevingswet', relevantieUitleg: 'De letterlijke planregels bevatten de juridisch bindende voorschriften. Afwijkingsmogelijkheden (binnenplans, buitenplans) staan hierin beschreven.', actie: 'Lees de planregels zorgvuldig op afwijkingsmogelijkheden, voorwaardelijke verplichtingen en specifieke gebruiksregels.', bronnen: ['Ruimtelijkeplannen.nl'] },
  { code: 'OMGEVINGSPLAN', theme: 'plan', humanName: 'Omgevingsplan', description: 'Regels uit het gemeentelijk omgevingsplan (TAM/nieuw)', sourceType: 'REST', sourceUrl: 'https://service.omgevingswet.overheid.nl', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 4.1-4.2 Omgevingswet; Invoeringswet Omgevingswet (bruidsschat)', relevantieUitleg: 'Het omgevingsplan vervangt het bestemmingsplan onder de Omgevingswet. Bevat regels over activiteiten, functies en locaties. De bruidsschat bevat de rijksregels die automatisch in het omgevingsplan zijn opgenomen.', actie: 'Toets aan het omgevingsplan via het DSO. Let op de bruidsschat-regels die nog niet door de gemeente zijn aangepast.', bronnen: ['DSO Omgevingsloket', 'Overheid.nl'] },

  // ===== DSO =====
  { code: 'DSO_ACTIVITEITEN', theme: 'dso', humanName: 'DSO Activiteiten', description: 'Activiteiten uit de DSO-aanvraag (vergunningcheck)', sourceType: 'REST', sourceUrl: 'https://service.omgevingswet.overheid.nl', computeMethod: 'attribute', bufferM: 0, wettelijkeGrondslag: 'Art. 16.2 Omgevingswet (vergunningplicht); Art. 4.4 Omgevingswet (meldingsplicht)', relevantieUitleg: 'Het DSO bepaalt welke activiteiten vergunningplichtig, meldingsplichtig of vergunningvrij zijn op basis van de locatie en het type activiteit.', actie: 'Voer de vergunningcheck uit in het DSO voor alle relevante activiteiten.', bronnen: ['DSO Omgevingsloket'] },
  { code: 'DSO_VERGUNNINGCHECK', theme: 'dso', humanName: 'DSO Vergunningcheck', description: 'Indicatieve uitkomst vergunningcheck (vergunningplichtig/meldingplichtig/vrij)', sourceType: 'REST', computeMethod: 'attribute', bufferM: 0, wettelijkeGrondslag: 'Art. 16.1-16.2 Omgevingswet; Bal; Bbl; Bkl', relevantieUitleg: 'De vergunningcheck geeft een indicatieve uitkomst of een vergunning, melding of informatieplicht geldt. Let op: de uitkomst is indicatief en niet juridisch bindend.', actie: 'Gebruik de vergunningcheck als eerste indicatie. Verifieer de uitkomst altijd aan de hand van de onderliggende regelgeving.', bronnen: ['DSO Omgevingsloket'] },
  { code: 'DSO_INDIENINGSVEREISTEN', theme: 'dso', humanName: 'Indieningsvereisten', description: 'Vereiste documenten en gegevens voor de aanvraag', sourceType: 'REST', computeMethod: 'attribute', bufferM: 0, wettelijkeGrondslag: 'Art. 7.2 Omgevingsregeling (indieningsvereisten)', relevantieUitleg: 'De indieningsvereisten bepalen welke documenten en gegevens bij de aanvraag moeten worden ingediend. Onvolledige aanvragen worden niet in behandeling genomen.', actie: 'Controleer de volledigheid van de aanvraag aan de hand van de indieningsvereisten uit het DSO.', bronnen: ['DSO Omgevingsloket', 'Omgevingsregeling'] },
  { code: 'DSO_BEVOEGD_GEZAG', theme: 'dso', humanName: 'Bevoegd gezag', description: 'Welke overheid bevoegd gezag is voor deze aanvraag', sourceType: 'REST', computeMethod: 'attribute', bufferM: 0, wettelijkeGrondslag: 'Art. 5.8-5.15 Omgevingswet (bevoegd gezag)', relevantieUitleg: 'Het bevoegd gezag is de overheid die de vergunning verleent. Dit kan de gemeente, provincie, het waterschap of het Rijk zijn, afhankelijk van het type activiteit.', actie: 'Bepaal het bevoegd gezag op basis van het type activiteit en de locatie.', bronnen: ['DSO Omgevingsloket'] },
  { code: 'DSO_MAATREGELEN', theme: 'dso', humanName: 'Maatregelen op maat', description: 'Specifieke maatregelen en voorschriften uit toepasbare regels', sourceType: 'REST', computeMethod: 'attribute', bufferM: 0, wettelijkeGrondslag: 'Art. 4.7 Omgevingswet (toepasbare regels)', relevantieUitleg: 'Toepasbare regels vertalen juridische regels naar concrete maatregelen en voorschriften die op de specifieke locatie en activiteit van toepassing zijn.', actie: 'Pas de maatregelen uit de toepasbare regels toe op de aanvraag.', bronnen: ['DSO Omgevingsloket'] },

  // ===== NATUUR =====
  { code: 'NATURA2000', theme: 'natuur', humanName: 'Natura 2000', description: 'Natura 2000 gebieden (Vogel- en Habitatrichtlijn)', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/rvo/natura2000/wfs/v1_0', computeMethod: 'distance', bufferM: 10000, wettelijkeGrondslag: 'Art. 2.7/2.8 Wnb; Art. 16.53c Omgevingswet; Habitatrichtlijn 92/43/EEG; Vogelrichtlijn 2009/147/EG', relevantieUitleg: 'Bij activiteiten die significante effecten kunnen hebben op een Natura 2000-gebied is een passende beoordeling vereist. Dit geldt ook voor activiteiten buiten het gebied (externe werking).', actie: 'Beoordeel of significante effecten mogelijk zijn. Zo ja: passende beoordeling en eventueel ADC-toets. AERIUS-berekening voor stikstofdepositie.', bronnen: ['PDOK Natura 2000 WFS', 'RVO'] },
  { code: 'NNN', theme: 'natuur', humanName: 'Natuurnetwerk Nederland (NNN)', description: 'Ecologische hoofdstructuur / Natuurnetwerk Nederland — pixel-based WMS detectie', sourceType: 'WMS', sourceUrl: 'https://service.pdok.nl/provincies/nnn/wms/v1_0', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 2.44 Omgevingswet; Art. 7.7 Bkl; Provinciale Omgevingsverordening', relevantieUitleg: 'Het NNN kent een nee-tenzij regime: aantasting is niet toegestaan tenzij er geen alternatieven zijn, er een groot openbaar belang is, en de schade wordt gecompenseerd.', actie: 'Toets aan het nee-tenzij regime van de provinciale verordening. Bij aantasting: compensatieplan opstellen.', bronnen: ['PDOK NNN WMS', 'Provinciale Omgevingsverordening'] },
  { code: 'NATIONAAL_PARK', theme: 'natuur', humanName: 'Nationaal Park', description: 'Nationale parken in Nederland', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/rvo/beschermdegebieden/wfs/v1_0', computeMethod: 'distance', bufferM: 5000, wettelijkeGrondslag: 'Diverse; Provinciale Omgevingsverordening', relevantieUitleg: 'Nationale parken hebben aanvullende bescherming via provinciale verordeningen. Activiteiten in of nabij nationale parken vereisen vaak extra landschappelijke inpassing.', actie: 'Controleer provinciale regels voor het nationale park. Landschappelijke inpassing vereist.', bronnen: ['PDOK Beschermde Gebieden', 'RVO'] },
  { code: 'BESCHERMD_NATUURGEBIED', theme: 'natuur', humanName: 'Beschermd natuurgebied', description: 'Overige beschermde natuurgebieden (provinciaal/nationaal)', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/rvo/beschermdegebieden/wfs/v1_0', computeMethod: 'distance', bufferM: 3000, wettelijkeGrondslag: 'Art. 2.1/2.7 Wnb; Provinciale Omgevingsverordening', relevantieUitleg: 'Beschermde natuurgebieden kennen een eigen beschermingsregime. Activiteiten die de natuurwaarden kunnen aantasten zijn vergunningplichtig.', actie: 'Beoordeel de effecten op de natuurwaarden van het beschermde gebied.', bronnen: ['PDOK Beschermde Gebieden'] },
  { code: 'STIKSTOF_AERIUS', theme: 'natuur', humanName: 'Stikstof (AERIUS)', description: 'Stikstofdepositie berekening via AERIUS Calculator', sourceType: 'REST', sourceUrl: 'https://connect.aerius.nl/api/', computeMethod: 'derived', bufferM: 0, wettelijkeGrondslag: 'Art. 2.7 Wnb; Art. 16.53c Omgevingswet; Regeling natuurbescherming (AERIUS)', relevantieUitleg: 'Elke toename van stikstofdepositie op een overbelast Natura 2000-gebied moet worden beoordeeld. AERIUS Calculator is het wettelijk verplichte rekenmiddel.', actie: 'Voer een AERIUS-berekening uit voor de bouw- en gebruiksfase. Bij depositie > 0,00 mol/ha/jr op overbelast habitat: mitigatie of intern/extern salderen.', bronnen: ['AERIUS Calculator', 'RIVM'] },
  { code: 'ECOLOGISCHE_VERBINDING', theme: 'natuur', humanName: 'Ecologische verbindingszone', description: 'Ecologische verbindingszones tussen natuurgebieden', sourceType: 'WFS', computeMethod: 'distance', bufferM: 1000, wettelijkeGrondslag: 'Art. 2.44 Omgevingswet; Provinciale Omgevingsverordening', relevantieUitleg: 'Ecologische verbindingszones verbinden natuurgebieden en zijn essentieel voor de biodiversiteit. Doorsnijding of verstoring is in principe niet toegestaan.', actie: 'Beoordeel of de activiteit de ecologische verbinding doorsnijdt of verstoort. Mitigerende maatregelen vereist.', bronnen: ['Provinciale Omgevingsverordening'] },
  { code: 'WEIDEVOGELGEBIED', theme: 'natuur', humanName: 'Weidevogelgebied', description: 'Gebieden met belangrijke weidevogelpopulaties', sourceType: 'WFS', computeMethod: 'distance', bufferM: 500, wettelijkeGrondslag: 'Art. 3.1 Wnb (soortenbescherming); Provinciale Omgevingsverordening', relevantieUitleg: 'In weidevogelgebieden gelden extra beperkingen tijdens het broedseizoen (1 maart - 15 juli). Verstoring van nesten is verboden.', actie: 'Plan werkzaamheden buiten het broedseizoen. Bij werkzaamheden in broedseizoen: ecologische begeleiding verplicht.', bronnen: ['Provinciale Omgevingsverordening', 'SOVON'] },
  { code: 'FAUNAPASSAGE', theme: 'natuur', humanName: 'Faunapassage', description: 'Faunapassages en ecoducten', sourceType: 'WFS', computeMethod: 'distance', bufferM: 500, wettelijkeGrondslag: 'Art. 2.44 Omgevingswet; Provinciale Omgevingsverordening', relevantieUitleg: 'Faunapassages en ecoducten zijn essentieel voor de ecologische verbindingen. Activiteiten die de functionaliteit belemmeren zijn niet toegestaan.', actie: 'Beoordeel of de activiteit de werking van de faunapassage belemmert.', bronnen: ['Provinciale Omgevingsverordening'] },
  { code: 'BOMENKAART', theme: 'natuur', humanName: 'Bomenkaart / Kapvergunning', description: 'Beschermde bomen en kapvergunningplicht', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 25, wettelijkeGrondslag: 'Art. 4.2 Wnb (houtopstanden); Art. 11.6 Bal; Gemeentelijke APV (kapvergunning)', relevantieUitleg: 'Voor het vellen van bomen kan een kapvergunning vereist zijn op grond van de APV. Bij houtopstanden buiten de bebouwde kom geldt een meldingsplicht en herplantplicht.', actie: 'Controleer de gemeentelijke bomenverordening/APV. Bij kap buiten bebouwde kom: melding bij provincie + herplantplicht.', bronnen: ['Gemeente APV', 'Provinciale Omgevingsverordening'] },
  { code: 'SOORTENBESCHERMING', theme: 'natuur', humanName: 'Soortenbescherming', description: 'Beschermde dier- en plantensoorten (quickscan flora/fauna)', sourceType: 'DERIVED', computeMethod: 'derived', bufferM: 0, wettelijkeGrondslag: 'Art. 3.1-3.10 Wnb; Art. 5.1 Omgevingswet (omgevingsvergunning flora/fauna)', relevantieUitleg: 'Bij sloop, verbouw of kap moet worden beoordeeld of beschermde soorten aanwezig (kunnen) zijn. Een quickscan flora en fauna is de eerste stap.', actie: 'Laat een quickscan flora en fauna uitvoeren. Bij aanwezigheid beschermde soorten: nader onderzoek en eventueel ontheffingsaanvraag.', bronnen: ['NDFF (Nationale Databank Flora en Fauna)', 'Wnb'] },

  // ===== LANDSCHAP =====
  { code: 'LANDSCHAPSTYPE', theme: 'landschap', humanName: 'Landschapstype', description: 'Type landschap (polder, strandwal, veenweide, etc.)', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 4.2 Omgevingswet; Provinciale Omgevingsverordening', relevantieUitleg: 'Het landschapstype bepaalt de eisen voor landschappelijke inpassing. Elk landschapstype heeft eigen kenmerken die bij nieuwbouw moeten worden gerespecteerd.', actie: 'Pas de landschappelijke inpassing aan op het landschapstype conform de provinciale verordening.', bronnen: ['Provinciale Omgevingsverordening'] },
  { code: 'AARDKUNDIG_WAARDEVOL', theme: 'landschap', humanName: 'Aardkundig waardevol gebied', description: 'Gebieden met bijzondere aardkundige waarden', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 500, wettelijkeGrondslag: 'Provinciale Omgevingsverordening', relevantieUitleg: 'In aardkundig waardevolle gebieden gelden beperkingen voor ontgronding en bodemingrepen om de geologische waarden te beschermen.', actie: 'Beoordeel of de activiteit de aardkundige waarden aantast. Ontgrondingsvergunning mogelijk vereist.', bronnen: ['Provinciale Omgevingsverordening'] },
  { code: 'STILTEGEBIED', theme: 'landschap', humanName: 'Stiltegebied', description: 'Provinciale stiltegebieden — via PDOK WMS GetFeatureInfo', sourceType: 'WMS', sourceUrl: 'https://service.pdok.nl/provincies/stiltegebieden/wms/v1_0', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Provinciale Omgevingsverordening (stiltegebieden); Wet milieubeheer (Wm); Omgevingswet art. 2.22', relevantieUitleg: 'In stiltegebieden gelden strenge geluidbeperkingen. Activiteiten die het heersende geluidniveau significant verhogen zijn niet toegestaan zonder ontheffing.', actie: 'Beoordeel de geluidproductie van de activiteit. Bij overschrijding: ontheffing aanvragen bij de provincie.', bronnen: ['PDOK Stiltegebieden (Provincies)', 'Provinciale Omgevingsverordening'] },
  { code: 'DONKERTEGEBIED', theme: 'landschap', humanName: 'Donkertegebied', description: 'Gebieden met bijzondere duisternis (lichthinder)', sourceType: 'WFS', computeMethod: 'distance', bufferM: 500, wettelijkeGrondslag: 'Provinciale Omgevingsverordening (donkertegebieden)', relevantieUitleg: 'In donkertegebieden gelden beperkingen voor kunstmatige verlichting om de duisternis te beschermen. Relevant voor glastuinbouw, sportverlichting en buitenverlichting.', actie: 'Beperk kunstmatige verlichting. Gebruik afschermende armaturen en vermijd opwaarts gericht licht.', bronnen: ['Provinciale Omgevingsverordening'] },
  { code: 'WERELDERFGOED', theme: 'landschap', humanName: 'UNESCO Werelderfgoed', description: 'UNESCO Werelderfgoed locaties en bufferzones', sourceType: 'WFS', computeMethod: 'distance', bufferM: 2000, wettelijkeGrondslag: 'Werelderfgoedverdrag 1972; Art. 5.130 Bkl; Provinciale Omgevingsverordening', relevantieUitleg: 'UNESCO Werelderfgoed geniet de hoogste bescherming. Activiteiten in of nabij werelderfgoed moeten de Outstanding Universal Value (OUV) respecteren.', actie: 'Beoordeel de impact op de OUV. Advies inwinnen bij RCE. Landschappelijke inpassing verplicht.', bronnen: ['RCE', 'UNESCO', 'PDOK'] },

  // ===== WATER =====
  { code: 'WATERKERING', theme: 'water', humanName: 'Waterkering', description: 'Primaire en regionale waterkeringen (dijken, dammen)', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/rws/legger/wfs/v1_0', computeMethod: 'distance', bufferM: 200, wettelijkeGrondslag: 'Art. 6.1/6.5 Waterwet; Art. 5.4 Omgevingswet; Keur waterschap', relevantieUitleg: 'Waterkeringen beschermen tegen overstromingen. Activiteiten in of nabij waterkeringen zijn streng gereguleerd om de stabiliteit niet te ondermijnen.', actie: 'Watervergunning aanvragen bij het waterschap. Geen activiteiten in de kernzone zonder toestemming.', bronnen: ['PDOK Legger', 'Waterschap'] },
  { code: 'BESCHERMINGSZONE_WATERKERING', theme: 'water', humanName: 'Beschermingszone waterkering', description: 'Beschermingszones rondom waterkeringen', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 6.5 Waterwet; Keur waterschap', relevantieUitleg: 'In beschermingszones gelden beperkingen voor bebouwing, beplanting en grondwerkzaamheden om de waterkering te beschermen.', actie: 'Watervergunning aanvragen bij het waterschap voor activiteiten in de beschermingszone.', bronnen: ['Keur waterschap', 'Legger'] },
  { code: 'WATERGANG', theme: 'water', humanName: 'Watergang', description: 'Watergangen en sloten (legger waterschap)', sourceType: 'WFS', computeMethod: 'distance', bufferM: 100, wettelijkeGrondslag: 'Art. 6.5 Waterwet; Keur waterschap', relevantieUitleg: 'Watergangen hebben beschermingszones waarin beperkingen gelden. Dempen, verleggen of bebouwen van watergangen vereist een watervergunning.', actie: 'Controleer de legger van het waterschap. Watervergunning vereist bij activiteiten in of nabij watergangen.', bronnen: ['Keur waterschap', 'Legger'] },
  { code: 'OVERSTROMINGSRISICO', theme: 'water', humanName: 'Overstromingsrisico', description: 'Overstromingsrisicogebieden (Risicokaart)', sourceType: 'WMS', sourceUrl: 'https://service.pdok.nl/rws/overstromingsrisico/wms/v1_0', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'EU Richtlijn 2007/60/EG; Art. 5.12 Bkl (waterveiligheid)', relevantieUitleg: 'In gebieden met overstromingsrisico gelden aanvullende eisen voor waterveiligheid, evacuatiemogelijkheden en de hoogte van de vloerpeil.', actie: 'Beoordeel het overstromingsrisico en tref maatregelen (verhoogd vloerpeil, waterbestendig bouwen).', bronnen: ['Risicokaart.nl', 'PDOK'] },
  { code: 'GRONDWATERBESCHERMING', theme: 'water', humanName: 'Grondwaterbeschermingsgebied', description: 'Waterwingebieden, grondwaterbeschermingsgebieden en boringsvrije zones', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/provincies/grondwaterbeschermingsgebieden/wfs/v1_0', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 7.11 Bkl; Provinciale Omgevingsverordening', relevantieUitleg: 'In grondwaterbeschermingsgebieden gelden strenge beperkingen voor activiteiten die het grondwater kunnen verontreinigen. Bepaalde activiteiten zijn verboden.', actie: 'Controleer welke activiteiten verboden of vergunningplichtig zijn in het grondwaterbeschermingsgebied.', bronnen: ['PDOK Grondwaterbescherming', 'Provinciale Verordening'] },
  { code: 'WATERWINGEBIED', theme: 'water', humanName: 'Waterwingebied', description: 'Actieve waterwingebieden voor drinkwaterproductie', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Provinciale Omgevingsverordening; Drinkwaterwet', relevantieUitleg: 'Waterwingebieden kennen de strengste bescherming. De meeste activiteiten die het grondwater kunnen beïnvloeden zijn verboden.', actie: 'Vrijwel alle bouw- en grondwerkzaamheden zijn verboden in waterwingebieden. Ontheffing zeer uitzonderlijk.', bronnen: ['Provinciale Omgevingsverordening', 'Drinkwaterbedrijf'] },
  { code: 'KEUR_WATERSCHAP', theme: 'water', humanName: 'Keur waterschap', description: 'Vergunningplicht en meldingsplicht op grond van de Keur', sourceType: 'DERIVED', computeMethod: 'derived', bufferM: 0, wettelijkeGrondslag: 'Art. 78 Waterschapswet; Art. 6.5 Waterwet; Keur waterschap', relevantieUitleg: 'De Keur bevat de regels van het waterschap voor watergangen, waterkeringen en grondwater. Veel activiteiten nabij water zijn vergunning- of meldingsplichtig.', actie: 'Raadpleeg de Keur van het waterschap. Watervergunning of melding indienen voor relevante activiteiten.', bronnen: ['Keur waterschap'] },
  { code: 'RIOLERINGSGEBIED', theme: 'water', humanName: 'Rioleringsgebied', description: 'Type rioolstelsel (gemengd, gescheiden, DWA/HWA)', sourceType: 'MANUAL', computeMethod: 'attribute', bufferM: 0, wettelijkeGrondslag: 'Art. 10.33 Wm (zorgplicht hemelwater); Gemeentelijk Rioleringsplan', relevantieUitleg: 'Het type rioolstelsel bepaalt hoe hemelwater en afvalwater moeten worden afgevoerd. Bij gescheiden stelsel mag hemelwater niet op het vuilwaterriool worden aangesloten.', actie: 'Controleer het type rioolstelsel en pas de afvoer aan. Hemelwater bij voorkeur infiltreren of bergen.', bronnen: ['Gemeentelijk Rioleringsplan'] },
  { code: 'WATERTOETS', theme: 'water', humanName: 'Watertoets vereist', description: 'Indicatie of watertoets/wateradvies nodig is', sourceType: 'DERIVED', computeMethod: 'derived', bufferM: 0, wettelijkeGrondslag: 'Art. 3.1.1 Bro; Art. 5.37 Omgevingswet (wateradvies)', relevantieUitleg: 'Bij ruimtelijke plannen die invloed hebben op de waterhuishouding is een watertoets verplicht. Het waterschap geeft een wateradvies.', actie: 'Dien de digitale watertoets in via www.dewatertoets.nl. Verwerk het wateradvies in het plan.', bronnen: ['Waterschap', 'dewatertoets.nl'] },
  { code: 'ZWEMWATER', theme: 'water', humanName: 'Zwemwater', description: 'Officiële zwemwaterlocaties en kwaliteit', sourceType: 'WFS', computeMethod: 'distance', bufferM: 500, wettelijkeGrondslag: 'Zwemwaterrichtlijn 2006/7/EG; Art. 3.3 Bkl', relevantieUitleg: 'Nabij officiële zwemwaterlocaties gelden beperkingen voor lozingen en activiteiten die de waterkwaliteit kunnen beïnvloeden.', actie: 'Beoordeel of de activiteit de zwemwaterkwaliteit kan beïnvloeden. Lozingen zijn beperkt.', bronnen: ['Zwemwater.nl', 'Provinciale Omgevingsverordening'] },
  { code: 'NATTE_NATUUR', theme: 'water', humanName: 'Natte natuur / Wetlands', description: 'Natte natuurgebieden en Ramsar-wetlands', sourceType: 'WFS', computeMethod: 'distance', bufferM: 1000, wettelijkeGrondslag: 'Ramsar-verdrag; Art. 2.7 Wnb; Provinciale Omgevingsverordening', relevantieUitleg: 'Natte natuurgebieden en Ramsar-wetlands zijn internationaal beschermd. Activiteiten die de waterhuishouding of ecologische waarden beïnvloeden zijn beperkt.', actie: 'Beoordeel de effecten op de waterhuishouding en ecologische waarden van het natte natuurgebied.', bronnen: ['Ramsar', 'Provinciale Omgevingsverordening'] },

  // ===== BODEM =====
  { code: 'BODEMKWALITEIT', theme: 'bodem', humanName: 'Bodemkwaliteit', description: 'Bekende bodemverontreinigingen en saneringslocaties', sourceType: 'WMS', sourceUrl: 'https://service.pdok.nl/rivm/bodemkwaliteit/wms/v1_0', computeMethod: 'intersect', bufferM: 50, wettelijkeGrondslag: 'Art. 8.6 Bkl; Besluit bodemkwaliteit; NEN 5740', relevantieUitleg: 'Bij bouwactiviteiten met bodemingreep is bodemonderzoek verplicht (NEN 5740). Bij bekende verontreinigingen kan sanering nodig zijn voordat gebouwd mag worden.', actie: 'Laat een verkennend bodemonderzoek (NEN 5740) uitvoeren. Bij verontreiniging: nader onderzoek en eventueel saneringsplan.', bronnen: ['Bodemloket', 'RIVM', 'PDOK'] },
  { code: 'BODEMFUNCTIEKAART', theme: 'bodem', humanName: 'Bodemfunctiekaart', description: 'Bodemfunctieklasse (wonen, industrie, landbouw)', sourceType: 'WMS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Besluit bodemkwaliteit; Regeling bodemkwaliteit', relevantieUitleg: 'De bodemfunctieklasse bepaalt welke kwaliteit grond mag worden toegepast. Bij functiewijziging kan herclassificatie nodig zijn.', actie: 'Controleer de bodemfunctieklasse. Bij grondverzet: toets aan het Besluit bodemkwaliteit.', bronnen: ['Gemeente bodemkwaliteitskaart'] },
  { code: 'ONTPLOFBARE_OORLOGSRESTEN', theme: 'bodem', humanName: 'Ontplofbare oorlogsresten (OO)', description: 'Verdacht gebied voor niet-gesprongen explosieven', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'WSCS-OCE (Werkveldspecifiek certificatieschema); Arbeidsomstandighedenwet art. 3', relevantieUitleg: 'In verdachte gebieden moet vooronderzoek CE worden uitgevoerd voordat grondwerkzaamheden plaatsvinden. Bij aantreffen van explosieven: professionele ruiming vereist.', actie: 'Laat een vooronderzoek CE uitvoeren door een WSCS-OCE gecertificeerd bureau. Bij verdacht: detectieonderzoek en eventueel ruiming.', bronnen: ['Gemeente explosieven risicokaart', 'REAktr'] },
  { code: 'ONDERGRONDSE_TANKS', theme: 'bodem', humanName: 'Ondergrondse tanks', description: 'Bekende ondergrondse opslagtanks (BRO)', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 25, wettelijkeGrondslag: 'Besluit bodemkwaliteit; Activiteitenbesluit', relevantieUitleg: 'Ondergrondse tanks kunnen bodemverontreiniging veroorzaken. Bij sloop of herontwikkeling moeten tanks worden verwijderd en de bodem onderzocht.', actie: 'Controleer of ondergrondse tanks aanwezig zijn. Bij aanwezigheid: verwijderen en bodemonderzoek uitvoeren.', bronnen: ['BRO', 'Gemeente'] },
  { code: 'FUNDERINGSPROBLEMATIEK', theme: 'bodem', humanName: 'Funderingsproblematiek', description: 'Gebieden met bekende funderingsproblemen (houten palen, zetting)', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'NEN 8707 (beoordeling constructieve veiligheid); NEN 9997-1 (geotechnisch ontwerp)', relevantieUitleg: 'In gebieden met funderingsproblematiek (houten palen, slappe bodem) is extra aandacht nodig voor de fundering. Grondwaterstandsverlaging kan bestaande funderingen beschadigen.', actie: 'Laat een funderingsonderzoek uitvoeren. Bij houten paalfunderingen: grondwaterstand niet verlagen.', bronnen: ['KCAF', 'RVO Funderingsproblematiek'] },
  { code: 'ASBEST_RISICO', theme: 'bodem', humanName: 'Asbestrisico', description: 'Indicatie asbestrisico op basis van bouwjaar (<1994)', sourceType: 'DERIVED', computeMethod: 'derived', bufferM: 0, wettelijkeGrondslag: 'Asbestverwijderingsbesluit 2005; Art. 7.10 Bbl; SC-540 (certificering)', relevantieUitleg: 'Gebouwen van voor 1994 kunnen asbesthoudende materialen bevatten. Bij sloop of verbouw is een asbestinventarisatie verplicht.', actie: 'Laat een asbestinventarisatie uitvoeren door een SC-540 gecertificeerd bureau. Asbestverwijdering door gecertificeerd bedrijf (SC-530).', bronnen: ['BAG (bouwjaar)', 'Inspectie SZW'] },

  // ===== MILIEU =====
  { code: 'GELUIDZONE_WEG', theme: 'milieu', humanName: 'Geluidzone weg', description: 'Geluidzones langs wegen (Wet geluidhinder)', sourceType: 'WMS', sourceUrl: 'https://service.pdok.nl/rivm/geluid/wms/v1_0', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 74 Wgh; Art. 3.8 Bkl (voorkeursgrenswaarde 48 dB)', relevantieUitleg: 'Binnen geluidzones langs wegen geldt een voorkeursgrenswaarde van 48 dB voor geluidgevoelige gebouwen. Bij overschrijding: hogere waarde procedure of geluidwerende maatregelen.', actie: 'Laat een akoestisch onderzoek uitvoeren. Bij overschrijding voorkeursgrenswaarde: hogere waarde aanvragen bij B&W.', bronnen: ['RIVM Geluidkaart', 'PDOK'] },
  { code: 'GELUIDZONE_SPOOR', theme: 'milieu', humanName: 'Geluidzone spoor', description: 'Geluidzones langs spoorwegen', sourceType: 'WMS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 87 Wgh; Art. 3.25 Bkl (voorkeursgrenswaarde 55 dB)', relevantieUitleg: 'Binnen geluidzones langs spoorwegen geldt een voorkeursgrenswaarde van 55 dB. Spoorgeluid kent een andere beoordelingsmethode dan wegverkeersgeluid.', actie: 'Akoestisch onderzoek spoorweggeluid. Bij overschrijding: hogere waarde procedure.', bronnen: ['RIVM Geluidkaart', 'ProRail'] },
  { code: 'GELUIDZONE_INDUSTRIE', theme: 'milieu', humanName: 'Geluidzone industrie', description: 'Geluidzones rondom industrieterreinen', sourceType: 'WMS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 40 Wgh; Art. 3.31 Bkl (50 dB(A) etmaalwaarde)', relevantieUitleg: 'Binnen de geluidzone van een gezoneerd industrieterrein mogen geen nieuwe geluidgevoelige gebouwen worden gerealiseerd zonder hogere waarde.', actie: 'Controleer of de locatie binnen een industriegeluidzone valt. Akoestisch onderzoek vereist.', bronnen: ['RIVM Geluidkaart', 'Gemeente'] },
  { code: 'GELUIDZONE_LUCHTVAART', theme: 'milieu', humanName: 'Geluidzone luchtvaart', description: 'Geluidzones rondom luchthavens en vliegvelden', sourceType: 'WMS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 8.1 Wet luchtvaart; Lden geluidcontouren; LIB (Luchthavenindelingbesluit)', relevantieUitleg: 'Binnen geluidcontouren van luchthavens gelden beperkingen voor geluidgevoelige bestemmingen. Het LIB bevat de exacte contouren en beperkingen.', actie: 'Controleer het LIB voor de toepasselijke luchthaven. Beperkingen voor nieuwe woningen en andere geluidgevoelige bestemmingen.', bronnen: ['LIB', 'ILT'] },
  { code: 'LUCHTKWALITEIT', theme: 'milieu', humanName: 'Luchtkwaliteit (NSL)', description: 'Concentraties fijnstof en NO2 (Nationaal Samenwerkingsprogramma Luchtkwaliteit)', sourceType: 'WMS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 5.16 Wm; Art. 5.53 Bkl; EU Richtlijn 2008/50/EG', relevantieUitleg: 'Bij nieuwe ontwikkelingen moet worden getoetst of de grenswaarden voor luchtkwaliteit (NO2: 40 ug/m3, PM10: 40 ug/m3) niet worden overschreden.', actie: 'Toets aan de grenswaarden. Bij NIBM (Niet In Betekenende Mate): geen nader onderzoek. Anders: luchtkwaliteitsonderzoek.', bronnen: ['NSL Monitoringstool', 'RIVM'] },
  { code: 'GEURZONE', theme: 'milieu', humanName: 'Geurzone', description: 'Geurcontouren van veehouderijen en industrie', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Wgv (Wet geurhinder en veehouderij); Art. 5.42 Bkl', relevantieUitleg: 'Binnen geurcontouren gelden normen voor de maximale geurbelasting op geurgevoelige objecten. De norm verschilt per gebiedstype (concentratiegebied/niet-concentratiegebied, bebouwde kom/buitengebied).', actie: 'Beoordeel de geurbelasting met V-Stacks. Toets aan de normen uit de Wgv of het omgevingsplan.', bronnen: ['Gemeente', 'V-Stacks berekening'] },
  { code: 'TRILLINGEN', theme: 'milieu', humanName: 'Trillingsgevoelig', description: 'Trillingszones langs spoor en industrie', sourceType: 'DERIVED', computeMethod: 'derived', bufferM: 0, wettelijkeGrondslag: 'SBR Richtlijn A (schade aan gebouwen); SBR Richtlijn B (hinder voor personen)', relevantieUitleg: 'Nabij spoorwegen en zware industrie kunnen trillingen optreden die schade aan gebouwen of hinder voor bewoners veroorzaken. De SBR-richtlijnen geven streefwaarden.', actie: 'Laat een trillingsonderzoek uitvoeren bij nieuwbouw nabij spoor of industrie. Toets aan SBR Richtlijn A en B.', bronnen: ['SBR Richtlijnen', 'ProRail'] },

  // ===== VEILIGHEID =====
  { code: 'BEVI_INRICHTING', theme: 'veiligheid', humanName: 'Bevi-inrichting', description: 'Risicovolle inrichtingen (Besluit externe veiligheid inrichtingen)', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/rivm/rev/wfs/v1_0', computeMethod: 'distance', bufferM: 1500, wettelijkeGrondslag: 'Bevi; Art. 5.12 Bkl (plaatsgebonden risico 10^-6/jr)', relevantieUitleg: 'Binnen de plaatsgebonden risicocontour (10^-6) van een Bevi-inrichting mogen geen kwetsbare objecten worden gerealiseerd. Het groepsrisico moet worden verantwoord.', actie: 'Controleer de risicocontouren op de Risicokaart. QRA (Quantitative Risk Assessment) bij kwetsbare objecten. Verantwoording groepsrisico.', bronnen: ['Risicokaart.nl', 'RIVM REV'] },
  { code: 'BUISLEIDING', theme: 'veiligheid', humanName: 'Buisleiding (gevaarlijke stoffen)', description: 'Buisleidingen met gevaarlijke stoffen (Bevb)', sourceType: 'WFS', computeMethod: 'distance', bufferM: 200, wettelijkeGrondslag: 'Bevb (Besluit externe veiligheid buisleidingen); Art. 5.15 Bkl', relevantieUitleg: 'Buisleidingen met gevaarlijke stoffen hebben een belemmeringenstrook (5m) en een veiligheidsafstand. Binnen deze zones gelden beperkingen voor bebouwing.', actie: 'Controleer de ligging van buisleidingen. Geen bebouwing in de belemmeringenstrook. Verantwoording groepsrisico bij kwetsbare objecten.', bronnen: ['Risicokaart.nl', 'KLIC'] },
  { code: 'RISICOCONTOUR', theme: 'veiligheid', humanName: 'Risicocontour (PR/GR)', description: 'Plaatsgebonden risico en groepsrisico contouren', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Bevi; Art. 5.12 Bkl', relevantieUitleg: 'De risicocontour geeft de grens aan waarbinnen het plaatsgebonden risico hoger is dan 10^-6 per jaar. Binnen deze contour zijn kwetsbare objecten niet toegestaan.', actie: 'Toets de aanvraag aan de risicocontouren. Verantwoording groepsrisico bij beperkt kwetsbare objecten.', bronnen: ['Risicokaart.nl', 'RIVM REV'] },
  { code: 'LPG_TANKSTATION', theme: 'veiligheid', humanName: 'LPG-tankstation', description: 'LPG-tankstations en veiligheidszones', sourceType: 'WFS', computeMethod: 'distance', bufferM: 150, wettelijkeGrondslag: 'Bevi; Art. 5.12 Bkl; Revi (vaste afstanden)', relevantieUitleg: 'LPG-tankstations hebben vaste veiligheidsafstanden: 45m (vulpunt), 25m (ondergronds reservoir), 15m (afleverzuil) tot kwetsbare objecten.', actie: 'Controleer de afstand tot het LPG-tankstation. Geen kwetsbare objecten binnen de veiligheidsafstanden.', bronnen: ['Risicokaart.nl', 'Gemeente'] },
  { code: 'VUURWERK_OPSLAG', theme: 'veiligheid', humanName: 'Vuurwerkopslag', description: 'Vuurwerkopslagplaatsen en veiligheidsafstanden', sourceType: 'WFS', computeMethod: 'distance', bufferM: 800, wettelijkeGrondslag: 'Vuurwerkbesluit; Bevi', relevantieUitleg: 'Vuurwerkopslagplaatsen hebben grote veiligheidsafstanden (tot 800m voor professioneel vuurwerk). Binnen deze zones zijn kwetsbare objecten niet toegestaan.', actie: 'Controleer de afstand tot vuurwerkopslagplaatsen. Veiligheidsafstanden respecteren.', bronnen: ['Risicokaart.nl', 'Gemeente'] },

  // ===== ERFGOED =====
  { code: 'RIJKSMONUMENT', theme: 'erfgoed', humanName: 'Rijksmonument', description: 'Rijksmonumenten (Rijksdienst voor het Cultureel Erfgoed)', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/rce/rijksmonumenten/wfs/v1_0', computeMethod: 'distance', bufferM: 100, wettelijkeGrondslag: 'Art. 5.1 Omgevingswet; Art. 13.7 Bkl (advies RCE)', relevantieUitleg: 'Voor wijzigingen aan een rijksmonument is een omgevingsvergunning vereist. De Rijksdienst voor het Cultureel Erfgoed (RCE) adviseert het bevoegd gezag.', actie: 'Omgevingsvergunning aanvragen. RCE-advies inwinnen. Restauratieplan opstellen conform Leidraad Restauratie.', bronnen: ['RCE Monumentenregister', 'PDOK'] },
  { code: 'GEMEENTELIJK_MONUMENT', theme: 'erfgoed', humanName: 'Gemeentelijk monument', description: 'Gemeentelijke monumenten en beeldbepalende panden', sourceType: 'MANUAL', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 4.1 Omgevingswet; Gemeentelijke monumentenverordening', relevantieUitleg: 'Gemeentelijke monumenten zijn beschermd via de gemeentelijke verordening. Wijzigingen vereisen een omgevingsvergunning en advies van de monumentencommissie.', actie: 'Omgevingsvergunning aanvragen. Advies monumentencommissie. Controleer de gemeentelijke monumentenlijst.', bronnen: ['Gemeente monumentenlijst'] },
  { code: 'BESCHERMD_GEZICHT', theme: 'erfgoed', humanName: 'Beschermd stads-/dorpsgezicht', description: 'Beschermde stads- en dorpsgezichten', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/rce/beschermdestadsdorpsgezichten/wfs/v1_0', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 5.1 Omgevingswet; Art. 13.7 Bkl', relevantieUitleg: 'In een beschermd gezicht gelden aanvullende welstandseisen en is sloop vergunningplichtig. Het karakter van het beschermde gezicht moet worden behouden.', actie: 'Omgevingsvergunning voor sloop. Welstandstoets door de monumentencommissie. Inpassing in het beschermde gezicht.', bronnen: ['RCE', 'PDOK'] },
  { code: 'ARCHEOLOGIE', theme: 'erfgoed', humanName: 'Archeologische verwachtingswaarde', description: 'Archeologische verwachtingskaart en dubbelbestemming Waarde-Archeologie', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 5.1 Omgevingswet; Verdrag van Malta (1992); Art. 5.130 Bkl', relevantieUitleg: 'Bij bodemingrepen in gebieden met archeologische verwachting is archeologisch vooronderzoek verplicht. De vrijstellingsgrenzen (oppervlakte en diepte) verschillen per gemeente.', actie: 'Controleer de vrijstellingsgrenzen. Bij overschrijding: bureauonderzoek en eventueel booronderzoek of proefsleuvenonderzoek.', bronnen: ['Gemeente archeologiebeleid', 'IKAW'] },
  { code: 'CULTUURLANDSCHAP', theme: 'erfgoed', humanName: 'Cultuurhistorisch landschap', description: 'Gebieden met bijzondere cultuurhistorische waarden', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 3.1.6 Bro; Art. 5.130 Bkl; Provinciale Omgevingsverordening', relevantieUitleg: 'In cultuurhistorisch waardevolle gebieden moeten de cultuurhistorische waarden worden meegewogen bij ruimtelijke ontwikkelingen. Landschappelijke inpassing is vereist.', actie: 'Cultuurhistorische analyse uitvoeren. Landschappelijke inpassing conform provinciale verordening.', bronnen: ['Provinciale Omgevingsverordening', 'CHW-kaart'] },
  { code: 'HISTORISCHE_BUITENPLAATS', theme: 'erfgoed', humanName: 'Historische buitenplaats', description: 'Historische buitenplaatsen en landgoederen', sourceType: 'WFS', computeMethod: 'distance', bufferM: 500, wettelijkeGrondslag: 'Provinciale Omgevingsverordening; Erfgoedwet', relevantieUitleg: 'Historische buitenplaatsen en landgoederen zijn beschermd via de provinciale verordening. Activiteiten in de directe omgeving moeten de historische waarden respecteren.', actie: 'Beoordeel de impact op de historische buitenplaats. Landschappelijke inpassing vereist.', bronnen: ['RCE', 'Provinciale Omgevingsverordening'] },
  { code: 'VERDRAG_MALTA', theme: 'erfgoed', humanName: 'Verdrag van Malta', description: 'Archeologisch onderzoek vereist bij bodemingreep (vrijstellingsgrenzen)', sourceType: 'DERIVED', computeMethod: 'derived', bufferM: 0, wettelijkeGrondslag: 'Verdrag van Malta (1992); Art. 5.1 Omgevingswet; Art. 5.130 Bkl', relevantieUitleg: 'Het Verdrag van Malta verplicht tot het meewegen van archeologische waarden bij ruimtelijke beslissingen. Bij bodemingrepen boven de vrijstellingsgrenzen is onderzoek verplicht.', actie: 'Controleer de gemeentelijke vrijstellingsgrenzen voor archeologie. Bij overschrijding: archeologisch vooronderzoek.', bronnen: ['Gemeente archeologiebeleid', 'SIKB'] },

  // ===== AGRARISCH =====
  { code: 'GEWASPERCEEL', theme: 'agrarisch', humanName: 'Gewasperceel (BRP)', description: 'Basisregistratie Gewaspercelen - actueel gewastype', sourceType: 'WFS', sourceUrl: 'https://service.pdok.nl/rvo/brpgewaspercelen/wfs/v1_0', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Meststoffenwet; EU Verordening 1307/2013 (GLB)', relevantieUitleg: 'Gewaspercelen geven inzicht in het agrarisch gebruik. Relevant voor spuitzones, geurcontouren en de toets aan de agrarische bestemming.', actie: 'Controleer het gewastype en de afstand tot het plangebied voor spuitzones en geurcontouren.', bronnen: ['RVO BRP', 'PDOK'] },
  { code: 'GEURCONTOUR_VEEHOUDERIJ', theme: 'agrarisch', humanName: 'Geurcontour veehouderij', description: 'Geurcontouren rondom veehouderijen (Wet geurhinder)', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Wgv (Wet geurhinder en veehouderij); Art. 5.42 Bkl; Regeling geurhinder', relevantieUitleg: 'De Wgv stelt normen voor de maximale geurbelasting van veehouderijen op geurgevoelige objecten. De normen variëren per gebiedstype. Bij nieuwe geurgevoelige objecten nabij veehouderijen moet de geurbelasting worden beoordeeld.', actie: 'Geurberekening uitvoeren met V-Stacks. Toets aan de normen uit de Wgv (2/8/3/14 ouE/m3 afhankelijk van gebiedstype).', bronnen: ['V-Stacks berekening', 'Gemeente'] },
  { code: 'GLASTUINBOUW', theme: 'agrarisch', humanName: 'Glastuinbouwgebied', description: 'Concentratiegebieden glastuinbouw', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Provinciale Omgevingsverordening; Activiteitenbesluit', relevantieUitleg: 'Glastuinbouwgebieden kennen specifieke regels voor lichthinder, gewasbeschermingsmiddelen en watergebruik. Nabij glastuinbouw gelden beperkingen voor gevoelige bestemmingen.', actie: 'Beoordeel lichthinder en spuitzones. Controleer provinciale regels voor glastuinbouwgebieden.', bronnen: ['Provinciale Omgevingsverordening', 'BRP'] },
  { code: 'LANDBOUWGROND', theme: 'agrarisch', humanName: 'Landbouwgrond', description: 'Agrarische gronden en bestemmingen', sourceType: 'DERIVED', computeMethod: 'derived', bufferM: 0, wettelijkeGrondslag: 'Art. 4.1 Omgevingswet; Ladder voor duurzame verstedelijking (art. 3.1.6 Bro)', relevantieUitleg: 'Functiewijziging van agrarische grond naar een andere bestemming vereist een bestemmingsplanwijziging en toetsing aan de Ladder voor duurzame verstedelijking.', actie: 'Toets aan de Ladder voor duurzame verstedelijking. Bestemmingsplanwijziging vereist bij functiewijziging.', bronnen: ['Bestemmingsplan', 'Provinciale Omgevingsverordening'] },
  { code: 'MESTVERWERKING', theme: 'agrarisch', humanName: 'Mestverwerkingslocatie', description: 'Mestverwerkingsinstallaties en afstandsnormen', sourceType: 'WFS', computeMethod: 'distance', bufferM: 500, wettelijkeGrondslag: 'Activiteitenbesluit; VNG Bedrijven en milieuzonering', relevantieUitleg: 'Mestverwerkingsinstallaties hebben geurafstanden die relevant zijn voor nieuwe geurgevoelige bestemmingen in de omgeving.', actie: 'Controleer de richtafstanden conform VNG Bedrijven en milieuzonering. Geuronderzoek bij afwijking.', bronnen: ['VNG Bedrijven en milieuzonering', 'Gemeente'] },
  { code: 'SPUITZONE', theme: 'agrarisch', humanName: 'Spuitzone', description: 'Spuitzones rondom agrarische percelen (gewasbescherming)', sourceType: 'DERIVED', computeMethod: 'derived', bufferM: 50, wettelijkeGrondslag: 'VNG Bedrijven en milieuzonering; Voorzorgsbeginsel; Jurisprudentie (50m richtafstand)', relevantieUitleg: 'De richtafstand van 50 meter tussen agrarische percelen en gevoelige bestemmingen is gebaseerd op jurisprudentie en het voorzorgsbeginsel. Bij kortere afstanden is nader onderzoek nodig.', actie: 'Controleer de afstand tot agrarische percelen. Bij < 50m: driftreducerend onderzoek of fysieke afscherming.', bronnen: ['BRP Gewaspercelen', 'VNG'] },
  { code: 'DIERENWELZIJN', theme: 'agrarisch', humanName: 'Dierenwelzijnszone', description: 'Zones met restricties voor dierhouderij', sourceType: 'DERIVED', computeMethod: 'derived', bufferM: 0, wettelijkeGrondslag: 'Provinciale Omgevingsverordening; Besluit emissiearme huisvesting', relevantieUitleg: 'In bepaalde zones gelden aanvullende eisen voor dierhouderij, zoals het Besluit emissiearme huisvesting en provinciale regels voor de maximale omvang van veehouderijen.', actie: 'Controleer provinciale regels voor dierhouderij. Toets aan het Besluit emissiearme huisvesting.', bronnen: ['Provinciale Omgevingsverordening'] },

  // ===== INFRA =====
  { code: 'HOOGSPANNING', theme: 'infra', humanName: 'Hoogspanningsleiding', description: 'Hoogspanningsleidingen en magneetveldzone', sourceType: 'WFS', computeMethod: 'distance', bufferM: 200, wettelijkeGrondslag: 'RIVM magneetveldadvies (0,4 microtesla); Rijksbeleid nieuwe situaties', relevantieUitleg: 'Het RIVM adviseert om geen nieuwe gevoelige bestemmingen (woningen, scholen, kinderopvang) te realiseren binnen de 0,4 microtesla magneetveldzone van hoogspanningsleidingen.', actie: 'Controleer de magneetveldzone. Geen gevoelige bestemmingen binnen de 0,4 microtesla contour.', bronnen: ['RIVM', 'Netbeheerder', 'PDOK'] },
  { code: 'GASLEIDING', theme: 'infra', humanName: 'Gasleiding (hogedruk)', description: 'Hogedruk gasleidingen en veiligheidsstroken', sourceType: 'WFS', computeMethod: 'distance', bufferM: 200, wettelijkeGrondslag: 'Bevb; WIBON (Wet informatie-uitwisseling bovengrondse en ondergrondse netten)', relevantieUitleg: 'Hogedruk gasleidingen hebben een belemmeringenstrook (4-5m) en een veiligheidsafstand. Binnen de belemmeringenstrook mag niet worden gebouwd of gegraven.', actie: 'KLIC-melding uitvoeren. Geen activiteiten in de belemmeringenstrook zonder toestemming van de leidingbeheerder.', bronnen: ['KLIC', 'Gasunie/netbeheerder'] },
  { code: 'KLIC_MELDING', theme: 'infra', humanName: 'KLIC-melding vereist', description: 'Kabels en leidingen - KLIC-melding verplicht bij graven >20cm', sourceType: 'DERIVED', computeMethod: 'derived', bufferM: 0, wettelijkeGrondslag: 'WIBON art. 2 (meldingsplicht); Minimaal 3 werkdagen voor aanvang', relevantieUitleg: 'Bij mechanisch graven dieper dan 20 cm is een KLIC-melding verplicht. De netbeheerders leveren binnen 3 werkdagen informatie over de ligging van kabels en leidingen.', actie: 'KLIC-melding indienen via het Kadaster minimaal 3 werkdagen voor aanvang graafwerkzaamheden.', bronnen: ['Kadaster KLIC', 'WIBON'] },
  { code: 'SPOORWEG', theme: 'infra', humanName: 'Spoorweg', description: 'Spoorlijnen en veiligheidszones', sourceType: 'WFS', computeMethod: 'distance', bufferM: 200, wettelijkeGrondslag: 'Basisnet Spoor; Art. 5.12 Bkl; Wgh art. 87', relevantieUitleg: 'Nabij spoorwegen gelden veiligheidszones (externe veiligheid), geluidzones en trillingszones. Het Basisnet Spoor bepaalt de risicocontouren.', actie: 'Toets aan Basisnet Spoor (externe veiligheid), geluidzones (Wgh) en trillingszones (SBR).', bronnen: ['ProRail', 'Basisnet', 'PDOK'] },
  { code: 'RIJKSWEG', theme: 'infra', humanName: 'Rijksweg', description: 'Rijkswegen en geluidzones', sourceType: 'WFS', computeMethod: 'distance', bufferM: 600, wettelijkeGrondslag: 'Art. 74 Wgh; Art. 3.8 Bkl; Basisnet Weg', relevantieUitleg: 'Nabij rijkswegen gelden geluidzones (Wgh), luchtkwaliteitszones en externe veiligheidszones (Basisnet Weg).', actie: 'Akoestisch onderzoek, luchtkwaliteitsonderzoek en toets aan Basisnet Weg.', bronnen: ['Rijkswaterstaat', 'PDOK NWB'] },
  { code: 'VAARWEG', theme: 'infra', humanName: 'Vaarweg', description: 'Vaarwegen en oeverbeschermingszones', sourceType: 'WFS', computeMethod: 'distance', bufferM: 100, wettelijkeGrondslag: 'Waterwet; Binnenvaartwet; Basisnet Water', relevantieUitleg: 'Nabij vaarwegen gelden beschermingszones voor de oever en externe veiligheidszones voor het vervoer van gevaarlijke stoffen (Basisnet Water).', actie: 'Watervergunning bij Rijkswaterstaat of waterschap. Toets aan Basisnet Water.', bronnen: ['Rijkswaterstaat', 'Basisnet Water'] },

  // ===== MOBILITEIT =====
  { code: 'PARKEERDRUK', theme: 'mobiliteit', humanName: 'Parkeerdruk', description: 'Parkeernormen en parkeerdruk in het gebied', sourceType: 'DERIVED', computeMethod: 'derived', bufferM: 0, wettelijkeGrondslag: 'CROW publicatie 381 (parkeerkencijfers); Gemeentelijke parkeernota', relevantieUitleg: 'Bij nieuwe ontwikkelingen moet voldoende parkeerruimte worden gerealiseerd conform de gemeentelijke parkeernormen. De norm is afhankelijk van de functie, stedelijkheidsgraad en ligging.', actie: 'Toets aan de gemeentelijke parkeernormen (CROW 381). Parkeerbalans opstellen.', bronnen: ['CROW publicatie 381', 'Gemeentelijke parkeernota'] },
  { code: 'OV_BEREIKBAARHEID', theme: 'mobiliteit', humanName: 'OV-bereikbaarheid', description: 'Nabijheid van OV-haltes en stations', sourceType: 'WFS', computeMethod: 'distance', bufferM: 1000, wettelijkeGrondslag: 'CROW; Ladder voor duurzame verstedelijking (art. 3.1.6 Bro)', relevantieUitleg: 'Goede OV-bereikbaarheid kan leiden tot lagere parkeernormen. Relevant voor de Ladder voor duurzame verstedelijking.', actie: 'Beoordeel de OV-bereikbaarheid. Bij goede bereikbaarheid: lagere parkeernorm mogelijk.', bronnen: ['OV-chipkaart data', 'CROW'] },
  { code: 'FIETSROUTE', theme: 'mobiliteit', humanName: 'Fietsroute', description: 'Hoofdfietsroutes en fietssnelwegen', sourceType: 'WFS', computeMethod: 'distance', bufferM: 200, wettelijkeGrondslag: 'Gemeente/Provincie mobiliteitsplan', relevantieUitleg: 'Nabijheid van fietsroutes is relevant voor de bereikbaarheid en kan invloed hebben op het mobiliteitsplan.', actie: 'Beoordeel de fietsbereikbaarheid. Integreer in het mobiliteitsplan.', bronnen: ['Gemeente', 'Provincie'] },

  // ===== OVERIG =====
  { code: 'ZORGINSTELLING', theme: 'overig', humanName: 'Zorginstelling nabijheid', description: 'Nabijheid van ziekenhuizen, verpleeghuizen en zorginstellingen', sourceType: 'DERIVED', computeMethod: 'distance', bufferM: 500, wettelijkeGrondslag: 'Bevi (kwetsbare objecten); VNG Bedrijven en milieuzonering', relevantieUitleg: 'Zorginstellingen zijn kwetsbare objecten in de zin van het Bevi. Relevant voor externe veiligheid en milieuzonering.', actie: 'Controleer of de activiteit invloed heeft op nabijgelegen zorginstellingen (veiligheidsafstanden).', bronnen: ['Risicokaart.nl', 'Gemeente'] },
  { code: 'SCHOOL_KINDEROPVANG', theme: 'overig', humanName: 'School / Kinderopvang', description: 'Nabijheid van scholen en kinderopvang (kwetsbare objecten)', sourceType: 'DERIVED', computeMethod: 'distance', bufferM: 300, wettelijkeGrondslag: 'Bevi (kwetsbare objecten); VNG Bedrijven en milieuzonering; RIVM magneetveldadvies', relevantieUitleg: 'Scholen en kinderopvang zijn kwetsbare objecten. Relevant voor externe veiligheid, milieuzonering en het magneetveldadvies (hoogspanning).', actie: 'Controleer veiligheidsafstanden en milieuzonering ten opzichte van scholen en kinderopvang.', bronnen: ['Risicokaart.nl', 'Gemeente'] },
  { code: 'LUCHTVAART_BEPERKING', theme: 'overig', humanName: 'Luchtvaartbeperking', description: 'Luchtvaartbeperkingen en hoogterestricties', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Art. 8.1 Wet luchtvaart; LIB (Luchthavenindelingbesluit)', relevantieUitleg: 'In de nabijheid van luchthavens gelden hoogterestricties en beperkingen voor vogelaantrekkende bestemmingen.', actie: 'Controleer het LIB voor hoogtebeperkingen. Verklaring van geen bezwaar bij ILT bij overschrijding.', bronnen: ['LIB', 'ILT'] },
  { code: 'DEFENSIE_ZONE', theme: 'overig', humanName: 'Defensiezone', description: 'Militaire zones en beperkingsgebieden', sourceType: 'WFS', computeMethod: 'intersect', bufferM: 0, wettelijkeGrondslag: 'Ministerie van Defensie; Provinciale Omgevingsverordening', relevantieUitleg: 'In defensiezones gelden beperkingen voor bouwhoogte en bepaalde activiteiten. Radarstations hebben een beschermingszone.', actie: 'Controleer beperkingen bij het Ministerie van Defensie. Verklaring van geen bezwaar aanvragen.', bronnen: ['Ministerie van Defensie', 'Provincie'] },
];

// ============ COMPONENT ============

export default function IndicatorenOverzicht() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const filteredIndicators = useMemo(() => {
    let result = INDICATORS;
    if (selectedTheme) {
      result = result.filter(i => i.theme === selectedTheme);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.humanName.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.wettelijkeGrondslag.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q)
      );
    }
    return result;
  }, [searchQuery, selectedTheme]);

  const toggleIndicator = (code: string) => {
    setExpandedIndicators(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIndicators(new Set(filteredIndicators.map(i => i.code)));
  };

  const collapseAll = () => {
    setExpandedIndicators(new Set());
  };

  const getTheme = (code: string) => THEMES.find(t => t.code === code);

  // Group by theme
  const groupedIndicators = useMemo(() => {
    const groups: Record<string, IndicatorInfo[]> = {};
    for (const ind of filteredIndicators) {
      if (!groups[ind.theme]) groups[ind.theme] = [];
      groups[ind.theme].push(ind);
    }
    return groups;
  }, [filteredIndicators]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/omgevingsscan" className="flex items-center gap-2 text-[#1B4D3E] hover:text-[#2d7a63] transition-colors">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Terug</span>
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B4D3E] to-[#2d7a63] flex items-center justify-center shadow-md">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Indicatoren Encyclopedie</h1>
                  <p className="text-xs text-slate-500">{INDICATORS.length} indicatoren &bull; {THEMES.length} thema's &bull; Volledige wettelijke grondslag</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek indicator, wet of artikel..."
                  className="pl-10 bg-slate-50 border-slate-200 focus:bg-white rounded-xl h-10"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={expandAll} className="rounded-xl text-xs">
                <Eye className="h-3.5 w-3.5 mr-1.5" />Alles open
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll} className="rounded-xl text-xs">
                <X className="h-3.5 w-3.5 mr-1.5" />Alles dicht
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Left sidebar - theme filter */}
          <div className="w-64 shrink-0">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-[#1B4D3E]" />
                    Thema's
                  </h3>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => setSelectedTheme(null)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                      !selectedTheme ? 'bg-[#1B4D3E]/10 text-[#1B4D3E] font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    <span className="text-sm flex-1">Alle thema's</span>
                    <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-full">{INDICATORS.length}</span>
                  </button>
                  {THEMES.map(theme => {
                    const Icon = theme.icon;
                    const count = INDICATORS.filter(i => i.theme === theme.code).length;
                    const isActive = selectedTheme === theme.code;
                    return (
                      <button
                        key={theme.code}
                        onClick={() => setSelectedTheme(isActive ? null : theme.code)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                          isActive ? 'bg-slate-100 font-semibold text-slate-800' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-sm flex-1 truncate">{theme.label}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white text-slate-700' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stats card */}
              <div className="mt-4 bg-gradient-to-br from-[#1B4D3E] to-[#2d7a63] rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-5 w-5 text-white/80" />
                  <span className="text-sm font-bold">Statistieken</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-extrabold">{INDICATORS.length}</div>
                    <div className="text-[10px] text-white/70 uppercase tracking-wider">Indicatoren</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-extrabold">{THEMES.length}</div>
                    <div className="text-[10px] text-white/70 uppercase tracking-wider">Thema's</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-extrabold">{INDICATORS.filter(i => i.sourceType === 'WFS' || i.sourceType === 'REST').length}</div>
                    <div className="text-[10px] text-white/70 uppercase tracking-wider">API's</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-extrabold">{INDICATORS.filter(i => i.sourceType === 'DERIVED').length}</div>
                    <div className="text-[10px] text-white/70 uppercase tracking-wider">Afgeleid</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content - indicator list */}
          <div className="flex-1 min-w-0">
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                <span className="font-bold text-slate-700">{filteredIndicators.length}</span> indicatoren gevonden
                {selectedTheme && <span> in <span className="font-semibold text-slate-700">{getTheme(selectedTheme)?.label}</span></span>}
                {searchQuery && <span> voor "{searchQuery}"</span>}
              </p>
            </div>

            {/* Grouped indicators */}
            {Object.entries(groupedIndicators).map(([themeCode, indicators]) => {
              const theme = getTheme(themeCode);
              if (!theme) return null;
              const Icon = theme.icon;

              return (
                <div key={themeCode} className="mb-6">
                  {/* Theme header */}
                  <div className="flex items-center gap-3 mb-3 sticky top-20 bg-slate-50 py-2 z-10">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-sm`}>
                      <Icon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{theme.label}</h2>
                      <p className="text-xs text-slate-500">{indicators.length} indicatoren</p>
                    </div>
                    <div className="flex-1 h-px bg-slate-200 ml-4" />
                  </div>

                  {/* Indicators */}
                  <div className="space-y-2">
                    {indicators.map(ind => {
                      const isExpanded = expandedIndicators.has(ind.code);
                      return (
                        <div
                          key={ind.code}
                          className={`bg-white rounded-xl border transition-all duration-200 ${
                            isExpanded ? 'border-slate-300 shadow-md' : 'border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300'
                          }`}
                        >
                          <button
                            onClick={() => toggleIndicator(ind.code)}
                            className="w-full p-4 text-left flex items-start gap-4"
                          >
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                              <Icon className="h-4.5 w-4.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-slate-800">{ind.humanName}</span>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{ind.code}</span>
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {ind.sourceType}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed">{ind.description}</p>
                              {!isExpanded && (
                                <p className="text-[11px] text-[#1B4D3E] mt-1.5 font-medium truncate">
                                  <Scale className="h-3 w-3 inline mr-1" />
                                  {ind.wettelijkeGrondslag}
                                </p>
                              )}
                            </div>
                            <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-5 pt-0 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                              {/* Wettelijke grondslag */}
                              <div className="bg-gradient-to-r from-[#1B4D3E]/5 to-[#2d7a63]/5 rounded-xl p-4 border border-[#1B4D3E]/10">
                                <div className="flex items-center gap-2 mb-2">
                                  <Scale className="h-4 w-4 text-[#1B4D3E]" />
                                  <span className="text-xs font-bold text-[#1B4D3E] uppercase tracking-wider">Wettelijke Grondslag</span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed font-medium">{ind.wettelijkeGrondslag}</p>
                              </div>

                              {/* Relevantie uitleg */}
                              <div className="bg-blue-50/80 rounded-xl p-4 border border-blue-200/40">
                                <div className="flex items-center gap-2 mb-2">
                                  <Info className="h-4 w-4 text-blue-600" />
                                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Relevantie & Uitleg</span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">{ind.relevantieUitleg}</p>
                              </div>

                              {/* Actie */}
                              <div className="bg-amber-50/80 rounded-xl p-4 border border-amber-200/40">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Vereiste Actie</span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">{ind.actie}</p>
                              </div>

                              {/* Technical details */}
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/40">
                                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Brontype</div>
                                  <div className="text-sm font-bold text-slate-700">{ind.sourceType}</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/40">
                                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Methode</div>
                                  <div className="text-sm font-bold text-slate-700">{ind.computeMethod}</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/40">
                                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Buffer</div>
                                  <div className="text-sm font-bold text-slate-700">{ind.bufferM > 0 ? `${ind.bufferM}m` : 'Geen'}</div>
                                </div>
                              </div>

                              {/* Bronnen */}
                              <div className="bg-white rounded-xl p-4 border border-slate-200/40">
                                <div className="flex items-center gap-2 mb-2">
                                  <Database className="h-4 w-4 text-slate-500" />
                                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Databronnen</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {ind.bronnen.map((bron, i) => (
                                    <span key={i} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200/60 font-medium">
                                      {bron}
                                    </span>
                                  ))}
                                </div>
                                {ind.sourceUrl && (
                                  <a
                                    href={ind.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline mt-2 inline-flex items-center gap-1 font-medium"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {ind.sourceUrl}
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredIndicators.length === 0 && (
              <div className="text-center py-20">
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-600">Geen indicatoren gevonden</h3>
                <p className="text-sm text-slate-400 mt-1">Probeer een andere zoekterm of selecteer een ander thema</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
