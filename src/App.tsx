import React, { useContext } from "react";
import { Snackbar, Alert } from "@mui/material";
import Player from "./Components/Player";
import { SpotifyServiceContext, SpotifyServiceProvider } from "./services/SpotifyServiceContext";
import { useSpotifyObservable } from "./hooks/useSpotifyObservable";

import { User, DiscoverWeekly, Playlists, AppError } from "./contracts";

import "./App.css";


function AppContent(){
	const spotifyService = useContext(SpotifyServiceContext);
	const user = useSpotifyObservable(service => service.user$, {} as User);
	const discoverWeekly = useSpotifyObservable(service => service.discoverWeekly$, {} as DiscoverWeekly);
	const playlists = useSpotifyObservable(service => service.playlists$, [] as Playlists['items']);
	const error = useSpotifyObservable(service => service.error$, null as AppError | null);

	const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
		if (reason === 'clickaway') return;
		spotifyService.clearError();
	};

	return (
		<div className="app">
			<Player discover_weekly={discoverWeekly} user={user} playlists={playlists}/>
			<Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
				<Alert onClose={handleCloseSnackbar} severity={error?.severity || 'error'} sx={{ width: '100%' }}>
					{error?.message}
				</Alert>
			</Snackbar>
		</div>
	);
}

function App() {
	return (
		<SpotifyServiceProvider>
			<AppContent />
		</SpotifyServiceProvider>
	);
}

export default App;
