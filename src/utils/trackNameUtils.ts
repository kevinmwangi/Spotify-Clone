import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { Track } from '../contracts';
import is from '../utils/is';

export function trimTrackName(name: string): string {
	return name.replace(/\s*\(.*?\)\s*/g, '').trim();
}

// Format Track Name:
export function getFormattedTrackName(trackObservable: Observable<Track | null>): Observable<string> {
	return trackObservable.pipe(
		filter((track): track is Track => !is.nullish(track)), // Use the is.nullish utility
		map(track => trimTrackName(track.name))
	);
}