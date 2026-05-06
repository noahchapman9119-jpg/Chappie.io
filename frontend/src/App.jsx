import { useState } from "react";
import { processAudio } from "./api";

const emptySoap = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

const spinnerStyles = `
  @keyframes chappie-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 0.25rem solid #d7e3f4;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: chappie-spin 0.8s linear infinite;
    flex: 0 0 auto;
  }
`;

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [soapNote, setSoapNote] = useState(emptySoap);
  const [disclaimer, setDisclaimer] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Please choose an audio file first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await processAudio(file);
      setTranscript(result.transcript || "");
      setSoapNote(result.soap_note || emptySoap);
      setDisclaimer(result.disclaimer || "");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setSoapNote((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <style>{spinnerStyles}</style>
      <h1>AI SOAP Note Copilot (MVP Demo)</h1>
      <p>
        Demo/prototype only. Do not upload real patient data. All AI-generated documentation must be reviewed by a
        licensed clinician.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Upload audio and generate SOAP"}
        </button>
        {loading && (
          <div
            aria-live="polite"
            role="status"
            style={{
              alignItems: "center",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "0.5rem",
              color: "#1e3a8a",
              display: "flex",
              gap: "0.75rem",
              padding: "0.85rem 1rem",
            }}
          >
            <span className="loading-spinner" aria-hidden="true" />
            <span>Processing audio and generating your SOAP note. This may take a moment.</span>
          </div>
        )}
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <section style={{ marginBottom: "1.5rem" }}>
        <h2>Transcript</h2>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={8}
          style={{ width: "100%" }}
          placeholder="Transcript appears here..."
        />
      </section>

      <section>
        <h2>SOAP Note (Editable)</h2>
        {Object.keys(emptySoap).map((field) => (
          <div key={field} style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold", textTransform: "capitalize" }}>{field}</label>
            <textarea
              value={soapNote[field] || ""}
              onChange={(e) => updateField(field, e.target.value)}
              rows={5}
              style={{ width: "100%" }}
            />
          </div>
        ))}
      </section>

      {disclaimer && <p style={{ marginTop: "1.5rem", fontStyle: "italic" }}>{disclaimer}</p>}
    </main>
  );
}
