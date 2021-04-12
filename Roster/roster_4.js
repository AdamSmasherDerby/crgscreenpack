$(initialize);

var penaltyEditor = null;
var period = null;
var jam = null;
var teamId = null;
var skaterId = null;
var penaltyId = null;
var fo_exp = null;

function initialize() {
	WS.Connect();
	WS.AutoRegister();
	
	$("#mainDiv").css({ "position": "fixed" });
	var aspect16x9 = get16x9Dimensions();
	$("#mainDiv").css(aspect16x9).css("fontSize", aspect16x9.height);

	$.each([1, 2], function(idx, t) {
		WS.Register([ 'ScoreBoard.Team(' + t + ').Name' ]); 
		WS.Register([ 'ScoreBoard.Team(' + t + ').AlternateName' ]);
		WS.Register([ 'ScoreBoard.Team(' + t + ').Color' ], function(k, v) { 
			updateColors(t);
		});
	});

        WS.Register( [ 'ScoreBoard.Team(1).Logo' ], function(k, v) { $('.Logo1').attr('src', v); } );
        WS.Register( [ 'ScoreBoard.Team(2).Logo' ], function(k, v) { $('.Logo2').attr('src', v); } );

	WS.Register( [ 'ScoreBoard.Team(1).Skater' ], function(k, v) { skaterUpdate(1, k, v); } ); 
	WS.Register( [ 'ScoreBoard.Team(2).Skater' ], function(k, v) { skaterUpdate(2, k, v); } ); 

}

function updateColors(t) {
	$('.Team' + t + 'custColor').css('color', WS.state['ScoreBoard.Team(' + t + ').Color(overlay_fg)']); 
	$('.Team' + t + 'custColor').css('background-color', WS.state['ScoreBoard.Team(' + t + ').Color(overlay_bg)']); 
	$('#head' + t).css('background-color', WS.state['ScoreBoard.Team(' + t + ').Color(overlay_bg)']); 
}

var skaterIdRegex = /Skater\(([^\)]+)\)/;
var penaltyRegex = /Penalty\(([^\)]+)\)/;
function skaterUpdate(t, k, v) { 
	match = k.match(skaterIdRegex); 
	if (match == null || match.length == 0)
		return;
	var id = match[1]; 
	var prefix = 'ScoreBoard.Team(' + t + ').Skater(' + id + ')';  
	if (k == prefix + '.RosterNumber') { 
		var rowd = $('.Teamd' + t + ' .Skater.Penalty[id=' + id + ']');
		if (v == null) { 
			$('.Teamd' + t + ' .Skater[id=' + id + ']').remove();
			return;
		}

		if (rowd.length == 0) { 
			rowd = makeSkaterRows(t, id, v); 
		}

	} 
}



function makeSkaterRows(t, id, number) { 
	var team = $('.Team' + t + ' tbody'); 
	var teamd = $('.Teamd' + t); 
	var pd = $('<div class="tdivr">').addClass('Skater Penalty').attr('id', id).data('number', number);
	var head = document.getElementById('head' + t);
	var teamName = WS.state['ScoreBoard.Team(' + t + ').Name'];
	var teamFColor = WS.state['ScoreBoard.Team(' + t + ').Color(overlay_fg)'];
	var teamBColor = WS.state['ScoreBoard.Team(' + t + ').Color(overlay_bg)'];
	
	if (WS.state['ScoreBoard.Team(' + t + ').AlternateName(whiteboard)'] != null) {
		teamName = WS.state['ScoreBoard.Team(' + t + ').AlternateName(whiteboard)']
	}

    $('.Team' + t + 'custColor').css('color', teamFColor);
    $('.Team' + t + 'custColor').css('background-color', teamBColor);
	
	pd.append($('<div width=20%>').addClass('Number').text(number));
	pd.append($('<div width=70%>').addClass('Name').text(WS.state['ScoreBoard.Team(' + t + ').Skater(' + id + ').Name']));
	pd.addClass('Team'+t+'custColor');

	var inserted = false;
	teamd.find('div.Penalty').each(function (idx, row) {
		row = $(row);
		if (row.data('number') > number) {
			row.before(pd);
			inserted = true;
			return false;
		}
	});
	if (!inserted) {
		teamd.append(pd);
	}
	updateColors(t);
}

function getAspectDimensions(aspect, overflow) {
		var width, height, top, bottom, left, right;
		if ((aspect > ($(window).width()/$(window).height())) == (overflow==true)) {
			width = Math.round((aspect * $(window).height()));
			height = $(window).height();
			top = bottom = 0;
			left = right = (($(window).width() - width) / 2);
		} else {
			width = $(window).width();
			height = Math.round(($(window).width() / aspect));
			top = bottom = (($(window).height() - height) / 2);
			left = right = 0;
		}
		return { width: width, height: height, top: top, bottom: bottom, left: left, right: right };
	}

function get16x9Dimensions(overflow) {
	return this.getAspectDimensions(16/9, overflow); 
}

// Audio Video Source
var av = {
        videoElement: null,
        audioSource: '',
        videoSource: '',

        gotSources: function (sourceInfos) {
                                console.log('Did we make it here? 2');
                for (var i = 0; i !== sourceInfos.length; ++i) {
                        var sourceInfo = sourceInfos[i];
                        console.log(sourceInfo);
                        if (sourceInfo.kind === 'audio' && av.audioSource == "") {
                                av.audioSource = sourceInfo.id;
                        } else if (sourceInfo.kind === 'video' && ( i == 2 ) ) {
                                av.videoSource = sourceInfo.id;
                                console.log('Selecting 2nd camera');
                        } else {
                                console.log('Some other kind of source: ', sourceInfo);
                        }
                }
                av.start();
        },

        initialize: function() {
                // if (typeof MediaStreamTrack === 'undefined'){
                if (typeof navigator.mediaDevices === 'undefined'){
                        alert('This browser does not support navigator.mediaDevices.\n\nTry Chrome Canary.');
                } else {
                        //MediaStreamTrack.getSources(av.gotSources);
                        navigator.mediaDevices.enumerateDevices()
                        .then(av.gotSources);
                        // av.start();
                }
        },

        successCallback: function(stream) {
                window.stream = stream; // make stream available to console

                if (av.videoElement == null) {
                        av.videoElement = document.createElement("video");
                        av.videoElement.className = 'video_underlay';
                        document.body.appendChild(av.videoElement);
                }

                av.videoElement.src = window.URL.createObjectURL(stream);
                av.videoElement.play();
                $(document.body).addClass("HasUnderlay");
        },

        errorCallback: function(error) {
                console.log('navigator.getUserMedia error: ', error);
        },

        start: function() {
                if (!!window.stream) {
                        videoElement.src = null;
                        window.stream.stop();
                }
                var constraints = {
                        audio: {
                                optional: [{sourceId: av.audioSource}]
                        },
                        video: {
                                optional: [{sourceId: av.videoSource}]
                        },
                        width: {min: 640, ideal: window.innerWidth},
                        height: {min: 480, ideal: window.innerHeight},
                        aspectRatio: 1.5,
                };
                console.log(constraints);
                console.log(window);

                var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                navigator.webkitGetUserMedia(constraints, av.successCallback, av.errorCallback);
        }
}


