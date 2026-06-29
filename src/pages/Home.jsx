import { useEffect, useState, useRef } from 'react';
import { fetchTrending, fetchGenreContent, fetchPopular, fetchTopRated, fetchUpcoming } from '../services/tmdb';
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
        const [
          trendingData, trendingTvData, popularMoviesData, topRatedMoviesData, upcomingMoviesData, popularTvData, topRatedTvData,
          actionData, comedyData, sciFiData, horrorData, romanceData, animationData,
          dramaData, thrillerData, crimeData, mysteryData, documentaryData,
          familyData, historyData, musicData, warData, westernData,
          actionTvData, comedyTvData, realityTvData
        ] = await Promise.all([
          fetchTrending('movie'),
          fetchTrending('tv'),
          fetchPopular('movie'),
          fetchTopRated('movie'),
          fetchUpcoming(),
          fetchPopular('tv'),
          fetchTopRated('tv'),
          fetchGenreContent(28, 'movie'),
          fetchGenreContent(35, 'movie'),
          fetchGenreContent(878, 'movie'),
          fetchGenreContent(27, 'movie'),
          fetchGenreContent(10749, 'movie'),
          fetchGenreContent(16, 'movie'),
          fetchGenreContent(18, 'movie'),
          fetchGenreContent(53, 'movie'),
          fetchGenreContent(80, 'movie'),
          fetchGenreContent(9648, 'movie'),
          fetchGenreContent(99, 'movie'),
          fetchGenreContent(10751, 'movie'),
          fetchGenreContent(36, 'movie'),
          fetchGenreContent(10402, 'movie'),
          fetchGenreContent(10752, 'movie'),
          fetchGenreContent(37, 'movie'),
          fetchGenreContent(10759, 'tv'),
          fetchGenreContent(35, 'tv'),
          fetchGenreContent(10764, 'tv')
        ]);

        setTrending(trendingData.results);
        setCatalogs({
          'Popular Movies': popularMoviesData.results,
          'Popular TV Shows': popularTvData.results,
          'Top Rated Movies': topRatedMoviesData.results,
          'Top Rated TV Shows': topRatedTvData.results,
          'Upcoming Movies': upcomingMoviesData.results,
          'Trending TV Shows': trendingTvData.results,
          'Top Rated Action': actionData.results,
          'Top Rated Comedies': comedyData.results,
          'Drama': dramaData.results,
          'Sci-Fi & Fantasy': sciFiData.results,
          'Thriller': thrillerData.results,
          'Crime': crimeData.results,
          'Horror Movies': horrorData.results,
          'Mystery': mysteryData.results,
          'Romance': romanceData.results,
          'Family Movies': familyData.results,
          'Animation': animationData.results,
          'History': historyData.results,
          'Music': musicData.results,
          'War': warData.results,
          'Western': westernData.results,
          'Action & Adventure TV': actionTvData.results,
          'Comedy TV Shows': comedyTvData.results,
          'Reality TV': realityTvData.results,
          'Documentaries': documentaryData.results
        });
      } catch (err) {
        setError(err.message);
      } finally {
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
