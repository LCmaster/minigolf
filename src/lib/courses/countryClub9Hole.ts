/**
 * countryClub9Hole.ts
 * Flagship 9-Hole Championship Arcade Course showcasing all modular kit pieces:
 * Straights, 45°/90° curves, banked wall-rides, elevation ramps, overpass bridge,
 * windmill obstacle, sand trap, booster strip, pinball bumper, and multi-tier greens.
 * Uses dynamic socket chaining for 0.0000mm exact mathematical alignments.
 */

import type { CourseData } from "$lib/engine/types/CourseSchema";

export const countryClub9Hole: CourseData = {
  id: "course_country_club_championship",
  name: "Classic Country Club Championship",
  theme: "country_club",
  authorId: "deepmind_antigravity",
  authorName: "Antigravity Pro Tour",
  createdAt: 1730900000000,
  updatedAt: 1730900000000,
  holes: [
    // Hole 1: The Gateway Drive (Par 2)
    {
      holeNumber: 1,
      par: 2,
      teeTileId: "h1_tee",
      cupTileId: "h1_cup",
      tiles: [
        {
          instanceId: "h1_tee",
          kitPieceId: "tee_box_6x6",
          position: [0, 0, 6.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h1_straight" },
        },
        {
          instanceId: "h1_straight",
          kitPieceId: "straight_6m",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h1_tee",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h1_tee", LOC_Socket_Out: "h1_cup" },
        },
        {
          instanceId: "h1_cup",
          kitPieceId: "green_cup_standard_6x6",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h1_straight",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h1_straight" },
        },
      ],
      props: [],
    },

    // Hole 2: The S-Curve Meadow (Par 3)
    {
      holeNumber: 2,
      par: 3,
      teeTileId: "h2_tee",
      cupTileId: "h2_cup",
      tiles: [
        {
          instanceId: "h2_tee",
          kitPieceId: "tee_box_6x6",
          position: [0, 0, 12.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h2_turn1" },
        },
        {
          instanceId: "h2_turn1",
          kitPieceId: "turn_45deg_rounded",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h2_tee",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h2_tee", LOC_Socket_Out: "h2_straight" },
        },
        {
          instanceId: "h2_straight",
          kitPieceId: "straight_6m",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h2_turn1",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h2_turn1", LOC_Socket_Out: "h2_turn2" },
        },
        {
          instanceId: "h2_turn2",
          kitPieceId: "turn_45deg_crisp",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h2_straight",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h2_straight", LOC_Socket_Out: "h2_cup" },
        },
        {
          instanceId: "h2_cup",
          kitPieceId: "green_cup_standard_6x6",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h2_turn2",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h2_turn2" },
        },
      ],
      props: [],
    },

    // Hole 3: The Windmill Gate (Par 3)
    {
      holeNumber: 3,
      par: 3,
      teeTileId: "h3_tee",
      cupTileId: "h3_cup",
      tiles: [
        {
          instanceId: "h3_tee",
          kitPieceId: "tee_box_6x6",
          position: [0, 0, 12.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h3_straight" },
        },
        {
          instanceId: "h3_straight",
          kitPieceId: "straight_6m",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h3_tee",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h3_tee", LOC_Socket_Out: "h3_windmill" },
        },
        {
          instanceId: "h3_windmill",
          kitPieceId: "obstacle_windmill_base",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h3_straight",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h3_straight", LOC_Socket_Out: "h3_cup" },
        },
        {
          instanceId: "h3_cup",
          kitPieceId: "green_cup_standard_6x6",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h3_windmill",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h3_windmill" },
        },
      ],
      props: [],
    },

    // Hole 4: The Elevated Overpass (Par 4)
    {
      holeNumber: 4,
      par: 4,
      teeTileId: "h4_tee",
      cupTileId: "h4_cup",
      tiles: [
        {
          instanceId: "h4_tee",
          kitPieceId: "tee_box_6x6",
          position: [0, 0, 18.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h4_ramp_up" },
        },
        {
          instanceId: "h4_ramp_up",
          kitPieceId: "ramp_elevation_up_6m",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h4_tee",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h4_tee", LOC_Socket_Out: "h4_bridge" },
        },
        {
          instanceId: "h4_bridge",
          kitPieceId: "bridge_arch_overpass",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h4_ramp_up",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h4_ramp_up", LOC_Socket_Out: "h4_ramp_down" },
        },
        {
          instanceId: "h4_ramp_down",
          kitPieceId: "ramp_elevation_down_6m",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h4_bridge",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h4_bridge", LOC_Socket_Out: "h4_cup" },
        },
        {
          instanceId: "h4_cup",
          kitPieceId: "green_cup_standard_6x6",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h4_ramp_down",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h4_ramp_down" },
        },
      ],
      props: [],
    },

    // Hole 5: The Banked Wall-Ride Speed Run (Par 3)
    {
      holeNumber: 5,
      par: 3,
      teeTileId: "h5_tee",
      cupTileId: "h5_cup",
      tiles: [
        {
          instanceId: "h5_tee",
          kitPieceId: "tee_box_6x6",
          position: [0, 0, 12.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h5_boost" },
        },
        {
          instanceId: "h5_boost",
          kitPieceId: "booster_speed_strip",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h5_tee",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h5_tee", LOC_Socket_Out: "h5_bank" },
        },
        {
          instanceId: "h5_bank",
          kitPieceId: "wall_ride_bank_left",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h5_boost",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h5_boost", LOC_Socket_Out: "h5_turn" },
        },
        {
          instanceId: "h5_turn",
          kitPieceId: "turn_90deg_wide",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h5_bank",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h5_bank", LOC_Socket_Out: "h5_cup" },
        },
        {
          instanceId: "h5_cup",
          kitPieceId: "green_cup_multi_tier",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h5_turn",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h5_turn" },
        },
      ],
      props: [],
    },

    // Hole 6: The Sand Trap Bunker (Par 3)
    {
      holeNumber: 6,
      par: 3,
      teeTileId: "h6_tee",
      cupTileId: "h6_cup",
      tiles: [
        {
          instanceId: "h6_tee",
          kitPieceId: "tee_box_6x6",
          position: [0, 0, 12.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h6_sand" },
        },
        {
          instanceId: "h6_sand",
          kitPieceId: "hazard_sand_trap",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h6_tee",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h6_tee", LOC_Socket_Out: "h6_straight" },
        },
        {
          instanceId: "h6_straight",
          kitPieceId: "straight_6m",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h6_sand",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h6_sand", LOC_Socket_Out: "h6_cup" },
        },
        {
          instanceId: "h6_cup",
          kitPieceId: "green_cup_standard_6x6",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h6_straight",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h6_straight" },
        },
      ],
      props: [],
    },

    // Hole 7: The Water Hazard Crossing (Par 4)
    {
      holeNumber: 7,
      par: 4,
      teeTileId: "h7_tee",
      cupTileId: "h7_cup",
      tiles: [
        {
          instanceId: "h7_tee",
          kitPieceId: "tee_box_6x6",
          position: [0, 0, 12.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h7_boost" },
        },
        {
          instanceId: "h7_boost",
          kitPieceId: "booster_speed_strip",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h7_tee",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h7_tee", LOC_Socket_Out: "h7_water" },
        },
        {
          instanceId: "h7_water",
          kitPieceId: "hazard_water_hazard",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h7_boost",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h7_boost", LOC_Socket_Out: "h7_cup" },
        },
        {
          instanceId: "h7_cup",
          kitPieceId: "green_cup_island",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h7_water",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h7_water" },
        },
      ],
      props: [],
    },

    // Hole 8: The Pinball Bumper Alley (Par 4)
    {
      holeNumber: 8,
      par: 4,
      teeTileId: "h8_tee",
      cupTileId: "h8_cup",
      tiles: [
        {
          instanceId: "h8_tee",
          kitPieceId: "tee_box_6x6",
          position: [0, 0, 18.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h8_s1" },
        },
        {
          instanceId: "h8_s1",
          kitPieceId: "straight_6m",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h8_tee",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h8_tee", LOC_Socket_Out: "h8_bumper" },
        },
        {
          instanceId: "h8_bumper",
          kitPieceId: "bumper_pinball_mushroom",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h8_s1",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h8_s1", LOC_Socket_Out: "h8_s2" },
        },
        {
          instanceId: "h8_s2",
          kitPieceId: "straight_6m",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h8_bumper",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h8_bumper", LOC_Socket_Out: "h8_cup" },
        },
        {
          instanceId: "h8_cup",
          kitPieceId: "green_cup_multi_tier",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h8_s2",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h8_s2" },
        },
      ],
      props: [],
    },

    // Hole 9: Grand Finale Championship Arena (Par 5)
    {
      holeNumber: 9,
      par: 5,
      teeTileId: "h9_tee",
      cupTileId: "h9_cup",
      tiles: [
        {
          instanceId: "h9_tee",
          kitPieceId: "tee_box_6x6",
          position: [0, 0, 24.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h9_ramp" },
        },
        {
          instanceId: "h9_ramp",
          kitPieceId: "ramp_elevation_up_6m",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h9_tee",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h9_tee", LOC_Socket_Out: "h9_bridge" },
        },
        {
          instanceId: "h9_bridge",
          kitPieceId: "bridge_arch_overpass",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h9_ramp",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h9_ramp", LOC_Socket_Out: "h9_windmill" },
        },
        {
          instanceId: "h9_windmill",
          kitPieceId: "obstacle_windmill_base",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h9_bridge",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h9_bridge", LOC_Socket_Out: "h9_turn" },
        },
        {
          instanceId: "h9_turn",
          kitPieceId: "turn_90deg_crisp",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h9_windmill",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h9_windmill", LOC_Socket_Out: "h9_cup" },
        },
        {
          instanceId: "h9_cup",
          kitPieceId: "green_cup_island",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "h9_turn",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "h9_turn" },
        },
      ],
      props: [],
    },
  ],
};
