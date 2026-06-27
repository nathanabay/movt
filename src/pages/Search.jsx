import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchMulti } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import './Search.css';

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setMovies([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const data = await searchMulti(query);
        setMovies(data.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [query]);

  return (
    <div className="search-page fade-in">
      <h1 className="search-title">Search Results for "{query}"</h1>
      
      {loading && <div className="page-loader"><div className="spinner"></div></div>}
      
      {error && <div className="error-message">{error}</div>}
      
      {!loading && !error && movies.length === 0 && (
        <div className="no-results">No movies found. Try another search term.</div>
      )}
      
      {!loading && !error && movies.length > 0 && (
        <div className="search-grid">
          {movies.map(movie => (
            <div key={movie.id} className="search-grid-item">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;
