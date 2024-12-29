// Fetch and display the files
async function fetchFiles() {
    const response = await fetch('/files');
    const files = await response.json();
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    files.forEach(file => {
        const listItem = document.createElement('li');

        // Delete button (X)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'deleteBtn';
        deleteBtn.textContent = 'X';
        deleteBtn.onclick = () => deleteFile(file);

        // Link for individual download
        const link = document.createElement('a');
        link.href = `/download/${file}`;
        link.textContent = file;
        link.download = file;

        // Checkbox for batch selection
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = file;
        checkbox.className = 'fileCheckbox';

        listItem.appendChild(checkbox);
        listItem.appendChild(link);
        listItem.appendChild(deleteBtn);

        fileList.appendChild(listItem);
    });
}

// Delete file function
async function deleteFile(filename) {
    try {
        const response = await fetch(`/delete/${filename}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            fetchFiles(); // Refresh the file list
        } else {
            alert(`Failed to delete ${filename}.`);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        alert('An error occurred while deleting the file.');
    }
}

// Batch download selected files
async function downloadBatch() {
    const selectedFiles = Array.from(document.querySelectorAll('.fileCheckbox:checked'))
        .map(checkbox => checkbox.value);

    if (selectedFiles.length === 0) {
        alert('No files selected for batch download.');
        return;
    }

    const response = await fetch('/batch-download', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files: selectedFiles })
    });

    if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'batch-download.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
    } else {
        alert('Error downloading files.');
    }
}

// Handle form submission for uploads
async function handleFormSubmission(event) {
    event.preventDefault(); // Prevent the default form submission behavior

    const form = event.target;
    const formData = new FormData(form);
    const uploadButton = form.querySelector('button[type="submit"]');

    // Disable the upload button to prevent multiple submissions
    uploadButton.disabled = true;
    uploadButton.textContent = 'Uploading...';

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            console.log('Files uploaded successfully');
            window.location.reload(); // Reload the page to refresh the file list
        } else {
            console.error('Failed to upload files');
            alert('Upload failed. Please try again.');
        }
    } catch (error) {
        console.error('Error uploading files:', error);
        alert('An error occurred. Please try again.');
    } finally {
        // Re-enable the upload button
        uploadButton.disabled = false;
        uploadButton.textContent = 'Upload';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchFiles();

    // Add the form submission handler
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
});  