const Tesseract = require('tesseract.js');
const { convert } = require('pdf-poppler');
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');
const path = require('path');

// Convert PDF to PNG
const convertPdfToImage = async (pdfPath, outputDir) => {
  const opts = {
    format: 'png',
    out_dir: outputDir,
    out_prefix: 'page',
    page: null // All pages
  };
  await convert(pdfPath, opts);
};

// OCR each image page
const ocrImage = async (imagePath) => {
  const result = await Tesseract.recognize(imagePath, 'eng', {
    logger: m => console.log(m) // Optional: progress
  });
  return result.data.text;
};


const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

const response = await openai.createChatCompletion({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a medical assistant interpreting lab results.' },
    { role: 'user', content: `Please analyze this lab report:\n\n${fullText}` }
  ]
});

// Endpoint handler
exports.processLabPdf = async (req, res) => {
  const pdfPath = req.file.path;
  const outputDir = './tmp';

  try {
    await convertPdfToImage(pdfPath, outputDir);
    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));

    let fullText = '';
    for (const file of files) {
      const imagePath = path.join(outputDir, file);
      const text = await ocrImage(imagePath);
      fullText += text + '\n';
      fs.unlinkSync(imagePath); // Clean up
    }

    // ➕ Optionally send to OpenAI here
    res.json({ success: true, extractedText: fullText });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OCR Failed' });
  } finally {
    fs.unlinkSync(pdfPath);
  }
};
