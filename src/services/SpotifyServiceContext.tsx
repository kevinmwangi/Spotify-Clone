import React, { ReactNode } from 'react';
import { spotifyService } from './serviceInitializer';

export const SpotifyServiceContext = React.createContext(spotifyService);

interface SpotifyServiceProviderProps {
	children: ReactNode;
}

export const SpotifyServiceProvider: React.FC<SpotifyServiceProviderProps> = ({ children }) => (
	<SpotifyServiceContext.Provider value={spotifyService}>
		{children}
	</SpotifyServiceContext.Provider>
);