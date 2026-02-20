const express = require('express');
const router = express.Router();
const Legacy = require('../models/Legacy');
const auth = require('../middleware/auth');

// Get all user's legacies
router.get('/', auth, async (req, res) => {
  try {
    const legacies = await Legacy.find({ userId: req.user.userId })
      .sort('-createdAt');
    res.json({ success: true, data: legacies });
  } catch (error) {
    console.error('Get legacies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single legacy
router.get('/:id', auth, async (req, res) => {
  try {
    const legacy = await Legacy.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!legacy) {
      return res.status(404).json({ message: 'Legacy not found' });
    }

    res.json({ success: true, data: legacy });
  } catch (error) {
    console.error('Get legacy error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create legacy
router.post('/', auth, async (req, res) => {
  try {
    const { title, message, beneficiaries, triggerDate } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const legacy = await Legacy.create({
      userId: req.user.userId,
      title,
      message,
      beneficiaries: beneficiaries || [],
      triggerDate
    });

    res.status(201).json({ success: true, data: legacy });
  } catch (error) {
    console.error('Create legacy error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update legacy
router.put('/:id', auth, async (req, res) => {
  try {
    const legacy = await Legacy.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!legacy) {
      return res.status(404).json({ message: 'Legacy not found' });
    }

    res.json({ success: true, data: legacy });
  } catch (error) {
    console.error('Update legacy error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete legacy
router.delete('/:id', auth, async (req, res) => {
  try {
    const legacy = await Legacy.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!legacy) {
      return res.status(404).json({ message: 'Legacy not found' });
    }

    res.json({ success: true, message: 'Legacy deleted' });
  } catch (error) {
    console.error('Delete legacy error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
