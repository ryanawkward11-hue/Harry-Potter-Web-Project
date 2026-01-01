// ---- GAME SETTINGS ----
let move_speed = 3;
let max_speed = 12;
let speed_increment = 0.5;
let increment_interval = 4000; // every 4 seconds
let pipe_gap_vertical = 45;    // vertical gap between pipes (vh)
let pipe_gap_horizontal = 35;  // minimum horizontal distance between pipes (vw)
let last_pipe_right = 120;     // safe distance for first pipe
let gravity = 1.5;
let flap_strength = -3;
let hover_gravity = 0.1;       // weaker gravity right after flap
let hover_time = 90;           // hover duration (ms)

// ---- ELEMENTS ----
let harry = document.querySelector('.harry');
let img = document.getElementById('harry-1');
let sound_point = new Audio('sounds effect/point.mp3');
let sound_die = new Audio('sounds effect/die.mp3');
let score_val = document.querySelector('.score_val');
let message = document.querySelector('.message');
let score_title = document.querySelector('.score_title');
let background;

// ---- SNITCH STATE ----
let snitch = document.getElementById('snitch');
let snitch_props;
let snitch_dy = 0;
let last_snitch_flap = 0;

// ---- SNITCH SETTINGS ----
let snitch_flap_strength = -3;

let snitch_hover_gravity = 0.1;
let snitch_hover_time = 90;

// ---- GAME STATE ----
let harry_props;
let harry_dy = 0;
let game_state = 'Start';
let speed_timer;
let last_flap = 0;

// ---- INITIAL SETUP ----
img.style.display = 'none';
message.classList.add('messageStyle');

// ---- CONTROLS ----
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && game_state !== 'Play') {
        resetGame();
    }

    if (game_state === 'Play' && (e.key === 'ArrowUp' || e.key === ' ')) {
        img.src = 'images/harry2.png';
        harry_dy = flap_strength;
        last_flap = Date.now();
    }
});

document.addEventListener('keyup', (e) => {
    if (game_state === 'Play' && (e.key === 'ArrowUp' || e.key === ' ')) {
        img.src = 'images/harry1.png';
    }
});

// ---- SNITCH LOOP ----

let snitch_dynamic_target = window.innerHeight * 0.4;
let snitch_wiggle_phase = 0;

function apply_snitch_gravity() {
    if (game_state !== 'Play') return;

    snitch_props = snitch.getBoundingClientRect();

    // Wiggle effect
    snitch_wiggle_phase += 0.15;
    let wiggle = Math.sin(snitch_wiggle_phase) * 10; // 10px up/down

    // Randomly change target position every 1.5s if not near a pipe
    if (!apply_snitch_gravity.lastChange || Date.now() - apply_snitch_gravity.lastChange > 1500) {
        snitch_dynamic_target = Math.random() * (window.innerHeight - snitch_props.height - 60) + 30;
        apply_snitch_gravity.lastChange = Date.now();
    }

    let targetTop = snitch_dynamic_target + wiggle;

    // Check for pipes in Snitch's path
    let pipes = document.querySelectorAll('.pipe_sprite');
    let dodgingPipe = false;

    if (pipes.length > 0) {
        // Assume pipes are added in top-bottom pairs
        for (let i = 0; i < pipes.length; i += 2) {
            let topPipe = pipes[i];
            let bottomPipe = pipes[i + 1];

            if (!topPipe || !bottomPipe) continue;

            let topProps = topPipe.getBoundingClientRect();
            let bottomProps = bottomPipe.getBoundingClientRect();

            // Check if Snitch is near this pipe horizontally
            if (
                topProps.left < snitch_props.right + 30 &&
                topProps.right > snitch_props.left - 30
            ) {
                dodgingPipe = true;
                // Set targetTop to the middle of the gap
                targetTop = topProps.bottom + (bottomProps.top - topProps.bottom) / 2 - snitch_props.height / 2;
            }
        }
    }

    // Move faster if dodging pipe
    let speed = dodgingPipe ? 18 : 8; // pixels per frame

    let currentTop = snitch_props.top;
    let newTop = currentTop + Math.sign(targetTop - currentTop) * Math.min(Math.abs(targetTop - currentTop), speed);

    // Boundaries
    newTop = Math.max(0, Math.min(window.innerHeight - snitch_props.height, newTop));

    snitch.style.top = `${newTop}px`;
    snitch.style.transform = 'none';

    requestAnimationFrame(apply_snitch_gravity);
}



// ---- RESET FUNCTION ----
function resetGame() {
    // Remove old pipes
    document.querySelectorAll('.pipe_sprite').forEach(p => p.remove());

    // Reset Harry
    img.style.display = 'block';
    img.src = 'images/harry1.png';
    const startTop = Math.floor(window.innerHeight * 0.25);
    harry.style.top = `${startTop}px`;
    harry_dy = 0;

    // Reset Snitch
    snitch.style.display = 'block';
    snitch.style.top = '40vh';
    snitch_dy = 0;

    setTimeout(() => {
        snitch_props = snitch.getBoundingClientRect();
        requestAnimationFrame(apply_snitch_gravity);
    }, 50);

    // Reset Score & State
    game_state = 'Play';
    message.innerHTML = '';
    score_title.innerHTML = 'Score : ';
    score_val.innerHTML = '0';
    message.classList.remove('messageStyle');

    // Reset speed & pipe tracker
    move_speed = 3;
    last_pipe_right = 120;
    clearInterval(speed_timer);

    // Force layout update then start loops
    setTimeout(() => {
        background = document.querySelector('.background').getBoundingClientRect();
        harry_props = harry.getBoundingClientRect();

        requestAnimationFrame(apply_gravity);
        requestAnimationFrame(move);
        requestAnimationFrame(create_pipe);

        speed_timer = setInterval(() => {
            if (game_state === 'Play' && move_speed < max_speed) {
                move_speed += speed_increment;
            }
        }, increment_interval);
    }, 50);
}

// ---- GAME LOOP ----
function move() {
    if (game_state !== 'Play') return;

    let pipes = document.querySelectorAll('.pipe_sprite');
    harry_props = harry.getBoundingClientRect();

    pipes.forEach(pipe => {
        let pipe_props = pipe.getBoundingClientRect();

        if (pipe_props.right <= 0) {
            pipe.remove();
        } else {
            pipe.style.left = pipe_props.left - move_speed + 'px';

            // Collision with Harry
            let offset = 10;
            if (
                harry_props.left + offset < pipe_props.left + pipe_props.width &&
                harry_props.left + harry_props.width - offset > pipe_props.left &&
                harry_props.top + offset < pipe_props.top + pipe_props.height &&
                harry_props.top + harry_props.height - offset > pipe_props.top
            ) {
                gameOver();
            }

            // Score
            if (pipe.increase_score === '1' && pipe_props.right < harry_props.left) {
                score_val.innerHTML = +score_val.innerHTML + 1;
                sound_point.play();
                pipe.increase_score = '0';
            }
        }
    });

    requestAnimationFrame(move);
}

function apply_gravity() {
    if (game_state !== 'Play') return;

    let g = (Date.now() - last_flap < hover_time) ? hover_gravity : gravity;
    harry_dy += g;

    let newTop = harry_props.top + harry_dy;
    harry.style.top = `${newTop}px`;

    harry_props = harry.getBoundingClientRect();

    // Tilt Harry
    let tilt = harry_dy < 0 ? -10 : Math.min(60, harry_dy * 2);
    harry.style.transform = `rotate(${tilt}deg)`;

    // Boundaries
    if (harry_props.top <= 0) {
        harry.style.top = '0px';
        gameOver();
    } else if (harry_props.bottom >= window.innerHeight) {
        harry.style.top = `${window.innerHeight - harry_props.height}px`;
        gameOver();
    }

    requestAnimationFrame(apply_gravity);
}

function create_pipe() {
    if (game_state !== 'Play') return;

    let pipes = document.querySelectorAll('.pipe_sprite');
    let first_pipe = pipes.length === 0;
    let next_pipe_ready = first_pipe || (last_pipe_right < 100 - pipe_gap_horizontal);

    if (next_pipe_ready) {
        let pipe_posi = Math.floor(Math.random() * 43) + 8;

        // Top pipe
        let pipe_top = document.createElement('div');
        pipe_top.className = 'pipe_sprite';
        pipe_top.style.top = pipe_posi - 70 + 'vh';
        pipe_top.style.left = '100vw';
        document.body.appendChild(pipe_top);

        // Bottom pipe
        let pipe_bottom = document.createElement('div');
        pipe_bottom.className = 'pipe_sprite';
        pipe_bottom.style.top = pipe_posi + pipe_gap_vertical + 'vh';
        pipe_bottom.style.left = '100vw';
        pipe_bottom.increase_score = '1';
        document.body.appendChild(pipe_bottom);

        last_pipe_right = 100;
    }

    last_pipe_right -= (move_speed / window.innerWidth) * 100;
    requestAnimationFrame(create_pipe);
}

// ---- GAME OVER ----
function gameOver() {
    game_state = 'End';
    message.innerHTML = 'Game Over'.fontcolor('red') + '<br>Press Enter To Restart';
    message.classList.add('messageStyle');
    img.style.display = 'none';
    sound_die.play();
    clearInterval(speed_timer);
}
