import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span>© {new Date().getFullYear()} NexusAI · Regional news, summarised and fact-checked by AI</span>
        <Link to="/about" className="footer-link">How it’s built</Link>
      </div>
    </footer>
  );
}
