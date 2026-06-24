# Mini Golf Mania ⛳

![Mini Golf Mania Logo](https://github.com/LCmaster/minigolf/assets/930046/74666a39-84b5-4d60-8120-79c0f4ee9211)

**Play online:** [minigolfmania.vercel.app](https://minigolfmania.vercel.app/)

Mini Golf Mania is a fully-featured, 3D web-based mini golf game built with SvelteKit and Threlte. Play custom courses, challenge yourself for the best par score, and even create your own custom levels with the built-in spline-based level editor!

---

## ✨ Features

- **Immersive 3D Gameplay**: Fully realized 3D physics and rendering using Three.js and Rapier physics engines.
- **Classic Scoring System**: Authentic golf scoring terminology from Hole-in-One and Albatross down to Bogey and beyond.
- **Spline-Based Level Editor**: Build tracks by plotting control points—the editor automatically generates beautiful, playable tracks with walls, start/end zones, and physically accurate colliders!
- **Cloud Save & User Accounts**: Log in to save your levels to the cloud, share them with others, and load community creations.
- **Export/Import Levels**: Export your courses as `.zip` config packages and import them to iterate on your designs locally.

## 🛠️ Technology Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/)
- **3D Rendering**: [Three.js](https://threejs.org/) via [Threlte](https://threlte.xyz/)
- **Physics**: [Rapier](https://rapier.rs/) via `@threlte/rapier`
- **Styling**: [TailwindCSS](https://tailwindcss.com/) & [Skeleton UI](https://www.skeleton.dev/)
- **Backend/Auth**: Firebase

---

## 🚀 Getting Started

Follow these steps to run the game locally on your machine for development or custom level creation.

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- `npm`

### Installation

1. Clone the repository and navigate into the folder:
   ```bash
   git clone https://github.com/LCmaster/minigolf.git
   cd minigolf
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

---

## 🎮 How to Play

1. **Select a Course**: Pick one of the default courses or load a custom one from the cloud or your hard drive.
2. **Aim**: Click and drag from your ball to determine the power and angle of your putt.
3. **Shoot**: Release your mouse to swing. Try to sink the ball in as few strokes as possible!
4. **Complete the Course**: Finish all the holes to see your final scorecard and your total par rating.

## 🏗️ Level Editor

The built-in Level Editor is a powerful tool designed directly into the game.
- **Add Points**: Click to place control points. The track will bend and snap to create a smooth, putt-able path automatically.
- **Shape Ends**: Set the start and end of your track to either square or rounded.
- **Test In-Browser**: Hit play directly in the editor to preview your physics.
- **Save/Export**: Use the right-hand drawer to Export your map or save it to your linked account.

---

## 🗺️ Roadmap & TODOs

### Completed (v1.0.0)
- [x] Core 3D Game mechanics & Physics
- [x] Advanced Spline Level Editor
- [x] Firebase User accounts and Cloud Saves
- [x] Level settings (Level Name, Par, Physics Materials)
- [x] Block creator (custom obstacles)
- [x] Moving blocks/dynamic obstacles (e.g. Windmill)
- [x] Environment and Skybox customization
- [x] Level bundling support (campaigns and 18-hole courses)

### Completed (v1.5.0)
- [x] **Procedural Spline Generation**: A completely new random course generator using spline-math, tangent-aligned obstacles, and Poisson disk scenery scattering.
- [x] **Terrain Features**: Added low-poly, cel-shaded cartoon trees, rocks, and grass tufts to the level editor for vibrant visual scenery.
- [x] **Role-Based Access Control**: Player, Creator, and Admin roles to restrict level creation and management.
- [x] **User Profiles & Customization**: Editable Nickname, Ball Color, and Trail selection.
- [x] **Campaign Visibility & Curation**: Public/Private visibility toggles and Official Status markings for campaigns.
- [x] **Physics Audio**: Satisfying thwack sounds, rolling noise, and bounce effects.

### V2 Roadmap
- [ ] **Community Discovery**: A public "Discover" page to browse and play community-created courses.
- [ ] **Rating System**: Upvotes, difficulty ratings, and play-counts for public levels.
- [ ] **Global Leaderboards**: Track best par scores/speedrun times for all courses.
- [ ] **Undo/Redo System**: Expanded editor history stack with Ctrl+Z/Ctrl+Y keyboard shortcuts for fast level iteration.
- [ ] **Campaign Progression**: System to lock advanced official campaigns until the player meets par requirements on earlier campaigns.
- [ ] **Ambient Music**:
  - [x] "Clear Day" Theme (Acoustic)
  - [ ] "Sunset" Theme (Lo-fi / Chillhop)
  - [ ] "Night" Theme (Jazz / Atmospheric)
  - [ ] "Vaporwave" Theme (Synthwave / Retrowave)
- [ ] **Mobile Touch Controls**: Responsive touch-and-drag/joystick controls for mobile and tablets.
- [ ] **Async Multiplayer**: Turn-based challenges to compete asynchronously on campaigns.
- [ ] **Real-time Lobbies**: Sync ball positions for up to 4 players simultaneously (no player-collision).

---

## 📜 License

Mini Golf Mania is released under the [MIT License](https://choosealicense.com/licenses/mit/). Feel free to use, modify, and distribute the project in accordance with the terms specified in the license.
