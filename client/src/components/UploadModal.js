import React, { useState } from 'react';
import StateSelector from './StateSelector';
import SchoolSelector from './SchoolSelector';
import apiClient from '../services/subdomainApi';

const UploadModal = ({ isOpen, onClose }) => {
  const [state, setState] = useState(null);
  const [school, setSchool] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [durationMs, setDurationMs] = useState(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [success, setSuccess] = useState(false);

  const onFileChange = (e) => {
    const list = Array.from(e.target.files || []);
    // Limit to 2 files for unauthenticated teachers
    if (list.length > 2) {
      setError('Teachers may upload up to 2 files at once.');
      return;
    }
    setFiles(list);
    setError('');
  };

  const handleSubmit = async () => {
    if (!school || !school.id) return setError('Please select a valid school before submitting');
    if (files.length === 0) return setError('Please choose one or two files');

    setLoading(true);
    setError('');
    setMessage('');
    setProgress(0);
    setSuccess(false);
    setStartTime(Date.now());
    const totalBytesLocal = files.reduce((s, f) => s + (f.size || 0), 0);
    setTotalBytes(totalBytesLocal);
    try {
      const resp = await apiClient.batchUpload('/uploads', files, { school_id: school.id }, (p) => setProgress(p));

      const endTime = Date.now();
      const dur = endTime - startTime;
      setDurationMs(dur);

      // Update success state and metrics
      setUploadedCount((resp.data && resp.data.files && resp.data.files.length) || files.length);
      setMessage('Upload submitted for review. Thank you.');
      setSuccess(true);
      setFiles([]);

      // Non-blocking analytics event
      try {
        await apiClient.post('/analytics/events', {
          event: 'script_upload',
          files_count: files.length,
          total_bytes: totalBytesLocal,
          duration_ms: dur,
          school_id: school.id
        });
      } catch (e) {
        // swallow analytics errors
        console.debug('Analytics event failed', e);
      }
    } catch (err) {
      console.error('Upload failed', err);
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold">Upload Script (Teacher)</h3>
          <button onClick={onClose} className="text-sm sm:text-base text-gray-500">Close</button>
        </div>

        <div className="space-y-4">
          {!success ? (
            <>
              <div>
                <StateSelector selectedState={state} onStateChange={setState} />
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">School</label>
                <SchoolSelector selectedState={state} selectedSchool={school} onSchoolChange={setSchool} />
              </div>

              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">Files (jpg, png, pdf) - max 2 for teachers</label>
                <input type="file" accept="image/jpeg,image/png,application/pdf" multiple onChange={onFileChange} disabled={loading} />
                {files.length > 0 && (
                  <ul className="mt-2">
                    {files.map((f, i) => <li key={i} className="text-sm sm:text-base">{f.name} ({Math.round(f.size/1024)} KB)</li>)}
                  </ul>
                )}
              </div>

              {error && <div className="text-sm sm:text-base text-red-600">{error}</div>}

              {loading && (
                <div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="text-sm sm:text-base text-gray-600 mt-2">Uploading... {progress}%</div>
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm md:text-base bg-blue-600 text-white rounded-lg">{loading ? 'Uploading...' : 'Submit'}</button>
              </div>
            </>
          ) : (
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <h4 className="text-base sm:text-lg md:text-xl font-bold text-green-800 mb-2">Upload Submitted</h4>
              <p className="text-sm sm:text-base text-gray-700 mb-4">Thank you — your files have been submitted for review.</p>
              <div className="space-y-2 text-left max-w-sm mx-auto text-sm sm:text-base">
                <div className="flex justify-between"><span className="font-medium">Files</span><span>{uploadedCount}</span></div>
                <div className="flex justify-between"><span className="font-medium">Total size</span><span>{Math.round((totalBytes||0)/1024)} KB</span></div>
                <div className="flex justify-between"><span className="font-medium">Upload time</span><span>{durationMs ? `${Math.round(durationMs/1000)}s` : '—'}</span></div>
              </div>
              <div className="mt-4 flex justify-center gap-4">
                <button onClick={() => { setSuccess(false); setMessage(''); setProgress(0); }} className="px-4 py-2 text-sm sm:text-base bg-white border rounded-lg">Upload more</button>
                <a href="/teacher/upload-results" className="px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg">View uploads</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
