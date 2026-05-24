import React, { useState, useEffect } from 'react';
import { API_URL } from '../../services/api';

const baseUrl = API_URL.replace(/\/api$/, '');

const ScriptUploadsReview = () => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const page = 1;
  const [limit] = useState(20);
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('pending');
  const [historyUploads, setHistoryUploads] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const token = localStorage.getItem('token');

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/uploads?status=pending&page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch uploads');
      const data = await res.json();
      // The backend returns { uploads, pagination }
      setUploads(data.uploads || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch(`${API_URL}/uploads?status=history&page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch upload history');
      const data = await res.json();
      setHistoryUploads(data.uploads || []);
    } catch (err) {
      console.error(err);
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'pending') {
      fetchPending();
    } else {
      fetchHistory();
    }
    // eslint-disable-next-line
  }, [page, viewMode]);

  const previewUrl = (filePath) => {
    if (!filePath) return null;
    return `${baseUrl}/${filePath}`.replace(/\/\\/g, '/');
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_URL}/uploads/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Approve failed');
      await fetchPending();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason) return setError('Please enter rejection reason');
    try {
      const res = await fetch(`${API_URL}/uploads/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ reason: rejectReason }) });
      if (!res.ok) throw new Error('Reject failed');
      setRejectReason('');
      setSelected(null);
      await fetchPending();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold">
          {viewMode === 'pending' ? 'Pending Script Uploads' : 'Upload History'}
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode('pending')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${viewMode === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${viewMode === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            History
          </button>
        </div>
      </div>

      {loading && viewMode === 'pending' && <div className="py-12 text-center">Loading...</div>}
      {historyLoading && viewMode === 'history' && <div className="py-12 text-center">Loading...</div>}
      {error && viewMode === 'pending' && <div className="text-red-600 mb-3">{error}</div>}
      {historyError && viewMode === 'history' && <div className="text-red-600 mb-3">{historyError}</div>}

      {viewMode === 'pending' && (
        <div className="space-y-2">
          {uploads.length === 0 && !loading && <div className="text-gray-600">No pending uploads</div>}
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-12 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {u.mime_type && u.mime_type.startsWith('image') ? (
                    <img src={previewUrl(u.file_path)} alt={u.file_name} className="object-cover w-full h-full" />
                  ) : (
                    <div className="text-sm text-gray-500">{u.file_name}</div>
                  )}
                </div>
                <div>
                  <div className="font-medium">{u.file_name}</div>
                  <div className="text-xs text-gray-500">{u.school_name} • {u.uploader_type} • {new Date(u.created_at).toLocaleString()}</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button onClick={() => setSelected(u)} className="px-3 py-1 bg-gray-100 rounded">Preview</button>
                <button onClick={() => handleApprove(u.id)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                <button onClick={() => { setSelected(u); setRejectReason(''); }} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'history' && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded text-xs xs:text-sm">
            <thead>
              <tr>
                <th className="px-2 xs:px-4 py-2 border">File</th>
                <th className="px-2 xs:px-4 py-2 border">Uploaded By</th>
                <th className="px-2 xs:px-4 py-2 border">Status</th>
                <th className="px-2 xs:px-4 py-2 border">Reviewed By</th>
                <th className="px-2 xs:px-4 py-2 border">Reviewed At</th>
                <th className="px-2 xs:px-4 py-2 border">Rejection Reason</th>
                <th className="px-2 xs:px-4 py-2 border">Uploaded At</th>
              </tr>
            </thead>
            <tbody>
              {historyUploads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">No upload history found.</td>
                </tr>
              ) : (
                historyUploads.map((upload) => (
                  <tr key={upload.id}>
                    <td className="px-2 xs:px-4 py-2 border">{upload.file_name}</td>
                    <td className="px-2 xs:px-4 py-2 border">{upload.uploader_name || upload.uploader_type || 'N/A'}</td>
                    <td className="px-2 xs:px-4 py-2 border">{upload.status}</td>
                    <td className="px-2 xs:px-4 py-2 border">{upload.reviewer_name || 'N/A'}</td>
                    <td className="px-2 xs:px-4 py-2 border">{upload.reviewed_at ? new Date(upload.reviewed_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-2 xs:px-4 py-2 border">{upload.rejection_reason || '-'}</td>
                    <td className="px-2 xs:px-4 py-2 border">{upload.created_at ? new Date(upload.created_at).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview / Reject Panel */}
      {selected && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">Preview: {selected.file_name}</h4>
              <div className="text-xs text-gray-500">{selected.school_name} • {selected.uploader_name || selected.uploader_type || 'N/A'}</div>
            </div>
            <div>
              <button onClick={() => setSelected(null)} className="text-gray-600">Close</button>
            </div>
          </div>

          <div className="mt-3">
            {selected.mime_type && selected.mime_type.startsWith('image') ? (
              <img src={previewUrl(selected.file_path)} alt={selected.file_name} className="max-w-full max-h-96 object-contain" />
            ) : (
              <iframe src={previewUrl(selected.file_path)} title="preview" className="w-full h-96 border" />
            )}
          </div>

          {viewMode === 'pending' ? (
            <div className="mt-3">
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason (required if rejecting)" className="w-full p-2 border rounded" />
              <div className="flex justify-end space-x-2 mt-2">
                <button onClick={() => handleApprove(selected.id)} className="px-4 py-2 bg-green-600 text-white rounded">Approve</button>
                <button onClick={() => handleReject(selected.id)} className="px-4 py-2 bg-red-600 text-white rounded">Reject</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div><strong>Status:</strong> {selected.status}</div>
              <div><strong>Reviewed By:</strong> {selected.reviewer_name || 'N/A'}</div>
              <div><strong>Reviewed At:</strong> {selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleString() : 'N/A'}</div>
              {selected.rejection_reason && <div><strong>Rejection Reason:</strong> {selected.rejection_reason}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScriptUploadsReview;
