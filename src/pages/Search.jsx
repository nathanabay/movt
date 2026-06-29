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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setPage(1);
      if (!query) {
        setMovies([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const data = await searchMulti(query, 1);
        setHasMore(data.page < data.total_pages);
        setMovies(data.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [query]);


  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await searchMulti(query, nextPage);
      setMovies(prev => [...prev, ...(data.results || [])]);
      setPage(nextPage);
      setHasMore(data.page < data.total_pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="search-page fade-in">
      <h1 className="search-title">Search Results for "{query}"</h1>
      
      {loading && <div className="page-loader"><div className="spinner"></div></div>}
      
      {error && <div className="error-message">{error}</div>}
      
      {!loading && !error && movies.length === 0 && (
        <div className="no-results">No movies found. Try another search term.</div>
      )}
      
      
      {!loading && !error && movies.length > 0 && (
        <>
          <div className="search-grid">
            {movies.map(movie => (
              <div key={movie.id} className="search-grid-item">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}>
              <button 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  cursor: loadingMore ? 'default' : 'pointer',
                  fontSize: '1rem',
                  transition: 'background-color 0.2s'
                }}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Search;
