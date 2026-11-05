import type { PresentationLooks } from '../visuals';

export const CLASS_LOOKS: PresentationLooks = {
  projectiles: {
    mage_fire_bolt: { color: '#ff985c', shape: 'ember' }, mage_fire_cinder: { color: '#ffbd6a', shape: 'ember' },
    mage_water_orb: { color: '#72dcff', shape: 'diamond' }, mage_water_mirror: { color: '#b6eafa', shape: 'mirror' },
    mage_earth_light: { color: '#d6b57b', shape: 'wisp' }, mage_wind_bolt: { color: '#a6e5bd', shape: 'orb' },
    boss_unstoppable: { color: '#ff3232', shape: 'shard' } },
  zones: {
    mage_blink_burst: { ring: '#dab1ff', burst: '#e9d5ff', fill: '#b685e62a' },
    // La meteora con i toni del fuoco (rampa delle primarie del Mago), non il viola predefinito delle zone del giocatore.
    meteor: { ring: '#e77c40', burst: '#f0bd72', fill: '#cb49391c' },
  },
};
