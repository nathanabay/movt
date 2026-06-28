import { useEffect, useState, useRef } from 'react';
import { fetchTrending, fetchProviderContent } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import { useWatchlist, useWatchHistory } from '../hooks/useUserData';
import './Home.css';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const SlickSlider = Slider.default || Slider;

const PROVIDERS = [
  { name: 'Netflix', id: 8 },
  { name: 'Prime Video', id: 119 },
  { name: 'Disney+', id: 337 },
  { name: 'Apple TV+', id: 350 },
  { name: 'Max', id: 384 },
  { name: 'Hulu', id: 15 }
];

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
        const trendingPromise = fetchTrending('movie');
        
        const catalogPromises = PROVIDERS.flatMap(provider => [
          fetchProviderContent(provider.id, 'movie').then(data => ({
            name: `${provider.name} Movies`,
            data: data.results
          })).catch(err => {
            console.error(`Failed to fetch ${provider.name} Movies`, err);
            return null;
          }),
          fetchProviderContent(provider.id, 'tv').then(data => ({
            name: `${provider.name} TV Shows`,
            data: data.results
          })).catch(err => {
            console.error(`Failed to fetch ${provider.name} TV Shows`, err);
            return null;
          })
        ]);

        const [trendingData, ...catalogsResults] = await Promise.all([
          trendingPromise,
          ...catalogPromises
        ]);

        setTrending(trendingData.results);

        const catalogsData = {};
        for (const result of catalogsResults) {
          if (result && result.data && result.data.length > 0) {
            catalogsData[result.name] = result.data;
          }
        }
        
        setCatalogs(catalogsData);
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

  if (loading) return <div className="page-loader"><div className="spinner"></div></div>;
  if (error) return <div className="error-message">{error}</div>;

  const featuredMovie = trending[0];
  const rowMovies = trending.slice(1);

  return (
    <div className="home-page fade-in">
      {featuredMovie && (
        <section 
          className="hero-section"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(20,20,20,0.2), var(--bg-secondary)), url(https://image.tmdb.org/t/p/original${featuredMovie.backdrop_path})`
          }}
        >
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
