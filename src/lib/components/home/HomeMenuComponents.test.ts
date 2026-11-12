import { describe, it, expect } from "vitest";
import MiniGolfManiaLogo from "./MiniGolfManiaLogo.svelte";
import ProfileCornerCard from "./ProfileCornerCard.svelte";
import HomeOverlay from "./HomeOverlay.svelte";

describe("Home Menu Cartoon Arcade Components", () => {
  it("renders animated cartoon MINI GOLF MANIA SVG logo with kawaii golf ball and tee I", () => {
    const res = (MiniGolfManiaLogo as any).render({});
    expect(res.html).toContain("<svg");
    expect(res.html).toContain("MINI");
    expect(res.html).toContain("MAN");
    expect(res.html).toContain("golf-tee-i");
    expect(res.html).toContain("kawaii-golf-ball");
  });

  it("renders ProfileCornerCard collapsed as avatar button by default and shows profile box when opened", () => {
    const collapsedGuest = (ProfileCornerCard as any).render({
      user: null,
      canEditLevels: false,
      isMuted: false,
      isOpen: false,
    });
    expect(collapsedGuest.html).toContain('aria-label="Toggle Profile Menu"');
    expect(collapsedGuest.html).not.toContain('aria-label="How to Play"');
    expect(collapsedGuest.html).not.toContain("PROFILES");

    const openGuest = (ProfileCornerCard as any).render({
      user: null,
      canEditLevels: false,
      isMuted: false,
      isOpen: true,
    });
    expect(openGuest.html).toContain("PROFILES");
    expect(openGuest.html).toContain("Guest");
    expect(openGuest.html).toContain("Sign In");
    expect(openGuest.html).toContain("/auth/signin");

    const openAuthed = (ProfileCornerCard as any).render({
      user: { displayName: "Luiz", email: "luiz@example.com" },
      canEditLevels: true,
      isMuted: true,
      isOpen: true,
    });
    expect(openAuthed.html).toContain("Luiz");
    expect(openAuthed.html).toContain("/profile");
    expect(openAuthed.html).toContain("/mylevels");
    expect(openAuthed.html).toContain("Sign Out");
  });

  it("renders HomeOverlay loader state, real action buttons, and auth-gated Track Builder", () => {
    const loadingRes = (HomeOverlay as any).render({
      isSceneReady: false,
      user: null,
      canEditLevels: false,
      isMuted: false,
    });
    expect(loadingRes.html).toContain("Loading");
    expect(loadingRes.html).not.toContain("Loading Carnival Park");

    const guestMenuRes = (HomeOverlay as any).render({
      isSceneReady: true,
      user: null,
      canEditLevels: false,
      isMuted: false,
    });
    expect(guestMenuRes.html).toContain("PLAY NOW");
    expect(guestMenuRes.html).not.toContain("COURSES &amp; TOURS");
    expect(guestMenuRes.html).toContain("HOW TO PLAY");
    expect(guestMenuRes.html).not.toContain("TRACK BUILDER");

    const authedMenuRes = (HomeOverlay as any).render({
      isSceneReady: true,
      user: { displayName: "Luiz", email: "luiz@example.com" },
      canEditLevels: false,
      isMuted: false,
    });
    expect(authedMenuRes.html).toContain("TRACK BUILDER");
    expect(authedMenuRes.html).not.toContain("🛠️");
    expect(authedMenuRes.html).toContain("/editor");
  });
});

