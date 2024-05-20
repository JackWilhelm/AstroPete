class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 4000;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1200;
        this.JUMP_VELOCITY = -400;
        this.PARTICLE_VELOCITY = 50;
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 120, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");
        this.indtileset = this.map.addTilesetImage("kenny_industrymap_packed", "indmap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);
        //this.groundLayer.setScale(2.0);
        this.waterLayer = this.map.createLayer("Water", this.tileset, 0, 0);
        //this.waterLayer.setScale(2.0);
        this.indLayer = this.map.createLayer("Industry", this.indtileset, 0, 0);
        //this.indLayer.setScale(2.0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        this.waterLayer.setCollisionByProperty({
            drown: true
        });

        this.indLayer.setCollisionByProperty({
            collides: true
        });

        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(game.config.width/4-300, game.config.height/2-150, "platformer_characters", "tile_0000.png").setScale(SCALE)
        my.sprite.player.setCollideWorldBounds(true);
        my.sprite.player.setMaxVelocity(300, 1000);
        my.sprite.player.setScale(1);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);
        this.physics.add.collider(my.sprite.player, this.waterLayer, () => my.sprite.player.setPosition(game.config.width/4-300, game.config.height/2-150));
        this.physics.add.collider(my.sprite.player, this.indLayer);

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(2);

        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['circle_01.png', 'circle_02.png', 'circle_03.png'],
            scale: {start: 0.01, end: 0.02},
            lifespan: 350,
            gravityY: -400,
            alpha: {start: 1, end: 0.1},
        });

        my.vfx.walking.stop();

        my.vfx.jumping = this.add.particles(0, 0, "kenny-particles", {
            frame: ['muzzle_01.png', 'muzzle_02.png', 'muzzle_03.png'],
            scale: 0.1,
            lifespan: 200,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.jumping.stop();

        my.vfx.landing = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_01.png', 'smoke_02.png', 'smoke_03.png'],
            scale: {start: 0.1, end: 0.01},
            lifespan: 400,
            random: true,
            alpha: {start: 0.5, end: 0.1}, 
            quantity: 20
        });

        my.vfx.landing.stop();

        my.vfx.collecting = this.add.particles(0, 0, "kenny-particles", {
            frame: "symbol_02.png",
            radial: true,
            angle: {min:180, max: 360, step: 10},
            scale: {start: 0.1, end: 0.01},
            lifespan: 800,
            duration: 800,
            speed: this.PARTICLE_VELOCITY*2,
            alpha: {start: 1, end: 0.1}, 
            stopAfter: 5
        });

        my.vfx.collecting.stop();

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);

        this.coinGroup = this.add.group(this.coins);

        this.flags = this.map.createFromObjects("Objects", [{
            name: "flag",
            key: "tilemap_sheet",
            frame: 111
        },{
            name: "flagpole",
            key: "tilemap_sheet",
            frame: 131
        }]);

        this.physics.world.enable(this.flags, Phaser.Physics.Arcade.STATIC_BODY);

        this.flagGroup = this.add.group(this.flags);

        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            my.vfx.collecting.startFollow(obj2, obj2.displayWidth/2, obj2.displayHeight/2, false);

            my.vfx.collecting.start();


            obj2.destroy(); // remove coin on overlap

            this.playerCollect.play();
        });

        this.physics.add.overlap(my.sprite.player, this.flagGroup, (obj1, obj2) => {
            console.log("you win");
        });

        this.inAir = false;

        this.playerLand = this.sound.add("playerLand");
        this.playerCollect = this.sound.add("playerCollect");
        this.playerJump = this.sound.add("playerJump");
    }

    update() {
        if(cursors.left.isDown) {
            // TODO: have the player accelerate to the left
            my.sprite.player.body.setAccelerationX(-this.ACCELERATION);
            
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);

            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }

        } else if(cursors.right.isDown) {
            // TODO: have the player accelerate to the right
            my.sprite.player.body.setAccelerationX(this.ACCELERATION);

            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);

            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-20, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(-this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            
            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }
        } else {
            // TODO: set acceleration to 0 and have DRAG take over
            my.sprite.player.body.setAccelerationX(0);
            my.sprite.player.body.setDragX(this.DRAG);

            my.sprite.player.anims.play('idle');
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
            this.InAir = true;
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            // TODO: set a Y velocity to have the player "jump" upwards (negative Y direction)
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            my.vfx.jumping.startFollow(my.sprite.player, 0, 0, false);

            my.vfx.jumping.start();

            this.playerJump.play();
        } else {
            my.vfx.jumping.stop();
        }
        if(my.sprite.player.body.blocked.down && this.InAir) {
            this.InAir = false;
            my.vfx.landing.startFollow(my.sprite.player, 0, my.sprite.player.displayHeight/2-5, false);

            my.vfx.landing.setParticleSpeed(-this.PARTICLE_VELOCITY, 0);

            my.vfx.landing.start();

            this.playerLand.play();
        } else {
            my.vfx.landing.stop();
        }
    }
}