const API_BASE_URL = import.meta.env.VITE_API_URL || "chappieio.railway.internal";

export async function processAudio(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/process-audio`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to process audio.");
  }

  return response.json();
}
