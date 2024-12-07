/*
TODO: Add bounding limits to the map so the player doesn't go off screen
TODO: Add attack and damage system for player and enemies
TODO: Expand map size so it's not just a small portion
TODO: Add more landmarks and enemies
TODO: Add contextual texture changes and animations for player and enemies
TODO: Disable object interaction after it's been interacted with
*/

const app = new PIXI.Application({ width: window.innerWidth, height: window.innerHeight });
console.log(app);
document.body.appendChild(app.view);
// window.addEventListener('DOMContentLoaded', (event) => {
//     document.getElementById('game-view').appendChild(app.view);
// });

// constants
const playerSpeed = 3;
const interactionRadius = 50;
const enemySpawnInterval = 20000;
const aggro_radius = 400;
const enemy_attack_range = 50;
const modal_pushback_distance = 100;
const modal_pushback_radius = 50;
let survival_mode = false;

const game_hud_div = document.getElementById('game-info');

let player = null;

class Player {

    constructor(x = 0, y = 0, name = 'Player') {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.name = name;
        this.sprite = new PIXI.Sprite(textures.player);
        this.sprite_punching = new PIXI.Sprite(textures.player_punching);
        
        this.health = 100;
        this.maxHealth = 100;
        this.inventory = [];
        this.invincible = survival_mode ? true : false;

        this.spawn_time = Date.now();
        this.death_time = null;
    }


    // player = new PIXI.Sprite(textures.player);
    // player.anchor.set(0.5);
    // player.width = 64;
    // player.height = 64;

    // player.x = app.screen.width / 2;
    // player.y = app.screen.height / 2;
    // player.zIndex = 2;
    // player.scale.set(4);
    // app.stage.addChild(player);



    statistics = {
        time_played: 0,
        damage_dealt: 0,
        damage_taken: 0,
        enemies_killed: 0,
        items_collected: 0,
        items_used: 0,
        landmarks_visited: 0,
        special_events: 0,
        healed: 0
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.statistics.healed += amount
    }

    addItem(item) {
        player.statistics.items_collected++;
        this.inventory.push(item);
    }

    useItem(index) {
        const item = this.inventory[index];

        if (item.type === 'heal') {
            this.heal(item.value);
            console.log(`Used ${item.name}: Healed for ${item.value}. Current health: ${this.health}`);
        } else if (item.type === 'special') {
            console.log(`Used ${item.name}: Effect - ${item.effect}`);
        }

        // Remove item from inventory after use
        this.statistics.items_used++;
        this.inventory.splice(index, 1);
        updateInventoryUI();
    }

    onHit(amount) {
        console.log(`onHit called with amount: ${amount} on player ${this.name} (${this.id}) - invincible: ${this.invincible}`);
        if (this.invincible) {
            console.log("Player is invincible! (probably looking at a landmark or something idk");
            return;
        } else {
            console.log(`Player ${this.name} (${this.id}) was hit for ${amount} damage!`);
            this.health -= amount;
            this.statistics.damage_taken += amount;
            this.sprite.tint = 0xff0000; // Tint the sprite red
            setTimeout(() => {
                this.sprite.tint = 0xffffff; // Reset the tint after 1 second
            }, 300);
            if (amount >= this.health) amount = this.health;
            if (this.health <= 0) {
                gameOver();
            }
        }
    }

    // attack method
    attack(target) {
        let crit_chance = 10; // 10% chance to crit
        let crit_damage = 2; // 2x damage on crit
        let roll = Math.floor(Math.random() * 100 + 1);
        let damage = 10; // default damage
        // apply bonus if player has certain items in inventory
        // if (this.inventory.some(item => item.name === 'Sword')) {
        //     damage += 5;
        // }

        // console.log(`Attacking target:`, target);
        // console.log(`Target class: ${target.constructor.name}`);
        // console.log(`Target has onHit: ${typeof target.onHit === 'function'}`);

        if (roll <= crit_chance) {
            damage += Math.floor(Math.random() * 10 + 1) * crit_damage;
            this.statistics.damage_dealt += damage;
            target.onHit(damage);
            console.log(`Critical hit! Dealt ${damage} damage to ${target.name} (${target.uid})!`);
        } else {
            target.onHit(damage);
            this.statistics.damage_dealt += damage;
            console.log(`Dealt ${damage} damage to ${target.name} (${target.uid})!`);
        }
    }

    die() {
        this.sprite.destroy();
        this.death_time = Date.now();
        this.statistics.time_played = Math.floor((this.death_time - this.spawn_time) / 1000);
        // game over
        // console.log("Game over!");
    }
}

class NPC {
    constructor(name, type, x, y) {
        this.name = name;
        this.type = type;
        this.x = x;
        this.y = y;
        this.inventory = [];
        this.sprite = new PIXI.Sprite(textures[type]);
    }

    addItem = (item) => {
        this.inventory.push(item);
    }

    dialogue = () => {
        // display dialogue
        possibilities = [
            "よ！",
            "何かあるか？",
            "今日はいい天気だな",
            "お前、何者だ？",
            "高田馬場について知りたいか？",
            "高田馬場の歴史を知りたいか？",
            "高田馬場の名所を知りたいか？",
            "高田馬場の伝説を知りたいか？",
            "高田馬場の未来を知りたいか？",
            "高田馬場の秘密を知りたいか？",
            "高田馬場の裏事情を知りたいか？",
        ]
        return possibilities[Math.floor(Math.random() * possibilities.length)];
    }
}

class Enemy {
    constructor(name, health, type, maxSpeed = 1, x, y, isBoss = false, sprite) {
        this.uid = Math.random().toString(36).substr(2, 9); // unique id
        console.log("Max speed: ", maxSpeed, typeof maxSpeed);
        // console.log("Z: ", z, typeof z);
        // z = z * maxSpeed
        this.speed = Number(Math.random() * maxSpeed + 1); //assign random speed based on maxSpeed
        console.log("Speed: ", this.speed, typeof this.speed);
        this.name = name;
        this.health = health;
        this.maxHealth = health;
        this.maxSpeed = maxSpeed;
        this.type = type;
        this.x = x;
        this.y = y;
        this.sprite = sprite || new PIXI.Sprite(textures.enemy); // use supplied sprite or fallback to default if none supplied
        // this.runningSprite = new PIXI.AnimatedSprite(PIXI.Loader.shared.resources["img/sprites/player_running.json"].spritesheet.animations["player_running"]);
        // this.punchingSpriteLeft = new PIXI.Sprite(textures.player_punching_left);
        // this.punchingSpriteRight = new PIXI.Sprite(textures.player_punching_right);
        this.inventory = [];
        this.isBoss = isBoss;
        this.attackCooldown = 0;
    }

    // uid = Math.random().toString(36).substr(2, 9); // unique id
    // speed = Math.random() * this.maxSpeed + 1; //assign random speed based on maxSpeed

    // attack(target) {
    //     amount = Math.floor(Math.random() * 10 + 1, 10);
    //     target.health -= amount;
    // }

    addItem = (item) => {
        this.inventory.push(item);
        player.statistics.items_collected++;
    }

    onHit(amount) {
        this.health -= amount;
        const dx = player.sprite.x - this.x;
        const dy = player.sprite.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pushBackDistance = 10; // distance to push back

        if (dist > 0) {
            this.x -= (dx / dist) * pushBackDistance;
            this.y -= (dy / dist) * pushBackDistance;
        }
        this.sprite.tint = 0xff0000; // Tint the sprite red
        setTimeout(() => {
            this.sprite.tint = 0xffffff; // Reset the tint after 1 second
        }, 300);
        // if (this.health <= 0) {
        //     this.die();
        // }
    }

    useItem = (index) => {
        const item = this.inventory[index];
        if (item.type === 'heal') {
            this.health = Math.min(this.maxHealth, this.health + item.value);
            console.log(`${this.name} used ${item.name}: Healed for ${item.value}. Current health: ${this.health}`);
        } else if (item.type === 'special') {
            console.log(`Used ${item.name}: Effect - ${item.effect}`);
        }
        // Remove item from inventory after use
        this.inventory.splice(index, 1);
    }

    die() {
        // drop items
        this.inventory.forEach(item => {
            // drop item
        });
        this.sprite.destroy();
        player.statistics.enemies_killed++;
        // remove enemy from enemies array
        enemies.splice(enemies.indexOf(this), 1);
    }
    updateCooldown() {
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
    }
}

class Rat extends Enemy {
    constructor(x, y) {
        super('Rat', 20, 'enemy', 2, x, y, false, new PIXI.Sprite(textures.enemy_rat));
    }

    attack(target) {
        if(this.attackCooldown === 0) {
            let amount = Math.floor(Math.random() * 10 + 1, 10);
            target.onHit(amount);
            this.attackCooldown = 100;
        }
    }
}

class Drunk extends Enemy {
    constructor(x, y) {
        super('Drunk', 50, 'enemy', 0.5, x, y, false, new PIXI.Sprite(textures.enemy_drunk));
    }

    attack(target) {
        if(this.attackCooldown === 0) {
            let amount = Math.floor(Math.random() * 20 + 1, 10);
            target.onHit(amount);
            this.attackCooldown = 100;
        }
    }
}

// assign textures for use
const textures = {
    player: PIXI.Texture.from("img/sprites/player.svg"),
    // player_running: PIXI.Loader.shared.add("img/sprites/player_running.json").load(setup),
    // player_punching_left: PIXI.Texture.from("img/sprites/player_punching_left.png"),
    // player_punching_right: PIXI.Texture.from("img/sprites/player_punching_right.png"),
    landmark: PIXI.Texture.from("img/sprites/landmark.png"),
    enemy: PIXI.Texture.from("img/enemy.png"),
    background: PIXI.Texture.from("img/background.png"),
    // healthBar: PIXI.Texture.from("img/sprites/heart-full.png"),
    vendingmachine: PIXI.Texture.from("img/sprites/vendingmachine.png"),
    enemy_rat: PIXI.Texture.from("img/sprites/rat.png"),
    enemy_drunk: PIXI.Texture.from("img/sprites/drunk.png"),
    player_punching: PIXI.Texture.from("img/sprites/player_punching1.svg")

    // npc_hunter: PIXI.Texture.from("img/sprites/npc_hunter/npc_hunter.gif"),
    // npc_jon: PIXI.Texture.from("img/sprites/npc_jon/npc_jon.gif"),
    // enemy_rat: PIXI.Texture.from("img/sprites/enemy_rat/enemy_rat.gif"),
    // enemy_drunk: PIXI.Texture.from("img/sprites/enemy_drunk/enemy_drunk.gif"),
};

// Background

// utilize the whole background image instead of just a small portion as originally intended
const background = new PIXI.Sprite(textures.background, window.innerWidth, window.innerHeight);
background.position.set(0, 0);
app.stage.addChild(background);

// load player sprite and add to stage
function spawnPlayer() {

    player = new Player();
    player.sprite.anchor.set(0.5);
    player.sprite.width = 64;
    player.sprite.height = 64;
    
    player.sprite.x = app.screen.width / 2;
    player.sprite.y = app.screen.height / 2;
    player.sprite.zIndex = 2;
    player.sprite.scale.set(4);
    app.stage.addChild(player.sprite);
    // return player;

    if (!app.ticker.started) {
        console.log("Starting game loop...");
        app.ticker.add(update);
    }
}

spawnPlayer();

// player respawning
function respawnPlayer() {
    console.log("Respawning player...");
    spawnPlayer();

    // Reset HUD and player stats if needed
    player.health = player.maxHealth;
    player.statistics = {
        time_played: 0,
        damage_dealt: 0,
        damage_taken: 0,
        enemies_killed: 0,
        items_collected: 0,
        items_used: 0,
        landmarks_visited: 0,
        special_events: 0,
        healed: 0,
    };

    // Update the HUD
    if (survival_mode) {
        updateHUD(player.name, 1, player.health, player.maxHealth, "00:00", []);
    }
}

function updateHUD(name, level, health, maxHealth, elapsedTime, buffs) {
    document.getElementById('character-name').textContent = name;
    document.getElementById('character-health').textContent = `${health} / ${maxHealth}`;
    document.getElementById('elapsed-time').textContent = elapsedTime;

    // Update health bar width
    const healthPercentage = (health / maxHealth) * 100;
    document.getElementById('health-bar').style.width = `${healthPercentage}%`;

    // Update buffs/debuffs
    const buffContainer = document.getElementById('buff-icons');
    buffContainer.innerHTML = ''; // Clear existing icons
    buffs.forEach(buff => {
        const img = document.createElement('img');
        img.src = buff.icon;
        img.alt = buff.name;
        img.className = 'w-6 h-6';
        buffContainer.appendChild(img);
    });
}

// player health

// use heart sprite for health bar
// const healthBar = new PIXI.Sprite(textures.healthBar);
// healthBar.anchor.set(0.5);
// healthBar.x = 50;
// healthBar.y = 50;
// healthBar.zIndex = 1;
// healthBar.scale.set(2);
// app.stage.addChild(healthBar);

// const healthBar = new PIXI.Graphics();
// healthBar.beginFill(0x00ff00);
// healthBar.drawRect(10, 10, 200, 20);
// healthBar.endFill();
// app.stage.addChild(healthBar);

// Game objects
const gameObjects = [
    { x: 200, y: 150, type: 'landmark', name: 'sakae', info: 'A popular street filled with restaurants and izakayas', item: { name: 'Beer', type: 'heal', value: 5 }, sprite: null },
    { x: -300, y: -200, type: 'landmark', name: 'bigbox', info: 'An entertainment hub for Takadanobaba, and an iconic symbol from the 80s.', item: { name: '???', type: 'special', effect: 'Unlock Lore' }, sprite: textures.sprite_bigbox },
    { x: 100, y: 100, type: 'vendingmachine', name: '自販機', info: '自販機', item: { name: 'Soda', type: 'heal', value: 10 }, sprite: null },
    { x: 300, y: 200, type: 'vendingmachine', name: '自販機', info: '自販機', item: { name: 'Soda', type: 'heal', value: 10 }, sprite: null }

];

// place landmarks on the map
gameObjects.forEach(obj => {
    switch (obj.type) {
        case 'landmark':
            let landmark_texture = new PIXI.Sprite(textures.landmark);
            landmark_texture.anchor.set(0.5);
            landmark_texture.zIndex = 3;
            landmark_texture.x = obj.x + app.screen.width / 2;
            landmark_texture.y = obj.y + app.screen.height / 2;
            landmark_texture.width = 128; // TODO: make it not blurry as shit wtf
            landmark_texture.height = 128;
            obj.sprite = landmark_texture;
            app.stage.addChild(landmark_texture);
            break;
        case 'vendingmachine':
            let vendingmachine_texture = new PIXI.Sprite(textures.vendingmachine);
            vendingmachine_texture.anchor.set(0.5);
            vendingmachine_texture.zIndex = 3;
            vendingmachine_texture.x = obj.x + app.screen.width / 2;
            vendingmachine_texture.y = obj.y + app.screen.height / 2;
            // vendingmachine_texture.width = 64;
            // vendingmachine_texture.height = 64;
            vendingmachine_texture.scale.set(1.5);
            obj.sprite = vendingmachine_texture;
            app.stage.addChild(vendingmachine_texture);
            break;
    }
});

// enemies (spawned on map first maybe)
const enemies = [];

// State
const keys = {};
let actionCooldown = 0;

// Inventory UI
const inventoryElement = document.getElementById('inventory');
const inventoryList = document.getElementById('inventory-list');

// Inventory functions
function toggleInventory() {
    if (inventoryElement.style.display === 'none') {
        inventoryElement.style.display = 'block';
        updateInventoryUI();
    } else {
        inventoryElement.style.display = 'none';
    }
}

// Update inventory UI
function updateInventoryUI() {
    inventoryList.innerHTML = '';
    player.inventory.forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = `${item.name} (${item.type})`;
        li.dataset.index = index;
        li.addEventListener('click', () => player.useItem(index));
        inventoryList.appendChild(li);
    });
}

// Primary game loop
function update(delta) {

    if (survival_mode) {
        game_hud_div.innerHTML = `
        <div class="top-[5rem] bg-white text-black p-4 m-4 rounded-lg shadow-lg z-40 w-64">
                <div class="flex items-center space-x-4">
                    <img src="img/sprites/player.svg" class="w-12 h-12 rounded-full border-2 border-black">
                    <div>
                        <h2 class="text-lg font-bold" id="character-name">Player</h2>
                    </div>
                </div>
                <div class="mt-4">
                    <div class="text-sm font-semibold">HP</div>
                    <div class="relative">
                        <div class="absolute top-0 left-0 h-4 bg-red-600 rounded-full" style="width: 75%;" id="health-bar"></div>
                        <div class="h-4 bg-gray-500 rounded-full"></div>
                    </div>
                    <span class="text-sm text-gray-300" id="character-health"></span>
                </div>
                <div class="mt-4">
                    <div class="flex justify-between items-center">
                        <div class="text-sm">
                            <span class="font-semibold">存続時間:</span> <span id="elapsed-time">00:00</span>
                        </div>
                        <div class="flex space-x-2" id="buff-icons">
                        </div>
                    </div>
                </div>
            </div>`;
    } else {
        game_hud_div.innerHTML = '';
    }

    if (!player) return;

    // Movement
    const move = { x: 0, y: 0 };
    if (keys['KeyW'] || keys['ArrowUp']) {
        move.y = playerSpeed;
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        move.y = -playerSpeed;
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
        move.x = playerSpeed;
        player.sprite.scale.x = 1;
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        move.x = -playerSpeed;
        player.sprite.scale.x = -1;
    }
    if (keys['KeyP']) console.log(player);
    if (keys['KeyM'] && !keys['KeyM'].handled) {
        toggleMinimap();
        keys['KeyM'].handled = true;
    }

    const newX = player.x + move.x;
    const newY = player.y + move.y;

    // background limits
    const bgLeft = background.x;
    const bgTop = background.y;
    const bgRight = background.x + background.width;
    const bgBottom = background.y + background.height;

    // move background (to simulate player movement)
    background.x += move.x;
    background.y += move.y;

    // prevent player from moving beyond the background
    // if (newX > bgRight || newX < bgLeft) move.x = 0;
    // if (newY > bgBottom || newY < bgTop) move.y = 0;

    // move objects with the map
    gameObjects.forEach(obj => {

        obj.sprite.x += move.x;
        obj.sprite.y += move.y;
    });

    // update hud
    // Calculate time played
    const currentTime = Date.now();
    const timePlayed = Math.floor((currentTime - player.spawn_time) / 1000);
    const minutes = Math.floor(timePlayed / 60);
    const seconds = timePlayed % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update HUD with time played
    if (survival_mode) {
        updateHUD(player.name, 1, player.health, player.maxHealth, formattedTime, []);
    }
    
    // Enemy logic loop
    enemies.forEach(enemy => {
        enemy.sprite.x += move.x;
        enemy.sprite.y += move.y;
        enemy.sprite.width = 60;
        enemy.sprite.height = 60;

        // get enemy object
        // console.log(enemy);

        // enemies move to attack player
        const dx = player.sprite.x - enemy.sprite.x;
        const dy = player.sprite.y - enemy.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        

        // flip the sprite based on direction of movement
        enemy.sprite.scale.x = dx > 0 ? -1 : 1;

        // enemies will attack player if within aggro radius, and cooldown is 0 seconds
        enemy.updateCooldown();

        if (dist <= aggro_radius) {
            // console.log(`Enemy ${enemy.name} (${enemy.uid}) is attacking player!`);
            if (dist > enemy_attack_range) {
                enemy.sprite.x += (dx / dist) * enemy.speed;
                enemy.sprite.y += (dy / dist) * enemy.speed;
            }
            if (dist <= enemy_attack_range && enemy.attackCooldown === 0) enemy.attack(player);
        }

    });

    // interact key handling
    if (keys['Space'] && actionCooldown <= 0) {
        performAction();
        actionCooldown = 20;
        // let dist = 5;
        // // add code to attack enemies within close proximity
        // if (dist <= interactionRadius) {
        //     // attack enemy
        //     console.log(`Attacked ${enemy.name} (${enemy.uid})!`);
        //     player.attack(enemy);
        // }

        let closest = closestEnemy(); // get closest enemy
        // console.log(closest);
        if (closest && typeof closest.onHit === 'function') {
            console.log(`Attacked ${closest.name} (${closest.uid})!`);

            // Change the player sprite to a punching sprite
            player.sprite.visible = false;
            player.sprite_punching.visible = true;
            player.sprite_punching.anchor.set(player.sprite.anchor.x, player.sprite.anchor.y);
            player.sprite_punching.x = player.sprite.x;
            player.sprite_punching.y = player.sprite.y;
            player.sprite_punching.scale.x = player.sprite.scale.x;
            player.sprite_punching.scale.y = player.sprite.scale.y;
            app.stage.addChild(player.sprite_punching);

            // face the player towards the enemy that is being attacked
            player.sprite_punching.scale.x = closest.sprite.x > player.sprite.x ? -1 : 1;
            

            player.attack(closest);

            // change the sprite back after 0.5 seconds
            setTimeout(() => {
                player.sprite.visible = true;
                player.sprite_punching.visible = false;
                app.stage.removeChild(player.sprite_punching);
            }, 500);

            
            if (closest.health <= 0) {
                closest.die();
            } else {
                console.log(`No valid target`);
            }
        }
    }

    if (actionCooldown > 0) actionCooldown--;

    // Update health bar
    // healthBar.clear();
    // healthBar.beginFill(0x00ff00);
    // healthBar.drawRect(10, 10, (player.health / player.maxHealth) * 200, 20);
    // healthBar.endFill();
    // console.log(playerState);
}

// interact function
function performAction() {
    let interacted = false;

    // Check gameObjects for interaction
    for (const obj of gameObjects) {
        const dx = player.sprite.x - obj.sprite.x;
        const dy = player.sprite.y - obj.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // console.log(`Nearest obj: ${obj.name} (${obj.type}) - Distance: ${dist}`);

        if (dist <= interactionRadius) {
            switch (obj.type) {
                case 'landmark':
                    player.statistics.landmarks_visited++;
                    console.log(`Interacted with ${obj.name}: ${obj.info}`);
                    player.addItem(obj.item);
                    console.log(`Added to inventory: ${obj.item.name}`);
                    obj.sprite.alpha = 0.5; // Feedback for interaction
                    openModal(obj.name);
                    interacted = true;
                    break;
                case 'vendingmachine':
                    console.log(`Interacted with ${obj.name}: ${obj.info}`);
                    player.addItem(obj.item);
                    console.log(`Added to inventory: ${obj.item.name}`);
                    obj.sprite.alpha = 0.5; // Feedback for interaction
                    interacted = true;
                    break;
                // case 'enemy':
                //     console.log(`Attacked ${obj.name} (${obj.uid})!`);
                //     player.attack(obj);

            }
            // console.log(`Interacted with ${obj.name}: ${obj.info}`);
            // playerState.inventory.push(obj.item);
            // console.log(`Added to inventory: ${obj.item.name}`);
            // obj.sprite.alpha = 0.5; // Feedback for interaction
            // interacted = true;
            // break;
        }
    }
}

function openModal(id) {
    console.log(`Opening modal for ${id}`);
    player.invincible = true;
    let modalContent = {
        'bigbox': {
            title: 'Big Box',
            image: 'img/landmarks/bigbox.jpg',
            body: `<p>高田馬場のランドマーク、Big Box！中にはお店、レストラン、フィットネスクラブ、ゲームセンターまでたっぷりあるよ！なんてこった！窓はどこ！？そうですね：Big Boxには窓がない。だから、基本的に時間を知ることは不可能です！深夜だとわかるのは、追い出されたときだけだ。結構楽しいよ！僕と友達はここで数え切れないほどの時間を過ごした。懐かしい思い出だ。ほとんどが強制送還されてしまったのが残念だ。</p>`
        },
        'sakae': {
            title: 'さかえ通り',
            image: 'img/landmarks/sakae.jpg',
            body: `この道には居酒屋、レストラン、屋台、バー、クラブが一杯あるよ！この狭い通りにどれだけの人がいるかわかる？それがこの地域がいかに活気に満ちているかを物語っている。絶対に退屈しない！あ、見てくれ！動物園のネズミが戻ってきた！(厳重警告：ネズミを撫でないでください）`
        },
        'rotary': {
            title: '高田馬場駅前ロータリー',
            image: 'img/landmarks/rotary.jpg',
            body: `こっちはタバコを吸ったり、お酒を飲んだりする場所ですよ。「ここは喫煙禁止」と書かれた掲示が見える？ここの人たちはそれを提案として受け止めているんだ。マジでクレイジーでしょ？！ロータリーはいつも人間で賑わっているから、たまには遊びにおいでよね！このエリアは飲んだ後に友達たちとたむろするのに最適な場所だ！特に居酒屋でビールを一杯飲んだ後は、夜風がとても爽やかだ！しかし、エンターテインメントはそれだけではありまーーーーーーせん！たまにネズミを見ることもできる。まるで動物園だ！（警告：ネズミを撫でないでください。）`
        },
        '自販機': {
            title: '自販機',
            image: 'img/landmarks/vendingmachine.jpg',
            body: `もし1000円あったら、この秘密の自販機を見つけに来てね！本当に不思議な自販機です。何が出てくるかはランダムだけど、多分めっちゃくちゃカッコイイよ！ほら、あの変人も懐中電灯を手に入れたよ！どこにあるかは教えませんけどｗｗｗｗ。高田馬場を探検しに来てね！`
        },
        'mural': {
            title: '手塚の壁画',
            image: 'img/landmarks/mural.jpg',
            body: `あっ、鉄腕アトムがいる。何でここにいるんだろう？まあ、ここで生まれたからだよ！そうです！世界的な漫画家、手塚治虫様がこの高田馬場で鉄腕アトムを生み出したのだ！手塚治虫様は大阪で生まれだけど、ほぼ一生を高田馬場で過ごしたんだ。だから、手塚様が亡くなったとき、生涯を記念する壁画が作られた。この壁画には、彼の他の作品も祀られている。`
        },
        'unnamed-street': {
            title: '不明通り',
            image: 'img/landmarks/unnamed-street.jpg',
            body: `この通りが見えますか？高田馬場で日本語学校に通っていた頃、毎日のように通った道だ。いい思い出がたくさんあります。この白いパーカーを着ている男がいるでしょ？高田馬場で出会った親友だ。`
        },
        'takadanobaba': {
            title: '高田馬場概要',
            image: 'img/landmarks/takadanobaba.jpg',
            body: `ここ高田馬場は新宿区の大学生、日本語学習者の拠点！教育の中心地みたいね！新しい出会える人もたくさんいるよ。見どころ満載です！ほらー、きてきて！`
        }
    }

    const modal = document.getElementById('infobox-modal');
    const modalTitle = document.getElementById('infobox-title');
    const modalBodyText = document.getElementById('infobox-body-text');
    const modalBodyImage = document.getElementById('infobox-body-img');
    const modalClose = document.getElementById('infobox-actions');

    modalTitle.textContent = modalContent[id].title;
    modalBodyText.innerHTML = modalContent[id].body;
    modalBodyImage.src = modalContent[id].image;

    modal.style.display = 'flex';
    modalClose.addEventListener('click', () => {
        closeModal();
    });
    
}

function gameOver() {
    enemies.forEach(enemy => enemy.die());
    player.die();
    clearInterval(enemySpawnTimer);

    // toggle gameover modal
    const modal = document.getElementById('gameover-modal');
    modal.style.display = 'flex';

    // display statistics
    const stat_time_played = document.getElementById('player-time_played');
    const stat_damage_dealt = document.getElementById('player-damage_dealt');
    const stat_damage_taken = document.getElementById('player-damage_taken');
    const stat_enemies_killed = document.getElementById('player-enemies_killed');
    const stat_items_collected = document.getElementById('player-items_collected');
    const stat_items_used = document.getElementById('player-items_used');
    const stat_landmarks_visited = document.getElementById('player-landmarks_visited');
    // const stat_special_events = document.getElementById('player-special_events');
    const stat_healed = document.getElementById('player-healed');
    const stat_total_score = document.getElementById('player-total_score');

    stat_time_played.textContent = player.statistics.time_played;
    stat_damage_dealt.textContent = player.statistics.damage_dealt;
    stat_damage_taken.textContent = player.statistics.damage_taken;
    stat_enemies_killed.textContent = player.statistics.enemies_killed;
    stat_items_collected.textContent = player.statistics.items_collected;
    stat_items_used.textContent = player.statistics.items_used;
    stat_landmarks_visited.textContent = player.statistics.landmarks_visited;
    // stat_special_events.textContent = player.statistics.special_events;
    stat_healed.textContent = player.statistics.healed;

    // calculate total score
    let total_score = (player.statistics.damage_dealt - player.statistics.damage_taken + player.statistics.enemies_killed - player.statistics.healed) * player.statistics.landmarks_visited;

    stat_total_score.textContent = total_score;

}
function closeModal() {
    const modal = document.getElementById('infobox-modal');
    modal.style.display = 'none';
    player.invincible = false;

    enemies.forEach(enemy => {
        const dx = enemy.sprite.x - player.sprite.x;
        const dy = enemy.sprite.y - player.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= modal_pushback_radius) {
            let pushbackX = (dx / dist) * modal_pushback_distance;
            let pushbackY = (dy / dist) * modal_pushback_distance;

            enemy.sprite.x += pushbackX;
            enemy.sprite.y += pushbackY;
        }
    });
}

// let minimapToggleCooldown = false;

function toggleMinimap() {
    // if (minimapToggleCooldown) return;

    const minimap = document.getElementById('minimap');
    if (minimap.style.display === 'none') {
        minimap.style.display = 'flex';
    } else {
        minimap.style.display = 'none';
    }

    // minimapToggleCooldown = true;
    // setTimeout(() => {
    //     minimapToggleCooldown = false;
    // }, 500); // 500ms cooldown
}

// Spawn enemies
function spawnEnemy(type = "") {
    // spawn more enemies at once the longer the game goes on
    if (enemies.length > 10) {
        clearInterval(enemySpawnTimer);
        enemySpawnTimer = setInterval(spawnEnemy, enemySpawnInterval / 2);
    }

    let enemy;
    if (Math.random() > 0.5 || type === 'rat') {
        enemy = new Rat(Math.random() * 1920 - 960, Math.random() * 1080 - 540);
    } else {
        enemy = new Drunk(Math.random() * 1920 - 960, Math.random() * 1080 - 540);
        // enemy.sprite.scale(2);
    }
    // console.log(enemy.speed);

    // Ensure the sprite is fully configured
    enemy.sprite.anchor.set(0.5);
    enemy.sprite.x = enemy.x + app.screen.width / 2;
    enemy.sprite.y = enemy.y + app.screen.height / 2;
    // enemy.sprite.width = 60;
    // enemy.sprite.height = 60;

    // Add enemy to global enemies array and to the stage
    enemies.push(enemy);
    app.stage.addChild(enemy.sprite);

    console.log(`Spawned enemy (${enemy.name}):`, enemy);
    return enemy;
}

// Get closest enemy to player. Returns null if no enemies are nearby, otherwise return Enemy object
function closestEnemy() {
    let closest = null;
    let closestDist = 100; // max distance
    enemies.forEach(enemy => {
        const dx = player.sprite.x - enemy.sprite.x;
        const dy = player.sprite.y - enemy.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
            closest = enemy;
            closestDist = dist;
            console.log(`Closest enemy: ${closest.name} (${closest.uid}) - Distance: ${closestDist}`);
        }
    });
    return closest;
}

// Event listeners
window.addEventListener('keydown', e => {
    keys[e.code] = true;

    // inventory with "I"
    if (e.code === 'KeyI') {
        toggleInventory();
        console.log("Inventory toggled");
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

if (survival_mode) {
    enemySpawnTimer = setInterval(spawnEnemy, enemySpawnInterval);
}

// Start the game loop
app.ticker.add(update);