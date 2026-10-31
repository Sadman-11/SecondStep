import { EXAMPLES, LIMITS, splitSteps } from "../lib/review.mjs";
import Icon from "./Icon.jsx";
import ImageInput from "./ImageInput.jsx";
import TranscriptConfirm from "./TranscriptConfirm.jsx";

const MODES = [
  ["typed", "pencil", "Type lines"],
  ["upload", "upload", "Upload image"],
  ["camera", "camera", "Camera"]
];

function PanelHeading({ title, description, onReset }) {
  return (
    <div className="panel-heading">
      <div>
        <h2 id="attempt-title">{title}</h2>
        <p>{description}</p>
      </div>
      <button
        type="button"
        id="reset-button"
        className="clear-button"
        aria-label="Clear workspace"
        onClick={onReset}
      >
        <Icon name="reset" />
        <span>Clear</span>
      </button>
    </div>
  );
}

export default function AttemptForm({
  state,
  focusRefs,
  onChange,
  onExample,
  onReset,
  onSubmit,
  onSetInputMode,
  onImagePrepared,
  onImageRotated,
  onImageRemoved,
  onTranscribe,
  onConfirmAndReview,
  onSwitchToTyped,
  onTranscriptEdit
}) {
  const loading = state.view === "loading";

  if (state.isConfirmingTranscript && state.transcript) {
    return (
      <section className="panel worksheet is-confirming" aria-labelledby="attempt-title">
        <PanelHeading
          title="Did we read it right?"
          description="Check our reading against your photo, fix anything that looks off, then we’ll check it."
          onReset={onReset}
        />
        <TranscriptConfirm
          imageState={state.imageState}
          transcript={state.transcript}
          focusRefs={focusRefs}
          onDraftChange={onTranscriptEdit}
          onConfirmAndReview={onConfirmAndReview}
          onSwitchToTyped={onSwitchToTyped}
          onRetakePhoto={onImageRemoved}
          isReviewing={loading}
          reviewError={state.view === "error" ? state.requestError : null}
        />
      </section>
    );
  }

  return (
    <section className="panel worksheet" aria-labelledby="attempt-title">
      <PanelHeading
        title="Your math space"
        description="Pop in your problem and show us what you tried."
        onReset={onReset}
      />

      <div className="mode-tabs" role="tablist" aria-label="How do you want to share your work?">
        {MODES.map(([mode, icon, label]) => (
          <button
            key={mode}
            type="button"
            role="tab"
            id={`mode-tab-${mode}`}
            aria-selected={state.inputMode === mode}
            className={state.inputMode === mode ? "selected" : ""}
            onClick={() => onSetInputMode(mode)}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {state.inputMode !== "typed" ? (
        <ImageInput
          inputMode={state.inputMode}
          onSetInputMode={onSetInputMode}
          imageState={state.imageState}
          onImagePrepared={onImagePrepared}
          onImageRotated={onImageRotated}
          onImageRemoved={onImageRemoved}
          onTranscribe={onTranscribe}
          isTranscribing={state.isTranscribing}
          transcriptionError={state.transcriptionError}
          typedProblem={state.problem}
          onTypedProblemChange={(val) => onChange("problem", val)}
        />
      ) : (
        <>
          <p className="field-kicker" id="samples-label">Not sure where to start? Try one!</p>
          <div className="samples" role="group" aria-labelledby="samples-label">
            {Object.entries(EXAMPLES).map(([name, example]) => (
              <button
                key={name}
                type="button"
                data-example={name}
                aria-pressed={state.selectedExample === name}
                onClick={() => onExample(name)}
              >
                <span>{example.label}</span>
                <code>{example.problem}</code>
              </button>
            ))}
          </div>

          <div className="rule" aria-hidden="true" />

          <form id="attempt-form" noValidate onSubmit={onSubmit}>
            <div className="field-group">
              <div className="field-label">
                <label htmlFor="problem-input">Your problem</label>
                <span className="field-pill">Linear equation</span>
              </div>
              <input
                ref={(node) => {
                  focusRefs.current.problem = node;
                }}
                id="problem-input"
                name="problem"
                type="text"
                maxLength={LIMITS.problem}
                placeholder="e.g. 2(x + 3) = 14"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="problem-error"
                aria-invalid={state.errors.problem ? true : undefined}
                value={state.problem}
                onChange={(event) => onChange("problem", event.target.value)}
                required
              />
              <p id="problem-error" className="field-error" hidden={!state.errors.problem}>
                {state.errors.problem}
              </p>
            </div>

            <div className="field-group">
              <div className="field-label">
                <label htmlFor="steps-input">What did you try?</label>
                <span className="field-pill">One line at a time</span>
              </div>
              <textarea
                ref={(node) => {
                  focusRefs.current.steps = node;
                }}
                id="steps-input"
                name="steps"
                rows={4}
                maxLength={LIMITS.work}
                placeholder={"2x + 6 = 14\n2x = 8\nx = 4"}
                autoComplete="off"
                spellCheck={false}
                aria-describedby="steps-help steps-error"
                aria-invalid={state.errors.steps ? true : undefined}
                value={state.work}
                onChange={(event) => onChange("work", event.target.value)}
                required
              />
              <div className="field-footnote">
                <p id="steps-help" className="field-help">Put each step on its own line.</p>
                <span id="step-count" className="field-meta">
                  {splitSteps(state.work).length} / {LIMITS.steps} lines
                </span>
              </div>
              <p id="steps-error" className="field-error" hidden={!state.errors.steps}>
                {state.errors.steps}
              </p>
            </div>

            <button type="submit" id="review-button" className="button button-primary review-button" disabled={loading}>
              <span id="review-label">{loading ? "Checking your steps…" : "Review my steps"}</span>
              <Icon name="arrow" className="button-arrow" />
            </button>
          </form>
        </>
      )}
    </section>
  );
}
