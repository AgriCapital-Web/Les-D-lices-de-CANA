# Les Délices de CANA

Application web/PWA du restaurant **Les Délices de CANA**.

## Public
La partie publique est volontairement simple :
1. **Hero**
2. **Catalogue / carte** façon boutique e-commerce
3. **Réservation**
4. Suivi de réservation dans une fenêtre privée

Aucune mention technique, aucune section d’administration et aucun lien public vers le back-office.

## Back-office privé
Le seul chemin d'administration est :

`/me`

Donc, sur le domaine de production :

`https://lesdelicesdecana.online/me`

Le chemin `/admin` n'est pas utilisé par l'application.

Le back-office permet :
- consulter les réservations ;
- programmer les menus par date et heure ;
- modifier les plats ;
- créer des plats ;
- modifier les prix, descriptions et catégories ;
- remplacer les images ;
- ajouter/retirer les plats d'un menu ;
- préparer plusieurs menus à l'avance.

## Catalogue
Le projet contient un catalogue de démonstration pour donner immédiatement un aperçu réaliste.

La base Supabase contient également le seed du catalogue et du menu du jour. Les menus programmés deviennent visibles automatiquement lorsque leur date et leur heure de publication sont atteintes.

Heure de publication par défaut : **06h00 — heure Côte d'Ivoire (UTC)**.

## Images
Les images de plats sont stockées dans le bucket public Supabase `menu-images`. L'équipe peut charger une nouvelle photo depuis `/me` et l'associer au plat.

## Identité
Le logo transparent CANA est centralisé dans :

`public/brand/cana-logo.svg`

Il est utilisé pour :
- en-tête ;
- hero ;
- footer ;
- écran de connexion privé ;
- PWA ;
- notifications ;
- favicon ;
- Open Graph.

La palette de l'interface reste claire : ivoire, crème, brun, cuivre et or. Aucun fond noir n'est utilisé comme fond de page.

## Base de données
Exécuter `supabase/schema.sql` dans le projet Supabase.

Après création du compte Auth de l'équipe, ajouter son UUID dans `public.staff` pour lui donner les droits du back-office.

## Développement
```bash
npm install
npm run dev
```

Variables :

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
```
