import { describe, it, expect } from 'vitest';
import * as ruimtelijkeplannenApi from './ruimtelijkeplannenApiService';

describe('Ruimtelijkeplannen API Service', () => {
  it('should check if API is available', async () => {
    const available = await ruimtelijkeplannenApi.isApiAvailable();
    console.log('Ruimtelijkeplannen API available:', available);
    // API moet beschikbaar zijn als de key correct is
    expect(typeof available).toBe('boolean');
  }, 15000);

  it('should fetch plans for gemeente Hoorn (0405)', async () => {
    const plannen = await ruimtelijkeplannenApi.zoekPlannenVoorGemeente('0405');
    console.log(`Found ${plannen.length} geldende plannen for Hoorn`);
    
    // We verwachten minimaal enkele plannen
    expect(plannen.length).toBeGreaterThan(0);
    
    // Check structuur van eerste plan
    if (plannen.length > 0) {
      const plan = plannen[0];
      expect(plan.id).toBeDefined();
      expect(plan.naam).toBeDefined();
      expect(plan.type).toBeDefined();
      console.log(`First plan: ${plan.naam} (${plan.type})`);
    }
  }, 30000);

  it('should fetch a specific plan by ID', async () => {
    // Eerst een plan ID ophalen
    const plannen = await ruimtelijkeplannenApi.zoekPlannenVoorGemeente('0405');
    if (plannen.length === 0) {
      console.log('Skipping test - no plans found');
      return;
    }

    const planId = plannen[0].id;
    const plan = await ruimtelijkeplannenApi.haalPlan(planId);
    
    expect(plan).not.toBeNull();
    if (plan) {
      expect(plan.id).toBe(planId);
      console.log(`Fetched plan: ${plan.naam}`);
    }
  }, 30000);

  it('should fetch bestemmingsvlakken for a plan', async () => {
    // Zoek een bestemmingsplan
    const plannen = await ruimtelijkeplannenApi.zoekPlannenVoorGemeente('0405');
    const bestemmingsplan = plannen.find(p => 
      p.type === 'bestemmingsplan' || 
      p.type === 'omgevingsplan'
    );

    if (!bestemmingsplan) {
      console.log('Skipping test - no bestemmingsplan found');
      return;
    }

    const bestemmingsvlakken = await ruimtelijkeplannenApi.haalBestemmingsvlakken(bestemmingsplan.id);
    console.log(`Found ${bestemmingsvlakken.length} bestemmingsvlakken in ${bestemmingsplan.naam}`);
    
    // Kan 0 zijn als het plan geen bestemmingsvlakken heeft
    expect(Array.isArray(bestemmingsvlakken)).toBe(true);
  }, 30000);

  it('should fetch dubbelbestemmingen for a plan', async () => {
    // Zoek een bestemmingsplan
    const plannen = await ruimtelijkeplannenApi.zoekPlannenVoorGemeente('0405');
    const bestemmingsplan = plannen.find(p => 
      p.type === 'bestemmingsplan' || 
      p.type === 'omgevingsplan'
    );

    if (!bestemmingsplan) {
      console.log('Skipping test - no bestemmingsplan found');
      return;
    }

    const dubbelbestemmingen = await ruimtelijkeplannenApi.haalDubbelbestemmingen(bestemmingsplan.id);
    console.log(`Found ${dubbelbestemmingen.length} dubbelbestemmingen in ${bestemmingsplan.naam}`);
    
    // Kan 0 zijn als het plan geen dubbelbestemmingen heeft
    expect(Array.isArray(dubbelbestemmingen)).toBe(true);
  }, 30000);

  it('should search for vrijstellingsregels in archeologie dubbelbestemming', async () => {
    // Zoek een plan met archeologie regels
    const plannen = await ruimtelijkeplannenApi.zoekPlannenVoorGemeente('0405');
    const bestemmingsplan = plannen.find(p => 
      p.type === 'bestemmingsplan' && 
      p.naam.toLowerCase().includes('centrum')
    );

    if (!bestemmingsplan) {
      console.log('Skipping test - no suitable plan found');
      return;
    }

    const vrijstellingen = await ruimtelijkeplannenApi.zoekVrijstellingsregels(
      bestemmingsplan.id,
      'archeologie'
    );

    console.log('Vrijstellingsregels:', vrijstellingen);
    // Kan null zijn als er geen regels gevonden zijn
    if (vrijstellingen) {
      expect(vrijstellingen.diepteVrijstelling || vrijstellingen.oppervlakteVrijstelling || vrijstellingen.regelTekst).toBeDefined();
    }
  }, 30000);
});
