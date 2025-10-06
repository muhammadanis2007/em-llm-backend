// backend/controllers/patientController.js
const { poolPromise } = require('../services/db');

exports.createPatient = async (req, res) => {
  const { fullName, dateOfBirth, gender, contact, address } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input("FullName", fullName)
      .input("DateOfBirth", dateOfBirth)
      .input("Gender", gender)
      .input("Contact", contact)
      .input("Address", address)
      .query(`INSERT INTO Patients (FullName, DateOfBirth, Gender, Contact, Address)
              VALUES (@FullName, @DateOfBirth, @Gender, @Contact, @Address)`);
    res.status(201).json({ message: "Patient added successfully" });
  } catch (err) {
    console.error("Create Patient Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM Patients ORDER BY Id DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error("Get Patients Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getPatientById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("Id", id)
      .query("SELECT * FROM Patients WHERE Id = @Id");

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "Patient not found" });

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Get Patient Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updatePatient = async (req, res) => {
  const { id } = req.params;
  const { fullName, dateOfBirth, gender, contact, address } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input("Id", id)
      .input("FullName", fullName)
      .input("DateOfBirth", dateOfBirth)
      .input("Gender", gender)
      .input("Contact", contact)
      .input("Address", address)
      .query(`UPDATE Patients
              SET FullName = @FullName,
                  DateOfBirth = @DateOfBirth,
                  Gender = @Gender,
                  Contact = @Contact,
                  Address = @Address
              WHERE Id = @Id`);

    res.json({ message: "Patient updated successfully" });
  } catch (err) {
    console.error("Update Patient Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deletePatient = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input("Id", id)
      .query("DELETE FROM Patients WHERE Id = @Id");

    res.json({ message: "Patient deleted successfully" });
  } catch (err) {
    console.error("Delete Patient Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
