let audioCtx = null;
let analyser = null;
let currentOscillator = null;
let dataArray = null;

const canvas = document.getElementById("visualizer");
const canvasCtx = canvas.getContext("2d");

const freqSlider = document.getElementById("freqSlider");
const freqDisplay = document.getElementById("freqDisplay");
const waveTypeSelect = document.getElementById("waveType");

function lockCanvasDimensions() {
    const container = canvas.parentNode;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

window.addEventListener('resize', lockCanvasDimensions);

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048; 
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        lockCanvasDimensions();
    }
}

// 1. Microphone Input Logic
document.getElementById("micBtn").addEventListener("click", async () => {
    initAudio();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(stream);
        
        source.connect(analyser);
        lockCanvasDimensions();
        drawVisualizer();
        document.getElementById("micBtn").innerText = "🎤 Mic Active";
    } catch (err) {
        alert("Microphone activation failed. Check settings.");
    }
});

// 2. Synthesizer Tone Generation Logic
document.getElementById("toneBtn").addEventListener("click", async () => {
    initAudio();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    if (currentOscillator) {
        currentOscillator.stop();
        currentOscillator = null;
        document.getElementById("toneBtn").innerText = "🔊 Play Synthesizer";
        return;
    }

    const osc = audioCtx.createOscillator();
    
    // Read the settings currently set in our new UI panels
    osc.type = waveTypeSelect.value; 
    osc.frequency.setValueAtTime(parseFloat(freqSlider.value), audioCtx.currentTime); 

    osc.connect(analyser);
    analyser.connect(audioCtx.destination); 

    osc.start();
    currentOscillator = osc;
    document.getElementById("toneBtn").innerText = "⏹️ Stop Synth";
    
    lockCanvasDimensions();
    drawVisualizer();
});

// 3. Live Parameter Event Listeners
// Dynamically adjusts pitch without restarting the oscillator node
freqSlider.addEventListener("input", (e) => {
    const val = e.target.value;
    freqDisplay.innerText = `${val} Hz`;
    
    if (currentOscillator) {
        // Smoothly changes the hardware oscillator pitch live
        currentOscillator.frequency.setValueAtTime(parseFloat(val), audioCtx.currentTime);
    }
});

// Dynamically changes wave shape configurations on the fly
waveTypeSelect.addEventListener("change", (e) => {
    if (currentOscillator) {
        currentOscillator.type = e.target.value;
    }
});

// 4. Render Engine Loop
function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);

    if (!dataArray) return;
    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "#1a1a1a";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 3;
    canvasCtx.strokeStyle = "#00ffcc";
    canvasCtx.beginPath();

    const sliceWidth = canvas.width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0; 
        const y = (v * canvas.height) / 2;

        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
}
