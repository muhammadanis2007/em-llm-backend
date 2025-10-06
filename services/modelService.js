// services/modelService.js
const { sql, config } = require('../config/db');
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

/**
 * Retrieve currently active model from registry
 */
async function getActiveModel() {
  const pool = await sql.connect(config);
  const result = await pool.request()
    .query('SELECT TOP 1 * FROM ModelRegistry WHERE IsActive = 1 ORDER BY CreatedAt DESC');
  return result.recordset[0];
}

/**
 * Retrieve model by key
 */
async function getModelByKey(key) {
  const pool = await sql.connect(config);
  const result = await pool.request()
    .input('ModelKey', sql.NVarChar(100), key)
    .query('SELECT * FROM ModelRegistry WHERE ModelKey = @ModelKey');
  return result.recordset[0];
}

/**
 * Unified generate handler for any model type (OpenAI, local, fine-tuned)
 */
async function generateFromModel({ input, modelKey = null }) {
  const model = modelKey ? await getModelByKey(modelKey) : await getActiveModel();
  if (!model) throw new Error('No model configured or active');

  const configData = model.Config ? JSON.parse(model.Config) : {};

  if (model.Type === 'openai') {
    const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
    const resp = await openai.createChatCompletion({
      model: configData.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: input }],
      temperature: configData.temperature ?? 0.2
    });
    return { text: resp.data.choices[0].message.content, meta: resp.data };
  }

  if (model.Type === 'local') {
    const endpoint = model.Endpoint.endsWith('/') ? model.Endpoint : model.Endpoint + '/';
    const body = {
      model: configData.model,
      prompt: input,
      temperature: configData.temperature ?? 0.2
    };
    const resp = await axios.post(endpoint + 'api/generate', body, { timeout: 120000 });
    return { text: resp.data.response ?? resp.data.output ?? JSON.stringify(resp.data), meta: resp.data };
  }

  if (model.Type === 'fine-tuned') {
    const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
    const ftModel = configData.id || configData.model;
    const resp = await openai.createChatCompletion({
      model: ftModel,
      messages: [{ role: 'user', content: input }],
      temperature: configData.temperature ?? 0.2
    });
    return { text: resp.data.choices[0].message.content, meta: resp.data };
  }

  throw new Error(`Unsupported model type: ${model.Type}`);
}

module.exports = { getActiveModel, getModelByKey, generateFromModel };
