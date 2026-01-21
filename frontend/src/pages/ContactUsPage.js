import React from 'react';
import { useNavigate } from 'react-router-dom';

const ContactUsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Contact Us</h1>
        <button 
          onClick={() => navigate(-1)}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-300"
        >
          ← Back
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <p className="text-gray-600 mb-6">
          We'd love to hear from you! Whether you have questions about our martial arts programs, membership options, or need assistance with your account, our team is here to help. Please reach out to us using the information below.
        </p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Get in Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 text-gray-700">Email Support</h3>
              <p className="text-gray-600 mb-2">For general inquiries and support:</p>
              <p className="text-blue-600 font-medium">mutantsacademy@gmail.com</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 text-gray-700">Phone Support</h3>
              <p className="text-gray-600 mb-2">For immediate assistance:</p>
              <p className="text-blue-600 font-medium">+91 6382278967</p>
            </div>
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Visit Our Facility</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-3 text-gray-700">Address</h3>
            <address className="text-gray-600 not-italic">
              <p className="mb-1">Mutants Academy & Ashuras Tribe</p>
              <p className="mb-1">Near Infant Jesus Church</p>
              <p className="mb-1">Back Side of Max Showroom</p>
              <p className="mb-1">PAY Nagar, Natchathira Nagar</p>
              <p className="mb-1">Thanjavur, Tamil Nadu 613005</p>
            </address>
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Business Hours</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 text-gray-700">Gym Operations</h3>
              <ul className="text-gray-600 space-y-1">
                <li className="flex justify-between"><span>Monday - Friday:</span> <span>5:00 AM - 11:00 PM</span></li>
                <li className="flex justify-between"><span>Saturday:</span> <span>6:00 AM - 10:00 PM</span></li>
                <li className="flex justify-between"><span>Sunday:</span> <span>7:00 AM - 9:00 PM</span></li>
              </ul>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 text-gray-700">Office Hours</h3>
              <ul className="text-gray-600 space-y-1">
                <li className="flex justify-between"><span>Monday - Friday:</span> <span>9:00 AM - 8:00 PM</span></li>
                <li className="flex justify-between"><span>Saturday:</span> <span>9:00 AM - 6:00 PM</span></li>
                <li className="flex justify-between"><span>Sunday:</span> <span>10:00 AM - 4:00 PM</span></li>
              </ul>
            </div>
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Support Categories</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2 text-gray-700">Membership & Billing</h3>
              <p className="text-gray-600">Questions about memberships, payments, refunds, or billing issues. Contact us at <a href="mailto:mutantsacademy@gmail.com" className="text-blue-600 hover:underline">mutantsacademy@gmail.com</a>.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2 text-gray-700">Training & Programs</h3>
              <p className="text-gray-600">Inquiries about martial arts classes, training schedules, or program details. Call us at +91 6382278967 for immediate assistance.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2 text-gray-700">Technical Support</h3>
              <p className="text-gray-600">Issues with the app, login problems, or technical difficulties. Email us at <a href="mailto:mutantsacademy@gmail.com" className="text-blue-600 hover:underline">mutantsacademy@gmail.com</a> with details of the issue.</p>
            </div>
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Feedback & Suggestions</h2>
          <p className="text-gray-600 mb-4">
            Your feedback is important to us! We continuously strive to improve our services and would love to hear your suggestions or concerns. Please share your thoughts with us via email at <a href="mailto:mutantsacademy@gmail.com" className="text-blue-600 hover:underline">mutantsacademy@gmail.com</a>.
          </p>
          <p className="text-gray-600">
            For quick responses to common questions, please check our <a href="/faq" className="text-blue-600 hover:underline">FAQ section</a> before contacting us directly.
          </p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Emergency Contact</h2>
          <p className="text-gray-600 mb-4">
            For emergencies during gym hours, please speak to any staff member or trainer present. For after-hours emergencies related to your membership or account, you can reach us at the email address below.
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-gray-700">
              <strong>Note:</strong> For medical emergencies, please call emergency services at 108 or your local emergency number immediately.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ContactUsPage;