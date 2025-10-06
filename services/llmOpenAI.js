const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function suggestByOpenAI(symptoms) {
  const messages = [{ role: "user", content: `Symptoms: ${symptoms.join(', ')}` }];
  const response = await openai.chat.completions.create({ model: "gpt-4", messages });
  return response.choices[0].message.content;
}
module.exports = { suggestByOpenAI };
