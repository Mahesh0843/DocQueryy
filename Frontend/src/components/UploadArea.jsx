import React, { useState } from "react";
import api from "../api";

export default function UploadArea({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setStatus('Uploading...');
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.success) {
        setStatus('Uploaded: ' + (res.data.filename || 'OK'));
      } else if (res.data && res.data.message) {
        setStatus(res.data.message);
      } else {
        setStatus('Upload response received');
      }
      setFile(null);
      onUploaded && onUploaded();
    } catch (err) {
      const serverMessage = err?.response?.data?.error || err?.response?.data?.message;
      if (err?.response?.status === 401) {
        setError('Not authenticated. Please log in before uploading.');
      } else {
        setError(serverMessage || err.message || 'Upload failed');
      }
      setStatus(null);
    }
  };

  return (
    <div className="upload-area">
      <div className="upload-left">
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button className="btn" onClick={handleUpload} disabled={!file}>Upload</button>
      </div>
      <div className="upload-right">
        {status && <div className="muted">{status}</div>}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
