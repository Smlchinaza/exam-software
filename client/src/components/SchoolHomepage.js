// SchoolHomepage Component
// Displays a customizable homepage for each school based on subdomain

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const SchoolHomepage = () => {
  const { subdomain } = useParams();
  const [schoolData, setSchoolData] = useState(null);
  const [homepageData, setHomepageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  
  useEffect(() => {
    fetchSchoolHomepage();
  }, [subdomain]);

  const fetchSchoolHomepage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/school-homepages/public/${subdomain}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('School not found or not publicly accessible');
        } else {
          setError('Failed to load school homepage');
        }
        return;
      }

      const data = await response.json();
      setSchoolData(data.school);
      setHomepageData(data.homepage);
      setError(null);
    } catch (err) {
      console.error('Error fetching school homepage:', err);
      setError('Failed to load school homepage');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading school homepage...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">School Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a 
            href="https://schoolshubs.com" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Main Site
          </a>
        </div>
      </div>
    );
  }

  if (!schoolData || !homepageData) {
    return null;
  }

  return (
    <div className="school-homepage" style={{ '--primary-color': homepageData.primary_color }}>
      {/* Hero Section */}
      {homepageData.show_hero_section && (
        <HeroSection 
          school={schoolData} 
          homepage={homepageData} 
        />
      )}

      {/* Welcome Section */}
      <WelcomeSection 
        school={schoolData} 
        homepage={homepageData} 
      />

      {/* Statistics Section */}
      <StatisticsSection 
        homepage={homepageData} 
      />

      {/* Features Section */}
      {homepageData.show_features_section && (
        <FeaturesSection 
          homepage={homepageData} 
        />
      )}

      {/* Mission & Vision Section */}
      {(homepageData.mission_statement || homepageData.vision_statement) && (
        <MissionVisionSection 
          homepage={homepageData} 
        />
      )}

      {/* News Section */}
      {homepageData.show_news_section && homepageData.latest_news?.length > 0 && (
        <NewsSection 
          homepage={homepageData} 
        />
      )}

      {/* Gallery Section */}
      {homepageData.show_gallery_section && homepageData.gallery_images?.length > 0 && (
        <GallerySection 
          homepage={homepageData} 
        />
      )}

      {/* Testimonials Section */}
      {homepageData.show_testimonials_section && homepageData.testimonials?.length > 0 && (
        <TestimonialsSection 
          homepage={homepageData} 
        />
      )}

      {/* Contact Section */}
      <ContactSection 
        school={schoolData} 
        homepage={homepageData} 
      />

      {/* Footer */}
      {homepageData.show_footer && (
        <FooterSection 
          school={schoolData} 
          homepage={homepageData} 
        />
      )}
    </div>
  );
};

// Hero Section Component
const HeroSection = ({ school, homepage }) => {
  return (
    <section 
      className="relative py-20 px-4"
      style={{ backgroundColor: homepage.hero_background_color }}
    >
      <div className="max-w-6xl mx-auto text-center">
        {homepage.hero_image_url && (
          <div className="absolute inset-0 z-0">
            <img 
              src={homepage.hero_image_url} 
              alt={`${school.name} Hero`}
              className="w-full h-full object-cover opacity-20"
            />
          </div>
        )}
        
        <div className="relative z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-white text-3xl font-bold"
               style={{ backgroundColor: homepage.primary_color }}>
            {school.name.charAt(0)}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {school.name}
          </h1>
          
          <p className="text-xl text-gray-600 mb-8">
            {homepage.welcome_message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href={`https://${school.domain}/login`}
              className="inline-block px-8 py-3 text-white rounded-md hover:opacity-90 transition-opacity"
              style={{ backgroundColor: homepage.primary_color }}
            >
              Student Login
            </a>
            <a 
              href={`https://${school.domain}/register`}
              className="inline-block px-8 py-3 border-2 rounded-md hover:bg-gray-50 transition-colors"
              style={{ borderColor: homepage.primary_color, color: homepage.primary_color }}
            >
              Register Now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

// Welcome Section Component
const WelcomeSection = ({ school, homepage }) => {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 
          className="text-3xl font-bold mb-6"
          style={{ color: homepage.primary_color }}
        >
          {homepage.welcome_title}
        </h2>
        
        <p className="text-lg text-gray-600 leading-relaxed">
          {homepage.welcome_message}
        </p>
        
        {school.city && (
          <p className="text-gray-500 mt-4">
            Located in {school.city}, {school.state}
          </p>
        )}
      </div>
    </section>
  );
};

// Statistics Section Component
const StatisticsSection = ({ homepage }) => {
  const stats = [
    { label: 'Students', value: homepage.total_students || 0, icon: '👥' },
    { label: 'Teachers', value: homepage.total_teachers || 0, icon: '👨‍🏫' },
    { label: 'Classes', value: homepage.total_classes || 0, icon: '📚' },
    { label: 'Est. Year', value: homepage.established_year || new Date().getFullYear(), icon: '🏛️' }
  ];

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl mb-2">{stat.icon}</div>
              <div 
                className="text-3xl font-bold mb-1"
                style={{ color: homepage.primary_color }}
              >
                {stat.value}
              </div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Features Section Component
const FeaturesSection = ({ homepage }) => {
  const getIcon = (iconName) => {
    const icons = {
      book: '📚',
      building: '🏢',
      users: '👥',
      shield: '🛡️',
      star: '⭐',
      trophy: '🏆',
      heart: '❤️',
      globe: '🌍'
    };
    return icons[iconName] || '✨';
  };

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 
          className="text-3xl font-bold text-center mb-12"
          style={{ color: homepage.primary_color }}
        >
          Why Choose {schoolData?.name}
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {homepage.features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl mb-4">{getIcon(feature.icon)}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Mission & Vision Section Component
const MissionVisionSection = ({ homepage }) => {
  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12">
          {homepage.mission_statement && (
            <div>
              <h3 
                className="text-2xl font-bold mb-4"
                style={{ color: homepage.primary_color }}
              >
                Our Mission
              </h3>
              <p className="text-gray-600 leading-relaxed">{homepage.mission_statement}</p>
            </div>
          )}
          
          {homepage.vision_statement && (
            <div>
              <h3 
                className="text-2xl font-bold mb-4"
                style={{ color: homepage.primary_color }}
              >
                Our Vision
              </h3>
              <p className="text-gray-600 leading-relaxed">{homepage.vision_statement}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// News Section Component
const NewsSection = ({ homepage }) => {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 
          className="text-3xl font-bold text-center mb-12"
          style={{ color: homepage.primary_color }}
        >
          Latest News
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {homepage.latest_news.map((news, index) => (
            <div key={index} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-sm text-gray-500 mb-2">
                {new Date(news.date).toLocaleDateString()}
              </div>
              <h3 className="text-xl font-semibold mb-2">{news.title}</h3>
              <p className="text-gray-600">{news.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Gallery Section Component
const GallerySection = ({ homepage }) => {
  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 
          className="text-3xl font-bold text-center mb-12"
          style={{ color: homepage.primary_color }}
        >
          School Gallery
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {homepage.gallery_images.map((image, index) => (
            <div key={index} className="relative aspect-square overflow-hidden rounded-lg">
              <img 
                src={image.url} 
                alt={image.caption || `School image ${index + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Testimonials Section Component
const TestimonialsSection = ({ homepage }) => {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 
          className="text-3xl font-bold text-center mb-12"
          style={{ color: homepage.primary_color }}
        >
          What People Say
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {homepage.testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold mr-4">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
              <p className="text-gray-600 italic">"{testimonial.content}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Contact Section Component
const ContactSection = ({ school, homepage }) => {
  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 
          className="text-3xl font-bold text-center mb-12"
          style={{ color: homepage.primary_color }}
        >
          Get in Touch
        </h2>
        
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
            
            <div className="space-y-3">
              {homepage.contact_email && (
                <div className="flex items-center">
                  <span className="mr-3">📧</span>
                  <a href={`mailto:${homepage.contact_email}`} className="text-blue-600 hover:underline">
                    {homepage.contact_email}
                  </a>
                </div>
              )}
              
              {homepage.contact_phone && (
                <div className="flex items-center">
                  <span className="mr-3">📞</span>
                  <a href={`tel:${homepage.contact_phone}`} className="text-blue-600 hover:underline">
                    {homepage.contact_phone}
                  </a>
                </div>
              )}
              
              {(homepage.address || school.city) && (
                <div className="flex items-start">
                  <span className="mr-3 mt-1">📍</span>
                  <div>
                    {homepage.address && <div>{homepage.address}</div>}
                    {school.city && <div>{school.city}, {school.state}</div>}
                    {homepage.postal_code && <div>{homepage.postal_code}</div>}
                  </div>
                </div>
              )}
              
              {homepage.website_url && (
                <div className="flex items-center">
                  <span className="mr-3">🌐</span>
                  <a href={homepage.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a 
                href={`https://${school.domain}/login`}
                className="block w-full text-center px-6 py-3 text-white rounded-md hover:opacity-90 transition-opacity"
                style={{ backgroundColor: homepage.primary_color }}
              >
                Login to Portal
              </a>
              <a 
                href={`https://${school.domain}/register`}
                className="block w-full text-center px-6 py-3 border-2 rounded-md hover:bg-gray-50 transition-colors"
                style={{ borderColor: homepage.primary_color, color: homepage.primary_color }}
              >
                New Registration
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Footer Section Component
const FooterSection = ({ school, homepage }) => {
  return (
    <footer className="bg-gray-900 text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">{school.name}</h3>
            <p className="text-gray-400">
              {homepage.welcome_message}
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href={`https://${school.domain}/login`} className="text-gray-400 hover:text-white">Student Portal</a></li>
              <li><a href={`https://${school.domain}/register`} className="text-gray-400 hover:text-white">Registration</a></li>
              <li><a href={`https://schoolshubs.com`} className="text-gray-400 hover:text-white">Main Platform</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              {homepage.facebook_url && (
                <a href={homepage.facebook_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                  Facebook
                </a>
              )}
              {homepage.twitter_url && (
                <a href={homepage.twitter_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                  Twitter
                </a>
              )}
              {homepage.instagram_url && (
                <a href={homepage.instagram_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                  Instagram
                </a>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} {school.name}. All rights reserved.</p>
          <p className="text-sm mt-1">{homepage.footer_text}</p>
        </div>
      </div>
    </footer>
  );
};

export default SchoolHomepage;
