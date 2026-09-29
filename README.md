# Les Délices de CANA

PWA one-page du restaurant **Les Délices de CANA**, à Gonaté.

## Expérience client
- Une seule page côté public : accueil, menu, plats, boissons, réservation et suivi.
- Aucune création de compte classique pour réserver.
- Le plat choisi est rattaché à la réservation.
- Le client peut retrouver son historique avec son numéro et annuler une réservation en attente/confirmée.
- Menu du jour publié automatiquement selon `publish_at`, avec publication prévue à **06h00**.
- PWA installable sur Android et mobile.
- Interface pensée mobile-first.

## Administration
- `/admin`
- Connexion téléphone + mot de passe via Supabase Auth.
- Réservations et statuts.
- Programmation des menus par date/heure.
- Bibliothèque des plats.
- Ajout de plats aux menus.
- Abonnement push du navigateur de l'équipe.

## Notifications push
Le service worker `src/sw.js` reçoit les notifications même lorsque le PWA n'est pas ouvert, lorsque le navigateur autorise les notifications.

La fonction Supabase `supabase/functions/send-reservation-push/index.ts` envoie la notification côté serveur.

Configuration à prévoir dans Supabase :
1. Déployer la fonction Edge.
2. Renseigner `VAPID_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et `SUPABASE_SERVICE_ROLE_KEY` dans les secrets de la fonction.
3. Renseigner `VITE_VAPID_PUBLIC_KEY` côté frontend.
4. Créer un Database Webhook sur `public.reservations`, événement **INSERT**, vers la fonction `send-reservation-push`.

## Base de données
Le schéma complet est dans `supabase/schema.sql`.

Il comprend :
- clients
- plats
- menus programmés
- éléments de menu
- réservations
- équipe/admin
- abonnements push
- RLS
- fonctions de réservation, historique et annulation

## Développement
```bash
npm install
npm run dev
```

Copier `.env.example` vers `.env` :

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
```

## Identité
Le logo SVG transparent est dans `public/logo.svg`. La palette principale est chocolat, bronze, cuivre et or, sans vert dominant.
