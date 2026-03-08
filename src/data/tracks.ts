export interface Track {
  id: number;
  title: string;
  artist: string;
  genre: string;
  plays: string;
  likes: string;
  reposts: string;
  duration: string;
  uploadDate: string;
  cover: string;
  coverGradient: string;
  verified: boolean;
  isNew?: boolean;
  description?: string;
}

export interface Artist {
  id: number;
  name: string;
  avatar: string;
  avatarGradient: string;
  followers: string;
  tracks: number;
  bio: string;
  verified: boolean;
  genre: string;
}

export const trendingTracks: Track[] = [
  {
    id: 1,
    title: 'Neon Horizons',
    artist: 'Stellar Wave',
    genre: 'Electronic',
    plays: '2.4M',
    likes: '184K',
    reposts: '32K',
    duration: '3:47',
    uploadDate: '2 дня назад',
    cover: '',
    coverGradient: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
    verified: true,
  },
  {
    id: 2,
    title: 'Midnight Protocol',
    artist: 'AXIOM',
    genre: 'Synthwave',
    plays: '1.8M',
    likes: '142K',
    reposts: '28K',
    duration: '4:12',
    uploadDate: '5 дней назад',
    cover: '',
    coverGradient: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
    verified: true,
  },
  {
    id: 3,
    title: 'Urban Dreams',
    artist: 'KxNG Flow',
    genre: 'Hip-Hop',
    plays: '3.1M',
    likes: '267K',
    reposts: '54K',
    duration: '2:58',
    uploadDate: '1 неделю назад',
    cover: '',
    coverGradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    verified: true,
  },
  {
    id: 4,
    title: 'Crystal Caves',
    artist: 'Amara Sol',
    genre: 'Lo-Fi',
    plays: '956K',
    likes: '89K',
    reposts: '15K',
    duration: '5:23',
    uploadDate: '3 дня назад',
    cover: '',
    coverGradient: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
    verified: true,
  },
  {
    id: 5,
    title: 'Parallel Lines',
    artist: 'The Echoes',
    genre: 'Indie',
    plays: '1.2M',
    likes: '103K',
    reposts: '21K',
    duration: '3:31',
    uploadDate: '1 неделю назад',
    cover: '',
    coverGradient: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
    verified: false,
  },
  {
    id: 6,
    title: 'Autumn Letters',
    artist: 'Vera Mist',
    genre: 'Jazz',
    plays: '678K',
    likes: '56K',
    reposts: '9K',
    duration: '4:44',
    uploadDate: '4 дня назад',
    cover: '',
    coverGradient: 'linear-gradient(135deg, #F97316 0%, #FBBF24 100%)',
    verified: true,
  },
];

export const newReleases: Track[] = [
  {
    id: 7,
    title: 'Signal Lost',
    artist: 'FLUX DRIVE',
    genre: 'Electronic',
    plays: '12K',
    likes: '1.4K',
    reposts: '340',
    duration: '4:05',
    uploadDate: '6 часов назад',
    cover: '',
    coverGradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    verified: true,
    isNew: true,
    description: 'Новый трек из грядущего альбома "Transmission"',
  },
  {
    id: 8,
    title: 'Rain & Neon',
    artist: 'Kai Yoshida',
    genre: 'Synthwave',
    plays: '8.3K',
    likes: '920',
    reposts: '187',
    duration: '3:52',
    uploadDate: '12 часов назад',
    cover: '',
    coverGradient: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)',
    verified: true,
    isNew: true,
    description: 'Вдохновлено ночными прогулками по Токио',
  },
  {
    id: 9,
    title: 'Hollow Moon',
    artist: 'Sienna Parks',
    genre: 'Indie',
    plays: '4.7K',
    likes: '612',
    reposts: '98',
    duration: '3:18',
    uploadDate: '1 день назад',
    cover: '',
    coverGradient: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
    verified: false,
    isNew: true,
    description: 'Дебютный сингл молодой артистки',
  },
  {
    id: 10,
    title: 'Gravity Shift',
    artist: 'Novan',
    genre: 'Electronic',
    plays: '19K',
    likes: '2.1K',
    reposts: '450',
    duration: '5:11',
    uploadDate: '1 день назад',
    cover: '',
    coverGradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    verified: true,
    isNew: true,
    description: 'Экспериментальный саундскейп с живыми инструментами',
  },
];

export const genres = [
  { name: 'Electronic', icon: '⚡', gradient: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', count: '1.2M треков' },
  { name: 'Hip-Hop', icon: '🎤', gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)', count: '890K треков' },
  { name: 'Rock', icon: '🎸', gradient: 'linear-gradient(135deg, #EF4444, #7C3AED)', count: '654K треков' },
  { name: 'Lo-Fi', icon: '☕', gradient: 'linear-gradient(135deg, #10B981, #3B82F6)', count: '445K треков' },
  { name: 'Jazz', icon: '🎷', gradient: 'linear-gradient(135deg, #F97316, #FBBF24)', count: '320K треков' },
  { name: 'Classical', icon: '🎻', gradient: 'linear-gradient(135deg, #6366F1, #EC4899)', count: '278K треков' },
  { name: 'Pop', icon: '🌟', gradient: 'linear-gradient(135deg, #EC4899, #8B5CF6)', count: '1.8M треков' },
  { name: 'Indie', icon: '🎵', gradient: 'linear-gradient(135deg, #14B8A6, #6366F1)', count: '567K треков' },
];

export const featuredArtists: Artist[] = [
  {
    id: 1,
    name: 'Stellar Wave',
    avatar: '',
    avatarGradient: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
    followers: '245K',
    tracks: 34,
    bio: 'Электронный продюсер из Берлина. Создаю миры из звука.',
    verified: true,
    genre: 'Electronic',
  },
  {
    id: 2,
    name: 'AXIOM',
    avatar: '',
    avatarGradient: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
    followers: '189K',
    tracks: 21,
    bio: 'Synthwave артист. Вдохновлён 80-ми, живу в будущем.',
    verified: true,
    genre: 'Synthwave',
  },
  {
    id: 3,
    name: 'Amara Sol',
    avatar: '',
    avatarGradient: 'linear-gradient(135deg, #10B981, #3B82F6)',
    followers: '98K',
    tracks: 56,
    bio: 'Lo-fi beats для работы, учёбы и ночных мыслей.',
    verified: true,
    genre: 'Lo-Fi',
  },
];
