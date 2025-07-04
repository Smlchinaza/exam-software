import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function TeacherStudents() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => {
    if (currentUser && currentUser.role === 'teacher') {
      fetchData();
    }
    // eslint-disable-next-line
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Get all subjects
      const subjectsRes = await api.get('/subjects');
      // 2. Find subjects assigned to this teacher
      const mySubjects = subjectsRes.data.filter(subj =>
        subj.teachers && subj.teachers.includes(currentUser.id)
      ).map(subj => subj.name);
      setTeacherSubjects(mySubjects);

      // 3. Get all students
      const studentsRes = await api.get('/students');
      // 4. Filter students registered for any of the teacher's subjects
      const filtered = studentsRes.data.filter(student =>
        student.registeredSubjects && student.registeredSubjects.some(subj => mySubjects.includes(subj))
      );
      setStudents(filtered);
    } catch (err) {
      setError('Failed to fetch students or subjects.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique classes from filtered students
  const uniqueClasses = Array.from(new Set(students.map(s => s.currentClass))).sort();

  // Filter students by search, subject, and class
  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.fullName.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase());
    const matchesSubject =
      !subjectFilter ||
      (student.registeredSubjects && student.registeredSubjects.includes(subjectFilter));
    const matchesClass =
      !classFilter || student.currentClass === classFilter;
    return matchesSearch && matchesSubject && matchesClass;
  });

  // Export filtered students to CSV
  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Class', 'Subjects (with me)'];
    const rows = filteredStudents.map(student => [
      student.fullName,
      student.email,
      student.currentClass,
      student.registeredSubjects.filter(subj => teacherSubjects.includes(subj)).join('; ')
    ]);
    let csvContent = '';
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'students.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-2xl font-bold mb-6 text-left">My Students</h2>
      <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-4 gap-2">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-64 focus:outline-none focus:ring focus:border-blue-300"
        />
        <select
          value={subjectFilter}
          onChange={e => setSubjectFilter(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-64 focus:outline-none focus:ring focus:border-blue-300"
        >
          <option value="">All Subjects</option>
          {teacherSubjects.map(subject => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-64 focus:outline-none focus:ring focus:border-blue-300"
        >
          <option value="">All Classes</option>
          {uniqueClasses.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
        <button
          onClick={handleExportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full md:w-auto"
          disabled={filteredStudents.length === 0}
        >
          Export CSV
        </button>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600 mb-4">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow text-sm md:text-base">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Class</th>
                <th className="px-4 py-2 text-left">Subjects (with me)</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4">No students found for your criteria.</td></tr>
              ) : filteredStudents.map(student => (
                <tr key={student._id} className="border-b">
                  <td className="px-4 py-2">{student.fullName}</td>
                  <td className="px-4 py-2">{student.email}</td>
                  <td className="px-4 py-2">{student.currentClass}</td>
                  <td className="px-4 py-2">
                    {student.registeredSubjects.filter(subj => teacherSubjects.includes(subj)).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TeacherStudents; 