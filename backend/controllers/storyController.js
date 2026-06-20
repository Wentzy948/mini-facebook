const Story = require('../models/Story');

const STORY_POPULATE_AUTHOR = 'username fullName profilePicture';

/**
 * @route   POST /api/stories
 * @desc    Cree une nouvelle story (image upload OU texte avec couleur de fond),
 *          valable 24h (cf. champ `expiresAt` + index TTL dans le modele Story)
 * @access  Prive
 */
const createStory = async (req, res) => {
  try {
    const { text, backgroundColor } = req.body;
    const image = req.file ? `/uploads/stories/${req.file.filename}` : '';

    if (!image && !text) {
      return res.status(400).json({ message: 'Une story doit contenir une image ou du texte.' });
    }

    const story = await Story.create({
      author: req.user._id,
      image,
      text: text || '',
      backgroundColor: backgroundColor || '#1877F2'
    });

    await story.populate('author', STORY_POPULATE_AUTHOR);

    return res.status(201).json({ story });
  } catch (error) {
    console.error('Erreur createStory :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   GET /api/stories
 * @desc    Renvoie les stories actives (non expirees) de l'utilisateur connecte
 *          et de ses amis, regroupees par auteur (un "groupe" de stories par personne,
 *          comme la barre de stories en haut du fil d'actualite de Facebook).
 * @access  Prive
 */
const getStories = async (req, res) => {
  try {
    const authorIds = [req.user._id, ...req.user.friends];

    // Filtre defensif sur expiresAt : meme si l'index TTL de MongoDB s'occupe
    // de la suppression, son "moniteur" ne tourne que toutes les ~60 secondes,
    // donc on s'assure de ne jamais renvoyer une story deja expiree.
    const stories = await Story.find({
      author: { $in: authorIds },
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: 1 })
      .populate('author', STORY_POPULATE_AUTHOR);

    // Regroupe les stories par auteur : { authorId: { author, stories: [...] } }
    const grouped = {};
    for (const story of stories) {
      const authorId = story.author._id.toString();
      if (!grouped[authorId]) {
        grouped[authorId] = { author: story.author, stories: [] };
      }
      grouped[authorId].stories.push(story);
    }

    // Met l'utilisateur connecte en premier (comme "Votre story" sur Facebook),
    // puis trie les autres par la story la plus recente.
    const myId = req.user._id.toString();
    const groups = Object.values(grouped).sort((a, b) => {
      if (a.author._id.toString() === myId) return -1;
      if (b.author._id.toString() === myId) return 1;
      const aLatest = a.stories[a.stories.length - 1].createdAt;
      const bLatest = b.stories[b.stories.length - 1].createdAt;
      return new Date(bLatest) - new Date(aLatest);
    });

    return res.json({ groups });
  } catch (error) {
    console.error('Erreur getStories :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @route   PUT /api/stories/:id/view
 * @desc    Marque une story comme vue par l'utilisateur connecte
 *          (permet d'afficher le nombre de vues a l'auteur)
 * @access  Prive
 */
const viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: 'Story introuvable ou expiree.' });
    }

    const alreadyViewed = story.viewers.some((id) => id.toString() === req.user._id.toString());

    if (!alreadyViewed) {
      story.viewers.push(req.user._id);
      await story.save();
    }

    return res.json({ viewers: story.viewers.length });
  } catch (error) {
    console.error('Erreur viewStory :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = { createStory, getStories, viewStory };
