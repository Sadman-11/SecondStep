import test from "node:test";
import assert from "node:assert/strict";
import { validateImageFile } from "../src/lib/image.mjs";
import {
  TranscriptionError,
  validateTranscriptionResponse,
  requestTranscription
} from "../src/lib/transcription.mjs";

test("validateImageFile accepts valid JPEG, PNG, and WebP blobs under 15 MiB", () => {
  const validJpeg = new Blob(["test"], { type: "image/jpeg" });
  assert.equal(validateImageFile(validJpeg).valid, true);

  const validPng = new Blob(["test"], { type: "image/png" });
  assert.equal(validateImageFile(validPng).valid, true);

  const validWebp = new Blob(["test"], { type: "image/webp" });
  assert.equal(validateImageFile(validWebp).valid, true);
});

test("validateImageFile rejects invalid formats and oversized files", () => {
  const invalidType = new Blob(["test"], { type: "image/gif" });
  assert.equal(validateImageFile(invalidType).valid, false);

  const pdf = new Blob(["test"], { type: "application/pdf" });
  assert.equal(validateImageFile(pdf).valid, false);

  const nonBlob = { size: 100 };
  assert.equal(validateImageFile(nonBlob).valid, false);
});

test("validateTranscriptionResponse accepts valid transcribed data", () => {
  const payload = {
    outcome: "transcribed",
    problem: "2(x + 3) = 14",
    problemUnclear: false,
    steps: [
      { n: 1, plain: "2x + 3 = 14" },
      { n: 2, plain: "2x = 11" },
      { n: 3, plain: "x = 5.5" }
    ],
    legibility: "good",
    unclearSteps: [],
    warnings: []
  };

  const validated = validateTranscriptionResponse(payload);
  assert.equal(validated.outcome, "transcribed");
  assert.equal(validated.problem, "2(x + 3) = 14");
  assert.equal(validated.steps.length, 3);
  assert.equal(validated.steps[0].plain, "2x + 3 = 14");
  assert.equal(validated.legibility, "good");
});

test("validateTranscriptionResponse handles non-transcribed outcomes safely", () => {
  for (const outcome of ["needs_retake", "multiple_problems", "no_solution"]) {
    const result = validateTranscriptionResponse({
      outcome,
      warnings: ["Image was unclear."]
    });
    assert.equal(result.outcome, outcome);
    assert.equal(result.steps.length, 0);
    assert.ok(result.warnings.length > 0);
  }
});

test("validateTranscriptionResponse throws on malformed or empty step data", () => {
  assert.throws(
    () => validateTranscriptionResponse({ outcome: "unknown" }),
    TranscriptionError
  );
  assert.throws(
    () => validateTranscriptionResponse({ outcome: "transcribed", steps: [] }),
    TranscriptionError
  );
  assert.throws(
    () =>
      validateTranscriptionResponse({
        outcome: "transcribed",
        steps: [{ n: 1, plain: "" }]
      }),
    TranscriptionError
  );
});

test("requestTranscription sends payload to /api/transcribe and returns validated data", async () => {
  const mockFetch = async (url, options) => {
    assert.equal(url, "/api/transcribe");
    assert.equal(options.method, "POST");
    const body = JSON.parse(options.body);
    assert.equal(body.problemText, "2(x + 3) = 14");
    assert.equal(body.solutionImage.mimeType, "image/jpeg");
    assert.equal(body.solutionImage.data, "testbase64data");

    return {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        outcome: "transcribed",
        problem: "2(x + 3) = 14",
        problemUnclear: false,
        steps: [{ n: 1, plain: "2x + 6 = 14" }],
        legibility: "good",
        unclearSteps: [],
        warnings: []
      })
    };
  };

  const result = await requestTranscription(
    {
      problemText: "2(x + 3) = 14",
      solutionImage: { mimeType: "image/jpeg", data: "testbase64data" }
    },
    { fetchImpl: mockFetch }
  );

  assert.equal(result.outcome, "transcribed");
  assert.equal(result.steps.length, 1);
});

