/* ==========================================================================
   DOPPEL X — catalog data (geo, timezones, hardware, devices, fonts, extensions)
   Extracted from the DOPPEL engine. Pure data + tz math; no DOM, no UI.
   ========================================================================== */
'use strict';
/* ================================================================ GEO DATA */
/* Each place: [name, lat, lon, tz] — tz offets/abbr resolved in tz.js */
const GEO = {
  US: [
    ['New York, NY', 40.7128, -74.0060, 'America/New_York'],
    ['Brooklyn, NY', 40.6782, -73.9442, 'America/New_York'],
    ['Jersey City, NJ', 40.7178, -74.0431, 'America/New_York'],
    ['Boston, MA', 42.3601, -71.0589, 'America/New_York'],
    ['Philadelphia, PA', 39.9526, -75.1652, 'America/New_York'],
    ['Atlanta, GA', 33.7490, -84.3880, 'America/New_York'],
    ['Miami, FL', 25.7617, -80.1918, 'America/New_York'],
    ['Charlotte, NC', 35.2271, -80.8431, 'America/New_York'],
    ['Washington, DC', 38.9072, -77.0369, 'America/New_York'],
    ['Chicago, IL', 41.8781, -87.6298, 'America/Chicago'],
    ['Nashville, TN', 36.1627, -86.7816, 'America/Chicago'],
    ['Austin, TX', 30.2672, -97.7431, 'America/Chicago'],
    ['Dallas, TX', 32.7767, -96.7970, 'America/Chicago'],
    ['Houston, TX', 29.7604, -95.3698, 'America/Chicago'],
    ['Minneapolis, MN', 44.9778, -93.2650, 'America/Chicago'],
    ['Denver, CO', 39.7392, -104.9903, 'America/Denver'],
    ['Phoenix, AZ', 33.4484, -112.0740, 'America/Phoenix'],
    ['Los Angeles, CA', 34.0522, -118.2437, 'America/Los_Angeles'],
    ['San Francisco, CA', 37.7749, -122.4194, 'America/Los_Angeles'],
    ['San Jose, CA', 37.3382, -121.8863, 'America/Los_Angeles'],
    ['San Diego, CA', 32.7157, -117.1611, 'America/Los_Angeles'],
    ['Seattle, WA', 47.6062, -122.3321, 'America/Los_Angeles'],
    ['Portland, OR', 45.5152, -122.6784, 'America/Los_Angeles'],
    ['Las Vegas, NV', 36.1699, -115.1398, 'America/Los_Angeles'],
    ['Salt Lake City, UT', 40.7608, -111.8910, 'America/Denver'],
  ],
  CA: [
    ['Toronto, ON', 43.6532, -79.3832, 'America/Toronto'],
    ['Montreal, QC', 45.5017, -73.5673, 'America/Toronto'],
    ['Ottawa, ON', 45.4215, -75.6972, 'America/Toronto'],
    ['Vancouver, BC', 49.2827, -123.1207, 'America/Vancouver'],
    ['Calgary, AB', 51.0447, -114.0719, 'America/Edmonton'],
    ['Edmonton, AB', 53.5461, -113.4938, 'America/Edmonton'],
    ['Winnipeg, MB', 49.8951, -97.1384, 'America/Winnipeg'],
    ['Halifax, NS', 44.6488, -63.5752, 'America/Halifax'],
  ],
  GB: [
    ['London, England', 51.5072, -0.1276, 'Europe/London'],
    ['Manchester, England', 53.4808, -2.2426, 'Europe/London'],
    ['Birmingham, England', 52.4862, -1.8904, 'Europe/London'],
    ['Leeds, England', 53.8008, -1.5491, 'Europe/London'],
    ['Bristol, England', 51.4545, -2.5879, 'Europe/London'],
    ['Glasgow, Scotland', 55.8642, -4.2518, 'Europe/London'],
    ['Edinburgh, Scotland', 55.9533, -3.1883, 'Europe/London'],
    ['Cardiff, Wales', 51.4816, -3.1791, 'Europe/London'],
    ['Belfast, N. Ireland', 54.5973, -5.9301, 'Europe/London'],
  ],
  DE: [
    ['Berlin', 52.5200, 13.4050, 'Europe/Berlin'],
    ['Munich', 48.1351, 11.5820, 'Europe/Berlin'],
    ['Hamburg', 53.5511, 9.9937, 'Europe/Berlin'],
    ['Cologne', 50.9375, 6.9603, 'Europe/Berlin'],
    ['Frankfurt', 50.1109, 8.6821, 'Europe/Berlin'],
    ['Stuttgart', 48.7758, 9.1829, 'Europe/Berlin'],
    ['Düsseldorf', 51.2277, 6.7735, 'Europe/Berlin'],
    ['Leipzig', 51.3397, 12.3731, 'Europe/Berlin'],
  ],
  FR: [
    ['Paris', 48.8566, 2.3522, 'Europe/Paris'],
    ['Lyon', 45.7640, 4.8357, 'Europe/Paris'],
    ['Marseille', 43.2965, 5.3698, 'Europe/Paris'],
    ['Toulouse', 43.6047, 1.4442, 'Europe/Paris'],
    ['Lille', 50.6292, 3.0573, 'Europe/Paris'],
    ['Bordeaux', 44.8378, -0.5792, 'Europe/Paris'],
    ['Nice', 43.7102, 7.2620, 'Europe/Paris'],
  ],
  NL: [
    ['Amsterdam', 52.3676, 4.9041, 'Europe/Amsterdam'],
    ['Rotterdam', 51.9244, 4.4777, 'Europe/Amsterdam'],
    ['The Hague', 52.0705, 4.3007, 'Europe/Amsterdam'],
    ['Utrecht', 52.0907, 5.1214, 'Europe/Amsterdam'],
    ['Eindhoven', 51.4416, 5.4697, 'Europe/Amsterdam'],
  ],
  ES: [
    ['Madrid', 40.4168, -3.7038, 'Europe/Madrid'],
    ['Barcelona', 41.3874, 2.1686, 'Europe/Madrid'],
    ['Valencia', 39.4699, -0.3763, 'Europe/Madrid'],
    ['Seville', 37.3891, -5.9845, 'Europe/Madrid'],
    ['Bilbao', 43.2630, -2.9350, 'Europe/Madrid'],
    ['Málaga', 36.7213, -4.4214, 'Europe/Madrid'],
  ],
  IT: [
    ['Milan', 45.4642, 9.1900, 'Europe/Rome'],
    ['Rome', 41.9028, 12.4964, 'Europe/Rome'],
    ['Turin', 45.0703, 7.6869, 'Europe/Rome'],
    ['Naples', 40.8518, 14.2681, 'Europe/Rome'],
    ['Bologna', 44.4949, 11.3426, 'Europe/Rome'],
    ['Florence', 43.7696, 11.2558, 'Europe/Rome'],
  ],
  SE: [
    ['Stockholm', 59.3293, 18.0686, 'Europe/Stockholm'],
    ['Gothenburg', 57.7089, 11.9746, 'Europe/Stockholm'],
    ['Malmö', 55.6050, 13.0038, 'Europe/Stockholm'],
  ],
  PL: [
    ['Warsaw', 52.2297, 21.0122, 'Europe/Warsaw'],
    ['Kraków', 50.0647, 19.9450, 'Europe/Warsaw'],
    ['Gdańsk', 54.3520, 18.6466, 'Europe/Warsaw'],
    ['Wrocław', 51.1079, 17.0385, 'Europe/Warsaw'],
    ['Poznań', 52.4064, 16.9252, 'Europe/Warsaw'],
  ],
  CH: [
    ['Zurich', 47.3769, 8.5417, 'Europe/Zurich'],
    ['Geneva', 46.2044, 6.1432, 'Europe/Zurich'],
    ['Basel', 47.5596, 7.5886, 'Europe/Zurich'],
    ['Bern', 46.9480, 7.4474, 'Europe/Zurich'],
  ],
  AT: [
    ['Vienna', 48.2082, 16.3738, 'Europe/Vienna'],
    ['Graz', 47.0707, 15.4395, 'Europe/Vienna'],
    ['Salzburg', 47.8095, 13.0550, 'Europe/Vienna'],
  ],
  PT: [
    ['Lisbon', 38.7223, -9.1393, 'Europe/Lisbon'],
    ['Porto', 41.1579, -8.6291, 'Europe/Lisbon'],
  ],
  IE: [
    ['Dublin', 53.3498, -6.2603, 'Europe/Dublin'],
    ['Cork', 51.8985, -8.4756, 'Europe/Dublin'],
  ],
  FI: [
    ['Helsinki', 60.1699, 24.9384, 'Europe/Helsinki'],
    ['Tampere', 61.4978, 23.7610, 'Europe/Helsinki'],
  ],
  NO: [
    ['Oslo', 59.9139, 10.7522, 'Europe/Oslo'],
    ['Bergen', 60.3913, 5.3221, 'Europe/Oslo'],
  ],
  DK: [
    ['Copenhagen', 55.6761, 12.5683, 'Europe/Copenhagen'],
    ['Aarhus', 56.1629, 10.2039, 'Europe/Copenhagen'],
  ],
  TR: [
    ['Istanbul', 41.0082, 28.9784, 'Europe/Istanbul'],
    ['Ankara', 39.9334, 32.8597, 'Europe/Istanbul'],
    ['Izmir', 38.4237, 27.1428, 'Europe/Istanbul'],
    ['Antalya', 36.8969, 30.7133, 'Europe/Istanbul'],
    ['Bursa', 40.1885, 29.0610, 'Europe/Istanbul'],
  ],
  AE: [
    ['Dubai', 25.2048, 55.2708, 'Asia/Dubai'],
    ['Abu Dhabi', 24.4539, 54.3773, 'Asia/Dubai'],
    ['Sharjah', 25.3463, 55.4209, 'Asia/Dubai'],
  ],
  IN: [
    ['Mumbai', 19.0760, 72.8777, 'Asia/Kolkata'],
    ['Delhi', 28.7041, 77.1025, 'Asia/Kolkata'],
    ['Bengaluru', 12.9716, 77.5946, 'Asia/Kolkata'],
    ['Hyderabad', 17.3850, 78.4867, 'Asia/Kolkata'],
    ['Pune', 18.5204, 73.8567, 'Asia/Kolkata'],
    ['Chennai', 13.0827, 80.2707, 'Asia/Kolkata'],
    ['Ahmedabad', 23.0225, 72.5714, 'Asia/Kolkata'],
  ],
  ID: [
    ['Jakarta', -6.2088, 106.8456, 'Asia/Jakarta'],
    ['Surabaya', -7.2575, 112.7521, 'Asia/Jakarta'],
    ['Bandung', -6.9175, 107.6191, 'Asia/Jakarta'],
    ['Denpasar', -8.6500, 115.2167, 'Asia/Makassar'],
    ['Medan', 3.5952, 98.6722, 'Asia/Jakarta'],
  ],
  SG: [['Singapore', 1.3521, 103.8198, 'Asia/Singapore']],
  MY: [
    ['Kuala Lumpur', 3.1390, 101.6869, 'Asia/Kuala_Lumpur'],
    ['Penang', 5.4141, 100.3288, 'Asia/Kuala_Lumpur'],
    ['Johor Bahru', 1.4927, 103.7414, 'Asia/Kuala_Lumpur'],
  ],
  JP: [
    ['Tokyo', 35.6762, 139.6503, 'Asia/Tokyo'],
    ['Osaka', 34.6937, 135.5023, 'Asia/Tokyo'],
    ['Yokohama', 35.4437, 139.6380, 'Asia/Tokyo'],
    ['Nagoya', 35.1815, 136.9066, 'Asia/Tokyo'],
    ['Fukuoka', 33.5904, 130.4017, 'Asia/Tokyo'],
  ],
  KR: [
    ['Seoul', 37.5665, 126.9780, 'Asia/Seoul'],
    ['Busan', 35.1796, 129.0756, 'Asia/Seoul'],
    ['Incheon', 37.4563, 126.7052, 'Asia/Seoul'],
  ],
  VN: [
    ['Ho Chi Minh City', 10.8231, 106.6297, 'Asia/Ho_Chi_Minh'],
    ['Hanoi', 21.0278, 105.8342, 'Asia/Ho_Chi_Minh'],
    ['Da Nang', 16.0544, 108.2022, 'Asia/Ho_Chi_Minh'],
  ],
  TH: [
    ['Bangkok', 13.7563, 100.5018, 'Asia/Bangkok'],
    ['Chiang Mai', 18.7883, 98.9853, 'Asia/Bangkok'],
    ['Phuket', 7.8804, 98.3923, 'Asia/Bangkok'],
  ],
  PH: [
    ['Manila', 14.5995, 120.9842, 'Asia/Manila'],
    ['Cebu City', 10.3157, 123.8854, 'Asia/Manila'],
    ['Davao', 7.1907, 125.4553, 'Asia/Manila'],
  ],
  SA: [
    ['Riyadh', 24.7136, 46.6753, 'Asia/Riyadh'],
    ['Jeddah', 21.4858, 39.1925, 'Asia/Riyadh'],
    ['Dammam', 26.4207, 50.0888, 'Asia/Riyadh'],
  ],
  QA: [['Doha', 25.2854, 51.5310, 'Asia/Qatar']],
  IL: [
    ['Tel Aviv', 32.0853, 34.7818, 'Asia/Jerusalem'],
    ['Haifa', 32.7940, 34.9896, 'Asia/Jerusalem'],
    ['Jerusalem', 31.7683, 35.2137, 'Asia/Jerusalem'],
  ],
  BR: [
    ['São Paulo', -23.5505, -46.6333, 'America/Sao_Paulo'],
    ['Rio de Janeiro', -22.9068, -43.1729, 'America/Sao_Paulo'],
    ['Belo Horizonte', -19.9167, -43.9345, 'America/Sao_Paulo'],
    ['Curitiba', -25.4284, -49.2733, 'America/Sao_Paulo'],
    ['Porto Alegre', -30.0346, -51.2177, 'America/Sao_Paulo'],
    ['Brasília', -15.8267, -47.9218, 'America/Sao_Paulo'],
  ],
  MX: [
    ['Mexico City', 19.4326, -99.1332, 'America/Mexico_City'],
    ['Guadalajara', 20.6597, -103.3496, 'America/Mexico_City'],
    ['Monterrey', 25.6866, -100.3161, 'America/Monterrey'],
    ['Puebla', 19.0414, -98.2063, 'America/Mexico_City'],
  ],
  AR: [
    ['Buenos Aires', -34.6037, -58.3816, 'America/Argentina/Buenos_Aires'],
    ['Córdoba', -31.4201, -64.1888, 'America/Argentina/Cordoba'],
  ],
  CL: [['Santiago', -33.4489, -70.6693, 'America/Santiago']],
  CO: [
    ['Bogotá', 4.7110, -74.0721, 'America/Bogota'],
    ['Medellín', 6.2442, -75.5812, 'America/Bogota'],
  ],
  ZA: [
    ['Johannesburg', -26.2041, 28.0473, 'Africa/Johannesburg'],
    ['Cape Town', -33.9249, 18.4241, 'Africa/Johannesburg'],
    ['Durban', -29.8587, 31.0218, 'Africa/Johannesburg'],
  ],
  NG: [['Lagos', 6.5244, 3.3792, 'Africa/Lagos'], ['Abuja', 9.0765, 7.3986, 'Africa/Lagos']],
  KE: [['Nairobi', -1.2921, 36.8219, 'Africa/Nairobi']],
  EG: [['Cairo', 30.0444, 31.2357, 'Africa/Cairo'], ['Alexandria', 31.2001, 29.9187, 'Africa/Cairo']],
  AU: [
    ['Sydney, NSW', -33.8688, 151.2093, 'Australia/Sydney'],
    ['Melbourne, VIC', -37.8136, 144.9631, 'Australia/Melbourne'],
    ['Brisbane, QLD', -27.4698, 153.0251, 'Australia/Brisbane'],
    ['Perth, WA', -31.9523, 115.8613, 'Australia/Perth'],
    ['Adelaide, SA', -34.9285, 138.6007, 'Australia/Adelaide'],
  ],
  NZ: [['Auckland', -36.8485, 174.7633, 'Pacific/Auckland'], ['Wellington', -41.2866, 174.7756, 'Pacific/Auckland']],
};

const GEO_META = {
  US: { name: 'United States', orgs: ['Comcast', 'Verizon', 'AT&T', 'Charter', 'Cox', 'CenturyLink'], bank: 'Chase', currency: 'USD', weekStart: 0, dirms: false, speedUnit: 'mph', temp: 'F' },
  CA: { name: 'Canada', orgs: ['Bell Canada', 'Rogers', 'Telus', 'Shaw'], bank: 'RBC', currency: 'CAD', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  GB: { name: 'United Kingdom', orgs: ['BT', 'Virgin Media', 'Sky Broadband', 'TalkTalk'], bank: 'Barclays', currency: 'GBP', weekStart: 1, dirms: false, speedUnit: 'mph', temp: 'C' },
  DE: { name: 'Germany', orgs: ['Deutsche Telekom', 'Vodafone', '1&1', 'O2'], bank: 'Deutsche Bank', currency: 'EUR', weekStart: 1, dirms: true, speedUnit: 'km/h', temp: 'C' },
  FR: { name: 'France', orgs: ['Orange', 'Free', 'SFR', 'Bouygues'], bank: 'BNP Paribas', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  NL: { name: 'Netherlands', orgs: ['KPN', 'Ziggo', 'T-Mobile NL'], bank: 'ING', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  ES: { name: 'Spain', orgs: ['Movistar', 'Orange ES', 'Vodafone ES'], bank: 'Santander', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  IT: { name: 'Italy', orgs: ['TIM', 'Vodafone IT', 'Fastweb'], bank: 'Intesa Sanpaolo', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  SE: { name: 'Sweden', orgs: ['Telia', 'Bahnhof', 'Tele2'], bank: 'SEB', currency: 'SEK', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  PL: { name: 'Poland', orgs: ['Orange PL', 'Play', 'Plus'], bank: 'PKO BP', currency: 'PLN', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  CH: { name: 'Switzerland', orgs: ['Swisscom', 'Sunrise', 'Salt'], bank: 'UBS', currency: 'CHF', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  AT: { name: 'Austria', orgs: ['A1', 'Magenta AT'], bank: 'Erste Bank', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  PT: { name: 'Portugal', orgs: ['MEO', 'NOS', 'Vodafone PT'], bank: 'Millennium BCP', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  IE: { name: 'Ireland', orgs: ['Eir', 'Virgin Media IE'], bank: 'AIB', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  FI: { name: 'Finland', orgs: ['Elisa', 'Telia FI'], bank: 'Nordea', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  NO: { name: 'Norway', orgs: ['Telenor', 'Telia NO'], bank: 'DNB', currency: 'NOK', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  DK: { name: 'Denmark', orgs: ['TDC', 'Telenor DK'], bank: 'Danske Bank', currency: 'DKK', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  TR: { name: 'Türkiye', orgs: ['Türk Telekom', 'Turkcell Superonline', 'Vodafone TR'], bank: 'Ziraat Bankası', currency: 'TRY', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  AE: { name: 'United Arab Emirates', orgs: ['e& (Etisalat)', 'du'], bank: 'Emirates NBD', currency: 'AED', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  IN: { name: 'India', orgs: ['Airtel', 'Jio', 'BSNL', 'ACT Fibernet'], bank: 'HDFC Bank', currency: 'INR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  ID: { name: 'Indonesia', orgs: ['Telkomsel', 'IndiHome', 'XL Axiata'], bank: 'Bank Mandiri', currency: 'IDR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  SG: { name: 'Singapore', orgs: ['Singtel', 'StarHub', 'M1'], bank: 'DBS', currency: 'SGD', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  MY: { name: 'Malaysia', orgs: ['TM Unifi', 'Maxis', 'Celcom'], bank: 'Maybank', currency: 'MYR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  JP: { name: 'Japan', orgs: ['NTT Docomo', 'SoftBank', 'KDDI'], bank: 'MUFG', currency: 'JPY', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  KR: { name: 'South Korea', orgs: ['KT', 'SK Broadband', 'LG U+'], bank: 'KB Kookmin', currency: 'KRW', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  VN: { name: 'Vietnam', orgs: ['Viettel', 'VNPT', 'FPT Telecom'], bank: 'Vietcombank', currency: 'VND', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  TH: { name: 'Thailand', orgs: ['AIS', 'True', '3BB'], bank: 'Kasikornbank', currency: 'THB', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  PH: { name: 'Philippines', orgs: ['PLDT', 'Globe', 'Converge'], bank: 'BDO', currency: 'PHP', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  SA: { name: 'Saudi Arabia', orgs: ['STC', 'Mobily', 'Zain'], bank: 'Al Rajhi', currency: 'SAR', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  QA: { name: 'Qatar', orgs: ['Ooredoo', 'Vodafone QA'], bank: 'QNB', currency: 'QAR', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  IL: { name: 'Israel', orgs: ['Bezeq', 'Partner', 'Cellcom'], bank: 'Bank Leumi', currency: 'ILS', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  BR: { name: 'Brazil', orgs: ['Vivo', 'Claro', 'TIM BR', 'Oi'], bank: 'Itaú', currency: 'BRL', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  MX: { name: 'Mexico', orgs: ['Telmex', 'Izzi', 'Totalplay'], bank: 'BBVA México', currency: 'MXN', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  AR: { name: 'Argentina', orgs: ['Telecom Argentina', 'Telefónica AR'], bank: 'Banco Nación', currency: 'ARS', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  CL: { name: 'Chile', orgs: ['Movistar CL', 'Entel'], bank: 'Banco de Chile', currency: 'CLP', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  CO: { name: 'Colombia', orgs: ['Claro CO', 'ETB', 'Tigo'], bank: 'Bancolombia', currency: 'COP', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  ZA: { name: 'South Africa', orgs: ['Telkom SA', 'Vodacom', 'MTN'], bank: 'Standard Bank', currency: 'ZAR', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  NG: { name: 'Nigeria', orgs: ['MTN NG', 'Glo', 'Airtel NG'], bank: 'GTBank', currency: 'NGN', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  KE: { name: 'Kenya', orgs: ['Safaricom', 'Jamii Telecom'], bank: 'KCB', currency: 'KES', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  EG: { name: 'Egypt', orgs: ['TE Data', 'Vodafone EG', 'Orange EG'], bank: 'NBE', currency: 'EGP', weekStart: 6, dirms: false, speedUnit: 'km/h', temp: 'C' },
  AU: { name: 'Australia', orgs: ['Telstra', 'Optus', 'TPG', 'Aussie Broadband'], bank: 'CBA', currency: 'AUD', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  NZ: { name: 'New Zealand', orgs: ['Spark NZ', 'Vodafone NZ', '2degrees'], bank: 'ANZ NZ', currency: 'NZD', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
};

const GEO_NAMES = Object.keys(GEO).filter((c) => GEO[c].length).sort();

/* ---------------------------------------------------------- locale catalog */
/* locales per country: [primary, ...secondary] (BCP-47) */
const LOCALES = {
  US: ['en-US'], CA: ['en-CA', 'fr-CA'], GB: ['en-GB'], DE: ['de-DE'], FR: ['fr-FR'], NL: ['nl-NL'], ES: ['es-ES'],
  IT: ['it-IT'], SE: ['sv-SE'], PL: ['pl-PL'], CH: ['de-CH', 'fr-CH'], AT: ['de-AT'], PT: ['pt-PT'], IE: ['en-IE'],
  FI: ['fi-FI'], NO: ['nb-NO'], DK: ['da-DK'], TR: ['tr-TR'], AE: ['ar-AE', 'en-AE'], IN: ['en-IN', 'hi-IN'],
  ID: ['id-ID'], SG: ['en-SG'], MY: ['ms-MY', 'en-MY'], JP: ['ja-JP'], KR: ['ko-KR'], VN: ['vi-VN'], TH: ['th-TH'],
  PH: ['en-PH'], SA: ['ar-SA'], QA: ['ar-QA'], IL: ['he-IL'], BR: ['pt-BR'], MX: ['es-MX'], AR: ['es-AR'],
  CL: ['es-CL'], CO: ['es-CO'], ZA: ['en-ZA'], NG: ['en-NG'], KE: ['en-KE'], EG: ['ar-EG'], AU: ['en-AU'], NZ: ['en-NZ'],
};
const LOCALE_META = { // [language native name, language code, currency]
  'en-US': ['English (US)', 'en', 'USD', 'ltr'], 'en-CA': ['English (Canada)', 'en', 'CAD', 'ltr'], 'fr-CA': ['Français (Canada)', 'fr', 'CAD', 'ltr'],
  'en-GB': ['English (UK)', 'en', 'GBP', 'ltr'], 'de-DE': ['Deutsch', 'de', 'EUR', 'ltr'], 'fr-FR': ['Français', 'fr', 'EUR', 'ltr'],
  'nl-NL': ['Nederlands', 'nl', 'EUR', 'ltr'], 'es-ES': ['Español (España)', 'es', 'EUR', 'ltr'], 'it-IT': ['Italiano', 'it', 'EUR', 'ltr'],
  'sv-SE': ['Svenska', 'sv', 'SEK', 'ltr'], 'pl-PL': ['Polski', 'pl', 'PLN', 'ltr'], 'de-CH': ['Deutsch (Schweiz)', 'de', 'CHF', 'ltr'],
  'fr-CH': ['Français (Suisse)', 'fr', 'CHF', 'ltr'], 'de-AT': ['Deutsch (Österreich)', 'de', 'EUR', 'ltr'], 'pt-PT': ['Português (Portugal)', 'pt', 'EUR', 'ltr'],
  'en-IE': ['English (Ireland)', 'en', 'EUR', 'ltr'], 'fi-FI': ['Suomi', 'fi', 'EUR', 'ltr'], 'nb-NO': ['Norsk Bokmål', 'nb', 'NOK', 'ltr'],
  'da-DK': ['Dansk', 'da', 'DKK', 'ltr'], 'tr-TR': ['Türkçe', 'tr', 'TRY', 'ltr'], 'ar-AE': ['العربية (الإمارات)', 'ar', 'AED', 'rtl'],
  'en-AE': ['English (UAE)', 'en', 'AED', 'ltr'], 'en-IN': ['English (India)', 'en', 'INR', 'ltr'], 'hi-IN': ['हिन्दी', 'hi', 'INR', 'ltr'],
  'id-ID': ['Bahasa Indonesia', 'id', 'IDR', 'ltr'], 'en-SG': ['English (Singapore)', 'en', 'SGD', 'ltr'], 'ms-MY': ['Bahasa Melayu', 'ms', 'MYR', 'ltr'],
  'en-MY': ['English (Malaysia)', 'en', 'MYR', 'ltr'], 'ja-JP': ['日本語', 'ja', 'JPY', 'ltr'], 'ko-KR': ['한국어', 'ko', 'KRW', 'ltr'],
  'vi-VN': ['Tiếng Việt', 'vi', 'VND', 'ltr'], 'th-TH': ['ไทย', 'th', 'THB', 'ltr'], 'en-PH': ['English (Philippines)', 'en', 'PHP', 'ltr'],
  'ar-SA': ['العربية (السعودية)', 'ar', 'SAR', 'rtl'], 'ar-QA': ['العربية (قطر)', 'ar', 'QAR', 'rtl'], 'he-IL': ['עברית', 'he', 'ILS', 'rtl'],
  'pt-BR': ['Português (Brasil)', 'pt', 'BRL', 'ltr'], 'es-MX': ['Español (México)', 'es', 'MXN', 'ltr'], 'es-AR': ['Español (Argentina)', 'es', 'ARS', 'ltr'],
  'es-CL': ['Español (Chile)', 'es', 'CLP', 'ltr'], 'es-CO': ['Español (Colombia)', 'es', 'COP', 'ltr'], 'en-ZA': ['English (South Africa)', 'en', 'ZAR', 'ltr'],
  'en-NG': ['English (Nigeria)', 'en', 'NGN', 'ltr'], 'en-KE': ['English (Kenya)', 'en', 'KES', 'ltr'], 'ar-EG': ['العربية (مصر)', 'ar', 'EGP', 'rtl'],
  'en-AU': ['English (Australia)', 'en', 'AUD', 'ltr'], 'en-NZ': ['English (New Zealand)', 'en', 'NZD', 'ltr'], 'ru-RU': ['Русский', 'ru', 'RUB', 'ltr'],
};

/* ------------------------------------------------------- proxy catalog */
/* DEMO pool — hostnames are placeholders. For real work replace with your own
   residential/mobile proxy endpoints of the same city/country. */
const PROXY_CATALOG = {
  US: [
    { host: 'gw.chi1.sockpool.net', port: 8000, country: 'US', city: 'Chicago, IL', lat: 41.8781, lon: -87.6298, isp: 'Comcast', type: 'residential', asn: 7922 },
    { host: 'gw.nyc3.sockpool.net', port: 8000, country: 'US', city: 'New York, NY', lat: 40.7128, lon: -74.0060, isp: 'Verizon', type: 'residential', asn: 701 },
    { host: 'gw.lax4.sockpool.net', port: 8000, country: 'US', city: 'Los Angeles, CA', lat: 34.0522, lon: -118.2437, isp: 'AT&T', type: 'residential', asn: 7018 },
  ],
  GB: [
    { host: 'gw.lon2.sockpool.net', port: 8000, country: 'GB', city: 'London, England', lat: 51.5072, lon: -0.1276, isp: 'Virgin Media', type: 'residential', asn: 5089 },
    { host: 'gw.man1.sockpool.net', port: 8000, country: 'GB', city: 'Manchester, England', lat: 53.4808, lon: -2.2426, isp: 'BT', type: 'residential', asn: 2856 },
  ],
  DE: [
    { host: 'gw.ber1.sockpool.net', port: 8000, country: 'DE', city: 'Berlin', lat: 52.5200, lon: 13.4050, isp: 'Deutsche Telekom', type: 'residential', asn: 3320 },
    { host: 'gw.fra2.sockpool.net', port: 8000, country: 'DE', city: 'Frankfurt', lat: 50.1109, lon: 8.6821, isp: 'Vodafone DE', type: 'residential', asn: 3209 },
  ],
  NL: [{ host: 'gw.ams1.sockpool.net', port: 8000, country: 'NL', city: 'Amsterdam', lat: 52.3676, lon: 4.9041, isp: 'KPN', type: 'residential', asn: 1136 }],
  FR: [{ host: 'gw.par1.sockpool.net', port: 8000, country: 'FR', city: 'Paris', lat: 48.8566, lon: 2.3522, isp: 'Orange', type: 'residential', asn: 3215 }],
  CA: [{ host: 'gw.tor1.sockpool.net', port: 8000, country: 'CA', city: 'Toronto, ON', lat: 43.6532, lon: -79.3832, isp: 'Bell Canada', type: 'residential', asn: 577 }],
  TR: [{ host: 'gw.ist1.sockpool.net', port: 8000, country: 'TR', city: 'Istanbul', lat: 41.0082, lon: 28.9784, isp: 'Türk Telekom', type: 'residential', asn: 9121 }],
  AU: [{ host: 'gw.syd1.sockpool.net', port: 8000, country: 'AU', city: 'Sydney, NSW', lat: -33.8688, lon: 151.2093, isp: 'Telstra', type: 'residential', asn: 1221 }],
  IN: [{ host: 'gw.bom1.sockpool.net', port: 8000, country: 'IN', city: 'Mumbai', lat: 19.0760, lon: 72.8777, isp: 'Airtel', type: 'mobile', asn: 9498 }],
  SG: [{ host: 'gw.sin1.sockpool.net', port: 8000, country: 'SG', city: 'Singapore', lat: 1.3521, lon: 103.8198, isp: 'Singtel', type: 'residential', asn: 7473 }],
};
const PROXY_LABEL = { us: 'US', gb: 'GB', de: 'DE', nl: 'NL', fr: 'FR', ca: 'CA', tr: 'TR', au: 'AU', in: 'IN', sg: 'SG' };

const BROWSERS = {
  chrome: {
    name: 'Google Chrome', vendor: 'Google Inc.', engine: 'Chromium', blink: true,
    // 4-week trains since M94 → ~31-day average including skips/holidays
    epochMajor: 89, epochDate: '2021-03-02', step: 31,
    platforms: { windows: 'Windows', macos: 'Macintosh', linux: 'Linux', android: 'Android', ios: 'iOS' },
  },
  edge: {
    name: 'Microsoft Edge', vendor: 'Microsoft Corporation', engine: 'Chromium', blink: true,
    epochMajor: 89, epochDate: '2021-04-01', step: 31,
    platforms: { windows: 'Windows', macos: 'Macintosh', linux: 'Linux', android: 'Android', ios: 'iOS' },
  },
  firefox: {
    name: 'Mozilla Firefox', vendor: 'Mozilla', engine: 'Gecko', blink: false,
    epochMajor: 87, epochDate: '2021-03-23', step: 30,
    platforms: { windows: 'Windows', macos: 'Macintosh', linux: 'Linux', android: 'Android' },
  },
  safari: {
    name: 'Safari', vendor: 'Apple Inc.', engine: 'WebKit', blink: false,
    epochMajor: 14, epochDate: '2020-09-16', step: 84, // Safari ~ yearly major
    platforms: { macos: 'Macintosh', ios: 'iOS' },
  },
};

function releaseTrain(browser, date) {
  const conf = BROWSERS[browser];
  const d = date instanceof Date ? date : new Date(date);
  const epoch = new Date(conf.epochDate + 'T00:00:00Z');
  const weeks = Math.floor((d.getTime() - epoch.getTime()) / (7 * 86400000));
  const major = conf.epochMajor + Math.max(0, Math.floor(weeks / (conf.step / 7)));
  const offsetDays = Math.round((d.getTime() - epoch.getTime()) / 86400000);
  const minor = browser === 'safari' ? 0 : (browser === 'firefox' ? 0 : Math.max(0, Math.min(0.6555, 0.0)));
  const patch = browser === 'chromium' ? 0 : 0;
  return { major, minor, patch, offsetDays };
}

/* milestone mapping for chromium-engine builds (major → full build base) */
function chromiumBuild(major, rng) {
  const base = [0x0f00, 0x1500, 0x1a00, 0x2100, 0x2500, 0x2a00, 0x2f00, 0x3200, 0x3500, 0x3a00, 0x3e00, 0x4300][major % 12];
  const build = 4300 + major * 22 + ((major * 37) % 97);
  const patch = rng.pick([0, 24, 47, 71, 88, 102, 119, 137, 156, 201, 218, 244, 288, 303, 335, 371, 404, 441]);
  return { major, build, patch };
}

function chromeVersion(major, rng) {
  const b = chromiumBuild(major, rng);
  return `${b.major}.0.${b.build}.${b.patch}`;
}
/* full versions must line up with the real chrome release archive
   e.g. 131.0.6778.x, 140.x.73xx — keep build in a believable band */
function chromeBuildFor(major) {
  return 4300 + major * 22 + ((major * 37) % 97); // M120→6940, M156→7700 roughly
}
function chromeMajorRange() {
  const t = releaseTrain('chrome', new Date());
  return { min: Math.max(120, t.major - 12), max: t.major };
}

/* ====================================================== HARDWARE CATALOGS */
const GPUS = {
  win: [
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'NVIDIA GeForce GTX 1650', tier: 1 },
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'NVIDIA GeForce RTX 3060', tier: 2 },
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti (0x00002489) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti (0x00002489) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'NVIDIA GeForce RTX 3060 Ti', tier: 2 },
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 650 Ti (0x00001E14) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 650 Ti (0x00001E14) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'NVIDIA GeForce GTX 650 Ti', tier: 0 },
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'NVIDIA GeForce RTX 4060', tier: 2 },
    { vendor: 'Google Inc. (Intel)', webglVendor: 'Google Inc. (Intel)', webglRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (Intel)', unmaskedRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'Intel UHD Graphics 630', tier: 0 },
    { vendor: 'Google Inc. (Intel)', webglVendor: 'Google Inc. (Intel)', webglRenderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (Intel)', unmaskedRenderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'Intel Iris Xe Graphics', tier: 1 },
    { vendor: 'Google Inc. (Intel)', webglVendor: 'Google Inc. (Intel)', webglRenderer: 'ANGLE (Intel, Intel(R) HD Graphics 520 (0x00001916) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (Intel)', unmaskedRenderer: 'ANGLE (Intel, Intel(R) HD Graphics 520 (0x00001916) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'Intel HD Graphics 520', tier: 0 },
    { vendor: 'Google Inc. (AMD)', webglVendor: 'Google Inc. (AMD)', webglRenderer: 'ANGLE (AMD, AMD Radeon RX 6600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (AMD)', unmaskedRenderer: 'ANGLE (AMD, AMD Radeon RX 6600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'AMD Radeon RX 6600 XT', tier: 2 },
    { vendor: 'Google Inc. (AMD)', webglVendor: 'Google Inc. (AMD)', webglRenderer: 'ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001681) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (AMD)', unmaskedRenderer: 'ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001681) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'AMD Radeon(TM) Graphics', tier: 1 },
    { vendor: 'Google Inc. (Microsoft)', webglVendor: 'Google Inc. (Microsoft)', webglRenderer: 'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (Microsoft)', unmaskedRenderer: 'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'Microsoft Basic Render Driver', tier: 0 },
  ],
  mac: [
    { vendor: 'Google Inc. (Apple)', webglVendor: 'Google Inc. (Apple)', webglRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', unmaskedVendor: 'Google Inc. (Apple)', unmaskedRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', device: 'Apple M1', tier: 1 },
    { vendor: 'Google Inc. (Apple)', webglVendor: 'Google Inc. (Apple)', webglRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', unmaskedVendor: 'Google Inc. (Apple)', unmaskedRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', device: 'Apple M2', tier: 2 },
    { vendor: 'Google Inc. (Apple)', webglVendor: 'Google Inc. (Apple)', webglRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)', unmaskedVendor: 'Google Inc. (Apple)', unmaskedRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)', device: 'Apple M1 Pro', tier: 2 },
    { vendor: 'Intel Inc.', webglVendor: 'Intel Inc.', webglRenderer: 'Intel Iris OpenGL Engine', unmaskedVendor: 'Intel Inc.', unmaskedRenderer: 'Intel Iris OpenGL Engine', device: 'Intel Iris', tier: 1 },
    { vendor: 'ATI Technologies Inc.', webglVendor: 'ATI Technologies Inc.', webglRenderer: 'AMD Radeon Pro 5500M OpenGL Engine', unmaskedVendor: 'ATI Technologies Inc.', unmaskedRenderer: 'AMD Radeon Pro 5500M OpenGL Engine', device: 'AMD Radeon Pro 5500M', tier: 1 },
  ],
  linux: [
    { vendor: 'Google Inc. (Intel)', webglVendor: 'Google Inc. (Intel)', webglRenderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)', unmaskedVendor: 'Google Inc. (Intel)', unmaskedRenderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)', device: 'Mesa Intel UHD 620', tier: 0 },
    { vendor: 'Google Inc. (AMD)', webglVendor: 'Google Inc. (AMD)', webglRenderer: 'ANGLE (AMD, AMD Radeon RX 580 (POLARIS10, DRM 3.42.0, 5.15.0-91-generic, LLVM 15.0.7), OpenGL 4.6)', unmaskedVendor: 'Google Inc. (AMD)', unmaskedRenderer: 'ANGLE (AMD, AMD Radeon RX 580 (POLARIS10, DRM 3.42.0, 5.15.0-91-generic, LLVM 15.0.7), OpenGL 4.6)', device: 'AMD Radeon RX 580', tier: 1 },
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB/PCIe/SSE2, OpenGL 4.5.0)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB/PCIe/SSE2, OpenGL 4.5.0)', device: 'NVIDIA GeForce GTX 1060 6GB', tier: 1 },
  ],
  android: [
    { vendor: 'Qualcomm', webglVendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 830', unmaskedVendor: 'Qualcomm', unmaskedRenderer: 'Adreno (TM) 830', device: 'Adreno 830', tier: 2 },
    { vendor: 'Qualcomm', webglVendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 750', unmaskedVendor: 'Qualcomm', unmaskedRenderer: 'Adreno (TM) 750', device: 'Adreno 750', tier: 2 },
    { vendor: 'Qualcomm', webglVendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 730', unmaskedVendor: 'Qualcomm', unmaskedRenderer: 'Adreno (TM) 730', device: 'Adreno 730', tier: 2 },
    { vendor: 'Qualcomm', webglVendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 710', unmaskedVendor: 'Qualcomm', unmaskedRenderer: 'Adreno (TM) 710', device: 'Adreno 710', tier: 1 },
    { vendor: 'Qualcomm', webglVendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 650', unmaskedVendor: 'Qualcomm', unmaskedRenderer: 'Adreno (TM) 650', device: 'Adreno 650', tier: 1 },
    { vendor: 'Qualcomm', webglVendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 642L', unmaskedVendor: 'Qualcomm', unmaskedRenderer: 'Adreno (TM) 642L', device: 'Adreno 642L', tier: 1 },
    { vendor: 'Qualcomm', webglVendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 619', unmaskedVendor: 'Qualcomm', unmaskedRenderer: 'Adreno (TM) 619', device: 'Adreno 619', tier: 0 },
    { vendor: 'ARM', webglVendor: 'ARM', webglRenderer: 'Mali-G710', unmaskedVendor: 'ARM', unmaskedRenderer: 'Mali-G710', device: 'Mali-G710', tier: 1 },
    { vendor: 'ARM', webglVendor: 'ARM', webglRenderer: 'Mali-G52 MC2', unmaskedVendor: 'ARM', unmaskedRenderer: 'Mali-G52 MC2', device: 'Mali-G52 MC2', tier: 0 },
    { vendor: 'ARM', webglVendor: 'ARM', webglRenderer: 'Mali-G57 MC2', unmaskedVendor: 'ARM', unmaskedRenderer: 'Mali-G57 MC2', device: 'Mali-G57 MC2', tier: 0 },
  ],
  ios: [
    { vendor: 'Apple Inc.', webglVendor: 'Apple Inc.', webglRenderer: 'Apple GPU', unmaskedVendor: 'Apple Inc.', unmaskedRenderer: 'Apple GPU', device: 'Apple GPU', tier: 1 },
  ],
};

/* Platform / device archetypes with coherent specs */
const DEVICE_MODELS = {
  android: [
    { model: 'RMX1971', name: 'realme 5 Pro', brand: 'realme', release: '2019-08', cpu: 'Qualcomm Technologies, Inc SDM712', cores: 8, gpuKey: 'Adreno (TM) 616', ram: 4, screen: [1080, 2340], dpr: 2.75, browsers: ['chrome'], hintsModel: 'RMX1971' },
    { model: 'SM-A505F', name: 'Samsung Galaxy A50', brand: 'samsung', release: '2019-03', cpu: 'Samsung Exynos 7 Octa 9610', cores: 8, gpuKey: 'Mali-G72 MP3', ram: 4, screen: [1080, 2340], dpr: 2.625, browsers: ['chrome'], hintsModel: 'SM-A505F' },
    { model: 'Pixel 7', name: 'Google Pixel 7', brand: 'google', release: '2022-10', cpu: 'Google Tensor G2', cores: 8, gpuKey: 'Mali-G710', ram: 8, screen: [1080, 2400], dpr: 2.625, browsers: ['chrome'], hintsModel: 'Pixel 7' },
    { model: 'SM-S911B', name: 'Samsung Galaxy S23', brand: 'samsung', release: '2023-02', cpu: 'Qualcomm Snapdragon 8 Gen 2', cores: 8, gpuKey: 'Adreno (TM) 740', ram: 8, screen: [1080, 2340], dpr: 2.8125, browsers: ['chrome'], hintsModel: 'SM-S911B' },
    { model: '2211133G', name: 'Xiaomi 13', brand: 'xiaomi', release: '2023-02', cpu: 'Qualcomm Snapdragon 8 Gen 2', cores: 8, gpuKey: 'Adreno (TM) 740', ram: 8, screen: [1080, 2400], dpr: 2.75, browsers: ['chrome'], hintsModel: '2211133G' },
    { model: 'CPH2451', name: 'OPPO Reno8 T', brand: 'oppo', release: '2023-01', cpu: 'Qualcomm Snapdragon 695', cores: 8, gpuKey: 'Adreno (TM) 619', ram: 8, screen: [1080, 2400], dpr: 2.75, browsers: ['chrome'], hintsModel: 'CPH2451' },
    { model: 'M2101K6G', name: 'Xiaomi Redmi Note 10 Pro', brand: 'xiaomi', release: '2021-03', cpu: 'Qualcomm Snapdragon 732G', cores: 8, gpuKey: 'Adreno (TM) 618', ram: 6, screen: [1080, 2400], dpr: 2.75, browsers: ['chrome'], hintsModel: 'M2101K6G' },
    { model: 'V2140', name: 'vivo Y33s', brand: 'vivo', release: '2021-07', cpu: 'MediaTek Helio G80', cores: 8, gpuKey: 'Mali-G52 MC2', ram: 4, screen: [1080, 2400], dpr: 2.75, browsers: ['chrome'], hintsModel: 'V2140' },
    { model: '23021RAAEG', name: 'Redmi Note 12', brand: 'xiaomi', release: '2023-03', cpu: 'Qualcomm Snapdragon 685', cores: 8, gpuKey: 'Adreno (TM) 610', ram: 4, screen: [1080, 2400], dpr: 2.75, browsers: ['chrome'], hintsModel: '23021RAAEG' },
    { model: '23122PCD1G', name: 'POCO X6 5G', brand: 'xiaomi', release: '2024-01', cpu: 'Qualcomm Snapdragon 7s Gen 2', cores: 8, gpuKey: 'Adreno (TM) 710', ram: 12, screen: [1220, 2712], dpr: 3.0, browsers: ['chrome', 'firefox'], hintsModel: '23122PCD1G' },
    { model: '24129PN74G', name: 'Xiaomi 15', brand: 'xiaomi', release: '2025-02', cpu: 'Qualcomm Snapdragon 8 Elite', cores: 8, gpuKey: 'Adreno (TM) 830', ram: 12, screen: [1200, 2670], dpr: 3.0, browsers: ['chrome', 'firefox'], hintsModel: '24129PN74G' },
    { model: 'SM-S938B', name: 'Samsung Galaxy S25 Ultra', brand: 'samsung', release: '2025-01', cpu: 'Qualcomm Snapdragon 8 Elite', cores: 8, gpuKey: 'Adreno (TM) 830', ram: 12, screen: [1440, 3120], dpr: 3.5, browsers: ['chrome', 'firefox'], hintsModel: 'SM-S938B' },
    { model: 'Pixel 10', name: 'Google Pixel 10', brand: 'google', release: '2025-08', cpu: 'Google Tensor G5', cores: 8, gpuKey: 'Immortalis-G715', ram: 12, screen: [1080, 2424], dpr: 2.625, browsers: ['chrome', 'firefox'], hintsModel: 'Pixel 10' },
    { model: 'Pixel 8', name: 'Google Pixel 8', brand: 'google', release: '2023-10', cpu: 'Google Tensor G3', cores: 9, gpuKey: 'Mali-G715', ram: 8, screen: [1080, 2400], dpr: 2.625, browsers: ['chrome', 'firefox'], hintsModel: 'Pixel 8' },
  ],
  ios: [
    { model: 'iPhone14,5', name: 'iPhone 13', brand: 'apple', release: '2021-09', cpu: 'Apple A15 Bionic', cores: 6, gpuKey: 'Apple GPU', ram: 4, screen: [390, 844], dpr: 3, browsers: ['safari'], osVersion: '17.4.1' },
    { model: 'iPhone15,2', name: 'iPhone 14 Pro', brand: 'apple', release: '2022-09', cpu: 'Apple A16 Bionic', cores: 6, gpuKey: 'Apple GPU', ram: 6, screen: [393, 852], dpr: 3, browsers: ['safari'], osVersion: '17.5' },
    { model: 'iPhone16,1', name: 'iPhone 15 Pro', brand: 'apple', release: '2023-09', cpu: 'Apple A17 Pro', cores: 6, gpuKey: 'Apple GPU', ram: 8, screen: [393, 852], dpr: 3, browsers: ['safari'], osVersion: '18.1' },
  ],
  windows: [
    { name: 'Windows 10 desktop', os: 'Windows 10', osBuild: '19045.3803', cores: [4, 6, 8, 12, 16], ram: [4, 8, 16, 32], gpuTier: [0, 1, 2], screens: [[1920, 1079, 1], [1920, 1080, 1], [1536, 864, 1.25], [2560, 1440, 1], [1366, 768, 1], [1280, 720, 1]] },
    { name: 'Windows 11 desktop', os: 'Windows 11', osBuild: '22631.3155', cores: [6, 8, 10, 12, 16, 20], ram: [8, 16, 32, 64], gpuTier: [1, 2], screens: [[1920, 1080, 1], [2560, 1440, 1], [1536, 864, 1.25], [3840, 2160, 1.5], [1920, 1200, 1]] },
    { name: 'Windows 10 laptop', os: 'Windows 10', osBuild: '19045.4046', cores: [4, 8, 6], ram: [4, 8, 16], gpuTier: [0, 1], screens: [[1366, 768, 1], [1536, 864, 1.25], [1920, 1080, 1]] },
    { name: 'Windows 11 laptop', os: 'Windows 11', osBuild: '22621.3155', cores: [8, 10, 12, 16], ram: [8, 16, 32], gpuTier: [1, 2], screens: [[1920, 1080, 1], [2256, 1504, 1.5], [2560, 1600, 2], [2880, 1800, 2]] },
  ],
  macos: [
    { name: 'MacBook Air M1', os: 'macOS 14.4.1', cores: [8], ram: [8, 16], screens: [[1440, 900, 2], [1470, 956, 2]], gpu: 'Apple M1' },
    { name: 'MacBook Pro 14 M2', os: 'macOS 14.5', cores: [10], ram: [16, 32], screens: [[1512, 982, 2], [1728, 1117, 2]], gpu: 'Apple M2' },
    { name: 'MacBook Air M2', os: 'macOS 15.1', cores: [8], ram: [8, 16, 24], screens: [[1470, 956, 2], [1440, 900, 2]], gpu: 'Apple M2' },
    { name: 'iMac 24 M1', os: 'macOS 14.2.1', cores: [8], ram: [16], screens: [[2240, 1260, 2], [1920, 1080, 2]], gpu: 'Apple M1' },
  ],
  linux: [
    { name: 'Ubuntu 22.04 desktop', os: 'Ubuntu', cores: [4, 8, 12, 16], ram: [4, 8, 16, 32], screens: [[1920, 1080, 1], [1366, 768, 1], [2560, 1440, 1]] },
    { name: 'Fedora 40 desktop', os: 'Fedora Linux', cores: [8, 12, 16], ram: [8, 16, 32], screens: [[1920, 1080, 1], [2560, 1440, 1]] },
  ],
};

/* ------------------------------------------------ Android/iPhone OS matrix */
const ANDROID_VERSIONS = [
  { v: '11', api: 30, minRelease: '2020-09' },
  { v: '12', api: 31, minRelease: '2021-10' },
  { v: '13', api: 33, minRelease: '2022-08' },
  { v: '14', api: 34, minRelease: '2023-10' },
  { v: '15', api: 35, minRelease: '2024-10' },
  { v: '16', api: 36, minRelease: '2025-06' },
  { v: '17', api: 37, minRelease: '2026-06' },
];

/* --------------------------------------------------------- FONT CATALOGS */
const FONT_SETS = {
  windows11: ['Arial', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'Georgia', 'HoloLens MDL2 Assets', 'Impact', 'Ink Free', 'Javanese Text', 'Leelawadee UI', 'Lucida Console', 'Lucida Sans Unicode', 'Marlett', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU-ExtB', 'Mongolian Baiti', 'MS Gothic', 'MV Boli', 'Myanmar Text', 'Nirmala UI', 'Palatino Linotype', 'Segoe MDL2 Assets', 'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Emoji', 'Segoe UI Historic', 'Segoe UI Symbol', 'SimSun', 'Sitka Banner', 'Sitka Display', 'Sitka Heading', 'Sitka Small', 'Sitka Subheading', 'Sitka Text', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings', 'Yu Gothic'],
  windows10: ['Arial', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'Georgia', 'Impact', 'Javanese Text', 'Leelawadee UI', 'Lucida Console', 'Lucida Sans Unicode', 'Marlett', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU-ExtB', 'Mongolian Baiti', 'MS Gothic', 'MV Boli', 'Myanmar Text', 'Nirmala UI', 'Palatino Linotype', 'Segoe MDL2 Assets', 'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Emoji', 'Segoe UI Historic', 'Segoe UI Symbol', 'SimSun', 'Sitka Banner', 'Sitka Display', 'Sitka Heading', 'Sitka Small', 'Sitka Subheading', 'Sitka Text', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings', 'Yu Gothic'],
  mac: ['American Typewriter', 'Andale Mono', 'Apple Chancery', 'Apple Color Emoji', 'Apple SD Gothic Neo', 'Apple Symbols', 'Arial', 'Arial Black', 'Avenir', 'Avenir Next', 'Ayuthaya', 'Baskerville', 'Big Caslon', 'Bodoni 72', 'Brush Script MT', 'Chalkboard', 'Chalkduster', 'Chicago', 'Cochin', 'Copperplate', 'Courier', 'Courier New', 'Didot', 'Futura', 'Geneva', 'Georgia', 'Gill Sans', 'Helvetica', 'Helvetica Neue', 'Herculanum', 'Hoefler Text', 'Impact', 'Lucida Grande', 'Luminari', 'Marker Felt', 'Menlo', 'Monaco', 'Noteworthy', 'Optima', 'Palatino', 'Papyrus', 'Phosphate', 'Rockwell', 'Savoye LET', 'SignPainter', 'Skia', 'Snell Roundhand', 'Symbol', 'Tahoma', 'Times', 'Times New Roman', 'Trattatello', 'Trebuchet MS', 'Verdana', 'Webdings', 'Zapf Dingbats'],
  linux: ['DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif', 'Liberation Mono', 'Liberation Sans', 'Liberation Serif', 'Noto Color Emoji', 'Noto Sans', 'Noto Sans Mono', 'Noto Serif', 'Ubuntu', 'Ubuntu Condensed', 'Ubuntu Light', 'Ubuntu Mono', 'FreeSans', 'FreeSerif', 'Nimbus Roman', 'Cantarell', 'Droid Sans', 'C059', 'P052', 'URW Gothic'],
  android: ['Roboto', 'Roboto Mono', 'Noto Sans', 'Noto Serif', 'Noto Color Emoji', 'Droid Sans', 'Droid Sans Mono', 'Cutive Mono', 'Coming Soon', 'Dancing Script', 'Droid Serif', 'Cutive', 'Carrois Gothic SC', 'Cormorant', 'Cormorant Garamond', 'Exo', 'Exo 2', 'Lato', 'Merriweather', 'Nunito', 'Open Sans', 'Oswald', 'PT Sans', 'PT Serif', 'Raleway', 'Roboto Condensed', 'Rubik', 'Source Sans Pro', 'Tinos', 'Arimo'],
  ios: ['Academy Engraved LET', 'Academy Engraved LET Plain', 'Al Nile', 'American Typewriter', 'Apple Color Emoji', 'Apple SD Gothic Neo', 'Arial', 'Arial Hebrew', 'Arial Rounded MT Bold', 'Avenir', 'Avenir Next', 'Baskerville', 'Bodoni 72', 'Bradley Hand', 'Chalkboard SE', 'Chalkduster', 'Cochin', 'Copperplate', 'Courier', 'Courier New', 'Damascus', 'Didot', 'Futura', 'Geeza Pro', 'Georgia', 'Gill Sans', 'Helvetica', 'Helvetica Neue', 'Hiragino Sans', 'Hoefler Text', 'Kailasa', 'Kefa', 'Marker Felt', 'Menlo', 'Mishafi', 'Noteworthy', 'Noto Nastaliq Urdu', 'Optima', 'Palatino', 'Papyrus', 'Party LET', 'Rockwell', 'Savoye LET', 'Snell Roundhand', 'Symbol', 'System Font', 'Tahoma', 'Thonburi', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Zapf Dingbats'],
};

/* ---------------------------------------------- Chrome extension catalog */
const CHROME_EXTENSIONS = [
  { id: 'nkbihfbeogaeaoehlefnkodbefgpgknn', name: 'MetaMask', version: '11.16.0' },
  { id: 'hdokiejnpimakedhajhdlcegeplioahd', name: 'LastPass', version: '4.129.0' },
  { id: 'cjpalhdlnbpafiamejdnhcphjbkeiagm', name: 'uBlock Origin', version: '1.57.2' },
  { id: 'gighmmpiobklfepjocnamgkkbiglidom', name: 'AdBlock', version: '5.15.0' },
  { id: 'fmkadmapgofadopljbjfkapdkoienihi', name: 'React Developer Tools', version: '5.1.0' },
  { id: 'aeblfdkhhhdcdjpifhhbdiojplfjncoa', name: '1Password', version: '8.10.36' },
  { id: 'ghbmnnjooekpmoecnnnilnnbdlolhkhi', name: 'Google Docs Offline', version: '1.77.0' },
  { id: 'pkehgijcmpdhfbdbbnkijodmdjhbjlgp', name: 'Privacy Badger', version: '2024.6.7' },
  { id: 'mnjggcdmjocbbbhaepdhchncahnbgone', name: 'SponsorBlock', version: '5.5.5' },
  { id: 'bkdgflcldnnnapblkhphbgpggdiikppg', name: 'Bypass Paywalls', version: '3.1.4' },
  { id: 'kbfnbcaeplbcioakkpcpgfkobkghlhen', name: 'Grammarly', version: '14.1120.0' },
  { id: 'lkbebcjgcmobigpeffafkodonchffocl', name: 'Honey', version: '16.1.0' },
];

/* ----------------------------------------------------------- TIMEZONES */
/* IANA zone data (offset in minutes at reference; DST-aware where needed).
   For every zone we track its city + country so nothing can drift. */
const TZ_DB = [
  { id: 'America/New_York', city: 'New York', country: 'US', std: -300, dst: -240, abbr: ['EST', 'EDT'], dstRule: 'us' },
  { id: 'America/Chicago', city: 'Chicago', country: 'US', std: -360, dst: -300, abbr: ['CST', 'CDT'], dstRule: 'us' },
  { id: 'America/Denver', city: 'Denver', country: 'US', std: -420, dst: -360, abbr: ['MST', 'MDT'], dstRule: 'us' },
  { id: 'America/Phoenix', city: 'Phoenix', country: 'US', std: -420, dst: -420, abbr: ['MST', 'MST'], dstRule: 'none' },
  { id: 'America/Los_Angeles', city: 'Los Angeles', country: 'US', std: -480, dst: -420, abbr: ['PST', 'PDT'], dstRule: 'us' },
  { id: 'America/Anchorage', city: 'Anchorage', country: 'US', std: -540, dst: -480, abbr: ['AKST', 'AKDT'], dstRule: 'us' },
  { id: 'Pacific/Honolulu', city: 'Honolulu', country: 'US', std: -600, dst: -600, abbr: ['HST', 'HST'], dstRule: 'none' },
  { id: 'America/Toronto', city: 'Toronto', country: 'CA', std: -300, dst: -240, abbr: ['EST', 'EDT'], dstRule: 'us' },
  { id: 'America/Halifax', city: 'Halifax', country: 'CA', std: -240, dst: -180, abbr: ['AST', 'ADT'], dstRule: 'us' },
  { id: 'America/Vancouver', city: 'Vancouver', country: 'CA', std: -480, dst: -420, abbr: ['PST', 'PDT'], dstRule: 'us' },
  { id: 'America/Edmonton', city: 'Edmonton', country: 'CA', std: -420, dst: -360, abbr: ['MST', 'MDT'], dstRule: 'us' },
  { id: 'America/Winnipeg', city: 'Winnipeg', country: 'CA', std: -360, dst: -300, abbr: ['CST', 'CDT'], dstRule: 'us' },
  { id: 'America/Mexico_City', city: 'Mexico City', country: 'MX', std: -360, dst: -360, abbr: ['CST', 'CST'], dstRule: 'none' },
  { id: 'America/Monterrey', city: 'Monterrey', country: 'MX', std: -360, dst: -360, abbr: ['CST', 'CST'], dstRule: 'none' },
  { id: 'America/Sao_Paulo', city: 'São Paulo', country: 'BR', std: -180, dst: -180, abbr: ['BRT', 'BRT'], dstRule: 'none' },
  { id: 'America/Argentina/Buenos_Aires', city: 'Buenos Aires', country: 'AR', std: -180, dst: -180, abbr: ['ART', 'ART'], dstRule: 'none' },
  { id: 'America/Argentina/Cordoba', city: 'Córdoba', country: 'AR', std: -180, dst: -180, abbr: ['ART', 'ART'], dstRule: 'none' },
  { id: 'America/Santiago', city: 'Santiago', country: 'CL', std: -240, dst: -180, abbr: ['CLT', 'CLST'], dstRule: 'south' },
  { id: 'America/Bogota', city: 'Bogotá', country: 'CO', std: -300, dst: -300, abbr: ['COT', 'COT'], dstRule: 'none' },
  { id: 'Europe/London', city: 'London', country: 'GB', std: 0, dst: 60, abbr: ['GMT', 'BST'], dstRule: 'eu' },
  { id: 'Europe/Dublin', city: 'Dublin', country: 'IE', std: 0, dst: 60, abbr: ['GMT', 'IST'], dstRule: 'eu' },
  { id: 'Europe/Lisbon', city: 'Lisbon', country: 'PT', std: 0, dst: 60, abbr: ['WET', 'WEST'], dstRule: 'eu' },
  { id: 'Europe/Paris', city: 'Paris', country: 'FR', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Berlin', city: 'Berlin', country: 'DE', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Amsterdam', city: 'Amsterdam', country: 'NL', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Madrid', city: 'Madrid', country: 'ES', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Rome', city: 'Rome', country: 'IT', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Zurich', city: 'Zurich', country: 'CH', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Vienna', city: 'Vienna', country: 'AT', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Stockholm', city: 'Stockholm', country: 'SE', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Warsaw', city: 'Warsaw', country: 'PL', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Prague', city: 'Prague', country: 'CZ', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Oslo', city: 'Oslo', country: 'NO', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Copenhagen', city: 'Copenhagen', country: 'DK', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Helsinki', city: 'Helsinki', country: 'FI', std: 120, dst: 180, abbr: ['EET', 'EEST'], dstRule: 'eu' },
  { id: 'Europe/Kyiv', city: 'Kyiv', country: 'UA', std: 120, dst: 180, abbr: ['EET', 'EEST'], dstRule: 'eu' },
  { id: 'Europe/Bucharest', city: 'Bucharest', country: 'RO', std: 120, dst: 180, abbr: ['EET', 'EEST'], dstRule: 'eu' },
  { id: 'Europe/Athens', city: 'Athens', country: 'GR', std: 120, dst: 180, abbr: ['EET', 'EEST'], dstRule: 'eu' },
  { id: 'Europe/Istanbul', city: 'Istanbul', country: 'TR', std: 180, dst: 180, abbr: ['TRT', 'TRT'], dstRule: 'none' },
  { id: 'Europe/Moscow', city: 'Moscow', country: 'RU', std: 180, dst: 180, abbr: ['MSK', 'MSK'], dstRule: 'none' },
  { id: 'Asia/Dubai', city: 'Dubai', country: 'AE', std: 240, dst: 240, abbr: ['GST', 'GST'], dstRule: 'none' },
  { id: 'Asia/Qatar', city: 'Doha', country: 'QA', std: 180, dst: 180, abbr: ['AST', 'AST'], dstRule: 'none' },
  { id: 'Asia/Riyadh', city: 'Riyadh', country: 'SA', std: 180, dst: 180, abbr: ['AST', 'AST'], dstRule: 'none' },
  { id: 'Asia/Tehran', city: 'Tehran', country: 'IR', std: 210, dst: 210, abbr: ['+0330', '+0330'], dstRule: 'none' },
  { id: 'Asia/Jerusalem', city: 'Jerusalem', country: 'IL', std: 120, dst: 180, abbr: ['IST', 'IDT'], dstRule: 'il' },
  { id: 'Asia/Kolkata', city: 'Mumbai', country: 'IN', std: 330, dst: 330, abbr: ['IST', 'IST'], dstRule: 'none' },
  { id: 'Asia/Karachi', city: 'Karachi', country: 'PK', std: 300, dst: 300, abbr: ['PKT', 'PKT'], dstRule: 'none' },
  { id: 'Asia/Dhaka', city: 'Dhaka', country: 'BD', std: 360, dst: 360, abbr: ['BST', 'BST'], dstRule: 'none' },
  { id: 'Asia/Jakarta', city: 'Jakarta', country: 'ID', std: 420, dst: 420, abbr: ['WIB', 'WIB'], dstRule: 'none' },
  { id: 'Asia/Makassar', city: 'Denpasar', country: 'ID', std: 480, dst: 480, abbr: ['WITA', 'WITA'], dstRule: 'none' },
  { id: 'Asia/Singapore', city: 'Singapore', country: 'SG', std: 480, dst: 480, abbr: ['SGT', 'SGT'], dstRule: 'none' },
  { id: 'Asia/Kuala_Lumpur', city: 'Kuala Lumpur', country: 'MY', std: 480, dst: 480, abbr: ['MYT', 'MYT'], dstRule: 'none' },
  { id: 'Asia/Manila', city: 'Manila', country: 'PH', std: 480, dst: 480, abbr: ['PST', 'PST'], dstRule: 'none' },
  { id: 'Asia/Bangkok', city: 'Bangkok', country: 'TH', std: 420, dst: 420, abbr: ['ICT', 'ICT'], dstRule: 'none' },
  { id: 'Asia/Ho_Chi_Minh', city: 'Ho Chi Minh City', country: 'VN', std: 420, dst: 420, abbr: ['ICT', 'ICT'], dstRule: 'none' },
  { id: 'Asia/Hong_Kong', city: 'Hong Kong', country: 'HK', std: 480, dst: 480, abbr: ['HKT', 'HKT'], dstRule: 'none' },
  { id: 'Asia/Shanghai', city: 'Shanghai', country: 'CN', std: 480, dst: 480, abbr: ['CST', 'CST'], dstRule: 'none' },
  { id: 'Asia/Tokyo', city: 'Tokyo', country: 'JP', std: 540, dst: 540, abbr: ['JST', 'JST'], dstRule: 'none' },
  { id: 'Asia/Seoul', city: 'Seoul', country: 'KR', std: 540, dst: 540, abbr: ['KST', 'KST'], dstRule: 'none' },
  { id: 'Australia/Sydney', city: 'Sydney', country: 'AU', std: 600, dst: 660, abbr: ['AEST', 'AEDT'], dstRule: 'south' },
  { id: 'Australia/Melbourne', city: 'Melbourne', country: 'AU', std: 600, dst: 660, abbr: ['AEST', 'AEDT'], dstRule: 'south' },
  { id: 'Australia/Brisbane', city: 'Brisbane', country: 'AU', std: 600, dst: 600, abbr: ['AEST', 'AEST'], dstRule: 'none' },
  { id: 'Australia/Perth', city: 'Perth', country: 'AU', std: 480, dst: 480, abbr: ['AWST', 'AWST'], dstRule: 'none' },
  { id: 'Australia/Adelaide', city: 'Adelaide', country: 'AU', std: 570, dst: 630, abbr: ['ACST', 'ACDT'], dstRule: 'south' },
  { id: 'Pacific/Auckland', city: 'Auckland', country: 'NZ', std: 720, dst: 780, abbr: ['NZST', 'NZDT'], dstRule: 'south' },
  { id: 'Africa/Johannesburg', city: 'Johannesburg', country: 'ZA', std: 120, dst: 120, abbr: ['SAST', 'SAST'], dstRule: 'none' },
  { id: 'Africa/Lagos', city: 'Lagos', country: 'NG', std: 60, dst: 60, abbr: ['WAT', 'WAT'], dstRule: 'none' },
  { id: 'Africa/Nairobi', city: 'Nairobi', country: 'KE', std: 180, dst: 180, abbr: ['EAT', 'EAT'], dstRule: 'none' },
  { id: 'Africa/Cairo', city: 'Cairo', country: 'EG', std: 120, dst: 180, abbr: ['EET', 'EEST'], dstRule: 'eg' },
];

const TZ_BY_ID = Object.fromEntries(TZ_DB.map((z) => [z.id, z]));

/* DST rules: return true if dst applied at given UTC date.
   us: 2nd Sunday March 02:00 local → 1st Sunday Nov 02:00
   eu: last Sunday March 01:00 UTC → last Sunday Oct 01:00 UTC
   south: first Sunday Oct → first Sunday April (Southern hemisphere)
   il: last Friday March → last Sunday Oct
   eg: last Friday April → last Thursday Oct
   none: never */
function _nthWeekday(year, month, weekday, nth) { // month 0-based, weekday 0=Sun
  if (nth > 0) {
    const first = new Date(Date.UTC(year, month, 1));
    const firstWd = first.getUTCDay();
    const day = 1 + ((weekday - firstWd + 7) % 7) + (nth - 1) * 7;
    return new Date(Date.UTC(year, month, day));
  }
  const last = new Date(Date.UTC(year, month + 1, 0));
  const lastWd = last.getUTCDay();
  const day = last.getUTCDate() - ((lastWd - weekday + 7) % 7) - (-nth - 1) * 7;
  return new Date(Date.UTC(year, month, day));
}
function dstActive(zone, date) {
  const rule = zone.dstRule;
  if (rule === 'none' || zone.std === zone.dst) return false;
  const y = date.getUTCFullYear();
  const t = date.getTime();
  if (rule === 'us') {
    const start = _nthWeekday(y, 2, 0, 2); start.setUTCHours(7); // 02:00 EST = 07:00 UTC
    const end = _nthWeekday(y, 10, 0, 1); end.setUTCHours(6);
    return t >= start.getTime() && t < end.getTime();
  }
  if (rule === 'eu') {
    const start = _nthWeekday(y, 2, 0, -1); start.setUTCHours(1);
    const end = _nthWeekday(y, 9, 0, -1); end.setUTCHours(1);
    return t >= start.getTime() && t < end.getTime();
  }
  if (rule === 'south') {
    const start = _nthWeekday(y, 9, 0, 1); start.setUTCHours(16); // 02:00 AEST = 16:00 UTC prev day handled by month boundaries
    const end = _nthWeekday(y, 3, 0, 1); end.setUTCHours(16);
    const yStart = new Date(Date.UTC(y, 9, 1)).getTime();
    if (t < start.getTime()) {
      const endPrev = _nthWeekday(y - 1, 3, 0, 1); endPrev.setUTCHours(16);
      return t >= endPrev.getTime() && t < end.getTime();
    }
    return t >= start.getTime() && t < new Date(Date.UTC(y + 1, 3, 1)).getTime();
  }
  if (rule === 'il') {
    const start = _nthWeekday(y, 2, 5, -1); start.setUTCHours(0);
    const end = _nthWeekday(y, 9, 0, -1); end.setUTCHours(1);
    return t >= start.getTime() && t < end.getTime();
  }
  if (rule === 'eg') {
    const start = _nthWeekday(y, 3, 5, -1); start.setUTCHours(22);
    const end = _nthWeekday(y, 9, 4, -1); end.setUTCHours(21);
    return t >= start.getTime() && t < end.getTime();
  }
  return false;
}
function tzOffset(zone, date = new Date()) {
  return dstActive(zone, date) ? zone.dst : zone.std;
}
function tzAbbr(zone, date = new Date()) {
  return dstActive(zone, date) ? zone.abbr[1] : zone.abbr[0];
}
function tzLabel(zone) {
  const off = tzOffset(zone, new Date());
  const sign = off < 0 ? '-' : '+';
  const abs = Math.abs(off);
  return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? ':' + String(abs % 60).padStart(2, '0') : ''}`;
}

/* text direction helper */
function dirOf(locale) { return (LOCALE_META[locale] || [])[3] || 'ltr'; }

/* locale time format hints: 12h for en-US, en-CA(en), ar, he; 24h others */
function hour12(locale) { return ['en-US', 'en-AE', 'en-PH', 'ar-AE', 'ar-SA', 'ar-QA', 'he-IL'].includes(locale); }

/* --------------------------------------------------- OS/device archetypes */
/* ------------------------------------------------ known-good OS archetypes */
const WIN_ARCH = {
  win10: { id: 'win10', label: 'Windows 10 (22H2)', nt: '10.0', build: '19045.3803', chVersion: '10.0.0', arch: 'x86_64', gpuSet: 'win', fontSet: 'windows10', platform: 'Win32', speedUnit: 'mph' },
  win11: { id: 'win11', label: 'Windows 11 (23H2)', nt: '10.0', build: '22631.3155', chVersion: '15.0.0', arch: 'x86_64', gpuSet: 'win', fontSet: 'windows11', platform: 'Win32', speedUnit: 'km/h' },
};

const MAC_ARCH = {
  'MacBook Air M1': { label: 'macOS 14.4.1 Sonoma · MacBook Air M1', osVersion: '14.4.1', safari: '17.4.1', arch: 'arm', gpu: 'Apple M1', ram: [8, 16], cores: 8 },
  'MacBook Air M2': { label: 'macOS 15.1 Sequoia · MacBook Air M2', osVersion: '15.1', safari: '18.1', arch: 'arm', gpu: 'Apple M2', ram: [8, 16, 24], cores: 8 },
  'MacBook Pro M3': { label: 'macOS 26.1 · MacBook Pro M3', osVersion: '26.1', safari: '26.1', arch: 'arm', gpu: 'Apple M3', ram: [16, 32], cores: 8 },
  'iMac 24 M1': { label: 'macOS 14.2.1 · iMac 24 M1', osVersion: '14.2.1', safari: '17.2.1', arch: 'arm', gpu: 'Apple M1', ram: [16], cores: 8 },
};

const LINUX_ARCH = {
  ubuntu: { label: 'Ubuntu 22.04 LTS · GNOME', osVersion: '22.04', chVersion: '6.5.0', arch: 'x86_64', gpuSet: 'linux', fontSet: 'linux', platform: 'Linux x86_64' },
  fedora: { label: 'Fedora 40 · GNOME', osVersion: '40', chVersion: '6.8.5', arch: 'x86_64', gpuSet: 'linux', fontSet: 'linux', platform: 'Linux x86_64' },
};

const ANDROID_DEVICES = [
  { model: 'Pixel 8', name: 'Google Pixel 8', brand: 'google', release: '2023-10', chip: 'Google Tensor G3', cores: 9, gpu: 'Mali-G715', ram: 8, screen: [1080, 2400], dpr: 2.625, ids: ['chrome', 'firefox'] },
  { model: 'SM-S921B', name: 'Samsung Galaxy S24', brand: 'samsung', release: '2024-01', chip: 'Qualcomm Snapdragon 8 Gen 3', cores: 8, gpu: 'Adreno (TM) 750', ram: 8, screen: [1080, 2340], dpr: 2.8125, ids: ['chrome'] },
  { model: 'SM-S911B', name: 'Samsung Galaxy S23', brand: 'samsung', release: '2023-02', chip: 'Qualcomm Snapdragon 8 Gen 2', cores: 8, gpu: 'Adreno (TM) 740', ram: 8, screen: [1080, 2340], dpr: 2.8125, ids: ['chrome'] },
  { model: 'RMX1971', name: 'realme 5 Pro', brand: 'realme', release: '2019-08', chip: 'Qualcomm Snapdragon 712', cores: 8, gpu: 'Adreno (TM) 616', ram: 4, screen: [1080, 2340], dpr: 2.75, ids: ['chrome'] },
  { model: 'SM-A505F', name: 'Samsung Galaxy A50', brand: 'samsung', release: '2019-03', chip: 'Samsung Exynos 9610', cores: 8, gpu: 'Mali-G72 MP3', ram: 4, screen: [1080, 2340], dpr: 2.625, ids: ['chrome'] },
  { model: '23021RAAEG', name: 'Redmi Note 12', brand: 'xiaomi', release: '2023-03', chip: 'Qualcomm Snapdragon 685', cores: 8, gpu: 'Adreno (TM) 610', ram: 4, screen: [1080, 2400], dpr: 2.75, ids: ['chrome'] },
  { model: '2211133G', name: 'Xiaomi 13', brand: 'xiaomi', release: '2023-02', chip: 'Qualcomm Snapdragon 8 Gen 2', cores: 8, gpu: 'Adreno (TM) 740', ram: 8, screen: [1080, 2400], dpr: 2.75, ids: ['chrome'] },
  { model: 'CPH2451', name: 'OPPO Reno8 T', brand: 'oppo', release: '2023-01', chip: 'Qualcomm Snapdragon 695', cores: 8, gpu: 'Adreno (TM) 619', ram: 8, screen: [1080, 2400], dpr: 2.75, ids: ['chrome'] },
  { model: 'M2101K6G', name: 'Xiaomi Redmi Note 10 Pro', brand: 'xiaomi', release: '2021-03', chip: 'Qualcomm Snapdragon 732G', cores: 8, gpu: 'Adreno (TM) 618', ram: 6, screen: [1080, 2400], dpr: 2.75, ids: ['chrome'] },
  { model: 'V2140', name: 'vivo Y33s', brand: 'vivo', release: '2021-07', chip: 'MediaTek Helio G80', cores: 8, gpu: 'Mali-G52 MC2', ram: 4, screen: [1080, 2400], dpr: 2.75, ids: ['chrome'] },
  { model: 'Pixel 7', name: 'Google Pixel 7', brand: 'google', release: '2022-10', chip: 'Google Tensor G2', cores: 8, gpu: 'Mali-G710', ram: 8, screen: [1080, 2400], dpr: 2.625, ids: ['chrome', 'firefox'] },
  { model: 'Pixel 9 Pro', name: 'Google Pixel 9 Pro', brand: 'google', release: '2024-09', chip: 'Google Tensor G4', cores: 8, gpu: 'Mali-G715', ram: 16, screen: [1280, 2856], dpr: 3, ids: ['chrome'] },
];

const IOS_DEVICES = [
  { model: 'iPhone16,1', name: 'iPhone 15 Pro', release: '2023-09', ios: ['17.5', '18.1', '26.1'], screen: [393, 852], dpr: 3, ram: 8 },
  { model: 'iPhone15,2', name: 'iPhone 14 Pro', release: '2022-09', ios: ['17.4.1', '18.1', '26.1'], screen: [393, 852], dpr: 3, ram: 6 },
  { model: 'iPhone14,5', name: 'iPhone 13', release: '2021-09', ios: ['17.5.1', '18.1', '26.0'], screen: [390, 844], dpr: 3, ram: 4 },
  { model: 'iPhone17,1', name: 'iPhone 16 Pro', release: '2024-09', ios: ['18.1', '26.1'], screen: [402, 874], dpr: 3, ram: 8 },
];
