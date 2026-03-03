// --- DOM Elements ---
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('status');
const chatBox = document.getElementById('chatBox');
const fileUploadSection = document.getElementById('fileUploadSection');
const codeFileInput = document.getElementById('codeFileInput');
const sendFileBtn = document.getElementById('sendFileBtn');
const githubUrlInput = document.getElementById('githubUrl');
const fetchGithubBtn = document.getElementById('fetchGithubBtn');
const codeViewerSection = document.getElementById('codeViewerSection');
const codeDisplay = document.getElementById('codeDisplay');
const scorecard = document.getElementById('scorecard');
const scorecardContent = document.getElementById('scorecardContent');

// --- New DOM Elements for Avatar & Layout ---
const aiAvatarContainer = document.getElementById('aiAvatarContainer');
const aiStatusText = document.getElementById('aiStatusText');
const sidebar = document.getElementById('sidebar');
const toolbarCenter = document.querySelector('.toolbar-center');

// --- State Variables ---
let ws;
let micStream;
let audioCtx;
let inputCtx;
let processor;
let nextPlayTime = 0;
let sharedCodeContext = "";

function logToChat(message) {
    chatBox.innerHTML += `> ${message}<br>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 💡 Edit here: The resetUI function no longer hides the rating!
function resetUI() {
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    if (processor) processor.disconnect();
    if (inputCtx && inputCtx.state !== 'closed') inputCtx.close();
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();

    startBtn.disabled = false;
    stopBtn.disabled = true;

    toolbarCenter.style.display = "none";
    codeViewerSection.style.display = "none";
    codeDisplay.textContent = "";
    codeFileInput.value = "";
    githubUrlInput.value = "";

    // Return the Avatar and zero its status
    aiAvatarContainer.style.display = "flex";
    aiAvatarContainer.classList.remove('speaking');
    aiStatusText.innerText = "Call ended ❌. Start new call?";
    aiStatusText.style.color = "#aaa";

    //Note: We did not hide the Sidebar and Scorecard so you can read the review

}

startBtn.onclick = async () => {
    try {
        aiStatusText.innerText = "Requesting microphone permission...";
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        nextPlayTime = audioCtx.currentTime;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        ws = new WebSocket(wsProtocol + window.location.host + '/ws');
        
        ws.onopen = () => {
            aiStatusText.innerText = "Connected! Tech Lead is listening 🎤";
            aiStatusText.style.color = "#00ffcc";

            startBtn.disabled = true;
            stopBtn.disabled = false;
            toolbarCenter.style.display = "flex";
            sidebar.style.display = "flex";
            
            // 💡 Hide the old rating only when you start a new call
            scorecard.style.display = "none"; 
            sharedCodeContext = "No code shared. General technical discussion.";

            logToChat("Connected! Start speaking or optionally share code.");
            startMicCapture();
        };

        ws.onmessage = async (event) => {
            try {
                let data = event.data;
                if (data instanceof Blob) data = await data.text();
                const response = JSON.parse(data);

                if (response.serverContent && response.serverContent.modelTurn) {
                    const parts = response.serverContent.modelTurn.parts;
                    for (let part of parts) {
                        if (part.text) logToChat("Agent: " + part.text);
                        if (part.inlineData && part.inlineData.data) playPCMAudio(part.inlineData.data);
                    }
                }
            } catch (e) { console.error("Error parsing message:", e); }
        };

        ws.onclose = () => resetUI();

    } catch (err) {
        console.error('Error:', err);
        resetUI();
    }
};

stopBtn.onclick = async () => {
    logToChat("🛑 Ending session...");

    // 💡 Show the evaluation screen immediately and prepare it before the call hangs up
    sidebar.style.display = "flex";
    scorecard.style.display = "block";

    if (sharedCodeContext === "No code shared. General technical discussion." || sharedCodeContext.trim() === "") {
        scorecardContent.innerHTML = `<span style="color: #aaa; font-style: italic;">No code was shared during this session. Only general technical discussion took place.</span>`;
    } else {
        scorecardContent.innerHTML = "<i>Analyzing architecture and code quality... Please wait.</i>";
        try {
            const response = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code_context: sharedCodeContext })
            });
            const data = await response.json();
            scorecardContent.innerHTML = `<pre style="white-space: pre-wrap; color: #fff; background: transparent; border: none; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${data.evaluation}</pre>`;
        } catch (error) {
            scorecardContent.innerText = "Error generating scorecard.";
        }
    }

    // Close the connection after we have prepared the evaluation screen
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Interview ended by user");
    } else {
        resetUI();
    }
};

fetchGithubBtn.onclick = async () => {
    const url = githubUrlInput.value;
    if (!url.includes("github.com")) return alert("Please enter a valid GitHub file URL");
    logToChat("🐙 Fetching code from GitHub...");
    try {
        const response = await fetch('/api/github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });
        const data = await response.json();
        if (data.code) shareCodeWithAgent("GitHub File", data.code);
        else alert("Failed to fetch code. Check the URL.");
    } catch (e) { console.error(e); }
};

sendFileBtn.onclick = () => {
    const file = codeFileInput.files[0];
    if (!file) return alert("Select a file!");
    const reader = new FileReader();
    reader.onload = (e) => shareCodeWithAgent(file.name, e.target.result);
    reader.readAsText(file);
};

function shareCodeWithAgent(sourceName, codeContent) {
    codeDisplay.textContent = codeContent;
    codeViewerSection.style.display = "block";
    aiAvatarContainer.style.display = "none";
    sharedCodeContext = codeContent;

    const msg = {
        clientContent: {
            turns: [{
                role: "user",
                parts: [{ text: `[System Note: The candidate shared a file (${sourceName}):]\n\n${codeContent}\n\n[End of file. Please review it audibly.]` }]
            }],
            turnComplete: true
        }
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
        logToChat(`✅ Code shared successfully from ${sourceName}.`);
    }
}

function startMicCapture() {
    inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const source = inputCtx.createMediaStreamSource(micStream);
    processor = inputCtx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: window.btoa(binary) }] } }));
    };
    const gainNode = inputCtx.createGain();
    gainNode.gain.value = 0;
    source.connect(processor);
    processor.connect(gainNode);
    gainNode.connect(inputCtx.destination);
}

async function playPCMAudio(base64) {
    if (!audioCtx) return;
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 32768.0;

    const buffer = audioCtx.createBuffer(1, float32Array.length, 24000);
    buffer.getChannelData(0).set(float32Array);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);

    aiAvatarContainer.classList.add('speaking');

    if (nextPlayTime < audioCtx.currentTime) nextPlayTime = audioCtx.currentTime;
    source.start(nextPlayTime);
    nextPlayTime += buffer.duration;

    setTimeout(() => {
        if (nextPlayTime <= audioCtx.currentTime + 0.1) {
            aiAvatarContainer.classList.remove('speaking');
        }
    }, (nextPlayTime - audioCtx.currentTime) * 1000 + 100);
}