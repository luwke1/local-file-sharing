const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const archiver = require('archiver');
const qrcode = require('qrcode-terminal');
const checkDiskSpace = require('check-disk-space').default;

const app = express();
const PORT = 3000;

// Dynamic IP resolution
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '0.0.0.0';
}
const localIP = getLocalIP();

app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ limit: '50gb', extended: true }));
app.use(cors());

app.use(express.static(path.join(__dirname, 'html')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/javascript', express.static(path.join(__dirname, 'javascript')));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// Server-Sent Events (SSE) Client List
let sseClients = [];
const broadcastUpdate = () => {
    sseClients.forEach(client => client.write(`data: update\n\n`));
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        // Generate a random 9-digit number to guarantee uniqueness even in the same millisecond
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + sanitized);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 * 1024 } });

// --- ENDPOINTS ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

// SSE Endpoint for real-time sync
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    sseClients.push(res);
    req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
    });
});

// Storage Disk Info
app.get('/storage-info', async (req, res) => {
    try {
        const space = await checkDiskSpace(UPLOADS_DIR);
        res.json({ freeSpace: space.free, totalSpace: space.size });
    } catch (err) {
        res.status(500).json({ error: 'Could not check disk space' });
    }
});

// File List
app.get('/files', (req, res) => {
    fs.readdir(UPLOADS_DIR, (err, files) => {
        if (err) return res.status(500).send('Unable to retrieve files');
        const fileDetails = files
            .filter(file => file !== 'temp' && fs.statSync(path.join(UPLOADS_DIR, file)).isFile())
            .map(file => {
                const originalName = file.substring(file.indexOf('-') + 1);
                return { storedName: file, originalName: originalName };
            }).reverse();
        res.json(fileDetails);
    });
});

// Chunked Upload Endpoints
app.post('/upload-chunk', upload.single('chunk'), (req, res) => {
    const { uploadId, chunkIndex } = req.body;
    const chunkTempDir = path.join(TEMP_DIR, uploadId);
    
    if (!fs.existsSync(chunkTempDir)) fs.mkdirSync(chunkTempDir, { recursive: true });
    
    // Move uploaded chunk file into the temp folder under its index
    fs.renameSync(req.file.path, path.join(chunkTempDir, chunkIndex));
    res.sendStatus(200);
});

app.post('/upload-complete', async (req, res) => {
    const { uploadId, fileName, totalChunks } = req.body;
    const chunkTempDir = path.join(TEMP_DIR, uploadId);
    const sanitizedOriginalName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalName = Date.now() + '-' + sanitizedOriginalName;
    const finalPath = path.join(UPLOADS_DIR, finalName);

    const writeStream = fs.createWriteStream(finalPath);
    
    try {
        for (let i = 0; i < parseInt(totalChunks); i++) {
            const chunkPath = path.join(chunkTempDir, i.toString());
            if (!fs.existsSync(chunkPath)) throw new Error(`Missing chunk ${i}`);
            
            await new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(chunkPath);
                readStream.pipe(writeStream, { end: false });
                readStream.on('end', resolve);
                readStream.on('error', reject);
            });
        }
        writeStream.end();
        fs.rmSync(chunkTempDir, { recursive: true, force: true });
        
        broadcastUpdate();
        res.json({ success: true, message: 'File assembled successfully' });
    } catch (err) {
        console.error(err);
        writeStream.end();
        res.status(500).json({ success: false, message: 'Error assembling chunks' });
    }
});

// Legacy single upload
app.post('/upload', upload.array('files', 50), (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false });
    broadcastUpdate();
    res.status(200).json({ success: true });
});

// Single File Download / Media Preview Stream
app.get('/download/:filename', (req, res) => {
    const { filename } = req.params;
    const isPreview = req.query.preview === 'true';
    if (filename.includes('..')) return res.status(400).send('Invalid filename.');
    
    const filePath = path.join(UPLOADS_DIR, filename);
    const originalName = filename.substring(filename.indexOf('-') + 1);

    if (!fs.existsSync(filePath)) return res.status(404).send('File not found.');

    if (isPreview) {
        // Native express streaming supports HTTP Range requests automatically
        res.sendFile(filePath); 
    } else {
        res.download(filePath, originalName);
    }
});

// Delete
app.delete('/delete/:filename', (req, res) => {
    const { filename } = req.params;
    if (filename.includes('..')) return res.status(400).send('Invalid filename.');
    
    fs.unlink(path.join(UPLOADS_DIR, filename), (err) => {
        if (err && err.code !== 'ENOENT') return res.status(500).send('Error deleting');
        broadcastUpdate();
        res.status(200).json({ message: 'Deleted' });
    });
});

// Batch Download
app.post('/batch-download', (req, res) => {
    const { files } = req.body;
    if (!files || files.length === 0) return res.status(400).send('No files');

    const archive = archiver('zip', { zlib: { level: 6 } });
    res.attachment('files.zip');
    archive.pipe(res);

    files.forEach((file) => {
        const filePath = path.join(UPLOADS_DIR, file);
        if (fs.existsSync(filePath)) {
            const originalName = file.substring(file.indexOf('-') + 1);
            // Use store mode (level 0) for pre-compressed media to save server CPU
            const isMedia = originalName.match(/\.(mp4|mkv|webm|zip|gz|rar|mp3)$/i);
            archive.file(filePath, { name: originalName, store: !!isMedia });
        }
    });
    archive.finalize();
});

// Boot Sequence
const server = app.listen(PORT, localIP, () => {
    const serverUrl = `http://${localIP}:${PORT}`;
    console.log('\n=========================================');
    console.log(`🚀 Server running on: ${serverUrl}`);
    console.log('Scan the QR code below to connect on mobile:');
    qrcode.generate(serverUrl, { small: true });
    console.log('=========================================\n');
});

server.setTimeout(0);