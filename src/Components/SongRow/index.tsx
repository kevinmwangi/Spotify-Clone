import React from "react";
import type { Track } from "../../contracts";

import "./songRow.styles.css";


interface SongRowProps {
	track: Track;
	onClick: () => void;
}

function SongRow( { track, onClick }: SongRowProps ){
	return (
		<div className="songRow" onClick={onClick}>
			<img
				className="songRow_album"
				src={track.album.images[0].url}
				alt={track.name}
			/>
			<div className="songRow_info">
				<h1>{track.name}</h1>
				<p>
					{track.artists.map( ( artist ) => artist.name ).join( ", " )}
					{track.album.name}
				</p>
			</div>
		</div>
	);
}

export default SongRow;
