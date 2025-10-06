const axios = require('axios');

exports.generateDiagnosisWithLLM = async (symptomsText, source = 'OpenAI') => {
  if (source === 'OpenAI') {
    // Replace with your real OpenAI key or proxy endpoint
    const openAIKey = process.env.OPENAI_API_KEY;
    const prompt = `Given the symptoms: ${symptomsText}, suggest a diagnosis, treatment, and lab tests.`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }]
    }, {
      headers: { Authorization: `Bearer ${openAIKey}` }
    });

    const content = response.data.choices[0].message.content;

    const match = content.match(/Diagnosis:(.*)Treatment:(.*)Lab Tests:(.*)/is);
    return {
      diagnosis: match?.[1]?.trim() || "Unknown",
      treatment: match?.[2]?.trim() || "Not specified",
      labTests: match?.[3]?.trim() || "None"
    };

  } else {
    // Call your local LLM API (like LM Studio, Ollama, LocalGPT)
    const localResponse = await axios.post('http://localhost:11434/api/chat', {
      model: "mistral",
      messages: [{ role: "user", content: `Patient symptoms: ${symptomsText}. Give diagnosis, treatment and tests.` }]
    });

    const content = localResponse.data.message.content;

    return {
      diagnosis: "From Local: " + content,
      treatment: "Evaluate locally",
      labTests: "Local suggestions"
    };
  }
};
