import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 10000;
const ROUND_SECONDS = Number(process.env.ROUND_SECONDS) || 300;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
const MODEL = 'llava';

const TARGETS = [
  'an actual insect',
  'a spiderweb',
  'an ant trail',
  'a puddle of water on the ground',
  'an actual cloud in the sky',
  'a bright yellow flower',
  'a pinecone',
  'a stray cat or dog',
  'a rusty piece of metal or pipe',
  'a patch of weeds breaking through concrete',
  'a bird sitting on a power line',
  'a weirdly shaped leaf',
  'a shadow cast by a tree branch',
  'a dead grass patch'
];

const app = express();
const server = createServer(app);

// The client shrinks photos to a few hundred KB, so 5 MB is plenty.
const io = new Server(server, {
    maxHttpBufferSize: 5e6
});

app.use(express.static(path.join(__dirname, '../frontend-web/sprint-n-squint/dist')));

// ---- game state ----
let currentTarget = '';
let gameActive = false;
let roundId = 0;
let roundEndsAt = 0;
let roundTimer = null;

function endRound(winner) {
    if (!gameActive) return;
    gameActive = false;
    clearTimeout(roundTimer);
    io.emit('game-over', { winner, target: currentTarget });
}

// ---- the judge ----
const verifyWithJudge = async (image, target) => {
    // Ollama wants raw base64, not a data: URL
    const raw = image.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `
                    You are a strict and unforgiving game referee. 
                    The player is trying to find: "${target}".

                    Analyze the image carefully. 
                    1. Write a 5-word description of what is actually in the image.
                    2. Determine if the target ("${target}") is CLEARLY and indisputably visible in the image. 
                    If the image shows something else (like a phone, a wall, a desk, or a different object), "found" MUST be false. Do not be generous.

                    You must respond with ONLY a valid JSON object in this exact format, with no extra text:
                    {"sees": "short description here", "found": true} 
                    OR 
                    {"sees": "short description here", "found": false}
                `;

    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                prompt,
                images: [raw],
                stream: false,
                format: 'json',
                keep_alive: '30m',
                options: { temperature: 0.2 }
            })
        });

        if (!response.ok) throw new Error(`Ollama responded with ${response.status}`);

        const data = await response.json();
        const parsed = JSON.parse(data.response);
        const found = parsed.found === true || String(parsed.found).toLowerCase() === 'true';

        return { ok: true, found, sees: String(parsed.sees || '').trim() };
    }

    catch (err) {
        console.error('Judge error:', err.message);
        return { ok: false };
    }
};

// Only one photo is judged at a time, so judge never gets flooded.
let queue = Promise.resolve();
const judge = (image, target) => {
    const job = queue.then(() => verifyWithJudge(image, target));
    queue = job.catch(() => {});
    return job;
};

// ---- game loop ----
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // someone joining or refreshing mid-round catches up
    if (gameActive) {
        socket.emit('game-started', {
            target: currentTarget,
            durationSeconds: Math.max(1, Math.ceil((roundEndsAt - Date.now()) / 1000))
        });
    }

    socket.on('start-game', () => {
        if (gameActive) return;

        currentTarget = TARGETS[Math.floor(Math.random() * TARGETS.length)];
        gameActive = true;
        roundId++;
        roundEndsAt = Date.now() + ROUND_SECONDS * 1000;
        roundTimer = setTimeout(() => endRound(null), ROUND_SECONDS * 1000);

        io.emit('game-started', {
            target: currentTarget,
            durationSeconds: ROUND_SECONDS
        });
    });

    socket.on('submit-photo', async (payload) => {
        const { image, playerName } = payload || {};
        if (!gameActive || typeof image !== 'string') return;

        const myRound = roundId;
        const target = currentTarget;
        const name = String(playerName || '').trim().slice(0, 20) || socket.id.slice(0, 5);

        socket.emit('judging-in-progress');

        const result = await judge(image, target);

        // someone won or time ran out while we were judging (or a new round started)
        if (!gameActive || myRound !== roundId) return;

        if (!result.ok) {
            socket.emit('submission-rejected', {
                reason: 'The judge got confused. Is Ollama running? Try again.'
            });
            return;
        }

        if (result.found) {
            endRound(name);
        }

        else {
            const saw = result.sees ? ` It saw: ${result.sees}` : '';
            socket.emit('submission-rejected', {
                reason: `Judge couldn't spot ${target}.${saw}`
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`Sprint-n-Squint running at http://localhost:${PORT}`);
});