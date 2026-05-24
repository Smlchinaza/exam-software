import React, { useState } from 'react';
import apiClient from '../../services/subdomainApi';
import { useAuth } from '../../context/AuthContext';

const BulkUpload = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onFileChange = (e) => {
    setFiles(Array.from(e.target.files || []));
    setMessage('');
    setError('');
  };

  const handleUpload = async () => {
    if (files.length === 0) return setError('Please select files to upload');
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const schoolId = user?.school_id || user?.schoolId || null;
      await apiClient.batchUpload('/uploads', files, { school_id: schoolId }, (p) => setProgress(p));
      setMessage('Files submitted for review.');
      setFiles([]);
      setProgress(0);
    } catch (err) {
      console.error('Bulk upload failed', err);
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Upload Scripts (School Admin)</h2>
      <p className="text-sm text-gray-600 mb-4">Select multiple images or PDFs. Files will be submitted as pending for super-admin review.</p>

      <div className="mb-4">
        <input type="file" accept="image/jpeg,image/png,application/pdf" multiple onChange={onFileChange} />
      </div>

      {files.length > 0 && (
        <div className="mb-4">
          <ul>
            {files.map((f, i) => <li key={i} className="text-sm">{f.name} ({Math.round(f.size/1024)} KB)</li>)}
          </ul>
        </div>
      )}

      {progress > 0 && <div className="mb-2">Progress: {progress}%</div>}
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {message && <div className="text-green-600 mb-2">{message}</div>}

      <div>
        <button onClick={handleUpload} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Uploading...' : 'Upload'}</button>
      </div>
    </div>
  );
};

export default BulkUpload;
