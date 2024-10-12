import { useContext } from 'react';
import { useObservable } from 'rxjs-hooks';
import { Observable } from 'rxjs';
import { SpotifyServiceContext } from '../services/SpotifyServiceContext';

export function useSpotifyObservable<T>(selector: (service: typeof spotifyService) => Observable<T>, initialValue: T) {
	const spotifyService = useContext(SpotifyServiceContext);
	return useObservable(() => selector(spotifyService), initialValue);
}