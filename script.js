"use strict";

const thought = document.querySelector("#thought");
const counter = document.querySelector("#counter");
const paper = document.querySelector("#paper");
const paperShell = document.querySelector("#paper-shell");
const effects = document.querySelector("#effect-layer");
const bin = document.querySelector("#bin");
const actions = document.querySelector("#actions");
const actionButtons = [...document.querySelectorAll("[data-action]")];
const hint = document.querySelector("#action-hint");
const ending = document.querySelector("#ending");
const restart = document.querySelector("#restart");
const status = document.querySelector("#status");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const workspace = document.querySelector("#workspace");
const expandButton = document.querySelector("#expand-button");
const expandLabel = document.querySelector("#expand-label");
const voicePanel = document.querySelector("#voice-panel");
const recordButton = document.querySelector("#record-button");
const recordLabel = document.querySelector("#record-label");
const recordHint = document.querySelector("#record-hint");
const recordingReview = document.querySelector("#recording-review");
const recordingAudio = document.querySelector("#recording-audio");
const deleteRecordingButton = document.querySelector("#delete-recording");
const comfortText = document.querySelector("#comfort-text");
const speakButton = document.querySelector("#speak-button");
const nextComfortButton = document.querySelector("#next-comfort");
const speechHint = document.querySelector("#speech-hint");

const comforts = [
  "你不需要立刻振作，慢一点也没有关系。",
  "今天已经很不容易了，允许自己休息一会儿吧。",
  "你的感受值得被认真对待，不必急着否定它。",
  "就算现在有些乱，也可以先照顾好眼前的自己。",
  "不是每个问题都要在今天找到答案。",
  "你可以难过，也可以在难过的时候照顾自己。",
  "先深呼吸一次，剩下的事情可以慢慢来。",
  "暂时停下来，不代表你没有向前走。",
  "今天没有做好的事，不会定义你的全部。",
  "如果很累，就先把期待放轻一点。",
  "你不必时刻坚强，柔软也是一种力量。",
  "那些说不出口的心事，也值得有一个安放的地方。",
  "走得慢一点没有关系，你有自己的步调。",
  "先喝口水，放松一下肩膀，照顾此刻的自己。",
  "你可以不完美，也依然值得被温柔对待。",
  "有些事情很难，本来就不必一个人硬撑。",
  "你有权利说累了，也有权利为自己留一点空间。",
  "把今天过完就很好，明天的事可以明天再想。",
  "这一刻的低落是真实的，但它不是你的全部。",
  "哪怕只前进了一小步，也值得给自己一点肯定。",
  "情绪来了，可以先陪它坐一会儿，不用急着赶走。",
  "愿你对自己说话时，也能像对朋友一样温柔。",
  "遇到难处不是你的错，寻求陪伴也不是软弱。",
  "你不必向任何人证明，自己的难过有多充分。",
  "如果今天只能做到一点点，那一点点也有意义。",
  "生活偶尔很吵，你可以先为自己留下一点安静。",
  "放下这张纸以后，记得也给自己一个小小的拥抱。",
  "你可以重新开始，也可以只是先安静地待一会儿。",
  "请记得，你的价值不取决于某一次结果。",
  "想哭的时候哭一会儿，也是一种诚实的表达。",
  "你不需要马上原谅谁，先照顾自己的感受就好。",
  "允许今天不那么顺利，也允许自己重新调整。",
  "即使现在看不清方向，也可以先走好眼前的一步。",
  "你已经撑过了许多时刻，现在可以稍微松一口气。",
  "有些委屈需要时间，不必催促自己立刻释怀。",
  "你值得休息，也值得向信任的人说说心里话。"
];
let state = "writing";
let lastComfort = -1;
let recordingState = "idle";
let recordingUrl = null;
let captureSession = null;
let nativeFullscreenActive = false;

function updateInput() {
  const hasText = thought.value.trim().length > 0;
  const hasRecording = Boolean(recordingUrl);
  const busy = ["requesting", "recording", "processing"].includes(recordingState);
  counter.textContent = `${thought.value.length} / ${thought.maxLength}`;
  actionButtons.forEach((button) => { button.disabled = state !== "writing" || busy || (!hasText && !hasRecording); });
  if (busy) hint.textContent = "请先结束录音，再选择如何放下";
  else if (hasText || hasRecording) hint.textContent = "选一种方式，让纸张和录音一起离开";
  else hint.textContent = "先写点什么，或者录下你的声音 ↑";
}

function setExpanded(expanded) {
  workspace.classList.toggle("is-expanded", expanded);
  expandLabel.textContent = expanded ? "退出全屏" : "放大到全屏";
  expandButton.setAttribute("aria-pressed", String(expanded));
}

expandButton.addEventListener("click", async () => {
  if (workspace.classList.contains("is-expanded")) {
    if (document.fullscreenElement === workspace) {
      try { await document.exitFullscreen(); } catch { /* The expanded layout can still be closed. */ }
    }
    nativeFullscreenActive = false;
    setExpanded(false);
    return;
  }
  setExpanded(true);
  if (workspace.requestFullscreen) {
    try { await workspace.requestFullscreen(); nativeFullscreenActive = true; }
    catch { /* Fall back to an expanded, browser-window-sized view. */ }
  }
});

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement === workspace) nativeFullscreenActive = true;
  else if (nativeFullscreenActive) { nativeFullscreenActive = false; setExpanded(false); }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && workspace.classList.contains("is-expanded") && !document.fullscreenElement) setExpanded(false);
});

function updateRecordingUI(message) {
  const messages = {
    idle: "录音只在当前页面，最多 2 分钟，不转成文字。",
    requesting: "正在等待麦克风权限…",
    recording: "正在录音，点击停止。最长 2 分钟。",
    processing: "正在准备回放…",
    ready: "录音只在当前页面，可回听或删除。"
  };
  recordLabel.textContent = recordingState === "recording" ? "停止录音" : recordingState === "ready" ? "已录好" : "开始录音";
  recordButton.disabled = ["requesting", "processing", "ready"].includes(recordingState);
  recordButton.classList.toggle("is-recording", recordingState === "recording");
  recordButton.setAttribute("aria-pressed", String(recordingState === "recording"));
  recordingReview.hidden = recordingState !== "ready";
  recordHint.textContent = message || messages[recordingState];
  updateInput();
}

function stopTracks(session) {
  if (session && session.stream) session.stream.getTracks().forEach((track) => track.stop());
  if (session && session.timer) window.clearTimeout(session.timer);
}

function stopRecording() {
  const session = captureSession;
  if (!session || recordingState !== "recording") return;
  recordingState = "processing";
  updateRecordingUI();
  if (session.recorder.state !== "inactive") session.recorder.stop();
  stopTracks(session);
}

function clearRecording() {
  recordingAudio.pause();
  recordingAudio.removeAttribute("src");
  recordingAudio.load();
  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  recordingUrl = null;
  if (recordingState === "ready") recordingState = "idle";
  updateRecordingUI();
}

async function startRecording() {
  if (state !== "writing" || recordingState !== "idle") return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    updateRecordingUI("当前浏览器不支持录音，请使用新版 Chrome 或 Edge。");
    return;
  }
  recordingState = "requesting";
  updateRecordingUI();
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (recordingState !== "requesting" || state !== "writing") {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    const recorder = new MediaRecorder(stream);
    const session = { recorder, stream, chunks: [], timer: null, discard: false, error: false };
    captureSession = session;
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) session.chunks.push(event.data);
    });
    recorder.addEventListener("error", () => {
      session.error = true;
      session.discard = true;
      stopTracks(session);
      if (recorder.state !== "inactive") recorder.stop();
    });
    recorder.addEventListener("stop", () => {
      stopTracks(session);
      if (captureSession !== session) return;
      captureSession = null;
      if (session.discard || state !== "writing") {
        session.chunks.length = 0;
        recordingState = "idle";
        updateRecordingUI(session.error ? "录音未能完成，请再试一次。" : undefined);
        return;
      }
      const blob = new Blob(session.chunks, { type: recorder.mimeType || "audio/webm" });
      session.chunks.length = 0;
      if (!blob.size) {
        recordingState = "idle";
        updateRecordingUI("没有录到声音，请再试一次。");
        return;
      }
      recordingUrl = URL.createObjectURL(blob);
      recordingAudio.src = recordingUrl;
      recordingState = "ready";
      updateRecordingUI();
    });
    recorder.start();
    recordingState = "recording";
    session.timer = window.setTimeout(stopRecording, 120000);
    updateRecordingUI();
  } catch (error) {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    captureSession = null;
    recordingState = "idle";
    const denied = error && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
    updateRecordingUI(denied ? "没有麦克风权限，请在浏览器设置中允许后重试。" : "无法使用麦克风，请检查设备和浏览器权限。");
  }
}

recordButton.addEventListener("click", () => {
  if (recordingState === "recording") stopRecording();
  else startRecording();
});
deleteRecordingButton.addEventListener("click", () => { clearRecording(); recordButton.focus(); });
window.addEventListener("pagehide", () => {
  recordingState = "idle";
  if (captureSession) {
    captureSession.discard = true;
    if (captureSession.recorder.state !== "inactive") captureSession.recorder.stop();
    stopTracks(captureSession);
  }
  clearRecording();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
});

function pickComfort() {
  let index = Math.floor(Math.random() * (lastComfort < 0 ? comforts.length : comforts.length - 1));
  if (lastComfort >= 0 && index >= lastComfort) index += 1;
  lastComfort = index;
  comfortText.textContent = comforts[index];
}

function localChineseVoice() {
  if (!("speechSynthesis" in window)) return null;
  return window.speechSynthesis.getVoices().find((voice) => voice.localService === true && /^zh(?:$|[-_])/i.test(voice.lang)) || null;
}

function speakComfort() {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    speechHint.textContent = "当前浏览器不支持本地朗读，文字仍可查看。";
    return;
  }
  const voice = localChineseVoice();
  if (!voice) {
    speechHint.textContent = "没有找到本机中文朗读声音，可在系统设置中安装后重试。";
    return;
  }
  const utterance = new SpeechSynthesisUtterance(comfortText.textContent);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.92;
  utterance.onerror = (event) => {
    if (event.error !== "interrupted" && event.error !== "canceled") speechHint.textContent = "未能播放本地语音，请点击“听一听”重试。";
  };
  speechHint.textContent = "使用设备上的中文声音朗读，不上传文字。";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

speakButton.addEventListener("click", speakComfort);
nextComfortButton.addEventListener("click", () => { pickComfort(); speakComfort(); });

// Text is inserted as textContent, never as HTML, and remains in this page only.
function makeSnapshot(width, height, text) {
  const snapshot = document.createElement("div");
  snapshot.className = "paper-snapshot";
  snapshot.style.setProperty("--paper-width", `${width}px`);
  snapshot.style.setProperty("--paper-height", `${height}px`);

  const heading = document.createElement("div");
  heading.className = "paper-heading";
  const headingLabel = document.createElement("span");
  headingLabel.textContent = "DEAR ME,";
  const headingStar = document.createElement("span");
  headingStar.textContent = "✷";
  heading.append(headingLabel, headingStar);
  const message = document.createElement("div");
  message.className = "snapshot-text";
  message.textContent = text;
  snapshot.append(heading, message);
  return snapshot;
}

function animateTear(width, height, text) {
  for (const side of ["left", "right"]) {
    const half = document.createElement("div");
    half.className = `tear-half tear-${side}`;
    half.append(makeSnapshot(width, height, text));
    effects.append(half);
  }
  return 2000;
}

function animateShred(width, height, text) {
  const rows = 5;
  const columns = 5;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const piece = document.createElement("div");
      const x = width * column / columns;
      const y = height * row / rows;
      piece.className = "fragment";
      piece.style.left = `${x}px`;
      piece.style.top = `${y}px`;
      piece.style.width = `${width / columns + 0.5}px`;
      piece.style.height = `${height / rows + 0.5}px`;
      piece.style.setProperty("--offset-x", `${-x}px`);
      piece.style.setProperty("--offset-y", `${-y}px`);
      piece.style.setProperty("--move-x", `${(column - 2) * 55 + (row % 2 ? 18 : -18)}px`);
      piece.style.setProperty("--move-y", `${95 + row * 30 + column * 8}px`);
      piece.style.setProperty("--rotate", `${(column - 2) * 22 + row * 7}deg`);
      piece.style.setProperty("--delay", `${(row + column) * 30}ms`);
      piece.append(makeSnapshot(width, height, text));
      effects.append(piece);
    }
  }
  return 2100;
}

function animateCrumple(width, height, text) {
  const sceneBox = document.querySelector(".scene").getBoundingClientRect();
  const shellBox = paperShell.getBoundingClientRect();
  bin.style.top = `${Math.max(0, shellBox.bottom - sceneBox.top - 65)}px`;
  bin.style.bottom = "auto";
  bin.classList.add("is-visible");
  const sheet = document.createElement("div");
  sheet.className = "crumple-sheet";
  sheet.append(makeSnapshot(width, height, text));
  const ball = document.createElement("div");
  ball.className = "paper-ball";
  const paperBox = paperShell.getBoundingClientRect();
  const binBox = bin.getBoundingClientRect();
  const throwX = binBox.left + binBox.width / 2 - (paperBox.left + paperBox.width / 2);
  const throwY = binBox.top + 6 - (paperBox.top + paperBox.height / 2);
  ball.style.setProperty("--throw-x", `${throwX}px`);
  ball.style.setProperty("--throw-y", `${throwY}px`);
  ball.style.setProperty("--half-x", `${throwX / 2}px`);
  ball.style.setProperty("--half-y", `${throwY / 2}px`);
  effects.append(sheet, ball);
  return 2500;
}

function release(action) {
  if (state !== "writing" || (!thought.value.trim() && !recordingUrl) || ["requesting", "recording", "processing"].includes(recordingState)) return;
  state = "animating";
  expandButton.disabled = true;
  updateInput();
  const text = thought.value + (recordingUrl ? "\n\n♫ 一段只留在此刻的声音" : "");
  // The recording is discarded immediately, together with the chosen action.
  clearRecording();
  voicePanel.hidden = true;
  const width = paperShell.clientWidth;
  const height = paperShell.clientHeight;
  const descriptions = { tear: "纸张正在从中间撕开。", shred: "纸张正在粉碎。", crumple: "纸张正在揉成一团，扔进垃圾桶。" };
  status.textContent = descriptions[action];

  let duration;
  if (action === "tear") duration = animateTear(width, height, text);
  else if (action === "shred") duration = animateShred(width, height, text);
  else duration = animateCrumple(width, height, text);
  paper.classList.add("is-gone");
  paper.setAttribute("aria-hidden", "true");

  window.setTimeout(() => {
    // Remove both the original text and the animation copies after the action.
    thought.value = "";
    effects.replaceChildren();
    bin.classList.remove("is-visible");
    actions.hidden = true;
    ending.hidden = false;
    state = "released";
    expandButton.disabled = false;
    pickComfort();
    status.textContent = "纸张已经放下。你可以再写一张。";
    restart.focus();
    speakComfort();
  }, reducedMotion.matches ? 50 : duration);
}

thought.addEventListener("input", updateInput);
actionButtons.forEach((button) => button.addEventListener("click", () => release(button.dataset.action)));
restart.addEventListener("click", () => {
  if (state !== "released") return;
  state = "writing";
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  ending.hidden = true;
  actions.hidden = false;
  voicePanel.hidden = false;
  paper.classList.remove("is-gone");
  paper.removeAttribute("aria-hidden");
  status.textContent = "新的一张纸已经准备好。";
  updateInput();
  thought.focus();
});
updateInput();
updateRecordingUI();
if (window.speechSynthesis) window.speechSynthesis.getVoices();
