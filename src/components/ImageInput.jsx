import { useRef, useState } from "react";
import Icon from "./Icon.jsx";
import CameraCapture from "./CameraCapture.jsx";
import { prepareImage, validateImageFile } from "../lib/image.mjs";

export default function ImageInput({
  inputMode,
  onSetInputMode,
  imageState,
  onImagePrepared,
  onImageRotated,
  onImageRemoved,
  onTranscribe,
  isTranscribing,
  transcriptionError,
  typedProblem,
  onTypedProblemChange
}) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setLocalError(null);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setLocalError(validation.error);
      return;
    }

    try {
      setIsProcessing(true);
      const prepared = await prepareImage(file, 0);
      if (imageState?.previewUrl) {
        URL.revokeObjectURL(imageState.previewUrl);
      }
      onImagePrepared({
        file,
        blob: prepared.blob,
        previewUrl: prepared.previewUrl,
        base64: prepared.base64,
        rotation: 0
      });
    } catch (err) {
      setLocalError(err.message || "Could not prepare the image. Please try another photo.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRotate() {
    if (!imageState?.file) return;
    setLocalError(null);
    try {
      setIsProcessing(true);
      const newRotation = ((imageState.rotation || 0) + 90) % 360;
      const prepared = await prepareImage(imageState.file, newRotation);
      if (imageState?.previewUrl) {
        URL.revokeObjectURL(imageState.previewUrl);
      }
      onImageRotated({
        file: imageState.file,
        blob: prepared.blob,
        previewUrl: prepared.previewUrl,
        base64: prepared.base64,
        rotation: newRotation
      });
    } catch (err) {
      setLocalError(err.message || "Failed to rotate image.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  return (
    <div className="image-input-container">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          e.target.value = "";
        }}
      />

      {inputMode === "camera" && !imageState?.previewUrl && (
        <CameraCapture
          onCapture={(blob) => handleFile(blob)}
          onCancel={() => onSetInputMode("typed")}
        />
      )}

      {inputMode === "upload" && !imageState?.previewUrl && (
        <div
          className={`dropzone ${dragActive ? "drag-active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload photo of your math solution"
        >
          <div className="dropzone-inner">
            <span className="dropzone-icon">
              <Icon name="upload" />
            </span>
            <p className="dropzone-prompt">
              <strong>Choose a photo</strong> or drop it here
            </p>
            <p className="dropzone-meta">JPEG, PNG or WebP · one algebra problem per photo</p>
          </div>
        </div>
      )}

      {(localError || transcriptionError) && (
        <div className="image-error-banner" role="alert">
          <Icon name="alert" />
          <p>{localError || transcriptionError}</p>
        </div>
      )}

      {isProcessing && (
        <div className="image-processing-banner">
          <span className="loading-spinner" aria-hidden="true" />
          <p>Preparing image…</p>
        </div>
      )}

      {imageState?.previewUrl && (
        <div className="image-preview-card">
          <div className="preview-image-wrapper">
            <img
              src={imageState.previewUrl}
              alt="Your math solution preview"
              className="preview-img"
            />
          </div>

          <div className="preview-toolbar">
            <button
              type="button"
              className="text-button toolbar-button"
              onClick={handleRotate}
              disabled={isProcessing || isTranscribing}
              title="Rotate 90 degrees clockwise"
            >
              <Icon name="rotate" />
              <span>Rotate 90°</span>
            </button>
            <button
              type="button"
              className="text-button toolbar-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isTranscribing}
            >
              <Icon name="upload" />
              <span>Replace</span>
            </button>
            <button
              type="button"
              className="text-button toolbar-button is-danger"
              onClick={onImageRemoved}
              disabled={isProcessing || isTranscribing}
            >
              <Icon name="trash" />
              <span>Remove</span>
            </button>
          </div>

          <div className="preview-problem-override">
            <div className="field-label">
              <label htmlFor="image-problem-input">Your problem</label>
              <span className="field-pill">Optional if it’s in the photo</span>
            </div>
            <input
              id="image-problem-input"
              type="text"
              placeholder="e.g. 2(x + 3) = 14"
              value={typedProblem || ""}
              onChange={(e) => onTypedProblemChange(e.target.value)}
              disabled={isTranscribing}
            />
          </div>

          <button
            type="button"
            className="button button-primary read-solution-btn"
            onClick={onTranscribe}
            disabled={isProcessing || isTranscribing}
          >
            {isTranscribing ? (
              <>
                <span className="loading-spinner btn-spinner" aria-hidden="true" />
                <span>Reading your handwriting…</span>
              </>
            ) : (
              <>
                <span>Read my solution</span>
                <Icon name="arrow" className="button-arrow" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
