import React from 'react';

const GradeKey = () => {
  const grades = [
    { grade: 'A1', range: '75-100', description: 'Excellent', color: 'bg-[#004400] text-white' },
    { grade: 'B2', range: '70-74', description: 'Very Good', color: 'bg-green-600 text-white' },
    { grade: 'B3', range: '65-69', description: 'Good', color: 'bg-green-500 text-white' },
    { grade: 'C4', range: '60-64', description: 'Credit', color: 'bg-green-500 text-white' },
    { grade: 'C5', range: '55-59', description: 'Credit', color: 'bg-green-500 text-white' },
    { grade: 'C6', range: '50-54', description: 'Credit', color: 'bg-green-500 text-white' },
    { grade: 'D7', range: '45-49', description: 'Pass', color: 'bg-amber-600 text-white' },
    { grade: 'E8', range: '40-44', description: 'Pass', color: 'bg-orange-500 text-white' },
    { grade: 'F9', range: '0-39', description: 'Fail', color: 'bg-red-700 text-white' },
  ];

  return (
    <div className="mb-3 p-3 border-2 border-[#006600] rounded">
      <h3 className="text-base font-bold text-[#006600] mb-2 font-serif">WAEC Grading System</h3>
      <div className="grid grid-cols-9 gap-1 text-xs">
        {grades.map((item) => (
          <div key={item.grade} className="text-center">
            <div 
              className={`px-1 py-0.5 rounded font-semibold ${item.color} font-condensed`}
              aria-label={`Grade ${item.grade}: ${item.description}, Score range ${item.range}`}
            >
              {item.grade}
            </div>
            <div className="text-xs mt-0.5" aria-label={`Score range: ${item.range}`}>{item.range}</div>
            <div className="text-xs text-gray-600" aria-label={`Performance level: ${item.description}`}>{item.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GradeKey;
