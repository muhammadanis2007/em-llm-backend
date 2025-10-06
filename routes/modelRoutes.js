// routes/modelRoutes.js
const express = require('express');
const router = express.Router();
const { sql, config } = require('../config/db');
const { getActiveModel, getModelByKey, generateFromModel } = require('../services/modelService');

/**
 * Get all models
 */
router.get('/', async (req, res) => {
  const pool = await sql.connect(config);
  const result = await pool.request().query('SELECT * FROM ModelRegistry ORDER BY CreatedAt DESC');
  res.json(result.recordset);
});

/**
 * Activate a model
 */
router.post('/activate/:modelKey', async (req, res) => {
  const { modelKey } = req.params;
  const pool = await sql.connect(config);
  await pool.request().query('UPDATE ModelRegistry SET IsActive = 0');
  await pool.request()
    .input('Key', sql.NVarChar(100), modelKey)
    .query('UPDATE ModelRegistry SET IsActive = 1 WHERE ModelKey = @Key');
  res.json({ success: true, activeModel: modelKey });
});

/**
 * Generate output using specific or active model
 */
router.post('/generate', async (req, res) => {
  const { input, modelKey } = req.body;
  try {
    const out = await generateFromModel({ input, modelKey });
    res.json(out);
  } catch (err) {
    console.error('Model generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
