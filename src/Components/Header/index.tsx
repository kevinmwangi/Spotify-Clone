import React from "react";
import SearchIcon from "@mui/icons-material/Search";
import { Avatar } from "@mui/material";

import type { User} from "../../contracts";

import "./header.styles.css";

interface HeaderElement {
  user:User;
}

function Header({ user }: HeaderElement ) {
  return (
    <div className="header">
      <div className="header_left">
        <SearchIcon />
        <input
          placeholder="Search for Artists, Songs or Podcasts"
          type="text"
        />
      </div>
      <div className="header_right">
        <Avatar src={user?.images?.[0]?.url} alt={user?.display_name} />
        <h4>{user?.display_name}</h4>
      </div>
    </div>
  );
}

export default Header;
