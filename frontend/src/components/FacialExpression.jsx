import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import axios from "axios";

export default function FacialExpression({ setSongs }) {
  const videoRef = useRef();
  const streamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [error, setError] = useState("");
  const [detectionRunning, setDetectionRunning] = useState(false);
  const detectionTimerRef = useRef(null);
  const lastMoodRef = useRef(null);

  const loadModels = async () => {
    const MODEL_URL = "/models";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    setModelsLoaded(true);
  };

  const startVideo = async () => {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Camera API not supported in this browser. Open in Chrome/Edge."
        );
        return;
      }
      // Ask permission on a user gesture to ensure the prompt shows.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStarted(true);
    } catch (err) {
      console.error("Error accessing webcam: ", err);
      if (err?.name === "NotAllowedError")
        setError(
          "Permission denied. Allow camera access for this site and reload."
        );
      else if (err?.name === "NotFoundError")
        setError("No camera found. Connect a webcam and try again.");
      else if (err?.name === "NotReadableError")
        setError("Camera is in use by another app. Close it and try again.");
      else
        setError(
          "Could not access the camera. Check site permissions and OS privacy settings."
        );
    }
  };

  const stopVideo = () => {
    setError("");
    try {
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch (e) {
      console.warn("Error stopping camera:", e);
    } finally {
      streamRef.current = null;
      setCameraStarted(false);
      // also stop detection if running
      if (detectionTimerRef.current) {
        clearInterval(detectionTimerRef.current);
        detectionTimerRef.current = null;
      }
      setDetectionRunning(false);
    }
  };

  const detectMoodTick = async () => {
    if (!cameraStarted || !modelsLoaded || !videoRef.current) return;
    try {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (!detections || detections.length === 0) {
        // no face; do nothing
        return;
      }

      let best = 0;
      let mood = "";
      const exps = detections[0].expressions || {};
      for (const k of Object.keys(exps)) {
        if (exps[k] > best) {
          best = exps[k];
          mood = k;
        }
      }

      if (!mood) return;
      if (lastMoodRef.current === mood) return; // only fetch when mood changes

      lastMoodRef.current = mood;
      axios
        .get(`http://localhost:3000/songs?mood=${mood}`)
        .then((response) => {
          setSongs(response.data.songs);
        })
        .catch(() => {});
    } catch (e) {
      // swallow detection errors in the loop but keep a debug trace
      console.debug("detectMoodTick error", e);
    }
  };

  const startDetection = () => {
    if (detectionRunning || !cameraStarted || !modelsLoaded) return;
    setDetectionRunning(true);
    // run every 1.5s to reduce CPU usage and API calls
    detectionTimerRef.current = setInterval(detectMoodTick, 1500);
  };

  const stopDetection = () => {
    if (detectionTimerRef.current) {
      clearInterval(detectionTimerRef.current);
      detectionTimerRef.current = null;
    }
    setDetectionRunning(false);
  };

  useEffect(() => {
    // Load models on mount only; request camera on user click to trigger the permission prompt.
    loadModels();
    // Cleanup: stop camera tracks on unmount
    return () => {
      if (detectionTimerRef.current) {
        clearInterval(detectionTimerRef.current);
        detectionTimerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="mood-element flex items-center justify-center gap-20 pt-10 ">
        
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="user-video-feed border-2 rounded-xl overflow-hidden text-zinc-400 bg-zinc-900 lg:h-[28vh] lg:w-[18vw] sm:h-[10vh] sm:w-[10vw]"
      />
      <div className="flex flex-col gap-2">
        <button
          className={`text-white ${
            cameraStarted ? "bg-red-500" : "bg-blue-500"
          } px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50`}
          onClick={cameraStarted ? stopVideo : startVideo}
          disabled={!modelsLoaded}
        >
          {cameraStarted
            ? "Stop Camera"
            : modelsLoaded
            ? "Allow Camera"
            : "Loading Models…"}
        </button>
        <button
          className={`text-white ${
            detectionRunning ? "bg-red-500" : "bg-green-500"
          } px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50`}
          onClick={detectionRunning ? stopDetection : startDetection}
          disabled={!cameraStarted || !modelsLoaded}
        >
          {detectionRunning ? "Stop Detect Mood" : "Start Detect Mood"}
        </button>
        {error && (
          <span className="text-red-400 text-sm max-w-xs">{error}</span>
        )}
      </div>
    </div>
  );
}
