import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FaUserGraduate, FaChalkboardTeacher } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user, isAuthenticated } = useAuth();

  // Redirect authenticated users to their appropriate dashboard
  if ((isAuthenticated && user) || (user && user.role === 'teacher')) {
    switch (user.role) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      case 'teacher':
        return <Navigate to="/teacher/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/student/dashboard" replace />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:py-12 sm:px-6 lg:py-20 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 sm:tracking-tight">
              Welcome to School Portal
            </h1>
            <p className="mt-3 xs:mt-4 sm:mt-6 max-w-xl xs:max-w-2xl mx-auto text-sm xs:text-base sm:text-lg md:text-xl text-gray-500">
              A comprehensive platform for students, teachers, and administrators to manage academic activities.
            </p>
          </div>
        </div>
      </div>

      {/* Portal Cards */}
      <div className="max-w-7xl mx-auto py-6 px-2 xs:py-8 xs:px-3 sm:py-10 sm:px-4 lg:px-8">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 xs:gap-6">
          {/* Exam Portal */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
            <div className="p-4 xs:p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-center h-10 w-10 xs:h-12 xs:w-12 rounded-md bg-yellow-500 text-white mb-3 xs:mb-4 mx-auto">
                <svg className="h-5 w-5 xs:h-6 xs:w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0 0H6m6 0h6"></path></svg>
              </div>
              <h3 className="text-base xs:text-lg font-medium text-gray-900 text-center">Exam Portal</h3>
              <p className="mt-1 xs:mt-2 text-sm xs:text-base text-gray-500 text-center">
                Take your assigned exams online in a secure environment.
              </p>
              <div className="mt-4 xs:mt-6 flex justify-center">
                <Link
                  to="/exam-selection"
                  className="inline-flex items-center px-3 xs:px-4 py-2 border border-transparent text-xs xs:text-sm font-medium rounded-md shadow-sm text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition"
                >
                  Go to Exam Portal
                </Link>
              </div>
            </div>
          </div>

          {/* Student Portal */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
            <div className="p-4 xs:p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-center h-10 w-10 xs:h-12 xs:w-12 rounded-md bg-blue-500 text-white mb-3 xs:mb-4 mx-auto">
                <FaUserGraduate className="h-5 w-5 xs:h-6 xs:w-6" />
              </div>
              <h3 className="text-base xs:text-lg font-medium text-gray-900 text-center">Student Portal</h3>
              <p className="mt-1 xs:mt-2 text-sm xs:text-base text-gray-500 text-center">
                Access your academic records, view results, and manage your profile.
              </p>
              <div className="mt-4 xs:mt-6 flex justify-center">
                <Link
                  to="/student/login"
                  className="inline-flex items-center px-3 xs:px-4 py-2 border border-transparent text-xs xs:text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                >
                  Student Login
                </Link>
              </div>
            </div>
          </div>

          {/* Teacher Portal */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
            <div className="p-4 xs:p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-center h-10 w-10 xs:h-12 xs:w-12 rounded-md bg-green-500 text-white mb-3 xs:mb-4 mx-auto">
                <FaChalkboardTeacher className="h-5 w-5 xs:h-6 xs:w-6" />
              </div>
              <h3 className="text-base xs:text-lg font-medium text-gray-900 text-center">Teacher Portal</h3>
              <p className="mt-1 xs:mt-2 text-sm xs:text-base text-gray-500 text-center">
                Manage classes, upload results, and track student progress.
              </p>
              <div className="mt-4 xs:mt-6 flex justify-center">
                <Link
                  to="/teacher/login"
                  className="inline-flex items-center px-3 xs:px-4 py-2 border border-transparent text-xs xs:text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                >
                  Teacher Login
                </Link>
              </div>
            </div>
          </div>

          {/* Admin Portal - Small Red Button */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
            <div className="p-4 xs:p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-center h-10 w-10 xs:h-12 xs:w-12 rounded-md bg-red-500 text-white mb-3 xs:mb-4 mx-auto">
                <svg className="h-5 w-5 xs:h-6 xs:w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <h3 className="text-base xs:text-lg font-medium text-gray-900 text-center">Admin Portal</h3>
              <p className="mt-1 xs:mt-2 text-sm xs:text-base text-gray-500 text-center">
                Administrative access for system management and oversight.
              </p>
              <div className="mt-4 xs:mt-6 flex justify-center">
                <Link
                  to="/admin/login"
                  className="inline-flex items-center px-3 xs:px-4 py-2 border border-transparent text-xs xs:text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition"
                >
                  Admin Login
                </Link>
              </div>
            </div>
          </div>


        </div>

        {/* Take Exam Section - Prominent for Students */}
        <div className="mt-8 xs:mt-10 sm:mt-12 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg p-6 xs:p-8 text-center">
          <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-extrabold text-white mb-4 xs:mb-6">
            Ready to Take Your Exam?
          </h2>
          <p className="text-yellow-100 text-sm xs:text-base sm:text-lg mb-6 xs:mb-8 max-w-2xl mx-auto">
            Access your assigned exams securely and start your academic assessment right away.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/exam-selection"
              className="inline-flex items-center px-6 xs:px-8 py-3 xs:py-4 border border-transparent text-base xs:text-lg font-medium rounded-md shadow-sm text-yellow-600 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0 0H6m6 0h6"></path>
              </svg>
              Take Exam Now
            </Link>
            <Link
              to="/auth-email"
              className="inline-flex items-center px-6 xs:px-8 py-3 xs:py-4 border-2 border-white text-base xs:text-lg font-medium rounded-md text-white hover:bg-white hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              Enter with Email
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-8 xs:mt-10 sm:mt-12">
          <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-4 xs:mb-6 sm:mb-8">
            Key Features
          </h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4 xs:gap-6">
            <div className="bg-white p-4 xs:p-5 rounded-lg shadow flex flex-col items-center text-center">
              <h3 className="text-sm xs:text-base sm:text-lg font-medium text-gray-900 mb-1 xs:mb-2">Academic Records</h3>
              <p className="text-gray-500 text-xs xs:text-sm sm:text-base">Access your complete academic history and performance records.</p>
            </div>
            <div className="bg-white p-4 xs:p-5 rounded-lg shadow flex flex-col items-center text-center">
              <h3 className="text-sm xs:text-base sm:text-lg font-medium text-gray-900 mb-1 xs:mb-2">Result Tracking</h3>
              <p className="text-gray-500 text-xs xs:text-sm sm:text-base">View and download your academic results and progress reports.</p>
            </div>
            <div className="bg-white p-4 xs:p-5 rounded-lg shadow flex flex-col items-center text-center">
              <h3 className="text-sm xs:text-base sm:text-lg font-medium text-gray-900 mb-1 xs:mb-2">Profile Management</h3>
              <p className="text-gray-500 text-xs xs:text-sm sm:text-base">Update your personal information and academic preferences.</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-4 xs:mb-6 sm:mb-8">
            Frequently Asked Questions
          </h2>
          <FAQSection />
        </div>

        {/* Contact & Legal Section */}
        <div className="mt-12 max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
          {/* Contact Card */}
          <div className="flex-1 bg-white rounded-lg shadow p-6 xs:p-8">
            <h2 className="text-lg xs:text-xl sm:text-2xl font-extrabold text-gray-900 text-center mb-4 xs:mb-6">Contact Us</h2>
            <p className="text-gray-600 text-center mb-4">Have questions or need support? Reach out to us!</p>
            <div className="text-center space-y-2">
              <div>
                <span className="font-semibold">Email:</span> <a href="mailto:spectrafinsight@gmail.com" className="text-blue-600 hover:underline">spectrafinsight@gmail.com</a>
              </div>
              <div>
                <span className="font-semibold">Phone:</span> <a href="tel:+2347058676851" className="text-blue-600 hover:underline">(234) 705 8676 851</a>
              </div>
              <div>
                <span className="font-semibold">Address:</span> 123 School Lane, Education City
              </div>
            </div>
          </div>
          {/* Legal Card */}
          <div className="flex-1 bg-white rounded-lg shadow p-6 xs:p-8 flex flex-col justify-center items-center">
            <h2 className="text-lg xs:text-xl sm:text-2xl font-extrabold text-gray-900 text-center mb-4 xs:mb-6">Legal</h2>
            <div className="space-y-3 w-full text-center">
              <a href="/privacy" className="block text-blue-600 hover:underline font-medium">Privacy Policy</a>
              <a href="/disclaimer" className="block text-blue-600 hover:underline font-medium">Disclaimer</a>
            </div>
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="bg-gray-800 text-gray-200 text-center py-4 mt-12">
        &copy; {new Date().getFullYear()} School Portal. All rights reserved.
      </footer>
    </div>
  );
};

// FAQ Section Component
const FAQS = [
  {
    question: "How do I register as a student?",
    answer:
      "Click on the Student Login button, then select 'Sign Up' to create your student account. Fill in the required details and submit the form.",
  },
  {
    question: "How can teachers upload results?",
    answer:
      "Teachers can log in through the Teacher Portal and use the dashboard to upload and manage student results.",
  },
  {
    question: "What should I do if I forget my password?",
    answer:
      "Use the 'Forgot Password' link on the login page to reset your password. Follow the instructions sent to your registered email.",
  },
  {
    question: "Who can access the Admin Portal?",
    answer:
      "Only authorized school administrators can access the Admin Portal. If you need access, please contact your school administration.",
  },
];

function FAQSection() {
  const [openIndexes, setOpenIndexes] = React.useState([]);

  const toggleIndex = (idx) => {
    setOpenIndexes((prev) =>
      prev.includes(idx)
        ? prev.filter((i) => i !== idx)
        : [...prev, idx]
    );
  };

  return (
    <div className="space-y-4">
      {FAQS.map((faq, idx) => (
        <div key={idx} className="border rounded-lg bg-white shadow">
          <button
            className="w-full text-left px-4 py-3 font-medium text-gray-900 focus:outline-none flex justify-between items-center"
            onClick={() => toggleIndex(idx)}
            aria-expanded={openIndexes.includes(idx)}
            aria-controls={`faq-answer-${idx}`}
          >
            <span>{faq.question}</span>
            <svg
              className={`h-5 w-5 ml-2 transform transition-transform duration-200 ${openIndexes.includes(idx) ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIndexes.includes(idx) && (
            <div
              id={`faq-answer-${idx}`}
              className="px-4 pb-4 text-gray-700 text-sm xs:text-base border-t"
            >
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default Home; 