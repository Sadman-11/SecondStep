import { EXAMPLES } from "./review.mjs";

export function createSession() {
  return {
    inputMode: "typed", // "typed" | "upload" | "camera"
    imageState: null, // { file, blob, previewUrl, base64, rotation }
    isTranscribing: false,
    transcriptionError: "",
    transcript: null,
    isConfirmingTranscript: false,
    revealedHintCount: 1,

    problem: "",
    work: "",
    selectedExample: null,
    errors: {},
    view: "empty",
    analysis: null,
    submittedSteps: [],
    requestId: null,
    revision: 0,
    stage: 0,
    announcement: "",
    requestError: "",
    selectedAnswer: "",
    practiceStatus: "unanswered",
    focusTarget: null,
    focusVersion: 0
  };
}

export function getOutcome(analysis) {
  if (!analysis) return { title: "", icon: "", style: "" };
  return {
    mistake_found: { title: `Let’s take another look at step ${analysis.firstIncorrectStep}`, icon: "!", style: "" },
    no_mistake_found: { title: "No mistake found in these steps", icon: "✓", style: "is-success" },
    insufficient_work: { title: "A little more working would help", icon: "i", style: "is-neutral" },
    unsupported_problem: { title: "This problem is outside our current scope", icon: "i", style: "is-neutral" }
  }[analysis.outcome];
}

function clearedReview(state) {
  return {
    ...state,
    view: "empty",
    analysis: null,
    submittedSteps: [],
    requestId: null,
    revision: state.revision + 1,
    stage: 0,
    errors: {},
    requestError: "",
    selectedAnswer: "",
    practiceStatus: "unanswered",
    revealedHintCount: 1
  };
}

function focus(state, target) {
  return { ...state, focusTarget: target, focusVersion: state.focusVersion + 1 };
}

export function sessionReducer(state, action) {
  switch (action.type) {
    case "set-input-mode": {
      if (!["typed", "upload", "camera"].includes(action.mode)) return state;
      return {
        ...state,
        inputMode: action.mode,
        transcriptionError: "",
        announcement:
          action.mode === "typed"
            ? "Switched to typing mode."
            : action.mode === "upload"
              ? "Switched to photo upload mode."
              : "Switched to camera mode."
      };
    }

    case "image-prepared": {
      return {
        ...clearedReview(state),
        imageState: action.imageState,
        transcriptionError: "",
        transcript: null,
        isConfirmingTranscript: false,
        announcement: "Photo ready. Click Read my solution to transcribe your handwriting."
      };
    }

    case "image-rotated": {
      return {
        ...clearedReview(state),
        imageState: action.imageState
      };
    }

    case "image-removed": {
      return {
        ...clearedReview(state),
        imageState: null,
        transcript: null,
        isConfirmingTranscript: false,
        transcriptionError: "",
        announcement: "Photo removed."
      };
    }

    case "transcribe-start": {
      return {
        ...state,
        isTranscribing: true,
        transcriptionError: "",
        announcement: "Reading your handwriting with Gemini…"
      };
    }

    case "transcribe-success": {
      const { transcript } = action;
      if (!transcript || transcript.outcome !== "transcribed") {
        const warning =
          transcript?.warnings?.[0] ||
          "We couldn’t clearly read a single solution from this photo. Please retake the photo or type your steps.";
        return {
          ...state,
          isTranscribing: false,
          transcript: null,
          isConfirmingTranscript: false,
          transcriptionError: warning,
          announcement: warning
        };
      }
      return {
        ...state,
        isTranscribing: false,
        transcript,
        isConfirmingTranscript: true,
        transcriptionError: "",
        announcement: "Handwriting transcribed. Please check what we read against your paper before continuing."
      };
    }

    case "transcribe-error": {
      return {
        ...state,
        isTranscribing: false,
        transcriptionError: action.message,
        announcement: action.message
      };
    }

    case "confirm-cancel": {
      return {
        ...state,
        isConfirmingTranscript: false,
        announcement: "Returned to photo preview."
      };
    }

    case "transcript-edit": {
      if (state.view === "empty") return state;
      return {
        ...clearedReview(state),
        announcement: "Your transcribed steps changed. Confirm and review again for updated feedback."
      };
    }

    case "reveal-next-hint": {
      const maxHints = state.analysis?.hints?.length || 1;
      const nextCount = Math.min(maxHints, state.revealedHintCount + 1);
      return {
        ...state,
        revealedHintCount: nextCount,
        announcement: `Hint ${nextCount} revealed.`
      };
    }

    case "input":
      if (!["problem", "work"].includes(action.field)) return state;
      return {
        ...clearedReview(state),
        [action.field]: action.value,
        selectedExample: null,
        announcement:
          state.view !== "empty"
            ? "Your work changed. Review it again for updated feedback and practice."
            : ""
      };

    case "example": {
      const example = EXAMPLES[action.name];
      if (!example) return state;
      return focus(
        {
          ...clearedReview(state),
          inputMode: "typed",
          isConfirmingTranscript: false,
          problem: example.problem,
          work: example.steps.join("\n"),
          selectedExample: action.name,
          announcement: `${example.label} example loaded. These steps include a mistake to explore. Edit them or select Review my steps.`
        },
        "problem"
      );
    }

    case "reset":
      return focus(
        {
          ...createSession(),
          revision: state.revision + 1,
          focusVersion: state.focusVersion,
          announcement: "A fresh start. Add a new problem or choose an example."
        },
        "problem"
      );

    case "restore":
      return { ...clearedReview(state), selectedExample: null, announcement: "" };

    case "invalid":
      return focus(
        {
          ...state,
          errors: action.errors,
          announcement: "Check the highlighted fields before requesting a review."
        },
        Object.keys(action.errors)[0]
      );

    case "review-start":
      return {
        ...clearedReview(state),
        view: "loading",
        requestId: action.requestId,
        submittedSteps: [...action.steps],
        stage: 1,
        announcement: "Reviewing your steps…"
      };

    case "review-success":
      if (state.view !== "loading" || state.requestId !== action.requestId) return state;
      return focus(
        {
          ...state,
          view: "result",
          analysis: action.analysis,
          revealedHintCount: 1,
          announcement: `${getOutcome(action.analysis).title}. ${
            action.analysis.practice
              ? "Your feedback and practice check are ready below."
              : "Read the feedback, then update your attempt."
          }`
        },
        "feedback"
      );

    case "review-error":
      if (state.view !== "loading" || state.requestId !== action.requestId) return state;
      return focus(
        {
          ...state,
          view: "error",
          stage: 0,
          requestError: action.message,
          announcement: action.message
        },
        "feedback"
      );

    case "practice-open":
      return state.analysis?.practice ? focus({ ...state, stage: 2 }, "practice") : state;

    case "practice-select":
      if (
        state.practiceStatus !== "unanswered" ||
        !state.analysis?.practice?.options.some((option) => option.id === action.id)
      ) {
        return state;
      }
      return { ...state, selectedAnswer: action.id, stage: 2 };

    case "practice-submit": {
      const practice = state.analysis?.practice;
      if (!practice || state.practiceStatus === "correct") return state;
      if (state.practiceStatus === "incorrect") {
        return focus({ ...state, selectedAnswer: "", practiceStatus: "unanswered" }, "firstOption");
      }
      if (!state.selectedAnswer) return state;
      const correct = state.selectedAnswer === practice.correctOptionId;
      const next = { ...state, stage: 2, practiceStatus: correct ? "correct" : "incorrect" };
      return correct ? focus(next, "practiceReset") : next;
    }

    default:
      return state;
  }
}
