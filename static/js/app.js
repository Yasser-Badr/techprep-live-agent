// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('status');
const chatBox = document.getElementById('chatBox');
const fileUploadSection = document.getElementById('fileUploadSection');
const codeFileInput = document.getElementById('codeFileInput');
const sendFileBtn = document.getElementById('sendFileBtn');

// State Variables
let ws;
let micStream;
let audioCtx;
let inputCtx;
let processor;
let nextPlayTime = 0;

// Helper: Log messages to the terminal UI
function logToChat(message) {
    chatBox.innerHTML += `> ${message}<br>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Event: Start the interview
startBtn.onclick = async () => {
    try {
        statusText.innerText = "Status: Requesting mic permission...";
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        nextPlayTime = audioCtx.currentTime;

        ws = new WebSocket('ws://' + window.location.host + '/ws');

        ws.onopen = () => {
            statusText.innerText = "Status: Connected & Listening 🎤";
            statusText.style.color = "#4CAF50";
            startBtn.disabled = true;
            stopBtn.disabled = false;
            fileUploadSection.style.display = "block";
            
            logToChat("Connected to Tech Lead! You can start speaking or upload a code file.");
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
            } catch (e) { 
                console.error("Error parsing message:", e); 
            }
        };

        ws.onclose = () => {
            resetUI();
        };

    } catch (err) {
        console.error('Error:', err);
        alert("Please allow Microphone permission.");
        resetUI();
    }
};

// Event: Stop the interview safely (Graceful Shutdown)
stopBtn.onclick = () => {
    logToChat("🛑 Terminating session safely...");
    
    //Closing the WebSocket with code 1000 (normal closure)
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Interview ended by user");
    }
    
    resetUI();
};

// Event: Send code file content to the Agent
sendFileBtn.onclick = () => {
    const file = codeFileInput.files[0];
    if (!file) {
        alert("Please select a file first!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const codeContent = e.target.result;
        logToChat(`📄 Sending file "${file.name}" to Agent...`);

        const msg = {
            clientContent: {
                turns: [{
                    role: "user",
                    parts: [{ text: `[System Note: The candidate has shared a file named '${file.name}'. Here is the code:]\n\n${codeContent}\n\n[End of file. Please review it and give your feedback audibly.]` }]
                }],
                turnComplete: true
            }
        };
        
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
            logToChat(`✅ File sent successfully. Waiting for Agent's review...`);
        }
    };
    reader.readAsText(file);
};

// Core logic: Capture Mic and send to WebSocket
function startMicCapture() {
    inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const source = inputCtx.createMediaStreamSource(micStream);
    processor = inputCtx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
        }
        
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        
        ws.send(JSON.stringify({
            realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: window.btoa(binary) }] }
        }));
    };

    const gainNode = inputCtx.createGain();
    gainNode.gain.value = 0;
    source.connect(processor);
    processor.connect(gainNode);
    gainNode.connect(inputCtx.destination);
}

// Core logic: Play raw PCM audio from the Agent
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

    if (nextPlayTime < audioCtx.currentTime) nextPlayTime = audioCtx.currentTime;
    source.start(nextPlayTime);
    nextPlayTime += buffer.duration;
}

// Helper: Unified Graceful Shutdown UI Reset
function resetUI() {
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
    }
    if (processor) {
        processor.disconnect();
    }
    if (inputCtx && inputCtx.state !== 'closed') {
        inputCtx.close();
    }
    if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close();
    }

    startBtn.disabled = false;
    stopBtn.disabled = true;
    fileUploadSection.style.display = "none";
    statusText.innerText = "Status: Disconnected ❌";
    statusText.style.color = "#aaa";
}