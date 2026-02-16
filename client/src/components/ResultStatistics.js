// components/ResultStatistics.js
// Component for displaying class performance statistics

import React from 'react';
import { FaChartBar, FaUsers, FaTrophy, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

const ResultStatistics = ({ statistics, subject, className }) => {
  if (!statistics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="text-center text-gray-500">
          <FaChartBar className="text-4xl mx-auto mb-2" />
          <p>No statistics available yet. Update some student results to see class performance.</p>
        </div>
      </div>
    );
  }

  // Calculate pass rate (grades C6 and above)
  const passingGrades = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6'];
  const passCount = passingGrades.reduce((sum, grade) => {
    return sum + (statistics[`${grade.toLowerCase()}_count`] || 0);
  }, 0);
  const passRate = statistics.total_students > 0 ? (passCount / statistics.total_students * 100).toFixed(1) : 0;

  // Calculate grade distribution percentages
  const gradeDistribution = [
    { grade: 'A1', count: statistics.a1_count || 0, color: 'bg-[#004400]' },
    { grade: 'B2', count: statistics.b2_count || 0, color: 'bg-green-600' },
    { grade: 'B3', count: statistics.b3_count || 0, color: 'bg-green-600' },
    { grade: 'C4', count: statistics.c4_count || 0, color: 'bg-green-500' },
    { grade: 'C5', count: statistics.c5_count || 0, color: 'bg-green-500' },
    { grade: 'C6', count: statistics.c6_count || 0, color: 'bg-green-500' },
    { grade: 'D7', count: statistics.d7_count || 0, color: 'bg-amber-600' },
    { grade: 'E8', count: statistics.e8_count || 0, color: 'bg-orange-500' },
    { grade: 'F9', count: statistics.f9_count || 0, color: 'bg-red-700' }
  ];

  // Performance categories
  const performanceCategories = [
    {
      label: 'Excellent',
      grades: ['A1'],
      count: statistics.a1_count || 0,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Very Good',
      grades: ['B2', 'B3'],
      count: (statistics.b2_count || 0) + (statistics.b3_count || 0),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Good',
      grades: ['C4', 'C5', 'C6'],
      count: (statistics.c4_count || 0) + (statistics.c5_count || 0) + (statistics.c6_count || 0),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      label: 'Needs Improvement',
      grades: ['D7', 'E8'],
      count: (statistics.d7_count || 0) + (statistics.e8_count || 0),
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      label: 'Fail',
      grades: ['F9'],
      count: statistics.f9_count || 0,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <FaChartBar className="mr-3 text-blue-600" />
          Class Performance Statistics
        </h2>
        <div className="text-sm text-gray-600">
          {subject} - {className}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total Students */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Students</p>
              <p className="text-2xl font-bold text-blue-800">{statistics.total_students}</p>
            </div>
            <FaUsers className="text-3xl text-blue-400" />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Average Score</p>
              <p className="text-2xl font-bold text-green-800">
                {statistics.average_score ? statistics.average_score.toFixed(1) : 'N/A'}
              </p>
            </div>
            <FaChartBar className="text-3xl text-green-400" />
          </div>
        </div>

        {/* Highest Score */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Highest Score</p>
              <p className="text-2xl font-bold text-purple-800">
                {statistics.highest_score ? statistics.highest_score.toFixed(1) : 'N/A'}
              </p>
            </div>
            <FaTrophy className="text-3xl text-purple-400" />
          </div>
        </div>

        {/* Pass Rate */}
        <div className={`${passRate >= 70 ? 'bg-green-50' : passRate >= 50 ? 'bg-yellow-50' : 'bg-red-50'} rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${passRate >= 70 ? 'text-green-600' : passRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                Pass Rate
              </p>
              <p className={`text-2xl font-bold ${passRate >= 70 ? 'text-green-800' : passRate >= 50 ? 'text-yellow-800' : 'text-red-800'}`}>
                {passRate}%
              </p>
            </div>
            {passRate >= 70 ? (
              <FaCheckCircle className="text-3xl text-green-400" />
            ) : (
              <FaExclamationTriangle className="text-3xl text-red-400" />
            )}
          </div>
        </div>
      </div>

      {/* Grade Distribution Chart */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Grade Distribution</h3>
        <div className="space-y-2">
          {gradeDistribution.map(({ grade, count, color }) => {
            const percentage = statistics.total_students > 0 ? (count / statistics.total_students * 100) : 0;
            return (
              <div key={grade} className="flex items-center">
                <div className="w-12 text-sm font-medium text-gray-700">{grade}</div>
                <div className="flex-1 mx-3">
                  <div className="bg-gray-200 rounded-full h-6 relative">
                    <div
                      className={`${color} h-6 rounded-full flex items-center justify-center`}
                      style={{ width: `${percentage}%` }}
                    >
                      {percentage > 10 && (
                        <span className="text-xs text-white font-medium">{count}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-16 text-right text-sm text-gray-600">
                  {count} ({percentage.toFixed(1)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Categories */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {performanceCategories.map(({ label, count, color, bgColor }) => {
            const percentage = statistics.total_students > 0 ? (count / statistics.total_students * 100) : 0;
            return (
              <div key={label} className={`${bgColor} rounded-lg p-4 text-center`}>
                <div className={`text-2xl font-bold ${color}`}>{count}</div>
                <div className="text-sm text-gray-600">{label}</div>
                <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="border-t pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Score Range</h4>
            <div className="text-sm text-gray-600">
              <div>Highest: {statistics.highest_score ? statistics.highest_score.toFixed(1) : 'N/A'}</div>
              <div>Lowest: {statistics.lowest_score ? statistics.lowest_score.toFixed(1) : 'N/A'}</div>
              <div>Range: {statistics.highest_score && statistics.lowest_score ? 
                (statistics.highest_score - statistics.lowest_score).toFixed(1) : 'N/A'}</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-800 mb-2">Performance Indicators</h4>
            <div className="text-sm text-gray-600">
              <div>Excellent (A1): {((statistics.a1_count || 0) / statistics.total_students * 100).toFixed(1)}%</div>
              <div>Credit & Above: {passRate}%</div>
              <div>Failing (F9): {((statistics.f9_count || 0) / statistics.total_students * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-800 mb-2">Class Standing</h4>
            <div className="text-sm text-gray-600">
              <div>Total Assessed: {statistics.total_students}</div>
              <div>Pass Rate: {passRate}%</div>
              <div>Class Average: {statistics.average_score ? statistics.average_score.toFixed(1) : 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-6 pt-4 border-t text-xs text-gray-500 text-center">
        Last updated: {statistics.calculated_at ? new Date(statistics.calculated_at).toLocaleString() : 'Unknown'}
      </div>
    </div>
  );
};

export default ResultStatistics;
