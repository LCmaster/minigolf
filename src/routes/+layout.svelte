<script>
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";

  import { onMount } from "svelte";
  import { auth } from "$lib/firebase";
  import { user, getUserProfile } from "$lib/user";
  import { userProfile } from "$lib/stores/profile";
  import { onAuthStateChanged } from "firebase/auth";

  import { Modal, Drawer, initializeStores, getModalStore } from "@skeletonlabs/skeleton";
  import EditorDrawer from "./editor/components/EditorDrawer.svelte";
  import FirstLoginModal from "./components/FirstLoginModal.svelte";

  import "../app.postcss";

  inject({ mode: dev ? "development" : "production" });
  initializeStores();

  const modalRegistry = {
    firstLogin: { ref: FirstLoginModal }
  };

  const modalStore = getModalStore();

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      $user = firebaseUser;
      
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
          $userProfile = profile;
        } else {
          // No profile exists, trigger first login modal
          modalStore.trigger({
            type: "component",
            component: "firstLogin",
            meta: { uid: firebaseUser.uid, email: firebaseUser.email }
          });
        }
      } else {
        $userProfile = undefined;
      }
    });

    return () => unsubscribe();
  });
</script>

<Modal components={modalRegistry} />
<Drawer>
  <EditorDrawer />
</Drawer>
<slot />
