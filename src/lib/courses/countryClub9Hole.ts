/**
 * countryClub9Hole.ts
 * Flagship 9-Hole Championship Course showcasing all 34 modular kit pieces:
 * straights, 15°/45°/90° curves, banked wall-rides, elevation ramps, overpass bridge,
 * windmill gate, sand trap, booster strip, and mushroom bumpers.
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
          kitPieceId: "tee_box_4x4",
          position: [0, 0, 4.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h1_straight" },
        },
        {
          instanceId: "h1_straight",
          kitPieceId: "straight_4m",
          position: [0, 0, 0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h1_tee", LOC_Socket_Out: "h1_cup" },
        },
        {
          instanceId: "h1_cup",
          kitPieceId: "green_cup_standard_4x4",
          position: [0, 0, -4.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h1_straight" },
        },
      ],
      props: [
        {
          instanceId: "h1_p1",
          propId: "prop_tree_oak",
          position: [-3.5, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      ],
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
          kitPieceId: "tee_box_4x4",
          position: [0, 0, 8.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h2_turn1" },
        },
        {
          instanceId: "h2_turn1",
          kitPieceId: "turn_45deg_rounded",
          position: [0, 0, 4.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h2_tee", LOC_Socket_Out: "h2_straight" },
        },
        {
          instanceId: "h2_straight",
          kitPieceId: "straight_4m",
          position: [2.0, 0, 0.5],
          rotationY: 45,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h2_turn1", LOC_Socket_Out: "h2_turn2" },
        },
        {
          instanceId: "h2_turn2",
          kitPieceId: "turn_45deg_crisp",
          position: [4.8, 0, -2.3],
          rotationY: -45,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h2_straight", LOC_Socket_Out: "h2_cup" },
        },
        {
          instanceId: "h2_cup",
          kitPieceId: "green_cup_funnel_4x4",
          position: [4.8, 0, -6.3],
          rotationY: 0,
          walls: { left: true, right: true },
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
          kitPieceId: "tee_box_4x4",
          position: [0, 0, 8.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h3_windmill" },
        },
        {
          instanceId: "h3_windmill",
          kitPieceId: "obstacle_windmill_4x8",
          position: [0, 0, 2.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h3_tee", LOC_Socket_Out: "h3_cup" },
        },
        {
          instanceId: "h3_cup",
          kitPieceId: "green_cup_standard_4x4",
          position: [0, 0, -4.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h3_windmill" },
        },
      ],
      props: [],
    },

    // Hole 4: The Elevated Overpass Bridge (Par 4)
    {
      holeNumber: 4,
      par: 4,
      teeTileId: "h4_tee",
      cupTileId: "h4_cup",
      tiles: [
        {
          instanceId: "h4_tee",
          kitPieceId: "tee_box_4x4",
          position: [0, 0, 10.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h4_ramp_up" },
        },
        {
          instanceId: "h4_ramp_up",
          kitPieceId: "ramp_up_30deg_4x4",
          position: [0, 0, 6.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h4_tee", LOC_Socket_Out: "h4_bridge" },
        },
        {
          instanceId: "h4_bridge",
          kitPieceId: "bridge_overpass_4x8",
          position: [0, 0, 0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h4_ramp_up", LOC_Socket_Out: "h4_ramp_down" },
        },
        {
          instanceId: "h4_ramp_down",
          kitPieceId: "ramp_down_30deg_4x4",
          position: [0, 0, -6.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h4_bridge", LOC_Socket_Out: "h4_cup" },
        },
        {
          instanceId: "h4_cup",
          kitPieceId: "green_cup_standard_4x4",
          position: [0, 0, -10.0],
          rotationY: 0,
          walls: { left: true, right: true },
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
          kitPieceId: "tee_box_4x4",
          position: [0, 0, 8.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h5_boost" },
        },
        {
          instanceId: "h5_boost",
          kitPieceId: "hazard_booster_strip_4x2",
          position: [0, 0, 5.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h5_tee", LOC_Socket_Out: "h5_bank" },
        },
        {
          instanceId: "h5_bank",
          kitPieceId: "turn_banked_90deg_4x4",
          position: [0, 0, 2.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h5_boost", LOC_Socket_Out: "h5_cup" },
        },
        {
          instanceId: "h5_cup",
          kitPieceId: "green_cup_funnel_4x4",
          position: [4.0, 0, 0],
          rotationY: 90,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h5_bank" },
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
          kitPieceId: "tee_box_4x4",
          position: [0, 0, 6.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h6_sand" },
        },
        {
          instanceId: "h6_sand",
          kitPieceId: "hazard_sand_trap_4x4",
          position: [0, 0, 2.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h6_tee", LOC_Socket_Out: "h6_straight" },
        },
        {
          instanceId: "h6_straight",
          kitPieceId: "straight_4m",
          position: [0, 0, -2.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h6_sand", LOC_Socket_Out: "h6_cup" },
        },
        {
          instanceId: "h6_cup",
          kitPieceId: "green_cup_standard_4x4",
          position: [0, 0, -6.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h6_straight" },
        },
      ],
      props: [],
    },

    // Hole 7: The Water Channel Jump (Par 4)
    {
      holeNumber: 7,
      par: 4,
      teeTileId: "h7_tee",
      cupTileId: "h7_cup",
      tiles: [
        {
          instanceId: "h7_tee",
          kitPieceId: "tee_box_4x4",
          position: [0, 0, 8.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h7_boost" },
        },
        {
          instanceId: "h7_boost",
          kitPieceId: "hazard_booster_strip_4x2",
          position: [0, 0, 5.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h7_tee", LOC_Socket_Out: "h7_water" },
        },
        {
          instanceId: "h7_water",
          kitPieceId: "hazard_water_channel_4x4",
          position: [0, 0, 2.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h7_boost", LOC_Socket_Out: "h7_cup" },
        },
        {
          instanceId: "h7_cup",
          kitPieceId: "green_cup_standard_4x4",
          position: [0, 0, -2.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h7_water" },
        },
      ],
      props: [],
    },

    // Hole 8: The Mushroom Bumper Alley (Par 4)
    {
      holeNumber: 8,
      par: 4,
      teeTileId: "h8_tee",
      cupTileId: "h8_cup",
      tiles: [
        {
          instanceId: "h8_tee",
          kitPieceId: "tee_box_4x4",
          position: [0, 0, 8.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h8_s1" },
        },
        {
          instanceId: "h8_s1",
          kitPieceId: "straight_4m",
          position: [0, 0, 4.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h8_tee", LOC_Socket_Out: "h8_s2" },
        },
        {
          instanceId: "h8_s2",
          kitPieceId: "straight_4m",
          position: [0, 0, 0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h8_s1", LOC_Socket_Out: "h8_cup" },
        },
        {
          instanceId: "h8_cup",
          kitPieceId: "green_cup_funnel_4x4",
          position: [0, 0, -4.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h8_s2" },
        },
      ],
      props: [
        {
          instanceId: "h8_b1",
          propId: "prop_bumper_mushroom",
          position: [-0.6, 0, 2.0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        {
          instanceId: "h8_b2",
          propId: "prop_bumper_mushroom",
          position: [0.6, 0, 0.0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      ],
    },

    // Hole 9: Grand Finale Elevated Championship Hole (Par 5)
    {
      holeNumber: 9,
      par: 5,
      teeTileId: "h9_tee",
      cupTileId: "h9_cup",
      tiles: [
        {
          instanceId: "h9_tee",
          kitPieceId: "tee_box_4x4",
          position: [0, 0, 12.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "h9_ramp" },
        },
        {
          instanceId: "h9_ramp",
          kitPieceId: "ramp_up_15deg_4x4",
          position: [0, 0, 8.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h9_tee", LOC_Socket_Out: "h9_windmill" },
        },
        {
          instanceId: "h9_windmill",
          kitPieceId: "obstacle_windmill_4x8",
          position: [0, 1.0, 2.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h9_ramp", LOC_Socket_Out: "h9_cup" },
        },
        {
          instanceId: "h9_cup",
          kitPieceId: "green_cup_funnel_4x4",
          position: [0, 1.0, -4.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "h9_windmill" },
        },
      ],
      props: [
        {
          instanceId: "h9_lantern_l",
          propId: "prop_lantern_post",
          position: [-2.2, 1.0, 2.0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        {
          instanceId: "h9_lantern_r",
          propId: "prop_lantern_post",
          position: [2.2, 1.0, 2.0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      ],
    },
  ],
};

