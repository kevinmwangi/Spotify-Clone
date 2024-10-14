import React, { useRef, useState, useCallback, useEffect, useContext } from "react";
import { useSpotifyObservable } from '../../hooks/useSpotifyObservable';
import { SpotifyServiceContext } from "../../services/SpotifyServiceContext";

import { AudioService } from "../../services/AudioService";
import { AudioState, Track } from '../../contracts';

import { getFormattedTrackName } from '../../utils/trackNameUtils';

import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import RepeatIcon from "@mui/icons-material/Repeat";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import { Slider, Box, CircularProgress, styled, Typography } from "@mui/material";
import Grid from '@mui/material/Grid2';

import "./footer.styles.css";


const TinyText = styled( Typography )( {
	fontSize     : '0.75rem',
	fontWeight   : 500,
	letterSpacing: 0.2,
	color        : '#FFFFFF',
} );

function Footer(){
	const spotifyService = useContext( SpotifyServiceContext );
	const currentTrack = useSpotifyObservable( service => service.currentTrack$, null );
	const playerState = useSpotifyObservable( service => service.playerState$, null );
	const volume = useSpotifyObservable( service => service.volume$, 30 );
	const formattedTrackName = useSpotifyObservable( service =>
		service.currentTrack$.pipe( getFormattedTrackName ), '' );

	const audioServiceRef = useRef<AudioService | null>( null );
	const [ audioState, setAudioState ] = useState<AudioState>( {
		isLoading  : false,
		isReady    : false,
		isPlaying  : false,
		duration   : 0,
		currentTime: 0,
		volume     : 30,
		error      : null,
	} );

	// Using optional chaining to safely access playerState properties
	const isPlaying = playerState?.isPlaying ?? false;
	const isShuffled = playerState?.isShuffled ?? false;
	const isLooped = playerState?.isLooped ?? false;

	const handleTrackEnd = useCallback( () => {
		spotifyService.onTrackEnd();
	}, [ spotifyService ] );

	const handleNextTrack = useCallback( () => {
		if ( audioServiceRef.current ) {
			audioServiceRef.current.pause();
		}
		spotifyService.nextTrack().subscribe( {
			next : ( track: Track | null ) => {
				if ( track && audioServiceRef.current ) {
					audioServiceRef.current.setupAudio( {
						name: track.name,
						url : track.preview_url!,
					}, volume ).subscribe( {
						next : () => {
							if ( isPlaying ) {
								audioServiceRef.current?.play().subscribe( {
									error: ( error: Error ) => console.error( 'Error playing next track:', error ),
								} );
							}
						},
						error: ( error: Error ) => console.error( 'Error setting up next track:', error ),
					} );
				} else {
					console.warn( 'No more playable tracks' );
				}
			},
			error: ( error: Error ) => {
				console.error( 'Error changing to next track:', error );
			},
		} );
	}, [ spotifyService, isPlaying ] );

	const handlePreviousTrack = useCallback( () => {
		if ( audioServiceRef.current ) {
			audioServiceRef.current.pause();
		}
		spotifyService.previousTrack().subscribe( {
			next : ( track: Track | null ) => {
				if ( track && audioServiceRef.current ) {
					audioServiceRef.current.setupAudio( {
						name: track.name,
						url : track.preview_url!,
					}, volume ).subscribe( {
						next : () => {
							if ( isPlaying ) {
								audioServiceRef.current?.play().subscribe( {
									error: ( error: Error ) => console.error( 'Error playing previous track:', error ),
								} );
							}
						},
						error: ( error: Error ) => console.error( 'Error setting up previous track:', error ),
					} );
				} else {
					console.warn( 'No previous playable tracks' );
				}
			},
			error: ( error: Error ) => {
				console.error( 'Error changing to previous track:', error );
			},
		} );
	}, [ spotifyService, isPlaying ] );

	useEffect( () => {
		if ( !audioServiceRef.current ) {
			audioServiceRef.current = new AudioService( handleTrackEnd );
		}

		const audioStateSubscription = audioServiceRef.current.getAudioState().subscribe( setAudioState );
		const playStateSubscription = spotifyService.getPlayStateChanged().subscribe( ( isPlaying ) => {
			if ( isPlaying && audioServiceRef.current ) {
				audioServiceRef.current.play().subscribe( {
					error: ( error: Error ) => console.error( 'Error playing track:', error ),
				} );
			} else if ( audioServiceRef.current ) {
				audioServiceRef.current.pause();
			}
		} );

		return () => {
			audioStateSubscription.unsubscribe();
			playStateSubscription.unsubscribe();
			audioServiceRef.current?.destroy();
		};
	}, [ spotifyService, handleTrackEnd ] );

	useEffect(() => {
		if (currentTrack && currentTrack.preview_url && audioServiceRef.current) {
			audioServiceRef.current.setupAudio({
				name: currentTrack.name,
				url: currentTrack.preview_url,
			}, volume).subscribe({
				next: () => {
					if (isPlaying) {
						audioServiceRef.current?.play().subscribe({
							next: () => console.log('Track started playing'),
							error: (error: Error) => console.error('Error playing track:', error)
						});
					}
				},
				error: (error: Error) => console.error('Error setting up audio:', error)
			});
		} else if (currentTrack && !currentTrack.preview_url) {
			console.warn(`No preview URL available for track: ${currentTrack.name}`);
			handleNextTrack();
		}
	}, [currentTrack, isPlaying, handleNextTrack]);

	useEffect( () => {
		if ( audioServiceRef.current ) {
			if ( isPlaying && audioState.isReady ) {
				audioServiceRef.current.play();
			} else {
				audioServiceRef.current.pause();
			}
		}
	}, [ isPlaying, audioState.isReady ] );

	useEffect( () => {
		if ( audioServiceRef.current ) {
			audioServiceRef.current.setVolume( volume );
		}
	}, [ volume ] );

	useEffect( () => {
		if ( audioState.error ) {
			console.error( 'Audio error:', audioState.error );
			spotifyService.nextTrack().subscribe( {
				error: ( error: Error ) => {
					console.error( 'Error moving to next track after audio error:', error );
					spotifyService.togglePlay(); // Stop playback if there's an error
				},
			} );
		}
	}, [ audioState.error, spotifyService ] );

	const handlePlayPause = () => {
		if ( audioServiceRef.current ) {
			if ( isPlaying ) {
				audioServiceRef.current.pause();
			} else {
				audioServiceRef.current.play().subscribe( {
					error: ( error: Error ) => console.error( 'Error playing track:', error ),
				} );
			}
		}
		spotifyService.togglePlay();
	};

	const handleSeek = ( _event: Event, newValue: number | number[] ) => {
		if ( audioServiceRef.current ) {
			audioServiceRef.current.seekTo( newValue as number );
		}
	};

	const formatTime = ( time: number ) => {
		const minutes = Math.floor( time / 60 );
		const seconds = Math.floor( time % 60 );
		return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
	};

	const handleVolumeChange = ( _event: Event, newValue: number | number[] ) => {
		const newVolume = newValue as number;
		if ( audioServiceRef.current ) {
			audioServiceRef.current.setVolume( newVolume );
		}
		spotifyService.setVolume( newVolume ); // This updates the SpotifyService state and localStorage
	};

	return (
		<div className="footer">
			<div className="footer_body">
				<div className="footer_left">
					{
						audioState.isLoading ? (
							<CircularProgress size={38}/>
						) : (
							currentTrack && currentTrack.album && currentTrack.album.images && currentTrack.album.images.length > 0 && (
								<>
									<img
										className="footer_albumLogo"
										src={currentTrack.album.images[0].url}
										alt=""
									/>
									<div className="footer_songInfo">
										<h1>{formattedTrackName}</h1>
										<p>{currentTrack.artists.map( artist => artist.name ).join( ", " )}</p>
									</div>
								</>
							)
						)
					}
				</div>

				<div className="footer_center">
					<Box sx={{ display: "flex", flexGrow: 1, flexDirection: "column", gap: 1, alignItems: "center" }}>
						<div className="player_controls">
							<ShuffleIcon
								className={`footer_icon ${isShuffled ? "footer_green" : ""}`}
								onClick={() => spotifyService.toggleShuffle()}
							/>
							<SkipPreviousIcon
								className="footer_icon"
								onClick={handlePreviousTrack}
							/>
							{audioState.isPlaying ? (
								<PauseCircleOutlineIcon
									fontSize="large"
									className="footer_icon"
									onClick={handlePlayPause}
								/>
							) : (
								 <PlayCircleOutlineIcon
									 fontSize="large"
									 className="footer_icon"
									 onClick={handlePlayPause}
								 />
							 )}
							<SkipNextIcon
								className="footer_icon"
								onClick={handleNextTrack}
							/>
							<RepeatIcon
								className={`footer_icon ${isLooped ? "footer_green" : ""}`}
								onClick={() => spotifyService.toggleLoop()}
							/>
						</div>
						<div className="footer_progress">
							<Slider
								aria-label="rack progress"
								size="small"
								value={audioState.currentTime}
								min={0}
								max={audioState.duration}
								onChange={handleSeek}
								sx={() => ( {
									color               : 'rgba(0,128,0,0.87)',
									height              : 4,
									'& .MuiSlider-thumb': {
										width                        : 8,
										height                       : 8,
										transition                   : '0.3s cubic-bezier(.47,1.64,.41,.8)',
										'&::before'                  : {
											boxShadow: '0 2px 12px 0 rgba(0 128 0,0.4)',
										},
										'&:hover, &.Mui-focusVisible': {
											boxShadow: `0px 0px 0px 8px ${'rgb(0 128 0 / 16%)'}`,
										},
										'&.Mui-active'               : {
											width : 20,
											height: 20,
										},
									},
									'& .MuiSlider-rail' : {
										opacity: 0.28,
									},
								} )}
							/>

							<Box sx={{
								display       : 'flex',
								alignItems    : 'center',
								flexDirection : 'row',
								justifyContent: 'space-between',
								width         : '100%',
								mt            : -2,
							}}>
								<TinyText>{formatTime( audioState.currentTime )}</TinyText>
								<TinyText>{formatTime( audioState.duration )}</TinyText>
							</Box>
						</div>
					</Box>
				</div>

				<div className="footer_right">
					<Box sx={{ flexGrow: 1 }}>
						<Grid container spacing={2} alignItems="center">
							<Grid>
								<PlaylistPlayIcon/>
							</Grid>
							<Grid>
								<VolumeDownIcon/>
							</Grid>
							<Grid size="grow">
								<Slider
									size="small"
									aria-label="Volume"
									value={volume}
									onChange={handleVolumeChange}
									min={0}
									max={100}
									step={1}
								/>
							</Grid>
						</Grid>
					</Box>
				</div>
			</div>
		</div>
	);
}

export default Footer;
