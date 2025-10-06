// backend/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { poolPromise } = require('../services/db');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  const { fullName, email, password, role } = req.body;
  try {
    const pool = await poolPromise;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.request()
      .input("FullName", fullName)
      .input("Email", email)
      .input("PasswordHash", hashedPassword)
      .input("Role", role || 'Doctor')
      .query(`INSERT INTO Users (FullName, Email, PasswordHash, Role)
              VALUES (@FullName, @Email, @PasswordHash, @Role)`);

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: 'Email already exists or server error.' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("Email", email)
      .query("SELECT * FROM Users WHERE Email = @Email");

    const user = result.recordset[0];
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign({
      id: user.Id,
      email: user.Email,
      role: user.Role
    }, JWT_SECRET, { expiresIn: '2h' });

    res.json({
      token,
      user: {
        id: user.Id,
        name: user.FullName,
        email: user.Email,
        role: user.Role
      }
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: 'Server error' });
  }
};
