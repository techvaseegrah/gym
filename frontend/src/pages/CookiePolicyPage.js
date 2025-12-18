import React from 'react';
import { useNavigate } from 'react-router-dom';

const CookiePolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Cookie Policy</h1>
        <button 
          onClick={() => navigate(-1)}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-300"
        >
          ← Back
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <p className="text-gray-600 mb-6">
          This Cookie Policy explains how Mutants Academy & Ashuras Tribe ("we", "our", or "us") uses cookies and similar technologies when you use our gym management application and website.
        </p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">1. What Are Cookies?</h2>
          <p className="text-gray-600 mb-4">
            Cookies are small text files that are placed on your device (computer, smartphone, or other electronic device) when you visit our website or use our application. They are widely used to make websites work more efficiently and to provide information to the owners of the site.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Why We Use Cookies</h2>
          <p className="text-gray-600 mb-4">
            We use cookies for various purposes to enhance your experience with our gym management platform:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>To enable essential features and functionalities of our app</li>
            <li>To remember your preferences and settings</li>
            <li>To analyze how you use our platform and improve our services</li>
            <li>To personalize your experience and content</li>
            <li>To show relevant advertisements (where applicable)</li>
            <li>To understand the effectiveness of our marketing campaigns</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">3. Types of Cookies We Use</h2>
          
          <h3 className="text-lg font-medium mb-2 text-gray-700">Essential Cookies</h3>
          <p className="text-gray-600 mb-4">
            These cookies are necessary for the website to function and cannot be switched off in our systems. They are usually only set in response to actions made by you which amount to a request for services, such as setting your privacy preferences, logging in or filling in forms.
          </p>
          
          <h3 className="text-lg font-medium mb-2 text-gray-700">Performance Cookies</h3>
          <p className="text-gray-600 mb-4">
            These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site.
          </p>
          
          <h3 className="text-lg font-medium mb-2 text-gray-700">Functional Cookies</h3>
          <p className="text-gray-600 mb-4">
            These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third party providers whose services we have added to our pages.
          </p>
          
          <h3 className="text-lg font-medium mb-2 text-gray-700">Targeting Cookies</h3>
          <p className="text-gray-600 mb-4">
            These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts on other sites. They do not store personal information directly, but are based on uniquely identifying your browser and internet device.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">4. Third-Party Cookies</h2>
          <p className="text-gray-600 mb-4">
            We may also use third-party cookies on our platform, including:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li><strong>Razorpay:</strong> For payment processing and transaction security</li>
            <li><strong>Google Analytics:</strong> To analyze website usage and improve our services</li>
            <li><strong>Social Media Platforms:</strong> For social sharing buttons and widgets</li>
          </ul>
          <p className="text-gray-600 mb-4">
            These third parties may use cookies to identify your device when you visit other websites, helping them to show you personalized advertisements.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">5. Managing Cookies</h2>
          <p className="text-gray-600 mb-4">
            You can control and/or delete cookies as you wish. You can delete all cookies that are already on your device and you can set most browsers to prevent them from being placed. However, if you do this, you may have to manually adjust some preferences every time you visit a site and some services and functionalities may not work.
          </p>
          <p className="text-gray-600 mb-4">
            Most web browsers automatically accept cookies, but you can modify your browser setting to decline cookies if you prefer. If you choose to decline cookies, you may not be able to fully experience the interactive features of our services.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">6. Changes to This Cookie Policy</h2>
          <p className="text-gray-600 mb-4">
            We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will post the revised Cookie Policy on our platform and update the "Last Updated" date at the top of this policy.
          </p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">7. Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about this Cookie Policy, please contact us at:
          </p>
          <address className="text-gray-600 not-italic">
            <p>Email: mutantsacademy@gmail.com</p>
            <p>Phone: +91 6382278967</p>
            <p>Address: Near Infant Jesus Church, Back Side of Max Showroom, PAY Nagar, Natchathira Nagar, Thanjavur, Tamil Nadu 613005</p>
          </address>
          <p className="text-gray-600 mt-4">
            <strong>Last Updated:</strong> December 16, 2025
          </p>
        </section>
      </div>
    </div>
  );
};

export default CookiePolicyPage;
