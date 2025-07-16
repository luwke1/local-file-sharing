document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const batchDownloadBtn = document.getElementById('batchDownload');

    // Fetch and display files on page load
    fetchAndDisplayFiles();

    // Add event listener for the upload form
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }

    // Add event listener for the batch download button
    if (batchDownloadBtn) {
        batchDownloadBtn.addEventListener('click', downloadBatch);
    }
});

/**
 * Fetches the list of files from the server and displays them.
 */
async function fetchAndDisplayFiles() {
    try {
        const response = await fetch('/files');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const files = await response.json();
        const fileList = document.getElementById('fileList');
        const batchDownloadBtn = document.getElementById('batchDownload');

        fileList.innerHTML = ''; // Clear the list before repopulating

        if (files.length === 0) {
            fileList.innerHTML = '<li class="empty-list">No files have been uploaded yet.</li>';
            batchDownloadBtn.style.display = 'none'; // Hide button if no files
            return;
        }

        batchDownloadBtn.style.display = 'inline-block'; // Show button if files exist

        files.forEach(file => {
            const listItem = document.createElement('li');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = file.storedName;
            checkbox.className = 'fileCheckbox';

            const link = document.createElement('a');
            link.href = `/download/${encodeURIComponent(file.storedName)}`;
            link.textContent = file.originalName;
            link.title = `Download ${file.originalName}`;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'deleteBtn';
            deleteBtn.innerHTML = '&times;'; // Use HTML entity for a nicer 'X'
            deleteBtn.title = `Delete ${file.originalName}`;
            deleteBtn.onclick = () => deleteFile(file.storedName, file.originalName);

            listItem.appendChild(checkbox);
            listItem.appendChild(link);
            listItem.appendChild(deleteBtn);
            fileList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error fetching files:', error);
        document.getElementById('fileList').innerHTML = '<li class="empty-list">Error loading files. Please refresh the page.</li>';
    }
}

/**
 * Handles the file upload process via AJAX.
 * @param {Event} event The form submission event.
 */
async function handleUpload(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const fileInput = form.querySelector('input[type="file"]');
    const uploadButton = form.querySelector('button[type="submit"]');

    if (fileInput.files.length === 0) {
        alert('Please select one or more files to upload.');
        return;
    }

    uploadButton.disabled = true;
    uploadButton.textContent = 'Uploading...';

    try {
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const result = await response.json();

        if (response.ok && result.success) {
            fetchAndDisplayFiles();
            form.reset();
        } else {
            alert(`Upload failed: ${result.message || 'Please try again.'}`);
        }
    } catch (error) {
        console.error('Error uploading files:', error);
        alert('An error occurred during upload. Please check the console and try again.');
    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = 'Upload';
    }
}

/**
 * Deletes a specific file from the server.
 * @param {string} storedName The unique name of the file on the server.
 * @param {string} originalName The original name for display in prompts.
 */
async function deleteFile(storedName, originalName) {
    if (!confirm(`Are you sure you want to delete "${originalName}"?`)) return;

    try {
        const response = await fetch(`/delete/${encodeURIComponent(storedName)}`, { method: 'DELETE' });
        if (response.ok) {
            fetchAndDisplayFiles();
        } else {
            const result = await response.text();
            alert(`Failed to delete ${originalName}: ${result}`);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        alert('An error occurred while deleting the file.');
    }
}

/**
 * Downloads selected files as a single ZIP archive.
 */
async function downloadBatch() {
    const selectedFiles = Array.from(document.querySelectorAll('.fileCheckbox:checked'))
        .map(checkbox => checkbox.value);

    if (selectedFiles.length === 0) {
        alert('Please select one or more files to download.');
        return;
    }

    try {
        const response = await fetch('/batch-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: selectedFiles })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'files.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            throw new Error(`Server responded with ${response.status}`);
        }
    } catch (error) {
        console.error('Error during batch download:', error);
        alert('An error occurred while creating the download.');
    }
}