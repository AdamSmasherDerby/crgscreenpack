$(initialize);

var period = null;
var jam = null;
var jammerList = {};
var starPass = {1: false, 2: false};
var spOffset = {1: 0, 2: 0};
var lead = {1: false, 2: false};
var crgVersion = 3; // Default to 3
var crgMajor = 3; // Default to 3

function initialize() {
	jammerList = {};
	WS.AutoRegister();
	WS.Connect();
	
	// Determine CRG Version

	WS.Register( ['ScoreBoard.Version'], function(k,v) { processVersion(k, v); } ); // Only fires for version 4 and up
	
	// Used to determine number of jams in period 1
	WS.Register(['ScoreBoard.Period(*).CurrentJamNumber']);

	// ==Register channels for CRG > 5.0==

	// Clock Data 
	WS.Register(['ScoreBoard.CurrentGame.Clock(Intermission).Number']);
	WS.Register(['ScoreBoard.CurrentGame.Clock(Intermission).Running']);
	WS.Register( ['ScoreBoard.CurrentGame.Clock(Period).Number' ] );
	WS.Register( ['ScoreBoard.CurrentGame.Clock(Jam).Number' ] );
	WS.Register( ['ScoreBoard.CurrentGame.Clock(Jam).Running']);

	// Jam Data
	WS.Register(['ScoreBoard.CurrentGame.Period(*).Jam(*).TeamJam(*).JamScore']);
	WS.Register(['ScoreBoard.CurrentGame.Period(*).Jam(*).TeamJam(*).StarPass']);
	WS.Register(['ScoreBoard.CurrentGame.Period(*).Jam(*).TeamJam(*).Lead']);
	WS.Register(['ScoreBoard.CurrentGame.Period(*).Jam(*).TeamJam(*).AfterSPScore']);

	// Skater Data
	WS.Register(['ScoreBoard.CurrentGame.Period(*).Jam(*).TeamJam(*).Fielding(Jammer).Skater']);
	WS.Register(['ScoreBoard.CurrentGame.Period(*).Jam(*).TeamJam(*).Fielding(Pivot).Skater']);

	// Team Specific Listeners
	$.each([1, 2], function(idx, t) {

		// When the team name, alternate name, or color changes, update the relevant areas
		WS.Register([ 'ScoreBoard.CurrentGame.Team(' + t + ').Name' ], function(k,v) {
			$('.Team' + t + ' .TeamName').html(v);
		}); 
		WS.Register([ 'ScoreBoard.CurrentGame.Team(' + t + ').AlternateName' ]);
		WS.Register([ 'ScoreBoard.CurrentGame.Team(' + t + ').Color' ], function(k, v) { 
			processScoreboardColors(k,v,t);		
		});

		// Register a listener for skater information. (Where penalties are stored)
		WS.Register( [ 'ScoreBoard.CurrentGame.Team(' + t + ').Skater' ], function(k, v){
			processPenalty(k,v,t);
		} ); 

	});

	// Regenerate the table 1 second and 30 seconds into intermission.
	WS.Register( ['ScoreBoard.CurrentGame.Clock(Intermission).InvertedTime'], function(k,v){
		if (v == 1000 || v == 30000) {
			regenerateTable();
		}
	});

	// Regenerate the table 1 second into each new jam.
	WS.Register( ['ScoreBoard.CurrentGame.Clock(Jam).InvertedTime'], function(k,v) {
		if (v == 1000) {
			regenerateTable();
		}
	})

	// ==Register channels for CRG < 5.0==

	// Clock Data 
	WS.Register(['ScoreBoard.Clock(Intermission).Number']);
	WS.Register(['ScoreBoard.Clock(Intermission).Running']);
	WS.Register( ['ScoreBoard.Clock(Period).Number' ] );
	WS.Register( ['ScoreBoard.Clock(Jam).Number' ] );
	WS.Register( ['ScoreBoard.Clock(Jam).Running']);

	// Jam Data
	WS.Register(['ScoreBoard.Period(*).Jam(*).TeamJam(*).JamScore']);
	WS.Register(['ScoreBoard.Period(*).Jam(*).TeamJam(*).StarPass']);
	WS.Register(['ScoreBoard.Period(*).Jam(*).TeamJam(*).Lead']);
	WS.Register(['ScoreBoard.Period(*).Jam(*).TeamJam(*).AfterSPScore']);
	
	// Skater Data
	WS.Register(['ScoreBoard.Period(*).Jam(*).TeamJam(*).Fielding(Jammer).Skater']);
	WS.Register(['ScoreBoard.Period(*).Jam(*).TeamJam(*).Fielding(Pivot).Skater']);
	
	// Team Specific Listeners
	$.each([1, 2], function(idx, t) {

		// When the team name, alternate name, or color changes, update the relevant areas
		WS.Register([ 'ScoreBoard.Team(' + t + ').Name' ], function(k,v) {
			$('.Team' + t + ' .TeamName').html(v);
		}); 
		WS.Register([ 'ScoreBoard.Team(' + t + ').AlternateName' ]);
		WS.Register([ 'ScoreBoard.Team(' + t + ').Color' ], function(k, v) { 
			processScoreboardColors(k,v,t);		
		});

		// Register a listener for skater information. (Where penalties are stored)
		WS.Register( [ 'ScoreBoard.Team(' + t + ').Skater' ], function(k, v){
			processPenalty(k,v,t);
		} ); 

	});
	

	// Regenerate the table 1 second and 30 seconds into intermission.
	WS.Register( ['ScoreBoard.Clock(Intermission).InvertedTime'], function(k,v){
		if (v == 1000 || v == 30000) {
			regenerateTable();
		}
	});

	// Regenerate the table 1 second into each new jam.
	WS.Register( ['ScoreBoard.Clock(Jam).InvertedTime'], function(k,v) {
		if (v == 1000) {
			regenerateTable();
		}
	})
		
	//Wait for the rest of the data to update, the regenerate the table.
	setTimeout(function() { regenerateTable() } , 500);
	
}

function processVersion(k, v) { // This branch only fires for 4 and up
	crgVersion = WS.state['ScoreBoard.Version(release)'];
	crgMajor = parseInt(crgVersion.match(/v(\d+)/)[1]);
}


function regenerateTable() {
	// Go through game state and regenerate table for jams prior to the current one.
	var prefix = 'ScoreBoard';
	if (crgMajor > 4) { prefix = 'ScoreBoard.CurrentGame'}

	jammerList = {};

	// clear the table
	$.each([1, 2], function(idx, t) {$('.Team' + t + ' tbody').empty();})

	// Add jammers for prior periods
	var currentJam = WS.state[ prefix + '.Clock(Jam).Number'];
	var currentPeriod = WS.state[ prefix + '.Clock(Period).Number'];
	var jamInProgress = WS.state[ prefix + '.Clock(Jam).Running'];
	var gameStarted = (WS.state[ prefix + '.Clock(Intermission).Number'] > 0 ? true : false);
	var intermission = (WS.state[ prefix + '.Clock(Intermission).Running']);
	if (currentPeriod == 2) {
		// If this is the second period, process all the jams for the first period
		var jamsInFirstPeriod = WS.state[ prefix + '.Period(1).CurrentJamNumber'];
		for (j=1; j <= jamsInFirstPeriod; j++) {
			processPriorJam(1, j);
		}
	}
	for (var j = 1; j < currentJam; j++) {
		// Add all the prior jams for the current period
		processPriorJam(currentPeriod, j);
	}
	
	if (intermission) {
		processPriorJam(currentPeriod, jamsInPeriod(currentPeriod));
	}

	if (jamInProgress) {
		$('#statusBox').html("Data for jams up to Period " + currentPeriod + ", Jam " + (parseInt(currentJam) - 1));
	} else if (!gameStarted) {
		$('#statusBox').html('');
	} else {
		$('#statusBox').html("Data for jams up to Period " + currentPeriod + ", Jam " + (parseInt(currentJam)));
	}

}

function processPriorJam(p,j) {
// Given a period and a jam number, add both jammers to the list if they 
// are entered and not in the list.  Also update statistics.  This is for jams prior to
// the current jam
	var jammerId;
	var pivotId = '';
	var prefix;
	var wasSP = false;
	var prefix = '';
	var wasLead = false;
	
	$.each([1, 2], function(idx, t) {

		if (crgMajor < 5) {
			prefix = 'ScoreBoard.Period(' + p + ').Jam(' + j + ').TeamJam(' + t + ')';
		} else {
			prefix = 'ScoreBoard.CurrentGame.Period(' + p + ').Jam(' + j + ').TeamJam(' + t + ')';
		}
		jammerId = WS.state[prefix + '.Fielding(Jammer).Skater'];
		wasSP = WS.state[prefix + '.StarPass'];

		if (jammerId) { 
		// If a jammer was entered, add the jammer to the list and increment their "jams" count
			addJammer(t,jammerId);
			incrementJams(t,jammerId);
			// If the jammer earned lead, increment their "lead" count
			wasLead = WS.state[prefix + '.Lead']
			if (wasLead){
				incrementLead(t,jammerId);
			}
			updateLeadPct(t,jammerId);
			updatePenaltyCount(t, jammerId);
		}
			
		if (wasSP){
			// If there was a star pass, and a pivot was entered, add them to the list.
			pivotId = WS.state[prefix + '.Fielding(Pivot).Skater'];
			if (pivotId){
				addJammer(t,pivotId);
				incrementSP(t,pivotId);
				updatePenaltyCount(t,pivotId);
			}
		} 
		updatePriorScore(t, jammerId, p, j, wasSP, pivotId);
	})
}

function addJammer(t, id) {
// Given a team and Jammer ID, add them to the list if they are not present.

	if (crgMajor < 5) {
		prefix = 'ScoreBoard.Team(' + t + ').Skater(' + id + ')';
	} else {
		prefix = 'ScoreBoard.CurrentGame.Team(' + t + ').Skater(' + id + ')';
	}

	table = $('.Team' + t + ' tbody');
	
	if (!jammerList.hasOwnProperty(id)){
	// If this is a new jammer, add them to the jammer list, and add a row to the display
		jammerList[id] = {
			name: WS.state[prefix + '.Name'],
			number: WS.state[prefix + '.RosterNumber'],
			team: t,
			priorScore: 0,
			priorSPScore: 0,
			currentScore: 0,
			lead: 0,
			cuurentDif: 0,
			priorDif: 0
		}
		table.append(makeJammerRow(id));
		sortTableByNumber('.Team' + t);
	}
}

function makeJammerRow(id) {
	// Given a jammer ID, return a row for the table
	var row = $('<tr>').addClass('Jammer').attr('data-number', jammerList[id].number);
	row.append($('<td>').addClass('Name').html(jammerList[id].name + ' ( ' + jammerList[id].number + ' )'));
	row.append($('<td>').addClass('Jams').html('0'));
	row.append($('<td>').addClass('SP').html('0'));
	row.append($('<td>').addClass('Lead').html('0'));
	row.append($('<td>').addClass('LeadPct').html('0'));
	row.append($('<td>').addClass('Box').html('0'));
	row.append($('<td>').addClass('Pts').html('0 (0)'));
	row.append($('<td>').addClass('Dif').html('0'));
	
	return row;
}

function processPenalty(k,v,t){
	var penaltyRE = /ScoreBoard\.Team\(\d\)\.Skater\((\S+)\)\.Penalty\(\d\).Id/;
	var match = k.match(penaltyRE);
	if (match == null || match.length == 0) { return; }
	var id = match[1];
	
	updatePenaltyCount(t,id);
}

function updatePriorScore(t, jammerId, p, j, wasSP, pivotId){
// Given a skater and a jam, add the score for that jam to that skater's priorScore total
// and update the table.
	var jamScore = 0;
	var jammerScore = 0;
	var pivotScore = 0;
	var jammerCell;
	var pivotCell;
	var difCell;
	
	jamScore = getJamScore(t, p, j);
	if (crgMajor < 5) {
		pivotScore = WS.state['ScoreBoard.Period(' + p + ').Jam(' + j + ').TeamJam(' + t + ').AfterSPScore'];
	} else {
		pivotScore = WS.state['ScoreBoard.CurrentGame.Period(' + p + ').Jam(' + j + ').TeamJam(' + t + ').AfterSPScore'];
	}
	jammerScore = jamScore - pivotScore;

	// Update Jammer Data
	if (jammerId) {
		jammerList[jammerId].priorScore += jammerScore;
		jammerCell = $('.Team' + t + ' tbody tr.Jammer[data-number=' + jammerList[jammerId].number + '] .Pts');	
		jammerCell.html(jammerList[jammerId].priorScore + ' ( ' + jammerList[jammerId].priorSPScore + ' )');
		// Update the score difference column
		difCell = $('.Team' + t + ' tbody tr.Jammer[data-number=' + jammerList[jammerId].number + '] .Dif');
		jammerList[jammerId].priorDif = jammerList[jammerId].priorDif + jamScore - getJamScore(t%2+1,p,j);
		difCell.html(jammerList[jammerId].priorDif);
	}
	
	// Update Pivot in the event there was a star pass
	if (wasSP && pivotId) {
		jammerList[pivotId].priorSPScore += pivotScore;
		pivotCell = $('.Team' + t + ' tbody tr.Jammer[data-number=' + jammerList[pivotId].number + '] .Pts');
		pivotCell.html(jammerList[pivotId].priorScore + ' ( ' + jammerList[pivotId].priorSPScore + ' )');
	}
	
}

function getJamScore(t, p, j){
	if (crgMajor < 5) {
		return WS.state['ScoreBoard.Period(' + p + ').Jam(' + j + ').TeamJam(' + t + ').JamScore'];
	} else {
		return WS.state['ScoreBoard.CurrentGame.Period(' + p + ').Jam(' + j + ').TeamJam(' + t + ').JamScore'];
	}
}

function incrementJams(t, id) {
	// Given a team and a jammer ID, add one to their "jams" count
	var jamsCell = $('.Team' + t + ' tbody tr.Jammer[data-number=' + jammerList[id].number + '] .Jams');
	var jams = parseInt(jamsCell.html()) + 1;
	jamsCell.html(jams);
}

function incrementSP(t, id) {
	// given a team and a pivot ID, add one to their "Took SP" count
	var spCell = $('.Team' + t + ' tbody tr.Jammer[data-number=' + jammerList[id].number + '] .SP');
	var sp = parseInt(spCell.html()) + 1;
	spCell.html(sp);
}

function incrementLead(t, id) {
	// Given a team and a jammer ID, add one to their "lead" count
	var leadCell = $('.Team' + t + ' tbody tr.Jammer[data-number=' + jammerList[id].number + '] .Lead');
	jammerList[id].lead += 1;
	leadCell.html(jammerList[id].lead);
}

function updateLeadPct(t, id) {
// Given a team and a jammer ID, update the lead percentage based on the current content of the table
	//var leadCell = $('.Team' + t + ' tbody tr.Jammer[data-number=' + jammerList[id].number + '] .Lead');
	var jamsCell = $('.Team' + t + ' tbody tr.Jammer[data-number=' + jammerList[id].number + '] .Jams');
	var leadPctCell = $('.Team' + t + ' tbody tr.Jammer[data-number=' + jammerList[id].number + '] .LeadPct');
	var leadCount = jammerList[id].lead;
	var jamsCount = parseInt(jamsCell.html());
	var leadPct = 0;
	if (jamsCount > 0 && leadCount > 0){
		leadPct = 100 * leadCount / jamsCount;
	}
	leadPctCell.html(leadPct.toFixed(0));
}

function updatePenaltyCount(t,id) {
	if (id == undefined || !jammerList.hasOwnProperty(id)) { return; }

	var penaltyCell = $('.Team' + t + ' tbody tr.Jammer[data-number=' + 
			jammerList[id].number + '] .Box');
	penaltyCell.html(nPenalties(t,id));
}


function jamsInPeriod(p) {
// return the number of jams in period p
	var maxJams = 100 // This is absurdly high.
	if (crgMajor < 5) {
		for (var j = 1; j < maxJams; j++){
			if (WS.state['Game.Period('+ p +').Jam(' + j + ').JamLength'] == undefined){
				return j-1;
			}
		}
	} else {
		for (var j = 1; j < maxJams; j++){
			if (WS.state['ScoreBoard.CurrentGame.Period('+ p +').Jam(' + j + ').Duration'] == undefined){
				return j-1;
			}
		}
	}
}

function processScoreboardColors(k, v, t){
// Given a change in overlay color, update the screen
	var prefix = 'ScoreBoard';
	if (crgMajor > 4) { prefix = 'ScoreBoard.CurrentGame'}

	var overlayFg = WS.state[prefix + 'Team(' + t + ').Color(overlay_fg)'];
	var overlayBg = WS.state[prefix + 'Team(' + t + ').Color(overlay_bg)'];

	if (overlayFg == null) { overlayFg == 'white'; }
	if (overlayBg == null) { overlayBg == 'black'; }

	$('.Team' + t + ' .TeamName').css('color', overlayFg); 
	$('.Team' + t + ' .TeamName').css('background-color', overlayBg);
}

function nPenalties(t, id) {
// Given a team and skater ID, get the number of penalties presently in the state.
	var prefix = 'ScoreBoard.Team(' + t + ').Skater(' + id + ').Penalty(';
	if (crgMajor > 4) {
		prefix = 'ScoreBoard.CurrentGame.Team(' + t + ').Skater(' + id + ').Penalty(';
	}
	var nPenalties = 0;
	var code = '';
	
	for (var n=1; n < 10; n++){
		code = WS.state[prefix + n + ').Code']
		if (code == undefined){
			return nPenalties;
		} else if (code != 'FO_EXP'){
			nPenalties += 1
		}
	}
	
	return nPenalties;
}


function sortTableByNumber(tableName) {
    var row, rowNumber;
    var comparisonRow, comparisonNumber;

    $(tableName + " tr.Jammer").each(function(i) {
        row = $(tableName + " tr.Jammer:eq(" + i + ")");
        rowNumber = row.attr('data-number');

        $(tableName + " tr.Jammer").each(function(j) {
            comparisonRow = $(tableName + " tr.Jammer:eq(" + j + ")");
            comparisonNumber = comparisonRow.attr('data-number');

            if ( rowNumber < comparisonNumber ) {
                $(row).insertBefore(comparisonRow);
                return false;
            }
        });
    });
};


function updateLeadPcts(tableName) {
	var row;
	var leadCell, jamsCell, leadPctCell;
	var leadCount, jamsCount;
	var leadPct;
	
	$(tableName + " tr.Jammer").each(function(i) {
		leadPct = 0;
		row = tableName + " tr.Jammer:eq(" + i + ")";
		leadCell = $(row + " td.Lead");
		jamsCell = $(row + " td.Jams");
		leadPctCell = $(row + " td.LeadPct");
		leadCount = parseInt(leadCell.html());
		jamsCount = parseInt(jamsCell.html());
		if (jamsCount > 0 && leadCount > 0){
			leadPct = 100 * leadCount / jamsCount;
		}
		leadPctCell.html(leadPct.toFixed(0));
	})
}



