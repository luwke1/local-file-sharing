const os = require('os');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const PORT = 3000;
const localIP = 'ENTER_YOUR_LOCAL_IP_ADDRESS_HERE';

app.use(cors());

// Add middleware to parse JSON bodies
app.use(express.json());

// Serve the HTML file from /html/index.html
app.use(express.static(path.join(__dirname, 'html')));

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/javascript', express.static(path.join(__dirname, 'javascript')));

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

// Endpoint to send out the main home page html
app.get('/', (req, res) => {
  console.log('Request received at /');
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
          return res.status(404).send('File not found');
      }
  });
});

// Endpoint to delete a specific file
app.delete('/delete/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send('File does not exist');
    }

    fs.unlink(filePath, (err) => {
      if (err) {
        return res.status(500).send('Error deleting file');
      }
      res.sendStatus(200);
    });
  });
});

// Batch download endpoint
app.post('/batch-download', (req, res) => {
  const files = req.body.files; // Expecting an array of filenames from the client
  if (!files || files.length === 0) {
    return res.status(400).send('No files selected for download');
  }

  const archive = archiver('zip', { zlib: { level: 9 } });
  res.attachment('batch-download.zip');

  archive.on('error', (err) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);

  files.forEach((file) => {
    const filePath = path.join(__dirname, 'uploads', file);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file });
    }
  });

  archive.finalize();
});

// Multiple file upload endpoint
app.post('/upload', upload.array('files', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send('No files uploaded');
  }
  console.log('Files received:', req.files);

  // Redirect to root after successful upload
  res.redirect('/');
});

app.listen(PORT, localIP, () => {
  console.log(`Server running at http://${localIP}:${PORT}/`);
});