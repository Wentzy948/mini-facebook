const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Configuration des uploads de fichiers avec Multer
 * -----------------------------------------------
 * Chaque categorie (posts, profils, couvertures, stories) est stockee
 * dans son propre sous-dossier de /backend/uploads, ce qui simplifie
 * le rangement et le nettoyage des fichiers.
 *
 * Deux profils de validation :
 *  - IMAGE_TYPES  : utilise pour profils, couvertures et stories (5 Mo max)
 *  - MEDIA_TYPES  : utilise pour les publications, qui acceptent en plus
 *                   les videos (50 Mo max, car une video pese plus lourd)
 */

const IMAGE_TYPES = /jpeg|jpg|png|gif|webp/;
const VIDEO_TYPES = /mp4|mov|webm|avi|mkv/;
const MEDIA_TYPES = new RegExp(`${IMAGE_TYPES.source}|${VIDEO_TYPES.source}`);

const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 Mo
const MEDIA_SIZE_LIMIT = 50 * 1024 * 1024; // 50 Mo (pour les videos)

const createStorage = (subfolder) => {
  const dir = path.join(__dirname, '..', 'uploads', subfolder);

  // S'assure que le dossier existe (utile au premier lancement)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${req.user ? req.user._id : 'anon'}-${Date.now()}${ext}`;
      cb(null, uniqueName);
    }
  });
};

const buildFileFilter = (allowedRegex, errorMessage) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowedRegex.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error(errorMessage));
  }
};

const buildUploader = (subfolder, { allowedRegex, errorMessage, sizeLimit }) =>
  multer({
    storage: createStorage(subfolder),
    fileFilter: buildFileFilter(allowedRegex, errorMessage),
    limits: { fileSize: sizeLimit }
  });

module.exports = {
  // Publications : images ET videos acceptees
  uploadPostMedia: buildUploader('posts', {
    allowedRegex: MEDIA_TYPES,
    errorMessage:
      "Format non supporte. Images : jpg, jpeg, png, gif, webp. Videos : mp4, mov, webm, avi, mkv.",
    sizeLimit: MEDIA_SIZE_LIMIT
  }),

  // Photo de profil : image uniquement
  uploadProfilePicture: buildUploader('profiles', {
    allowedRegex: IMAGE_TYPES,
    errorMessage: "Format d'image non supporte. Utilise jpg, jpeg, png, gif ou webp.",
    sizeLimit: IMAGE_SIZE_LIMIT
  }),

  // Photo de couverture : image uniquement
  uploadCoverPhoto: buildUploader('covers', {
    allowedRegex: IMAGE_TYPES,
    errorMessage: "Format d'image non supporte. Utilise jpg, jpeg, png, gif ou webp.",
    sizeLimit: IMAGE_SIZE_LIMIT
  }),

  // Story : image uniquement (le texte sur fond colore ne passe pas par Multer)
  uploadStoryImage: buildUploader('stories', {
    allowedRegex: IMAGE_TYPES,
    errorMessage: "Format d'image non supporte. Utilise jpg, jpeg, png, gif ou webp.",
    sizeLimit: IMAGE_SIZE_LIMIT
  })
};
