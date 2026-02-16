import React from 'react';

const StatsPanel = ({ subjects, daysPresent, daysSchoolOpened }) => {
  const totalScore = subjects.reduce((sum, subject) => sum + subject.total, 0);
  const average = subjects.length > 0 ? (totalScore / subjects.length).toFixed(1) : '0.0';
  const subjectsPassed = subjects.filter(subject => subject.total >= 40).length;
  const attendancePercentage = daysSchoolOpened > 0 ? ((daysPresent / daysSchoolOpened) * 100).toFixed(1) : '0.0';

  return (
    <div className="mb-3 p-3 border-2 border-[#006600] rounded">
      <h3 className="text-base font-bold text-[#006600] mb-2">Performance Summary</h3>
      <div className="grid grid-cols-4 gap-2 text-xs" role="list" aria-label="Performance Statistics">
        <div className="text-center" role="listitem">
          <div className="font-semibold text-[#c8960c] text-xs">Aggregate Score</div>
          <div className="text-lg font-bold text-[#006600]" aria-label={`Total aggregate score: ${totalScore} points`}>{totalScore}</div>
        </div>
        <div className="text-center" role="listitem">
          <div className="font-semibold text-[#c8960c] text-xs">Average</div>
          <div className="text-lg font-bold text-[#006600]" aria-label={`Average score: ${average} out of 100`}>{average}</div>
        </div>
        <div className="text-center" role="listitem">
          <div className="font-semibold text-[#c8960c] text-xs">Subjects Passed</div>
          <div className="text-lg font-bold text-[#006600]" aria-label={`${subjectsPassed} subjects passed out of ${subjects.length} total subjects`}>{subjectsPassed}/{subjects.length}</div>
        </div>
        <div className="text-center" role="listitem">
          <div className="font-semibold text-[#c8960c] text-xs">Attendance</div>
          <div className="text-lg font-bold text-[#006600]" aria-label={`Attendance rate: ${attendancePercentage} percent`}>{attendancePercentage}%</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-600" aria-label={`Attendance details: ${daysPresent} days present out of ${daysSchoolOpened} total school days`}>
        Days Present: {daysPresent} / {daysSchoolOpened} days school opened
      </div>
    </div>
  );
};

export default StatsPanel;
