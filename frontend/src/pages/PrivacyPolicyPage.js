import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Privacy Policy</h1>
        <button 
          onClick={() => navigate(-1)}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-300"
        >
          ← Back
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <p className="text-gray-600 mb-6">
          At Mutants Academy & Ashuras Tribe, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our gym management application.
        </p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Information We Collect</h2>
          <h3 className="text-lg font-medium mb-2 text-gray-700">Personal Information</h3>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Name, email address, phone number, and contact details</li>
            <li>Date of birth and emergency contact information</li>
            <li>Payment information for subscription processing through Razorpay</li>
            <li>Photographs for identification and security purposes</li>
            <li>Attendance records and training progress data</li>
            <li>Fitness goals and martial arts level information</li>
          </ul>
          
          <h3 className="text-lg font-medium mb-2 text-gray-700">Usage Data</h3>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Login activity and session information</li>
            <li>Pages visited and features used within our gym app</li>
            <li>Device information and operating system</li>
            <li>IP address and browser type</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>To provide and maintain our gym management services</li>
            <li>To process payments and manage your membership subscriptions</li>
            <li>To track your attendance and training progress</li>
            <li>To communicate with you about your account, classes, and updates</li>
            <li>To personalize your experience and improve our app</li>
            <li>To comply with legal obligations and resolve disputes</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Data Protection</h2>
          <p className="text-gray-600 mb-4">
            We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. All payment transactions are encrypted through secure payment gateways including Razorpay. Your data is stored securely and accessed only by authorized personnel.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">4. Data Sharing</h2>
          <p className="text-gray-600 mb-4">
            We do not sell, trade, or rent your personal information to third parties. We may share data with trusted service providers who assist us in operating our gym management services, conducting business, or serving our members, provided they agree to maintain confidentiality. This includes payment processors like Razorpay.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">5. Your Rights</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Access to your personal information stored in our system</li>
            <li>Correction of inaccurate or incomplete data</li>
            <li>Deletion of your data (subject to legal requirements and operational necessities)</li>
            <li>Restriction of processing in certain circumstances</li>
            <li>Portability of your data to other services when technically feasible</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">6. Cookies and Tracking</h2>
          <p className="text-gray-600 mb-4">
            We use cookies and similar tracking technologies to enhance your experience on our gym management platform. These help us understand how you use our app and improve functionality. You can control cookie preferences through your browser settings.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">7. Data Retention</h2>
          <p className="text-gray-600 mb-4">
            We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law. This typically includes the duration of your active membership plus any legally required retention periods.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">8. Children's Privacy</h2>
          <p className="text-gray-600 mb-4">
            Our gym management services are not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13. For junior martial arts programs, we collect information only with parental consent.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">9. Changes to This Policy</h2>
          <p className="text-gray-600 mb-4">
            We may update our Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any significant changes by posting the new policy on this page and updating the effective date.
          </p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">10. Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about this Privacy Policy or your personal data, please contact us at:
          </p>
          <address className="text-gray-600 not-italic">
            <p>Email: mutantsacademy@gmail.com</p>
            <p>Phone: +91 6382278967</p>
            <p>Address: Near Infant Jesus Church, Back Side of Max Showroom, PAY Nagar, Natchathira Nagar, Thanjavur, Tamil Nadu 613005</p>
          </address>
          <p className="text-gray-600 mt-4">
            <strong>Effective Date:</strong> December 16, 2025
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
