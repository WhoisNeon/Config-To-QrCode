// DOM Elements
const input = document.getElementById("input");
const canvas = document.getElementById("qr-canvas");
const ctx = canvas.getContext("2d");
const charCounter = document.getElementById("char-counter");
const configCounter = document.getElementById("config-counter");

// Buttons
const pasteBtn = document.getElementById("paste-btn");
const clearBtn = document.getElementById("clear-btn");
const generateBtn = document.getElementById("generate-btn");
const downloadBtn = document.getElementById("download-btn");
const downloadZipBtn = document.getElementById("download-zip-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const qrCounter = document.getElementById("qr-counter");
const copyBtn = document.getElementById("copy-btn");

// Constants
const maxQRLength = 1273;
const STORAGE_KEY = "qr_generator_data";
const PERSIAN_CHAR_REGEX = /[\u0600-\u06FF\uFB8A\u067E\u0686\u06AF\u200C\u200F]/g;

// State
let qrChunks = [];
let currentQRIndex = -1000;

// ==============================================
// Utility Functions
// ==============================================

// Remove Persian characters from text and whole lines containing Persian text
function removePersianText(text) {
  return text
    .split('\n')
    .filter(line => !PERSIAN_CHAR_REGEX.test(line))
    .join('\n');
}

// Remove empty lines from top
function cleanInputText(text) {
  let lines = text.split('\n');
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }
  return lines.join('\n');
}

// ==============================================
// Core Functions
// ==============================================

// Load saved data from localStorage
function loadSavedData() {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      const {
        inputValue,
        qrChunks: savedChunks,
        currentIndex,
      } = JSON.parse(savedData);
      input.value = inputValue;
      qrChunks = savedChunks || [];
      currentQRIndex = currentIndex || 0;
      if (qrChunks.length > 0) {
        updateQRDisplay();
      }
      updateCounters();
    } catch (e) {
      console.error("Failed to parse saved data", e);
    }
  } else {
    updateCounters();
  }
}

// Save data to localStorage
function saveData() {
  const data = {
    inputValue: input.value,
    qrChunks,
    currentIndex: currentQRIndex,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Update character, config counters
function updateCounters() {
  const text = input.value;
  const chars = text.length;

  const configLines = text.split("\n");
  const validConfigs = configLines.filter(
    line => line.startsWith("vless://") ||
           line.startsWith("vmess://") ||
           line.startsWith("hysteria2://") ||
           line.startsWith("ss://") ||
           line.startsWith("trojan://")
  );

  const configs = validConfigs.length;

  // Update counters
  charCounter.textContent = `${chars} char${chars > 1 ? "s" : ""}`;
  configCounter.textContent = `${configs} config${configs > 1 ? "s" : ""}`;
}

// Split configs into chunks
function splitConfigsIntoChunks(configs, maxLength) {
  const result = [];
  let current = "";

  for (const config of configs) {
    if ((current + "\n" + config).length > maxLength) {
      if (current) result.push(current.trim());
      current = config;
    } else {
      current += (current ? "\n" : "") + config;
    }
  }
  if (current) result.push(current.trim());
  return result;
}

// Generate QR code with background
async function generateQRCodeWithBackground(text, index) {
  try {
    const bgImage = new Image();
    bgImage.src = `images/background.png`;

    // Always load and show numbers, even for single page
    const currentPageImage = new Image();
    currentPageImage.src = `images/numbers/${index + 1}.png`;

    const totalPagesImage = new Image();
    totalPagesImage.src = `images/numbers/${qrChunks.length}.png`;

    await Promise.all([
      bgImage.decode(),
      currentPageImage.decode(),
      totalPagesImage.decode(),
    ]);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    const numberScale = 1;
    const numberWidth = 264 * numberScale;
    const numberHeight = 512 * numberScale;
    const slashWidth = 350;
    const totalWidth = numberWidth * 2 + slashWidth;

    const startX = (canvas.width - totalWidth) / 2;
    const numberY = canvas.height - numberHeight - 96;

    // Draw current page number (left side)
    ctx.drawImage(
      currentPageImage,
      0,
      0,
      264,
      512,
      startX,
      numberY,
      numberWidth,
      numberHeight
    );

    // Draw total pages number (right side)
    ctx.drawImage(
      totalPagesImage,
      0,
      0,
      264,
      512,
      startX + numberWidth + slashWidth,
      numberY,
      numberWidth,
      numberHeight
    );

    // Draw QR code
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, text, {
      margin: 0,
      width: 2600,
      errorCorrectionLevel: "H",
    });

    const qrPos = (canvas.width - 2600) / 2;
    ctx.drawImage(qrCanvas, qrPos, qrPos);
  } catch (error) {
    console.error("Error generating QR code:", error);
  }
}

// Update QR display
function updateQRDisplay() {
  if (!qrChunks.length) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    qrCounter.textContent = "";
    return;
  }
  const text = qrChunks[currentQRIndex];
  generateQRCodeWithBackground(text, currentQRIndex);
  qrCounter.textContent = `${currentQRIndex + 1} of ${qrChunks.length}`;
  saveData();
}

// ==============================================
// Event Handlers
// ==============================================

// Handle input with Persian text removal
function handleInput() {
  const cursorPos = input.selectionStart;
  let cleanedText = removePersianText(input.value);
  cleanedText = cleanInputText(cleanedText);
  
  if (cleanedText !== input.value) {
    input.value = cleanedText;
    const newCursorPos = Math.min(cursorPos, cleanedText.length);
    input.setSelectionRange(newCursorPos, newCursorPos);
  }
  
  saveData();
  updateCounters();
}

// Handle paste event with Persian text removal
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    let cleanedText = removePersianText(text);
    cleanedText = cleanInputText(cleanedText);
    input.value += (input.value ? "\n" : "") + cleanedText;
    saveData();
    updateCounters();
  } catch (err) {
    console.error("Failed to read clipboard:", err);
    alert("Failed to read from clipboard. Please make sure you've granted clipboard permissions.");
  }
}

// ==============================================
// Event Listeners
// ==============================================

generateBtn.addEventListener("click", () => {
  const raw = input.value.trim();
  const lines = raw
    .split("\n")
    .filter(
      (line) =>
        line.startsWith("vless://") ||
        line.startsWith("vmess://") ||
        line.startsWith("hysteria2://") ||
        line.startsWith("ss://") ||
        line.startsWith("trojan://")
    );
  if (!lines.length) {
    notificationSystem.show("No configs found.", "error", 3000);
    return;
  }
  qrChunks = splitConfigsIntoChunks(lines, maxQRLength);
  currentQRIndex = 0;
  updateQRDisplay();
  updateCounters();
});

copyBtn.addEventListener("click", () => {
  if (!qrChunks.length)
    return notificationSystem.show("No QR code to copy.", "warning", 3000);
  canvas.toBlob((blob) => {
    const item = new ClipboardItem({ "image/png": blob });
    navigator.clipboard
      .write([item])
      .then(() => {
        notificationSystem.show(
          "QR code copied to clipboard!",
          "success",
          2000
        );
      })
      .catch((err) => {
        console.error("Failed to copy QR code:", err);
        notificationSystem.show(
          "Failed to copy QR code. Please try again.",
          "error",
          3000
        );
      });
  });
});

prevBtn.addEventListener("click", () => {
  currentQRIndex = (currentQRIndex - 1 + qrChunks.length) % qrChunks.length;
  updateQRDisplay();
});

nextBtn.addEventListener("click", () => {
  currentQRIndex = (currentQRIndex + 1) % qrChunks.length;
  updateQRDisplay();
});

clearBtn.addEventListener("click", () => {
  input.value = "";
  qrChunks = [];
  currentQRIndex = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  qrCounter.textContent = "";
  saveData();
  updateCounters();
});

pasteBtn.addEventListener("click", handlePaste);

downloadBtn.addEventListener("click", () => {
  if (!qrChunks.length)
    return notificationSystem.show("No QR code to download.", "warning", 3000);
  const link = document.createElement("a");
  link.download = `qrcode-${currentQRIndex + 1}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

downloadZipBtn.addEventListener("click", async () => {
  if (!qrChunks.length)
    return notificationSystem.show("No QR codes to download.", "warning", 3000);

  try {
    const zip = new JSZip();
    const zipName = "qrcodes.zip";

    downloadZipBtn.disabled = true;
    downloadZipBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Creating ZIP...
    `;

    for (let i = 0; i < qrChunks.length; i++) {
      await generateQRCodeWithBackground(qrChunks[i], i);
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1];
      zip.file(`qrcode-${i + 1}.png`, base64, { base64: true });
    }

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = zipName;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Error creating ZIP file:", error);
    notificationSystem.show(
      "Error creating ZIP file. Please check console for details.",
      "error",
      5000
    );
  } finally {
    downloadZipBtn.disabled = false;
    downloadZipBtn.innerHTML = `
      Zip
      <i class="ph-fill ph-file-archive ml-1"></i>
    `;
  }
});

// Initialize
input.addEventListener("input", function() {
  const cursorPos = input.selectionStart;
  const cleanedText = removePersianText(input.value);
  
  if (cleanedText !== input.value) {
    input.value = cleanedText;
    const newCursorPos = Math.min(cursorPos, cleanedText.length);
    input.setSelectionRange(newCursorPos, newCursorPos);
  }
  
  saveData();
  updateCounters();
});

loadSavedData();
