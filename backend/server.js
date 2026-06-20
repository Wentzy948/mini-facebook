require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');

const connectDB = require('./config/db');
const { initSocket } = require('./socket/socketHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const friendRoutes = require('./routes/friendRoutes');
const postRoutes = require('./routes/postRoutes');
const storyRoutes = require('./routes/storyRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// 1) Connexion a la base de donnees MongoDB
connectDB();

const app = express();

// ---------------------------------------------------------------------------
// 2) SECURITE — en-tetes HTTP defensifs (sans dependance externe)
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  // Empeche le MIME-sniffing (ex : servir un .jpg traite comme du JS)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Bloque le chargement de la page dans une iframe (clickjacking)
  res.setHeader('X-Frame-Options', 'DENY');
  // Active le filtre XSS integre des anciens navigateurs
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Ne pas envoyer le referrer vers des domaines externes
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

// ---------------------------------------------------------------------------
// 3) RATE LIMITING leger en memoire (sans express-rate-limit)
//    Protection contre le brute-force sur les routes d'authentification.
//    Pour la production, utiliser plutot express-rate-limit + Redis.
// ---------------------------------------------------------------------------
const authAttempts = new Map(); // ip -> { count, resetAt }
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_ATTEMPTS = 20; // 20 tentatives par fenetre

const authRateLimiter = (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = authAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + AUTH_WINDOW_MS };
  }

  entry.count += 1;
  authAttempts.set(ip, entry);

  // Nettoyage periodique pour eviter les fuites memoire (toutes les 100 requetes)
  if (authAttempts.size > 1000) {
    for (const [k, v] of authAttempts) {
      if (now > v.resetAt) authAttempts.delete(k);
    }
  }

  if (entry.count > AUTH_MAX_ATTEMPTS) {
    return res.status(429).json({
      message: `Trop de tentatives. Reessaie dans ${Math.ceil((entry.resetAt - now) / 60000)} minute(s).`
    });
  }

  next();
};

// 4) Middlewares globaux
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' })); // limite la taille des payloads JSON
app.use(express.urlencoded({ extended: true }));

// 5) Sert les fichiers uploades (images de profil, posts, stories...) de maniere statique
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 6) Montage des routes de l'API, toutes prefixees par /api
//    authRateLimiter protege register + login contre le brute-force
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Route de "sante" simple, utile pour verifier que l'API tourne
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API WentzyFace operationnelle.' });
});

// 5) Gestion des routes inconnues (404)
app.use((req, res) => {
  res.status(404).json({ message: `Route non trouvee : ${req.method} ${req.originalUrl}` });
});

// 6) Gestionnaire d'erreurs global (filet de securite pour les erreurs non gerees)
//    Multer renvoie des erreurs avec un code specifique (ex: fichier trop gros)
app.use((err, req, res, next) => {
  console.error('Erreur non geree :', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Le fichier depasse la taille maximale autorisee (5 Mo).' });
  }

  return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur interne.' });
});

// 7) Creation du serveur HTTP "brut" pour pouvoir y attacher a la fois
//    Express (API REST) ET Socket.io (temps reel) sur le meme port.
const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur demarre sur http://localhost:${PORT}`);
});
