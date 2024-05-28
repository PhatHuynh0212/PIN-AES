let originalPin = "";

document.addEventListener("DOMContentLoaded", function () {
    const atmCard = document.getElementById("atm-card");

    atmCard.addEventListener("click", function () {
        atmCard.classList.add("inserted");
        setTimeout(() => {
            document.getElementById("atm-container").style.display = "none";
            document.getElementById("main-content").classList.remove("hidden");
            // Load the rest of the application content after card insertion
            loadContent("pin-entry.html");
        }, 1000); // Wait for the card insert animation to finish before loading the next content
    });

    startSessionTimeout();
});

function generateDynamicKey() {
    const currentTimestamp = new Date().getTime().toString();
    return CryptoJS.SHA256(currentTimestamp)
        .toString(CryptoJS.enc.Hex)
        .substring(0, 16); // lấy 16 ký tự đầu
}

let dynamicKey = generateDynamicKey();
console.log("Khóa tự động AES-128: ", dynamicKey);
const bankKey = CryptoJS.enc.Utf8.parse(dynamicKey); // Key used for both encryption and decryption

// Generate 20 random PINs and encrypt them
const encryptedPins = [];
const plainPins = [
    "562712",
    "189746",
    "773455",
    "376890",
    "876816",
    "500047",
    "796123",
    "444852",
    "898621",
    "669447",
    "214883",
    "501472",
    "747329",
    "697914",
    "743003",
    "172037",
    "503986",
    "964266",
    "832879",
    "246066",
]; // Store plain PINs for logging and testing

for (let i = 0; i < 20; i++) {
    const encryptedPin = CryptoJS.AES.encrypt(
        CryptoJS.enc.Utf8.parse(plainPins[i]),
        bankKey,
        {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7,
        }
    ).toString();
    encryptedPins.push(encryptedPin);
}

const encryptedPinHex = [];

function base64ToHex(base64) {
    const raw = atob(base64);
    let result = "";
    for (let i = 0; i < raw.length; i++) {
        const hex = raw.charCodeAt(i).toString(16);
        result += hex.length === 2 ? hex : "0" + hex;
    }
    return result.toUpperCase();
}

for (let i = 0; i < 20; i++) {
    const pinHex = base64ToHex(encryptedPins[i]);
    encryptedPinHex.push(pinHex);
}

console.log("Danh sách mã PIN gốc:", plainPins);
console.log("Danh sách mã PIN đã mã hóa (hex):", encryptedPinHex);
console.log("Danh sách mã PIN đã mã hóa (base64):", encryptedPins);

function loadContent(fileName) {
    return fetch(fileName)
        .then((response) => response.text())
        .then((data) => {
            document.getElementById("dynamic-content").innerHTML = data;
            initializeTab(fileName);
        });
}

function initializeTab(fileName) {
    if (fileName === "pin-entry.html") {
        document
            .getElementById("validate-btn")
            .addEventListener("click", validatePin);
        document
            .getElementById("toggle-pin-btn")
            .addEventListener("click", togglePinVisibility);
    } else if (fileName === "decrypt.html") {
        document
            .getElementById("decrypt-btn")
            .addEventListener("click", decryptPin);
        document
            .getElementById("confirm-btn")
            .addEventListener("click", confirmPin);
    } else if (fileName === "withdraw.html") {
        document
            .getElementById("withdraw-btn")
            .addEventListener("click", withdrawMoney);
    }
}

function togglePinVisibility() {
    const pinInput = document.getElementById("pin");
    const togglePinBtn = document.getElementById("toggle-pin-btn");

    if (pinInput.type === "password") {
        pinInput.type = "text";
        togglePinBtn.textContent = "Hide PIN";
    } else {
        pinInput.type = "password";
        togglePinBtn.textContent = "Show PIN";
    }
}

function showTab(tabId) {
    // Hide all tab content
    document.querySelectorAll(".tab-content").forEach((tabContent) => {
        tabContent.classList.add("hidden");
        tabContent.classList.remove("active");
    });

    // Show the selected tab content
    const selectedTabContent = document.getElementById(tabId);
    if (selectedTabContent) {
        selectedTabContent.classList.remove("hidden");
        selectedTabContent.classList.add("active");
    }

    // Update tab state
    document.querySelectorAll(".list-group-item").forEach((tab) => {
        tab.classList.remove(
            "bg-purple-700",
            "bg-pink-700",
            "bg-red-700",
            "bg-blue-700",
            "bg-green-700"
        );
    });
    const activeTab = document.querySelector(
        `.list-group-item[data-tab="${tabId}"]`
    );
    if (activeTab) {
        if (tabId === "pin-entry") {
            activeTab.classList.add("bg-purple-700");
        } else if (tabId === "decrypt") {
            activeTab.classList.add("bg-pink-700");
        } else if (tabId === "withdraw") {
            activeTab.classList.add("bg-green-700");
        }
    }
}

function validateEncryptedPin(inputPin) {
    const encryptedInputPin = CryptoJS.AES.encrypt(
        CryptoJS.enc.Utf8.parse(inputPin),
        bankKey,
        {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7,
        }
    ).toString();
    return encryptedPins.includes(encryptedInputPin);
}

function validatePin() {
    const pin = document.getElementById("pin").value;
    const errorMessage = document.getElementById("error-message");

    if (!/^\d{6}$/.test(pin)) {
        errorMessage.textContent =
            "Invalid PIN. Please enter a 6-digit number.";
        errorMessage.classList.remove("hidden");
        return;
    } else {
        errorMessage.classList.add("hidden");
    }

    originalPin = pin; // Store the original pin

    // Encrypt the PIN and move to decrypt screen
    const encryptedPinHex = encryptPin(pin);
    document
        .querySelector('.list-group-item[data-tab="decrypt"]')
        .classList.remove("hidden");
    loadContent("decrypt.html").then(() => {
        document.getElementById("encrypted-pin").value = encryptedPinHex;
        showTab("decrypt");
    });
}

function encryptPin(pin) {
    const encrypted = CryptoJS.AES.encrypt(
        CryptoJS.enc.Utf8.parse(pin),
        bankKey,
        {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7,
        }
    );

    return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
}

function decryptPin() {
    const encryptedPinHex = document.getElementById("encrypted-pin").value;

    if (!encryptedPinHex) {
        alert("Decryption failed.");
        return;
    }

    try {
        const decrypted = CryptoJS.AES.decrypt(
            {
                ciphertext: CryptoJS.enc.Hex.parse(encryptedPinHex),
            },
            bankKey,
            {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7,
            }
        );

        const decryptedPin = decrypted.toString(CryptoJS.enc.Utf8);
        document.getElementById(
            "decrypt-result"
        ).innerText = `Decrypted PIN: ${decryptedPin}`;
        document.getElementById("confirm-btn").classList.remove("hidden"); // Show the confirm button
    } catch (e) {
        alert("Decryption failed.");
    }
}

function confirmPin() {
    const decryptedPin = document
        .getElementById("decrypt-result")
        .innerText.replace("Decrypted PIN: ", "");

    // Show loading spinner
    document.getElementById("loading").style.display = "block";

    // Simulate a delay for the server check
    setTimeout(() => {
        // Hide loading spinner
        document.getElementById("loading").style.display = "none";

        if (validateEncryptedPin(decryptedPin)) {
            alert("PIN xác thực thành công!");
            document
                .querySelector('.list-group-item[data-tab="withdraw"]')
                .classList.remove("hidden");
            loadContent("withdraw.html").then(() => {
                showTab("withdraw");
            });
        } else {
            alert("PIN không hợp lệ. Vui lòng thử lại.");
            // Hide the decrypt tab from the sidebar
            document
                .querySelector('.list-group-item[data-tab="decrypt"]')
                .classList.add("hidden");
            loadContent("pin-entry.html").then(() => {
                showTab("pin-entry");
            });
        }
    }, 2000); // 2 seconds delay to simulate server response time
}

function withdrawMoney() {
    const amount = document.getElementById("amount").value;
    document.getElementById(
        "withdraw-result"
    ).textContent = `You have successfully withdrawn ${amount} vnd.`;

    // Show the restart button
    const restartBtn = document.getElementById("restart-btn");
    restartBtn.classList.remove("hidden");

    // Add event listener to the restart button
    restartBtn.addEventListener("click", function () {
        resetAtmUI();
    });
}

// Add a function to reset the ATM UI
function resetAtmUI() {
    document.getElementById("atm-container").style.display = "flex";
    document.getElementById("main-content").classList.add("hidden");
    document.getElementById("atm-card").classList.remove("inserted");
    // Reset navigation tabs visibility
    document
        .querySelector('.list-group-item[data-tab="decrypt"]')
        .classList.add("hidden");
    document
        .querySelector('.list-group-item[data-tab="withdraw"]')
        .classList.add("hidden");
    document
        .querySelector('.list-group-item[data-tab="pin-entry"]')
        .classList.remove("hidden");
    // Reset dynamic content
    document.getElementById("dynamic-content").innerHTML = "";
    // Optionally reset form fields and other states here if necessary
    dynamicKey = generateDynamicKey(); // Generate a new dynamic key for the new session
}

function startSessionTimeout() {
    let timeout;

    function resetTimeout() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            alert("Session expired. Please enter your PIN again.");
            loadContent("pin-entry.html").then(() => {
                showTab("pin-entry");
            });
        }, 300000); // 5 minutes timeout
    }

    document.addEventListener("mousemove", resetTimeout);
    document.addEventListener("keypress", resetTimeout);

    resetTimeout();
}
