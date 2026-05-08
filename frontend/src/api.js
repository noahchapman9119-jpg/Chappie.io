const API_URL = "https://chappieio-production.up.railway.app";

export async function processAudio(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/process-audio`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to process audio");
  }

  return response.json();
}
