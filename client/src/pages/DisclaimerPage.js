import React, { useState, useEffect } from 'react';
import { ChevronUp, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Note: In production, load these from actual .md files or API
const DisclaimerContent = `# Disclaimer

**Effective Date**: May 24, 2026  
**Last Updated**: May 24, 2026  
**Version**: 1.0

## 1. General Disclaimer

This Disclaimer is an important legal document that explains the limitations of liability, warranties disclaimers, and other important protections for Schools Hubs.

By accessing or using Schools Hubs, you acknowledge that you have read, understood, and agree to be bound by all disclaimers contained herein.

Schools Hubs is designed specifically for Nigerian educational institutions and users. The platform and these disclaimers reflect Nigerian market conditions, local education needs, and applicable laws.

## 2. Service Availability Disclaimer

### 2.1 "AS-IS" and "AS-AVAILABLE"

**Schools Hubs is provided on an "AS-IS" and "AS-AVAILABLE" basis without representations, warranties, or conditions of any kind.**

We do not warrant that:
- The Platform will be uninterrupted or error-free
- All features will work as intended
- The Platform will remain available indefinitely
- Technical issues will be resolved immediately

### 2.2 Service Interruptions and Maintenance

**The Company reserves the right to:**
- Perform scheduled or emergency maintenance
- Temporarily suspend or restrict access
- Discontinue features or services with notice
- Limit concurrent users or bandwidth

**Scheduled Maintenance**: We aim for off-peak hours and provide 48 hours' notice when possible.

### 2.3 Network and Internet Issues

**The Company is not responsible for:**
- Internet outages or failures
- Network congestion
- Your ISP's service disruptions
- Your device's connectivity
- WiFi or network equipment failures

## 3. No Warranty Disclaimers

### 3.1 Express Warranty Disclaimer

**EXCEPT AS EXPRESSLY PROVIDED IN THE TERMS OF SERVICE, THE COMPANY MAKES NO EXPRESS WARRANTIES ABOUT THE PLATFORM.**

We do not warrant:
- Accuracy, completeness, or correctness
- Fitness for a particular purpose
- Non-infringement of intellectual property
- Bug-free operation
- Compatibility with specific hardware/software

### 3.2 Implied Warranty Disclaimer

**ALL IMPLIED WARRANTIES ARE HEREBY DISCLAIMED, INCLUDING:**

- Warranty of Merchantability
- Warranty of Fitness for a Particular Purpose
- Warranty of Non-Infringement
- Warranty of Title

## 4. Exam Integrity Disclaimer

### 4.1 No Cheating Detection Guarantee

**IMPORTANT**: The Company does not guarantee detection of cheating or academic integrity violations.

**You understand that:**
- Sophisticated cheating may evade detection
- Technical failures may prevent monitoring
- External assistance may go undetected
- Physical assistance cannot be monitored remotely

**You accept full responsibility for maintaining academic integrity.**

### 4.2 Exam Result Accuracy Disclaimer

**The Company does not guarantee:**
- Complete accuracy of exam scoring
- Automatic grading is 100% correct
- Score calculations are always accurate
- All exam questions display correctly
- System-generated results reflect true performance

**Possible Issues**:
- Software bugs may cause incorrect scoring
- Rounding or mathematical errors
- Questions may display incorrectly
- System crashes may cause data loss

## 5. Data Security and Privacy Disclaimer

### 5.1 No Absolute Security Guarantee

**Despite security measures, the Company does not guarantee absolute security or complete protection.**

**Potential Risks**:
- Data breaches or unauthorized access
- Password compromise
- Malware capture of credentials
- Phishing attacks
- Man-in-the-middle attacks
- Insider threats
- Natural disasters
- Third-party service compromise
- Backup system failures

**Your Responsibility**:
- Use strong passwords
- Protect your device
- Report suspicious activity
- Enable two-factor authentication
- Don't share credentials

### 5.2 Data Loss Disclaimer

**The Company is not responsible for:**
- Accidental deletion
- Device malfunction
- Negligent loss
- Third-party attacks
- Loss of deleted data
- Data corruption

## 6. Educational Content Disclaimer

### 6.1 No Educational Guarantee

**The Company does not warrant:**
- Exam content is educationally appropriate
- Questions cover all relevant material
- Exams accurately assess learning
- Results reflect true knowledge
- Materials are current or complete

### 6.2 No Academic Advising

**Schools Hubs is NOT a substitute for:**
- Professional academic advising
- Licensed counseling
- Tutoring services
- Disability services
- Mental health support
- Career guidance
- Professional credentials

### 6.3 No Professional Credentials

**The Company:**
- Is not a licensed institution
- Does not issue official credentials
- Does not provide official records
- Does not award credits
- Cannot provide certifications

Only your educational institution can issue official credentials.

## 7. Performance and Functionality Disclaimer

### 7.1 Device Compatibility

**The Company does not guarantee:**
- Compatibility with all devices/browsers
- Optimal performance on older platforms
- Mobile app on all devices
- Accessibility on all assistive devices
- Offline functionality
- Specific processor requirements

### 7.2 Internet Connectivity

**The Company is not responsible for:**
- Your internet connection quality
- Your ISP's reliability
- Network congestion
- Firewall restrictions
- Device network capabilities

### 7.3 Browser Compatibility

**The Company does not guarantee:**
- Compatibility with outdated browsers
- Functionality with extensions
- Cookie functionality
- JavaScript enablement everywhere

## 8. User-Generated Content Disclaimer

### 8.1 Accuracy and Appropriateness

**The Company does not warrant:**
- User-generated content is accurate
- Content is appropriate
- Content is bias-free
- Questions are pedagogically sound
- Submissions are original

### 8.2 Content Monitoring

**The Company:**
- Does not actively monitor all content
- Does not review before posting
- Does not guarantee removal of harmful content
- Does not endorse user-generated content

## 9. Payment and Billing Disclaimer

### 9.1 Billing Accuracy Disclaimer

**The Company does not warrant:**
- Invoices are 100% accurate
- Charges are correctly calculated
- Tax calculations are correct
- Refunds are error-free

**For incorrect bills**, contact billing@schoolshubs.com within 30 days.

## 10. Third-Party Links and Content Disclaimer

### 10.1 No Endorsement

**The Company:**
- Does not endorse third-party services
- Is not responsible for third-party content
- Does not control third-party links
- Is not liable for third-party failures

### 10.2 Your Responsibility

You are responsible for:
- Reviewing third-party privacy policies
- Understanding third-party terms
- Protecting information with third parties

## 11. Accessibility Disclaimer

### 11.1 Accessibility Limitations

**The Company does not warrant:**
- Full accessibility to all users
- Compatibility with all assistive technology
- Screen reader perfection
- Keyboard navigation everywhere
- Color contrast standards

### 11.2 Accommodations

Contact accessibility@schoolshubs.com. Requests evaluated individually within 5 business days.

## 12. Limitation of Liability Disclaimer

### 12.1 Maximum Liability

**The Company's total liability shall not exceed:**

**For Free Accounts**: ₦0

**For Paid Accounts**:
- Amount paid in preceding 12 months, OR
- ₦500/student per term, whichever is greater

### 12.2 Excluded Damages

**IN NO EVENT SHALL THE COMPANY BE LIABLE FOR:**

- Lost profits or revenue
- Lost opportunities
- Lost goodwill
- Lost data
- Lost wages
- Consequential damages
- Indirect damages
- Punitive damages

**This applies even if advised of the possibility.**

## 13. Assumption of Risk

**You acknowledge and assume the risk that:**
- The Platform may contain bugs
- Your exam data may be lost
- Scores may be incorrect
- Your account may be compromised
- Cheating may go undetected
- The Platform may be unavailable
- Passwords may be intercepted
- Third-party services may fail

**These risks exist despite our efforts.**

## 14. Acknowledgment of Risk

### 14.1 By Using Schools Hubs, You Acknowledge:

- You have read this entire Disclaimer
- You understand the limitations of liability
- You accept the risks in online exams
- You assume account security responsibility
- You understand cheating detection is not guaranteed
- You accept accuracy limitations
- You understand security is not absolute
- You agree this Disclaimer limits our liability

## 15. Contact Information

**Questions About This Disclaimer?**  
Email: legal@schoolshubs.com  
Mailing Address:  
Schools Hubs  
[Company Address]  
Phone: [Phone Number]

---

**Disclaimer Document**  
**Version**: 1.0  
**Effective Date**: May 24, 2026

**_This Disclaimer does not constitute legal advice. For specific legal advice, consult a qualified attorney._**
`;

const DisclaimerPage = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTopButton, setShowTopButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setScrollProgress(scrolled);
      setShowTopButton(winScroll > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      {/* Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-red-500 to-orange-600 z-50"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Alert Banner */}
        <div className="mb-8 bg-red-100 border-l-4 border-red-600 p-4 rounded flex items-start gap-4">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-red-900 mb-1">Important Disclaimer</h3>
            <p className="text-red-800 text-sm">
              Please read this disclaimer carefully. It contains important limitations on our liability and disclaimers of warranties.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Disclaimer</h1>
          <p className="text-gray-600 text-lg mb-6">
            Last updated: May 24, 2026 | Version 1.0
          </p>
          <div className="inline-block bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium">
            ⚠️ Liability Limitations
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-12 prose prose-lg max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-4xl font-bold text-gray-900 mt-8 mb-6 border-b-4 border-red-500 pb-4" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4 text-red-600" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-xl font-semibold text-gray-700 mt-5 mb-3" {...props} />
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
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-red-500 bg-red-50 p-4 my-4 italic text-gray-700" {...props} />
              ),
            }}
          >
            {DisclaimerContent}
          </ReactMarkdown>
        </div>

        {/* Important Notice */}
        <div className="mt-12 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-8 border-2 border-red-200">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Final Acknowledgment</h3>
          <p className="text-gray-700 mb-6">
            By using Schools Hubs, you expressly acknowledge that you have read this Disclaimer in its entirety and accept all limitations of liability.
          </p>
          <div className="bg-white rounded-lg p-4 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 text-red-600" />
              <span className="text-gray-700">
                I have read and understood this Disclaimer and accept all terms
              </span>
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold">
              I Understand & Accept
            </button>
            <a
              href="/"
              className="bg-gray-300 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-400 transition-colors font-semibold text-center"
            >
              Return Home
            </a>
          </div>
        </div>

        {/* Related Documents */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <a
            href="/privacy-policy"
            className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all"
          >
            <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">Privacy Policy</h4>
            <p className="text-gray-600 text-sm">How we handle your data</p>
          </a>
          <a
            href="/terms-of-service"
            className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all"
          >
            <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-yellow-600">Terms of Service</h4>
            <p className="text-gray-600 text-sm">Rules of using Schools Hubs</p>
          </a>
          <a
            href="/legal"
            className="group bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all"
          >
            <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-red-600">Legal Hub</h4>
            <p className="text-gray-600 text-sm">All legal documents</p>
          </a>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showTopButton && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-all"
          title="Scroll to top"
        >
          <ChevronUp size={24} />
        </button>
      )}
    </div>
  );
};

export default DisclaimerPage;
