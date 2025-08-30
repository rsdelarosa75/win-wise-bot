import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  Wind, 
  Thermometer, 
  Eye,
  Droplets,
  Settings
} from "lucide-react";

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  windSpeed: number;
  humidity: number;
  visibility: number;
  icon: string;
  impact: 'high' | 'medium' | 'low';
  bettingNotes: string[];
}

export function WeatherImpact() {
  const [apiKey, setApiKey] = useState(() => 
    localStorage.getItem('weather_api_key') || ''
  );
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  const mockWeatherData: WeatherData[] = [
    {
      location: "Ann Arbor, MI",
      temperature: 45,
      condition: "Light Rain",
      windSpeed: 12,
      humidity: 78,
      visibility: 6,
      icon: "rainy",
      impact: 'high',
      bettingNotes: [
        "Favors ground game over passing",
        "Under total points more likely",
        "Turnover risk increased"
      ]
    },
    {
      location: "Austin, TX", 
      temperature: 72,
      condition: "Clear",
      windSpeed: 5,
      humidity: 45,
      visibility: 10,
      icon: "sunny",
      impact: 'low',
      bettingNotes: [
        "Ideal conditions for offense",
        "No weather edge for either team"
      ]
    }
  ];

  useEffect(() => {
    // Use mock data initially, real API can be added later
    setWeatherData(mockWeatherData);
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem('weather_api_key', apiKey);
    toast({
      title: "API Key Saved",
      description: "Weather API key has been saved successfully",
    });
    setShowSettings(false);
  };

  const fetchWeatherForLocation = async (location: string) => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your WeatherAPI key to fetch live data",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${location}&aqi=no`
      );
      
      if (!response.ok) {
        throw new Error('Weather fetch failed');
      }
      
      const data = await response.json();
      
      // Transform API data to our format
      const weatherInfo: WeatherData = {
        location: data.location.name + ", " + data.location.region,
        temperature: Math.round(data.current.temp_f),
        condition: data.current.condition.text,
        windSpeed: Math.round(data.current.wind_mph),
        humidity: data.current.humidity,
        visibility: Math.round(data.current.vis_miles),
        icon: data.current.condition.icon,
        impact: getWeatherImpact(data.current),
        bettingNotes: generateBettingNotes(data.current)
      };

      setWeatherData(prev => [weatherInfo, ...prev.slice(0, 4)]);
      
      toast({
        title: "Weather Updated",
        description: `Weather data fetched for ${weatherInfo.location}`,
      });
      
    } catch (error) {
      toast({
        title: "Weather Fetch Failed",
        description: "Could not fetch weather data. Check your API key.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeatherImpact = (current: any): 'high' | 'medium' | 'low' => {
    if (current.precip_mm > 5 || current.wind_mph > 20 || current.temp_f < 35) {
      return 'high';
    }
    if (current.precip_mm > 1 || current.wind_mph > 10 || current.temp_f < 45) {
      return 'medium';
    }
    return 'low';
  };

  const generateBettingNotes = (current: any): string[] => {
    const notes = [];
    
    if (current.precip_mm > 5) {
      notes.push("Heavy precipitation favors rushing attack");
      notes.push("Consider under on total points");
    } else if (current.precip_mm > 1) {
      notes.push("Light precipitation may affect passing game");
    }
    
    if (current.wind_mph > 20) {
      notes.push("Strong winds impact long passes and kicks");
    } else if (current.wind_mph > 10) {
      notes.push("Moderate winds may affect field goals");
    }
    
    if (current.temp_f < 35) {
      notes.push("Extreme cold affects ball handling");
    }
    
    if (notes.length === 0) {
      notes.push("Good weather conditions for normal game flow");
    }
    
    return notes;
  };

  const getWeatherIcon = (condition: string) => {
    if (condition.toLowerCase().includes('rain')) return CloudRain;
    if (condition.toLowerCase().includes('snow')) return CloudSnow;
    if (condition.toLowerCase().includes('cloud')) return Cloud;
    return Sun;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'border-loss/30 text-loss';
      case 'medium': return 'border-neutral/30 text-neutral';
      case 'low': return 'border-win/30 text-win';
      default: return 'border-muted/30 text-muted-foreground';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Cloud className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-xl">Weather Impact</CardTitle>
              <CardDescription>
                Current conditions affecting game outcomes
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {showSettings && (
          <div className="p-4 bg-secondary/20 rounded-lg space-y-3">
            <Label htmlFor="weather-api">WeatherAPI Key (Free at weatherapi.com)</Label>
            <div className="flex gap-2">
              <Input
                id="weather-api"
                placeholder="Enter your WeatherAPI key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
              />
              <Button onClick={handleSaveApiKey} disabled={!apiKey}>
                Save
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Get a free API key at weatherapi.com (10,000 calls/month free)
            </div>
          </div>
        )}

        <div className="space-y-3">
          {weatherData.map((weather, index) => {
            const WeatherIcon = getWeatherIcon(weather.condition);
            
            return (
              <div key={index} className="p-4 bg-background/50 rounded-lg border border-border/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <WeatherIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{weather.location}</h4>
                      <p className="text-xs text-muted-foreground">{weather.condition}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getImpactColor(weather.impact)}>
                    {weather.impact} impact
                  </Badge>
                </div>

                {/* Weather Stats */}
                <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                  <div className="space-y-1">
                    <Thermometer className="w-4 h-4 mx-auto text-muted-foreground" />
                    <div className="text-sm font-medium">{weather.temperature}°F</div>
                  </div>
                  <div className="space-y-1">
                    <Wind className="w-4 h-4 mx-auto text-muted-foreground" />
                    <div className="text-sm font-medium">{weather.windSpeed} mph</div>
                  </div>
                  <div className="space-y-1">
                    <Droplets className="w-4 h-4 mx-auto text-muted-foreground" />
                    <div className="text-sm font-medium">{weather.humidity}%</div>
                  </div>
                  <div className="space-y-1">
                    <Eye className="w-4 h-4 mx-auto text-muted-foreground" />
                    <div className="text-sm font-medium">{weather.visibility} mi</div>
                  </div>
                </div>

                {/* Betting Impact Notes */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Betting Impact:</div>
                  {weather.bettingNotes.map((note, noteIndex) => (
                    <div key={noteIndex} className="text-xs text-muted-foreground flex items-center gap-2">
                      <div className="w-1 h-1 bg-current rounded-full" />
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-center text-muted-foreground pt-2 border-t border-border/50">
          Weather data helps identify betting edges in outdoor sports
        </div>
      </CardContent>
    </Card>
  );
}