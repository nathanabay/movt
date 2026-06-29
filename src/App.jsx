import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const MovieDetails = lazy(() => import('./pages/MovieDetails'));
const Search = lazy(() => import('./pages/Search'));
const TorboxList = lazy(() => import('./pages/TorboxList'));

// Loading fallback
const PageLoader = () => (
  <div className="page-loader" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinner"></div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="app">
        <Toaster position="bottom-right" />
        <Navbar />
        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/torbox" element={<TorboxList />} />
              <Route path="/movie/:id" element={<MovieDetails type="movie" />} />
              <Route path="/tv/:id" element={<MovieDetails type="tv" />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;
