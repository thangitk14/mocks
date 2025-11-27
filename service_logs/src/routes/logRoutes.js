const express = require('express');
const router = express.Router();
const multer = require('multer');
const LogController = require('../controllers/logController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// POST /api/logs - Store list of logs
router.post('/', LogController.storeLogs);

// POST /api/logs/csv - Upload CSV file and store logs
router.post('/csv', upload.single('file'), LogController.uploadCsv);

// GET /api/logs/export - Export logs as CSV
router.get('/export', LogController.exportLogs);

module.exports = router;

