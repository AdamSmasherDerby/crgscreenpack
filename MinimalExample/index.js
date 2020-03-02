/*
This is a minimal example to demonstrate writing a custom screen for CRG Scoreboard 
Version 4.

*/

// This causes the "initialize" function to run every time the page is loaded or reloaded.
$(initialize);

function initialize() {
	// These two lines must appear in the initialize function for connections to the 
	// backend to function.
	WS.Connect();
	WS.AutoRegister();
	
	// Listen to the period time value, and execute the function whenever it changes.
	// k is the keyword, in this case "ScoreBoard.Clock(Period).Time"
	// v is the value, in this case the period time in ms.
	WS.Register( "ScoreBoard.Clock(Period).Time", function(k,v) {
		updateClock(v);
	})
	
	// jQuery syntax. Whenever the "Start Jam" button is clicked, execute 
	// the startJam() function.
	$("#startjam").click(function() {
		startJam();
	})
	
	// When the "Timeout" button is clicked, execute the timeout() function
	$("#timeout").click(function() {
		timeout();
	})
	
}

function updateClock(v) {
	// This uses jQuery syntax to set the html value of the element with id "clock" to 
	// value in parenthesis.  V is in milliseconds, so the timeConversions
	// function changes it to human readable form.
	$("#clock").html(_timeConversions.msToMinSec(v));
}

// Whenever this function runs, tell the backend (via WS.Set) to start a jam.
function startJam() {
	WS.Set("ScoreBoard.StartJam", true);
}

// Whenever this function runs, tell the backend to start a timeout.
function timeout() {
	WS.Set("ScoreBoard.Timeout", true);
}