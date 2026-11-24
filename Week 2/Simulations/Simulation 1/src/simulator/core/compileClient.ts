export interface CompileResult {
  success: boolean;
  hex?: string;
  cached?: boolean;
  duration?: number; // duration in milliseconds
  stdout?: string;
  stderr?: string;
  error?: string;
}

export const DEFAULT_COMPILE_ENDPOINT = import.meta.env.VITE_COMPILE_ENDPOINT || 'http://localhost:8080/compile';

/**
 * Sends Arduino C++ sketch source to the compile backend.
 * Uses dual payload { code, sketch } for compatibility with robosa-compile-server,
 * and falls back to relative /compile (Vite proxy) if direct port 8080 has CORS/network restrictions.
 */
export async function compileSketch(
  code: string,
  endpoint: string = DEFAULT_COMPILE_ENDPOINT
): Promise<CompileResult> {
  const startTime = performance.now();
  const payload = JSON.stringify({ code, sketch: code });

  // Helper to attempt fetch on a given URL
  async function attemptFetch(targetUrl: string): Promise<Response> {
    return await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    });
  }

  let response: Response;
  try {
    response = await attemptFetch(endpoint);
  } catch (err: unknown) {
    // If direct fetch to http://localhost:8080/compile fails (e.g. CORS in browser),
    // fallback to relative path /compile (handled by Vite dev proxy)
    if (typeof window !== 'undefined' && endpoint.includes(':8080/compile')) {
      try {
        response = await attemptFetch('/compile');
      } catch (fallbackErr: unknown) {
        const elapsed = Math.round(performance.now() - startTime);
        const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        return {
          success: false,
          error: `Connection error: Unable to reach compiler backend at ${endpoint} or /compile (${msg}). Verify Docker container is running on port 8080.`,
          duration: elapsed,
          cached: false,
        };
      }
    } else {
      const elapsed = Math.round(performance.now() - startTime);
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Connection error: Unable to reach compiler backend at ${endpoint} (${msg}). Verify Docker container is running on port 8080.`,
        duration: elapsed,
        cached: false,
      };
    }
  }

  const elapsed = Math.round(performance.now() - startTime);
  let data: any = null;

  try {
    data = await response.json();
  } catch {
    const rawText = await response.text();
    data = { error: rawText };
  }

  if (!response.ok || data?.success === false) {
    const errorDetails =
      data?.error ||
      data?.rawOutput ||
      data?.stderr ||
      (Array.isArray(data?.diagnostics)
        ? data.diagnostics.map((d: any) => `Line ${d.line}:${d.column} [${d.severity}]: ${d.message}`).join('\n')
        : null) ||
      `Compilation failed with HTTP ${response.status} (${response.statusText})`;

    return {
      success: false,
      error: errorDetails,
      stdout: data?.stdout,
      stderr: data?.rawOutput || data?.stderr,
      cached: Boolean(data?.cached),
      duration: data?.duration ?? elapsed,
    };
  }

  const hex = data?.hex || data?.data?.hex;
  if (!hex) {
    return {
      success: false,
      error: data?.error || 'Compiler response succeeded but returned no HEX binary data.',
      cached: Boolean(data?.cached),
      duration: data?.duration ?? elapsed,
    };
  }

  return {
    success: true,
    hex,
    cached: Boolean(data?.cached),
    duration: data?.duration ?? elapsed,
    stdout: data?.stdout,
    stderr: data?.stderr,
  };
}
