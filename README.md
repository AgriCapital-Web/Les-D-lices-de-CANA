# Les Délices de CANA

Application PWA de restaurant avec menu du jour, réservations publiques, suivi/annulation par téléphone et espace d'administration.

## Architecture

- Frontend : React + Vite + PWA.
- Déploiement : Vercel.
- API : Vercel Functions dans `api/`.
- Données persistantes : Vercel Blob **privé**, un objet JSON par réservation, plat, menu et abonnement push.
- Notifications : Web Push avec VAPID.
- Authentification admin : session HTTP-only signée côté serveur.
- **Aucune dépendance à Supabase.**

Vercel Blob privé est utilisé comme stockage persistant léger pour ce restaurant. Les fonctions Vercel peuvent lire/écrire ce stockage sans serveur à administrer.

## Configuration Vercel

1. Importer le dépôt `AgriCapital-Web/Les-D-lices-de-CANA` dans Vercel.
2. Framework : Vite. Build command : `npm run build`. Output : `dist`.
3. Créer et connecter un **Private Blob Store** au projet.
4. Renseigner les variables d'environnement :

```env
ADMIN_PHONE=0700000000
ADMIN_PASSWORD=un-mot-de-passe-fort
SESSION_SECRET=une-valeur-longue-et-aleatoire
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:contact@lesdelicesdecana.ci
VITE_VAPID_PUBLIC_KEY=...
```

Pour les stores Vercel Blob récents, l'authentification OIDC peut être activée automatiquement par Vercel. Les anciens stores peuvent utiliser `BLOB_READ_WRITE_TOKEN`.

## Notifications push

Générer une paire VAPID une seule fois avec `npx web-push generate-vapid-keys`, puis placer la clé publique dans `VITE_VAPID_PUBLIC_KEY` et dans `VAPID_PUBLIC_KEY`, et la clé privée dans `VAPID_PRIVATE_KEY`.

Le compte administrateur doit autoriser les notifications depuis `/admin`. Lorsqu'une réservation arrive, l'API envoie une notification push aux abonnements enregistrés.

## Fonctionnement

### Public

- Le menu affiché est uniquement celui du jour et dont l'heure de publication est atteinte.
- Une réservation crée immédiatement un enregistrement `pending` persistant.
- Le client peut retrouver ses réservations avec son numéro de téléphone.
- Une réservation `pending` ou `confirmed` peut être annulée par le client.

### Administration

- Connexion par téléphone + mot de passe configurés dans Vercel.
- Consultation et changement de statut des réservations.
- Création des plats.
- Programmation d'un menu.
- Ajout des plats au menu.
- Abonnement aux notifications push.

## Important

Aucun plat de démonstration ni fausse réservation n'est injecté en production. La base initiale est vide et doit être alimentée depuis l'administration.
