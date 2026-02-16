import React from 'react';

const AffectiveDomain = ({ affectiveDomain, psychomotorDomain }) => {
  const TraitTable = ({ title, traits }) => (
    <div className="mb-3">
      <h4 className="font-semibold text-[#006600] mb-1 text-sm font-serif">{title}</h4>
      <table className="w-full border-collapse border border-[#006600]" role="table" aria-label={`${title} Assessment Table`}>
        <thead>
          <tr className="bg-[#006600] text-white">
            <th className="border border-white p-1 text-left text-xs" scope="col">Trait</th>
            <th className="border border-white p-1 text-center text-xs" scope="col">Score</th>
            <th className="border border-white p-1 text-center text-xs" scope="col">Max Score</th>
            <th className="border border-white p-1 text-center text-xs" scope="col">Remark</th>
          </tr>
        </thead>
        <tbody>
          {traits.map((trait, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#faf7f0]'} aria-label={`${trait.label}: Score ${trait.score} out of ${trait.maxScore}`}>
              <td className="border border-[#006600] p-1 text-xs">{trait.label}</td>
              <td className="border border-[#006600] p-1 text-center text-xs font-semibold" aria-label={`Score: ${trait.score} out of ${trait.maxScore}`}>{trait.score}</td>
              <td className="border border-[#006600] p-1 text-center text-xs" aria-label={`Maximum possible score: ${trait.maxScore}`}>{trait.maxScore}</td>
              <td className="border border-[#006600] p-1 text-center text-xs" aria-label={`Performance level: ${trait.score >= trait.maxScore * 0.7 ? 'Excellent' : trait.score >= trait.maxScore * 0.5 ? 'Good' : trait.score >= trait.maxScore * 0.3 ? 'Fair' : 'Poor'}`}>
                {trait.score >= trait.maxScore * 0.7 ? 'Excellent' : 
                 trait.score >= trait.maxScore * 0.5 ? 'Good' : 
                 trait.score >= trait.maxScore * 0.3 ? 'Fair' : 'Poor'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mb-3 p-3 border-2 border-[#006600] rounded">
      <h3 className="text-base font-bold text-[#006600] mb-3 font-serif">Affective & Psychomotor Domain</h3>
      <div className="grid grid-cols-2 gap-4">
        <TraitTable title="Affective Domain (Character Assessment)" traits={affectiveDomain} />
        <TraitTable title="Psychomotor Domain (Skills Assessment)" traits={psychomotorDomain} />
      </div>
    </div>
  );
};

export default AffectiveDomain;
