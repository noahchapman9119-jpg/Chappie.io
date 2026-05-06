import { useState } from "react";
import { processAudio } from "./api";

const emptySoap = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

const soapSections = [
  {
    key: "subjective",
    eyebrow: "S",
    title: "Subjective",
    description: "Patient-reported symptoms, concerns, and history.",
  },
  {
    key: "objective",
    eyebrow: "O",
    title: "Objective",
    description: "Observed findings, measurements, and exam details.",
  },
  {
    key: "assessment",
    eyebrow: "A",
    title: "Assessment",
    description: "Clinical impressions and working diagnoses.",
  },
  {
    key: "plan",
    eyebrow: "P",
    title: "Plan",
    description: "Next steps, treatment, follow-up, and education.",
  },
];

const appStyles = `
  :root {
    color-scheme: dark;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #050712;
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
      radial-gradient(circle at 15% 10%, rgba(34, 211, 238, 0.18), transparent 28rem),
      radial-gradient(circle at 85% 15%, rgba(129, 140, 248, 0.2), transparent 32rem),
      radial-gradient(circle at 50% 100%, rgba(16, 185, 129, 0.12), transparent 30rem),
      linear-gradient(135deg, #040614 0%, #09101f 46%, #030712 100%);
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  @keyframes chappie-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes chappie-pulse {
    0%, 100% {
      opacity: 0.64;
      transform: scale(0.98);
    }

    50% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes chappie-fade-up {
    from {
      opacity: 0;
      transform: translateY(18px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
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
    max-width: 1120px;
    position: relative;
    width: 100%;
    z-index: 1;
  }

  .hero-card {
    background: linear-gradient(145deg, rgba(15, 23, 42, 0.84), rgba(15, 23, 42, 0.48));
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 32px;
    box-shadow: 0 28px 90px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    overflow: hidden;
    padding: clamp(1rem, 2.6vw, 2rem);
    position: relative;
  }

  .hero-card::after {
    background: linear-gradient(90deg, rgba(34, 211, 238, 0), rgba(34, 211, 238, 0.45), rgba(129, 140, 248, 0.45), rgba(34, 211, 238, 0));
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
    grid-template-columns: minmax(0, 0.95fr) minmax(320px, 0.75fr);
  }

  .hero-copy {
    align-content: center;
    display: grid;
    min-height: 100%;
    padding: clamp(0.5rem, 2vw, 1.25rem);
  }

  .status-pill {
    align-items: center;
    background: rgba(14, 165, 233, 0.1);
    border: 1px solid rgba(125, 211, 252, 0.24);
    border-radius: 999px;
    color: #bae6fd;
    display: inline-flex;
    font-size: 0.8rem;
    font-weight: 700;
    gap: 0.5rem;
    letter-spacing: 0.08em;
    margin-bottom: 1.2rem;
    padding: 0.45rem 0.75rem;
    text-transform: uppercase;
    width: fit-content;
  }

  .status-dot {
    background: #22d3ee;
    border-radius: 999px;
    box-shadow: 0 0 20px rgba(34, 211, 238, 0.86);
    height: 0.55rem;
    width: 0.55rem;
  }

  h1 {
    font-size: clamp(2.25rem, 5.2vw, 5.25rem);
    letter-spacing: -0.075em;
    line-height: 0.93;
    margin: 0;
  }

  .gradient-text {
    background: linear-gradient(110deg, #ffffff, #cffafe 40%, #c4b5fd 82%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .hero-subtitle {
    color: #a6b4ca;
    font-size: clamp(1rem, 1.7vw, 1.2rem);
    line-height: 1.7;
    margin: 1.3rem 0 0;
    max-width: 58ch;
  }

  .trust-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    margin-top: 1.6rem;
  }

  .trust-chip {
    background: rgba(255, 255, 255, 0.055);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 999px;
    color: #dbeafe;
    font-size: 0.88rem;
    padding: 0.55rem 0.75rem;
  }

  .upload-panel,
  .result-card,
  .disclaimer-card {
    backdrop-filter: blur(22px);
    background: rgba(15, 23, 42, 0.58);
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 24px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .upload-panel:hover,
  .result-card:hover,
  .disclaimer-card:hover {
    border-color: rgba(125, 211, 252, 0.34);
    box-shadow: 0 22px 60px rgba(8, 47, 73, 0.22);
    transform: translateY(-2px);
  }

  .upload-panel {
    padding: 1rem;
  }

  .upload-form {
    display: grid;
    gap: 1rem;
  }

  .drop-zone {
    align-items: center;
    background: linear-gradient(145deg, rgba(8, 13, 28, 0.92), rgba(17, 24, 39, 0.66));
    border: 1px dashed rgba(125, 211, 252, 0.34);
    border-radius: 22px;
    cursor: pointer;
    display: grid;
    gap: 0.9rem;
    justify-items: center;
    min-height: 230px;
    padding: 1.35rem;
    text-align: center;
    transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
  }

  .drop-zone:hover,
  .drop-zone.is-dragging {
    background: linear-gradient(145deg, rgba(8, 47, 73, 0.72), rgba(49, 46, 129, 0.34));
    border-color: rgba(34, 211, 238, 0.78);
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

  .upload-icon {
    align-items: center;
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.16), rgba(129, 140, 248, 0.16));
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    color: #67e8f9;
    display: flex;
    font-size: 1.65rem;
    height: 4rem;
    justify-content: center;
    width: 4rem;
  }

  .drop-zone strong {
    color: #f8fafc;
    display: block;
    font-size: 1.05rem;
    margin-bottom: 0.25rem;
  }

  .drop-zone span {
    color: #94a3b8;
    font-size: 0.94rem;
  }

  .file-meta {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    color: #dbeafe;
    font-size: 0.9rem;
    max-width: 100%;
    overflow: hidden;
    padding: 0.65rem 0.85rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .primary-button,
  .copy-button {
    align-items: center;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    display: inline-flex;
    font-weight: 800;
    justify-content: center;
    transition: box-shadow 180ms ease, opacity 180ms ease, transform 180ms ease;
  }

  .primary-button {
    background: linear-gradient(135deg, #22d3ee, #818cf8 52%, #a78bfa);
    box-shadow: 0 16px 34px rgba(34, 211, 238, 0.18), 0 14px 32px rgba(129, 140, 248, 0.18);
    color: #020617;
    min-height: 3.35rem;
    padding: 0.9rem 1.2rem;
  }

  .primary-button:hover:not(:disabled) {
    box-shadow: 0 20px 42px rgba(34, 211, 238, 0.28), 0 18px 38px rgba(129, 140, 248, 0.24);
    transform: translateY(-2px);
  }

  .primary-button:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }

  .loading-message {
    align-items: center;
    background: rgba(8, 47, 73, 0.46);
    border: 1px solid rgba(34, 211, 238, 0.24);
    border-radius: 18px;
    color: #cffafe;
    display: flex;
    gap: 0.85rem;
    padding: 0.9rem 1rem;
  }

  .loading-spinner {
    animation: chappie-spin 0.8s linear infinite;
    border: 0.22rem solid rgba(186, 230, 253, 0.18);
    border-radius: 50%;
    border-top-color: #67e8f9;
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
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    margin-top: 1rem;
  }

  .result-card {
    opacity: 1;
    padding: 1rem;
    transform: translateY(0);
  }

  .result-card.is-visible {
    animation: chappie-fade-up 0.62s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .transcript-card {
    grid-column: 1 / -1;
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
    align-items: center;
    background: rgba(34, 211, 238, 0.12);
    border: 1px solid rgba(34, 211, 238, 0.2);
    border-radius: 14px;
    color: #67e8f9;
    display: flex;
    flex: 0 0 auto;
    font-weight: 900;
    height: 2.3rem;
    justify-content: center;
    width: 2.3rem;
  }

  .card-kicker {
    color: #67e8f9;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
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
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #dbeafe;
    flex: 0 0 auto;
    font-size: 0.82rem;
    gap: 0.35rem;
    padding: 0.5rem 0.75rem;
  }

  .copy-button:hover {
    background: rgba(34, 211, 238, 0.13);
    border-color: rgba(34, 211, 238, 0.28);
    color: #f8fafc;
    transform: translateY(-1px);
  }

  .note-field {
    background: rgba(2, 6, 23, 0.44);
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

  .note-field::placeholder {
    color: #64748b;
  }

  .note-field:focus {
    background: rgba(2, 6, 23, 0.62);
    border-color: rgba(34, 211, 238, 0.46);
    box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.08);
  }

  .disclaimer-card {
    color: #cbd5e1;
    line-height: 1.6;
    margin-top: 1rem;
    padding: 1rem;
  }

  @media (max-width: 900px) {
    .hero-grid,
    .results-grid {
      grid-template-columns: 1fr;
    }

    .hero-copy {
      padding-top: 1rem;
    }
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

    .card-header {
      flex-direction: column;
    }

    .copy-button {
      width: 100%;
    }
  }
`;

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
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

  const hasResults = Boolean(transcript || Object.values(soapNote).some(Boolean));

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile || isLoading) return;

    setFile(selectedFile);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Please choose an audio file first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setCopiedSection("");

    try {
      const result = await processAudio(file);
      setTranscript(result.transcript || "");
      setSoapNote(result.soap_note || emptySoap);
      setDisclaimer(result.disclaimer || "");
      setResultVersion((current) => current + 1);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
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
                Clinical AI Copilot
              </div>
              <h1 id="page-title">
                AI SOAP Note <span className="gradient-text">Copilot</span>
              </h1>
              <p className="hero-subtitle">
                Transform uploaded audio into an editable transcript and structured SOAP documentation with a focused,
                clinician-in-the-loop workspace.
              </p>
              <div className="trust-row" aria-label="Product safeguards">
                <span className="trust-chip">Demo / prototype only</span>
                <span className="trust-chip">No patient data</span>
                <span className="trust-chip">Clinician review required</span>
              </div>
            </div>

            <div className="upload-panel">
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
                    <strong>Drop your audio here</strong>
                    <span>or browse to upload a voice note, visit recording, or dictation file.</span>
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
                <button className="primary-button" type="submit" disabled={isLoading}>
                  {isLoading ? "Processing audio..." : "Generate SOAP note"}
                </button>
                {isLoading && (
                  <div aria-live="polite" className="loading-message" role="status">
                    <span className="loading-spinner" aria-hidden="true" />
                    <span className="loading-text">Processing audio...</span>
                  </div>
                )}
              </form>

              {error && <div className="error-card">{error}</div>}
            </div>
          </div>
        </section>

        <section className="results-grid" aria-label="Generated documentation results">
          <article
            key={`transcript-${resultVersion}`}
            className={`result-card transcript-card${hasResults ? " is-visible" : ""}`}
            style={{ animationDelay: hasResults ? "80ms" : "0ms" }}
          >
            <div className="card-header">
              <div className="card-title-group">
                <span className="section-badge" aria-hidden="true">T</span>
                <div>
                  <p className="card-kicker">Transcript</p>
                  <h2>Encounter transcript</h2>
                  <p className="card-description">Review and edit the source transcript before using the note.</p>
                </div>
              </div>
            </div>
            <textarea
              className="note-field"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              placeholder="Transcript appears here after processing..."
            />
          </article>

          {soapSections.map((section, index) => (
            <article
              key={`${section.key}-${resultVersion}`}
              className={`result-card${hasResults ? " is-visible" : ""}`}
              style={{ animationDelay: hasResults ? `${220 + index * 110}ms` : "0ms" }}
            >
              <div className="card-header">
                <div className="card-title-group">
                  <span className="section-badge" aria-hidden="true">{section.eyebrow}</span>
                  <div>
                    <p className="card-kicker">SOAP section</p>
                    <h3>{section.title}</h3>
                    <p className="card-description">{section.description}</p>
                  </div>
                </div>
                <button
                  className="copy-button"
                  type="button"
                  onClick={() => copyText(section.title, soapNote[section.key] || "")}
                >
                  {copiedSection === section.title ? "Copied" : "Copy"}
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
