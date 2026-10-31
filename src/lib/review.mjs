// Shared input and response checks for the React app and tests. No data is persisted.
import { analyzeWithGeminiDirect } from "./geminiFallback.mjs";

export const LIMITS = Object.freeze({ problem: 1000, work: 12000, steps: 30, step: 1000 });

export const EXAMPLES = Object.freeze({
  distribution: {
    label: "Distribution",
    problem: "2(x + 3) = 14",
    steps: ["2x + 3 = 14", "2x = 11", "x = 5.5"]
  },
  "negative-signs": {
    label: "Negative Signs",
    problem: "-3(x - 2) = 12",
    steps: ["-3x - 6 = 12", "-3x = 18", "x = -6"]
  },
  balancing: {
    label: "Balancing Equations",
    problem: "4x + 5 = 21",
    steps: ["4x = 21 + 5", "4x = 26", "x = 6.5"]
  }
});

export function splitSteps(work) {
  return work.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function validateAttempt(problem, work) {
  const steps = splitSteps(work);
  const errors = {};
  if (!problem.trim()) errors.problem = "Add the problem you’re trying to solve.";
  else if (problem.length > LIMITS.problem) errors.problem = `Keep the problem under ${LIMITS.problem + 1} characters.`;

  if (!steps.length) errors.steps = "Add at least one step so we can review your thinking.";
  else if (steps.length > LIMITS.steps) errors.steps = `Use no more than ${LIMITS.steps} steps, one per line.`;
  else if (work.length > LIMITS.work) errors.steps = `Keep your working under ${LIMITS.work + 1} characters.`;
  else if (steps.some((step) => step.length > LIMITS.step)) errors.steps = `Keep each step under ${LIMITS.step + 1} characters.`;

  return { valid: Object.keys(errors).length === 0, errors, payload: { problem: problem.trim(), steps } };
}

export class ReviewError extends Error {}

const invalidResponse = () => new ReviewError("The review couldn’t be verified. Please try again; no feedback has been used.");
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value, max = 3000) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const isOptionalText = (value, max) => value === null || value === undefined || value === "" || isText(value, max);

export function validateAnalysis(data, submittedSteps) {
  const outcomes = ["mistake_found", "no_mistake_found", "insufficient_work", "unsupported_problem"];
  if (!isObject(data) || !outcomes.includes(data.outcome) || !isText(data.explanation)) throw invalidResponse();
  if (!isOptionalText(data.concept, 160) || !isOptionalText(data.hint, 2000)) throw invalidResponse();

  const mistake = data.outcome === "mistake_found";
  const reviewable = mistake || data.outcome === "no_mistake_found";
  if (mistake) {
    if (!Number.isInteger(data.firstIncorrectStep) || data.firstIncorrectStep < 1 || data.firstIncorrectStep > submittedSteps.length || data.incorrectStepQuote !== submittedSteps[data.firstIncorrectStep - 1]) throw invalidResponse();
    if (!isText(data.concept, 160) || !isText(data.hint, 2000)) throw invalidResponse();
  } else if (data.firstIncorrectStep != null || (data.incorrectStepQuote != null && data.incorrectStepQuote !== "")) {
    throw invalidResponse();
  }

  const correction = data.workedCorrection ?? [];
  if (!Array.isArray(correction) || correction.length > 20 || correction.some((line) => !isText(line, 1000))) throw invalidResponse();
  if (mistake && correction.length === 0) throw invalidResponse();
  if (!reviewable && (correction.length > 0 || data.practice != null)) throw invalidResponse();

  let practice = null;
  if (data.practice != null) {
    const item = data.practice;
    if (!isObject(item) || !isText(item.question, 2000) || !isText(item.explanation) || !Array.isArray(item.options) || item.options.length !== 4) throw invalidResponse();
    if (item.options.some((option) => !isObject(option) || !isText(option.id, 64) || !isText(option.text, 1000))) throw invalidResponse();
    const ids = new Set(item.options.map((option) => option.id));
    if (ids.size !== 4 || !ids.has(item.correctOptionId)) throw invalidResponse();
    if (new Set(item.options.map((option) => option.text.trim())).size !== 4) throw invalidResponse();
    practice = {
      question: item.question,
      options: item.options.map(({ id, text }) => ({ id, text })),
      correctOptionId: item.correctOptionId,
      explanation: item.explanation
    };
  }
  if (reviewable && !practice) throw invalidResponse();

  const result = {
    outcome: data.outcome,
    firstIncorrectStep: mistake ? data.firstIncorrectStep : null,
    incorrectStepQuote: mistake ? data.incorrectStepQuote : null,
    concept: data.concept || "",
    explanation: data.explanation,
    hint: data.hint || "",
    workedCorrection: [...correction],
    practice
  };

  if (
    mistake &&
    Array.isArray(data.hints) &&
    data.hints.length > 0 &&
    data.hints.length <= 5 &&
    data.hints.every((h) => isText(h, 2000))
  ) {
    result.hints = [...data.hints];
  }

  const validCategories = [
    "distribution",
    "sign_error",
    "inverse_operation",
    "arithmetic_slip",
    "copying_error",
    "other",
    "distribution_error",
    "isolation_error",
    "arithmetic_error"
  ];
  if (mistake && validCategories.includes(data.category)) {
    result.category = data.category;
  }

  if (Array.isArray(data.stepFeedback)) {
    result.stepFeedback = data.stepFeedback;
  }

  if (isText(data.disputeNote, 2000)) {
    result.disputeNote = data.disputeNote;
  }

  return result;
}

export async function requestAnalysis(payload, { signal, fetchImpl = globalThis.fetch } = {}) {
  let response;
  try {
    response = await fetchImpl("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    if (fetchImpl === globalThis.fetch) {
      const directData = await analyzeWithGeminiDirect(payload, { signal });
      return validateAnalysis(directData, payload.steps);
    }
    throw new ReviewError("We couldn’t complete the review right now. Please try again.");
  }

  if (!response.ok) {
    if (fetchImpl === globalThis.fetch && [404, 405, 413, 502, 503].includes(response.status)) {
      try {
        const directData = await analyzeWithGeminiDirect(payload, { signal });
        return validateAnalysis(directData, payload.steps);
      } catch (err) {
        if (signal?.aborted) throw err;
      }
    }
    const messages = {
      400: "The review service couldn’t accept this attempt. Check your problem and steps, then try again.",
      404: "The step-review service isn’t connected yet. Your work is still here; try again once /api/analyze is available.",
      413: "This attempt is too long for the review service. Shorten your steps and try again.",
      429: "The review service is busy. Please wait a moment, then try again.",
      503: "The review service is temporarily unavailable. Please try again shortly.",
      504: "The review took too long. Please try again."
    };
    throw new ReviewError(messages[response.status] || "We couldn’t complete the review right now. Please try again.");
  }

  if (!response.headers.get("content-type")?.includes("application/json")) {
    if (fetchImpl === globalThis.fetch) {
      const directData = await analyzeWithGeminiDirect(payload, { signal });
      return validateAnalysis(directData, payload.steps);
    }
    throw invalidResponse();
  }
  let data;
  try { data = await response.json(); } catch { throw invalidResponse(); }
  return validateAnalysis(data, payload.steps);
}
