import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Scale, AlertTriangle, FileText, Clock, Users } from 'lucide-react';

const LegalHub = () => {
  const documents = [
    {
      id: 1,
      title: 'Privacy Policy',
      description: 'Learn how Schools Hubs collects, uses, and protects your personal information. Understand your privacy rights and how we handle your data in compliance with GDPR, COPPA, and other regulations.',
      icon: Shield,
      path: '/privacy-policy',
      color: 'blue',
      readTime: '15-20 min',
      lastUpdated: 'May 24, 2026'
    },
    {
      id: 2,
      title: 'Terms of Service',
      description: 'The legally binding agreement governing your use of Schools Hubs. Understand your rights, responsibilities, acceptable use policies, and the conditions under which we provide our services.',
      icon: Scale,
      path: '/terms-of-service',
      color: 'yellow',
      readTime: '20-25 min',
      lastUpdated: 'May 24, 2026'
    },
    {
      id: 3,
      title: 'Disclaimer',
      description: 'Important limitations of liability and warranty disclaimers. Understand what Schools Hubs is not responsible for and the risks you accept by using our platform.',
      icon: AlertTriangle,
      path: '/disclaimer',
      color: 'red',
      readTime: '15-20 min',
      lastUpdated: 'May 24, 2026'
    }
  ];

  const sections = [
    {
      title: 'For Students',
      icon: Users,
      items: [
        'Academic integrity standards and exam policies',
        'Your account and data protection',
        'Privacy rights and data access',
        'Dispute resolution procedures'
      ]
    },
    {
      title: 'For Teachers & Instructors',
      icon: FileText,
      items: [
        'Exam creation and management responsibilities',
        'Student data handling and privacy',
        'Grading accuracy and result management',
        'Intellectual property and content ownership'
      ]
    },
    {
      title: 'For Administrators',
      icon: Shield,
      items: [
        'System administration responsibilities',
        'User and school management',
        'Data security and compliance',
        'Audit trails and institutional records'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <h1 className="text-5xl font-bold mb-4">Legal Documents</h1>
          <p className="text-xl text-blue-100 mb-6">
            Important policies and agreements for Schools Hubs
          </p>
          <p className="text-blue-200">
            Last updated: May 24, 2026 • Version 1.0
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-16">
        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {documents.map((doc) => {
            const Icon = doc.icon;
            const colorClasses = {
              blue: 'from-blue-500 to-blue-600 text-blue-50',
              yellow: 'from-yellow-500 to-yellow-600 text-yellow-50',
              red: 'from-red-500 to-red-600 text-red-50'
            };

            return (
              <Link
                key={doc.id}
                to={doc.path}
                className="group h-full"
              >
                <div className={`bg-gradient-to-br ${colorClasses[doc.color]} rounded-lg p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 h-full flex flex-col`}>
                  <div className="mb-4">
                    <Icon size={48} className="opacity-80" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 group-hover:opacity-100 opacity-95">
                    {doc.title}
                  </h2>
                  <p className="flex-grow opacity-90 text-sm mb-4">
                    {doc.description}
                  </p>
                  <div className="flex justify-between items-center text-sm opacity-75">
                    <span className="flex items-center gap-1">
                      <Clock size={16} />
                      {doc.readTime}
                    </span>
                    <span>→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Key Information */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
            Compliance & Regulations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'GDPR', description: 'EU data protection law' },
              { title: 'COPPA', description: 'Children\'s online privacy' },
              { title: 'FERPA', description: 'Educational records' },
              { title: 'CCPA', description: 'California privacy rights' }
            ].map((compliance, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition-shadow"
              >
                <h3 className="font-bold text-gray-900 mb-2">{compliance.title}</h3>
                <p className="text-gray-600 text-sm">{compliance.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Role-Based Information */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
            Information by Role
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <div key={index} className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg">
                      <Icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {section.title}
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {section.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-700">
                        <span className="text-blue-600 font-bold mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Important Information */}
        <section className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-lg p-10 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">📋 Full Transparency</h3>
              <p className="text-gray-700">
                We believe in complete transparency about how we collect, use, and protect your data.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">🔒 Your Rights</h3>
              <p className="text-gray-700">
                You have rights to access, correct, delete, and port your personal information.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">⚖️ Fair Terms</h3>
              <p className="text-gray-700">
                Our terms are designed to be fair while protecting both users and the platform.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Which document should I read first?',
                a: 'Start with the Privacy Policy to understand how we handle your data, then read the Terms of Service for usage rules, and finally the Disclaimer for liability limitations.'
              },
              {
                q: 'Do I need to accept all documents?',
                a: 'Yes, by using Schools Hubs, you agree to be bound by the Privacy Policy, Terms of Service, and acknowledge the Disclaimer.'
              },
              {
                q: 'How often are these policies updated?',
                a: 'We review our policies annually and update them when needed for legal compliance or operational changes. We notify users of significant changes.'
              },
              {
                q: 'What are my rights regarding my data?',
                a: 'You have the right to access, correct, delete, and port your personal information as detailed in the Privacy Policy and Terms of Service.'
              },
              {
                q: 'How is student data protected?',
                a: 'Student data is protected with encryption, role-based access control, and compliance with FERPA and COPPA regulations as detailed in our Privacy Policy.'
              }
            ].map((faq, index) => (
              <details
                key={index}
                className="group bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <summary className="flex items-center justify-between font-semibold text-gray-900 group-open:text-blue-600">
                  <span>{faq.q}</span>
                  <span className="transform group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-gray-700 mt-4 ml-2">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Have Questions?</h2>
          <p className="text-lg text-blue-100 mb-8">
            Our legal and compliance team is here to help
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <h3 className="font-bold mb-2">📧 Email</h3>
              <a href="mailto:legal@schoolshubs.com" className="text-blue-100 hover:text-white">
                legal@schoolshubs.com
              </a>
            </div>
            <div>
              <h3 className="font-bold mb-2">🔒 Privacy Issues</h3>
              <a href="mailto:privacy@schoolshubs.com" className="text-blue-100 hover:text-white">
                privacy@schoolshubs.com
              </a>
            </div>
            <div>
              <h3 className="font-bold mb-2">💬 Support</h3>
              <a href="mailto:support@schoolshubs.com" className="text-blue-100 hover:text-white">
                support@schoolshubs.com
              </a>
            </div>
          </div>
          <p className="text-blue-100 text-sm">
            Response time: Within 10 business days
          </p>
        </section>
      </div>

      {/* Footer Note */}
      <div className="bg-gray-900 text-gray-400 py-8 px-4 mt-20">
        <div className="container mx-auto max-w-5xl text-center text-sm">
          <p className="mb-2">
            These legal documents are provided for informational purposes and do not constitute legal advice.
          </p>
          <p>
            For specific legal advice regarding your use of Schools Hubs, please consult with a qualified attorney in your jurisdiction.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalHub;
