const express = require('express');
const router = express.Router();

/* GET api listing. */
router.get('/', (req, res) => {
  res.send('api works');
});

// Get all posts
router.get('/posts', (req, res) => {
  // Get posts from the mock api
  // This should ideally be replaced with a service that connects to MongoDB
  res.status(500).send(error);
});

router.post('/authenticate', (req, res) => {
  res.send("{'token':'notokenyet'}");
});

module.exports = router;