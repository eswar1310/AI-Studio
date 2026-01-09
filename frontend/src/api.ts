// api.ts
// Use relative path so Vite directs API calls to the backend via proxy
// This completely solves LAN issues by making frontend the single entry point
const API_BASE = "/api";

// Helper to create fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw error;
  }
}


export async function isolateAudio(formData: FormData) {
  const apiKey = localStorage.getItem("aimusic.apikey") || "";

  try {
    const res = await fetchWithTimeout(`${API_BASE}/isolate`, {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: formData,
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid API key');
      throw new Error(`API Error: ${res.status}`);
    }
    return res.json();
  } catch (error: any) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server.');
    }
    throw error;
  }
}

export async function startGeneration(formData: FormData) {
  const apiKey = localStorage.getItem("aimusic.apikey") || "";

  try {
    const res = await fetchWithTimeout(`${API_BASE}/generate`, {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: formData,
    }, 600000); // 10 minutes timeout for slow generation starts

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (res.status === 401) {
        throw new Error('Invalid API key. Please check your credentials.');
      }
      throw new Error(`API Error: ${res.status}`);
    }
    return res.json();
  } catch (error: any) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check if the backend is running.');
    }
    throw error;
  }
}

export async function getResult(taskId: string) {
  const apiKey = localStorage.getItem("aimusic.apikey") || "";

  try {
    const res = await fetchWithTimeout(`${API_BASE}/result/${taskId}`, {
      method: "GET",
      headers: { "x-api-key": apiKey },
    }, 10000);

    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  } catch (error: any) {
    if (error.message.includes('timed out')) {
      return { status: 'processing' }; // Assume still processing
    }
    throw error;
  }
}

export async function getHistory() {
  const apiKey = localStorage.getItem("aimusic.apikey") || "";

  try {
    const res = await fetchWithTimeout(`${API_BASE}/history`, {
      method: "GET",
      headers: { "x-api-key": apiKey },
    }, 10000);

    if (!res.ok) return []; // safe fallback
    return res.json();
  } catch {
    return []; // safe fallback
  }
}

export async function clearHistory() {
  const apiKey = localStorage.getItem("aimusic.apikey") || "";
  const res = await fetchWithTimeout(`${API_BASE}/history`, {
    method: "DELETE",
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) throw new Error("Failed to clear history");
  return res.json();
}

export async function checkHealth() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {
      method: "GET",
    }, 5000);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getSfxPromptLibrary() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/sfx-prompts`, {
      method: "GET",
    }, 5000);
    if (!res.ok) return {};
    return res.json();
  } catch {
    console.warn("Failed to fetch SFX library");
    return {};
  }
}

// Helper to get API key
const getApiKey = () => localStorage.getItem("aimusic.apikey") || "";

// Chat
export const chatWithAssistant = async (message: string, history: any[] = [], project_context: any = null) => {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getApiKey(),
      },
      body: JSON.stringify({ message, history, project_context }),
    }, 30000); // Default 30s timeout for chat
    if (!res.ok) throw new Error("Chat failed");
    return res.json();
  } catch (error: any) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check if the backend is running.');
    }
    throw error;
  }
};

export const getConfig = async () => {
  const apiKey = localStorage.getItem("aimusic.apikey") || "";
  const res = await fetchWithTimeout(`${API_BASE}/config`, {
    method: "GET",
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
};

export const updateConfig = async (data: { google_api_key?: string, elevenlabs_api_key?: string }) => {
  const apiKey = localStorage.getItem("aimusic.apikey") || "";
  const res = await fetchWithTimeout(`${API_BASE}/config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update config");
  return res.json();
};



/**
 * Helper to wait for task completion
 */
export async function waitForTask(taskId: string, onPoll?: (status: string) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const task = await getResult(taskId);
        if (onPoll && task.status) onPoll(task.status);

        if (task.status === "done") {
          resolve(task);
        } else if (task.status === "failed" || task.status === "error") {
          reject(new Error(task.error || "Generation failed"));
        } else {
          setTimeout(check, 1000);
        }
      } catch (e) {
        reject(e);
      }
    };
    check();
  });
}
