export const computeTotal = (assessment1, assessment2, caTest, examScore) => {
  return assessment1 + assessment2 + caTest + examScore;
};

export const deriveGrade = (total) => {
  if (total >= 75) return 'A1';
  if (total >= 70) return 'B2';
  if (total >= 65) return 'B3';
  if (total >= 60) return 'C4';
  if (total >= 55) return 'C5';
  if (total >= 50) return 'C6';
  if (total >= 45) return 'D7';
  if (total >= 40) return 'E8';
  return 'F9';
};

export const gradeToRemark = (grade) => {
  switch (grade) {
    case 'A1': return 'Excellent';
    case 'B2': return 'Very Good';
    case 'B3': return 'Good';
    case 'C4': return 'Credit';
    case 'C5': return 'Credit';
    case 'C6': return 'Credit';
    case 'D7': return 'Pass';
    case 'E8': return 'Pass';
    case 'F9': return 'Fail';
    default: return 'Unknown';
  }
};

export const colorizeScore = (score, max) => {
  const percentage = (score / max) * 100;
  if (percentage >= 70) return 'text-[#006600] font-semibold';
  if (percentage >= 50) return 'text-[#b07800] font-semibold';
  return 'text-[#b30000] font-semibold';
};

export const ordinalSuffix = (n) => {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
};

export const computeAggregate = (subjects) => {
  const totalScore = subjects.reduce((sum, subject) => sum + subject.total, 0);
  const average = subjects.length > 0 ? totalScore / subjects.length : 0;
  const subjectsPassed = subjects.filter(subject => subject.total >= 40).length;
  
  return {
    totalScore,
    average: Math.round(average * 10) / 10, // Round to 1 decimal place
    subjectsPassed
  };
};
