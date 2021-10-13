import Discord, { Intents } from "discord.js";

import dotenv from "dotenv";

import { Manager, Player } from "erela.js";
import Spotify from "erela.js-spotify";
import TextDictonary from "./text-dictionary";
import { boldMessage, format } from "./utils";
import { promisify } from "util";
import { createReadStream } from "fs";
import stream, { Readable } from "stream"
dotenv.config();

const sleep = promisify(setTimeout);

const clientID = process.env.SPOTIFY_CLIENT_ID!;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

const client: Discord.Client & { manager: Manager } = new Discord.Client({
    // intents: [Intents.FLAGS.GUILDS,Intents.FLAGS.GUILD_VOICE_STATES]
}) as any;

client.manager = new Manager({
    nodes: [
        // If you pass a object like so the "host" property is required
        {
            host: process.env.LAVALINK_HOST!,
            port: +process.env.LAVALINK_PORT!,
            password: process.env.LAVALINK_PASSWORD,
        },
    ],
    plugins: [
        new Spotify({
            clientID,
            clientSecret
        })
    ],
    send(id, payload) {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    }

})
    .on("nodeConnect", node => console.log(`Node ${node.options.identifier} connected`))
    .on("nodeError", (node, error) => console.log(`Node ${node.options.identifier} had an error: ${error.message}`))
    .on("trackStart", (player, track) => {
        if (!player.queueRepeat) {
            (client.channels.cache.get(player.textChannel!) as any).send(TextDictonary.track_start_message(track));
        }
    })
    // .on("queueEnd", (player) => {
    //     setTimeout(async () => {
    //         const currentPlayer = client.manager.get(player.guild)
    //         if (currentPlayer) {
    //             if (!currentPlayer.playing) {
    //                 currentPlayer.destroy();
    //             }
    //         }
    //         //runs after 2 minutes , exits if not playing anything
    //     }, 2 * 60 * 1000)
    // })
    .on("playerDestroy", (player) => {

        (client.channels.cache.get(player.textChannel!) as any).send(boldMessage(TextDictonary.player_destroy_message))

        // player.destroy();
    });
client.once('ready', () => {
    client.user!.setActivity({
        name: "Metin2 Alaska",
        type: "PLAYING"
    })
    client.manager.init(client.user!.id);
    console.log("Za bot is online");
});

type GoodDiscordMessage = Discord.Message & {
    guild: Discord.Guild
    member: Discord.GuildMember
}

type FunctionSignatures = ((message: GoodDiscordMessage) => void) | ((message: GoodDiscordMessage) => Promise<void>)

type Command = {
    command: string | string[]
    handler: FunctionSignatures,
}



const commands: Command[] = [{
    command: "!loop",
    handler: (message) => {

        const player = client.manager.get(message.guild.id);
        if (player) {
            player.setQueueRepeat(!player.queueRepeat);
            message.channel.send(boldMessage(TextDictonary.loop(player.queueRepeat)));
        } else {
            message.channel.send(boldMessage(TextDictonary.not_connected));
        }
    },
},
{
    command: "!join",
    handler: (message) => {

        const player = client.manager.get(message.guild.id);
        if (player) {
            player.connect();
        } else {
            const newPlayer = client.manager.create({
                guild: message.guild.id,
                voiceChannel: message.member.voice.channel!.id,
                textChannel: message.channel.id,
            });
            newPlayer.connect();
        }
    }
},
{
    command: "!leave",
    handler: (message) => {
        const player = client.manager.get(message.guild.id);
        if (player) {
            player.destroy();
        } else {
            message.channel.send(boldMessage(TextDictonary.not_connected));
        }
    }
}, {
    command: ["!pause", "!resume", "!stop"],
    handler: message => {
        const command = message.content.split(" ")[0];
        const player = client.manager.get(message.guild.id);
        if (player) {
            if (player.paused && command === "!resume") {
                message.channel.send(boldMessage(TextDictonary.resumed));
            } else if (!player.paused && (command === "!pause" || command === "!stop")) {
                message.channel.send(boldMessage(TextDictonary.paused));
            }

            if (!player.paused && command === "!resume") {
                message.channel.send(boldMessage(TextDictonary.already_playing));
            }
            if (player.paused && (command === "!pause" || command === "!stop")) {

                message.channel.send(boldMessage(TextDictonary.not_playing));
            }
            if (command === "!resume") {
                player.pause(false);
            } else if (command === "!pause") {
                player.pause(true);
            }

            // player.pause(!player.paused);
        } else {
            message.channel.send(TextDictonary.not_connected);
        }
    }
},
{
    command: ["!play", "!p", "zi-le marco"],
    handler: async (message) => {
        const command = message.content.split(" ")[0];

        const res = await client.manager.search(
            message.content.replace(new RegExp(command), "").trim(),
            message.author
        );
        if (res.tracks.length === 0) {
            message.reply(TextDictonary.track_not_found);
            // client.channels.cache.get(client.manager.get(message.guild.id).send).send
            return;
        }
        let player = client.manager.get(message.guild.id);
        if (!player) {
            player = client.manager.create({
                guild: message.guild.id,
                voiceChannel: message.member.voice.channel!.id,
                textChannel: message.channel.id,
            });
        }
        if (player.state !== "CONNECTED") {
            player.connect();
        }
        // Adds the first track to the queue.
        if (res.playlist) {
            // player.setQueueRepeat();
            res.tracks.forEach(track => player?.queue.add(track));
            const author = message.author.displayAvatarURL({ size: 32, });
            const embeded = new Discord.MessageEmbed({
                title: res.playlist.name,
                author: {
                    icon_url: author,
                    name: "Playlist added to queue",
                },
                fields: [{
                    name: "Tracks",
                    value: `\`${res.tracks.length}\` Tracks`,
                }],
                color: "#3399ff",
                thumbnail: {
                    url: res.tracks[0].thumbnail || undefined
                }
            });
            message.channel.send(embeded);
        } else {
            player.queue.add(res.tracks[0]);
            if (player.queue.size) {
                message.channel.send(TextDictonary.added_to_queue(res.tracks[0]));
            } else {
                message.channel.send(TextDictonary.found_song(res.tracks[0]));
            }
        }

        // Plays the player (plays the first track in the queue).
        // The if statement is needed else it will play the current track again
        if (!player.playing && !player.paused) {
            player.play();
        }
    }
}, {
    command: ["!schimbo", "!skip", "!fs"],
    handler: (message) => {
        const player = client.manager.get(message.guild.id);
        if (player && player.queue.totalSize) {
            player.setQueueRepeat(false);
            const amount = +message.content.split(" ")[1];
            if (amount < 1) {
                (client.channels.cache.get(player.textChannel!) as any).send(boldMessage(TextDictonary.skip_negative_error))
            } else {
                player.stop(amount ?? 1);
                (client.channels.cache.get(player.textChannel!) as any).send(boldMessage(TextDictonary.skip_success))
            }
        } else {
            message.channel.send(boldMessage(TextDictonary.skip_failure));
        }
    }
}, {
    command: ["!seek"],
    handler: (message) => {
        const player = client.manager.get(message.guild.id);
        if (player) {
            const amount = +message.content.split(" ")[1];
            if (amount < 0 || amount >= player.queue.duration / 1000) {
                (client.channels.cache.get(player.textChannel!) as any).send(boldMessage(TextDictonary.seek_error(player.queue.duration)))
            } else {
                player.seek(amount * 1000);
                (client.channels.cache.get(player.textChannel!) as any).send(TextDictonary.seek_success(format(amount * 1000)))
            }
        } else {
            message.channel.send(boldMessage(TextDictonary.skip_failure));
        }
    }
}]

client.on("raw", (d) => client.manager.updateVoiceState(d));

client.on('message', async (message) => {

    commands.forEach(({ command, handler }) => {
        const firstCommand = message.content.split(" ")[0];
        function getStartMessage(command: string) {
            if (command[0] === "!") {
                return command === firstCommand
            } else {
                return message.content.startsWith(command);
            }

        }
        const messageStartsWith = typeof command === "string" ?
            getStartMessage(command) :
            command.reduce((boolean, current) => boolean || getStartMessage(current), false);
        if (!messageStartsWith) {
            return;
        }
        if (message.guild && message.member?.voice.channel) {
            try {
                Promise.resolve(handler(message as any)).catch(error => {
                    console.log({ error });
                    message.channel.send(TextDictonary.error_has_occured);
                })
            } catch (error) {
                console.log({ error });
                message.channel.send(TextDictonary.error_has_occured);
            }
        }
        if (!message.member?.voice.channel) {
            message.channel.send(TextDictonary.must_be_connected);
        }
    })
})

client.login(process.env.BOT_ID)