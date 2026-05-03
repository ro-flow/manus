/**
 * Omgevingsscan PDF Generator
 * 
 * Genereert professionele PDF-rapporten van omgevingsscan resultaten.
 * Bevat wettelijke grondslag, consequenties, suggesties en kaartfragmenten.
 * Gebruikt WeasyPrint voor HTML-naar-PDF conversie.
 */

interface IndicatorResult {
  code: string;
  theme: string;
  humanName: string;
  status: 'relevant' | 'niet_relevant' | 'aandachtspunt' | 'onbekend' | 'error';
  waarde: string;
  toelichting: string;
  bronnen: string[];
  afstandM?: number;
  wettelijkeGrondslag?: string;
  consequenties?: string;
  suggesties?: string[];
  relevantieToelichting?: string;
  rawData?: any;
}

interface ThemaOverzicht {
  theme: string;
  label: string;
  color: string;
  indicatoren: IndicatorResult[];
  heeftAandachtspunten: boolean;
}

interface ScanResultaat {
  locatie: { adres: string; lat: number; lng: number; gemeente?: string; postcode?: string };
  timestamp: string;
  duurMs: number;
  indicatoren: IndicatorResult[];
  samenvatting: {
    totaal: number;
    relevant: number;
    aandachtspunten: number;
    nietRelevant: number;
    onbekend: number;
    errors: number;
  };
  themaOverzicht: ThemaOverzicht[];
  aiNarratief?: string;
  dsoData?: {
    activiteiten: any[];
    regels: any[];
  };
}

const statusLabels: Record<string, string> = {
  aandachtspunt: '⚠️ Aandachtspunt',
  relevant: '✅ Relevant',
  niet_relevant: '— Niet relevant',
  onbekend: '❓ Onbekend',
  error: '❌ Fout',
};

const statusColors: Record<string, string> = {
  aandachtspunt: '#f59e0b',
  relevant: '#22c55e',
  niet_relevant: '#94a3b8',
  onbekend: '#60a5fa',
  error: '#ef4444',
};

const statusBgColors: Record<string, string> = {
  aandachtspunt: '#fffbeb',
  relevant: '#f0fdf4',
  niet_relevant: '#f8fafc',
  onbekend: '#eff6ff',
  error: '#fef2f2',
};

const themeEmoji: Record<string, string> = {
  basis: '📍',
  plan: '📐',
  dso: '🌐',
  natuur: '🌿',
  water: '💧',
  geluid_milieu: '🔊',
  milieu: '🏭',
  veiligheid: '🛡️',
  erfgoed: '🏛️',
  agrarisch: '🌾',
  landbouw: '🌾',
  infra: '🛣️',
  landschap: '🏞️',
  gezondheid: '🏥',
  bodem: '🪨',
  planologie: '📐',
  mobiliteit: '🚗',
  overig: '📋',
};

const themeColors: Record<string, string> = {
  basis: '#1e40af',
  plan: '#7c3aed',
  dso: '#0891b2',
  natuur: '#16a34a',
  landschap: '#65a30d',
  water: '#2563eb',
  bodem: '#92400e',
  milieu: '#dc2626',
  veiligheid: '#ea580c',
  erfgoed: '#a16207',
  agrarisch: '#4d7c0f',
  infra: '#6b7280',
  mobiliteit: '#475569',
  overig: '#78716c',
};

/**
 * Generate SVG donut chart for the summary
 */
function generateDonutSVG(sam: ScanResultaat['samenvatting']): string {
  const data = [
    { value: sam.aandachtspunten, color: '#f59e0b', label: 'Aandachtspunten' },
    { value: sam.relevant, color: '#22c55e', label: 'Relevant' },
    { value: sam.nietRelevant, color: '#94a3b8', label: 'Niet relevant' },
    { value: sam.onbekend + sam.errors, color: '#60a5fa', label: 'Onbekend' },
  ].filter(d => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return '';

  const cx = 90, cy = 90, r = 70, strokeWidth = 24;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const arcs = data.map(d => {
    const pct = d.value / total;
    const dashLen = pct * circumference;
    const dashOffset = -offset * circumference;
    offset += pct;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${strokeWidth}" stroke-dasharray="${dashLen} ${circumference - dashLen}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 ${cx} ${cy})" />`;
  }).join('');

  const legend = data.map((d, i) =>
    `<g transform="translate(200, ${30 + i * 32})">
      <rect width="16" height="16" rx="4" fill="${d.color}" />
      <text x="24" y="13" font-size="11" fill="#334155" font-family="Segoe UI, sans-serif" font-weight="600">${d.label}</text>
      <text x="24" y="28" font-size="10" fill="#64748b" font-family="Segoe UI, sans-serif">${d.value} indicatoren (${Math.round(d.value / total * 100)}%)</text>
    </g>`
  ).join('');

  return `<svg width="460" height="${Math.max(180, 30 + data.length * 32)}" xmlns="http://www.w3.org/2000/svg">
    ${arcs}
    <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="28" font-weight="800" fill="#1e293b" font-family="Segoe UI, sans-serif">${total}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#64748b" font-family="Segoe UI, sans-serif">indicatoren</text>
    ${legend}
  </svg>`;
}

/**
 * Generate a static map image using OpenStreetMap tiles.
 * Uses a real tile-based static map image URL.
 */
function generateMapImageTag(lat: number, lng: number): string {
  // Use a tile-based static map approach with multiple OSM tiles composed via CSS
  // For WeasyPrint, we use individual tile images positioned in a grid
  const zoom = 16;
  const n = Math.pow(2, zoom);
  const xtile = Math.floor((lng + 180) / 360 * n);
  const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  
  // Generate a 3x3 tile grid for context
  const tiles: string[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = xtile + dx;
      const ty = ytile + dy;
      const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
      tiles.push(`<img src="${tileUrl}" style="width:256px;height:256px;display:block;" alt="" />`);
    }
  }

  return `
    <div class="map-container">
      <div class="map-header">
        <span class="map-icon">🗺️</span>
        <span class="map-title">Locatie op kaart</span>
      </div>
      <div style="position:relative;width:100%;max-width:600px;margin:0 auto;overflow:hidden;border-radius:8px;border:1px solid #e2e8f0;">
        <div style="display:grid;grid-template-columns:repeat(3,256px);width:768px;margin-left:calc((100% - 768px)/2);">
          ${tiles.join('\n          ')}
        </div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-100%);font-size:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));z-index:10;">📍</div>
      </div>
      <div class="map-coords">
        <div class="coord-row">
          <span class="coord-label">Breedtegraad:</span>
          <span class="coord-value">${lat.toFixed(6)}° N</span>
        </div>
        <div class="coord-row">
          <span class="coord-label">Lengtegraad:</span>
          <span class="coord-value">${lng.toFixed(6)}° E</span>
        </div>
      </div>
      <div class="map-link">
        Bekijk op: openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}
      </div>
    </div>
  `;
}

/**
 * Render a single indicator with all enrichment fields
 */
function renderIndicatorFull(ind: IndicatorResult): string {
  const bgColor = statusBgColors[ind.status] || '#f8fafc';
  const borderColor = statusColors[ind.status] || '#94a3b8';
  
  let html = `
    <div class="indicator-card" style="border-left: 4px solid ${borderColor}; background: ${bgColor};">
      <div class="ind-header">
        <span class="status-dot" style="background: ${borderColor};"></span>
        <span class="ind-name">${ind.humanName}</span>
        <span class="ind-status-badge" style="background: ${borderColor}; color: white;">${ind.status === 'aandachtspunt' ? 'Aandachtspunt' : ind.status === 'relevant' ? 'Relevant' : ind.status === 'niet_relevant' ? 'N.v.t.' : 'Onbekend'}</span>
      </div>
      <div class="ind-waarde">${ind.waarde}</div>
  `;

  // Afstand
  if (ind.afstandM !== undefined && ind.afstandM > 0) {
    html += `<div class="ind-afstand">📏 Afstand: <strong>${ind.afstandM < 1000 ? ind.afstandM + ' meter' : (ind.afstandM / 1000).toFixed(1) + ' km'}</strong></div>`;
  }

  // Wettelijke grondslag
  if (ind.wettelijkeGrondslag) {
    html += `
      <div class="ind-section grondslag">
        <div class="ind-section-header">⚖️ Wettelijke grondslag</div>
        <div class="ind-section-body">${ind.wettelijkeGrondslag}</div>
      </div>
    `;
  }

  // Consequenties
  if (ind.consequenties) {
    html += `
      <div class="ind-section consequenties">
        <div class="ind-section-header">⚠️ Consequenties voor de aanvrager</div>
        <div class="ind-section-body">${ind.consequenties}</div>
      </div>
    `;
  }

  // Relevantie toelichting
  if (ind.relevantieToelichting) {
    html += `
      <div class="ind-section relevantie">
        <div class="ind-section-header">💡 Waarom is dit relevant?</div>
        <div class="ind-section-body">${ind.relevantieToelichting}</div>
      </div>
    `;
  }

  // Suggesties
  if (ind.suggesties && ind.suggesties.length > 0) {
    html += `
      <div class="ind-section suggesties">
        <div class="ind-section-header">🔍 Aanbevelingen &amp; suggesties</div>
        <ol class="suggesties-list">
          ${ind.suggesties.map(s => `<li>${s}</li>`).join('')}
        </ol>
      </div>
    `;
  }

  // Toelichting (technisch)
  if (ind.toelichting && ind.toelichting !== ind.waarde) {
    html += `
      <div class="ind-section toelichting">
        <div class="ind-section-header">📋 Technische toelichting</div>
        <div class="ind-section-body">${ind.toelichting}</div>
      </div>
    `;
  }

  // Bronnen
  if (ind.bronnen && ind.bronnen.length > 0) {
    html += `
      <div class="ind-bronnen">📊 Bronnen: ${ind.bronnen.join(' · ')}</div>
    `;
  }

  html += `</div>`;
  return html;
}

/**
 * Render a compact indicator row (for combined PDF)
 */
function renderIndicatorCompact(ind: IndicatorResult): string {
  const borderColor = statusColors[ind.status] || '#94a3b8';
  const bgColor = statusBgColors[ind.status] || '#f8fafc';
  
  let html = `
    <div class="indicator-compact" style="border-left: 3px solid ${borderColor}; background: ${bgColor};">
      <div class="ind-header-compact">
        <span class="status-dot-sm" style="background: ${borderColor};"></span>
        <strong>${ind.humanName}</strong>
        <span class="ind-status-sm">${statusLabels[ind.status] || ind.status}</span>
      </div>
      <div class="ind-waarde-compact">${ind.waarde}</div>
  `;

  if (ind.wettelijkeGrondslag) {
    html += `<div class="ind-grondslag-compact">⚖️ ${ind.wettelijkeGrondslag}</div>`;
  }
  if (ind.consequenties) {
    html += `<div class="ind-consequenties-compact">⚠️ ${ind.consequenties}</div>`;
  }
  if (ind.suggesties && ind.suggesties.length > 0) {
    html += `<div class="ind-suggesties-compact">🔍 ${ind.suggesties.join(' | ')}</div>`;
  }

  html += `</div>`;
  return html;
}

/**
 * Generate the full CSS styles for the PDF
 */
function getFullCSS(): string {
  return `
    /* Reset & base */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      font-size: 10pt;
      background: white;
    }

    /* Cover page */
    .cover {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 100vh;
      padding: 4cm 2cm;
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #eff6ff 100%);
    }
    .cover-badge {
      display: inline-block;
      background: #1B4D3E;
      color: white;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 0.8cm;
    }
    .cover-logo {
      font-size: 32pt;
      font-weight: 800;
      color: #1B4D3E;
      margin-bottom: 0.3cm;
      letter-spacing: -0.5px;
    }
    .cover-logo span { color: #22c55e; }
    .cover-title {
      font-size: 24pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 0.2cm;
    }
    .cover-subtitle {
      font-size: 14pt;
      color: #64748b;
      margin-bottom: 1.5cm;
    }
    .cover-divider {
      width: 60px;
      height: 4px;
      background: linear-gradient(90deg, #1B4D3E, #22c55e);
      border-radius: 2px;
      margin-bottom: 0.8cm;
    }
    .cover-meta {
      border-top: 2px solid #e2e8f0;
      padding-top: 0.5cm;
    }
    .cover-meta-row {
      display: flex;
      margin-bottom: 0.3cm;
      align-items: baseline;
    }
    .cover-meta-label {
      width: 4cm;
      font-weight: 600;
      color: #64748b;
      font-size: 10pt;
    }
    .cover-meta-value {
      color: #1e293b;
      font-size: 10pt;
      font-weight: 500;
    }

    /* Map container */
    .map-container {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      margin: 0.5cm 0;
      background: white;
    }
    .map-header {
      background: #1B4D3E;
      color: white;
      padding: 8px 16px;
      font-size: 10pt;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .map-icon { font-size: 14pt; }
    .map-visual {
      height: 120px;
      background: linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 50%, #f3e5f5 100%);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .map-crosshair { font-size: 24pt; z-index: 2; }
    .map-grid {
      position: absolute;
      inset: 0;
      opacity: 0.15;
    }
    .map-grid-line {
      position: absolute;
      background: #1B4D3E;
    }
    .map-grid-line.horizontal {
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
    }
    .map-grid-line.vertical {
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1px;
    }
    .map-coords {
      padding: 12px 16px;
      background: #f8fafc;
    }
    .coord-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 9pt;
    }
    .coord-label { color: #64748b; font-weight: 500; }
    .coord-value { color: #1e293b; font-weight: 600; font-family: monospace; }
    .map-link {
      padding: 6px 16px;
      font-size: 8pt;
      color: #2563eb;
      background: #eff6ff;
      border-top: 1px solid #e2e8f0;
    }

    /* Summary section */
    .summary-section {
      page-break-after: always;
      padding: 0.5cm 0;
    }
    .summary-grid {
      display: flex;
      gap: 0.4cm;
      margin: 0.5cm 0 0.8cm;
    }
    .summary-card {
      flex: 1;
      text-align: center;
      padding: 0.5cm 0.3cm;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .summary-card .number {
      font-size: 28pt;
      font-weight: 800;
      line-height: 1.2;
    }
    .summary-card .label {
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      margin-top: 2px;
    }
    .summary-card.aandacht { background: #fffbeb; border-color: #fbbf24; }
    .summary-card.aandacht .number { color: #d97706; }
    .summary-card.relevant { background: #f0fdf4; border-color: #86efac; }
    .summary-card.relevant .number { color: #16a34a; }
    .summary-card.nvt { background: #f8fafc; border-color: #e2e8f0; }
    .summary-card.nvt .number { color: #94a3b8; }
    .summary-card.onbekend { background: #eff6ff; border-color: #93c5fd; }
    .summary-card.onbekend .number { color: #3b82f6; }

    /* Aandachtspunten overzicht */
    .aandachtspunten-list { margin: 0.4cm 0; }
    .aandachtspunt-item {
      padding: 0.3cm 0.5cm;
      margin-bottom: 0.2cm;
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 0 8px 8px 0;
    }
    .aandachtspunt-item .name {
      font-weight: 700;
      color: #92400e;
      font-size: 10pt;
    }
    .aandachtspunt-item .desc {
      font-size: 9pt;
      color: #78350f;
      margin-top: 2px;
    }
    .aandachtspunt-item .grondslag {
      font-size: 8pt;
      color: #1B4D3E;
      margin-top: 4px;
      padding: 4px 8px;
      background: #f0fdf4;
      border-radius: 4px;
      border-left: 2px solid #1B4D3E;
    }

    /* Section headers */
    h2 {
      font-size: 16pt;
      font-weight: 700;
      color: #1B4D3E;
      margin: 0.8cm 0 0.3cm;
      padding-bottom: 0.2cm;
      border-bottom: 3px solid #1B4D3E;
    }
    h3 {
      font-size: 13pt;
      font-weight: 700;
      color: #334155;
      margin: 0.5cm 0 0.2cm;
    }

    /* Thema sections */
    .thema-section {
      margin-bottom: 0.8cm;
      page-break-inside: avoid;
    }
    .thema-header {
      font-size: 13pt;
      font-weight: 700;
      color: #334155;
      padding: 0.3cm 0.4cm;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 0.3cm;
      background: #f8fafc;
      border-radius: 8px 8px 0 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .thema-emoji { font-size: 14pt; }
    .thema-alert { color: #f59e0b; margin-left: auto; }
    .thema-count {
      font-size: 8pt;
      font-weight: 400;
      color: #94a3b8;
      margin-left: auto;
    }

    /* Indicator cards */
    .indicator-card {
      padding: 0.4cm 0.5cm;
      margin-bottom: 0.3cm;
      border-radius: 0 8px 8px 0;
      page-break-inside: avoid;
    }
    .ind-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .status-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .ind-name {
      font-weight: 700;
      color: #1e293b;
      font-size: 11pt;
      flex: 1;
    }
    .ind-status-badge {
      font-size: 7pt;
      padding: 2px 10px;
      border-radius: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ind-waarde {
      font-size: 10pt;
      color: #475569;
      margin-bottom: 6px;
      font-weight: 500;
    }
    .ind-afstand {
      font-size: 9pt;
      color: #6366f1;
      margin-bottom: 6px;
      padding: 3px 8px;
      background: rgba(99, 102, 241, 0.08);
      border-radius: 4px;
      display: inline-block;
    }

    /* Indicator sections */
    .ind-section {
      margin-top: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 9pt;
      line-height: 1.5;
    }
    .ind-section-header {
      font-weight: 700;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .ind-section-body {
      color: #334155;
    }
    .ind-section.grondslag {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
    }
    .ind-section.grondslag .ind-section-header { color: #4338ca; }
    .ind-section.consequenties {
      background: #fef3c7;
      border: 1px solid #fde68a;
    }
    .ind-section.consequenties .ind-section-header { color: #92400e; }
    .ind-section.relevantie {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
    }
    .ind-section.relevantie .ind-section-header { color: #7c3aed; }
    .ind-section.relevantie .ind-section-body { font-style: italic; }
    .ind-section.suggesties {
      background: #f0fdfa;
      border: 1px solid #99f6e4;
    }
    .ind-section.suggesties .ind-section-header { color: #0f766e; }
    .suggesties-list {
      padding-left: 20px;
      margin: 4px 0 0;
    }
    .suggesties-list li {
      margin-bottom: 3px;
      color: #334155;
    }
    .ind-section.toelichting {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .ind-section.toelichting .ind-section-header { color: #475569; }
    .ind-bronnen {
      font-size: 8pt;
      color: #94a3b8;
      margin-top: 6px;
      font-style: italic;
    }

    /* Compact indicator (for combined PDF) */
    .indicator-compact {
      padding: 6px 10px;
      margin-bottom: 4px;
      border-radius: 0 6px 6px 0;
      font-size: 9pt;
    }
    .ind-header-compact {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot-sm {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .ind-status-sm {
      font-size: 7pt;
      color: #64748b;
      margin-left: auto;
    }
    .ind-waarde-compact {
      font-size: 8pt;
      color: #475569;
      margin: 2px 0;
    }
    .ind-grondslag-compact {
      font-size: 7pt;
      color: #4338ca;
      background: #eef2ff;
      padding: 2px 6px;
      border-radius: 3px;
      margin-top: 3px;
    }
    .ind-consequenties-compact {
      font-size: 7pt;
      color: #92400e;
      background: #fef3c7;
      padding: 2px 6px;
      border-radius: 3px;
      margin-top: 2px;
    }
    .ind-suggesties-compact {
      font-size: 7pt;
      color: #0f766e;
      background: #f0fdfa;
      padding: 2px 6px;
      border-radius: 3px;
      margin-top: 2px;
    }

    /* Donut section */
    .donut-section { text-align: center; margin: 0.5cm 0; }

    /* Thema overview table */
    .thema-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-top: 0.3cm;
    }
    .thema-table th {
      text-align: left;
      padding: 8px 10px;
      color: #64748b;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
      background: #f8fafc;
    }
    .thema-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .thema-table tr:hover td { background: #f8fafc; }

    /* AI Samenvatting */
    .ai-samenvatting {
      margin-top: 0.5cm;
      padding: 0.5cm;
      background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
      border: 1px solid #86efac;
      border-radius: 10px;
      page-break-before: always;
    }
    .ai-content {
      font-size: 10pt;
      line-height: 1.7;
      color: #1e293b;
    }
    .ai-content h3 { font-size: 12pt; }
    .ai-content h4 { font-size: 11pt; }
    .ai-content p { text-align: justify; }
    .ai-content li { font-size: 9.5pt; }

    /* Footer & disclaimer */
    .footer {
      margin-top: 1cm;
      padding-top: 0.3cm;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
    .disclaimer {
      margin-top: 0.8cm;
      padding: 0.4cm 0.5cm;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 8pt;
      color: #64748b;
      line-height: 1.5;
    }
    .disclaimer strong { color: #475569; }

    /* Inhoudsopgave */
    .toc {
      margin: 0.5cm 0;
    }
    .toc-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dotted #e2e8f0;
      font-size: 10pt;
    }
    .toc-item .toc-label { color: #1e293b; font-weight: 500; }
    .toc-item .toc-count { color: #64748b; font-size: 9pt; }
    .toc-item.has-aandacht .toc-label { color: #92400e; font-weight: 700; }

    /* Planologisch kader */
    .planologisch-kader {
      page-break-after: always;
      padding: 0.3cm 0;
    }
    .plan-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.3cm 0;
      font-size: 9pt;
    }
    .plan-table th {
      background: #1B4D3E;
      color: white;
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .plan-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .plan-table tr:nth-child(even) td { background: #f8fafc; }
    .plan-table .status-cell {
      font-weight: 600;
      white-space: nowrap;
    }
    .plan-highlight {
      background: #fffbeb;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 0.3cm 0.4cm;
      margin: 0.3cm 0;
    }
    .plan-highlight .title {
      font-weight: 700;
      color: #92400e;
      font-size: 10pt;
      margin-bottom: 4px;
    }
    .plan-highlight .body {
      font-size: 9pt;
      color: #78350f;
      line-height: 1.5;
    }
    .plan-info-box {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 0.3cm 0.4cm;
      margin: 0.3cm 0;
    }
    .plan-info-box .title {
      font-weight: 700;
      color: #166534;
      font-size: 10pt;
      margin-bottom: 4px;
    }
    .plan-info-box .body {
      font-size: 9pt;
      color: #14532d;
      line-height: 1.5;
    }
    .dso-section {
      page-break-after: always;
      padding: 0.3cm 0;
    }
    .dso-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.3cm 0.4cm;
      margin: 0.2cm 0;
      background: #f8fafc;
    }
    .dso-card .label {
      font-weight: 600;
      color: #0891b2;
      font-size: 9pt;
    }
    .dso-card .value {
      font-size: 9pt;
      color: #1e293b;
      margin-top: 2px;
    }
  `;
}

/**
 * Genereer HTML voor het omgevingsscan rapport
 */
export function generateOmgevingsscanHTML(resultaat: ScanResultaat): string {
  const datum = new Date(resultaat.timestamp).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Extract plan indicators for the planologisch kader section
  const planCodes = ['BESTEMMINGSPLAN', 'BESTEMMING', 'DUBBELBESTEMMING', 'GEBIEDSAANDUIDING', 'BOUWVLAK', 'MAATVOERING', 'FUNCTIEAANDUIDING', 'PARAPLUPLAN', 'VOORBEREIDINGSBESLUIT', 'BEHEERSVERORDENING', 'PLANREGELS', 'ONDERZOEKSVEREISTEN', 'OMGEVINGSPLAN'];
  const dsoCodes = ['DSO_ACTIVITEITEN', 'DSO_CONCLUSIES', 'DSO_MAATREGELEN'];
  const planIndicatoren = resultaat.indicatoren.filter(i => planCodes.includes(i.code));
  const dsoIndicatoren = resultaat.indicatoren.filter(i => dsoCodes.includes(i.code));
  const overigIndicatoren = resultaat.indicatoren.filter(i => !planCodes.includes(i.code) && !dsoCodes.includes(i.code));

  // Groepeer overige indicatoren per thema (excl. planologie en dso)
  const themas = groupByTheme(overigIndicatoren).filter(t => t.indicatoren.length > 0);

  // Generate theme sections with full indicator cards
  const themaHTML = themas.map(thema => {
    const emoji = themeEmoji[thema.theme] || '📋';
    const tColor = themeColors[thema.theme] || '#1B4D3E';
    const aandachtspunten = thema.indicatoren.filter(i => i.status === 'aandachtspunt');
    const relevante = thema.indicatoren.filter(i => i.status === 'relevant');
    const onbekend = thema.indicatoren.filter(i => i.status === 'onbekend' || i.status === 'error');
    const nietRelevant = thema.indicatoren.filter(i => i.status === 'niet_relevant');
    const sorted = [...aandachtspunten, ...relevante, ...onbekend, ...nietRelevant];

    return `
      <div class="thema-section">
        <div class="thema-header" style="border-left: 5px solid ${tColor};">
          <span class="thema-emoji">${emoji}</span>
          <span>${thema.label}</span>
          <span class="thema-count">${thema.indicatoren.length} indicatoren</span>
          ${thema.heeftAandachtspunten ? '<span class="thema-alert">⚠️</span>' : ''}
        </div>
        ${sorted.map(ind => renderIndicatorFull(ind)).join('')}
      </div>
    `;
  }).join('');

  // ---- Build Planologisch Kader section ----
  const bpInd = planIndicatoren.find(i => i.code === 'BESTEMMINGSPLAN');
  const enkelInd = planIndicatoren.find(i => i.code === 'BESTEMMING');
  const dubbelInd = planIndicatoren.find(i => i.code === 'DUBBELBESTEMMING');
  const gaInd = planIndicatoren.find(i => i.code === 'GEBIEDSAANDUIDING');
  const bvInd = planIndicatoren.find(i => i.code === 'BOUWVLAK');
  const mvInd = planIndicatoren.find(i => i.code === 'MAATVOERING');
  const faInd = planIndicatoren.find(i => i.code === 'FUNCTIEAANDUIDING');
  const ppInd = planIndicatoren.find(i => i.code === 'PARAPLUPLAN');
  const vbInd = planIndicatoren.find(i => i.code === 'VOORBEREIDINGSBESLUIT');
  const bhInd = planIndicatoren.find(i => i.code === 'BEHEERSVERORDENING');
  const prInd = planIndicatoren.find(i => i.code === 'PLANREGELS');
  const ozInd = planIndicatoren.find(i => i.code === 'ONDERZOEKSVEREISTEN');

  // Build plannen table rows
  const allePlannen = bpInd?.rawData?.allePlannen || [];
  const plannenTableRows = allePlannen.length > 0 
    ? allePlannen.map((p: any) => `
        <tr>
          <td style="font-weight: 600;">${p.naam || 'Onbekend'}</td>
          <td>${p.type || '-'}</td>
          <td class="status-cell">${p.status || '-'}</td>
          <td>${p.categorie || '-'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" style="color: #94a3b8; font-style: italic;">Geen plannen gevonden</td></tr>';

  // Build dubbelbestemmingen highlight
  const dubbelData = dubbelInd?.rawData?.dubbelbestemmingen || [];
  const dubbelHTML = dubbelData.length > 0 ? `
    <div class="plan-highlight">
      <div class="title">⚠️ Dubbelbestemmingen (${dubbelData.length})</div>
      <div class="body">
        ${dubbelData.map((d: any) => `<strong>${d.naam}</strong>${d.adviesInstantie ? ` — Advies: ${d.adviesInstantie}` : ''}${d.aandachtspunten?.length > 0 ? `<br/>Aandachtspunten: ${d.aandachtspunten.join('; ')}` : ''}`).join('<br/>')}
        <br/><em style="font-size: 8pt; color: #1B4D3E;">⚖️ Grondslag: art. 3.1 Wro / Omgevingswet. Advies van de betreffende instantie is VERPLICHT.</em>
      </div>
    </div>
  ` : '';

  // Build onderzoeksvereisten highlight
  const onderzoeken = ozInd?.rawData?.onderzoeken || [];
  const onderzoekenHTML = onderzoeken.length > 0 ? `
    <div class="plan-highlight">
      <div class="title">📋 Vereiste onderzoeken (${onderzoeken.length})</div>
      <div class="body">
        ${onderzoeken.map((o: any) => `<strong>${o.type}</strong> (${o.verplicht ? '⚠️ verplicht' : 'aanbevolen'}) — ${o.toelichting}`).join('<br/>')}
      </div>
    </div>
  ` : '';

  // Build parapluplannen highlight
  const parapluData = ppInd?.rawData?.parapluplannen || [];
  const parapluHTML = parapluData.length > 0 ? `
    <div class="plan-highlight">
      <div class="title">⚠️ Parapluplannen (${parapluData.length})</div>
      <div class="body">
        ${parapluData.map((p: any) => `<strong>${p.naam}</strong> (${p.type || 'parapluplan'})`).join('<br/>')}
        <br/><em style="font-size: 8pt; color: #1B4D3E;">Parapluplannen bevatten aanvullende regels die het onderliggende bestemmingsplan overstijgen. Deze moeten ALTIJD worden meegenomen.</em>
      </div>
    </div>
  ` : '';

  // Build voorbereidingsbesluit highlight
  const vbHTML = vbInd && vbInd.status === 'aandachtspunt' ? `
    <div class="plan-highlight">
      <div class="title">⚠️ Voorbereidingsbesluit</div>
      <div class="body">${vbInd.waarde}<br/><em style="font-size: 8pt;">Er geldt een aanhoudingsplicht (art. 4.14 Omgevingswet).</em></div>
    </div>
  ` : '';

  // ---- Build DSO section ----
  const dsoHTML = dsoIndicatoren.length > 0 ? `
    <div class="dso-section">
      <h2>🌐 Omgevingsloket / DSO</h2>
      <p style="font-size: 9pt; color: #64748b; margin-bottom: 0.3cm;">Resultaten uit het Digitaal Stelsel Omgevingswet (DSO) — activiteiten, conclusies en maatregelen op basis van de locatie.</p>
      ${dsoIndicatoren.map(ind => renderIndicatorFull(ind)).join('')}
    </div>
  ` : '';

  // Build all themas for TOC (including plan and dso)
  const allThemas = resultaat.themaOverzicht.length > 0
    ? resultaat.themaOverzicht
    : groupByTheme(resultaat.indicatoren);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Omgevingsscan Rapport - ${resultaat.locatie.adres}</title>
  <style>${getFullCSS()}</style>
</head>
<body>
  <!-- Cover page -->
  <div class="cover">
    <div class="cover-badge">Omgevingsscan Rapport</div>
    <div class="cover-logo">RO<span>-flow</span></div>
    <div class="cover-title">${resultaat.locatie.adres}</div>
    <div class="cover-subtitle">Uitgebreide omgevingsanalyse met ${resultaat.samenvatting.totaal} indicatoren</div>
    <div class="cover-divider"></div>
    <div class="cover-meta">
      <div class="cover-meta-row">
        <span class="cover-meta-label">Adres:</span>
        <span class="cover-meta-value">${resultaat.locatie.adres}</span>
      </div>
      ${resultaat.locatie.gemeente ? `
      <div class="cover-meta-row">
        <span class="cover-meta-label">Gemeente:</span>
        <span class="cover-meta-value">${resultaat.locatie.gemeente}</span>
      </div>` : ''}
      ${resultaat.locatie.postcode ? `
      <div class="cover-meta-row">
        <span class="cover-meta-label">Postcode:</span>
        <span class="cover-meta-value">${resultaat.locatie.postcode}</span>
      </div>` : ''}
      <div class="cover-meta-row">
        <span class="cover-meta-label">Coordinaten:</span>
        <span class="cover-meta-value">${resultaat.locatie.lat.toFixed(6)}, ${resultaat.locatie.lng.toFixed(6)}</span>
      </div>
      <div class="cover-meta-row">
        <span class="cover-meta-label">Datum scan:</span>
        <span class="cover-meta-value">${datum}</span>
      </div>
      <div class="cover-meta-row">
        <span class="cover-meta-label">Indicatoren:</span>
        <span class="cover-meta-value">${resultaat.samenvatting.totaal} gecontroleerd</span>
      </div>
      <div class="cover-meta-row">
        <span class="cover-meta-label">Scanduur:</span>
        <span class="cover-meta-value">${(resultaat.duurMs / 1000).toFixed(1)} seconden</span>
      </div>
    </div>
  </div>

  <!-- 1. PLANOLOGISCH KADER (startpunt) -->
  <div class="planologisch-kader">
    <h2>📐 Planologisch kader</h2>
    <p style="font-size: 10pt; color: #64748b; margin-bottom: 0.4cm;">Het planologisch kader vormt het startpunt van de omgevingsanalyse. Hieronder vindt u de vigerende bestemmingsplannen, bestemmingen, dubbelbestemmingen en overige planologische aanduidingen op de locatie.</p>

    <!-- Vigerende plannen tabel -->
    <h3 style="color: #1B4D3E;">Vigerende plannen op de locatie</h3>
    <table class="plan-table">
      <thead>
        <tr>
          <th>Plannaam</th>
          <th>Type</th>
          <th>Status</th>
          <th>Categorie</th>
        </tr>
      </thead>
      <tbody>
        ${plannenTableRows}
      </tbody>
    </table>

    <!-- Enkelbestemming -->
    ${enkelInd ? `
    <div class="plan-info-box">
      <div class="title">Enkelbestemming</div>
      <div class="body">${enkelInd.waarde}${enkelInd.toelichting && enkelInd.toelichting !== enkelInd.waarde ? `<br/><span style="font-size: 8pt; color: #475569;">${enkelInd.toelichting}</span>` : ''}</div>
    </div>
    ` : ''}

    <!-- Dubbelbestemmingen -->
    ${dubbelHTML}

    <!-- Gebiedsaanduidingen -->
    ${gaInd && gaInd.status !== 'niet_relevant' ? `
    <div class="${gaInd.status === 'aandachtspunt' ? 'plan-highlight' : 'plan-info-box'}">
      <div class="title">Gebiedsaanduidingen</div>
      <div class="body">${gaInd.waarde}${gaInd.toelichting && gaInd.toelichting !== gaInd.waarde ? `<br/><span style="font-size: 8pt; color: #475569;">${gaInd.toelichting}</span>` : ''}</div>
    </div>
    ` : ''}

    <!-- Bouwvlak & Maatvoering -->
    ${bvInd || mvInd ? `
    <h3 style="color: #1B4D3E; margin-top: 0.4cm;">Bouwvlak &amp; maatvoering</h3>
    ${bvInd ? `<div class="plan-info-box"><div class="title">Bouwvlak</div><div class="body">${bvInd.waarde}</div></div>` : ''}
    ${mvInd && mvInd.waarde !== 'Geen maatvoering gevonden' ? `<div class="plan-info-box"><div class="title">Maatvoering</div><div class="body">${mvInd.waarde}</div></div>` : ''}
    ` : ''}

    <!-- Functieaanduidingen -->
    ${faInd ? `
    <div class="plan-info-box">
      <div class="title">Functieaanduidingen</div>
      <div class="body">${faInd.waarde}</div>
    </div>
    ` : ''}

    <!-- Parapluplannen -->
    ${parapluHTML}

    <!-- Voorbereidingsbesluit -->
    ${vbHTML}

    <!-- Beheersverordening -->
    ${bhInd ? `
    <div class="plan-info-box">
      <div class="title">Beheersverordening</div>
      <div class="body">${bhInd.waarde}</div>
    </div>
    ` : ''}

    <!-- Onderzoeksvereisten -->
    ${onderzoekenHTML}

    <!-- Planregels referentie -->
    ${prInd ? `
    <div style="margin-top: 0.3cm; padding: 0.2cm 0.4cm; background: #f1f5f9; border-radius: 6px; font-size: 9pt; color: #475569;">
      📋 <strong>Planregels:</strong> ${prInd.waarde}. Raadpleeg de volledige planregels op <a href="https://www.ruimtelijkeplannen.nl" style="color: #2563eb;">ruimtelijkeplannen.nl</a>.
    </div>
    ` : ''}
  </div>

  <!-- 2. DSO / OMGEVINGSLOKET -->
  ${dsoHTML}

  <!-- 3. SAMENVATTING -->
  <div class="summary-section">
    <h2>Samenvatting omgevingsanalyse</h2>
    
    ${generateMapImageTag(resultaat.locatie.lat, resultaat.locatie.lng)}
    
    <div class="donut-section">
      ${generateDonutSVG(resultaat.samenvatting)}
    </div>
    
    <div class="summary-grid">
      <div class="summary-card aandacht">
        <div class="number">${resultaat.samenvatting.aandachtspunten}</div>
        <div class="label">Aandachtspunten</div>
      </div>
      <div class="summary-card relevant">
        <div class="number">${resultaat.samenvatting.relevant}</div>
        <div class="label">Relevant</div>
      </div>
      <div class="summary-card nvt">
        <div class="number">${resultaat.samenvatting.nietRelevant}</div>
        <div class="label">Niet relevant</div>
      </div>
      <div class="summary-card onbekend">
        <div class="number">${resultaat.samenvatting.onbekend}</div>
        <div class="label">Onbekend</div>
      </div>
    </div>

    <!-- Inhoudsopgave per thema -->
    <h3 style="color: #1B4D3E; margin-top: 0.6cm;">Inhoudsopgave</h3>
    <div class="toc">
      <div class="toc-item has-aandacht">
        <span class="toc-label">📐 Planologisch kader</span>
        <span class="toc-count">${planIndicatoren.length} indicatoren${planIndicatoren.filter(i => i.status === 'aandachtspunt').length > 0 ? ` (${planIndicatoren.filter(i => i.status === 'aandachtspunt').length} ⚠️)` : ''}</span>
      </div>
      ${dsoIndicatoren.length > 0 ? `
      <div class="toc-item">
        <span class="toc-label">🌐 Omgevingsloket / DSO</span>
        <span class="toc-count">${dsoIndicatoren.length} indicatoren</span>
      </div>
      ` : ''}
      ${themas.map(t => {
        const em = themeEmoji[t.theme] || '📋';
        const aa = t.indicatoren.filter(i => i.status === 'aandachtspunt').length;
        return `<div class="toc-item ${aa > 0 ? 'has-aandacht' : ''}">
          <span class="toc-label">${em} ${t.label}</span>
          <span class="toc-count">${t.indicatoren.length} indicatoren${aa > 0 ? ` (${aa} ⚠️)` : ''}</span>
        </div>`;
      }).join('')}
    </div>

    ${resultaat.samenvatting.aandachtspunten > 0 ? `
    <h3 style="margin-top: 0.6cm; color: #92400e;">Aandachtspunten overzicht</h3>
    <div class="aandachtspunten-list">
      ${resultaat.indicatoren
        .filter(i => i.status === 'aandachtspunt')
        .map(i => `
          <div class="aandachtspunt-item">
            <div class="name">${i.humanName}</div>
            <div class="desc">${i.waarde}</div>
            ${(i as IndicatorResult).wettelijkeGrondslag ? `<div class="grondslag">⚖️ ${(i as IndicatorResult).wettelijkeGrondslag}</div>` : ''}
          </div>
        `).join('')}
    </div>
    ` : '<p style="color: #16a34a; margin-top: 0.5cm; font-size: 11pt; font-weight: 600;">✅ Geen aandachtspunten gevonden. Alle indicatoren zijn niet-relevant of onbekend.</p>'}

    <!-- Relevantie-prioritering: wat is direct van belang voor deze locatie -->
    <h3 style="margin-top: 0.6cm; color: #1B4D3E;">Relevantie-prioritering voor deze locatie</h3>
    <p style="font-size: 9pt; color: #64748b; margin-bottom: 0.3cm;">Onderstaand overzicht toont welke omgevingsaspecten direct van belang zijn voor deze specifieke locatie, gebaseerd op afstand en wettelijke invloedsgebieden.</p>
    ${(() => {
      const directRelevant = resultaat.indicatoren.filter(i => (i.status === 'aandachtspunt' || i.status === 'relevant') && i.afstandM !== undefined && i.afstandM <= 500);
      const externeWerking = resultaat.indicatoren.filter(i => (i.status === 'aandachtspunt' || i.status === 'relevant') && i.afstandM !== undefined && i.afstandM > 500 && i.afstandM <= 3000);
      const opAfstand = resultaat.indicatoren.filter(i => (i.status === 'aandachtspunt' || i.status === 'relevant') && i.afstandM !== undefined && i.afstandM > 3000);
      const zonderAfstand = resultaat.indicatoren.filter(i => (i.status === 'aandachtspunt' || i.status === 'relevant') && i.afstandM === undefined);

      let html = '';
      if (directRelevant.length > 0) {
        html += `<div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 0.3cm 0.4cm; margin: 0.2cm 0;">
          <div style="font-weight: 700; color: #dc2626; font-size: 10pt; margin-bottom: 4px;">🔴 Direct van toepassing (< 500m)</div>
          <div style="font-size: 9pt; color: #7f1d1d; line-height: 1.5;">${directRelevant.map(i => `<strong>${i.humanName}</strong>${i.afstandM ? ` (${i.afstandM < 1000 ? i.afstandM + 'm' : (i.afstandM / 1000).toFixed(1) + 'km'})` : ''}${i.relevantieToelichting ? ` — ${i.relevantieToelichting}` : ''}`).join('<br/>')}</div>
        </div>`;
      }
      if (externeWerking.length > 0) {
        html += `<div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 0.3cm 0.4cm; margin: 0.2cm 0;">
          <div style="font-weight: 700; color: #d97706; font-size: 10pt; margin-bottom: 4px;">🟠 Externe werking (500m — 3km)</div>
          <div style="font-size: 9pt; color: #78350f; line-height: 1.5;">${externeWerking.map(i => `<strong>${i.humanName}</strong>${i.afstandM ? ` (${i.afstandM < 1000 ? i.afstandM + 'm' : (i.afstandM / 1000).toFixed(1) + 'km'})` : ''}${i.relevantieToelichting ? ` — ${i.relevantieToelichting}` : ''}`).join('<br/>')}</div>
        </div>`;
      }
      if (opAfstand.length > 0) {
        html += `<div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 0.3cm 0.4cm; margin: 0.2cm 0;">
          <div style="font-weight: 700; color: #16a34a; font-size: 10pt; margin-bottom: 4px;">🟢 Op afstand (> 3km)</div>
          <div style="font-size: 9pt; color: #14532d; line-height: 1.5;">${opAfstand.map(i => `<strong>${i.humanName}</strong>${i.afstandM ? ` (${(i.afstandM / 1000).toFixed(1)}km)` : ''}`).join(', ')}</div>
        </div>`;
      }
      if (zonderAfstand.length > 0) {
        html += `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.3cm 0.4cm; margin: 0.2cm 0;">
          <div style="font-weight: 700; color: #475569; font-size: 10pt; margin-bottom: 4px;">📋 Overige relevante indicatoren</div>
          <div style="font-size: 9pt; color: #334155; line-height: 1.5;">${zonderAfstand.map(i => `<strong>${i.humanName}</strong>${i.relevantieToelichting ? ` — ${i.relevantieToelichting}` : ''}`).join('<br/>')}</div>
        </div>`;
      }
      if (directRelevant.length === 0 && externeWerking.length === 0 && opAfstand.length === 0 && zonderAfstand.length === 0) {
        html += '<p style="color: #16a34a; font-size: 10pt;">✅ Geen relevante omgevingsaspecten gedetecteerd voor deze locatie.</p>';
      }
      return html;
    })()}
  </div>

  <!-- 4. AI SAMENVATTING -->
  ${resultaat.aiNarratief ? `
  <div class="ai-samenvatting">
    <h2 style="color: #1B4D3E;">Professionele analyse &amp; aanbevelingen</h2>
    <div class="ai-content">
      ${resultaat.aiNarratief.split('\n').map(line => {
        if (line.startsWith('## ')) return `<h3 style="color: #1B4D3E; margin-top: 0.4cm;">${line.replace('## ', '')}</h3>`;
        if (line.startsWith('### ')) return `<h4 style="color: #334155; margin-top: 0.3cm;">${line.replace('### ', '')}</h4>`;
        if (line.startsWith('**') && line.endsWith('**')) return `<p style="font-weight: 700; margin-top: 0.2cm;">${line.replace(/\*\*/g, '')}</p>`;
        if (line.startsWith('- ')) return `<li style="margin-left: 1.5em; margin-bottom: 3px;">${line.replace('- ', '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</li>`;
        if (line.trim() === '') return '';
        return `<p style="margin-bottom: 0.15cm;">${line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`;
      }).join('')}
    </div>
  </div>
  ` : ''}

  <!-- 5. GEDETAILLEERDE RESULTATEN per thema (overige thema's) -->
  <h2>Gedetailleerde resultaten per thema</h2>
  ${themaHTML}

  <!-- Disclaimer -->
  <div class="disclaimer">
    <strong>Disclaimer:</strong> Dit rapport is automatisch gegenereerd door RO-flow op basis van openbare databronnen 
    (PDOK, BAG, Kadaster, Ruimtelijkeplannen.nl, RIVM, RCE, DSO, AERIUS, etc.). 
    De resultaten zijn indicatief en vervangen geen formeel onderzoek of juridisch advies. 
    Alle suggesties en aanbevelingen in dit rapport zijn informatief van aard en dienen als startpunt voor verdere analyse.
    Raadpleeg altijd de gemeente, het bevoegd gezag en relevante adviseurs voor definitieve beoordelingen. 
    RO-flow is niet aansprakelijk voor beslissingen genomen op basis van dit rapport.
  </div>

  <div class="footer">
    Gegenereerd door RO-flow Omgevingsscan &bull; ${datum} &bull; ${resultaat.samenvatting.totaal} indicatoren geanalyseerd
  </div>
</body>
</html>`;
}

/**
 * Groepeer indicatoren per thema als themaOverzicht niet beschikbaar is
 */
function groupByTheme(indicatoren: IndicatorResult[]): ThemaOverzicht[] {
  const themaMap = new Map<string, IndicatorResult[]>();
  for (const ind of indicatoren) {
    const existing = themaMap.get(ind.theme) || [];
    existing.push(ind);
    themaMap.set(ind.theme, existing);
  }

  const themeLabels: Record<string, string> = {
    basis: 'Basis & Locatie',
    planologie: 'Planologie',
    plan: 'Planologie',
    dso: 'DSO & Omgevingsloket',
    natuur: 'Natuur & Ecologie',
    water: 'Water',
    geluid_milieu: 'Geluid & Milieu',
    milieu: 'Milieu',
    veiligheid: 'Externe Veiligheid',
    erfgoed: 'Erfgoed & Archeologie',
    agrarisch: 'Agrarisch',
    landbouw: 'Landbouw',
    infra: 'Infrastructuur',
    landschap: 'Landschap',
    gezondheid: 'Gezondheid',
    bodem: 'Bodem',
    mobiliteit: 'Mobiliteit',
    overig: 'Overig',
  };

  return Array.from(themaMap.entries()).map(([theme, inds]) => ({
    theme,
    label: themeLabels[theme] || theme,
    color: themeColors[theme] || '#1B4D3E',
    indicatoren: inds,
    heeftAandachtspunten: inds.some(i => i.status === 'aandachtspunt'),
  }));
}

/**
 * Genereer PDF buffer van het omgevingsscan rapport
 */
export async function generateOmgevingsscanPDF(resultaat: ScanResultaat): Promise<Buffer> {
  const baseHtml = generateOmgevingsscanHTML(resultaat);

  const printCSS = `
    <style>
      @page {
        size: A4;
        margin: 2cm 1.5cm;
        @top-left {
          content: "Omgevingsscan - ${resultaat.locatie.adres.substring(0, 40)}";
          font-size: 8pt;
          color: #94a3b8;
        }
        @top-right {
          content: "Pagina " counter(page) " van " counter(pages);
          font-size: 8pt;
          color: #94a3b8;
        }
        @bottom-center {
          content: "RO-flow Omgevingsscan Rapport";
          font-size: 7pt;
          color: #cbd5e1;
        }
      }
      @page :first {
        @top-left { content: none; }
        @top-right { content: none; }
        @bottom-center { content: none; }
      }
      .thema-section { page-break-inside: avoid; }
      .indicator-card { page-break-inside: avoid; }
      h2 { page-break-after: avoid; }
    </style>
  `;

  const html = baseHtml.replace('</head>', `${printCSS}</head>`);

  const { execSync } = await import('child_process');
  const { writeFileSync, readFileSync, unlinkSync } = await import('fs');
  const { tmpdir } = await import('os');
  const { join } = await import('path');

  const timestamp = Date.now();
  const tempHtml = join(tmpdir(), `omgscan_${timestamp}.html`);
  const tempPdf = join(tmpdir(), `omgscan_${timestamp}.pdf`);

  try {
    writeFileSync(tempHtml, html, 'utf-8');

    try {
      execSync(`weasyprint --presentational-hints "${tempHtml}" "${tempPdf}"`, {
        stdio: 'pipe',
        timeout: 90000,
      });
      const pdfBuffer = readFileSync(tempPdf);
      console.log(`[OmgevingsscanPDF] PDF gegenereerd (${Math.round(pdfBuffer.length / 1024)}KB)`);
      return pdfBuffer;
    } catch (e: any) {
      console.warn('[OmgevingsscanPDF] WeasyPrint fout, HTML fallback:', e.message);
      return Buffer.from(html, 'utf-8');
    }
  } finally {
    try { unlinkSync(tempHtml); } catch {}
    try { unlinkSync(tempPdf); } catch {}
  }
}

/**
 * Genereer bestandsnaam voor het rapport
 */
export function generateOmgevingsscanFilename(adres: string): string {
  const date = new Date().toISOString().split('T')[0];
  const sanitized = adres.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').substring(0, 40);
  return `omgevingsscan_${sanitized}_${date}.pdf`;
}

/**
 * Genereer gecombineerde PDF voor meerdere locaties
 */
export async function generateCombinedOmgevingsscanPDF(
  scanResults: Array<{ locatie: { adres: string; lat: number; lng: number }; result: any }>
): Promise<Buffer> {
  const datum = new Date().toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate combined statistics
  const totalIndicatoren = scanResults.reduce((sum, sr) => sum + (sr.result.samenvatting?.totaal || 0), 0);
  const totalAandacht = scanResults.reduce((sum, sr) => sum + (sr.result.samenvatting?.aandachtspunten || 0), 0);
  const totalRelevant = scanResults.reduce((sum, sr) => sum + (sr.result.samenvatting?.relevant || 0), 0);
  const totalNvt = scanResults.reduce((sum, sr) => sum + (sr.result.samenvatting?.nietRelevant || 0), 0);
  const totalOnbekend = scanResults.reduce((sum, sr) => sum + (sr.result.samenvatting?.onbekend || 0), 0);

  // Collect all unique aandachtspunten
  const aandachtspuntenMap = new Map<string, { indicator: IndicatorResult; locations: string[] }>();
  for (const sr of scanResults) {
    for (const ind of (sr.result.indicatoren || [])) {
      if (ind.status === 'aandachtspunt') {
        const existing = aandachtspuntenMap.get(ind.code);
        if (existing) {
          existing.locations.push(sr.locatie.adres.split(',')[0]);
        } else {
          aandachtspuntenMap.set(ind.code, { indicator: ind, locations: [sr.locatie.adres.split(',')[0]] });
        }
      }
    }
  }

  // Generate per-location HTML sections
  const locationSections = scanResults.map((sr, i) => {
    const locResult = sr.result as ScanResultaat;
    const themas = locResult.themaOverzicht?.length > 0
      ? locResult.themaOverzicht
      : groupByTheme(locResult.indicatoren || []);

    const themaHTML = themas.map(thema => {
      const emoji = themeEmoji[thema.theme] || '📋';
      const tColor = themeColors[thema.theme] || '#1B4D3E';
      const aandachtspunten = thema.indicatoren.filter((i: any) => i.status === 'aandachtspunt');
      const relevante = thema.indicatoren.filter((i: any) => i.status === 'relevant');

      if (aandachtspunten.length === 0 && relevante.length === 0) return '';

      const sorted = [...aandachtspunten, ...relevante];

      return `
        <div class="thema-section">
          <div class="thema-header" style="border-left: 4px solid ${tColor};">
            <span class="thema-emoji">${emoji}</span>
            <span>${thema.label}</span>
            ${thema.heeftAandachtspunten ? '<span class="thema-alert">⚠️</span>' : ''}
          </div>
          ${sorted.map(ind => renderIndicatorCompact(ind)).join('')}
        </div>
      `;
    }).join('');

    const sam = locResult.samenvatting || { totaal: 0, aandachtspunten: 0, relevant: 0, nietRelevant: 0, onbekend: 0 };

    return `
      <div class="location-section" style="page-break-before: always;">
        <h2 style="display:flex;align-items:center;gap:10px;">
          <span class="loc-num">${i + 1}</span>
          ${sr.locatie.adres}
        </h2>
        <p style="color:#64748b;font-size:9pt;margin-bottom:10px;">${sr.locatie.lat.toFixed(6)}, ${sr.locatie.lng.toFixed(6)}</p>
        <div class="summary-grid">
          <div class="summary-card aandacht"><div class="number">${sam.aandachtspunten}</div><div class="label">Aandachtspunten</div></div>
          <div class="summary-card relevant"><div class="number">${sam.relevant}</div><div class="label">Relevant</div></div>
          <div class="summary-card nvt"><div class="number">${sam.nietRelevant}</div><div class="label">N.v.t.</div></div>
          <div class="summary-card onbekend"><div class="number">${sam.onbekend || 0}</div><div class="label">Onbekend</div></div>
        </div>
        ${themaHTML}
      </div>
    `;
  }).join('');

  // Aandachtspunten overview
  const aandachtHTML = totalAandacht > 0 ? `
    <h3 style="margin-top: 0.5cm; color: #92400e;">Gecombineerde aandachtspunten</h3>
    <div class="aandachtspunten-list">
      ${Array.from(aandachtspuntenMap.values()).map(({ indicator, locations }) => `
        <div class="aandachtspunt-item">
          <div class="name">${indicator.humanName}</div>
          <div class="desc">${indicator.waarde}</div>
          ${indicator.wettelijkeGrondslag ? `<div class="grondslag">⚖️ ${indicator.wettelijkeGrondslag}</div>` : ''}
          <div style="font-size:8pt;color:#64748b;margin-top:3px;">📍 ${locations.join(', ')}</div>
        </div>
      `).join('')}
    </div>
  ` : '<p style="color: #16a34a; margin-top: 0.5cm;">✅ Geen aandachtspunten gevonden bij alle locaties.</p>';

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Gecombineerd Omgevingsscan Rapport</title>
  <style>${getFullCSS()}
    .loc-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #1B4D3E;
      color: white;
      font-size: 12pt;
      font-weight: 800;
    }
    .location-section { padding: 0.5cm 0; }
    .location-section h2 { font-size: 14pt; margin-bottom: 0.3cm; }
    @page {
      size: A4;
      margin: 2cm 1.5cm;
      @top-left {
        content: "Gecombineerd Omgevingsscan Rapport";
        font-size: 8pt;
        color: #94a3b8;
      }
      @top-right {
        content: "Pagina " counter(page) " van " counter(pages);
        font-size: 8pt;
        color: #94a3b8;
      }
    }
    @page :first {
      @top-left { content: none; }
      @top-right { content: none; }
    }
  </style>
</head>
<body>
  <!-- Cover page -->
  <div class="cover">
    <div class="cover-badge">Gecombineerd Rapport</div>
    <div class="cover-logo">RO<span>-flow</span></div>
    <div class="cover-title">Gecombineerd Omgevingsscan Rapport</div>
    <div class="cover-subtitle">${scanResults.length} locaties gescand</div>
    <div class="cover-divider"></div>
    <div class="cover-meta">
      ${scanResults.map((sr, i) => `
        <div class="cover-meta-row">
          <span class="cover-meta-label">Locatie ${i + 1}:</span>
          <span class="cover-meta-value">${sr.locatie.adres}</span>
        </div>
      `).join('')}
      <div class="cover-meta-row">
        <span class="cover-meta-label">Datum scan:</span>
        <span class="cover-meta-value">${datum}</span>
      </div>
      <div class="cover-meta-row">
        <span class="cover-meta-label">Totaal indicatoren:</span>
        <span class="cover-meta-value">${totalIndicatoren} gecontroleerd</span>
      </div>
    </div>
  </div>

  <!-- Combined summary page -->
  <div class="summary-section">
    <h2>Gecombineerd overzicht</h2>
    <p style="color:#64748b;margin-bottom:0.5cm;">${scanResults.length} locaties, ${totalIndicatoren} indicatoren totaal</p>
    <div class="summary-grid">
      <div class="summary-card aandacht"><div class="number">${totalAandacht}</div><div class="label">Aandachtspunten</div></div>
      <div class="summary-card relevant"><div class="number">${totalRelevant}</div><div class="label">Relevant</div></div>
      <div class="summary-card nvt"><div class="number">${totalNvt}</div><div class="label">N.v.t.</div></div>
      <div class="summary-card onbekend"><div class="number">${totalOnbekend}</div><div class="label">Onbekend</div></div>
    </div>
    ${aandachtHTML}
  </div>

  <!-- Per-location detailed results -->
  ${locationSections}

  <div class="disclaimer">
    <strong>Disclaimer:</strong> Dit rapport is automatisch gegenereerd door RO-flow op basis van openbare databronnen 
    (PDOK, BAG, Kadaster, Ruimtelijkeplannen.nl, RIVM, RCE, DSO, AERIUS, etc.). 
    De resultaten zijn indicatief en vervangen geen formeel onderzoek of juridisch advies.
    Alle suggesties en aanbevelingen zijn informatief van aard.
    Raadpleeg altijd de gemeente en relevante adviseurs voor definitieve beoordelingen. 
    RO-flow is niet aansprakelijk voor beslissingen genomen op basis van dit rapport.
  </div>

  <div class="footer">
    Gegenereerd door RO-flow Omgevingsscan &bull; ${datum}
  </div>
</body>
</html>`;

  const { execSync } = await import('child_process');
  const { writeFileSync, readFileSync, unlinkSync } = await import('fs');
  const { tmpdir } = await import('os');
  const { join } = await import('path');

  const timestamp = Date.now();
  const tempHtml = join(tmpdir(), `omgscan_combined_${timestamp}.html`);
  const tempPdf = join(tmpdir(), `omgscan_combined_${timestamp}.pdf`);

  try {
    writeFileSync(tempHtml, html, 'utf-8');
    try {
      execSync(`weasyprint --presentational-hints "${tempHtml}" "${tempPdf}"`, {
        stdio: 'pipe',
        timeout: 120000,
      });
      const pdfBuffer = readFileSync(tempPdf);
      console.log(`[OmgevingsscanPDF] Combined PDF gegenereerd (${Math.round(pdfBuffer.length / 1024)}KB) voor ${scanResults.length} locaties`);
      return pdfBuffer;
    } catch (e: any) {
      console.warn('[OmgevingsscanPDF] WeasyPrint fout, HTML fallback:', e.message);
      return Buffer.from(html, 'utf-8');
    }
  } finally {
    try { unlinkSync(tempHtml); } catch {}
    try { unlinkSync(tempPdf); } catch {}
  }
}
