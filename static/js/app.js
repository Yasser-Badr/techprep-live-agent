
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

// --- Avatar & Controls ---
const aiAvatarContainer = document.getElementById('aiAvatarContainer');
const aiAvatarIcon = document.getElementById('aiAvatarIcon');
const aiStatusText = document.getElementById('aiStatusText');
const sidebar = document.getElementById('sidebar');
const toolbarCenter = document.querySelector('.toolbar-center');
const waveform = document.getElementById('waveform');
const pauseMicBtn = document.getElementById('pauseMicBtn');
const muteAiBtn = document.getElementById('muteAiBtn');
// --- history ---
const historyBtn = document.getElementById('historyBtn');
const historyModal = document.getElementById('historyModal');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('historyList');

const personaSelect = document.getElementById('personaSelect');
const jobDescInput = document.getElementById('jobDescInput');
const jobDescPanel = document.getElementById('jobDescPanel'); 

// Show and hide the JD panel based on selection
personaSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom-job') {
        jobDescPanel.style.display = 'block'; 
    } else {
        jobDescPanel.style.display = 'none';
    }
});

// --- State Variables ---
let ws;
let micStream;
let audioCtx;
let inputCtx;
let processor;
let nextPlayTime = 0;
let sharedCodeContext = "";
let isMicPaused = false;
let isAiMuted = false;
let avatarAnimationTimeout;

function logToChat(message) {
    chatBox.innerHTML += `> ${message}<br>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

function resetUI() {
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    if (processor) processor.disconnect();
    if (inputCtx && inputCtx.state !== 'closed') inputCtx.close();
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();

    startBtn.disabled = false;
    stopBtn.disabled = true;
    pauseMicBtn.disabled = true;
    muteAiBtn.disabled = true;

    // Reset buttons state
    isMicPaused = false;
    isAiMuted = false;
    pauseMicBtn.innerText = "⏸️ Pause Mic";
    pauseMicBtn.style.borderColor = "";
    pauseMicBtn.style.color = "white";
    muteAiBtn.innerText = "🔇 Mute AI";
    muteAiBtn.style.borderColor = "";
    muteAiBtn.style.color = "white";

    toolbarCenter.style.display = "none";
    codeViewerSection.style.display = "none";
    codeDisplay.textContent = "";
    codeFileInput.value = "";
    githubUrlInput.value = "";

    // Reset Avatar
    aiAvatarContainer.style.display = "flex";
    aiAvatarContainer.classList.remove('speaking');
    aiAvatarIcon.classList.remove('speaking-animation');
    waveform.classList.remove('active');
    clearTimeout(avatarAnimationTimeout);

    aiStatusText.innerText = "Call ended ❌. Start new call?";
    aiStatusText.style.color = "#aaa";
}

startBtn.onclick = async () => {
    const selectedPersona = personaSelect.value;

    //  Forced entry of job description
    if (selectedPersona === 'custom-job') {
        const jdText = jobDescInput.value.trim();
        if (jdText === "") {
            // If the box is empty, we will receive an alert and direct the mouse to the box
            alert("⚠️ Please paste the exact Job Description first so the TechPrep can tailor the interview!");
            jobDescInput.focus(); 
            return; // The return stops the function and does not allow the microphone to open or the server to start
        }
    }

    try {
        aiStatusText.innerText = "Requesting microphone permission...";
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        nextPlayTime = audioCtx.currentTime;

        const selectedPersona = document.getElementById('personaSelect').value;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        ws = new WebSocket(wsProtocol + window.location.host + '/ws?persona=' + selectedPersona);

        ws.onopen = () => {
            aiStatusText.innerText = "Connected! Tech Lead is listening 🎤";
            aiStatusText.style.color = "#00ffcc";

            startBtn.disabled = true;
            stopBtn.disabled = false;

            pauseMicBtn.disabled = false;
            muteAiBtn.disabled = false;
            
            if (selectedPersona === 'custom-job'){
                toolbarCenter.style.display = "none"; 
            } else {
                toolbarCenter.style.display = "flex";
            }
            sidebar.style.display = "flex";

            scorecard.style.display = "none";
            sharedCodeContext = "No code shared. General technical discussion.";

            logToChat("Connected! Start speaking or optionally share code.");
             //  Injection Logic for Custom Job Description
            if (selectedPersona === 'custom-job') {
                const jdText = jobDescInput.value.trim();
                if (jdText !== "") {
                    const msg = {
                        clientContent: {
                            turns: [{
                                role: "user",
                                parts: [{ text: `[System Note: I am applying for a job. You are the Hiring Manager. Here is the exact Job Description:\n\n${jdText}\n\nPlease start the interview immediately by welcoming me and asking the first question based on these specific requirements.]` }]
                            }],
                            turnComplete: true
                        }
                    };
                    ws.send(JSON.stringify(msg));
                    logToChat("📄 Custom Job Description injected successfully!");
                    //  Hide the panel after starting the call so we can enjoy the screen
                    jobDescPanel.style.display = 'none';
                } else {
                    logToChat("⚠️ Warning: No job description provided. AI will ask general questions.");
                }
            }

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
    sidebar.style.display = "flex";
    scorecard.style.display = "block";

    if (sharedCodeContext === "No code shared. General technical discussion." || sharedCodeContext.trim() === "") {
        scorecardContent.innerHTML = `<span style="color: #aaa; font-style: italic;">No code was shared. Only general technical discussion took place.</span>`;
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

        //   حفظ النتيجة في الهيستوري بعد نجاح التقييم
        const selectedPersonaName = document.getElementById('personaSelect').options[document.getElementById('personaSelect').selectedIndex].text;
        saveScorecardToHistory(selectedPersonaName, data.evaluation);

    } catch (error) {
        scorecardContent.innerText = "Error generating scorecard.";
    }
}

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Interview ended by user");
    } else {
        resetUI();
    }
};

// --- Mute & Pause Controls ---
pauseMicBtn.onclick = () => {
    isMicPaused = !isMicPaused;
    if (micStream && micStream.getAudioTracks().length > 0) {
        micStream.getAudioTracks()[0].enabled = !isMicPaused;
    }
    pauseMicBtn.innerText = isMicPaused ? "▶️ Resume Mic" : "⏸️ Pause Mic";
    pauseMicBtn.style.borderColor = isMicPaused ? "#ffaa00" : "#0037ff";
    pauseMicBtn.style.color = isMicPaused ? "#ffaa00" : "#4c00ff";
};

muteAiBtn.onclick = () => {
    isAiMuted = !isAiMuted;
    if (audioCtx) {
        if (isAiMuted) {
            audioCtx.suspend();
        } else {
            audioCtx.resume();
        }
    }
    muteAiBtn.innerText = isAiMuted ? "🔊 Unmute AI" : "🔇 Mute AI";
    muteAiBtn.style.borderColor = isAiMuted ? "#ffaa00" : "#0037ff";
    muteAiBtn.style.color = isAiMuted ? "#ffaa00" : "#0c10ff";
};

fetchGithubBtn.onclick = async () => {
    const url = githubUrlInput.value;
    if (!url.includes("github.com")) return alert("Please enter a valid GitHub file URL");
    logToChat("Fetching code from GitHub...");
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

    // Play animations when the AI ​​speaks
    aiAvatarContainer.classList.add('speaking');
    aiAvatarIcon.classList.add('speaking-animation');
    waveform.classList.add('active');

    if (nextPlayTime < audioCtx.currentTime) nextPlayTime = audioCtx.currentTime;
    source.start(nextPlayTime);
    nextPlayTime += buffer.duration;

    clearTimeout(avatarAnimationTimeout);
    avatarAnimationTimeout = setTimeout(() => {
        if (nextPlayTime <= audioCtx.currentTime + 0.1) {
            aiAvatarContainer.classList.remove('speaking');
            aiAvatarIcon.classList.remove('speaking-animation');
            waveform.classList.remove('active');
        }
    }, (nextPlayTime - audioCtx.currentTime) * 1000 + 100);
}


// Opening and closing the module
historyBtn.onclick = () => {
    renderHistory();
    historyModal.style.display = 'block';
};
closeHistoryBtn.onclick = () => { historyModal.style.display = 'none'; };
window.onclick = (event) => { if (event.target == historyModal) historyModal.style.display = 'none'; };

// Save the evaluation in LocalStorage
function saveScorecardToHistory(personaName, evaluationText) {
    let history = JSON.parse(localStorage.getItem('techprep_history')) || [];
    const newRecord = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        persona: personaName,
        evaluation: evaluationText
    };
    history.unshift(newRecord); // Guest the latest in the first
    localStorage.setItem('techprep_history', JSON.stringify(history));
}

// View ratings (collapsible menu system)
    function renderHistory() {
        let history = JSON.parse(localStorage.getItem('techprep_history')) || [];
        if (history.length === 0) {
            historyList.innerHTML = '<p style="color: #aaa; text-align: center;">No interview history found yet. Start a call!</p>';
            return;
        }
        historyList.innerHTML = history.map(item => `
            <details class="history-item">
                <summary class="history-summary">
                    <span class="history-persona">${item.persona}</span>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="history-date">📅 ${item.date}</span>
                        <span class="toggle-icon">▼</span>
                    </div>
                </summary>
                <div class="history-text">${item.evaluation}</div>
            </details>
        `).join('');
    }

    const runCodeBtn = document.getElementById('runCodeBtn');

runCodeBtn.onclick = async () => {
    
    const codeToRun = sharedCodeContext; 
    
    if (!codeToRun || codeToRun.trim() === "" || codeToRun.includes("No code shared")) {
        alert("Please fetch or upload Go code first!");
        return;
    }

    logToChat("⚙️ Running code in isolated sandbox...");
    
    try {
        const response = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: codeToRun })
        });
        
        const data = await response.json();
        const executionOutput = data.output;
        
        logToChat(`🖥️ Output: ${executionOutput}`);

        // Send the result to the AI ​​so that it can discuss it with you via audio!
        const msg = {
            clientContent: {
                turns: [{
                    role: "user",
                    parts: [{ text: `[System Note: The user just executed the code. Here is the actual terminal output:\n\n${executionOutput}\n\nPlease review this output audibly. Tell the user what happened, and if there is an error, guide them on how to fix it.]` }]
                }],
                turnComplete: true
            }
        };

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
        }

    } catch (e) {
        logToChat("❌ Sandbox Execution Failed.");
    }
};