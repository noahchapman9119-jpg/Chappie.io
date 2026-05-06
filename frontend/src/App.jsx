import { useEffect, useRef, useState } from "react";
import { processAudio } from "./api";

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
    description: "Patient-reported symptoms, concerns, history, and context.",
  },
  {
    key: "objective",
    eyebrow: "O",
    title: "Objective",
    description: "Observed findings, vitals, measurements, and exam details.",
  },
  {
    key: "assessment",
    eyebrow: "A",
    title: "Assessment",
    description: "Clinical impressions, acuity, and working diagnoses.",
  },
  {
    key: "plan",
    eyebrow: "P",
    title: "Plan",
    description: "Treatment, patient education, orders, and follow-up steps.",
  },
];

const appStyles = `
  :root {
    color-scheme: dark;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #020617;
    color: #eff6ff;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    background:
      radial-gradient(circle at 12% 8%, rgba(20, 184, 166, 0.2), transparent 28rem),
      radial-gradient(circle at 92% 10%, rgba(59, 130, 246, 0.22), transparent 34rem),
      radial-gradient(circle at 50% 110%, rgba(129, 140, 248, 0.2), transparent 30rem),
      linear-gradient(135deg, #020617 0%, #08111f 42%, #030712 100%);
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  button:focus-visible,
  input:focus-visible,
  textarea:focus-visible {
    outline: 3px solid rgba(45, 212, 191, 0.42);
    outline-offset: 3px;
  }

  @keyframes chappie-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes chappie-pulse {
    0%, 100% { opacity: 0.68; transform: scale(0.98); }
    50% { opacity: 1; transform: scale(1); }
  }

  @keyframes chappie-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes transcript-reveal {
    from { opacity: 0; filter: blur(7px); transform: translateY(12px); }
    to { opacity: 1; filter: blur(0); transform: translateY(0); }
  }

  @keyframes recording-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.42); }
    50% { box-shadow: 0 0 0 8px rgba(244, 63, 94, 0); }
  }

  .app-shell {
    align-items: center;
    display: flex;
    justify-content: center;
    min-height: 100vh;
    overflow: hidden;
    padding: clamp(1rem, 3vw, 3rem);
    position: relative;
  }

  .app-shell::before {
    background: linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 72px 72px;
    content: "";
    inset: 0;
    mask-image: radial-gradient(circle at center, black, transparent 76%);
    pointer-events: none;
    position: absolute;
  }

  .app-container {
    animation: chappie-fade-up 0.7s ease-out both;
    max-width: 1180px;
    position: relative;
    width: 100%;
    z-index: 1;
  }

  .hero-card,
  .metric-card,
  .input-panel,
  .result-card,
  .disclaimer-card {
    backdrop-filter: blur(22px);
    background: linear-gradient(145deg, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.5));
    border: 1px solid rgba(148, 163, 184, 0.2);
    box-shadow: 0 24px 72px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .hero-card {
    border-radius: 34px;
    overflow: hidden;
    padding: clamp(1rem, 2.6vw, 2rem);
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
    gap: clamp(1.25rem, 3vw, 2rem);
    grid-template-columns: minmax(0, 0.95fr) minmax(330px, 0.78fr);
  }

  .hero-copy {
    align-content: center;
    display: grid;
    min-height: 100%;
    padding: clamp(0.5rem, 2vw, 1.25rem);
  }

  .status-pill {
    align-items: center;
    background: rgba(20, 184, 166, 0.12);
    border: 1px solid rgba(94, 234, 212, 0.26);
    border-radius: 999px;
    color: #ccfbf1;
    display: inline-flex;
    font-size: 0.78rem;
    font-weight: 800;
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
    font-size: clamp(2.4rem, 5.4vw, 5.7rem);
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
    font-size: clamp(1rem, 1.7vw, 1.2rem);
    line-height: 1.7;
    margin: 1.3rem 0 0;
    max-width: 62ch;
  }

  .trust-row,
  .metric-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .trust-row { margin-top: 1.6rem; }
  .metric-row { margin-top: 1.35rem; }

  .trust-chip,
  .metric-card {
    border-radius: 999px;
    color: #dbeafe;
    font-size: 0.88rem;
  }

  .trust-chip {
    background: rgba(255, 255, 255, 0.055);
    border: 1px solid rgba(255, 255, 255, 0.09);
    padding: 0.55rem 0.75rem;
  }

  .metric-card {
    align-items: center;
    display: inline-flex;
    gap: 0.48rem;
    padding: 0.62rem 0.8rem;
  }

  .metric-card strong { color: #f8fafc; }

  .input-panel {
    border-radius: 26px;
    padding: 1rem;
  }

  .panel-heading {
    display: flex;
    gap: 0.8rem;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .panel-heading h2 {
    color: #f8fafc;
    font-size: 1.08rem;
    letter-spacing: -0.02em;
    margin: 0;
  }

  .panel-heading p {
    color: #94a3b8;
    line-height: 1.5;
    margin: 0.25rem 0 0;
  }

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

  .upload-form,
  .recording-panel {
    display: grid;
    gap: 0.9rem;
  }

  .drop-zone,
  .recording-panel,
  .demo-panel {
    background: linear-gradient(145deg, rgba(8, 13, 28, 0.92), rgba(17, 24, 39, 0.66));
    border: 1px solid rgba(125, 211, 252, 0.18);
    border-radius: 22px;
  }

  .drop-zone {
    align-items: center;
    border-style: dashed;
    cursor: pointer;
    display: grid;
    gap: 0.9rem;
    justify-items: center;
    min-height: 205px;
    padding: 1.25rem;
    text-align: center;
    transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
  }

  .drop-zone:hover,
  .drop-zone.is-dragging {
    background: linear-gradient(145deg, rgba(13, 148, 136, 0.25), rgba(37, 99, 235, 0.24));
    border-color: rgba(45, 212, 191, 0.78);
    transform: translateY(-2px);
  }

  .drop-zone.is-disabled {
    cursor: not-allowed;
    opacity: 0.62;
    transform: none;
  }

  .file-input {
    height: 1px;
    opacity: 0;
    position: absolute;
    width: 1px;
  }

  .upload-icon,
  .section-badge {
    align-items: center;
    background: linear-gradient(135deg, rgba(45, 212, 191, 0.16), rgba(96, 165, 250, 0.15));
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #7dd3fc;
    display: flex;
    justify-content: center;
  }

  .upload-icon {
    border-radius: 20px;
    font-size: 1.65rem;
    height: 4rem;
    width: 4rem;
  }

  .drop-zone strong,
  .demo-panel strong,
  .recording-panel strong {
    color: #f8fafc;
    display: block;
    font-size: 1.02rem;
    margin-bottom: 0.25rem;
  }

  .drop-zone span,
  .demo-panel span,
  .recording-panel span {
    color: #94a3b8;
    font-size: 0.92rem;
  }

  .file-meta,
  .recording-meta {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    color: #dbeafe;
    font-size: 0.88rem;
    max-width: 100%;
    overflow: hidden;
    padding: 0.62rem 0.8rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recording-panel,
  .demo-panel {
    padding: 1rem;
  }

  .recording-topline,
  .demo-panel {
    align-items: center;
    display: flex;
    gap: 0.85rem;
    justify-content: space-between;
  }

  .record-dot {
    background: #64748b;
    border-radius: 999px;
    flex: 0 0 auto;
    height: 0.72rem;
    width: 0.72rem;
  }

  .record-dot.is-recording {
    animation: recording-glow 1.25s ease-in-out infinite;
    background: #fb7185;
  }

  .action-row {
    display: grid;
    gap: 0.7rem;
    grid-template-columns: 1fr 1fr;
  }

  .primary-button,
  .secondary-button,
  .copy-button {
    align-items: center;
    border-radius: 999px;
    cursor: pointer;
    display: inline-flex;
    font-weight: 800;
    justify-content: center;
    transition: box-shadow 180ms ease, opacity 180ms ease, transform 180ms ease, border-color 180ms ease;
  }

  .primary-button {
    background: linear-gradient(135deg, #2dd4bf, #60a5fa 54%, #a78bfa);
    border: 0;
    box-shadow: 0 16px 34px rgba(45, 212, 191, 0.16), 0 14px 32px rgba(96, 165, 250, 0.16);
    color: #020617;
    min-height: 3.35rem;
    padding: 0.9rem 1.2rem;
  }

  .secondary-button,
  .copy-button {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.11);
    color: #dbeafe;
    min-height: 2.8rem;
    padding: 0.7rem 0.9rem;
  }

  .secondary-button.is-danger {
    background: rgba(244, 63, 94, 0.12);
    border-color: rgba(251, 113, 133, 0.32);
    color: #fecdd3;
  }

  .primary-button:hover:not(:disabled),
  .secondary-button:hover:not(:disabled),
  .copy-button:hover:not(:disabled) {
    border-color: rgba(45, 212, 191, 0.34);
    box-shadow: 0 18px 38px rgba(8, 47, 73, 0.22);
    transform: translateY(-2px);
  }

  .primary-button:disabled,
  .secondary-button:disabled,
  .copy-button:disabled {
    cursor: not-allowed;
    opacity: 0.56;
    transform: none;
  }

  .loading-message {
    align-items: center;
    background: rgba(8, 47, 73, 0.46);
    border: 1px solid rgba(45, 212, 191, 0.24);
    border-radius: 18px;
    color: #ccfbf1;
    display: flex;
    gap: 0.85rem;
    padding: 0.9rem 1rem;
  }

  .loading-spinner {
    animation: chappie-spin 0.8s linear infinite;
    border: 0.22rem solid rgba(204, 251, 241, 0.18);
    border-radius: 50%;
    border-top-color: #5eead4;
    flex: 0 0 auto;
    height: 1.7rem;
    width: 1.7rem;
  }

  .loading-text {
    animation: chappie-pulse 1.45s ease-in-out infinite;
    font-weight: 800;
  }

  .error-card {
    background: rgba(127, 29, 29, 0.28);
    border: 1px solid rgba(248, 113, 113, 0.32);
    border-radius: 18px;
    color: #fecaca;
    margin-top: 1rem;
    padding: 0.9rem 1rem;
  }

  .results-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 1rem;
  }

  .result-card {
    border-radius: 24px;
    opacity: 1;
    padding: 1rem;
    transform: translateY(0);
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .result-card:hover,
  .disclaimer-card:hover {
    border-color: rgba(125, 211, 252, 0.34);
    box-shadow: 0 22px 60px rgba(8, 47, 73, 0.22);
    transform: translateY(-2px);
  }

  .result-card.is-visible {
    animation: chappie-fade-up 0.62s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .transcript-card {
    grid-column: 1 / -1;
  }

  .transcript-card.is-visible .note-field {
    animation: transcript-reveal 0.75s ease-out both;
  }

  .card-header {
    align-items: flex-start;
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    margin-bottom: 0.85rem;
  }

  .card-title-group {
    display: flex;
    gap: 0.8rem;
  }

  .section-badge {
    border-radius: 14px;
    flex: 0 0 auto;
    font-weight: 900;
    height: 2.3rem;
    width: 2.3rem;
  }

  .card-kicker {
    color: #5eead4;
    font-size: 0.74rem;
    font-weight: 900;
    letter-spacing: 0.09em;
    margin: 0 0 0.2rem;
    text-transform: uppercase;
  }

  .card-header h2,
  .card-header h3 {
    color: #f8fafc;
    font-size: 1.1rem;
    letter-spacing: -0.02em;
    margin: 0;
  }

  .card-description {
    color: #94a3b8;
    font-size: 0.88rem;
    line-height: 1.5;
    margin: 0.25rem 0 0;
  }

  .copy-button {
    flex: 0 0 auto;
    font-size: 0.82rem;
    gap: 0.35rem;
    min-height: auto;
    padding: 0.5rem 0.75rem;
  }

  .note-field {
    background: rgba(2, 6, 23, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 18px;
    color: #e2e8f0;
    line-height: 1.6;
    min-height: 11rem;
    outline: none;
    padding: 1rem;
    resize: vertical;
    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
    width: 100%;
  }

  .note-field::placeholder { color: #64748b; }

  .note-field:focus {
    background: rgba(2, 6, 23, 0.66);
    border-color: rgba(45, 212, 191, 0.46);
    box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.08);
  }

  .disclaimer-card {
    border-radius: 22px;
    color: #cbd5e1;
    line-height: 1.6;
    margin-top: 1rem;
    padding: 1rem;
  }

  @media (max-width: 940px) {
    .hero-grid,
    .results-grid {
      grid-template-columns: 1fr;
    }

    .hero-copy { padding-top: 1rem; }
  }

  @media (max-width: 600px) {
    .app-shell {
      align-items: flex-start;
      padding: 0.75rem;
    }

    .hero-card {
      border-radius: 24px;
      padding: 0.85rem;
    }

    .panel-heading,
    .recording-topline,
    .demo-panel,
    .card-header {
      flex-direction: column;
    }

    .action-row { grid-template-columns: 1fr; }

    .copy-button,
    .secondary-button {
      width: 100%;
    }
  }
`;

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatRecordingTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
};

const getSupportedMimeType = () => {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return (
    types.find((type) => window.MediaRecorder?.isTypeSupported(type)) || ""
  );
};

export default function App() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [soapNote, setSoapNote] = useState(emptySoap);
  const [disclaimer, setDisclaimer] = useState("");
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

  const hasResults = Boolean(
    transcript || Object.values(soapNote).some(Boolean),
  );
  const recordingSupported =
    typeof navigator !== "undefined" &&
    typeof window !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const resetResults = () => {
    setTranscript("");
    setSoapNote(emptySoap);
    setDisclaimer("");
  };

  const applyResult = (result) => {
    setTranscript(result.transcript || "");
    setSoapNote(result.soap_note || emptySoap);
    setDisclaimer(result.disclaimer || "");
    setResultVersion((current) => current + 1);
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile || isLoading) return;

    setFile(selectedFile);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Please choose or record an audio file first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setCopiedSection("");

    try {
      const result = await processAudio(file);
      applyResult(result);
    } catch (err) {
      setError(err.message || "Something went wrong.");
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
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      audioChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioType = mimeType || "audio/webm";
        const extension = audioType.includes("mp4")
          ? "m4a"
          : audioType.includes("ogg")
            ? "ogg"
            : "webm";
        const blob = new Blob(audioChunksRef.current, { type: audioType });
        const recordedFile = new File(
          [blob],
          `recorded-visit-${Date.now()}.${extension}`,
          { type: audioType },
        );
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
      setRecordingError(
        err.message || "Microphone access was blocked or unavailable.",
      );
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

    await navigator.clipboard.writeText(value);
    setCopiedSection(label);
    window.setTimeout(() => setCopiedSection(""), 1500);
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
      <div className="app-container">
        <section className="hero-card" aria-labelledby="page-title">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="status-pill">
                <span className="status-dot" aria-hidden="true" />
                Healthcare SaaS workspace
              </div>
              <h1 id="page-title">
                Clinical notes that feel{" "}
                <span className="gradient-text">effortless</span>
              </h1>
              <p className="hero-subtitle">
                Upload audio, record a browser-based mock visit, or launch a
                synthetic demo to present an elegant clinician-in-the-loop SOAP
                workflow without touching backend services.
              </p>
              <div className="trust-row" aria-label="Product safeguards">
                <span className="trust-chip">Demo / prototype only</span>
                <span className="trust-chip">Synthetic demo ready</span>
                <span className="trust-chip">Clinician review required</span>
              </div>
              <div className="metric-row" aria-label="Workflow highlights">
                <span className="metric-card">
                  <strong>3</strong> input modes
                </span>
                <span className="metric-card">
                  <strong>4</strong> copyable SOAP sections
                </span>
                <span className="metric-card">
                  <strong>0</strong> backend changes
                </span>
              </div>
            </div>

            <div className="input-panel">
              <div className="panel-heading">
                <div>
                  <h2>Create a clinical note</h2>
                  <p>
                    Choose a local file, record in the browser, or use instant
                    demo data.
                  </p>
                </div>
                <span className="privacy-lock" aria-hidden="true">
                  ✦
                </span>
              </div>

              <form className="upload-form" onSubmit={handleSubmit}>
                <label
                  className={`drop-zone${isDragging ? " is-dragging" : ""}${isLoading ? " is-disabled" : ""}`}
                  htmlFor="audio-upload"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <span className="upload-icon" aria-hidden="true">
                    ↥
                  </span>
                  <span>
                    <strong>Drop visit audio here</strong>
                    <span>
                      or browse for a voice note, dictation file, or recorded
                      encounter.
                    </span>
                  </span>
                  {file && (
                    <span className="file-meta">
                      {file.name} · {formatFileSize(file.size)}
                    </span>
                  )}
                </label>
                <input
                  id="audio-upload"
                  className="file-input"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  disabled={isLoading}
                />

                <div
                  className="recording-panel"
                  aria-label="Browser recording controls"
                >
                  <div className="recording-topline">
                    <div>
                      <strong>Record a fake visit</strong>
                      <span>
                        Capture microphone audio and send it through the same
                        upload flow.
                      </span>
                    </div>
                    <span className="recording-meta">
                      <span
                        className={`record-dot${isRecording ? " is-recording" : ""}`}
                        aria-hidden="true"
                      />{" "}
                      {formatRecordingTime(recordingSeconds)}
                    </span>
                  </div>
                  <div className="action-row">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={startRecording}
                      disabled={!recordingSupported || isRecording || isLoading}
                    >
                      Start recording
                    </button>
                    <button
                      className="secondary-button is-danger"
                      type="button"
                      onClick={stopRecording}
                      disabled={!isRecording}
                    >
                      Stop & attach
                    </button>
                  </div>
                  {!recordingSupported && (
                    <span>
                      Your browser does not support MediaRecorder audio capture.
                    </span>
                  )}
                  {recordingError && <span>{recordingError}</span>}
                </div>

                <div className="demo-panel">
                  <div>
                    <strong>Presenter demo mode</strong>
                    <span>
                      Instantly populate the transcript and SOAP cards with
                      synthetic content.
                    </span>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={loadDemo}
                    disabled={isLoading || isRecording}
                  >
                    Use fake transcript
                  </button>
                </div>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={isLoading || isRecording}
                >
                  {isLoading ? "Processing audio..." : "Generate SOAP note"}
                </button>
                {isLoading && (
                  <div
                    aria-live="polite"
                    className="loading-message"
                    role="status"
                  >
                    <span className="loading-spinner" aria-hidden="true" />
                    <span className="loading-text">
                      Processing audio and drafting SOAP sections...
                    </span>
                  </div>
                )}
              </form>

              {error && <div className="error-card">{error}</div>}
            </div>
          </div>
        </section>

        <section
          className="results-grid"
          aria-label="Generated documentation results"
        >
          <article
            key={`transcript-${resultVersion}`}
            className={`result-card transcript-card${hasResults ? " is-visible" : ""}`}
            style={{ animationDelay: hasResults ? "80ms" : "0ms" }}
          >
            <div className="card-header">
              <div className="card-title-group">
                <span className="section-badge" aria-hidden="true">
                  T
                </span>
                <div>
                  <p className="card-kicker">Transcript</p>
                  <h2>Encounter transcript</h2>
                  <p className="card-description">
                    Review and edit the source transcript before using the note.
                  </p>
                </div>
              </div>
            </div>
            <textarea
              className="note-field"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              placeholder="Transcript appears here after processing or demo mode..."
            />
          </article>

          {soapSections.map((section, index) => (
            <article
              key={`${section.key}-${resultVersion}`}
              className={`result-card${hasResults ? " is-visible" : ""}`}
              style={{
                animationDelay: hasResults ? `${220 + index * 110}ms` : "0ms",
              }}
            >
              <div className="card-header">
                <div className="card-title-group">
                  <span className="section-badge" aria-hidden="true">
                    {section.eyebrow}
                  </span>
                  <div>
                    <p className="card-kicker">SOAP section</p>
                    <h3>{section.title}</h3>
                    <p className="card-description">{section.description}</p>
                  </div>
                </div>
                <button
                  className="copy-button"
                  type="button"
                  onClick={() =>
                    copyText(section.title, soapNote[section.key] || "")
                  }
                  disabled={!soapNote[section.key]}
                >
                  {copiedSection === section.title ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <textarea
                className="note-field"
                value={soapNote[section.key] || ""}
                onChange={(e) => updateField(section.key, e.target.value)}
                rows={5}
                placeholder={`${section.title} content appears here...`}
              />
            </article>
          ))}
        </section>

        {disclaimer && <aside className="disclaimer-card">{disclaimer}</aside>}
      </div>
    </main>
  );
}
