import React, { useContext, useCallback } from "react";
import { useSpotifyObservable } from '../../hooks/useSpotifyObservable';
import { SpotifyServiceContext } from "../../services/SpotifyServiceContext";

import FavoriteIcon from '@mui/icons-material/Favorite';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import PauseCircleFilledIcon from '@mui/icons-material/PauseCircleFilled';

import Header from "../Header";
import SongRow from "../SongRow";

import type { PlayerState, DiscoverWeekly, User, Track } from "../../contracts";

import "./body.styles.css";


interface BodyElement {
	user: User;
	discover_weekly: DiscoverWeekly;
}

function Body( { user, discover_weekly }: BodyElement ){
	const spotifyService = useContext( SpotifyServiceContext );
	const playerState = useSpotifyObservable( service => service.playerState$, {} as PlayerState );

	const { isPlaying } = playerState;

	const handlePlayClick = useCallback(() => {
		console.log('Play button clicked, current isPlaying state:', isPlaying);
		if (isPlaying) {
			spotifyService.togglePlay();
		} else {
			spotifyService.playPlaylist();
		}
	}, [spotifyService, isPlaying]);

	const handleSongClick = useCallback( ( track: Track ) => {
		spotifyService.selectTrack( track );
	}, [ spotifyService ] );

	return (
		<div className="body">
			<Header user={user}/>
			<div className="body_info">
				<img src={discover_weekly?.images?.[0]?.url} alt=""/>
				<div className="body_infoText">
					<strong>Playlist</strong>
					<h2>Discover weekly</h2>
					<p>{discover_weekly?.description}</p>
				</div>
			</div>
			<div className="body_songs">
				<div className="body_icons">
					{isPlaying ? (
						<PauseCircleFilledIcon className="body_shuffle" onClick={handlePlayClick}/>
					) : (
						 <PlayCircleFilledIcon className="body_shuffle" onClick={handlePlayClick}/>
					 )}
					<FavoriteIcon fontSize="large"/>
					<MoreHorizIcon/>
				</div>
				{/* List of songs */}
				{discover_weekly?.tracks?.items
				                .filter( ( item ) => Boolean( item.track.album.id ) )
				                .map( ( item ) => (
					                <SongRow track={item.track} key={item.track.id || item.track.uri}
					                         onClick={() => handleSongClick( item.track )}/>
				                ) )}
			</div>
		</div>
	);
}

export default Body;
