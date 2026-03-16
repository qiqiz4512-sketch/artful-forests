type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
type WeatherType = 'sunny' | 'rain' | 'snow';

interface Props {
  season: SeasonType;
  weather: WeatherType;
}

export default function WinterSeasonEffects({ season, weather: _weather }: Props) {
  const isWinter = season === 'winter';

  if (!isWinter) return null;

  return (
    <>
      <div className="winter-snowbank" aria-hidden="true">
        <img src="/assets/winter/snow-ground-top.svg" alt="" className="winter-snowbank-back" draggable={false} />
        <img src="/assets/winter/snow-ground-top.svg" alt="" className="winter-snowbank-top" draggable={false} />
        <img src="/assets/winter/snow-ground-top.svg" alt="" className="winter-snowbank-front" draggable={false} />
      </div>
    </>
  );
}
