// ==============================
// DOM要素
// ==============================

const audioFile = document.getElementById("audioFile");
const audioPlayer = document.getElementById("audioPlayer");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");
const trackName = document.getElementById("trackName");
const volumeControl = document.getElementById("volumeControl");
const speedControl = document.getElementById("speedControl");
const muteButton = document.getElementById("muteButton");
const visualizerStyle = document.getElementById("visualizerStyle");
// モード切り替え
const visualizerMode = document.getElementById("visualizerMode");

const normalSections = [
    document.querySelector(".visualizer-section"),
    document.querySelector(".visualizer-controls"),
    document.querySelector(".color-settings"),
    document.querySelector(".player-section")
];

const fnfSection = document.getElementById("fnfSection");

visualizerMode.addEventListener("change", () => {
    const isFnfMode = visualizerMode.value === "fnf";

    // 通常モードの画面切り替え
    normalSections.forEach(section => {
        if (section) {
            section.hidden = isFnfMode;
        }
    });

    // FNFモードの画面切り替え
        fnfSection.hidden = !isFnfMode;
        if (isFnfMode) {
        requestAnimationFrame(() => {
            resizeFnfCanvas(instCanvas);
            resizeFnfCanvas(opponentCanvas);
            resizeFnfCanvas(playerCanvas);
        });
    }
});
// FNF音源設定
const instFile = document.getElementById("instFile");
const opponentFile = document.getElementById("opponentFile");
const playerFile = document.getElementById("playerFile");

const instName = document.getElementById("instName");
const opponentName = document.getElementById("opponentName");
const playerName = document.getElementById("playerName");

// FNF音源データ
const fnfAudio = {
    inst: new Audio(),
    opponent: new Audio(),
    player: new Audio()
};

// 音源URL管理
const fnfAudioURLs = {
    inst: null,
    opponent: null,
    player: null
};

// 音源読み込み
function loadFnfAudio(file, type) {
    if (!file) return;

    if (fnfAudioURLs[type]) {
        URL.revokeObjectURL(fnfAudioURLs[type]);
    }

    const url = URL.createObjectURL(file);

    fnfAudioURLs[type] = url;
    fnfAudio[type].src = url;
    fnfAudio[type].load();

    if (type === "inst") {
        instName.textContent = file.name;
    }

    if (type === "opponent") {
        opponentName.textContent = file.name;
    }

    if (type === "player") {
        playerName.textContent = file.name;
    }
}

// ファイル選択イベント
instFile.addEventListener("change", () => {
    loadFnfAudio(instFile.files[0], "inst");
});

opponentFile.addEventListener("change", () => {
    loadFnfAudio(opponentFile.files[0], "opponent");
});

playerFile.addEventListener("change", () => {
    loadFnfAudio(playerFile.files[0], "player");
});
// FNF再生コントロール
const fnfPlayButton = document.getElementById("fnfPlayButton");
const fnfPauseButton = document.getElementById("fnfPauseButton");
const fnfStopButton = document.getElementById("fnfStopButton");

// 3つの音源をまとめて取得
const fnfAudioList = [
    fnfAudio.inst,
    fnfAudio.opponent,
    fnfAudio.player
];

// 音源の読み込み完了を待つ
function waitForAudioReady(audio) {
    if (audio.readyState >= 3) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        audio.addEventListener("canplay", resolve, { once: true });
        audio.addEventListener("error", reject, { once: true });
    });
}

// PLAY
fnfPlayButton.addEventListener("click", async () => {

    // 3つすべて読み込まれているか確認
    if (fnfAudioList.some(audio => !audio.src)) {
        alert("INST・OPPONENT・PLAYERの3つの音源を読み込んでください。");
        return;
    }

    try {
        // Analyserを初期化
        setupFnfAnalyser("inst");
        setupFnfAnalyser("opponent");
        setupFnfAnalyser("player");

        // AudioContextをユーザー操作中に再開
        const resumePromise = fnfAudioContext.resume();

        // 音源の準備を待つ
        await Promise.all([
            ...fnfAudioList.map(waitForAudioReady),
            resumePromise
        ]);

        // 終了済みの音源を先頭に戻す
        fnfAudioList.forEach(audio => {
            if (audio.ended) {
                audio.currentTime = 0;
            }
        });

        // 3つを同時に再生
        await Promise.all(
            fnfAudioList.map(audio => audio.play())
        );

    } catch (error) {
        console.error("FNF再生エラー:", error);
        alert("音源の再生に失敗しました。ファイルを確認してください。");
    }

});

// PAUSE
fnfPauseButton.addEventListener("click", () => {
    fnfAudioList.forEach(audio => {
        audio.pause();
    });
});

// STOP
fnfStopButton.addEventListener("click", () => {
    fnfAudioList.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
    });
});
// FNFタイムライン
const fnfSeekBar = document.getElementById("fnfSeekBar");
const fnfCurrentTime = document.getElementById("fnfCurrentTime");
const fnfDuration = document.getElementById("fnfDuration");

let fnfIsSeeking = false;

// 秒数を「分:秒」に変換
function formatFnfTime(seconds) {
    if (!Number.isFinite(seconds)) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

// 3つの音源の共通再生時間を取得
function getFnfDuration() {
    if (fnfAudioList.some(audio => !Number.isFinite(audio.duration))) {
        return 0;
    }

    return Math.min(...fnfAudioList.map(audio => audio.duration));
}

// タイムラインを更新
function updateFnfTimeline() {
    const duration = getFnfDuration();

    fnfSeekBar.max = duration;
    fnfDuration.textContent = formatFnfTime(duration);

    const currentTime = fnfAudio.inst.currentTime || 0;

    if (!fnfIsSeeking) {
        fnfSeekBar.value = Math.min(currentTime, duration);
        fnfCurrentTime.textContent = formatFnfTime(currentTime);
    }
}

// 音源の読み込み完了時
fnfAudioList.forEach(audio => {
    audio.addEventListener("loadedmetadata", updateFnfTimeline);
    audio.addEventListener("timeupdate", updateFnfTimeline);
});

// タイムバーを操作
fnfSeekBar.addEventListener("input", () => {
    fnfIsSeeking = true;

    const time = Number(fnfSeekBar.value);

    fnfCurrentTime.textContent = formatFnfTime(time);

    fnfAudioList.forEach(audio => {
        if (Number.isFinite(audio.duration)) {
            audio.currentTime = Math.min(time, audio.duration);
        }
    });
});

fnfSeekBar.addEventListener("change", () => {
    fnfIsSeeking = false;
    updateFnfTimeline();
});
// カラー設定
const colorInputs = document.getElementById("colorInputs");
const gradientCountInput = document.getElementById("gradientCount");
const gradientPreview = document.getElementById("gradientPreview");

let gradientColors = [
    "#0066ff",
    "#00bfff",
    "#8a2be2",
    "#ff1493",
    "#ff0033"
];

// HEXカラーをRGBに変換
function hexToRgb(hex) {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}

// RGBをHEXカラーに変換
function rgbToHex(r, g, b) {
    return "#" + [r, g, b]
        .map(value => value.toString(16).padStart(2, "0"))
        .join("");
}

// 2色の間を補間
function interpolateColor(color1, color2, ratio) {
    const a = hexToRgb(color1);
    const b = hexToRgb(color2);

    const r = Math.round(a.r + (b.r - a.r) * ratio);
    const g = Math.round(a.g + (b.g - a.g) * ratio);
    const blue = Math.round(a.b + (b.b - a.b) * ratio);

    return rgbToHex(r, g, blue);
}

// グラデーション上の色を取得
function getColorAtPosition(position, colors) {
    const scaled = position * (colors.length - 1);
    const index = Math.floor(scaled);
    const ratio = scaled - index;

    if (index >= colors.length - 1) {
        return colors[colors.length - 1];
    }

    return interpolateColor(
        colors[index],
        colors[index + 1],
        ratio
    );
}

// カラー選択欄を生成
function createColorInputs() {
    colorInputs.innerHTML = "";

    const count = gradientColors.length;

    gradientColors.forEach((color, index) => {
        const label = document.createElement("label");
        label.className = "color-option";

        const span = document.createElement("span");

        if (index === 0) {
            span.textContent = "1本目（低音）";
        } else if (index === count - 1) {
            span.textContent = "100本目（高音）";
        } else {
            const position = Math.round(
                index * 99 / (count - 1)
            ) + 1;

            span.textContent = `${position}本目`;
        }

        const input = document.createElement("input");
        input.type = "color";
        input.value = color;

        input.addEventListener("input", () => {
            gradientColors[index] = input.value;
            updateGradientPreview();
        });

        label.appendChild(span);
        label.appendChild(input);

        colorInputs.appendChild(label);
    });
}

// グラデーションプレビューを更新
function updateGradientPreview() {
    const stops = gradientColors.map((color, index) => {
        const position = index / (gradientColors.length - 1) * 100;
        return `${color} ${position}%`;
    });

    gradientPreview.style.background =
        `linear-gradient(to right, ${stops.join(", ")})`;
}

// 色数変更
gradientCountInput.addEventListener("change", () => {
    const oldColors = [...gradientColors];
    const newCount = Number(gradientCountInput.value);

    gradientColors = [];

    for (let i = 0; i < newCount; i++) {
        const position = i / (newCount - 1);

        gradientColors.push(
            getColorAtPosition(position, oldColors)
        );
    }

    createColorInputs();
    updateGradientPreview();
});

// 初期設定
createColorInputs();
updateGradientPreview();

let currentVisualizerStyle = "bar";

visualizerStyle.addEventListener("change", () => {
    currentVisualizerStyle = visualizerStyle.value;
});

// ==============================
// Audio API
// ==============================

let audioContext;
let analyser;
let source;
let frequencyData;
let timeDomainData;

// ==============================
// 音声ファイル読み込み
// ==============================

let currentAudioURL = null;

function loadAudioFile(file) {
    if (!file) return;

    if (currentAudioURL) {
        URL.revokeObjectURL(currentAudioURL);
    }

    currentAudioURL = URL.createObjectURL(file);
    audioPlayer.src = currentAudioURL;
    trackName.textContent = file.name;
    audioPlayer.load();
}

// 通常のファイル選択
audioFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    loadAudioFile(file);
});

// ドラッグ＆ドロップ
const dropArea = document.querySelector(".visualizer-section");

let dragCounter = 0;

dropArea.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragCounter++;
    dropArea.classList.add("drag-over");
});

dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
});

dropArea.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dragCounter--;

    if (dragCounter <= 0) {
        dragCounter = 0;
        dropArea.classList.remove("drag-over");
    }
});

dropArea.addEventListener("drop", (event) => {
    event.preventDefault();

    dragCounter = 0;
    dropArea.classList.remove("drag-over");

    const file = event.dataTransfer.files[0];

    if (file) {
        loadAudioFile(file);
    }
});

// ==============================
// 音声解析の初期化
// ==============================

function initializeAudio() {

    if (audioContext) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    analyser = audioContext.createAnalyser();

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    frequencyData = new Uint8Array(analyser.frequencyBinCount);

    source = audioContext.createMediaElementSource(audioPlayer);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

}

// ==============================
// 再生時の処理
// ==============================

audioPlayer.addEventListener("play", async () => {

    initializeAudio();

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

});

// ==============================
// 周波数データ取得
// ==============================

function getFrequencyData() {

    if (!analyser) return;

    analyser.getByteFrequencyData(frequencyData);

}

// ==============================
// Canvasサイズ調整
// ==============================

function resizeCanvas() {

    const rect = canvas.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();

// ==============================
// ビジュアライザー描画
// ==============================

// ビジュアライザー描画
function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    if (!analyser) return;

    getFrequencyData();

    // 波形データを取得
    if (!timeDomainData) {
        timeDomainData = new Uint8Array(analyser.fftSize);
    }

    analyser.getByteTimeDomainData(timeDomainData);

    switch (currentVisualizerStyle) {
        case "bar":
            drawBar(width, height);
            break;

        case "wave":
            drawWave(width, height);
            break;

        case "circular":
            drawCircular(width, height);
            break;

        case "mirror":
            drawMirror(width, height);
            break;
    }
}

// 色の計算
function getVisualizerColor(index, total) {
    if (gradientColors.length === 0) {
        return "#00aaff";
    }

    // バーの位置を0～1に変換
    const position = total > 1
        ? index / (total - 1)
        : 0;

    // 指定した色の間を滑らかに補間
    return getColorAtPosition(position, gradientColors);
}

// Bar：通常の縦型バー
function drawBar(width, height) {
    const barCount = 100;
    const gap = 3;
    const barWidth = (width / barCount) - gap;

    for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * frequencyData.length / barCount);
        const value = frequencyData[dataIndex];

        const barHeight = (value / 255) * height * 0.85;
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        const color = getVisualizerColor(i, barCount);

        ctx.fillStyle = color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;

        ctx.fillRect(x, y, barWidth, barHeight);
    }

    ctx.shadowBlur = 0;
}

// Wave：音声波形
function drawWave(width, height) {
    const centerY = height / 2;

    ctx.beginPath();

    for (let i = 0; i < timeDomainData.length; i++) {
        const x = (i / (timeDomainData.length - 1)) * width;
        const value = timeDomainData[i] / 128;
        const y = value * centerY;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#0088ff");
    gradient.addColorStop(0.5, "#00ffff");
    gradient.addColorStop(1, "#ff0088");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#00aaff";

    ctx.stroke();
    ctx.shadowBlur = 0;
}

// Circular：円形スペクトラム
function drawCircular(width, height) {
    const centerX = width / 2;
    const centerY = height / 2;

    const radius = Math.min(width, height) * 0.2;
    const barCount = 100;

    for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * frequencyData.length / barCount);
        const value = frequencyData[dataIndex];

        const angle = (i / barCount) * Math.PI * 2;
        const barHeight = (value / 255) * radius * 1.2;

        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;

        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        const color = getVisualizerColor(i, barCount);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        ctx.stroke();
    }

    ctx.shadowBlur = 0;
}

// Mirror：上下対称バー
function drawMirror(width, height) {
    const barCount = 100;
    const gap = 3;
    const barWidth = (width / barCount) - gap;
    const centerY = height / 2;

    for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * frequencyData.length / barCount);
        const value = frequencyData[dataIndex];

        const barHeight = (value / 255) * centerY * 0.85;
        const x = i * (barWidth + gap);

        const color = getVisualizerColor(i, barCount);

        ctx.fillStyle = color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;

        ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
        ctx.fillRect(x, centerY, barWidth, barHeight);
    }

    ctx.shadowBlur = 0;
}

drawVisualizer();
// ==============================
// 音量調整
// ==============================

volumeControl.addEventListener("input", () => {

    audioPlayer.volume = Number(volumeControl.value);

});


// ==============================
// 再生速度
// ==============================

speedControl.addEventListener("change", () => {

    audioPlayer.playbackRate = Number(speedControl.value);

});


// ==============================
// ミュート
// ==============================

muteButton.addEventListener("click", () => {

    audioPlayer.muted = !audioPlayer.muted;

    muteButton.textContent = audioPlayer.muted
        ? "UNMUTE"
        : "MUTE";

});
// ==============================
// FNF AUDIO ANALYSER
// ==============================

// Canvas取得
const instCanvas = document.getElementById("instCanvas");
const opponentCanvas = document.getElementById("opponentCanvas");
const playerCanvas = document.getElementById("playerCanvas");

// Canvas Context
const instCtx = instCanvas.getContext("2d");
const opponentCtx = opponentCanvas.getContext("2d");
const playerCtx = playerCanvas.getContext("2d");

// AudioAnalyser管理
const fnfAnalysers = {
    inst: null,
    opponent: null,
    player: null
};

// 音声Source管理
const fnfSources = {
    inst: null,
    opponent: null,
    player: null
};

// ==============================
// FNF COLOR SETTINGS
// ==============================

const fnfDefaultColors = {
    inst: ["#0066ff", "#00bfff", "#ffffff"],
    opponent: ["#ff0033", "#ff4d6d", "#ffffff"],
    player: ["#00cc66", "#00e676", "#ffffff"]
};

// 保存済みカラーを読み込む
const savedFnfColors = localStorage.getItem("fnfGradientColors");

const fnfGradientColors = savedFnfColors
    ? JSON.parse(savedFnfColors)
    : structuredClone(fnfDefaultColors);
// ==============================
// FNF COLOR SETTINGS UI
// ==============================

const fnfColorSettings = document.getElementById("fnfColorSettings");

const fnfColorLabels = {
    inst: "INST",
    opponent: "OPPONENT",
    player: "PLAYER"
};

Object.keys(fnfGradientColors).forEach(type => {

    const panel = document.createElement("div");
    panel.className = "fnf-color-item";

    panel.innerHTML = `
        <h4>${fnfColorLabels[type]}</h4>

        ${fnfGradientColors[type].map((color, index) => `
            <label>
                Color ${index + 1}
                <input
                    type="color"
                    data-type="${type}"
                    data-index="${index}"
                    value="${color}"
                >
            </label>
        `).join("")}
    `;

    fnfColorSettings.appendChild(panel);
});
// ==============================
// FNF COLOR CHANGE EVENT
// ==============================

fnfColorSettings.addEventListener("input", (event) => {

    if (event.target.type !== "color") return;

    const type = event.target.dataset.type;
    const index = Number(event.target.dataset.index);

    fnfGradientColors[type][index] = event.target.value;

        localStorage.setItem(
        "fnfGradientColors",
        JSON.stringify(fnfGradientColors)
    );
});
// ==============================
// FNF COLOR RESET
// ==============================

document.getElementById("fnfColorReset").addEventListener("click", () => {

    // 初期カラーに戻す
    Object.keys(fnfDefaultColors).forEach(type => {
        fnfGradientColors[type] = [...fnfDefaultColors[type]];
    });

    // 保存データを更新
    localStorage.setItem(
        "fnfGradientColors",
        JSON.stringify(fnfGradientColors)
    );

    // カラー選択欄を更新
    document.querySelectorAll("#fnfColorSettings input[type='color']").forEach(input => {

        const type = input.dataset.type;
        const index = Number(input.dataset.index);

        input.value = fnfGradientColors[type][index];

    });

});
// ==============================
// FNF ANALYSER INITIALIZATION
// ==============================

// FNF専用AudioContext
let fnfAudioContext = null;

function setupFnfAnalyser(type) {

    // AudioContextがなければ作成
    if (!fnfAudioContext) {
        fnfAudioContext = new (
            window.AudioContext ||
            window.webkitAudioContext
        )();
    }

    // 既に接続済みなら何もしない
    if (fnfSources[type]) return;

    const audio = fnfAudio[type];

    // 音声Sourceを作成
    const source =
        fnfAudioContext.createMediaElementSource(audio);

    // Analyserを作成
    const analyser =
        fnfAudioContext.createAnalyser();

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    // 接続
    source.connect(analyser);
    analyser.connect(fnfAudioContext.destination);

    // 保存
    fnfSources[type] = source;
    fnfAnalysers[type] = analyser;
}
// ==============================
// FNF VISUALIZER DRAWING
// ==============================

function resizeFnfCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawFnfWaveform(type, canvas, ctx) {
    const analyser = fnfAnalysers[type];

    if (!analyser) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    ctx.clearRect(0, 0, width, height);

    // バーの設定
    const barCount = 100;
    const gap = 3;
    const barWidth = (width / barCount) - gap;

    // 音源ごとのグラデーション
    const colors = fnfGradientColors[type];

    // タワー型バーの描画
    for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(
            i * data.length / barCount
        );

        // 音声データを増幅
        const value = data[dataIndex];
        const amplifiedValue = Math.min(value * 2.5, 255);

        // バーの高さ
        const barHeight = (amplifiedValue / 255) * height * 0.95;

        const x = i * (barWidth + gap);
        const y = height - barHeight;

        const color = getColorAtPosition(
            i / (barCount - 1),
            colors
        );

        ctx.fillStyle = color;
        ctx.shadowBlur = 3;
        ctx.shadowColor = color;

        ctx.fillRect(x, y, barWidth, barHeight);
        }

    ctx.shadowBlur = 0;
}
// ==============================
// FNF VISUALIZER ANIMATION
// ==============================

function animateFnfVisualizers() {

    drawFnfWaveform("inst", instCanvas, instCtx);

    drawFnfWaveform("opponent", opponentCanvas, opponentCtx);

    drawFnfWaveform("player", playerCanvas, playerCtx);

    requestAnimationFrame(animateFnfVisualizers);
}

// アニメーション開始
animateFnfVisualizers();
