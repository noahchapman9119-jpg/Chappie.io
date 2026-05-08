import { useEffect, useMemo, useRef, useState } from "react";
import { processAudio } from "./api";

const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024;
const AUDIO_EXTENSIONS = [".aac", ".aiff", ".flac", ".m4a", ".mp3", ".mp4", ".ogg", ".opus", ".wav", ".webm"];

const emptySoap = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

const demoResult = {
  transcript:
    "Clinician: Hi Maya, what brings you in today?\nPatient: I've had a sore throat, mild fever, and congestion for three days. No shortness of breath. I've been drinking fluids and taking acetaminophen.\nClinician: Any medication allergies or significant medical history?\nPatient: No medication allergies. I have seasonal allergies but no asthma.\nClinician: Your temperature is 100.4°F, oxygen saturation is 98%, lungs sound clear, and your throat is red without exudate.\nPatient: I have a work presentation tomorrow and want to know what I should do.\nClinician: This looks most consistent with a viral upper respiratory infection. We'll do supportive care, a rapid strep test if symptoms worsen or persist, and review return precautions.",
  soap_note: {
    subjective:
      "Patient reports three days of sore throat, mild fever, and nasal congestion. Denies shortness of breath. Has been taking acetaminophen and increasing fluids. No medication allergies. History notable for seasonal allergies; denies asthma.",
    objective:
      "Temperature 100.4°F. Oxygen saturation 98% on room air. Lungs clear to auscultation. Oropharynx erythematous without exudate. Patient appears comfortable and in no acute distress.",
    assessment:
      "Acute upper respiratory symptoms, most consistent with viral URI/pharyngitis. Low concern for lower respiratory infection based on clear lung exam and normal oxygen saturation.",
    plan: "Recommend supportive care with hydration, rest, acetaminophen or ibuprofen as needed, saline spray, and warm saltwater gargles. Consider rapid strep testing if throat pain worsens, fever persists, or exudate develops. Return precautions reviewed for shortness of breath, persistent high fever, dehydration, or worsening symptoms.",
  },
  disclaimer:
    "Demo output uses synthetic encounter content only. AI-generated notes require clinician review before use.",
};

const soapSections = [
  {
    key: "subjective",
    eyebrow: "S",
    title: "Subjective",
    description: "Patient-reported symptoms, history, context, and goals.",
  },
  {
    key: "objective",
    eyebrow: "O",
    title: "Objective",
    description: "Observed findings, measurements, vitals, and exam details.",
  },
  {
    key: "assessment",
    eyebrow: "A",
    title: "Assessment",
    description: "Clinical impressions, problem framing, and working diagnoses.",
  },
  {
    key: "plan",
    eyebrow: "P",
    title: "Plan",
    description: "Treatment steps, education, orders, and follow-up guidance.",
  },
];

const terminalLines = [
  "Initializing clinical workflow…",
  "Checking encounter audio…",
  "Structuring transcript…",
  "Generating SOAP note…",
  "Clinician review required.",
];

const loadingSteps = [
  { label: "Uploading audio", detail: "Secure demo transfer in progress", progress: 18 },
  { label: "Transcribing encounter", detail: "Converting speech to structured text", progress: 48 },
  { label: "Generating SOAP", detail: "Drafting clinician-reviewable sections", progress: 78 },
  { label: "Finalizing note", detail: "Preparing copy and export actions", progress: 94 },
];

const menuItems = [
  { label: "Dashboard", note: "Overview" },
  { label: "New Note", note: "Current" },
  { label: "Demo Patient", note: "Synthetic" },
  { label: "History", note: "Placeholder" },
  { label: "Settings", note: "Placeholder" },
  { label: "Compliance / Disclaimer", note: "Review" },
];

const appStyles = `
  :root {
    color-scheme: dark;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #020617;
    color: #eff6ff;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    background:
      radial-gradient(circle at 8% 4%, rgba(20, 184, 166, 0.24), transparent 30rem),
      radial-gradient(circle at 92% 0%, rgba(59, 130, 246, 0.22), transparent 34rem),
      radial-gradient(circle at 50% 110%, rgba(129, 140, 248, 0.18), transparent 30rem),
      linear-gradient(135deg, #020617 0%, #08111f 48%, #030712 100%);
  }

  button, input, textarea { font: inherit; }
  button { cursor: pointer; }
  button:disabled { cursor: not-allowed; opacity: 0.58; }

  button:focus-visible,
  input:focus-visible,
  textarea:focus-visible {
    outline: 3px solid rgba(45, 212, 191, 0.42);
    outline-offset: 3px;
  }

  @keyframes fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fade-in {
    from { opacity: 0; filter: blur(7px); transform: translateY(12px); }
    to { opacity: 1; filter: blur(0); transform: translateY(0); }
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes blink { 50% { opacity: 0; } }
  @keyframes terminal-line {
    from { opacity: 0; transform: translateY(7px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .app-shell {
    min-height: 100vh;
    overflow: hidden;
    padding: clamp(0.85rem, 2vw, 1.4rem);
    position: relative;
  }

  .app-shell::before {
    background: linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 70px 70px;
    content: "";
    inset: 0;
    mask-image: radial-gradient(circle at center, black, transparent 76%);
    pointer-events: none;
    position: absolute;
  }

  .workspace {
    animation: fade-up 0.65s ease-out both;
    display: grid;
    gap: 1rem;
    grid-template-columns: 280px minmax(0, 1fr);
    margin: 0 auto;
    max-width: 1440px;
    position: relative;
    z-index: 1;
  }

  .glass-card,
  .sidebar,
  .hero-card,
  .input-panel,
  .result-card,
  .disclaimer-card,
  .loading-panel {
    backdrop-filter: blur(22px);
    background: linear-gradient(145deg, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.52));
    border: 1px solid rgba(148, 163, 184, 0.2);
    box-shadow: 0 24px 72px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .sidebar {
    align-self: start;
    border-radius: 28px;
    display: grid;
    gap: 1rem;
    padding: 1rem;
    position: sticky;
    top: 1rem;
  }

  .brand {
    align-items: center;
    display: flex;
    gap: 0.72rem;
    padding: 0.35rem;
  }

  .brand-mark {
    align-items: center;
    background: linear-gradient(135deg, #14b8a6, #60a5fa);
    border-radius: 16px;
    color: #03111f;
    display: flex;
    font-weight: 950;
    height: 2.65rem;
    justify-content: center;
    width: 2.65rem;
  }

  .brand strong { display: block; letter-spacing: -0.04em; }
  .brand span { color: #94a3b8; display: block; font-size: 0.8rem; margin-top: 0.12rem; }

  .menu-list { display: grid; gap: 0.35rem; }

  .menu-item {
    align-items: center;
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid transparent;
    border-radius: 16px;
    color: #dbeafe;
    display: flex;
    justify-content: space-between;
    padding: 0.72rem 0.82rem;
    text-decoration: none;
    transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
  }

  .menu-item:hover,
  .menu-item.is-active {
    background: rgba(20, 184, 166, 0.13);
    border-color: rgba(94, 234, 212, 0.26);
    transform: translateX(2px);
  }

  .menu-item small { color: #7dd3fc; font-size: 0.72rem; }

  .sidebar-note {
    background: rgba(2, 6, 23, 0.48);
    border: 1px solid rgba(251, 191, 36, 0.22);
    border-radius: 18px;
    color: #fde68a;
    font-size: 0.84rem;
    line-height: 1.55;
    padding: 0.85rem;
  }

  .main-column { display: grid; gap: 1rem; min-width: 0; }

  .hero-card {
    border-radius: 32px;
    overflow: hidden;
    padding: clamp(1rem, 2.5vw, 2rem);
    position: relative;
  }

  .hero-card::after {
    background: linear-gradient(90deg, rgba(20, 184, 166, 0), rgba(45, 212, 191, 0.55), rgba(96, 165, 250, 0.5), rgba(20, 184, 166, 0));
    content: "";
    height: 1px;
    left: 10%;
    position: absolute;
    right: 10%;
    top: 0;
  }

  .hero-grid {
    display: grid;
    gap: clamp(1rem, 3vw, 2rem);
    grid-template-columns: minmax(0, 1fr) minmax(320px, 0.78fr);
  }

  .status-pill {
    align-items: center;
    background: rgba(20, 184, 166, 0.12);
    border: 1px solid rgba(94, 234, 212, 0.26);
    border-radius: 999px;
    color: #ccfbf1;
    display: inline-flex;
    font-size: 0.78rem;
    font-weight: 850;
    gap: 0.5rem;
    letter-spacing: 0.08em;
    margin-bottom: 1.2rem;
    padding: 0.46rem 0.78rem;
    text-transform: uppercase;
    width: fit-content;
  }

  .status-dot {
    background: #2dd4bf;
    border-radius: 999px;
    box-shadow: 0 0 20px rgba(45, 212, 191, 0.86);
    height: 0.55rem;
    width: 0.55rem;
  }

  h1 {
    font-size: clamp(2.5rem, 5.5vw, 5.8rem);
    letter-spacing: -0.078em;
    line-height: 0.92;
    margin: 0;
  }

  .gradient-text {
    background: linear-gradient(110deg, #ffffff, #ccfbf1 42%, #bfdbfe 82%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .hero-subtitle {
    color: #a9b8cc;
    font-size: clamp(1rem, 1.7vw, 1.16rem);
    line-height: 1.7;
    margin: 1.25rem 0 0;
    max-width: 68ch;
  }

  .trust-row, .export-row, .section-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .trust-row { margin-top: 1.55rem; }

  .trust-chip {
    background: rgba(255, 255, 255, 0.055);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 999px;
    color: #dbeafe;
    font-size: 0.88rem;
    padding: 0.55rem 0.75rem;
  }

  .terminal-card {
    background: linear-gradient(180deg, rgba(2, 6, 23, 0.98), rgba(7, 18, 36, 0.94));
    border: 1px solid rgba(94, 234, 212, 0.2);
    border-radius: 24px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 28px 70px rgba(0,0,0,0.35);
    overflow: hidden;
  }

  .terminal-topbar {
    align-items: center;
    border-bottom: 1px solid rgba(148, 163, 184, 0.14);
    color: #94a3b8;
    display: flex;
    font-size: 0.78rem;
    justify-content: space-between;
    padding: 0.8rem 0.95rem;
  }

  .terminal-dots { display: flex; gap: 0.4rem; }
  .terminal-dots span { border-radius: 999px; height: 0.62rem; width: 0.62rem; }
  .terminal-dots span:nth-child(1) { background: #f87171; }
  .terminal-dots span:nth-child(2) { background: #fbbf24; }
  .terminal-dots span:nth-child(3) { background: #34d399; }

  .terminal-body {
    color: #b7f7e8;
    display: grid;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    font-size: 0.9rem;
    gap: 0.72rem;
    min-height: 235px;
    padding: 1.05rem;
  }

  .terminal-line {
    animation: terminal-line 0.55s ease both;
    color: #a7f3d0;
    opacity: 0;
  }

  .terminal-line::before { color: #38bdf8; content: "chappie:// "; }
  .terminal-cursor { animation: blink 1s steps(2, start) infinite; color: #5eead4; }

  .input-panel { border-radius: 28px; padding: 1rem; }

  .panel-heading,
  .recording-topline,
  .demo-panel,
  .card-header {
    display: flex;
    gap: 0.85rem;
    justify-content: space-between;
  }

  .panel-heading { margin-bottom: 1rem; }
  .panel-heading h2, .card-header h2, .card-header h3 { color: #f8fafc; letter-spacing: -0.02em; margin: 0; }
  .panel-heading h2 { font-size: 1.1rem; }
  .panel-heading p, .card-description, .helper-text { color: #94a3b8; line-height: 1.5; margin: 0.25rem 0 0; }

  .privacy-lock {
    align-items: center;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.18);
    border-radius: 16px;
    color: #bbf7d0;
    display: flex;
    flex: 0 0 auto;
    height: 2.5rem;
    justify-content: center;
    width: 2.5rem;
  }

  .upload-form, .recording-panel { display: grid; gap: 0.9rem; }

  .drop-zone, .recording-panel, .demo-panel, .loading-panel {
    background: linear-gradient(145deg, rgba(8, 13, 28, 0.92), rgba(17, 24, 39, 0.66));
    border: 1px solid rgba(125, 211, 252, 0.18);
    border-radius: 22px;
  }

  .drop-zone {
    align-items: center;
    border-style: dashed;
    cursor: pointer;
    display: grid;
    gap: 0.8rem;
    justify-items: center;
    min-height: 190px;
    padding: 1.2rem;
    text-align: center;
    transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
  }

  .drop-zone:hover, .drop-zone.is-dragging {
    background: linear-gradient(145deg, rgba(13, 148, 136, 0.25), rgba(37, 99, 235, 0.24));
    border-color: rgba(45, 212, 191, 0.78);
    transform: translateY(-2px);
  }

  .drop-zone.is-disabled { cursor: not-allowed; opacity: 0.62; transform: none; }
  .file-input { height: 1px; opacity: 0; overflow: hidden; position: absolute; width: 1px; }
  .upload-icon { color: #5eead4; font-size: 2.2rem; line-height: 1; }
  .drop-zone strong { color: #f8fafc; display: block; font-size: 1rem; }
  .drop-zone span span { color: #94a3b8; display: block; line-height: 1.5; margin-top: 0.2rem; }

  .file-meta {
    background: rgba(20, 184, 166, 0.12);
    border: 1px solid rgba(94, 234, 212, 0.24);
    border-radius: 999px;
    color: #ccfbf1;
    display: inline-flex;
    font-size: 0.82rem;
    padding: 0.45rem 0.7rem;
  }

  .recording-panel, .demo-panel { padding: 0.9rem; }
  .recording-topline strong, .demo-panel strong { color: #f8fafc; display: block; }
  .recording-topline span, .demo-panel span { color: #94a3b8; display: block; font-size: 0.86rem; line-height: 1.5; margin-top: 0.2rem; }
  .recording-meta { align-items: center; display: flex !important; gap: 0.4rem; white-space: nowrap; }
  .record-dot { background: #64748b; border-radius: 999px; height: 0.62rem; width: 0.62rem; }
  .record-dot.is-recording { animation: blink 1.1s infinite; background: #fb7185; box-shadow: 0 0 20px rgba(251, 113, 133, 0.7); }

  .action-row { display: grid; gap: 0.7rem; grid-template-columns: 1fr 1fr; }

  .primary-button,
  .secondary-button,
  .copy-button,
  .export-button {
    align-items: center;
    border: 0;
    border-radius: 999px;
    display: inline-flex;
    font-weight: 850;
    gap: 0.48rem;
    justify-content: center;
    min-height: 2.8rem;
    padding: 0.72rem 1rem;
    transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }

  .primary-button {
    background: linear-gradient(135deg, #2dd4bf, #60a5fa);
    box-shadow: 0 14px 34px rgba(45, 212, 191, 0.26);
    color: #03111f;
  }

  .secondary-button, .copy-button, .export-button {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e0f2fe;
  }

  .is-danger { color: #fecdd3; }
  .primary-button:not(:disabled):hover, .secondary-button:not(:disabled):hover, .copy-button:not(:disabled):hover, .export-button:not(:disabled):hover {
    transform: translateY(-1px);
  }

  .error-card {
    background: rgba(127, 29, 29, 0.34);
    border: 1px solid rgba(248, 113, 113, 0.28);
    border-radius: 18px;
    color: #fecaca;
    line-height: 1.55;
    margin-top: 0.85rem;
    padding: 0.85rem;
  }

  .loading-panel { display: grid; gap: 0.85rem; margin-top: 0.85rem; padding: 0.9rem; }
  .loading-row { align-items: center; display: flex; gap: 0.85rem; }
  .loading-spinner {
    animation: spin 0.85s linear infinite;
    border: 3px solid rgba(125, 211, 252, 0.18);
    border-top-color: #5eead4;
    border-radius: 999px;
    height: 2.2rem;
    width: 2.2rem;
  }
  .loading-title { color: #f8fafc; display: block; font-weight: 900; }
  .loading-detail { color: #94a3b8; display: block; font-size: 0.86rem; margin-top: 0.14rem; }
  .progress-track { background: rgba(15, 23, 42, 0.86); border-radius: 999px; height: 0.58rem; overflow: hidden; }
  .progress-bar { background: linear-gradient(90deg, #14b8a6, #60a5fa); border-radius: inherit; height: 100%; transition: width 380ms ease; }

  .result-toolbar {
    align-items: center;
    display: flex;
    gap: 0.85rem;
    justify-content: space-between;
  }

  .result-toolbar h2 { font-size: 1.2rem; letter-spacing: -0.03em; margin: 0; }
  .result-toolbar p { color: #94a3b8; margin: 0.18rem 0 0; }

  .results-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .result-card {
    border-radius: 24px;
    display: grid;
    gap: 1rem;
    min-height: 100%;
    opacity: 0;
    padding: 1rem;
  }

  .result-card.is-visible { animation: fade-in 0.58s ease both; }
  .transcript-card, .full-soap-card { grid-column: 1 / -1; }
  .card-title-group { align-items: flex-start; display: flex; gap: 0.78rem; }
  .section-badge {
    align-items: center;
    background: rgba(20, 184, 166, 0.14);
    border: 1px solid rgba(94, 234, 212, 0.22);
    border-radius: 14px;
    color: #99f6e4;
    display: flex;
    flex: 0 0 auto;
    font-weight: 950;
    height: 2.3rem;
    justify-content: center;
    width: 2.3rem;
  }
  .card-kicker { color: #5eead4; font-size: 0.74rem; font-weight: 900; letter-spacing: 0.09em; margin: 0 0 0.2rem; text-transform: uppercase; }
  .copy-button, .export-button { font-size: 0.82rem; min-height: auto; padding: 0.5rem 0.75rem; }

  .note-field {
    background: rgba(2, 6, 23, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 18px;
    color: #e2e8f0;
    line-height: 1.6;
    min-height: 10rem;
    outline: none;
    padding: 1rem;
    resize: vertical;
    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
    width: 100%;
  }
  .note-field::placeholder { color: #64748b; }
  .note-field:focus { background: rgba(2, 6, 23, 0.66); border-color: rgba(45, 212, 191, 0.46); box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.08); }

  .disclaimer-card { border-color: rgba(251, 191, 36, 0.24); border-radius: 22px; color: #fef3c7; line-height: 1.6; padding: 1rem; }

  @media (max-width: 1080px) {
    .workspace { grid-template-columns: 1fr; }
    .sidebar { position: static; }
    .menu-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 820px) {
    .hero-grid, .results-grid { grid-template-columns: 1fr; }
    .result-toolbar, .card-header, .panel-heading, .recording-topline, .demo-panel { flex-direction: column; }
    .section-actions, .export-row { width: 100%; }
    .copy-button, .export-button, .secondary-button { width: 100%; }
  }

  @media (max-width: 560px) {
    .app-shell { padding: 0.7rem; }
    .hero-card, .sidebar, .input-panel { border-radius: 22px; }
    .menu-list, .action-row { grid-template-columns: 1fr; }
    h1 { font-size: 2.55rem; }
  }
`;

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatRecordingTime = (seconds) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
};

const getSupportedMimeType = () => {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";
};

const hasAudioExtension = (filename = "") => {
  const lowerName = filename.toLowerCase();
  return AUDIO_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
};

const buildFullSoapText = (soapNote) =>
  soapSections
    .map((section) => `${section.title}\n${soapNote[section.key] || ""}`)
    .join("\n\n");

export default function App() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [soapNote, setSoapNote] = useState(emptySoap);
  const [disclaimer, setDisclaimer] = useState(
    "Demo/prototype only. Do not enter real patient data. AI-generated documentation requires clinician review before use.",
  );
  const [isDragging, setIsDragging] = useState(false);
  const [copiedSection, setCopiedSection] = useState("");
  const [resultVersion, setResultVersion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState("");

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const loadingTimerRef = useRef(null);

  const fullSoapText = useMemo(() => buildFullSoapText(soapNote), [soapNote]);
  const hasResults = Boolean(transcript || Object.values(soapNote).some(Boolean));
  const recordingSupported =
    typeof navigator !== "undefined" &&
    typeof window !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  const currentLoadingStep = loadingSteps[loadingStep];

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current);
      window.clearInterval(loadingTimerRef.current);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    setLoadingStep(0);
    loadingTimerRef.current = window.setInterval(() => {
      setLoadingStep((step) => Math.min(step + 1, loadingSteps.length - 1));
    }, 1800);
    return () => window.clearInterval(loadingTimerRef.current);
  }, [isLoading]);

  const resetResults = () => {
    setTranscript("");
    setSoapNote(emptySoap);
  };

  const applyResult = (result) => {
    setTranscript(result.transcript || "");
    setSoapNote({ ...emptySoap, ...(result.soap_note || {}) });
    setDisclaimer(
      result.disclaimer ||
        "Demo/prototype only. Do not enter real patient data. AI-generated documentation requires clinician review before use.",
    );
    setResultVersion((current) => current + 1);
  };

  const validateAudioFile = (selectedFile) => {
    if (!selectedFile) {
      return "Please choose an audio file before generating a SOAP note.";
    }

    if (selectedFile.size > MAX_AUDIO_FILE_SIZE) {
      return `That audio file is ${formatFileSize(selectedFile.size)}. Please upload a file under ${formatFileSize(MAX_AUDIO_FILE_SIZE)} for this demo.`;
    }

    if (!selectedFile.type.startsWith("audio/") && !hasAudioExtension(selectedFile.name)) {
      return "Please upload an audio file, such as MP3, WAV, M4A, OGG, or WebM.";
    }

    return "";
  };

  const handleFileSelect = (selectedFile) => {
    if (isLoading) return;

    const validationError = validateAudioFile(selectedFile);
    if (validationError) {
      setFile(null);
      setError(validationError);
      return;
    }

    setFile(selectedFile);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateAudioFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError("");
    setCopiedSection("");

    try {
      const result = await processAudio(file);
      applyResult(result);
    } catch (err) {
      setError(err.message || "We could not process the audio. Please try again with a shorter audio file.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemo = () => {
    setError("");
    setCopiedSection("");
    setFile(null);
    applyResult(demoResult);
  };

  const startRecording = async () => {
    if (!recordingSupported || isLoading || isRecording) return;

    setRecordingError("");
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      audioChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioType = mimeType || "audio/webm";
        const extension = audioType.includes("mp4") ? "m4a" : audioType.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(audioChunksRef.current, { type: audioType });
        const recordedFile = new File([blob], `recorded-visit-${Date.now()}.${extension}`, { type: audioType });
        handleFileSelect(recordedFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => seconds + 1);
      }, 1000);
      resetResults();
    } catch (err) {
      setRecordingError(err.message || "Microphone access was blocked or unavailable.");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    window.clearInterval(timerRef.current);
  };

  const updateField = (field, value) => {
    setSoapNote((prev) => ({ ...prev, [field]: value }));
  };

  const copyText = async (label, value) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedSection(label);
      window.setTimeout(() => setCopiedSection(""), 1500);
    } catch {
      setError("Copy was blocked by the browser. You can still select the text manually.");
    }
  };

  const downloadFile = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadSoapText = () => {
    downloadFile("chappie-soap-note.txt", fullSoapText, "text/plain;charset=utf-8");
  };

  const downloadSoapJson = () => {
    downloadFile(
      "chappie-soap-note.json",
      JSON.stringify({ soap_note: soapNote, transcript, disclaimer }, null, 2),
      "application/json;charset=utf-8",
    );
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!isLoading) setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelect(event.dataTransfer.files?.[0]);
  };

  return (
    <main className="app-shell">
      <style>{appStyles}</style>
      <div className="workspace">
        <aside className="sidebar" aria-label="Workspace menu">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">C</span>
            <div>
              <strong>Chappie.io</strong>
              <span>Clinical note copilot MVP</span>
            </div>
          </div>

          <nav className="menu-list">
            {menuItems.map((item) => (
              <a
                className={`menu-item${item.label === "New Note" ? " is-active" : ""}`}
                href={item.label === "Compliance / Disclaimer" ? "#disclaimer" : "#new-note"}
                key={item.label}
              >
                <span>{item.label}</span>
                <small>{item.note}</small>
              </a>
            ))}
          </nav>

          <div className="sidebar-note">
            Demo/prototype only. Do not enter real patient data. No database or patient-history storage is enabled.
          </div>
        </aside>

        <div className="main-column">
          <section className="hero-card" aria-labelledby="page-title">
            <div className="hero-grid">
              <div>
                <div className="status-pill">
                  <span className="status-dot" aria-hidden="true" />
                  Healthcare SaaS workspace
                </div>
                <h1 id="page-title">
                  Clinical notes that feel <span className="gradient-text">effortless</span>
                </h1>
                <p className="hero-subtitle">
                  Upload demo encounter audio, record a browser-based mock visit, or launch synthetic content to show a clinician-in-the-loop SOAP workflow without adding patient storage.
                </p>
                <div className="trust-row" aria-label="Product safeguards">
                  <span className="trust-chip">Demo / prototype only</span>
                  <span className="trust-chip">Synthetic demo ready</span>
                  <span className="trust-chip">Clinician review required</span>
                </div>
              </div>

              <div className="terminal-card" aria-label="Clinical workflow terminal animation">
                <div className="terminal-topbar">
                  <div className="terminal-dots" aria-hidden="true"><span /><span /><span /></div>
                  <span>clinical-workflow.log</span>
                </div>
                <div className="terminal-body">
                  {terminalLines.map((line, index) => (
                    <span className="terminal-line" key={line} style={{ animationDelay: `${250 + index * 520}ms` }}>
                      {line}
                    </span>
                  ))}
                  <span><span className="terminal-cursor">▌</span></span>
                </div>
              </div>
            </div>
          </section>

          <section className="input-panel" id="new-note" aria-labelledby="new-note-title">
            <div className="panel-heading">
              <div>
                <h2 id="new-note-title">Create a clinical note</h2>
                <p>Choose a local audio file, record in the browser, or use instant synthetic demo data.</p>
              </div>
              <span className="privacy-lock" aria-hidden="true">✦</span>
            </div>

            <form className="upload-form" onSubmit={handleSubmit}>
              <label
                className={`drop-zone${isDragging ? " is-dragging" : ""}${isLoading ? " is-disabled" : ""}`}
                htmlFor="audio-upload"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <span className="upload-icon" aria-hidden="true">↥</span>
                <span>
                  <strong>Drop visit audio here</strong>
                  <span>Accepts audio files only. Demo limit: {formatFileSize(MAX_AUDIO_FILE_SIZE)}.</span>
                </span>
                {file && <span className="file-meta">{file.name} · {formatFileSize(file.size)}</span>}
              </label>
              <input
                id="audio-upload"
                className="file-input"
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                disabled={isLoading}
              />

              <div className="recording-panel" aria-label="Browser recording controls">
                <div className="recording-topline">
                  <div>
                    <strong>Record a fake visit</strong>
                    <span>Capture microphone audio and send it through the same upload flow.</span>
                  </div>
                  <span className="recording-meta">
                    <span className={`record-dot${isRecording ? " is-recording" : ""}`} aria-hidden="true" />
                    {formatRecordingTime(recordingSeconds)}
                  </span>
                </div>
                <div className="action-row">
                  <button className="secondary-button" type="button" onClick={startRecording} disabled={!recordingSupported || isRecording || isLoading}>
                    Start recording
                  </button>
                  <button className="secondary-button is-danger" type="button" onClick={stopRecording} disabled={!isRecording}>
                    Stop & attach
                  </button>
                </div>
                {!recordingSupported && <span className="helper-text">Your browser does not support MediaRecorder audio capture.</span>}
                {recordingError && <span className="helper-text">{recordingError}</span>}
              </div>

              <div className="demo-panel">
                <div>
                  <strong>Presenter demo mode</strong>
                  <span>Populate the transcript and SOAP cards with synthetic content.</span>
                </div>
                <button className="secondary-button" type="button" onClick={loadDemo} disabled={isLoading || isRecording}>
                  Use fake transcript
                </button>
              </div>

              {/* Future feature hook: add authentication and role-based access here before handling real users. */}
              <button className="primary-button" type="submit" disabled={isLoading || isRecording}>
                {isLoading ? "Processing audio…" : "Generate SOAP note"}
              </button>
              {isLoading && (
                <div aria-live="polite" className="loading-panel" role="status">
                  <div className="loading-row">
                    <span className="loading-spinner" aria-hidden="true" />
                    <span>
                      <span className="loading-title">{currentLoadingStep.label}</span>
                      <span className="loading-detail">{currentLoadingStep.detail}</span>
                    </span>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <div className="progress-bar" style={{ width: `${currentLoadingStep.progress}%` }} />
                  </div>
                </div>
              )}
            </form>

            {error && <div className="error-card">{error}</div>}
          </section>

          <section className="result-toolbar glass-card" aria-label="SOAP note actions" style={{ borderRadius: "22px", padding: "1rem" }}>
            <div>
              <h2>Generated documentation</h2>
              <p>Review, edit, copy, and export the demo note. Clinician review is required.</p>
            </div>
            <div className="export-row">
              <button className="copy-button" type="button" onClick={() => copyText("Full SOAP", fullSoapText)} disabled={!hasResults}>
                {copiedSection === "Full SOAP" ? "Copied ✓" : "Copy full SOAP"}
              </button>
              {/* Future feature hook: add PDF export once the printable clinical note template is finalized. */}
              <button className="export-button" type="button" onClick={downloadSoapText} disabled={!hasResults}>Download .txt</button>
              <button className="export-button" type="button" onClick={downloadSoapJson} disabled={!hasResults}>Download .json</button>
            </div>
          </section>

          <section className="results-grid" aria-label="Generated documentation results">
            <article key={`transcript-${resultVersion}`} className={`result-card transcript-card${hasResults ? " is-visible" : ""}`} style={{ animationDelay: hasResults ? "80ms" : "0ms" }}>
              <div className="card-header">
                <div className="card-title-group">
                  <span className="section-badge" aria-hidden="true">T</span>
                  <div>
                    <p className="card-kicker">Transcript</p>
                    <h2>Encounter transcript</h2>
                    <p className="card-description">Review and edit the source transcript before using the note.</p>
                  </div>
                </div>
                <button className="copy-button" type="button" onClick={() => copyText("Transcript", transcript)} disabled={!transcript}>
                  {copiedSection === "Transcript" ? "Copied ✓" : "Copy transcript"}
                </button>
              </div>
              <textarea className="note-field" value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={8} placeholder="Transcript appears here after processing or demo mode..." />
            </article>

            <article key={`full-soap-${resultVersion}`} className={`result-card full-soap-card${hasResults ? " is-visible" : ""}`} style={{ animationDelay: hasResults ? "150ms" : "0ms" }}>
              <div className="card-header">
                <div className="card-title-group">
                  <span className="section-badge" aria-hidden="true">Σ</span>
                  <div>
                    <p className="card-kicker">Full note</p>
                    <h2>Complete SOAP note</h2>
                    <p className="card-description">One combined note for quick review, copying, or text export.</p>
                  </div>
                </div>
                <button className="copy-button" type="button" onClick={() => copyText("Full SOAP", fullSoapText)} disabled={!hasResults}>
                  {copiedSection === "Full SOAP" ? "Copied ✓" : "Copy full SOAP"}
                </button>
              </div>
              <textarea className="note-field" value={fullSoapText} readOnly rows={8} placeholder="Full SOAP note appears here..." />
            </article>

            {soapSections.map((section, index) => (
              <article key={`${section.key}-${resultVersion}`} className={`result-card${hasResults ? " is-visible" : ""}`} style={{ animationDelay: hasResults ? `${230 + index * 110}ms` : "0ms" }}>
                <div className="card-header">
                  <div className="card-title-group">
                    <span className="section-badge" aria-hidden="true">{section.eyebrow}</span>
                    <div>
                      <p className="card-kicker">SOAP section</p>
                      <h3>{section.title}</h3>
                      <p className="card-description">{section.description}</p>
                    </div>
                  </div>
                  <button className="copy-button" type="button" onClick={() => copyText(section.title, soapNote[section.key] || "")} disabled={!soapNote[section.key]}>
                    {copiedSection === section.title ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <textarea className="note-field" value={soapNote[section.key] || ""} onChange={(e) => updateField(section.key, e.target.value)} rows={5} placeholder={`${section.title} content appears here...`} />
              </article>
            ))}
          </section>

          <aside className="disclaimer-card" id="disclaimer">
            <strong>Compliance / Disclaimer:</strong> {disclaimer} This MVP does not claim HIPAA compliance. Do not upload real patient data.
            {/* Future feature hooks: add database/history, EHR integration, and audit workflows only after privacy, security, and compliance requirements are defined. */}
          </aside>
        </div>
      </div>
    </main>
  );
}
