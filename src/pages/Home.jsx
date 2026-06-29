import { useRef, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
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
  const navigate = useNavigate();

  const trendingSliderRef = useRef(null);
  const catalogSliderRefs = useRef({});

  const { watchlist } = useWatchlist();
  const { getContinueWatchingList } = useWatchHistory();
  const continueWatching = getContinueWatchingList();

  const { data: trendingRes, isLoading: trendingLoading, error: trendingError } = useQuery({
    queryKey: ['trending', 'movie'],
    queryFn: () => fetchTrending('movie')
  });

  const catalogDefinitions = useMemo(() => [
    { name: 'Now Playing in Theaters', fetcher: fetchNowPlaying, key: 'now_playing' },
    { name: 'Popular Movies', fetcher: () => fetchPopular('movie'), key: ['popular', 'movie'] },
    { name: 'Popular TV Shows', fetcher: () => fetchPopular('tv'), key: ['popular', 'tv'] },
    { name: 'On The Air', fetcher: fetchOnTheAir, key: 'on_the_air' },
    { name: 'Top Rated Movies', fetcher: () => fetchTopRated('movie'), key: ['top_rated', 'movie'] },
    { name: 'Top Rated TV Shows', fetcher: () => fetchTopRated('tv'), key: ['top_rated', 'tv'] },
    { name: 'Upcoming Movies', fetcher: fetchUpcoming, key: 'upcoming' },
    { name: 'Trending TV Shows', fetcher: () => fetchTrending('tv'), key: ['trending', 'tv'] },
    { name: 'Airing Today', fetcher: fetchAiringToday, key: 'airing_today' },
    { name: 'Top Rated Action', fetcher: () => fetchGenreContent(28, 'movie'), key: ['genre', 28, 'movie'] },
    { name: 'Top Rated Comedies', fetcher: () => fetchGenreContent(35, 'movie'), key: ['genre', 35, 'movie'] },
    { name: 'Sci-Fi & Fantasy', fetcher: () => fetchGenreContent(878, 'movie'), key: ['genre', 878, 'movie'] },
    { name: 'Horror Movies', fetcher: () => fetchGenreContent(27, 'movie'), key: ['genre', 27, 'movie'] },
    { name: 'Thriller', fetcher: () => fetchGenreContent(53, 'movie'), key: ['genre', 53, 'movie'] },
    { name: 'Crime', fetcher: () => fetchGenreContent(80, 'movie'), key: ['genre', 80, 'movie'] },
    { name: 'Mystery', fetcher: () => fetchGenreContent(9648, 'movie'), key: ['genre', 9648, 'movie'] },
    { name: 'Drama', fetcher: () => fetchGenreContent(18, 'movie'), key: ['genre', 18, 'movie'] },
    { name: 'Anime', fetcher: fetchAnime, key: 'anime' },
    { name: 'K-Dramas', fetcher: fetchKDramas, key: 'kdramas' },
    { name: 'Romance', fetcher: () => fetchGenreContent(10749, 'movie'), key: ['genre', 10749, 'movie'] },
    { name: 'Family Movies', fetcher: () => fetchGenreContent(10751, 'movie'), key: ['genre', 10751, 'movie'] },
    { name: 'Animation', fetcher: () => fetchGenreContent(16, 'movie'), key: ['genre', 16, 'movie'] },
    { name: 'History', fetcher: () => fetchGenreContent(36, 'movie'), key: ['genre', 36, 'movie'] },
    { name: 'Music', fetcher: () => fetchGenreContent(10402, 'movie'), key: ['genre', 10402, 'movie'] },
    { name: 'War', fetcher: () => fetchGenreContent(10752, 'movie'), key: ['genre', 10752, 'movie'] },
    { name: 'Western', fetcher: () => fetchGenreContent(37, 'movie'), key: ['genre', 37, 'movie'] },
    { name: 'Action & Adventure TV', fetcher: () => fetchGenreContent(10759, 'tv'), key: ['genre', 10759, 'tv'] },
    { name: 'Comedy TV Shows', fetcher: () => fetchGenreContent(35, 'tv'), key: ['genre', 35, 'tv'] },
    { name: 'Reality TV', fetcher: () => fetchGenreContent(10764, 'tv'), key: ['genre', 10764, 'tv'] },
    { name: 'Documentaries', fetcher: () => fetchGenreContent(99, 'movie'), key: ['genre', 99, 'movie'] }
  ], []);

  const catalogQueries = useQueries({
    queries: catalogDefinitions.map(def => ({
      queryKey: Array.isArray(def.key) ? def.key : [def.key],
      queryFn: def.fetcher,
      staleTime: 10 * 60 * 1000, // 10 minutes specifically for catalogs
    }))
  });

  const loading = trendingLoading;
  const error = trendingError ? trendingError.message : null;
  const trending = trendingRes?.results || [];

  const catalogs = {};
  catalogQueries.forEach((q, idx) => {
    if (q.data && q.data.results) {
      catalogs[catalogDefinitions[idx].name] = q.data.results;
    }
  });

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
