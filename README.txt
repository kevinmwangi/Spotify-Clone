# Spotify Code Challenge

## Problem Statement
The goal is to develop the data layer of a _music player application_ so that it **efficiently** responds to user inputs and **dynamically updates** the user interface in real-time based on user commands.
The user interface is prepared for you to be used, all you need to do is inject the data and state management.

This application should propagate information across various components, ensuring that changes (such as play, pause, skip, volume adjustment, track or playlist selection) are immediately reflected in the UI.
This responsiveness is crucial for enhancing the user experience and ensuring seamless interaction with the player.


## The Challenge

Having the User Interface ready to be used, the challenge is to implement the underlying logic that will make the application responsive and interactive.

By using the [mock data](./src/mocks/data.json) available in the source directory, implement the following requirements:

1. Populate `Sidebar's Playlist` with available mock playlists.
2. On playlist selection, populate application `Body` with the selected playlist's info and tracks.
3. On track selection, populate `Footer` with the selected track's info.
4. On footer controls, "play", "pause", "next" and "previous" buttons should be functional, looping through the selected playlist's tracks in order.

### BONUS

* Enable `random` button to shuffle the playlist's tracks.
* Enable `loop` button to start over playlist track when on last track.


## Technical Requirements

* Use the existing UI in the source directory, you don't need to develop new UI components.
* **All** implementations should be correctly typed.
* Application State should be built on [`RxJS`](https://rxjs-dev.firebaseapp.com/guide/overview), which should provide:
  * State management.
  * Data flow.
  * Data manipulation.

> It is expected that your data layer take proper advance of RxJS reactivity and streaming capabilities.
> See the `Resources` section below for useful links to support you on this quest.
> This assessment will be done based on the engineering practices, code quality, and problem solving and abstraction skills. You are not going to be assessed by how the UI looks.


## Resources

* RxJS Docs: https://rxjs-dev.firebaseapp.com/guide/overview
* Learn RxJS: https://www.learnrxjs.io/
 