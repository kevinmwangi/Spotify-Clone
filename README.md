# Spotify Clone - Data Layer Challenge

This project implements the data layer for a simplified Spotify clone using React and RxJS. It focuses on state management, data flow, and data manipulation to create a responsive and interactive music player experience.

## Installation and Running the Application

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kevinmwangi/Spotify-Clone.git
   ```

2. **Navigate to the project directory:**
   ```bash
   cd spotify-clone-data-layer
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

   This will open the application in your default browser, usually at `http://localhost:3000`.

## Key Services, Hooks, and Utility Functions

### `SpotifyService` (src/services/SpotifyService.ts)

- **Purpose:** Manages the application state and handles user actions related to music playback, playlist selection, shuffle, loop, and error handling.
- **Key Features:**
  - Uses RxJS `BehaviorSubject` to store and manage the application state.
  - Provides observables for different parts of the state (user, playlists, current track, playback status, etc.).
  - Implements methods to trigger actions like playing a playlist, selecting a track, toggling play/pause, navigating tracks, shuffling, looping, and handling errors.

### `useSpotifyObservable` (src/hooks/useSpotifyObservable.ts)

- **Purpose:** A custom React hook that simplifies subscribing to observables from the `SpotifyService`.
- **Usage:**
    ```typescript
    const user = useSpotifyObservable(service => service.user$, {} as User);
    ```
  This subscribes to the `user$` observable from the `SpotifyService` and returns the current user data.

### `createShuffledIndices` (src/utils/seededRandom.ts)

- **Purpose:** Generates an array of shuffled indices based on a seed value. This is used for implementing the shuffle functionality.
- **Usage:**
    ```typescript
    const shuffledIndices = createShuffledIndices(tracks.length, 'someSeed');
    ```
  This creates an array of shuffled indices for an array of `tracks`, ensuring consistent shuffling based on the provided seed.

## Project Structure

- **src/Components:** Contains React components for the user interface.
- **src/services:** Contains the `SpotifyService` class and the `SpotifyServiceContext` for providing the service to components.
- **src/hooks:** Contains the `useSpotifyObservable` hook.
- **src/utils:** Contains utility functions like `createShuffledIndices` and type guards.
- **src/mocks:** Contains mock data used for the application.
- **src/contracts:** Contains TypeScript interfaces for data types.

## Additional Notes

- The application uses mock data from `src/mocks/data.json`.
- Error handling is implemented using an RxJS `Subject` and displayed using a Snackbar.
- The project is fully typed using TypeScript.