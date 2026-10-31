import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { ReviewError, requestAnalysis, validateAttempt } from "../lib/review.mjs";
import { createSession, sessionReducer } from "../lib/session.mjs";
import { TranscriptionError, requestTranscription } from "../lib/transcription.mjs";

export function useLearningSession() {
  const [state, dispatch] = useReducer(sessionReducer, undefined, createSession);
  const focusRefs = useRef({});
  const activeRequest = useRef(null);
  const generation = useRef(0);

  const cancelActiveRequests = useCallback(() => {
    generation.current += 1;
    if (activeRequest.current) {
      clearTimeout(activeRequest.current.timeout);
      activeRequest.current.controller.abort();
      activeRequest.current = null;
    }
  }, []);

  useEffect(() => {
    const invalidate = () => {
      cancelActiveRequests();
      dispatch({ type: "restore" });
    };
    const onPageShow = (event) => {
      if (event.persisted) invalidate();
    };
    window.addEventListener("pagehide", invalidate);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelActiveRequests();
      window.removeEventListener("pagehide", invalidate);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [cancelActiveRequests]);

  useLayoutEffect(() => {
    if (!state.focusVersion) return;
    const preventScroll = ["practice", "practiceReset"].includes(state.focusTarget);
    focusRefs.current[state.focusTarget]?.focus({ preventScroll });
  }, [state.focusTarget, state.focusVersion]);

  function changeInput(field, value) {
    cancelActiveRequests();
    dispatch({ type: "input", field, value });
  }

  function loadExample(name) {
    cancelActiveRequests();
    dispatch({ type: "example", name });
  }

  function resetSession() {
    cancelActiveRequests();
    if (state.imageState?.previewUrl) {
      URL.revokeObjectURL(state.imageState.previewUrl);
    }
    dispatch({ type: "reset" });
  }

  function setInputMode(mode) {
    cancelActiveRequests();
    dispatch({ type: "set-input-mode", mode });
  }

  function handleImagePrepared(imageState) {
    cancelActiveRequests();
    if (state.imageState?.previewUrl && state.imageState.previewUrl !== imageState?.previewUrl) {
      URL.revokeObjectURL(state.imageState.previewUrl);
    }
    dispatch({ type: "image-prepared", imageState });
  }

  function handleImageRotated(imageState) {
    cancelActiveRequests();
    dispatch({ type: "image-rotated", imageState });
  }

  function handleImageRemoved() {
    cancelActiveRequests();
    if (state.imageState?.previewUrl) {
      URL.revokeObjectURL(state.imageState.previewUrl);
    }
    dispatch({ type: "image-removed" });
  }

  async function transcribeImage() {
    if (activeRequest.current || !state.imageState?.base64) return;

    cancelActiveRequests();
    const requestId = generation.current;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 45000);

    activeRequest.current = { controller, timeout, requestId };
    dispatch({ type: "transcribe-start" });

    try {
      const transcript = await requestTranscription(
        {
          problemText: state.problem,
          solutionImage: {
            mimeType: "image/jpeg",
            data: state.imageState.base64
          }
        },
        { signal: controller.signal }
      );

      if (generation.current !== requestId) return;
      if (timedOut) throw new TranscriptionError("Reading your handwriting took too long. Please try again.");

      dispatch({ type: "transcribe-success", transcript });
    } catch (error) {
      if (generation.current !== requestId) return;
      const message = timedOut
        ? "Reading your handwriting took too long. Please try again."
        : error instanceof TranscriptionError
          ? error.message
          : "We couldn’t reach the handwriting reader. Check your connection or type your steps.";
      dispatch({ type: "transcribe-error", message });
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current?.requestId === requestId) activeRequest.current = null;
    }
  }

  async function reviewAttempt(event, customPayload = null) {
    event?.preventDefault?.();
    if (activeRequest.current) return;

    const problemToUse = customPayload?.problem ?? state.problem;
    const workToUse = customPayload?.steps
      ? customPayload.steps.join("\n")
      : state.work;

    const attempt = validateAttempt(problemToUse, workToUse);
    if (!attempt.valid) {
      dispatch({ type: "invalid", errors: attempt.errors });
      return;
    }

    // Keep state in sync if submitted via customPayload (e.g. from confirmation gate)
    if (customPayload) {
      dispatch({ type: "input", field: "problem", value: attempt.payload.problem });
      dispatch({ type: "input", field: "work", value: attempt.payload.steps.join("\n") });
    }

    cancelActiveRequests();
    const requestId = generation.current;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 45000);

    activeRequest.current = { controller, timeout, requestId };
    dispatch({ type: "review-start", requestId, steps: attempt.payload.steps });

    try {
      const analysis = await requestAnalysis(attempt.payload, { signal: controller.signal });
      if (generation.current !== requestId) return;
      if (timedOut) throw new ReviewError("The review took too long. Please try again.");
      dispatch({ type: "review-success", requestId, analysis });
    } catch (error) {
      if (generation.current !== requestId) return;
      const message = timedOut
        ? "The review took too long. Please try again."
        : error instanceof ReviewError
          ? error.message
          : "We couldn’t reach the review service. Check your connection and try again.";
      dispatch({ type: "review-error", requestId, message });
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current?.requestId === requestId) activeRequest.current = null;
    }
  }

  return {
    state,
    dispatch,
    focusRefs,
    changeInput,
    loadExample,
    resetSession,
    setInputMode,
    handleImagePrepared,
    handleImageRotated,
    handleImageRemoved,
    transcribeImage,
    reviewAttempt
  };
}
