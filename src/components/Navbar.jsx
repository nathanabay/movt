import { Link, useNavigate } from 'react-router-dom';
import { Search, Play, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [query, setQuery] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const navigate = useNavigate();
  const { user, login, register, logout } = useAuth() || {};

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
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

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        await login(authForm.username, authForm.password);
      } else {
        await register(authForm.username, authForm.password);
      }
      setShowAuth(false);
      setAuthForm({ username: '', password: '' });
    } catch (err) {
      alert(err.message);
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
          <Link to="/torbox" className="nav-link">Downloads</Link>
          <Link to="/watchlist" className="nav-link">Watchlist</Link>
          {user ? (
            <div className="nav-user">
              <span className="nav-link"><User size={18} /> {user.username}</span>
              <button className="nav-link auth-btn" onClick={logout}>Logout</button>
            </div>
          ) : (
            <button className="nav-link auth-btn" onClick={() => setShowAuth(true)}>Login</button>
          )}
        </div>
      </div>

      {showAuth && (
        <div className="auth-modal" onClick={() => setShowAuth(false)}>
          <div className="auth-content" onClick={e => e.stopPropagation()}>
            <h2>{authMode === 'login' ? 'Sign In' : 'Register'}</h2>
            <form onSubmit={handleAuth}>
              <input type="text" placeholder="Username" required value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
              <input type="password" placeholder="Password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
              <button type="submit" className="auth-submit">{authMode === 'login' ? 'Login' : 'Sign Up'}</button>
            </form>
            <p onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="auth-toggle">
              {authMode === 'login' ? "Need an account? Register" : "Already have an account? Login"}
            </p>
            <button className="auth-close" onClick={() => setShowAuth(false)}>Cancel</button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
