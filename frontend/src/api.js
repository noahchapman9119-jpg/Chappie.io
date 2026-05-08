const API_URL = "https://chappieio-production.up.railway.app";

const USER_FRIENDLY_FALLBACK =
  "We could not process the audio right now. Please try again with a shorter audio file.";

export async function processAudio(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/process-audio`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = USER_FRIENDLY_FALLBACK;

    try {
      const errorPayload = await response.json();
      if (typeof errorPayload.detail === "string") {
        message = errorPayload.detail;
      }
    } catch {
      // Keep a clean fallback message instead of surfacing raw server output.
    }

    throw new Error(message);
  }

  return response.json();
}
