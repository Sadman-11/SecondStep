import { useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import { LIMITS } from "../lib/review.mjs";

export default function TranscriptConfirm({
  imageState,
  transcript,
  focusRefs,
  onDraftChange,
  onConfirmAndReview,
  onSwitchToTyped,
  onRetakePhoto,
  isReviewing,
  reviewError
}) {
  const [problem, setProblem] = useState(transcript?.problem || "");
  const [steps, setSteps] = useState(
    transcript?.steps?.map((s) => s.plain) || [""]
  );
  const [validationError, setValidationError] = useState(null);

  const hasUnclearMarkers = useMemo(() => {
    return (
      problem.toLowerCase().includes("[unclear]") ||
      steps.some((s) => s.toLowerCase().includes("[unclear]"))
    );
  }, [problem, steps]);

  function handleStepChange(index, value) {
    setValidationError(null);
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
    onDraftChange?.();
  }

  function handleAddStep() {
    if (steps.length >= LIMITS.steps) return;
    setSteps([...steps, ""]);
    onDraftChange?.();
  }

  function handleRemoveStep(index) {
    if (steps.length <= 1) return;
    const updated = steps.filter((_, i) => i !== index);
    setSteps(updated);
    onDraftChange?.();
  }

  function handleConfirm() {
    setValidationError(null);

    const trimmedProblem = problem.trim();
    if (!trimmedProblem) {
      setValidationError("Enter the problem equation.");
      return;
    }

    if (hasUnclearMarkers) {
      setValidationError(
        "Replace any [unclear] markers with the actual symbols from your paper before checking."
      );
      return;
    }

    const filteredSteps = steps.map((s) => s.trim()).filter(Boolean);
    if (filteredSteps.length === 0) {
      setValidationError("Enter at least one step.");
      return;
    }

    if (filteredSteps.length > LIMITS.steps) {
      setValidationError(`Limit your derivation to ${LIMITS.steps} lines.`);
      return;
    }

    onConfirmAndReview({
      problem: trimmedProblem,
      steps: filteredSteps
    });
  }

  return (
    <div className="transcript-confirm-card">
      <div className="confirm-body-split">
        <div className="confirm-photo-pane">
          <p className="field-kicker">Your photo</p>
          <div className="confirm-photo-wrapper">
            <img
              src={imageState?.previewUrl}
              alt="Handwritten solution"
              className="confirm-photo-img"
            />
          </div>
          <div className="confirm-photo-actions">
            <button type="button" className="text-button" onClick={onRetakePhoto}>
              <Icon name="camera" />
              <span>Replace image</span>
            </button>
          </div>
        </div>

        <div className="confirm-edit-pane">
          {transcript?.warnings?.length > 0 && (
            <div className="transcript-warning-list" role="status">
              {transcript.warnings.map((w, idx) => (
                <div key={idx} className="warning-item">
                  <Icon name="alert" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {transcript?.problemUnclear && (
            <div className="unclear-problem-banner" role="alert">
              <Icon name="alert" />
              <span>Equation was not clearly visible in the image. Enter it below.</span>
            </div>
          )}

          {hasUnclearMarkers && (
            <div className="unclear-tokens-banner" role="alert">
              <Icon name="alert" />
              <span>
                Ambiguous characters are marked <strong>[unclear]</strong>. Edit those lines before checking.
              </span>
            </div>
          )}

          {validationError && (
            <div className="field-error-banner" role="alert">
              <Icon name="alert" />
              <span>{validationError}</span>
            </div>
          )}

          {reviewError && (
            <div className="field-error-banner" role="alert">
              <Icon name="alert" />
              <span>{reviewError}</span>
            </div>
          )}

          <div className="field-group">
            <div className="field-label">
              <label htmlFor="confirm-problem-input">Your problem</label>
              <span className="field-pill">Editable</span>
            </div>
            <input
              id="confirm-problem-input"
              type="text"
              value={problem}
              maxLength={LIMITS.problem}
              onChange={(e) => {
                setValidationError(null);
                setProblem(e.target.value);
                onDraftChange?.();
              }}
              placeholder="e.g. 2(x + 3) = 14"
              className={hasUnclearMarkers && problem.toLowerCase().includes("[unclear]") ? "has-unclear" : ""}
            />
          </div>

          <div className="field-group">
            <div className="field-label">
              <span className="field-label-text" id="confirm-steps-heading">What we read</span>
              <span className="field-pill">
                {steps.filter((s) => s.trim()).length} / {LIMITS.steps} lines
              </span>
            </div>

            <div className="confirm-step-list" role="group" aria-labelledby="confirm-steps-heading">
              {steps.map((step, index) => {
                const isStepUnclear =
                  transcript?.unclearSteps?.includes(index + 1) ||
                  step.toLowerCase().includes("[unclear]");
                return (
                  <div
                    key={index}
                    className={`confirm-step-row ${isStepUnclear ? "is-unclear-step" : ""}`}
                  >
                    <span className="step-badge" aria-hidden="true">{index + 1}</span>
                    <input
                      ref={(node) => {
                        if (focusRefs?.current) {
                          focusRefs.current[`confirmStep_${index + 1}`] = node;
                        }
                      }}
                      id={`confirm-step-input-${index + 1}`}
                      type="text"
                      value={step}
                      maxLength={LIMITS.step}
                      placeholder={`Line ${index + 1}`}
                      aria-label={`Line ${index + 1}`}
                      onChange={(e) => handleStepChange(index, e.target.value)}
                      className={`step-input ${isStepUnclear ? "has-unclear" : ""}`}
                    />
                    {steps.length > 1 && (
                      <button
                        type="button"
                        className="step-remove-btn"
                        onClick={() => handleRemoveStep(index)}
                        title="Remove line"
                        aria-label={`Remove line ${index + 1}`}
                      >
                        <Icon name="close" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {steps.length < LIMITS.steps && (
              <button type="button" className="text-button add-step-btn" onClick={handleAddStep}>
                + Add line
              </button>
            )}
          </div>

          <div className="confirm-actions">
            <button
              type="button"
              className="button button-primary confirm-review-btn"
              onClick={handleConfirm}
              disabled={isReviewing || hasUnclearMarkers}
            >
              {isReviewing ? (
                <>
                  <span className="loading-spinner btn-spinner" aria-hidden="true" />
                  <span>Checking your steps…</span>
                </>
              ) : (
                <>
                  <span>Looks right — review my steps</span>
                  <Icon name="arrow" className="button-arrow" />
                </>
              )}
            </button>

            <button
              type="button"
              className="text-button switch-typed-btn"
              onClick={() => onSwitchToTyped(problem, steps.filter((s) => s.trim()).join("\n"))}
              disabled={isReviewing}
            >
              <Icon name="pencil" />
              <span>Edit as typed lines</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
