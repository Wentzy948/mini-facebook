# 🚀 Déployer WentzyFace en ligne — Guide pour wentzy948

Ce guide te donne un lien public fonctionnel en ~15-20 minutes, 100% gratuit, sans carte bancaire.
Je ne peux pas le faire à ta place (pas d'accès à tes comptes), mais voici chaque étape exacte.

---

## Étape 1 — Pousser le code sur GitHub (5 min)

```bash
# Dézippe le projet, puis dans le dossier mini-facebook :
cd mini-facebook
git init
git add .
git commit -m "Initial commit - WentzyFace"

# Crée le repo sur https://github.com/new (connecté en tant que wentzy948)
#   Nom suggéré : wentzyface
#   Visibilité : Public ou Private (les deux marchent avec Render/Vercel gratuits)
#   NE PAS cocher "Initialize with README" (on a déjà le nôtre)

git remote add origin https://github.com/wentzy948/wentzyface.git
git branch -M main
git push -u origin main
```

---

## Étape 2 — Créer la base de données (MongoDB Atlas, 5 min)

1. Va sur **https://cloud.mongodb.com** et connecte-toi avec **janvierwentzy@gmail.com**
2. **Build a Database** → choisis **M0 Free** → région la plus proche → **Create**
3. **Database Access** (menu gauche) → **Add New Database User**
   - Username : `wentzyface_app`
   - Password : clique **Autogenerate Secure Password** → **copie-le et garde-le de côté**
4. **Network Access** (menu gauche) → **Add IP Address** → **Allow Access From Anywhere** (`0.0.0.0/0`)
   - Nécessaire car Render utilise des IPs dynamiques
5. Retour sur **Database** → **Connect** → **Drivers** → copie la chaîne de connexion, qui ressemble à :
   ```
   mongodb+srv://wentzyface_app:<password>@cluster0.xxxxx.mongodb.net/wentzyface?retryWrites=true&w=majority
   ```
   Remplace `<password>` par le mot de passe copié à l'étape 3.

**Garde cette chaîne complète de côté — c'est ta `MONGO_URI`.**

---

## Étape 3 — Déployer le backend (Render, 5 min)

1. Va sur **https://dashboard.render.com** → connecte-toi avec GitHub (`wentzy948`)
2. **New +** → **Blueprint**
3. Sélectionne le repo **wentzy948/wentzyface** (le `render.yaml` à la racine est détecté automatiquement)
4. Render affiche le service `wentzyface-backend` détecté. Clique **Apply**.
5. Une fois le service créé, va dans l'onglet **Environment** et ajoute ces 3 variables :

   | Clé | Valeur |
   |---|---|
   | `MONGO_URI` | la chaîne complète de l'étape 2 |
   | `JWT_SECRET` | une longue chaîne aléatoire — génère-la avec la commande ci-dessous |
   | `CLIENT_URL` | laisse `http://localhost:3000` pour l'instant, on la corrigera à l'étape 5 |

   Génère un `JWT_SECRET` sécurisé :
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

6. Render redéploie automatiquement. Une fois prêt (~2 min), note l'URL donnée, du type :
   ```
   https://wentzyface-backend.onrender.com
   ```

⚠️ **Tier gratuit Render** : le service s'endort après 15 min sans trafic, et met 30-60s à se réveiller au premier appel suivant. C'est normal, pas un bug.

---

## Étape 4 — Peupler la base avec les amis automatiques (2 min)

Une fois le backend en ligne, exécute le seed **en local** en pointant vers Atlas :

```bash
cd backend
cp .env.example .env
# Edite .env : remplace MONGO_URI par ta chaîne Atlas de l'étape 2
npm install
npm run seed
```

Tu devrais voir :
```
✅ Seed terminé avec succès !
Comptes de démonstration disponibles...
```

Ceci crée 6 comptes démo déjà amis entre eux, avec des publications (photos + vidéos).
**Tout nouveau compte que tu crées ensuite via `/register` sera automatiquement ami avec eux** — ton fil ne sera jamais vide.

---

## Étape 5 — Déployer le frontend (Vercel, 5 min)

1. Va sur **https://vercel.com** → connecte-toi avec GitHub (`wentzy948`)
2. **Add New** → **Project** → sélectionne **wentzy948/wentzyface**
3. **Root Directory** → clique **Edit** → choisis `frontend`
4. **Environment Variables** → ajoute :

   | Clé | Valeur |
   |---|---|
   | `REACT_APP_API_URL` | l'URL Render de l'étape 3 (ex: `https://wentzyface-backend.onrender.com`) |

5. Clique **Deploy**. Après ~2 min, Vercel te donne ton lien public :
   ```
   https://wentzyface.vercel.app
   ```

---

## Étape 6 — Connecter les deux (1 min, important !)

Retourne sur **Render** → ton service → **Environment** → modifie `CLIENT_URL` :
```
CLIENT_URL = https://wentzyface.vercel.app
```
(remplace par ton vrai lien Vercel). Sauvegarde → Render redéploie automatiquement.

Sans cette étape, le navigateur bloquera les requêtes du frontend vers le backend (erreur CORS).

---

## ✅ C'est en ligne !

Ton lien public : `https://wentzyface.vercel.app` (ou le sous-domaine que Vercel t'a donné).

Teste avec un compte démo :
- Email : `marie.demo@wentzyface.app`
- Mot de passe : `Demo1234!`

Ou crée ton propre compte via "S'inscrire" — tu seras automatiquement ami avec les 6 comptes démo, donc ton fil contiendra immédiatement des publications avec photos et vidéos.

---

## Dépannage rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| Page blanche sur Vercel | `REACT_APP_API_URL` mal configurée | Vérifie qu'elle pointe vers ton URL Render exacte, sans `/` final |
| Erreur CORS dans la console | `CLIENT_URL` sur Render ne correspond pas à l'URL Vercel | Étape 6 ci-dessus |
| "Cannot connect to MongoDB" | IP non autorisée ou mauvais mot de passe | Revérifie Network Access (0.0.0.0/0) et le mot de passe dans `MONGO_URI` |
| Premier chargement très lent | Normal — Render free tier se réveille | Attends 30-60s, les requêtes suivantes sont rapides |
| Le fil est vide après inscription | Le seed n'a pas été lancé | Relance `npm run seed` en local avec la bonne `MONGO_URI` |
