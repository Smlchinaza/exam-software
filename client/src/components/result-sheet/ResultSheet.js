import React from 'react';
import ResultHeader from './ResultHeader';
import StudentBio from './StudentBio';
import ResultTable from './ResultTable';
import StatsPanel from './StatsPanel';
import GradeKey from './GradeKey';
import AffectiveDomain from './AffectiveDomain';
import RemarksSection from './RemarksSection';
import ResultFooter from './ResultFooter';
import PrintButton from './PrintButton';

const ResultSheet = ({ data }) => {
  return (
    <>
      <div className="result-sheet-container max-w-[960px] mx-auto bg-[#fafaf7] p-4">
        <ResultHeader school={data.school} />
        <StudentBio student={data.student} />
        <ResultTable subjects={data.subjects} />
        <StatsPanel 
          subjects={data.subjects} 
          daysPresent={data.daysPresent}
          daysSchoolOpened={data.daysSchoolOpened}
        />
        <GradeKey />
        <AffectiveDomain 
          affectiveDomain={data.affectiveDomain}
          psychomotorDomain={data.psychomotorDomain}
        />
        <RemarksSection remarks={data.remarks} />
        <ResultFooter />
      </div>
      <PrintButton />
      <div className="watermark fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] text-6xl opacity-5 z-[-1] pointer-events-none print:block">CONFIDENTIAL</div>
    </>
  );
};

export default ResultSheet;
