/**
 * PDF Generator Service - Behandelrapport generatie
 * 
 * Genereert professionele PDF behandelrapporten volgens de Policy Assist
 * 7-stappen juridische filtermethodiek.
 */

import { AnalysisResult, UitgeslotenBeleid } from './gemini';

/**
 * Genereer HTML voor het behandelrapport met 7-stappen methodiek
 */
export function generateReportHTML(
  result: AnalysisResult,
  gemeenteNaam: string,
  behandelaarNaam: string
): string {
  const procedureLabels: Record<string, string> = {
    'VERGUNNINGVRIJ': 'Vergunningvrij',
    'REGULIER': 'Reguliere procedure (8 weken)',
    'BOPA_REGULIER': 'BOPA Regulier (8 weken)',
    'BOPA_UITGEBREID': 'BOPA Uitgebreid (26 weken)',
  };

  const prioriteitKleuren: Record<string, string> = {
    'hoog': '#dc2626',
    'middel': '#f59e0b',
    'laag': '#22c55e',
  };

  const juridischeStatusLabels: Record<string, string> = {
    'normstellend': 'Normstellend (bindend)',
    'richtinggevend': 'Richtinggevend',
    'afwegingskader': 'Afwegingskader',
  };

  // Stap 0: Aanvraag samenvatting (specifieke bouwactiviteit)
  const bouwactiviteitTypeLabels: Record<string, string> = {
    'nieuwbouw': 'Nieuwbouw',
    'uitbreiding': 'Uitbreiding/Aanbouw',
    'verbouwing': 'Verbouwing',
    'dakkapel': 'Dakkapel',
    'bijgebouw': 'Bijgebouw/Schuur',
    'aanbouw': 'Aanbouw',
    'opbouw': 'Opbouw',
    'overig': 'Overige bouwactiviteit',
  };

  const aanvraagSamenvattingHTML = result.aanvraagSamenvatting ? `
    <h2>De Aanvraag</h2>
    <div class="aanvraag-box">
      <div class="aanvraag-header">
        <span class="badge badge-blue">${bouwactiviteitTypeLabels[result.aanvraagSamenvatting.bouwactiviteitType] || result.aanvraagSamenvatting.bouwactiviteitType}</span>
      </div>
      <div class="aanvraag-beschrijving">
        <p style="font-size: 16px; margin: 12px 0;"><strong>${result.aanvraagSamenvatting.bouwactiviteitOmschrijving}</strong></p>
      </div>
      <div class="aanvraag-details">
        ${result.aanvraagSamenvatting.geschatteAfmetingen?.oppervlakteM2 ? `
          <div class="detail-item">
            <span class="label">Oppervlakte:</span>
            <span>${result.aanvraagSamenvatting.geschatteAfmetingen.oppervlakteM2} m²</span>
          </div>
        ` : ''}
        ${result.aanvraagSamenvatting.geschatteAfmetingen?.breedteM && result.aanvraagSamenvatting.geschatteAfmetingen?.diepteM ? `
          <div class="detail-item">
            <span class="label">Afmetingen (B x D):</span>
            <span>${result.aanvraagSamenvatting.geschatteAfmetingen.breedteM} x ${result.aanvraagSamenvatting.geschatteAfmetingen.diepteM} m</span>
          </div>
        ` : ''}
        ${result.aanvraagSamenvatting.geschatteAfmetingen?.hoogteM ? `
          <div class="detail-item">
            <span class="label">Hoogte:</span>
            <span>${result.aanvraagSamenvatting.geschatteAfmetingen.hoogteM} m</span>
          </div>
        ` : ''}
        ${result.aanvraagSamenvatting.locatieOpPerceel ? `
          <div class="detail-item">
            <span class="label">Locatie op perceel:</span>
            <span>${result.aanvraagSamenvatting.locatieOpPerceel}</span>
          </div>
        ` : ''}
        ${result.aanvraagSamenvatting.beoogdGebruik ? `
          <div class="detail-item">
            <span class="label">Beoogd gebruik:</span>
            <span>${result.aanvraagSamenvatting.beoogdGebruik}</span>
          </div>
        ` : ''}
        ${result.aanvraagSamenvatting.afmetingenBron ? `
          <div class="detail-item">
            <span class="label">Bron afmetingen:</span>
            <span class="badge badge-gray">${result.aanvraagSamenvatting.afmetingenBron}</span>
          </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  // Stap 0b: Omgevingsplan toets
  const planStatusLabels: Record<string, string> = {
    'vastgesteld': 'Vastgesteld',
    'ontwerp': 'Ontwerp',
    'bruidsschat': 'Bruidsschat (overgangsrecht)',
  };

  const omgevingsplanToetsHTML = result.omgevingsplanToets ? `
    <h2>Toets aan het Omgevingsplan</h2>
    <div class="omgevingsplan-box ${result.omgevingsplanToets.passenBinnenBestemming ? 'past-binnen' : 'past-niet'}">
      <div class="plan-header">
        <div class="plan-naam">
          <strong>${result.omgevingsplanToets.planNaam}</strong>
          <span class="plan-status">${planStatusLabels[result.omgevingsplanToets.planStatus] || result.omgevingsplanToets.planStatus}</span>
        </div>
        <div class="conclusie-badge ${result.omgevingsplanToets.passenBinnenBestemming ? 'badge-green' : 'badge-yellow'}">
          ${result.omgevingsplanToets.passenBinnenBestemming ? '✓ Past binnen bestemming' : '⚠ Afwijking nodig'}
        </div>
      </div>
      
      <div class="plan-details">
        <div class="detail-row">
          <span class="label">Geldende bestemming:</span>
          <span class="value"><strong>${result.omgevingsplanToets.geldendeBestemming}</strong></span>
        </div>
        ${result.omgevingsplanToets.toegestaanGebruik && result.omgevingsplanToets.toegestaanGebruik.length > 0 ? `
          <div class="detail-row">
            <span class="label">Toegestaan gebruik:</span>
            <span class="value">${result.omgevingsplanToets.toegestaanGebruik.join(', ')}</span>
          </div>
        ` : ''}
      </div>
      
      ${result.omgevingsplanToets.bouwregels && (result.omgevingsplanToets.bouwregels.maxBouwhoogte || result.omgevingsplanToets.bouwregels.maxGoothoogte || result.omgevingsplanToets.bouwregels.maxBebouwingspercentage) ? `
        <div class="bouwregels-section">
          <h4>Bouwregels</h4>
          <div class="bouwregels-grid">
            ${result.omgevingsplanToets.bouwregels.maxBouwhoogte ? `
              <div class="bouwregel-item">
                <span class="regel-label">Max. bouwhoogte</span>
                <span class="regel-waarde">${result.omgevingsplanToets.bouwregels.maxBouwhoogte}</span>
              </div>
            ` : ''}
            ${result.omgevingsplanToets.bouwregels.maxGoothoogte ? `
              <div class="bouwregel-item">
                <span class="regel-label">Max. goothoogte</span>
                <span class="regel-waarde">${result.omgevingsplanToets.bouwregels.maxGoothoogte}</span>
              </div>
            ` : ''}
            ${result.omgevingsplanToets.bouwregels.maxBebouwingspercentage ? `
              <div class="bouwregel-item">
                <span class="regel-label">Max. bebouwing</span>
                <span class="regel-waarde">${result.omgevingsplanToets.bouwregels.maxBebouwingspercentage}</span>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
      
      ${result.omgevingsplanToets.afwijkingNodig ? `
        <div class="afwijking-section">
          <h4>⚠ Afwijking van het omgevingsplan</h4>
          <div class="afwijking-details">
            <div class="afwijking-type">
              <span class="badge ${result.omgevingsplanToets.afwijkingType === 'binnenplans' ? 'badge-blue' : 'badge-yellow'}">
                ${result.omgevingsplanToets.afwijkingType === 'binnenplans' ? 'Binnenplanse afwijking' : 
                  result.omgevingsplanToets.afwijkingType === 'buitenplans_regulier' ? 'BOPA Regulier' : 
                  result.omgevingsplanToets.afwijkingType === 'buitenplans_uitgebreid' ? 'BOPA Uitgebreid' : 'Geen afwijking'}
              </span>
            </div>
            ${result.omgevingsplanToets.afwijkingMotivering ? `
              <p class="afwijking-motivering">${result.omgevingsplanToets.afwijkingMotivering}</p>
            ` : ''}
          </div>
        </div>
      ` : ''}
      
      ${result.omgevingsplanToets.dubbelbestemmingen && result.omgevingsplanToets.dubbelbestemmingen.length > 0 ? `
        <div class="dubbelbestemmingen-section">
          <h4>⚠ Dubbelbestemmingen</h4>
          <p class="warning-text">Bij dubbelbestemmingen is advies van de betreffende instantie vereist!</p>
          <div class="dubbelbestemmingen-grid">
            ${result.omgevingsplanToets.dubbelbestemmingen.map(db => `
              <div class="dubbelbestemming-card ${db.type.toLowerCase().includes('archeologie') ? 'type-archeologie' : db.type.toLowerCase().includes('water') ? 'type-water' : 'type-overig'}">
                <div class="db-header">
                  <span class="db-naam">${db.naam}</span>
                  ${db.artikelNummer ? `<span class="db-artikel">Art. ${db.artikelNummer}</span>` : ''}
                </div>
                ${db.adviesInstantie ? `
                  <div class="db-advies">
                    <span class="label">Adviesinstantie:</span>
                    <span class="value">${db.adviesInstantie}</span>
                  </div>
                ` : ''}
                ${db.aandachtspunten && db.aandachtspunten.length > 0 ? `
                  <ul class="db-aandachtspunten">
                    ${db.aandachtspunten.map(punt => `<li>${punt}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${result.omgevingsplanToets.gebiedsaanduidingen && result.omgevingsplanToets.gebiedsaanduidingen.length > 0 ? `
        <div class="gebiedsaanduidingen-section">
          <h4>Gebiedsaanduidingen</h4>
          <table class="gebiedsaanduidingen-table">
            <thead>
              <tr>
                <th>Naam</th>
                <th>Type</th>
                <th>Artikel</th>
              </tr>
            </thead>
            <tbody>
              ${result.omgevingsplanToets.gebiedsaanduidingen.map(ga => `
                <tr>
                  <td>${ga.naam}</td>
                  <td>${ga.type}</td>
                  <td>${ga.artikelNummer || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      ${result.omgevingsplanToets.relevantePlanregels && result.omgevingsplanToets.relevantePlanregels.length > 0 ? `
        <div class="planregels-section">
          <h4>Relevante planregels</h4>
          <table class="planregels-table">
            <thead>
              <tr>
                <th>Artikel</th>
                <th>Inhoud</th>
                <th>Conclusie</th>
                <th style="width: 60px;">Bron</th>
              </tr>
            </thead>
            <tbody>
              ${result.omgevingsplanToets.relevantePlanregels.map(regel => {
                // Genereer link naar ruimtelijkeplannen.nl of omgevingsloket
                const bronUrl = regel.bronUrl || (regel.planId 
                  ? `https://www.ruimtelijkeplannen.nl/viewer/view?planidn=${regel.planId}`
                  : `https://omgevingswet.overheid.nl/regels-op-de-kaart`);
                return `
                <tr>
                  <td>
                    <a href="${bronUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none; font-weight: 500;" title="Bekijk in bron">
                      ${regel.artikel}
                      <span style="font-size: 10px; vertical-align: super;">🔗</span>
                    </a>
                  </td>
                  <td>${regel.inhoud}</td>
                  <td>
                    <span class="conclusie-label ${regel.conclusie === 'voldoet' ? 'voldoet' : regel.conclusie === 'voldoet_niet' ? 'voldoet-niet' : 'nader-onderzoek'}">
                      ${regel.conclusie === 'voldoet' ? '✓ Voldoet' : regel.conclusie === 'voldoet_niet' ? '✗ Voldoet niet' : '? Nader onderzoek'}
                    </span>
                  </td>
                  <td style="text-align: center;">
                    <a href="${bronUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #eff6ff; border-radius: 4px; color: #2563eb; text-decoration: none;" title="Open in Ruimtelijkeplannen.nl">
                      ↗
                    </a>
                  </td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
          <p style="margin-top: 8px; font-size: 11px; color: #6b7280;">
            <span style="color: #2563eb;">🔗</span> Klik op een artikelnummer om de volledige tekst te bekijken in Ruimtelijkeplannen.nl
          </p>
        </div>
      ` : ''}
    </div>
  ` : '';

  // Stap 1: Locatie analyse HTML
  const locatieHTML = result.locatieAnalyse ? `
    <h2>Stap 1: Locatie Analyse</h2>
    <div class="info-grid">
      <div class="info-item">
        <strong>Adres:</strong> ${result.locatieAnalyse.adres || 'Niet opgegeven'}
      </div>
      ${result.locatieAnalyse.kadastraalObject ? `
        <div class="info-item">
          <strong>Kadastraal object:</strong> ${result.locatieAnalyse.kadastraalObject}
        </div>
      ` : ''}
      ${result.locatieAnalyse.omgevingsplanGebied ? `
        <div class="info-item">
          <strong>Omgevingsplan gebied:</strong> ${result.locatieAnalyse.omgevingsplanGebied}
        </div>
      ` : ''}
      ${result.locatieAnalyse.bestemmingHuidig ? `
        <div class="info-item">
          <strong>Huidige bestemming:</strong> ${result.locatieAnalyse.bestemmingHuidig}
        </div>
      ` : ''}
      ${result.locatieAnalyse.bijzondereGebieden && result.locatieAnalyse.bijzondereGebieden.length > 0 ? `
        <div class="info-item full-width">
          <strong>Bijzondere gebieden:</strong>
          <ul style="margin: 4px 0 0 20px;">
            ${result.locatieAnalyse.bijzondereGebieden.map(g => `<li>${g}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  ` : '';

  // Stap 2: Procedure bepaling HTML
  const procedureHTML = result.procedureBepaling ? `
    <h2>Stap 2: Procedure Bepaling</h2>
    <div class="procedure-box">
      <div class="procedure-header">
        <span class="badge ${result.procedureBepaling.isVergunningvrij ? 'badge-green' : result.procedureBepaling.isBOPA ? 'badge-yellow' : 'badge-blue'}">
          ${procedureLabels[result.procedureBepaling.procedureType]}
        </span>
        <span class="termijn">Termijn: ${result.procedureBepaling.procedureTermijn} weken</span>
      </div>
      <div class="procedure-details">
        <div class="detail-item">
          <span class="label">Binnenplans:</span>
          <span class="${result.procedureBepaling.isBinnenplans ? 'yes' : 'no'}">${result.procedureBepaling.isBinnenplans ? 'Ja' : 'Nee'}</span>
        </div>
        <div class="detail-item">
          <span class="label">BOPA:</span>
          <span class="${result.procedureBepaling.isBOPA ? 'yes' : 'no'}">${result.procedureBepaling.isBOPA ? 'Ja' : 'Nee'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Vergunningvrij:</span>
          <span class="${result.procedureBepaling.isVergunningvrij ? 'yes' : 'no'}">${result.procedureBepaling.isVergunningvrij ? 'Ja' : 'Nee'}</span>
        </div>
      </div>
      <div class="motivering">
        <strong>Motivering:</strong> ${result.procedureBepaling.motivering}
      </div>
    </div>
  ` : `
    <h2>Procedure Bepaling</h2>
    <div style="display: flex; gap: 16px; align-items: center; margin: 16px 0;">
      <span class="badge ${result.isVergunningvrij ? 'badge-green' : 'badge-blue'}">
        ${procedureLabels[result.procedureType]}
      </span>
      <span style="color: #6b7280;">Termijn: ${result.procedureTermijn} weken</span>
    </div>
  `;

  // Stap 3: Activiteiten analyse HTML
  const activiteitenHTML = result.activiteitenAnalyse ? `
    <h2>Stap 3: Activiteiten Analyse</h2>
    <div class="activiteiten-box">
      <div class="activiteit-section">
        <strong>Expliciete activiteiten (DSO):</strong>
        <ul>
          ${result.activiteitenAnalyse.expliciet.map(a => `<li>${a}</li>`).join('')}
        </ul>
      </div>
      ${result.activiteitenAnalyse.impliciet.length > 0 ? `
        <div class="activiteit-section warning">
          <strong>⚠️ Gedetecteerde impliciete activiteiten:</strong>
          <ul>
            ${result.activiteitenAnalyse.impliciet.map(a => `<li>${a}</li>`).join('')}
          </ul>
          <p class="note">Let op: Deze activiteiten zijn niet expliciet aangevraagd maar vloeien voort uit de aanvraag.</p>
        </div>
      ` : ''}
    </div>
  ` : '';

  // Stap 4 & 5: Toetsingskaders met juridische status
  const toetsingskadersHTML = result.toetsingskaders
    .filter(t => t.relevant)
    .map(t => {
      const conceptLabel = t.isConceptDocument 
        ? '<span class="concept-label">CONCEPT</span>'
        : '';
      const juridischeStatusLabel = t.juridischeStatus 
        ? `<span class="juridische-status ${t.juridischeStatus}">${juridischeStatusLabels[t.juridischeStatus] || t.juridischeStatus}</span>`
        : '';
      const bindendLabel = t.isBindend 
        ? '<span class="bindend-label">Bindend</span>'
        : '';
      
      return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
          ${t.naam}${conceptLabel}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-transform: capitalize;">${t.laag}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${juridischeStatusLabel}${bindendLabel}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${t.toelichting}</td>
      </tr>
    `;
    }).join('');

  // Stap 6: Tweezijdige werking check (alleen bij BOPA)
  const tweezijdigeWerkingHTML = result.tweezijdigeWerkingCheck && result.tweezijdigeWerkingCheck.isRelevant ? `
    <h2>Stap 6: Tweezijdige Werking Check</h2>
    <div class="tweezijdige-box ${result.tweezijdigeWerkingCheck.vernietigingsrisico}">
      <div class="risico-header">
        <span class="risico-label">Vernietigingsrisico:</span>
        <span class="risico-badge ${result.tweezijdigeWerkingCheck.vernietigingsrisico}">
          ${result.tweezijdigeWerkingCheck.vernietigingsrisico.toUpperCase()}
        </span>
      </div>
      ${result.tweezijdigeWerkingCheck.beschermdeFuncties.length > 0 ? `
        <div class="functies-section">
          <strong>Beschermde functies:</strong>
          <table class="functies-table">
            <thead>
              <tr>
                <th>Functie</th>
                <th>Type</th>
                <th>Beschermd door</th>
              </tr>
            </thead>
            <tbody>
              ${result.tweezijdigeWerkingCheck.beschermdeFuncties.map(f => `
                <tr>
                  <td>${f.functie}</td>
                  <td><span class="functie-type ${f.type}">${f.type === 'nieuw' ? 'Nieuwe functie' : 'Bestaande functie'}</span></td>
                  <td>${f.beschermdDoor}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      <div class="toelichting">
        <strong>Toelichting:</strong> ${result.tweezijdigeWerkingCheck.toelichting}
      </div>
    </div>
  ` : '';

  // Stap 7: Uitgesloten beleid met motivering
  const uitgeslotenBeleidHTML = result.uitgeslotenBeleid && result.uitgeslotenBeleid.length > 0 ? `
    <h2>Stap 7: Niet-Relevant Beleid (Gemotiveerd Uitgesloten)</h2>
    <p class="section-intro">De volgende beleidsdocumenten zijn expliciet uitgesloten met juridische motivering. Dit versterkt het besluit en voorkomt discussies in bezwaar.</p>
    <table>
      <thead>
        <tr>
          <th>Beleidsdocument</th>
          <th>Laag</th>
          <th>Reden uitsluiting</th>
          <th>Juridische motivering</th>
        </tr>
      </thead>
      <tbody>
        ${result.uitgeslotenBeleid.map((u: UitgeslotenBeleid) => `
          <tr class="uitgesloten-row">
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${u.naam}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-transform: capitalize;">${u.laag}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${u.redenUitsluiting}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-style: italic;">${u.juridischeMotivering}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  const adviseursHTML = result.adviseurs.map(a => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${a.adviseurNaam}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${a.categorie}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${a.type === 'extern' ? 'Extern' : 'Intern'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${a.isVerplicht ? 'Ja' : 'Nee'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${a.termijnWeken} weken</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${a.juridischeStatus || '-'}</td>
    </tr>
  `).join('');

  const aandachtspuntenHTML = result.aandachtspunten.map(a => {
    const juridischRisicoLabel = a.juridischRisico 
      ? '<span class="juridisch-risico">⚠️ Juridisch risico</span>'
      : '';
    return `
    <div style="padding: 12px; margin-bottom: 8px; background: #f9fafb; border-radius: 6px; border-left: 4px solid ${prioriteitKleuren[a.prioriteit]};">
      <div style="font-weight: 600; margin-bottom: 4px;">${a.categorie} ${juridischRisicoLabel}</div>
      <div style="color: #4b5563;">${a.beschrijving}</div>
      <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Prioriteit: ${a.prioriteit}</div>
    </div>
  `;
  }).join('');

  // Vergunning Beslisboom Resultaat sectie
  const beslisboomHTML = result.beslisboomResultaat ? `
    <h2>Vergunning Beslisboom Analyse</h2>
    <div style="background: ${result.beslisboomResultaat.conclusie === 'vergunningvrij' ? '#dcfce7' : result.beslisboomResultaat.conclusie === 'meldingsplichtig' ? '#fef3c7' : '#fee2e2'}; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 4px solid ${result.beslisboomResultaat.conclusie === 'vergunningvrij' ? '#22c55e' : result.beslisboomResultaat.conclusie === 'meldingsplichtig' ? '#f59e0b' : '#dc2626'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <span style="font-size: 28px;">${result.beslisboomResultaat.conclusie === 'vergunningvrij' ? '✓' : result.beslisboomResultaat.conclusie === 'meldingsplichtig' ? '📋' : '📝'}</span>
        <div>
          <div style="font-size: 20px; font-weight: 700; color: ${result.beslisboomResultaat.conclusie === 'vergunningvrij' ? '#166534' : result.beslisboomResultaat.conclusie === 'meldingsplichtig' ? '#92400e' : '#991b1b'};">
            ${result.beslisboomResultaat.conclusie.toUpperCase()}
          </div>
          <div style="font-size: 14px; color: #6b7280;">
            ${result.beslisboomResultaat.juridischeGrondslag}
          </div>
        </div>
      </div>
      
      <div style="background: white; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0; line-height: 1.6;">${result.beslisboomResultaat.rapportageTekst}</p>
      </div>
      
      ${result.beslisboomResultaat.isOverride ? `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
          <strong>⚠️ Override toegepast</strong>
          <p style="margin: 8px 0 0 0;"><strong>Reden:</strong> ${result.beslisboomResultaat.overrideReden || 'Expliciete uitzondering op vergunningvrijstelling'}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #3b82f6; font-style: italic;">⚖️ Bron: ${result.beslisboomResultaat.overrideBron}</p>
        </div>
      ` : ''}
      
      ${result.beslisboomResultaat.beschermingsregimesContext.length > 0 ? `
        <div style="margin-bottom: 16px;">
          <strong>Beschermingsregimes (context - wijzigen conclusie niet):</strong>
          <ul style="margin: 8px 0 0 20px;">
            ${result.beslisboomResultaat.beschermingsregimesContext.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${result.beslisboomResultaat.beschermingsregimesDoorslaggevend.length > 0 ? `
        <div style="background: #fee2e2; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
          <strong>⚠️ Beschermingsregimes (doorslaggevend):</strong>
          <ul style="margin: 8px 0 0 20px;">
            ${result.beslisboomResultaat.beschermingsregimesDoorslaggevend.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <details style="margin-top: 16px;">
        <summary style="cursor: pointer; font-weight: 600; color: #4b5563;">Doorlopen beslisboom stappen (${result.beslisboomResultaat.stappen.length})</summary>
        <div style="background: #f9fafb; border-radius: 6px; padding: 12px; margin-top: 8px;">
          ${result.beslisboomResultaat.stappen.map(s => `
            <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: 600; color: #374151;">Stap ${s.stap}: ${s.titel}</div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 4px;"><strong>Vraag:</strong> ${s.vraag}</div>
              <div style="font-size: 13px; color: #374151; margin-top: 2px;"><strong>Antwoord:</strong> ${s.antwoord}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px; font-style: italic;">${s.toelichting}</div>
            </div>
          `).join('')}
        </div>
      </details>
    </div>
  ` : '';

  // Graafwerk analyse sectie
  const graafwerkHTML = result.graafwerkAnalyse ? `
    <h2>Graafwerk Analyse</h2>
    <div style="background: ${result.graafwerkAnalyse.heeftGraafwerk ? '#fef3c7' : '#dcfce7'}; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${result.graafwerkAnalyse.heeftGraafwerk ? '#f59e0b' : '#22c55e'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.graafwerkAnalyse.heeftGraafwerk ? '🔨' : '✓'}</span>
        <strong>${result.graafwerkAnalyse.heeftGraafwerk ? 'Graafwerk gedetecteerd' : 'Geen graafwerk gedetecteerd'}</strong>
        <span class="badge ${result.graafwerkAnalyse.zekerheid === 'hoog' ? 'badge-green' : result.graafwerkAnalyse.zekerheid === 'middel' ? 'badge-yellow' : 'badge-blue'}">
          Zekerheid: ${result.graafwerkAnalyse.zekerheid}
        </span>
      </div>
      ${result.graafwerkAnalyse.heeftGraafwerk ? `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;">
          <div style="background: white; padding: 12px; border-radius: 6px;">
            <div style="color: #6b7280; font-size: 12px;">Graafdiepte (${result.graafwerkAnalyse.diepteBron === 'formulier' ? 'uit aanvraagformulier' : 'schatting'})</div>
            <div style="font-size: 20px; font-weight: 600;">${result.graafwerkAnalyse.graafdiepteCm} cm</div>
          </div>
          <div style="background: white; padding: 12px; border-radius: 6px;">
            <div style="color: #6b7280; font-size: 12px;">Oppervlakte (${result.graafwerkAnalyse.oppervlakteBron === 'formulier' ? 'uit aanvraagformulier' : 'schatting'})</div>
            <div style="font-size: 20px; font-weight: 600;">${result.graafwerkAnalyse.oppervlakteM2} m²</div>
          </div>
        </div>
        ${result.graafwerkAnalyse.realiteitscheck?.waarschuwingen?.length ? `
          <div style="background: #fff7ed; border: 1px solid #f97316; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
            <strong style="color: #9a3412;">⚠️ Aandachtspunten graafdiepte:</strong>
            <ul style="margin: 4px 0 0 20px; color: #9a3412;">
              ${result.graafwerkAnalyse.realiteitscheck.waarschuwingen.map((w: string) => `<li>${w}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${(result.graafwerkAnalyse as any).consequenties?.length ? `
          <div style="margin-bottom: 12px;">
            <strong>Consequenties graafwerk:</strong>
            ${((result.graafwerkAnalyse as any).consequenties as Array<{type: string; verplicht: boolean; wettelijkeBasis: string; toelichting: string; actie: string}>).map(c => `
              <div style="background: ${c.verplicht ? '#fef2f2' : '#fffbeb'}; border-left: 4px solid ${c.verplicht ? '#dc2626' : '#f59e0b'}; padding: 12px; border-radius: 0 6px 6px 0; margin-top: 8px;">
                <div style="font-weight: 600; color: ${c.verplicht ? '#991b1b' : '#92400e'};">
                  ${c.verplicht ? '🔴 VERPLICHT' : '🟡 AANDACHTSPUNT'}: ${c.type}
                </div>
                <p style="margin: 4px 0; font-size: 13px;">${c.toelichting}</p>
                <p style="margin: 4px 0; font-size: 12px; color: #6b7280;"><strong>Wettelijke basis:</strong> ${c.wettelijkeBasis}</p>
                <p style="margin: 4px 0; font-size: 12px; color: #374151;"><strong>Actie:</strong> ${c.actie}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
        <div style="margin-bottom: 12px;">
          <strong>Indicatoren:</strong>
          <ul style="margin: 4px 0 0 20px;">
            ${result.graafwerkAnalyse.indicatoren.map(i => `<li>${i}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      <p style="margin: 0; color: #4b5563;">${result.graafwerkAnalyse.toelichting}</p>
      ${result.graafwerkAnalyse.vrijstellingsCheck ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.1);">
          <strong>Archeologische vrijstellingscheck:</strong>
          <div style="background: ${result.graafwerkAnalyse.vrijstellingsCheck.onderzoekVerplicht ? '#fee2e2' : '#dcfce7'}; padding: 12px; border-radius: 6px; margin-top: 8px;">
            <div style="font-weight: 600; color: ${result.graafwerkAnalyse.vrijstellingsCheck.onderzoekVerplicht ? '#991b1b' : '#166534'}; font-size: 16px;">
              ${result.graafwerkAnalyse.vrijstellingsCheck.onderzoekVerplicht ? '⚠️ Archeologisch onderzoek VERPLICHT' : '✓ Vrijstelling van toepassing'}
            </div>
            <p style="margin: 8px 0 0 0; font-size: 14px;">${result.graafwerkAnalyse.vrijstellingsCheck.reden}</p>
            
            <!-- Visuele vergelijking tabel -->
            <table style="margin-top: 12px; width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: rgba(0,0,0,0.05);">
                  <th style="padding: 8px; text-align: left; font-weight: 600;">Parameter</th>
                  <th style="padding: 8px; text-align: center; font-weight: 600;">Aanvraag</th>
                  <th style="padding: 8px; text-align: center; font-weight: 600;">Vrijstellingsgrens</th>
                  <th style="padding: 8px; text-align: center; font-weight: 600;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.1);">Graafdiepte</td>
                  <td style="padding: 8px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.1); font-weight: 600;">${result.graafwerkAnalyse.graafdiepteCm} cm</td>
                  <td style="padding: 8px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.1);">≤ ${result.graafwerkAnalyse.vrijstellingsCheck.vrijstellingsgrenzen.diepteCm} cm</td>
                  <td style="padding: 8px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <span style="color: ${result.graafwerkAnalyse.graafdiepteCm <= result.graafwerkAnalyse.vrijstellingsCheck.vrijstellingsgrenzen.diepteCm ? '#166534' : '#991b1b'}; font-weight: 600;">
                      ${result.graafwerkAnalyse.graafdiepteCm <= result.graafwerkAnalyse.vrijstellingsCheck.vrijstellingsgrenzen.diepteCm ? '✓ OK' : '✗ Overschreden'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.1);">Oppervlakte</td>
                  <td style="padding: 8px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.1); font-weight: 600;">${result.graafwerkAnalyse.oppervlakteM2} m²</td>
                  <td style="padding: 8px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.1);">≤ ${result.graafwerkAnalyse.vrijstellingsCheck.vrijstellingsgrenzen.oppervlakteM2} m²</td>
                  <td style="padding: 8px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <span style="color: ${result.graafwerkAnalyse.oppervlakteM2 <= result.graafwerkAnalyse.vrijstellingsCheck.vrijstellingsgrenzen.oppervlakteM2 ? '#166534' : '#991b1b'}; font-weight: 600;">
                      ${result.graafwerkAnalyse.oppervlakteM2 <= result.graafwerkAnalyse.vrijstellingsCheck.vrijstellingsgrenzen.oppervlakteM2 ? '✓ OK' : '✗ Overschreden'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <p style="margin: 12px 0 0 0; font-size: 12px; color: #6b7280;">
              <strong>Bron vrijstellingsgrenzen:</strong> ${result.graafwerkAnalyse.vrijstellingsCheck.vrijstellingsgrenzen.bron}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af; font-style: italic;">
              Let op: Archeologisch onderzoek is verplicht als BEIDE grenzen worden overschreden.
            </p>
          </div>
        </div>
      ` : ''}
    </div>
  ` : '';

  // Volledigheidscheck sectie
  const volledigheidsHTML = result.volledigheidscheck ? `
    <h2>Volledigheidscheck Aanvraag</h2>
    <div style="background: ${result.volledigheidscheck.isVolledig ? '#dcfce7' : '#fee2e2'}; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${result.volledigheidscheck.isVolledig ? '#22c55e' : '#dc2626'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.volledigheidscheck.isVolledig ? '✓' : '⚠️'}</span>
        <strong style="color: ${result.volledigheidscheck.isVolledig ? '#166534' : '#991b1b'};">
          ${result.volledigheidscheck.isVolledig ? 'Aanvraag is volledig' : 'Aanvraag is ONVOLLEDIG'}
        </strong>
      </div>
      <p style="margin: 0 0 12px 0; color: #4b5563;">${result.volledigheidscheck.aiToelichting}</p>
      ${result.volledigheidscheck.ontbrekendeStukken.length > 0 ? `
        <div style="background: white; border-radius: 6px; padding: 12px; margin-top: 12px;">
          <strong>Ontbrekende documenten (${result.volledigheidscheck.ontbrekendeStukken.length}):</strong>
          <table style="margin-top: 8px;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 8px; background: #f9fafb;">Document</th>
                <th style="text-align: left; padding: 8px; background: #f9fafb;">Wettelijke grondslag</th>
              </tr>
            </thead>
            <tbody>
              ${result.volledigheidscheck.ontbrekendeStukken.map(s => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                    <strong>${s.document}</strong>
                    <div style="font-size: 12px; color: #6b7280;">${s.toelichting}</div>
                  </td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #3b82f6; font-style: italic;">
                    ⚖️ ${s.wettelijkeBasis}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      ${result.volledigheidscheck.aanbevelingen.length > 0 ? `
        <div style="margin-top: 12px;">
          <strong>Aanbevelingen:</strong>
          <ul style="margin: 4px 0 0 20px;">
            ${result.volledigheidscheck.aanbevelingen.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  ` : '';

  // DSO Vergunningcheck sectie (officiële API resultaten)
  const dsoVergunningcheckHTML = result.dsoVergunningcheck ? `
    <h2>DSO Vergunningcheck (Officiële API)</h2>
    <div style="background: ${result.dsoVergunningcheck.samenvattingConclusie === 'vergunningvrij' ? '#dcfce7' : result.dsoVergunningcheck.samenvattingConclusie === 'vergunningplicht' ? '#fee2e2' : result.dsoVergunningcheck.samenvattingConclusie === 'meldingsplicht' ? '#fef3c7' : '#f3f4f6'}; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${result.dsoVergunningcheck.samenvattingConclusie === 'vergunningvrij' ? '#22c55e' : result.dsoVergunningcheck.samenvattingConclusie === 'vergunningplicht' ? '#dc2626' : result.dsoVergunningcheck.samenvattingConclusie === 'meldingsplicht' ? '#f59e0b' : '#9ca3af'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.dsoVergunningcheck.samenvattingConclusie === 'vergunningvrij' ? '✓' : result.dsoVergunningcheck.samenvattingConclusie === 'vergunningplicht' ? '⚠️' : result.dsoVergunningcheck.samenvattingConclusie === 'meldingsplicht' ? '📝' : '❓'}</span>
        <strong style="font-size: 18px;">${{
          'vergunningvrij': 'Vergunningvrij',
          'vergunningplicht': 'Vergunningplichtig',
          'meldingsplicht': 'Meldingsplichtig',
          'gemengd': 'Gemengde conclusie',
          'onbekend': 'Conclusie onbekend'
        }[result.dsoVergunningcheck.samenvattingConclusie]}</strong>
      </div>
      <p style="margin: 0 0 16px 0;">${result.dsoVergunningcheck.samenvattingToelichting}</p>
    </div>
    
    ${result.dsoVergunningcheck.conclusies.length > 0 ? `
      <h3>Conclusies per activiteit</h3>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Omschrijving</th>
            <th>Activiteiten</th>
            <th>Juridische grondslag</th>
          </tr>
        </thead>
        <tbody>
          ${result.dsoVergunningcheck.conclusies.map(c => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                <span class="badge ${c.type === 'vergunningvrij' ? 'badge-green' : c.type === 'vergunningplicht' ? 'badge-yellow' : 'badge-blue'}">
                  ${c.type}
                </span>
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${c.omschrijving}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${c.activiteiten.join(', ') || '-'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-style: italic;">${c.juridischeGrondslag || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    
    ${result.dsoVergunningcheck.bevoegdGezag && result.dsoVergunningcheck.bevoegdGezag.length > 0 ? `
      <h3>Bevoegd gezag</h3>
      <ul>
        ${result.dsoVergunningcheck.bevoegdGezag.map(bg => `<li><strong>${bg.naam}</strong> (OIN: ${bg.oin})</li>`).join('')}
      </ul>
    ` : ''}
    
    ${result.dsoVergunningcheck.behandeldienst ? `
      <p><strong>Behandeldienst:</strong> ${result.dsoVergunningcheck.behandeldienst.naam} (OIN: ${result.dsoVergunningcheck.behandeldienst.oin})</p>
    ` : ''}
    
    ${result.dsoVergunningcheck.indieningsvereisten.length > 0 ? `
      <h3>DSO Indieningsvereisten</h3>
      <table>
        <thead>
          <tr>
            <th>Document</th>
            <th>Omschrijving</th>
            <th>Verplicht</th>
          </tr>
        </thead>
        <tbody>
          ${result.dsoVergunningcheck.indieningsvereisten.map(iv => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${iv.naam}</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${iv.omschrijving}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${iv.verplicht ? '✅ Ja' : 'Nee'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    
    ${result.dsoVergunningcheck.openVragen && result.dsoVergunningcheck.openVragen.length > 0 ? `
      <h3>⚠️ Open vragen (beantwoording vereist)</h3>
      <div style="background: #fef3c7; padding: 16px; border-radius: 6px;">
        ${result.dsoVergunningcheck.openVragen.map(v => `
          <div style="margin-bottom: 12px;">
            <strong>${v.vraagTekst}</strong>
            ${v.antwoordOpties ? `<ul style="margin: 4px 0 0 20px;">${v.antwoordOpties.map(a => `<li>${a}</li>`).join('')}</ul>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}
  ` : '';

  // Vereiste onderzoeken sectie
  // Centrale Beslisboom HTML
  const centraleBeslisboomHTML = result.centraleBeslisboomResultaat ? `
    <h2>Centrale Beslisboom Analyse</h2>
    <div style="background: ${result.centraleBeslisboomResultaat.eindconclusie === 'vergunningvrij' ? '#dcfce7' : result.centraleBeslisboomResultaat.eindconclusie === 'meldingsplichtig' ? '#fef3c7' : '#fee2e2'}; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 4px solid ${result.centraleBeslisboomResultaat.eindconclusie === 'vergunningvrij' ? '#22c55e' : result.centraleBeslisboomResultaat.eindconclusie === 'meldingsplichtig' ? '#f59e0b' : '#dc2626'};">
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">
        Eindconclusie: ${result.centraleBeslisboomResultaat.eindconclusie.replace(/_/g, ' ').toUpperCase()}
      </div>
      <div style="margin-bottom: 12px;">
        <strong>Motivering:</strong> ${result.centraleBeslisboomResultaat.motivering}
      </div>
      <div style="font-size: 14px; color: #6b7280;">
        <strong>⚖️ Juridische grondslag:</strong> ${result.centraleBeslisboomResultaat.juridischeGrondslag}
      </div>
    </div>
    
    ${result.centraleBeslisboomResultaat.toetsingskaders && result.centraleBeslisboomResultaat.toetsingskaders.length > 0 ? `
      <h3>Toetsingskaders (Gouden Regel)</h3>
      <table>
        <thead>
          <tr>
            <th>Kader</th>
            <th>Laag</th>
            <th>Prioriteit</th>
            <th>Wettelijke Basis</th>
          </tr>
        </thead>
        <tbody>
          ${result.centraleBeslisboomResultaat.toetsingskaders.map(tk => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tk.naam}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tk.laag}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tk.prioriteit}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tk.wettelijkeBasis || 'n.v.t.'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    
    ${result.centraleBeslisboomResultaat.beschermingsregimes && result.centraleBeslisboomResultaat.beschermingsregimes.length > 0 ? `
      <h3>Beschermingsregimes</h3>
      <table>
        <thead>
          <tr>
            <th>Regime</th>
            <th>Type</th>
            <th>Doorslaggevend</th>
            <th>Uitzondering Artikel</th>
          </tr>
        </thead>
        <tbody>
          ${result.centraleBeslisboomResultaat.beschermingsregimes.map(br => `
            <tr style="background: ${br.isDoorslaggevend ? '#fee2e2' : '#f9fafb'};">
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${br.naam}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${br.type.replace(/_/g, ' ')}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${br.isDoorslaggevend ? '✅ Ja' : '❌ Nee (alleen context)'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${br.uitzonderingArtikel || 'n.v.t.'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    
    ${result.centraleBeslisboomResultaat.doorlopenStappen && result.centraleBeslisboomResultaat.doorlopenStappen.length > 0 ? `
      <details style="margin-top: 16px;">
        <summary style="cursor: pointer; font-weight: 600; color: #374151;">Doorlopen stappen (${result.centraleBeslisboomResultaat.doorlopenStappen.length})</summary>
        <ol style="margin-top: 12px; padding-left: 20px;">
          ${result.centraleBeslisboomResultaat.doorlopenStappen.map(s => `
            <li style="margin-bottom: 12px;">
              <strong>${s.titel}</strong>
              <div style="color: #059669; font-size: 14px;">${s.resultaat}</div>
              <div style="color: #6b7280; font-size: 13px;">${s.toelichting}</div>
            </li>
          `).join('')}
        </ol>
      </details>
    ` : ''}
  ` : '';

  // Gelaagde Kennisbank HTML
  const kennisbankHTML = result.kennisbankResultaat ? `
    <h2>Gelaagde Kennisbank (5 lagen, 4 categorieën)</h2>
    <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #3b82f6;">
      <div style="display: flex; gap: 24px; margin-bottom: 12px;">
        <div><strong>Totaal items:</strong> ${result.kennisbankResultaat.totaalAantalItems}</div>
      </div>
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        ${result.kennisbankResultaat.perCategorie.map(cat => `
          <span style="background: #dbeafe; padding: 4px 12px; border-radius: 9999px; font-size: 13px;">
            ${cat.categorie}: ${cat.aantalItems}
          </span>
        `).join('')}
      </div>
    </div>
    
    ${result.kennisbankResultaat.perLaag.filter(l => l.aantalItems > 0).map(laag => `
      <h3 style="margin-top: 20px; color: #1e40af;">
        ${laag.laag.charAt(0).toUpperCase() + laag.laag.slice(1)} (${laag.aantalItems} items)
      </h3>
      <table>
        <thead>
          <tr>
            <th>Categorie</th>
            <th>Naam</th>
            <th>Status</th>
            <th>Toelichting</th>
          </tr>
        </thead>
        <tbody>
          ${laag.items.map(item => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                <span style="background: ${item.categorie === 'toetsingskaders' ? '#dbeafe' : item.categorie === 'onderzoeken' ? '#fef3c7' : item.categorie === 'adviseurs' ? '#dcfce7' : '#f3e8ff'}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                  ${item.categorie}
                </span>
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${item.naam}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.juridischeStatus || 'n.v.t.'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">${item.toelichting || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `).join('')}
  ` : '';

  // Milieutoets Signalering HTML
  const milieuToetsHTML = result.milieuToetsSignalering ? `
    <h2>Milieutoets Signalering</h2>
    <div style="background: ${result.milieuToetsSignalering.isToetsNodig ? '#fef3c7' : '#dcfce7'}; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${result.milieuToetsSignalering.isToetsNodig ? '#f59e0b' : '#22c55e'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.milieuToetsSignalering.isToetsNodig ? '⚠️' : '✓'}</span>
        <strong style="font-size: 18px;">Milieutoets ${result.milieuToetsSignalering.isToetsNodig ? 'VEREIST' : 'niet vereist'}</strong>
      </div>
      <p style="margin: 0 0 12px 0;"><strong>Activiteittype:</strong> ${result.milieuToetsSignalering.activiteitType.replace(/_/g, ' ')}</p>
      <p style="margin: 0;">${result.milieuToetsSignalering.samenvatting}</p>
    </div>
    
    ${result.milieuToetsSignalering.relevanteThemas.filter(t => t.isRelevant).length > 0 ? `
      <h3>Relevante Milieuthema's</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Thema</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Prioriteit</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Reden</th>
          </tr>
        </thead>
        <tbody>
          ${result.milieuToetsSignalering.relevanteThemas.filter(t => t.isRelevant).map(thema => `
            <tr>
              <td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>${thema.naam}</strong></td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">
                <span style="background: ${thema.prioriteit === 'hoog' ? '#fee2e2' : thema.prioriteit === 'middel' ? '#fef3c7' : '#dcfce7'}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                  ${thema.prioriteit.toUpperCase()}
                </span>
              </td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${thema.reden}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    
    ${result.milieuToetsSignalering.balBklRegels.length > 0 ? `
      <h3>Bal/Bkl Regelverwijzingen</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Bron</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Artikel</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Titel</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Link</th>
          </tr>
        </thead>
        <tbody>
          ${result.milieuToetsSignalering.balBklRegels.slice(0, 10).map(regel => `
            <tr>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${regel.bron}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${regel.artikel}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${regel.titel}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;"><a href="${regel.url}" target="_blank" style="color: #2563eb;">🔗 Bekijk</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    
    <h3>MER-Beoordeling</h3>
    <div style="background: ${result.milieuToetsSignalering.merBeoordeling.isNodig ? '#fee2e2' : '#f8fafc'}; border: 1px solid ${result.milieuToetsSignalering.merBeoordeling.isNodig ? '#dc2626' : '#e2e8f0'}; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.milieuToetsSignalering.merBeoordeling.isNodig ? '📋' : '✓'}</span>
        <strong>MER ${result.milieuToetsSignalering.merBeoordeling.isNodig ? 'VERPLICHT' : 'niet verplicht'}</strong>
      </div>
      <p style="margin: 0 0 12px 0;">${result.milieuToetsSignalering.merBeoordeling.reden}</p>
      <p style="margin: 0; font-style: italic;">${result.milieuToetsSignalering.merBeoordeling.aanbeveling}</p>
    </div>
    
    ${result.milieuToetsSignalering.bopaMotivering ? `
      <h3>BOPA Milieumotivering</h3>
      <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 12px 0;"><strong>Afwijking van:</strong> ${result.milieuToetsSignalering.bopaMotivering.afwijkingVan}</p>
        <p style="margin: 0 0 8px 0;"><strong>Integrale belangenafweging vereist voor:</strong></p>
        <ul style="margin: 0 0 12px 0;">
          ${result.milieuToetsSignalering.bopaMotivering.integraleBelangafweging.map(item => `<li>${item}</li>`).join('')}
        </ul>
        <p style="margin: 0 0 8px 0;"><strong>Milieuaspecten voor afweging:</strong></p>
        <ul style="margin: 0;">
          ${result.milieuToetsSignalering.bopaMotivering.milieuAspecten.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    
    <h3>Checklist Behandelaar</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Categorie</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Actie</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Status</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Grondslag</th>
        </tr>
      </thead>
      <tbody>
        ${result.milieuToetsSignalering.checklist.filter(item => item.status !== 'optioneel').map(item => `
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${item.categorie}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${item.item}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">
              <span style="background: ${item.status === 'verplicht' ? '#fee2e2' : '#fef3c7'}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                ${item.status.toUpperCase()}
              </span>
            </td>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 12px; color: #6b7280;">${item.regelgrondslag}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  // Geluidsanalyse HTML
  const geluidsAnalyseHTML = result.geluidsAnalyse ? `
    <h2>Geluidsanalyse</h2>
    <div style="background: ${result.geluidsAnalyse.heeftGeluidsbelasting ? '#fef3c7' : '#dcfce7'}; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${result.geluidsAnalyse.heeftGeluidsbelasting ? '#f59e0b' : '#22c55e'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.geluidsAnalyse.heeftGeluidsbelasting ? '🔊' : '✓'}</span>
        <strong style="font-size: 18px;">Geluidsbelasting: ${result.geluidsAnalyse.heeftGeluidsbelasting ? 'AANDACHT VEREIST' : 'Geen significante belasting'}</strong>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
        <div><strong>Wegverkeer:</strong> ${result.geluidsAnalyse.wegverkeer.aanwezig ? `Ja (${result.geluidsAnalyse.wegverkeer.ldenWaarde || '?'} dB Lden)` : 'Nee'}</div>
        <div><strong>Railverkeer:</strong> ${result.geluidsAnalyse.railverkeer.aanwezig ? `Ja (${result.geluidsAnalyse.railverkeer.afstandTotSpoor || '?'}m)` : 'Nee'}</div>
        <div><strong>Industrie:</strong> ${result.geluidsAnalyse.industrie.aanwezig ? (result.geluidsAnalyse.industrie.binnenGeluidszone ? 'Binnen geluidszone' : 'In omgeving') : 'Nee'}</div>
        <div><strong>Vliegveld:</strong> ${result.geluidsAnalyse.vliegveld.aanwezig ? result.geluidsAnalyse.vliegveld.vliegveldNaam : 'Nee'}</div>
        <div><strong>Stiltegebied:</strong> ${result.geluidsAnalyse.stiltegebied.aanwezig ? result.geluidsAnalyse.stiltegebied.gebiedNaam : 'Nee'}</div>
        ${result.geluidsAnalyse.overschrijding.heeftOverschrijding ? `<div style="grid-column: span 2; color: #dc2626;"><strong>⚠️ Overschrijding:</strong> ${result.geluidsAnalyse.overschrijding.overschrijdingDb} dB boven norm</div>` : ''}
      </div>
    </div>
    ${result.geluidsAnalyse.aanbevelingen.length > 0 ? `
      <h3>Aanbevelingen Geluid</h3>
      <ul>${result.geluidsAnalyse.aanbevelingen.map(a => `<li>${a}</li>`).join('')}</ul>
    ` : ''}
  ` : '';

  // Externe Veiligheid HTML
  const externeVeiligheidHTML = result.externeVeiligheidAnalyse ? `
    <h2>Externe Veiligheid</h2>
    <div style="background: ${result.externeVeiligheidAnalyse.heeftRisico ? '#fee2e2' : '#dcfce7'}; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${result.externeVeiligheidAnalyse.heeftRisico ? '#dc2626' : '#22c55e'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.externeVeiligheidAnalyse.heeftRisico ? '⚠️' : '✓'}</span>
        <strong style="font-size: 18px;">Externe veiligheid: ${result.externeVeiligheidAnalyse.heeftRisico ? 'RISICO AANWEZIG' : 'Geen significant risico'}</strong>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
        <div><strong>Binnen PR 10⁻⁶ contour:</strong> ${result.externeVeiligheidAnalyse.plaatsgebondenRisico.binnenPR10_6 ? `<span style="color: #dc2626;">JA - ${result.externeVeiligheidAnalyse.plaatsgebondenRisico.bronNaam}</span>` : 'Nee'}</div>
        <div><strong>Verantwoordingsplicht GR:</strong> ${result.externeVeiligheidAnalyse.groepsrisico.verantwoordingsplicht ? '<span style="color: #f59e0b;">Ja</span>' : 'Nee'}</div>
        <div><strong>Advies Veiligheidsregio:</strong> ${result.externeVeiligheidAnalyse.groepsrisico.adviesVeiligheidsregio ? '<span style="color: #f59e0b;">Vereist</span>' : 'Niet vereist'}</div>
        <div><strong>Bevi-inrichtingen:</strong> ${result.externeVeiligheidAnalyse.beviInrichtingen.length > 0 ? result.externeVeiligheidAnalyse.beviInrichtingen.length + ' in omgeving' : 'Geen'}</div>
        <div><strong>Buisleidingen:</strong> ${result.externeVeiligheidAnalyse.buisleidingen.length > 0 ? result.externeVeiligheidAnalyse.buisleidingen.length + ' in omgeving' : 'Geen'}</div>
      </div>
    </div>
    ${result.externeVeiligheidAnalyse.beviInrichtingen.length > 0 ? `
      <h3>Bevi-inrichtingen in de Omgeving</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead><tr style="background: #f1f5f9;"><th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Naam</th><th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Afstand</th><th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Risico</th></tr></thead>
        <tbody>${result.externeVeiligheidAnalyse.beviInrichtingen.slice(0, 5).map(i => `<tr><td style="padding: 8px; border: 1px solid #e2e8f0;">${i.naam}</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${i.afstand}m</td><td style="padding: 8px; border: 1px solid #e2e8f0;"><span style="background: ${i.risicoCategorie === 'HOOG' ? '#fee2e2' : '#fef3c7'}; padding: 2px 8px; border-radius: 4px;">${i.risicoCategorie}</span></td></tr>`).join('')}</tbody>
      </table>
    ` : ''}
    ${result.externeVeiligheidAnalyse.aanbevelingen.length > 0 ? `
      <h3>Aanbevelingen Externe Veiligheid</h3>
      <ul>${result.externeVeiligheidAnalyse.aanbevelingen.map(a => `<li>${a}</li>`).join('')}</ul>
    ` : ''}
  ` : '';

  // Stikstof voortoets HTML (AERIUS + Natura 2000)
  const natura2000Check = (result.stikstofVoortoets as any)?.natura2000Check;
  const stikstofVoortoetsHTML = result.stikstofVoortoets ? `
    <h2>Stikstof Voortoets (AERIUS + Natura 2000)</h2>
    <div style="background: ${result.stikstofVoortoets.riskLevel === 'laag' ? '#dcfce7' : result.stikstofVoortoets.riskLevel === 'middel' ? '#fef3c7' : '#fee2e2'}; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${result.stikstofVoortoets.riskLevel === 'laag' ? '#22c55e' : result.stikstofVoortoets.riskLevel === 'middel' ? '#f59e0b' : '#dc2626'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.stikstofVoortoets.riskLevel === 'laag' ? '✓' : result.stikstofVoortoets.riskLevel === 'middel' ? '⚠️' : '🔴'}</span>
        <strong style="font-size: 18px;">Risiconiveau: ${result.stikstofVoortoets.riskLevel.toUpperCase()}</strong>
      </div>
      <p style="margin: 0 0 16px 0;">${result.stikstofVoortoets.summary}</p>
      ${result.stikstofVoortoets.requiresCalculation ? `
        <div style="background: #fff; padding: 12px; border-radius: 6px; margin-top: 12px;">
          <strong>⚠️ AERIUS berekening vereist</strong>
          <p style="margin: 4px 0 0 0; font-size: 14px;">Voer een AERIUS Calculator berekening uit om de stikstofdepositie op Natura 2000 gebieden te bepalen.</p>
        </div>
      ` : ''}
    </div>
    
    ${natura2000Check ? `
      <h3>Natura 2000 Analyse</h3>
      <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <strong>Dichtstbijzijnde gebied:</strong><br/>
            ${natura2000Check.dichtstbijzijndeGebied || 'Niet bepaald'}
          </div>
          <div>
            <strong>Afstand:</strong><br/>
            ${natura2000Check.binnenGebied ? '<span style="color: #dc2626; font-weight: bold;">BINNEN GEBIED</span>' : 
              natura2000Check.afstandMeter !== undefined ? 
                (natura2000Check.afstandMeter < 1000 ? 
                  `${natura2000Check.afstandMeter}m` : 
                  `${(natura2000Check.afstandMeter / 1000).toFixed(1)}km`) : 
                'Niet bepaald'}
          </div>
          <div>
            <strong>Stikstof risico (locatie):</strong><br/>
            <span style="color: ${natura2000Check.stikstofRisico === 'hoog' ? '#dc2626' : natura2000Check.stikstofRisico === 'middel' ? '#f59e0b' : '#22c55e'};">
              ${natura2000Check.stikstofRisico?.toUpperCase() || 'Onbekend'}
            </span>
          </div>
          <div>
            <strong>Gebieden binnen 10km:</strong><br/>
            ${natura2000Check.gebiedenBinnenStraal?.length || 0}
          </div>
        </div>
        ${natura2000Check.aanbeveling ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #22c55e;">
            <strong>Aanbeveling:</strong> ${natura2000Check.aanbeveling}
          </div>
        ` : ''}
        ${natura2000Check.gebiedenBinnenStraal && natura2000Check.gebiedenBinnenStraal.length > 0 ? `
          <div style="margin-top: 12px;">
            <strong>Natura 2000 gebieden in de omgeving:</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
              ${natura2000Check.gebiedenBinnenStraal.slice(0, 5).map((g: any) => `
                <li>${g.naam} ${g.afstandMeter !== undefined ? `(${g.afstandMeter < 1000 ? g.afstandMeter + 'm' : (g.afstandMeter / 1000).toFixed(1) + 'km'})` : ''}</li>
              `).join('')}
              ${natura2000Check.gebiedenBinnenStraal.length > 5 ? `<li><em>...en ${natura2000Check.gebiedenBinnenStraal.length - 5} meer</em></li>` : ''}
            </ul>
          </div>
        ` : ''}
      </div>
    ` : ''}
    
    ${(() => {
      const beschermdeCheck = (result.stikstofVoortoets as any)?.beschermdeGebiedenCheck;
      if (!beschermdeCheck) return '';
      
      const hasNNN = beschermdeCheck.nnnGebiedenCount > 0;
      const hasParken = beschermdeCheck.nationaleParkenCount > 0;
      
      if (!hasNNN && !hasParken) return '';
      
      return `
        <h3>Overige Beschermde Natuurgebieden</h3>
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            ${hasNNN ? `
              <div>
                <strong>Natuurnetwerk Nederland (NNN):</strong><br/>
                ${beschermdeCheck.binnenNNN ? 
                  '<span style="color: #dc2626; font-weight: bold;">BINNEN NNN-GEBIED</span>' : 
                  beschermdeCheck.dichtstbijzijndeNNN?.afstandMeter !== undefined ?
                    (beschermdeCheck.dichtstbijzijndeNNN.afstandMeter < 1000 ?
                      beschermdeCheck.dichtstbijzijndeNNN.afstandMeter + 'm afstand' :
                      (beschermdeCheck.dichtstbijzijndeNNN.afstandMeter / 1000).toFixed(1) + 'km afstand') :
                    beschermdeCheck.nnnGebiedenCount + ' gebieden in omgeving'}
              </div>
            ` : ''}
            ${hasParken ? `
              <div>
                <strong>Nationale Parken:</strong><br/>
                ${beschermdeCheck.binnenNationaalPark ? 
                  '<span style="color: #dc2626; font-weight: bold;">BINNEN NATIONAAL PARK</span>' : 
                  beschermdeCheck.dichtstbijzijndeNationaalPark?.afstandMeter !== undefined ?
                    (beschermdeCheck.dichtstbijzijndeNationaalPark.afstandMeter < 1000 ?
                      beschermdeCheck.dichtstbijzijndeNationaalPark.afstandMeter + 'm afstand' :
                      (beschermdeCheck.dichtstbijzijndeNationaalPark.afstandMeter / 1000).toFixed(1) + 'km afstand') :
                    beschermdeCheck.nationaleParkenCount + ' parken in omgeving'}
              </div>
            ` : ''}
          </div>
          ${beschermdeCheck.binnenNNN || beschermdeCheck.binnenNationaalPark ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f59e0b;">
              <strong>Let op:</strong> Bij ligging in NNN of Nationaal Park gelden aanvullende provinciale regels voor natuurbescherming.
            </div>
          ` : ''}
        </div>
      `;
    })()}
    
    ${result.stikstofVoortoets.emissionSources.length > 0 ? `
      <h3>Gedetecteerde emissiebronnen</h3>
      <ul>
        ${result.stikstofVoortoets.emissionSources.map(source => `<li>${source}</li>`).join('')}
      </ul>
    ` : ''}
    
    <h3>Aanbevelingen</h3>
    <ul>
      ${result.stikstofVoortoets.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
  ` : '';

  // Funderingsproblematiek check HTML (PDOK)
  const funderingscheckHTML = result.funderingscheck ? `
    <h2>Funderingsproblematiek Check</h2>
    <div style="background: ${result.funderingscheck.risicoNiveau === 'geen' ? '#dcfce7' : result.funderingscheck.risicoNiveau === 'laag' ? '#fef3c7' : result.funderingscheck.risicoNiveau === 'middel' ? '#fed7aa' : '#fee2e2'}; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${result.funderingscheck.risicoNiveau === 'geen' ? '#22c55e' : result.funderingscheck.risicoNiveau === 'laag' ? '#f59e0b' : result.funderingscheck.risicoNiveau === 'middel' ? '#f97316' : '#dc2626'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.funderingscheck.risicoNiveau === 'geen' ? '✓' : result.funderingscheck.risicoNiveau === 'laag' ? '⚠️' : result.funderingscheck.risicoNiveau === 'middel' ? '⚠️' : '🔴'}</span>
        <strong style="font-size: 18px;">Funderingsrisico: ${result.funderingscheck.risicoNiveau.toUpperCase()}</strong>
      </div>
      ${result.funderingscheck.inRisicogebied ? `
        <p style="margin: 0 0 12px 0;">Deze locatie ligt in een indicatief aandachtsgebied voor funderingsproblematiek.</p>
      ` : `
        <p style="margin: 0 0 12px 0;">Deze locatie ligt niet in een indicatief aandachtsgebied voor funderingsproblematiek.</p>
      `}
    </div>
    
    ${result.funderingscheck.gebiedsInfo ? `
      <h3>Gebiedsinformatie</h3>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <strong>Postcodegebied:</strong><br/>
            ${result.funderingscheck.gebiedsInfo.postcodegebied}
          </div>
          <div>
            <strong>Gemeente:</strong><br/>
            ${result.funderingscheck.gebiedsInfo.gemeente}
          </div>
          <div>
            <strong>Bodemtype:</strong><br/>
            ${result.funderingscheck.gebiedsInfo.fysischGeografischeRegio}
          </div>
          <div>
            <strong>Panden voor 1970:</strong><br/>
            ${result.funderingscheck.gebiedsInfo.percentageVoor1970}%
          </div>
          <div style="grid-column: span 2;">
            <strong>Classificatie:</strong><br/>
            ${result.funderingscheck.gebiedsInfo.legendaKlasse}
          </div>
        </div>
      </div>
    ` : ''}
    
    <h3>Aanbevelingen</h3>
    <ul>
      ${result.funderingscheck.aanbevelingen.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
  ` : '';

  // Bodemloket check HTML (bevoegde omgevingsdienst voor bodemkwaliteit)
  const bodemloketHTML = result.bodemloketCheck ? `
    <h2>Bodemkwaliteit Check</h2>
    <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #3b82f6;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">🔍</span>
        <strong style="font-size: 18px;">Bodemloket Informatie</strong>
      </div>
      ${result.bodemloketCheck.gevonden && result.bodemloketCheck.omgevingsdienstNaam ? `
        <p style="margin: 0 0 12px 0;"><strong>Bevoegde omgevingsdienst:</strong> ${result.bodemloketCheck.omgevingsdienstNaam}</p>
        ${result.bodemloketCheck.websiteBeschikbaar && result.bodemloketCheck.omgevingsdienstUrl ? `
          <p style="margin: 0 0 12px 0;"><strong>Website bodemgegevens:</strong> <a href="${result.bodemloketCheck.omgevingsdienstUrl}" style="color: #2563eb;">${result.bodemloketCheck.omgevingsdienstUrl}</a></p>
        ` : ''}
        ${result.bodemloketCheck.dossierBeschikbaar ? `
          <p style="margin: 0 0 12px 0; color: #b45309;"><strong>⚠️ Let op:</strong> Er zijn dossiergegevens beschikbaar bij het bevoegd gezag. Raadpleeg deze voor eventuele bodemverontreiniging.</p>
        ` : ''}
      ` : ''}
      <div style="background: white; border-radius: 6px; padding: 12px; margin-top: 12px;">
        <strong>Aanbeveling:</strong>
        <p style="margin: 8px 0 0 0;">${result.bodemloketCheck.aanbeveling}</p>
      </div>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #6b7280;">Bron: ${result.bodemloketCheck.bron}</p>
    </div>
  ` : '';

  // Cultuurhistorie check HTML (RCE - monumenten en beschermde gezichten)
  const cultuurhistorieHTML = result.cultuurhistorieCheck ? `
    <h2>Cultuurhistorie Check</h2>
    <div style="background: ${result.cultuurhistorieCheck.heeftBeschermdeStatus ? '#fef3c7' : '#dcfce7'}; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${result.cultuurhistorieCheck.heeftBeschermdeStatus ? '#f59e0b' : '#22c55e'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.cultuurhistorieCheck.heeftBeschermdeStatus ? '🏛️' : '✓'}</span>
        <strong style="font-size: 18px;">${result.cultuurhistorieCheck.heeftBeschermdeStatus ? 'Cultuurhistorische waarden aanwezig' : 'Geen bijzondere cultuurhistorische beperkingen'}</strong>
      </div>
      ${result.cultuurhistorieCheck.inBeschermdStadsgezicht ? `
        <p style="margin: 0 0 8px 0;"><strong>🏘️ Beschermd Stadsgezicht:</strong> Deze locatie ligt binnen een beschermd stadsgezicht. Extra welstandseisen zijn van toepassing.</p>
      ` : ''}
      ${result.cultuurhistorieCheck.inBeschermdDorpsgezicht ? `
        <p style="margin: 0 0 8px 0;"><strong>🏡 Beschermd Dorpsgezicht:</strong> Deze locatie ligt binnen een beschermd dorpsgezicht. Extra welstandseisen zijn van toepassing.</p>
      ` : ''}
      ${result.cultuurhistorieCheck.nabijMonumenten ? `
        <p style="margin: 0 0 8px 0;"><strong>🏛️ Monumenten nabij:</strong> Er bevinden zich rijksmonumenten in de directe omgeving.</p>
      ` : ''}
      ${result.cultuurhistorieCheck.monumentenInOmgeving > 0 ? `
        <p style="margin: 0 0 8px 0;"><strong>📍 ${result.cultuurhistorieCheck.monumentenInOmgeving} monument${result.cultuurhistorieCheck.monumentenInOmgeving === 1 ? '' : 'en'}</strong> in de omgeving (200m radius)</p>
      ` : ''}
    </div>
    
    ${result.cultuurhistorieCheck.beschermdeGebieden.length > 0 ? `
      <h3>Beschermde Gebieden en Monumenten</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Type</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Naam</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Afstand</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Ligging</th>
          </tr>
        </thead>
        <tbody>
          ${result.cultuurhistorieCheck.beschermdeGebieden.map(g => `
            <tr>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">
                ${g.type === 'monument' ? '🏛️ Monument' : g.type === 'beschermd_stadsgezicht' ? '🏘️ Stadsgezicht' : '🏡 Dorpsgezicht'}
              </td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${g.naam}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${g.afstand ? `${g.afstand}m` : '-'}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">
                <span style="background: ${g.ligging === 'binnen' ? '#fee2e2' : '#fef3c7'}; padding: 2px 8px; border-radius: 4px;">
                  ${g.ligging === 'binnen' ? 'Binnen' : 'Nabij'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    
    <h3>Aanbevelingen</h3>
    <ul>
      ${result.cultuurhistorieCheck.aanbevelingen.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
  ` : '';

  // BRP Gewaspercelen check HTML (optioneel voor agrarische locaties)
  const gewaspercelenHTML = result.gewaspercelenCheck ? `
    <h2>Landbouwpercelen Check (BRP)</h2>
    <div style="background: ${result.gewaspercelenCheck.heeftLandbouwpercelen ? '#fef3c7' : '#dcfce7'}; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${result.gewaspercelenCheck.heeftLandbouwpercelen ? '#f59e0b' : '#22c55e'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.gewaspercelenCheck.heeftLandbouwpercelen ? '🌾' : '✓'}</span>
        <strong style="font-size: 18px;">${result.gewaspercelenCheck.heeftLandbouwpercelen ? `${result.gewaspercelenCheck.aantalPercelen} landbouwperce${result.gewaspercelenCheck.aantalPercelen === 1 ? 'el' : 'len'} gevonden` : 'Geen landbouwpercelen in de directe omgeving'}</strong>
      </div>
      ${result.gewaspercelenCheck.relevantieIndicatie.isAgrarischGebied ? `
        <p style="margin: 0 0 8px 0;"><strong>🟡 Agrarisch gebied:</strong> Deze locatie ligt in een gebied met meerdere landbouwpercelen.</p>
      ` : ''}
      ${result.gewaspercelenCheck.relevantieIndicatie.heeftVeehouderij ? `
        <p style="margin: 0 0 8px 0;"><strong>🐄 Veehouderij indicatie:</strong> Veevoedergewassen (grasland/mais) aanwezig - mogelijk nabijgelegen veehouderij.</p>
      ` : ''}
      ${result.gewaspercelenCheck.relevantieIndicatie.heeftGrasland ? `
        <p style="margin: 0 0 8px 0;"><strong>🌿 Grasland:</strong> Graslandpercelen aanwezig in de omgeving.</p>
      ` : ''}
    </div>
    
    ${result.gewaspercelenCheck.categorieën && result.gewaspercelenCheck.categorieën.length > 0 ? `
      <h3>Gewascategorieën</h3>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0;">
              <th style="text-align: left; padding: 8px;">Categorie</th>
              <th style="text-align: center; padding: 8px;">Aantal percelen</th>
              <th style="text-align: left; padding: 8px;">Gewassen</th>
            </tr>
          </thead>
          <tbody>
            ${result.gewaspercelenCheck.categorieën.map(cat => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; font-weight: 500;">${cat.categorie}</td>
                <td style="padding: 8px; text-align: center;">${cat.aantal}</td>
                <td style="padding: 8px; font-size: 14px; color: #64748b;">${cat.gewassen.slice(0, 3).join(', ')}${cat.gewassen.length > 3 ? '...' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
    
    <h3>Aanbevelingen</h3>
    <ul>
      ${result.gewaspercelenCheck.aanbevelingen.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
  ` : '';

  // BGT Topografische analyse HTML
  const topografischeAnalyseHTML = result.topografischeAnalyse ? `
    <h2>Topografische Analyse (BGT)</h2>
    <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #0ea5e9;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">🗺️</span>
        <strong style="font-size: 18px;">Omgevingsanalyse (100m radius)</strong>
      </div>
      <p style="margin: 0 0 12px 0;">${result.topografischeAnalyse.samenvatting}</p>
      
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px;">
        <div style="background: white; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px;">🏠</div>
          <div style="font-size: 20px; font-weight: bold;">${result.topografischeAnalyse.panden.aantal}</div>
          <div style="font-size: 12px; color: #64748b;">Panden</div>
        </div>
        <div style="background: white; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px;">🌳</div>
          <div style="font-size: 20px; font-weight: bold;">${result.topografischeAnalyse.groenvoorziening.totaalAantal}</div>
          <div style="font-size: 12px; color: #64748b;">Groen</div>
        </div>
        <div style="background: white; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px;">💧</div>
          <div style="font-size: 20px; font-weight: bold;">${result.topografischeAnalyse.water.totaalAantal}</div>
          <div style="font-size: 12px; color: #64748b;">Water</div>
        </div>
        <div style="background: white; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px;">🛣️</div>
          <div style="font-size: 20px; font-weight: bold;">${result.topografischeAnalyse.wegen.totaalAantal}</div>
          <div style="font-size: 12px; color: #64748b;">Wegen</div>
        </div>
      </div>
    </div>
    
    ${result.topografischeAnalyse.aanbevelingen.length > 0 ? `
      <h3>Aanbevelingen</h3>
      <ul>
        ${result.topografischeAnalyse.aanbevelingen.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    ` : ''}
  ` : '';

  // Geurcontouren veehouderijen HTML
  const geurAnalyseHTML = result.geurAnalyse ? `
    <h2>Geurbelasting Veehouderijen</h2>
    <div style="background: ${result.geurAnalyse.risiconiveau === 'geen' ? '#dcfce7' : result.geurAnalyse.risiconiveau === 'laag' ? '#fef3c7' : result.geurAnalyse.risiconiveau === 'middel' ? '#fed7aa' : '#fee2e2'}; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${result.geurAnalyse.risiconiveau === 'geen' ? '#22c55e' : result.geurAnalyse.risiconiveau === 'laag' ? '#f59e0b' : result.geurAnalyse.risiconiveau === 'middel' ? '#f97316' : '#dc2626'};">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">${result.geurAnalyse.risiconiveau === 'geen' ? '✓' : result.geurAnalyse.risiconiveau === 'laag' ? '👃' : '⚠️'}</span>
        <strong style="font-size: 18px;">Geurbelasting: ${result.geurAnalyse.risiconiveau.toUpperCase()}</strong>
      </div>
      <p style="margin: 0 0 8px 0;"><strong>Status:</strong> ${result.geurAnalyse.binnenGeurcontour ? 'Binnen geurcontour veehouderij' : 'Buiten geurcontouren'}</p>
      ${result.geurAnalyse.gesScore !== null ? `
        <p style="margin: 0 0 8px 0;"><strong>GES Score:</strong> ${result.geurAnalyse.gesScore} - ${result.geurAnalyse.gesOmschrijving}</p>
      ` : `
        <p style="margin: 0 0 8px 0;">${result.geurAnalyse.gesOmschrijving}</p>
      `}
      ${result.geurAnalyse.provincie ? `
        <p style="margin: 0; font-size: 12px; color: #64748b;">Databron: Provincie ${result.geurAnalyse.provincie}</p>
      ` : ''}
    </div>
    
    ${result.geurAnalyse.aanbevelingen.length > 0 ? `
      <h3>Aanbevelingen</h3>
      <ul>
        ${result.geurAnalyse.aanbevelingen.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    ` : ''}
  ` : '';

  const onderzoekenHTML = result.onderzoekenResultaat ? `
    <h2>Vereiste Onderzoeken</h2>
    ${result.onderzoekenResultaat.klicMeldingVereist ? `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
        <strong>⚠️ KLIC-melding verplicht</strong>
        <p style="margin: 4px 0 0 0;">${result.onderzoekenResultaat.klicToelichting || 'KLIC-melding vereist bij graafwerkzaamheden'}</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Aanvragen via kadaster.nl/klic - minimaal 3 werkdagen voor aanvang graafwerk</p>
      </div>
    ` : ''}
    ${result.onderzoekenResultaat.verplichteOnderzoeken.length > 0 ? `
      <h3>Verplichte onderzoeken (${result.onderzoekenResultaat.totaalAantalVerplicht})</h3>
      <table>
        <thead>
          <tr>
            <th>Onderzoek</th>
            <th>Reden</th>
            <th>Uitvoerder</th>
            <th>Doorlooptijd</th>
            <th>Kosten</th>
          </tr>
        </thead>
        <tbody>
          ${result.onderzoekenResultaat.verplichteOnderzoeken.map(o => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                <strong>${o.naam}</strong>
                <div style="font-size: 12px; color: #6b7280;">${o.toelichting}</div>
                ${o.wettelijkeBasis ? `<div style="font-size: 11px; color: #3b82f6; margin-top: 4px; font-style: italic;">⚖️ Grondslag: ${o.wettelijkeBasis}</div>` : ''}
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${o.reden}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${o.instantie || '-'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${o.doorlooptijd || '-'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${o.kostenindicatie || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    ${result.onderzoekenResultaat.aanbevolenOnderzoeken.length > 0 ? `
      <h3>Aanbevolen onderzoeken (${result.onderzoekenResultaat.totaalAantalAanbevolen})</h3>
      <table>
        <thead>
          <tr>
            <th>Onderzoek</th>
            <th>Reden</th>
            <th>Toelichting</th>
          </tr>
        </thead>
        <tbody>
          ${result.onderzoekenResultaat.aanbevolenOnderzoeken.map(o => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${o.naam}</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${o.reden}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${o.toelichting}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
  ` : '';

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Behandelrapport ${result.zaaknummer}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px;
    }
    h1 { color: #111827; margin-bottom: 8px; }
    h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f3f4f6; text-align: left; padding: 12px 8px; border-bottom: 2px solid #e5e7eb; }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 500;
    }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    
    .summary-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .meta-info {
      display: flex;
      gap: 24px;
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 24px;
    }
    
    /* Aanvraag samenvatting */
    .aanvraag-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 20px;
      margin: 16px 0;
    }
    .aanvraag-header {
      margin-bottom: 8px;
    }
    .aanvraag-beschrijving {
      background: white;
      padding: 12px 16px;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
    }
    .aanvraag-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .aanvraag-details .detail-item {
      background: white;
      padding: 10px 12px;
      border-radius: 6px;
    }
    .aanvraag-details .label {
      color: #6b7280;
      font-size: 13px;
      display: block;
      margin-bottom: 2px;
    }
    
    /* Omgevingsplan toets */
    .omgevingsplan-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin: 16px 0;
      border: 1px solid #e5e7eb;
    }
    .omgevingsplan-box.past-binnen {
      border-left: 4px solid #22c55e;
    }
    .omgevingsplan-box.past-niet {
      border-left: 4px solid #f59e0b;
    }
    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .plan-naam {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .plan-status {
      font-size: 12px;
      color: #6b7280;
    }
    .conclusie-badge {
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
    }
    .plan-details {
      background: white;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-row .label {
      color: #6b7280;
    }
    .detail-row .value {
      text-align: right;
    }
    .bouwregels-section {
      background: white;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .bouwregels-section h4 {
      margin: 0 0 12px 0;
      color: #374151;
      font-size: 14px;
    }
    .bouwregels-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .bouwregel-item {
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
      text-align: center;
    }
    .regel-label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .regel-waarde {
      font-weight: 600;
      color: #111827;
    }
    .afwijking-section {
      background: #fef3c7;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .afwijking-section h4 {
      margin: 0 0 12px 0;
      color: #92400e;
      font-size: 14px;
    }
    .afwijking-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .afwijking-motivering {
      margin: 8px 0 0 0;
      color: #78350f;
      font-size: 14px;
    }
    .planregels-section {
      background: white;
      padding: 16px;
      border-radius: 6px;
    }
    .planregels-section h4 {
      margin: 0 0 12px 0;
      color: #374151;
      font-size: 14px;
    }
    .planregels-table {
      width: 100%;
      border-collapse: collapse;
    }
    .planregels-table th {
      background: #f9fafb;
      padding: 10px 12px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
    }
    .planregels-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 13px;
    }
    .conclusie-label {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .conclusie-label.voldoet {
      background: #dcfce7;
      color: #166534;
    }
    .conclusie-label.voldoet-niet {
      background: #fee2e2;
      color: #991b1b;
    }
    .conclusie-label.nader-onderzoek {
      background: #fef3c7;
      color: #92400e;
    }
    
    /* Dubbelbestemmingen sectie */
    .dubbelbestemmingen-section {
      background: #fef3c7;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      border-left: 4px solid #f59e0b;
    }
    .dubbelbestemmingen-section h4 {
      margin: 0 0 8px 0;
      color: #92400e;
      font-size: 14px;
    }
    .warning-text {
      color: #78350f;
      font-size: 13px;
      margin: 0 0 12px 0;
    }
    .dubbelbestemmingen-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
    }
    .dubbelbestemming-card {
      background: white;
      border-radius: 6px;
      padding: 12px;
      border-left: 3px solid #6b7280;
    }
    .dubbelbestemming-card.type-archeologie {
      border-left-color: #8b5cf6;
    }
    .dubbelbestemming-card.type-water {
      border-left-color: #0ea5e9;
    }
    .dubbelbestemming-card.type-overig {
      border-left-color: #6b7280;
    }
    .db-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .db-naam {
      font-weight: 600;
      color: #111827;
    }
    .db-artikel {
      font-size: 12px;
      color: #6b7280;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .db-advies {
      font-size: 13px;
      margin-bottom: 8px;
    }
    .db-advies .label {
      color: #6b7280;
    }
    .db-advies .value {
      color: #111827;
      font-weight: 500;
    }
    .db-aandachtspunten {
      margin: 0;
      padding-left: 20px;
      font-size: 12px;
      color: #4b5563;
    }
    .db-aandachtspunten li {
      margin-bottom: 4px;
    }
    
    /* Gebiedsaanduidingen sectie */
    .gebiedsaanduidingen-section {
      background: white;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .gebiedsaanduidingen-section h4 {
      margin: 0 0 12px 0;
      color: #374151;
      font-size: 14px;
    }
    .gebiedsaanduidingen-table {
      width: 100%;
      border-collapse: collapse;
    }
    .gebiedsaanduidingen-table th {
      background: #f9fafb;
      padding: 10px 12px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
    }
    .gebiedsaanduidingen-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 13px;
    }
    
    /* Locatie analyse */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin: 16px 0;
    }
    .info-item {
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
    }
    .info-item.full-width {
      grid-column: span 2;
    }
    
    /* Procedure box */
    .procedure-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin: 16px 0;
    }
    .procedure-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }
    .procedure-details {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
    }
    .detail-item .label {
      color: #6b7280;
      margin-right: 8px;
    }
    .detail-item .yes { color: #166534; font-weight: 600; }
    .detail-item .no { color: #6b7280; }
    .motivering {
      background: white;
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
    }
    
    /* Activiteiten */
    .activiteiten-box {
      margin: 16px 0;
    }
    .activiteit-section {
      background: #f9fafb;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .activiteit-section.warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
    }
    .activiteit-section ul {
      margin: 8px 0 0 20px;
    }
    .note {
      font-size: 13px;
      color: #92400e;
      margin-top: 8px;
      font-style: italic;
    }
    
    /* Juridische status */
    .concept-label {
      background: #fef3c7;
      color: #92400e;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      margin-left: 8px;
    }
    .juridische-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-right: 4px;
    }
    .juridische-status.normstellend { background: #dbeafe; color: #1e40af; }
    .juridische-status.richtinggevend { background: #e0e7ff; color: #4338ca; }
    .juridische-status.afwegingskader { background: #f3f4f6; color: #4b5563; }
    .bindend-label {
      background: #fee2e2;
      color: #991b1b;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
    }
    
    /* Tweezijdige werking */
    .tweezijdige-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin: 16px 0;
      border-left: 4px solid #9ca3af;
    }
    .tweezijdige-box.laag { border-left-color: #22c55e; }
    .tweezijdige-box.middel { border-left-color: #f59e0b; }
    .tweezijdige-box.hoog { border-left-color: #dc2626; }
    .risico-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .risico-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 14px;
    }
    .risico-badge.laag { background: #dcfce7; color: #166534; }
    .risico-badge.middel { background: #fef3c7; color: #92400e; }
    .risico-badge.hoog { background: #fee2e2; color: #991b1b; }
    .functies-table {
      width: 100%;
      margin: 12px 0;
    }
    .functie-type {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .functie-type.nieuw { background: #dbeafe; color: #1e40af; }
    .functie-type.bestaand { background: #f3e8ff; color: #7c3aed; }
    
    /* Uitgesloten beleid */
    .section-intro {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .uitgesloten-row {
      background: #fafafa;
    }
    
    /* Juridisch risico */
    .juridisch-risico {
      background: #fee2e2;
      color: #991b1b;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      margin-left: 8px;
    }
    
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    
    /* Methodiek badge */
    .methodiek-badge {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      display: inline-block;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 32px;">
    <div class="methodiek-badge">Policy Assist 7-Stappen Methodiek</div>
    <h1>Behandelrapport</h1>
    <div style="font-size: 24px; color: #6b7280;">${result.zaaknummer}</div>
  </div>

  <div class="meta-info">
    <div><strong>Gemeente:</strong> ${gemeenteNaam}</div>
    <div><strong>Behandelaar:</strong> ${behandelaarNaam}</div>
    <div><strong>Datum:</strong> ${result.datumAnalyse.toLocaleDateString('nl-NL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })}</div>
  </div>

  <div class="summary-box">
    <strong>Samenvatting</strong>
    <p style="margin: 8px 0 0 0;">${result.samenvatting}</p>
  </div>

  ${aanvraagSamenvattingHTML}
  ${omgevingsplanToetsHTML}

  ${locatieHTML}
  ${procedureHTML}
  ${activiteitenHTML}

  <h2>Stap 4 & 5: Toetsingskaders met Juridische Status</h2>
  <table>
    <thead>
      <tr>
        <th>Kader</th>
        <th>Laag</th>
        <th>Juridische Status</th>
        <th>Toelichting</th>
      </tr>
    </thead>
    <tbody>
      ${toetsingskadersHTML || '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #9ca3af;">Geen specifieke toetsingskaders geïdentificeerd</td></tr>'}
    </tbody>
  </table>

  ${tweezijdigeWerkingHTML}
  ${uitgeslotenBeleidHTML}

  <h2>Te Raadplegen Adviseurs</h2>
  <table>
    <thead>
      <tr>
        <th>Adviseur</th>
        <th>Categorie</th>
        <th>Type</th>
        <th>Verplicht</th>
        <th>Termijn</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${adviseursHTML || '<tr><td colspan="6" style="padding: 16px; text-align: center; color: #9ca3af;">Geen adviseurs vereist</td></tr>'}
    </tbody>
  </table>

  ${centraleBeslisboomHTML}
  ${kennisbankHTML}
  ${beslisboomHTML}
  ${milieuToetsHTML}
  ${geluidsAnalyseHTML}
  ${externeVeiligheidHTML}
  ${stikstofVoortoetsHTML}
  ${funderingscheckHTML}
  ${bodemloketHTML}
  ${cultuurhistorieHTML}
  ${gewaspercelenHTML}
  ${topografischeAnalyseHTML}
  ${geurAnalyseHTML}
  ${graafwerkHTML}
  ${volledigheidsHTML}
  ${onderzoekenHTML}
  ${dsoVergunningcheckHTML}

  ${result.haalbaarheidsschatting ? `
  <h2>Haalbaarheidsschatting</h2>
  <div style="background: ${result.haalbaarheidsschatting.conclusie === 'haalbaar' ? '#dcfce7' : result.haalbaarheidsschatting.conclusie === 'haalbaar_met_voorwaarden' ? '#fef3c7' : result.haalbaarheidsschatting.conclusie === 'waarschijnlijk_niet_haalbaar' ? '#ffedd5' : '#fee2e2'}; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 4px solid ${result.haalbaarheidsschatting.conclusie === 'haalbaar' ? '#22c55e' : result.haalbaarheidsschatting.conclusie === 'haalbaar_met_voorwaarden' ? '#f59e0b' : result.haalbaarheidsschatting.conclusie === 'waarschijnlijk_niet_haalbaar' ? '#f97316' : '#dc2626'};">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <span style="font-size: 28px;">${result.haalbaarheidsschatting.conclusie === 'haalbaar' ? '✅' : result.haalbaarheidsschatting.conclusie === 'haalbaar_met_voorwaarden' ? '⚠️' : result.haalbaarheidsschatting.conclusie === 'waarschijnlijk_niet_haalbaar' ? '🟠' : '❌'}</span>
      <div>
        <div style="font-size: 20px; font-weight: 700; color: ${result.haalbaarheidsschatting.conclusie === 'haalbaar' ? '#166534' : result.haalbaarheidsschatting.conclusie === 'haalbaar_met_voorwaarden' ? '#92400e' : result.haalbaarheidsschatting.conclusie === 'waarschijnlijk_niet_haalbaar' ? '#9a3412' : '#991b1b'};">
          ${result.haalbaarheidsschatting.conclusie === 'haalbaar' ? 'HAALBAAR' : result.haalbaarheidsschatting.conclusie === 'haalbaar_met_voorwaarden' ? 'HAALBAAR MET VOORWAARDEN' : result.haalbaarheidsschatting.conclusie === 'waarschijnlijk_niet_haalbaar' ? 'WAARSCHIJNLIJK NIET HAALBAAR' : 'NIET HAALBAAR'}
        </div>
        <div style="font-size: 14px; color: #6b7280;">Score: ${result.haalbaarheidsschatting.score}/100</div>
      </div>
    </div>
    <p style="color: #374151; margin-bottom: 16px;">${result.haalbaarheidsschatting.toelichting}</p>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div>
        <h4 style="font-weight: 600; color: #166534; margin-bottom: 8px;">✅ Positieve factoren</h4>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
          ${result.haalbaarheidsschatting.positieveFactoren.map(f => `<li style="margin-bottom: 4px;">${f}</li>`).join('')}
        </ul>
      </div>
      <div>
        <h4 style="font-weight: 600; color: #991b1b; margin-bottom: 8px;">⚠️ Risicofactoren</h4>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
          ${result.haalbaarheidsschatting.risicofactoren.map(f => `<li style="margin-bottom: 4px;">${f}</li>`).join('')}
        </ul>
      </div>
    </div>
    
    ${result.haalbaarheidsschatting.voorwaarden && result.haalbaarheidsschatting.voorwaarden.length > 0 ? `
    <div style="margin-top: 16px;">
      <h4 style="font-weight: 600; color: #92400e; margin-bottom: 8px;">📋 Voorwaarden</h4>
      <ul style="margin: 0; padding-left: 20px; color: #374151;">
        ${result.haalbaarheidsschatting.voorwaarden.map(v => `<li style="margin-bottom: 4px;">${v}</li>`).join('')}
      </ul>
    </div>` : ''}
    
    <div style="margin-top: 16px;">
      <h4 style="font-weight: 600; color: #1e40af; margin-bottom: 8px;">💡 Aanbevelingen</h4>
      <ul style="margin: 0; padding-left: 20px; color: #374151;">
        ${result.haalbaarheidsschatting.aanbevelingen.map(a => `<li style="margin-bottom: 4px;">${a}</li>`).join('')}
      </ul>
    </div>
  </div>
  ` : ''}

  <h2>Aandachtspunten</h2>
  ${aandachtspuntenHTML || '<p style="color: #9ca3af;">Geen specifieke aandachtspunten</p>'}

  <h2>Bronnen</h2>
  <ul style="color: #6b7280;">
    ${result.bronnen.map(b => `<li>${b}</li>`).join('')}
  </ul>

  <div class="footer">
    <p><strong>Dit rapport is gegenereerd volgens de Policy Assist 7-stappen juridische filtermethodiek.</strong></p>
    <p>Gegenereerd door Ro-flow AI Behandelassistent op ${new Date().toLocaleString('nl-NL')}.</p>
    <p>Verwerkingstijd: ${result.verwerkingDuurMs}ms</p>
    <p style="margin-top: 8px;">© ${new Date().getFullYear()} Ro-flow - Alle rechten voorbehouden</p>
  </div>
</body>
</html>
`;
}

/**
 * Genereer een PDF buffer van het rapport met weasyprint
 * 
 * WeasyPrint is een Python-based HTML-to-PDF converter die CSS Paged Media ondersteunt.
 * Dit zorgt voor correcte paginering, headers/footers en print-specifieke styling.
 */
export async function generatePDFBuffer(
  result: AnalysisResult,
  gemeenteNaam: string,
  behandelaarNaam: string
): Promise<Buffer> {
  // Voeg print-specifieke CSS toe aan de HTML
  const baseHtml = generateReportHTML(result, gemeenteNaam, behandelaarNaam);
  
  // Injecteer print-specifieke CSS voor WeasyPrint
  const printCSS = `
    <style>
      /* WeasyPrint Paged Media CSS */
      @page {
        size: A4;
        margin: 2cm 1.5cm;
        
        /* Header op elke pagina */
        @top-left {
          content: "Behandelrapport - ${gemeenteNaam}";
          font-size: 9pt;
          color: #6b7280;
        }
        
        /* Paginanummering rechts */
        @top-right {
          content: "Pagina " counter(page) " van " counter(pages);
          font-size: 9pt;
          color: #6b7280;
        }
        
        /* Footer met datum */
        @bottom-center {
          content: "Gegenereerd: ${new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })}";
          font-size: 8pt;
          color: #9ca3af;
        }
      }
      
      /* Eerste pagina zonder header */
      @page :first {
        @top-left { content: none; }
        @top-right { content: none; }
      }
      
      /* Voorkom page breaks binnen belangrijke secties */
      .aanvraag-box,
      .omgevingsplan-box,
      .procedure-box,
      .beslisboom-box,
      .stikstof-box,
      .fundering-box,
      .cultuurhistorie-box {
        page-break-inside: avoid;
      }
      
      /* Forceer page break voor grote secties */
      h2 {
        page-break-before: auto;
        page-break-after: avoid;
      }
      
      /* Tabellen niet splitsen over pagina's */
      table {
        page-break-inside: avoid;
      }
      
      /* Verberg interactieve elementen in print */
      details summary {
        cursor: default;
      }
      
      /* Toon alle details in print */
      details[open] > *,
      details > *:not(summary) {
        display: block !important;
      }
      
      /* Links tonen als tekst in print */
      a[href^="http"]::after {
        content: " (" attr(href) ")";
        font-size: 8pt;
        color: #6b7280;
        word-break: break-all;
      }
      
      /* Verberg externe link iconen in print */
      a span[style*="vertical-align: super"] {
        display: none !important;
      }
    </style>
  `;
  
  // Injecteer de print CSS voor de </head> tag
  const html = baseHtml.replace('</head>', `${printCSS}</head>`);
  
  // Gebruik weasyprint om HTML naar PDF te converteren
  const { execSync } = await import('child_process');
  const { writeFileSync, readFileSync, unlinkSync } = await import('fs');
  const { tmpdir } = await import('os');
  const { join } = await import('path');
  
  const timestamp = Date.now();
  const tempHtml = join(tmpdir(), `rapport_${timestamp}.html`);
  const tempPdf = join(tmpdir(), `rapport_${timestamp}.pdf`);
  
  try {
    writeFileSync(tempHtml, html, 'utf-8');
    
    // Probeer weasyprint met optimale instellingen
    try {
      // --presentational-hints zorgt voor betere CSS ondersteuning
      // --optimize-images comprimeert afbeeldingen
      execSync(`weasyprint --presentational-hints "${tempHtml}" "${tempPdf}"`, { 
        stdio: 'pipe',
        timeout: 60000 // 60 seconden timeout voor grote rapporten
      });
      const pdfBuffer = readFileSync(tempPdf);
      console.log(`[PDF] Successfully generated PDF (${Math.round(pdfBuffer.length / 1024)}KB)`);
      return pdfBuffer;
    } catch (e: any) {
      // Weasyprint niet beschikbaar of fout, retourneer HTML als fallback
      console.warn('[PDF] Weasyprint error, returning HTML fallback:', e.message || e);
      return Buffer.from(html, 'utf-8');
    }
  } finally {
    // Cleanup temp files
    try { unlinkSync(tempHtml); } catch {}
    try { unlinkSync(tempPdf); } catch {}
  }
}

/**
 * Genereer bestandsnaam voor het rapport
 */
export function generateReportFilename(zaaknummer: string): string {
  const date = new Date().toISOString().split('T')[0];
  const sanitizedZaaknummer = zaaknummer.replace(/[^a-zA-Z0-9-]/g, '_');
  return `behandelrapport_${sanitizedZaaknummer}_${date}.pdf`;
}
