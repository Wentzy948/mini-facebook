const express = require('express');
const { createStory, getStories, viewStory } = require('../controllers/storyController');
const { protect } = require('../middleware/auth');
const { uploadStoryImage } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

// GET /api/stories -> stories actives de moi + mes amis, regroupees par auteur
router.get('/', getStories);

// POST /api/stories -> creer une story (image upload OU texte + couleur)
router.post('/', uploadStoryImage.single('image'), createStory);

// PUT /api/stories/:id/view -> marquer une story comme vue
router.put('/:id/view', viewStory);

module.exports = router;
