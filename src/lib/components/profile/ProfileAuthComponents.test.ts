import { describe, it, expect, vi } from "vitest";
import { writable } from "svelte/store";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$lib/firebase", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));
vi.mock("$lib/user", () => ({
  user: writable(null),
  updateUserProfile: vi.fn(),
}));
vi.mock("$lib/stores/profile", () => ({
  userProfile: writable({
    id: "u1",
    nickname: "Luiz",
    avatarUrl: "",
    role: "player",
    settings: { ballColor: "#ff0000", ballTrail: "none" },
  }),
}));
vi.mock("@skeletonlabs/skeleton", () => ({
  getModalStore: () => ({
    subscribe: (fn: (val: any[]) => void) => {
      fn([{ meta: { uid: "u1" } }]);
      return () => {};
    },
    close: vi.fn(),
  }),
}));

import FirstLoginModal from "../../../routes/components/FirstLoginModal.svelte";
import ProfilePage from "../../../routes/profile/+page.svelte";
import SignInPage from "../../../routes/auth/signin/+page.svelte";

describe("Profile, Sign-In, and FirstLoginModal Cartoon Arcade UI (TDD)", () => {
  it("renders Profile page inside Cartoon Arcade frame with blurred backdrop and labels", () => {
    const res = (ProfilePage as any).render();
    expect(res.html).toContain("/courses/carnival-park-card.png");
    expect(res.html).toContain("bg-[#2a1205]");
    expect(res.html).toContain("#431407");
    expect(res.html).toContain("MY PROFILE");
    expect(res.html).toContain('for="profile-avatar"');
    expect(res.html).toContain('for="profile-nickname"');
    expect(res.html).not.toContain("bg-[#C4E9CC]");
  });

  it("renders Sign-In page inside Cartoon Arcade frame with blurred backdrop and arcade buttons", () => {
    const res = (SignInPage as any).render();
    expect(res.html).toContain("/courses/carnival-park-card.png");
    expect(res.html).toContain("bg-[#2a1205]");
    expect(res.html).toContain("#431407");
    expect(res.html).toContain("SIGN IN");
    expect(res.html).toContain("Sign In with Google");
    expect(res.html).not.toContain("bg-[#C4E9CC]");
  });

  it("renders FirstLoginModal inside Cartoon Arcade frame", () => {
    const res = (FirstLoginModal as any).render({ parent: {} });
    expect(res.html).toContain("bg-[#2a1205]");
    expect(res.html).toContain("#431407");
    expect(res.html).toContain("WELCOME!");
    expect(res.html).toContain("Start Playing!");
  });
});

