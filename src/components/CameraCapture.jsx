import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let canceled = false;

    async function startCamera() {
      setStarting(true);
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported in this browser. Please upload an image file instead.");
        setStarting(false);
        return;
      }

      if (window.isSecureContext === false) {
        setError("Camera access requires a secure HTTPS connection. Please upload an image instead.");
        setStarting(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });

        if (canceled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStarting(false);
      } catch (err) {
        if (canceled) return;
        setStarting(false);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Camera permission was denied. Please allow camera access in your browser or upload an image.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setError("No camera device was detected. Please upload an image file instead.");
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setError("The camera is currently in use by another application. Please close other camera apps and retry.");
        } else {
          setError(`Could not open camera: ${err.message}. Please upload an image instead.`);
        }
      }
    }

    startCamera();

    return () => {
      canceled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  function handleCaptureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop stream immediately after capture
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
        } else {
          setError("Failed to capture image frame. Please try again.");
        }
      },
      "image/jpeg",
      0.9
    );
  }

  function handleCancel() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    onCancel();
  }

  return (
    <div className="camera-viewfinder-card">
      <div className="camera-header">
        <div className="camera-title">
          <Icon name="camera" />
          <span>Point camera at your worked math</span>
        </div>
        <button type="button" className="text-button camera-close-btn" onClick={handleCancel} aria-label="Close camera">
          <Icon name="close" />
        </button>
      </div>

      {error ? (
        <div className="camera-error-banner" role="alert">
          <Icon name="alert" />
          <p>{error}</p>
          <div className="camera-error-actions">
            <button type="button" className="button button-secondary" onClick={handleCancel}>
              Use upload or type instead
            </button>
          </div>
        </div>
      ) : (
        <div className="video-container">
          {starting && (
            <div className="video-loading">
              <span className="loading-spinner" aria-hidden="true" />
              <p>Starting camera…</p>
            </div>
          )}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`camera-video ${starting ? "hidden" : ""}`}
            aria-label="Live camera view"
          />
          <div className="camera-overlay-frame" aria-hidden="true">
            <div className="frame-corner top-left" />
            <div className="frame-corner top-right" />
            <div className="frame-corner bottom-left" />
            <div className="frame-corner bottom-right" />
            <p className="frame-hint">Fit problem & steps inside the frame</p>
          </div>
        </div>
      )}

      {!error && (
        <div className="camera-controls">
          <button
            type="button"
            className="button button-primary camera-shutter-btn"
            onClick={handleCaptureFrame}
            disabled={starting}
          >
            <Icon name="camera" />
            <span>Capture photo</span>
          </button>
          <button type="button" className="button button-secondary" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

