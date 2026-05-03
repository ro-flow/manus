import { describe, it, expect } from 'vitest';
import { voerMilieuToetsSignaleringUit } from './milieuToetsService';

describe('milieuToetsService', () => {
  describe('voerMilieuToetsSignaleringUit', () => {
    it('should detect bouwactiviteit type', () => {
      const result = voerMilieuToetsSignaleringUit(
        ['bouwen', 'verbouwen'],
        'Bouwen van een uitbouw aan de achterzijde',
        false,
        25,
        null
      );
      
      expect(result.activiteitType).toBe('bouwactiviteit');
      expect(result.isToetsNodig).toBe(true);
    });

    it('should detect milieubelastende activiteit', () => {
      const result = voerMilieuToetsSignaleringUit(
        ['horeca', 'restaurant'],
        'Exploitatie van een restaurant met terras en muziek installatie',
        false,
        200,
        null
      );
      
      expect(result.activiteitType).toBe('milieubelastende_activiteit');
      expect(result.isToetsNodig).toBe(true);
      // Geluid moet relevant zijn door 'muziek' keyword
      const geluidThema = result.relevanteThemas.find(t => t.code === 'geluid');
      expect(geluidThema?.isRelevant).toBe(true);
    });

    it('should include BOPA motivering when isBopa is true', () => {
      const result = voerMilieuToetsSignaleringUit(
        ['functiewijziging', 'wonen'],
        'Wijzigen van kantoor naar woningen',
        true, // isBopa
        500,
        10
      );
      
      expect(result.bopaMotivering).not.toBeNull();
      expect(result.bopaMotivering?.isVanToepassing).toBe(true);
      expect(result.bopaMotivering?.integraleBelangafweging.length).toBeGreaterThan(0);
    });

    it('should check MER requirement for large projects', () => {
      const result = voerMilieuToetsSignaleringUit(
        ['woningbouw', 'nieuwbouw'],
        'Nieuwbouw van 2500 woningen',
        false,
        50000,
        2500 // Meer dan 2000 woningen
      );
      
      expect(result.merBeoordeling.isNodig).toBe(true);
    });

    it('should generate checklist items', () => {
      const result = voerMilieuToetsSignaleringUit(
        ['bouwen'],
        'Bouwen van een woning',
        false,
        150,
        1
      );
      
      expect(result.checklist.length).toBeGreaterThan(0);
      // Check dat er verplichte items zijn
      const verplichtItems = result.checklist.filter(item => item.status === 'verplicht');
      expect(verplichtItems.length).toBeGreaterThan(0);
    });

    it('should include Bal/Bkl regelverwijzingen', () => {
      const result = voerMilieuToetsSignaleringUit(
        ['bouwen', 'verbouwen'],
        'Verbouwen van een woning',
        false,
        100,
        null
      );
      
      expect(result.balBklRegels.length).toBeGreaterThan(0);
      // Check dat regels URLs hebben
      result.balBklRegels.forEach(regel => {
        expect(regel.url).toContain('wetten.overheid.nl');
      });
    });

    it('should identify relevant milieuthemas', () => {
      const result = voerMilieuToetsSignaleringUit(
        ['industrie', 'productie'],
        'Oprichten van een productiefaciliteit met machines, afvalverwerking en waterlozing',
        false,
        5000,
        null
      );
      
      // Meerdere themas moeten relevant zijn door keywords in omschrijving
      const relevanteThemas = result.relevanteThemas.filter(t => t.isRelevant);
      expect(relevanteThemas.length).toBeGreaterThan(1);
    });

    it('should return samenvatting', () => {
      const result = voerMilieuToetsSignaleringUit(
        ['bouwen'],
        'Bouwen van een schuur',
        false,
        50,
        null
      );
      
      expect(result.samenvatting).toBeTruthy();
      expect(result.samenvatting.length).toBeGreaterThan(20);
    });
  });
});
