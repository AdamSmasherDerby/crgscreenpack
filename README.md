# CRG Screen Pack

This is a set of screens for use with CRG Scoreboard version 4.0 and above.  To use these screens, put whichever files you wish to use into the "html/custom" directory of your scoreboard installation.  When you run the scoreboard, there is a menu item titled "custom screens".  Use that to navigate to the directory, and them select the file ending in \*.html for the screen you wish to use.

Note that all of these screens are only as accurate as the data entered: displaying the penalty screens without someone entering penalties is likely not going to have a useful effect.

For broadcast purposes, it may be necessary to edit the relevant \*.css file to match the chromakey or overlay software in use.

It is important to test the choices of colors you set to ensure they are sufficiently high contrast to be visible.  Setting a team's foreground color to white, and the background to yellow, may match their jersey's, but you won't be able to read it. (The "overlay" color option is used for each of these screens.)

## Jammer Stats

This screen shows various statistics for the jammers, including points scored, box trips, and star passes.  There are two sizes:

jammerstats.html is intended for announcers, and will resize to include all data.

jamstatsbig.html is intended for broadcast.  The text is bigger, but may not show everything if a team fields eight jammers in one game.

## Broadcast Penalties

This is an update of the TCRD penalty screen developed by Jon Fox for version 4.0 of CRG.  It shows team logos and penalties, along with a total count.

## Roster

This screen only shows the rosters and team logos.

If you have any questions, feature requests, or suggestions for other screens, please feel free to submit an issue.

## Roboto

This is a publicly licensed font which is used for most of the screens. This folder should be in the same directory as the _folders_ containing the other screens.
