import React from 'react';

const ResultHeader = ({ school }) => {
  return (
    <header className="text-center mb-3">
      {school.logoUrl && (
        <div className="mb-4">
          <img 
            src={school.logoUrl} 
            alt={`${school.name} logo`}
            className="h-16 mx-auto"
          />
        </div>
      )}
      <h1 className="text-xl font-bold text-[#006600] mb-1">
        {school.name}
      </h1>
      <p className="text-xs text-gray-600 mb-1">{school.address}</p>
      <p className="text-xs text-gray-600 mb-1">
        Tel: {school.phone} | Email: {school.email}
      </p>
      {school.ministry && (
        <p className="text-xs text-gray-600 mb-1">{school.ministry}</p>
      )}
      <p className="text-xs font-semibold text-[#c8960c] italic">
        "{school.motto}"
      </p>
    </header>
  );
};

export default ResultHeader;
