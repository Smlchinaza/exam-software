import React from 'react';

const StudentBio = ({ student }) => {
  return (
    <div className="mb-3 p-3 border-2 border-[#006600] rounded">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-base font-bold text-[#006600] mb-2 font-serif">Student Information</h2>
          <div className="grid grid-cols-2 gap-2 text-xs" role="list" aria-label="Student Personal Information">
            <div role="listitem">
              <span className="font-semibold">Name:</span> {student.fullName}
            </div>
            <div role="listitem">
              <span className="font-semibold">Admission No:</span> {student.admissionNumber}
            </div>
            <div role="listitem">
              <span className="font-semibold">Class:</span> {student.className}
            </div>
            <div role="listitem">
              <span className="font-semibold">Gender:</span> {student.gender}
            </div>
            <div role="listitem">
              <span className="font-semibold">Date of Birth:</span> {student.dateOfBirth}
            </div>
            <div role="listitem">
              <span className="font-semibold">No. in Class:</span> {student.numberOfStudentsInClass}
            </div>
            <div role="listitem">
              <span className="font-semibold">Term:</span> {student.term}
            </div>
            <div role="listitem">
              <span className="font-semibold">Session:</span> {student.session}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center" role="img" aria-label="Student passport photograph">
          {student.passportPhotoUrl ? (
            <img 
              src={student.passportPhotoUrl}
              alt="Passport Photograph"
              className="w-20 h-20 border-2 border-[#c8c0a8] rounded"
            />
          ) : (
            <div className="w-20 h-20 border-2 border-dashed border-[#c8c0a8] rounded flex items-center justify-center" aria-label="No passport photograph available">
              <span className="text-xs text-gray-500 text-center">Passport Photo</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentBio;
