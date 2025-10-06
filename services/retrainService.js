// services/retrainService.js
const cron = require('node-cron');
const fs = require('fs');
const axios = require('axios');
const { sql, config } = require('../config/db');

/**
 * Build fine-tuning dataset from feedback and trigger retraining job
 */
async function runRetrainPipeline() {
  console.log('[Retrain] Checking feedback data...');
  const pool = await sql.connect(config);
  const feedback = await pool.request()
    .query('SELECT * FROM FeedbackTraining WHERE IsUsedInTraining = 0');

  if (!feedback.recordset.length) {
    console.log('[Retrain] No new feedback.');
    return;
  }

  const dataset = feedback.recordset.map(row => ({
    messages: [
      { role: 'user', content: row.OriginalAIOutput },
      { role: 'assistant', content: row.CorrectedOutput || row.DoctorFeedback }
    ]
  }));

  const filePath = './training_data.jsonl';
  fs.writeFileSync(filePath, dataset.map(d => JSON.stringify(d)).join('\n'));

  const apiKey = process.env.OPENAI_API_KEY;
  const upload = await axios.post('https://api.openai.com/v1/files',
    fs.createReadStream(filePath),
    { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'multipart/form-data' } });

  const fineTune = await axios.post('https://api.openai.com/v1/fine_tuning/jobs',
    { training_file: upload.data.id, model: 'gpt-4o-mini' },
    { headers: { 'Authorization': `Bearer ${apiKey}` } });

  await pool.request()
    .input('ModelName', sql.VarChar(100), 'gpt-4o-mini')
    .input('RecordsUsed', sql.Int, feedback.recordset.length)
    .input('FineTunedModel', sql.VarChar(200), fineTune.data.id)
    .input('Status', sql.VarChar(50), 'Started')
    .query(`INSERT INTO ModelTrainingHistory (ModelName, RecordsUsed, FineTunedModel, Status)
            VALUES (@ModelName, @RecordsUsed, @FineTunedModel, @Status)`);

  await pool.request().query('UPDATE FeedbackTraining SET IsUsedInTraining = 1 WHERE IsUsedInTraining = 0');
  console.log('[Retrain] Fine-tune job started:', fineTune.data.id);
}

// Run daily at midnight
cron.schedule('0 0 * * *', () => {
  runRetrainPipeline().catch(err => console.error('[Retrain] Error:', err.message));
});

module.exports = { runRetrainPipeline };
