import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FaUserGraduate, FaChalkboardTeacher, FaQuoteLeft, FaSchool, FaGraduationCap, FaUsers, FaTrophy, FaUpload } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import UploadModal from './UploadModal';

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200">
      {/* Hero Section with Animated Background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-20 h-20 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-16 h-16 bg-indigo-400 rounded-full opacity-30 animate-bounce"></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-blue-300 rounded-full opacity-25 animate-ping"></div>
          <div className="absolute bottom-40 right-1/3 w-24 h-24 bg-indigo-300 rounded-full opacity-20 animate-pulse"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:py-32 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <img 
                src={require('../assets/images/SpectraLogo.jpg')} 
                alt="Schoolshubs Logo" 
                className="h-20 w-20 rounded-full shadow-lg animate-float"
              />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 animate-fade-in">
              Transforming Nigerian School Management
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl text-blue-100 mb-8 max-w-4xl mx-auto animate-slide-up">
              A unified platform for school registration, exam orchestration, student access, and teacher workflows—built for the future of education in Nigeria.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay">
              <Link
                to="/school-registration"
                className="inline-flex items-center px-8 py-4 bg-yellow-400 text-lg font-semibold rounded-full text-blue-900 hover:bg-yellow-300 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaSchool className="mr-2" />
                Register Your School
              </Link>
              <Link
                to="/student/login"
                className="inline-flex items-center px-8 py-4 bg-white text-lg font-semibold rounded-full text-blue-700 hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaUserGraduate className="mr-2" />
                Student Login
              </Link>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-8 py-4 border-2 border-white text-lg font-semibold rounded-full text-white hover:bg-white hover:text-blue-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaUpload className="mr-2" />
                Upload Results
              </button>
            </div>
            <div className="mt-4 text-blue-100 text-base sm:text-lg">
              <Link
                to="/teacher/login"
                className="font-semibold underline hover:text-white"
              >
                Teacher Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mission & Vision Section */}
      <div className="py-16 bg-gradient-to-r from-blue-100 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-800 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                To empower Nigerian schools with a simple, secure platform for managing exams, student data, and school registration.
                We help educators focus on teaching while our system streamlines operational workflows and supports local educational goals.
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-800 mb-6">
                Our Vision
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                To be the trusted digital partner for schools across Nigeria, enabling every student to achieve academic excellence and
                preparing learners for a competitive, connected future.
              </p>
            </div>
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-blue-800 mb-4">Why this matters</h3>
                <p className="text-gray-600 leading-relaxed">
                  Nigerian schools deserve tools that respect local curriculum needs, improve exam readiness, and reduce administrative burden.
                  Schoolshubs creates that bridge by combining school registration, exam delivery, and progress tracking in one affordable platform.
                </p>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-200 p-5">
                  <p className="font-semibold text-blue-800">Local-first design</p>
                  <p className="text-gray-600">Built for Nigerian school workflows, with education standards and exam formats in mind.</p>
                </div>
                <div className="rounded-2xl border border-blue-200 p-5">
                  <p className="font-semibold text-blue-800">Secure student access</p>
                  <p className="text-gray-600">Protect student records, manage login access, and keep exam data safe.</p>
                </div>
                <div className="rounded-2xl border border-blue-200 p-5">
                  <p className="font-semibold text-blue-800">Clear school outcomes</p>
                  <p className="text-gray-600">Track results and share progress with students, parents, and school leaders.</p>
                </div>
              </div>
              <div className="mt-8 text-center">
                <Link
                  to="/school-registration"
                  className="inline-flex items-center justify-center px-8 py-4 bg-blue-700 text-white rounded-full text-lg font-semibold hover:bg-blue-800 transition-all duration-300"
                >
                  Register Your School Today
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Access Section */}
      <div className="py-16 bg-gradient-to-br from-blue-200 to-indigo-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-800 mb-4">
              One Platform for Schools, Teachers, and Students
            </h2>
            <p className="text-xl text-blue-700 max-w-3xl mx-auto">
              Access the tools you need, with clear pathways for every role in the school community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaSchool className="text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-blue-800 mb-4">School Leaders</h3>
              <p className="text-gray-600 mb-6">
                Register your institution, manage students, and configure exams from a single Nigerian school dashboard.
              </p>
              <Link
                to="/school-registration"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-700 text-white rounded-full font-semibold hover:bg-blue-800 transition-colors duration-300"
              >
                Register Your School
              </Link>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaChalkboardTeacher className="text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-blue-800 mb-4">Teachers</h3>
              <p className="text-gray-600 mb-6">
                Upload results, create exams, and support student success with tools built for Nigerian classrooms.
              </p>
              <Link
                to="/teacher/login"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition-colors duration-300"
              >
                Teacher Login
              </Link>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="block w-full text-center px-6 py-2 border border-green-600 text-green-700 rounded-full font-medium hover:bg-green-50 transition-colors duration-200"
                >
                  Upload Results
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaUserGraduate className="text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-blue-800 mb-4">Students</h3>
              <p className="text-gray-600 mb-6">
                Log in to take exams, view results, and track your progress with a secure student portal.
              </p>
              <Link
                to="/student/login"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-yellow-400 text-blue-900 rounded-full font-semibold hover:bg-yellow-300 transition-colors duration-300"
              >
                Student Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gradient-to-br from-indigo-100 to-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-800 mb-4">
              Why Schools Choose Schoolshubs
            </h2>
            <p className="text-xl text-blue-700 max-w-3xl mx-auto">
              Practical tools for Nigerian schools that combine exam management, student access, and teacher productivity.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaTrophy className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-4">Exam Confidence</h3>
              <p className="text-gray-600">
                Built to support WAEC, NECO, and JAMB readiness with secure online exam delivery and automated reporting.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaUsers className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-4">Teacher Empowerment</h3>
              <p className="text-gray-600">
                Manage classes, upload results, and keep students engaged with tools made for modern Nigerian classrooms.
              </p>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaGraduationCap className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-4">Student Success</h3>
              <p className="text-gray-600">
                Give students a secure portal to take exams, check results, and stay motivated across their academic journey.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/school-registration"
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-700 text-white rounded-full text-lg font-semibold hover:bg-blue-800 transition-all duration-300"
            >
              Start Your School Registration
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16 bg-gradient-to-br from-blue-100 to-indigo-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-800 mb-4">
              Frequently Asked Questions
            </h2>
            <div className="w-24 h-1 bg-yellow-400 mx-auto rounded-full"></div>
          </div>
          <FAQSection />
        </div>
      </div>

      {/* Contact Section */}
      <div className="py-16 bg-gradient-to-br from-blue-100 to-indigo-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-blue-800 mb-4">Get in Touch</h2>
              <p className="text-xl text-blue-700">Have questions? We'd love to hear from you!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-800">Email</p>
                    <a href="mailto:info@schoolshubs.com" className="text-blue-600 hover:underline">
                      info@schoolshubs.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-800">Phone</p>
                    <a href="tel:+2347058676851" className="text-blue-600 hover:underline">
                      (234) 705 8676 851
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-800">Address</p>
                    <p className="text-blue-600">Plot 123 Education Avenue, Enugu, Enugu State</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-blue-800 mb-4">Quick Links</h3>
                <div className="space-y-3">
                  <a href="/privacy" className="block text-blue-600 hover:text-blue-800 transition-colors duration-300">
                    Privacy Policy
                  </a>
                  <a href="/disclaimer" className="block text-blue-600 hover:text-blue-800 transition-colors duration-300">
                    Disclaimer
                  </a>
                  <a href="/terms" className="block text-blue-600 hover:text-blue-800 transition-colors duration-300">
                    Terms of Service
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg">
            &copy; {new Date().getFullYear()} Schoolshubs. All rights reserved.
          </p>
          <p className="text-blue-200 mt-2">
            Empowering Nigerian Education, Shaping Tomorrow's Leaders
          </p>
        </div>
      </footer>
      <UploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />
    </div>
  );
};

// Add FAQ data at the bottom, before export
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
        <div key={idx} className="border rounded-2xl bg-white shadow-lg overflow-hidden transition-all duration-300">
          <button
            className="w-full text-left px-6 py-4 font-semibold text-blue-800 focus:outline-none flex justify-between items-center text-lg"
            onClick={() => toggleIndex(idx)}
            aria-expanded={openIndexes.includes(idx)}
            aria-controls={`faq-answer-${idx}`}
          >
            <span>{faq.question}</span>
            <svg
              className={`h-6 w-6 ml-2 transform transition-transform duration-300 ${openIndexes.includes(idx) ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            id={`faq-answer-${idx}`}
            className={`px-6 pb-4 text-gray-700 text-base border-t transition-all duration-300 ${openIndexes.includes(idx) ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
          >
            {faq.answer}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Home; 