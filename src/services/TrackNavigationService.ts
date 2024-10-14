import { BehaviorSubject, Observable, combineLatest, from, of, concat, iif } from 'rxjs';
import { map, take, distinctUntilChanged, shareReplay, concatMap, find, tap, withLatestFrom } from 'rxjs/operators';


import { createShuffledIndices } from '../utils/seededRandom';
import { Track, PlayerState } from '../contracts';


export class TrackNavigationService {
	// BehaviorSubject to hold and emit the current list of tracks.
	private trackList$ = new BehaviorSubject<Track[]>( [] );

	// BehaviorSubject to hold and emit the current player state.
	private playerState$ = new BehaviorSubject<PlayerState>( {
		currentTrackIndex: -1, // Index of the currently playing track in the track list.
		isPlaying        : false,      // Indicates whether the player is currently playing.
		isShuffled       : false,     // Indicates whether shuffle mode is enabled.
		isLooped         : false,      // Indicates whether loop mode is enabled.
		shuffleKey       : '',       // A key used to manage shuffling logic (could be a timestamp or random string).
	} );

	private shuffledIndices$ = this.playerState$.pipe(
		withLatestFrom( this.trackList$ ),
		map( ( [ playerState, tracks ] ) => {
			const { isShuffled, shuffleKey } = playerState;
			return isShuffled && shuffleKey
			       ? createShuffledIndices( tracks.length, shuffleKey )
			       : [ ...Array( tracks.length ).keys() ];
		} ),
		shareReplay( 1 ), // Cache the latest shuffled indices
	);

	// Updates the track list with a new array of tracks.
	setTracks( tracks: Track[] ): void{
		this.trackList$.next( tracks );
	}

	// Updates the player state with a new PlayerState object.
	setPlayerState( state: PlayerState ): void{
		this.playerState$.next( state );
	}

	// Returns an observable that emits the current player state.
	getPlayerState(): Observable<PlayerState>{
		return this.playerState$.asObservable();
	}

	// Returns an observable that emits the current track (or null if no track is selected).
	getCurrentTrack(): Observable<Track | null>{
		// Combines the latest values from trackList$ and playerState$ observables.
		return combineLatest( [ this.trackList$, this.playerState$ ] ).pipe(
			// Maps the combined values to the current track or null.
			map( ( [ tracks, playerState ] ) => {
				// If the currentTrackIndex is valid, return the track at that index, otherwise return null.
				return playerState.currentTrackIndex >= 0 ? tracks[playerState.currentTrackIndex] : null;
			} ),
			// Emits only when the ID of the current track changes (prevents unnecessary emissions).
			distinctUntilChanged( ( prev, curr ) => prev?.id === curr?.id ),
			// Shares the latest emitted value with new subscribers (improves efficiency).
			shareReplay( 1 ),
		);
	}

	// Changes the current track to the next or previous track in the list.
	changeTrack( direction: 'next' | 'previous' ): Observable<Track | null>{
		return this.shuffledIndices$.pipe(
			// Get the latest shuffled indices, player state, and track list
			withLatestFrom( this.playerState$, this.trackList$ ),

			// Use concatMap to switch to the inner Observable returned by findNextPlayableTrack
			concatMap( ( [ indices, playerState, tracks ] ) => {
				const { currentTrackIndex, isLooped } = playerState;

				// Determine the next index based on the current index and direction
				let nextIndex = indices.indexOf( currentTrackIndex );
				if ( nextIndex === -1 ) {
					// If the current track index is not found in the indices (shouldn't happen, but handle it just in case)
					nextIndex = 0; // Start from the beginning
				} else {
					// Calculate the next index based on the direction
					nextIndex += ( direction === 'next' ? 1 : -1 );
				}

				// Handle wrap-around for looping or return null if not looping and at the end/beginning
				if ( nextIndex >= indices.length || nextIndex < 0 ) {
					if ( isLooped ) {
						// If looping, wrap around to the beginning or end of the indices
						nextIndex = direction === 'next' ? 0 : indices.length - 1;
					} else {
						// If not looping and reached the end/beginning, return an Observable emitting null
						return of( null );
					}
				}

				// Call findNextPlayableTrack to get the next playable track Observable
				return this.findNextPlayableTrack( tracks, indices, nextIndex, direction );
			} ),
			take( 1 ), // Take only the first emission (the next track)
		);
	}

	// Gets the next playable track.
	nextTrack(): Observable<Track | null>{
		return this.changeTrack( 'next' );
	}

	// Gets the previous playable track.
	previousTrack(): Observable<Track | null>{
		return this.changeTrack( 'previous' );
	}

	// Finds the next playable track in the given direction ('next' or 'previous').
	private findNextPlayableTrack( tracks: Track[], indices: number[], startIndex: number, direction: 'next' | 'previous' ): Observable<Track | null>{
		const { isLooped } = this.playerState$.value;

		// Create an Observable that emits indices in the correct order, considering loop and direction.
		const indices$ = iif(
			() => isLooped,
			// If looping, create a circular stream of indices.
			concat(
				from( indices.slice( startIndex ) ),
				from( indices.slice( 0, startIndex ) ),
			),
			// If not looping, handle 'next' and 'previous' directions differently.
			iif(
				() => direction === 'next',
				// If direction is 'next', take indices from startIndex to the end.
				from( indices.slice( startIndex ) ),
				// If direction is 'previous', take indices from the beginning to startIndex and reverse them.
				from( indices.slice( 0, startIndex + 1 ).reverse() ),
			),
		);

		// Map the indices to the actual tracks and find the first playable track.
		return indices$.pipe(
			map( index => tracks[index] ),
			find( ( track ): track is Track => track !== undefined && this.isTrackPlayable( track ) ),
			tap( track => {
				if ( track ) {
					const newIndex = tracks.indexOf( track );
					this.updatePlayerState( newIndex );
				}
			} ),
			map( track => track || null ), // Ensure we always return Track | null
		);
	}

	// Creates an iterator function that returns the next track index based on the direction.
	// Updates the player state with the new track index.
	private updatePlayerState( newIndex: number ): void{
		this.playerState$.next( {
			...this.playerState$.value,
			currentTrackIndex: newIndex,
			isPlaying        : true,
		} );
	}

	// Checks if a track is playable (has a preview_url).
	private isTrackPlayable( track: Track ): boolean{
		return !!track.preview_url;
	}

	getTracks(): Track[]{
		return this.trackList$.value;
	}
}