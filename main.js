const mpd = require('mpd');
const discord = require('discord.io');

const settings = require('./settings.json');

var mpd_client = mpd.connect({
	port: settings.mpd.port,
	host: settings.mpd.address
});

var discord_client = new discord.Client({
	autorun: true,
	token: settings.discord.token
});

mpd_client.on('ready', function() {
	console.log("MPD connected");
});

var last_update = 0;
mpd_client.on('system-player', function() {
	if(Date.now() > (last_update + (settings.update_timeout*1000))) {
		updatePlayingStatus();
		last_update = Date.now();
	}
});

function parseSongData(data) {
	var t = "";

	if(data) {
		var t = settings.format;
		t = t.replace("%title%", data.Title);
		t = t.replace("%artist%", data.Artist);
		t = t.replace("%album%", data.Album);
		t = t.replace("%genre%", data.Genre);
	}

	return t.replace("[", "(").replace("]", ")");
}

function fetchCurrentSong(callback) {
	mpd_client.sendCommand(mpd.cmd("currentsong", []), function(err, msg) {
		if(err) {
			throw err;
		}
		
		callback(mpd.parseKeyValueMessage(msg));
	});
}

function fetchStatus(callback) {
	mpd_client.sendCommand(mpd.cmd("status", []), function(err, msg) {
		if(err) {
			throw err;
		}
		
		callback(mpd.parseKeyValueMessage(msg));
	});
}

function updatePlayingStatus() {
	fetchCurrentSong(function(song_data) {
		fetchStatus(function(status_data) {
			var parsed = "";
			if(status_data.state == "play") {
				parsed = parseSongData(song_data);
			}

			discord_client.setPresence({
				idle_since: null,
				game: {
					name: parsed
				}
			});

			console.log("Updated presence to %s", parsed);
		});
	});
}

discord_client.on('ready', function(event) {
	console.log("Logged into Discord as %s", discord_client.username);
	updatePlayingStatus();
});