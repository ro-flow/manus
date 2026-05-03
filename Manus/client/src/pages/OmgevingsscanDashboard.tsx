import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, useMap, useMapEvents, GeoJSON, CircleMarker, Circle, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Loader2, Search, MapPin, AlertTriangle, CheckCircle, HelpCircle, XCircle,
  ChevronDown, ChevronRight, Layers, FileText, Zap, ArrowLeft, Download,
  Upload, X, Eye, EyeOff, Info, ExternalLink, Building2, TreePine, Droplets,
  Volume2, Shield, Landmark, Wheat, Route, Mountain, Heart, Sparkles,
  BarChart3, Globe, Clock, Hash, ChevronUp, PanelRightOpen, PanelRightClose
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'wouter';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom pulsing marker icon
const pulsingIcon = L.divIcon({
  className: 'custom-pulsing-marker',
  html: `
    <div style="position:relative;width:28px;height:28px;">
      <div style="position:absolute;inset:-4px;background:rgba(27,77,62,0.15);border-radius:50%;animation:pulse-ring 2s ease-out infinite;"></div>
      <div style="position:absolute;inset:-8px;background:rgba(27,77,62,0.08);border-radius:50%;animation:pulse-ring 2s ease-out infinite 0.5s;"></div>
      <div style="position:absolute;inset:2px;background:linear-gradient(135deg,#1B4D3E,#2d7a63);border:3px solid white;border-radius:50%;box-shadow:0 2px 12px rgba(27,77,62,0.4);"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

// Numbered location marker for multi-scan
function createNumberedIcon(num: number, isActive: boolean) {
  return L.divIcon({
    className: 'numbered-marker',
    html: `
      <div style="position:relative;width:32px;height:32px;">
        <div style="position:absolute;inset:0;background:${isActive ? 'linear-gradient(135deg,#1B4D3E,#2d7a63)' : 'linear-gradient(135deg,#475569,#64748b)'};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,${isActive ? '0.35' : '0.2'});display:flex;align-items:center;justify-content:center;${isActive ? 'transform:scale(1.15);' : ''}">
          <span style="color:white;font-size:13px;font-weight:800;line-height:1;">${num}</span>
        </div>
        ${isActive ? '<div style="position:absolute;inset:-6px;border:2px solid rgba(27,77,62,0.3);border-radius:50%;animation:pulse-ring 2s ease-out infinite;"></div>' : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

// ============ TYPES ============

interface GeoFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
  properties: {
    layer: string;
    name: string;
    color: string;
    fillOpacity?: number;
    strokeWidth?: number;
    indicatorCode?: string;
    relevance?: 'hoog' | 'midden' | 'laag' | 'achtergrond';
    afstandM?: number;
    relevanceToelichting?: string;
  };
}

interface ScanResult {
  locatie: { adres: string; lat: number; lng: number };
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
  geoFeatures?: GeoFeature[];
  procedureBeoordeling?: {
    type: 'regulier' | 'bopa' | 'uitgebreid' | 'onbekend';
    toelichting: string;
    redenen: string[];
    wettelijkeGrondslag: string;
    aanbeveling: string;
  };
}

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
}

interface ThemaOverzicht {
  theme: string;
  label: string;
  color: string;
  indicatoren: IndicatorResult[];
  heeftAandachtspunten: boolean;
}

// ============ PDOK GEOCODER ============

async function pdokGeocode(query: string): Promise<Array<{ display: string; lat: number; lng: number; type: string }>> {
  try {
    const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(query)}&rows=5&fq=type:(adres OR weg OR postcode OR woonplaats)`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.response?.docs?.length) return [];
    const results = await Promise.all(
      data.response.docs.slice(0, 5).map(async (doc: any) => {
        try {
          const lookupUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?id=${encodeURIComponent(doc.id)}`;
          const lookupRes = await fetch(lookupUrl);
          const lookupData = await lookupRes.json();
          const centroide = lookupData.response?.docs?.[0]?.centroide_ll;
          if (!centroide) return null;
          const match = centroide.match(/POINT\(([^ ]+) ([^)]+)\)/);
          if (!match) return null;
          return { display: doc.weergavenaam, lng: parseFloat(match[1]), lat: parseFloat(match[2]), type: doc.type };
        } catch { return null; }
      })
    );
    return results.filter(Boolean) as any[];
  } catch (error) {
    console.error('PDOK geocode failed:', error);
    return [];
  }
}

// ============ PERCEEL FETCHER ============

function wgs84ToRD(lat: number, lng: number): [number, number] {
  const dLat = 0.36 * (lat - 52.15517440);
  const dLng = 0.36 * (lng - 5.38720621);
  const x = 155000 + (190094.945 * dLng) + (-11832.228 * dLat * dLng) + (-114.221 * dLat * dLat * dLng) + (0.3 * dLng * dLng * dLng);
  const y = 463000 + (309056.544 * dLat) + (3638.893 * dLng * dLng) + (73.077 * dLat * dLat) + (-157.984 * dLat * dLng * dLng) + (59.788 * dLat * dLat * dLat);
  return [x, y];
}

async function fetchPerceelGeometry(lat: number, lng: number): Promise<any | null> {
  try {
    const [x, y] = wgs84ToRD(lat, lng);
    const buffer = 50;
    const bbox = `${x - buffer},${y - buffer},${x + buffer},${y + buffer}`;
    const perceelUrl = `https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0?service=WFS&version=2.0.0&request=GetFeature&typeName=kadastralekaartv5:perceel&bbox=${bbox}&outputFormat=application/json&count=5&srsName=EPSG:4326`;
    const res = await fetch(perceelUrl);
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      let closest = data.features[0];
      let minDist = Infinity;
      for (const f of data.features) {
        if (f.geometry?.coordinates?.[0]) {
          const coords = f.geometry.coordinates[0];
          const cx = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
          const cy = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
          const dist = Math.sqrt((cx - lng) ** 2 + (cy - lat) ** 2);
          if (dist < minDist) { minDist = dist; closest = f; }
        }
      }
      return closest;
    }
    return null;
  } catch (err) {
    console.error('Perceel fetch failed:', err);
    return null;
  }
}

async function fetchPandGeometry(lat: number, lng: number): Promise<any[]> {
  try {
    const [x, y] = wgs84ToRD(lat, lng);
    const buffer = 50;
    const bbox = `${x - buffer},${y - buffer},${x + buffer},${y + buffer}`;
    const pandUrl = `https://service.pdok.nl/lv/bag/wfs/v2_0?service=WFS&version=2.0.0&request=GetFeature&typeName=bag:pand&bbox=${bbox}&outputFormat=application/json&count=10&srsName=EPSG:4326`;
    const res = await fetch(pandUrl);
    const data = await res.json();
    return data.features || [];
  } catch (err) {
    console.error('Pand fetch failed:', err);
    return [];
  }
}

// ============ MAP COMPONENTS ============

// Custom component that uses Leaflet's L.geoJSON directly to avoid react-leaflet GeoJSON rendering bugs.
// Uses a custom SVG renderer with very high padding to prevent Leaflet from clipping large polygons
// (like Natura 2000 areas that span 30km+) to empty paths (d="M0 0").
function GeoFeaturesLayer({ features, onThemeSelect }: { features: GeoFeature[]; onThemeSelect: (theme: string) => void }) {
  const map = useMap();
  const layersRef = useRef<L.Layer[]>([]);
  const rendererRef = useRef<L.SVG | null>(null);

  useEffect(() => {
    if (!features || features.length === 0) return;

    // Create a dedicated SVG renderer with very high padding so large polygons
    // that extend far beyond the viewport are still rendered (not clipped to M0 0).
    // Default Leaflet padding is 0.5 (50% of viewport), which clips features > ~2x viewport.
    // padding: 100 means the SVG extends 100x viewport size in each direction.
    if (!rendererRef.current) {
      rendererRef.current = L.svg({ padding: 100 });
    }
    const renderer = rendererRef.current;

    const layerToTheme: Record<string, string> = {
      natura2000: 'natuur', nationaalpark: 'natuur',
      spoorweg: 'mobiliteit', station: 'mobiliteit', rijksweg: 'mobiliteit',
      rijksmonument: 'erfgoed', beschermd_gezicht: 'erfgoed', archeologie: 'erfgoed',
      bevi: 'veiligheid', waterkering: 'water', gewasperceel: 'landbouw',
    };

    // Clean up previous layers
    layersRef.current.forEach((lyr) => {
      try { map.removeLayer(lyr); } catch (_) {}
    });
    layersRef.current = [];

    // Sort features: achtergrond first (bottom), hoog last (top) so important features are on top
    const relevanceOrder: Record<string, number> = { achtergrond: 0, laag: 1, midden: 2, hoog: 3 };
    const sortedFeatures = [...features].sort((a, b) => {
      const aRel = relevanceOrder[a.properties?.relevance || 'midden'] ?? 1;
      const bRel = relevanceOrder[b.properties?.relevance || 'midden'] ?? 1;
      return aRel - bRel;
    });

    // Add each feature individually using L.geoJSON with the custom renderer
    sortedFeatures.forEach((feature) => {
      const props = feature.properties || {};
      const geoType = feature.geometry?.type || '';
      const isPoint = geoType === 'Point';
      const isLine = geoType === 'LineString' || geoType === 'MultiLineString';
      const isPoly = geoType === 'Polygon' || geoType === 'MultiPolygon';
      const themeId = layerToTheme[props.layer] || 'overig';

      // Relevantie-badge voor popup
      const relevance = props.relevance || 'midden';
      const afstandTekst = props.afstandM != null ? (props.afstandM < 1000 ? `${props.afstandM}m` : `${(props.afstandM / 1000).toFixed(1)}km`) : '';
      const relevanceBadge = relevance === 'hoog'
        ? '<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">HOOG</span>'
        : relevance === 'midden'
        ? '<span style="background:#f59e0b;color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">MIDDEN</span>'
        : '<span style="background:#6b7280;color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">LAAG</span>';
      const opacityMultiplier = relevance === 'hoog' ? 1.0 : relevance === 'midden' ? 0.8 : 0.5;

      try {
        if (isLine) {
          // Shadow layer for lines (thicker black line behind the colored line)
          const shadow = L.geoJSON(feature as any, {
            style: { color: '#000000', weight: 8, opacity: 0.6 * opacityMultiplier },
            renderer,
          } as any);
          shadow.addTo(map);
          layersRef.current.push(shadow);
        }

        const layer = L.geoJSON(feature as any, {
          ...(isPoly || isLine ? { renderer } : {}),
          style: isPoly ? {
            color: props.color || '#22c55e',
            weight: props.strokeWidth ?? 3,
            fillColor: props.color || '#22c55e',
            fillOpacity: (props.fillOpacity ?? 0.35) * opacityMultiplier,
            opacity: opacityMultiplier,
          } : isLine ? {
            color: props.color || '#facc15',
            weight: props.strokeWidth ?? 5,
            opacity: opacityMultiplier,
          } : undefined,
          pointToLayer: isPoint ? (_feat: any, latlng: any) => {
            return L.circleMarker(latlng, {
              renderer,
              radius: relevance === 'hoog' ? 14 : relevance === 'midden' ? 12 : 8,
              color: '#ffffff',
              weight: relevance === 'hoog' ? 4 : 3,
              fillColor: props.color || '#facc15',
              fillOpacity: 0.9 * opacityMultiplier,
            });
          } : undefined,
          onEachFeature: (_feat: any, lyr: any) => {
            lyr.bindPopup(`
              <div style="padding:10px;min-width:200px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                  <div style="font-size:14px;font-weight:700;color:white;flex:1;">${props.name || 'Onbekend'}</div>
                  ${relevanceBadge}
                </div>
                <div style="font-size:11px;color:#94a3b8;text-transform:capitalize;">${(props.layer || '').replace(/_/g, ' ')}${afstandTekst ? ` \u2022 ${afstandTekst}` : ''}</div>
                ${props.relevanceToelichting ? `<div style="font-size:11px;color:#cbd5e1;margin-top:6px;line-height:1.4;border-top:1px solid #334155;padding-top:6px;">${props.relevanceToelichting}</div>` : ''}
              </div>
            `, { className: 'custom-popup', maxWidth: 320 });
            lyr.on('click', () => onThemeSelect(themeId));
          },
        } as any);
        layer.addTo(map);
        layersRef.current.push(layer);
      } catch (err) {
        console.warn('[GeoFeaturesLayer] Failed to render feature:', props.name, err);
      }
    });

    return () => {
      layersRef.current.forEach((lyr) => {
        try { map.removeLayer(lyr); } catch (_) {}
      });
      layersRef.current = [];
    };
  }, [features, map, onThemeSelect]);
  return null;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.8 });
  }, [center, zoom, map]);
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    const container = map.getContainer();
    if (container) resizeObserver.observe(container);
    return () => { clearTimeout(timer); resizeObserver.disconnect(); };
  }, [map]);
  return null;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => { onLocationSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
}

// Fit map to bounds of all percelen
function FitBoundsToPercelen({ percelen }: { percelen: Array<{ lat: number; lng: number; perceelGrenzen?: any }> }) {
  const map = useMap();
  useEffect(() => {
    if (percelen.length === 0) return;
    const allCoords: [number, number][] = [];
    for (const p of percelen) {
      if (p.perceelGrenzen?.coordinates) {
        // GeoJSON polygon coordinates
        const rings = p.perceelGrenzen.type === 'MultiPolygon'
          ? p.perceelGrenzen.coordinates.flat()
          : p.perceelGrenzen.coordinates;
        for (const ring of rings) {
          for (const coord of ring) {
            allCoords.push([coord[1], coord[0]]); // lat, lng
          }
        }
      } else {
        allCoords.push([p.lat, p.lng]);
      }
    }
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17, animate: true, duration: 1 });
    }
  }, [percelen, map]);
  return null;
}

// ============ PERCEEL COLORS ============

const PERCEEL_COLORS = [
  { fill: '#3B82F6', stroke: '#1D4ED8', name: 'Blauw' },
  { fill: '#10B981', stroke: '#059669', name: 'Groen' },
  { fill: '#8B5CF6', stroke: '#6D28D9', name: 'Paars' },
  { fill: '#F59E0B', stroke: '#D97706', name: 'Geel' },
  { fill: '#EF4444', stroke: '#DC2626', name: 'Rood' },
  { fill: '#06B6D4', stroke: '#0891B2', name: 'Cyan' },
  { fill: '#EC4899', stroke: '#DB2777', name: 'Roze' },
  { fill: '#84CC16', stroke: '#65A30D', name: 'Lime' },
];

// ============ STATUS HELPERS ============

const statusConfig = {
  aandachtspunt: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-l-amber-500', badge: 'bg-amber-500 text-white', badgeDot: 'bg-amber-500', label: 'Aandachtspunt' },
  relevant: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-l-emerald-500', badge: 'bg-emerald-500 text-white', badgeDot: 'bg-emerald-500', label: 'Relevant' },
  niet_relevant: { icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-l-slate-400', badge: 'bg-slate-400 text-white', badgeDot: 'bg-slate-400', label: 'Niet relevant' },
  onbekend: { icon: HelpCircle, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-l-blue-400', badge: 'bg-blue-500 text-white', badgeDot: 'bg-blue-500', label: 'Onbekend' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-l-red-500', badge: 'bg-red-500/90 text-white', badgeDot: 'bg-red-500', label: 'Fout' },
};

const themeConfig: Record<string, { icon: any; color: string; gradient: string; lightBg: string }> = {
  basis: { icon: Building2, color: 'text-slate-600', gradient: 'from-slate-500 to-slate-700', lightBg: 'bg-slate-100' },
  natuur: { icon: TreePine, color: 'text-green-600', gradient: 'from-green-500 to-emerald-700', lightBg: 'bg-green-50' },
  water: { icon: Droplets, color: 'text-blue-600', gradient: 'from-blue-500 to-cyan-700', lightBg: 'bg-blue-50' },
  geluid_milieu: { icon: Volume2, color: 'text-purple-600', gradient: 'from-purple-500 to-violet-700', lightBg: 'bg-purple-50' },
  veiligheid: { icon: Shield, color: 'text-red-600', gradient: 'from-red-500 to-rose-700', lightBg: 'bg-red-50' },
  erfgoed: { icon: Landmark, color: 'text-amber-600', gradient: 'from-amber-500 to-yellow-700', lightBg: 'bg-amber-50' },
  landbouw: { icon: Wheat, color: 'text-lime-600', gradient: 'from-lime-500 to-green-700', lightBg: 'bg-lime-50' },
  infra: { icon: Route, color: 'text-orange-600', gradient: 'from-orange-500 to-amber-700', lightBg: 'bg-orange-50' },
  landschap: { icon: Mountain, color: 'text-teal-600', gradient: 'from-teal-500 to-cyan-700', lightBg: 'bg-teal-50' },
  gezondheid: { icon: Heart, color: 'text-pink-600', gradient: 'from-pink-500 to-rose-700', lightBg: 'bg-pink-50' },
  mobiliteit: { icon: Route, color: 'text-indigo-600', gradient: 'from-indigo-500 to-blue-700', lightBg: 'bg-indigo-50' },
  bodem: { icon: Mountain, color: 'text-stone-600', gradient: 'from-stone-500 to-stone-700', lightBg: 'bg-stone-50' },
};

// ============ LAYER DEFINITIONS ============

interface LayerDef {
  id: string;
  name: string;
  description: string;
  group: string;
  color: string;
  linkedIndicators?: string[];
}

const layerDefinitions: LayerDef[] = [
  { id: 'kadaster', name: 'Kadastrale percelen', description: 'Eigendomsgrenzen en perceelnummers', group: 'Basis', color: '#6B7280' },
  { id: 'bestemmingsplan', name: 'Bestemmingsplangebied', description: 'Contouren van vigerende bestemmingsplannen', group: 'Planologie', color: '#F59E0B' },
  { id: 'enkelbestemming', name: 'Enkelbestemmingen', description: 'Primaire bestemming van gronden', group: 'Planologie', color: '#EF4444' },
  { id: 'dubbelbestemming', name: 'Dubbelbestemmingen', description: 'Aanvullende bestemmingen (archeologie, waterstaat)', group: 'Planologie', color: '#8B5CF6' },
  { id: 'bouwvlak', name: 'Bouwvlakken', description: 'Gebieden waar gebouwd mag worden', group: 'Planologie', color: '#EC4899' },
  { id: 'gebiedsaanduiding', name: 'Gebiedsaanduidingen', description: 'Zones met specifieke regels', group: 'Planologie', color: '#14B8A6' },
  { id: 'functieaanduiding', name: 'Functieaanduidingen', description: 'Specifieke functies binnen een bestemming', group: 'Planologie', color: '#F97316' },
  { id: 'maatvoering', name: 'Maatvoering', description: 'Bouwhoogte, goothoogte, bebouwingspercentage', group: 'Planologie', color: '#06B6D4' },
  { id: 'natura2000', name: 'Natura 2000', description: 'Europees beschermde natuurgebieden', group: 'Natuur & Ecologie', color: '#22C55E', linkedIndicators: ['NATURA2000'] },
  { id: 'nnn', name: 'Natuurnetwerk Nederland', description: 'Provinciaal ecologisch netwerk', group: 'Natuur & Ecologie', color: '#16A34A', linkedIndicators: ['NNN'] },
  { id: 'stiltegebied', name: 'Stiltegebieden', description: 'Provinciale stiltegebieden', group: 'Milieu & Geluid', color: '#7C3AED', linkedIndicators: ['STILTEGEBIED'] },
  { id: 'rijksmonumenten', name: 'Rijksmonumenten', description: 'Door het Rijk beschermde monumenten', group: 'Erfgoed', color: '#D97706', linkedIndicators: ['RIJKSMONUMENT'] },
  { id: 'beschermd_gezicht', name: 'Beschermde gezichten', description: 'Beschermde stads- en dorpsgezichten', group: 'Erfgoed', color: '#B45309', linkedIndicators: ['BESCHERMD_GEZICHT'] },
  { id: 'werelderfgoed', name: 'Werelderfgoed', description: 'UNESCO Werelderfgoed locaties', group: 'Erfgoed', color: '#92400E', linkedIndicators: ['WERELDERFGOED'] },
  { id: 'bodemkwaliteit', name: 'Bodemkwaliteit', description: 'Bodemverontreiniging en -kwaliteit', group: 'Milieu & Geluid', color: '#78716C', linkedIndicators: ['BODEMKWALITEIT'] },
  { id: 'geluidzones', name: 'Geluidzones weg', description: 'Geluidbelasting door wegverkeer', group: 'Milieu & Geluid', color: '#7C3AED', linkedIndicators: ['GELUID_WEG'] },
  { id: 'geluid_spoor', name: 'Geluidzones spoor', description: 'Geluidbelasting door spoorverkeer', group: 'Milieu & Geluid', color: '#6D28D9', linkedIndicators: ['GELUID_SPOOR'] },
  { id: 'overstromingsrisico', name: 'Overstromingsrisico', description: 'Gebieden met overstromingsrisico', group: 'Water', color: '#2563EB', linkedIndicators: ['OVERSTROMINGSRISICO'] },
  { id: 'waterkering', name: 'Waterkeringen', description: 'Primaire en regionale waterkeringen', group: 'Water', color: '#1D4ED8', linkedIndicators: ['WATERKERING', 'BESCHERMINGSZONE_WATERKERING'] },
  { id: 'grondwaterbescherming', name: 'Grondwaterbescherming', description: 'Grondwaterbeschermingsgebieden', group: 'Water', color: '#0EA5E9', linkedIndicators: ['GRONDWATERBESCHERMING'] },
  { id: 'risicokaart', name: 'Risicokaart (REV)', description: 'Externe veiligheidsrisico\'s', group: 'Veiligheid', color: '#DC2626', linkedIndicators: ['BEVI', 'RISICOCONTOUR'] },
  { id: 'gewaspercelen', name: 'Gewaspercelen (BRP)', description: 'Landbouwpercelen met gewastype', group: 'Landbouw', color: '#84CC16' },
  { id: 'spoorwegen', name: 'Spoorwegen', description: 'Spoorlijnen en stations', group: 'Infrastructuur', color: '#334155', linkedIndicators: ['SPOORWEG', 'GELUIDZONE_SPOOR', 'TRILLINGEN'] },
  { id: 'hoogspanning', name: 'Hoogspanningslijnen', description: 'Bovengrondse hoogspanningsverbindingen', group: 'Infrastructuur', color: '#F43F5E', linkedIndicators: ['HOOGSPANNING'] },
  { id: 'beschermd_natuur', name: 'Beschermde natuurgebieden', description: 'Nationaal beschermde natuurgebieden (Wnb)', group: 'Natuur & Ecologie', color: '#15803D', linkedIndicators: ['BESCHERMD_NATUURGEBIED'] },
  { id: 'historische_buitenplaats', name: 'Historische buitenplaatsen', description: 'Rijksbeschermde historische buitenplaatsen', group: 'Erfgoed', color: '#A16207', linkedIndicators: ['HISTORISCHE_BUITENPLAATS'] },
  { id: 'keur_waterschap', name: 'Keur waterschap', description: 'Waterschapsgrenzen en keurgebieden', group: 'Water', color: '#0369A1', linkedIndicators: ['KEUR_WATERSCHAP'] },
  // Atlas Leefomgeving (RIVM) layers
  { id: 'alo_geluid_weg', name: 'Geluid wegverkeer (Lden)', description: 'Geluidbelasting wegverkeer - Atlas Leefomgeving', group: 'Milieu & Geluid', color: '#E11D48', linkedIndicators: ['GELUID_WEG'] },
  { id: 'alo_geluid_trein', name: 'Geluid treinverkeer (Lden)', description: 'Geluidbelasting treinverkeer - Atlas Leefomgeving', group: 'Milieu & Geluid', color: '#BE185D', linkedIndicators: ['GELUID_SPOOR'] },
  { id: 'alo_geluid_industrie', name: 'Geluid industrie (Lden)', description: 'Geluidbelasting industrie - Atlas Leefomgeving', group: 'Milieu & Geluid', color: '#9D174D', linkedIndicators: ['GELUID_INDUSTRIE'] },
  { id: 'alo_geluid_alle', name: 'Geluid alle bronnen (Lden)', description: 'Gecombineerde geluidbelasting alle bronnen', group: 'Milieu & Geluid', color: '#831843' },
  { id: 'alo_no2', name: 'Stikstofdioxide (NO\u2082)', description: 'Jaargemiddelde NO\u2082 concentratie - RIVM', group: 'Luchtkwaliteit', color: '#7C3AED', linkedIndicators: ['LUCHTKWALITEIT'] },
  { id: 'alo_pm10', name: 'Fijnstof (PM\u2081\u2080)', description: 'Jaargemiddelde PM10 concentratie - RIVM', group: 'Luchtkwaliteit', color: '#6D28D9', linkedIndicators: ['LUCHTKWALITEIT'] },
  { id: 'alo_pm25', name: 'Fijnstof (PM\u2082.\u2085)', description: 'Jaargemiddelde PM2.5 concentratie - RIVM', group: 'Luchtkwaliteit', color: '#5B21B6', linkedIndicators: ['LUCHTKWALITEIT'] },
];

const layerGroups = Array.from(new Set(layerDefinitions.map(l => l.group)));

// Theme sidebar configuration for the GIS mockup-style left sidebar
const themeSidebarItems: Array<{ id: string; label: string; icon: any; color: string; mapColor: string; indicatorThemes: string[] }> = [
  { id: 'natuur', label: 'Natuur', icon: TreePine, color: '#22C55E', mapColor: 'rgba(34,197,94,0.25)', indicatorThemes: ['natuur'] },
  { id: 'water', label: 'Water', icon: Droplets, color: '#3B82F6', mapColor: 'rgba(59,130,246,0.25)', indicatorThemes: ['water'] },
  { id: 'erfgoed', label: 'Erfgoed', icon: Landmark, color: '#F59E0B', mapColor: 'rgba(245,158,11,0.25)', indicatorThemes: ['erfgoed'] },
  { id: 'veiligheid', label: 'Veiligheid', icon: Shield, color: '#EF4444', mapColor: 'rgba(239,68,68,0.25)', indicatorThemes: ['veiligheid'] },
  { id: 'geluid', label: 'Geluid', icon: Volume2, color: '#EAB308', mapColor: 'rgba(234,179,8,0.25)', indicatorThemes: ['geluid_milieu'] },
  { id: 'bodem', label: 'Bodem', icon: Mountain, color: '#92400E', mapColor: 'rgba(146,64,14,0.25)', indicatorThemes: ['bodem'] },
  { id: 'planologie', label: 'Planologie', icon: FileText, color: '#8B5CF6', mapColor: 'rgba(139,92,246,0.25)', indicatorThemes: ['basis', 'planologie'] },
  { id: 'landbouw', label: 'Landbouw', icon: Wheat, color: '#84CC16', mapColor: 'rgba(132,204,22,0.25)', indicatorThemes: ['landbouw'] },
  { id: 'mobiliteit', label: 'Mobiliteit', icon: Route, color: '#14B8A6', mapColor: 'rgba(20,184,166,0.25)', indicatorThemes: ['mobiliteit', 'infra'] },
  { id: 'landschap', label: 'Landschap', icon: Globe, color: '#0EA5E9', mapColor: 'rgba(14,165,233,0.25)', indicatorThemes: ['landschap'] },
  { id: 'gezondheid', label: 'Gezondheid', icon: Heart, color: '#EC4899', mapColor: 'rgba(236,72,153,0.25)', indicatorThemes: ['gezondheid'] },
];

const groupIcons: Record<string, any> = {
  'Basis': Building2,
  'Planologie': FileText,
  'Natuur & Ecologie': TreePine,
  'Erfgoed': Landmark,
  'Milieu & Geluid': Volume2,
  'Luchtkwaliteit': Heart,
  'Water': Droplets,
  'Veiligheid': Shield,
  'Landbouw': Wheat,
  'Infrastructuur': Route,
};

const groupColors: Record<string, string> = {
  'Basis': '#6B7280',
  'Planologie': '#F59E0B',
  'Natuur & Ecologie': '#22C55E',
  'Erfgoed': '#D97706',
  'Milieu & Geluid': '#7C3AED',
  'Luchtkwaliteit': '#6D28D9',
  'Water': '#2563EB',
  'Veiligheid': '#DC2626',
  'Landbouw': '#84CC16',
  'Infrastructuur': '#334155',
};

// ============ LAYER PANEL ============

function LayerPanel({ activeLayers, onToggleLayer, scanResult }: {
  activeLayers: Record<string, boolean>;
  onToggleLayer: (id: string) => void;
  scanResult: ScanResult | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Basis', 'Planologie']));

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const activeCount = (group: string) =>
    layerDefinitions.filter(l => l.group === group && activeLayers[l.id]).length;

  const totalActive = Object.values(activeLayers).filter(Boolean).length;

  const isAandachtspunt = (codes?: string[]) => {
    if (!codes || !scanResult) return false;
    return scanResult.indicatoren.some(i => codes.includes(i.code) && i.status === 'aandachtspunt');
  };

  return (
    <div className="absolute top-3 right-3 z-[1000]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 px-4 py-2.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/10 border border-slate-200 hover:bg-white hover:shadow-xl hover:shadow-black/15 transition-all duration-300"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1B4D3E] to-[#2d7a63] flex items-center justify-center shadow-sm">
          <Layers className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-900">Kaartlagen</span>
        {totalActive > 0 && (
          <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#1B4D3E] text-white text-[11px] font-bold px-1.5">
            {totalActive}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/15 border border-slate-200 max-h-[75vh] overflow-hidden w-[340px] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kaartlagen</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{totalActive} actief van {layerDefinitions.length}</p>
              </div>
              <button
                onClick={() => {
                  layerDefinitions.forEach(l => {
                    if (activeLayers[l.id]) onToggleLayer(l.id);
                  });
                }}
                className="text-[11px] text-slate-500 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-all duration-200 font-medium"
              >
                Alles uit
              </button>
            </div>
          </div>

          {/* Groups */}
          <div className="overflow-y-auto max-h-[calc(75vh-60px)] overscroll-contain">
            {layerGroups.map(group => {
              const GroupIcon = groupIcons[group] || Layers;
              const count = activeCount(group);
              const isExpanded = expandedGroups.has(group);
              const groupLayers = layerDefinitions.filter(l => l.group === group);
              const gColor = groupColors[group] || '#6B7280';

              return (
                <div key={group} className="border-b border-slate-100 last:border-0">
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all duration-200"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: gColor + '15' }}
                    >
                      <GroupIcon className="h-3.5 w-3.5" style={{ color: gColor }} />
                    </div>
                    <span className="text-[13px] font-semibold text-slate-900 flex-1 text-left">{group}</span>
                    {count > 0 && (
                      <span
                        className="min-w-[20px] h-5 flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1.5"
                        style={{ backgroundColor: gColor }}
                      >
                        {count}
                      </span>
                    )}
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                  </button>

                  {isExpanded && (
                    <div className="pb-2 px-2.5">
                      {groupLayers.map(layer => {
                        const isActive = activeLayers[layer.id] ?? false;
                        const hasAlert = isAandachtspunt(layer.linkedIndicators);

                        return (
                          <div
                            key={layer.id}
                            className={`flex items-center gap-3 py-2.5 px-3 rounded-xl mb-0.5 cursor-pointer transition-all duration-200 group/layer ${
                              isActive
                                ? 'bg-slate-100 shadow-sm'
                                : 'hover:bg-slate-50'
                            }`}
                            onClick={() => onToggleLayer(layer.id)}
                          >
                            <div className="relative">
                              <div
                                className={`w-4 h-4 rounded-[5px] shrink-0 border-2 transition-all duration-200 ${
                                  isActive ? 'border-transparent shadow-sm scale-110' : 'border-slate-300 group-hover/layer:border-slate-400'
                                }`}
                                style={{ backgroundColor: isActive ? layer.color : 'transparent' }}
                              />
                              {hasAlert && (
                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-[13px] leading-tight ${isActive ? 'font-semibold text-slate-900' : 'text-slate-600 group-hover/layer:text-slate-800'}`}>
                                {layer.name}
                              </span>
                              <p className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">{layer.description}</p>
                            </div>
                            <div className={`transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover/layer:opacity-40'}`}>
                              {isActive ? (
                                <Eye className="h-3.5 w-3.5 text-[#1B4D3E]" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ COMBINED OVERVIEW (ALL LOCATIONS) ============

function CombinedOverview({ multiScanResults }: {
  multiScanResults: Array<{ locatie: { lat: number; lng: number; adres: string }; result: ScanResult }>;
}) {
  // Merge statistics
  const totalIndicatoren = multiScanResults.reduce((sum, sr) => sum + sr.result.samenvatting.totaal, 0);
  const totalAandacht = multiScanResults.reduce((sum, sr) => sum + sr.result.samenvatting.aandachtspunten, 0);
  const totalRelevant = multiScanResults.reduce((sum, sr) => sum + sr.result.samenvatting.relevant, 0);
  const totalNvt = multiScanResults.reduce((sum, sr) => sum + sr.result.samenvatting.nietRelevant, 0);
  const totalOnbekend = multiScanResults.reduce((sum, sr) => sum + sr.result.samenvatting.onbekend, 0);

  // Collect all unique aandachtspunten across locations
  const aandachtspuntenMap = new Map<string, { indicator: IndicatorResult; locations: string[] }>();
  for (const sr of multiScanResults) {
    for (const ind of sr.result.indicatoren) {
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

  const stats = [
    { label: 'Aandacht', count: totalAandacht, color: '#D97706', icon: AlertTriangle, lightBg: 'bg-amber-50' },
    { label: 'Relevant', count: totalRelevant, color: '#059669', icon: CheckCircle, lightBg: 'bg-emerald-50' },
    { label: 'N.v.t.', count: totalNvt, color: '#94A3B8', icon: XCircle, lightBg: 'bg-slate-50' },
    { label: 'Onbekend', count: totalOnbekend, color: '#4F46E5', icon: HelpCircle, lightBg: 'bg-indigo-50' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Combined header */}
      <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B4D3E] to-[#2d7a63] flex items-center justify-center">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Gecombineerd overzicht</h2>
            <p className="text-xs text-slate-500">{multiScanResults.length} locaties &bull; {totalIndicatoren} indicatoren totaal</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`text-center p-3 rounded-xl ${s.lightBg} border border-slate-200 bg-white`}>
                <Icon className="h-3.5 w-3.5 mx-auto mb-1 opacity-50" style={{ color: s.color }} />
                <div className="text-xl font-bold" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[10px] font-medium opacity-70" style={{ color: s.color }}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-location summary cards */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-900 px-1">Per locatie</h3>
        {multiScanResults.map((sr, i) => {
          const shortName = sr.locatie.adres.split(',')[0] || `Locatie ${i + 1}`;
          const a = sr.result.samenvatting;
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-6 h-6 rounded-full bg-[#1B4D3E] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{shortName}</p>
                  <p className="text-[10px] text-slate-500">{a.totaal} indicatoren</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                {a.aandachtspunten > 0 && (
                  <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                    <AlertTriangle className="h-3 w-3" />{a.aandachtspunten}
                  </span>
                )}
                {a.relevant > 0 && (
                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                    <CheckCircle className="h-3 w-3" />{a.relevant}
                  </span>
                )}
                <span className="text-slate-500">{a.nietRelevant} n.v.t.</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Combined aandachtspunten list */}
      {totalAandacht > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-amber-700 px-1 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Alle aandachtspunten ({totalAandacht})
          </h3>
          {Array.from(aandachtspuntenMap.values()).map(({ indicator, locations }) => (
            <div key={indicator.code} className="bg-amber-50 rounded-xl border-l-[3px] border-amber-500 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-900">{indicator.humanName}</p>
                  <p className="text-xs text-slate-600 mt-1">{indicator.waarde}</p>
                  {locations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {locations.map((loc, i) => (
                        <span key={i} className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                          {loc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ INDICATOR PANEL ============

function IndicatorPanel({ scanResult, onToggleLayer, activeLayers, selectedTheme, onExportPDF, isExporting }: {
  scanResult: ScanResult;
  onToggleLayer: (id: string) => void;
  activeLayers: Record<string, boolean>;
  selectedTheme?: string | null;
  onExportPDF?: () => void;
  isExporting?: boolean;
}) {
  // Map sidebar theme IDs to engine theme names
  const themeMapping: Record<string, string[]> = {
    natuur: ['natuur'],
    water: ['water'],
    erfgoed: ['erfgoed'],
    veiligheid: ['veiligheid'],
    geluid: ['geluid_milieu'],
    bodem: ['bodem'],
    planologie: ['basis'],
    landbouw: ['landbouw'],
    mobiliteit: ['mobiliteit', 'infra'],
    landschap: ['landschap'],
    gezondheid: ['gezondheid'],
  };
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(() => {
    // Auto-expand ALL themes so results are immediately visible
    const themes = new Set<string>();
    scanResult.themaOverzicht.forEach(t => {
      themes.add(t.theme);
    });
    return themes;
  });
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(() => {
    // Auto-expand aandachtspunten indicators
    const expanded = new Set<string>();
    scanResult.indicatoren.forEach(i => {
      if (i.status === 'aandachtspunt') expanded.add(i.code);
    });
    return expanded;
  });

  const toggleTheme = (theme: string) => {
    setExpandedThemes(prev => {
      const next = new Set(prev);
      if (next.has(theme)) next.delete(theme);
      else next.add(theme);
      return next;
    });
  };

  const toggleIndicator = (code: string) => {
    setExpandedIndicators(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const findLinkedLayer = (code: string): LayerDef | undefined => {
    return layerDefinitions.find(l => l.linkedIndicators?.includes(code));
  };

  // Filter by selected theme from sidebar
  const allowedThemeNames = selectedTheme && themeMapping[selectedTheme]
    ? themeMapping[selectedTheme]
    : null;

  const filteredThemas = scanResult.themaOverzicht
    .filter(t => !allowedThemeNames || allowedThemeNames.includes(t.theme))
    .map(t => ({
      ...t,
      indicatoren: filterStatus
        ? t.indicatoren.filter(i => i.status === filterStatus)
        : t.indicatoren,
    })).filter(t => t.indicatoren.length > 0);

  const stats = [
    { key: 'aandachtspunt', count: scanResult.samenvatting.aandachtspunten, label: 'Aandacht', color: '#D97706', lightBg: 'bg-amber-50', textColor: 'text-amber-700', icon: AlertTriangle },
    { key: 'relevant', count: scanResult.samenvatting.relevant, label: 'Relevant', color: '#059669', lightBg: 'bg-emerald-50', textColor: 'text-emerald-700', icon: CheckCircle },
    { key: 'niet_relevant', count: scanResult.samenvatting.nietRelevant, label: 'N.v.t.', color: '#94A3B8', lightBg: 'bg-slate-50', textColor: 'text-slate-500', icon: XCircle },
    { key: 'onbekend', count: scanResult.samenvatting.onbekend, label: 'Onbekend', color: '#4F46E5', lightBg: 'bg-indigo-50', textColor: 'text-indigo-600', icon: HelpCircle },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Summary header - enhanced */}
      <div className="p-5 pb-4 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Scanresultaten</h2>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{scanResult.samenvatting.totaal} indicatoren</span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{(scanResult.duurMs / 1000).toFixed(1)}s</span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{scanResult.themaOverzicht.length} thema's</span>
            </p>
          </div>
          <Link href="/omgevingsscan/indicatoren" className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200">
            <Info className="h-3.5 w-3.5" />
            Encyclopedie
          </Link>
        </div>

        {/* Stats grid - larger, more prominent */}
        <div className="grid grid-cols-4 gap-2.5 mb-4">
          {stats.map(s => {
            const isActive = filterStatus === s.key;
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setFilterStatus(isActive ? null : s.key)}
                className={`relative overflow-hidden text-center p-3.5 rounded-2xl transition-all duration-300 border bg-white ${
                  isActive
                    ? 'ring-2 ring-offset-0 scale-[1.03] shadow-lg border-transparent'
                    : 'hover:scale-[1.02] hover:shadow-sm border-slate-200'
                }`}
                style={isActive ? { borderColor: s.color + '40', boxShadow: `0 0 0 2px ${s.color}40` } : {}}
              >
                <Icon className="h-4 w-4 mx-auto mb-1.5 opacity-60" style={{ color: s.color }} />
                <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[11px] font-semibold opacity-70 mt-0.5" style={{ color: s.color }}>{s.label}</div>
              </button>
            );
          })}
        </div>

        {/* Location badge - more prominent */}
        <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-emerald-600/60 uppercase tracking-wider font-semibold">Locatie</div>
            <span className="text-sm text-slate-900 font-semibold truncate block">{scanResult.locatie.adres}</span>
          </div>
        </div>

        {/* Procedure beoordeling badge */}
        {scanResult.procedureBeoordeling && (
          <div className={`mt-3 rounded-xl px-4 py-3 border ${
            scanResult.procedureBeoordeling.type === 'bopa' 
              ? 'bg-red-50 border-red-300' 
              : scanResult.procedureBeoordeling.type === 'uitgebreid'
              ? 'bg-orange-50 border-orange-300'
              : scanResult.procedureBeoordeling.type === 'regulier'
              ? 'bg-green-50 border-green-300'
              : 'bg-slate-50 border-slate-300'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                scanResult.procedureBeoordeling.type === 'bopa'
                  ? 'bg-gradient-to-br from-red-600 to-red-500 shadow-red-500/20'
                  : scanResult.procedureBeoordeling.type === 'uitgebreid'
                  ? 'bg-gradient-to-br from-orange-600 to-orange-500 shadow-orange-500/20'
                  : scanResult.procedureBeoordeling.type === 'regulier'
                  ? 'bg-gradient-to-br from-green-600 to-green-500 shadow-green-500/20'
                  : 'bg-gradient-to-br from-slate-500 to-slate-400'
              }`}>
                <span className="text-white text-[10px] font-black">
                  {scanResult.procedureBeoordeling.type === 'bopa' ? 'BOPA' 
                    : scanResult.procedureBeoordeling.type === 'uitgebreid' ? 'UIT' 
                    : scanResult.procedureBeoordeling.type === 'regulier' ? 'REG' : '?'}
                </span>
              </div>
              <div className="min-w-0">
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${
                  scanResult.procedureBeoordeling.type === 'bopa' ? 'text-red-600/60'
                    : scanResult.procedureBeoordeling.type === 'uitgebreid' ? 'text-orange-600/60'
                    : scanResult.procedureBeoordeling.type === 'regulier' ? 'text-green-600/60'
                    : 'text-slate-500/60'
                }`}>Procedure</div>
                <span className={`text-sm font-bold ${
                  scanResult.procedureBeoordeling.type === 'bopa' ? 'text-red-800'
                    : scanResult.procedureBeoordeling.type === 'uitgebreid' ? 'text-orange-800'
                    : scanResult.procedureBeoordeling.type === 'regulier' ? 'text-green-800'
                    : 'text-slate-700'
                }`}>
                  {scanResult.procedureBeoordeling.type === 'bopa' ? 'Buitenplanse Omgevingsplanactiviteit (BOPA)'
                    : scanResult.procedureBeoordeling.type === 'uitgebreid' ? 'Uitgebreide procedure (26 weken)'
                    : scanResult.procedureBeoordeling.type === 'regulier' ? 'Reguliere procedure (8 weken)'
                    : 'Procedure onbekend'}
                </span>
              </div>
            </div>
            <p className={`text-[11px] leading-relaxed ${
              scanResult.procedureBeoordeling.type === 'bopa' ? 'text-red-700'
                : scanResult.procedureBeoordeling.type === 'uitgebreid' ? 'text-orange-700'
                : scanResult.procedureBeoordeling.type === 'regulier' ? 'text-green-700'
                : 'text-slate-600'
            }`}>{scanResult.procedureBeoordeling.toelichting}</p>
            {scanResult.procedureBeoordeling.redenen.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {scanResult.procedureBeoordeling.redenen.map((r, i) => (
                  <div key={i} className={`text-[10px] flex items-start gap-1 ${
                    scanResult.procedureBeoordeling!.type === 'bopa' ? 'text-red-600'
                      : scanResult.procedureBeoordeling!.type === 'uitgebreid' ? 'text-orange-600'
                      : 'text-slate-500'
                  }`}>
                    <span className="mt-0.5 shrink-0">&bull;</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick links to external viewers */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2 border border-blue-200">
            <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-[11px] text-blue-700 font-medium">Bronnen: PDOK &bull; BAG &bull; Kadaster &bull; AERIUS &bull; RCE &bull; RIVM</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <a
              href={`https://www.ruimtelijkeplannen.nl/viewer/view?locx=${scanResult.locatie.lng}&locy=${scanResult.locatie.lat}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-all duration-200"
            >
              <ExternalLink className="h-3 w-3" />Ruimtelijkeplannen.nl
            </a>
            <a
              href={`https://regelsopdekaart.omgevingswet.overheid.nl/regels?activiteit=alles&locatie=geo:${scanResult.locatie.lat},${scanResult.locatie.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-purple-700 font-semibold bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-all duration-200"
            >
              <ExternalLink className="h-3 w-3" />Regels op de kaart
            </a>
            <a
              href={`https://bagviewer.kadaster.nl/lvbag/bag-viewer/#?searchQuery=${encodeURIComponent(scanResult.locatie.adres)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-all duration-200"
            >
              <ExternalLink className="h-3 w-3" />BAG Viewer
            </a>
            <a
              href={`https://www.atlasleefomgeving.nl/kaarten?config=page&layers=luchtfoto&x=${scanResult.locatie.lng}&y=${scanResult.locatie.lat}&zoom=14`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all duration-200"
            >
              <ExternalLink className="h-3 w-3" />Atlas Leefomgeving
            </a>
          </div>
        </div>

        {/* Quick aandachtspunten summary - clickable */}
        {scanResult.samenvatting.aandachtspunten > 0 && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-300">{scanResult.samenvatting.aandachtspunten} Aandachtspunten</span>
            </div>
            <div className="space-y-1">
              {scanResult.indicatoren
                .filter(i => i.status === 'aandachtspunt')
                .map(i => (
                  <button
                    key={i.code}
                    onClick={() => {
                      // Expand the indicator and scroll to it
                      const thema = scanResult.themaOverzicht.find(t => t.indicatoren.some(ind => ind.code === i.code));
                      if (thema) {
                        setExpandedThemes(prev => { const next = new Set(prev); next.add(thema.theme); return next; });
                      }
                      setExpandedIndicators(prev => { const next = new Set(prev); next.add(i.code); return next; });
                      // Scroll to indicator after a short delay for DOM update
                      setTimeout(() => {
                        const el = document.getElementById(`indicator-${i.code}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 150);
                    }}
                    className="w-full text-left text-xs text-amber-300 flex items-start gap-1.5 hover:bg-amber-500/10 rounded-lg px-2 py-1.5 transition-all duration-200 group cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
                    <span className="flex-1"><strong>{i.humanName}</strong> — {i.waarde}</span>
                    <ChevronRight className="h-3 w-3 text-amber-500 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Indicator list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Download rapport banner - directly clickable */}
        <button
          onClick={onExportPDF}
          disabled={isExporting}
          className="w-full p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 hover:from-emerald-100 hover:via-emerald-50 hover:to-emerald-100 transition-all duration-300 cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
              {isExporting ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Download className="h-6 w-6 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-slate-900">{isExporting ? 'Rapport wordt gegenereerd...' : 'Rapport downloaden'}</div>
              <div className="text-xs text-slate-500 mt-1">Volledig PDF-rapport met {scanResult.samenvatting.totaal} indicatoren, wettelijke grondslag, consequenties en aanbevelingen</div>
            </div>
            <div className="text-sm text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg font-bold border border-emerald-200 group-hover:bg-emerald-200 transition-colors">
              PDF ↓
            </div>
          </div>
        </button>

        {filteredThemas.map((thema, themaIndex) => {
          const config = themeConfig[thema.theme] || themeConfig.basis;
          const ThemeIcon = config.icon;
          const isExpanded = expandedThemes.has(thema.theme);
          const aandachtCount = thema.indicatoren.filter(i => i.status === 'aandachtspunt').length;

          return (
            <div key={thema.theme} data-theme={thema.theme} className="border-b border-slate-100 last:border-0">
              {/* Theme header */}
              <button
                onClick={() => toggleTheme(thema.theme)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200`}>
                    <ThemeIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-[13px] font-semibold text-slate-900 block">{thema.label}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500">{thema.indicatoren.length} indicatoren</span>
                      {aandachtCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {aandachtCount} aandacht
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${isExpanded ? '' : '-rotate-90'}`} />
              </button>

              {/* Indicators */}
              {isExpanded && (
                <div className="pb-3 px-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  {thema.indicatoren.map(ind => {
                    const sConfig = statusConfig[ind.status];
                    const Icon = sConfig.icon;
                    const linkedLayer = findLinkedLayer(ind.code);
                    const isIndExpanded = expandedIndicators.has(ind.code);

                    return (
                      <div
                        key={ind.code}
                        id={`indicator-${ind.code}`}
                        className={`rounded-xl ${sConfig.bg} border-l-[4px] ${sConfig.border} overflow-hidden transition-all duration-200 hover:shadow-md`}
                      >
                        <button
                          onClick={() => toggleIndicator(ind.code)}
                          className="w-full p-4 text-left"
                        >
                          <div className="flex items-start gap-3">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ind.status === 'aandachtspunt' ? 'bg-amber-100' : ind.status === 'relevant' ? 'bg-emerald-100' : ind.status === 'niet_relevant' ? 'bg-slate-100' : 'bg-blue-100'}`}>
                              <Icon className={`h-4 w-4 ${sConfig.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-900 leading-tight">{ind.humanName}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`${sConfig.badge} text-[10px] px-2.5 py-1 rounded-full font-bold`}>{sConfig.label}</span>
                                  <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${isIndExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                              <div className="text-[13px] text-slate-600 mt-2 leading-relaxed">{ind.waarde}</div>
                              {ind.afstandM !== undefined && ind.afstandM > 0 && (
                                <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5 bg-slate-100 rounded-lg px-2 py-1 w-fit">
                                  <MapPin className="h-3 w-3" />
                                  Afstand: {ind.afstandM < 1000 ? `${ind.afstandM}m` : `${(ind.afstandM / 1000).toFixed(1)}km`}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Expanded details - rich report view */}
                        {isIndExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-100 mt-1 animate-in fade-in slide-in-from-top-1 duration-150 space-y-3">
                            {/* Wettelijke Grondslag */}
                            {(ind as any).wettelijkeGrondslag && (
                              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <Landmark className="h-4 w-4 text-indigo-600" />
                                  <span className="text-[10px] text-indigo-600 uppercase tracking-wider font-bold">Wettelijke Grondslag</span>
                                </div>
                                <p className="text-[13px] text-indigo-800 leading-relaxed font-medium">{(ind as any).wettelijkeGrondslag}</p>
                              </div>
                            )}

                            {/* Consequenties */}
                            {(ind as any).consequenties && (
                              <div className={`rounded-xl p-4 border shadow-sm ${
                                ind.status === 'aandachtspunt' ? 'bg-amber-50 border-amber-200' 
                                : ind.status === 'relevant' ? 'bg-emerald-50 border-emerald-200' 
                                : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className={`h-4 w-4 ${
                                    ind.status === 'aandachtspunt' ? 'text-amber-600' 
                                    : ind.status === 'relevant' ? 'text-emerald-600' 
                                    : 'text-slate-500'
                                  }`} />
                                  <span className={`text-[10px] uppercase tracking-wider font-bold ${
                                    ind.status === 'aandachtspunt' ? 'text-amber-700' 
                                    : ind.status === 'relevant' ? 'text-emerald-700' 
                                    : 'text-slate-500'
                                  }`}>Consequenties voor de aanvrager</span>
                                </div>
                                <p className="text-[13px] text-slate-700 leading-relaxed">{(ind as any).consequenties}</p>
                              </div>
                            )}

                            {/* Relevantie Toelichting */}
                            {(ind as any).relevantieToelichting && (
                              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                  <span className="text-[10px] text-purple-700 uppercase tracking-wider font-bold">Waarom is dit relevant?</span>
                                </div>
                                <p className="text-[13px] text-slate-700 leading-relaxed italic">{(ind as any).relevantieToelichting}</p>
                              </div>
                            )}

                            {/* Suggesties */}
                            {(ind as any).suggesties && Array.isArray((ind as any).suggesties) && (ind as any).suggesties.length > 0 && (
                              <div className="bg-teal-50 rounded-xl p-4 border border-teal-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <Zap className="h-4 w-4 text-teal-600" />
                                  <span className="text-[10px] text-teal-700 uppercase tracking-wider font-bold">Aanbevelingen &amp; suggesties</span>
                                </div>
                                <ul className="space-y-2">
                                  {((ind as any).suggesties as string[]).map((s: string, si: number) => (
                                    <li key={si} className="flex items-start gap-2.5 text-[13px] text-slate-700 leading-relaxed">
                                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{si + 1}</span>
                                      <span>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Toelichting */}
                            {ind.toelichting && ind.toelichting !== ind.waarde && (
                              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <Info className="h-3.5 w-3.5 text-blue-600" />
                                  <span className="text-[10px] text-blue-700 uppercase tracking-wider font-bold">Technische toelichting</span>
                                </div>
                                <p className="text-[13px] text-slate-700 leading-relaxed">{ind.toelichting}</p>
                              </div>
                            )}

                            {/* Afstand detail */}
                            {ind.afstandM !== undefined && ind.afstandM > 0 && (
                              <div className="bg-violet-50 rounded-xl p-3.5 border border-violet-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="h-3.5 w-3.5 text-violet-600" />
                                  <span className="text-[10px] text-violet-700 uppercase tracking-wider font-bold">Afstand tot locatie</span>
                                </div>
                                <p className="text-sm font-bold text-slate-900">
                                  {ind.afstandM < 1000 ? `${ind.afstandM} meter` : `${(ind.afstandM / 1000).toFixed(1)} kilometer`}
                                </p>
                              </div>
                            )}

                            {/* Bronnen */}
                            {ind.bronnen && ind.bronnen.length > 0 && (
                              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Databronnen</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {ind.bronnen.map((bron: string, bi: number) => (
                                    <span key={bi} className="text-[11px] bg-white text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
                                      {bron}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              {linkedLayer && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLayer(linkedLayer.id);
                                  }}
                                  className="flex items-center gap-2 text-xs font-bold transition-all duration-200 px-3.5 py-2.5 rounded-xl border shadow-sm hover:shadow-md"
                                  style={{
                                    color: activeLayers[linkedLayer.id] ? '#dc2626' : '#059669',
                                    backgroundColor: activeLayers[linkedLayer.id] ? '#fef2f2' : '#ecfdf5',
                                    borderColor: activeLayers[linkedLayer.id] ? '#fecaca' : '#a7f3d0',
                                  }}
                                >
                                  {activeLayers[linkedLayer.id] ? (
                                    <><EyeOff className="h-3.5 w-3.5" />Verberg op kaart</>
                                  ) : (
                                    <><Eye className="h-3.5 w-3.5" />Toon op kaart</>
                                  )}
                                </button>
                              )}
                              {ind.bronnen?.some((b: string) => b.toLowerCase().includes('ruimtelijkeplannen')) && (
                                <a
                                  href={`https://www.ruimtelijkeplannen.nl/viewer/view?locx=${scanResult.locatie.lng}&locy=${scanResult.locatie.lat}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />Ruimtelijkeplannen.nl
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ MAIN DASHBOARD ============

export default function OmgevingsscanDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ display: string; lat: number; lng: number; type: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; adres: string } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.1326, 5.2913]);
  const [mapZoom, setMapZoom] = useState(8);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({ kadaster: true });
  const [baseLayer, setBaseLayer] = useState<'luchtfoto' | 'topografie' | 'pastel'>('pastel');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showThemeSidebar, setShowThemeSidebar] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [perceelGeoJSON, setPerceelGeoJSON] = useState<any>(null);
  const [pandGeoJSON, setPandGeoJSON] = useState<any[]>([]);
  const [perceelInfo, setPerceelInfo] = useState<string>('');

  const quickScanMutation = trpc.omgevingsscan.quickScan.useMutation();
  const exportPDFMutation = trpc.omgevingsscan.exportPDF.useMutation();
  const exportCombinedPDFMutation = trpc.omgevingsscan.exportCombinedPDF.useMutation();
  const [isExporting, setIsExporting] = useState(false);
  const [dsoFile, setDsoFile] = useState<File | null>(null);
  const [isDsoUploading, setIsDsoUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ documentType: string; documentSummary: string; extractedAddress: string | null; geocodedLocation: { lat: number; lng: number; adres: string } | null; allLocations?: { lat: number; lng: number; adres: string }[]; fileUrl: string } | null>(null);
  const [multiScanResults, setMultiScanResults] = useState<Array<{ locatie: { lat: number; lng: number; adres: string }; result: ScanResult }>>([]);
  const [uploadPercelen, setUploadPercelen] = useState<Array<{ lat: number; lng: number; adres: string; kadastraal?: string; perceelGrenzen?: any }>>([]);
  const [activeLocationIndex, setActiveLocationIndex] = useState<number>(0);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number } | null>(null);
  const dsoInputRef = useRef<HTMLInputElement>(null);
  const uploadDocumentMutation = trpc.omgevingsscan.uploadDocument.useMutation();

  const handleExportPDF = useCallback(async () => {
    if (!scanResult && multiScanResults.length === 0) return;
    setIsExporting(true);
    try {
      let result;
      if (multiScanResults.length > 1) {
        result = await exportCombinedPDFMutation.mutateAsync({
          scanResults: multiScanResults.map(sr => ({
            locatie: sr.locatie,
            result: sr.result,
          })),
        });
      } else {
        result = await exportPDFMutation.mutateAsync({ scanResult: scanResult || multiScanResults[0]?.result });
      }
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('PDF export mislukt:', error);
    } finally {
      setIsExporting(false);
    }
  }, [scanResult, multiScanResults, exportPDFMutation, exportCombinedPDFMutation]);

  // Fetch perceel geometry when location changes
  useEffect(() => {
    if (!selectedLocation) {
      setPerceelGeoJSON(null);
      setPandGeoJSON([]);
      setPerceelInfo('');
      return;
    }
    (async () => {
      const [perceel, panden] = await Promise.all([
        fetchPerceelGeometry(selectedLocation.lat, selectedLocation.lng),
        fetchPandGeometry(selectedLocation.lat, selectedLocation.lng),
      ]);
      setPerceelGeoJSON(perceel);
      setPandGeoJSON(panden);
      if (perceel?.properties) {
        const p = perceel.properties;
        setPerceelInfo(`${p.kadastraleGemeenteCode || ''} ${p.sectie || ''} ${p.perceelnummer || ''}`);
      }
    })();
  }, [selectedLocation?.lat, selectedLocation?.lng]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await pdokGeocode(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
  }, []);

  const selectLocation = useCallback((suggestion: { display: string; lat: number; lng: number }) => {
    setSelectedLocation({ lat: suggestion.lat, lng: suggestion.lng, adres: suggestion.display });
    setMapCenter([suggestion.lat, suggestion.lng]);
    setMapZoom(18);
    setSearchQuery(suggestion.display);
    setShowSuggestions(false);
    setScanResult(null);
  }, []);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    try {
      const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse?lat=${lat}&lon=${lng}&rows=1`;
      const res = await fetch(url);
      const data = await res.json();
      const adres = data.response?.docs?.[0]?.weergavenaam || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setSelectedLocation({ lat, lng, adres });
      setSearchQuery(adres);
      setScanResult(null);
    } catch {
      setSelectedLocation({ lat, lng, adres: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
    }
  }, []);

  const runScan = useCallback(async () => {
    if (!selectedLocation) return;
    setIsScanning(true);
    try {
      const result = await quickScanMutation.mutateAsync({
        adres: selectedLocation.adres,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      });
      setScanResult(result.resultaat as ScanResult);
      // Automatisch relevante WMS-lagen activeren op basis van indicator-resultaten
      const scanRes = result.resultaat as ScanResult;
      const autoLayers: Record<string, boolean> = { kadaster: true };
      if (scanRes?.indicatoren) {
        for (const indicator of scanRes.indicatoren) {
          if (indicator.status === 'aandachtspunt' || indicator.status === 'relevant') {
            // Vind ALLE WMS-lagen die bij deze indicator horen (er kunnen meerdere zijn)
            const linkedLayers = layerDefinitions.filter(l => l.linkedIndicators?.includes(indicator.code));
            for (const layer of linkedLayers) {
              autoLayers[layer.id] = true;
            }
          }
        }
        // Altijd enkelbestemming en dubbelbestemming tonen als er plandata is
        if (scanRes.indicatoren.some(i => i.code === 'ENKELBESTEMMING' || i.code === 'DUBBELBESTEMMING')) {
          autoLayers['enkelbestemming'] = true;
          autoLayers['dubbelbestemming'] = true;
          autoLayers['bouwvlak'] = true;
        }
        // Altijd gebiedsaanduiding tonen als er aandachtspunten zijn
        if (scanRes.indicatoren.some(i => i.status === 'aandachtspunt')) {
          autoLayers['gebiedsaanduiding'] = true;
        }
      }
      setActiveLayers(autoLayers);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  }, [selectedLocation, quickScanMutation, activeLayers]);

  const toggleLayer = useCallback((id: string) => {
    setActiveLayers(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markerPosition = useMemo(() =>
    selectedLocation ? [selectedLocation.lat, selectedLocation.lng] as [number, number] : null
  , [selectedLocation?.lat, selectedLocation?.lng]);

  // Enhanced perceel style - more visible with colored fill
  const perceelStyle = useMemo(() => ({
    color: '#1B4D3E',
    weight: 3,
    fillColor: '#1B4D3E',
    fillOpacity: 0.15,
    dashArray: '8 4',
  }), []);

  // Pand style - rose/red for buildings
  const pandStyle = useMemo(() => ({
    color: '#E11D48',
    weight: 2.5,
    fillColor: '#FB7185',
    fillOpacity: 0.25,
  }), []);

  const perceelKey = useMemo(() => JSON.stringify(perceelGeoJSON?.geometry?.coordinates?.[0]?.[0] || ''), [perceelGeoJSON]);
  const pandKey = useMemo(() => pandGeoJSON.length + '-' + (pandGeoJSON[0]?.geometry?.coordinates?.[0]?.[0]?.[0] || ''), [pandGeoJSON]);

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-slate-100">
        {/* Top bar - dark GIS theme */}
        <div className="bg-[#1B4D3E] border-b border-[#164034] px-4 py-2.5 flex items-center gap-3 z-[1001] shadow-lg shadow-black/15">
          <Link href="/omgevingsscan" className="flex items-center gap-2.5 text-emerald-400 hover:text-emerald-300 transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1B4D3E] to-[#2d7a63] flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">Omgevingsscan</span>
            </div>
          </Link>

          {/* Search bar */}
          <div ref={searchRef} className="flex-1 max-w-xl relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Zoek een adres, postcode of locatie..."
                className="pl-10 pr-4 bg-white/[0.08] border-white/[0.1] text-white placeholder:text-slate-400 focus:bg-white/[0.12] focus:border-emerald-500/40 focus:ring-emerald-500/20 rounded-xl h-10 text-sm transition-all duration-200"
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/15 border border-slate-200 overflow-hidden z-[1002]">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectLocation(s)}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 flex items-center gap-3 border-b border-slate-100 last:border-0 transition-all duration-150"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-slate-900 font-medium truncate">{s.display}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{s.type}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={runScan}
              disabled={!selectedLocation || isScanning}
              className="bg-gradient-to-r from-[#1B4D3E] to-[#2d7a63] hover:from-[#164034] hover:to-[#256b56] text-white rounded-xl shadow-md shadow-[#1B4D3E]/20 hover:shadow-lg hover:shadow-[#1B4D3E]/30 h-10 px-5 transition-all duration-300"
            >
              {isScanning ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scannen...</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" />Start Scan</>
              )}
            </Button>

            {scanResult && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isExporting}
                    onClick={handleExportPDF}
                    className="border-white/[0.1] text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 rounded-xl h-10 w-10 transition-all duration-200"
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl">PDF Rapport downloaden</TooltipContent>
              </Tooltip>
            )}

            {/* DSO Upload */}
            <input
              ref={dsoInputRef}
              type="file"
              accept=".zip,.pdf,.jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const sizeMB = file.size / (1024 * 1024);
                if (sizeMB > 50) {
                  alert(`Het bestand is te groot (${sizeMB.toFixed(1)} MB). Maximaal 50 MB toegestaan.`);
                  e.target.value = '';
                  return;
                }
                setDsoFile(file);
                setIsDsoUploading(true);
                setUploadResult(null);
                try {
                  const arrayBuffer = await file.arrayBuffer();
                  const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                  const lowerName = file.name.toLowerCase();
                  const isPdf = lowerName.endsWith('.pdf');
                  const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => lowerName.endsWith(ext));
                  const result = await uploadDocumentMutation.mutateAsync({
                    fileName: file.name,
                    fileBase64: base64,
                    fileType: isImage ? 'image' : isPdf ? 'pdf' : 'zip',
                  });
                  setUploadResult(result);
                  // Store percelen for map display
                  if (result.percelen && result.percelen.length > 0) {
                    setUploadPercelen(result.percelen);
                  }
                  // Determine all locations to scan
                  const locationsToScan = result.percelen && result.percelen.length > 0
                    ? result.percelen.map((p: any) => ({ lat: p.lat, lng: p.lng, adres: p.adres }))
                    : result.allLocations && result.allLocations.length > 1
                      ? result.allLocations
                      : result.geocodedLocation
                        ? [result.geocodedLocation]
                        : [];

                  if (locationsToScan.length > 0) {
                    // Focus on first location
                    const firstLoc = locationsToScan[0];
                    setSelectedLocation({ lat: firstLoc.lat, lng: firstLoc.lng, adres: firstLoc.adres });
                    setMapCenter([firstLoc.lat, firstLoc.lng]);
                    setMapZoom(18);
                    setSearchQuery(firstLoc.adres);

                    // Scan ALL locations sequentially
                    setIsScanning(true);
                    setScanProgress({ current: 0, total: locationsToScan.length });
                    const allResults: Array<{ locatie: { lat: number; lng: number; adres: string }; result: ScanResult }> = [];
                    try {
                      for (let i = 0; i < locationsToScan.length; i++) {
                        const loc = locationsToScan[i];
                        setScanProgress({ current: i + 1, total: locationsToScan.length });
                        try {
                          const scanRes = await quickScanMutation.mutateAsync({ adres: loc.adres, lat: loc.lat, lng: loc.lng, activiteitType: (result as any).activiteitType, documentSamenvatting: (result as any).documentSummary });
                          allResults.push({ locatie: loc, result: scanRes.resultaat as ScanResult });
                        } catch (scanErr) {
                          console.error(`Scan mislukt voor locatie ${i + 1} (${loc.adres}):`, scanErr);
                        }
                      }
                      setMultiScanResults(allResults);
                      setActiveLocationIndex(0);
                      // Show first scan result with auto-activated relevant layers
                      if (allResults.length > 0) {
                        setScanResult(allResults[0].result);
                        const firstResult = allResults[0].result;
                        const autoLayers: Record<string, boolean> = { kadaster: true };
                        if (firstResult?.indicatoren) {
                          for (const indicator of firstResult.indicatoren) {
                            if (indicator.status === 'aandachtspunt' || indicator.status === 'relevant') {
                              const linkedLayers = layerDefinitions.filter(l => l.linkedIndicators?.includes(indicator.code));
                              for (const layer of linkedLayers) {
                                autoLayers[layer.id] = true;
                              }
                            }
                          }
                          if (firstResult.indicatoren.some(i => i.code === 'ENKELBESTEMMING' || i.code === 'DUBBELBESTEMMING')) {
                            autoLayers['enkelbestemming'] = true;
                            autoLayers['dubbelbestemming'] = true;
                            autoLayers['bouwvlak'] = true;
                          }
                          if (firstResult.indicatoren.some(i => i.status === 'aandachtspunt')) {
                            autoLayers['gebiedsaanduiding'] = true;
                          }
                        }
                        setActiveLayers(autoLayers);
                      }
                    } finally {
                      setIsScanning(false);
                      setScanProgress(null);
                    }
                  }
                } catch (err) {
                  console.error('Upload mislukt:', err);
                  alert('Upload mislukt. Probeer het opnieuw.');
                } finally {
                  setIsDsoUploading(false);
                }
                e.target.value = '';
              }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => dsoInputRef.current?.click()}
                  disabled={isDsoUploading || isScanning}
                  className="border-white/[0.1] text-slate-300 hover:bg-white/[0.08] hover:border-white/[0.15] rounded-xl h-10 w-10 transition-all duration-200"
                >
                  {isDsoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-xl">Document uploaden (PDF, afbeelding of ZIP)</TooltipContent>
            </Tooltip>

            {/* Base layer toggle */}
            <div className="flex items-center bg-white/[0.06] rounded-xl p-0.5 h-10 border border-white/[0.08]">
              {(['pastel', 'topografie', 'luchtfoto'] as const).map((layer) => (
                <button
                  key={layer}
                  onClick={() => setBaseLayer(layer)}
                  className={`px-3 py-2 text-xs rounded-[10px] transition-all duration-300 ${
                    baseLayer === layer
                      ? 'bg-emerald-500/20 shadow-sm text-emerald-300 font-semibold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {layer === 'pastel' ? 'Pastel' : layer === 'topografie' ? 'Topo' : 'Luchtfoto'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left theme sidebar - GIS mockup style */}
          {scanResult && showThemeSidebar && (
            <div className="w-[72px] bg-white/95 backdrop-blur-xl border-r border-slate-200 flex flex-col items-center py-3 gap-1 z-[1000] overflow-y-auto shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
              <button
                onClick={() => setSelectedTheme(null)}
                className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                  selectedTheme === null
                    ? 'bg-emerald-100 border border-emerald-300 shadow-sm'
                    : 'hover:bg-slate-100 border border-transparent'
                }`}
              >
                <BarChart3 className="h-5 w-5" style={{ color: selectedTheme === null ? '#059669' : '#94a3b8' }} />
                <span className={`text-[9px] font-semibold leading-none ${selectedTheme === null ? 'text-emerald-700' : 'text-slate-500'}`}>Alles</span>
              </button>
              <div className="w-8 h-px bg-slate-200 my-1" />
              {themeSidebarItems.map(theme => {
                const ThemeIcon = theme.icon;
                const isActive = selectedTheme === theme.id;
                const themeIndicators = scanResult.indicatoren.filter(i => theme.indicatorThemes.includes(i.theme));
                const aandachtCount = themeIndicators.filter(i => i.status === 'aandachtspunt').length;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(isActive ? null : theme.id)}
                    className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 relative ${
                      isActive
                        ? 'border shadow-sm'
                        : 'hover:bg-slate-100 border border-transparent'
                    }`}
                    style={isActive ? {
                      backgroundColor: theme.color + '12',
                      borderColor: theme.color + '40',
                      boxShadow: `0 2px 8px ${theme.color}10`,
                    } : undefined}
                  >
                    <ThemeIcon className="h-5 w-5" style={{ color: isActive ? theme.color : '#94a3b8' }} />
                    <span className="text-[9px] font-semibold leading-none" style={{ color: isActive ? theme.color : '#64748b' }}>{theme.label}</span>
                    {aandachtCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm">
                        {aandachtCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Map */}
          <div className="flex-1 relative" style={{ minHeight: 0 }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              className={scanResult ? 'gis-dark-overlay' : ''}
              zoomControl={false}
            >
              <MapUpdater center={mapCenter} zoom={mapZoom} />
              <MapClickHandler onLocationSelect={handleMapClick} />

              {/* Base layers - key forces React to remount on switch */}
              <TileLayer
                key={`base-${baseLayer}`}
                url={baseLayer === 'luchtfoto'
                  ? 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg'
                  : baseLayer === 'topografie'
                    ? 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png'
                    : 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/pastel/EPSG:3857/{z}/{x}/{y}.png'
                }
                attribution={`&copy; <a href="https://www.kadaster.nl">Kadaster</a>${baseLayer === 'pastel' ? ' (BRT Pastel)' : ''}`}
                maxZoom={19}
              />

              {/* WMS overlay layers */}
              {activeLayers['kadaster'] && (
                <WMSTileLayer url="https://service.pdok.nl/kadaster/kadastralekaart/wms/v5_0" layers="Perceel" transparent={true} format="image/png" opacity={0.5} />
              )}
              {activeLayers['natura2000'] && (
                <WMSTileLayer url="https://service.pdok.nl/rvo/natura2000/wms/v1_0" layers="natura2000" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['nnn'] && (
                <WMSTileLayer url="https://service.pdok.nl/provincies/nnn/wms/v1_0" layers="nnn" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['stiltegebied'] && (
                <WMSTileLayer url="https://service.pdok.nl/provincies/stiltegebieden/wms/v1_0" layers="PS.ProtectedSite" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['rijksmonumenten'] && (
                <WMSTileLayer url="https://service.pdok.nl/rce/rijksmonumenten/wms/v1_0" layers="rijksmonumenten_punt" transparent={true} format="image/png" opacity={0.7} />
              )}
              {activeLayers['beschermd_gezicht'] && (
                <WMSTileLayer url="https://service.pdok.nl/rce/beschermdestadsdorpsgezichten/wms/v1_0" layers="beschermdestadsdorpsgezichten" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['bodemkwaliteit'] && (
                <WMSTileLayer url="https://service.pdok.nl/rivm/bodemkwaliteit/wms/v1_0" layers="bodemkwaliteit" transparent={true} format="image/png" opacity={0.5} />
              )}
              {activeLayers['overstromingsrisico'] && (
                <WMSTileLayer url="https://service.pdok.nl/rws/overstromingsrisico/wms/v1_0" layers="overstromingsrisico" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['geluidzones'] && (
                <WMSTileLayer url="https://service.pdok.nl/rivm/geluid/wms/v1_0" layers="geluid_weg" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['gewaspercelen'] && (
                <WMSTileLayer url="https://service.pdok.nl/rvo/brpgewaspercelen/wms/v1_0" layers="brpgewaspercelen" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['grondwaterbescherming'] && (
                <WMSTileLayer url="https://service.pdok.nl/provincies/grondwaterbeschermingsgebieden/wms/v1_0" layers="grondwaterbeschermingsgebied" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['bestemmingsplan'] && (
                <WMSTileLayer url="https://service.pdok.nl/kadaster/bestemmingsplangebieden/wms/v1_0" layers="bestemmingsplangebied" transparent={true} format="image/png" opacity={0.3} />
              )}
              {activeLayers['enkelbestemming'] && (
                <WMSTileLayer url="https://service.pdok.nl/kadaster/bestemmingsplangebieden/wms/v1_0" layers="enkelbestemming" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['dubbelbestemming'] && (
                <WMSTileLayer url="https://service.pdok.nl/kadaster/bestemmingsplangebieden/wms/v1_0" layers="dubbelbestemming" transparent={true} format="image/png" opacity={0.5} />
              )}
              {activeLayers['bouwvlak'] && (
                <WMSTileLayer url="https://service.pdok.nl/kadaster/bestemmingsplangebieden/wms/v1_0" layers="bouwvlak" transparent={true} format="image/png" opacity={0.5} />
              )}
              {activeLayers['gebiedsaanduiding'] && (
                <WMSTileLayer url="https://service.pdok.nl/kadaster/bestemmingsplangebieden/wms/v1_0" layers="gebiedsaanduiding" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['functieaanduiding'] && (
                <WMSTileLayer url="https://service.pdok.nl/kadaster/bestemmingsplangebieden/wms/v1_0" layers="functieaanduiding" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['maatvoering'] && (
                <WMSTileLayer url="https://service.pdok.nl/kadaster/bestemmingsplangebieden/wms/v1_0" layers="maatvoering" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['werelderfgoed'] && (
                <WMSTileLayer url="https://service.pdok.nl/rce/werelderfgoed/wms/v1_0" layers="werelderfgoed" transparent={true} format="image/png" opacity={0.5} />
              )}
              {activeLayers['waterkering'] && (
                <WMSTileLayer url="https://service.pdok.nl/rws/legger/wms/v1_0" layers="waterkeringen" transparent={true} format="image/png" opacity={0.5} />
              )}
              {activeLayers['geluid_spoor'] && (
                <WMSTileLayer url="https://service.pdok.nl/rivm/geluid/wms/v1_0" layers="geluid_spoor" transparent={true} format="image/png" opacity={0.4} />
              )}
              {activeLayers['risicokaart'] && (
                <WMSTileLayer url="https://service.pdok.nl/rivm/risicokaart/wms/v1_0" layers="risicokaart" transparent={true} format="image/png" opacity={0.5} />
              )}
              {activeLayers['spoorwegen'] && (
                <WMSTileLayer url="https://service.pdok.nl/prorail/spoorwegen/wms/v1_0" layers="spoorwegen" transparent={true} format="image/png" opacity={0.6} />
              )}
              {activeLayers['hoogspanning'] && (
                <WMSTileLayer url="https://service.pdok.nl/rvo/hoogspanningslijnen/wms/v1_0" layers="hoogspanningslijnen" transparent={true} format="image/png" opacity={0.6} />
              )}

              {/* Nationaal Beschermde Gebieden (CDDA: Natura2000 + nationale parken + NNN) */}
              {activeLayers['beschermd_natuur'] && (
                <WMSTileLayer url="https://service.pdok.nl/rvo/nationaal-beschermde-gebieden-cdda/wms/v1_0" layers="cdda" transparent={true} format="image/png" opacity={0.5} />
              )}
              {/* Beschermde gebieden cultuurhistorie (rijksmonumenten, stads-/dorpsgezichten, buitenplaatsen) */}
              {activeLayers['historische_buitenplaats'] && (
                <WMSTileLayer url="https://service.pdok.nl/rce/beschermde-gebieden-cultuurhistorie/wms/v1_0" layers="PS.ProtectedSite" transparent={true} format="image/png" opacity={0.5} />
              )}
              {/* Keur waterschap (bestuurlijke gebieden - gemeentegrenzen als proxy) */}
              {activeLayers['keur_waterschap'] && (
                <WMSTileLayer url="https://service.pdok.nl/kadaster/bestuurlijkegebieden/wms/v1_0" layers="Gemeentegebied" transparent={true} format="image/png" opacity={0.15} />
              )}

              {/* Atlas Leefomgeving (RIVM) WMS overlay layers */}
              {activeLayers['alo_geluid_weg'] && (
                <WMSTileLayer url="https://data.rivm.nl/geo/alo/wms" layers="rivm_Geluid_lden_wegverkeer_actueel" transparent={true} format="image/png" opacity={0.55} />
              )}
              {activeLayers['alo_geluid_trein'] && (
                <WMSTileLayer url="https://data.rivm.nl/geo/alo/wms" layers="rivm_Geluid_lden_treinverkeer_actueel" transparent={true} format="image/png" opacity={0.55} />
              )}
              {activeLayers['alo_geluid_industrie'] && (
                <WMSTileLayer url="https://data.rivm.nl/geo/alo/wms" layers="rivm_Geluid_lden_industrie_actueel" transparent={true} format="image/png" opacity={0.55} />
              )}
              {activeLayers['alo_geluid_alle'] && (
                <WMSTileLayer url="https://data.rivm.nl/geo/alo/wms" layers="rivm_Geluid_lden_allebronnen_actueel" transparent={true} format="image/png" opacity={0.55} />
              )}
              {activeLayers['alo_no2'] && (
                <WMSTileLayer url="https://data.rivm.nl/geo/alo/wms" layers="rivm_jaargemiddeld_NO2_actueel" transparent={true} format="image/png" opacity={0.55} />
              )}
              {activeLayers['alo_pm10'] && (
                <WMSTileLayer url="https://data.rivm.nl/geo/alo/wms" layers="rivm_jaargemiddeld_PM10_actueel" transparent={true} format="image/png" opacity={0.55} />
              )}
              {activeLayers['alo_pm25'] && (
                <WMSTileLayer url="https://data.rivm.nl/geo/alo/wms" layers="rivm_jaargemiddeld_PM25_actueel" transparent={true} format="image/png" opacity={0.55} />
              )}

              {/* Upload percelen - colored polygons */}
              {uploadPercelen.length > 0 && (
                <>
                  <FitBoundsToPercelen percelen={uploadPercelen} />
                  {uploadPercelen.map((perceel, i) => {
                    const color = PERCEEL_COLORS[i % PERCEEL_COLORS.length];
                    const isActive = i === activeLocationIndex;
                    if (!perceel.perceelGrenzen) return null;
                    const geoJsonData = {
                      type: 'Feature' as const,
                      properties: { index: i, adres: perceel.adres, kadastraal: perceel.kadastraal },
                      geometry: perceel.perceelGrenzen,
                    };
                    return (
                      <GeoJSON
                        key={`upload-perceel-${i}-${isActive}`}
                        data={geoJsonData}
                        style={{
                          color: color.stroke,
                          weight: isActive ? 4 : 2.5,
                          fillColor: color.fill,
                          fillOpacity: isActive ? 0.35 : 0.2,
                          dashArray: isActive ? undefined : '6 3',
                        }}
                        eventHandlers={{
                          click: () => {
                            // Switch to this location's scan results
                            setActiveLocationIndex(i);
                            if (multiScanResults[i]) {
                              setScanResult(multiScanResults[i].result);
                              setSelectedLocation(multiScanResults[i].locatie);
                              setMapCenter([multiScanResults[i].locatie.lat, multiScanResults[i].locatie.lng]);
                              setSearchQuery(multiScanResults[i].locatie.adres);
                            }
                          },
                        }}
                      >
                        <Popup maxWidth={360} className="custom-popup">
                          <div className="p-3">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md" style={{ background: `linear-gradient(135deg, ${color.fill}, ${color.stroke})` }}>
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-900 truncate">{perceel.adres}</div>
                                {perceel.kadastraal && <div className="text-xs text-slate-500 font-mono mt-0.5">{perceel.kadastraal}</div>}
                              </div>
                            </div>
                            {multiScanResults[i] && (
                              <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-xl p-3 border border-slate-200">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Scanresultaat</div>
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="flex items-center gap-1.5 text-amber-700 font-bold bg-amber-100 px-2.5 py-1 rounded-lg">
                                    <AlertTriangle className="h-3.5 w-3.5" />{multiScanResults[i].result.samenvatting.aandachtspunten} aandacht
                                  </span>
                                  <span className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-100 px-2.5 py-1 rounded-lg">
                                    <CheckCircle className="h-3.5 w-3.5" />{multiScanResults[i].result.samenvatting.relevant} relevant
                                  </span>
                                  <span className="text-slate-500 font-medium">
                                    {multiScanResults[i].result.samenvatting.totaal} totaal
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveLocationIndex(i);
                                    setScanResult(multiScanResults[i].result);
                                    setSelectedLocation(multiScanResults[i].locatie);
                                  }}
                                  className="mt-3 w-full text-center text-xs font-bold text-white bg-gradient-to-r from-[#1B4D3E] to-[#2d7a63] rounded-lg py-2 hover:opacity-90 transition-opacity"
                                >
                                  Bekijk volledig rapport
                                </button>
                              </div>
                            )}
                            {!multiScanResults[i] && (
                              <div className="text-xs text-slate-400 italic">Scan wordt uitgevoerd...</div>
                            )}
                          </div>
                        </Popup>
                      </GeoJSON>
                    );
                  })}
                </>
              )}

              {/* Perceel highlight polygon (single location) */}
              {perceelGeoJSON && uploadPercelen.length === 0 && (
                <GeoJSON key={'perceel-' + perceelKey} data={perceelGeoJSON} style={perceelStyle}>
                  <Popup maxWidth={320} className="custom-popup">
                    <div className="p-2">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B4D3E] to-[#2d7a63] flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#1B4D3E]">Kadastraal perceel</div>
                          <div className="text-xs text-slate-500 font-mono">{perceelInfo}</div>
                        </div>
                      </div>
                      {selectedLocation && (
                        <div className="bg-white/[0.06] rounded-lg p-2.5 mb-2">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Adres</div>
                          <div className="text-xs text-slate-300 font-medium">{selectedLocation.adres}</div>
                        </div>
                      )}
                      {scanResult && (
                        <div className="bg-gradient-to-r from-amber-500/10 to-emerald-500/10 rounded-lg p-2.5 border border-white/[0.08]">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Scanresultaat</div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 text-amber-400 font-semibold">
                              <AlertTriangle className="h-3 w-3" />{scanResult.samenvatting.aandachtspunten} aandacht
                            </span>
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                              <CheckCircle className="h-3 w-3" />{scanResult.samenvatting.relevant} relevant
                            </span>
                            <span className="flex items-center gap-1 text-slate-500">
                              {scanResult.samenvatting.totaal} totaal
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </GeoJSON>
              )}

              {/* Pand highlight polygons */}
              {pandGeoJSON.map((pand, i) => (
                <GeoJSON
                  key={'pand-' + pandKey + '-' + i}
                  data={pand}
                  style={pandStyle}
                >
                  <Popup maxWidth={280} className="custom-popup">
                    <div className="p-2">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-rose-600">BAG Pand</div>
                          <div className="text-[10px] text-slate-400">Basisregistratie Adressen en Gebouwen</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/[0.06] rounded-lg p-2">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Bouwjaar</div>
                          <div className="text-sm font-bold text-slate-300">{pand.properties?.bouwjaar || 'Onbekend'}</div>
                        </div>
                        <div className="bg-white/[0.06] rounded-lg p-2">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Status</div>
                          <div className="text-sm font-bold text-slate-300">{pand.properties?.status || 'Onbekend'}</div>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </GeoJSON>
              ))}

              {/* Multi-location numbered markers */}
              {multiScanResults.length > 1 ? (
                <>
                  {multiScanResults.map((sr, i) => (
                    <Marker
                      key={`multi-marker-${i}`}
                      position={[sr.locatie.lat, sr.locatie.lng]}
                      icon={createNumberedIcon(i + 1, i === activeLocationIndex)}
                      eventHandlers={{
                        click: () => {
                          setActiveLocationIndex(i);
                          setScanResult(sr.result);
                          setSelectedLocation(sr.locatie);
                          setMapCenter([sr.locatie.lat, sr.locatie.lng]);
                          setMapZoom(18);
                          setSearchQuery(sr.locatie.adres);
                        }
                      }}
                    >
                      <Popup>
                        <div className="text-sm p-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-5 rounded-full bg-[#1B4D3E] text-white text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                            <strong className="text-[#1B4D3E]">{sr.locatie.adres}</strong>
                          </div>
                          <div className="text-slate-500 text-xs">
                            {sr.result.samenvatting.aandachtspunten} aandachtspunten &bull; {sr.result.samenvatting.totaal} indicatoren
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </>
              ) : (
                /* Single location marker */
                markerPosition && (
                  <Marker position={markerPosition} icon={pulsingIcon}>
                    <Popup>
                      <div className="text-sm p-1">
                        <strong className="text-[#1B4D3E]">{selectedLocation?.adres}</strong>
                        {perceelInfo && (
                          <div className="text-slate-500 mt-1 text-xs font-mono">
                            Perceel: {perceelInfo}
                          </div>
                        )}
                        <div className="text-slate-400 text-xs mt-0.5">
                          {selectedLocation?.lat.toFixed(6)}, {selectedLocation?.lng.toFixed(6)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              )}
              {/* Real GeoJSON features from API data */}
              {/* Render GeoJSON features using direct Leaflet API for reliable rendering */}
              {scanResult?.geoFeatures && <GeoFeaturesLayer features={scanResult.geoFeatures} onThemeSelect={setSelectedTheme} />}

              {/* Floating labels removed - they were positioned at random offsets and caused confusion.
                  GeoJSON features (Natura 2000, spoorlijnen, etc.) are shown directly on the map instead.
                  Theme navigation is available via the sidebar buttons on the left. */}
            </MapContainer>

            {/* Layer panel overlay */}
            <LayerPanel activeLayers={activeLayers} onToggleLayer={toggleLayer} scanResult={scanResult} />

            {/* Percelen legenda */}
            {uploadPercelen.length > 1 && (
              <div className="absolute bottom-3 left-3 z-[999]">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/10 border border-slate-200 p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Percelen</div>
                  <div className="space-y-1.5">
                    {uploadPercelen.map((p, i) => {
                      const color = PERCEEL_COLORS[i % PERCEEL_COLORS.length];
                      const isActive = i === activeLocationIndex;
                      const shortName = p.kadastraal || p.adres.split(',')[0] || `Perceel ${i + 1}`;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setActiveLocationIndex(i);
                            if (multiScanResults[i]) {
                              setScanResult(multiScanResults[i].result);
                              setSelectedLocation(multiScanResults[i].locatie);
                              setMapCenter([multiScanResults[i].locatie.lat, multiScanResults[i].locatie.lng]);
                              setMapZoom(17);
                            }
                          }}
                          className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                        >
                          <div className="w-4 h-3 rounded-sm border" style={{ backgroundColor: color.fill + (isActive ? '80' : '40'), borderColor: color.stroke }} />
                          <span className={`text-xs truncate max-w-[160px] ${isActive ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{shortName}</span>
                          {multiScanResults[i] && multiScanResults[i].result.samenvatting.aandachtspunten > 0 && (
                            <span className="ml-auto text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                              {multiScanResults[i].result.samenvatting.aandachtspunten}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Atlas Leefomgeving WMS Legend */}
            {(() => {
              const activeAloLayers = [
                { id: 'alo_geluid_weg', name: 'Geluid weg (Lden)', layer: 'rivm_Geluid_lden_wegverkeer_actueel' },
                { id: 'alo_geluid_trein', name: 'Geluid trein (Lden)', layer: 'rivm_Geluid_lden_treinverkeer_actueel' },
                { id: 'alo_geluid_industrie', name: 'Geluid industrie (Lden)', layer: 'rivm_Geluid_lden_industrie_actueel' },
                { id: 'alo_geluid_alle', name: 'Geluid alle bronnen', layer: 'rivm_Geluid_lden_allebronnen_actueel' },
                { id: 'alo_no2', name: 'NO\u2082 jaargemiddelde', layer: 'rivm_jaargemiddeld_NO2_actueel' },
                { id: 'alo_pm10', name: 'PM\u2081\u2080 jaargemiddelde', layer: 'rivm_jaargemiddeld_PM10_actueel' },
                { id: 'alo_pm25', name: 'PM\u2082.\u2085 jaargemiddelde', layer: 'rivm_jaargemiddeld_PM25_actueel' },
              ].filter(l => activeLayers[l.id]);
              if (activeAloLayers.length === 0) return null;
              return (
                <div className="absolute bottom-3 right-3 z-[999]">
                  <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/10 border border-slate-200 p-3 max-w-[220px]">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
                      <Volume2 className="h-3 w-3" /> Atlas Leefomgeving
                    </div>
                    <div className="space-y-2">
                      {activeAloLayers.map(l => (
                        <div key={l.id}>
                          <div className="text-[11px] font-medium text-slate-700 mb-1">{l.name}</div>
                          <img
                            src={`https://data.rivm.nl/geo/alo/wms?service=WMS&version=1.1.1&request=GetLegendGraphic&layer=${l.layer}&format=image/png&width=180&height=20`}
                            alt={`Legenda ${l.name}`}
                            className="max-w-full h-auto rounded"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-2">Bron: RIVM Atlas Leefomgeving</div>
                  </div>
                </div>
              );
            })()}

            {/* Perceel info badge (single location) */}
            {perceelInfo && selectedLocation && uploadPercelen.length === 0 && (
              <div className="absolute bottom-3 left-3 z-[999]">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/10 border border-slate-200 px-4 py-2.5 flex items-center gap-3">
                  <div className="w-4 h-4 rounded-[4px] bg-[#1B4D3E]/15 border-2 border-[#1B4D3E] border-dashed" />
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Kadastraal perceel</div>
                    <div className="text-xs font-bold text-slate-700 font-mono">{perceelInfo}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Scanning / uploading overlay */}
            {(isScanning || isDsoUploading) && (
              <div className="absolute inset-0 bg-black/5 backdrop-blur-[3px] flex items-center justify-center z-[999]">
                <div className="bg-white/95 backdrop-blur-xl shadow-2xl shadow-black/15 rounded-3xl border border-slate-200 p-8 flex flex-col items-center gap-5 max-w-sm mx-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1B4D3E]/20 to-[#2d7a63]/20 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
                    </div>
                    <div className="absolute -inset-2 rounded-3xl border-2 border-emerald-500/15 animate-ping" style={{ animationDuration: '2s' }} />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg text-slate-900">
                      {isDsoUploading ? 'Document wordt geanalyseerd' : 'Omgevingsscan wordt uitgevoerd'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                      {isDsoUploading
                        ? 'Document wordt geüpload en door AI geanalyseerd...'
                        : scanProgress && scanProgress.total > 1
                          ? `Locatie ${scanProgress.current} van ${scanProgress.total} wordt gescand...`
                          : '90+ indicatoren worden gecontroleerd...'}
                    </p>
                  </div>
                  <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#1B4D3E] to-[#2d7a63] rounded-full transition-all duration-500" style={{ width: scanProgress && scanProgress.total > 1 ? `${(scanProgress.current / scanProgress.total) * 100}%` : '60%', animation: scanProgress && scanProgress.total > 1 ? 'none' : 'pulse 2s infinite' }} />
                  </div>
                </div>
              </div>
            )}



            {/* Location selected but not scanned */}
            {selectedLocation && !scanResult && !isScanning && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[999]">
                <div className="bg-white/95 backdrop-blur-xl shadow-lg shadow-black/10 rounded-2xl border border-slate-200 p-4 flex items-center gap-4 max-w-lg">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B4D3E]/20 to-[#2d7a63]/20 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{selectedLocation.adres}</p>
                    {perceelInfo && <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Perceel: {perceelInfo}</p>}
                  </div>
                  <Button
                    onClick={runScan}
                    size="sm"
                    className="bg-gradient-to-r from-[#1B4D3E] to-[#2d7a63] hover:from-[#164034] hover:to-[#256b56] text-white shrink-0 rounded-xl shadow-md shadow-[#1B4D3E]/20"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    Start Scan
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right panel - results */}
          {(scanResult || uploadResult) && (
            <div className="w-[520px] border-l border-slate-200 bg-white overflow-hidden flex flex-col shadow-[-8px_0_20px_rgba(0,0,0,0.08)]">
              {/* Upload result banner */}
              {uploadResult && (
                <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-blue-800 truncate">{dsoFile?.name || 'Document'}</p>
                      <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-2">
                        <span className="font-medium">{uploadResult.documentType}</span>
                        {(uploadResult as any).activiteitType && (uploadResult as any).activiteitType !== 'onbekend' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                            {(uploadResult as any).activiteitType}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">{uploadResult.documentSummary}</p>
                      {uploadResult.extractedAddress && (
                        <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1.5 bg-emerald-50 rounded-lg px-2.5 py-1.5 border border-emerald-200">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {uploadResult.geocodedLocation?.adres || uploadResult.extractedAddress}
                        </p>
                      )}
                      {multiScanResults.length > 1 && (
                        <div className="mt-2 text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5 border border-emerald-200">
                            <CheckCircle className="h-3 w-3 shrink-0" />
                            <span className="font-semibold">{multiScanResults.length} locaties gescand</span>
                          </div>
                        </div>
                      )}
                      {uploadResult.fileUrl && (
                        <a
                          href={uploadResult.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline mt-2 inline-flex items-center gap-1 font-medium"
                        >
                          Bekijk document <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => setUploadResult(null)}
                      className="text-slate-400 hover:text-slate-600 shrink-0 p-1.5 rounded-lg hover:bg-slate-100 transition-all duration-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
              {/* Multi-location tabs */}
              {multiScanResults.length > 1 && scanResult && (
                <div className="border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
                    {/* "Alle locaties" combined tab */}
                    <button
                      onClick={() => {
                        setActiveLocationIndex(-1);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                        activeLocationIndex === -1
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <Layers className="h-3 w-3 shrink-0" />
                      Alle locaties
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        activeLocationIndex === -1 ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {multiScanResults.reduce((sum, sr) => sum + sr.result.samenvatting.aandachtspunten, 0)}
                      </span>
                    </button>
                    {multiScanResults.map((sr, i) => {
                      const isActive = i === activeLocationIndex;
                      const shortName = sr.locatie.adres.split(',')[0] || `Locatie ${i + 1}`;
                      const aandacht = sr.result.samenvatting.aandachtspunten;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setActiveLocationIndex(i);
                            setScanResult(sr.result);
                            setSelectedLocation(sr.locatie);
                            setMapCenter([sr.locatie.lat, sr.locatie.lng]);
                            setMapZoom(18);
                            setSearchQuery(sr.locatie.adres);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(16,185,129,0.1)', color: isActive ? 'white' : '#059669' }}>{i + 1}</span>
                          {shortName}
                          {aandacht > 0 && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                              isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {aandacht}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Combined overview for all locations */}
              {multiScanResults.length > 1 && activeLocationIndex === -1 && (
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <CombinedOverview multiScanResults={multiScanResults} />
                </div>
              )}
              {/* Single location results */}
              {scanResult && activeLocationIndex !== -1 && (
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <IndicatorPanel scanResult={scanResult} onToggleLayer={toggleLayer} activeLayers={activeLayers} selectedTheme={selectedTheme} onExportPDF={handleExportPDF} isExporting={isExporting} />
                </div>
              )}
              {/* Fallback: single scan without multi */}
              {scanResult && multiScanResults.length <= 1 && (
                <div className="flex-1 overflow-y-auto overscroll-contain" style={{ display: multiScanResults.length > 1 ? 'none' : undefined }}>
                  <IndicatorPanel scanResult={scanResult} onToggleLayer={toggleLayer} activeLayers={activeLayers} selectedTheme={selectedTheme} onExportPDF={handleExportPDF} isExporting={isExporting} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* CSS for pulsing marker animation and enhanced popups */}
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 0.3; }
            100% { transform: scale(2.5); opacity: 0; }
          }
          .leaflet-popup-content-wrapper {
            border-radius: 20px !important;
            box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            background: #131f2b !important;
            color: #e2e8f0 !important;
            padding: 0 !important;
            overflow: hidden;
          }
          .leaflet-popup-content {
            margin: 0 !important;
            min-width: 200px;
          }
          .leaflet-popup-tip {
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            background: #131f2b !important;
          }
          .leaflet-popup-close-button {
            top: 8px !important;
            right: 8px !important;
            width: 24px !important;
            height: 24px !important;
            font-size: 18px !important;
            color: #94a3b8 !important;
            background: rgba(255,255,255,0.08) !important;
            border-radius: 8px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
          }
          .leaflet-popup-close-button:hover {
            color: #e2e8f0 !important;
            background: rgba(255,255,255,0.15) !important;
          }
          /* Smooth transitions for panel */
          .results-panel-enter {
            animation: slideInRight 0.3s ease-out;
          }
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          /* Subtle map overlay for better contrast with GIS features */
          .gis-dark-overlay .leaflet-tile-pane {
            filter: brightness(0.92) saturate(0.85);
          }
          .gis-dark-overlay .leaflet-overlay-pane {
            filter: saturate(1.1);
          }
          /* Theme floating label styling */
          .theme-floating-label {
            background: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          .theme-floating-label > div {
            animation: labelFadeIn 0.5s ease-out;
          }
          @keyframes labelFadeIn {
            from { opacity: 0; transform: translateY(10px) scale(0.9); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}
