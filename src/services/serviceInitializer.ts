import { SpotifyService } from './SpotifyService';
import { AudioService } from './AudioService';
import { TrackNavigationService } from './TrackNavigationService';

let spotifyServiceInstance: SpotifyService;

export function initializeServices(): SpotifyService {
	const trackNavigationService = new TrackNavigationService();
	const audioService = new AudioService(() => spotifyServiceInstance.onTrackEnd());
	spotifyServiceInstance = new SpotifyService(trackNavigationService, audioService);
	return spotifyServiceInstance;
}

export const spotifyService = initializeServices();