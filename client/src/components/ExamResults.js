import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submissionApi, examApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

function ExamResults() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);
  const [exam, setExam] = useState(null);

  useEffect(() => {
    const fetchSubmissionDetails = async () => {
      try {
        setLoading(true);
        setError('');
        
        if (!submissionId) {
          setError('No submission ID provided');
          return;
        }
        
        // Fetch submission details with answers
        const submissionData = await submissionApi.getSubmission(submissionId);
        setSubmission(submissionData);
        
        // Fetch exam details if needed
        if (submissionData.exam_id) {
          const examData = await examApi.getExam(submissionData.exam_id);
          setExam(examData);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch submission results');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubmissionDetails();
  }, [submissionId]);

  if (loading) return <div className="p-8 text-center">Loading results...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!submission) return <div className="p-8">No submission found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">{exam?.title || 'Exam Results'}</h2>
      
      <div className="bg-gray-100 p-4 rounded mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Status</p>
            <p className="font-bold capitalize">{submission.status}</p>
          </div>
          <div>
            <p className="text-gray-600">Score</p>
            <p className="font-bold">{submission.total_score || 'Not graded'}</p>
          </div>
          <div>
            <p className="text-gray-600">Started At</p>
            <p className="text-sm">{new Date(submission.started_at).toLocaleString()}</p>
          </div>
          {submission.submitted_at && (
            <div>
              <p className="text-gray-600">Submitted At</p>
              <p className="text-sm">{new Date(submission.submitted_at).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
      
      {submission.answers && submission.answers.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">Your Answers</h3>
          {submission.answers.map((answer, idx) => (
            <div key={idx} className="border p-4 mb-4 rounded">
              <p className="font-bold mb-2">Question {idx + 1}</p>
              <p className="text-gray-700 mb-2">{answer.answer}</p>
              {answer.score !== undefined && (
                <p className="text-sm text-green-600">Score: {answer.score}</p>
              )}
            </div>
          ))}
        </div>
      )}
      
      <button
        onClick={() => navigate('/student/dashboard')}
        className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

export default ExamResults;