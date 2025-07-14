import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FaUserGraduate, FaChalkboardTeacher, FaStar, FaQuoteLeft, FaSchool, FaGraduationCap, FaUsers, FaTrophy } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [currentFeedbackIndex, setCurrentFeedbackIndex] = useState(0);

  // Auto-scroll feedback testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeedbackIndex((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
                alt="Spectra School Logo" 
                className="h-20 w-20 rounded-full shadow-lg animate-float"
              />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 animate-fade-in">
              Welcome to <span className="text-yellow-300">Spectra</span> School
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl text-blue-100 mb-8 max-w-4xl mx-auto animate-slide-up">
              Nurturing Excellence, Building Future Leaders
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay">
              <Link
                to={isAuthenticated && user?.role === 'student' ? "/exam-selection" : "/auth-email"}
                className="inline-flex items-center px-8 py-4 border-2 border-white text-lg font-semibold rounded-full text-white hover:bg-white hover:text-blue-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaGraduationCap className="mr-2" />
                Take Exam
              </Link>
              <Link
                to="/student/login"
                className="inline-flex items-center px-8 py-4 bg-yellow-400 text-lg font-semibold rounded-full text-blue-800 hover:bg-yellow-300 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <FaUserGraduate className="mr-2" />
                Student Portal
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Principal's Speech Section */}
      <div className="py-16 bg-gradient-to-r from-blue-100 to-indigo-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-800 mb-4">
              Principal's Message
            </h2>
            <div className="w-24 h-1 bg-yellow-400 mx-auto rounded-full"></div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 transform hover:scale-105 transition-all duration-500">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <FaSchool className="text-white text-2xl" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-blue-800 mb-4">Dr. Sarah Johnson</h3>
                <h4 className="text-lg text-blue-600 mb-6">Principal, Spectra School</h4>
                <div className="relative">
                  <FaQuoteLeft className="text-4xl text-blue-200 absolute -top-2 -left-2" />
                  <p className="text-lg text-gray-700 leading-relaxed pl-8">
                    "At Spectra School, we believe in fostering a culture of excellence, innovation, and character development. 
                    Our commitment goes beyond academic achievement; we strive to nurture well-rounded individuals who are prepared 
                    to face the challenges of tomorrow with confidence and integrity. Through our comprehensive curriculum, dedicated 
                    faculty, and state-of-the-art facilities, we provide an environment where every student can discover their potential 
                    and pursue their dreams. As we continue to evolve and adapt to the changing educational landscape, our core values 
                    remain steadfast: excellence in education, character development, and community engagement. Together, we are building 
                    the leaders of tomorrow."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portal Cards Section */}
      <div className="py-16 bg-gradient-to-br from-blue-200 to-indigo-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-800 mb-4">
              Access Your Portal
            </h2>
            <p className="text-xl text-blue-700 max-w-3xl mx-auto">
              Choose your role and access the comprehensive features designed for your academic journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Exam Portal */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-6 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaGraduationCap className="text-yellow-600 text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-white">Exam Portal</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  Take your assigned exams online in a secure and monitored environment.
                </p>
                <Link
                  to={isAuthenticated && user?.role === 'student' ? "/exam-selection" : "/auth-email"}
                  className="block w-full bg-yellow-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors duration-300"
                >
                  Start Exam
                </Link>
              </div>
            </div>

            {/* Student Portal */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaUserGraduate className="text-blue-600 text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-white">Student Portal</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  Access your academic records, view results, and manage your profile.
                </p>
                <Link
                  to="/student/login"
                  className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300"
                >
                  Student Login
                </Link>
              </div>
            </div>

            {/* Teacher Portal */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <div className="bg-gradient-to-br from-green-500 to-green-700 p-6 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaChalkboardTeacher className="text-green-600 text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-white">Teacher Portal</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  Manage classes, upload results, and track student progress.
                </p>
                <Link
                  to="/teacher/login"
                  className="block w-full bg-green-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-300"
                >
                  Teacher Login
                </Link>
              </div>
            </div>

            {/* Admin Portal */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <div className="bg-gradient-to-br from-red-500 to-red-700 p-6 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaUsers className="text-red-600 text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-white">Admin Portal</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  Administrative access for system management and oversight.
                </p>
                <Link
                  to="/admin/login"
                  className="block w-full bg-red-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors duration-300"
                >
                  Admin Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gradient-to-br from-indigo-100 to-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-800 mb-4">
              Why Choose Spectra?
            </h2>
            <p className="text-xl text-blue-700 max-w-3xl mx-auto">
              Discover the unique features that make Spectra School the preferred choice for quality education
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-xl transform hover:scale-105 transition-all duration-300 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaTrophy className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-4">Academic Excellence</h3>
              <p className="text-gray-600">
                Consistently achieving outstanding academic results with a proven track record of student success.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl transform hover:scale-105 transition-all duration-300 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaUsers className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-4">Expert Faculty</h3>
              <p className="text-gray-600">
                Experienced and dedicated teachers committed to nurturing each student's potential.
              </p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-xl transform hover:scale-105 transition-all duration-300 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaGraduationCap className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-4">Modern Technology</h3>
              <p className="text-gray-600">
                State-of-the-art facilities and digital learning platforms for enhanced education.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section with Scrolling Effect */}
      <div className="py-16 bg-gradient-to-br from-blue-600 to-indigo-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              What Our Community Says
            </h2>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto">
              Hear from our students, parents, and guardians about their experience at Spectra School
            </p>
          </div>
          
          <div className="relative">
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-1000 ease-in-out"
                style={{ transform: `translateX(-${currentFeedbackIndex * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-4">
                    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-2xl">
                      <div className="flex items-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                          <span className="text-white text-xl font-bold">{testimonial.name.charAt(0)}</span>
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-blue-800">{testimonial.name}</h4>
                          <p className="text-blue-600">{testimonial.role}</p>
                        </div>
                      </div>
                      <div className="flex mb-4">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} className="text-yellow-400 text-xl" />
                        ))}
                      </div>
                      <p className="text-gray-700 text-lg leading-relaxed italic">
                        "{testimonial.message}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Navigation Dots */}
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeedbackIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentFeedbackIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
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
                    <a href="mailto:spectrafinsight@gmail.com" className="text-blue-600 hover:underline">
                      spectrafinsight@gmail.com
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
                    <p className="text-blue-600">123 School Lane, Education City</p>
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

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg">
            &copy; {new Date().getFullYear()} Spectra School. All rights reserved.
          </p>
          <p className="text-blue-200 mt-2">
            Nurturing Excellence, Building Future Leaders
          </p>
        </div>
      </footer>
    </div>
  );
};

// Testimonials data
const testimonials = [
  {
    name: "Sarah Williams",
    role: "Parent",
    message: "Spectra School has transformed my child's academic journey. The teachers are dedicated, the facilities are excellent, and the results speak for themselves. My daughter has grown not just academically but as a confident individual."
  },
  {
    name: "Michael Chen",
    role: "Student",
    message: "Being a student at Spectra has been an amazing experience. The teachers are supportive, the curriculum is challenging yet engaging, and I've made friends for life. The school truly prepares you for the future."
  },
  {
    name: "Dr. Emily Rodriguez",
    role: "Parent & Guardian",
    message: "As both a parent and guardian, I can confidently say that Spectra School provides exceptional education. The school's commitment to academic excellence and character development is evident in every aspect."
  },
  {
    name: "David Thompson",
    role: "Parent",
    message: "The personalized attention my son receives at Spectra is remarkable. The teachers know each student individually and tailor their approach accordingly. The results have been outstanding."
  },
  {
    name: "Lisa Johnson",
    role: "Guardian",
    message: "Spectra School has exceeded all my expectations. The modern facilities, dedicated staff, and comprehensive curriculum create an ideal learning environment. I highly recommend this school."
  }
];

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