import React, { useState, useEffect } from 'react';
import { API_URL } from '../../services/api';

const baseUrl = API_URL.replace(/\/api$/, '');

const ScriptUploadsReview = () => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selected, setSelected] = useState(null);
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

  useEffect(() => {
    fetchPending();
    // eslint-disable-next-line
  }, [page]);

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
      <h3 className="text-lg font-semibold mb-3">Pending Script Uploads</h3>

      {loading && <div className="py-12 text-center">Loading...</div>}
      {error && <div className="text-red-600 mb-3">{error}</div>}

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

      {/* Preview / Reject Panel */}
      {selected && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">Preview: {selected.file_name}</h4>
              <div className="text-xs text-gray-500">{selected.school_name} • {selected.uploader_type}</div>
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

          <div className="mt-3">
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason (required if rejecting)" className="w-full p-2 border rounded" />
            <div className="flex justify-end space-x-2 mt-2">
              <button onClick={() => handleApprove(selected.id)} className="px-4 py-2 bg-green-600 text-white rounded">Approve</button>
              <button onClick={() => handleReject(selected.id)} className="px-4 py-2 bg-red-600 text-white rounded">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptUploadsReview;
