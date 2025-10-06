const axios = require('axios');

async function suggestByLocalLLM(symptoms) {
  const prompt = `Based on symptoms: ${symptoms.join(', ')}, suggest diagnosis, tests, treatments.`;
  const res = await axios.post('http://localhost:11434/api/generate', {
    model: 'mistral', // llama2, etc.
    prompt: prompt,
    stream: false
  });
  return res.data.response;
}
module.exports = { suggestByLocalLLM };
