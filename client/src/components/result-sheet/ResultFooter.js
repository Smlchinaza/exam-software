import React from 'react';

const ResultFooter = () => {
  return (
    <footer className="mt-4 text-center text-xs text-gray-600 border-t-2 border-[#006600] pt-2">
      <div className="mb-2">
        <p className="font-semibold text-[#006600] text-xs">IMPORTANT NOTICE</p>
        <p className="text-xs">This result sheet is computer-generated and requires official school stamp to be considered valid.</p>
        <p className="text-xs">Any alteration or modification renders this document invalid.</p>
      </div>
      
      <div className="mb-2">
        <p className="font-semibold text-xs">Print Information</p>
        <p className="text-xs">Printed on: {new Date().toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })}</p>
        <p className="text-xs">Page 1 of 1</p>
      </div>
      
      <div className="flex justify-center items-center space-x-6 mt-2">
        <div className="text-center">
          <div className="w-24 h-8 border-b-2 border-[#006600] mb-1"></div>
          <p className="text-xs">Principal's Signature</p>
        </div>
        <div className="text-center">
          <div className="w-24 h-8 border-b-2 border-[#006600] mb-1"></div>
          <p className="text-xs">School Stamp</p>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        <p className="text-xs">© {new Date().getFullYear()} School Management System. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default ResultFooter;
