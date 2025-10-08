# Swimming Tank - Interactive 3D File Explorer

A Three.js-based underwater swimming simulation where you navigate through floating file folders in first-person view with animated swimming arms.

## 🏊‍♂️ Features

- **First-Person Swimming**: Experience swimming with animated arms that move realistically
- **Underwater Environment**: Immersive underwater atmosphere with lighting and particle effects  
- **File Folders**: Navigate around 50+ floating file folders with legible labels
- **Physics & Collisions**: Bump into and navigate around obstacles naturally
- **Smooth Controls**: WASD movement with mouse look and vertical swimming controls

## 🎮 Controls

| Control | Action |
|---------|--------|
| **WASD** | Move around (forward/backward/left/right) |
| **Mouse** | Look around (click to lock cursor) |
| **Space** | Swim up |
| **Shift** | Swim down |

## 🚀 Getting Started

1. Open `swimming-tank.html` in a modern web browser
2. Click anywhere to lock the mouse cursor
3. Use WASD keys to swim around
4. Navigate through the floating file folders!

## 📁 Project Structure

```
swimming-tank/
├── swimming-tank.html    # Main HTML file
├── swimming-tank.js      # Core application logic
├── styles.css           # Stylesheet
└── README.md           # This file
```

## 🏗️ Architecture

The project is organized using object-oriented design:

### `SwimmingTank` Class
The main application class that handles:
- **Scene Management**: Three.js scene, camera, renderer setup
- **Environment**: Underwater lighting, particles, atmosphere
- **Animation Systems**: Swimming arms, floating folders, water effects
- **Physics**: Movement, collision detection, floating behavior
- **Controls**: Mouse look, keyboard input, pointer lock

### Key Methods
- `createSwimmingArms()` - Creates first-person animated arms
- `createFileFolders()` - Generates floating file folders with labels
- `updateMovement()` - Handles physics-based movement
- `updateSwimmingAnimation()` - Animates arms based on movement
- `checkCollisions()` - Handles folder collision detection

## 🎨 Technical Details

- **Renderer**: WebGL with antialiasing
- **Lighting**: Ambient + directional lighting for underwater effect
- **Particles**: 2000+ floating particles for water atmosphere
- **Text Labels**: Canvas-generated textures for folder names
- **Animation**: 60fps requestAnimationFrame loop
- **Controls**: Pointer Lock API for mouse look

## 🔧 Customization

You can easily customize the experience by modifying the configuration in `SwimmingTank`:

```javascript
this.config = {
    movement: {
        speed: 20.0,           // Swimming speed
        friction: 10.0,        // Movement friction
        verticalSpeed: 15.0,   // Up/down swimming speed
        mouseSensitivity: 0.002 // Mouse look sensitivity
    },
    swimming: {
        strokeSpeed: 4,        // Arm stroke frequency
        strokeAmplitude: 0.8,  // Arm stroke range
        floatSpeed: 0.5,       // Idle floating speed
        floatAmplitude: 0.1    // Idle floating range
    },
    world: {
        folderCount: 50,       // Number of folders
        worldSize: 80,         // World boundaries
        collisionDistance: 2   // Collision detection radius
    }
};
```

## 🌊 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires WebGL support and modern JavaScript features.

## 📝 License

Open source - feel free to modify and use for your own projects!