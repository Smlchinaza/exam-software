import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Markdown content for Privacy Policy (imported from your markdown file)
const PrivacyPolicyContent = `# Privacy Policy

**Effective Date**: May 24, 2026  
**Last Updated**: May 24, 2026  
**Version**: 1.0

## 1. Introduction

Schools Hubs ("Company", "we", "us", "our", "the Platform") is committed to protecting your privacy and ensuring you have a positive experience on our website and services. Schools Hubs is intended for Nigerian users and educational institutions only. This Privacy Policy explains how we collect, use, disclose, and otherwise process information in connection with our examination management platform, websites, and related services (collectively, the "Services").

## 2. Information We Collect

### 2.1 Information You Provide Directly

When you create an account, we collect:
- Full name
- Email address
- Password (hashed and encrypted)
- Phone number (optional)
- School/Institution name
- User role (Student, Teacher, Administrator)
- Date of birth (for student accounts)
- Grade/Class level (for students)

### 2.2 Information Collected Automatically

- Device type and browser information
- Pages or features accessed
- Time spent on each page
- Links clicked
- Internet Protocol (IP) address
- Geographic location (city/region level)

### 2.3 Tracking Technologies

We use cookies, web beacons, and analytics tools to understand usage patterns.

## 3. How We Use Your Information

We use your information for:
- Creating and maintaining your account
- Delivering and improving the examination platform
- Processing exam submissions and calculating results
- Tracking student progress and academic performance
- Sending notifications and communications
- Detecting and preventing fraud and security threats
- Complying with legal and regulatory obligations

## 4. Information Sharing and Disclosure

We **never** sell your personal information to third parties. We share information with:
- Educational institution officials (for educational purposes)
- Service providers (with Data Processing Agreements)
- When required by law or court order
- In the case of business transfers or acquisitions

## 5. Data Retention and Deletion

| Data Type | Retention Period |
|-----------|------------------|
| Active User Account Data | Duration of service |
| Student Exam Records | 7 years (FERPA requirement) |
| Login/Access Logs | 90 days |
| Deleted Account Data | 30 days (soft delete) |

You have the right to request deletion of your personal information. Contact us at privacy@schoolshubs.com.

## 6. Data Security and Protection

We implement comprehensive security measures:
- TLS 1.2+ encryption for data in transit
- AES-256 encryption for sensitive data at rest
- Role-based access control
- Multi-tenant architecture
- Regular security audits
- 24/7 security monitoring

**However, no system is 100% secure.** We cannot guarantee absolute security.

## 7. Children's Privacy (COPPA Compliance)

For students under 13:
- Parents/guardians must consent to data collection
- We only collect necessary information
- No behavioral profiling or targeted marketing
- Parent contact information is required

## 8. Your Privacy Rights and Choices

### Right to Access
You can download your data via your account settings or by contacting privacy@schoolshubs.com.

### Right to Correction
Update your profile information directly in your account settings.

### Right to Deletion
Request account deletion via your settings or by contacting us. Response within 30 days.

### Opt-Out Options
- Email Marketing: Click unsubscribe or update preferences
- Analytics: Use browser's Do Not Track (DNT) setting
- Cookies: Manage in browser settings

## 9. Cookie Policy

We use different types of cookies:
- **Essential**: Required for platform functionality
- **Functional**: Remember preferences
- **Analytics**: Understand usage patterns
- **Marketing**: Targeted content (requires consent)

You can manage cookies through browser settings.

## 10. Your Privacy Rights by Jurisdiction

### GDPR (EU)
- Right to access personal data
- Right to correction and deletion
- Data portability
- Explicit consent for processing

### COPPA (USA - Children)
- Parental consent required for children under 13
- Limited data collection from children
- No behavioral targeting

### CCPA (California)
- Right to know what data is collected
- Right to delete personal information
- Right to opt-out of sales
- Non-discrimination for exercising rights

## 11. Contact Information

**Questions about Privacy?**  
Email: privacy@schoolshubs.com  
Mailing Address:  
Schools Hubs  
[Company Address]  
[City, State ZIP]  

**Data Protection Authority (GDPR)**  
If you have unresolved privacy concerns, you can lodge a complaint with your local data protection authority.

---

**Privacy Policy Document**  
**Version**: 1.0  
**Effective Date**: May 24, 2026
`;

const LegalDocumentPage = ({ title, content }) => {
  const [headings, setHeadings] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // Extract headings from markdown content
    const headingRegex = /^#{1,6}\s+(.+)$/gm;
    const matches = [...content.matchAll(headingRegex)];
    const extractedHeadings = matches.map((match, index) => ({
      id: `heading-${index}`,
      text: match[1],
      level: match[0].match(/^#+/)[0].length
    }));
    setHeadings(extractedHeadings);

    // Handle scroll progress
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setScrollProgress(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [content]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 z-50"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-gray-600 text-lg mb-6">
            Last updated: May 24, 2026 | Version 1.0
          </p>
          <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
            ℹ️ Please read carefully before using Schools Hubs
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Table of Contents */}
          <div className="hidden lg:block">
            <div className="sticky top-20 bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Contents</h3>
              <nav className="space-y-2 max-h-96 overflow-y-auto">
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`block text-sm transition-colors ${
                      heading.level === 1
                        ? 'font-semibold text-gray-900'
                        : heading.level === 2
                        ? 'text-gray-700 ml-2'
                        : 'text-gray-600 ml-4 text-xs'
                    } hover:text-blue-600`}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Document Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-12 prose prose-lg max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, children, ...props }) => (
                    <h1 className="text-4xl font-bold text-gray-900 mt-8 mb-6 border-b-4 border-blue-500 pb-4" {...props}>
                      {children}
                    </h1>
                  ),
                  h2: ({ node, children, ...props }) => (
                    <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4 text-blue-600" {...props}>
                      {children}
                    </h2>
                  ),
                  h3: ({ node, children, ...props }) => (
                    <h3 className="text-xl font-semibold text-gray-700 mt-5 mb-3" {...props}>
                      {children}
                    </h3>
                  ),
                  h4: ({ node, children, ...props }) => (
                    <h4 className="text-lg font-semibold text-gray-600 mt-4 mb-2" {...props}>
                      {children}
                    </h4>
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-gray-700 leading-relaxed mb-4" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="ml-2" {...props} />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full border-collapse border border-gray-300" {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => (
                    <th className="border border-gray-300 bg-gray-100 px-4 py-2 text-left font-semibold" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="border border-gray-300 px-4 py-2" {...props} />
                  ),
                  a: ({ node, children, ...props }) => (
                    <a className="text-blue-600 hover:text-blue-800 underline" {...props}>
                      {children}
                    </a>
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 my-4 italic" {...props} />
                  ),
                  code: ({ node, inline, ...props }) =>
                    inline ? (
                      <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono text-sm" {...props} />
                    ) : (
                      <code className="bg-gray-100 p-4 rounded block overflow-x-auto my-4" {...props} />
                    ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>

            {/* Footer Section */}
            <div className="mt-12 bg-gray-50 rounded-lg p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Questions or Concerns?</h3>
              <p className="text-gray-600 mb-6">
                If you have questions about this policy, please contact our privacy team.
              </p>
              <a
                href="mailto:privacy@schoolshubs.com"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Contact Privacy Team
              </a>
            </div>

            {/* Related Documents */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <a
                href="/privacy-policy"
                className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all"
              >
                <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">Privacy Policy</h4>
                <p className="text-gray-600 text-sm">Learn how we collect and handle your data</p>
              </a>
              <a
                href="/terms-of-service"
                className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all"
              >
                <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">Terms of Service</h4>
                <p className="text-gray-600 text-sm">Understand the rules of using Schools Hubs</p>
              </a>
              <a
                href="/disclaimer"
                className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all"
              >
                <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">Disclaimer</h4>
                <p className="text-gray-600 text-sm">Review our liability limitations</p>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {scrollProgress > 20 && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all"
          title="Scroll to top"
        >
          <ChevronUp size={24} />
        </button>
      )}
    </div>
  );
};

const PrivacyPolicyPage = () => {
  return <LegalDocumentPage title="Privacy Policy" content={PrivacyPolicyContent} />;
};

export default PrivacyPolicyPage;
