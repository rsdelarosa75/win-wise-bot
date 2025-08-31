import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, Sun, CloudRain, CloudSnow, Wind } from 'lucide-react';

interface WeatherData {
  location: string;
  condition: string;
  temperature: number;
  windSpeed: number;
  humidity: number;
  icon: string;
  impact: 'high' | 'medium' | 'low';
  bettingNotes: string;
}

interface GameWeatherProps {
  games: Array<{
    id: string;
    team1: string;
    team2: string;
    commence_time: string;
    sport: string;
  }>;
}

// Map team names to their home cities
const TEAM_LOCATIONS: { [key: string]: string } = {
  // College Football Teams
  'South Carolina Gamecocks': 'Columbia, SC',
  'Virginia Tech Hokies': 'Blacksburg, VA', 
  'Miami Hurricanes': 'Miami, FL',
  'Notre Dame Fighting Irish': 'Notre Dame, IN',
  'North Carolina Tar Heels': 'Chapel Hill, NC',
  'TCU Horned Frogs': 'Fort Worth, TX',
  'SMU Mustangs': 'Dallas, TX',
  'Baylor Bears': 'Waco, TX',
  'Louisville Cardinals': 'Louisville, KY',
  'James Madison Dukes': 'Harrisonburg, VA',
  'UCLA Bruins': 'Los Angeles, CA',
  'Utah Utes': 'Salt Lake City, UT',
  'Washington Huskies': 'Seattle, WA',
  'Colorado State Rams': 'Fort Collins, CO',
  
  // NFL Teams
  'Chiefs': 'Kansas City, MO',
  'Bills': 'Buffalo, NY',
  'Yankees': 'New York, NY',
  'Red Sox': 'Boston, MA',
  'Lakers': 'Los Angeles, CA',
  'Celtics': 'Boston, MA',
  'Alabama': 'Tuscaloosa, AL',
  'Georgia': 'Athens, GA'
};

export const GameWeather = ({ games }: GameWeatherProps) => {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (games.length === 0) return;
    
    const fetchWeatherForGames = async () => {
      setLoading(true);
      
      // Get unique locations from current games
      const locations = new Set<string>();
      games.forEach(game => {
        const homeLocation = TEAM_LOCATIONS[game.team2];
        if (homeLocation) {
          locations.add(homeLocation);
        }
      });
      
      if (locations.size === 0) {
        // Use mock data if no locations found
        setWeatherData(getMockWeatherData(games));
        setLoading(false);
        return;
      }
      
      const apiKey = localStorage.getItem('weather_api_key');
      
      if (!apiKey) {
        // Use mock data if no API key
        setWeatherData(getMockWeatherData(games));
        setLoading(false);
        return;
      }
      
      try {
        const weatherPromises = Array.from(locations).map(async (location) => {
          const response = await fetch(
            `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(location)}`
          );
          
          if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
          }
          
          const data = await response.json();
          return mapWeatherData(data, location);
        });
        
        const results = await Promise.all(weatherPromises);
        setWeatherData(results);
      } catch (error) {
        console.error('Weather fetch error:', error);
        // Fallback to mock data
        setWeatherData(getMockWeatherData(games));
      } finally {
        setLoading(false);
      }
    };
    
    fetchWeatherForGames();
  }, [games]);

  const getMockWeatherData = (games: any[]): WeatherData[] => {
    const mockData: WeatherData[] = [];
    const processedLocations = new Set<string>();
    
    games.forEach(game => {
      const location = TEAM_LOCATIONS[game.team2];
      if (location && !processedLocations.has(location)) {
        processedLocations.add(location);
        
        // Create realistic mock weather based on location and sport
        const isSouthern = location.includes('FL') || location.includes('TX') || location.includes('SC');
        const isFootball = game.sport.includes('NCAAF') || game.sport.includes('Football');
        
        mockData.push({
          location,
          condition: isSouthern ? 'Partly cloudy' : 'Overcast',
          temperature: isSouthern ? 78 : 65,
          windSpeed: isFootball ? 8 : 5,
          humidity: isSouthern ? 72 : 58,
          icon: isSouthern ? 'partly-cloudy' : 'cloudy',
          impact: isFootball && (location.includes('FL') || location.includes('TX')) ? 'low' : 'medium',
          bettingNotes: isFootball 
            ? `${isSouthern ? 'Favorable' : 'Cool'} conditions for ${isSouthern ? 'passing' : 'running'} game`
            : 'Standard playing conditions expected'
        });
      }
    });
    
    return mockData;
  };

  const mapWeatherData = (apiData: any, location: string): WeatherData => {
    const condition = apiData.current.condition.text;
    const temp = Math.round(apiData.current.temp_f);
    const wind = Math.round(apiData.current.wind_mph);
    const humidity = apiData.current.humidity;
    
    return {
      location,
      condition,
      temperature: temp,
      windSpeed: wind,
      humidity,
      icon: apiData.current.condition.icon,
      impact: getWeatherImpact(condition, wind, temp),
      bettingNotes: generateBettingNotes(condition, wind, temp)
    };
  };

  const getWeatherImpact = (condition: string, wind: number, temp: number): 'high' | 'medium' | 'low' => {
    if (condition.toLowerCase().includes('rain') || wind > 15 || temp < 35 || temp > 95) {
      return 'high';
    }
    if (wind > 10 || temp < 45 || temp > 85 || condition.toLowerCase().includes('snow')) {
      return 'medium';
    }
    return 'low';
  };

  const generateBettingNotes = (condition: string, wind: number, temp: number): string => {
    if (condition.toLowerCase().includes('rain')) {
      return 'Wet conditions favor ground game, lower scoring';
    }
    if (wind > 15) {
      return 'High winds may impact passing and kicking accuracy';
    }
    if (temp < 40) {
      return 'Cold weather typically favors rushing offense';
    }
    if (temp > 90) {
      return 'Hot weather may affect player stamina in later quarters';
    }
    return 'Favorable conditions for balanced offensive play';
  };

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain')) return CloudRain;
    if (lower.includes('snow')) return CloudSnow;
    if (lower.includes('cloud')) return Cloud;
    if (lower.includes('wind')) return Wind;
    return Sun;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'border-loss/30 text-loss';
      case 'medium': return 'border-neutral/30 text-neutral';
      case 'low': return 'border-win/30 text-win';
      default: return 'border-muted/30 text-muted';
    }
  };

  if (games.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
      <h3 className="text-xl font-semibold mb-4">Game Weather Conditions</h3>
      
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {weatherData.map((weather, index) => {
            const WeatherIcon = getWeatherIcon(weather.condition);
            
            return (
              <div key={index} className="p-4 bg-secondary/20 rounded-lg border border-border/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <WeatherIcon className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="font-medium text-sm">{weather.location}</h4>
                      <p className="text-xs text-muted-foreground">{weather.condition}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getImpactColor(weather.impact)}`}
                  >
                    {weather.impact.charAt(0).toUpperCase() + weather.impact.slice(1)} Impact
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-3 text-xs">
                  <div className="text-center">
                    <div className="font-medium">{weather.temperature}°F</div>
                    <div className="text-muted-foreground">Temp</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{weather.windSpeed} mph</div>
                    <div className="text-muted-foreground">Wind</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{weather.humidity}%</div>
                    <div className="text-muted-foreground">Humidity</div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded">
                  <strong>Betting Notes:</strong> {weather.bettingNotes}
                </div>
              </div>
            );
          })}
          
          {weatherData.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              No weather data available for current games
            </div>
          )}
        </div>
      )}
    </Card>
  );
};