import { useEffect, useState, useRef } from 'react';
import { fetchTrending, fetchGenreContent, fetchPopular, fetchTopRated, fetchUpcoming, fetchNowPlaying, fetchOnTheAir, fetchAiringToday, fetchAnime, fetchKDramas } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import { useWatchlist, useWatchHistory } from '../hooks/useUserData';
import './Home.css';
import '../components/Skeleton.css';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const SlickSlider = Slider.default || Slider;

const NextArrow = ({ onClick }) => (
  <button className="slick-arrow slick-next-custom" onClick={onClick}>
    <ChevronRight size={40} color="white" />
  </button>
);

const PrevArrow = ({ onClick }) => (
  <button className="slick-arrow slick-prev-custom" onClick={onClick}>
    <ChevronLeft size={40} color="white" />
  </button>
);

const Home = () => {
  const [trending, setTrending] = useState([]);
  const [catalogs, setCatalogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const trendingSliderRef = useRef(null);
  const catalogSliderRefs = useRef({});

  const { watchlist } = useWatchlist();
  const { getContinueWatchingList } = useWatchHistory();
  const continueWatching = getContinueWatchingList();

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        // Core fetch first to quickly show hero section
        const trendingRes = await fetchTrending('movie');
        setTrending(trendingRes.results);
        setLoading(false);

        const catalogDefinitions = [
          { name: 'Now Playing in Theaters', fetcher: fetchNowPlaying },
          { name: 'Popular Movies', fetcher: () => fetchPopular('movie') },
          { name: 'Popular TV Shows', fetcher: () => fetchPopular('tv') },
          { name: 'On The Air', fetcher: fetchOnTheAir },
          { name: 'Top Rated Movies', fetcher: () => fetchTopRated('movie') },
          { name: 'Top Rated TV Shows', fetcher: () => fetchTopRated('tv') },
          { name: 'Upcoming Movies', fetcher: fetchUpcoming },
          { name: 'Trending TV Shows', fetcher: () => fetchTrending('tv') },
          { name: 'Airing Today', fetcher: fetchAiringToday },
          { name: 'Top Rated Action', fetcher: () => fetchGenreContent(28, 'movie') },
          { name: 'Top Rated Comedies', fetcher: () => fetchGenreContent(35, 'movie') },
          { name: 'Sci-Fi & Fantasy', fetcher: () => fetchGenreContent(878, 'movie') },
          { name: 'Horror Movies', fetcher: () => fetchGenreContent(27, 'movie') },
          { name: 'Thriller', fetcher: () => fetchGenreContent(53, 'movie') },
          { name: 'Crime', fetcher: () => fetchGenreContent(80, 'movie') },
          { name: 'Mystery', fetcher: () => fetchGenreContent(9648, 'movie') },
          { name: 'Drama', fetcher: () => fetchGenreContent(18, 'movie') },
          { name: 'Anime', fetcher: fetchAnime },
          { name: 'K-Dramas', fetcher: fetchKDramas },
          { name: 'Romance', fetcher: () => fetchGenreContent(10749, 'movie') },
          { name: 'Family Movies', fetcher: () => fetchGenreContent(10751, 'movie') },
          { name: 'Animation', fetcher: () => fetchGenreContent(16, 'movie') },
          { name: 'History', fetcher: () => fetchGenreContent(36, 'movie') },
          { name: 'Music', fetcher: () => fetchGenreContent(10402, 'movie') },
          { name: 'War', fetcher: () => fetchGenreContent(10752, 'movie') },
          { name: 'Western', fetcher: () => fetchGenreContent(37, 'movie') },
          { name: 'Action & Adventure TV', fetcher: () => fetchGenreContent(10759, 'tv') },
          { name: 'Comedy TV Shows', fetcher: () => fetchGenreContent(35, 'tv') },
          { name: 'Reality TV', fetcher: () => fetchGenreContent(10764, 'tv') },
          { name: 'Documentaries', fetcher: () => fetchGenreContent(99, 'movie') }
        ];

        // Fetch the rest of the catalogs with Promise.allSettled
        // This ensures if one fails, it doesn't break the entire page
        const results = await Promise.allSettled(catalogDefinitions.map(def => def.fetcher()));
        
        const newCatalogs = {};
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value && result.value.results) {
            newCatalogs[catalogDefinitions[idx].name] = result.value.results;
          }
        });
        
        setCatalogs(newCatalogs);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    loadCatalogs();
  }, []);

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 6,
    slidesToScroll: 3,
    lazyLoad: 'ondemand',
    swipeToSlide: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      { breakpoint: 1400, settings: { slidesToShow: 5, slidesToScroll: 3 } },
      { breakpoint: 1100, settings: { slidesToShow: 4, slidesToScroll: 2 } },
      { breakpoint: 800, settings: { slidesToShow: 3, slidesToScroll: 2 } },
      { breakpoint: 500, settings: { slidesToShow: 2, slidesToScroll: 1 } },
    ]
  };

  const handleWheel = (e, sliderRef) => {
    // Prevent default vertical scroll if they are scrolling heavily horizontally
    if (!sliderRef || !sliderRef.current) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      if (e.deltaX > 0) {
        sliderRef.current.slickNext();
      } else {
        sliderRef.current.slickPrev();
      }
    }
  };

  if (loading) return (
    <div className="home-page fade-in">
      <div className="skeleton skeleton-hero"></div>
      <div className="skeleton-row">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton skeleton-card"></div>)}
      </div>
      <div className="skeleton-row">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton skeleton-card"></div>)}
      </div>
    </div>
  );
  if (error) return <div className="error-message">{error}</div>;

  const featuredMovie = trending[0];
  const rowMovies = trending.slice(1);

  return (
    <div className="home-page fade-in">
      {featuredMovie && (
        <section className="hero-section">
          <img 
            src={`https://image.tmdb.org/t/p/w1280${featuredMovie.backdrop_path}`} 
            srcSet={`https://image.tmdb.org/t/p/w780${featuredMovie.backdrop_path} 780w, https://image.tmdb.org/t/p/w1280${featuredMovie.backdrop_path} 1280w, https://image.tmdb.org/t/p/original${featuredMovie.backdrop_path} 1920w`}
            sizes="100vw"
            alt={featuredMovie.title || featuredMovie.name || 'Hero Banner'} 
            className="hero-backdrop-img"
            fetchpriority="high"
          />
          <div className="hero-gradient-overlay"></div>
          <div className="hero-content">
            <h1 className="hero-title">{featuredMovie.title || featuredMovie.name}</h1>
            <p className="hero-subtitle">{featuredMovie.overview?.length > 150 ? featuredMovie.overview.substring(0, 150) + '...' : featuredMovie.overview}</p>
            <div className="hero-buttons">
              <button className="btn-hero btn-play" onClick={() => navigate(`/movie/${featuredMovie.id}`)}>
                <Play fill="black" size={24} /> Play
              </button>
              <button className="btn-hero btn-info" onClick={() => navigate(`/movie/${featuredMovie.id}`)}>
                <Info size={24} /> More Info
              </button>
            </div>
          </div>
        </section>
      )}

      {continueWatching.length > 0 && (
        <section className="movies-row-section">
          <h2 className="row-title">Continue Watching</h2>
          <div className="slick-row">
            <SlickSlider {...sliderSettings} infinite={continueWatching.length > 6}>
              {continueWatching.map(movie => (
                <div key={movie.id} className="row-item-wrapper">
                  <MovieCard movie={movie} type={movie.media_type || 'movie'} />
                </div>
              ))}
            </SlickSlider>
          </div>
        </section>
      )}

      {watchlist.length > 0 && (
        <section className="movies-row-section">
          <h2 className="row-title">My List</h2>
          <div className="slick-row">
            <SlickSlider {...sliderSettings} infinite={watchlist.length > 6}>
              {watchlist.map(movie => (
                <div key={movie.id} className="row-item-wrapper">
                  <MovieCard movie={movie} type={movie.media_type || 'movie'} />
                </div>
              ))}
            </SlickSlider>
          </div>
        </section>
      )}

      <section className="movies-row-section">
        <h2 className="row-title">Trending Now</h2>
        <div className="slick-row" onWheel={(e) => handleWheel(e, trendingSliderRef)}>
          <SlickSlider ref={trendingSliderRef} {...sliderSettings} infinite={rowMovies.length > 6}>
            {rowMovies.map(movie => (
              <div key={movie.id} className="row-item-wrapper">
                <MovieCard movie={movie} />
              </div>
            ))}
          </SlickSlider>
        </div>
      </section>

      {Object.keys(catalogs).map((catalogName) => {
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
      })}
    </div>
  );
};

export default Home;
