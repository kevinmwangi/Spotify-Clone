import React from "react";
import HomeIcon from "@mui/icons-material/Home";
import SearchIcon from "@mui/icons-material/Search";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";

import SidebarOption from "../SidebarOption";

import "./sidebar.styles.css";
import type { Playlists } from "../../contracts";

interface SidebarElement {
  playlists: Playlists['items'];
}

function Sidebar({ playlists }: SidebarElement) {

  return (
    <div className="sidebar">
      <img
        className="sidebar_logo"
        src="https://getheavy.com/wp-content/uploads/2019/12/spotify2019-830x350.jpg"
        alt="Spotify Logo"
      />
      <SidebarOption Icon={HomeIcon} title="Home" />
      <SidebarOption Icon={SearchIcon} title="Search" />
      <SidebarOption Icon={LibraryMusicIcon} title="Your Library" />
      <br />
      <strong className="sidebar_title">PLAYLISTS</strong>
      <hr />
      {playlists?.map((playlist) => (
        <SidebarOption key={playlist.name} title={playlist.name} />
      ))}
    </div>
  );
}

export default Sidebar;
