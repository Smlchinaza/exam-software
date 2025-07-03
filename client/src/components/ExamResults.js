import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

function ExamResults() {
  const { examId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [exam, setExam] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError('');
        // Fetch exam details
        const examRes = await api.get(`/exams/${examId}`);
        setExam(examRes.data);
        // Fetch submissions for this exam
        const res = await api.get(`/exams/${examId}/submissions`);
        setResults(res.data);
      } catch (err) {
        setError('Failed to fetch results');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [examId]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Results for: {exam?.title}</h2>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="px-4 py-2 border">Student</th>
            <th className="px-4 py-2 border">Score</th>
            <th className="px-4 py-2 border">Submitted At</th>
          </tr>
        </thead>
        <tbody>
          {results.length === 0 ? (
            <tr><td colSpan={3} className="text-center py-4">No submissions yet.</td></tr>
          ) : results.map((sub) => (
            <tr key={sub._id}>
              <td className="border px-4 py-2">{sub.student?.displayName || sub.student?.email || sub.student}</td>
              <td className="border px-4 py-2">{sub.score}</td>
              <td className="border px-4 py-2">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ExamResults; 