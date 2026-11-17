import DOMPurify from 'dompurify';
import { ECOSYSTEM_PRODUCTS } from './ecosystem';

export interface BlogPost {
  id: string;
  slug: string;
  lang: 'fr' | 'en';
  title: string;
  excerpt: string;
  content: string;
  cover_url?: string | null;
  category: string;
  tags: string[];
  author: string;
  reading_min: number;
  published: boolean;
  published_at?: string | null;
  created_at?: string;
  meta_title?: string | null;
  cover_alt?: string | null;
  featured?: boolean;
}

export function slugify(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

/** Écosystème Liafrik mis en avant dans le blog (source : lib/ecosystem.ts). */
export const ECOSYSTEM = ECOSYSTEM_PRODUCTS.map((p) => ({ name: p.name, url: p.url, desc: p.tagline }));

const SANITIZE_OPTS = {
  ADD_ATTR: ['target', 'rel'],
  ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'img', 'figure', 'figcaption', 'span', 'div', 'mark'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'loading', 'width', 'height', 'style'],
};

/** Nettoyage du HTML produit par l'éditeur riche (collage + enregistrement). */
export const sanitizeEditorHtml = (html: string) => DOMPurify.sanitize(html, SANITIZE_OPTS) as unknown as string;

/** Contenu d'article : HTML (éditeur riche du CMS) ou Markdown (anciens articles). */
export function renderContent(content: string): string {
  const trimmed = (content || '').trim();
  if (trimmed.startsWith('<')) {
    const html = DOMPurify.sanitize(trimmed, SANITIZE_OPTS) as unknown as string;
    // liens externes : nouvel onglet + sécurité
    return html.replace(/<a href="(https?:\/\/[^"]+)"(?![^>]*target=)/g, '<a href="$1" target="_blank" rel="noopener"');
  }
  return renderMarkdown(trimmed);
}

/** Temps de lecture estimé (≈ 220 mots/min). */
export function readingMinutes(content: string): number {
  const text = (content || '').replace(/<[^>]+>/g, ' ').replace(/[#*>\-[\]()]/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Mini rendu Markdown → HTML assaini (titres, gras, italique, listes, liens, citations). */
export function renderMarkdown(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, (_m, t, u) =>
      `<a href="${u}"${u.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`);
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) { close(); out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`); continue; }
    if (/^##\s+/.test(line)) { close(); out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`); continue; }
    if (/^>\s?/.test(line)) { close(); out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`); continue; }
    if (/^[-*]\s+/.test(line)) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`); continue; }
    if (/^\d+\.\s+/.test(line)) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`); continue; }
    if (!line.trim()) { close(); continue; }
    close(); out.push(`<p>${inline(line)}</p>`);
  }
  close();
  return DOMPurify.sanitize(out.join('\n'), { ADD_ATTR: ['target'] }) as unknown as string;
}

const D = '2026-11-17T08:00:00Z';

/** Articles éditoriaux intégrés (toujours disponibles, même hors-ligne / sans base). */
export const STATIC_POSTS: BlogPost[] = [
  {
    id: 's1', slug: 'ecosysteme-liafrik-tech-afrique', lang: 'fr', published: true, published_at: D,
    title: 'L’écosystème Liafrik : 11 plateformes pour bâtir la tech africaine de référence',
    excerpt: 'LiBooks, Sellia, Zanldo, Nutro, POS Flow, Stella, Elora, Sukulu, Health Cloud… Découvrez l’écosystème Liafrik Tech, filiale de LIYAH GROUP.',
    category: 'Écosystème Liafrik', tags: ['Liafrik', 'LIYAH GROUP', 'tech africaine', 'Sellia', 'Zanldo'], author: 'Équipe Liafrik Tech', reading_min: 7,
    content: `## Une conviction : l’Afrique mérite des logiciels conçus pour elle
Pendant longtemps, les entreprises africaines ont dû adapter leurs usages à des outils pensés ailleurs : connexion supposée permanente, carte bancaire comme unique moyen de paiement, normes comptables étrangères. **Liafrik Tech** est née du constat inverse : c’est au logiciel de s’adapter au terrain.

## LIYAH GROUP, la maison mère
Liafrik Tech est la filiale technologique de **LIYAH GROUP**, agence digitale spécialisée dans le développement web, la création d’applications mobiles et l’accompagnement digital des marques. Cette double culture — agence et éditeur de logiciels — explique l’obsession du détail et du design premium que l’on retrouve dans chaque produit. Plus d’informations sur [liafrik.com](https://liafrik.com).

## Un pont entre Dubaï et le continent
Liafrik opère avec une double présence, à Dubaï et en Afrique. Dubaï apporte les standards internationaux, le cloud et l’accès aux investisseurs ; l’ancrage africain apporte la compréhension fine des réalités : Mobile Money, OHADA, coupures réseau, multiplicité des devises.

## Les produits de l’écosystème
- **[LiBooks](https://libooks.liafrik.com)** — comptabilité SYSCOHADA, facturation, stocks, Mobile Money, paie et IA.
- **[Sellia](https://sellia.liafrik.com)** — l’alternative africaine à Shopify : créez votre boutique en ligne, connectez vos intégrations, encaissez en Mobile Money.
- **[Zanldo](https://zanldo.com)** — la marketplace africaine, alternative à Amazon, Noon et Alibaba, avec livraison du dernier kilomètre et partenaires logistiques intégrés.
- **[Zanldo Express](https://express.zanldo.com)** — le SaaS logistique construit pour l’Afrique et ses réalités de terrain.
- **[Nutro](https://nutro.liafrik.com)** — le POS restaurant premium : tablette de prise de commande et écran cuisine (KDS).
- **[POS Flow](https://pos.liafrik.com)** — le point de vente nouvelle génération, pensé pour être le meilleur POS du monde.
- **[Stella](https://stella.liafrik.com)** — l’alternative à Fresha pour salons de beauté, spas et barbiers.
- **[Elora](https://elora.liafrik.com)** — la gestion de pressing, conçue pour le monde entier.
- **[Sukulu](https://gosukulu.com)** — la plateforme des établissements scolaires : élèves, parents, enseignants.
- **Health Cloud** — la gestion des hôpitaux et cliniques, très premium et à la pointe de la technologie.
- **[afrik.cloud](https://afrik.cloud)** — la vitrine gratuite des talents africains.

## Une stack moderne, souveraine et sécurisée
Toutes ces plateformes reposent sur des briques éprouvées : bases Postgres avec isolation stricte des données, réseau mondial Cloudflare pour la vitesse d’affichage en Afrique, e-mails transactionnels fiables et paiements via des PSP africains reconnus comme CinetPay, Korapay, Flutterwave ou PayUnit.

## Et demain ?
L’ambition est claire : faire de l’écosystème Liafrik la référence mondiale des outils de gestion pensés depuis l’Afrique. Suivez l’aventure sur [LinkedIn](https://www.linkedin.com/company/liafrik/) et [Instagram](https://www.instagram.com/liafrik_tech), et testez [LiBooks gratuitement pendant 30 jours](https://libooks.liafrik.com/signup).`,
  },
  {
    id: 's2', slug: 'logiciel-comptabilite-en-ligne-afrique', lang: 'fr', published: true, published_at: D,
    title: 'Logiciel de comptabilité en ligne : le guide complet pour les PME africaines',
    excerpt: 'Comment choisir un logiciel de comptabilité en ligne en Afrique : conformité SYSCOHADA, Mobile Money, mode hors-ligne, sécurité et prix. Le guide 2026.',
    category: 'Guides', tags: ['logiciel de comptabilité', 'comptabilité en ligne', 'PME', 'SYSCOHADA'], author: 'Équipe LiBooks', reading_min: 8,
    content: `## Pourquoi passer à la comptabilité en ligne ?
Un logiciel de comptabilité en ligne centralise factures, achats, stocks, trésorerie et états financiers dans un seul outil accessible depuis un smartphone ou un ordinateur. Fini les classeurs Excel éparpillés : les chiffres sont à jour en temps réel et partagés avec votre comptable.

## Les 7 critères indispensables en Afrique
1. **Conformité SYSCOHADA / OHADA** : plan de comptes révisé, journaux, bilan et compte de résultat au bon format.
2. **TVA locale automatique** : taux par pays pré-configurés et déclaration simplifiée.
3. **Mobile Money natif** : Orange Money, MTN MoMo, Wave, Moov — c’est là que se trouvent vos encaissements.
4. **Mode hors-ligne** : une coupure ne doit jamais bloquer une vente.
5. **Multi-devises** : XAF, XOF, NGN, KES, USD, EUR… avec taux de change à jour.
6. **Sécurité** : données isolées par entreprise, double authentification, journal d’audit.
7. **Prix transparent** et essai gratuit sans carte bancaire.

## Ce que LiBooks apporte
[LiBooks](https://libooks.liafrik.com) coche ces 7 cases et va plus loin : factures personnalisables avec votre logo et votre cachet, tableau de bord personnalisable sur les forfaits Premium et Entreprise, assistant IA **Libooks**, envoi des factures par WhatsApp et API pour connecter vos autres outils.

## Combien ça coûte ?
Les forfaits démarrent à 14 $/mois, avec **30 jours d’essai gratuit** et -20 % en annuel. Consultez la [grille tarifaire](https://libooks.liafrik.com/#pricing).

> Conseil : migrez en début de mois ou d’exercice, importez vos clients et articles, puis saisissez vos soldes d’ouverture : en une journée, vous êtes opérationnel.`,
  },
  {
    id: 's3', slug: 'syscohada-revise-guide-pratique', lang: 'fr', published: true, published_at: D,
    title: 'SYSCOHADA révisé : guide pratique pour tenir une comptabilité conforme',
    excerpt: 'Plan de comptes, partie double, états financiers : l’essentiel du SYSCOHADA révisé expliqué simplement, et comment l’automatiser avec LiBooks.',
    category: 'Comptabilité OHADA', tags: ['SYSCOHADA', 'OHADA', 'bilan', 'compte de résultat'], author: 'Équipe LiBooks', reading_min: 7,
    content: `## Le SYSCOHADA en bref
Le Système Comptable OHADA (SYSCOHADA), révisé et applicable depuis 2018, s’impose aux entreprises des 17 États membres de l’OHADA. Il organise les comptes en classes (1 à 9) et impose un format harmonisé pour les états financiers.

## Les classes de comptes à connaître
- **Classe 1** : ressources durables (capital, emprunts)
- **Classe 2** : actif immobilisé
- **Classe 3** : stocks
- **Classe 4** : tiers (clients, fournisseurs, État)
- **Classe 5** : trésorerie (banque, caisse, Mobile Money)
- **Classes 6 et 7** : charges et produits

## Partie double : la règle d’or
Chaque opération est enregistrée au débit d’un compte et au crédit d’un autre, pour un même montant. Dans [LiBooks](https://libooks.liafrik.com), une facture validée génère automatiquement son écriture équilibrée.

## Automatiser plutôt que ressaisir
Avec LiBooks, le plan SYSCOHADA est installé à la création du compte pour les pays OHADA, la TVA est calculée automatiquement, le grand livre et la balance se mettent à jour en continu, et le bilan comme le compte de résultat sont disponibles en un clic (forfait Premium).

> Ce guide est informatif : pour vos décisions fiscales importantes, validez toujours avec un expert-comptable agréé.`,
  },
  {
    id: 's4', slug: 'mobile-money-facturation-entreprise', lang: 'fr', published: true, published_at: D,
    title: 'Mobile Money et facturation : encaisser, suivre et rapprocher sans effort',
    excerpt: 'Orange Money, MTN MoMo, Wave, Moov : comment intégrer le Mobile Money à votre facturation et à votre comptabilité, sans double saisie.',
    category: 'Paiements', tags: ['Mobile Money', 'Orange Money', 'MTN MoMo', 'Wave', 'CinetPay'], author: 'Équipe LiBooks', reading_min: 5,
    content: `## Le Mobile Money, premier moyen de paiement du continent
Dans de nombreux pays d’Afrique de l’Ouest, centrale et de l’Est, le portefeuille mobile est devenu le compte bancaire du quotidien. Pour une PME, ignorer le Mobile Money, c’est perdre des ventes.

## Le problème : la double saisie
Encaissement sur le téléphone d’un côté, facture sur papier ou Excel de l’autre : le rapprochement devient un cauchemar en fin de mois.

## La solution LiBooks
- comptes de trésorerie Mobile Money dédiés (classe 5) ;
- encaissements rattachés aux factures, statut « payée » automatique ;
- rapprochement bancaire et Mobile Money assisté ;
- abonnement LiBooks lui-même payable en Mobile Money via **CinetPay**, **Korapay** ou **Flutterwave**.

Essayez [LiBooks 30 jours gratuitement](https://libooks.liafrik.com/signup).`,
  },
  {
    id: 's5', slug: 'ia-comptabilite-assistant-libooks', lang: 'fr', published: true, published_at: D,
    title: 'L’IA au service de la comptabilité africaine : découvrez l’assistant Libooks',
    excerpt: 'Questions comptables, TVA, trésorerie, prise en main : l’assistant IA Libooks répond en quelques secondes, en français comme en anglais.',
    category: 'Intelligence artificielle', tags: ['IA', 'assistant', 'Gemini', 'trésorerie'], author: 'Équipe Liafrik Tech', reading_min: 4,
    content: `## Un expert disponible 24h/24
L’assistant **Libooks** est intégré à toute la plateforme. Il connaît le SYSCOHADA, les bonnes pratiques de facturation et chaque module de LiBooks.

## Ce qu’il sait faire
- expliquer une écriture comptable ou un compte du plan SYSCOHADA ;
- guider pas à pas : créer une facture, un avoir, une immobilisation ;
- donner des pistes pour améliorer votre trésorerie ;
- passer la main à un conseiller humain dès que vous tapez « humain ».

## Rapide et contextuel
Les réponses s’affichent en streaming, mot après mot. Connecté, l’assistant tient compte de votre forfait, de votre devise et de votre activité — sans jamais inventer vos chiffres.

[Découvrir LiBooks](https://libooks.liafrik.com)`,
  },
  {
    id: 's6', slug: 'comptabilite-hors-ligne-offline-first', lang: 'fr', published: true, published_at: D,
    title: 'Comptabilité hors-ligne : pourquoi l’offline-first change tout en Afrique',
    excerpt: 'Coupures réseau, data coûteuse : l’approche offline-first permet de facturer et gérer ses stocks sans connexion. Explications.',
    category: 'Tech africaine', tags: ['offline', 'PWA', 'tech africaine'], author: 'Équipe Liafrik Tech', reading_min: 4,
    content: `## Le réseau n’est pas une garantie
Couverture inégale, forfaits data limités, coupures d’électricité : un logiciel 100 % en ligne bloque l’activité au pire moment.

## L’offline-first, concrètement
LiBooks est une application web installable (PWA). Factures, mouvements de stock et transactions sont enregistrés localement, puis synchronisés automatiquement dès le retour du réseau, avec des clés d’idempotence pour ne jamais créer de doublon.

## Léger, rapide, partout
Installable sur Android, iPhone et ordinateur, LiBooks reste fluide même sur un smartphone d’entrée de gamme, grâce au réseau mondial Cloudflare.

[Installer LiBooks](https://libooks.liafrik.com/signup)`,
  },
  {
    id: 's7', slug: 'online-accounting-software-africa', lang: 'en', published: true, published_at: D,
    title: 'Online accounting software for African businesses: the 2026 guide',
    excerpt: 'How to pick online accounting software in Africa: OHADA compliance, Mobile Money, offline mode, security and pricing.',
    category: 'Guides', tags: ['accounting software', 'Africa', 'OHADA'], author: 'LiBooks Team', reading_min: 6,
    content: `## Why move your books online?
Online accounting software brings invoices, purchases, inventory, cash and financial statements into one tool you can open from any phone or laptop.

## Must-haves for African SMEs
- **OHADA / SYSCOHADA** compliance where it applies, local VAT rates built in
- native **Mobile Money** (Orange Money, MTN MoMo, Wave, M-Pesa)
- **offline-first** invoicing
- multi-currency with live FX rates
- strong security: data isolation, 2FA, audit trail

## Why LiBooks
[LiBooks](https://libooks.liafrik.com/en), built by Liafrik Tech, ticks every box — plus branded invoices, a customizable dashboard on Premium and Enterprise, and the **Libooks AI assistant**. Try it free for **30 days**, no card required.`,
  },
  {
    id: 's8', slug: 'zanldo-marketplace-africaine-dernier-kilometre', lang: 'fr', published: true, published_at: D,
    title: 'Zanldo : la marketplace africaine qui livre jusqu’au dernier kilomètre',
    excerpt: 'Alternative africaine à Amazon, Noon et Alibaba, Zanldo connecte commerçants, clients et partenaires logistiques avec Zanldo Express.',
    category: 'Écosystème Liafrik', tags: ['Zanldo', 'marketplace', 'e-commerce', 'logistique'], author: 'Équipe Liafrik Tech', reading_min: 5,
    content: `## Le e-commerce africain a ses propres règles
Adresses imprécises, paiement à la livraison, Mobile Money, multiplicité des transporteurs : copier un modèle importé ne suffit pas. [Zanldo](https://zanldo.com) a été conçu à partir de ces réalités.

## Ce que Zanldo apporte
- une marketplace qui connecte **commerçants et clients** partout sur le continent ;
- des **partenaires logistiques intégrés** et la livraison du **dernier kilomètre** ;
- le paiement adapté au terrain : Mobile Money, carte, paiement à la livraison.

## Zanldo Express, le moteur logistique
[Zanldo Express](https://express.zanldo.com) est le SaaS logistique de l’écosystème : gestion des expéditions, des livreurs, du suivi et des preuves de livraison, pour les marchands comme pour les transporteurs.

## Et la comptabilité ?
Les ventes réalisées sur Zanldo s’intègrent naturellement dans [LiBooks](https://libooks.liafrik.com) : factures, encaissements Mobile Money et TVA, sans double saisie.`,
  },
  {
    id: 's9', slug: 'sellia-alternative-shopify-afrique-mobile-money', lang: 'fr', published: true, published_at: D,
    title: 'Sellia : l’alternative africaine à Shopify, avec le Mobile Money intégré',
    excerpt: 'Créer sa boutique en ligne, connecter ses outils et encaisser en Mobile Money : Sellia, la plateforme e-commerce de l’écosystème Liafrik.',
    category: 'Écosystème Liafrik', tags: ['Sellia', 'Shopify', 'boutique en ligne', 'Mobile Money'], author: 'Équipe Liafrik Tech', reading_min: 4,
    content: `## Une boutique en ligne en quelques minutes
[Sellia](https://sellia.liafrik.com) permet de construire un site e-commerce complet — thèmes, catalogue, panier, commandes — exactement comme Shopify, mais pensé pour l’Afrique.

## Connectez tout ce dont vous avez besoin
Paiements, livraison, marketing, réseaux sociaux : Sellia se connecte à vos outils, et bien sûr à [LiBooks](https://libooks.liafrik.com) pour la comptabilité et à [Zanldo Express](https://express.zanldo.com) pour la logistique.

## Encaissez comme vos clients paient
Orange Money, MTN MoMo, Wave, Moov, cartes : vos clients paient avec le moyen qu’ils utilisent déjà.`,
  },
  {
    id: 's10', slug: 'nutro-pos-flow-point-de-vente-premium', lang: 'fr', published: true, published_at: D,
    title: 'Nutro et POS Flow : le point de vente premium, du restaurant à la boutique',
    excerpt: 'Tablette POS, écran cuisine KDS, caisse multi-boutiques : Nutro et POS Flow réinventent l’encaissement, connectés à LiBooks.',
    category: 'Écosystème Liafrik', tags: ['POS', 'restaurant', 'KDS', 'Nutro', 'POS Flow'], author: 'Équipe Liafrik Tech', reading_min: 4,
    content: `## Nutro, pour les restaurants exigeants
[Nutro](https://nutro.liafrik.com) équipe les restaurants d’une **tablette de prise de commande** et d’un **écran cuisine (KDS)** : les commandes arrivent instantanément en cuisine, le service gagne en fluidité, l’expérience client devient premium.

## POS Flow, pour tous les commerces
[POS Flow](https://pos.liafrik.com) est le point de vente nouvelle génération : caisse rapide, stocks synchronisés, multi-boutiques, Mobile Money et tickets.

## Une chaîne complète
Ventes du POS → encaissements → comptabilité dans [LiBooks](https://libooks.liafrik.com) : chaque vente devient une écriture, sans ressaisie.`,
  },
  {
    id: 's11', slug: 'stella-elora-sukulu-health-cloud-saas-metiers', lang: 'fr', published: true, published_at: D,
    title: 'Stella, Elora, Sukulu, Health Cloud : des SaaS métiers premium signés Liafrik',
    excerpt: 'Beauté, pressing, éducation, santé : les plateformes métiers de l’écosystème Liafrik, conçues pour l’Afrique et le monde.',
    category: 'Écosystème Liafrik', tags: ['Stella', 'Elora', 'Sukulu', 'Health Cloud', 'SaaS'], author: 'Équipe Liafrik Tech', reading_min: 5,
    content: `## Stella — beauté & bien-être
[Stella](https://stella.liafrik.com) est l’alternative à Fresha : réservation en ligne, agenda, caisse et fidélisation pour salons, spas et barbiers.

## Elora — pressing
[Elora](https://elora.liafrik.com) gère dépôts, tickets, suivi des articles et livraisons. Elle ne s’adresse pas qu’à l’Afrique : son ambition est de devenir la référence mondiale de la gestion de pressing.

## Sukulu — éducation
[Sukulu](https://gosukulu.com) réunit l’établissement scolaire : élèves, parents, enseignants, notes, frais de scolarité et communication.

## Health Cloud — santé
Health Cloud est la plateforme de gestion des hôpitaux et cliniques : dossiers patients, rendez-vous, facturation et pharmacie, avec une exigence très premium.

## afrik.cloud — talents
[afrik.cloud](https://afrik.cloud) expose gratuitement les talents africains au monde.

Toutes ces plateformes partagent la même exigence que [LiBooks](https://libooks.liafrik.com) : design premium, Mobile Money natif et fiabilité.`,
  },
];
