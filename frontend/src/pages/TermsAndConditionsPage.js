import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsAndConditionsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Terms and Conditions</h1>
        <button 
          onClick={() => navigate(-1)}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-300"
        >
          ← Back
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <p className="text-gray-600 mb-6">
          Welcome to Mutants Academy & Ashuras Tribe. These terms and conditions outline the rules and regulations for the use of our gym management application and services.
        </p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Agreement to Terms</h2>
          <p className="text-gray-600 mb-4">
            By accessing or using our gym management application, you agree to be bound by these Terms and Conditions and all applicable laws and regulations. If you disagree with any part of these terms, you may not access our services.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Services Description</h2>
          <p className="text-gray-600 mb-4">
            Our gym management services include martial arts training, fitness programs, membership management, attendance tracking, subscription handling, and related digital platform features. We reserve the right to modify or discontinue any part of our services at any time without prior notice.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Membership and Subscriptions</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>All memberships are subject to approval and verification through our digital platform</li>
            <li>Subscription fees are non-refundable unless otherwise stated in writing</li>
            <li>We reserve the right to modify pricing and subscription plans with 30 days notice</li>
            <li>Memberships may be suspended or terminated for violation of gym policies</li>
            <li>Automatic renewal applies unless canceled through the app before renewal date</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">4. User Responsibilities</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Maintain accurate and up-to-date personal information in the app</li>
            <li>Comply with all gym rules, safety guidelines, and code of conduct</li>
            <li>Respect other members, staff, and gym equipment</li>
            <li>Report any injuries or incidents promptly through the app or to staff</li>
            <li>Use the attendance tracking feature honestly and accurately</li>
            <li>Keep your login credentials secure and confidential</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">5. Digital Platform Usage</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>You must be at least 13 years old to use our digital platform</li>
            <li>Parents or guardians must approve accounts for users under 18</li>
            <li>You are responsible for all activities under your account</li>
            <li>Do not attempt to hack, reverse-engineer, or misuse the platform</li>
            <li>Content uploaded to the platform becomes our property for operational purposes</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">6. Payment Terms</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>All payments are processed securely through Razorpay or other approved gateways</li>
            <li>Failed payments may result in suspension of gym access</li>
            <li>Refunds are only provided in accordance with our refund policy</li>
            <li>Taxes, if applicable, will be added to the membership fees</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">7. Limitation of Liability</h2>
          <p className="text-gray-600 mb-4">
            We are not liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of our gym services or digital platform. Participation in physical activities involves inherent risks, and you assume all risks associated with such activities. Our liability for any claims is limited to the amount you have paid for services in the past 12 months.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">8. Governing Law</h2>
          <p className="text-gray-600 mb-4">
            These terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Thanjavur, Tamil Nadu.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">9. Changes to Terms</h2>
          <p className="text-gray-600 mb-4">
            We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting on our platform. Your continued use of our services constitutes acceptance of the modified terms. We will notify you of significant changes via email or app notification.
          </p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">10. Contact Information</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about these Terms and Conditions, please contact us at:
          </p>
          <address className="text-gray-600 not-italic">
            <p>Email: mutantsacademy@gmail.com</p>
            <p>Phone: +91 6382278967</p>
            <p>Address: Near Infant Jesus Church, Back Side of Max Showroom, PAY Nagar, Natchathira Nagar, Thanjavur, Tamil Nadu 613005</p>
          </address>
        </section>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;
