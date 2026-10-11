# Sprint-n-Squint

> Find it. Photograph it. Convince the judge.

Sprint-n-Squint is a multiplayer scavenger hunt that only works if you leave your desk. Everyone in a round gets the same thing to find ("a spiderweb", "a stray pebble or stone", "a rusty piece of metal or pipe"), a five-minute clock starts, and you sprint outside to photograph it. A vision model running locally through [Ollama](https://ollama.com) judges your photo, and the first photo it believes wins the round.

It was built for the [Hacktoberfest Open-Source AI Challenge, Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05). The idea comes from YouTuber Dream's block shuffle challenge videos.

**[Watch the demo](https://www.youtube.com/watch?v=_wCgMbuCFjc)**

<!-- Add a screenshot or GIF here, and a link to the DEV write-up once it's published -->

## Features

- Real-time multiplayer rounds over Socket.IO: one shared target, one shared countdown, first verified photo wins
- Late joiners and page refreshes catch up to the round in progress
- A local vision model judges each photo and returns a JSON verdict, including a description of what it saw. That description doubles as the rejection message ("It saw: a collection of pebbles...")
- The judge prompt rejects photos of screens, printouts and drawings
- Photos are shrunk to about 800px in the browser, which keeps uploads small and judging fast
- Photos are judged one at a time through a queue, and a round id stops a slow verdict from an old round winning the next one
- Phone-first: the photo button opens the camera directly

## How it works

1. A player starts a round. The server picks a random target and a five-minute timer, and tells everyone.
2. A player takes a photo. The browser shrinks it and sends it over the socket.
3. The server queues the photo and asks the Ollama model whether the target is clearly visible as a real, physical object.
4. If the verdict is `found: true`, that player wins the round. Otherwise only they see the rejection, with what the judge saw.

The judge returns JSON with three fields: `sees`, `reasoning` and `found`.

**Choosing a model.** I started with `llava:7b` and also tried `gemma4:e4b`. Gemma was noticeably more accurate, but it took 20-30 seconds per photo on my laptop, which is too slow for a race. `llava` was fast enough to play. Set `OLLAMA_MODEL` to switch.

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS
- **Server:** Node.js, Express, Socket.IO
- **Judge:** Ollama running an open-weight vision model (`llava`, or `gemma4:e4b`)
- **Optional extras:** Render (hosting), Cloudflare Tunnel (reaching your laptop from outside)

## Quick start

You need [Node.js](https://nodejs.org) 18 or newer and [Ollama](https://ollama.com).

1. Clone the repo:

```bash
   git clone https://github.com/Sayan-Majumdar-06/Sprint-n-Squint.git
   cd Sprint-n-Squint
```

2. Pull a vision model:

```bash
   ollama pull llava
```

3. Create a file named `.env` in the repo root containing:

```
   OLLAMA_MODEL=llava
```

4. Install, build the frontend, and start the server:

```bash
   npm run build
   node server/server.js
```

5. Open `http://localhost:10000`, enter a name, and press **Start round**.

### Playing with friends

- **Same wifi:** find your laptop's local IP address (`ipconfig` on Windows) and open `http://<that-ip>:10000` on your phone. If it doesn't load, allow Node through the Windows firewall for private networks.
- **Different networks:** expose the app with a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):

```bash
  cloudflared tunnel --url http://localhost:10000
```

  Send the link it prints to your friends.

Take photos with the phone camera. On a desktop the button opens a file picker instead.

## Configuration

Set these in `.env` or as environment variables. All are optional except `OLLAMA_MODEL` (see step 3 above).

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `10000` | Port the server listens on |
| `ROUND_SECONDS` | `300` | Length of a round in seconds |
| `OLLAMA_URL` | `http://127.0.0.1:11434/api/generate` | Where Ollama is reachable |
| `OLLAMA_MODEL` | none | Ollama model used as the judge |

The targets live in the `TARGETS` list at the top of `server/server.js`. Add your own.

## Deploying (optional)

The server and frontend can be hosted (for example on Render) with:

- **Build command:** `npm run build`
- **Start command:** `node server/server.js`

The judge still needs Ollama, which will not be running on the host. Point `OLLAMA_URL` at your own machine through a tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:11434 --http-host-header localhost:11434
```

Then set `OLLAMA_URL` on the host to `https://<your-tunnel-link>/api/generate`. The `--http-host-header` flag is needed because Ollama rejects unfamiliar host names. The deployed app only judges photos while your laptop, Ollama and the tunnel are running, and anyone with the tunnel link can use your Ollama, so close it when you're done.

## Project structure

```
Sprint-n-Squint/
├── frontend-web/sprint-n-squint/   React + Vite client
│   └── src/                        components, hooks, lib
├── server/
│   └── server.js                   Express + Socket.IO server and the judge
└── package.json                    root build script (used for deployment)
```

For frontend work, run `npm run dev` inside `frontend-web/sprint-n-squint`. The Vite dev server proxies Socket.IO to the game server, so make sure the proxy port in `vite.config.js` matches your server's `PORT`.

## Socket events

| Event | Direction | Payload |
| --- | --- | --- |
| `start-game` | client to server | none |
| `game-started` | server to all | `{ target, durationSeconds }` |
| `submit-photo` | client to server | `{ image, playerName }` |
| `judging-in-progress` | server to submitter | none |
| `submission-rejected` | server to submitter | `{ reason }` |
| `game-over` | server to all | `{ winner, target }` (`winner` is `null` on timeout) |

## Privacy

Photos are sent only to your own Ollama instance. No third-party AI service sees them, and the server doesn't store them.

## Known limitations

- On a desktop, anyone can upload an image file from the internet and the judge will accept it. The prompt rejects photos of screens and printouts, but that only helps if you photograph the screen.
- Photo timestamps (EXIF) aren't checked yet, so an old photo taken on a phone is accepted.
- There is one global match, not separate rooms.
- Small vision models make mistakes, and sometimes contradict themselves.
- A deployed copy only judges while the host's tunnel to Ollama is up.

## Ideas for contributions

- Check EXIF timestamps so only photos taken during the round count
- Rooms, so several matches can run at once
- A scoreboard across rounds
- More targets, or targets that depend on the time of day
- An optional hosted-model backend, so the judge doesn't depend on one laptop

Pull requests are welcome.

## Credits

Built by [Sayan Majumdar](https://github.com/Sayan-Majumdar-06). Parts of the code were written and debugged with help from AI assistants (Gemini and Claude).
