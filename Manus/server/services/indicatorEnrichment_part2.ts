// This file is merged into indicatorEnrichment.ts - remaining indicator enrichment data
// Starting from GELUIDZONE_WEG suggesties completion through all remaining indicators

export const ENRICHMENT_PART2: Record<string, any> = {
  NATURA2000: {
    wettelijkeGrondslag: 'Art. 2.7 en 2.8 Wet natuurbescherming (Wnb); art. 16.53c Omgevingswet; Habitatrichtlijn (92/43/EEG) art. 6 lid 3; Vogelrichtlijn (2009/147/EG).',
    consequenties: {
      aandachtspunt: 'De locatie ligt in of nabij een Natura 2000-gebied. Een passende beoordeling (art. 2.8 Wnb) kan nodig zijn. Bij significante effecten is een Wnb-vergunning vereist.',
      relevant: 'Bij de huidige afstand tot Natura 2000-gebieden zijn directe gevolgen minder waarschijnlijk, maar bij grotere projecten met stikstofuitstoot kan alsnog een AERIUS-berekening nodig zijn.',
      niet_relevant: 'Geen Natura 2000-gebieden in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Laat een voortoets uitvoeren om significante effecten te beoordelen',
        'Bij mogelijke significante effecten: passende beoordeling (art. 2.8 Wnb)',
        'Raadpleeg de AERIUS Calculator voor stikstofdepositie',
        'Overleg met de provincie als bevoegd gezag',
      ],
      relevant: [
        'Bij grote projecten met stikstofuitstoot: overweeg een AERIUS-berekening',
        'Raadpleeg de AERIUS Calculator (aerius.nl) bij twijfel over stikstofdepositie',
      ],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'De locatie ligt nabij een Natura 2000-gebied. Bij bouwactiviteiten, functiewijzigingen of andere ruimtelijke ontwikkelingen moet worden beoordeeld of er significante effecten kunnen optreden op de instandhoudingsdoelstellingen van het gebied.',
      relevant: 'De locatie ligt op ruime afstand van Natura 2000-gebieden. Voor de meeste kleinschalige aanvragen (uitbouw, dakkapel, interne verbouwing) is deze indicator doorgaans niet van belang. Bij nieuwbouw of grote projecten met significante stikstofuitstoot kan een AERIUS-berekening alsnog nodig zijn.',
      niet_relevant: 'Geen Natura 2000-gebieden in de directe omgeving. Deze indicator is niet van toepassing.',
    },
  },
  GELUIDZONE_WEG: {
    wettelijkeGrondslag: 'Art. 74 Wet geluidhinder (Wgh); art. 3.8 Bkl; art. 5.78 Bkl (hogere waarden).',
    consequenties: {
      aandachtspunt: 'De locatie ligt nabij een weg met een geluidzone. Bij geluidgevoelige functies (woningen, scholen) is een akoestisch onderzoek verplicht. De voorkeursgrenswaarde bedraagt 48 dB (Lden). Hogere waarden zijn mogelijk via een hogere-waardenbesluit van B&W (maximaal 53-63 dB afhankelijk van situatie).',
      relevant: 'Geluidzone van een weg is van toepassing. Raadpleeg de geluidkaart (atlas.geluid.nl).',
      niet_relevant: 'Geen significante geluidbelasting van wegen.',
    },
    suggesties: {
      aandachtspunt: [
        'Laat een akoestisch onderzoek uitvoeren conform de Wet geluidhinder',
        'Bij overschrijding voorkeursgrenswaarde: vraag een hogere-waardenbesluit aan bij B&W',
        'Overweeg geluidwerende maatregelen aan de gevel (geluidsisolatie)',
        'Raadpleeg atlas.geluid.nl voor de actuele geluidbelasting',
      ],
      relevant: ['Raadpleeg de geluidkaart voor de exacte geluidbelasting'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Wegverkeersgeluid is relevant bij geluidgevoelige functies. Bij een uitbouw van een woning nabij een drukke weg kan de geluidbelasting op de nieuwe gevel een aandachtspunt zijn. Bij een functiewijziging naar wonen is een akoestisch onderzoek verplicht.',
      relevant: 'De geluidzone geeft context aan de geluidbelasting op de locatie.',
      niet_relevant: 'Geen significante geluidbelasting van wegen op deze locatie.',
    },
  },

  GELUIDZONE_SPOOR: {
    wettelijkeGrondslag: 'Art. 87 Wet geluidhinder (Wgh); art. 3.25 Bkl; Geluidregister; Basisnet Spoor.',
    consequenties: {
      aandachtspunt: 'Spoorlijn in de directe omgeving. Bij geluidgevoelige functies is een akoestisch onderzoek verplicht. Voorkeursgrenswaarde: 55 dB (Lden). Daarnaast kan trillingshinder optreden.',
      relevant: 'Spoorlijn in de omgeving. Houd rekening met geluid en trillingen.',
      niet_relevant: 'Geen spoorlijnen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Laat een akoestisch onderzoek uitvoeren voor spoorweggeluid',
        'Bij geluidgevoelige functies binnen 100m: overweeg een trillingsonderzoek (SBR Richtlijn B)',
        'Raadpleeg het Geluidregister voor de geluidproductieplafonds',
        'Overweeg geluidwerende maatregelen aan de gevel',
      ],
      relevant: ['Controleer de geluidbelasting van het spoor op de locatie'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Spoorweggeluid en trillingen zijn relevant bij geluidgevoelige functies nabij het spoor. Bij een uitbouw aan de spoorzijde kan de geluidbelasting op de nieuwe gevel een aandachtspunt zijn.',
      relevant: 'Spoorlijn in de omgeving. De geluidbelasting is een aandachtspunt.',
      niet_relevant: 'Geen spoorlijnen in de directe omgeving.',
    },
  },

  GELUIDZONE_INDUSTRIE: {
    wettelijkeGrondslag: 'Art. 40 Wet geluidhinder (Wgh); art. 3.31 Bkl; Bestemmingsplan/omgevingsplan.',
    consequenties: {
      aandachtspunt: 'De locatie ligt binnen een geluidzone van een gezoneerd industrieterrein. Bij geluidgevoelige functies is een akoestisch onderzoek vereist.',
      relevant: 'Geluidzone industrie is van toepassing. Raadpleeg de geluidkaart.',
      niet_relevant: 'Geen geluidzone industrie van toepassing.',
    },
    suggesties: {
      aandachtspunt: [
        'Laat een akoestisch onderzoek uitvoeren voor industriegeluid',
        'Raadpleeg de geluidkaart van de gemeente (atlas.geluid.nl)',
        'Bij geluidgevoelige functies: toets aan de geluidnormen voor industriegeluid',
      ],
      relevant: ['Raadpleeg de geluidkaart voor industriegeluid'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Industriegeluid is relevant bij geluidgevoelige functies nabij gezoneerde industrieterreinen. Bij een functiewijziging naar wonen nabij een industrieterrein is een akoestisch onderzoek verplicht.',
      relevant: 'De geluidzone industrie geeft context aan de geluidbelasting.',
      niet_relevant: 'Geen geluidzone industrie van toepassing.',
    },
  },

  LUCHTKWALITEIT: {
    wettelijkeGrondslag: 'Art. 5.50-5.56 Bkl; EU Richtlijn Luchtkwaliteit (2008/50/EG); Nationaal Samenwerkingsprogramma Luchtkwaliteit (NSL).',
    consequenties: {
      aandachtspunt: 'De luchtkwaliteit op deze locatie vereist aandacht. Bij gevoelige functies (woningen, scholen, zorginstellingen) nabij drukke wegen kan de luchtkwaliteit een belemmering vormen.',
      relevant: 'De luchtkwaliteit is een aandachtspunt. Raadpleeg de NSL-monitoringstool.',
      niet_relevant: 'De luchtkwaliteit vormt geen belemmering.',
    },
    suggesties: {
      aandachtspunt: [
        'Raadpleeg de NSL-monitoringstool voor de actuele concentraties',
        'Bij gevoelige functies nabij drukke wegen: overweeg een luchtkwaliteitsonderzoek',
        'Toets aan de grenswaarden voor PM10 (40 ug/m3) en NO2 (40 ug/m3)',
        'Overweeg de GGD-richtlijn "Gezondheid en milieu in ruimtelijke plannen"',
      ],
      relevant: ['Raadpleeg de NSL-monitoringstool'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Luchtkwaliteit is relevant bij gevoelige functies nabij drukke wegen. Bij een uitbouw van een woning is de luchtkwaliteit doorgaans geen belemmering. Bij nieuwbouw van een school nabij een snelweg kan het wel relevant zijn.',
      relevant: 'De luchtkwaliteit geeft context aan de gezondheidsaspecten van de locatie.',
      niet_relevant: 'De luchtkwaliteit vormt geen belemmering voor deze aanvraag.',
    },
  },

  GEURZONE: {
    wettelijkeGrondslag: 'Wet geurhinder en veehouderij (Wgv); art. 5.42 Bkl; Activiteitenbesluit (overgangsrecht).',
    consequenties: {
      aandachtspunt: 'De locatie ligt binnen een geurzone. Bij geurgevoelige functies (woningen) kan geurhinder een belemmering vormen.',
      relevant: 'Geurzone in de omgeving. Houd rekening met geurhinder.',
      niet_relevant: 'Geen geurzones van toepassing.',
    },
    suggesties: {
      aandachtspunt: [
        'Laat een geuronderzoek uitvoeren conform de Wet geurhinder en veehouderij',
        'Toets aan de geurnormen uit het Bkl (art. 5.42)',
        'Bij veehouderij: bereken de geurbelasting met de V-Stacks verspreidingsmodel',
      ],
      relevant: ['Raadpleeg de geurkaart van de gemeente'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Geurhinder is relevant bij geurgevoelige functies nabij geurveroorzakende bedrijven of veehouderijen. Bij een uitbouw is geur doorgaans geen belemmering tenzij de locatie in een geurzone ligt.',
      relevant: 'De geurzone geeft context aan de milieubelasting op de locatie.',
      niet_relevant: 'Geen geurzones van toepassing.',
    },
  },

  TRILLINGEN: {
    wettelijkeGrondslag: 'SBR Richtlijn A (schade aan gebouwen); SBR Richtlijn B (hinder voor personen); art. 2.4 Bbl (constructieve veiligheid).',
    consequenties: {
      aandachtspunt: 'Trillingsbronnen in de omgeving (spoor, zwaar verkeer, industrie). Bij trillingsgevoelige functies kan een trillingsonderzoek nodig zijn.',
      relevant: 'Trillingsbronnen in de omgeving. Houd rekening met trillingshinder.',
      niet_relevant: 'Geen significante trillingsbronnen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Overweeg een trillingsonderzoek conform SBR Richtlijn A en B',
        'Bij trillingsgevoelige functies nabij spoor: meet de trillingsniveaus',
        'Overweeg trillingsdempende maatregelen in de constructie',
      ],
      relevant: ['Beoordeel de trillingsbronnen in de omgeving'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Trillingen zijn relevant bij geluidgevoelige functies nabij spoor of zwaar verkeer. Bij een uitbouw nabij het spoor kan trillingshinder een aandachtspunt zijn.',
      relevant: 'Trillingsbronnen in de omgeving zijn een aandachtspunt.',
      niet_relevant: 'Geen significante trillingsbronnen.',
    },
  },

  // ===================== VEILIGHEID =====================
  BEVI_INRICHTING: {
    wettelijkeGrondslag: 'Besluit externe veiligheid inrichtingen (Bevi); art. 5.12 Bkl; Regeling externe veiligheid inrichtingen (Revi).',
    consequenties: {
      aandachtspunt: 'Risicovolle inrichting(en) in de omgeving. De plaatsgebonden risicocontour (PR 10-6) en het groepsrisico zijn van toepassing. Kwetsbare objecten mogen niet binnen de PR 10-6 contour worden gerealiseerd.',
      relevant: 'Risicovolle inrichting in de omgeving. Houd rekening met de veiligheidsafstanden.',
      niet_relevant: 'Geen risicovolle inrichtingen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Raadpleeg de Risicokaart (risicokaart.nl) voor de exacte risicocontouren',
        'Toets aan het plaatsgebonden risico (PR 10-6 contour)',
        'Bereken het groepsrisico en toets aan de orientatiewaarde',
        'Raadpleeg de veiligheidsregio over de zelfredzaamheid en hulpverlening',
      ],
      relevant: ['Raadpleeg de Risicokaart voor de veiligheidsafstanden'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Externe veiligheid is relevant bij kwetsbare objecten (woningen, scholen, zorginstellingen) nabij risicovolle inrichtingen. Bij een uitbouw van een woning nabij een LPG-tankstation kan de PR-contour een belemmering vormen.',
      relevant: 'Risicovolle inrichting in de omgeving. De veiligheidsafstanden zijn een aandachtspunt.',
      niet_relevant: 'Geen risicovolle inrichtingen in de directe omgeving.',
    },
  },

  BUISLEIDING: {
    wettelijkeGrondslag: 'Besluit externe veiligheid buisleidingen (Bevb); art. 5.15 Bkl; WIBON (grondroeractiviteiten).',
    consequenties: {
      aandachtspunt: 'Buisleiding(en) in de omgeving. De belemmeringenstrook en risicocontour zijn van toepassing. Bouwen binnen de belemmeringenstrook is niet toegestaan zonder toestemming van de leidingbeheerder.',
      relevant: 'Buisleiding in de omgeving. Houd rekening met de belemmeringenstrook.',
      niet_relevant: 'Geen buisleidingen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Doe een KLIC-melding voor de exacte ligging van kabels en leidingen',
        'Raadpleeg de leidingbeheerder over de belemmeringenstrook',
        'Toets aan het plaatsgebonden risico van de buisleiding',
        'Bij grondwerkzaamheden: houd rekening met de zakelijk recht strook',
      ],
      relevant: ['Doe een KLIC-melding bij grondwerkzaamheden'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Buisleidingen zijn relevant bij bouwactiviteiten in de buurt van ondergrondse leidingen. Bij een uitbouw met fundering nabij een hogedruk gasleiding kan de belemmeringenstrook een belemmering vormen.',
      relevant: 'Buisleiding in de omgeving. De belemmeringenstrook is een aandachtspunt.',
      niet_relevant: 'Geen buisleidingen in de directe omgeving.',
    },
  },

  RISICOCONTOUR: {
    wettelijkeGrondslag: 'Bevi; Bevb; art. 5.12-5.15 Bkl; Regeling externe veiligheid inrichtingen (Revi).',
    consequenties: {
      aandachtspunt: 'Risicocontour(en) aangetroffen. Kwetsbare objecten mogen niet binnen de PR 10-6 contour worden gerealiseerd. Het groepsrisico moet worden verantwoord.',
      relevant: 'Risicocontouren in de omgeving. Toets aan de externe veiligheidsnormen.',
      niet_relevant: 'Geen risicocontouren van toepassing.',
    },
    suggesties: {
      aandachtspunt: [
        'Raadpleeg de Risicokaart voor de exacte contouren',
        'Toets aan het plaatsgebonden risico en het groepsrisico',
        'Raadpleeg de veiligheidsregio over zelfredzaamheid en hulpverlening',
      ],
      relevant: ['Raadpleeg de Risicokaart'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Risicocontouren zijn relevant bij kwetsbare objecten. Bij een uitbouw van een woning binnen een risicocontour kan de vergunning worden geweigerd.',
      relevant: 'Risicocontouren in de omgeving zijn een aandachtspunt.',
      niet_relevant: 'Geen risicocontouren van toepassing.',
    },
  },

  LPG_TANKSTATION: {
    wettelijkeGrondslag: 'Bevi; Revi; art. 5.12 Bkl. Vaste afstanden voor LPG-tankstations.',
    consequenties: {
      aandachtspunt: 'LPG-tankstation in de omgeving. Vaste afstanden gelden voor kwetsbare en beperkt kwetsbare objecten (Revi bijlage 1).',
      relevant: 'LPG-tankstation in de omgeving. Houd rekening met de veiligheidsafstanden.',
      niet_relevant: 'Geen LPG-tankstations in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Toets aan de vaste afstanden uit de Revi voor LPG-tankstations',
        'Raadpleeg de Risicokaart voor de exacte locatie en contouren',
      ],
      relevant: ['Controleer de afstand tot het LPG-tankstation'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'LPG-tankstations zijn relevant vanwege het explosiegevaar. Bij kwetsbare objecten gelden vaste afstanden.',
      relevant: 'LPG-tankstation in de omgeving. De veiligheidsafstanden zijn een aandachtspunt.',
      niet_relevant: 'Geen LPG-tankstations in de directe omgeving.',
    },
  },

  VUURWERK_OPSLAG: {
    wettelijkeGrondslag: 'Vuurwerkbesluit; Bevi; art. 5.12 Bkl.',
    consequenties: {
      aandachtspunt: 'Vuurwerkopslag in de omgeving. Veiligheidsafstanden zijn van toepassing.',
      relevant: 'Vuurwerkopslag in de omgeving.',
      niet_relevant: 'Geen vuurwerkopslag in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Raadpleeg de Risicokaart voor de exacte locatie en veiligheidsafstanden',
        'Toets aan de afstandseisen uit het Vuurwerkbesluit',
      ],
      relevant: ['Raadpleeg de Risicokaart'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Vuurwerkopslag is relevant vanwege het explosiegevaar. Bij kwetsbare objecten gelden veiligheidsafstanden.',
      relevant: 'Vuurwerkopslag in de omgeving.',
      niet_relevant: 'Geen vuurwerkopslag in de directe omgeving.',
    },
  },

  // ===================== ERFGOED =====================
  RIJKSMONUMENT: {
    wettelijkeGrondslag: 'Art. 5.1 Omgevingswet (omgevingsvergunning rijksmonumentenactiviteit); art. 13.7 Bkl; Erfgoedwet art. 9.1.',
    consequenties: {
      aandachtspunt: 'Het pand is een rijksmonument of ligt nabij een rijksmonument. Bij wijzigingen aan een rijksmonument is een omgevingsvergunning voor een rijksmonumentenactiviteit vereist. De Rijksdienst voor het Cultureel Erfgoed (RCE) adviseert over de aanvraag.',
      relevant: 'Rijksmonument in de omgeving. Houd rekening met de monumentale waarden.',
      niet_relevant: 'Geen rijksmonumenten in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Vraag een omgevingsvergunning aan voor een rijksmonumentenactiviteit (art. 5.1 Omgevingswet)',
        'De RCE adviseert over de aanvraag — houd rekening met een langere doorlooptijd',
        'Schakel een restauratiearchitect in met ervaring in monumenten',
        'Raadpleeg het monumentenregister (monumenten.nl) voor de beschrijving van het monument',
        'Subsidie kan beschikbaar zijn via de Subsidieregeling instandhouding monumenten (Sim)',
      ],
      relevant: [
        'Houd rekening met de monumentale waarden bij het ontwerp',
        'Bij activiteiten nabij een monument: beoordeel de impact op het monument',
      ],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Rijksmonumenten hebben een streng beschermingsregime. Elke wijziging aan het monument (ook interne verbouwing) is vergunningplichtig. Bij een uitbouw aan een rijksmonument moet het ontwerp de monumentale waarden respecteren. De RCE adviseert en de doorlooptijd is langer.',
      relevant: 'Een rijksmonument in de omgeving kan relevant zijn voor de uitstraling en het ontwerp.',
      niet_relevant: 'Geen rijksmonumenten in de directe omgeving.',
    },
  },

  GEMEENTELIJK_MONUMENT: {
    wettelijkeGrondslag: 'Art. 4.1 Omgevingswet (omgevingsplan); Erfgoedverordening gemeente.',
    consequenties: {
      aandachtspunt: 'Het pand is een gemeentelijk monument. Bij wijzigingen is een omgevingsvergunning vereist op grond van het omgevingsplan/erfgoedverordening.',
      relevant: 'Gemeentelijk monument in de omgeving.',
      niet_relevant: 'Geen gemeentelijke monumenten in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Vraag een omgevingsvergunning aan voor wijzigingen aan het monument',
        'Raadpleeg de gemeentelijke erfgoedverordening voor de specifieke regels',
        'Overweeg een vooroverleg met de monumentencommissie',
        'Subsidie kan beschikbaar zijn via de gemeente',
      ],
      relevant: ['Houd rekening met de monumentale waarden'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Gemeentelijke monumenten hebben een beschermingsregime vergelijkbaar met rijksmonumenten, maar dan op gemeentelijk niveau. Bij wijzigingen is een vergunning nodig.',
      relevant: 'Gemeentelijk monument in de omgeving.',
      niet_relevant: 'Geen gemeentelijke monumenten.',
    },
  },

  BESCHERMD_GEZICHT: {
    wettelijkeGrondslag: 'Art. 5.1 Omgevingswet; art. 9.1 Erfgoedwet; Aanwijzingsbesluit beschermd stads-/dorpsgezicht.',
    consequenties: {
      aandachtspunt: 'De locatie ligt in een beschermd stads- of dorpsgezicht. Sloop is vergunningplichtig en er geldt een verzwaarde welstandstoets.',
      relevant: 'Beschermd gezicht in de omgeving.',
      niet_relevant: 'Niet gelegen in een beschermd gezicht.',
    },
    suggesties: {
      aandachtspunt: [
        'Sloop is vergunningplichtig in een beschermd gezicht',
        'Schakel een architect in die ervaring heeft met beschermde gezichten',
        'Raadpleeg de specifieke regels in het bestemmingsplan voor het beschermd gezicht',
      ],
      relevant: ['Houd rekening met het karakter van het beschermd gezicht'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Een beschermd gezicht is relevant bij elke zichtbare bouwactiviteit. Het ontwerp moet passen bij het karakter van het beschermd gezicht.',
      relevant: 'Beschermd gezicht in de omgeving.',
      niet_relevant: 'Niet gelegen in een beschermd gezicht.',
    },
  },

  ARCHEOLOGIE: {
    wettelijkeGrondslag: 'Art. 5.1 Omgevingswet; Verdrag van Malta (1992); Erfgoedwet art. 9.1; art. 5.130 Bkl.',
    consequenties: {
      aandachtspunt: 'De locatie heeft een archeologische verwachtingswaarde. Bij bodemverstoring boven de vrijstellingsgrens is een archeologisch onderzoek vereist. De vrijstellingsgrens verschilt per gemeente.',
      relevant: 'Archeologische verwachtingswaarde aanwezig. Beoordeel of de vrijstellingsgrens wordt overschreden.',
      niet_relevant: 'Geen archeologische verwachtingswaarde of vrijstelling van toepassing.',
    },
    suggesties: {
      aandachtspunt: [
        'Controleer de gemeentelijke vrijstellingsgrenzen voor archeologie (oppervlakte en diepte)',
        'Bij overschrijding: laat een archeologisch bureauonderzoek uitvoeren',
        'Bij positief bureauonderzoek: een inventariserend veldonderzoek kan volgen',
        'Raadpleeg de gemeentelijke archeologische beleidskaart',
      ],
      relevant: [
        'Controleer de vrijstellingsgrenzen',
        'Bij beperkte bodemverstoring: mogelijk vrijstelling van toepassing',
      ],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Archeologie is relevant bij elke activiteit met bodemverstoring. Bij een uitbouw met fundering wordt de bodem geroerd. De vrijstellingsgrens (bijv. 100m2 en 30cm diep) bepaalt of onderzoek nodig is. Bij een dakkapel is archeologie niet relevant.',
      relevant: 'Archeologische verwachtingswaarde aanwezig. De vrijstellingsgrens bepaalt of onderzoek nodig is.',
      niet_relevant: 'Geen archeologische verwachtingswaarde of vrijstelling van toepassing.',
    },
  },

  CULTUURLANDSCHAP: {
    wettelijkeGrondslag: 'Art. 3.1.6 Bro; art. 5.130 Bkl; Provinciale Omgevingsverordening.',
    consequenties: {
      aandachtspunt: 'De locatie ligt in een cultuurlandschap. Aanvullende eisen voor landschappelijke inpassing kunnen gelden.',
      relevant: 'Cultuurlandschap in de omgeving.',
      niet_relevant: 'Geen cultuurlandschap van toepassing.',
    },
    suggesties: {
      aandachtspunt: [
        'Raadpleeg de provinciale omgevingsverordening voor regels over cultuurlandschappen',
        'Overweeg een landschappelijk inpassingsplan',
      ],
      relevant: ['Houd rekening met de cultuurhistorische waarden'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Cultuurlandschappen zijn relevant bij bouwactiviteiten in het buitengebied.',
      relevant: 'Cultuurlandschap in de omgeving.',
      niet_relevant: 'Geen cultuurlandschap van toepassing.',
    },
  },

  HISTORISCHE_BUITENPLAATS: {
    wettelijkeGrondslag: 'Erfgoedwet; Provinciale Omgevingsverordening; Register van historische buitenplaatsen.',
    consequenties: {
      aandachtspunt: 'De locatie ligt nabij een historische buitenplaats. Aanvullende bescherming kan gelden.',
      relevant: 'Historische buitenplaats in de omgeving.',
      niet_relevant: 'Geen historische buitenplaats in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Raadpleeg het register van historische buitenplaatsen',
        'Houd rekening met de cultuurhistorische waarden bij het ontwerp',
      ],
      relevant: ['Houd rekening met de historische buitenplaats'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Historische buitenplaatsen zijn relevant bij bouwactiviteiten in de directe omgeving.',
      relevant: 'Historische buitenplaats in de omgeving.',
      niet_relevant: 'Geen historische buitenplaats.',
    },
  },

  VERDRAG_MALTA: {
    wettelijkeGrondslag: 'Verdrag van Malta (1992); Erfgoedwet; art. 5.1 Omgevingswet.',
    consequenties: {
      aandachtspunt: 'Het Verdrag van Malta verplicht tot het beschermen van archeologisch erfgoed. Bij bodemverstoring is een archeologisch onderzoek vereist.',
      relevant: 'Het Verdrag van Malta is van toepassing op alle bodemverstorende activiteiten.',
      niet_relevant: 'Het Verdrag van Malta is niet direct relevant voor deze aanvraag.',
    },
    suggesties: {
      aandachtspunt: [
        'Beoordeel of de bodemverstoring de vrijstellingsgrens overschrijdt',
        'Bij overschrijding: laat een archeologisch onderzoek uitvoeren',
      ],
      relevant: ['Houd rekening met de archeologische zorgplicht'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Het Verdrag van Malta is relevant bij alle bodemverstorende activiteiten. De gemeentelijke vrijstellingsgrenzen bepalen wanneer onderzoek nodig is.',
      relevant: 'Het Verdrag van Malta is het kader voor archeologische bescherming.',
      niet_relevant: 'Niet direct relevant voor deze aanvraag.',
    },
  },

  WERELDERFGOED: {
    wettelijkeGrondslag: 'Werelderfgoedverdrag (1972); Erfgoedwet; Omgevingswet.',
    consequenties: {
      aandachtspunt: 'De locatie ligt nabij een UNESCO Werelderfgoed. Strenge bescherming is van toepassing.',
      relevant: 'Werelderfgoed in de omgeving.',
      niet_relevant: 'Geen Werelderfgoed in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Raadpleeg de specifieke regels voor het Werelderfgoed',
        'Houd rekening met de Outstanding Universal Value (OUV) van het erfgoed',
      ],
      relevant: ['Houd rekening met het Werelderfgoed'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Werelderfgoed heeft de hoogste beschermingsstatus. Elke activiteit die de OUV kan aantasten is problematisch.',
      relevant: 'Werelderfgoed in de omgeving.',
      niet_relevant: 'Geen Werelderfgoed in de directe omgeving.',
    },
  },

  // ===================== AGRARISCH =====================
  GEWASPERCEEL: {
    wettelijkeGrondslag: 'Basisregistratie Gewaspercelen (BRP); Meststoffenwet; art. 4.1 Omgevingswet.',
    consequenties: {
      aandachtspunt: 'Gewaspercelen in de omgeving. Bij bouwactiviteiten op agrarische grond kan de bestemming een belemmering vormen.',
      relevant: 'Gewaspercelen gedetecteerd. Context voor de agrarische omgeving.',
      niet_relevant: 'Geen gewaspercelen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Beoordeel of de bouwactiviteit past binnen de agrarische bestemming',
        'Bij functiewijziging van agrarisch naar wonen: toets aan de Ladder voor duurzame verstedelijking',
      ],
      relevant: ['Houd rekening met de agrarische omgeving'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Gewaspercelen zijn relevant bij bouwactiviteiten in het buitengebied. Bij een uitbouw in stedelijk gebied is dit doorgaans niet van belang.',
      relevant: 'Gewaspercelen geven context aan de agrarische omgeving.',
      niet_relevant: 'Geen gewaspercelen in de directe omgeving.',
    },
  },

  GEURCONTOUR_VEEHOUDERIJ: {
    wettelijkeGrondslag: 'Wet geurhinder en veehouderij (Wgv); art. 5.42 Bkl; Regeling geurhinder en veehouderij.',
    consequenties: {
      aandachtspunt: 'Veehouderij in de omgeving met geurcontour. Bij geurgevoelige functies (woningen) kan geurhinder een belemmering vormen.',
      relevant: 'Veehouderij in de omgeving. Houd rekening met geurhinder.',
      niet_relevant: 'Geen veehouderij met geurcontour in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Laat een geuronderzoek uitvoeren conform de Wgv',
        'Bereken de geurbelasting met V-Stacks verspreidingsmodel',
        'Toets aan de geurnormen uit het Bkl (art. 5.42)',
      ],
      relevant: ['Beoordeel de geurbelasting van de veehouderij'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Geurcontour veehouderij is relevant bij geurgevoelige functies in het buitengebied. Bij een uitbouw in stedelijk gebied is dit doorgaans niet van belang.',
      relevant: 'Veehouderij in de omgeving.',
      niet_relevant: 'Geen veehouderij met geurcontour.',
    },
  },

  GLASTUINBOUW: {
    wettelijkeGrondslag: 'Art. 4.1 Omgevingswet; Provinciale Omgevingsverordening; Activiteitenbesluit.',
    consequenties: {
      aandachtspunt: 'Glastuinbouw in de omgeving. Lichthinder en assimilatieverlichting kunnen een rol spelen.',
      relevant: 'Glastuinbouw in de omgeving.',
      niet_relevant: 'Geen glastuinbouw in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: ['Beoordeel de lichthinder van de glastuinbouw', 'Raadpleeg de gemeente over de specifieke regels'],
      relevant: ['Houd rekening met de glastuinbouw'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Glastuinbouw is relevant bij geurgevoelige functies in het buitengebied.',
      relevant: 'Glastuinbouw in de omgeving.',
      niet_relevant: 'Geen glastuinbouw.',
    },
  },

  LANDBOUWGROND: {
    wettelijkeGrondslag: 'Art. 4.1 Omgevingswet; Ladder voor duurzame verstedelijking (art. 5.129g Bkl).',
    consequenties: {
      aandachtspunt: 'De locatie betreft landbouwgrond. Bij functiewijziging naar niet-agrarisch gebruik is de Ladder voor duurzame verstedelijking van toepassing.',
      relevant: 'Landbouwgrond gedetecteerd.',
      niet_relevant: 'Geen landbouwgrond.',
    },
    suggesties: {
      aandachtspunt: ['Toets aan de Ladder voor duurzame verstedelijking bij functiewijziging', 'Beoordeel of de bestemming functiewijziging toestaat'],
      relevant: ['Houd rekening met de agrarische bestemming'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Landbouwgrond is relevant bij functiewijziging van agrarisch naar niet-agrarisch gebruik.',
      relevant: 'Landbouwgrond gedetecteerd.',
      niet_relevant: 'Geen landbouwgrond.',
    },
  },

  MESTVERWERKING: {
    wettelijkeGrondslag: 'Meststoffenwet; Activiteitenbesluit; art. 4.1 Omgevingswet.',
    consequenties: {
      aandachtspunt: 'Mestverwerking in de omgeving. Geur- en milieuhinder kunnen een rol spelen.',
      relevant: 'Mestverwerking in de omgeving.',
      niet_relevant: 'Geen mestverwerking in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: ['Beoordeel de geur- en milieuhinder van de mestverwerking'],
      relevant: ['Houd rekening met de mestverwerking'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Mestverwerking is relevant bij geurgevoelige functies.',
      relevant: 'Mestverwerking in de omgeving.',
      niet_relevant: 'Geen mestverwerking.',
    },
  },

  SPUITZONE: {
    wettelijkeGrondslag: 'VNG Bedrijven en milieuzonering; Activiteitenbesluit; jurisprudentie (50m spuitzone).',
    consequenties: {
      aandachtspunt: 'De locatie ligt mogelijk binnen een spuitzone (50m van fruitteelt/boomkwekerij). Bij geurgevoelige functies kan dit een belemmering vormen.',
      relevant: 'Spuitzone mogelijk van toepassing.',
      niet_relevant: 'Geen spuitzone van toepassing.',
    },
    suggesties: {
      aandachtspunt: ['Beoordeel of de locatie binnen 50m van fruitteelt of boomkwekerij ligt', 'Bij geurgevoelige functies: overweeg een driftonderzoek'],
      relevant: ['Controleer de afstand tot agrarische percelen met gewasbescherming'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Spuitzones zijn relevant bij geurgevoelige functies nabij fruitteelt of boomkwekerij.',
      relevant: 'Spuitzone mogelijk van toepassing.',
      niet_relevant: 'Geen spuitzone.',
    },
  },

  DIERENWELZIJN: {
    wettelijkeGrondslag: 'Wet dieren; Besluit houders van dieren; art. 4.1 Omgevingswet.',
    consequenties: {
      aandachtspunt: 'Dierenwelzijnsaspecten kunnen relevant zijn bij agrarische activiteiten.',
      relevant: 'Dierenwelzijn is een aandachtspunt.',
      niet_relevant: 'Dierenwelzijn is niet direct relevant.',
    },
    suggesties: {
      aandachtspunt: ['Beoordeel de dierenwelzijnsaspecten bij agrarische activiteiten'],
      relevant: ['Houd rekening met dierenwelzijn'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Dierenwelzijn is relevant bij agrarische activiteiten.',
      relevant: 'Dierenwelzijn is een aandachtspunt.',
      niet_relevant: 'Niet direct relevant.',
    },
  },

  // ===================== INFRA =====================
  HOOGSPANNING: {
    wettelijkeGrondslag: 'RIVM magneetveldadvies (2005); art. 4.1 Omgevingswet; Bkl art. 5.163.',
    consequenties: {
      aandachtspunt: 'Hoogspanningsleiding in de omgeving. Het RIVM adviseert om geen gevoelige functies (woningen, scholen, kinderopvang) te realiseren binnen de magneetveldzone (0,4 microtesla jaargemiddelde).',
      relevant: 'Hoogspanningsleiding in de omgeving.',
      niet_relevant: 'Geen hoogspanningsleidingen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Controleer de magneetveldzone bij de netbeheerder',
        'Bij gevoelige functies: houd afstand tot de hoogspanningsleiding conform het RIVM-advies',
        'Raadpleeg de netbeheerder over de specifieke magneetveldzone',
      ],
      relevant: ['Controleer de afstand tot de hoogspanningsleiding'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Hoogspanning is relevant bij gevoelige functies. Bij een uitbouw van een woning nabij een hoogspanningsleiding kan de magneetveldzone een aandachtspunt zijn.',
      relevant: 'Hoogspanningsleiding in de omgeving.',
      niet_relevant: 'Geen hoogspanningsleidingen.',
    },
  },

  GASLEIDING: {
    wettelijkeGrondslag: 'Bevb; WIBON; art. 5.15 Bkl.',
    consequenties: {
      aandachtspunt: 'Gasleiding in de omgeving. De belemmeringenstrook en risicocontour zijn van toepassing.',
      relevant: 'Gasleiding in de omgeving.',
      niet_relevant: 'Geen gasleidingen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Doe een KLIC-melding voor de exacte ligging',
        'Raadpleeg de leidingbeheerder over de belemmeringenstrook',
        'Houd rekening met de veiligheidsafstanden',
      ],
      relevant: ['Doe een KLIC-melding bij grondwerkzaamheden'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Gasleidingen zijn relevant bij bouwactiviteiten met grondverzet.',
      relevant: 'Gasleiding in de omgeving.',
      niet_relevant: 'Geen gasleidingen.',
    },
  },

  KLIC_MELDING: {
    wettelijkeGrondslag: 'WIBON art. 2 (Wet informatie-uitwisseling bovengrondse en ondergrondse netten en netwerken).',
    consequenties: {
      aandachtspunt: 'Bij grondwerkzaamheden is een KLIC-melding verplicht. De melding moet minimaal 3 werkdagen voor aanvang worden gedaan.',
      relevant: 'Een KLIC-melding is aan te bevelen bij grondwerkzaamheden.',
      niet_relevant: 'Geen grondwerkzaamheden verwacht.',
    },
    suggesties: {
      aandachtspunt: [
        'Doe een KLIC-melding via kadaster.nl minimaal 3 werkdagen voor aanvang grondwerk',
        'Bewaar de KLIC-tekeningen op de bouwplaats',
        'Graaf voorzichtig nabij kabels en leidingen',
      ],
      relevant: ['Overweeg een KLIC-melding bij grondwerkzaamheden'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Een KLIC-melding is verplicht bij alle grondwerkzaamheden. Bij een uitbouw met fundering is dit altijd nodig. Bij een dakkapel niet.',
      relevant: 'Een KLIC-melding is aan te bevelen bij grondwerkzaamheden.',
      niet_relevant: 'Geen grondwerkzaamheden verwacht.',
    },
  },

  SPOORWEG: {
    wettelijkeGrondslag: 'Basisnet Spoor; art. 5.12 Bkl; Wet geluidhinder art. 87.',
    consequenties: {
      aandachtspunt: 'Spoorweg in de directe omgeving. Geluid, trillingen en externe veiligheid zijn aandachtspunten.',
      relevant: 'Spoorweg in de omgeving.',
      niet_relevant: 'Geen spoorwegen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Beoordeel de geluidbelasting van het spoor',
        'Overweeg een trillingsonderzoek bij gevoelige functies',
        'Toets aan het Basisnet Spoor voor externe veiligheid',
      ],
      relevant: ['Houd rekening met het spoor'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Spoorwegen zijn relevant voor geluid, trillingen en externe veiligheid.',
      relevant: 'Spoorweg in de omgeving.',
      niet_relevant: 'Geen spoorwegen.',
    },
  },

  RIJKSWEG: {
    wettelijkeGrondslag: 'Art. 74 Wgh; art. 3.8 Bkl; Basisnet Weg.',
    consequenties: {
      aandachtspunt: 'Rijksweg in de directe omgeving. Geluid, luchtkwaliteit en externe veiligheid zijn aandachtspunten.',
      relevant: 'Rijksweg in de omgeving.',
      niet_relevant: 'Geen rijkswegen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: [
        'Laat een akoestisch onderzoek uitvoeren',
        'Beoordeel de luchtkwaliteit (NSL-monitoringstool)',
        'Toets aan het Basisnet Weg voor externe veiligheid',
      ],
      relevant: ['Houd rekening met de rijksweg'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Rijkswegen zijn relevant voor geluid, luchtkwaliteit en externe veiligheid.',
      relevant: 'Rijksweg in de omgeving.',
      niet_relevant: 'Geen rijkswegen.',
    },
  },

  VAARWEG: {
    wettelijkeGrondslag: 'Scheepvaartverkeerswet; Binnenvaartwet; Waterwet.',
    consequenties: {
      aandachtspunt: 'Vaarweg in de directe omgeving. Houd rekening met de beschermingszone en het scheepvaartverkeer.',
      relevant: 'Vaarweg in de omgeving.',
      niet_relevant: 'Geen vaarwegen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: ['Raadpleeg Rijkswaterstaat over de beschermingszone', 'Houd rekening met het scheepvaartverkeer'],
      relevant: ['Houd rekening met de vaarweg'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Vaarwegen zijn relevant bij bouwactiviteiten nabij water.',
      relevant: 'Vaarweg in de omgeving.',
      niet_relevant: 'Geen vaarwegen.',
    },
  },

  // ===================== MOBILITEIT =====================
  PARKEERDRUK: {
    wettelijkeGrondslag: 'Art. 4.1 Omgevingswet (omgevingsplan); CROW publicatie 381 "Toekomstbestendig parkeren".',
    consequenties: {
      aandachtspunt: 'Bij nieuwbouw of functiewijziging moeten voldoende parkeerplaatsen worden gerealiseerd conform de gemeentelijke parkeernormen. Bij onvoldoende parkeerplaatsen kan de vergunning worden geweigerd.',
      relevant: 'Parkeernormen zijn van toepassing. Raadpleeg de gemeentelijke parkeernota.',
      niet_relevant: 'Parkeren is niet direct relevant voor deze aanvraag.',
    },
    suggesties: {
      aandachtspunt: [
        'Raadpleeg de gemeentelijke parkeernormen (CROW publicatie 381)',
        'Bereken het benodigde aantal parkeerplaatsen op basis van de functie en locatie',
        'Bij onvoldoende ruimte: overweeg een parkeerbalans of financiele compensatie',
      ],
      relevant: ['Raadpleeg de gemeentelijke parkeernota'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Parkeren is relevant bij nieuwbouw en functiewijziging. Bij een uitbouw van een woning verandert de parkeerbehoefte doorgaans niet. Bij een functiewijziging naar horeca kan de parkeerbehoefte aanzienlijk toenemen.',
      relevant: 'Parkeernormen zijn van toepassing.',
      niet_relevant: 'Parkeren is niet direct relevant.',
    },
  },

  OV_BEREIKBAARHEID: {
    wettelijkeGrondslag: 'CROW publicatie 381; Ladder voor duurzame verstedelijking (art. 5.129g Bkl).',
    consequenties: {
      aandachtspunt: 'Goede OV-bereikbaarheid kan leiden tot lagere parkeernormen.',
      relevant: 'OV-bereikbaarheid is vastgesteld en kan de parkeernorm beinvloeden.',
      niet_relevant: 'Geen OV-voorzieningen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: ['Gebruik de OV-bereikbaarheid als argument voor lagere parkeernormen'],
      relevant: ['Houd rekening met de OV-bereikbaarheid bij de parkeerberekening'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'OV-bereikbaarheid is relevant bij de parkeerberekening.',
      relevant: 'OV-bereikbaarheid beinvloedt de parkeernorm.',
      niet_relevant: 'Geen OV-voorzieningen.',
    },
  },

  FIETSROUTE: {
    wettelijkeGrondslag: 'Gemeentelijk mobiliteitsplan; Provinciaal fietsbeleid.',
    consequenties: {
      aandachtspunt: 'Fietsroute in de omgeving. Houd rekening met het fietsverkeer.',
      relevant: 'Fietsroute in de omgeving.',
      niet_relevant: 'Geen hoofdfietsroutes in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: ['Houd rekening met het fietsverkeer bij de ontsluiting'],
      relevant: ['Raadpleeg de gemeentelijke fietskaart'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Fietsroutes zijn relevant bij de verkeersafwikkeling.',
      relevant: 'Fietsroute in de omgeving.',
      niet_relevant: 'Geen hoofdfietsroutes.',
    },
  },

  // ===================== OVERIG =====================
  ZORGINSTELLING: {
    wettelijkeGrondslag: 'Bevi art. 1 lid 1 sub l (kwetsbaar object); art. 5.12 Bkl.',
    consequenties: {
      aandachtspunt: 'Zorginstelling in de omgeving. Zorginstellingen zijn kwetsbare objecten bij externe veiligheid.',
      relevant: 'Zorginstelling in de omgeving.',
      niet_relevant: 'Geen zorginstellingen in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: ['Raadpleeg de Risicokaart voor kwetsbare objecten', 'Houd rekening met de zelfredzaamheid van bewoners'],
      relevant: ['Houd rekening met de zorginstelling'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Zorginstellingen zijn relevant bij externe veiligheid.',
      relevant: 'Zorginstelling in de omgeving.',
      niet_relevant: 'Geen zorginstellingen.',
    },
  },

  SCHOOL_KINDEROPVANG: {
    wettelijkeGrondslag: 'Bevi (kwetsbaar object); VNG Bedrijven en milieuzonering; GGD-richtlijn.',
    consequenties: {
      aandachtspunt: 'School of kinderopvang in de omgeving. Kwetsbaar object bij externe veiligheid en milieuzonering.',
      relevant: 'School of kinderopvang in de omgeving.',
      niet_relevant: 'Geen scholen of kinderopvang in de directe omgeving.',
    },
    suggesties: {
      aandachtspunt: ['Raadpleeg de Risicokaart', 'Toets aan de VNG-brochure Bedrijven en milieuzonering'],
      relevant: ['Houd rekening met de school/kinderopvang'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Scholen en kinderopvang zijn kwetsbare objecten.',
      relevant: 'School of kinderopvang in de omgeving.',
      niet_relevant: 'Geen scholen of kinderopvang.',
    },
  },

  LUCHTVAART_BEPERKING: {
    wettelijkeGrondslag: 'Art. 8.1 Wet luchtvaart; Luchthavenindelingbesluit (LIB); ILT.',
    consequenties: {
      aandachtspunt: 'Luchtvaartbeperkingen zijn van toepassing. Hoogtebeperkingen, geluidcontouren en externe veiligheidscontouren kunnen gelden.',
      relevant: 'Luchtvaartbeperkingen zijn een aandachtspunt.',
      niet_relevant: 'Geen luchtvaartbeperkingen van toepassing.',
    },
    suggesties: {
      aandachtspunt: ['Raadpleeg het LIB voor de specifieke beperkingen', 'Controleer de hoogtebeperkingen bij de ILT'],
      relevant: ['Raadpleeg het LIB'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Luchtvaartbeperkingen zijn relevant bij hoge gebouwen en nabij luchthavens.',
      relevant: 'Luchtvaartbeperkingen zijn een aandachtspunt.',
      niet_relevant: 'Geen luchtvaartbeperkingen.',
    },
  },

  DEFENSIE_ZONE: {
    wettelijkeGrondslag: 'Wet luchtvaart; Besluit militaire luchthavens; Regeling militaire luchthavens.',
    consequenties: {
      aandachtspunt: 'Defensiezone beperkt bouwhoogtes en bepaalde functies.',
      relevant: 'Defensiezone in de omgeving.',
      niet_relevant: 'Geen defensiezone.',
    },
    suggesties: {
      aandachtspunt: ['Raadpleeg het Ministerie van Defensie voor de exacte beperkingen', 'Controleer maximale bouwhoogte in de defensiezone'],
      relevant: ['Houd rekening met mogelijke beperkingen'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Defensiezones zijn relevant bij hoge gebouwen.',
      relevant: 'Defensiezone in de omgeving.',
      niet_relevant: 'Geen defensiezone.',
    },
  },
  BAG_PAND: {
    wettelijkeGrondslag: 'Wet basisregistraties adressen en gebouwen (Wet BAG); art. 2.1 lid 1 sub a Wabo (bouwen).',
    consequenties: {
      aandachtspunt: 'Pandgegevens tonen mogelijk verouderde of afwijkende registratie. Controleer of de BAG-gegevens overeenkomen met de feitelijke situatie.',
      relevant: 'BAG-gegevens zijn beschikbaar en geven inzicht in het bouwjaar, oppervlakte en gebruiksdoel van het pand.',
      niet_relevant: 'Geen BAG-pand gevonden op deze locatie.',
    },
    suggesties: {
      aandachtspunt: ['Controleer of de BAG-registratie overeenkomt met de feitelijke situatie', 'Bij afwijkingen: meld dit bij de gemeente voor correctie', 'Houd rekening met het bouwjaar bij constructieve beoordelingen'],
      relevant: ['Gebruik de BAG-gegevens als basis voor de aanvraag'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'BAG-gegevens zijn essentieel voor elke vergunningaanvraag. Het bouwjaar bepaalt welke constructieve eisen gelden en of asbest-risico aanwezig kan zijn (bouwjaar voor 1994).',
      relevant: 'De BAG-registratie vormt de basis voor de vergunningaanvraag.',
      niet_relevant: 'Geen pand geregistreerd; mogelijk onbebouwd terrein.',
    },
  },
  KADASTER: {
    wettelijkeGrondslag: 'Kadasterwet; art. 7:1 BW (eigendomsrecht); Wet kenbaarheid publiekrechtelijke beperkingen.',
    consequenties: {
      aandachtspunt: 'Kadastrale gegevens tonen mogelijk beperkingen of bijzondere eigendomssituaties.',
      relevant: 'Kadastrale informatie is beschikbaar voor deze locatie.',
      niet_relevant: 'Geen kadastrale informatie beschikbaar.',
    },
    suggesties: {
      aandachtspunt: ['Controleer eigendomssituatie en eventuele erfdienstbaarheden', 'Raadpleeg het Kadaster voor publiekrechtelijke beperkingen'],
      relevant: ['Gebruik kadastrale gegevens voor de situatietekening'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Kadastrale gegevens zijn relevant voor eigendomsverhoudingen en publiekrechtelijke beperkingen die van invloed kunnen zijn op de vergunningaanvraag.',
      relevant: 'Kadastrale informatie ondersteunt de aanvraag.',
      niet_relevant: 'Geen kadastrale informatie gevonden.',
    },
  },
  GEMEENTE: {
    wettelijkeGrondslag: 'Gemeentewet; Omgevingswet art. 4.1 (omgevingsplan); Wet algemene bepalingen omgevingsrecht.',
    consequenties: {
      aandachtspunt: 'De gemeente is het bevoegd gezag voor de meeste omgevingsvergunningen.',
      relevant: 'Gemeentelijke informatie is beschikbaar.',
      niet_relevant: 'Gemeente niet vastgesteld.',
    },
    suggesties: {
      aandachtspunt: ['Neem contact op met de gemeente voor vooroverleg', 'Raadpleeg het gemeentelijke omgevingsplan'],
      relevant: ['Controleer gemeentelijk beleid en verordeningen'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'De gemeente bepaalt het lokale beleid en is bevoegd gezag.',
      relevant: 'Gemeentelijke context is relevant voor de aanvraag.',
      niet_relevant: 'Geen gemeentelijke informatie beschikbaar.',
    },
  },
  GRONDGEBRUIK: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.1 (omgevingsplan); BRO (Basisregistratie Ondergrond).',
    consequenties: {
      aandachtspunt: 'Het huidige grondgebruik wijkt mogelijk af van de bestemming. Dit kan gevolgen hebben voor de vergunbaarheid.',
      relevant: 'Grondgebruiksgegevens zijn beschikbaar.',
      niet_relevant: 'Geen specifiek grondgebruik vastgesteld.',
    },
    suggesties: {
      aandachtspunt: ['Controleer of het voorgenomen gebruik past binnen het huidige grondgebruik', 'Bij afwijking: onderzoek of een omgevingsvergunning voor afwijken nodig is'],
      relevant: ['Gebruik grondgebruiksgegevens als context voor de aanvraag'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Grondgebruik bepaalt mede of een activiteit vergunningplichtig is.',
      relevant: 'Grondgebruik geeft context aan de locatie.',
      niet_relevant: 'Geen specifiek grondgebruik geregistreerd.',
    },
  },
  GRONDWATERSTAND: {
    wettelijkeGrondslag: 'Waterwet; BRO (Basisregistratie Ondergrond); art. 6.2 Bkl (grondwaterbeschermingsgebied).',
    consequenties: {
      aandachtspunt: 'Hoge grondwaterstand kan gevolgen hebben voor de fundering en kelderconstructie. Mogelijk zijn aanvullende maatregelen nodig.',
      relevant: 'Grondwaterstandgegevens zijn beschikbaar.',
      niet_relevant: 'Geen grondwaterstandgegevens beschikbaar.',
    },
    suggesties: {
      aandachtspunt: ['Laat een grondwateronderzoek uitvoeren', 'Overweeg waterdichte kelderconstructie of drainage', 'Raadpleeg het waterschap over grondwaterbeheer'],
      relevant: ['Houd rekening met de grondwaterstand bij het ontwerp'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Bij een uitbouw met kelder of souterrain is de grondwaterstand bepalend voor de constructie. Bij hoge grondwaterstand zijn waterdichte constructies of bemaling nodig.',
      relevant: 'Grondwaterstand is relevant voor funderingsontwerp.',
      niet_relevant: 'Geen grondwaterstandgegevens beschikbaar.',
    },
  },
  GRONDWATERBESCHERMING: {
    wettelijkeGrondslag: 'Omgevingswet art. 2.44 (grondwaterbeschermingsgebied); art. 6.2 Bkl; Provinciale omgevingsverordening.',
    consequenties: {
      aandachtspunt: 'De locatie ligt in een grondwaterbeschermingsgebied. Bepaalde activiteiten zijn verboden of vergunningplichtig.',
      relevant: 'Grondwaterbeschermingszone in de omgeving.',
      niet_relevant: 'Geen grondwaterbeschermingsgebied.',
    },
    suggesties: {
      aandachtspunt: ['Raadpleeg de provinciale omgevingsverordening voor verboden activiteiten', 'Controleer of de voorgenomen activiteit is toegestaan in het beschermingsgebied', 'Neem contact op met de provincie als bevoegd gezag'],
      relevant: ['Houd rekening met beperkingen in de omgeving'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'In grondwaterbeschermingsgebieden gelden strenge regels om de drinkwatervoorziening te beschermen. Bouwactiviteiten met bodemverstoring of opslag van gevaarlijke stoffen zijn mogelijk niet toegestaan.',
      relevant: 'Grondwaterbescherming is relevant voor de omgeving.',
      niet_relevant: 'Geen grondwaterbeschermingsgebied.',
    },
  },
  BESTEMMINGSPLAN: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.1 (omgevingsplan); art. 5.1 lid 1 sub a (omgevingsvergunning voor een omgevingsplanactiviteit).',
    consequenties: {
      aandachtspunt: 'Het bestemmingsplan/omgevingsplan bevat regels die de aanvraag mogelijk beperken. Controleer of de voorgenomen activiteit past binnen de regels.',
      relevant: 'Bestemmingsplan is vastgesteld en van toepassing.',
      niet_relevant: 'Geen bestemmingsplan gevonden.',
    },
    suggesties: {
      aandachtspunt: ['Controleer de planregels op Ruimtelijkeplannen.nl', 'Bij strijdigheid: onderzoek mogelijkheden voor een buitenplanse omgevingsplanactiviteit (BOPA)', 'Overweeg vooroverleg met de gemeente'],
      relevant: ['Raadpleeg de planregels voor de exacte voorwaarden'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Het bestemmingsplan/omgevingsplan is het belangrijkste toetsingskader. Bij een uitbouw moet de bouw passen binnen de bouwregels (maximale goot-/nokhoogte, bebouwingspercentage). Bij functiewijziging moet de nieuwe functie passen binnen de bestemming.',
      relevant: 'Het bestemmingsplan vormt de basis voor de toetsing.',
      niet_relevant: 'Geen bestemmingsplan gevonden voor deze locatie.',
    },
  },
  BESTEMMING: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.1; Besluit kwaliteit leefomgeving (Bkl) art. 5.1.',
    consequenties: {
      aandachtspunt: 'De enkelbestemming bepaalt welke functies zijn toegestaan. Bij afwijking is een omgevingsvergunning nodig.',
      relevant: 'Enkelbestemming is vastgesteld.',
      niet_relevant: 'Geen enkelbestemming gevonden.',
    },
    suggesties: {
      aandachtspunt: ['Controleer of de voorgenomen functie past binnen de enkelbestemming', 'Bij strijdigheid: onderzoek binnenplanse afwijkingsmogelijkheden'],
      relevant: ['Gebruik de bestemming als kader voor de aanvraag'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'De enkelbestemming is bepalend voor wat er op een locatie mag worden gebouwd en welke functies zijn toegestaan.',
      relevant: 'De bestemming geeft het juridische kader.',
      niet_relevant: 'Geen bestemming gevonden.',
    },
  },
  DUBBELBESTEMMING: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.1; Bro art. 3.2.3 (dubbelbestemmingen).',
    consequenties: {
      aandachtspunt: 'Dubbelbestemmingen leggen aanvullende beperkingen op bovenop de enkelbestemming. Mogelijk zijn aanvullende onderzoeken of vergunningen nodig.',
      relevant: 'Dubbelbestemming(en) van toepassing.',
      niet_relevant: 'Geen dubbelbestemmingen.',
    },
    suggesties: {
      aandachtspunt: ['Controleer de specifieke regels van elke dubbelbestemming', 'Bij Waarde-Archeologie: mogelijk archeologisch vooronderzoek nodig', 'Bij Waterstaat: watervergunning mogelijk vereist'],
      relevant: ['Houd rekening met de dubbelbestemmingsregels'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Dubbelbestemmingen zoals Waarde-Archeologie of Waterstaat-Waterkering leggen extra eisen op. Bij een uitbouw in een archeologisch waardevol gebied kan een archeologisch vooronderzoek verplicht zijn.',
      relevant: 'Dubbelbestemmingen geven aanvullende regels.',
      niet_relevant: 'Geen dubbelbestemmingen op deze locatie.',
    },
  },
  GEBIEDSAANDUIDING: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.1; Bro art. 3.2.4 (gebiedsaanduidingen).',
    consequenties: {
      aandachtspunt: 'Gebiedsaanduidingen bevatten aanvullende regels zoals vrijwaringszones, veiligheidszones of wijzigingsgebieden.',
      relevant: 'Gebiedsaanduiding(en) van toepassing.',
      niet_relevant: 'Geen gebiedsaanduidingen.',
    },
    suggesties: {
      aandachtspunt: ['Controleer de specifieke regels per gebiedsaanduiding', 'Bij vrijwaringszone: controleer of bouwen is toegestaan'],
      relevant: ['Raadpleeg de planregels voor de gebiedsaanduiding'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Gebiedsaanduidingen kunnen significante beperkingen opleggen.',
      relevant: 'Gebiedsaanduidingen geven aanvullend kader.',
      niet_relevant: 'Geen gebiedsaanduidingen.',
    },
  },
  BOUWVLAK: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.1; Bro art. 3.2.1 (bouwvlak als onderdeel van de verbeelding).',
    consequenties: {
      aandachtspunt: 'Het bouwvlak bepaalt waar op het perceel gebouwd mag worden. Bouwen buiten het bouwvlak is in principe niet toegestaan.',
      relevant: 'Bouwvlak is vastgesteld.',
      niet_relevant: 'Geen bouwvlak aangeduid.',
    },
    suggesties: {
      aandachtspunt: ['Controleer of de voorgenomen bouw binnen het bouwvlak valt', 'Bij overschrijding: onderzoek afwijkingsmogelijkheden in de planregels'],
      relevant: ['Gebruik het bouwvlak als kader voor het ontwerp'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Bij een uitbouw is het bouwvlak bepalend. Als de uitbouw buiten het bouwvlak valt, is een omgevingsvergunning voor afwijken nodig.',
      relevant: 'Het bouwvlak geeft de bouwgrenzen aan.',
      niet_relevant: 'Geen bouwvlak aangeduid.',
    },
  },
  FUNCTIEAANDUIDING: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.1; Bro art. 3.2.2 (functieaanduidingen).',
    consequenties: {
      aandachtspunt: 'Functieaanduidingen specificeren welke functies zijn toegestaan of juist uitgesloten.',
      relevant: 'Functieaanduiding(en) van toepassing.',
      niet_relevant: 'Geen functieaanduidingen.',
    },
    suggesties: {
      aandachtspunt: ['Controleer of de voorgenomen functie past binnen de functieaanduiding'],
      relevant: ['Raadpleeg de planregels voor de functieaanduiding'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Functieaanduidingen bepalen welke specifieke functies zijn toegestaan.',
      relevant: 'Functieaanduidingen geven detail aan de bestemming.',
      niet_relevant: 'Geen functieaanduidingen.',
    },
  },
  MAATVOERING: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.1; Bro art. 3.2.5 (maatvoeringaanduidingen).',
    consequenties: {
      aandachtspunt: 'Maatvoeringaanduidingen bepalen maximale bouwhoogtes, goothoogtes, bebouwingspercentages en andere bouwmaten.',
      relevant: 'Maatvoering is vastgesteld.',
      niet_relevant: 'Geen maatvoering aangeduid.',
    },
    suggesties: {
      aandachtspunt: ['Controleer maximale goot- en nokhoogte', 'Controleer maximaal bebouwingspercentage', 'Toets het ontwerp aan de maatvoeringregels'],
      relevant: ['Gebruik de maatvoering als ontwerpkader'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Bij een uitbouw zijn de maatvoeringregels direct bepalend voor de maximale afmetingen.',
      relevant: 'Maatvoering geeft de bouwmaten aan.',
      niet_relevant: 'Geen maatvoering aangeduid.',
    },
  },
  PLANREGELS: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.1; Bro art. 3.1.3 (planregels).',
    consequenties: {
      aandachtspunt: 'De planregels bevatten specifieke voorwaarden voor bouwen en gebruik.',
      relevant: 'Planregels zijn van toepassing.',
      niet_relevant: 'Geen planregels gevonden.',
    },
    suggesties: {
      aandachtspunt: ['Lees de volledige planregels op Ruimtelijkeplannen.nl', 'Let op afwijkingsregels en binnenplanse mogelijkheden'],
      relevant: ['Raadpleeg de planregels voor de exacte voorwaarden'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Planregels zijn het juridische hart van het bestemmingsplan.',
      relevant: 'Planregels geven de toetsingscriteria.',
      niet_relevant: 'Geen planregels gevonden.',
    },
  },
  DSO_ACTIVITEITEN: {
    wettelijkeGrondslag: 'Omgevingswet art. 5.1 (vergunningplicht); Besluit activiteiten leefomgeving (Bal).',
    consequenties: {
      aandachtspunt: 'Het DSO heeft vergunningplichtige activiteiten geidentificeerd voor deze locatie.',
      relevant: 'DSO-activiteiten zijn geraadpleegd.',
      niet_relevant: 'Geen DSO-activiteiten gevonden.',
    },
    suggesties: {
      aandachtspunt: ['Controleer welke activiteiten vergunningplichtig zijn via het Omgevingsloket', 'Dien de aanvraag in via het Omgevingsloket (omgevingsloket.nl)'],
      relevant: ['Raadpleeg het Omgevingsloket voor de actuele regels'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Het DSO (Digitaal Stelsel Omgevingswet) bepaalt welke activiteiten vergunningplichtig, meldingsplichtig of vergunningvrij zijn.',
      relevant: 'DSO-informatie is relevant voor de vergunningaanvraag.',
      niet_relevant: 'Geen DSO-activiteiten gevonden.',
    },
  },
  DSO_REGELS: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.1 (omgevingsplan); Besluit kwaliteit leefomgeving (Bkl).',
    consequenties: {
      aandachtspunt: 'Het DSO heeft toepasselijke regels gevonden voor deze locatie.',
      relevant: 'DSO-regels zijn geraadpleegd.',
      niet_relevant: 'Geen DSO-regels gevonden.',
    },
    suggesties: {
      aandachtspunt: ['Controleer de toepasselijke regels via het Omgevingsloket'],
      relevant: ['Raadpleeg het Omgevingsloket'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'DSO-regels geven de juridische kaders vanuit het omgevingsplan.',
      relevant: 'DSO-regels zijn informatief.',
      niet_relevant: 'Geen DSO-regels gevonden.',
    },
  },
  VOORBEREIDINGSBESLUIT: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.14 (voorbereidingsbesluit); art. 4.16 (aanhoudingsplicht).',
    consequenties: {
      aandachtspunt: 'Er is een voorbereidingsbesluit van kracht. Dit kan leiden tot een aanhoudingsplicht voor vergunningaanvragen.',
      relevant: 'Voorbereidingsbesluit is van toepassing.',
      niet_relevant: 'Geen voorbereidingsbesluit.',
    },
    suggesties: {
      aandachtspunt: ['Controleer of een aanhoudingsplicht geldt voor uw aanvraag', 'Neem contact op met de gemeente over de status van het voorbereidingsbesluit', 'Overweeg om de aanvraag uit te stellen tot het nieuwe plan is vastgesteld'],
      relevant: ['Houd rekening met mogelijke wijzigingen in het planologisch kader'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Een voorbereidingsbesluit betekent dat de gemeente werkt aan een nieuw omgevingsplan. Aanvragen kunnen worden aangehouden totdat het nieuwe plan is vastgesteld.',
      relevant: 'Voorbereidingsbesluit is informatief.',
      niet_relevant: 'Geen voorbereidingsbesluit.',
    },
  },
  PARAPLUPLAN: {
    wettelijkeGrondslag: 'Omgevingswet art. 4.1; Wro art. 3.1 (paraplubestemmingsplan).',
    consequenties: {
      aandachtspunt: 'Een parapluplan legt aanvullende regels op bovenop het reguliere bestemmingsplan (bijv. parkeren, reclame, kamerverhuur).',
      relevant: 'Parapluplan is van toepassing.',
      niet_relevant: 'Geen parapluplan.',
    },
    suggesties: {
      aandachtspunt: ['Controleer welke aanvullende regels het parapluplan bevat', 'Let op parkeerregels, reclamebeleid of andere thematische regels'],
      relevant: ['Raadpleeg het parapluplan op Ruimtelijkeplannen.nl'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Parapluplannen bevatten thematische regels die voor het hele grondgebied gelden.',
      relevant: 'Parapluplan geeft aanvullende regels.',
      niet_relevant: 'Geen parapluplan.',
    },
  },
  BEHEERSVERORDENING: {
    wettelijkeGrondslag: 'Wro art. 3.38 (beheersverordening); Invoeringswet Omgevingswet (overgangsrecht).',
    consequenties: {
      aandachtspunt: 'Een beheersverordening bevriest het bestaande gebruik. Nieuwe ontwikkelingen zijn in principe niet toegestaan.',
      relevant: 'Beheersverordening is van toepassing.',
      niet_relevant: 'Geen beheersverordening.',
    },
    suggesties: {
      aandachtspunt: ['Controleer of de voorgenomen activiteit past binnen het bestaande gebruik', 'Bij afwijking: een omgevingsvergunning voor afwijken is waarschijnlijk nodig'],
      relevant: ['Raadpleeg de beheersverordening'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Een beheersverordening staat alleen bestaand gebruik toe.',
      relevant: 'Beheersverordening is van toepassing.',
      niet_relevant: 'Geen beheersverordening.',
    },
  },
  NNN: {
    wettelijkeGrondslag: 'Omgevingswet art. 2.44; Provinciale omgevingsverordening; Bkl art. 7.7 (Natuurnetwerk Nederland).',
    consequenties: {
      aandachtspunt: 'De locatie ligt in of nabij het Natuurnetwerk Nederland (NNN). Significante aantasting van het NNN is niet toegestaan (nee, tenzij-regime).',
      relevant: 'NNN-gebied in de omgeving.',
      niet_relevant: 'Geen NNN-gebied.',
    },
    suggesties: {
      aandachtspunt: ['Laat een ecologisch onderzoek uitvoeren (quickscan flora en fauna)', 'Controleer de provinciale omgevingsverordening voor het NNN-regime', 'Bij significante effecten: compensatie is verplicht'],
      relevant: ['Houd rekening met het NNN bij het ontwerp'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Het NNN is het Nederlandse ecologische netwerk. Bij een uitbouw nabij NNN kan een ecologisch onderzoek nodig zijn om aan te tonen dat het NNN niet significant wordt aangetast.',
      relevant: 'NNN-gebied in de omgeving geeft ecologische context.',
      niet_relevant: 'Geen NNN-gebied in de omgeving.',
    },
  },
  ECOLOGISCHE_VERBINDING: {
    wettelijkeGrondslag: 'Omgevingswet art. 2.44; Provinciale omgevingsverordening; Wet natuurbescherming (Wnb) art. 1.12.',
    consequenties: {
      aandachtspunt: 'De locatie ligt nabij een ecologische verbindingszone. Verstoring van de verbinding is niet gewenst.',
      relevant: 'Ecologische verbinding in de omgeving.',
      niet_relevant: 'Geen ecologische verbinding.',
    },
    suggesties: {
      aandachtspunt: ['Onderzoek of de voorgenomen activiteit de ecologische verbinding verstoort', 'Overweeg mitigerende maatregelen (faunapassages, groene inrichting)'],
      relevant: ['Houd rekening met de ecologische verbinding'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Ecologische verbindingen zijn essentieel voor de biodiversiteit.',
      relevant: 'Ecologische verbinding geeft ecologische context.',
      niet_relevant: 'Geen ecologische verbinding.',
    },
  },
  BESCHERMD_NATUURGEBIED: {
    wettelijkeGrondslag: 'Wet natuurbescherming (Wnb) art. 2.1; Omgevingswet art. 5.1 lid 1 sub e.',
    consequenties: {
      aandachtspunt: 'De locatie ligt nabij een beschermd natuurgebied. Activiteiten die het gebied kunnen verstoren zijn vergunningplichtig.',
      relevant: 'Beschermd natuurgebied in de omgeving.',
      niet_relevant: 'Geen beschermd natuurgebied.',
    },
    suggesties: {
      aandachtspunt: ['Laat een ecologische quickscan uitvoeren', 'Controleer of een Wnb-vergunning nodig is'],
      relevant: ['Houd rekening met het beschermde gebied'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Beschermde natuurgebieden hebben een streng beschermingsregime.',
      relevant: 'Beschermd natuurgebied in de omgeving.',
      niet_relevant: 'Geen beschermd natuurgebied.',
    },
  },
  NATIONAAL_PARK: {
    wettelijkeGrondslag: 'Omgevingswet; Provinciale omgevingsverordening; Besluit kwaliteit leefomgeving.',
    consequenties: {
      aandachtspunt: 'De locatie ligt in of nabij een Nationaal Park. Strenge beperkingen voor bouwactiviteiten.',
      relevant: 'Nationaal Park in de omgeving.',
      niet_relevant: 'Geen Nationaal Park.',
    },
    suggesties: {
      aandachtspunt: ['Raadpleeg het beheerplan van het Nationaal Park', 'Controleer de provinciale regels voor het Nationaal Park'],
      relevant: ['Houd rekening met het Nationaal Park'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Nationale Parken hebben een bijzonder beschermingsregime.',
      relevant: 'Nationaal Park in de omgeving.',
      niet_relevant: 'Geen Nationaal Park.',
    },
  },
  STIKSTOF_AERIUS: {
    wettelijkeGrondslag: 'Wet natuurbescherming (Wnb) art. 2.7-2.8; Omgevingswet art. 5.1 lid 1 sub e; AERIUS Calculator (wettelijk rekenmodel).',
    consequenties: {
      aandachtspunt: 'AERIUS-berekening toont mogelijk significante stikstofdepositie op Natura 2000-gebieden. Een Wnb-vergunning kan nodig zijn.',
      relevant: 'AERIUS-gegevens zijn beschikbaar.',
      niet_relevant: 'Geen significante stikstofdepositie.',
    },
    suggesties: {
      aandachtspunt: ['Laat een AERIUS-berekening uitvoeren voor de bouw- en gebruiksfase', 'Bij depositie >0,00 mol/ha/jr: onderzoek intern salderen of extern salderen', 'Overweeg emissie-reducerende maatregelen (elektrisch materieel, warmtepomp)'],
      relevant: ['Raadpleeg AERIUS Calculator voor de actuele depositie'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Stikstof is een van de meest complexe vergunningsvraagstukken. Zelfs bij een kleine uitbouw kan de bouwfase stikstofdepositie veroorzaken op nabijgelegen Natura 2000-gebieden.',
      relevant: 'AERIUS geeft inzicht in de stikstofsituatie.',
      niet_relevant: 'Geen significante stikstofdepositie verwacht.',
    },
  },
  SOORTENBESCHERMING: {
    wettelijkeGrondslag: 'Wet natuurbescherming (Wnb) art. 3.1-3.10; Omgevingswet art. 5.1 lid 2 sub g.',
    consequenties: {
      aandachtspunt: 'Mogelijk beschermde soorten aanwezig. Een ecologische quickscan is mogelijk nodig.',
      relevant: 'Soortenbescherming is relevant.',
      niet_relevant: 'Geen indicatie van beschermde soorten.',
    },
    suggesties: {
      aandachtspunt: ['Laat een ecologische quickscan uitvoeren', 'Bij aanwezigheid beschermde soorten: ontheffing Wnb aanvragen', 'Plan werkzaamheden buiten het broedseizoen (15 maart - 15 juli)'],
      relevant: ['Houd rekening met beschermde soorten'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Bij sloop of verbouw van gebouwen kunnen beschermde soorten aanwezig zijn (vleermuizen, gierzwaluwen, huismussen).',
      relevant: 'Soortenbescherming is relevant voor de locatie.',
      niet_relevant: 'Geen indicatie van beschermde soorten.',
    },
  },
  WEIDEVOGELGEBIED: {
    wettelijkeGrondslag: 'Provinciale omgevingsverordening; Wnb art. 3.1-3.5 (soortenbescherming).',
    consequenties: {
      aandachtspunt: 'De locatie ligt in een weidevogelgebied. Verstoring van weidevogels is verboden.',
      relevant: 'Weidevogelgebied in de omgeving.',
      niet_relevant: 'Geen weidevogelgebied.',
    },
    suggesties: {
      aandachtspunt: ['Plan werkzaamheden buiten het broedseizoen', 'Laat een weidevogelonderzoek uitvoeren'],
      relevant: ['Houd rekening met weidevogels'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Weidevogelgebieden zijn kwetsbaar voor verstoring.',
      relevant: 'Weidevogelgebied in de omgeving.',
      niet_relevant: 'Geen weidevogelgebied.',
    },
  },
  HOUTOPSTANDEN: {
    wettelijkeGrondslag: 'Wet natuurbescherming (Wnb) art. 4.1-4.5 (houtopstanden); Omgevingswet art. 5.1 lid 2 sub i.',
    consequenties: {
      aandachtspunt: 'Kap van bomen buiten de bebouwde kom is meldingsplichtig. Herplantplicht geldt.',
      relevant: 'Houtopstanden in de omgeving.',
      niet_relevant: 'Geen houtopstanden.',
    },
    suggesties: {
      aandachtspunt: ['Doe een kapmelding bij de provincie minimaal 6 weken voor de kap', 'Herplantplicht: plant binnen 3 jaar een gelijkwaardig oppervlak'],
      relevant: ['Controleer of kap nodig is voor het project'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Bij bouwprojecten waarbij bomen moeten worden gekapt, geldt een meldingsplicht en herplantplicht.',
      relevant: 'Houtopstanden in de omgeving.',
      niet_relevant: 'Geen houtopstanden.',
    },
  },
  LANDSCHAPSTYPE: {
    wettelijkeGrondslag: 'Omgevingswet art. 2.1 (zorg voor de fysieke leefomgeving); Provinciale omgevingsverordening.',
    consequenties: {
      aandachtspunt: 'Het landschapstype kan eisen stellen aan de vormgeving en inpassing van bouwwerken.',
      relevant: 'Landschapstype is vastgesteld.',
      niet_relevant: 'Geen specifiek landschapstype.',
    },
    suggesties: {
      aandachtspunt: ['Houd rekening met landschappelijke inpassing', 'Raadpleeg de welstandsnota voor beeldkwaliteitseisen'],
      relevant: ['Gebruik het landschapstype als context voor het ontwerp'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Het landschapstype bepaalt mede de welstandseisen.',
      relevant: 'Landschapstype geeft context.',
      niet_relevant: 'Geen specifiek landschapstype.',
    },
  },
  AARDKUNDIG_WAARDEVOL: {
    wettelijkeGrondslag: 'Omgevingswet art. 2.1; Provinciale omgevingsverordening; Bkl art. 7.7.',
    consequenties: {
      aandachtspunt: 'De locatie heeft aardkundige waarde. Grondverzet en bodemingrepen kunnen beperkt zijn.',
      relevant: 'Aardkundige waarde in de omgeving.',
      niet_relevant: 'Geen aardkundige waarde.',
    },
    suggesties: {
      aandachtspunt: ['Beperk grondverzet en bodemingrepen', 'Raadpleeg de provincie voor specifieke beschermingsregels'],
      relevant: ['Houd rekening met aardkundige waarden'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Aardkundig waardevolle gebieden zijn beschermd tegen bodemingrepen.',
      relevant: 'Aardkundige waarde in de omgeving.',
      niet_relevant: 'Geen aardkundige waarde.',
    },
  },
  DONKERTEGEBIED: {
    wettelijkeGrondslag: 'Provinciale omgevingsverordening; Bkl art. 5.89 (lichthinder).',
    consequenties: {
      aandachtspunt: 'De locatie ligt in een donkertegebied. Buitenverlichting is beperkt om lichtvervuiling te voorkomen.',
      relevant: 'Donkertegebied in de omgeving.',
      niet_relevant: 'Geen donkertegebied.',
    },
    suggesties: {
      aandachtspunt: ['Beperk buitenverlichting tot het minimum', 'Gebruik neerwaarts gerichte armaturen', 'Raadpleeg de provinciale regels voor lichtemissie'],
      relevant: ['Houd rekening met lichtbeperkingen'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Donkertegebieden beschermen de nachtelijke duisternis voor ecologie en landschap.',
      relevant: 'Donkertegebied in de omgeving.',
      niet_relevant: 'Geen donkertegebied.',
    },
  },
  STILTEGEBIED: {
    wettelijkeGrondslag: 'Provinciale omgevingsverordening; Wet milieubeheer (Wm) art. 1.1.',
    consequenties: {
      aandachtspunt: 'De locatie ligt in een stiltegebied. Geluidproducerende activiteiten zijn beperkt.',
      relevant: 'Stiltegebied in de omgeving.',
      niet_relevant: 'Geen stiltegebied.',
    },
    suggesties: {
      aandachtspunt: ['Beperk geluidproducerende activiteiten', 'Raadpleeg de provinciale regels voor stiltegebieden'],
      relevant: ['Houd rekening met geluidbeperkingen'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Stiltegebieden beschermen de rust voor mens en natuur.',
      relevant: 'Stiltegebied in de omgeving.',
      niet_relevant: 'Geen stiltegebied.',
    },
  },
  WATERKERING: {
    wettelijkeGrondslag: 'Waterwet art. 2.1; Omgevingswet art. 5.1 lid 1 sub c (wateractiviteit); Keur van het waterschap.',
    consequenties: {
      aandachtspunt: 'De locatie ligt nabij een waterkering. Bouwen in of nabij de beschermingszone is vergunningplichtig bij het waterschap.',
      relevant: 'Waterkering in de omgeving.',
      niet_relevant: 'Geen waterkering.',
    },
    suggesties: {
      aandachtspunt: ['Vraag een watervergunning aan bij het waterschap', 'Controleer de keur voor de beschermingszones', 'Laat een geotechnisch onderzoek uitvoeren'],
      relevant: ['Houd rekening met de waterkering'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Waterkeringen beschermen tegen overstromingen. Bouwen in de beschermingszone kan de stabiliteit aantasten.',
      relevant: 'Waterkering in de omgeving.',
      niet_relevant: 'Geen waterkering.',
    },
  },
  BESCHERMINGSZONE_WATERKERING: {
    wettelijkeGrondslag: 'Waterwet art. 2.1; Keur van het waterschap; Legger.',
    consequenties: {
      aandachtspunt: 'De locatie ligt in de beschermingszone van een waterkering. Strenge beperkingen voor bouwactiviteiten.',
      relevant: 'Beschermingszone in de omgeving.',
      niet_relevant: 'Geen beschermingszone.',
    },
    suggesties: {
      aandachtspunt: ['Vraag een watervergunning aan bij het waterschap', 'Raadpleeg de legger voor de exacte zonering'],
      relevant: ['Controleer de keur'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'De beschermingszone waarborgt de stabiliteit van de waterkering.',
      relevant: 'Beschermingszone in de omgeving.',
      niet_relevant: 'Geen beschermingszone.',
    },
  },
  WATERGANG: {
    wettelijkeGrondslag: 'Waterwet; Keur van het waterschap; Legger.',
    consequenties: {
      aandachtspunt: 'De locatie ligt nabij een watergang. Bouwen in de beschermingszone is vergunningplichtig bij het waterschap.',
      relevant: 'Watergang in de omgeving.',
      niet_relevant: 'Geen watergang.',
    },
    suggesties: {
      aandachtspunt: ['Controleer de keur voor de beschermingszones langs de watergang', 'Vraag een watervergunning aan indien nodig'],
      relevant: ['Houd rekening met de watergang'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Watergangen hebben beschermingszones waar bouwactiviteiten beperkt zijn.',
      relevant: 'Watergang in de omgeving.',
      niet_relevant: 'Geen watergang.',
    },
  },
  WATERTOETS: {
    wettelijkeGrondslag: 'Omgevingswet art. 16.46 (watertoets); Bkl art. 5.37; Waterwet.',
    consequenties: {
      aandachtspunt: 'Een watertoets is verplicht bij ruimtelijke plannen. Het waterschap moet worden geraadpleegd.',
      relevant: 'Watertoets is relevant.',
      niet_relevant: 'Watertoets niet van toepassing.',
    },
    suggesties: {
      aandachtspunt: ['Vul de digitale watertoets in via dewatertoets.nl', 'Overleg met het waterschap over watercompensatie', 'Houd rekening met waterberging bij verharding'],
      relevant: ['Raadpleeg het waterschap'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'De watertoets borgt dat waterbelangen worden meegewogen bij ruimtelijke ontwikkelingen.',
      relevant: 'Watertoets is relevant voor de planvorming.',
      niet_relevant: 'Watertoets niet van toepassing.',
    },
  },
  WATERBERGING: {
    wettelijkeGrondslag: 'Waterwet; Keur van het waterschap; Gemeentelijke hemelwaterverordening.',
    consequenties: {
      aandachtspunt: 'Bij toename van verhard oppervlak is watercompensatie verplicht.',
      relevant: 'Waterberging is relevant.',
      niet_relevant: 'Geen waterbergingsvereiste.',
    },
    suggesties: {
      aandachtspunt: ['Bereken de toename van verhard oppervlak', 'Realiseer waterberging conform de gemeentelijke/waterschapsnormen', 'Overweeg groene daken, wadi\'s of infiltratiekratten'],
      relevant: ['Houd rekening met waterberging'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Bij een uitbouw neemt het verhard oppervlak toe, waardoor meer regenwater moet worden geborgen.',
      relevant: 'Waterberging is relevant bij verharding.',
      niet_relevant: 'Geen waterbergingsvereiste.',
    },
  },
  WATERWINGEBIED: {
    wettelijkeGrondslag: 'Omgevingswet art. 2.44; Provinciale omgevingsverordening; Drinkwaterwet.',
    consequenties: {
      aandachtspunt: 'De locatie ligt in een waterwingebied. Strenge beperkingen voor bouwactiviteiten en opslag van stoffen.',
      relevant: 'Waterwingebied in de omgeving.',
      niet_relevant: 'Geen waterwingebied.',
    },
    suggesties: {
      aandachtspunt: ['Raadpleeg de provinciale omgevingsverordening', 'Controleer of de voorgenomen activiteit is toegestaan'],
      relevant: ['Houd rekening met het waterwingebied'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Waterwingebieden beschermen de drinkwatervoorziening.',
      relevant: 'Waterwingebied in de omgeving.',
      niet_relevant: 'Geen waterwingebied.',
    },
  },
  KEUR_WATERSCHAP: {
    wettelijkeGrondslag: 'Waterschapswet art. 78 (keur); Waterwet.',
    consequenties: {
      aandachtspunt: 'De keur van het waterschap bevat regels voor bouwen nabij water.',
      relevant: 'Keur is van toepassing.',
      niet_relevant: 'Geen keur van toepassing.',
    },
    suggesties: {
      aandachtspunt: ['Raadpleeg de keur van het waterschap', 'Controleer of een watervergunning nodig is'],
      relevant: ['Controleer de keur'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'De keur regelt het waterbeheer in het waterschapsgebied.',
      relevant: 'Keur is van toepassing.',
      niet_relevant: 'Geen keur van toepassing.',
    },
  },
  OVERSTROMINGSRISICO: {
    wettelijkeGrondslag: 'Waterwet; Bkl art. 5.37 (overstromingsrisico); EU Richtlijn Overstromingsrisico\'s.',
    consequenties: {
      aandachtspunt: 'De locatie heeft een verhoogd overstromingsrisico. Aanvullende maatregelen kunnen nodig zijn.',
      relevant: 'Overstromingsrisico is relevant.',
      niet_relevant: 'Geen significant overstromingsrisico.',
    },
    suggesties: {
      aandachtspunt: ['Raadpleeg de overstromingsrisicokaart (risicokaart.nl)', 'Overweeg waterbestendige bouwmaatregelen', 'Houd rekening met evacuatiemogelijkheden'],
      relevant: ['Raadpleeg de risicokaart'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Overstromingsrisico is relevant voor de veiligheid van bewoners.',
      relevant: 'Overstromingsrisico geeft context.',
      niet_relevant: 'Geen significant overstromingsrisico.',
    },
  },
  ZWEMWATER: {
    wettelijkeGrondslag: 'Wet hygiene en veiligheid badinrichtingen en zwemgelegenheden; EU Zwemwaterrichtlijn 2006/7/EG.',
    consequenties: {
      aandachtspunt: 'De locatie ligt nabij een officieel zwemwater. Activiteiten die de waterkwaliteit beinvloeden zijn beperkt.',
      relevant: 'Zwemwater in de omgeving.',
      niet_relevant: 'Geen zwemwater.',
    },
    suggesties: {
      aandachtspunt: ['Voorkom lozingen die de zwemwaterkwaliteit beinvloeden', 'Raadpleeg het waterschap over de beschermingszones'],
      relevant: ['Houd rekening met het zwemwater'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Zwemwaterlocaties zijn beschermd tegen verontreiniging.',
      relevant: 'Zwemwater in de omgeving.',
      niet_relevant: 'Geen zwemwater.',
    },
  },
  BODEMKWALITEIT: {
    wettelijkeGrondslag: 'Omgevingswet art. 5.1 lid 2 sub b; Besluit activiteiten leefomgeving (Bal) art. 3.46-3.78; Besluit bodemkwaliteit.',
    consequenties: {
      aandachtspunt: 'Mogelijk verontreinigde bodem. Een bodemonderzoek (NEN 5740) is waarschijnlijk nodig voor de vergunningaanvraag.',
      relevant: 'Bodemkwaliteitsgegevens zijn beschikbaar.',
      niet_relevant: 'Geen bodemkwaliteitsinformatie beschikbaar.',
    },
    suggesties: {
      aandachtspunt: ['Laat een verkennend bodemonderzoek (NEN 5740) uitvoeren', 'Bij verontreiniging: nader onderzoek en saneringsplan', 'Raadpleeg de bodemkwaliteitskaart van de gemeente'],
      relevant: ['Controleer de bodemkwaliteitskaart'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Bij bouwactiviteiten met grondroering is een bodemonderzoek vaak verplicht. Bij een uitbouw met fundering of kelder is bodemonderzoek standaard vereist.',
      relevant: 'Bodemkwaliteit is relevant voor de aanvraag.',
      niet_relevant: 'Geen bodemkwaliteitsinformatie beschikbaar.',
    },
  },
  ONTPLOFBARE_OORLOGSRESTEN: {
    wettelijkeGrondslag: 'Arbeidsomstandighedenwet (Arbowet); Arbeidsomstandighedenbesluit art. 4.17; WSCS-OCE.',
    consequenties: {
      aandachtspunt: 'De locatie heeft een verhoogd risico op ontplofbare oorlogsresten (OO). Een vooronderzoek CE (Conventionele Explosieven) is mogelijk verplicht.',
      relevant: 'OO-risico in de omgeving.',
      niet_relevant: 'Geen OO-risico.',
    },
    suggesties: {
      aandachtspunt: ['Laat een vooronderzoek CE uitvoeren conform WSCS-OCE', 'Bij positief resultaat: detectieonderzoek voor aanvang grondwerk', 'Neem OO-risico op in het V&G-plan'],
      relevant: ['Controleer de OO-risicokaart'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Bij grondroering in gebieden met OO-risico is een vooronderzoek verplicht vanuit de Arbowet.',
      relevant: 'OO-risico is relevant bij grondwerk.',
      niet_relevant: 'Geen OO-risico.',
    },
  },
  ASBEST_RISICO: {
    wettelijkeGrondslag: 'Arbeidsomstandighedenbesluit art. 4.37-4.59; Asbestverwijderingsbesluit 2005; Bouwbesluit 2012 art. 7.22.',
    consequenties: {
      aandachtspunt: 'Het pand is gebouwd voor 1994 en bevat mogelijk asbesthoudende materialen. Een asbestinventarisatie is verplicht voor sloop of verbouw.',
      relevant: 'Asbestrisico is relevant.',
      niet_relevant: 'Geen asbestrisico (pand na 1994).',
    },
    suggesties: {
      aandachtspunt: ['Laat een asbestinventarisatie (type A) uitvoeren door een SC-540 gecertificeerd bedrijf', 'Bij asbest: laat verwijdering uitvoeren door een gecertificeerd bedrijf', 'Doe een sloopmelding minimaal 4 weken voor aanvang'],
      relevant: ['Controleer of asbest aanwezig kan zijn'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Bij panden gebouwd voor 1994 is de kans op asbest groot. Bij verbouw of sloop is een asbestinventarisatie wettelijk verplicht.',
      relevant: 'Asbestrisico is relevant bij oudere panden.',
      niet_relevant: 'Pand gebouwd na 1994; asbestrisico verwaarloosbaar.',
    },
  },
  FUNDERINGSPROBLEMATIEK: {
    wettelijkeGrondslag: 'Bouwbesluit 2012 art. 2.1-2.6 (constructieve veiligheid); NEN 8700 (beoordeling bestaande constructies).',
    consequenties: {
      aandachtspunt: 'Mogelijk funderingsproblemen door slappe bodem of hoge grondwaterstand. Een funderingsonderzoek kan nodig zijn.',
      relevant: 'Funderingsrisico is relevant.',
      niet_relevant: 'Geen funderingsproblematiek verwacht.',
    },
    suggesties: {
      aandachtspunt: ['Laat een funderingsonderzoek uitvoeren', 'Raadpleeg het KCAF (Kennis Centrum Aanpak Funderingsproblematiek)', 'Controleer of de bestaande fundering voldoende draagkracht heeft voor de uitbreiding'],
      relevant: ['Houd rekening met funderingsrisico'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Bij een uitbouw moet de fundering voldoende draagkracht hebben. In gebieden met slappe bodem of houten paalfunderingen is extra aandacht nodig.',
      relevant: 'Funderingsrisico is relevant voor het ontwerp.',
      niet_relevant: 'Geen funderingsproblematiek verwacht.',
    },
  },
  ONDERZOEKSVEREISTEN: {
    wettelijkeGrondslag: 'Omgevingswet art. 16.53-16.55 (indieningsvereisten); Omgevingsregeling art. 7.1-7.188.',
    consequenties: {
      aandachtspunt: 'Op basis van de scan zijn aanvullende onderzoeken geidentificeerd die nodig kunnen zijn voor de vergunningaanvraag.',
      relevant: 'Onderzoeksvereisten zijn vastgesteld.',
      niet_relevant: 'Geen aanvullende onderzoeken nodig.',
    },
    suggesties: {
      aandachtspunt: ['Voer de geidentificeerde onderzoeken uit voor indiening van de aanvraag', 'Raadpleeg de gemeente voor de exacte indieningsvereisten'],
      relevant: ['Controleer de indieningsvereisten'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'De onderzoeksvereisten zijn afhankelijk van het type aanvraag en de locatie.',
      relevant: 'Onderzoeksvereisten geven richting aan de aanvraag.',
      niet_relevant: 'Geen aanvullende onderzoeken nodig.',
    },
  },
  GELUIDZONE_LUCHTVAART: {
    wettelijkeGrondslag: 'Wet luchtvaart art. 8.1; Luchthavenindelingbesluit (LIB); Bkl art. 3.30.',
    consequenties: {
      aandachtspunt: 'De locatie ligt in een geluidzone van een luchthaven. Geluidgevoelige functies zijn mogelijk beperkt.',
      relevant: 'Geluidzone luchtvaart in de omgeving.',
      niet_relevant: 'Geen geluidzone luchtvaart.',
    },
    suggesties: {
      aandachtspunt: ['Controleer het LIB voor de exacte geluidcontouren', 'Bij geluidgevoelige functies: akoestisch onderzoek vereist', 'Raadpleeg de ILT voor de beperkingen'],
      relevant: ['Houd rekening met luchtvaartgeluid'],
      niet_relevant: [],
    },
    relevantieToelichting: {
      aandachtspunt: 'Luchtvaartgeluid kan woningbouw beperken in de geluidzone.',
      relevant: 'Geluidzone luchtvaart in de omgeving.',
      niet_relevant: 'Geen geluidzone luchtvaart.',
    },
  },
};
