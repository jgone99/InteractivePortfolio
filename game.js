
// mage turbo boost sound on click
// replace with cooler ship
// 

let WINDOW_W = document.body.clientWidth
let WINDOW_H = document.body.clientHeight

const SCREEN_W = screen.width
const SCREEN_H = screen.height

const ship_state = {
    x: WINDOW_W / 2,
    y: WINDOW_H / 2,
    angle: 0,
    size: WINDOW_W * 0.03,
    speed: 0
}

const pointer = {
    x: WINDOW_W / 2,
    y: WINDOW_H / 2
}

const LEFT_BOUND = -ship_state.size
const RIGHT_BOUND = WINDOW_W + ship_state.size
const TOP_BOUND = -ship_state.size
const BOTTOM_BOUND = WINDOW_H + ship_state.size

let ROTATION_SPEED = 180 // degrees per second
let MAX_TRANSLATION_SPEED = WINDOW_W * WINDOW_H * 0.0001 // pixels per second
let DAMP_DISTANCE_2 = 40000 // distance in pixels squared
let SHIP_CENTER_OFFSET = ship_state.size / 2
let DASH_W
let DASH_H
let DASH_SPACING

let dx = 0
let dy = 0
let prev_ship_x = ship_state.x
let prev_ship_y = ship_state.y

const frame_width = 850
const frame_height = 850
const total_rotation_frames = 8
const total_thrust_frames = 6
let rotation_frame = 0
let thrust_frame = 0
let frame_rate = 250
let prev_frame_time = 0

const max_ticks = 10
let speed_ticks = 5

let followCursor = true
const devicePixelRatio = window.devicePixelRatio || 1;

const canvas = document.querySelector('#canvas')
const $container = document.querySelector(".game-wrapper")
const $cursor = document.querySelector(".custom-cursor-2")

canvas.width = WINDOW_W * devicePixelRatio
canvas.height = WINDOW_H * devicePixelRatio

const spaceship_img = new Image()
spaceship_img.src = 'res/spaceship_v6.png'
const ctx = canvas.getContext('2d')
ctx.imageSmoothingEnabled = false
ctx.imageSmoothingQuality = 'high'

// const planet_img = new Image()
// planet_img.src = 'res/Planets/Cropped/8.png'

// planet_img.onload = () => {
//     ctx.drawImage(
//         planet_img,
//         0, 
//         0, 
//         370, 
//         305, 
//         canvas.width / 2, 
//         canvas.height / 2, 
//         370, 
//         305
//     )
// }

const stars = document.querySelector('.stars');

function generateStars(count) {
  const size = Math.max(SCREEN_W, SCREEN_H);
  const shadows = [];

  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * size - size / 2);
    const y = Math.floor(Math.random() * size - size / 2);
    const brightness = Math.floor(180 + Math.random() * 75);
    const color = `rgb(${brightness}, ${brightness}, ${brightness})`;
    shadows.push(`${color} ${x}px ${y}px`);
  }

  stars.style.boxShadow = shadows.join(', ');
}

function initStars() {
  const size = Math.max(window.innerWidth, window.innerHeight);
  const density = 5500; // 1 star per 2500 px²
  const count = Math.floor((size * size) / density);
  generateStars(count);
}

function updateMousePosition(eventX, eventY) {
    pointer.x = eventX
    pointer.y = eventY
}

function initValuesOnResize() {
    const prev_SCREEN_WIDTH = WINDOW_W
    const prev_SCREEN_HEIGHT = WINDOW_H
    WINDOW_W = document.body.clientWidth;
    WINDOW_H = document.body.clientHeight;
    
    ship_state.x = (ship_state.x / prev_SCREEN_WIDTH) * WINDOW_W
    ship_state.y = (ship_state.y / prev_SCREEN_HEIGHT) * WINDOW_H
    ship_state.size = WINDOW_W * 0.03;
    
    ROTATION_SPEED = 180
    DAMP_DISTANCE_2 = 40000
    SHIP_CENTER_OFFSET = ship_state.size / 2
    // DASH_W = 10
    // DASH_H = 5
    // DASH_SPACING = 15

    MAX_TRANSLATION_SPEED = WINDOW_W * WINDOW_H * 0.0002

    
}

function drawSprite() {
    const frame_x = thrust_frame * frame_width
    const frame_y = rotation_frame * frame_width

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()

    ctx.translate(ship_state.x + ship_state.size / 2, ship_state.y + ship_state.size / 2)
    ctx.rotate(ship_state.angle * Math.PI / 180 + Math.PI / 2)
    ctx.translate(-ship_state.x - ship_state.size / 2, -ship_state.y - ship_state.size / 2)

    ctx.drawImage(
        spaceship_img,
        frame_x,
        frame_y,
        frame_width,
        frame_height,
        ship_state.x,
        ship_state.y,
        ship_state.size,
        ship_state.size
    )
    
    ctx.restore()
}

function createShip($container) {
    const $ship = document.createElement("img")
    $ship.src = "res/spaceship_v3.png"
    $ship.className = "ship"
    $container.appendChild($ship)


    return $ship
}

function setShipCenterX(x) {
    ship_state.x = x - SHIP_CENTER_OFFSET
}

function setShipCenterY(y) {
    ship_state.y = y - SHIP_CENTER_OFFSET
}

function rotateShip(dt) {
    const max_rotation = ROTATION_SPEED * dt

    dx = pointer.x - (ship_state.x + SHIP_CENTER_OFFSET)
    dy = pointer.y - (ship_state.y + SHIP_CENTER_OFFSET)
    const d_angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360 // converting to angle and to 0 to 360 degree coordinate system
    let angle_diff = normalizeAngle(d_angle - ship_state.angle)
    angle_diff = angle_diff < -180 ? 360 + angle_diff : angle_diff // convereting negative destination coordinates to positive equivalent to work with CSS transform rotation
    const rotation = Math.abs(angle_diff) < max_rotation ? angle_diff : Math.sign(angle_diff) * max_rotation 
    ship_state.angle += rotation
}

function normalizeAngle(angle) {
    return ((angle + 180) % 360) - 180;
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

function moveForward(dt) {
    const rad = (ship_state.angle) * Math.PI / 180; // Adjust for CSS 0° being "up"
    const dist2 = Math.pow(dx, 2) + Math.pow(dy, 2)
    const frac = Math.min(dist2 / DAMP_DISTANCE_2, 1)
    const translation_speed = MAX_TRANSLATION_SPEED * speed_ticks / max_ticks
    ship_state.x += Math.cos(rad) * translation_speed * dt
    ship_state.y += Math.sin(rad) * translation_speed * dt
    ship_state.speed = translation_speed

    checkBounds()

    // if (distance(ship_state.x, ship_state.y, prev_ship_x, prev_ship_y) >= DASH_SPACING) {
    //     const $dash = document.createElement("div")
    //     $dash.className = "dash"
    //     $dash.style.transform = 
    //     `translate(${ship_state.x + SHIP_CENTER_OFFSET - DASH_W / 2}px, ${ship_state.y + SHIP_CENTER_OFFSET - DASH_H / 2}px) rotate(${ship_state.angle}deg)`
    //     $container.appendChild($dash)
    //     prev_ship_x = ship_state.x
    //     prev_ship_y = ship_state.y

    //     setTimeout(() => {
    //         $dash.remove()
    //     }, 2000)
    // }  
}

function checkBounds() {
    const shipCenterX = ship_state.x + SHIP_CENTER_OFFSET
    const shipCenterY = ship_state.y + SHIP_CENTER_OFFSET

    if (shipCenterX <= LEFT_BOUND) {
        setShipCenterX(LEFT_BOUND + 1)
    }
    else if (shipCenterX >= RIGHT_BOUND) {
        setShipCenterX(RIGHT_BOUND - 1)
    }
    if (shipCenterY <= TOP_BOUND) {
        setShipCenterY(TOP_BOUND + 1)
    }
    else if (shipCenterY >= BOTTOM_BOUND)
    {
        setShipCenterY(BOTTOM_BOUND - 1)
    }
}

function easeInOutQuad(t) {
    return t < 0.5
        ? t * (2 - t)
        : -1 + (4 - 2 * t) * t;
}

function setTransform($element) {
    $element.style.transform = `translate(${ship_state.x}px, ${ship_state.y}px) rotate(${ship_state.angle}deg)`
}

function onPlanetClick($element) {
    shipToPlanet($element)
}

function shipToPlanet($element) {
    followCursor = false
    const rect = $element.getBoundingClientRect()
    const width = rect.width
    const x = rect.left + width / 2
    const y = rect.top + width / 2
    pointer.x = x
    pointer.y = y
    ROTATION_SPEED = 1000
    MAX_TRANSLATION_SPEED = 2000
}

function updateCursor(e) {
    $cursor.style.left = `${e.pageX}px`
    $cursor.style.top = `${e.pageY}px`
    if (followCursor) {
        updateMousePosition(e.pageX, e.pageY)
    }
}

function updateShipSpeed(e) {
    speed_ticks += e.deltaY > 0 ? -1 : e.deltaY < 0 ? 1 : 0
    speed_ticks = speed_ticks > max_ticks ? max_ticks : speed_ticks < 0 ? 0 : speed_ticks
}

let lastTime = null;
function animate(timestamp) {
    if (lastTime === null) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000; // in seconds
    lastTime = timestamp;

    rotateShip(dt)
    moveForward(dt)

    thrust_frame = total_thrust_frames - parseInt((total_thrust_frames - 1) * (ship_state.speed / MAX_TRANSLATION_SPEED)) - 1

    if (timestamp - prev_frame_time > frame_rate) {
        rotation_frame = (rotation_frame + (speed_ticks > 0 ? 1 : 0)) % total_rotation_frames
        prev_frame_time = timestamp
    }
    drawSprite()
    //console.log(ship_state.x, ship_state.y)
    requestAnimationFrame(animate);
}

initStars()

requestAnimationFrame(animate)

window.addEventListener("mousemove", updateCursor)
window.addEventListener("wheel", updateShipSpeed)

window.addEventListener("resize", () => {
    initValuesOnResize()
})