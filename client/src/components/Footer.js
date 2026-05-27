import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Github, Linkedin, Twitter } from 'lucide-react';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About Section */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Schools Hubs</h3>
            <p className="text-sm text-gray-400 mb-4">
              Revolutionizing online examination management for educational institutions worldwide.
            </p>
            <div className="flex gap-4">
              <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Github size={20} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="hover:text-blue-400 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-blue-400 transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-blue-400 transition-colors">
                  Security
                </a>
              </li>
              <li>
                <a href="#roadmap" className="hover:text-blue-400 transition-colors">
                  Roadmap
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#about" className="hover:text-blue-400 transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#blog" className="hover:text-blue-400 transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#careers" className="hover:text-blue-400 transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-blue-400 transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy-policy" className="hover:text-blue-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="hover:text-blue-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="hover:text-blue-400 transition-colors">
                  Disclaimer
                </Link>
              </li>
              <li>
                <a href="#cookies" className="hover:text-blue-400 transition-colors">
                  Cookie Settings
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-700 my-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
          <div className="mb-4 md:mb-0">
            <p>&copy; 2026 Schools Hubs. All rights reserved.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span>Made with</span>
            <Heart size={16} className="text-red-500 fill-red-500" />
            <span>by the Schools Hubs Team</span>
          </div>

          <div className="mt-4 md:mt-0 space-x-4 text-xs">
            <a href="#privacy" className="hover:text-blue-400 transition-colors">
              Privacy
            </a>
            <span>•</span>
            <a href="#security" className="hover:text-blue-400 transition-colors">
              Security
            </a>
            <span>•</span>
            <a href="#accessibility" className="hover:text-blue-400 transition-colors">
              Accessibility
            </a>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-8 pt-4 border-t border-gray-700 text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <span>Status: All Systems Operational</span>
            <span>Last Updated: May 24, 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
