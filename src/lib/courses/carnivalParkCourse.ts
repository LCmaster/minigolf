/**
 * carnivalParkCourse.ts
 * "Carnival Park" showcase course featuring Hole 1: "Sunny Creek & Midway Bend",
 * reconstructed purely from modular 6m kitbash tiles and Carnival/Nature props.
 */

import type { CourseData } from "$lib/engine/types/CourseSchema";

export const carnivalParkCourse: CourseData = {
  id: "course_carnival_park_showcase",
  name: "Carnival Park Showcase",
  theme: "carnival_park",
  authorId: "deepmind_antigravity",
  authorName: "Antigravity Arcade",
  createdAt: 1731283200000,
  updatedAt: 1731283200000,
  holes: [
    {
      holeNumber: 1,
      par: 3,
      teeTileId: "sc_tee",
      cupTileId: "sc_cup",
      showBoundary: true,
      tiles: [
        // 1. Elevated Tee-Off Plateau (+1.5m hill knoll)
        {
          instanceId: "sc_tee",
          kitPieceId: "carnival_tee_6x6",
          position: [0, 1.5, 6.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "sc_ramp_down" },
        },
        // 2. Downhill 15deg Ramp (1.5m -> 0.0m)
        {
          instanceId: "sc_ramp_down",
          kitPieceId: "carnival_ramp_down_15deg_6x6",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "sc_tee",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: {
            LOC_Socket_In: "sc_tee",
            LOC_Socket_Out: "sc_turn_90",
          },
        },
        // 3. Banked / Curved 90deg Bend turning right (+X)
        {
          instanceId: "sc_turn_90",
          kitPieceId: "carnival_turn_90deg_rounded",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "sc_ramp_down",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: {
            LOC_Socket_In: "sc_ramp_down",
            LOC_Socket_Out: "sc_bridge_pond",
          },
        },
        // 4. Arched Wooden Plank Bridge over Stone-Rimmed Turquoise Pond
        {
          instanceId: "sc_bridge_pond",
          kitPieceId: "carnival_bridge_pond_6x12",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "sc_turn_90",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: {
            LOC_Socket_In: "sc_turn_90",
            LOC_Socket_Out: "sc_ramp_up",
          },
        },
        // 5. Uphill 15deg Ramp climbing onto the Putting Green (+1.5m)
        {
          instanceId: "sc_ramp_up",
          kitPieceId: "carnival_ramp_up_15deg_6x6",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "sc_bridge_pond",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: {
            LOC_Socket_In: "sc_bridge_pond",
            LOC_Socket_Out: "sc_cup",
          },
        },
        // 6. Elevated Putting Green with Stone & Timber Backstop Wall
        {
          instanceId: "sc_cup",
          kitPieceId: "carnival_green_cup_6x6",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "sc_ramp_up",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: {
            LOC_Socket_In: "sc_ramp_up",
          },
        },
      ],
      props: [
        // Hill knolls cradling the elevated tee and elevated putting green
        {
          instanceId: "sc_knoll_tee",
          propId: "terrain_hill_knoll_6x6",
          position: [0, 0, 6.0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        {
          instanceId: "sc_knoll_green",
          propId: "terrain_hill_knoll_6x6",
          position: [27.0, 0, -9.0],
          rotation: [0, 45, 0],
          scale: [1, 1, 1],
        },
        // Carnival Entry Archway straddling the tee box
        {
          instanceId: "sc_arch",
          propId: "prop_carnival_arch_6m",
          position: [0, 1.5, 8.2],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        // Curve bumper pegs inside the 90deg bend
        {
          instanceId: "sc_bumper_1",
          propId: "prop_bumper_peg_yellow",
          position: [1.5, 0, -5.8],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        {
          instanceId: "sc_bumper_2",
          propId: "prop_bumper_peg_blue",
          position: [3.8, 0, -7.6],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        // Extended pond patch beside the bridge for a fuller creek look
        {
          instanceId: "sc_pond_ext",
          propId: "terrain_pond_patch_6x6",
          position: [12.0, 0, -14.8],
          rotation: [0, 20, 0],
          scale: [1.1, 1, 1.1],
        },
        // Landmark boulders around curve and pond bank
        {
          instanceId: "sc_boulder_inner",
          propId: "prop_boulder_faceted",
          position: [6.4, 0, -2.5],
          rotation: [0, 25, 0],
          scale: [1.3, 1.2, 1.3],
        },
        {
          instanceId: "sc_boulder_outer",
          propId: "prop_boulder_faceted",
          position: [-5.2, 0, -7.2],
          rotation: [0, 110, 0],
          scale: [1.15, 1.1, 1.15],
        },
        // Lanterns & colorful bunting framing the back meadow
        {
          instanceId: "sc_lantern_bunting",
          propId: "prop_lantern_bunting",
          position: [12.0, 0, 1.8],
          rotation: [0, 0, 0],
          scale: [1.15, 1.15, 1.15],
        },
        // Cartoon puffy trees framing the course
        {
          instanceId: "sc_tree_1",
          propId: "prop_tree_puffy",
          position: [-6.5, 0, 7.2],
          rotation: [0, 15, 0],
          scale: [1.1, 1.1, 1.1],
        },
        {
          instanceId: "sc_tree_2",
          propId: "prop_tree_puffy",
          position: [-6.8, 0, 0.5],
          rotation: [0, 70, 0],
          scale: [0.95, 0.95, 0.95],
        },
        {
          instanceId: "sc_tree_3",
          propId: "prop_tree_puffy",
          position: [6.2, 0, 4.5],
          rotation: [0, 140, 0],
          scale: [1.0, 1.0, 1.0],
        },
        {
          instanceId: "sc_tree_4",
          propId: "prop_tree_puffy",
          position: [19.5, 0, -0.5],
          rotation: [0, 210, 0],
          scale: [1.2, 1.2, 1.2],
        },
        {
          instanceId: "sc_tree_5",
          propId: "prop_tree_puffy",
          position: [31.5, 0, -14.2],
          rotation: [0, 35, 0],
          scale: [1.05, 1.05, 1.05],
        },
        // Spotted toadstool clusters, grass tufts & wildflowers
        {
          instanceId: "sc_mush_1",
          propId: "prop_toadstool_pair",
          position: [-5.2, 0, 3.2],
          rotation: [0, 30, 0],
          scale: [1.1, 1.1, 1.1],
        },
        {
          instanceId: "sc_mush_2",
          propId: "prop_toadstool_pair",
          position: [16.5, 0, -2.5],
          rotation: [0, -45, 0],
          scale: [1.0, 1.0, 1.0],
        },
        {
          instanceId: "sc_mush_3",
          propId: "prop_toadstool_pair",
          position: [24.2, 0, -14.5],
          rotation: [0, 80, 0],
          scale: [1.05, 1.05, 1.05],
        },
        {
          instanceId: "sc_grass_1",
          propId: "prop_grass_tuft",
          position: [3.2, 0, -13.5],
          rotation: [0, 10, 0],
          scale: [1.2, 1.2, 1.2],
        },
        {
          instanceId: "sc_grass_2",
          propId: "prop_grass_tuft",
          position: [20.5, 0, -14.0],
          rotation: [0, 65, 0],
          scale: [1.1, 1.1, 1.1],
        },
        {
          instanceId: "sc_flowers_1",
          propId: "prop_wildflower_patch",
          position: [-4.2, 0, -11.5],
          rotation: [0, 25, 0],
          scale: [1.3, 1.3, 1.3],
        },
        {
          instanceId: "sc_flowers_2",
          propId: "prop_wildflower_patch",
          position: [22.0, 0, -3.5],
          rotation: [0, -30, 0],
          scale: [1.2, 1.2, 1.2],
        },
      ],
    },
  ],
};
