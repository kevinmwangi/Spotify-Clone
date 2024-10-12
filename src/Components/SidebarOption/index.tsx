import React from 'react'
import type { OverridableComponent } from "@mui/material/OverridableComponent";
import type { SvgIconTypeMap, } from "@mui/material/SvgIcon/SvgIcon";

import './sidebarOption.styles.css'

interface SidebarOptionElement {
    title: string;
    Icon?: OverridableComponent<SvgIconTypeMap>;
}

function SidebarOption({ title, Icon }: SidebarOptionElement) {
    return (
        <div className='sidebarOption'>
            {Icon && <Icon className='sidebarOption_icon' />}
            {Icon ? <h4>{title}</h4> : <p>{title}</p>}
        </div>
    )
}

export default SidebarOption
