import React from 'react';
import { gradeToRemark } from '../../utils/resultUtils';

const ResultTable = ({ subjects }) => {
  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A1': return 'bg-[#004400] text-white';
      case 'B2':
      case 'B3': return 'bg-green-600 text-white';
      case 'C4':
      case 'C5':
      case 'C6': return 'bg-green-500 text-white';
      case 'D7': return 'bg-amber-600 text-white';
      case 'E8': return 'bg-orange-500 text-white';
      case 'F9': return 'bg-red-700 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-[#006600] font-semibold';
    if (score >= 50) return 'text-[#b07800] font-semibold';
    return 'text-[#b30000] font-semibold';
  };

  return (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse border-2 border-[#006600]" role="table" aria-label="Student Academic Performance Table">
        <thead>
          <tr className="bg-[#006600] text-white">
            <th rowSpan={2} className="border border-white p-1 text-left text-xs" scope="col">SUBJECTS</th>
            <th colSpan={3} className="border border-white p-1 text-center text-xs" scope="colgroup">Continuous Assessment (40 Marks)</th>
            <th rowSpan={2} className="border border-white p-1 text-center text-xs" scope="col">Examination</th>
            <th colSpan={2} className="border border-white p-1 text-center text-xs" scope="colgroup">Result</th>
            <th colSpan={3} className="border border-white p-1 text-center text-xs" scope="colgroup">Analysis</th>
          </tr>
          <tr className="bg-[#006600] text-white">
            <th className="border border-white p-1 text-center text-xs" scope="col">Assess.1</th>
            <th className="border border-white p-1 text-center text-xs" scope="col">Assess.2</th>
            <th className="border border-white p-1 text-center text-xs" scope="col">C.A Test</th>
            <th className="border border-white p-1 text-center text-xs" scope="col">Exam Score</th>
            <th className="border border-white p-1 text-center text-xs" scope="col">Total</th>
            <th className="border border-white p-1 text-center text-xs" scope="col">Grade</th>
            <th className="border border-white p-1 text-center text-xs" scope="col">Position</th>
            <th className="border border-white p-1 text-center text-xs" scope="col">Highest</th>
            <th className="border border-white p-1 text-center text-xs" scope="col">Remark</th>
          </tr>
          <tr className="bg-gray-200">
            <th className="border border-[#006600] p-1 text-left text-xs font-normal" scope="col">Maximum Score</th>
            <th className="border border-[#006600] p-1 text-center text-xs font-normal" scope="col">15</th>
            <th className="border border-[#006600] p-1 text-center text-xs font-normal" scope="col">15</th>
            <th className="border border-[#006600] p-1 text-center text-xs font-normal" scope="col">10</th>
            <th className="border border-[#006600] p-1 text-center text-xs font-normal" scope="col">60</th>
            <th className="border border-[#006600] p-1 text-center text-xs font-normal" scope="col">100</th>
            <th className="border border-[#006600] p-1 text-center text-xs font-normal" scope="col"></th>
            <th className="border border-[#006600] p-1 text-center text-xs font-normal" scope="col"></th>
            <th className="border border-[#006600] p-1 text-center text-xs font-normal" scope="col"></th>
            <th className="border border-[#006600] p-1 text-center text-xs font-normal" scope="col"></th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject, index) => (
            <tr 
              key={index}
              className={
                index % 2 === 0 ? 'bg-white' : 'bg-[#faf7f0]'
              }
              {...(subject.total < 40 ? { role: "alert" } : {})}
              aria-label={`Subject: ${subject.subject}, Total: ${subject.total}, Grade: ${subject.grade}, ${subject.total < 40 ? 'Status: Failing' : 'Status: Passing'}`}
            >
              <td className="border border-[#006600] p-1 text-xs" {...{ scope: "row" }}>{subject.subject}</td>
              <td className={`border border-[#006600] p-1 text-center text-xs ${getScoreColor(subject.assessment1)}`} aria-label={`Assessment 1 score: ${subject.assessment1} out of 15`}>
                {subject.assessment1}
              </td>
              <td className={`border border-[#006600] p-1 text-center text-xs ${getScoreColor(subject.assessment2)}`} aria-label={`Assessment 2 score: ${subject.assessment2} out of 15`}>
                {subject.assessment2}
              </td>
              <td className={`border border-[#006600] p-1 text-center text-xs ${getScoreColor(subject.caTest)}`} aria-label={`Continuous Assessment Test score: ${subject.caTest} out of 10`}>
                {subject.caTest}
              </td>
              <td className={`border border-[#006600] p-1 text-center text-xs ${getScoreColor(subject.examScore)}`} aria-label={`Examination score: ${subject.examScore} out of 60`}>
                {subject.examScore}
              </td>
              <td className={`border border-[#006600] p-1 text-center text-xs font-bold ${getScoreColor(subject.total)}`} aria-label={`Total score: ${subject.total} out of 100`}>
                {subject.total}
              </td>
              <td className="border border-[#006600] p-1 text-center">
                <span 
                  className={`px-1 py-0.5 rounded text-xs font-semibold ${getGradeColor(subject.grade)} font-condensed`}
                  aria-label={`Grade: ${subject.grade} — ${gradeToRemark(subject.grade)}`}
                >
                  {subject.grade}
                </span>
              </td>
              <td className="border border-[#006600] p-1 text-center text-xs" aria-label={`Position in class: ${subject.positionInClass}`}>{subject.positionInClass}</td>
              <td className="border border-[#006600] p-1 text-center text-xs" aria-label={`Highest score in class: ${subject.highestInClass}`}>{subject.highestInClass}</td>
              <td className="border border-[#006600] p-1 text-center text-xs" aria-label={`Teacher remark: ${subject.remark}`}>{subject.remark}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[#006600] text-white">
            <td colSpan={10} className="border border-white p-2 text-center font-semibold">
              Summary statistics will be calculated here
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default ResultTable;
