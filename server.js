const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

// Serve the HTML file from /html/index.html
app.use(express.static(path.join(__dirname, 'html')));

// Ensure the `uploads` directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure multer to store uploads in `uploads/`
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // store files in the local 'uploads' folder
  },
  filename: (req, file, cb) => {
    // Example naming: use current timestamp + original filename
    const uniqueSuffix = Date.now() + '-' + file.originalname;
    cb(null, uniqueSuffix);
  }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

// Endpoint to retrieve list of uploaded files
app.get('/files', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err) {
      return res.status(500).send('Unable to retrieve files');
    }
    res.send(files);
  });
});

// Endpoint to download a specific file
app.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  res.download(filePath, (err) => {
    if (err) {
      res.status(404).send('File not found');
    }
  });
});

// Multiple file upload endpoint
app.post('/upload', upload.array('files', 10), (req, res) => {
  // 'myFiles' must match the field name sent from the client
  if (!req.files || req.files.length === 0) {
    return res.status(400).send('No files uploaded');
  }
  console.log('Files received:', req.files);

  // Redirect to root after successful upload
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});