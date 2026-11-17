// Écosystème Liafrik Tech — source unique utilisée par la landing, le blog,
// l'éditeur du blog (insertion rapide de liens) et l'assistant IA.
export interface EcosystemProduct {
  id: string;
  name: string;
  url: string;
  domain: string;
  category: string;
  tagline: string;
  description: string;
  color: string;
  linkable: boolean; // false = pas de lien propre (renvoie vers liafrik.com)
}

export const LIAFRIK_URL = 'https://liafrik.com';

export const ECOSYSTEM_PRODUCTS: EcosystemProduct[] = [
  {
    id: 'libooks', name: 'LiBooks', url: 'https://libooks.liafrik.com', domain: 'libooks.liafrik.com', linkable: true,
    category: 'Finance', color: '#0057D9',
    tagline: 'Comptabilité & facturation en ligne',
    description: 'Comptabilité SYSCOHADA, facturation, stocks, Mobile Money, paie et IA — la référence pour les entreprises africaines.',
  },
  {
    id: 'sellia', name: 'Sellia', url: 'https://sellia.liafrik.com', domain: 'sellia.liafrik.com', linkable: true,
    category: 'E-commerce', color: '#7C3AED',
    tagline: 'L’alternative africaine à Shopify',
    description: 'Créez votre site e-commerce, connectez toutes vos intégrations et encaissez par Mobile Money comme par carte.',
  },
  {
    id: 'zanldo', name: 'Zanldo', url: 'https://zanldo.com', domain: 'zanldo.com', linkable: true,
    category: 'Marketplace', color: '#F97316',
    tagline: 'La marketplace africaine, livrée au dernier kilomètre',
    description: 'L’alternative africaine à Amazon, Noon et Alibaba : commerçants, clients et partenaires logistiques réunis, pensée pour les réalités du terrain.',
  },
  {
    id: 'zanldo-express', name: 'Zanldo Express', url: 'https://express.zanldo.com', domain: 'express.zanldo.com', linkable: true,
    category: 'Logistique', color: '#EA580C',
    tagline: 'Le SaaS logistique construit pour l’Afrique',
    description: 'Expéditions, livreurs, suivi et dernier kilomètre — conçu avec les réalités du terrain africain.',
  },
  {
    id: 'nutro', name: 'Nutro', url: 'https://nutro.liafrik.com', domain: 'nutro.liafrik.com', linkable: true,
    category: 'Restauration', color: '#E11D48',
    tagline: 'POS restaurant premium, tablette & KDS',
    description: 'Prise de commande sur tablette, écran cuisine (KDS), salle, livraison et encaissement — l’expérience restaurant haut de gamme.',
  },
  {
    id: 'posflow', name: 'POS Flow', url: 'https://pos.liafrik.com', domain: 'pos.liafrik.com', linkable: true,
    category: 'Point de vente', color: '#0EA5E9',
    tagline: 'Le point de vente nouvelle génération',
    description: 'Caisse rapide, stocks synchronisés, multi-boutiques et Mobile Money — ambitionne d’être le meilleur POS du monde.',
  },
  {
    id: 'stella', name: 'Stella', url: 'https://stella.liafrik.com', domain: 'stella.liafrik.com', linkable: true,
    category: 'Beauté & bien-être', color: '#DB2777',
    tagline: 'L’alternative à Fresha',
    description: 'Réservation en ligne, agenda, caisse et fidélisation pour salons de beauté, spas et barbiers.',
  },
  {
    id: 'elora', name: 'Elora', url: 'https://elora.liafrik.com', domain: 'elora.liafrik.com', linkable: true,
    category: 'Pressing', color: '#14B8A6',
    tagline: 'La gestion de pressing, à l’échelle mondiale',
    description: 'Dépôts, tickets, suivi des articles, livraison et fidélité — une plateforme pressing pensée pour le monde entier.',
  },
  {
    id: 'sukulu', name: 'Sukulu', url: 'https://gosukulu.com', domain: 'gosukulu.com', linkable: true,
    category: 'Éducation', color: '#16A34A',
    tagline: 'La plateforme des établissements scolaires',
    description: 'Élèves, parents, enseignants, notes, frais de scolarité et communication — tout l’établissement réuni.',
  },
  {
    id: 'health-cloud', name: 'Health Cloud', url: LIAFRIK_URL, domain: 'liafrik.com', linkable: false,
    category: 'Santé', color: '#2563EB',
    tagline: 'La gestion hospitalière à la pointe',
    description: 'Hôpitaux, cliniques et centres de santé : dossiers patients, rendez-vous, facturation et pharmacie, très premium.',
  },
  {
    id: 'afrik-cloud', name: 'afrik.cloud', url: 'https://afrik.cloud', domain: 'afrik.cloud', linkable: true,
    category: 'Talents', color: '#F59E0B',
    tagline: 'La vitrine gratuite des talents africains',
    description: 'Une plateforme pour exposer gratuitement les talents africains au monde.',
  },
];

export const LIYAH_GROUP = {
  name: 'LIYAH GROUP',
  url: LIAFRIK_URL,
  description: 'Maison mère de Liafrik Tech — agence digitale : développement web, applications mobiles et accompagnement digital.',
};
