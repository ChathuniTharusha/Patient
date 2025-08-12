import React from 'react';
import '../css/Footer.css';

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer-shadow">
      <div className="footer-container">
        <p className="copyright">© {year} Patient Portal. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;