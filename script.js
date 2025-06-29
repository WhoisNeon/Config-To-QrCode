// DOM Elements
const input = document.getElementById("input");
const urlInput = document.getElementById("url-input");
const canvas = document.getElementById("qr-canvas");
const ctx = canvas.getContext("2d");
const charCounter = document.getElementById("char-counter");
const configCounter = document.getElementById("config-counter");
const infoDisplay = document.getElementById("info-display");

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
const configTab = document.getElementById("config-tab");
const urlTab = document.getElementById("url-tab");

// Constants
const maxQRLength = 1273;
const STORAGE_KEY = "qr_generator_data";
const PERSIAN_CHAR_REGEX = /[\u0600-\u06FF\uFB8A\u067E\u0686\u06AF\u200C\u200F]/g;

// State
let qrChunks = [];
let currentQRIndex = 0;

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
        urlValue,
        activeTab,
        qrChunks: savedChunks,
        currentIndex,
      } = JSON.parse(savedData);
      
      input.value = inputValue || "";
      urlInput.value = urlValue || "";
      
      if (activeTab === "url") {
        urlTab.click();
      } else {
        configTab.click();
      }
      
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
    urlValue: urlInput.value,
    activeTab: configTab.classList.contains("active") ? "config" : "url",
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
    charCounter.textContent = `${chars} character${chars > 1 ? "s" : ""}`;
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
    bgImage.src = urlTab.classList.contains("active") ? "images/urlbackground.png" : "images/background.png";

    // Only show numbers for config mode
    let currentPageImage, totalPagesImage;
    if (!urlTab.classList.contains("active")) {
      currentPageImage = new Image();
      currentPageImage.src = `images/numbers/${index + 1}.png`;

      totalPagesImage = new Image();
      totalPagesImage.src = `images/numbers/${qrChunks.length}.png`;
    }

    await Promise.all([
      bgImage.decode(),
      ...(urlTab.classList.contains("active") ? [] : [
        currentPageImage.decode(),
        totalPagesImage.decode()
      ])
    ]);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    if (!urlTab.classList.contains("active")) {
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
    }

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

// Toggle UI elements based on active tab
function toggleUIElements() {
  const isUrlMode = urlTab.classList.contains("active");
  
  // Toggle info display
  infoDisplay.style.display = isUrlMode ? "none" : "flex";

  // Toggle ZIP download button
  downloadZipBtn.style.display = isUrlMode ? "none" : "flex";
  input.style.display = isUrlMode ? "none" : "block";
  urlInput.style.display = isUrlMode ? "block" : "none";
  
  // Toggle navigation buttons (only show for config mode with multiple QR codes)
  const showNavButtons = !isUrlMode && qrChunks.length > 1;
  prevBtn.style.display = showNavButtons ? "flex" : "none";
  nextBtn.style.display = showNavButtons ? "flex" : "none";
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
    if (urlTab.classList.contains("active")) {
      urlInput.value = text;
    } else {
      let cleanedText = removePersianText(text);
      cleanedText = cleanInputText(cleanedText);
      input.value += (input.value ? "\n" : "") + cleanedText;
    }
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

// Tab switching
configTab.addEventListener("click", () => {
  if (urlTab.classList.contains("active")) {
    localStorage.setItem("urlTabState", JSON.stringify({
      urlValue: urlInput.value,
      qrChunks: qrChunks,
      currentIndex: currentQRIndex
    }));
  }

  configTab.classList.add("active");
  urlTab.classList.remove("active");
  
  const configTabState = localStorage.getItem("configTabState");
  if (configTabState) {
    try {
      const { inputValue, qrChunks: savedChunks, currentIndex } = JSON.parse(configTabState);
      input.value = inputValue || "";
      qrChunks = savedChunks || [];
      currentQRIndex = currentIndex || 0;
    } catch (e) {
      console.error("Failed to parse config tab state", e);
    }
  } else {
    qrChunks = [];
    currentQRIndex = 0;
  }

  updateQRDisplay(); // This will call saveData()
  updateCounters();
  toggleUIElements();
});

urlTab.addEventListener("click", () => {
  if (configTab.classList.contains("active")) {
    localStorage.setItem("configTabState", JSON.stringify({
      inputValue: input.value,
      qrChunks: qrChunks,
      currentIndex: currentQRIndex
    }));
  }

  urlTab.classList.add("active");
  configTab.classList.remove("active");
  
  const urlTabState = localStorage.getItem("urlTabState");
  if (urlTabState) {
    try {
      const { urlValue, qrChunks: savedChunks, currentIndex } = JSON.parse(urlTabState);
      urlInput.value = urlValue || "";
      qrChunks = savedChunks || [];
      currentQRIndex = currentIndex || 0;
    } catch (e) {
      console.error("Failed to parse URL tab state", e);
    }
  } else {
    qrChunks = [];
    currentQRIndex = 0;
  }

  updateQRDisplay(); // This will call saveData()
  updateCounters();
  toggleUIElements();
});

generateBtn.addEventListener("click", () => {
  if (urlTab.classList.contains("active")) {
    // Handle URL generation
    const url = urlInput.value.trim();
    if (!url) {
      notificationSystem.show("Please enter a URL.", "error", 3000);
      return;
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      notificationSystem.show("Please enter a valid URL.", "error", 3000);
      return;
    }
    
    // Limit to 1 URL
    qrChunks = [url];
    currentQRIndex = 0;
    updateQRDisplay();
    updateCounters();
    toggleUIElements();
  } else {
    // Existing config generation logic
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
    toggleUIElements();
  }
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
  if (urlTab.classList.contains("active")) {
    urlInput.value = "";
  } else {
    input.value = "";
  }
  qrChunks = [];
  currentQRIndex = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  qrCounter.textContent = "";
  saveData();
  updateCounters();
  toggleUIElements();
});

pasteBtn.addEventListener("click", handlePaste);

downloadBtn.addEventListener("click", () => {
  if (!qrChunks.length)
    return notificationSystem.show("No QR code to download.", "warning", 3000);
  const link = document.createElement("a");
  link.download = urlTab.classList.contains("active") 
    ? "url-qrcode.png" 
    : `qrcode-${currentQRIndex + 1}.png`;
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
      Creating... <i class="spinner ml-1 animate-spin"></i>
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
    console.error("Error creating zip file:", error);
    notificationSystem.show(
      "Error creating zip file. Please check console for details.",
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

urlInput.addEventListener("input", function() {
  saveData();
  updateCounters();
});

loadSavedData();
toggleUIElements(); // Initialize UI elements visibility
