const fs = require('fs');

// --- 1. Fix MovieCard.jsx (A11y and HTML validity) ---
let movieCard = fs.readFileSync('src/components/MovieCard.jsx', 'utf8');

// Replace import
movieCard = movieCard.replace(
  "import { Link } from 'react-router-dom';",
  "import { useNavigate } from 'react-router-dom';"
);

// Add useNavigate
movieCard = movieCard.replace(
  "const [trailerKey, setTrailerKey] = useState(null);",
  "const [trailerKey, setTrailerKey] = useState(null);\n  const navigate = useNavigate();"
);

// Replace Link wrapper for poster
movieCard = movieCard.replace(
  '<Link to={linkPath} className="movie-card fade-in" tabIndex={-1}>',
  '<div \n        className="movie-card fade-in" \n        tabIndex={0} \n        role="button" \n        onClick={() => navigate(linkPath)}\n        onKeyDown={(e) => { if (e.key === "Enter") navigate(linkPath); }}\n      >'
);
movieCard = movieCard.replace('</Link>', '</div>');

// Replace Link wrapper for portal
movieCard = movieCard.replace(
  '<Link to={linkPath} style={{textDecoration: \'none\'}}>',
  '<div \n            style={{textDecoration: \'none\', cursor: \'pointer\'}} \n            onClick={() => navigate(linkPath)}\n          >'
);
movieCard = movieCard.replace('</Link>', '</div>');

fs.writeFileSync('src/components/MovieCard.jsx', movieCard);


// --- 2. Fix Search.jsx (Pagination / Load More) ---
let tmdb = fs.readFileSync('src/services/tmdb.js', 'utf8');
tmdb = tmdb.replace(
  'export const searchMulti = async (query) => {',
  'export const searchMulti = async (query, page = 1) => {'
);
tmdb = tmdb.replace(
  '/api/tmdb/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US',
  '/api/tmdb/search/multi?query=${encodeURIComponent(query)}&page=${page}&include_adult=false&language=en-US'
);
fs.writeFileSync('src/services/tmdb.js', tmdb);

let searchJsx = fs.readFileSync('src/pages/Search.jsx', 'utf8');
searchJsx = searchJsx.replace(
  "const [error, setError] = useState(null);",
  "const [error, setError] = useState(null);\n  const [page, setPage] = useState(1);\n  const [hasMore, setHasMore] = useState(false);\n  const [loadingMore, setLoadingMore] = useState(false);"
);
// Reset on query change
searchJsx = searchJsx.replace(
  "if (!query) {",
  "setPage(1);\n      if (!query) {"
);
searchJsx = searchJsx.replace(
  "const data = await searchMulti(query);",
  "const data = await searchMulti(query, 1);\n        setHasMore(data.page < data.total_pages);"
);
// Add handleLoadMore
const loadMoreFunc = `
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
`;
searchJsx = searchJsx.replace("  return (", loadMoreFunc + "\n  return (");

// Add button to render
const loadMoreBtn = `
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
      )}`;

searchJsx = searchJsx.replace(
  /\{\!loading && \!error && movies\.length > 0 && \([\s\S]*?\)\}/,
  loadMoreBtn
);
fs.writeFileSync('src/pages/Search.jsx', searchJsx);


// --- 3. Fix Home.jsx (Row-level skeletons) ---
let homeJsx = fs.readFileSync('src/pages/Home.jsx', 'utf8');

// Replace the generic catalogs render logic
const oldCatalogsLoop = `{Object.keys(catalogs).map((catalogName) => {
        const catalogMovies = catalogs[catalogName];
        if (!catalogMovies || catalogMovies.length === 0) return null;
        
        return (
          <section key={catalogName} className="movies-row-section">
            <h2 className="row-title">{catalogName}</h2>
            <div className="slick-row" onWheel={(e) => {
              if (!catalogSliderRefs.current[catalogName]) return;
              handleWheel(e, { current: catalogSliderRefs.current[catalogName] });
            }}>
              <SlickSlider ref={el => catalogSliderRefs.current[catalogName] = el} {...sliderSettings} infinite={catalogMovies.length > 6}>
                {catalogMovies.map(movie => (
                  <div key={movie.id} className="row-item-wrapper">
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </SlickSlider>
            </div>
          </section>
        );
      })}`;

const newCatalogsLoop = `{catalogQueries.map((query, idx) => {
        const def = catalogDefinitions[idx];
        
        if (query.isLoading) {
          return (
            <section key={def.name + '_skeleton'} className="movies-row-section">
              <h2 className="row-title">{def.name}</h2>
              <div className="skeleton-row" style={{ marginTop: '10px' }}>
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton skeleton-card"></div>)}
              </div>
            </section>
          );
        }

        const catalogMovies = query.data?.results;
        if (!catalogMovies || catalogMovies.length === 0) return null;
        
        return (
          <section key={def.name} className="movies-row-section">
            <h2 className="row-title">{def.name}</h2>
            <div className="slick-row" onWheel={(e) => {
              if (!catalogSliderRefs.current[def.name]) return;
              handleWheel(e, { current: catalogSliderRefs.current[def.name] });
            }}>
              <SlickSlider ref={el => catalogSliderRefs.current[def.name] = el} {...sliderSettings} infinite={catalogMovies.length > 6}>
                {catalogMovies.map(movie => (
                  <div key={movie.id} className="row-item-wrapper">
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </SlickSlider>
            </div>
          </section>
        );
      })}`;

homeJsx = homeJsx.replace(oldCatalogsLoop, newCatalogsLoop);
fs.writeFileSync('src/pages/Home.jsx', homeJsx);

console.log("UX Fixes applied.");
