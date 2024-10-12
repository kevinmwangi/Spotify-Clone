import { BehaviorSubject, Subject, Observable, fromEvent } from 'rxjs';
import { map, distinctUntilChanged, shareReplay, tap, filter, takeUntil, retry, catchError } from 'rxjs/operators';
import { Root, User, DiscoverWeekly, Track, AppState, PlayerState, AppError } from '../contracts';
import { TrackNavigationService } from './TrackNavigationService';
import { AudioService } from './AudioService';

// Utility function for checking null or undefined values
import is from '../utils/is';
import mockData from '../mocks/data.json'; // Importing mock data

// Defining the initial state of the application
const initialState: AppState = {
	user: {} as User,              // User object (initially empty)
	playlists: [],               // Array of playlists (initially empty)
	discoverWeekly: {} as DiscoverWeekly, // Discover a Weekly playlist object (initially empty)
	playerState: {              // Player state object
		currentTrackIndex: -1,    // No track selected initially
		isPlaying: false,         // Not playing initially
		isShuffled: false,        // Shuffle off initially
		isLooped: false,          // Loop off initially
		shuffleKey: '',          // No shuffle key initially
	},
};

export class SpotifyService {
	// BehaviorSubject to hold and emit the application state
	private state$ = new BehaviorSubject<AppState>(initialState);

	private playStateChanged$ = new Subject<boolean>();

	// Add a new subject to emit pause events
	private pauseSubject$ = new Subject<void>();

	// BehaviorSubject to hold and emit any errors encountered
	private errorSubject$ = new BehaviorSubject<AppError | null>(null);

	// BehaviorSubject to hold and emit the current volume
	private volumeSubject$ = new BehaviorSubject<number>(this.getInitialVolume());

	// Subject used to signal the destruction of this service and unsubscribe from observables
	private destroy$ = new Subject<void>();

	// Observables derived from the state$ BehaviorSubject
	user$ = this.state$.pipe(
		map(state => state.user),        // Extract the user from the state
		distinctUntilChanged(),        // Emit only when the user object changes
		shareReplay(1)                 // Share the latest emitted value with new subscribers
	);
	playlists$ = this.state$.pipe(
		map(state => state.playlists),  // Extract the playlists from the state
		distinctUntilChanged(),        // Emit only when the playlist array changes
		shareReplay(1)                 // Share the latest emitted value with new subscribers
	);
	discoverWeekly$ = this.state$.pipe(
		map(state => state.discoverWeekly), // Extract the Discover Weekly playlist from the state
		distinctUntilChanged(),        // Emit only when the Discover Weekly playlist object changes
		shareReplay(1)                 // Share the latest emitted value with new subscribers
	);
	playerState$ = this.state$.pipe(
		map(state => state.playerState), // Extract the player state from the state
		distinctUntilChanged(),        // Emit only when the player state object changes
		shareReplay(1)                 // Share the latest emitted value with new subscribers
	);

	// Observable for the current track, obtained from the TrackNavigationService
	currentTrack$ = this.trackNavigation.getCurrentTrack();

	// Observable for errors, obtained from the errorSubject$ BehaviorSubject
	error$ = this.errorSubject$.asObservable();

	// Observable for volume, obtained from the volumeSubject$ BehaviorSubject
	volume$ = this.volumeSubject$.asObservable();

	getPlayStateChanged(): Observable<boolean> {
		return this.playStateChanged$.asObservable();
	}

	getPauseEvent(): Observable<void> {
		return this.pauseSubject$.asObservable();
	}

	constructor(
		// Injecting the TrackNavigationService
		private trackNavigation: TrackNavigationService,
		private audioService: AudioService
	) {
		this.audioService = audioService;
		this.initializeData();           // Initialize application data
		this.initializeVolumeListener();  // Set up listener for volume changes in localStorage
		this.initializeTrackNavigation(); // Initialize track navigation logic
	}

	// Initializes the application state with mock data
	private initializeData() {
		const data = mockData as Root; // Type assertion to Root interface
		this.updateState({             // Update the state with user, playlists, and Discover Weekly data
			user: data.user,
			playlists: data.playlists.items,
			discoverWeekly: data.discover_weekly,
		});
	}

	// Listens for changes to 'spotifyVolume' in localStorage and updates the volumeSubject$
	private initializeVolumeListener() {
		fromEvent<StorageEvent>(window, 'storage').pipe( // Create an observable from 'storage' events on the window
			filter((event) => event.key === 'spotifyVolume'), // Filter events for 'spotifyVolume' key
			map((event) => parseInt(event.newValue || '30', 10)) // Extract and parse the volume value
		).subscribe(volume => this.volumeSubject$.next(volume)); // Update volumeSubject$ with the new volume
	}

	// Initializes track navigation by setting tracks and subscribing to player state changes
	private initializeTrackNavigation() {
		this.discoverWeekly$.pipe(
			takeUntil(this.destroy$), // Unsubscribe when destroy$ emits
			map(discoverWeekly => this.getValidTracks(discoverWeekly.tracks.items.map(item => item.track))) // Extract and filter valid tracks
		).subscribe(tracks => {
			this.trackNavigation.setTracks(tracks); // Set the tracks in TrackNavigationService
		});

		this.trackNavigation.getPlayerState().pipe(
			takeUntil(this.destroy$) // Unsubscribe when destroy$ emits
		).subscribe(playerState => {
			this.updateState({ playerState }); // Update the player state in the application state
		});
	}

	// Retrieves the initial volume from localStorage
	private getInitialVolume(): number {
		// Get 'spotifyVolume' from localStorage, default to '30' if not found, and parse as an integer
		return parseInt(localStorage.getItem('spotifyVolume') || '30', 10);
	}

	// Updates the application state with the provided new state
	private updateState(newState: Partial<AppState>) {
		this.state$.next({ ...this.state$.value, ...newState });
	}

	// Filters an array of tracks, returning only tracks with a preview_url
	private getValidTracks(tracks: Track[]): Track[] {
		return tracks.filter(track => !is.nullish(track.preview_url));
	}

	// Starts playing the playlist from the beginning
	playPlaylist() {
		const newState = {
			...this.state$.value.playerState, // Keep the existing player state
			currentTrackIndex: 0, // Set the current track index to 0 (start of playlist)
			isPlaying: true // Set isPlaying to true
		};
		this.trackNavigation.setPlayerState(newState);
		this.playStateChanged$.next(true);
	}

	// Toggles the play/pause state of the player
	togglePlay() {
		const newIsPlaying = !this.state$.value.playerState.isPlaying;
		this.trackNavigation.setPlayerState({
			...this.state$.value.playerState,
			isPlaying: newIsPlaying
		});

		this.audioService.playPause(newIsPlaying ? 'play' : 'pause');

		if (newIsPlaying && this.state$.value.playerState.currentTrackIndex === -1) {
			this.playPlaylist();
		}
	}

	onTrackEnd() {
		this.nextTrack().subscribe({
			next: (track: Track | null) => {
				if (!track) {
					if (this.state$.value.playerState.isLooped) {
						// If looped and at the end, start from the beginning
						this.playPlaylist();
					} else {
						console.warn('No more playable tracks');
						this.setIsPlaying(false);
						this.playStateChanged$.next(false);
					}
				}
			},
			error: (error) => {
				console.error('Error changing track:', error);
				this.setIsPlaying(false);
				this.playStateChanged$.next(false);
			},
		});
	}

	// Update the state of the player
	setIsPlaying(isPlaying: boolean) {
		this.trackNavigation.setPlayerState({
			...this.state$.value.playerState,
			isPlaying: isPlaying
		});
	}

	// Selects a specific track to play
	selectTrack(track: Track) {
		const tracks = this.getValidTracks(this.state$.value.discoverWeekly.tracks.items.map(item => item.track));
		const trackIndex = tracks.findIndex(t => t.id === track.id);

		if (trackIndex !== -1 && track.preview_url) {
			this.trackNavigation.setPlayerState({
				...this.state$.value.playerState,
				currentTrackIndex: trackIndex,
				isPlaying: true
			});
			this.audioService.setupAudio({
				name: track.name,
				url: track.preview_url
			}, this.volumeSubject$.value).subscribe({
				next: () => {
					this.audioService.play().subscribe({
						next: () => console.log('Track started playing'),
						error: (error) => console.error('Error playing track:', error)
					});
				},
				error: (error) => console.error('Error setting up audio:', error)
			});
		} else {
			this.errorSubject$.next({
				message: `No preview URL available for track: ${track.name}`,
				severity: 'warning'
			});
			this.nextTrack();
		}
	}

	// Moves to the next track in the playlist
	nextTrack(): Observable<Track | null> {
		// Get the next track from the TrackNavigationService
		return this.trackNavigation.nextTrack().pipe(
			// Use tap to perform a side effect without altering the observable stream
			tap(track => {
				if (!track) { // If no track is returned (end of playlist),
					// Emit an error indicating the end of the playlist
					this.errorSubject$.next({
						message: "End of playlist reached",
						severity: 'info'
					});
				}
			}),
			retry(3),     // Retry up to 3 times if an error occurs during track changing
			catchError(error => { // Catch any errors during track changing
				console.error('Error changing to next track:', error);
				return []; // Return an empty array to prevent further emissions and stop the observable stream
			})
		);
	}

	// Moves to the previous track in the playlist
	previousTrack(): Observable<Track | null> {
		return this.trackNavigation.previousTrack().pipe(
			tap(track => {
				if (!track) { // If no track is returned (beginning of playlist or no previous playable track)
					this.errorSubject$.next({ // Emit an error indicating no previous playable tracks
						message: "No previous playable tracks",
						severity: 'info'
					});
				}
			}),
			retry(3),     // Retry up to 3 times if an error occurs
			catchError(error => { // Catch any errors during track changing
				console.error('Error changing to previous track:', error);
				return []; // Return an empty array to prevent further emissions
			})
		);
	}

	// Toggles the shuffle mode of the player
	toggleShuffle() {
		const newIsShuffled = !this.state$.value.playerState.isShuffled;
		const newPlayerState: PlayerState = {
			...this.state$.value.playerState,
			isShuffled: newIsShuffled,
			shuffleKey: newIsShuffled ? Date.now().toString() : ''
		};
		this.trackNavigation.setPlayerState(newPlayerState);
	}

	// Toggles the loop mode of the player
	toggleLoop() {
		// Create a new player state object with the toggled loop state
		const newPlayerState: PlayerState = {
			...this.state$.value.playerState, // Keep the existing player state
			isLooped: !this.state$.value.playerState.isLooped // Toggle the isLooped state
		};
		this.trackNavigation.setPlayerState(newPlayerState); // Update the player state in TrackNavigationService
	}

	// Sets the volume of the player
	setVolume(volume: number) {
		// Ensure the volume is within the valid range (0-100) and round it to an integer
		const newVolume = Math.max(0, Math.min(100, Math.round(volume)));
		this.volumeSubject$.next(newVolume);        // Update the volumeSubject$ with the new volume
		localStorage.setItem('spotifyVolume', newVolume.toString()); // Store the volume in localStorage
	}

	// Clears any existing error
	clearError() {
		this.errorSubject$.next(null); // Emit null on the errorSubject$ to clear the error
	}

	// Cleans up and destroys the service
	destroy() {
		this.destroy$.next();    // Emit a value on destroy$ to trigger un-subscribe
		this.destroy$.complete(); // Complete the destroy$ Subject to prevent further emissions
	}
}
