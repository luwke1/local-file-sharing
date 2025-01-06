# Local File Sharing

A lightweight, self-hosted application for sharing files over a local network. This project is designed to be simple, fast, and effective, making it ideal for quick file transfers without relying on third-party services.

<div align="center">
  <img src="https://github.com/user-attachments/assets/e0f2dc2b-c7a2-41c5-bf7b-3c59e659de9c" alt="Local File Sharing">
</div>

## Features

- Upload multiple files with ease.
- Download individual files or batch download selected files as a zip.
- Delete files directly from the interface.
- Fully responsive user interface for both desktop and mobile devices.
- Lightweight and easy to set up on any system running Node.js.

## Requirements

- Node.js (v12 or higher)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/luwke1/local-file-sharing.git
   ```

2. Navigate to the project directory:
   ```bash
   cd local-file-sharing-main
   ```

3. Install the required dependencies:
   ```bash
   npm install
   ```

4. Update your IPv4 address:
   Open `server.js` and replace the placeholder `ENTER_YOUR_LOCAL_IP_ADDRESS_HERE` with your device's IPv4 address. You can find this address by running the `ipconfig` command (Windows) or `ifconfig`/`ip a` (Linux/Mac) in your terminal.

## Usage

### Start the Server

- On Windows:
  Run the `start-server.bat` file:
  ```bash
  start-server.bat
  ```

- On other platforms:
  Start the server manually:
  ```bash
  node server.js
  ```

### Access the Application

Once the server is running, open a web browser and navigate to:
```
http://localhost:3000
```
**IMPORTANT NOTE:** Replace `localhost` with your local IP address if accessing from another device on the same network.


## Functionalities

### Upload Files
- Use the provided form to upload multiple files simultaneously. 

### View Uploaded Files
- A list of uploaded files is displayed dynamically.
- Each file has options to:
  - Download individually.
  - Select for batch download.
  - Delete.

### Batch Download
- Select multiple files using checkboxes and download them as a single zip file.

### Delete Files
- Remove unwanted files with a single click.

## Technologies Used

- **Backend**: Node.js, Express, Multer (file upload), Archiver (batch download).
- **Frontend**: HTML, CSS, JavaScript.
