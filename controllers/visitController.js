const { poolPromise } = require('../services/db');
const { generateDiagnosisWithLLM } = require('../services/llmService'); // LLM integration

exports.createVisitWithSymptoms = async (req, res) => {
  const { patientId, symptoms, notes, llmSource } = req.body;

  try {
    const pool = await poolPromise;
    const transaction = await pool.transaction();
    await transaction.begin();

    // 1. Create Visit
    const visitResult = await transaction.request()
      .input("PatientId", patientId)
      .input("Notes", notes || '')
      .query(`INSERT INTO PatientVisits (PatientId, Notes) 
              OUTPUT INSERTED.Id 
              VALUES (@PatientId, @Notes)`);

    const visitId = visitResult.recordset[0].Id;

    // 2. Add Symptoms
    for (let symptom of symptoms) {
      await transaction.request()
        .input("VisitId", visitId)
        .input("SymptomText", symptom)
        .query(`INSERT INTO Symptoms (VisitId, SymptomText) 
                VALUES (@VisitId, @SymptomText)`);
    }

    // 3. Generate Diagnosis + Recommendations using LLM
    const llmInput = symptoms.join(", ");
    const llmResult = await generateDiagnosisWithLLM(llmInput, llmSource);

    await transaction.request()
      .input("VisitId", visitId)
      .input("DiagnosisText", llmResult.diagnosis)
      .input("RecommendedTreatment", llmResult.treatment)
      .input("SuggestedLabTests", llmResult.labTests)
      .input("LLMSource", llmSource)
      .query(`INSERT INTO Diagnosis 
              (VisitId, DiagnosisText, RecommendedTreatment, SuggestedLabTests, LLMSource)
              VALUES (@VisitId, @DiagnosisText, @RecommendedTreatment, @SuggestedLabTests, @LLMSource)`);

    await transaction.commit();

    res.status(201).json({ message: "Visit created and diagnosis generated", visitId });
  } catch (err) {
    console.error("Create Visit Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getVisitDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;

    const visitResult = await pool.request()
      .input("VisitId", id)
      .query(`
        SELECT pv.*, p.FullName, p.Contact 
        FROM PatientVisits pv
        JOIN Patients p ON pv.PatientId = p.Id
        WHERE pv.Id = @VisitId
      `);

    const symptomsResult = await pool.request()
      .input("VisitId", id)
      .query(`SELECT * FROM Symptoms WHERE VisitId = @VisitId`);

    const diagnosisResult = await pool.request()
      .input("VisitId", id)
      .query(`SELECT * FROM Diagnosis WHERE VisitId = @VisitId`);

    const prescriptionsResult = await pool.request()
      .input("VisitId", id)
      .query(`SELECT * FROM Prescriptions WHERE VisitId = @VisitId`);

    res.json({
      visit: visitResult.recordset[0],
      symptoms: symptomsResult.recordset,
      diagnosis: diagnosisResult.recordset[0],
      prescriptions: prescriptionsResult.recordset,
    });

  } catch (err) {
    console.error("Get Visit Details Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
