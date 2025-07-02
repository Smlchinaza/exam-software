import React, { useEffect, useState } from 'react';
import { examApi } from '../services/api';

function ActiveExams() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exams, setExams] = useState([]);

  useEffect(() => {
    const fetchActiveExams = async () => {
      try {
        setLoading(true);
        const data = await examApi.getActiveExams();
        setExams(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch active exams');
      } finally {
        setLoading(false);
      }
    };
    fetchActiveExams();
  }, []);

  if (loading) return <div className="p-8">Loading active exams...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 text-left">Active Exams</h2>
      {exams.length === 0 ? (
        <div>No active exams at the moment.</div>
      ) : (
        exams.map(exam => (
          <div key={exam._id} className="mb-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-2">{exam.title} ({exam.subject})</h3>
            <div className="mb-2 text-gray-600">Duration: {exam.duration} mins | Ends: {new Date(exam.endTime).toLocaleString()}</div>
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Student Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Score</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exam.submissions && exam.submissions.length > 0 ? (
                    exam.submissions.map(sub => (
                      <tr key={sub._id}>
                        <td className="border px-4 py-2">{sub.student?.displayName || sub.student?.firstName + ' ' + sub.student?.lastName || 'N/A'}</td>
                        <td className="border px-4 py-2">{sub.student?.email || 'N/A'}</td>
                        <td className="border px-4 py-2">{typeof sub.score === 'number' ? sub.score : '-'}</td>
                        <td className="border px-4 py-2">Submitted</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="border px-4 py-2 text-center text-gray-500">No submissions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default ActiveExams; 