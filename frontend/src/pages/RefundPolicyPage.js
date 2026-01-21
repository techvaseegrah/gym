import React from 'react';
import { useNavigate } from 'react-router-dom';

const RefundPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Refund Policy</h1>
        <button 
          onClick={() => navigate(-1)}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-300"
        >
          ← Back
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <p className="text-gray-600 mb-6">
          At Mutants Academy & Ashuras Tribe, we are committed to providing quality martial arts training and gym services. This Refund Policy outlines the conditions under which refunds may be issued for membership subscriptions, classes, and other services.
        </p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Membership Subscription Refunds</h2>
          <p className="text-gray-600 mb-4">
            We offer the following refund options for membership subscriptions:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li><strong>30-Day Cooling-Off Period:</strong> You may cancel your membership and receive a full refund within 30 days of purchase, provided you have not used any services beyond the initial trial period.</li>
            <li><strong>Medical Reasons:</strong> Members who are unable to continue training due to medical conditions or injury may request a partial refund or membership freeze with supporting medical documentation.</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Class and Program Refunds</h2>
          <p className="text-gray-600 mb-4">
            Refunds for specific classes or programs are subject to the following conditions:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Refunds for prepaid group classes are available if requested at least 7 days before the start date</li>
            <li>Specialized training programs may have different refund terms as specified at the time of enrollment</li>
            <li>No refunds are issued for classes that have already commenced or been completed</li>
            <li>Missed classes cannot be refunded but may be made up at the instructor's discretion</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Payment Processing and Razorpay</h2>
          <p className="text-gray-600 mb-4">
            All payments are processed securely through Razorpay, our authorized payment gateway. When a refund is approved:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Refunds are processed back to the original payment method used for the transaction</li>
            <li>Credit card refunds typically take 5-10 business days to appear in your account</li>
            <li>Bank transfer refunds may take 7-14 business days to process</li>
            <li>Any processing fees charged by Razorpay will be deducted from the refund amount</li>
            <li>Refunds for amounts under ₹100 may be processed as store credit</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">4. Non-Refundable Services</h2>
          <p className="text-gray-600 mb-4">
            The following services and purchases are generally non-refundable:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Personal training sessions that have already been conducted</li>
            <li>Merchandise items that have been used or show signs of wear</li>
            <li>Registration fees for events or competitions</li>
            <li>Equipment purchases after 7 days from date of purchase</li>
            <li>Special promotional packages with specific terms</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">5. Refund Request Process</h2>
          <p className="text-gray-600 mb-4">
            To request a refund, please follow these steps:
          </p>
          <ol className="list-decimal pl-6 text-gray-600 mb-4 space-y-2">
            <li>Contact us via email at mutantsacademy@gmail.com with your refund request</li>
            <li>Provide your membership details and transaction information</li>
            <li>Explain the reason for your refund request with any required documentation</li>
            <li>Our team will review your request within 3-5 business days</li>
            <li>You will receive a response regarding the approval or denial of your request</li>
            <li>If approved, the refund will be processed according to the payment method used</li>
          </ol>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">6. Cancellation of Services</h2>
          <p className="text-gray-600 mb-4">
            Members may cancel recurring subscriptions with a 30-day notice period. Cancellations can be made:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Through your account dashboard in our app</li>
            <li>By contacting our customer service team</li>
            <li>In writing via email to mutantsacademy@gmail.com</li>
            <li>By visiting our facility in person</li>
          </ul>
          <p className="text-gray-600 mt-4">
            Please note that cancellation does not automatically result in a refund of prepaid amounts unless covered under our refund policy.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">7. Policy Modifications</h2>
          <p className="text-gray-600 mb-4">
            We reserve the right to modify this refund policy at any time. Changes will be effective immediately upon posting to our website and application. Continued use of our services after policy changes constitutes acceptance of the modified terms.
          </p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">8. Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about this Refund Policy or would like to request a refund, please contact us at:
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

export default RefundPolicyPage;