import { PlaylistInfo, Track } from "erela.js";

export default {
    not_connected: "Not connected",
    player_destroy_message: "S-a inchis terasa.",
    track_start_message: (track: Track) => `**Aluneca bine ** \`${track.title}\``,
    paused: "Paused",
    resumed: "Resumed",
    already_playing: "Already playing",
    not_playing: 'Not playing ... :rolling_eyes:',
    track_not_found: "Pauza , nu s-a gasit",
    found_playlist: (playlist: PlaylistInfo) => `**S-a gasit playlist ** ${playlist.name}.`,
    added_to_queue: (track: Track) => `**Added to queue** ${track.title}.`,
    found_song: (track: Track) => `**Uite coaie **  \`${track.title}\` `,
    skip_success: 'Gata sefu, schimbam',
    skip_failure: 'N-am ce sa schimb, coaie',
    not_connected_to_voice: "**I am not connected to the voice channel** :triumph:",
    must_be_connected: "**You must be connected to a voice channel to use this command!**",
    error_has_occured: "**Whoops ... an error has occured ... **",
    loop: (active: boolean) => `:repeat_one: ${active ? "Enabled" : "Disabled"}`,
    skip_negative_error: "**Cannot skip negative numbers**",
    seek_error: (duration: number) => `**You can seek from** \`0\` to \`${duration}\``,
    seek_success: (duration: number | string) => `**Seeked to** \`${duration}\``
}