const rateLimit = require('express-rate-limit');

// General rate limiter for most routes
exports.defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Specific limiter for file downloads
exports.downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 download requests per minute
  message: { 
    message: 'Terlalu banyak permintaan unduh. Silakan coba lagi dalam beberapa saat.' 
  }
});

// Specific limiter for file uploads
exports.uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 upload requests per minute
  message: { 
    message: 'Terlalu banyak permintaan unggah. Silakan coba lagi dalam beberapa saat.' 
  }
});