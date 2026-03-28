# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commandes de développement

```bash
# Lancer les émulateurs Firebase (functions + Firestore)
cd functions && npm run serve

# Déployer les Cloud Functions
cd functions && npm run deploy

# Déployer les règles Firestore
firebase deploy --only firestore:rules

# Déployer l'application complète
firebase deploy
```

**Note** : L'application frontend est une PWA statique (pas de build nécessaire). Ouvrir `index.html` directement ou utiliser un serveur local.

## Architecture du projet

### Vue d'ensemble
PWA de suivi d'habitudes avec gamification (XP, rangs, badges, challenges). Utilise Firebase (Auth, Firestore, Cloud Messaging) avec fallback localStorage pour le mode hors ligne.

### Structure `src/`

```
src/
├── app.js              # Point d'entrée - initialisation, auth, navigation, expose window.*
├── config/firebase.js  # Configuration Firebase (auth, db, isFirebaseConfigured)
├── core/               # Logique métier
│   ├── habits.js       # CRUD habitudes, filtres par catégorie, planification
│   ├── ranks.js        # Système de rangs (Bronze → Légende)
│   ├── badges.js       # Système de badges et succès
│   ├── scores.js       # Calcul des scores journaliers
│   └── xp.js           # Système XP/niveaux avec fatigue
├── services/           # Services transversaux
│   ├── state.js        # État global (appState, habits)
│   ├── storage.js      # Abstraction localStorage (getData, saveData)
│   ├── i18n.js         # Internationalisation (FR/EN/ES)
│   ├── notifications.js # Push notifications (FCM)
│   └── pseudo-validator.js
├── pages/              # Vues principales
│   ├── today.js        # Page "Aujourd'hui" - checklist habitudes
│   ├── stats.js        # Statistiques et analytics
│   ├── profile.js      # Profil utilisateur (avatar, pseudo, bio)
│   ├── groups.js       # Groupes sociaux + chat temps réel
│   ├── motivation.js   # Citations inspirantes
│   └── admin.js        # Panel admin
└── ui/                 # Composants UI réutilisables
    ├── toast.js        # Système de notifications (showPopup)
    ├── modals.js       # Modales (ConfirmModal)
    ├── chat.js         # Chat temps réel avec Firestore
    ├── challenges.js   # Système de challenges
    ├── onboarding.js   # Premier lancement
    └── ...
```

### Cloud Functions (`functions/index.js`)

- `onNewMessage` : Push notification nouveau message groupe
- `onNewChallenge` : Notification nouveau challenge
- `onChallengeUpdate` : Notification fin de challenge
- `onMemberJoined` : Notification nouveau membre
- `dailyReminder` : Rappel quotidien planifié (20h Paris)

### Flux de données

1. **Auth** : Firebase Auth email/password
2. **Données utilisateur** : Firestore `users/{uid}` avec sous-collections `habits`, `completions`, `stats`
3. **Groupes** : Firestore `groups/{groupId}` avec sous-collections `members`, `messages`, `challenges`
4. **Fallback** : localStorage via `storage.js` si Firebase non configuré

## Conventions spécifiques

- **Exposition globale** : Les fonctions appelées depuis le HTML sont exposées via `window.*` dans `app.js`
- **Modules ES6** : Import/export natifs (pas de bundler)
- **Firebase CDN** : SDK chargé en mode compat via `<script>` dans `index.html`
- **Service Worker** : `sw.js` gère le cache PWA et les notifications push en background
- **Version cache** : Incrémenter `CACHE_NAME` dans `sw.js` à chaque mise à jour

## Firestore - Structure des données

```
users/{uid}
  ├── email, pseudo, avatar, bio, createdAt, lastLogin
  ├── fcmTokens[], notifPrefs{}
  └── habits/{habitId}
      completions/{date-habitId}
      stats/global

groups/{groupId}
  ├── name, code, creatorId, createdAt
  └── members/{uid}
      messages/{messageId}
      challenges/{challengeId}/participants/{uid}
```
