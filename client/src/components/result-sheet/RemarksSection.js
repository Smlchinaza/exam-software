import React from 'react';

const RemarksSection = ({ remarks }) => {
  return (
    <div className="mb-3 p-3 border-2 border-[#006600] rounded">
      <h3 className="text-base font-bold text-[#006600] mb-3">Remarks & Comments</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <h4 className="font-semibold text-[#c8960c] mb-1 text-sm">Form Teacher's Remarks</h4>
          <div className="text-xs text-gray-700 mb-1">
            <span className="font-semibold">Name:</span> {remarks.formTeacherName}
          </div>
          <div className="text-xs italic text-gray-600 p-2 bg-[#f5e9c3] rounded" role="comment" aria-label={`Form teacher's remark: ${remarks.formTeacherRemark}`}>
            {remarks.formTeacherRemark}
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold text-[#c8960c] mb-1 text-sm">Principal's Remarks</h4>
          <div className="text-xs text-gray-700 mb-1">
            <span className="font-semibold">Name:</span> {remarks.principalName}
          </div>
          <div className="text-xs italic text-gray-600 p-2 bg-[#f5e9c3] rounded" role="comment" aria-label={`Principal's remark: ${remarks.principalRemark}`}>
            {remarks.principalRemark}
          </div>
        </div>
      </div>
      
      <div className="border-t border-[#c8c0a8] pt-4">
        <div className="text-xs text-gray-700" aria-label={`Next term begins: ${remarks.nextTermBegins}`}>
          <span className="font-semibold">Next Term Begins:</span> 
          <span className="ml-2 text-[#006600] font-semibold">{remarks.nextTermBegins}</span>
        </div>
      </div>
      
      <div className="mt-3 p-2 bg-[#e8f5e8] border border-[#006600] rounded" role="form" aria-label="Parent signature section">
        <p className="text-xs text-center text-[#006600] font-semibold">
          Parent's Signature: _________________________    Date: _________________________
        </p>
      </div>
    </div>
  );
};

export default RemarksSection;
