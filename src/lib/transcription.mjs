// Transcription API client and response validation according to Section 6.1 of plan.md.
import { transcribeWithGeminiDirect } from "./geminiFallback.mjs";

export class TranscriptionError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = "TranscriptionError";
    this.details = details;
  }
}

const isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);

export const TRANSCRIPTION_OUTCOMES = Object.freeze([
  "transcribed",
  "needs_retake",
  "multiple_problems",
  "no_solution"
]);

export function validateTranscriptionResponse(data) {
  if (!isObject(data) || !TRANSCRIPTION_OUTCOMES.includes(data.outcome)) {
    throw new TranscriptionError(
      "The handwriting reader returned an unexpected format. Please retake or type your work."
    );
  }

  const outcome = data.outcome;

  if (outcome !== "transcribed") {
    const warnings = Array.isArray(data.warnings)
      ? data.warnings.filter((w) => typeof w === "string").slice(0, 5)
      : [];
    let message = "We couldn't clearly read this solution.";
    if (outcome === "needs_retake") {
      message = "The image was too blurry or dim to read clearly. Please retake in good lighting or type your work.";
    } else if (outcome === "multiple_problems") {
      message = "Please upload or capture just one problem at a time so we can give focused feedback.";
    } else if (outcome === "no_solution") {
      message = "We couldn't find handwritten math working in this image. Please check the photo or type your steps.";
    }
    return {
      outcome,
      problem: "",
      problemUnclear: true,
      steps: [],
      legibility: data.legibility || "poor",
      unclearSteps: [],
      warnings: warnings.length ? warnings : [message]
    };
  }

  // Transcribed outcome validation
  const problem = typeof data.problem === "string" ? data.problem.trim().slice(0, 1000) : "";
  const problemUnclear = Boolean(data.problemUnclear);

  if (!Array.isArray(data.steps) || data.steps.length === 0) {
    throw new TranscriptionError("No math steps could be read from this image. Please retake or type your work.");
  }

  if (data.steps.length > 30) {
    throw new TranscriptionError("Found more than 30 steps. Please focus on one single-problem solution at a time.");
  }

  const steps = data.steps.map((item, index) => {
    const plain = isObject(item) && typeof item.plain === "string" ? item.plain.trim().slice(0, 1000) : "";
    if (!plain) {
      throw new TranscriptionError(`Step ${index + 1} was empty in the transcription.`);
    }
    return {
      n: index + 1,
      plain
    };
  });

  const legibility = ["good", "partial", "poor"].includes(data.legibility) ? data.legibility : "partial";
  if (legibility === "poor") {
    throw new TranscriptionError("The image legibility was too poor to read reliably. Please retake with better lighting.");
  }

  const unclearSteps = Array.isArray(data.unclearSteps)
    ? [...new Set(data.unclearSteps.filter((n) => Number.isInteger(n) && n >= 1 && n <= steps.length))]
    : [];

  const warnings = Array.isArray(data.warnings)
    ? data.warnings.filter((w) => typeof w === "string" && w.trim().length > 0).map((w) => w.trim().slice(0, 500)).slice(0, 5)
    : [];

  return {
    outcome: "transcribed",
    problem,
    problemUnclear,
    steps,
    legibility,
    unclearSteps,
    warnings
  };
}

export async function requestTranscription(
  { problemText = "", solutionImage },
  { signal, fetchImpl = globalThis.fetch } = {}
) {
  if (!solutionImage || !solutionImage.data || solutionImage.mimeType !== "image/jpeg") {
    throw new TranscriptionError("A valid JPEG image is required for transcription.");
  }

  const payload = {
    problemText: typeof problemText === "string" ? problemText.trim().slice(0, 1000) : "",
    solutionImage: {
      mimeType: "image/jpeg",
      data: solutionImage.data
    }
  };

  let response;
  try {
    response = await fetchImpl("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    if (fetchImpl === globalThis.fetch) {
      const directBody = await transcribeWithGeminiDirect(payload, { signal });
      return validateTranscriptionResponse(directBody);
    }
    throw new TranscriptionError("We couldn’t reach the transcription service. Check your connection and try again.");
  }

  const contentType = response.headers.get("content-type") || "";
  let body;
  try {
    body = contentType.includes("application/json") ? await response.json() : null;
  } catch {
    body = null;
  }

  if (!response.ok || !body) {
    if (fetchImpl === globalThis.fetch && (!response.ok ? [404, 405, 413, 502, 503].includes(response.status) : true)) {
      try {
        const directBody = await transcribeWithGeminiDirect(payload, { signal });
        return validateTranscriptionResponse(directBody);
      } catch (err) {
        if (signal?.aborted) throw err;
      }
    }
    const errorMsg = body?.error;
    switch (response.status) {
      case 400:
        throw new TranscriptionError(errorMsg || "The image or request could not be processed.");
      case 413:
        throw new TranscriptionError("The image is too large to process. Please crop or reduce the file size.");
      case 415:
        throw new TranscriptionError("Unsupported image format. Please submit a JPEG, PNG, or WebP photo.");
      case 429:
        throw new TranscriptionError("The transcription service is currently busy. Please wait a moment and try again.");
      case 503:
      case 502:
        throw new TranscriptionError(errorMsg || "Handwriting reading is temporarily unavailable. You can type your steps directly.");
      case 504:
        throw new TranscriptionError("Reading your handwriting took too long. Please try again with a clearer, cropped photo.");
      default:
        throw new TranscriptionError("An unexpected error occurred while reading your image. Please try again or type your steps.");
    }
  }

  return validateTranscriptionResponse(body);
}
