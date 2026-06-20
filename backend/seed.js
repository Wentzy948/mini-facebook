require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
require('dotenv').config();
const User = require('./models/User');
const Post = require('./models/Post');

/**
 * seed.js — Peuple la base de donnees avec des comptes de demonstration
 * ------------------------------------------------------------------------
 * Pourquoi ce script existe :
 *   Un compte WentzyFace tout neuf n'a ni amis ni publications, donc son
 *   fil d'actualite (qui montre "mes posts + ceux de mes amis") est vide.
 *   Ce script cree 6 comptes de demonstration deja amis entre eux, avec
 *   des publications contenant de vraies photos et videos (hebergees sur
 *   des services externes stables, donc aucun fichier local a gerer).
 *
 *   Ces comptes sont marques `isSeedAccount: true`. Le controleur d'inscription
 *   (authController.register) ajoute automatiquement TOUT nouvel utilisateur
 *   comme ami de ces comptes -> des l'inscription, le fil n'est jamais vide.
 *
 * Utilisation :
 *   cd backend
 *   npm run seed
 *
 * Le script est idempotent : on peut le relancer plusieurs fois sans creer
 * de doublons (il met a jour les comptes existants au lieu de les dupliquer).
 */

const DEMO_PASSWORD = 'Demo1234!'; // respecte la regle de complexite du modele User

const DEMO_USERS = [
  {
    username: 'marie.d',
    email: 'marie.demo@wentzyface.app',
    fullName: 'Marie Dupont',
    bio: 'Étudiante en informatique — Université Inuka',
    profilePicture: 'https://i.pravatar.cc/300?img=47'
  },
  {
    username: 'jean.k',
    email: 'jean.demo@wentzyface.app',
    fullName: 'Jean Kasongo',
    bio: 'Passionné de Node.js et de bases de données',
    profilePicture: 'https://i.pravatar.cc/300?img=12'
  },
  {
    username: 'amina.d',
    email: 'amina.demo@wentzyface.app',
    fullName: 'Amina Diallo',
    bio: 'Designer UX/UI — café et code',
    profilePicture: 'https://i.pravatar.cc/300?img=32'
  },
  {
    username: 'kwame.o',
    email: 'kwame.demo@wentzyface.app',
    fullName: 'Kwame Osei',
    bio: 'Ingénieur réseau, fan de VLSM',
    profilePicture: 'https://i.pravatar.cc/300?img=14'
  },
  {
    username: 'fatou.b',
    email: 'fatou.demo@wentzyface.app',
    fullName: 'Fatou Ba',
    bio: 'Data scientist, ML enthusiast',
    profilePicture: 'https://i.pravatar.cc/300?img=45'
  },
  {
    username: 'samuel.t',
    email: 'samuel.demo@wentzyface.app',
    fullName: 'Samuel Tshibangu',
    bio: 'Développeur full-stack — café avant tout',
    profilePicture: 'https://i.pravatar.cc/300?img=51'
  }
];

// Publications de demonstration : melange de texte seul, texte+photo, texte+video.
// Les URLs externes sont stockees telles quelles dans media.url ; le frontend
// (fileUrl() dans api/axios.js) les affiche directement sans les prefixer,
// car elles commencent deja par "http".
const DEMO_POSTS = [
  {
    author: 'marie.d',
    content: "Première semaine de cours terminée ! Direction la bibliothèque pour réviser le machine learning 📚",
    media: { url: 'https://picsum.photos/id/1062/900/600', type: 'image' }
  },
  {
    author: 'jean.k',
    content: "Mon projet SQL Server est enfin terminé : partitioning, triggers et SSIS tournent nickel. Quelle semaine !",
    media: { url: 'https://picsum.photos/id/180/900/600', type: 'image' }
  },
  {
    author: 'amina.d',
    content: "Petite démo de mon dernier prototype d'interface — j'ai filmé l'animation, regardez !",
    media: {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'video'
    }
  },
  {
    author: 'kwame.o',
    content: "Astuce VLSM du jour : commence toujours par le sous-réseau qui a besoin du plus grand nombre d'hôtes.",
    media: { url: 'https://picsum.photos/id/3/900/600', type: 'image' }
  },
  {
    author: 'fatou.b',
    content: "Random Forest vs Gradient Boosting sur mon dataset de détection de bots : 94% de précision avec le second !",
    media: { url: 'https://picsum.photos/id/60/900/600', type: 'image' }
  },
  {
    author: 'samuel.t',
    content: "Petit tour de mon setup de dev ce matin, café obligatoire ☕",
    media: {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      type: 'video'
    }
  },
  {
    author: 'marie.d',
    content: "Quelqu'un a des conseils pour réviser le machine learning efficacement ? Random Forest vs Gradient Boosting, je m'y perds un peu 😅"
    // post texte seul, sans media — pour varier le rendu du fil
  },
  {
    author: 'jean.k',
    content: "Coucher de soleil sur le campus ce soir, parfait pour décompresser après les partiels.",
    media: { url: 'https://picsum.photos/id/1015/900/600', type: 'image' }
  }
];

const run = async () => {
  await connectDB();

  console.log('\n🌱 Démarrage du seed WentzyFace...\n');

  // -------------------------------------------------------------------
  // 1) Creation / mise a jour des comptes de demonstration (idempotent)
  // -------------------------------------------------------------------
  const createdUsers = {};

  for (const data of DEMO_USERS) {
    let user = await User.findOne({ username: data.username });

    if (user) {
      // Met a jour les champs au cas ou le script soit relance avec des donnees modifiees
      user.fullName = data.fullName;
      user.bio = data.bio;
      user.profilePicture = data.profilePicture;
      user.isSeedAccount = true;
      await user.save();
      console.log(`  ↻ Compte existant mis a jour : @${data.username}`);
    } else {
      user = await User.create({
        username: data.username,
        email: data.email,
        password: DEMO_PASSWORD, // hache automatiquement par le hook pre('save') du modele
        fullName: data.fullName,
        bio: data.bio,
        profilePicture: data.profilePicture,
        isSeedAccount: true
      });
      console.log(`  ✓ Compte créé : @${data.username}`);
    }

    createdUsers[data.username] = user;
  }

  // -------------------------------------------------------------------
  // 2) Amitie mutuelle entre TOUS les comptes de demonstration
  //    (cercle ferme : chacun est ami avec tous les autres)
  // -------------------------------------------------------------------
  const allIds = Object.values(createdUsers).map((u) => u._id);

  for (const user of Object.values(createdUsers)) {
    const otherIds = allIds.filter((id) => !id.equals(user._id));
    await User.findByIdAndUpdate(user._id, { $addToSet: { friends: { $each: otherIds } } });
  }
  console.log(`  ✓ ${allIds.length} comptes de démo rendus mutuellement amis`);

  // -------------------------------------------------------------------
  // 3) Publications de demonstration (texte, photo, video)
  // -------------------------------------------------------------------
  // On supprime d'abord les anciens posts de demo pour eviter les doublons
  // si le script est relance plusieurs fois.
  await Post.deleteMany({ author: { $in: allIds } });

  for (const postData of DEMO_POSTS) {
    const author = createdUsers[postData.author];
    if (!author) continue;

    await Post.create({
      author: author._id,
      content: postData.content,
      media: postData.media || { url: '', type: null },
      // Quelques likes croises entre comptes de demo pour que le fil paraisse vivant
      likes: allIds.filter(() => Math.random() > 0.4).slice(0, 4)
    });
  }
  console.log(`  ✓ ${DEMO_POSTS.length} publications de démonstration créées (photos + vidéos incluses)`);

  // -------------------------------------------------------------------
  // 4) Auto-amitie retroactive : si des utilisateurs reels existent deja
  //    et ne sont pas encore amis avec les comptes de demo, on les relie.
  //    (Pour les NOUVEAUX inscrits a partir de maintenant, c'est fait
  //    automatiquement par authController.register — voir ce fichier.)
  // -------------------------------------------------------------------
  const realUsers = await User.find({ isSeedAccount: { $ne: true } });
  for (const real of realUsers) {
    await User.findByIdAndUpdate(real._id, { $addToSet: { friends: { $each: allIds } } });
    for (const seedId of allIds) {
      await User.findByIdAndUpdate(seedId, { $addToSet: { friends: real._id } });
    }
  }
  if (realUsers.length > 0) {
    console.log(`  ✓ ${realUsers.length} compte(s) réel(s) existant(s) reliés rétroactivement aux comptes de démo`);
  }

  console.log('\n✅ Seed terminé avec succès !\n');
  console.log('Comptes de démonstration disponibles (mot de passe identique pour tous) :');
  DEMO_USERS.forEach((u) => console.log(`   • ${u.email}  /  ${DEMO_PASSWORD}`));
  console.log('\nTout NOUVEAU compte que tu crées via /register sera automatiquement');
  console.log('ami avec ces 6 comptes : ton fil d\'actualité ne sera jamais vide.\n');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('\n❌ Erreur pendant le seed :', err);
  process.exit(1);
});
