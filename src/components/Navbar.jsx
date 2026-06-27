import { Link, useNavigate } from 'react-router-dom';
import { Search, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import './Navbar.css';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <nav className={`navbar ${isScrolled ? 'nav-black' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <Play className="logo-icon" size={28} />
          <span>TorMovies</span>
        </Link>
        <form className="navbar-search" onSubmit={handleSearch}>
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search movies..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/watchlist" className="nav-link">Watchlist</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
