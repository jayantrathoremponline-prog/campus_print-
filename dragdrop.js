// dragAndDrop.js
// Provides drag & drop UI and uploadFile() to send a file to a Google Apps Script endpoint

// --- CONFIGURATION ---
// Replace this with your Apps Script web app URL if needed
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwsuQRjd_EkMfp21yz8mD4DU5F_hKVwAvB6LyDC1ww8XpVwXwgOQ8tc0zMPa92PPYJe/exec";

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const dropMessage = document.getElementById('drop-message');
const fileNameDisplay = document.getElementById('file-name');
const statusMsg = document.getElementById('status-message');
const fileList = document.getElementById('file-list');

let selectedFiles = [];
let totalPages = 0;

if (dropZone) {
    // 1. Handle Drag & Drop Visuals
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#dbeafe'; // Darker blue on hover
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.backgroundColor = '#eff6ff'; // Reset
    });

    // 2. Handle File Drop
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#eff6ff';
        
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // 3. Handle Click to Upload
    dropZone.addEventListener('click', () => fileInput && fileInput.click());
}

if (fileInput) {
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
            fileInput.value = ''; // Reset to allow selecting the same file again
        }
    });
}
/*
function handleFile(file) {
    selectedFile = file;
    if (dropMessage) dropMessage.innerText = "✅ File Ready:";
    if (fileNameDisplay) fileNameDisplay.innerText = file.name;
    if (dropZone) dropZone.style.borderColor = "#16a34a"; // Green border
}
    */
   function handleFile(file) {
        selectedFiles.push(file);
        
        // Update display
        dropMessage.innerText = "✅ Files Selected:";
        fileNameDisplay.innerText = selectedFiles.length + " file(s)";
        fileList.innerHTML = selectedFiles.map(f => `<p>${f.name}</p>`).join('');
        dropZone.style.borderColor = "#16a34a";

        // Check File Type for Page Counting
        if (file.type === "application/pdf") {
            statusMsg.innerText = "📄 Counting pages for " + file.name;
            statusMsg.style.color = "blue";
            
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            
            reader.onload = function() {
                const typedarray = new Uint8Array(this.result);
                
                pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                    totalPages += pdf.numPages;
                    document.getElementById('pages').value = totalPages;
                    calculateTotal();
                    statusMsg.innerText = "✅ Pages updated: " + totalPages;
                    statusMsg.style.color = "green";
                });
            };
        } else if (file.type.includes("image")) {
            totalPages += 1;
            document.getElementById('pages').value = totalPages;
            calculateTotal();
            statusMsg.innerText = "✅ Image added (1 Page), Total Pages: " + totalPages;
            statusMsg.style.color = "green";
        } else {
            statusMsg.innerText = "⚠️ Word file added. Please adjust page count manually.";
            statusMsg.style.color = "#d97706";
            document.getElementById('pages').focus();
        }
    }

// Expose uploadFile globally
function uploadFile() {
    // 1. Validate Files
    if (selectedFiles.length === 0) {
        alert("Please select files first!");
        return;
    }

    // 2. Validate Student Details
    const sName = document.getElementById('student-name').value;
    const sYear = document.getElementById('student-year').value;
    const sBranch = document.getElementById('student-branch').value;
    const sSection = document.getElementById('student-section').value;
    // const sEnrollment = document.getElementById('student-enrollment').value;
    const sRoll = document.getElementById('student-roll').value; // New
    const sDesc = document.getElementById('order-desc').value; // New
    
    if (!sName || !sYear || !sBranch || !sRoll) {
        alert("Please fill in your Name, Year, Branch, and Enrollment Number!");
        document.getElementById('student-name').focus();
        return;
    }

    // 3. Prepare UI
    if (statusMsg) {
        statusMsg.innerText = "⏳ Uploading... Please wait.";
        statusMsg.style.color = "blue";
    }

    // 4. Gather Order Info
    const totalCost = document.getElementById('total').innerText;
    const printType = document.getElementById('type').options[document.getElementById('type').selectedIndex].text;
    const bindingType = document.getElementById('binding').options[document.getElementById('binding').selectedIndex].text;
    const paymentMethod = document.querySelector('input[name="paymethod"]:checked').value;
    const copies = document.getElementById('copies').value;

    // Read all files
    const filePromises = selectedFiles.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const rawLog = (reader.result && reader.result.split(',')[1]) || '';
                resolve({
                    filename: file.name,
                    mimeType: file.type,
                    fileData: rawLog
                });
            };
        });
    });

    Promise.all(filePromises).then(filesData => {
        // 5. Build Payload
        const dataPayload = {
            files: filesData,
            // New Fields
            studentName: sName,
            year: sYear,
            branch: sBranch,
            section: sSection,
            rollNumber: sRoll,
            orderDescription: sDesc,
            totalCost: totalCost,
            printType: printType,
            binding: bindingType,
            copies: copies,
            paymentMethod: paymentMethod
        };

        fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(dataPayload)
        })
        .then(response => response.text())
        .then(() => {
            if (statusMsg) {
                statusMsg.innerText = "🎉 Order Placed! Please collect from Room 213.";
                statusMsg.style.color = "green";
            }
            // Clear inputs
            selectedFiles = [];
            totalPages = 0;
            if (fileNameDisplay) fileNameDisplay.innerText = '';
            if (fileList) fileList.innerHTML = '';
            if (dropMessage) dropMessage.innerText = "📂 Drag & Drop files here";
            if (dropZone) dropZone.style.borderColor = '';
            // Reset form fields optional
            document.getElementById('student-name').value = "";
            document.getElementById('pages').value = 1;
            calculateTotal();
        })
        .catch(error => {
            console.error('Error:', error);
            if (statusMsg) {
                statusMsg.innerText = "❌ Upload Failed. Please try again.";
                statusMsg.style.color = "red";
            }
        });
    });
}

// attach to window so inline onclick can call it
window.uploadFile = uploadFile;
