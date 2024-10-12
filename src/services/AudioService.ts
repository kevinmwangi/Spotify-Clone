import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { AudioState, TrackInfo } from '../contracts';


export class AudioService {
	// Audio element to control playback. Initialized to null will be assigned an HTMLAudioElement in the constructor.
	private readonly audio: HTMLAudioElement | null = null;

	// BehaviorSubject to hold and emit the current audio state.
	private audioState$ = new BehaviorSubject<AudioState>( {
		isLoading  : false,  // Indicates whether the audio is currently loading.
		isReady    : false,    // Indicates whether the audio is ready to play.
		duration   : 0,      // Total duration of the audio track in seconds.
		currentTime: 0,    // Current playback position in seconds.
		volume: 100,    // Current Volume default to 100%.
		isPlaying  : false,    // Indicates whether the audio is currently playing.
		error      : null,       // Holds any errors encountered during audio playback.
	} );

	// Stores information about the currently playing track.
	private currentTrack: TrackInfo | null = null;

	// Subject used to signal the destruction of this service and unsubscribe from observables.
	private destroy$ = new Subject<void>();

	private playPauseSubject$ = new Subject<'play' | 'pause'>();

	constructor(
		// Callback function to be invoked when the current track ends.
		private onTrackEnd: () => void,
	){
		// Create a new HTMLAudioElement.
		this.audio = new Audio();
		// Set up event listeners for the audio element.
		this.setupAudioListeners();

		this.playPauseSubject$.pipe(
			takeUntil(this.destroy$),
			switchMap(command => {
				if (command === 'play') {
					return this.play();
				} else {
					this.pause();
					return new Observable<void>(observer => {
						observer.next();
						observer.complete();
					});
				}
			})
		).subscribe();
	}

	playPause(command: 'play' | 'pause'): void {
		this.playPauseSubject$.next(command);
	}

	private setupAudioListeners(){
		// If an audio element is not initialized, return.
		if ( !this.audio ) return;

		// Event listener for when the audio starts loading.
		this.audio.addEventListener( 'loadstart', () => {
			//console.log(`Started loading audio for: ${this.currentTrack?.name}`);
			this.updateAudioState( { isLoading: true, isReady: false } ); // Update state to reflect loading status.
		} );

		// Event listener for when the audio is ready to start playing.
		this.audio.addEventListener( 'canplay', () => {
			//console.log(`Audio can start playing for: ${this.currentTrack?.name}`);
			this.updateAudioState( { isLoading: false, isReady: true } ); // Update state to reflect ready status.
		} );

		// Event listener for when the audio playback ends.
		this.audio.addEventListener( 'ended', () => {
			//console.log(`Track ended: ${this.currentTrack?.name}`);
			this.onTrackEnd(); // Invoke the onTrackEnd callback.
			this.updateAudioState( { isPlaying: false } );
		} );

		// Event listener for when an error occurs during audio playback.
		this.audio.addEventListener( 'error', ( e ) => {
			this.handleError( new Error( `Audio loading failed for: ${this.currentTrack?.name}` ) ); // Handle the error.
		} );

		// Event listener for when the current playback time updates.
		this.audio.addEventListener( 'timeupdate', () => {
			this.updateAudioState( { currentTime: this.audio!.currentTime } ); // Update the current time in the state.
		} );

		// Event listener for when the audio duration changes (e.g., when a new track is loaded).
		this.audio.addEventListener( 'durationchange', () => {
			this.updateAudioState( { duration: this.audio!.duration } ); // Update the duration in the state.
		} );
	}

	// Returns an observable that emits the current audio state.
	getAudioState(): Observable<AudioState>{
		return this.audioState$.asObservable();
	}

	// Sets up the audio service to play a new track.
	setupAudio( trackInfo: TrackInfo, volume: number ): Observable<void>{
		this.destroy$.next(); // Emit a value on destroy$ to unsubscribe from previous track's observables.
		this.resetAudio();     // Reset the audio state and current track.

		this.currentTrack = trackInfo; // Store the new track information.
		if ( this.audio ) {
			this.audio.src = trackInfo.url;    // Set the audio source URL.
			this.audio.volume = volume / 100;  // Set the audio volume.
			this.audio.load();                // Load the new audio track.
		}

		// Update the audio state to reflect the loading status.
		this.audioState$.next( {
			isLoading  : true,
			isReady    : false,
			isPlaying  : false,
			error      : null,
			duration   : 0,
			currentTime: 0,
			volume: volume,
		} );

		return new Observable<void>( ( observer ) => {
			const canPlayHandler = () => {
				observer.next();
				observer.complete();
			};
			const errorHandler = ( error: Event ) => {
				observer.error( new Error( `Failed to load audio: ${error}` ) );
			};

			this.audio?.addEventListener( 'canplay', canPlayHandler );
			this.audio?.addEventListener( 'error', errorHandler );

			return () => {
				this.audio?.removeEventListener( 'canplay', canPlayHandler );
				this.audio?.removeEventListener( 'error', errorHandler );
			};
		} );
	}

	// Plays the current audio track.
	play(): Observable<void> {
		return new Observable<void>(observer => {
			if (!this.audio) {
				observer.error(new Error('Audio element not initialized'));
				return;
			}

			const playAudio = () => {
				this.audio!.play()
				           .then(() => {
					           console.log('Audio playback started');
					           this.updateAudioState({ isPlaying: true });
					           observer.next();
					           observer.complete();
				           })
				           .catch(error => {
					           console.error('Error starting audio playback:', error);
					           this.handleError(error);
					           observer.error(error);
				           });
			};

			if (this.audioState$.value.isReady) {
				playAudio();
			} else {
				console.log('Audio not ready, waiting for canplay event');
				const canPlayHandler = () => {
					this.audio!.removeEventListener('canplay', canPlayHandler);
					playAudio();
				};
				this.audio.addEventListener('canplay', canPlayHandler);
			}
		}).pipe(
			takeUntil(this.destroy$)
		);
	}

	// Pauses the current audio track.
	pause(): void{
		if ( this.audio ) {
			this.audio.pause();
			this.updateAudioState( { isPlaying: false } );
		}
	}

	// Sets the volume of the audio.
	setVolume(volume: number): void {
		if (this.audio) {
			this.audio.volume = volume / 100;
			this.updateAudioState({ volume: volume });
		}
	}

	// Seeks to a specific time in the audio track.
	seekTo( time: number ): void{
		if ( this.audio ) {
			this.audio.currentTime = time;
		}
	}

	// Cleans up and destroys the service
	destroy(){
		this.destroy$.next();    // Emit a value on destroy$ to trigger un-subscribe
		this.destroy$.complete(); // Complete the destroy$ Subject to prevent further emissions
	}

	// Updates the audio state with the provided partial AudioState object.
	private updateAudioState( update: Partial<AudioState> ): void{
		this.audioState$.next( { ...this.audioState$.value, ...update } );
	}

	// Handles errors that occur during audio playback.
	private handleError( error: Error ): void{
		console.error( `Error playing audio for track: ${this.currentTrack?.name}, URL: ${this.currentTrack?.url}`, error );
		this.updateAudioState( { isLoading: false, isReady: false, error } ); // Update the state to reflect the error.
	}

	// Resets the audio state and current track.
	private resetAudio(): void{
		if ( this.audio ) {
			this.audio.pause();      // Pause the audio.
			this.audio.currentTime = 0;  // Reset the current time.
			this.audio.src = '';       // Clear the audio source.
		}
		// Reset the audio state.
		this.audioState$.next( {
			isLoading  : false,
			isReady    : false,
			isPlaying  : false,
			error      : null,
			duration   : 0,
			currentTime: 0,
			volume: this.audioState$.value.volume  // Keep the current volume
		} );
		this.currentTrack = null; // Clear the current track information.
	}
}