# 🌐 WentzyFace — Réseau social pédagogique Full-Stack

Projet académique (Université Inuka) : clone fonctionnel d'un réseau social — WentzyFace, construit de A à Z avec une stack moderne.

---

## 📦 Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 18, React Router v6, Axios, Socket.io-client, Lucide-React |
| **Backend** | Node.js, Express.js, Socket.io |
| **Base de données** | MongoDB avec Mongoose ODM |
| **Authentification** | JWT (JSON Web Tokens) + bcryptjs |
| **Upload de fichiers** | Multer (stockage local) |
| **Temps réel** | Socket.io (WebSockets) |

---

## ✨ Fonctionnalités implémentées

| Fonctionnalité | Détail |
|----------------|--------|
| **Authentification** | Inscription, connexion, session persistante (JWT dans localStorage), déconnexion |
| **Fil d'actualité** | Publications texte + image, infinite scroll, filtre ami+soi |
| **J'aime / Commentaires** | Toggle like avec mise à jour optimiste, commentaires imbriqués |
| **Stories** | Création (image ou texte coloré), affichage en barre, visionneuse plein écran avec progression, expiration automatique 24h (index TTL MongoDB) |
| **Demandes d'ami** | Envoyer / Accepter / Refuser / Annuler / Retirer, états visuels |
| **Messagerie privée** | Conversations 1-à-1, historique, indicateur de lecture, vu/non vu |
| **Temps réel** | Messages instantanés, indicateur "en train d'écrire...", point de présence en ligne (Socket.io) |
| **Notifications** | Demandes d'ami, acceptations, likes, commentaires, messages — temps réel + badge |
| **Profil** | Photo de profil, photo de couverture, bio, publications, statut d'amitié |
| **Mode sombre** | Bascule clair/sombre, persisté en localStorage + base de données |
| **Recherche** | Recherche d'utilisateurs par nom ou @username |

---

## 🗂️ Architecture du projet

```
mini-facebook/
│
├── backend/                    API REST + Socket.io
│   ├── config/
│   │   └── db.js               Connexion MongoDB
│   ├── models/
│   │   ├── User.js             Utilisateurs (amis, theme, photos)
│   │   ├── FriendRequest.js    Demandes d'ami
│   │   ├── Post.js             Publications (likes, commentaires embarqués)
│   │   ├── Story.js            Stories (TTL 24h)
│   │   ├── Conversation.js     Fils de messagerie
│   │   ├── Message.js          Messages individuels
│   │   └── Notification.js     Notifications
│   ├── controllers/            Logique métier par ressource
│   ├── routes/                 Routage Express par ressource
│   ├── middleware/
│   │   ├── auth.js             Vérification JWT
│   │   └── upload.js           Multer (images)
│   ├── socket/
│   │   └── socketHandler.js    Initialisation Socket.io + événements temps réel
│   ├── utils/
│   │   ├── generateToken.js    Génération JWT
│   │   └── createNotification.js Création + push temps réel notification
│   ├── uploads/                Fichiers uploadés (ignoré par git)
│   ├── server.js               Point d'entrée Express + http.Server + Socket.io
│   ├── package.json
│   └── .env.example
│
└── frontend/                   Application React
    └── src/
        ├── api/
        │   └── axios.js        Instance Axios + intercepteurs JWT
        ├── context/
        │   ├── AuthContext.js  État d'authentification global
        │   ├── ThemeContext.js Mode clair/sombre
        │   └── SocketContext.js Connexion Socket.io partagée
        ├── components/
        │   ├── Navbar.js       Barre de nav (badges, notifs, recherche)
        │   ├── Avatar.js       Photo de profil ou initiales
        │   ├── PostCard.js     Carte d'une publication
        │   ├── CreatePost.js   Formulaire de création de post
        │   ├── StoryBar.js     Bandeau de stories
        │   ├── StoryViewer.js  Visionneuse plein écran
        │   ├── CreateStoryModal.js  Modal de création de story
        │   ├── NotificationItem.js  Ligne de notification
        │   └── ProtectedRoute.js    Garde de route
        ├── pages/
        │   ├── LoginPage.js    Connexion
        │   ├── RegisterPage.js Inscription
        │   ├── HomePage.js     Fil d'actualité + stories
        │   ├── ProfilePage.js  Page profil + publications
        │   ├── FriendsPage.js  Amis / Demandes / Recherche
        │   └── MessagesPage.js Messagerie privée temps réel
        ├── styles/             CSS modulaire (variables, global, composants...)
        ├── utils/time.js       Formatage horodatages
        ├── App.js              Routage principal
        └── index.js            Point d'entrée React
```

---

## 🚀 Installation et lancement

### Prérequis

- **Node.js** v18+ (`node --version`)
- **MongoDB** installé localement **OU** un compte [MongoDB Atlas](https://www.mongodb.com/atlas) (gratuit)
- **npm** ou **yarn**

---

### 1. Cloner le dépôt

```bash
git clone <url-du-depot>
cd mini-facebook
```

---

### 2. Configurer et lancer le backend

```bash
cd backend

# Installer les dépendances
npm install

# Créer le fichier de config (copier l'exemple)
cp .env.example .env
```

Ouvre `.env` et renseigne :

```dotenv
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/mini-facebook
JWT_SECRET=mets_une_longue_chaine_secrete_ici
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

```bash
# Démarrer le serveur (mode développement avec rechargement auto)
npm run dev

# ✅ Serveur démarré sur http://localhost:5000
# ✅ MongoDB connecté : 127.0.0.1/mini-facebook
```

---

### 3. Configurer et lancer le frontend

```bash
# Depuis la racine du projet
cd frontend

# Installer les dépendances
npm install

# Créer le fichier de config
cp .env.example .env
# (REACT_APP_API_URL=http://localhost:5000 par défaut)

# Démarrer l'application React
npm start

# ✅ Application disponible sur http://localhost:3000
```

---

## 🔐 Flux d'authentification JWT

```
[Client]                          [Serveur]
   |                                  |
   |-- POST /api/auth/register -----> |
   |                          hash(password) + save User
   |<-- { token, user } ------------ |
   |                                  |
   | localStorage.setItem('token')    |
   |                                  |
   |-- GET /api/posts/feed ---------->|
   |   Header: Authorization: Bearer <token>
   |                         verify(token) → req.user
   |<-- { posts: [...] } ----------- |
```

---

## ⚡ Architecture temps réel (Socket.io)

```
[Client A connecte]   [Serveur Socket.io]   [Client B connecte]
        |                     |                      |
        |--- connect(token) ->|                      |
        |                     | verify JWT           |
        |                     | userSocketMap[A]=sid |
        |                     |--- onlineUsers ----> | (tous)
        |                     |                      |
        |--- typing -------->  |--- typing ---------> | (vers B seulement)
        |                     |                      |
        |--- (POST /messages/B via API REST)          |
        |                     |--- newMessage ------> | (vers B seulement)
        |                     |--- newNotification -> | (vers B seulement)
```

---

## 📋 Endpoints API principaux

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Se connecter |
| GET | `/api/auth/me` | Utilisateur connecté |

### Posts
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/posts/feed` | Fil d'actualité paginé |
| POST | `/api/posts` | Créer un post |
| PUT | `/api/posts/:id/like` | Toggle like |
| POST | `/api/posts/:id/comment` | Ajouter un commentaire |
| DELETE | `/api/posts/:id` | Supprimer son post |

### Amis
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/friends` | Mes amis |
| GET | `/api/friends/requests` | Demandes reçues |
| GET | `/api/friends/sent` | Demandes envoyées |
| POST | `/api/friends/request/:userId` | Envoyer une demande |
| PUT | `/api/friends/accept/:requestId` | Accepter |
| DELETE | `/api/friends/reject/:requestId` | Refuser/Annuler |
| DELETE | `/api/friends/:userId` | Retirer un ami |

### Messagerie
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/messages/conversations` | Mes conversations |
| GET | `/api/messages/conversations/:id` | Messages d'une conversation |
| POST | `/api/messages/:recipientId` | Envoyer un message |

### Stories
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/stories` | Stories actives (amis + moi) |
| POST | `/api/stories` | Créer une story |
| PUT | `/api/stories/:id/view` | Marquer comme vue |

---

## 🎨 Système de thèmes

Le mode sombre/clair est géré par des **variables CSS** sur `<html data-theme="dark|light">`.
Tous les composants utilisent uniquement des variables comme `var(--color-bg)`, `var(--color-text)`, etc.
La bascule est instantanée (pas de rechargement) et persistée en localStorage + base de données.

---

## 📝 Notes pédagogiques clés

1. **Embedding vs Referencing MongoDB** : les commentaires sont embarqués dans les posts (embedding) car toujours lus avec eux. Les messages sont une collection séparée (referencing) car potentiellement très nombreux.

2. **Index TTL** : les stories s'auto-suppriment via un index MongoDB `{ expireAfterSeconds: 0 }` sur le champ `expiresAt`, sans cron job.

3. **Mise à jour optimiste** : les likes changent immédiatement dans l'UI, sans attendre la réponse du serveur, pour une expérience fluide. Si l'API échoue, l'état est annulé.

4. **IntersectionObserver** : le défilement infini du fil d'actualité utilise l'API native du navigateur (pas de bibliothèque externe) pour détecter quand on approche du bas de la page.

5. **Un seul serveur HTTP** : Express (REST) et Socket.io partagent le même port grâce à `http.createServer(app)` → optimise les ressources en production.
