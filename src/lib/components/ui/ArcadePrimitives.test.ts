import { describe, it, expect } from "vitest";
import ArcadeTitle from "./ArcadeTitle.svelte";
import ArcadeButton from "./ArcadeButton.svelte";
import ArcadeFrame from "./ArcadeFrame.svelte";

describe("Cartoon Arcade UI Primitives (TDD)", () => {
  it("renders ArcadeTitle as an outlined cartoon SVG heading with gold-orange gradient", () => {
    const res = (ArcadeTitle as any).render({
      text: "SELECT COURSE",
      gradientId: "testTitleGrad",
      viewBoxWidth: 540,
      fontSize: 54,
    });

    expect(res.html).toContain('role="heading"');
    expect(res.html).toContain("SELECT COURSE");
    expect(res.html).toContain('stroke="#431407"');
    expect(res.html).toContain('id="testTitleGrad"');
    expect(res.html).toContain('viewBox="0 0 540 88"');
    expect(res.html).toContain("#fef08a");
    expect(res.html).toContain("#fb923c");
  });

  it("renders ArcadeButton as glossy <button> or <a> link across variants and sizes", () => {
    const greenBtn = (ArcadeButton as any).render({
      label: "Save Profile",
      variant: "green",
      size: "lg",
      type: "submit",
      ariaLabel: "Save",
    });
    expect(greenBtn.html).toContain("<button");
    expect(greenBtn.html).toContain('type="submit"');
    expect(greenBtn.html).toContain("from-lime-400");
    expect(greenBtn.html).toContain("Save Profile");

    const anchorLink = (ArcadeButton as any).render({
      label: "Play",
      href: "/play",
      variant: "blue",
      size: "sm",
      title: "Play now",
    });
    expect(anchorLink.html).toContain("<a ");
    expect(anchorLink.html).toContain('href="/play"');
    expect(anchorLink.html).toContain("from-sky-400");

    const orbBtn = (ArcadeButton as any).render({
      label: "X",
      variant: "red",
      size: "orb",
      disabled: true,
    });
    expect(orbBtn.html).toContain("rounded-full");
    expect(orbBtn.html).toContain("disabled");
    expect(orbBtn.html).toContain("from-rose-400");
  });

  it("renders ArcadeFrame with double rim, rainbow bevel, optional backdrop, title, and close orb", () => {
    const res = (ArcadeFrame as any).render({
      title: "MY PROFILE",
      showClose: true,
      showBackdrop: true,
      closeLabel: "Close Profile",
    });

    expect(res.html).toContain("bg-[#2a1205]");
    expect(res.html).toContain("from-amber-300 via-pink-400");
    expect(res.html).toContain("border-[#3b1c08]");
    expect(res.html).toContain("/courses/carnival-park-card.png");
    expect(res.html).toContain("MY PROFILE");
    expect(res.html).toContain('aria-label="Close Profile"');

    const bare = (ArcadeFrame as any).render({
      title: "",
      showClose: false,
      showBackdrop: false,
    });
    expect(bare.html).not.toContain("/courses/carnival-park-card.png");
    expect(bare.html).not.toContain('aria-label="Close');
  });
});

