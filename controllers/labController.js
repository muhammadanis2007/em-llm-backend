const Tesseract = require('tesseract.js');
const { convert } = require('pdf-poppler');
const { Configuration, OpenAIApi } = require('openai');
const { sql, config } = require('../config/db');
const fs = require('fs');
const path = require('path');

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

// Convert PDF → Images (one per page)
const convertPdfToImage = async (pdfPath, outputDir) => {
  const opts = {
    format: 'png',
    out_dir: outputDir,
    out_prefix: 'page',
    page: null
  };
  await convert(pdfPath, opts);
};

// OCR one image
const ocrImage = async (imagePath) => {
  const result = await Tesseract.recognize(imagePath, 'eng', {
    logger: m => console.log(m)
  });
  return result.data.text;
};

exports.uploadLabReport = async (req, res) => {
  const pdfPath = req.file.path;
  const outputDir = './tmp';

  try {
    await convertPdfToImage(pdfPath, outputDir);
    const imageFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));

    let fullText = '';
    for (const img of imageFiles) {
      const text = await ocrImage(path.join(outputDir, img));
      fullText += text + '\n';
      fs.unlinkSync(path.join(outputDir, img));
    }

    // OpenAI Analysis
    const aiRes = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a senior medical assistant. Interpret lab reports, identify abnormalities, and suggest further tests or treatment.'
        },
        {
          role: 'user',
          content: `Here is a lab report:\n\n${fullText}`
        }
      ],
      temperature: 0.4
    });

    res.json({
      success: true,
      extractedText: fullText,
      aiAnalysis: aiRes.data.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to analyze lab report' });
  } finally {
    fs.unlinkSync(pdfPath);
  }
};




async function saveLabReportToDB({ {
  patientId: req.body.patientId,
  labTestType: req.body.labTestType || 'General',
  reportText: fullText,
  aiSummary: aiRes.data.choices[0].message.content
} }) {
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('PatientId', sql.Int, patientId)
      .input('LabTestType', sql.VarChar(100), labTestType)
      .input('ReportText', sql.NVarChar(sql.MAX), reportText)
      .input('DiagnosisSummary', sql.NVarChar(sql.MAX), aiSummary)
      .input('AIModelUsed', sql.VarChar(50), 'gpt-4')
      .query(`
        INSERT INTO PatientLabReports 
        (PatientId, LabTestType, ReportText, DiagnosisSummary, AIModelUsed) 
        VALUES (@PatientId, @LabTestType, @ReportText, @DiagnosisSummary, @AIModelUsed)
      `);
  } catch (err) {
    console.error('SQL Insert Error:', err);
  }
}
