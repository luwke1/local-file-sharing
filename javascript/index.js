const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayFiles();
    fetchStorageInfo();

    // Event Listeners
    document.getElementById('uploadForm').addEventListener('submit', handleUploadSubmit);
    document.getElementById('batchDownload').addEventListener('click', downloadBatch);
    document.getElementById('closeModal').addEventListener('click', closePreview);
    
    // Drag & Drop
    window.addEventListener('dragover', (e) => { e.preventDefault(); document.getElementById('dropOverlay').classList.remove('hidden'); });
    window.addEventListener('dragleave', (e) => { 
        if (e.relatedTarget === null) document.getElementById('dropOverlay').classList.add('hidden'); 
    });
    window.addEventListener('drop', handleDrop);

    // Paste handling
    document.addEventListener('paste', handlePaste);

    // Server-Sent Events (Live Sync)
    const eventSource = new EventSource('/events');
    eventSource.onmessage = (e) => {
        if (e.data === 'update') {
            fetchAndDisplayFiles();
            fetchStorageInfo();
        }
    };
});

// --- FETCH & RENDER LOGIC ---

async function fetchAndDisplayFiles() {
    try {
        const response = await fetch('/files');
        const files = await response.json();
        const fileList = document.getElementById('fileList');
        const batchBtn = document.getElementById('batchDownload');

        fileList.innerHTML = '';
        if (files.length === 0) {
            fileList.innerHTML = '<li class="empty-list">No files available.</li>';
            batchBtn.style.display = 'none';
            return;
        }

        batchBtn.style.display = 'inline-block';
        files.forEach(file => {
            const li = document.createElement('li');
            const isMedia = file.originalName.match(/\.(mp4|webm|jpg|jpeg|png|gif|webp|mp3|wav)$/i);

            li.innerHTML = `
                <input type="checkbox" class="fileCheckbox" value="${file.storedName}">
                <a href="/download/${encodeURIComponent(file.storedName)}" title="Download">${file.originalName}</a>
                <div class="actions">
                    ${isMedia ? `<button class="previewBtn" onclick="openPreview('${file.storedName}', '${file.originalName}')">👁️</button>` : ''}
                    <button class="deleteBtn" onclick="deleteFile('${file.storedName}')">&times;</button>
                </div>
            `;
            fileList.appendChild(li);
        });
    } catch (err) { console.error(err); }
}

async function fetchStorageInfo() {
    try {
        const res = await fetch('/storage-info');
        const { freeSpace, totalSpace } = await res.json();
        const used = totalSpace - freeSpace;
        const percent = (used / totalSpace) * 100;
        
        document.getElementById('storageFill').style.width = `${percent}%`;
        document.getElementById('storageText').innerText = 
            `Storage: ${formatBytes(used)} / ${formatBytes(totalSpace)} (${percent.toFixed(1)}% Used)`;
    } catch (err) { console.error('Storage check failed'); }
}

// --- FILE UPLOAD PIPELINE ---

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('dropOverlay').classList.add('hidden');
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
}

function handlePaste(e) {
    if (e.clipboardData.files.length > 0) processFiles(e.clipboardData.files);
}

function handleUploadSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('fileInput');
    if (input.files.length > 0) processFiles(input.files);
    input.value = ''; // Reset
}

async function processFiles(files) {
    for (let i = 0; i < files.length; i++) {
        uploadFileChunked(files[i]);
    }
}

async function uploadFileChunked(file) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const ui = createProgressUI(file.name);
    let uploadedBytes = 0;
    const startTime = Date.now();

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', chunkIndex);

        try {
            await fetch('/upload-chunk', { method: 'POST', body: formData });
            uploadedBytes += chunk.size;
            updateProgressUI(ui, uploadedBytes, file.size, startTime);
        } catch (err) {
            ui.text.innerText = `Error uploading ${file.name}`;
            return;
        }
    }

    // Finalize
    ui.text.innerText = 'Assembling file...';
    try {
        await fetch('/upload-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uploadId, fileName: file.name, totalChunks })
        });
        ui.container.remove(); // Cleanup UI on success
    } catch (err) {
        ui.text.innerText = 'Assembly failed.';
    }
}

// --- UI HELPERS ---

function createProgressUI(fileName) {
    const container = document.createElement('div');
    container.className = 'upload-progress-item';
    
    const text = document.createElement('div');
    text.className = 'upload-progress-text';
    text.innerText = `Preparing: ${fileName}`;
    
    const barTrack = document.createElement('div');
    barTrack.className = 'upload-progress-bar-track';
    
    const barFill = document.createElement('div');
    barFill.className = 'upload-progress-bar-fill';
    
    barTrack.appendChild(barFill);
    container.appendChild(text);
    container.appendChild(barTrack);
    document.getElementById('uploadTracker').appendChild(container);
    
    return { container, text, barFill, fileName };
}

function updateProgressUI(ui, uploadedBytes, totalBytes, startTime) {
    const percent = Math.round((uploadedBytes / totalBytes) * 100);
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = uploadedBytes / elapsed; // bytes per sec
    const remaining = (totalBytes - uploadedBytes) / speed; // seconds
    
    ui.barFill.style.width = `${percent}%`;
    ui.text.innerText = `${ui.fileName} - ${percent}% (${formatBytes(speed)}/s) - ETA: ${formatTime(remaining)}`;
}

// --- UTILS & PREVIEWS ---

async function deleteFile(storedName) {
    if (!confirm('Delete this file?')) return;
    await fetch(`/delete/${encodeURIComponent(storedName)}`, { method: 'DELETE' });
}

async function downloadBatch() {
    const selected = Array.from(document.querySelectorAll('.fileCheckbox:checked')).map(cb => cb.value);
    if (selected.length === 0) return alert('Select files to download.');

    const res = await fetch('/batch-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: selected })
    });
    
    if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'batch-download.zip';
        a.click();
    }
}

function openPreview(storedName, originalName) {
    const modal = document.getElementById('previewModal');
    const container = document.getElementById('mediaContainer');
    const url = `/download/${encodeURIComponent(storedName)}?preview=true`;
    
    container.innerHTML = '';
    
    if (originalName.match(/\.(mp4|webm)$/i)) {
        container.innerHTML = `<video controls autoplay><source src="${url}"></video>`;
    } else if (originalName.match(/\.(mp3|wav)$/i)) {
        container.innerHTML = `<audio controls autoplay><source src="${url}"></audio>`;
    } else {
        container.innerHTML = `<img src="${url}" alt="Preview">`;
    }
    
    modal.classList.remove('hidden');
}

function closePreview() {
    document.getElementById('previewModal').classList.add('hidden');
    document.getElementById('mediaContainer').innerHTML = ''; // Stops audio/video
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(seconds) {
    if (!isFinite(seconds)) return 'Calculating...';
    if (seconds < 60) return Math.round(seconds) + 's';
    return Math.floor(seconds / 60) + 'm ' + Math.round(seconds % 60) + 's';
}