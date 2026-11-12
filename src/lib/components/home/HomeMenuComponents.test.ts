import { describe, it, expect } from "vitest";
import MiniGolfManiaLogo from "./MiniGolfManiaLogo.svelte";
import ProfileCornerCard from "./ProfileCornerCard.svelte";
import HomeOverlay from "./HomeOverlay.svelte";

describe("Home Menu Cartoon Arcade Components", () => {
  it("renders animated cartoon MINI GOLF MANIA SVG logo with kawaii golf ball", () => {
    const res = (MiniGolfManiaLogo as any).render({});
    expect(res.html).toContain("<svg");
    expect(res.html).toContain("MINI");
    expect(res.html).toContain("MANIA");
    expect(res.html).toContain("kawaii-golf-ball");
  });

  it("renders ProfileCornerCard for Guest vs signed-in user", () => {
    const guestRes = (ProfileCornerCard as any).render({
      user: null,
      canEditLevels: false,
      isMuted: false,
    });
    expect(guestRes.html).toContain("PROFILES");
    expect(guestRes.html).toContain("Guest");
    expect(guestRes.html).toContain("Sign In");
    expect(guestRes.html).toContain("/auth/signin");

    const authedRes = (ProfileCornerCard as any).render({
      user: { displayName: "Luiz", email: "luiz@example.com" },
      canEditLevels: true,
      isMuted: true,
    });
    expect(authedRes.html).toContain("Luiz");
    expect(authedRes.html).toContain("/profile");
    expect(authedRes.html).toContain("/mylevels");
    expect(authedRes.html).toContain("Sign Out");
  });

  it("renders HomeOverlay loader state, real action buttons, and auth-gated Track Builder", () => {
    const loadingRes = (HomeOverlay as any).render({
      isSceneReady: false,
      user: null,
      canEditLevels: false,
      isMuted: false,
    });
    expect(loadingRes.html).toContain("Loading Carnival Park");

    const guestMenuRes = (HomeOverlay as any).render({
      isSceneReady: true,
      user: null,
      canEditLevels: false,
      isMuted: false,
    });
    expect(guestMenuRes.html).toContain("PLAY NOW");
    expect(guestMenuRes.html).toContain("COURSES &amp; TOURS");
    expect(guestMenuRes.html).toContain("HOW TO PLAY");
    expect(guestMenuRes.html).not.toContain("TRACK BUILDER");

    const authedMenuRes = (HomeOverlay as any).render({
      isSceneReady: true,
      user: { displayName: "Luiz", email: "luiz@example.com" },
      canEditLevels: false,
      isMuted: false,
    });
    expect(authedMenuRes.html).toContain("TRACK BUILDER");
    expect(authedMenuRes.html).toContain("/editor");
  });
});

