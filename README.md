# Local File Sharing App

A web application for sharing files across a local network using Node.js. It supports multiple uploads, batch downloads as ZIP files, and large file transfers.

## Prerequisites

1. Node.js (LTS version recommended): Download from nodejs.org.
2. The project folder containing server.js, package.json, and the subdirectories (html, css, javascript).

## Installation

1. Open a terminal or command prompt in the project folder.
2. Run the following command to install the required libraries:
   npm install

## Configuration

The server needs to know your local IP address to allow other devices to connect.

1. Open server.js in a text editor.
2. Locate the line: const localIP = '192.168.50.5';
3. Update the IP to match your current machine.
   - On Windows: Run 'ipconfig' in command prompt to find your IPv4 Address.
   - On Mac/Linux: Run 'ifconfig' or 'hostname -I'.

## Running the Server

- Windows: Double-click start-server.bat.
- Manual: Run 'node server.js' in your terminal.

The console will confirm the server is running and provide the URL for other devices to use.

## Troubleshooting and Firewall

1. Windows Firewall Permission
When running the server for the first time, Windows Defender may ask for network access. You must select "Private networks" (home or work). If you select only Public, other devices on your Wi-Fi will be blocked.



2. Manual Firewall Adjustment
If devices cannot connect, check your settings:
- Go to Control Panel > System and Security > Windows Defender Firewall.
- Select "Allow an app or feature through Windows Defender Firewall".
- Ensure "Node.js JavaScript Runtime" has "Private" checked.



3. Connection Issues
- Verify both the server PC and the client device (phone/laptop) are on the same Wi-Fi network.
- Ensure your Windows network profile is set to "Private" rather than "Public" in your system network settings.

## Usage

- Files are stored in the 'uploads' folder.
- Maximum file size is configured for 50GB.
- Use the checkboxes to select multiple files for a batch ZIP download.

## License

This project is licensed under the MIT License.
