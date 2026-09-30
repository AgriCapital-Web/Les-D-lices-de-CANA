# Les Délices de CANA

Application web/PWA du restaurant **Les Délices de CANA**.

## Public

La partie publique comprend :
- le hero et le slogan « Ici, la cuisine a le goût de chez vous. » ;
- le **MENU DU JOUR** ;
- les plats avec leurs vraies photos ;
- la réservation ;
- l'espace **Mes réservations** depuis le seul bouton du menu principal ;
- la demande de plat particulier.

L'interface est conçue en responsive fluide : tailles de textes, cartes, images, espacements et grilles s'adaptent automatiquement à la largeur de l'écran.

## Back-office privé

Le seul chemin d'administration est :

`/me`

Le back-office permet :
- consulter et traiter les réservations ;
- programmer les menus par date et heure ;
- créer/modifier les plats ;
- modifier prix, descriptions et catégories ;
- remplacer les URLs d'images ;
- ajouter/retirer des plats des menus ;
- préparer plusieurs menus à l'avance.

Les modifications d'un plat sont propagées aux éléments de menu qui utilisent ce plat.

## Base de données

Le projet utilise **Neon PostgreSQL** via le Neon Data API.

La base de production du projet CANA est déjà structurée autour de :
- `dishes` ;
- `menus` ;
- `menu_items` ;
- `customers` ;
- `reservations` ;
- `push_subscriptions` ;
- `admin_users` et sessions d'administration.

Le seed du menu actuel est conservé dans :

`db/seed-menu.sql`

Le menu actuel contient six plats et leurs vraies photos.

## Images des plats

Les six photos du menu actuel proviennent de **Wikimedia Commons** et sont enregistrées directement dans la base via `image_url`. Chaque photo a été vérifiée comme ressource accessible.

L'administration permet de remplacer une image à tout moment.

## Identité visuelle

Le logo CANA est utilisé comme asset principal dans :
- en-tête ;
- footer ;
- écran de connexion privé ;
- identité PWA ;
- favicon / Open Graph.

Le fichier de référence du projet est :

`public/brand/cana-logo.png`

Aucun logo textuel de remplacement n'est utilisé dans l'interface.

## Développement

```bash
npm install
npm run dev
```

Variables principales :

```env
VITE_NEON_DATA_API_URL=
VITE_VAPID_PUBLIC_KEY=
```

Le projet n'utilise pas Supabase.
