import DOMPurify from 'dompurify';

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
}

export function slugify(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

/** Écosystème LiAfrik mis en avant dans le blog. Ajoutez ici chaque nouveau produit. */
export const ECOSYSTEM = [
  { name: 'LiBooks', url: 'https://libooks.liafrik.com', desc: 'Comptabilité, facturation, stocks et Mobile Money — conforme SYSCOHADA.' },
  { name: 'LiAfrik Tech', url: 'https://liafrik.com', desc: 'Le groupe technologique Dubaï × Afrique qui conçoit l’écosystème.' },
  { name: 'LiAfrik sur LinkedIn', url: 'https://www.linkedin.com/company/liafrik/', desc: 'Actualités, recrutements et partenariats du groupe.' },
  { name: '@liafrik_tech', url: 'https://www.instagram.com/liafrik_tech', desc: 'Les coulisses produit et la communauté LiAfrik.' },
];

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
  return DOMPurify.sanitize(out.join('\n'), { ADD_ATTR: ['target'] });
}

const D = '2026-11-17T08:00:00Z';

/** Articles éditoriaux intégrés (toujours disponibles, même hors-ligne / sans base). */
export const STATIC_POSTS: BlogPost[] = [
  {
    id: 's1', slug: 'ecosysteme-liafrik-tech-afrique', lang: 'fr', published: true, published_at: D,
    title: 'L’écosystème LiAfrik : construire la tech africaine de référence, de Dubaï à Yaoundé',
    excerpt: 'LiAfrik Tech bâtit un écosystème de produits pensés pour les entreprises africaines : LiBooks en est la pierre angulaire. Vision, produits et ambitions.',
    category: 'Écosystème LiAfrik', tags: ['LiAfrik', 'tech africaine', 'startup', 'Dubaï'], author: 'Équipe LiAfrik Tech', reading_min: 6,
    content: `## Une conviction : l’Afrique mérite des logiciels conçus pour elle
Pendant longtemps, les entreprises africaines ont dû adapter leurs usages à des outils pensés ailleurs : connexion supposée permanente, cartes bancaires comme unique moyen de paiement, normes comptables étrangères. **LiAfrik Tech** est née du constat inverse : c’est au logiciel de s’adapter au terrain.

## Un pont entre Dubaï et le continent
LiAfrik opère avec une double présence, à Dubaï et en Afrique centrale et de l’Ouest. Dubaï apporte l’accès aux standards internationaux, aux infrastructures cloud et aux investisseurs ; l’ancrage africain apporte la compréhension fine des réalités : Mobile Money, OHADA, coupures réseau, multiplicité des devises.

## LiBooks, la pierre angulaire
[LiBooks](https://libooks.liafrik.com) est le logiciel de comptabilité et de gestion commerciale en ligne de l’écosystème :
- plan comptable **SYSCOHADA révisé** pré-configuré pour les 17 pays OHADA ;
- facturation illimitée, PDF A4 et tickets thermiques 58/80 mm ;
- encaissements **Mobile Money** (Orange Money, MTN MoMo, Wave, Moov) ;
- fonctionnement **offline-first** : on facture sans réseau, tout se synchronise ensuite ;
- assistant IA **Libooks** pour répondre aux questions comptables au quotidien.

## Une stack moderne, souveraine et sécurisée
L’écosystème repose sur des briques éprouvées : base de données Postgres avec isolation stricte des données par entreprise (Row Level Security), réseau mondial Cloudflare pour la vitesse d’affichage en Afrique, e-mails transactionnels fiables et paiements via des PSP africains reconnus comme CinetPay, Korapay, Flutterwave ou PayUnit.

## Et demain ?
L’ambition est claire : faire de l’écosystème LiAfrik la référence des outils de gestion pour les PME africaines et la diaspora. Suivez l’aventure sur [LinkedIn](https://www.linkedin.com/company/liafrik/) et [Instagram](https://www.instagram.com/liafrik_tech), et testez [LiBooks gratuitement pendant 30 jours](https://libooks.liafrik.com/signup).`,
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
    category: 'Intelligence artificielle', tags: ['IA', 'assistant', 'Gemini', 'trésorerie'], author: 'Équipe LiAfrik Tech', reading_min: 4,
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
    category: 'Tech africaine', tags: ['offline', 'PWA', 'tech africaine'], author: 'Équipe LiAfrik Tech', reading_min: 4,
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
[LiBooks](https://libooks.liafrik.com/en), built by LiAfrik Tech, ticks every box — plus branded invoices, a customizable dashboard on Premium and Enterprise, and the **Libooks AI assistant**. Try it free for **30 days**, no card required.`,
  },
];
