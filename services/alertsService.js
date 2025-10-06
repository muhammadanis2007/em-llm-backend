// services/alertsService.js
const cron = require('node-cron');
const { sql, config } = require('../config/db');
const nodemailer = require('nodemailer');

let ioInstance = null;

function setIo(io) {
  ioInstance = io;
}

/**
 * Insert new alert and notify via socket/email
 */
async function createAlert(type, message, refId = null) {
  const pool = await sql.connect(config);
  await pool.request()
    .input('Type', sql.NVarChar(50), type)
    .input('Message', sql.NVarChar(sql.MAX), message)
    .input('RefId', sql.Int, refId)
    .query(`INSERT INTO Alerts (AlertType, ReferenceId, Message)
            VALUES (@Type, @RefId, @Message)`);

  if (ioInstance) ioInstance.emit('alert', { type, message, refId, createdAt: new Date().toISOString() });

  if (process.env.ALERT_EMAIL_TO) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.ALERT_EMAIL_TO,
        subject: `EMR Alert: ${type}`,
        text: message
      });
    } catch (err) {
      console.error('Email alert failed:', err);
    }
  }
}

/**
 * Check pharmacy stock levels and expiry dates
 */
async function checkInventoryAndExpiry() {
  const pool = await sql.connect(config);
  const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD || '5');
  const lowStock = await pool.request()
    .input('Threshold', sql.Int, threshold)
    .query('SELECT * FROM PharmacyInventory WHERE QuantityAvailable <= @Threshold');

  for (const row of lowStock.recordset) {
    await createAlert('low-stock', `${row.MedicineName} low: ${row.QuantityAvailable} units`, row.MedicineId);
  }

  const days = parseInt(process.env.EXPIRY_SOON_DAYS || '30');
  const expireDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const soonExp = await pool.request()
    .input('ExpireDate', sql.DateTime, expireDate)
    .query('SELECT * FROM PharmacyInventory WHERE ExpiryDate <= @ExpireDate');

  for (const row of soonExp.recordset) {
    await createAlert('expired-medicine', `${row.MedicineName} expires on ${row.ExpiryDate}`, row.MedicineId);
  }
}

/**
 * Check AI feedback frequency
 */
async function checkAiErrorRates() {
  const pool = await sql.connect(config);
  const res = await pool.request()
    .query('SELECT COUNT(*) AS cnt FROM FeedbackTraining WHERE CreatedAt >= DATEADD(day, -7, GETDATE())');
  const count = res.recordset[0].cnt || 0;
  if (count > (process.env.AI_ERROR_THRESHOLD || 10)) {
    await createAlert('ai-error', `High AI feedback: ${count} issues in 7 days`);
  }
}

/**
 * Schedule recurring tasks
 */
function startSchedulers() {
  cron.schedule('*/10 * * * *', () => checkAiErrorRates().catch(console.error));  // every 10 minutes
  cron.schedule('0 * * * *', () => checkInventoryAndExpiry().catch(console.error)); // hourly
}

module.exports = { setIo, startSchedulers, createAlert };
