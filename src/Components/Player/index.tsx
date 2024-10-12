import React from "react";

import Sidebar from "../Sidebar";
import Body from "../Body";
import Footer from "../Footer";
import type { DiscoverWeekly, Playlists, User } from "../../contracts";

import "./player.styles.css";

interface PlayerElement {
  user:User;
  discover_weekly: DiscoverWeekly;
  playlists: Playlists['items'];
}

function Player({ user, discover_weekly, playlists }: PlayerElement) {
  return (
    <div data-testid="player-component" className="player">
      <div className="player_body">
        <Sidebar playlists={playlists} />
        <Body user={user} discover_weekly={discover_weekly} />
      </div>
      <Footer />
    </div>
  );
}

export default Player;
