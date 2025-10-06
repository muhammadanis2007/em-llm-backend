const { poolPromise } = require('../services/db');

// ✅ Add prescription
exports.addPrescription = async (req, res) => {
  const { visitId, medicineName, dosage, duration, instructions } = req.body;

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("VisitId", visitId)
      .input("MedicineName", medicineName)
      .input("Dosage", dosage)
      .input("Duration", duration)
      .input("Instructions", instructions || '')
      .query(`
        INSERT INTO Prescriptions (VisitId, MedicineName, Dosage, Duration, Instructions)
        VALUES (@VisitId, @MedicineName, @Dosage, @Duration, @Instructions)
      `);

    res.status(201).json({ message: "Prescription added successfully" });
  } catch (err) {
    console.error("Add Prescription Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Update prescription
exports.updatePrescription = async (req, res) => {
  const id = req.params.id;
  const { medicineName, dosage, duration, instructions } = req.body;

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("Id", id)
      .input("MedicineName", medicineName)
      .input("Dosage", dosage)
      .input("Duration", duration)
      .input("Instructions", instructions || '')
      .query(`
        UPDATE Prescriptions
        SET MedicineName = @MedicineName,
            Dosage = @Dosage,
            Duration = @Duration,
            Instructions = @Instructions
        WHERE Id = @Id
      `);

    res.json({ message: "Prescription updated successfully" });
  } catch (err) {
    console.error("Update Prescription Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Delete prescription
exports.deletePrescription = async (req, res) => {
  const id = req.params.id;

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("Id", id)
      .query(`DELETE FROM Prescriptions WHERE Id = @Id`);

    res.json({ message: "Prescription deleted successfully" });
  } catch (err) {
    console.error("Delete Prescription Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get prescriptions by VisitId
exports.getPrescriptionsByVisit = async (req, res) => {
  const visitId = req.params.visitId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input("VisitId", visitId)
      .query(`SELECT * FROM Prescriptions WHERE VisitId = @VisitId`);

    res.json(result.recordset);
  } catch (err) {
    console.error("Fetch Prescriptions Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
