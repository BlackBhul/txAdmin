import React, { useState } from "react";
import { txAdminMenuPage, usePageContext } from "../provider/PageProvider";
import { Collapse, List } from "@material-ui/core";
import { MenuListItem } from "./MenuListItem";
import {
  AccessibilityNew,
  Announcement,
  Build,
  DirectionsCar,
  LocalHospital,
  LocationSearching,
} from "@material-ui/icons";
import { useArrowKeys } from "../hooks/useArrowKeys";
import { useDialogContext } from "../provider/DialogProvider";
import { fetchNui } from "../utils/fetchNui";
import { useSnackbarContext } from "../provider/SnackbarProvider";

export const MainPageList: React.FC = () => {
  const { openDialog } = useDialogContext();

  const { openSnackbar } = useSnackbarContext();

  const [curSelected, setCurSelected] = useState(0);

  const { page } = usePageContext();

  const handleArrowDown = () => {
    if (curSelected <= 4) setCurSelected(curSelected + 1);
  };
  const handleArrowUp = () => {
    if (curSelected > 0) setCurSelected(curSelected - 1);
  };

  useArrowKeys({
    onDownDown: handleArrowDown,
    onUpDown: handleArrowUp,
  });

  const handleAnnounceMessage = () => {
    openDialog({
      description: "Send an announcement to all online players",
      title: "Send Announcement",
      placeholder: "Your announcement...",
      onSubmit: (message: string) => {
        // Post up to client with announcement message
        openSnackbar("success", "Sending the announcement");
        fetchNui("announceMessage", message);
      },
    });
  };

  return (
    <Collapse in={page === txAdminMenuPage.Main} mountOnEnter unmountOnExit>
      <List>
        <MenuListItem
          selected={curSelected === 0}
          icon={<LocationSearching />}
          primary="Teleport"
          secondary="Teleport with context"
          onSelect={() => console.log("Teleport Clicked")}
        />
        <MenuListItem
          selected={curSelected === 1}
          icon={<AccessibilityNew />}
          primary="Player Mode"
          secondary="Current: NoClip"
          onSelect={() => console.log("Player Mode Clicked")}
        />
        <MenuListItem
          selected={curSelected === 2}
          icon={<DirectionsCar />}
          primary="Spawn Vehicle"
          secondary="Uses model name"
          onSelect={() => console.log("Spawn Vehicle Clicked")}
        />
        <MenuListItem
          selected={curSelected === 3}
          icon={<Build />}
          primary="Fix Vehicle"
          secondary="Set current vehicle health to 100%"
          onSelect={() => console.log("Fix Vehicle Clicked")}
        />
        <MenuListItem
          selected={curSelected === 4}
          icon={<LocalHospital />}
          primary="Heal All Players"
          secondary="Will heal all players to full health"
          onSelect={() => console.log("Heal All Clicked")}
        />
        <MenuListItem
          selected={curSelected === 5}
          icon={<Announcement />}
          primary="Send Announcement"
          secondary="Announce a message"
          onSelect={handleAnnounceMessage}
        />
      </List>
    </Collapse>
  );
};