import React from 'react';
import ResultSheet from '../components/result-sheet/ResultSheet';
import { sampleResultData } from '../lib/sampleResultData';

const ResultPreviewPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Result Sheet Preview</h1>
          <p className="text-gray-600">Nigerian Secondary School Termly Result Sheet</p>
          <p className="text-sm text-gray-500 mt-2">
            Use the Print button in the top-right corner to print this result sheet
          </p>
        </div>
        
        <ResultSheet data={sampleResultData} />
      </div>
    </div>
  );
};

export default ResultPreviewPage;
