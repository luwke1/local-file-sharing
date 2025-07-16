const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const PORT = 3000;

const localIP = '192.168.50.5';


// Increase payload size limits for large files
app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ limit: '50gb', extended: true }));

app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'html')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/javascript', express.static(path.join(__dirname, 'javascript')));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
// Ensure the `uploads` directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Configure multer to store uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // To prevent overwrites and issues with special characters, create a unique, clean filename
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + sanitizedOriginalName;
    cb(null, uniqueSuffix);
  }
});

// Configure multer with storage and file size limits
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 * 1024 // 50 GB limit
  }
});

// Endpoint to serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

// Endpoint to retrieve a list of uploaded files
app.get('/files', (req, res) => {
  fs.readdir(UPLOADS_DIR, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to retrieve files');
    }
    // Map to objects containing the server-stored name and the original name
    const fileDetails = files.map(file => {
      const originalName = file.substring(file.indexOf('-') + 1);
      return {
        storedName: file,
        originalName: originalName
      };
    }).reverse(); // Show newest files first
    res.json(fileDetails);
  });
});

// Endpoint to download a specific file
app.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);

  // Security check to prevent directory traversal
  if (filename.includes('..')) {
    return res.status(400).send('Invalid filename.');
  }

  const originalName = filename.substring(filename.indexOf('-') + 1);
  res.download(filePath, originalName, (err) => {
    if (err && !res.headersSent) {
      res.status(404).send('File not found or error during download.');
    }
  });
});

// Endpoint to delete a specific file
app.delete('/delete/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);

  if (filename.includes('..')) {
    return res.status(400).send('Invalid filename.');
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      // If the file doesn't exist, it might have been already deleted.
      return res.status(err.code === 'ENOENT' ? 404 : 500).send('Error deleting file');
    }
    res.status(200).json({ message: 'File deleted successfully' });
  });
});

// Batch download endpoint
app.post('/batch-download', (req, res) => {
  const { files } = req.body;
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).send('No files selected for download');
  }

  const archive = archiver('zip', { zlib: { level: 9 } });
  res.attachment('files.zip');
  archive.pipe(res);

  files.forEach((file) => {
    const filePath = path.join(UPLOADS_DIR, file);
    if (fs.existsSync(filePath)) {
      const originalName = file.substring(file.indexOf('-') + 1);
      archive.file(filePath, { name: originalName }); // Use original name inside the zip
    }
  });

  archive.finalize();
});

// Multiple file upload endpoint
app.post('/upload', upload.array('files', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }
  res.status(200).json({ success: true, message: 'Files uploaded successfully.' });
});

// Listen on the manually specified IP
const server = app.listen(PORT, localIP, () => {
    if (localIP === 'ENTER_YOUR_LOCAL_IP_ADDRESS_HERE' || !localIP) {
        console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error("!!! ERROR: Please set your local IP address in server.js !!!");
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
        return;
    }
    console.log(`🚀 Server is running!`);
    console.log(`   Access the application at: http://${localIP}:${PORT}`);
});

server.setTimeout(0);