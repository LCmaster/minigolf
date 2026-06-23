<script>
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";

  import { onMount } from "svelte";
  import { auth, user, getUserProfile } from "$lib/firebase";
  import { userProfile } from "$lib/stores/profile";
  import { onAuthStateChanged } from "firebase/auth";

  import { Modal, Drawer, initializeStores } from "@skeletonlabs/skeleton";
  import EditorDrawer from "./editor/components/EditorDrawer.svelte";

  import "../app.postcss";

  inject({ mode: dev ? "development" : "production" });
  initializeStores();

  const modalRegistry = {
    firstLogin: { ref: () => import('./components/FirstLoginModal.svelte').then(m => m.default) }
  };

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      $user = firebaseUser;
      
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
          $userProfile = profile;
        } else {
          // No profile exists, trigger first login modal
          const modalStore = getModalStore();
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
